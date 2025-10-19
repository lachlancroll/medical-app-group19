// app/appointments/index.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../supabaseClient';

type DBUser = { id: string; email: string | null };
type AppointmentRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  patient_name?: string;
  doctor_name?: string;
};

type DoctorOpt = { id: string; name: string };
type PatientOpt = { id: string; name: string };

type UserRole = 'doctor' | 'patient' | 'both' | 'none';

const isWeb = Platform.OS === 'web';

export default function AppointmentsScreen() {
  const router = useRouter();

  // auth + role
  const [user, setUser] = useState<DBUser | null>(null);
  const [role, setRole] = useState<UserRole>('none');

  // lists
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOpt[]>([]);
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [selDoctor, setSelDoctor] = useState<string>('');   // only used if role === 'patient'
  const [selPatient, setSelPatient] = useState<string>(''); // only used if role === 'doctor'
  const [dateStr, setDateStr]   = useState<string>('');     // YYYY-MM-DD
  const [startStr, setStartStr] = useState<string>('09:00'); // HH:MM
  const [endStr, setEndStr]     = useState<string>('09:30'); // HH:MM
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>('');

  /* ------------------- helpers (web URL params) ------------------- */
  const updateUrlParams = (from: string, to: string) => {
    if (!isWeb || typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (from) params.set('from', from); else params.delete('from');
      if (to) params.set('to', to); else params.delete('to');
      const qs = params.toString();
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({}, '', newUrl);
    } catch {}
  };

  const defaultDates = () => {
    const today = new Date();
    const plusMonth = new Date(today);
    plusMonth.setMonth(today.getMonth() + 1);
    let from = today.toISOString().slice(0, 10);
    let to   = plusMonth.toISOString().slice(0, 10);
    if (isWeb && typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        from = params.get('from') ?? from;
        to   = params.get('to')   ?? to;
      } catch {}
    }
    return { from, to };
  };

  /* ----------------------- init (user, role) ---------------------- */
  useEffect(() => {
    const init = async () => {
      const [{ data: udata }] = await Promise.all([supabase.auth.getUser()]);
      const u = udata?.user
        ? { id: udata.user.id, email: udata.user.email ?? null }
        : null;
      setUser(u);

      const { from, to } = defaultDates();
      setFromDate(from);
      setToDate(to);
      setDateStr(from);

      if (!u) {
        setRole('none');
        setLoading(false);
        return;
      }

      // detect role by membership in doctor_profiles / patient_profiles
      const [dr, pt] = await Promise.all([
        supabase.from('doctor_profiles').select('user_id').eq('user_id', u.id).maybeSingle(),
        supabase.from('patient_profiles').select('user_id').eq('user_id', u.id).maybeSingle(),
      ]);

      const isDoctor  = !dr.error && !!dr.data;
      const isPatient = !pt.error && !!pt.data;
      setRole(isDoctor && isPatient ? 'both' : isDoctor ? 'doctor' : isPatient ? 'patient' : 'none');

      // preload pickers (safe two-step lookup; works even without FK join)
      await Promise.all([loadDoctorOptions(), loadPatientOptions()]);

      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- fetch appointments for this user -------------- */
  useEffect(() => {
    const run = async () => {
      if (!user || role === 'none' || !fromDate || !toDate) return;
      setLoading(true);

      let query = supabase
        .from('appointments')
        .select('id, starts_at, ends_at, status, doctor_id, patient_id')
        .order('starts_at', { ascending: true });

      // scope by role
      if (role === 'doctor') query = query.eq('doctor_id', user.id);
      else if (role === 'patient') query = query.eq('patient_id', user.id);
      else query = query.or(`doctor_id.eq.${user.id},patient_id.eq.${user.id}`); // 'both'

      // date window
      query = query.gte('starts_at', fromDate);
      let toEnd = /^\d{4}-\d{2}-\d{2}$/.test(toDate) ? `${toDate}T23:59:59` : toDate;
      query = query.lte('starts_at', toEnd);

      const { data, error } = await query;
      if (error) {
        console.error('appointments error:', error);
        setAppointments([]);
        setLoading(false);
        return;
      }

      // decorate with doctor/patient display names
      const rows = data ?? [];
      const doctorIds = Array.from(new Set(rows.map(r => r.doctor_id).filter(Boolean)));
      const patientIds = Array.from(new Set(rows.map(r => r.patient_id).filter(Boolean)));

      const [docNames, patNames] = await Promise.all([
        lookupNamesByIds(doctorIds),
        lookupNamesByIds(patientIds),
      ]);

      const merged: AppointmentRow[] = rows.map(r => ({
        id: r.id,
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        status: r.status,
        doctor_name: docNames[r.doctor_id] ?? 'Doctor',
        patient_name: patNames[r.patient_id] ?? 'Patient',
      }));

      setAppointments(merged);
      setLoading(false);
    };
    run();
  }, [user, role, fromDate, toDate]);

  /* -------------------------- pickers ----------------------------- */
  async function loadDoctorOptions() {
    const drRes = await supabase.from('doctor_profiles').select('user_id, provider_number');
    if (drRes.error) {
      console.error('doctor_profiles error:', drRes.error);
      setDoctors([]);
      return;
    }
    const ids = (drRes.data ?? []).map((r: any) => r.user_id as string);
    const nameById = await lookupNamesByIds(ids);
    const providerById: Record<string, string | undefined> = {};
    for (const r of drRes.data ?? []) providerById[r.user_id] = r.provider_number;

    const opts = ids.map(id => ({
      id,
      name: nameById[id] || providerById[id] || 'Doctor',
    }));
    setDoctors(opts);
  }

  async function loadPatientOptions() {
    const ptRes = await supabase.from('patient_profiles').select('user_id');
    if (ptRes.error) {
      console.error('patient_profiles error:', ptRes.error);
      setPatients([]);
      return;
    }
    const ids = (ptRes.data ?? []).map((r: any) => r.user_id as string);
    const nameById = await lookupNamesByIds(ids);
    setPatients(ids.map(id => ({ id, name: nameById[id] || 'Patient' })));
  }

  // Tries profiles for names; falls back to nothing (caller supplies fallback label)
  async function lookupNamesByIds(ids: string[]) {
    const map: Record<string, string> = {};
    if (!ids.length) return map;
    const prof = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
    if (prof.error) {
      console.error('profiles lookup error:', prof.error);
      return map;
    }
    for (const row of prof.data ?? []) {
      if (row.user_id) map[row.user_id] = row.full_name || '';
    }
    // Log missing to help debugging
    const missing = ids.filter(id => !map[id]);
    if (missing.length) console.warn('No profile name for IDs:', missing);
    return map;
  }

  /* --------------------- create appointment ----------------------- */
  const createAppointment = async () => {
    setCreateError('');

    if (role === 'doctor' && !selPatient) return setCreateError('Please select a patient.');
    if (role === 'patient' && !selDoctor) return setCreateError('Please select a doctor.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return setCreateError('Date must be YYYY-MM-DD.');
    if (!/^\d{2}:\d{2}$/.test(startStr) || !/^\d{2}:\d{2}$/.test(endStr))
      return setCreateError('Times must be HH:MM (24h).');

    const starts_at = `${dateStr}T${startStr}:00`;
    const ends_at   = `${dateStr}T${endStr}:00`;

    const s = new Date(starts_at), e = new Date(ends_at);
    if (isNaN(+s) || isNaN(+e)) return setCreateError('Invalid date/time.');
    if (e <= s) return setCreateError('End time must be after start time.');

    const doctor_id  = role === 'doctor' ? user!.id : selDoctor;
    const patient_id = role === 'patient' ? user!.id : selPatient;

    setCreating(true);
    const { error } = await supabase.from('appointments').insert([{
      starts_at,
      ends_at,
      doctor_id,
      patient_id,
      status: 'scheduled',
      created_by: user!.id,
    }]);
    setCreating(false);

    if (error) {
      console.error('create appointment error:', error);
      setCreateError(error.message || 'Failed to create appointment.');
      return;
    }

    setModalOpen(false);
    setSelDoctor('');
    setSelPatient('');
    Alert.alert('Success', 'Appointment created.');
    // re-fetch with same filters
    setFromDate(f => f);
  };

  /* ----------------------------- UI ------------------------------- */
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const canCreate = role === 'doctor' || role === 'patient' || role === 'both';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace('/')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Appointments</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {canCreate && (
            <Pressable onPress={() => setModalOpen(true)} style={styles.newBtn}>
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
              <Text style={styles.newBtnText}>New</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/profile')} style={styles.profileBtn}>
            <MaterialCommunityIcons name="account-circle-outline" size={22} color="#007AFF" />
            <Text style={styles.profileText}>Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* Date Filters */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>From (YYYY-MM-DD):</Text>
        <TextInput
          style={styles.filterInput}
          value={fromDate}
          onChangeText={(val) => { setFromDate(val); updateUrlParams(val, toDate); }}
          placeholder="e.g. 2025-10-12"
          keyboardType="default"
          maxLength={10}
          autoCapitalize="none"
        />
        <Text style={[styles.filterLabel, { marginLeft: 12 }]}>To (YYYY-MM-DD):</Text>
        <TextInput
          style={styles.filterInput}
          value={toDate}
          onChangeText={(val) => { setToDate(val); updateUrlParams(fromDate, val); }}
          placeholder="e.g. 2025-11-12"
          keyboardType="default"
          maxLength={10}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>No appointments scheduled.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/appointments/${item.id}`)}
            android_ripple={{ color: '#E2E8F0' }}
          >
            <View style={styles.cardRow}>
              <MaterialCommunityIcons name="calendar" size={28} color="#0EA5E9" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.patientName}>
                  {role === 'doctor' ? (item.patient_name ?? 'Patient') : (item.doctor_name ?? 'Doctor')}
                </Text>
                <Text style={styles.timeText}>
                  {formatTime(item.starts_at)} - {formatTime(item.ends_at)}
                </Text>
                <Text style={styles.statusText}>{capitalize(item.status)}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      {/* Create appointment modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Appointment</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              {/* If user is a PATIENT → pick DOCTOR; lock patient to self */}
              {(role === 'patient' || role === 'both') && (
                <>
                  <Text style={styles.inputLabel}>Doctor</Text>
                  <View style={styles.pillList}>
                    {doctors.map(d => (
                      <Pressable
                        key={d.id}
                        onPress={() => setSelDoctor(d.id)}
                        style={[styles.pill, selDoctor === d.id && styles.pillSelected]}
                      >
                        <Text style={[styles.pillText, selDoctor === d.id && styles.pillTextSelected]}>
                          {d.name}
                        </Text>
                      </Pressable>
                    ))}
                    {doctors.length === 0 && <Text style={styles.helpText}>No doctors found.</Text>}
                  </View>
                </>
              )}

              {/* If user is a DOCTOR → pick PATIENT; lock doctor to self */}
              {(role === 'doctor' || role === 'both') && (
                <>
                  <Text style={styles.inputLabel}>Patient</Text>
                  <View style={[styles.pillList, { maxHeight: 120 }]}>
                    <ScrollView horizontal contentContainerStyle={{ paddingVertical: 6 }}>
                      {patients.map(p => (
                        <Pressable
                          key={p.id}
                          onPress={() => setSelPatient(p.id)}
                          style={[styles.pill, selPatient === p.id && styles.pillSelected]}
                        >
                          <Text style={[styles.pillText, selPatient === p.id && styles.pillTextSelected]}>
                            {p.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    {patients.length === 0 && <Text style={styles.helpText}>No patients found.</Text>}
                  </View>
                </>
              )}

              {/* Date & times */}
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="2025-10-12"
                autoCapitalize="none"
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Start (HH:MM)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={startStr}
                    onChangeText={setStartStr}
                    placeholder="09:00"
                    autoCapitalize="none"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>End (HH:MM)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={endStr}
                    onChangeText={setEndStr}
                    placeholder="09:30"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {!!createError && <Text style={styles.errorText}>{createError}</Text>}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.saveBtn]}
                onPress={createAppointment}
                disabled={creating}
              >
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------ utils ----------------------------- */
function formatTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  try { return d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return d.toISOString(); }
}
function capitalize(s: string) {
  if (!s) return '';
  return s[0].toUpperCase() + s.slice(1);
}

/* ------------------------------ styles ---------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 12 },
  backBtn: { marginRight: 12, paddingVertical: 4, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: 0.2 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  profileText: { marginLeft: 6, fontSize: 14, color: '#007AFF', fontWeight: '600' },
  newBtn: { backgroundColor: '#0EA5E9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  newBtnText: { color: '#fff', fontWeight: '700' },

  card: { backgroundColor: '#F1F5F9', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  patientName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  timeText: { fontSize: 15, color: '#0EA5E9', marginBottom: 2 },
  statusText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginTop: 40 },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  filterLabel: { fontSize: 15, marginRight: 8, color: '#0EA5E9', fontWeight: '600' },
  filterInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, minWidth: 120, backgroundColor: '#F8FAFC', marginBottom: 8 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  inputLabel: { fontWeight: '700', marginTop: 10, marginBottom: 6 },
  textInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, backgroundColor: '#F8FAFC' },
  helpText: { color: '#64748B', fontStyle: 'italic' },
  pillList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff' },
  pillSelected: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  pillText: { color: '#0F172A', fontWeight: '600' },
  pillTextSelected: { color: '#fff' },
  errorText: { color: '#DC2626', marginTop: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cancelBtn: { backgroundColor: '#E2E8F0' },
  saveBtn: { backgroundColor: '#0EA5E9' },
  cancelText: { color: '#0F172A', fontWeight: '700' },
  saveText: { color: '#fff', fontWeight: '700' },
});

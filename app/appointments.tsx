// app/appointments/index.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View
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
  doctor_id?: string;
  patient_id?: string;
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

  // data
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  // date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOpt[]>([]);
  const [patients, setPatients] = useState<PatientOpt[]>([]);
  const [selDoctor, setSelDoctor] = useState<string>('');   // used if role === 'patient'
  const [selPatient, setSelPatient] = useState<string>(''); // used if role === 'doctor'
  const [dateStr, setDateStr] = useState<string>('');       // YYYY-MM-DD
  const [startStr, setStartStr] = useState<string>('09:00'); // HH:MM
  const [endStr, setEndStr] = useState<string>('09:30');    // HH:MM
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
    } catch (e) {
      console.warn('updateUrlParams failed:', e);
    }
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
      try {
        const { data: udata, error: uerr } = await supabase.auth.getUser();
        if (uerr) console.warn('auth.getUser error:', uerr);
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

        const [dr, pt] = await Promise.all([
          supabase.from('doctor_profiles').select('user_id').eq('user_id', u.id).maybeSingle(),
          supabase.from('patient_profiles').select('user_id').eq('user_id', u.id).maybeSingle(),
        ]);

        if (dr.error) console.warn('doctor_profiles role check error:', dr.error);
        if (pt.error) console.warn('patient_profiles role check error:', pt.error);

        const isDoctor  = !dr.error && !!dr.data;
        const isPatient = !pt.error && !!pt.data;
        setRole(isDoctor && isPatient ? 'both' : isDoctor ? 'doctor' : isPatient ? 'patient' : 'none');

        await Promise.all([loadDoctorOptions(), loadPatientOptions()]);
      } catch (e) {
        console.error('init fatal:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  /* ---------------- fetch appointments for this user -------------- */
  useEffect(() => {
    const run = async () => {
      if (!user || role === 'none' || !fromDate || !toDate) return;
      setLoading(true);

      try {
        let query = supabase
          .from('appointments')
          .select('id, starts_at, ends_at, status, doctor_id, patient_id')
          .order('starts_at', { ascending: true });

        if (role === 'doctor') query = query.eq('doctor_id', user.id);
        else if (role === 'patient') query = query.eq('patient_id', user.id);
        else query = query.or(`doctor_id.eq.${user.id},patient_id.eq.${user.id}`);

        const toEnd = /^\d{4}-\d{2}-\d{2}$/.test(toDate) ? `${toDate}T23:59:59` : toDate;
        query = query.gte('starts_at', fromDate).lte('starts_at', toEnd);

        const { data, error, status, statusText } = await query;
        if (error) {
          console.error('appointments query error:', { error, status, statusText });
          setAppointments([]);
          return;
        }

        const rows = (data ?? []) as any[];
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
          doctor_id: r.doctor_id,
          patient_id: r.patient_id,
          doctor_name: docNames[r.doctor_id] ?? shortId(r.doctor_id) ?? 'Doctor',
          patient_name: patNames[r.patient_id] ?? shortId(r.patient_id) ?? 'Patient',
        }));

        setAppointments(merged);
      } catch (e) {
        console.error('appointments fetch fatal:', e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, role, fromDate, toDate]);

  /* -------------------------- pickers ----------------------------- */
  async function loadDoctorOptions() {
    try {
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
        name: nameById[id] || providerById[id] || shortId(id) || 'Doctor',
      }));
      setDoctors(opts);
    } catch (e) {
      console.error('loadDoctorOptions fatal:', e);
      setDoctors([]);
    }
  }

  async function loadPatientOptions() {
    try {
      const ptRes = await supabase.from('patient_profiles').select('user_id');
      if (ptRes.error) {
        console.error('patient_profiles error:', ptRes.error);
        setPatients([]);
        return;
      }
      const ids = (ptRes.data ?? []).map((r: any) => r.user_id as string);
      const nameById = await lookupNamesByIds(ids);
      setPatients(ids.map(id => ({ id, name: nameById[id] || shortId(id) || 'Patient' })));
    } catch (e) {
      console.error('loadPatientOptions fatal:', e);
      setPatients([]);
    }
  }

  async function lookupNamesByIds(ids: string[]) {
    const map: Record<string, string> = {};
    if (!ids.length) return map;
    try {
      const prof = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
      if (prof.error) {
        console.error('profiles lookup error:', prof.error);
        return map;
      }
      for (const row of prof.data ?? []) {
        if (row.user_id) map[row.user_id] = row.full_name || '';
      }
      const missing = ids.filter(id => !map[id]);
      if (missing.length) console.warn('No profile name for IDs:', missing);
    } catch (e) {
      console.error('lookupNamesByIds fatal:', e);
    }
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

    try {
      setCreating(true);
      const createdBy =
        role === 'doctor'
          ? user!.id
          : role === 'patient'
            ? selDoctor
            : selPatient
              ? user!.id
              : selDoctor;

      if (!createdBy) {
        setCreateError('Please choose a doctor.');
        setCreating(false);
        return;
      }

      const { error, status, statusText } = await supabase
        .from('appointments')
        .insert([{
          starts_at,
          ends_at,
          doctor_id,
          patient_id,
          status: 'scheduled',
          created_by: createdBy,
        }]);

      if (error) {
        console.error('create appointment error:', { error, status, statusText });
        setCreateError(error.message || 'Failed to create appointment.');
        return;
      }
      setModalOpen(false);
      setSelDoctor('');
      setSelPatient('');
      Alert.alert('Success', 'Appointment created.');
      setFromDate(f => f);
    } catch (e) {
      console.error('createAppointment fatal:', e);
      setCreateError('Unexpected error creating appointment.');
    } finally {
      setCreating(false);
    }
  };

  /* -------------------------- derived UI -------------------------- */
  const sections = useMemo(() => {
    const byDay: Record<string, AppointmentRow[]> = {};
    for (const a of appointments) {
      const k = new Date(a.starts_at).toISOString().slice(0, 10);
      (byDay[k] ||= []).push(a);
    }
    return Object.entries(byDay)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, items]) => ({ title: day, data: items }));
  }, [appointments]);

  const canCreate = role === 'doctor' || role === 'patient' || role === 'both';

  /* ----------------------------- UI ------------------------------- */
  if (loading) {
    return (
      <LinearGradient colors={['#0ea5e9', '#6366f1']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}>
        <SafeAreaView style={styles.container}>
          <ActivityIndicator color="#fff" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0ea5e9', '#6366f1']} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}>
      <SafeAreaView style={styles.container}>
        {/* header */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.replace('/')} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <Text style={styles.title}>Appointments</Text>

          <Pressable onPress={() => router.push('/profile')} style={styles.profileBtn}>
            <MaterialCommunityIcons name="account-circle-outline" size={22} color="#fff" />
            <Text style={styles.profileText}>Profile</Text>
          </Pressable>
        </View>

        {/* surface card for filters + list */}
        <View style={styles.surface}>
          {/* quick filters */}
          <View style={styles.quickRow}>
            <FilterChip label="7 days" onPress={() => setRangeDays(7)} />
            <FilterChip label="30 days" onPress={() => setRangeDays(30)} />
            <FilterChip label="All next month" onPress={() => setNextMonth()} />
          </View>

          {/* Date inputs */}
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>From</Text>
            <TextInput
              style={styles.filterInput}
              value={fromDate}
              onChangeText={(val) => { setFromDate(val); updateUrlParams(val, toDate); }}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              maxLength={10}
            />
            <Text style={[styles.filterLabel, { marginLeft: 12 }]}>To</Text>
            <TextInput
              style={styles.filterInput}
              value={toDate}
              onChangeText={(val) => { setToDate(val); updateUrlParams(fromDate, val); }}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              maxLength={10}
            />
          </View>

          {/* list */}
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled
            contentContainerStyle={sections.length === 0 ? styles.emptyContainer : undefined}
            ListEmptyComponent={<Text style={styles.emptyText}>No appointments scheduled.</Text>}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{formatDay(title)}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/appointments/${item.id}`)}
                android_ripple={{ color: '#E2E8F0' }}
              >
                <View style={styles.cardRow}>
                  <MaterialCommunityIcons name="calendar" size={28} color="#0EA5E9" />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.counterpartName}>
                      {role === 'doctor' ? (item.patient_name ?? 'Patient') : (item.doctor_name ?? 'Doctor')}
                    </Text>
                    <Text style={styles.timeText}>{formatRange(item.starts_at, item.ends_at)}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
              </Pressable>
            )}
          />
        </View>

        {/* FAB */}
        {canCreate && (
          <Pressable style={styles.fab} onPress={() => setModalOpen(true)}>
            <MaterialCommunityIcons name="plus" size={26} color="#fff" />
          </Pressable>
        )}
      </SafeAreaView>

      {/* Create appointment modal */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Appointment</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
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
    </LinearGradient>
  );

  /* ---- local helpers (component scope) ---- */
  function setRangeDays(n: number) {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + n);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
    updateUrlParams(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  }
  function setNextMonth() {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 2, 0);
    setFromDate(start.toISOString().slice(0, 10));
    setToDate(end.toISOString().slice(0, 10));
    updateUrlParams(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10));
  }
}

/* ------------------------------ atoms ----------------------------- */
const StatusBadge = ({ status }: { status: string }) => {
  const label = (status || '').toLowerCase();
  const bg =
    label === 'cancelled' ? '#fee2e2' :
    label === 'completed' ? '#dcfce7' :
    '#e0f2fe';
  const fg =
    label === 'cancelled' ? '#b91c1c' :
    label === 'completed' ? '#166534' :
    '#0369a1';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{capitalize(label || 'scheduled')}</Text>
    </View>
  );
};

const FilterChip = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </Pressable>
);

/* ------------------------------ utils ----------------------------- */
function shortId(id?: string) {
  if (!id) return '';
  return id.slice(0, 4) + '…' + id.slice(-4);
}
function formatDay(isoYmd: string) {
  try {
    const d = new Date(isoYmd + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoYmd;
  }
}
function formatRange(startIso: string, endIso: string) {
  const s = new Date(startIso);
  const e = new Date(endIso);
  try {
    const sameDay = s.toDateString() === e.toDateString();
    const sd = s.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    const st = s.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
    const et = e.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
    return sameDay ? `${sd}, ${st} – ${et}` : `${sd}, ${st} → ${e.toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
  } catch {
    return `${startIso} – ${endIso}`;
  }
}
function capitalize(s: string) {
  if (!s) return '';
  return s[0].toUpperCase() + s.slice(1);
}

/* ------------------------------ styles ---------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingBottom: 16 },
  // header sits on the gradient
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 12 },
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: '#FFFFFF', fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 0.2, color: '#FFFFFF' },
  profileBtn: { flexDirection: 'row', alignItems: 'center' },
  profileText: { marginLeft: 6, fontSize: 14, color: '#FFFFFF', fontWeight: '700' },

  // white surface for content
  surface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    padding: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },

  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#DBEAFE' },
  chipText: { color: '#1D4ED8', fontWeight: '700' },

  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  filterLabel: { fontSize: 15, marginRight: 8, color: '#0EA5E9', fontWeight: '700' },
  filterInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, minWidth: 120, backgroundColor: '#F8FAFC', marginBottom: 8 },

  sectionHeader: { backgroundColor: '#F8FAFC', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginTop: 6, marginBottom: 6 },
  sectionHeaderText: { fontSize: 13, color: '#334155', fontWeight: '800', letterSpacing: 0.3 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  counterpartName: { fontSize: 18, fontWeight: '800', marginBottom: 2, color: '#0F172A' },
  timeText: { fontSize: 14, color: '#0EA5E9' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '800' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginTop: 40 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
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

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#0EA5E9',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
});

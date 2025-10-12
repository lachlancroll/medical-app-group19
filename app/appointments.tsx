import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabaseClient';


type DBUser = {
  id: string;
  email: string;
  isDoctor?: boolean | null;
  // add other columns if needed
};

type Patient = {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
};

type Medication = {
  id: string;
  name: string;
  dosage: string;
  user_id: string;
};
  export default function DoctorAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  // Date filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Helper to update URL search params
  function updateUrlParams(from: string, to: string) {
    const params = new URLSearchParams(window.location.search);
    if (from) params.set('from', from); else params.delete('from');
    if (to) params.set('to', to); else params.delete('to');
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

    // Parse URL search params for from/to, set defaults
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      let from = params.get('from');
      let to = params.get('to');
      const today = new Date();
      const oneMonth = new Date(today);
      oneMonth.setMonth(today.getMonth() + 1);
      if (!from) from = today.toISOString().slice(0, 10);
      if (!to) to = oneMonth.toISOString().slice(0, 10);
      setFromDate(from);
      setToDate(to);
    }, []);

    // Fetch appointments with date filtering in Supabase query
    useEffect(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
            let query = supabase
              .from('appointments')
              .select(`
                id,
                starts_at,
                ends_at,
                status,
                patient:patient_profiles!patient_id (
                  user_id,
                  profile:profiles!user_id (
                    full_name
                  )
                )
              `)
              .eq('doctor_id', user.id)
              .order('starts_at', { ascending: true });
            if (fromDate) query = query.gte('starts_at', fromDate);
            if (toDate) {
              let toDateTime = toDate;
              if (/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
                toDateTime = `${toDate}T23:59:59`;
              }
              query = query.lte('starts_at', toDateTime);
            }
            const { data: appointmentsData, error: appointmentsError } = await query;
            if (appointmentsError) {
              console.error(appointmentsError);
              setLoading(false);
              return;
            }
            const mergedAppointments = appointmentsData.map(a => {
              let patientObj = Array.isArray(a.patient) && a.patient.length > 0 ? a.patient[0] : undefined;
              let patientName = 'Unknown Patient';
              if (patientObj && patientObj.profile && Array.isArray(patientObj.profile) && patientObj.profile.length > 0) {
                patientName = patientObj.profile[0].full_name || 'Unknown Patient';
              }
              return {
                ...a,
                patient_name: patientName,
              };
            });
            setAppointments(mergedAppointments || []);
        }
        setLoading(false);
      })();
    }, [fromDate, toDate]);

    if (loading) {
      return (
        <SafeAreaView style={styles.container}>
          <ActivityIndicator />
        </SafeAreaView>
      );
    }

    // No JS-side date filtering needed; appointments already filtered by Supabase
    const filteredAppointments = appointments;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.replace('/')} // Go back to dashboard
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back to dashboard"
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Appointments</Text>
          <Pressable onPress={() => router.push('/profile')} style={styles.profileBtn}>
            <MaterialCommunityIcons name="account-circle-outline" size={22} color="#007AFF" />
            <Text style={styles.profileText}>Profile</Text>
          </Pressable>
        </View>
        {/* Date Filter Inputs */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>From (YYYY-MM-DD):</Text>
          <TextInput
            style={styles.filterInput}
            value={fromDate}
            onChangeText={val => {
              setFromDate(val);
              updateUrlParams(val, toDate);
            }}
            placeholder="e.g. 2025-10-12"
            keyboardType="numeric"
            maxLength={10}
          />
          <Text style={[styles.filterLabel, { marginLeft: 12 }]}>To (YYYY-MM-DD):</Text>
          <TextInput
            style={styles.filterInput}
            value={toDate}
            onChangeText={val => {
              setToDate(val);
              updateUrlParams(fromDate, val);
            }}
            placeholder="e.g. 2025-11-12"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <FlatList
          data={filteredAppointments}
          keyExtractor={item => item.id}
          contentContainerStyle={filteredAppointments.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={<Text style={styles.emptyText}>No appointments scheduled.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/appointments/${item.id}`)} // ✅ Navigate to details page
              android_ripple={{ color: '#E2E8F0' }}
            >
              <View style={styles.cardRow}>
                <MaterialCommunityIcons name="account" size={28} color="#0EA5E9" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.patientName}>
                    {item.patient_name || 'Unknown Patient'}
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
      </SafeAreaView>
    );
  }

  function formatTime(ts: string) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function capitalize(str: string) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 12,
    },
    backBtn: {
      marginRight: 12,
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    backText: {
      fontSize: 16,
      color: '#007AFF',
      fontWeight: '600',
    },
    title: { fontSize: 28, fontWeight: '700', letterSpacing: 0.2 },
    profileBtn: { flexDirection: 'row', alignItems: 'center' },
    profileText: { marginLeft: 6, fontSize: 14, color: '#007AFF', fontWeight: '600' },
    card: {
      backgroundColor: '#F1F5F9',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      padding: 16,
      marginBottom: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    patientName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
    timeText: { fontSize: 15, color: '#0EA5E9', marginBottom: 2 },
    statusText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginTop: 40 },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    filterLabel: {
      fontSize: 15,
      marginRight: 8,
      color: '#0EA5E9',
      fontWeight: '600',
    },
    filterInput: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 15,
      minWidth: 120,
      backgroundColor: '#F8FAFC',
    },
  });

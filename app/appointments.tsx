import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
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

    useEffect(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (user) {
          // Step 1: Fetch appointments for this doctor, including patient_profiles
          const { data: appointmentsData, error: appointmentsError } = await supabase
            .from('appointments')
            .select(`
              id,
              starts_at,
              ends_at,
              status,
              patient:patient_profiles!patient_id (
                user_id
              )
            `)
            .eq('doctor_id', user.id)
            .order('starts_at', { ascending: true });
          if (appointmentsError) {
            console.error(appointmentsError);
            setLoading(false);
            return;
          }

          // Step 2: Get all patient user_ids from appointments
          const patientUserIds = appointmentsData
            .map(a => Array.isArray(a.patient) && a.patient.length > 0 ? a.patient[0].user_id : null)
            .filter((id): id is string => Boolean(id));

          // Step 3: Fetch profiles for all patient user_ids
          let profilesMap: { [key: string]: string } = {};
          if (patientUserIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('user_id', patientUserIds);
            if (profilesError) {
              console.error(profilesError);
            } else {
              profilesMap = Object.fromEntries(
                profilesData.map((profile: { user_id: string; full_name: string }) => [profile.user_id, profile.full_name])
              );
            }
          }

          // Step 4: Merge full_name into appointments
          const mergedAppointments = appointmentsData.map(a => {
            let patientId = Array.isArray(a.patient) && a.patient.length > 0 ? a.patient[0].user_id : undefined;
            return {
              ...a,
              patient_name: patientId && profilesMap[patientId] ? profilesMap[patientId] : 'Unknown Patient',
            };
          });
          setAppointments(mergedAppointments || []);
        }
        setLoading(false);
      })();
    }, []);

    if (loading) {
      return (
        <SafeAreaView style={styles.container}>
          <ActivityIndicator />
        </SafeAreaView>
      );
    }

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
        <FlatList
  data={appointments}
  keyExtractor={item => item.id}
  contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : undefined}
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
  });

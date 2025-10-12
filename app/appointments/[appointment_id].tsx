import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../../supabaseClient";

type PatientType = {
  full_name?: string;
  phone?: string;
  DOB?: string;
  date_of_birth?: string;
  medicare_number?: string;
  emergency_contact?: any;
};

type AllergyType = {
  substance: string;
  reaction?: string;
  severity?: string;
};

type PrescriptionType = {
  medication?: {
    generic_name?: string;
    brand_name?: string;
  };
  repeats?: number;
  dosage?: string;
};

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const { appointment_id } = useLocalSearchParams<{ appointment_id?: string }>();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientType | null>(null);
  const [allergies, setAllergies] = useState<AllergyType[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!appointment_id) return;
      setLoading(true);
      try {
        // ...existing code...
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .select("id, patient_id")
          .eq("id", appointment_id)
          .single();
        if (appointmentError || !appointmentData) {
          console.error("Error fetching appointment:", appointmentError);
          setLoading(false);
          return;
        }
        const patient_id = appointmentData.patient_id;
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, phone, DOB")
          .eq("user_id", patient_id)
          .single();
        const { data: patientProfile, error: patientProfileError } = await supabase
          .from("patient_profiles")
          .select("date_of_birth, medicare_number, emergency_contact")
          .eq("user_id", patient_id)
          .single();
        if (profileError) console.warn("Error fetching profile:", profileError);
        if (patientProfileError) console.warn("Error fetching patient profile:", patientProfileError);
        const mergedPatient: PatientType = {
          full_name: profileData?.full_name,
          phone: profileData?.phone,
          DOB: profileData?.DOB,
          date_of_birth: patientProfile?.date_of_birth,
          medicare_number: patientProfile?.medicare_number,
          emergency_contact: patientProfile?.emergency_contact,
        };
        setPatient(mergedPatient);
        const { data: allergiesData, error: allergiesError } = await supabase
          .from("patient_allergies")
          .select("substance, reaction, severity")
          .eq("patient_id", patient_id);
        if (allergiesError) console.warn("Error fetching allergies:", allergiesError);
        setAllergies(allergiesData || []);
        const { data: prescriptionsData, error: prescriptionsError } = await supabase
          .from("prescriptions")
          .select("id, notes")
          .eq("patient_id", patient_id);
        if (prescriptionsError) console.warn("Error fetching prescriptions:", prescriptionsError);
        const allItems: PrescriptionType[] = [];
        for (const presc of prescriptionsData || []) {
          const { data: items } = await supabase
            .from("prescription_items")
            .select("id, medication_id, sig_text, repeats_for_item")
            .eq("prescription_id", presc.id);
          for (const item of items || []) {
            const { data: med } = await supabase
              .from("medications")
              .select("generic_name, brand_name")
              .eq("id", item.medication_id)
              .single();
            allItems.push({
              medication: med ?? undefined,
              repeats: item.repeats_for_item,
              dosage: item.sig_text,
            });
          }
        }
        setPrescriptions(allItems);
      } catch (err) {
        console.error("Error loading appointment details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [appointment_id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0EA5E9" />
        <Text style={{ color: "#64748B", marginTop: 10 }}>Loading appointment details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.replace('/appointments')}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to appointments"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Appointment Details</Text>
        <Pressable onPress={() => router.push('/profile')} style={styles.profileBtn}>
          <MaterialCommunityIcons name="account-circle-outline" size={22} color="#007AFF" />
          <Text style={styles.profileText}>Profile</Text>
        </Pressable>
      </View>
      <ScrollView>
        {/* Patient Details */}
        <View style={styles.card}>
          <Text style={styles.patientName}>{patient?.full_name || "Patient"}</Text>
          <Text style={styles.infoText}>DOB: {patient?.DOB || patient?.date_of_birth || "-"}</Text>
          <Text style={styles.infoText}>Phone: {patient?.phone || "-"}</Text>
          <Text style={styles.infoText}>Medicare No: {patient?.medicare_number || "-"}</Text>
          <Text style={styles.infoText}>Emergency: {patient?.emergency_contact ? JSON.stringify(patient.emergency_contact) : "-"}</Text>
        </View>
        {/* Allergies */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          {allergies.length === 0 ? (
            <Text style={styles.infoText}>None</Text>
          ) : (
            allergies.map((a, i) => (
              <Text key={i} style={styles.infoText}>
                {a.substance}
                {a.reaction ? ` - ${a.reaction}` : ""}
                {a.severity ? ` (${a.severity})` : ""}
              </Text>
            ))
          )}
        </View>
        {/* Prescriptions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prescriptions</Text>
          {prescriptions.length === 0 ? (
            <Text style={styles.infoText}>None</Text>
          ) : (
            prescriptions.map((p, i) => (
              <Text key={i} style={styles.infoText}>
                {p.medication?.generic_name || p.medication?.brand_name || "Medication"} | repeats: {p.repeats ?? 0} | dosage: {p.dosage}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  patientName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  infoText: { fontSize: 15, color: '#0EA5E9', marginBottom: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#64748B', marginBottom: 8 },
});

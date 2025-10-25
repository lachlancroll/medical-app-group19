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

type AppointmentType = {
  date?: string;
  time?: string;
  doctor_name?: string;
  reason?: string;
  notes?: string;
};

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const { appointment_id } = useLocalSearchParams<{ appointment_id?: string }>();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientType | null>(null);
  const [appointment, setAppointment] = useState<AppointmentType | null>(null);
  const [allergies, setAllergies] = useState<AllergyType[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!appointment_id) return;
      setLoading(true);
      try {
        const { data: appointmentData, error: appointmentError } = await supabase
          .from("appointments")
          .select("id, patient_id, doctor_name, date, time, reason, notes")
          .eq("id", appointment_id)
          .single();

        if (appointmentError || !appointmentData) {
          console.error("Error fetching appointment:", appointmentError);
          setLoading(false);
          return;
        }

        setAppointment({
          doctor_name: appointmentData.doctor_name,
          date: appointmentData.date,
          time: appointmentData.time,
          reason: appointmentData.reason,
          notes: appointmentData.notes,
        });

        const patient_id = appointmentData.patient_id;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone, DOB")
          .eq("user_id", patient_id)
          .single();

        const { data: patientProfile } = await supabase
          .from("patient_profiles")
          .select("date_of_birth, medicare_number, emergency_contact")
          .eq("user_id", patient_id)
          .single();

        setPatient({
          full_name: profileData?.full_name,
          phone: profileData?.phone,
          DOB: profileData?.DOB,
          date_of_birth: patientProfile?.date_of_birth,
          medicare_number: patientProfile?.medicare_number,
          emergency_contact: patientProfile?.emergency_contact,
        });

        const { data: allergiesData } = await supabase
          .from("patient_allergies")
          .select("substance, reaction, severity")
          .eq("patient_id", patient_id);

        setAllergies(allergiesData || []);

        const { data: prescriptionsData } = await supabase
          .from("prescriptions")
          .select("id, notes")
          .eq("patient_id", patient_id);

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
        <Pressable onPress={() => router.replace('/appointments')} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Appointment Details</Text>
        <Pressable onPress={() => router.push('/profile')} style={styles.profileBtn}>
          <MaterialCommunityIcons name="account-circle-outline" size={22} color="#007AFF" />
          <Text style={styles.profileText}>Profile</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Appointment Overview */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Appointment Overview</Text>
          <Text style={styles.infoText}>Date: {appointment?.date || "-"}</Text>
          <Text style={styles.infoText}>Time: {appointment?.time || "-"}</Text>
          <Text style={styles.infoText}>Doctor: {appointment?.doctor_name || "-"}</Text>
          {appointment?.reason && <Text style={styles.infoText}>Reason: {appointment.reason}</Text>}
          {appointment?.notes && (
            <Text style={[styles.infoText, { marginTop: 4, fontStyle: "italic", color: "#64748B" }]}>
              Notes: {appointment.notes}
            </Text>
          )}
        </View>

        {/* Patient Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <Text style={styles.patientName}>{patient?.full_name || "Unknown Patient"}</Text>
          <Text style={styles.infoText}>Date of Birth: {patient?.DOB || patient?.date_of_birth || "-"}</Text>
          <Text style={styles.infoText}>Phone: {patient?.phone || "-"}</Text>
          <Text style={styles.infoText}>Medicare Number: {patient?.medicare_number || "-"}</Text>

          {patient?.emergency_contact ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.sectionTitle, { fontSize: 15 }]}>Emergency Contact</Text>
              {Object.entries(patient.emergency_contact).map(([key, value], idx) => (
                <Text key={idx} style={styles.infoText}>
                  {key.replace(/_/g, " ")}: {String(value)}
                </Text>
              ))}
            </View>
          ) : (
            <Text style={styles.infoText}>Emergency Contact: -</Text>
          )}
        </View>

        {/* Allergies */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          {allergies.length === 0 ? (
            <Text style={styles.infoText}>None reported</Text>
          ) : (
            allergies.map((a, i) => {
              let severityColor = "#0EA5E9";
              if (a.severity?.toLowerCase() === "high") severityColor = "#DC2626";
              else if (a.severity?.toLowerCase() === "moderate") severityColor = "#F59E0B";
              return (
                <Text key={i} style={[styles.infoText, { color: severityColor }]}>
                  {a.substance} {a.reaction ? ` - ${a.reaction}` : ""}{" "}
                  {a.severity ? `(${a.severity})` : ""}
                </Text>
              );
            })
          )}
        </View>

        {/* Prescriptions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Prescriptions</Text>
          {prescriptions.length === 0 ? (
            <Text style={styles.infoText}>No current prescriptions</Text>
          ) : (
            prescriptions.map((p, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text style={[styles.infoText, { fontWeight: "700" }]}>
                  {p.medication?.brand_name || p.medication?.generic_name || "Medication"}
                </Text>
                <Text style={[styles.infoText, { color: "#64748B" }]}>
                  Dosage: {p.dosage || "-"} | Repeats: {p.repeats ?? 0}
                </Text>
              </View>
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
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: 0.2 },
  profileBtn: { flexDirection: 'row', alignItems: 'center' },
  profileText: { marginLeft: 6, fontSize: 14, color: '#007AFF', fontWeight: '600' },
  card: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  patientName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  infoText: { fontSize: 15, color: '#0F172A', marginBottom: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
});

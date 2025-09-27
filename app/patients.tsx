import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
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

export default function PatientsList() {
  const router = useRouter();
  const [patients, setPatients] = useState<DBUser[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch all users
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, isDoctor');

      // Fetch all medications
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select('id, name, dosage, user_id');

      if (userError || medsError) {
        setLoading(false);
        return;
      }

      // Filter users who are NOT doctors (isDoctor !== true)
      let filteredPatients = (users || []).filter(
        (u: any) =>
          !u.isDoctor || u.isDoctor === false || u.isDoctor === "false"
      );

      setPatients(filteredPatients);
      setMedications(meds || []);
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
          onPress={() => router.replace('/')}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Patients List</Text>
      </View>
      <FlatList
        data={patients}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const patientMeds = medications.filter(med => med.user_id === item.id);
          return (
            <View style={styles.patientCard}>
              <Text style={styles.patientName}>
                {item.email}
              </Text>
              <Text style={styles.sectionTitle}>Medications:</Text>
              {patientMeds.length === 0 ? (
                <Text style={styles.noMeds}>No medications</Text>
              ) : (
                patientMeds.map(med => (
                  <Text key={med.id} style={styles.medication}>
                    {med.name} ({med.dosage})
                  </Text>
                ))
              )}
              <Pressable
                style={styles.addMedBtn}
                onPress={() => router.push({ pathname: '/medications', params: { user_id: item.id } })}
                accessibilityRole="button"
                accessibilityLabel={`Add medication for ${item.email}`}
              >
                <Text style={styles.addMedBtnText}>+ Add Medication</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<Text>No patients found.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: {
    marginRight: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", flex: 1 },
  patientCard: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  patientName: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "500", marginBottom: 4 },
  medication: { fontSize: 15, marginLeft: 8 },
  noMeds: { fontSize: 14, color: "#888", marginLeft: 8 },
  addMedBtn: {
    marginTop: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  addMedBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../supabaseClient';

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
  // ✅ Grab appointment_id from the REST-style URL: /appointments/<appointment_id>
  const { appointment_id } = useLocalSearchParams<{ appointment_id?: string }>();

  const [patient, setPatient] = useState<PatientType | null>(null);
  const [allergies, setAllergies] = useState<AllergyType[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionType[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!appointment_id) return;

      // 1. Get patient info from appointment
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('patient_id, patient:patient_profiles(full_name, phone, DOB)')
        .eq('id', appointment_id)
        .single();

      const patient_id = appointmentData?.patient_id;
      const patientInfo = appointmentData?.patient || {};

      // 2. Get additional patient profile
      const { data: patientProfile } = await supabase
        .from('patient_profiles')
        .select('medicare_number, emergency_contact, date_of_birth')
        .eq('user_id', patient_id)
        .single();

      setPatient({ ...patientInfo, ...patientProfile });

      // 3. Get allergies
      const { data: allergiesData } = await supabase
        .from('patient_allergies')
        .select('substance, reaction, severity')
        .eq('patient_id', patient_id);

      setAllergies(allergiesData || []);

      // 4. Get prescriptions
      const { data: prescriptionsData } = await supabase
        .from('prescriptions')
        .select('id, notes')
        .eq('patient_id', patient_id);

      const allItems: PrescriptionType[] = [];

      for (const presc of prescriptionsData || []) {
        const { data: items } = await supabase
          .from('prescription_items')
          .select('id, medication_id, sig_text, repeats_for_item')
          .eq('prescription_id', presc.id);

        for (const item of items || []) {
          const { data: med } = await supabase
            .from('medications')
            .select('generic_name, brand_name')
            .eq('id', item.medication_id)
            .single();

          allItems.push({
            medication: med ?? undefined,
            repeats: item.repeats_for_item,
            dosage: item.sig_text,
          });
        }
      }

      setPrescriptions(allItems);
    };

    fetchData();
  }, [appointment_id]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        {/* Patient Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{patient?.full_name || 'Patient'}</Text>
          <View style={styles.row}><Text>DOB: {patient?.DOB || patient?.date_of_birth || '-'}</Text></View>
          <View style={styles.row}><Text>Phone: {patient?.phone || '-'}</Text></View>
          <View style={styles.row}><Text>Medicare No: {patient?.medicare_number || '-'}</Text></View>
          <View style={styles.row}><Text>Emergency: {patient?.emergency_contact ? JSON.stringify(patient.emergency_contact) : '-'}</Text></View>
        </View>

        {/* Allergies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          {allergies.length === 0 ? (
            <Text>None</Text>
          ) : (
            allergies.map((a, i) => (
              <View key={i} style={styles.row}>
                <Text>
                  {a.substance}
                  {a.reaction ? ` - ${a.reaction}` : ''}
                  {a.severity ? ` (${a.severity})` : ''}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Prescriptions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prescriptions</Text>
          {prescriptions.length === 0 ? (
            <Text>None</Text>
          ) : (
            prescriptions.map((p, i) => (
              <View key={i} style={styles.row}>
                <Text>
                  {p.medication?.generic_name || p.medication?.brand_name || 'Medication'} | repeats: {p.repeats} | dosage: {p.dosage}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3af',
    marginBottom: 8,
  },
  row: {
    marginBottom: 6,
  },
});

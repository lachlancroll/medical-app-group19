import { supabase } from '@/lib/supabase';
import { Prescription, PrescriptionWithDetails, PrescriptionForm, PrescriptionFilters, PrescriptionItemForm } from '@/types/db';

export async function getPrescriptions(patientId: string, filters?: PrescriptionFilters): Promise<PrescriptionWithDetails[]> {
  let query = supabase
    .from('prescriptions')
    .select(`
      *,
      patient:patient_profiles!prescriptions_patient_id_fkey(
        *,
        profile:profiles!patient_profiles_user_id_fkey(*)
      ),
      doctor:doctor_profiles!prescriptions_doctor_id_fkey(
        *,
        profile:profiles!doctor_profiles_user_id_fkey(*)
      ),
      appointment:appointments(*),
      prescription_items(
        *,
        medication:medications(*)
      )
    `)
    .eq('patient_id', patientId)
    .order('prescribed_at', { ascending: false });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.doctor_id) {
    query = query.eq('doctor_id', filters.doctor_id);
  }

  if (filters?.medication_id) {
    query = query.eq('prescription_items.medication_id', filters.medication_id);
  }

  if (filters?.date_from) {
    query = query.gte('prescribed_at', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('prescribed_at', filters.date_to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPrescriptionById(prescriptionId: string): Promise<PrescriptionWithDetails | null> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patient:profiles!prescriptions_patient_id_fkey(*),
      doctor:profiles!prescriptions_doctor_id_fkey(*),
      appointment:appointments(*),
      prescription_items(
        *,
        medication:medications(*)
      )
    `)
    .eq('id', prescriptionId)
    .single();

  if (error) throw error;
  return data;
}

export async function createPrescription(prescription: PrescriptionForm, createdBy: string): Promise<Prescription> {
  // Start a transaction
  const { data: prescriptionData, error: prescriptionError } = await supabase
    .from('prescriptions')
    .insert({
      patient_id: prescription.patient_id,
      doctor_id: prescription.doctor_id,
      appointment_id: prescription.appointment_id,
      prescribed_at: new Date().toISOString(),
      start_date: prescription.start_date,
      end_date: prescription.end_date,
      status: 'active',
      repeats_total: prescription.repeats_total,
      repeats_remaining: prescription.repeats_total,
      generic_substitution: prescription.generic_substitution,
      created_by: createdBy,
      notes: prescription.notes,
    })
    .select()
    .single();

  if (prescriptionError) throw prescriptionError;

  // Add prescription items
  if (prescription.prescription_items && prescription.prescription_items.length > 0) {
    const prescriptionItems = prescription.prescription_items.map(item => ({
      prescription_id: prescriptionData.id,
      medication_id: item.medication_id,
      sig_text: item.sig_text,
      max_daily_dose: item.max_daily_dose,
      quantity_to_dispense: item.quantity_to_dispense,
      repeats_for_item: item.repeats_for_item,
      clinical_notes: item.clinical_notes,
    }));

    const { error: itemsError } = await supabase
      .from('prescription_items')
      .insert(prescriptionItems);

    if (itemsError) throw itemsError;
  }

  return prescriptionData;
}

export async function updatePrescription(prescriptionId: string, updates: Partial<PrescriptionForm>): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update({
      start_date: updates.start_date,
      end_date: updates.end_date,
      repeats_total: updates.repeats_total,
      generic_substitution: updates.generic_substitution,
      notes: updates.notes,
    })
    .eq('id', prescriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePrescriptionStatus(prescriptionId: string, status: string): Promise<Prescription> {
  const { data, error } = await supabase
    .from('prescriptions')
    .update({ status })
    .eq('id', prescriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function requestRefill(prescriptionId: string): Promise<Prescription> {
  const { data: prescription, error: fetchError } = await supabase
    .from('prescriptions')
    .select('repeats_remaining')
    .eq('id', prescriptionId)
    .single();

  if (fetchError) throw fetchError;

  if (prescription.repeats_remaining <= 0) {
    throw new Error('No refills remaining');
  }

  const { data, error } = await supabase
    .from('prescriptions')
    .update({ repeats_remaining: prescription.repeats_remaining - 1 })
    .eq('id', prescriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActivePrescriptions(patientId: string): Promise<PrescriptionWithDetails[]> {
  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patient:profiles!prescriptions_patient_id_fkey(*),
      doctor:profiles!prescriptions_doctor_id_fkey(*),
      prescription_items(
        *,
        medication:medications(*)
      )
    `)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .order('end_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getExpiringPrescriptions(patientId: string, days: number = 30): Promise<PrescriptionWithDetails[]> {
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() + days);

  const { data, error } = await supabase
    .from('prescriptions')
    .select(`
      *,
      patient:profiles!prescriptions_patient_id_fkey(*),
      doctor:profiles!prescriptions_doctor_id_fkey(*),
      prescription_items(
        *,
        medication:medications(*)
      )
    `)
    .eq('patient_id', patientId)
    .eq('status', 'active')
    .lte('end_date', expiryThreshold.toISOString())
    .order('end_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function addPrescriptionItem(prescriptionId: string, item: PrescriptionItemForm): Promise<void> {
  const { error } = await supabase
    .from('prescription_items')
    .insert({
      prescription_id: prescriptionId,
      medication_id: item.medication_id,
      sig_text: item.sig_text,
      max_daily_dose: item.max_daily_dose,
      quantity_to_dispense: item.quantity_to_dispense,
      repeats_for_item: item.repeats_for_item,
      clinical_notes: item.clinical_notes,
    });

  if (error) throw error;
}

export async function updatePrescriptionItem(itemId: string, updates: Partial<PrescriptionItemForm>): Promise<void> {
  const { error } = await supabase
    .from('prescription_items')
    .update({
      sig_text: updates.sig_text,
      max_daily_dose: updates.max_daily_dose,
      quantity_to_dispense: updates.quantity_to_dispense,
      repeats_for_item: updates.repeats_for_item,
      clinical_notes: updates.clinical_notes,
    })
    .eq('id', itemId);

  if (error) throw error;
}

export async function deletePrescriptionItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('prescription_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

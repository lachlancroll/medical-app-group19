import { supabase } from '@/lib/supabase';
import { Dispense, MedicationSchedule } from '@/types/db';

export async function getDispenses(prescriptionItemId: string): Promise<Dispense[]> {
  const { data, error } = await supabase
    .from('dispenses')
    .select('*')
    .eq('prescription_item_id', prescriptionItemId)
    .order('dispensed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createDispense(dispense: Omit<Dispense, 'id' | 'created_at'>): Promise<Dispense> {
  const { data, error } = await supabase
    .from('dispenses')
    .insert({
      ...dispense,
      dispensed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDispenseById(dispenseId: string): Promise<Dispense | null> {
  const { data, error } = await supabase
    .from('dispenses')
    .select('*')
    .eq('id', dispenseId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateDispense(dispenseId: string, updates: Partial<Dispense>): Promise<Dispense> {
  const { data, error } = await supabase
    .from('dispenses')
    .update(updates)
    .eq('id', dispenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDispense(dispenseId: string): Promise<void> {
  const { error } = await supabase
    .from('dispenses')
    .delete()
    .eq('id', dispenseId);

  if (error) throw error;
}

// Medication Schedule functions
export async function getMedicationSchedules(patientId: string): Promise<MedicationSchedule[]> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .select(`
      *,
      prescription_item:prescription_items(
        *,
        medication:medications(*),
        prescription:prescriptions!prescription_items_prescription_id_fkey(*)
      )
    `)
    .eq('prescription_item.prescription.patient_id', patientId)
    .order('next_dose', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createMedicationSchedule(schedule: Omit<MedicationSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<MedicationSchedule> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .insert(schedule)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMedicationSchedule(scheduleId: string, updates: Partial<MedicationSchedule>): Promise<MedicationSchedule> {
  const { data, error } = await supabase
    .from('medication_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function recordMedicationTaken(scheduleId: string): Promise<MedicationSchedule> {
  const now = new Date().toISOString();
  
  // Get the current schedule to calculate next dose
  const { data: currentSchedule, error: fetchError } = await supabase
    .from('medication_schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (fetchError) throw fetchError;

  // Calculate next dose based on prescription item frequency
  const nextDose = calculateNextDose(currentSchedule);

  const { data, error } = await supabase
    .from('medication_schedules')
    .update({
      last_taken: now,
      next_dose: nextDose,
    })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function calculateNextDose(schedule: MedicationSchedule): string {
  const now = new Date();
  const nextDose = new Date(now);
  
  // This would need to be implemented based on the prescription item's sig_text
  // For now, default to 8 hours later
  nextDose.setHours(nextDose.getHours() + 8);
  
  return nextDose.toISOString();
}

export async function getUpcomingDoses(patientId: string, limit: number = 5): Promise<MedicationSchedule[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('medication_schedules')
    .select(`
      *,
      prescription_item:prescription_items(
        *,
        medication:medications(*),
        prescription:prescriptions(*)
      )
    `)
    .eq('prescription_item.prescription.patient_id', patientId)
    .gte('next_dose', now)
    .eq('reminder_enabled', true)
    .order('next_dose', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getOverdueDoses(patientId: string): Promise<MedicationSchedule[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('medication_schedules')
    .select(`
      *,
      prescription_item:prescription_items(
        *,
        medication:medications(*),
        prescription:prescriptions(*)
      )
    `)
    .eq('prescription_item.prescription.patient_id', patientId)
    .lt('next_dose', now)
    .eq('reminder_enabled', true)
    .order('next_dose', { ascending: true });

  if (error) throw error;
  return data || [];
}

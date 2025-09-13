import { supabase } from '@/lib/supabase';
import { Medication, MedicationSchedule } from '@/types/db';

export async function getMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .order('generic_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getMedicationById(medicationId: string): Promise<Medication | null> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', medicationId)
    .single();

  if (error) throw error;
  return data;
}

export async function searchMedications(query: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .or(`generic_name.ilike.%${query}%,brand_name.ilike.%${query}%`)
    .order('generic_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getMedicationsByRoute(route: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('route', route)
    .order('generic_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getControlledMedications(): Promise<Medication[]> {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('is_controlled', true)
    .order('generic_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createMedication(medication: Omit<Medication, 'id' | 'created_at' | 'updated_at'>): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .insert(medication)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMedication(medicationId: string, updates: Partial<Medication>): Promise<Medication> {
  const { data, error } = await supabase
    .from('medications')
    .update(updates)
    .eq('id', medicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMedication(medicationId: string): Promise<void> {
  const { error } = await supabase
    .from('medications')
    .delete()
    .eq('id', medicationId);

  if (error) throw error;
}
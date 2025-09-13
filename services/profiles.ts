import { supabase } from '@/lib/supabase';
import { Profile, PatientProfile, DoctorProfile, ProfileForm, PatientProfileForm, PatientAllergy, PatientAllergyForm } from '@/types/db';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<ProfileForm>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createProfile(userId: string, profile: ProfileForm): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      ...profile,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Patient Profile functions
export async function getPatientProfile(userId: string): Promise<PatientProfile | null> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePatientProfile(userId: string, updates: Partial<PatientProfileForm>): Promise<PatientProfile> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createPatientProfile(userId: string, profile: PatientProfileForm): Promise<PatientProfile> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .insert({
      user_id: userId,
      ...profile,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Doctor Profile functions
export async function getDoctorProfile(userId: string): Promise<DoctorProfile | null> {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateDoctorProfile(userId: string, updates: Partial<DoctorProfile>): Promise<DoctorProfile> {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createDoctorProfile(userId: string, profile: Omit<DoctorProfile, 'user_id' | 'created_at' | 'updated_at'>): Promise<DoctorProfile> {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .insert({
      user_id: userId,
      ...profile,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function searchDoctors(filters: {
  specialties?: string[];
  city?: string;
  state?: string;
  consultation_fee_max?: number;
}): Promise<DoctorProfile[]> {
  let query = supabase
    .from('doctor_profiles')
    .select(`
      *,
      profile:profiles(*)
    `);

  if (filters.specialties && filters.specialties.length > 0) {
    query = query.overlaps('specialties', filters.specialties);
  }

  if (filters.city) {
    query = query.eq('profile.city', filters.city);
  }

  if (filters.state) {
    query = query.eq('profile.state', filters.state);
  }

  if (filters.consultation_fee_max) {
    query = query.lte('consultation_fee', filters.consultation_fee_max);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Patient Allergy functions
export async function getPatientAllergies(patientId: string): Promise<PatientAllergy[]> {
  const { data, error } = await supabase
    .from('patient_allergies')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addPatientAllergy(patientId: string, allergy: PatientAllergyForm, recordedBy: string): Promise<PatientAllergy> {
  const { data, error } = await supabase
    .from('patient_allergies')
    .insert({
      patient_id: patientId,
      recorded_by: recordedBy,
      recorded_at: new Date().toISOString(),
      ...allergy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePatientAllergy(allergyId: string, updates: Partial<PatientAllergyForm>): Promise<PatientAllergy> {
  const { data, error } = await supabase
    .from('patient_allergies')
    .update(updates)
    .eq('id', allergyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePatientAllergy(allergyId: string): Promise<void> {
  const { error } = await supabase
    .from('patient_allergies')
    .delete()
    .eq('id', allergyId);

  if (error) throw error;
}

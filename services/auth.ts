import { supabase } from '@/lib/supabase';
import { User, Profile, PatientProfile, DoctorProfile } from '@/types/db';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, userData: {
  full_name: string;
  phone?: string;
  role: 'patient' | 'doctor';
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: userData.full_name,
        phone: userData.phone,
        role: userData.role,
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getPatientProfile(userId: string): Promise<PatientProfile | null> {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getDoctorProfile(userId: string): Promise<DoctorProfile | null> {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function createUserProfile(userId: string, profileData: {
  full_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  blood_type?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      ...profileData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createPatientProfile(userId: string, patientData: {
  date_of_birth: string;
  medicare_number?: string;
  emergency_contact: string;
  medical_conditions?: string[];
  allergies?: string[];
  current_medications?: string[];
}) {
  const { data, error } = await supabase
    .from('patient_profiles')
    .insert({
      user_id: userId,
      ...patientData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createDoctorProfile(userId: string, doctorData: {
  provider_number: string;
  specialties: string[];
  clinic_affiliations: string[];
  consultation_fee?: number;
  availability_notes?: string;
}) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .insert({
      user_id: userId,
      ...doctorData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data?.role || null;
}

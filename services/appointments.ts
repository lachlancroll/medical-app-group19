import { supabase } from '@/lib/supabase';
import { Appointment, AppointmentFilters, AppointmentForm, AppointmentWithDetails } from '@/types/db';

export async function getAppointments(patientId: string, filters?: AppointmentFilters): Promise<AppointmentWithDetails[]> {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:patient_profiles!appointments_patient_id_fkey(
        *,
        profile:profiles!patient_profiles_user_id_fkey(*)
      ),
      doctor:doctor_profiles!appointments_doctor_id_fkey(
        *,
        profile:profiles!doctor_profiles_user_id_fkey(*)
      )
    `)
    .eq('patient_id', patientId)
    .order('starts_at', { ascending: true });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.date_from) {
    query = query.gte('starts_at', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('starts_at', filters.date_to);
  }

  if (filters?.doctor_id) {
    query = query.eq('doctor_id', filters.doctor_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getAppointmentById(appointmentId: string): Promise<AppointmentWithDetails | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patient_profiles!appointments_patient_id_fkey(
        *,
        profile:profiles!patient_profiles_user_id_fkey(*)
      ),
      doctor:doctor_profiles!appointments_doctor_id_fkey(
        *,
        profile:profiles!doctor_profiles_user_id_fkey(*)
      ),
      prescriptions(*)
    `)
    .eq('id', appointmentId)
    .single();

  if (error) throw error;
  return data;
}

export async function createAppointment(appointment: AppointmentForm, patientId: string, createdBy: string): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      doctor_id: appointment.doctor_id,
      patient_id: patientId,
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
      notes: appointment.notes,
      created_by: createdBy,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppointment(appointmentId: string, updates: Partial<AppointmentForm>): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update({
      doctor_id: updates.doctor_id,
      starts_at: updates.starts_at,
      ends_at: updates.ends_at,
      notes: updates.notes,
    })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(appointmentId: string, status: string): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAppointment(appointmentId: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);

  if (error) throw error;
}

export async function getUpcomingAppointments(patientId: string, limit: number = 5): Promise<AppointmentWithDetails[]> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(*),
      doctor:profiles!appointments_doctor_id_fkey(*)
    `)
    .eq('patient_id', patientId)
    .gte('starts_at', now)
    .in('status', ['scheduled', 'confirmed'])
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getAppointmentsByDoctor(doctorId: string, filters?: AppointmentFilters): Promise<AppointmentWithDetails[]> {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patient:profiles!appointments_patient_id_fkey(*),
      doctor:profiles!appointments_doctor_id_fkey(*)
    `)
    .eq('doctor_id', doctorId)
    .order('starts_at', { ascending: true });

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }

  if (filters?.date_from) {
    query = query.gte('starts_at', filters.date_from);
  }

  if (filters?.date_to) {
    query = query.lte('starts_at', filters.date_to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

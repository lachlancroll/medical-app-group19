//calls to PostgREST / RPC for appointments

import { supabase } from '@/lib/supabase';

export async function listMyAppointments() {
  const { data, error } = await supabase.rpc('list_my_appointments');
  if (error) throw error;
  return data;
}

export async function createAppointment(doctorId: string, startsAt: string, endsAt: string, notes?: string) {
  const { data, error } = await supabase.rpc('create_appointment', {
    doctor: doctorId,
    starts: startsAt,
    ends: endsAt,
    notes
  });
  if (error) throw error;
  return data;
}

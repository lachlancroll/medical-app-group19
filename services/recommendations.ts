// calls to edge functions
import { supabase } from '@/lib/supabase';

export async function recommendGPs(lat: number, lng: number, query?: string) {
  const { data, error } = await supabase.functions.invoke('recommend-gps', {
    body: { lat, lng, query }
  });
  if (error) throw error;
  return data.doctors;
}

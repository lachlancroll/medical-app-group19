import { createAppointment, listMyAppointments } from '@/services/appointments';
import { useEffect, useState } from 'react';

export function useAppointments() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listMyAppointments();
      setData(rows);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return { data, loading, error, refresh, createAppointment };
}

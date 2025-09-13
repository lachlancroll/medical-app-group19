import { createAppointment, getAppointments, getUpcomingAppointments } from '@/services/appointments';
import { AppointmentForm, AppointmentWithDetails } from '@/types/db';
import { useEffect, useState } from 'react';

export function useAppointments(patientId: string) {
  const [data, setData] = useState<AppointmentWithDetails[]>([]);
  const [upcoming, setUpcoming] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [appointments, upcomingAppointments] = await Promise.all([
        getAppointments(patientId),
        getUpcomingAppointments(patientId)
      ]);
      setData(appointments);
      setUpcoming(upcomingAppointments);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createNewAppointment = async (appointment: AppointmentForm, createdBy: string) => {
    try {
      const newAppointment = await createAppointment(appointment, patientId, createdBy);
      await refresh(); // Refresh the list
      return newAppointment;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  useEffect(() => { 
    if (patientId) {
      refresh(); 
    }
  }, [patientId]);

  return { 
    data, 
    upcoming,
    loading, 
    error, 
    refresh, 
    createAppointment: createNewAppointment 
  };
}

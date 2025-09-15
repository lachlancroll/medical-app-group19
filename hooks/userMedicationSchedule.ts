import { createMedicationSchedule, getMedicationSchedules, getOverdueDoses, getUpcomingDoses, recordMedicationTaken } from '@/services/dispenses';
import { MedicationSchedule } from '@/types/db';
import { useEffect, useState } from 'react';

export function useMedicationSchedule(patientId: string) {
  const [schedules, setSchedules] = useState<MedicationSchedule[]>([]);
  const [upcoming, setUpcoming] = useState<MedicationSchedule[]>([]);
  const [overdue, setOverdue] = useState<MedicationSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [allSchedules, upcomingDoses, overdueDoses] = await Promise.all([
        getMedicationSchedules(patientId),
        getUpcomingDoses(patientId),
        getOverdueDoses(patientId)
      ]);
      setSchedules(allSchedules);
      setUpcoming(upcomingDoses);
      setOverdue(overdueDoses);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const takeDose = async (scheduleId: string) => {
    try {
      await recordMedicationTaken(scheduleId);
      await refresh(); // Refresh the list
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const addSchedule = async (schedule: Omit<MedicationSchedule, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const newSchedule = await createMedicationSchedule(schedule);
      await refresh(); // Refresh the list
      return newSchedule;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  };

  const getDosesDueSoon = (hours: number = 2) => {
    const now = new Date();
    const soon = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return schedules.filter(schedule => 
      schedule.reminder_enabled && 
      new Date(schedule.next_dose) >= now && 
      new Date(schedule.next_dose) <= soon
    );
  };

  useEffect(() => {
    if (patientId) {
      refresh();
    }
  }, [patientId]);

  return {
    schedules,
    upcoming,
    overdue,
    loading,
    error,
    refresh,
    takeDose,
    addSchedule,
    getDosesDueSoon,
  };
}

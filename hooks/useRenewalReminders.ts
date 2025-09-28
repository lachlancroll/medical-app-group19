// Custom hook for renewal reminders
import { useCallback, useEffect, useState } from 'react';
import { NotificationService } from '../services/notification-service';
import { RenewalReminderService } from '../services/prescription-renewal';
import {
    RenewalReminder,
    RenewalReminderWithDetails,
    UseRenewalRemindersReturn
} from '../types/prescription-renewal';

export function useRenewalReminders(patientId?: string): UseRenewalRemindersReturn {
  const [reminders, setReminders] = useState<RenewalReminderWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh reminders
  const refreshReminders = useCallback(async () => {
    if (!patientId) return;

    setLoading(true);
    setError(null);

    try {
      const reminderList = await RenewalReminderService.getReminders(patientId);
      setReminders(reminderList);
    } catch (err: any) {
      setError(err.message);
      console.error('Error refreshing reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Create reminder
  const createReminder = useCallback(async (
    reminder: Omit<RenewalReminder, 'id' | 'created_at' | 'updated_at'>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const newReminder = await RenewalReminderService.createReminder(reminder);
      
      // Refresh the list to include the new reminder
      await refreshReminders();
      
      return newReminder;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshReminders]);

  // Mark reminder as sent
  const markReminderSent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await RenewalReminderService.markReminderSent(id);
      
      // Refresh the list to reflect the changes
      await refreshReminders();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshReminders]);

  // Cancel reminder
  const cancelReminder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await RenewalReminderService.cancelReminder(id);
      
      // Refresh the list to reflect the changes
      await refreshReminders();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshReminders]);

  // Initialize notifications
  const initializeNotifications = useCallback(async () => {
    try {
      await NotificationService.initialize();
    } catch (err: any) {
      console.error('Error initializing notifications:', err);
    }
  }, []);

  // Process due reminders
  const processDueReminders = useCallback(async () => {
    try {
      await NotificationService.processDueReminders();
    } catch (err: any) {
      console.error('Error processing due reminders:', err);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (patientId) {
      refreshReminders();
    }
  }, [patientId, refreshReminders]);

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();
  }, [initializeNotifications]);

  return {
    reminders,
    loading,
    error,
    refreshReminders,
    createReminder,
    markReminderSent,
    cancelReminder,
    initializeNotifications,
    processDueReminders
  };
}

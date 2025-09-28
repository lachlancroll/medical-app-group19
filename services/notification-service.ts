// Notification service for automated prescription renewal reminders
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../supabaseClient';
import { PrescriptionWithDetails, RenewalReminderWithDetails } from '../types/prescription-renewal';
import { RenewalReminderService } from './prescription-renewal';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  // Initialize notification permissions
  static async initialize(): Promise<boolean> {
    try {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.warn('Failed to get push token for push notification!');
          return false;
        }
        
        // Get push token for sending notifications
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token:', token);
        
        return true;
      } else {
        console.log('Must use physical device for Push Notifications');
        return false;
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Schedule local notification
  static async scheduleLocalNotification(
    title: string,
    body: string,
    data: any = {},
    triggerDate?: Date
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: triggerDate || null, // null means immediate
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw new Error('Failed to schedule notification');
    }
  }

  // Cancel notification
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel all notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Create renewal reminder for prescription
  static async createRenewalReminder(
    prescription: PrescriptionWithDetails,
    reminderType: 'expiry_warning' | 'refill_reminder' | 'renewal_due',
    daysBeforeExpiry: number = 7
  ): Promise<void> {
    try {
      if (!prescription.end_date) {
        console.warn('Prescription has no end date, cannot create reminder');
        return;
      }

      const endDate = new Date(prescription.end_date);
      const reminderDate = new Date(endDate);
      reminderDate.setDate(reminderDate.getDate() - daysBeforeExpiry);

      // Don't create reminders for past dates
      if (reminderDate <= new Date()) {
        return;
      }

      const medicationName = prescription.items[0]?.medication?.brand_name || 
                           prescription.items[0]?.medication?.generic_name || 
                           'medication';

      let message = '';
      let title = '';

      switch (reminderType) {
        case 'expiry_warning':
          title = 'Prescription Expiring Soon';
          message = `Your prescription for ${medicationName} will expire in ${daysBeforeExpiry} days. Consider requesting a renewal.`;
          break;
        case 'refill_reminder':
          title = 'Time for Refill';
          message = `It's time to refill your prescription for ${medicationName}.`;
          break;
        case 'renewal_due':
          title = 'Prescription Renewal Due';
          message = `Your prescription for ${medicationName} expires soon. Please request a renewal.`;
          break;
      }

      // Create database reminder record
      await RenewalReminderService.createReminder({
        prescription_id: prescription.id,
        patient_id: prescription.patient_id,
        reminder_type: reminderType,
        scheduled_date: reminderDate.toISOString(),
        status: 'scheduled',
        message
      });

      // Schedule local notification
      await this.scheduleLocalNotification(
        title,
        message,
        {
          prescription_id: prescription.id,
          reminder_type: reminderType,
          type: 'prescription_reminder'
        },
        reminderDate
      );

      console.log(`Created ${reminderType} reminder for prescription ${prescription.id}`);
    } catch (error) {
      console.error('Error creating renewal reminder:', error);
      throw new Error('Failed to create renewal reminder');
    }
  }

  // Process due reminders (called by background task or scheduled job)
  static async processDueReminders(): Promise<void> {
    try {
      const dueReminders = await RenewalReminderService.getDueReminders();
      
      for (const reminder of dueReminders) {
        try {
          // Send push notification
          await this.sendPushNotification(reminder);
          
          // Mark as sent in database
          await RenewalReminderService.markReminderSent(reminder.id);
          
          console.log(`Processed reminder ${reminder.id}`);
        } catch (error) {
          console.error(`Error processing reminder ${reminder.id}:`, error);
          // Mark as failed
          await this.markReminderFailed(reminder.id);
        }
      }
    } catch (error) {
      console.error('Error processing due reminders:', error);
    }
  }

  // Send push notification
  private static async sendPushNotification(reminder: RenewalReminderWithDetails): Promise<void> {
    try {
      if (!reminder.patient?.user_id) {
        throw new Error('Patient user ID not found');
      }

      // In a real app, you would send this to your push notification service
      // For now, we'll just log it
      console.log(`Sending push notification to user ${reminder.patient.user_id}:`, {
        title: this.getNotificationTitle(reminder.reminder_type),
        body: reminder.message || 'Prescription reminder',
        data: {
          prescription_id: reminder.prescription_id,
          reminder_type: reminder.reminder_type,
          type: 'prescription_reminder'
        }
      });

      // Schedule local notification as fallback
      await this.scheduleLocalNotification(
        this.getNotificationTitle(reminder.reminder_type),
        reminder.message || 'Prescription reminder',
        {
          prescription_id: reminder.prescription_id,
          reminder_type: reminder.reminder_type,
          type: 'prescription_reminder'
        }
      );
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Get notification title based on reminder type
  private static getNotificationTitle(reminderType: string): string {
    switch (reminderType) {
      case 'expiry_warning':
        return 'Prescription Expiring Soon';
      case 'refill_reminder':
        return 'Time for Refill';
      case 'renewal_due':
        return 'Prescription Renewal Due';
      default:
        return 'Prescription Reminder';
    }
  }

  // Mark reminder as failed
  private static async markReminderFailed(reminderId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('renewal_reminders')
        .update({ status: 'failed' })
        .eq('id', reminderId);

      if (error) {
        console.error('Error marking reminder as failed:', error);
      }
    } catch (error) {
      console.error('Error marking reminder as failed:', error);
    }
  }

  // Create multiple reminders for a prescription
  static async createPrescriptionReminders(prescription: PrescriptionWithDetails): Promise<void> {
    try {
      if (!prescription.end_date || prescription.status !== 'active') {
        return;
      }

      // Create 30-day warning
      await this.createRenewalReminder(prescription, 'expiry_warning', 30);
      
      // Create 7-day warning
      await this.createRenewalReminder(prescription, 'refill_reminder', 7);
      
      // Create 1-day warning
      await this.createRenewalReminder(prescription, 'renewal_due', 1);

      console.log(`Created reminders for prescription ${prescription.id}`);
    } catch (error) {
      console.error('Error creating prescription reminders:', error);
      throw new Error('Failed to create prescription reminders');
    }
  }

  // Cancel all reminders for a prescription
  static async cancelPrescriptionReminders(prescriptionId: string): Promise<void> {
    try {
      const { data: reminders, error } = await supabase
        .from('renewal_reminders')
        .select('id')
        .eq('prescription_id', prescriptionId)
        .eq('status', 'scheduled');

      if (error) {
        throw new Error(`Failed to fetch reminders: ${error.message}`);
      }

      for (const reminder of reminders || []) {
        await RenewalReminderService.cancelReminder(reminder.id);
      }

      console.log(`Cancelled reminders for prescription ${prescriptionId}`);
    } catch (error) {
      console.error('Error cancelling prescription reminders:', error);
      throw new Error('Failed to cancel prescription reminders');
    }
  }

  // Get notification history for user
  static async getNotificationHistory(userId: string): Promise<any[]> {
    try {
      // In a real app, you would fetch from your notification service
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error fetching notification history:', error);
      return [];
    }
  }
}

// Background task handler for processing reminders
export const processRemindersBackgroundTask = async (): Promise<void> => {
  try {
    console.log('Processing reminders background task started');
    await NotificationService.processDueReminders();
    console.log('Processing reminders background task completed');
  } catch (error) {
    console.error('Error in background task:', error);
  }
};

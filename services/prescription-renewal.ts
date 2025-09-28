// Service layer for prescription renewal operations
import { supabase } from '../supabaseClient';
import {
    PaginatedResponse,
    PrescriptionFilters,
    PrescriptionRenewal,
    PrescriptionRenewalWithDetails,
    PrescriptionStats,
    PrescriptionWithDetails,
    RenewalApprovalForm,
    RenewalFilters,
    RenewalReminder,
    RenewalReminderWithDetails,
    RenewalRequestForm,
    RenewalStats
} from '../types/prescription-renewal';

// Prescription Renewal Services
export class PrescriptionRenewalService {
  // Get renewals with optional filters
  static async getRenewals(
    filters: RenewalFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<PrescriptionRenewalWithDetails>> {
    try {
      let query = supabase
        .from('prescription_renewals')
        .select(`
          *,
          prescription:prescriptions (
            *,
            items:prescription_items (
              *,
              medication:medications (*)
            ),
            patient:patient_profiles (*),
            doctor:doctor_profiles (*)
          ),
          patient:patient_profiles (*),
          doctor:doctor_profiles (*)
        `)
        .order('request_date', { ascending: false });

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.prescription_id) {
        query = query.eq('prescription_id', filters.prescription_id);
      }
      if (filters.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters.date_from) {
        query = query.gte('request_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('request_date', filters.date_to);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch renewals: ${error.message}`);
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit
      };
    } catch (error: any) {
      throw new Error(`Error fetching renewals: ${error.message}`);
    }
  }

  // Get renewal by ID
  static async getRenewalById(id: string): Promise<PrescriptionRenewalWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('prescription_renewals')
        .select(`
          *,
          prescription:prescriptions (
            *,
            items:prescription_items (
              *,
              medication:medications (*)
            ),
            patient:patient_profiles (*),
            doctor:doctor_profiles (*)
          ),
          patient:patient_profiles (*),
          doctor:doctor_profiles (*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch renewal: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      throw new Error(`Error fetching renewal: ${error.message}`);
    }
  }

  // Create renewal request
  static async createRenewalRequest(
    request: RenewalRequestForm,
    patientId: string
  ): Promise<PrescriptionRenewal> {
    try {
      const renewalData = {
        prescription_id: request.prescription_id,
        patient_id: patientId,
        requested_by: patientId,
        status: 'pending' as const,
        request_date: new Date().toISOString(),
        requested_quantity: request.requested_quantity,
        requested_refills: request.requested_refills,
        patient_notes: request.patient_notes
      };

      const { data, error } = await supabase
        .from('prescription_renewals')
        .insert([renewalData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create renewal request: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      throw new Error(`Error creating renewal request: ${error.message}`);
    }
  }

  // Approve or reject renewal
  static async approveRenewal(approval: RenewalApprovalForm): Promise<void> {
    try {
      const updateData: any = {
        status: approval.approved ? 'approved' : 'rejected',
        approved_by: approval.approved ? (await this.getCurrentUserId()) : null,
        approved_at: new Date().toISOString(),
        doctor_notes: approval.doctor_notes,
        rejection_reason: approval.rejection_reason
      };

      const { error } = await supabase
        .from('prescription_renewals')
        .update(updateData)
        .eq('id', approval.renewal_id);

      if (error) {
        throw new Error(`Failed to update renewal: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(`Error updating renewal: ${error.message}`);
    }
  }

  // Mark renewal as dispensed
  static async markAsDispensed(renewalId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('prescription_renewals')
        .update({
          status: 'dispensed',
          dispensed_at: new Date().toISOString()
        })
        .eq('id', renewalId);

      if (error) {
        throw new Error(`Failed to mark renewal as dispensed: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(`Error marking renewal as dispensed: ${error.message}`);
    }
  }

  // Get renewal statistics
  static async getRenewalStats(patientId?: string): Promise<RenewalStats> {
    try {
      let query = supabase
        .from('prescription_renewals')
        .select('status');

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch renewal stats: ${error.message}`);
      }

      const stats = {
        total_renewals: data?.length || 0,
        pending_renewals: data?.filter(r => r.status === 'pending').length || 0,
        approved_renewals: data?.filter(r => r.status === 'approved').length || 0,
        rejected_renewals: data?.filter(r => r.status === 'rejected').length || 0,
        dispensed_renewals: data?.filter(r => r.status === 'dispensed').length || 0
      };

      return stats;
    } catch (error: any) {
      throw new Error(`Error fetching renewal stats: ${error.message}`);
    }
  }

  // Helper method to get current user ID
  private static async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }
}

// Prescription Tracking Services
export class PrescriptionTrackingService {
  // Get prescriptions with optional filters
  static async getPrescriptions(
    filters: PrescriptionFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<PrescriptionWithDetails>> {
    try {
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          items:prescription_items (
            *,
            medication:medications (*)
          ),
          patient:patient_profiles (*),
          doctor:doctor_profiles (*)
        `)
        .order('prescribed_at', { ascending: false });

      // Apply filters
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.patient_id) {
        query = query.eq('patient_id', filters.patient_id);
      }
      if (filters.doctor_id) {
        query = query.eq('created_by', filters.doctor_id);
      }
      if (filters.expiring_soon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query
          .eq('status', 'active')
          .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0]);
      }
      if (filters.date_from) {
        query = query.gte('prescribed_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('prescribed_at', filters.date_to);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch prescriptions: ${error.message}`);
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
        hasMore: (count || 0) > page * limit
      };
    } catch (error: any) {
      throw new Error(`Error fetching prescriptions: ${error.message}`);
    }
  }

  // Get active prescriptions
  static async getActivePrescriptions(patientId: string): Promise<PrescriptionWithDetails[]> {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          items:prescription_items (
            *,
            medication:medications (*)
          ),
          patient:patient_profiles (*),
          doctor:doctor_profiles (*)
        `)
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .order('prescribed_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch active prescriptions: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      throw new Error(`Error fetching active prescriptions: ${error.message}`);
    }
  }

  // Get expiring prescriptions (within 30 days)
  static async getExpiringPrescriptions(patientId: string): Promise<PrescriptionWithDetails[]> {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          items:prescription_items (
            *,
            medication:medications (*)
          ),
          patient:patient_profiles (*),
          doctor:doctor_profiles (*)
        `)
        .eq('patient_id', patientId)
        .eq('status', 'active')
        .lte('end_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .order('end_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch expiring prescriptions: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      throw new Error(`Error fetching expiring prescriptions: ${error.message}`);
    }
  }

  // Update prescription status
  static async updatePrescriptionStatus(
    id: string,
    status: 'active' | 'completed' | 'expired' | 'cancelled'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to update prescription status: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(`Error updating prescription status: ${error.message}`);
    }
  }

  // Get prescription statistics
  static async getPrescriptionStats(patientId?: string): Promise<PrescriptionStats> {
    try {
      let query = supabase
        .from('prescriptions')
        .select('status, end_date');

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch prescription stats: ${error.message}`);
      }

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const stats = {
        total_prescriptions: data?.length || 0,
        active_prescriptions: data?.filter(p => p.status === 'active').length || 0,
        expiring_soon: data?.filter(p => 
          p.status === 'active' && 
          p.end_date && 
          new Date(p.end_date) <= thirtyDaysFromNow &&
          new Date(p.end_date) >= now
        ).length || 0,
        expired_prescriptions: data?.filter(p => 
          p.status === 'expired' || 
          (p.end_date && new Date(p.end_date) < now)
        ).length || 0
      };

      return stats;
    } catch (error: any) {
      throw new Error(`Error fetching prescription stats: ${error.message}`);
    }
  }
}

// Renewal Reminder Services
export class RenewalReminderService {
  // Get reminders
  static async getReminders(patientId?: string): Promise<RenewalReminderWithDetails[]> {
    try {
      let query = supabase
        .from('renewal_reminders')
        .select(`
          *,
          prescription:prescriptions (
            *,
            items:prescription_items (
              *,
              medication:medications (*)
            ),
            patient:patient_profiles (*)
          ),
          patient:patient_profiles (*)
        `)
        .order('scheduled_date', { ascending: true });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch reminders: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      throw new Error(`Error fetching reminders: ${error.message}`);
    }
  }

  // Create reminder
  static async createReminder(
    reminder: Omit<RenewalReminder, 'id' | 'created_at' | 'updated_at'>
  ): Promise<RenewalReminder> {
    try {
      const { data, error } = await supabase
        .from('renewal_reminders')
        .insert([reminder])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create reminder: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      throw new Error(`Error creating reminder: ${error.message}`);
    }
  }

  // Mark reminder as sent
  static async markReminderSent(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('renewal_reminders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to mark reminder as sent: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(`Error marking reminder as sent: ${error.message}`);
    }
  }

  // Cancel reminder
  static async cancelReminder(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('renewal_reminders')
        .update({
          status: 'cancelled'
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to cancel reminder: ${error.message}`);
      }
    } catch (error: any) {
      throw new Error(`Error cancelling reminder: ${error.message}`);
    }
  }

  // Get due reminders (for automated processing)
  static async getDueReminders(): Promise<RenewalReminderWithDetails[]> {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('renewal_reminders')
        .select(`
          *,
          prescription:prescriptions (
            *,
            items:prescription_items (
              *,
              medication:medications (*)
            ),
            patient:patient_profiles (*)
          ),
          patient:patient_profiles (*)
        `)
        .eq('status', 'scheduled')
        .lte('scheduled_date', now)
        .order('scheduled_date', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch due reminders: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      throw new Error(`Error fetching due reminders: ${error.message}`);
    }
  }
}

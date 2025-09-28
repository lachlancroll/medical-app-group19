// Types for prescription renewal feature
import { Tables } from './database';

// Base types from database
export type Prescription = Tables<'prescriptions'>;
export type PrescriptionItem = Tables<'prescription_items'>;
export type Medication = Tables<'medications'>;
export type PrescriptionRenewal = Tables<'prescription_renewals'>;
export type RenewalReminder = Tables<'renewal_reminders'>;
export type PatientProfile = Tables<'patient_profiles'>;
export type DoctorProfile = Tables<'doctor_profiles'>;

// Extended types with relationships
export interface PrescriptionWithDetails extends Prescription {
  items: (PrescriptionItem & {
    medication: Medication | null;
  })[];
  patient: PatientProfile | null;
  doctor: DoctorProfile | null;
}

export interface PrescriptionRenewalWithDetails extends PrescriptionRenewal {
  prescription: PrescriptionWithDetails;
  patient: PatientProfile | null;
  doctor: DoctorProfile | null;
}

export interface RenewalReminderWithDetails extends RenewalReminder {
  prescription: PrescriptionWithDetails;
  patient: PatientProfile | null;
}

// Form types
export interface PrescriptionForm {
  patient_id: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  items: {
    medication_id: string;
    sig_text?: string | null;
    quantity?: number | null;
    refills_remaining?: number | null;
  }[];
}

export interface RenewalRequestForm {
  prescription_id: string;
  requested_quantity?: number | null;
  requested_refills?: number | null;
  patient_notes?: string | null;
}

export interface RenewalApprovalForm {
  renewal_id: string;
  approved: boolean;
  doctor_notes?: string | null;
  rejection_reason?: string | null;
}

// Filter types
export interface RenewalFilters {
  status?: ('pending' | 'approved' | 'rejected' | 'dispensed')[];
  prescription_id?: string;
  patient_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface PrescriptionFilters {
  status?: ('active' | 'completed' | 'expired' | 'cancelled')[];
  patient_id?: string;
  doctor_id?: string;
  expiring_soon?: boolean;
  date_from?: string;
  date_to?: string;
}

// Statistics types
export interface RenewalStats {
  total_renewals: number;
  pending_renewals: number;
  approved_renewals: number;
  rejected_renewals: number;
  dispensed_renewals: number;
}

export interface PrescriptionStats {
  total_prescriptions: number;
  active_prescriptions: number;
  expiring_soon: number;
  expired_prescriptions: number;
}

// Notification types
export interface RenewalNotification {
  id: string;
  type: 'renewal_reminder' | 'renewal_approved' | 'renewal_rejected' | 'prescription_expiring';
  title: string;
  message: string;
  prescription_id: string;
  renewal_id?: string;
  scheduled_date: string;
  sent: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Component prop types
export interface PrescriptionRenewalCardProps {
  renewal: PrescriptionRenewalWithDetails;
  onPress?: (renewal: PrescriptionRenewalWithDetails) => void;
  onApprove?: (renewalId: string) => void;
  onReject?: (renewalId: string) => void;
  showActions?: boolean;
}

export interface RenewalRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (request: RenewalRequestForm) => Promise<void>;
  prescriptionId: string;
  medicationName: string;
  loading?: boolean;
}

export interface PrescriptionTrackingCardProps {
  prescription: PrescriptionWithDetails;
  onRequestRenewal?: (prescriptionId: string) => void;
  onViewDetails?: (prescriptionId: string) => void;
  showRenewalButton?: boolean;
}

// Hook return types
export interface UsePrescriptionRenewalReturn {
  renewals: PrescriptionRenewalWithDetails[];
  loading: boolean;
  error: string | null;
  stats: RenewalStats | null;
  refreshRenewals: (filters?: RenewalFilters) => Promise<void>;
  requestRenewal: (request: RenewalRequestForm) => Promise<PrescriptionRenewal>;
  approveRenewal: (approval: RenewalApprovalForm) => Promise<void>;
  getRenewalById: (id: string) => Promise<PrescriptionRenewalWithDetails | null>;
}

export interface UsePrescriptionTrackingReturn {
  prescriptions: PrescriptionWithDetails[];
  activePrescriptions: PrescriptionWithDetails[];
  expiringPrescriptions: PrescriptionWithDetails[];
  loading: boolean;
  error: string | null;
  stats: PrescriptionStats | null;
  refreshPrescriptions: (filters?: PrescriptionFilters) => Promise<void>;
  getPrescriptionById: (id: string) => Promise<PrescriptionWithDetails | null>;
  updatePrescriptionStatus: (id: string, status: Prescription['status']) => Promise<void>;
}

export interface UseRenewalRemindersReturn {
  reminders: RenewalReminderWithDetails[];
  loading: boolean;
  error: string | null;
  refreshReminders: () => Promise<void>;
  createReminder: (reminder: Omit<RenewalReminder, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  markReminderSent: (id: string) => Promise<void>;
  cancelReminder: (id: string) => Promise<void>;
}

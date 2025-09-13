// Database types matching Supabase schema

// Enums
export type UserRole = 'patient' | 'doctor' | 'admin' | 'pharmacist';
export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';
export type MedicationRoute = 'oral' | 'topical' | 'injection' | 'inhalation' | 'sublingual' | 'rectal' | 'vaginal' | 'ophthalmic' | 'otic' | 'nasal';
export type DoseUnit = 'mg' | 'g' | 'ml' | 'mcg' | 'units' | 'tablets' | 'capsules' | 'drops' | 'puffs';
export type PrescriptionStatus = 'active' | 'completed' | 'cancelled' | 'expired' | 'suspended';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

// Core Tables
export interface User {
  id: string; // uuid
  email: string;
  created_at: string;
}

export interface UserRole {
  user_id: string; // uuid, foreign key to users.id
  role: UserRole;
  granted_at: string;
}

export interface Profile {
  user_id: string; // uuid, foreign key to users.id
  full_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  blood_type?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientProfile {
  user_id: string; // uuid, foreign key to users.id
  date_of_birth: string;
  medicare_number?: string;
  emergency_contact: string;
  medical_conditions?: string[];
  allergies?: string[];
  current_medications?: string[];
  created_at: string;
  updated_at: string;
}

export interface DoctorProfile {
  user_id: string; // uuid, foreign key to users.id
  provider_number: string;
  specialties: string[];
  clinic_affiliations: string[];
  consultation_fee?: number;
  availability_notes?: string;
  created_at: string;
  updated_at: string;
}

// Medical Data Tables
export interface PatientAllergy {
  id: string; // uuid
  patient_id: string; // uuid, foreign key to patient_profiles.user_id
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  recorded_at: string;
  recorded_by: string; // uuid, foreign key to users.id
  notes?: string;
}

export interface Medication {
  id: string; // uuid
  generic_name: string;
  brand_name?: string;
  item: MedicationRoute;
  route: MedicationRoute;
  strength_value: number;
  strength_unit: DoseUnit;
  atc_code?: string;
  is_controlled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Prescription {
  id: string; // uuid
  patient_id: string; // uuid, foreign key to patient_profiles.user_id
  doctor_id: string; // uuid, foreign key to doctor_profiles.user_id
  appointment_id?: string; // uuid, foreign key to appointments.id
  prescribed_at: string;
  start_date: string;
  end_date: string;
  status: PrescriptionStatus;
  repeats_total: number;
  repeats_remaining: number;
  generic_substitution: boolean;
  created_by: string; // uuid, foreign key to users.id
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string; // uuid
  prescription_id: string; // uuid, foreign key to prescriptions.id
  medication_id: string; // uuid, foreign key to medications.id
  sig_text: string; // Instructions for use
  max_daily_dose?: number;
  quantity_to_dispense: number;
  repeats_for_item: number;
  clinical_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Dispense {
  id: string; // uuid
  prescription_item_id: string; // uuid, foreign key to prescription_items.id
  dispensed_at: string;
  quantity: number;
  repeat_number: number;
  dispensed_by: string; // uuid, foreign key to users.id
  notes?: string;
  created_at: string;
}

export interface Appointment {
  id: string; // uuid
  starts_at: string;
  ends_at: string;
  doctor_id: string; // uuid, foreign key to doctor_profiles.user_id
  patient_id: string; // uuid, foreign key to patient_profiles.user_id
  status: AppointmentStatus;
  notes?: string;
  created_by: string; // uuid, foreign key to users.id
  created_at: string;
  updated_at: string;
}

// Extended types with relationships
export interface PrescriptionWithDetails extends Prescription {
  patient?: Profile;
  doctor?: DoctorProfile;
  prescription_items?: (PrescriptionItem & { medication?: Medication })[];
  appointment?: Appointment;
}

export interface AppointmentWithDetails extends Appointment {
  patient?: Profile;
  doctor?: Profile;
  prescriptions?: Prescription[];
}

export interface PatientWithProfile {
  user: User;
  profile: Profile;
  patient_profile: PatientProfile;
  allergies: PatientAllergy[];
}

export interface DoctorWithProfile {
  user: User;
  profile: Profile;
  doctor_profile: DoctorProfile;
}

// Form types
export interface AppointmentForm {
  doctor_id: string;
  starts_at: string;
  ends_at: string;
  notes?: string;
}

export interface PrescriptionForm {
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  start_date: string;
  end_date: string;
  repeats_total: number;
  generic_substitution: boolean;
  notes?: string;
  prescription_items: PrescriptionItemForm[];
}

export interface PrescriptionItemForm {
  medication_id: string;
  sig_text: string;
  max_daily_dose?: number;
  quantity_to_dispense: number;
  repeats_for_item: number;
  clinical_notes?: string;
}

export interface PatientAllergyForm {
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  notes?: string;
}

export interface ProfileForm {
  full_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  blood_type?: string;
}

export interface PatientProfileForm {
  date_of_birth: string;
  medicare_number?: string;
  emergency_contact: string;
  medical_conditions?: string[];
  allergies?: string[];
  current_medications?: string[];
}

// Search and filter types
export interface DoctorSearchFilters {
  specialties?: string[];
  city?: string;
  state?: string;
  availability?: string[];
  consultation_fee_max?: number;
}

export interface AppointmentFilters {
  status?: AppointmentStatus[];
  date_from?: string;
  date_to?: string;
  doctor_id?: string;
  patient_id?: string;
}

export interface PrescriptionFilters {
  status?: PrescriptionStatus[];
  patient_id?: string;
  doctor_id?: string;
  medication_id?: string;
  date_from?: string;
  date_to?: string;
}

// Statistics types
export interface HealthStats {
  total_appointments: number;
  upcoming_appointments: number;
  active_prescriptions: number;
  expiring_prescriptions: number;
  allergies_count: number;
  last_appointment?: string;
  next_appointment?: string;
}

export interface PrescriptionStats {
  total_prescriptions: number;
  active_prescriptions: number;
  completed_prescriptions: number;
  expiring_soon: number;
  adherence_rate: number;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Utility types
export interface MedicationSchedule {
  id: string;
  prescription_item_id: string;
  next_dose: string;
  last_taken?: string;
  reminder_enabled: boolean;
  reminder_time?: string;
  created_at: string;
  updated_at: string;
  prescription_item?: PrescriptionItem & { medication?: Medication };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'appointment' | 'prescription' | 'medication' | 'allergy' | 'general';
  title: string;
  message: string;
  is_read: boolean;
  scheduled_for?: string;
  created_at: string;
  updated_at: string;
}
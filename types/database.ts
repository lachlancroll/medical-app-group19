// Database types for the medical app
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          updated_at?: string;
        };
      };
      patient_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          date_of_birth: string | null;
          phone: string | null;
          emergency_contact: string | null;
          medical_conditions: string[] | null;
          allergies: string[] | null;
          blood_type: string | null;
          insurance_provider: string | null;
          insurance_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          medical_conditions?: string[] | null;
          allergies?: string[] | null;
          blood_type?: string | null;
          insurance_provider?: string | null;
          insurance_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          date_of_birth?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          medical_conditions?: string[] | null;
          allergies?: string[] | null;
          blood_type?: string | null;
          insurance_provider?: string | null;
          insurance_number?: string | null;
          updated_at?: string;
        };
      };
      doctor_profiles: {
        Row: {
          id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          specialty: string | null;
          license_number: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          first_name?: string | null;
          last_name?: string | null;
          specialty?: string | null;
          license_number?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          specialty?: string | null;
          license_number?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
      };
      doctor_patient: {
        Row: {
          id: string;
          doctor_id: string;
          patient_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          doctor_id: string;
          patient_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          doctor_id?: string;
          patient_id?: string;
        };
      };
      medications: {
        Row: {
          id: string;
          generic_name: string | null;
          brand_name: string | null;
          form: string | null;
          strength_value: number | null;
          strength_unit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          generic_name?: string | null;
          brand_name?: string | null;
          form?: string | null;
          strength_value?: number | null;
          strength_unit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          generic_name?: string | null;
          brand_name?: string | null;
          form?: string | null;
          strength_value?: number | null;
          strength_unit?: string | null;
          updated_at?: string;
        };
      };
      prescriptions: {
        Row: {
          id: string;
          patient_id: string;
          created_by: string;
          prescribed_at: string;
          start_date: string | null;
          end_date: string | null;
          status: 'active' | 'completed' | 'expired' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          created_by: string;
          prescribed_at?: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'active' | 'completed' | 'expired' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          created_by?: string;
          prescribed_at?: string;
          start_date?: string | null;
          end_date?: string | null;
          status?: 'active' | 'completed' | 'expired' | 'cancelled';
          notes?: string | null;
          updated_at?: string;
        };
      };
      prescription_items: {
        Row: {
          id: string;
          prescription_id: string;
          medication_id: string;
          sig_text: string | null;
          quantity: number | null;
          refills_remaining: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          medication_id: string;
          sig_text?: string | null;
          quantity?: number | null;
          refills_remaining?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prescription_id?: string;
          medication_id?: string;
          sig_text?: string | null;
          quantity?: number | null;
          refills_remaining?: number | null;
          updated_at?: string;
        };
      };
      prescription_renewals: {
        Row: {
          id: string;
          prescription_id: string;
          patient_id: string;
          requested_by: string;
          status: 'pending' | 'approved' | 'rejected' | 'dispensed';
          request_date: string;
          requested_quantity: number | null;
          requested_refills: number | null;
          patient_notes: string | null;
          doctor_notes: string | null;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          dispensed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          patient_id: string;
          requested_by: string;
          status?: 'pending' | 'approved' | 'rejected' | 'dispensed';
          request_date?: string;
          requested_quantity?: number | null;
          requested_refills?: number | null;
          patient_notes?: string | null;
          doctor_notes?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          dispensed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prescription_id?: string;
          patient_id?: string;
          requested_by?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'dispensed';
          request_date?: string;
          requested_quantity?: number | null;
          requested_refills?: number | null;
          patient_notes?: string | null;
          doctor_notes?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          dispensed_at?: string | null;
          updated_at?: string;
        };
      };
      renewal_reminders: {
        Row: {
          id: string;
          prescription_id: string;
          patient_id: string;
          reminder_type: 'expiry_warning' | 'refill_reminder' | 'renewal_due';
          scheduled_date: string;
          sent_at: string | null;
          status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prescription_id: string;
          patient_id: string;
          reminder_type: 'expiry_warning' | 'refill_reminder' | 'renewal_due';
          scheduled_date: string;
          sent_at?: string | null;
          status?: 'scheduled' | 'sent' | 'failed' | 'cancelled';
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prescription_id?: string;
          patient_id?: string;
          reminder_type?: 'expiry_warning' | 'refill_reminder' | 'renewal_due';
          scheduled_date?: string;
          sent_at?: string | null;
          status?: 'scheduled' | 'sent' | 'failed' | 'cancelled';
          message?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      prescription_status: 'active' | 'completed' | 'expired' | 'cancelled';
      renewal_status: 'pending' | 'approved' | 'rejected' | 'dispensed';
      reminder_status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
      reminder_type: 'expiry_warning' | 'refill_reminder' | 'renewal_due';
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

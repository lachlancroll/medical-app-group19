-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  starts_at timestamp without time zone NOT NULL,
  ends_at timestamp without time zone NOT NULL,
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  status character varying NOT NULL DEFAULT 'scheduled'::character varying,
  created_by uuid NOT NULL,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor_profiles(user_id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(user_id),
  CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.dispenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prescription_item_id uuid NOT NULL,
  dispensed_at timestamp without time zone NOT NULL DEFAULT now(),
  quantity numeric NOT NULL,
  repeat_number integer CHECK (repeat_number IS NULL OR repeat_number >= 0),
  dispensed_by uuid,
  notes text,
  CONSTRAINT dispenses_pkey PRIMARY KEY (id),
  CONSTRAINT dispenses_prescription_item_id_fkey FOREIGN KEY (prescription_item_id) REFERENCES public.prescription_items(id),
  CONSTRAINT dispenses_dispensed_by_fkey FOREIGN KEY (dispensed_by) REFERENCES public.users(id)
);
CREATE TABLE public.doctor_patient (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  CONSTRAINT doctor_patient_pkey PRIMARY KEY (id, doctor_id, patient_id),
  CONSTRAINT doctor_patient_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctor_profiles(user_id),
  CONSTRAINT doctor_patient_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(user_id)
);
CREATE TABLE public.doctor_profiles (
  user_id uuid NOT NULL,
  provider_number character varying UNIQUE,
  specialties ARRAY,
  clinic_affiliations ARRAY,
  CONSTRAINT doctor_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT doctor_profiles_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.medications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  generic_name character varying NOT NULL,
  brand_name character varying,
  form character varying,
  route USER-DEFINED,
  strength_value numeric,
  strength_unit USER-DEFINED,
  atc_code character varying,
  is_controlled boolean NOT NULL DEFAULT false,
  notes text,
  CONSTRAINT medications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.patient_allergies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  substance character varying NOT NULL,
  reaction character varying,
  severity USER-DEFINED,
  recorded_at timestamp without time zone NOT NULL DEFAULT now(),
  recorded_by uuid,
  notes text,
  CONSTRAINT patient_allergies_pkey PRIMARY KEY (id),
  CONSTRAINT patient_allergies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(user_id),
  CONSTRAINT patient_allergies_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id)
);
CREATE TABLE public.patient_profiles (
  user_id uuid NOT NULL,
  date_of_birth date,
  medicare_number character varying,
  emergency_contact jsonb,
  CONSTRAINT patient_profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT patient_profiles_user_id_fkey1 FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.prescription_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL,
  medication_id uuid NOT NULL,
  sig_text text NOT NULL,
  max_daily_dose numeric,
  quantity_to_dispense numeric,
  repeats_for_item integer,
  clinical_notes text,
  CONSTRAINT prescription_items_pkey PRIMARY KEY (id),
  CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id),
  CONSTRAINT prescription_items_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id)
);
CREATE TABLE public.prescriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  appointment_id uuid,
  prescribed_at timestamp without time zone NOT NULL DEFAULT now(),
  start_date date,
  end_date date,
  status USER-DEFINED NOT NULL DEFAULT 'active'::prescription_status,
  repeats_total integer NOT NULL DEFAULT 0,
  repeats_remaining integer NOT NULL DEFAULT 0,
  generic_substitution_allowed boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  notes text,
  CONSTRAINT prescriptions_pkey PRIMARY KEY (id),
  CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_profiles(user_id),
  CONSTRAINT prescriptions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT prescriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  full_name character varying,
  phone character varying,
  DOB date NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  granted_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  isDoctor boolean DEFAULT false,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
-- users
INSERT INTO users VALUES
  ('5c07f1cf-3f9a-4120-ba4a-af5cc7e96f22', 'alice.smith@example.com', NOW(), false),
  ('d3f5ae99-ae59-4577-a06a-e9a9287d284b', 'bob.jones@example.com', NOW(), false),
  ('8761528c-54be-4605-ac27-e8d52755bc0b', 'alfred.heshmat912+dr@gmail.com', NOW(), true);

-- profiles
INSERT INTO profiles VALUES
  ('5c07f1cf-3f9a-4120-ba4a-af5cc7e96f22', 'Alice Smith', '0400000001', '1990-01-01'),
  ('d3f5ae99-ae59-4577-a06a-e9a9287d284b', 'Bob Jones', '0400000002', '1985-05-15');

-- patient_profiles
INSERT INTO doctor_profiles (user_id, provider_number) VALUES
  ('8761528c-54be-4605-ac27-e8d52755bc0b', '123');

-- patient_profiles
INSERT INTO patient_profiles (user_id, date_of_birth, medicare_number, emergency_contact) VALUES
  ('5c07f1cf-3f9a-4120-ba4a-af5cc7e96f22', '1990-01-01', '1234567890', '{"name":"Jane Smith","phone":"0400000003"}'),
  ('d3f5ae99-ae59-4577-a06a-e9a9287d284b', '1985-05-15', '9876543210', '{"name":"John Jones","phone":"0400000004"}');

-- patient_allergies
INSERT INTO patient_allergies (id, patient_id, substance, reaction, severity, recorded_at, recorded_by, notes) VALUES
  ('e44c2be5-b8fb-4fed-91d0-32434511ab6c', '5c07f1cf-3f9a-4120-ba4a-af5cc7e96f22', 'Penicillin', 'Rash', 'mild', NOW(), NULL, 'No severe reaction'),
  ('4945ecf3-52b8-44d1-baba-6113665c0fce', 'd3f5ae99-ae59-4577-a06a-e9a9287d284b', 'Peanuts', 'Anaphylaxis', 'severe', NOW(), NULL, 'Carries EpiPen');

-- medications
INSERT INTO medications (id, generic_name, brand_name, form, route, strength_value, strength_unit, atc_code, is_controlled, notes) VALUES
  ('13d7975b-6678-45a6-8445-41bea8086343', 'Paracetamol', 'Panadol', 'tablet', 'oral', 500, 'mg', 'N02BE01', false, 'OTC pain relief'),
  ('8b201758-5de2-4b83-afbe-c8aa42c52c2a', 'Amoxicillin', 'Amoxil', 'capsule', 'oral', 250, 'mg', 'J01CA04', false, 'Antibiotic');

-- appointments
INSERT INTO appointments (id, starts_at, ends_at, doctor_id, patient_id, status, created_by) VALUES
  ('19869ba6-d9f0-4d32-9d23-aa147c42aa1b', '2025-10-13 09:00', '2025-10-13 09:30', '8761528c-54be-4605-ac27-e8d52755bc0b', '5c07f1cf-3f9a-4120-ba4a-af5cc7e96f22', 'scheduled', '8761528c-54be-4605-ac27-e8d52755bc0b'),
  ('307323f6-c96e-4bab-a2ec-5d06f896a2d2', '2025-10-14 10:00', '2025-10-14 10:30', '8761528c-54be-4605-ac27-e8d52755bc0b', 'd3f5ae99-ae59-4577-a06a-e9a9287d284b', 'scheduled', '8761528c-54be-4605-ac27-e8d52755bc0b');

-- prescriptions
INSERT INTO prescriptions (id, patient_id, appointment_id, prescribed_at, start_date, end_date, status, repeats_total, repeats_remaining, generic_substitution_allowed, created_by, notes) VALUES
  ('05ab88dd-3566-4583-888e-78cb8349ee29', '5c07f1cf-3f9a-4120-ba4a-af5cc7e96f22', '19869ba6-d9f0-4d32-9d23-aa147c42aa1b', NOW(), '2025-10-13', '2025-10-20', 'active', 1, 1, true, '8761528c-54be-4605-ac27-e8d52755bc0b', 'Take as needed'),
  ('9d729116-f0ec-4adc-8049-f9bddbf6c690', 'd3f5ae99-ae59-4577-a06a-e9a9287d284b', '307323f6-c96e-4bab-a2ec-5d06f896a2d2', NOW(), '2025-10-14', '2025-10-21', 'active', 2, 2, true, '8761528c-54be-4605-ac27-e8d52755bc0b', 'Finish course');

-- prescription_items
INSERT INTO prescription_items (id, prescription_id, medication_id, sig_text, max_daily_dose, quantity_to_dispense, repeats_for_item, clinical_notes) VALUES
  ('dc059b50-b46b-41b2-bcc3-ea32d12d4e45', '05ab88dd-3566-4583-888e-78cb8349ee29', '13d7975b-6678-45a6-8445-41bea8086343', 'Take 1 tablet every 6 hours as needed', 4000, 20, 1, 'Pain relief'),
  ('ee62d0d3-27f7-486d-9289-cb6269c0f61c', '9d729116-f0ec-4adc-8049-f9bddbf6c690', '8b201758-5de2-4b83-afbe-c8aa42c52c2a', 'Take 1 capsule three times daily', 750, 21, 2, 'Antibiotic course');
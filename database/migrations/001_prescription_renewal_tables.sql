-- Migration: Create prescription renewal tables
-- This migration creates the necessary tables for the prescription renewal feature

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create prescription_renewals table
CREATE TABLE IF NOT EXISTS prescription_renewals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'dispensed')) DEFAULT 'pending',
    request_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    requested_quantity INTEGER,
    requested_refills INTEGER,
    patient_notes TEXT,
    doctor_notes TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    dispensed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create renewal_reminders table
CREATE TABLE IF NOT EXISTS renewal_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('expiry_warning', 'refill_reminder', 'renewal_due')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')) DEFAULT 'scheduled',
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prescription_renewals_prescription_id ON prescription_renewals(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_renewals_patient_id ON prescription_renewals(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescription_renewals_status ON prescription_renewals(status);
CREATE INDEX IF NOT EXISTS idx_prescription_renewals_request_date ON prescription_renewals(request_date);

CREATE INDEX IF NOT EXISTS idx_renewal_reminders_prescription_id ON renewal_reminders(prescription_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_patient_id ON renewal_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_status ON renewal_reminders(status);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_scheduled_date ON renewal_reminders(scheduled_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_prescription_renewals_updated_at 
    BEFORE UPDATE ON prescription_renewals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_renewal_reminders_updated_at 
    BEFORE UPDATE ON renewal_reminders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add refills_remaining column to prescription_items if it doesn't exist
ALTER TABLE prescription_items 
ADD COLUMN IF NOT EXISTS refills_remaining INTEGER DEFAULT 0;

-- Add quantity column to prescription_items if it doesn't exist
ALTER TABLE prescription_items 
ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- Create RLS (Row Level Security) policies
ALTER TABLE prescription_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE renewal_reminders ENABLE ROW LEVEL SECURITY;

-- Policy for prescription_renewals: Users can only see their own renewals
CREATE POLICY "Users can view their own prescription renewals" ON prescription_renewals
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM patient_profiles WHERE user_id = auth.uid()
        ) OR
        requested_by = auth.uid() OR
        approved_by = auth.uid()
    );

-- Policy for prescription_renewals: Users can insert their own renewals
CREATE POLICY "Users can create their own prescription renewals" ON prescription_renewals
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM patient_profiles WHERE user_id = auth.uid()
        ) AND
        requested_by = auth.uid()
    );

-- Policy for prescription_renewals: Users can update their own renewals
CREATE POLICY "Users can update their own prescription renewals" ON prescription_renewals
    FOR UPDATE USING (
        patient_id IN (
            SELECT id FROM patient_profiles WHERE user_id = auth.uid()
        ) OR
        requested_by = auth.uid() OR
        approved_by = auth.uid()
    );

-- Policy for renewal_reminders: Users can only see their own reminders
CREATE POLICY "Users can view their own renewal reminders" ON renewal_reminders
    FOR SELECT USING (
        patient_id IN (
            SELECT id FROM patient_profiles WHERE user_id = auth.uid()
        )
    );

-- Policy for renewal_reminders: Users can insert their own reminders
CREATE POLICY "Users can create their own renewal reminders" ON renewal_reminders
    FOR INSERT WITH CHECK (
        patient_id IN (
            SELECT id FROM patient_profiles WHERE user_id = auth.uid()
        )
    );

-- Policy for renewal_reminders: Users can update their own reminders
CREATE POLICY "Users can update their own renewal reminders" ON renewal_reminders
    FOR UPDATE USING (
        patient_id IN (
            SELECT id FROM patient_profiles WHERE user_id = auth.uid()
        )
    );

-- Create a function to automatically create reminders for new prescriptions
CREATE OR REPLACE FUNCTION create_prescription_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create reminders for active prescriptions with end dates
    IF NEW.status = 'active' AND NEW.end_date IS NOT NULL THEN
        -- Create 30-day warning
        INSERT INTO renewal_reminders (
            prescription_id,
            patient_id,
            reminder_type,
            scheduled_date,
            message
        ) VALUES (
            NEW.id,
            NEW.patient_id,
            'expiry_warning',
            NEW.end_date::timestamp - INTERVAL '30 days',
            'Your prescription will expire in 30 days. Consider requesting a renewal.'
        );
        
        -- Create 7-day warning
        INSERT INTO renewal_reminders (
            prescription_id,
            patient_id,
            reminder_type,
            scheduled_date,
            message
        ) VALUES (
            NEW.id,
            NEW.patient_id,
            'refill_reminder',
            NEW.end_date::timestamp - INTERVAL '7 days',
            'Your prescription will expire in 7 days. Time to request a refill.'
        );
        
        -- Create 1-day warning
        INSERT INTO renewal_reminders (
            prescription_id,
            patient_id,
            reminder_type,
            scheduled_date,
            message
        ) VALUES (
            NEW.id,
            NEW.patient_id,
            'renewal_due',
            NEW.end_date::timestamp - INTERVAL '1 day',
            'Your prescription expires tomorrow. Please request a renewal immediately.'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create reminders for new prescriptions
CREATE TRIGGER create_prescription_reminders_trigger
    AFTER INSERT ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_prescription_reminders();

-- Create a function to cancel reminders when prescription is updated to non-active status
CREATE OR REPLACE FUNCTION cancel_prescription_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Cancel scheduled reminders if prescription is no longer active
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
        UPDATE renewal_reminders
        SET status = 'cancelled'
        WHERE prescription_id = NEW.id
        AND status = 'scheduled';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to cancel reminders when prescription status changes
CREATE TRIGGER cancel_prescription_reminders_trigger
    AFTER UPDATE ON prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION cancel_prescription_reminders();

-- Create a view for prescription renewal statistics
CREATE OR REPLACE VIEW prescription_renewal_stats AS
SELECT 
    patient_id,
    COUNT(*) as total_renewals,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_renewals,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_renewals,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_renewals,
    COUNT(*) FILTER (WHERE status = 'dispensed') as dispensed_renewals
FROM prescription_renewals
GROUP BY patient_id;

-- Create a view for prescription statistics
CREATE OR REPLACE VIEW prescription_stats AS
SELECT 
    patient_id,
    COUNT(*) as total_prescriptions,
    COUNT(*) FILTER (WHERE status = 'active') as active_prescriptions,
    COUNT(*) FILTER (WHERE status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '30 days' AND end_date > CURRENT_DATE) as expiring_soon,
    COUNT(*) FILTER (WHERE status = 'expired' OR (end_date IS NOT NULL AND end_date < CURRENT_DATE)) as expired_prescriptions
FROM prescriptions
GROUP BY patient_id;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON prescription_renewals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON renewal_reminders TO authenticated;
GRANT SELECT ON prescription_renewal_stats TO authenticated;
GRANT SELECT ON prescription_stats TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE prescription_renewals IS 'Stores prescription renewal requests and their status';
COMMENT ON TABLE renewal_reminders IS 'Stores automated reminders for prescription renewals';
COMMENT ON COLUMN prescription_renewals.status IS 'Current status of the renewal request';
COMMENT ON COLUMN prescription_renewals.requested_quantity IS 'Quantity requested for renewal (optional)';
COMMENT ON COLUMN prescription_renewals.requested_refills IS 'Number of refills requested (optional)';
COMMENT ON COLUMN renewal_reminders.reminder_type IS 'Type of reminder: expiry_warning, refill_reminder, or renewal_due';
COMMENT ON COLUMN renewal_reminders.scheduled_date IS 'When the reminder should be sent';
COMMENT ON COLUMN renewal_reminders.status IS 'Current status of the reminder';

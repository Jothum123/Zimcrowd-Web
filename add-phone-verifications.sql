-- Add phone_verifications table for SMS OTP storage
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset')),
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes for phone_verifications
CREATE INDEX IF NOT EXISTS phone_verifications_phone_purpose_idx ON phone_verifications(phone_number, purpose);
CREATE INDEX IF NOT EXISTS phone_verifications_expires_at_idx ON phone_verifications(expires_at);

-- Enable RLS on phone_verifications
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policies for phone_verifications (system can manage)
CREATE POLICY "System can manage phone verifications" ON phone_verifications
    FOR ALL USING (true);

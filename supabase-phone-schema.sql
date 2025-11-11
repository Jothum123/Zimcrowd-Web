-- Add phone verification support to existing schema

-- Add phone verification columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verification_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verification_expires TIMESTAMP WITH TIME ZONE;

-- Create phone_verifications table for tracking SMS OTPs
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    phone_number TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset', 'login')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for phone_verifications
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own phone verifications
CREATE POLICY "Users can access own phone verifications" ON phone_verifications
    FOR ALL USING (phone_number = current_setting('request.jwt.claims', true)::json->>'phone');

-- Policy: Allow insert for new verifications
CREATE POLICY "Allow phone verification inserts" ON phone_verifications
    FOR INSERT WITH CHECK (true);

-- Add updated_at trigger for phone_verifications
CREATE TRIGGER update_phone_verifications_updated_at
    BEFORE UPDATE ON phone_verifications
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_number ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp_code ON phone_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON phone_verifications(expires_at);

-- Function to clean up expired phone verifications
CREATE OR REPLACE FUNCTION cleanup_expired_phone_verifications()
RETURNS void AS $$
BEGIN
    DELETE FROM phone_verifications 
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired verifications (run every hour)
-- Note: This requires pg_cron extension, which may not be available on all Supabase plans
-- SELECT cron.schedule('cleanup-phone-verifications', '0 * * * *', 'SELECT cleanup_expired_phone_verifications();');

-- Add phone number to profiles table if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create unique index on phone number (allowing nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique ON profiles(phone) WHERE phone IS NOT NULL;

-- Update the handle_new_user function to support phone-only signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        phone,
        first_name, 
        last_name,
        created_at,
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', null),
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        now(),
        now()
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sample data for testing (commented out)
/*
INSERT INTO phone_verifications (phone_number, otp_code, purpose, expires_at) VALUES
('+1234567890', '123456', 'signup', NOW() + INTERVAL '10 minutes'),
('+1987654321', '654321', 'password_reset', NOW() + INTERVAL '10 minutes');
*/

-- Grant necessary permissions
GRANT ALL ON phone_verifications TO authenticated;
GRANT ALL ON phone_verifications TO service_role;

-- Add email verification support to existing schema

-- Add email verification columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create email_verifications table for tracking email OTPs
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'password_reset', 'login')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for email_verifications
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own email verifications
CREATE POLICY "Users can access own email verifications" ON email_verifications
    FOR ALL USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Policy: Allow insert for new verifications
CREATE POLICY "Allow email verification inserts" ON email_verifications
    FOR INSERT WITH CHECK (true);

-- Add updated_at trigger for email_verifications
CREATE TRIGGER update_email_verifications_updated_at
    BEFORE UPDATE ON email_verifications
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_otp_code ON email_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- Function to clean up expired email verifications
CREATE OR REPLACE FUNCTION cleanup_expired_email_verifications()
RETURNS void AS $$
BEGIN
    DELETE FROM email_verifications
    WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired verifications (run every hour)
-- Note: This requires pg_cron extension, which may not be available on all Supabase plans
-- SELECT cron.schedule('cleanup-email-verifications', '0 * * * *', 'SELECT cleanup_expired_email_verifications();');

-- Create unique index on email (allowing nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON profiles(email) WHERE email IS NOT NULL;

-- Grant necessary permissions
GRANT ALL ON email_verifications TO authenticated;
GRANT ALL ON email_verifications TO service_role;

-- Sample data for testing (commented out)
/*
INSERT INTO email_verifications (email, otp_code, purpose, expires_at) VALUES
('test@example.com', '123456', 'signup', NOW() + INTERVAL '10 minutes'),
('reset@example.com', '654321', 'password_reset', NOW() + INTERVAL '10 minutes');
*/

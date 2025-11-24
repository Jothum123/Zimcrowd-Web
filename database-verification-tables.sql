-- ============================================
-- Email and Phone Verification Tables
-- ============================================
-- Required for registration OTP flow

-- ============================================
-- 1. EMAIL VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'signup' CHECK (purpose IN ('signup', 'password_reset', 'email_change')),
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_otp ON email_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

-- ============================================
-- 2. PHONE VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'signup' CHECK (purpose IN ('signup', 'password_reset', 'phone_change')),
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp ON phone_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Email Verifications Policies
DROP POLICY IF EXISTS "Anyone can insert email verifications" ON email_verifications;
CREATE POLICY "Anyone can insert email verifications" 
ON email_verifications FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own email verifications" ON email_verifications;
CREATE POLICY "Users can view their own email verifications" 
ON email_verifications FOR SELECT 
USING (true); -- Allow checking OTP during signup (no auth yet)

DROP POLICY IF EXISTS "System can update email verifications" ON email_verifications;
CREATE POLICY "System can update email verifications" 
ON email_verifications FOR UPDATE 
USING (true);

-- Phone Verifications Policies
DROP POLICY IF EXISTS "Anyone can insert phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can insert phone verifications" 
ON phone_verifications FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own phone verifications" ON phone_verifications;
CREATE POLICY "Users can view their own phone verifications" 
ON phone_verifications FOR SELECT 
USING (true); -- Allow checking OTP during signup (no auth yet)

DROP POLICY IF EXISTS "System can update phone verifications" ON phone_verifications;
CREATE POLICY "System can update phone verifications" 
ON phone_verifications FOR UPDATE 
USING (true);

-- ============================================
-- 5. CLEANUP OLD VERIFICATIONS (Optional)
-- ============================================

-- Function to delete expired verifications
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
    DELETE FROM email_verifications WHERE expires_at < NOW();
    DELETE FROM phone_verifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SETUP COMPLETE
-- ============================================

SELECT 
    'Verification tables created successfully!' as status,
    (SELECT COUNT(*) FROM email_verifications) as email_verifications_count,
    (SELECT COUNT(*) FROM phone_verifications) as phone_verifications_count;

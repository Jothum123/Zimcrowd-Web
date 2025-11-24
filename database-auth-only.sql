-- ============================================
-- MINIMAL AUTH SETUP - VERIFICATION TABLES ONLY
-- ============================================
-- This creates ONLY the tables needed for registration to work
-- Run this first, then test registration

-- ============================================
-- 1. EMAIL VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'signup',
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

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
    purpose VARCHAR(50) DEFAULT 'signup',
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp ON phone_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES - ALLOW ALL FOR SIGNUP
-- ============================================

-- Email Verifications (anyone can use during signup)
DROP POLICY IF EXISTS "Anyone can insert email verifications" ON email_verifications;
CREATE POLICY "Anyone can insert email verifications" 
ON email_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view email verifications" ON email_verifications;
CREATE POLICY "Anyone can view email verifications" 
ON email_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update email verifications" ON email_verifications;
CREATE POLICY "Anyone can update email verifications" 
ON email_verifications FOR UPDATE USING (true);

-- Phone Verifications (anyone can use during signup)
DROP POLICY IF EXISTS "Anyone can insert phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can insert phone verifications" 
ON phone_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can view phone verifications" 
ON phone_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can update phone verifications" 
ON phone_verifications FOR UPDATE USING (true);

-- ============================================
-- 5. VERIFICATION
-- ============================================
SELECT 
    '✅ Auth tables created successfully!' as status,
    (SELECT COUNT(*) FROM email_verifications) as email_verifications,
    (SELECT COUNT(*) FROM phone_verifications) as phone_verifications;

-- Show policies
SELECT 
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('email_verifications', 'phone_verifications')
ORDER BY tablename, policyname;

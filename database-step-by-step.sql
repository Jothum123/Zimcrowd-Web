-- ============================================
-- STEP-BY-STEP DATABASE SETUP
-- ============================================
-- Run each section separately to identify where the error occurs

-- ============================================
-- STEP 1: Create email_verifications table
-- ============================================
-- Run this first
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

SELECT '✅ Step 1: email_verifications table created' as status;

-- ============================================
-- STEP 2: Create indexes for email_verifications
-- ============================================
-- Run this after Step 1 succeeds
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_otp ON email_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires ON email_verifications(expires_at);

SELECT '✅ Step 2: email_verifications indexes created' as status;

-- ============================================
-- STEP 3: Create phone_verifications table
-- ============================================
-- Run this after Step 2 succeeds
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,  -- Changed from 'phone' to 'phone_number'
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'signup',
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

SELECT '✅ Step 3: phone_verifications table created' as status;

-- ============================================
-- STEP 4: Create indexes for phone_verifications
-- ============================================
-- Run this after Step 3 succeeds
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp ON phone_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON phone_verifications(expires_at);

SELECT '✅ Step 4: phone_verifications indexes created' as status;

-- ============================================
-- STEP 5: Enable RLS
-- ============================================
-- Run this after Step 4 succeeds
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

SELECT '✅ Step 5: RLS enabled' as status;

-- ============================================
-- STEP 6: Create policies for email_verifications
-- ============================================
-- Run this after Step 5 succeeds
DROP POLICY IF EXISTS "Anyone can insert email verifications" ON email_verifications;
CREATE POLICY "Anyone can insert email verifications" 
ON email_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view email verifications" ON email_verifications;
CREATE POLICY "Anyone can view email verifications" 
ON email_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update email verifications" ON email_verifications;
CREATE POLICY "Anyone can update email verifications" 
ON email_verifications FOR UPDATE USING (true);

SELECT '✅ Step 6: email_verifications policies created' as status;

-- ============================================
-- STEP 7: Create policies for phone_verifications
-- ============================================
-- Run this after Step 6 succeeds
DROP POLICY IF EXISTS "Anyone can insert phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can insert phone verifications" 
ON phone_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can view phone verifications" 
ON phone_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can update phone verifications" 
ON phone_verifications FOR UPDATE USING (true);

SELECT '✅ Step 7: phone_verifications policies created' as status;

-- ============================================
-- FINAL: Verify everything
-- ============================================
SELECT 
    '✅ ALL STEPS COMPLETE!' as status,
    (SELECT COUNT(*) FROM email_verifications) as email_verifications,
    (SELECT COUNT(*) FROM phone_verifications) as phone_verifications;

-- ============================================
-- POST-REGISTRATION SCHEMA
-- Tables for organized account settings
-- ============================================

-- ============================================
-- 1. PAYMENT METHODS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    payment_type VARCHAR(50) NOT NULL, -- 'ecocash', 'onemoney', 'bank', 'innbucks'
    phone_number VARCHAR(20),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_holder_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_is_primary ON payment_methods(is_primary);

COMMENT ON TABLE payment_methods IS 'User payment methods for deposits and withdrawals';

-- ============================================
-- 2. UPDATE USER_DOCUMENTS TABLE
-- Add OCR validation columns if missing
-- ============================================
DO $$ 
BEGIN
    -- Add ocr_validation column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_documents' 
        AND column_name = 'ocr_validation'
    ) THEN
        ALTER TABLE user_documents ADD COLUMN ocr_validation JSONB;
        RAISE NOTICE 'Added ocr_validation column to user_documents';
    END IF;

    -- Add face_verification column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_documents' 
        AND column_name = 'face_verification'
    ) THEN
        ALTER TABLE user_documents ADD COLUMN face_verification JSONB;
        RAISE NOTICE 'Added face_verification column to user_documents';
    END IF;

    -- Add verification_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_documents' 
        AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE user_documents ADD COLUMN verification_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added verification_status column to user_documents';
    END IF;

    -- Add uploaded_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_documents' 
        AND column_name = 'uploaded_at'
    ) THEN
        ALTER TABLE user_documents ADD COLUMN uploaded_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE 'Added uploaded_at column to user_documents';
    END IF;
END $$;

COMMENT ON COLUMN user_documents.ocr_validation IS 'OCR validation results from Azure/Tesseract';
COMMENT ON COLUMN user_documents.face_verification IS 'Face verification results from Azure Face API';
COMMENT ON COLUMN user_documents.verification_status IS 'Document verification status: pending, verified, rejected';

-- ============================================
-- 3. UPDATE USER_ZIMSCORES TABLE
-- Add cold start columns if missing
-- ============================================
DO $$ 
BEGIN
    -- Add cold_start_limit column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_zimscores' 
        AND column_name = 'cold_start_limit'
    ) THEN
        ALTER TABLE user_zimscores ADD COLUMN cold_start_limit DECIMAL(10,2) DEFAULT 100.00;
        RAISE NOTICE 'Added cold_start_limit column to user_zimscores';
    END IF;

    -- Add loan_tenure_days column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_zimscores' 
        AND column_name = 'loan_tenure_days'
    ) THEN
        ALTER TABLE user_zimscores ADD COLUMN loan_tenure_days INT DEFAULT 90;
        RAISE NOTICE 'Added loan_tenure_days column to user_zimscores';
    END IF;

    -- Add is_cold_start column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_zimscores' 
        AND column_name = 'is_cold_start'
    ) THEN
        ALTER TABLE user_zimscores ADD COLUMN is_cold_start BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_cold_start column to user_zimscores';
    END IF;

    -- Add component1_banking column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_zimscores' 
        AND column_name = 'component1_banking'
    ) THEN
        ALTER TABLE user_zimscores ADD COLUMN component1_banking INT DEFAULT 0;
        RAISE NOTICE 'Added component1_banking column to user_zimscores';
    END IF;

    -- Add component2_employment column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_zimscores' 
        AND column_name = 'component2_employment'
    ) THEN
        ALTER TABLE user_zimscores ADD COLUMN component2_employment INT DEFAULT 0;
        RAISE NOTICE 'Added component2_employment column to user_zimscores';
    END IF;

    -- Add component3_performance column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_zimscores' 
        AND column_name = 'component3_performance'
    ) THEN
        ALTER TABLE user_zimscores ADD COLUMN component3_performance INT DEFAULT 0;
        RAISE NOTICE 'Added component3_performance column to user_zimscores';
    END IF;
END $$;

COMMENT ON COLUMN user_zimscores.cold_start_limit IS 'Cold start loan limit: $300 for government, $100 for others';
COMMENT ON COLUMN user_zimscores.loan_tenure_days IS 'Cold start loan tenure: 90 days (3 months) fixed';
COMMENT ON COLUMN user_zimscores.is_cold_start IS 'True if user has not completed first loan yet';
COMMENT ON COLUMN user_zimscores.component1_banking IS 'Banking behavior score (0-50)';
COMMENT ON COLUMN user_zimscores.component2_employment IS 'Employment bonus score (0-10)';
COMMENT ON COLUMN user_zimscores.component3_performance IS 'Loan performance score (0-25)';

-- ============================================
-- 4. UPDATE PROFILES TABLE
-- Add next of kin columns if missing
-- ============================================
DO $$ 
BEGIN
    -- Add kin_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'kin_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN kin_name VARCHAR(255);
        RAISE NOTICE 'Added kin_name column to profiles';
    END IF;

    -- Add kin_relationship column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'kin_relationship'
    ) THEN
        ALTER TABLE profiles ADD COLUMN kin_relationship VARCHAR(50);
        RAISE NOTICE 'Added kin_relationship column to profiles';
    END IF;

    -- Add kin_phone column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'kin_phone'
    ) THEN
        ALTER TABLE profiles ADD COLUMN kin_phone VARCHAR(20);
        RAISE NOTICE 'Added kin_phone column to profiles';
    END IF;

    -- Add kin_email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'kin_email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN kin_email VARCHAR(255);
        RAISE NOTICE 'Added kin_email column to profiles';
    END IF;

    -- Add kin_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'kin_address'
    ) THEN
        ALTER TABLE profiles ADD COLUMN kin_address TEXT;
        RAISE NOTICE 'Added kin_address column to profiles';
    END IF;

    -- Add employer_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'employer_name'
    ) THEN
        ALTER TABLE profiles ADD COLUMN employer_name VARCHAR(255);
        RAISE NOTICE 'Added employer_name column to profiles';
    END IF;

    -- Add monthly_income column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'monthly_income'
    ) THEN
        ALTER TABLE profiles ADD COLUMN monthly_income DECIMAL(10,2);
        RAISE NOTICE 'Added monthly_income column to profiles';
    END IF;

    -- Add employment_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'employment_type'
    ) THEN
        ALTER TABLE profiles ADD COLUMN employment_type VARCHAR(50);
        RAISE NOTICE 'Added employment_type column to profiles';
    END IF;
END $$;

COMMENT ON COLUMN profiles.kin_name IS 'Next of kin full name';
COMMENT ON COLUMN profiles.kin_relationship IS 'Relationship to next of kin';
COMMENT ON COLUMN profiles.kin_phone IS 'Next of kin phone number';
COMMENT ON COLUMN profiles.kin_email IS 'Next of kin email address';
COMMENT ON COLUMN profiles.kin_address IS 'Next of kin physical address';
COMMENT ON COLUMN profiles.employer_name IS 'Current employer name';
COMMENT ON COLUMN profiles.monthly_income IS 'Monthly income amount';
COMMENT ON COLUMN profiles.employment_type IS 'Employment type: government, private, business, informal';

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================

-- Check if payment_methods table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_methods')
        THEN '✅ payment_methods table exists'
        ELSE '❌ payment_methods table missing'
    END as payment_methods_status;

-- Check user_documents columns
SELECT 
    column_name,
    data_type,
    CASE WHEN column_name IN ('ocr_validation', 'face_verification', 'verification_status', 'uploaded_at')
        THEN '✅ Column exists'
        ELSE '⚠️ Check column'
    END as status
FROM information_schema.columns 
WHERE table_name = 'user_documents'
AND column_name IN ('ocr_validation', 'face_verification', 'verification_status', 'uploaded_at', 'document_type', 'document_number');

-- Check user_zimscores columns
SELECT 
    column_name,
    data_type,
    CASE WHEN column_name IN ('cold_start_limit', 'loan_tenure_days', 'is_cold_start', 'component1_banking', 'component2_employment', 'component3_performance')
        THEN '✅ Column exists'
        ELSE '⚠️ Check column'
    END as status
FROM information_schema.columns 
WHERE table_name = 'user_zimscores'
AND column_name IN ('cold_start_limit', 'loan_tenure_days', 'is_cold_start', 'component1_banking', 'component2_employment', 'component3_performance', 'score', 'user_id');

-- Check profiles columns
SELECT 
    column_name,
    data_type,
    CASE WHEN column_name IN ('kin_name', 'kin_relationship', 'kin_phone', 'kin_email', 'kin_address', 'employer_name', 'monthly_income', 'employment_type')
        THEN '✅ Column exists'
        ELSE '⚠️ Check column'
    END as status
FROM information_schema.columns 
WHERE table_name = 'profiles'
AND column_name IN ('kin_name', 'kin_relationship', 'kin_phone', 'kin_email', 'kin_address', 'employer_name', 'monthly_income', 'employment_type', 'first_name', 'last_name');

-- ============================================
-- 6. SUMMARY
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ POST-REGISTRATION SCHEMA UPDATE COMPLETE';
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tables Created/Updated:';
    RAISE NOTICE '   1. payment_methods - Payment method storage';
    RAISE NOTICE '   2. user_documents - OCR validation results';
    RAISE NOTICE '   3. user_zimscores - Cold start loan limits';
    RAISE NOTICE '   4. profiles - Next of kin & employment';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 New Features Enabled:';
    RAISE NOTICE '   ✅ Organized account settings';
    RAISE NOTICE '   ✅ OCR validation storage';
    RAISE NOTICE '   ✅ Face verification storage';
    RAISE NOTICE '   ✅ Cold start loan limits';
    RAISE NOTICE '   ✅ Employment-based scoring';
    RAISE NOTICE '   ✅ Next of kin details';
    RAISE NOTICE '   ✅ Payment method management';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready for production!';
    RAISE NOTICE '============================================';
END $$;

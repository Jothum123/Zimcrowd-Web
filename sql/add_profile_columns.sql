-- =====================================================
-- ZimCrowd Profiles Table - Add Missing Columns
-- Run this in Supabase SQL Editor
-- =====================================================

-- Employment Details
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ec_number VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_income VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_phone VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_email VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS years_employed VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS supervisor_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS supervisor_phone VARCHAR(50);

-- Next of Kin (stored as JSONB for flexibility)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_of_kin JSONB DEFAULT '{}';

-- Payment Method (stored as JSONB)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_method JSONB DEFAULT '{}';

-- Extended Profile Data (for any additional fields)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extended_profile_data JSONB DEFAULT '{}';

-- Address fields (if not already present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS street_address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suburb VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- KYC fields (if not already present)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selfie_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selfie_uploaded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS documents_verified BOOLEAN DEFAULT FALSE;

-- Profile completion tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS next_of_kin_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_details_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;

-- Profile picture
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Bio
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- =====================================================
-- Add comments for documentation
-- =====================================================
COMMENT ON COLUMN profiles.ec_number IS 'Employee/EC Number - Govt format: 6134510V, Private: numeric';
COMMENT ON COLUMN profiles.next_of_kin IS 'JSON: {primary: {name, relationship, phone}, secondary: {name, relationship, phone}}';
COMMENT ON COLUMN profiles.payment_method IS 'JSON: {type, mobile_number, account_name}';
COMMENT ON COLUMN profiles.extended_profile_data IS 'Additional profile data stored as JSON';

-- =====================================================
-- Create indexes for commonly queried fields
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_ec_number ON profiles(ec_number);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_status ON profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON profiles(employment_status);

-- =====================================================
-- Verify the changes
-- =====================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

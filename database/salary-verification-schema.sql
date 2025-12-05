/**
 * Salary Verification Database Schema Updates
 * Adds performance indexes and validation functions for salary verification system
 */

-- Ensure salary verification columns exist (already added in employer-type-rating.sql)
-- This file focuses on optimization and validation functions

-- Create performance indexes for salary verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_salary_verified_at ON profiles(salary_verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_net_salary ON profiles(verified_net_salary);
CREATE INDEX IF NOT EXISTS idx_profiles_employer_type_salary ON profiles(employer_type, verified_net_salary);

-- Composite index for loan approval queries (common pattern)
CREATE INDEX IF NOT EXISTS idx_profiles_loan_approval ON profiles(id, salary_verified_at, verified_net_salary, employer_type) WHERE salary_verified_at IS NOT NULL;

-- Create profile flags table for salary discrepancy tracking
CREATE TABLE IF NOT EXISTS profile_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL, -- 'salary_discrepancy', 'stale_salary', 'missing_documents'
    flag_data JSONB, -- Store detailed flag information
    severity VARCHAR(20) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    status VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED', 'IGNORED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id),
    
    -- Constraints
    CONSTRAINT valid_flag_type CHECK (flag_type IN ('salary_discrepancy', 'stale_salary', 'missing_documents', 'ec_number_missing')),
    CONSTRAINT valid_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'RESOLVED', 'IGNORED'))
);

-- Index for flag queries
CREATE INDEX IF NOT EXISTS idx_profile_flags_user_type ON profile_flags(user_id, flag_type, status);
CREATE INDEX IF NOT EXISTS idx_profile_flags_created_at ON profile_flags(created_at DESC);

-- Function to check salary freshness (90 days)
DROP FUNCTION IF EXISTS check_salary_freshness(UUID);
CREATE OR REPLACE FUNCTION check_salary_freshness(p_user_id UUID)
RETURNS TABLE(
    is_fresh BOOLEAN,
    days_old INTEGER,
    needs_reverification BOOLEAN,
    last_verified TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN p.salary_verified_at IS NULL THEN false
            WHEN (CURRENT_DATE - p.salary_verified_at::date) <= 90 THEN true
            ELSE false
        END as is_fresh,
        CASE 
            WHEN p.salary_verified_at IS NULL THEN NULL
            ELSE (CURRENT_DATE - p.salary_verified_at::date)
        END as days_old,
        CASE 
            WHEN p.salary_verified_at IS NULL THEN true
            WHEN (CURRENT_DATE - p.salary_verified_at::date) > 90 THEN true
            ELSE false
        END as needs_reverification,
        p.salary_verified_at as last_verified
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate salary for loan approval (centralized logic)
DROP FUNCTION IF EXISTS validate_salary_for_loan(UUID);
CREATE OR REPLACE FUNCTION validate_salary_for_loan(p_user_id UUID)
RETURNS TABLE(
    is_valid BOOLEAN,
    error_code TEXT,
    error_message TEXT,
    requires_action TEXT,
    salary_data JSONB
) AS $$
DECLARE
    v_profile RECORD;
    v_salary_age INTEGER;
    v_is_fresh BOOLEAN;
BEGIN
    -- Fetch user profile with salary data
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'PROFILE_NOT_FOUND', 'User profile not found', NULL, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Check if salary is verified
    IF v_profile.verified_net_salary IS NULL OR v_profile.salary_verified_at IS NULL THEN
        RETURN QUERY SELECT false, 'SALARY_NOT_VERIFIED', 'Salary verification required', 'UPLOAD_PAYSLIP', 
            jsonb_build_object(
                'verified_net_salary', v_profile.verified_net_salary,
                'salary_verified_at', v_profile.salary_verified_at
            );
        RETURN;
    END IF;
    
    -- Calculate salary age
    v_salary_age := (CURRENT_DATE - v_profile.salary_verified_at::date);
    v_is_fresh := v_salary_age <= 90;
    
    -- Check 90-day freshness
    IF NOT v_is_fresh THEN
        RETURN QUERY SELECT false, 'SALARY_STALE', 
            format('Salary verification is %s days old. Re-verification required (90-day limit)', v_salary_age),
            'REVERIFY_SALARY',
            jsonb_build_object(
                'verified_net_salary', v_profile.verified_net_salary,
                'salary_verified_at', v_profile.salary_verified_at,
                'salary_age_days', v_salary_age
            );
        RETURN;
    END IF;
    
    -- Government employee specific validation
    IF v_profile.employer_type = 'government' THEN
        IF v_profile.verified_net_salary < 120 THEN
            RETURN QUERY SELECT false, 'GOVERNMENT_SALARY_TOO_LOW', 
                'Government employees must have minimum $120 net salary for loan approval',
                'UPDATE_SALARY',
                jsonb_build_object(
                    'verified_net_salary', v_profile.verified_net_salary,
                    'employer_type', v_profile.employer_type
                );
            RETURN;
        END IF;
        
        IF v_profile.ec_number IS NULL THEN
            RETURN QUERY SELECT false, 'MISSING_EC_NUMBER', 
                'EC number required for government employee loan approval',
                'UPDATE_EC_NUMBER',
                jsonb_build_object(
                    'employer_type', v_profile.employer_type,
                    'ec_number', v_profile.ec_number
                );
            RETURN;
        END IF;
    END IF;
    
    -- All validations passed
    RETURN QUERY SELECT true, NULL, 'Salary validation passed', NULL,
        jsonb_build_object(
            'verified_net_salary', v_profile.verified_net_salary,
            'employer_type', v_profile.employer_type,
            'employment_status', v_profile.employment_status,
            'salary_verified_at', v_profile.salary_verified_at,
            'salary_age_days', v_salary_age,
            'is_fresh', v_is_fresh
        );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate DTNI using verified salary
DROP FUNCTION IF EXISTS calculate_dtni_from_verified_salary(UUID, DECIMAL);
CREATE OR REPLACE FUNCTION calculate_dtni_from_verified_salary(p_user_id UUID, p_existing_debt DECIMAL(10,2) DEFAULT 0)
RETURNS TABLE(
    max_installment DECIMAL(10,2),
    available_installment DECIMAL(10,2),
    dtni_limit DECIMAL(10,2),
    dtni_method TEXT,
    calculation_details JSONB
) AS $$
DECLARE
    v_profile RECORD;
    v_max_installment DECIMAL(10,2);
    v_available_installment DECIMAL(10,2);
    v_dtni_limit DECIMAL(10,2);
    v_dtni_method TEXT;
    v_annual_rate DECIMAL(5,4) := 0.05;
    v_monthly_rate DECIMAL(8,6);
    v_term_months INTEGER := 3;
    v_power_term DECIMAL(10,6);
BEGIN
    -- Fetch verified salary data
    SELECT * INTO v_profile 
    FROM profiles 
    WHERE id = p_user_id 
    AND verified_net_salary IS NOT NULL 
    AND salary_verified_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verified salary data not found for user %', p_user_id;
    END IF;
    
    -- Calculate DTNI based on employer type
    IF v_profile.employer_type = 'government' THEN
        -- Government employees: net salary - $70 mandatory buffer
        v_max_installment := v_profile.verified_net_salary - 70;
        v_dtni_method := 'GOVERNMENT_BUFFER';
    ELSE
        -- Other employees: 33% DTNI
        v_max_installment := v_profile.verified_net_salary * 0.33;
        v_dtni_method := 'PERCENTAGE_33';
    END IF;
    
    v_available_installment := v_max_installment - p_existing_debt;
    
    -- Reducing balance formula
    IF v_available_installment > 0 THEN
        v_monthly_rate := v_annual_rate / 12;
        v_power_term := POWER(1 + v_monthly_rate, v_term_months);
        v_dtni_limit := (v_available_installment * (v_power_term - 1)) / (v_monthly_rate * v_power_term);
    ELSE
        v_dtni_limit := 0;
    END IF;
    
    RETURN QUERY SELECT 
        v_max_installment,
        v_available_installment,
        v_dtni_limit,
        v_dtni_method,
        jsonb_build_object(
            'verified_net_salary', v_profile.verified_net_salary,
            'employer_type', v_profile.employer_type,
            'existing_debt', p_existing_debt,
            'annual_rate', v_annual_rate,
            'term_months', v_term_months
        );
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) for profile flags
ALTER TABLE profile_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own flags
DROP POLICY IF EXISTS "Users can view own profile flags" ON profile_flags;
CREATE POLICY "Users can view own profile flags" ON profile_flags
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: System can insert flags for any user
DROP POLICY IF EXISTS "System can insert profile flags" ON profile_flags;
CREATE POLICY "System can insert profile flags" ON profile_flags
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own resolved flags
DROP POLICY IF EXISTS "Users can update own profile flags" ON profile_flags;
CREATE POLICY "Users can update own profile flags" ON profile_flags
    FOR UPDATE USING (auth.uid() = user_id);

-- Create a trigger to automatically flag stale salaries
CREATE OR REPLACE FUNCTION flag_stale_salaries()
RETURNS TRIGGER AS $$
BEGIN
    -- This function would be called by a scheduled job
    -- For now, it's a placeholder for manual execution
    INSERT INTO profile_flags (user_id, flag_type, flag_data, severity)
    SELECT 
        id as user_id,
        'stale_salary' as flag_type,
        jsonb_build_object(
            'salary_verified_at', salary_verified_at,
            'days_old', (CURRENT_DATE - salary_verified_at::date)
        ) as flag_data,
        CASE 
            WHEN (CURRENT_DATE - salary_verified_at::date) > 180 THEN 'HIGH'
            ELSE 'MEDIUM'
        END as severity
    FROM profiles 
    WHERE salary_verified_at IS NOT NULL 
    AND (CURRENT_DATE - salary_verified_at::date) > 90
    AND id NOT IN (
        SELECT user_id FROM profile_flags 
        WHERE flag_type = 'stale_salary' 
        AND status = 'ACTIVE'
    )
    ON CONFLICT DO NOTHING;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_salary_freshness(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_salary_for_loan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_dtni_from_verified_salary(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION flag_stale_salaries() TO service_role;

-- Test functions with valid UUID examples
-- Replace with actual user UUIDs from your database

-- Test salary validation function (use real UUID from your profiles table)
-- SELECT * FROM validate_salary_for_loan('123e4567-e89b-12d3-a456-426614174000');

-- Test DTNI calculation function (use real UUID from your profiles table)  
-- SELECT * FROM calculate_dtni_from_verified_salary('123e4567-e89b-12d3-a456-426614174000', 0);

-- Test freshness check function (use real UUID from your profiles table)
-- SELECT * FROM check_salary_freshness('123e4567-e89b-12d3-a456-426614174000');

-- To get actual user UUIDs from your database:
-- SELECT id, email, first_name FROM profiles LIMIT 5;

-- Create updated_at trigger for profiles (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Schema update complete
SELECT 'Salary verification schema updated successfully' as status;

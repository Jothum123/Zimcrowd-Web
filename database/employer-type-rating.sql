-- Enhanced Cold Start Rating System with Employer Type
-- Evaluates users based on employment type AND employer type with conditional documentation

-- Add employer_type column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employer_type VARCHAR(50);

-- Add DTNI-related columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dtni_based_limit DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS final_cold_start_limit DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS final_max_loan_limit DECIMAL(10,2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS income_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_dtni_calculation TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS required_documents_submitted TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS documentation_verified BOOLEAN DEFAULT false;

-- Employer type configuration with documentation requirements
CREATE TABLE IF NOT EXISTS employer_type_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_type VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    required_documents TEXT[] NOT NULL, -- Array of required document types
    verification_method VARCHAR(50) NOT NULL, -- 'ec_number', 'employment_letter', 'business_registration', 'reference'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert employer type configurations
INSERT INTO employer_type_config (employer_type, display_name, description, required_documents, verification_method) VALUES
('government', 'Government Sector', 'Government employees and civil servants', 
 ARRAY['ec_number', 'employment_letter'], 'ec_number'),
('private', 'Private Sector', 'Private company employees', 
 ARRAY['employment_letter', 'payslip'], 'employment_letter'),
('informal', 'Informal Sector', 'Self-employed, informal business owners', 
 ARRAY['business_registration', 'reference_letter'], 'business_registration'),
('ngo', 'NGO/Non-Profit', 'Non-governmental organization employees', 
 ARRAY['employment_letter', 'ngo_certificate'], 'employment_letter'),
('student', 'Student', 'Students with part-time work or scholarships', 
 ARRAY['student_id', 'enrollment_letter'], 'student_id')
ON CONFLICT (employer_type) DO NOTHING;

-- Enhanced Employment Rating Matrix with Employer-Specific Cold Start Rules
CREATE TABLE IF NOT EXISTS employment_employer_rating_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_type VARCHAR(50) NOT NULL,
    employer_type VARCHAR(50) NOT NULL,
    base_score INTEGER NOT NULL CHECK (base_score BETWEEN 30 AND 85), -- Aligned to ZimScore range
    risk_level VARCHAR(20) NOT NULL,
    documentation_bonus INTEGER DEFAULT 0 CHECK (documentation_bonus BETWEEN 0 AND 10), -- Max 10 points bonus
    max_loan_amount DECIMAL(10,2) NOT NULL, -- Direct mapping to ZimScore loan limits
    
    -- Employer-specific cold start rules
    has_cold_start BOOLEAN DEFAULT true, -- Whether this employer type has cold start restrictions
    cold_start_limit DECIMAL(10,2) DEFAULT 100, -- Cold start maximum loan amount
    min_loan_amount DECIMAL(10,2) DEFAULT 50, -- Minimum loan amount
    min_tenure_days INTEGER DEFAULT 30, -- Minimum repayment period in days
    max_tenure_days INTEGER DEFAULT 90, -- Maximum repayment period in days
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employment_type, employer_type)
);

-- Insert rating matrix values with employer-specific cold start rules
INSERT INTO employment_employer_rating_matrix (
    employment_type, employer_type, base_score, risk_level, documentation_bonus, max_loan_amount,
    has_cold_start, cold_start_limit, min_loan_amount, min_tenure_days, max_tenure_days
) VALUES
-- Government sector (Civil Servants) - NO COLD START, higher limits and longer tenure
('full_time_salaried', 'government', 85, 'very_low', 0, 3000, 
 false, 0, 50, 30, 730), -- 1-24 months (30-730 days), $50-3000, no cold start
('part_time_salaried', 'government', 75, 'low', 0, 2000, 
 false, 0, 50, 30, 730), -- 1-24 months, $50-2000, no cold start
('self_employed', 'government', 65, 'medium', 0, 1500, 
 false, 0, 50, 30, 730), -- 1-24 months, $50-1500, no cold start

-- Private sector - COLD START $300, 1-12 months tenure
('full_time_salaried', 'private', 80, 'very_low', 0, 2000, 
 true, 300, 50, 30, 365), -- 1-12 months (30-365 days), $50-300 cold start, then $50-2000
('part_time_salaried', 'private', 70, 'low', 0, 1500, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-1500
('self_employed', 'private', 60, 'medium', 0, 1000, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-1000

-- Informal sector - COLD START $100, 1-90 days tenure only
('full_time_salaried', 'informal', 55, 'high', 0, 800, 
 true, 100, 50, 30, 90), -- 1-90 days only, $50-100 cold start, then $50-800
('part_time_salaried', 'informal', 45, 'very_high', 0, 600, 
 true, 100, 50, 30, 90), -- 1-90 days only, $50-100 cold start, then $50-600
('self_employed', 'informal', 35, 'building_credit', 0, 400, 
 true, 100, 50, 30, 90), -- 1-90 days only, $50-100 cold start, then $50-400

-- NGO sector - Similar to private sector
('full_time_salaried', 'ngo', 75, 'low', 0, 1500, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-1500
('part_time_salaried', 'ngo', 65, 'medium', 0, 1000, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-1000
('self_employed', 'ngo', 55, 'high', 0, 800, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-800

-- Student sector - Conservative limits
('student', 'student', 40, 'very_high', 0, 500, 
 true, 100, 50, 30, 180), -- 1-6 months, $50-100 cold start, then $50-500
('part_time_salaried', 'student', 50, 'high', 0, 800, 
 true, 100, 50, 30, 180), -- 1-6 months, $50-100 cold start, then $50-800

-- Default/Other combinations
('full_time_salaried', 'other', 70, 'low', 0, 1000, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-1000
('part_time_salaried', 'other', 60, 'medium', 0, 800, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-800
('self_employed', 'other', 50, 'high', 0, 600, 
 true, 300, 50, 30, 365), -- 1-12 months, $50-300 cold start, then $50-600
('unemployed', 'other', 30, 'building_credit', 0, 200, 
 true, 100, 50, 30, 90), -- 1-90 days, $50-100 cold start, then $50-200
('retired', 'other', 65, 'medium', 0, 1000, 
 false, 0, 50, 30, 365) -- 1-12 months, $50-1000, no cold start
ON CONFLICT (employment_type, employer_type) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_employer_type ON profiles(employer_type);
CREATE INDEX IF NOT EXISTS idx_employer_type_config_type ON employer_type_config(employer_type);
CREATE INDEX IF NOT EXISTS idx_rating_matrix_composite ON employment_employer_rating_matrix(employment_type, employer_type);

-- Enable RLS
ALTER TABLE employer_type_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE employment_employer_rating_matrix ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view employer type config" ON employer_type_config 
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view rating matrix" ON employment_employer_rating_matrix 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Enhanced function to calculate cold start rating with employer type and DTNI
CREATE OR REPLACE FUNCTION calculate_enhanced_cold_start_rating(
    p_user_id UUID,
    p_employment_type VARCHAR(50),
    p_employer_type VARCHAR(50),
    p_submitted_documents TEXT[] DEFAULT '{}',
    p_monthly_income DECIMAL(10,2) DEFAULT NULL,
    p_existing_debt DECIMAL(10,2) DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    v_base_score INTEGER;
    v_documentation_bonus INTEGER;
    v_final_score INTEGER;
    v_risk_level VARCHAR(20);
    v_required_docs TEXT[];
    v_cold_start_limit DECIMAL(10,2);
    v_max_loan_amount DECIMAL(10,2);
    v_has_cold_start BOOLEAN;
    v_dtni_limit DECIMAL(10,2);
    v_final_cold_start_limit DECIMAL(10,2);
    v_final_max_loan_limit DECIMAL(10,2);
    v_income_verified BOOLEAN;
BEGIN
    -- Get rating from matrix with employer-specific rules
    SELECT base_score, risk_level, documentation_bonus, cold_start_limit, max_loan_amount, has_cold_start
    INTO v_base_score, v_risk_level, v_documentation_bonus, v_cold_start_limit, v_max_loan_amount, v_has_cold_start
    FROM employment_employer_rating_matrix
    WHERE employment_type = p_employment_type 
    AND employer_type = p_employer_type 
    AND is_active = true;
    
    -- If no specific combination found, use default
    IF v_base_score IS NULL THEN
        SELECT base_score, risk_level, documentation_bonus, cold_start_limit, max_loan_amount, has_cold_start
        INTO v_base_score, v_risk_level, v_documentation_bonus, v_cold_start_limit, v_max_loan_amount, v_has_cold_start
        FROM employment_employer_rating_matrix
        WHERE employment_type = p_employment_type 
        AND employer_type = 'other' 
        AND is_active = true;
    END IF;
    
    -- Still no match, use absolute default
    IF v_base_score IS NULL THEN
        v_base_score := 50;
        v_risk_level := 'medium';
        v_documentation_bonus := 0;
        v_cold_start_limit := 300;
        v_max_loan_amount := 1000;
        v_has_cold_start := true;
    END IF;
    
    -- Get required documents for employer type
    SELECT required_documents INTO v_required_docs
    FROM employer_type_config
    WHERE employer_type = p_employer_type AND is_active = true;
    
    -- Calculate documentation bonus
    DECLARE
        v_doc_bonus INTEGER := 0;
        v_doc_count INTEGER := 0;
        v_required_count INTEGER := COALESCE(array_length(v_required_docs, 1), 0);
    BEGIN
        IF v_required_count > 0 THEN
            -- Count how many required documents were submitted
            SELECT COUNT(*) INTO v_doc_count
            FROM unnest(p_submitted_documents) AS doc
            WHERE doc = ANY(v_required_docs);
            
            -- Calculate bonus based on percentage of required documents
            v_doc_bonus := (v_documentation_bonus * v_doc_count / v_required_count)::INTEGER;
        END IF;
    END;
    
    -- Calculate final score (aligned with ZimScore 30-85 range)
    v_final_score := v_base_score + v_doc_bonus;
    
    -- Ensure score doesn't exceed 85 (ZimScore maximum)
    v_final_score := LEAST(v_final_score, 85);
    
    -- Calculate DTNI limit if income provided
    v_income_verified := (p_monthly_income IS NOT NULL AND p_monthly_income > 0);
    
    IF v_income_verified THEN
        -- DTNI calculation using reducing balance formula (simplified for storage)
        DECLARE
            v_dtni_percent DECIMAL(3,2);
            v_max_installment DECIMAL(10,2);
            v_available_installment DECIMAL(10,2);
            v_annual_rate DECIMAL(5,4) := 0.05;
            v_monthly_rate DECIMAL(8,6);
            v_term_months INTEGER := 3; -- Default 3 months for calculation
        BEGIN
            v_dtni_percent := CASE WHEN p_employment_type = 'government' THEN 0.40 ELSE 0.33 END;
            v_max_installment := p_monthly_income * v_dtni_percent;
            v_available_installment := v_max_installment - p_existing_debt;
            
            IF v_available_installment > 0 THEN
                v_monthly_rate := v_annual_rate / 12;
                v_dtni_limit := (v_available_installment * (POWER(1 + v_monthly_rate, v_term_months) - 1)) / (v_monthly_rate * POWER(1 + v_monthly_rate, v_term_months));
            ELSE
                v_dtni_limit := 0;
            END IF;
        END;
    ELSE
        v_dtni_limit := 0;
    END IF;
    
    -- Calculate final limits (minimum of employer caps and DTNI limits)
    IF v_has_cold_start THEN
        v_final_cold_start_limit := LEAST(v_cold_start_limit, v_dtni_limit);
    ELSE
        v_final_cold_start_limit := LEAST(v_max_loan_amount, v_dtni_limit);
    END IF;
    
    v_final_max_loan_limit := LEAST(v_max_loan_amount, v_dtni_limit);
    
    -- Update user profile with all DTNI information
    UPDATE profiles 
    SET 
        employment_type = p_employment_type,
        employer_type = p_employer_type,
        cold_start_rating = v_final_score,
        cold_start_rated_at = NOW(),
        risk_level = v_risk_level,
        required_documents_submitted = p_submitted_documents,
        documentation_verified = (v_doc_count = v_required_count),
        dtni_based_limit = v_dtni_limit,
        final_cold_start_limit = v_final_cold_start_limit,
        final_max_loan_limit = v_final_max_loan_limit,
        income_verified = v_income_verified,
        last_dtni_calculation = NOW()
    WHERE id = p_user_id;
    
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get required documents for employer type
CREATE OR REPLACE FUNCTION get_required_documents(p_employer_type VARCHAR(50))
RETURNS TABLE(
    document_type VARCHAR(50),
    verification_method VARCHAR(50),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        unnest(config.required_documents) as document_type,
        config.verification_method,
        config.description
    FROM employer_type_config config
    WHERE config.employer_type = p_employer_type AND config.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate required documents
CREATE OR REPLACE FUNCTION validate_required_documents(
    p_user_id UUID,
    p_employer_type VARCHAR(50),
    p_submitted_documents TEXT[]
) RETURNS TABLE(
    is_valid BOOLEAN,
    missing_documents TEXT[],
    validation_message TEXT
) AS $$
DECLARE
    v_required_docs TEXT[];
    v_missing_docs TEXT[];
    v_all_valid BOOLEAN := true;
BEGIN
    -- Get required documents
    SELECT required_documents INTO v_required_docs
    FROM employer_type_config
    WHERE employer_type = p_employer_type AND is_active = true;
    
    -- Find missing documents
    SELECT unnest(v_required_docs) INTO v_missing_docs
    WHERE NOT (unnest(v_required_docs) = ANY(p_submitted_documents));
    
    -- Check if all required documents are submitted
    v_all_valid := array_length(v_missing_docs, 1) IS NULL;
    
    RETURN QUERY
    SELECT 
        v_all_valid,
        COALESCE(v_missing_docs, ARRAY[]::TEXT[]),
        CASE 
            WHEN v_all_valid THEN 'All required documents submitted successfully'
            ELSE format('Missing required documents: %s', array_to_string(v_missing_docs, ', '))
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cold Start Rating System for Post-Registration
-- Evaluates users based on employment type after KYC verification

-- Add employment type and rating to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cold_start_rating INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cold_start_rated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';

-- Employment type configuration table
CREATE TABLE IF NOT EXISTS employment_rating_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employment_type VARCHAR(50) UNIQUE NOT NULL,
    base_score INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default employment rating configurations
INSERT INTO employment_rating_config (employment_type, base_score, risk_level, description) VALUES
('full_time_salaried', 85, 'low', 'Full-time salaried employment with stable income'),
('part_time_salaried', 70, 'low_medium', 'Part-time salaried employment'),
('self_employed', 60, 'medium', 'Self-employed or business owner'),
('contract_worker', 55, 'medium_high', 'Contract or freelance worker'),
('student', 40, 'high', 'Student with limited income'),
('unemployed', 20, 'very_high', 'Currently unemployed'),
('retired', 65, 'medium', 'Retired with pension/income'),
('other', 50, 'medium', 'Other employment situation')
ON CONFLICT (employment_type) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_cold_start_rating ON profiles(cold_start_rating);
CREATE INDEX IF NOT EXISTS idx_profiles_employment_type ON profiles(employment_type);
CREATE INDEX IF NOT EXISTS idx_employment_rating_config_type ON employment_rating_config(employment_type);

-- Enable RLS for employment rating config
ALTER TABLE employment_rating_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for employment rating config (read-only for authenticated users)
CREATE POLICY "Authenticated users can view employment rating config" ON employment_rating_config 
    FOR SELECT USING (auth.role() = 'authenticated');

-- Function to calculate cold start rating based on employment type
CREATE OR REPLACE FUNCTION calculate_cold_start_rating(
    p_user_id UUID,
    p_employment_type VARCHAR(50)
) RETURNS INTEGER AS $$
DECLARE
    v_base_score INTEGER;
    v_final_score INTEGER;
    v_config RECORD;
BEGIN
    -- Get the base score for employment type
    SELECT base_score INTO v_base_score
    FROM employment_rating_config
    WHERE employment_type = p_employment_type AND is_active = true;
    
    -- If employment type not found, use default score
    IF v_base_score IS NULL THEN
        v_base_score := 50; -- Default medium score
    END IF;
    
    -- Calculate final score with potential adjustments
    v_final_score := v_base_score;
    
    -- Update user profile with rating
    UPDATE profiles 
    SET 
        employment_type = p_employment_type,
        cold_start_rating = v_final_score,
        cold_start_rated_at = NOW(),
        risk_level = CASE 
            WHEN v_final_score >= 80 THEN 'low'
            WHEN v_final_score >= 60 THEN 'medium'
            WHEN v_final_score >= 40 THEN 'high'
            ELSE 'very_high'
        END
    WHERE id = p_user_id;
    
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's cold start rating with details
CREATE OR REPLACE FUNCTION get_user_cold_start_rating(p_user_id UUID) 
RETURNS TABLE(
    employment_type VARCHAR(50),
    cold_start_rating INTEGER,
    risk_level VARCHAR(20),
    rated_at TIMESTAMP WITH TIME ZONE,
    rating_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.employment_type,
        p.cold_start_rating,
        p.risk_level,
        p.cold_start_rated_at,
        config.description
    FROM profiles p
    LEFT JOIN employment_rating_config config ON p.employment_type = config.employment_type
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update rating after KYC completion
CREATE OR REPLACE FUNCTION update_cold_start_rating_after_kyc(p_user_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    v_employment_type VARCHAR(50);
    v_rating INTEGER;
BEGIN
    -- Get employment type from user profile (should be collected during registration)
    SELECT employment_type INTO v_employment_type
    FROM profiles
    WHERE id = p_user_id;
    
    -- Calculate and update rating
    v_rating := calculate_cold_start_rating(p_user_id, v_employment_type);
    
    -- Log the rating calculation
    PERFORM log_user_activity(
        p_user_id,
        'cold_start_rating_calculated',
        format('Cold start rating calculated: %d based on employment type: %s', v_rating, v_employment_type),
        jsonb_build_object(
            'rating', v_rating,
            'employment_type', v_employment_type
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

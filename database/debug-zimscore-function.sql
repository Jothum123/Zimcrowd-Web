/**
 * Debug ZimScore Function - Show what data is actually being passed
 */

-- First, verify the test user data exists
SELECT 
    '=== VERIFYING TEST USER DATA ===' as info;

SELECT 
    id,
    email,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    ec_number
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Create debug version of calculate_final_zimscore to see what's happening
CREATE OR REPLACE FUNCTION debug_calculate_final_zimscore(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_base_zimscore INTEGER;
    v_final_score INTEGER;
    v_profile RECORD;
BEGIN
    -- Get user profile with debug output
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Debug: Show what we actually retrieved
    RAISE NOTICE '=== DEBUG: User Profile Data ===';
    RAISE NOTICE 'User ID: %', v_profile.id;
    RAISE NOTICE 'Email: %', v_profile.email;
    RAISE NOTICE 'Employment Status: %', v_profile.employment_status;
    RAISE NOTICE 'Employer Type: %', v_profile.employer_type;
    RAISE NOTICE 'Verified Net Salary: %', v_profile.verified_net_salary;
    RAISE NOTICE 'Salary Verified At: %', v_profile.salary_verified_at;
    RAISE NOTICE 'EC Number: %', v_profile.ec_number;
    
    -- Check if salary data exists
    IF v_profile.verified_net_salary IS NULL THEN
        RAISE NOTICE 'ERROR: verified_net_salary is NULL!';
        RETURN 0;
    END IF;
    
    IF v_profile.verified_net_salary < 120 AND v_profile.employer_type = 'government' THEN
        RAISE NOTICE 'ERROR: Government employee salary $% is below $120 minimum!', v_profile.verified_net_salary;
    END IF;
    
    -- Calculate base ZimScore (this is where the error occurs)
    RAISE NOTICE 'Attempting to calculate base ZimScore...';
    
    v_base_zimscore := calculate_enhanced_cold_start_rating(
        p_user_id,
        v_profile.employment_status,
        v_profile.employer_type,
        COALESCE(v_profile.required_documents_submitted, ARRAY[]::TEXT[]),
        v_profile.verified_net_salary,
        0
    );
    
    RAISE NOTICE 'Base ZimScore calculated: %', v_base_zimscore;
    
    -- For now, just return base score (no penalties/rewards yet)
    v_final_score := v_base_zimscore;
    
    RAISE NOTICE 'Final ZimScore: % (Base only, no penalties/rewards yet)', v_final_score;
    
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

-- Test the debug function
SELECT 
    '=== RUNNING DEBUG FUNCTION ===' as info;

SELECT debug_calculate_final_zimscore('66666666-6666-6666-6666-666666666666') as debug_result;

SELECT 
    '=== DEBUG COMPLETE ===' as info;

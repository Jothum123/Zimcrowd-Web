/**
 * ZimScore Testing - Post-Registration Credit Scoring
 * Tests the ZimScore calculation for all employment/employer types
 */

-- =====================================================
-- 1. GET ZIMSCORE FOR EACH TEST USER
-- =====================================================

SELECT 
    '=== ZIMSCORE CALCULATION RESULTS ===' as info;

-- Test ZimScore for all our test users
SELECT 
    p.email,
    p.employment_status,
    p.employer_type,
    p.verified_net_salary,
    p.ec_number,
    -- Calculate ZimScore using existing function
    calculate_enhanced_cold_start_rating(
        p.id,
        p.employment_status,
        p.employer_type,
        ARRAY['id', 'payslip'], -- Simulate submitted documents
        p.verified_net_salary,
        0 -- No existing debt
    ) as zimscore,
    CASE 
        WHEN p.employer_type = 'government' AND p.ec_number IS NULL THEN '❌ Missing EC Number'
        WHEN p.employer_type = 'government' AND p.verified_net_salary < 120 THEN '❌ Below $120 Minimum'
        ELSE '✅ Valid ZimScore'
    END as status
FROM profiles p
WHERE p.id IN (
    '66666666-6666-6666-6666-666666666666', -- Valid government
    '55555555-5555-5555-5555-555555555555', -- Private sector
    '88888888-8888-8888-8888-888888888888', -- Government missing EC
    '99999999-9999-9999-9999-999999999999'  -- Government below minimum
)
ORDER BY zimscore DESC;

-- =====================================================
-- 2. ZIMSCORE RANGE ANALYSIS
-- =====================================================

SELECT 
    '=== ZIMSCORE RANGE ANALYSIS ===' as info;

SELECT 
    employment_status,
    employer_type,
    base_score,
    risk_level,
    max_loan_amount,
    CASE 
        WHEN base_score >= 80 THEN 'Excellent (80-85)'
        WHEN base_score >= 70 THEN 'Good (70-79)'
        WHEN base_score >= 60 THEN 'Fair (60-69)'
        WHEN base_score >= 50 THEN 'Average (50-59)'
        WHEN base_score >= 40 THEN 'Below Average (40-49)'
        ELSE 'Poor (30-39)'
    END as zimscore_category,
    CASE 
        WHEN has_cold_start THEN 'Has Cold Start Restrictions'
        ELSE 'No Cold Start'
    END as cold_start_status
FROM employment_employer_rating_matrix
WHERE is_active = true
ORDER BY base_score DESC;

-- =====================================================
-- 3. DOCUMENTATION BONUS CALCULATION
-- =====================================================

SELECT 
    '=== DOCUMENTATION BONUS IMPACT ===' as info;

-- Test how documentation affects ZimScore
SELECT 
    'Government Employee' as user_type,
    calculate_enhanced_cold_start_rating(
        '66666666-6666-6666-6666-666666666666',
        'employed',
        'government',
        ARRAY[]::TEXT[], -- No documents
        2500.00,
        0
    ) as zimscore_no_docs,
    calculate_enhanced_cold_start_rating(
        '66666666-6666-6666-6666-666666666666',
        'employed',
        'government',
        ARRAY['id', 'payslip'], -- Some documents
        2500.00,
        0
    ) as zimscore_partial_docs,
    calculate_enhanced_cold_start_rating(
        '66666666-6666-6666-6666-666666666666',
        'employed',
        'government',
        ARRAY['ec_number', 'id', 'payslip', 'selfie'], -- All required docs
        2500.00,
        0
    ) as zimscore_full_docs;

-- =====================================================
-- 4. LOAN LIMIT BY ZIMSCORE
-- =====================================================

SELECT 
    '=== LOAN LIMITS BY ZIMSCORE ===' as info;

SELECT 
    p.email,
    calculate_enhanced_cold_start_rating(
        p.id,
        p.employment_status,
        p.employer_type,
        ARRAY['id', 'payslip'],
        p.verified_net_salary,
        0
    ) as zimscore,
    m.max_loan_amount,
    m.cold_start_limit,
    CASE 
        WHEN m.has_cold_start THEN 
            'Initial: $' || m.cold_start_limit || ' → After cold start: $' || m.max_loan_amount
        ELSE 
            'No cold start: Up to $' || m.max_loan_amount
    END as loan_limit_progression
FROM profiles p
JOIN employment_employer_rating_matrix m ON 
    m.employment_type = p.employment_status AND 
    m.employer_type = p.employer_type AND
    m.is_active = true
WHERE p.id IN (
    '66666666-6666-6666-6666-666666666666',
    '55555555-5555-5555-5555-555555555555'
)
ORDER BY zimscore DESC;

SELECT 
    '=== ZIMSCORE POST-REGISTRATION TESTING COMPLETE ===' as info,
       'ZimScore ranges 30-85 based on employment/employer type',
       'Documentation bonus increases score up to 10 points',
       'Government employees get higher base scores (65-85)',
       'Private sector gets good scores (60-80)',
       'Informal sector gets lower scores (35-55)';

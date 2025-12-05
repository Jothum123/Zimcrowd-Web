/**
 * ZimScore Penalty System for Loan Repayment Performance
 * Tracks payment history and adjusts scores based on repayment behavior
 */

-- =====================================================
-- 1. LOAN REPAYMENT HISTORY TRACKING
-- =====================================================

-- Create loan repayment history table
CREATE TABLE IF NOT EXISTS loan_repayment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    loan_id UUID NOT NULL,
    installment_number INTEGER NOT NULL, -- 1st, 2nd, 3rd installment
    due_date DATE NOT NULL,
    paid_date DATE,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'late', 'missed', 'defaulted'
    days_late INTEGER DEFAULT 0,
    penalty_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ZimScore penalty tracking table
CREATE TABLE IF NOT EXISTS zimscore_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    penalty_type VARCHAR(30) NOT NULL, -- 'late_payment', 'missed_payment', 'default', 'first_installment_missed'
    penalty_points INTEGER NOT NULL, -- Negative points to subtract from ZimScore
    repayment_id UUID REFERENCES loan_repayment_history(id),
    reason TEXT,
    is_active BOOLEAN DEFAULT true, -- Whether penalty is currently applied
    recovery_eligible BOOLEAN DEFAULT false, -- Can be recovered through good behavior
    recovery_date DATE, -- When penalty can be recovered
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recovered_at TIMESTAMP WITH TIME ZONE -- When penalty was recovered
);

-- Create ZimScore rewards tracking table
CREATE TABLE IF NOT EXISTS zimscore_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    reward_type VARCHAR(30) NOT NULL, -- 'on_time_payment', 'early_payment', 'loan_fully_paid', 'perfect_history'
    reward_points INTEGER NOT NULL, -- Positive points to add to ZimScore
    repayment_id UUID REFERENCES loan_repayment_history(id),
    reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add penalty tracking to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS repayment_score INTEGER DEFAULT 100; -- Separate repayment score (0-100)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_penalty_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_penalty_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consecutive_on_time_payments INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_on_time_payments INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_rewards_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_reward_date DATE;

-- =====================================================
-- 2. PENALTY CALCULATION FUNCTIONS
-- =====================================================

-- Function to apply ZimScore penalty for late/missed payments
CREATE OR REPLACE FUNCTION apply_zimscore_penalty(
    p_user_id UUID,
    p_loan_id UUID,
    p_installment_number INTEGER,
    p_payment_status VARCHAR(20),
    p_days_late INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    v_penalty_points INTEGER := 0;
    v_penalty_type VARCHAR(30);
    v_reason TEXT;
    v_recovery_eligible BOOLEAN := false;
    v_recovery_months INTEGER := 6; -- Default recovery period
BEGIN
    -- Calculate penalty based on payment status and severity
    CASE p_payment_status
        WHEN 'late' THEN
            IF p_days_late <= 7 THEN
                v_penalty_points := -5; -- Minor lateness
                v_penalty_type := 'late_payment_minor';
                v_reason := 'Payment up to 7 days late';
                v_recovery_eligible := true;
                v_recovery_months := 3;
            ELSIF p_days_late <= 30 THEN
                v_penalty_points := -10; -- Moderate lateness
                v_penalty_type := 'late_payment_moderate';
                v_reason := 'Payment 8-30 days late';
                v_recovery_eligible := true;
                v_recovery_months := 6;
            ELSE
                v_penalty_points := -15; -- Severe lateness
                v_penalty_type := 'late_payment_severe';
                v_reason := 'Payment more than 30 days late';
                v_recovery_eligible := true;
                v_recovery_months := 12;
            END IF;
            
        WHEN 'missed' THEN
            IF p_installment_number = 1 THEN
                v_penalty_points := -20; -- First installment missed (most severe)
                v_penalty_type := 'first_installment_missed';
                v_reason := 'First installment completely missed';
                v_recovery_eligible := true;
                v_recovery_months := 12;
            ELSE
                v_penalty_points := -15; -- Other installments missed
                v_penalty_type := 'missed_payment';
                v_reason := 'Installment ' || p_installment_number || ' missed';
                v_recovery_eligible := true;
                v_recovery_months := 9;
            END IF;
            
        WHEN 'defaulted' THEN
            v_penalty_points := -30; -- Loan default (most severe)
            v_penalty_type := 'default';
            v_reason := 'Loan defaulted - no payment received';
            v_recovery_eligible := true;
            v_recovery_months := 24; -- 2 years to recover from default
            
        ELSE
            RETURN 0; -- No penalty for paid/pending status
    END CASE;
    
    -- Apply penalty to user's profile
    UPDATE profiles 
    SET 
        total_penalty_points = total_penalty_points + v_penalty_points,
        repayment_score = GREATEST(0, repayment_score + v_penalty_points),
        last_penalty_date = CURRENT_DATE,
        consecutive_on_time_payments = 0 -- Reset consecutive payments
    WHERE id = p_user_id;
    
    -- Record penalty in tracking table
    INSERT INTO zimscore_penalties (
        user_id, penalty_type, penalty_points, reason, 
        recovery_eligible, recovery_date
    ) VALUES (
        p_user_id, v_penalty_type, v_penalty_points, v_reason,
        v_recovery_eligible, CURRENT_DATE + (v_recovery_months || ' months')::INTERVAL
    );
    
    -- Update repayment history
    UPDATE loan_repayment_history 
    SET 
        payment_status = p_payment_status,
        days_late = p_days_late,
        penalty_applied = true,
        updated_at = NOW()
    WHERE user_id = p_user_id AND loan_id = p_loan_id AND installment_number = p_installment_number;
    
    RETURN v_penalty_points; -- Return penalty points applied
END;
$$ LANGUAGE plpgsql;

-- Function to apply ZimScore rewards for good repayment behavior
CREATE OR REPLACE FUNCTION apply_zimscore_reward(
    p_user_id UUID,
    p_loan_id UUID,
    p_installment_number INTEGER,
    p_payment_status VARCHAR(20),
    p_days_early INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
    v_reward_points INTEGER := 0;
    v_reward_type VARCHAR(30);
    v_reason TEXT;
    v_total_on_time INTEGER;
    v_perfect_bonus BOOLEAN := false;
BEGIN
    -- Calculate reward based on payment status and behavior
    CASE p_payment_status
        WHEN 'paid' THEN
            IF p_days_early > 0 THEN
                v_reward_points := 3; -- Early payment bonus
                v_reward_type := 'early_payment';
                v_reason := 'Payment made ' || p_days_early || ' days early';
            ELSE
                v_reward_points := 2; -- On-time payment bonus
                v_reward_type := 'on_time_payment';
                v_reason := 'Payment made on time';
            END IF;
            
        WHEN 'fully_paid' THEN
            v_reward_points := 10; -- Loan fully paid bonus
            v_reward_type := 'loan_fully_paid';
            v_reason := 'Entire loan paid off successfully';
            
        ELSE
            RETURN 0; -- No reward for other statuses
    END CASE;
    
    -- Check for perfect payment history bonus (every payment on time)
    SELECT total_on_time_payments INTO v_total_on_time
    FROM profiles 
    WHERE id = p_user_id;
    
    IF v_total_on_time >= 12 AND p_payment_status = 'fully_paid' THEN
        v_reward_points := v_reward_points + 5; -- Perfect history bonus
        v_perfect_bonus := true;
        INSERT INTO zimscore_rewards (
            user_id, reward_type, reward_points, reason
        ) VALUES (
            p_user_id, 'perfect_history', 5, 'Perfect payment history: 12+ on-time payments'
        );
    END IF;
    
    -- Apply reward to user's profile
    UPDATE profiles 
    SET 
        total_rewards_points = total_rewards_points + v_reward_points,
        repayment_score = LEAST(100, repayment_score + v_reward_points),
        last_reward_date = CURRENT_DATE,
        consecutive_on_time_payments = CASE 
            WHEN p_payment_status = 'paid' THEN consecutive_on_time_payments + 1
            ELSE consecutive_on_time_payments
        END,
        total_on_time_payments = CASE 
            WHEN p_payment_status = 'paid' THEN total_on_time_payments + 1
            ELSE total_on_time_payments
        END
    WHERE id = p_user_id;
    
    -- Record reward in tracking table
    INSERT INTO zimscore_rewards (
        user_id, reward_type, reward_points, reason
    ) VALUES (
        p_user_id, v_reward_type, v_reward_points, v_reason
    );
    
    -- Update repayment history
    UPDATE loan_repayment_history 
    SET 
        payment_status = p_payment_status,
        updated_at = NOW()
    WHERE user_id = p_user_id AND loan_id = p_loan_id AND installment_number = p_installment_number;
    
    RETURN v_reward_points; -- Return reward points applied
END;
$$ LANGUAGE plpgsql;

-- Function to calculate final ZimScore including penalties and rewards
CREATE OR REPLACE FUNCTION calculate_final_zimscore(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_base_zimscore INTEGER;
    v_total_penalties INTEGER;
    v_total_rewards INTEGER;
    v_final_score INTEGER;
    v_profile RECORD;
BEGIN
    -- Get user profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    -- Calculate base ZimScore (employment + documentation)
    v_base_zimscore := calculate_enhanced_cold_start_rating(
        p_user_id,
        v_profile.employment_status,
        v_profile.employer_type,
        COALESCE(v_profile.required_documents_submitted, ARRAY[]::TEXT[]),
        v_profile.verified_net_salary,
        0
    );
    
    -- Get total active penalties
    SELECT COALESCE(SUM(penalty_points), 0) INTO v_total_penalties
    FROM zimscore_penalties 
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Get total active rewards
    SELECT COALESCE(SUM(reward_points), 0) INTO v_total_rewards
    FROM zimscore_rewards 
    WHERE user_id = p_user_id AND is_active = true;
    
    -- Calculate final score (base + rewards + penalties, min 30, max 85)
    v_final_score := GREATEST(30, LEAST(85, v_base_zimscore + v_total_rewards + v_total_penalties));
    
    -- Update profile with final score
    UPDATE profiles 
    SET 
        zimscore = v_final_score,
        zimscore_calculated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN v_final_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. SCORE RECOVERY FUNCTIONS
-- =====================================================

-- Function to handle on-time payments and score recovery
CREATE OR REPLACE FUNCTION process_on_time_payment(p_user_id UUID, p_loan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_consecutive_payments INTEGER;
    v_recovery_eligible_penalties INTEGER := 0;
BEGIN
    -- Increment consecutive on-time payments
    UPDATE profiles 
    SET consecutive_on_time_payments = consecutive_on_time_payments + 1
    WHERE id = p_user_id
    RETURNING consecutive_on_time_payments INTO v_consecutive_payments;
    
    -- Check for penalty recovery eligibility (after 6+ consecutive on-time payments)
    IF v_consecutive_payments >= 6 THEN
        -- Find penalties eligible for recovery
        SELECT COUNT(*) INTO v_recovery_eligible_penalties
        FROM zimscore_penalties 
        WHERE user_id = p_user_id 
        AND recovery_eligible = true 
        AND is_active = true 
        AND recovery_date <= CURRENT_DATE;
        
        -- Recover eligible penalties
        IF v_recovery_eligible_penalties > 0 THEN
            UPDATE zimscore_penalties 
            SET is_active = false, recovered_at = NOW()
            WHERE user_id = p_user_id 
            AND recovery_eligible = true 
            AND is_active = true 
            AND recovery_date <= CURRENT_DATE;
            
            -- Recalculate user's ZimScore
            PERFORM calculate_final_zimscore(p_user_id);
            
            RETURN true; -- Penalties recovered
        END IF;
    END IF;
    
    RETURN false; -- No penalties recovered
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TESTING THE PENALTY SYSTEM
-- =====================================================

-- Test penalty application scenarios
SELECT 
    '=== TESTING ZIMSCORE PENALTY SYSTEM ===' as info;

-- Test 1: Apply minor late payment penalty
SELECT apply_zimscore_penalty(
    '66666666-6666-6666-6666-666666666666', -- Government user
    '11111111-1111-1111-1111-111111111111'::UUID,
    1, -- First installment
    'late',
    5 -- 5 days late
) as penalty_applied;

-- Test 2: Apply missed first installment penalty
SELECT apply_zimscore_penalty(
    '88888888-8888-8888-8888-888888888888', -- Government user missing EC
    '22222222-2222-2222-2222-222222222222'::UUID,
    1, -- First installment
    'missed',
    0
) as penalty_applied;

-- Test 3: Apply default penalty
SELECT apply_zimscore_penalty(
    '99999999-9999-9999-9999-999999999999', -- Government user below minimum
    '33333333-3333-3333-3333-333333333333'::UUID,
    2, -- Second installment
    'defaulted',
    0
) as penalty_applied;

-- Check penalty impact on ZimScores
SELECT 
    '=== ZIMSCORE AFTER PENALTIES ===' as info;

SELECT 
    p.email,
    p.employer_type,
    calculate_final_zimscore(p.id) as final_zimscore,
    p.total_penalty_points,
    p.repayment_score,
    p.consecutive_on_time_payments,
    CASE 
        WHEN p.total_penalty_points = 0 THEN '✅ Clean repayment history'
        WHEN p.total_penalty_points >= -10 THEN '⚠️ Minor penalties'
        WHEN p.total_penalty_points >= -20 THEN '❌ Significant penalties'
        ELSE '🚫 Severe repayment issues'
    END as repayment_status
FROM profiles p
WHERE p.id IN (
    '66666666-6666-6666-6666-666666666666',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
)
ORDER BY final_zimscore DESC;

SELECT 
    '=== ZIMSCORE PENALTY SYSTEM READY ===' as info,
       'Penalties: -5 (minor late), -10 (moderate late), -15 (severe late/missed), -20 (first missed), -30 (default)',
       'Recovery: 3-24 months based on severity, requires 6+ consecutive on-time payments';

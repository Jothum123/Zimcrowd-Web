-- Remove Interest Rate Columns from ZimScore
-- Run this in Supabase SQL Editor
-- Reason: Everyone starts at $50 and builds reputation through on-time repayments
-- Interest rates are not determined by ZimScore

-- ============================================
-- 1. Remove interest rate columns
-- ============================================

ALTER TABLE user_zimscores
DROP COLUMN IF EXISTS suggested_interest_rate_min,
DROP COLUMN IF EXISTS suggested_interest_rate_max;

-- ============================================
-- 2. Update view to remove interest rate fields
-- ============================================

CREATE OR REPLACE VIEW v_zimscore_summary AS
SELECT 
    uz.user_id,
    zu.full_name,
    zu.phone_number,
    zu.kyc_status,
    uz.score_value,
    uz.star_rating,
    uz.max_loan_amount,
    uz.risk_level,
    uz.on_time_payment_rate,
    uz.total_loans_completed,
    uz.max_loan_repaid,
    uz.platform_tenure_months,
    uz.cash_flow_ratio,
    uz.balance_consistency_score,
    uz.last_calculated,
    zu.created_at as user_created_at,
    EXTRACT(EPOCH FROM (NOW() - zu.created_at)) / (60 * 60 * 24 * 30) as actual_tenure_months
FROM user_zimscores uz
JOIN zimscore_users zu ON uz.user_id = zu.user_id;

-- ============================================
-- 3. Update risk_level to reputation_level
-- ============================================

-- Update existing values to reputation-based terminology
UPDATE user_zimscores
SET risk_level = CASE
    WHEN risk_level = 'Very Low' THEN 'Excellent'
    WHEN risk_level = 'Low' THEN 'Great'
    WHEN risk_level = 'Medium' THEN 'Good'
    WHEN risk_level = 'High' THEN 'Fair'
    WHEN risk_level = 'Very High' THEN 'Building'
    ELSE 'New'
END
WHERE risk_level IS NOT NULL;

-- Update column comment
COMMENT ON COLUMN user_zimscores.risk_level IS 'Reputation level: Excellent, Great, Good, Fair, Building, Early, New';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Interest rate columns removed successfully!';
    RAISE NOTICE '📊 System now focuses on reputation-based loan limits';
    RAISE NOTICE '💰 Everyone starts at $50 and builds up through on-time repayments';
    RAISE NOTICE '🎯 Reputation levels: Excellent, Great, Good, Fair, Building, Early, New';
END $$;

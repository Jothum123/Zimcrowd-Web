-- ZimScore Schema Update - Critical Features
-- Run this in Supabase SQL Editor to add new columns

-- ============================================
-- 1. Add new columns to user_zimscores table
-- ============================================

ALTER TABLE user_zimscores
ADD COLUMN IF NOT EXISTS risk_level TEXT,
ADD COLUMN IF NOT EXISTS suggested_interest_rate_min DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS suggested_interest_rate_max DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS on_time_payment_rate DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_loans_completed INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_loan_repaid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_tenure_months INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_flow_ratio DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS balance_consistency_score INT DEFAULT 0;

-- Add comments
COMMENT ON COLUMN user_zimscores.risk_level IS 'Risk classification: Very Low, Low, Medium, High, Very High';
COMMENT ON COLUMN user_zimscores.suggested_interest_rate_min IS 'Minimum suggested interest rate based on score';
COMMENT ON COLUMN user_zimscores.suggested_interest_rate_max IS 'Maximum suggested interest rate based on score';
COMMENT ON COLUMN user_zimscores.on_time_payment_rate IS 'Percentage of loans repaid on time';
COMMENT ON COLUMN user_zimscores.total_loans_completed IS 'Total number of loans successfully repaid';
COMMENT ON COLUMN user_zimscores.max_loan_repaid IS 'Largest loan amount successfully repaid';
COMMENT ON COLUMN user_zimscores.platform_tenure_months IS 'Number of months user has been active';
COMMENT ON COLUMN user_zimscores.cash_flow_ratio IS 'Income to expense ratio from statements';
COMMENT ON COLUMN user_zimscores.balance_consistency_score IS 'Balance consistency score (0-10)';

-- ============================================
-- 2. Add is_on_time column to zimscore_loans
-- ============================================

ALTER TABLE zimscore_loans
ADD COLUMN IF NOT EXISTS is_on_time BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN zimscore_loans.is_on_time IS 'Whether loan was repaid on or before due date';

-- ============================================
-- 3. Create function to calculate on-time status
-- ============================================

CREATE OR REPLACE FUNCTION calculate_is_on_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if loan is repaid
    IF NEW.status = 'repaid' AND NEW.repaid_at IS NOT NULL AND NEW.due_date IS NOT NULL THEN
        NEW.is_on_time := (NEW.repaid_at <= NEW.due_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate is_on_time
DROP TRIGGER IF EXISTS trigger_calculate_is_on_time ON zimscore_loans;
CREATE TRIGGER trigger_calculate_is_on_time
    BEFORE UPDATE OF status, repaid_at
    ON zimscore_loans
    FOR EACH ROW
    EXECUTE FUNCTION calculate_is_on_time();

-- ============================================
-- 4. Update existing loans with is_on_time value
-- ============================================

UPDATE zimscore_loans
SET is_on_time = (repaid_at <= due_date)
WHERE status = 'repaid' 
  AND repaid_at IS NOT NULL 
  AND due_date IS NOT NULL
  AND is_on_time IS NULL;

-- ============================================
-- 5. Create helper function for loan statistics
-- ============================================

CREATE OR REPLACE FUNCTION get_user_loan_stats(p_user_id UUID)
RETURNS TABLE (
    total_loans BIGINT,
    repaid_loans BIGINT,
    repaid_on_time BIGINT,
    repaid_late BIGINT,
    defaulted_loans BIGINT,
    on_time_rate DECIMAL(5,2),
    max_loan_repaid DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_loans,
        COUNT(*) FILTER (WHERE status = 'repaid')::BIGINT as repaid_loans,
        COUNT(*) FILTER (WHERE status = 'repaid' AND is_on_time = true)::BIGINT as repaid_on_time,
        COUNT(*) FILTER (WHERE status = 'repaid' AND is_on_time = false)::BIGINT as repaid_late,
        COUNT(*) FILTER (WHERE status = 'defaulted')::BIGINT as defaulted_loans,
        CASE 
            WHEN COUNT(*) FILTER (WHERE status = 'repaid') > 0 
            THEN (COUNT(*) FILTER (WHERE status = 'repaid' AND is_on_time = true)::DECIMAL / 
                  COUNT(*) FILTER (WHERE status = 'repaid')::DECIMAL * 100)
            ELSE 0
        END as on_time_rate,
        COALESCE(MAX(amount_requested) FILTER (WHERE status = 'repaid'), 0) as max_loan_repaid
    FROM zimscore_loans
    WHERE borrower_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Create view for score summary
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
    uz.suggested_interest_rate_min,
    uz.suggested_interest_rate_max,
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
-- 7. Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_zimscores_risk_level ON user_zimscores(risk_level);
CREATE INDEX IF NOT EXISTS idx_zimscores_score_value ON user_zimscores(score_value DESC);
CREATE INDEX IF NOT EXISTS idx_loans_is_on_time ON zimscore_loans(is_on_time) WHERE status = 'repaid';
CREATE INDEX IF NOT EXISTS idx_loans_borrower_status ON zimscore_loans(borrower_user_id, status);

-- ============================================
-- 8. Grant permissions (if needed)
-- ============================================

-- Grant SELECT on view to authenticated users
GRANT SELECT ON v_zimscore_summary TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_zimscores' 
  AND column_name IN (
    'risk_level', 
    'suggested_interest_rate_min', 
    'suggested_interest_rate_max',
    'on_time_payment_rate',
    'cash_flow_ratio',
    'balance_consistency_score'
  );

-- Test loan stats function
-- SELECT * FROM get_user_loan_stats('your-user-id-here');

-- View score summary
-- SELECT * FROM v_zimscore_summary LIMIT 5;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ ZimScore schema update completed successfully!';
    RAISE NOTICE '📊 New columns added to user_zimscores table';
    RAISE NOTICE '🎯 is_on_time column added to zimscore_loans';
    RAISE NOTICE '⚡ Helper functions and views created';
    RAISE NOTICE '🔍 Indexes created for performance';
END $$;

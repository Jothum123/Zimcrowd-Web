-- Add Interest Rate to Loan Requests
-- Users select their own interest rate between 3-10% per month
-- This creates a marketplace where lenders choose which rates to fund

-- ============================================
-- 1. Add interest_rate_monthly column to loans
-- ============================================

ALTER TABLE zimscore_loans
ADD COLUMN IF NOT EXISTS interest_rate_monthly DECIMAL(5,2) NOT NULL DEFAULT 10.00;

COMMENT ON COLUMN zimscore_loans.interest_rate_monthly IS 'Monthly interest rate selected by borrower (3-10%)';

-- ============================================
-- 2. Add validation constraint
-- ============================================

ALTER TABLE zimscore_loans
DROP CONSTRAINT IF EXISTS check_interest_rate_range;

ALTER TABLE zimscore_loans
ADD CONSTRAINT check_interest_rate_range 
CHECK (interest_rate_monthly >= 3.00 AND interest_rate_monthly <= 10.00);

-- ============================================
-- 3. Add total_interest_amount column
-- ============================================

ALTER TABLE zimscore_loans
ADD COLUMN IF NOT EXISTS total_interest_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN zimscore_loans.total_interest_amount IS 'Total interest to be paid (calculated from rate and duration)';

-- ============================================
-- 4. Add total_repayment_amount column
-- ============================================

ALTER TABLE zimscore_loans
ADD COLUMN IF NOT EXISTS total_repayment_amount DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN zimscore_loans.total_repayment_amount IS 'Total amount to repay (principal + interest)';

-- ============================================
-- 5. Create function to calculate loan amounts
-- ============================================

CREATE OR REPLACE FUNCTION calculate_loan_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate interest amount
    -- Formula: principal * (rate/100) * months
    NEW.total_interest_amount := NEW.amount_requested * (NEW.interest_rate_monthly / 100) * 
        EXTRACT(EPOCH FROM (NEW.due_date - NEW.funded_at)) / (60 * 60 * 24 * 30);
    
    -- Calculate total repayment
    NEW.total_repayment_amount := NEW.amount_requested + NEW.total_interest_amount;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Create trigger to auto-calculate amounts
-- ============================================

DROP TRIGGER IF EXISTS trigger_calculate_loan_amounts ON zimscore_loans;

CREATE TRIGGER trigger_calculate_loan_amounts
    BEFORE INSERT OR UPDATE OF amount_requested, interest_rate_monthly, due_date, funded_at
    ON zimscore_loans
    FOR EACH ROW
    WHEN (NEW.funded_at IS NOT NULL AND NEW.due_date IS NOT NULL)
    EXECUTE FUNCTION calculate_loan_amounts();

-- ============================================
-- 7. Update existing loans with default rate
-- ============================================

UPDATE zimscore_loans
SET interest_rate_monthly = 10.00
WHERE interest_rate_monthly IS NULL;

-- ============================================
-- 8. Create view for loan marketplace
-- ============================================

CREATE OR REPLACE VIEW v_loan_marketplace AS
SELECT 
    l.loan_id,
    l.borrower_user_id,
    u.full_name as borrower_name,
    uz.score_value as zimscore,
    uz.star_rating,
    uz.risk_level as reputation_level,
    uz.on_time_payment_rate,
    l.amount_requested,
    l.interest_rate_monthly,
    l.loan_duration_days,
    l.due_date,
    l.purpose,
    l.status,
    l.total_interest_amount,
    l.total_repayment_amount,
    l.created_at,
    -- Calculate potential return for lenders
    ROUND((l.total_interest_amount / l.amount_requested * 100), 2) as total_return_percentage,
    -- Calculate annualized return
    ROUND((l.interest_rate_monthly * 12), 2) as annual_interest_rate
FROM zimscore_loans l
JOIN zimscore_users u ON l.borrower_user_id = u.user_id
LEFT JOIN user_zimscores uz ON l.borrower_user_id = uz.user_id
WHERE l.status IN ('pending', 'active');

-- Grant access
GRANT SELECT ON v_loan_marketplace TO authenticated;

-- ============================================
-- 9. Create indexes for marketplace queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_loans_status_rate ON zimscore_loans(status, interest_rate_monthly DESC);
CREATE INDEX IF NOT EXISTS idx_loans_amount_rate ON zimscore_loans(amount_requested, interest_rate_monthly);

-- ============================================
-- 10. Add helper function for interest calculation
-- ============================================

CREATE OR REPLACE FUNCTION calculate_interest(
    p_principal DECIMAL,
    p_monthly_rate DECIMAL,
    p_months DECIMAL
)
RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(p_principal * (p_monthly_rate / 100) * p_months, 2);
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT calculate_interest(100, 5, 1); -- Returns 5.00 (5% of $100 for 1 month)

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check new columns
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'zimscore_loans' 
  AND column_name IN ('interest_rate_monthly', 'total_interest_amount', 'total_repayment_amount');

-- View marketplace
-- SELECT * FROM v_loan_marketplace LIMIT 5;

-- Test interest calculation
-- SELECT calculate_interest(100, 5, 1) as interest_for_100_at_5pct;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Interest rate system added successfully!';
    RAISE NOTICE '💰 Users can now select rates between 3-10%% per month';
    RAISE NOTICE '📊 Marketplace view created for lenders';
    RAISE NOTICE '🔢 Auto-calculation of interest and repayment amounts';
    RAISE NOTICE '🎯 Validation ensures rates stay within 3-10%% range';
END $$;

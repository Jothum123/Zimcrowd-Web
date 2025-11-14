-- ============================================
-- ZimCrowd Fee Tracking Schema
-- Comprehensive fee tracking for all transactions
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BORROWER FEE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS borrower_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL,
    borrower_user_id UUID NOT NULL,
    
    -- Loan Details
    loan_amount DECIMAL(10,2) NOT NULL,
    term_months INT NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    
    -- Upfront Fees
    service_fee DECIMAL(10,2) NOT NULL,
    insurance_fee DECIMAL(10,2) NOT NULL,
    total_upfront_fees DECIMAL(10,2) NOT NULL,
    net_amount_received DECIMAL(10,2) NOT NULL,
    
    -- Monthly Fees (per month)
    monthly_tenure_fee DECIMAL(10,2) NOT NULL,
    monthly_collection_fee DECIMAL(10,2) NOT NULL,
    total_monthly_fees DECIMAL(10,2) NOT NULL,
    
    -- Total Costs
    total_interest DECIMAL(10,2) NOT NULL,
    total_fees_paid DECIMAL(10,2) DEFAULT 0,
    total_repayment DECIMAL(10,2) NOT NULL,
    
    -- Effective Rate
    true_annual_effective_rate DECIMAL(5,2) NOT NULL,
    
    -- Status
    fees_collected BOOLEAN DEFAULT FALSE,
    upfront_fees_paid_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- LENDER FEE TRACKING - PRIMARY MARKET
-- ============================================

CREATE TABLE IF NOT EXISTS lender_primary_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investment_id UUID NOT NULL,
    lender_user_id UUID NOT NULL,
    loan_id UUID NOT NULL,
    
    -- Investment Details
    investment_amount DECIMAL(10,2) NOT NULL,
    estimated_monthly_yield DECIMAL(10,2) NOT NULL,
    term_months INT NOT NULL,
    
    -- Upfront Fees
    service_fee DECIMAL(10,2) NOT NULL,
    insurance_fee DECIMAL(10,2) NOT NULL,
    total_upfront_fees DECIMAL(10,2) NOT NULL,
    total_investment DECIMAL(10,2) NOT NULL,
    
    -- Monthly Fees (per month)
    monthly_collection_fee DECIMAL(10,2) NOT NULL,
    monthly_tenure_fee DECIMAL(10,2) NOT NULL,
    total_monthly_fees DECIMAL(10,2) NOT NULL,
    
    -- Returns
    total_gross_yield DECIMAL(10,2) NOT NULL,
    total_fees_paid DECIMAL(10,2) DEFAULT 0,
    total_net_return DECIMAL(10,2) NOT NULL,
    
    -- Performance
    roi DECIMAL(5,2) NOT NULL,
    payback_period DECIMAL(5,2) NOT NULL,
    
    -- Status
    upfront_fees_paid BOOLEAN DEFAULT FALSE,
    upfront_fees_paid_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- LENDER FEE TRACKING - SECONDARY MARKET
-- ============================================

CREATE TABLE IF NOT EXISTS lender_secondary_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID NOT NULL,
    lender_user_id UUID NOT NULL,
    original_loan_id UUID NOT NULL,
    
    -- Purchase Details
    purchase_amount DECIMAL(10,2) NOT NULL,
    deal_fee DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    
    -- Expected Returns
    remaining_monthly_yield DECIMAL(10,2) NOT NULL,
    remaining_months INT NOT NULL,
    total_expected_yield DECIMAL(10,2) NOT NULL,
    net_expected_profit DECIMAL(10,2) NOT NULL,
    
    -- Performance
    roi DECIMAL(5,2) NOT NULL,
    
    -- Status
    deal_fee_paid BOOLEAN DEFAULT FALSE,
    deal_fee_paid_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MONTHLY FEE COLLECTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS monthly_fee_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    fee_type TEXT NOT NULL CHECK (fee_type IN ('borrower', 'lender_primary')),
    reference_id UUID NOT NULL, -- borrower_fees.id or lender_primary_fees.id
    user_id UUID NOT NULL,
    
    -- Payment Details
    month_number INT NOT NULL,
    due_date DATE NOT NULL,
    
    -- Borrower Fees (if applicable)
    tenure_fee DECIMAL(10,2),
    collection_fee DECIMAL(10,2),
    
    -- Lender Fees (if applicable)
    lender_collection_fee DECIMAL(10,2),
    lender_tenure_fee DECIMAL(10,2),
    
    -- Total
    total_fee_amount DECIMAL(10,2) NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'failed', 'waived')),
    collected_at TIMESTAMP,
    failed_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- LATE FEE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS late_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    loan_id UUID NOT NULL,
    installment_id UUID NOT NULL,
    borrower_user_id UUID NOT NULL,
    lender_user_id UUID,
    
    -- Payment Details
    original_payment_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    days_late INT NOT NULL,
    
    -- Late Fee Calculation
    late_fee_amount DECIMAL(10,2) NOT NULL,
    platform_share DECIMAL(10,2) NOT NULL,
    lender_share DECIMAL(10,2) NOT NULL,
    
    -- Total Due
    total_amount_due DECIMAL(10,2) NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'waived', 'in_collections')),
    paid_at TIMESTAMP,
    waived_at TIMESTAMP,
    waived_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- RECOVERY FEE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS recovery_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    loan_id UUID NOT NULL,
    borrower_user_id UUID NOT NULL,
    lender_user_id UUID NOT NULL,
    
    -- Recovery Details
    original_amount_owed DECIMAL(10,2) NOT NULL,
    amount_recovered DECIMAL(10,2) NOT NULL,
    recovery_fee DECIMAL(10,2) NOT NULL, -- 30%
    net_to_lender DECIMAL(10,2) NOT NULL,
    
    -- Collection Agency
    agency_name TEXT,
    agency_reference TEXT,
    
    -- Status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
    recovered_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- FEE SUMMARY VIEW
-- ============================================

CREATE OR REPLACE VIEW fee_summary AS
SELECT 
    'borrower' AS user_type,
    bf.borrower_user_id AS user_id,
    bf.loan_id,
    bf.total_upfront_fees,
    bf.total_monthly_fees * bf.term_months AS total_monthly_fees,
    bf.total_fees_paid,
    bf.created_at
FROM borrower_fees bf

UNION ALL

SELECT 
    'lender_primary' AS user_type,
    lpf.lender_user_id AS user_id,
    lpf.loan_id,
    lpf.total_upfront_fees,
    lpf.total_monthly_fees * lpf.term_months AS total_monthly_fees,
    lpf.total_fees_paid,
    lpf.created_at
FROM lender_primary_fees lpf

UNION ALL

SELECT 
    'lender_secondary' AS user_type,
    lsf.lender_user_id AS user_id,
    lsf.original_loan_id AS loan_id,
    lsf.deal_fee AS total_upfront_fees,
    0 AS total_monthly_fees,
    lsf.deal_fee AS total_fees_paid,
    lsf.created_at
FROM lender_secondary_fees lsf;

-- ============================================
-- PLATFORM REVENUE VIEW
-- ============================================

CREATE OR REPLACE VIEW platform_revenue AS
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    
    -- Borrower Fees
    SUM(CASE WHEN user_type = 'borrower' THEN total_upfront_fees ELSE 0 END) AS borrower_upfront_fees,
    SUM(CASE WHEN user_type = 'borrower' THEN total_monthly_fees ELSE 0 END) AS borrower_monthly_fees,
    
    -- Lender Fees
    SUM(CASE WHEN user_type = 'lender_primary' THEN total_upfront_fees ELSE 0 END) AS lender_upfront_fees,
    SUM(CASE WHEN user_type = 'lender_primary' THEN total_monthly_fees ELSE 0 END) AS lender_monthly_fees,
    SUM(CASE WHEN user_type = 'lender_secondary' THEN total_upfront_fees ELSE 0 END) AS secondary_market_fees,
    
    -- Total
    SUM(total_upfront_fees + total_monthly_fees) AS total_revenue
    
FROM fee_summary
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_borrower_fees_loan ON borrower_fees(loan_id);
CREATE INDEX IF NOT EXISTS idx_borrower_fees_user ON borrower_fees(borrower_user_id);
CREATE INDEX IF NOT EXISTS idx_lender_primary_fees_loan ON lender_primary_fees(loan_id);
CREATE INDEX IF NOT EXISTS idx_lender_primary_fees_user ON lender_primary_fees(lender_user_id);
CREATE INDEX IF NOT EXISTS idx_lender_secondary_fees_loan ON lender_secondary_fees(original_loan_id);
CREATE INDEX IF NOT EXISTS idx_monthly_fee_collections_ref ON monthly_fee_collections(reference_id);
CREATE INDEX IF NOT EXISTS idx_monthly_fee_collections_status ON monthly_fee_collections(status);
CREATE INDEX IF NOT EXISTS idx_late_fees_loan ON late_fees(loan_id);
CREATE INDEX IF NOT EXISTS idx_late_fees_status ON late_fees(status);
CREATE INDEX IF NOT EXISTS idx_recovery_fees_loan ON recovery_fees(loan_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate total fees for a borrower
CREATE OR REPLACE FUNCTION calculate_borrower_total_fees(p_loan_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT 
        total_upfront_fees + (total_monthly_fees * term_months)
    INTO v_total
    FROM borrower_fees
    WHERE loan_id = p_loan_id;
    
    RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- Calculate total fees for a lender
CREATE OR REPLACE FUNCTION calculate_lender_total_fees(p_investment_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT 
        total_upfront_fees + (total_monthly_fees * term_months)
    INTO v_total
    FROM lender_primary_fees
    WHERE investment_id = p_investment_id;
    
    RETURN COALESCE(v_total, 0);
END;
$$ LANGUAGE plpgsql;

-- Record borrower fees
CREATE OR REPLACE FUNCTION record_borrower_fees(
    p_loan_id UUID,
    p_borrower_user_id UUID,
    p_loan_amount DECIMAL(10,2),
    p_term_months INT,
    p_interest_rate DECIMAL(5,2),
    p_service_fee DECIMAL(10,2),
    p_insurance_fee DECIMAL(10,2),
    p_monthly_tenure_fee DECIMAL(10,2),
    p_monthly_collection_fee DECIMAL(10,2),
    p_total_interest DECIMAL(10,2),
    p_total_repayment DECIMAL(10,2),
    p_taer DECIMAL(5,2)
)
RETURNS UUID AS $$
DECLARE
    v_fee_id UUID;
BEGIN
    INSERT INTO borrower_fees (
        loan_id,
        borrower_user_id,
        loan_amount,
        term_months,
        interest_rate,
        service_fee,
        insurance_fee,
        total_upfront_fees,
        net_amount_received,
        monthly_tenure_fee,
        monthly_collection_fee,
        total_monthly_fees,
        total_interest,
        total_repayment,
        true_annual_effective_rate
    ) VALUES (
        p_loan_id,
        p_borrower_user_id,
        p_loan_amount,
        p_term_months,
        p_interest_rate,
        p_service_fee,
        p_insurance_fee,
        p_service_fee + p_insurance_fee,
        p_loan_amount - (p_service_fee + p_insurance_fee),
        p_monthly_tenure_fee,
        p_monthly_collection_fee,
        p_monthly_tenure_fee + p_monthly_collection_fee,
        p_total_interest,
        p_total_repayment,
        p_taer
    )
    RETURNING id INTO v_fee_id;
    
    RETURN v_fee_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE borrower_fees IS 'Tracks all fees charged to borrowers';
COMMENT ON TABLE lender_primary_fees IS 'Tracks fees for primary market lender investments';
COMMENT ON TABLE lender_secondary_fees IS 'Tracks fees for secondary market purchases';
COMMENT ON TABLE monthly_fee_collections IS 'Tracks monthly fee collection status';
COMMENT ON TABLE late_fees IS 'Tracks late payment fees';
COMMENT ON TABLE recovery_fees IS 'Tracks collection agency recovery fees';

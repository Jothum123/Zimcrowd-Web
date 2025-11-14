-- ============================================
-- ZimCrowd Platform - Complete Database Schema
-- Three-System Architecture:
-- 1. ZimScore (Reputation) - Cannot be spent
-- 2. Cash Balance (Wallet 1) - Real money, withdrawable
-- 3. ZimCrowd Credit Balance (Wallet 2) - In-app currency, non-withdrawable
-- ============================================

-- ============================================
-- 1. USERS TABLE (Dual-Wallet System)
-- ============================================

-- Add dual-wallet columns to existing users table
ALTER TABLE zimscore_users
ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS non_withdrawable_credit DECIMAL(10, 2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN zimscore_users.cash_balance IS 'Wallet 1: Real money that can be withdrawn to bank/EcoCash';
COMMENT ON COLUMN zimscore_users.non_withdrawable_credit IS 'Wallet 2: In-app currency for fees and funding loans';

-- ============================================
-- 2. USER DOCUMENTS TABLE (For OCR)
-- ============================================

CREATE TABLE IF NOT EXISTS user_documents (
    doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES zimscore_users(user_id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('ZIM_ID', 'BANK_STATEMENT', 'ECOCASH_STATEMENT', 'SELFIE')),
    file_url TEXT NOT NULL,
    ocr_raw_text TEXT,
    ocr_parsed_data JSONB,
    is_verified BOOLEAN DEFAULT false,
    verification_notes TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_doc_type ON user_documents(doc_type);

COMMENT ON TABLE user_documents IS 'Stores uploaded documents for KYC and statement analysis';

-- ============================================
-- 3. CREDIT LEDGER TABLE (Wallet 2 Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS credit_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES zimscore_users(user_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'SIGNUP_BONUS',
        'REFERRAL_BONUS',
        'PAYMENT_COVERAGE',
        'FEE_PAYMENT',
        'LOAN_FUNDING',
        'ADMIN_ADJUSTMENT'
    )),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON credit_ledger(type);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created_at ON credit_ledger(created_at DESC);

COMMENT ON TABLE credit_ledger IS 'Audit trail for all non-withdrawable credit transactions (Wallet 2)';

-- ============================================
-- 4. CASH LEDGER TABLE (Wallet 1 Audit Trail)
-- ============================================

CREATE TABLE IF NOT EXISTS cash_ledger (
    ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES zimscore_users(user_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'LOAN_DISBURSEMENT',
        'LOAN_REPAYMENT_RECEIVED',
        'WITHDRAWAL',
        'DEPOSIT',
        'ADMIN_ADJUSTMENT'
    )),
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_ledger_user_id ON cash_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_type ON cash_ledger(type);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_created_at ON cash_ledger(created_at DESC);

COMMENT ON TABLE cash_ledger IS 'Audit trail for all cash balance transactions (Wallet 1)';

-- ============================================
-- 5. LOANS TABLE (Parent Agreement)
-- ============================================

-- Update existing loans table structure
ALTER TABLE zimscore_loans
ADD COLUMN IF NOT EXISTS lender_user_id UUID REFERENCES zimscore_users(user_id),
ADD COLUMN IF NOT EXISTS principal_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS total_repayment_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS number_of_installments INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS funded_with_credits DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS funded_with_cash DECIMAL(10, 2) DEFAULT 0.00;

-- Update status to include more states
ALTER TABLE zimscore_loans
DROP CONSTRAINT IF EXISTS zimscore_loans_status_check;

ALTER TABLE zimscore_loans
ADD CONSTRAINT zimscore_loans_status_check 
CHECK (status IN ('pending', 'active', 'paid', 'defaulted', 'cancelled'));

COMMENT ON COLUMN zimscore_loans.funded_with_credits IS 'Amount funded from lender Wallet 2 (credits)';
COMMENT ON COLUMN zimscore_loans.funded_with_cash IS 'Amount funded from lender Wallet 1 (cash)';

-- ============================================
-- 6. LOAN REPAYMENT SCHEDULE TABLE (CRITICAL)
-- ============================================

CREATE TABLE IF NOT EXISTS loan_repayment_schedule (
    repayment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES zimscore_loans(loan_id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    principal_portion DECIMAL(10, 2) NOT NULL,
    interest_portion DECIMAL(10, 2) NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'late',
        'paid',
        'covered_by_platform'
    )),
    paid_amount DECIMAL(10, 2) DEFAULT 0.00,
    paid_at TIMESTAMPTZ,
    days_late INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repayment_schedule_loan_id ON loan_repayment_schedule(loan_id);
CREATE INDEX IF NOT EXISTS idx_repayment_schedule_status ON loan_repayment_schedule(status);
CREATE INDEX IF NOT EXISTS idx_repayment_schedule_due_date ON loan_repayment_schedule(due_date);

COMMENT ON TABLE loan_repayment_schedule IS 'Tracks each individual installment for loans';

-- ============================================
-- 7. PAYMENT COVERAGE OFFERS TABLE (New Feature)
-- ============================================

CREATE TABLE IF NOT EXISTS payment_coverage_offers (
    offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repayment_id UUID NOT NULL REFERENCES loan_repayment_schedule(repayment_id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES zimscore_loans(loan_id) ON DELETE CASCADE,
    lender_user_id UUID NOT NULL REFERENCES zimscore_users(user_id) ON DELETE CASCADE,
    borrower_user_id UUID NOT NULL REFERENCES zimscore_users(user_id) ON DELETE CASCADE,
    original_amount_due DECIMAL(10, 2) NOT NULL,
    offer_amount_credits DECIMAL(10, 2) NOT NULL,
    coverage_percentage DECIMAL(5, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'accepted',
        'declined',
        'expired'
    )),
    days_late INT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coverage_offers_repayment_id ON payment_coverage_offers(repayment_id);
CREATE INDEX IF NOT EXISTS idx_coverage_offers_lender_id ON payment_coverage_offers(lender_user_id);
CREATE INDEX IF NOT EXISTS idx_coverage_offers_status ON payment_coverage_offers(status);
CREATE INDEX IF NOT EXISTS idx_coverage_offers_expires_at ON payment_coverage_offers(expires_at);

COMMENT ON TABLE payment_coverage_offers IS 'Tracks payment coverage offers made to lenders for late installments';

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================

-- Function to add credits to user (Wallet 2)
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
BEGIN
    -- Get current balance
    SELECT non_withdrawable_credit INTO v_balance_before
    FROM zimscore_users
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + p_amount;
    
    -- Update user balance
    UPDATE zimscore_users
    SET non_withdrawable_credit = v_balance_after
    WHERE user_id = p_user_id;
    
    -- Record in ledger
    INSERT INTO credit_ledger (
        user_id, amount, balance_before, balance_after, 
        type, reference_id, notes
    ) VALUES (
        p_user_id, p_amount, v_balance_before, v_balance_after,
        p_type, p_reference_id, p_notes
    );
    
    RETURN v_balance_after;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct credits from user (Wallet 2)
CREATE OR REPLACE FUNCTION deduct_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
BEGIN
    -- Get current balance
    SELECT non_withdrawable_credit INTO v_balance_before
    FROM zimscore_users
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check sufficient balance
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient credit balance. Available: %, Required: %', v_balance_before, p_amount;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before - p_amount;
    
    -- Update user balance
    UPDATE zimscore_users
    SET non_withdrawable_credit = v_balance_after
    WHERE user_id = p_user_id;
    
    -- Record in ledger (negative amount)
    INSERT INTO credit_ledger (
        user_id, amount, balance_before, balance_after,
        type, reference_id, notes
    ) VALUES (
        p_user_id, -p_amount, v_balance_before, v_balance_after,
        p_type, p_reference_id, p_notes
    );
    
    RETURN v_balance_after;
END;
$$ LANGUAGE plpgsql;

-- Function to add cash to user (Wallet 1)
CREATE OR REPLACE FUNCTION add_cash(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
BEGIN
    -- Get current balance
    SELECT cash_balance INTO v_balance_before
    FROM zimscore_users
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + p_amount;
    
    -- Update user balance
    UPDATE zimscore_users
    SET cash_balance = v_balance_after
    WHERE user_id = p_user_id;
    
    -- Record in ledger
    INSERT INTO cash_ledger (
        user_id, amount, balance_before, balance_after,
        type, reference_id, notes
    ) VALUES (
        p_user_id, p_amount, v_balance_before, v_balance_after,
        p_type, p_reference_id, p_notes
    );
    
    RETURN v_balance_after;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct cash from user (Wallet 1)
CREATE OR REPLACE FUNCTION deduct_cash(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
BEGIN
    -- Get current balance
    SELECT cash_balance INTO v_balance_before
    FROM zimscore_users
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check sufficient balance
    IF v_balance_before < p_amount THEN
        RAISE EXCEPTION 'Insufficient cash balance. Available: %, Required: %', v_balance_before, p_amount;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before - p_amount;
    
    -- Update user balance
    UPDATE zimscore_users
    SET cash_balance = v_balance_after
    WHERE user_id = p_user_id;
    
    -- Record in ledger (negative amount)
    INSERT INTO cash_ledger (
        user_id, amount, balance_before, balance_after,
        type, reference_id, notes
    ) VALUES (
        p_user_id, -p_amount, v_balance_before, v_balance_after,
        p_type, p_reference_id, p_notes
    );
    
    RETURN v_balance_after;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. TRIGGERS
-- ============================================

-- Trigger to automatically mark late payments
CREATE OR REPLACE FUNCTION check_late_payments()
RETURNS void AS $$
BEGIN
    UPDATE loan_repayment_schedule
    SET 
        status = 'late',
        days_late = EXTRACT(DAY FROM (NOW() - due_date))::INT
    WHERE status = 'pending'
      AND due_date < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. VIEWS
-- ============================================

-- View: User Wallet Summary
CREATE OR REPLACE VIEW v_user_wallet_summary AS
SELECT 
    u.user_id,
    u.full_name,
    u.phone_number,
    u.cash_balance as wallet_1_cash,
    u.non_withdrawable_credit as wallet_2_credits,
    (u.cash_balance + u.non_withdrawable_credit) as total_value,
    uz.score_value as zimscore,
    uz.star_rating,
    uz.max_loan_amount,
    u.created_at
FROM zimscore_users u
LEFT JOIN user_zimscores uz ON u.user_id = uz.user_id;

-- View: Active Loans with Repayment Status
CREATE OR REPLACE VIEW v_active_loans_summary AS
SELECT 
    l.loan_id,
    l.borrower_user_id,
    b.full_name as borrower_name,
    l.lender_user_id,
    len.full_name as lender_name,
    l.principal_amount,
    l.total_repayment_amount,
    l.number_of_installments,
    l.funded_with_cash,
    l.funded_with_credits,
    l.status as loan_status,
    COUNT(rs.repayment_id) as total_installments,
    COUNT(CASE WHEN rs.status = 'paid' THEN 1 END) as paid_installments,
    COUNT(CASE WHEN rs.status = 'late' THEN 1 END) as late_installments,
    COUNT(CASE WHEN rs.status = 'covered_by_platform' THEN 1 END) as covered_installments,
    SUM(CASE WHEN rs.status = 'paid' THEN rs.paid_amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN rs.status IN ('pending', 'late') THEN rs.amount_due ELSE 0 END) as total_outstanding
FROM zimscore_loans l
JOIN zimscore_users b ON l.borrower_user_id = b.user_id
LEFT JOIN zimscore_users len ON l.lender_user_id = len.user_id
LEFT JOIN loan_repayment_schedule rs ON l.loan_id = rs.loan_id
WHERE l.status IN ('active', 'pending')
GROUP BY l.loan_id, b.full_name, len.full_name;

-- View: Pending Payment Coverage Offers
CREATE OR REPLACE VIEW v_pending_coverage_offers AS
SELECT 
    pco.offer_id,
    pco.loan_id,
    pco.repayment_id,
    pco.lender_user_id,
    len.full_name as lender_name,
    pco.borrower_user_id,
    b.full_name as borrower_name,
    pco.original_amount_due,
    pco.offer_amount_credits,
    pco.coverage_percentage,
    pco.days_late,
    pco.expires_at,
    pco.created_at,
    rs.installment_number,
    rs.due_date
FROM payment_coverage_offers pco
JOIN zimscore_users len ON pco.lender_user_id = len.user_id
JOIN zimscore_users b ON pco.borrower_user_id = b.user_id
JOIN loan_repayment_schedule rs ON pco.repayment_id = rs.repayment_id
WHERE pco.status = 'pending'
  AND pco.expires_at > NOW();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ ZimCrowd Platform Schema Created Successfully!';
    RAISE NOTICE '💰 Dual-Wallet System: Cash Balance + Credit Balance';
    RAISE NOTICE '📊 Payment Coverage Offers System Ready';
    RAISE NOTICE '🔄 Installment-Based Repayment Tracking';
    RAISE NOTICE '📝 Complete Audit Trail (Cash + Credit Ledgers)';
    RAISE NOTICE '🎯 Three Systems: ZimScore + Wallet 1 + Wallet 2';
END $$;

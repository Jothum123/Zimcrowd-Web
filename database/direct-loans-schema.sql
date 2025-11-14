-- ============================================
-- ZimCrowd Direct Loans Schema
-- "Guaranteed" instant funding alternative to P2P marketplace
-- Loans funded directly by ZimCrowd Capital
-- ============================================

-- ============================================
-- 1. DIRECT LOANS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS direct_loans (
    direct_loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_user_id UUID NOT NULL REFERENCES zimscore_users(user_id) ON DELETE CASCADE,
    
    -- Loan Details
    principal_amount DECIMAL(10, 2) NOT NULL,
    fixed_finance_fee DECIMAL(10, 2) NOT NULL,
    total_repayment_amount DECIMAL(10, 2) NOT NULL,
    apr DECIMAL(5, 2) NOT NULL,
    
    -- Dates
    offer_created_at TIMESTAMPTZ DEFAULT now(),
    offer_expires_at TIMESTAMPTZ NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    disbursed_at TIMESTAMPTZ,
    repaid_at TIMESTAMPTZ,
    
    -- Agreement
    agreement_signed BOOLEAN DEFAULT false,
    signature_name TEXT,
    signature_ip_address TEXT,
    signed_at TIMESTAMPTZ,
    agreement_version TEXT DEFAULT '1.0',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'offer_pending' CHECK (status IN (
        'offer_pending',    -- Offer created, waiting for acceptance
        'offer_expired',    -- User didn't accept in time
        'agreement_signed', -- User signed, waiting for disbursement
        'disbursed',        -- Funds sent to user
        'repaid',           -- User repaid in full
        'late',             -- Past due date
        'defaulted'         -- Marked as default
    )),
    
    -- Repayment tracking
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    days_late INT DEFAULT 0,
    
    -- Credit check
    credit_check_performed BOOLEAN DEFAULT false,
    credit_check_result JSONB,
    credit_check_at TIMESTAMPTZ,
    
    -- Metadata
    offer_source TEXT DEFAULT 'direct_offer', -- 'direct_offer', 'fallback_from_p2p'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_loans_borrower ON direct_loans(borrower_user_id);
CREATE INDEX IF NOT EXISTS idx_direct_loans_status ON direct_loans(status);
CREATE INDEX IF NOT EXISTS idx_direct_loans_due_date ON direct_loans(due_date);
CREATE INDEX IF NOT EXISTS idx_direct_loans_expires_at ON direct_loans(offer_expires_at);

COMMENT ON TABLE direct_loans IS 'Direct loans funded by ZimCrowd Capital - guaranteed instant funding';

-- ============================================
-- 2. DIRECT LOAN OFFERS TABLE (Offer History)
-- ============================================

CREATE TABLE IF NOT EXISTS direct_loan_offers (
    offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_user_id UUID NOT NULL REFERENCES zimscore_users(user_id) ON DELETE CASCADE,
    
    -- Offer Details
    offered_amount DECIMAL(10, 2) NOT NULL,
    fixed_fee DECIMAL(10, 2) NOT NULL,
    total_repayment DECIMAL(10, 2) NOT NULL,
    apr DECIMAL(5, 2) NOT NULL,
    loan_duration_days INT NOT NULL,
    
    -- User's ZimScore at time of offer
    zimscore_at_offer INT,
    max_loan_amount_at_offer DECIMAL(10, 2),
    
    -- Offer Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'accepted',
        'declined',
        'expired'
    )),
    
    -- Acceptance tracking
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Link to actual loan if accepted
    direct_loan_id UUID REFERENCES direct_loans(direct_loan_id),
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_loan_offers_borrower ON direct_loan_offers(borrower_user_id);
CREATE INDEX IF NOT EXISTS idx_direct_loan_offers_status ON direct_loan_offers(status);

COMMENT ON TABLE direct_loan_offers IS 'History of all direct loan offers made to users';

-- ============================================
-- 3. DIRECT LOAN REPAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS direct_loan_repayments (
    repayment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direct_loan_id UUID NOT NULL REFERENCES direct_loans(direct_loan_id) ON DELETE CASCADE,
    
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT, -- 'paynow', 'ecocash', 'bank_transfer'
    transaction_reference TEXT,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'completed',
        'failed',
        'refunded'
    )),
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_direct_loan_repayments_loan ON direct_loan_repayments(direct_loan_id);

COMMENT ON TABLE direct_loan_repayments IS 'Repayment transactions for direct loans';

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function to calculate APR for direct loan
CREATE OR REPLACE FUNCTION calculate_direct_loan_apr(
    p_principal DECIMAL,
    p_fee DECIMAL,
    p_days INT
)
RETURNS DECIMAL AS $$
DECLARE
    v_total_cost DECIMAL;
    v_cost_percentage DECIMAL;
    v_apr DECIMAL;
BEGIN
    -- Total cost as percentage of principal
    v_cost_percentage := (p_fee / p_principal) * 100;
    
    -- Annualize it (365 days / loan days)
    v_apr := v_cost_percentage * (365.0 / p_days);
    
    RETURN ROUND(v_apr, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to create direct loan offer
CREATE OR REPLACE FUNCTION create_direct_loan_offer(
    p_borrower_user_id UUID,
    p_amount DECIMAL,
    p_fee DECIMAL,
    p_duration_days INT
)
RETURNS UUID AS $$
DECLARE
    v_offer_id UUID;
    v_total_repayment DECIMAL;
    v_apr DECIMAL;
    v_expires_at TIMESTAMPTZ;
    v_zimscore INT;
    v_max_loan DECIMAL;
BEGIN
    -- Calculate total repayment
    v_total_repayment := p_amount + p_fee;
    
    -- Calculate APR
    v_apr := calculate_direct_loan_apr(p_amount, p_fee, p_duration_days);
    
    -- Set expiry (24 hours from now)
    v_expires_at := NOW() + INTERVAL '24 hours';
    
    -- Get user's current ZimScore
    SELECT score_value, max_loan_amount 
    INTO v_zimscore, v_max_loan
    FROM user_zimscores
    WHERE user_id = p_borrower_user_id;
    
    -- Create offer
    INSERT INTO direct_loan_offers (
        borrower_user_id,
        offered_amount,
        fixed_fee,
        total_repayment,
        apr,
        loan_duration_days,
        zimscore_at_offer,
        max_loan_amount_at_offer,
        expires_at
    ) VALUES (
        p_borrower_user_id,
        p_amount,
        p_fee,
        v_total_repayment,
        v_apr,
        p_duration_days,
        v_zimscore,
        v_max_loan,
        v_expires_at
    )
    RETURNING offer_id INTO v_offer_id;
    
    RETURN v_offer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to accept direct loan offer
CREATE OR REPLACE FUNCTION accept_direct_loan_offer(
    p_offer_id UUID,
    p_signature_name TEXT,
    p_signature_ip TEXT
)
RETURNS UUID AS $$
DECLARE
    v_offer RECORD;
    v_direct_loan_id UUID;
    v_due_date TIMESTAMPTZ;
BEGIN
    -- Get offer details
    SELECT * INTO v_offer
    FROM direct_loan_offers
    WHERE offer_id = p_offer_id
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer not found or expired';
    END IF;
    
    -- Calculate due date
    v_due_date := NOW() + (v_offer.loan_duration_days || ' days')::INTERVAL;
    
    -- Create direct loan
    INSERT INTO direct_loans (
        borrower_user_id,
        principal_amount,
        fixed_finance_fee,
        total_repayment_amount,
        apr,
        offer_expires_at,
        due_date,
        agreement_signed,
        signature_name,
        signature_ip_address,
        signed_at,
        status
    ) VALUES (
        v_offer.borrower_user_id,
        v_offer.offered_amount,
        v_offer.fixed_fee,
        v_offer.total_repayment,
        v_offer.apr,
        v_offer.expires_at,
        v_due_date,
        true,
        p_signature_name,
        p_signature_ip,
        NOW(),
        'agreement_signed'
    )
    RETURNING direct_loan_id INTO v_direct_loan_id;
    
    -- Update offer status
    UPDATE direct_loan_offers
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        direct_loan_id = v_direct_loan_id
    WHERE offer_id = p_offer_id;
    
    RETURN v_direct_loan_id;
END;
$$ LANGUAGE plpgsql;

-- Function to disburse direct loan
CREATE OR REPLACE FUNCTION disburse_direct_loan(
    p_direct_loan_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_loan RECORD;
BEGIN
    -- Get loan details
    SELECT * INTO v_loan
    FROM direct_loans
    WHERE direct_loan_id = p_direct_loan_id
    AND status = 'agreement_signed';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Loan not found or not ready for disbursement';
    END IF;
    
    -- Add cash to borrower's Wallet 1
    PERFORM add_cash(
        v_loan.borrower_user_id,
        v_loan.principal_amount,
        'LOAN_DISBURSEMENT',
        p_direct_loan_id,
        'Direct loan disbursement from ZimCrowd Capital'
    );
    
    -- Update loan status
    UPDATE direct_loans
    SET 
        status = 'disbursed',
        disbursed_at = NOW()
    WHERE direct_loan_id = p_direct_loan_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_direct_loan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_direct_loan_timestamp
    BEFORE UPDATE ON direct_loans
    FOR EACH ROW
    EXECUTE FUNCTION update_direct_loan_timestamp();

-- Trigger to check for late payments
CREATE OR REPLACE FUNCTION check_direct_loan_late_status()
RETURNS void AS $$
BEGIN
    UPDATE direct_loans
    SET 
        status = 'late',
        days_late = EXTRACT(DAY FROM (NOW() - due_date))::INT
    WHERE status = 'disbursed'
      AND due_date < NOW()
      AND amount_paid < total_repayment_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. VIEWS
-- ============================================

-- View: Active Direct Loans Summary
CREATE OR REPLACE VIEW v_active_direct_loans AS
SELECT 
    dl.direct_loan_id,
    dl.borrower_user_id,
    u.full_name as borrower_name,
    u.phone_number,
    uz.score_value as current_zimscore,
    dl.principal_amount,
    dl.fixed_finance_fee,
    dl.total_repayment_amount,
    dl.apr,
    dl.due_date,
    dl.status,
    dl.amount_paid,
    (dl.total_repayment_amount - dl.amount_paid) as amount_outstanding,
    dl.days_late,
    dl.disbursed_at,
    dl.signed_at
FROM direct_loans dl
JOIN zimscore_users u ON dl.borrower_user_id = u.user_id
LEFT JOIN user_zimscores uz ON dl.borrower_user_id = uz.user_id
WHERE dl.status IN ('disbursed', 'late');

-- View: Pending Direct Loan Offers
CREATE OR REPLACE VIEW v_pending_direct_offers AS
SELECT 
    dlo.offer_id,
    dlo.borrower_user_id,
    u.full_name as borrower_name,
    dlo.offered_amount,
    dlo.fixed_fee,
    dlo.total_repayment,
    dlo.apr,
    dlo.loan_duration_days,
    dlo.zimscore_at_offer,
    dlo.expires_at,
    dlo.created_at,
    EXTRACT(EPOCH FROM (dlo.expires_at - NOW())) / 3600 as hours_until_expiry
FROM direct_loan_offers dlo
JOIN zimscore_users u ON dlo.borrower_user_id = u.user_id
WHERE dlo.status = 'pending'
  AND dlo.expires_at > NOW();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ ZimCrowd Direct Loans Schema Created!';
    RAISE NOTICE '💰 Guaranteed instant funding system ready';
    RAISE NOTICE '📝 E-signature and agreement tracking enabled';
    RAISE NOTICE '⚡ Direct disbursement to Wallet 1';
    RAISE NOTICE '📊 APR calculation and disclosure built-in';
END $$;

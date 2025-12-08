-- =====================================================
-- SEED DATA FOR DIRECT LOANS
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- DIRECT LOANS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS direct_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direct_loan_id VARCHAR(50) UNIQUE,
    borrower_user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Loan Details
    principal_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INTEGER NOT NULL DEFAULT 1,
    
    -- Calculated Fields
    total_interest DECIMAL(12,2),
    total_repayment DECIMAL(12,2),
    monthly_payment DECIMAL(12,2),
    
    -- Employment-Based Limits (NO DTNI)
    employment_type VARCHAR(50), -- civil_servant, private, informal, self_employed
    max_loan_limit DECIMAL(12,2),
    max_term_limit INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, active, paid, late, defaulted
    
    -- Offer Details
    offer_id UUID,
    offer_expires_at TIMESTAMP WITH TIME ZONE,
    offer_accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Signature
    signature_name VARCHAR(255),
    signature_ip VARCHAR(50),
    signed_at TIMESTAMP WITH TIME ZONE,
    
    -- Disbursement
    disbursed_at TIMESTAMP WITH TIME ZONE,
    disbursement_method VARCHAR(50),
    disbursement_reference VARCHAR(100),
    
    -- Repayment
    due_date TIMESTAMP WITH TIME ZONE,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    remaining_balance DECIMAL(12,2),
    payments_made INTEGER DEFAULT 0,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Late Fees
    days_late INTEGER DEFAULT 0,
    late_fee_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_direct_loan_status CHECK (status IN ('pending', 'approved', 'active', 'paid', 'late', 'defaulted', 'cancelled'))
);

-- =====================================================
-- DIRECT LOAN OFFERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS direct_loan_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Offer Details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    term_months INTEGER NOT NULL DEFAULT 1,
    interest_rate DECIMAL(5,2) NOT NULL,
    
    -- Calculated
    total_interest DECIMAL(12,2),
    total_repayment DECIMAL(12,2),
    monthly_payment DECIMAL(12,2),
    
    -- Employment Info
    employment_type VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, expired, cancelled
    expires_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_offer_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

-- =====================================================
-- DIRECT LOAN REPAYMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS direct_loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    direct_loan_id UUID REFERENCES direct_loans(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Payment Details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- paynow, ecocash, bank_transfer
    transaction_reference VARCHAR(100),
    
    -- Breakdown
    principal_portion DECIMAL(12,2),
    interest_portion DECIMAL(12,2),
    late_fee_portion DECIMAL(12,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    
    -- Timestamps
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_repayment_status CHECK (status IN ('pending', 'completed', 'failed'))
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_direct_loans_user ON direct_loans(borrower_user_id);
CREATE INDEX IF NOT EXISTS idx_direct_loans_status ON direct_loans(status);
CREATE INDEX IF NOT EXISTS idx_direct_loans_employment ON direct_loans(employment_type);
CREATE INDEX IF NOT EXISTS idx_direct_loan_offers_user ON direct_loan_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_direct_loan_offers_status ON direct_loan_offers(status);
CREATE INDEX IF NOT EXISTS idx_direct_loan_repayments_loan ON direct_loan_repayments(direct_loan_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE direct_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_loan_repayments ENABLE ROW LEVEL SECURITY;

-- Users can view their own direct loans
CREATE POLICY "Users can view own direct loans" 
ON direct_loans FOR SELECT 
TO authenticated 
USING (auth.uid() = borrower_user_id);

-- Users can view their own offers
CREATE POLICY "Users can view own offers" 
ON direct_loan_offers FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can create offers
CREATE POLICY "Users can create offers" 
ON direct_loan_offers FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can view their own repayments
CREATE POLICY "Users can view own repayments" 
ON direct_loan_repayments FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- =====================================================
-- EMPLOYMENT-BASED LOAN LIMITS REFERENCE
-- =====================================================
-- civil_servant: $3000 USD / ZWG 81000, 24 months max
-- private: $1000 USD / ZWG 27000, 12 months max
-- informal: $500 USD / ZWG 13500, 6 months max
-- self_employed: $500 USD / ZWG 13500, 6 months max
-- unemployed: Not eligible

-- =====================================================
-- SEED SAMPLE DIRECT LOANS FOR TESTING
-- =====================================================

-- Function to seed direct loans for a user
CREATE OR REPLACE FUNCTION seed_user_direct_loans(target_user_id UUID, emp_type TEXT)
RETURNS void AS $$
DECLARE
    loan_amount DECIMAL;
    max_amount DECIMAL;
    max_term INTEGER;
    interest_rate DECIMAL;
BEGIN
    -- Set limits based on employment type
    CASE emp_type
        WHEN 'civil_servant' THEN 
            max_amount := 3000;
            max_term := 24;
        WHEN 'private' THEN 
            max_amount := 1000;
            max_term := 12;
        WHEN 'informal' THEN 
            max_amount := 500;
            max_term := 6;
        WHEN 'self_employed' THEN 
            max_amount := 500;
            max_term := 6;
        ELSE 
            max_amount := 500;
            max_term := 6;
    END CASE;
    
    -- Random loan amount within limits
    loan_amount := 100 + (random() * (max_amount - 100));
    interest_rate := 8.0; -- 8% per month for USD
    
    -- Insert sample active loan
    INSERT INTO direct_loans (
        direct_loan_id,
        borrower_user_id,
        principal_amount,
        currency,
        interest_rate,
        term_months,
        total_interest,
        total_repayment,
        monthly_payment,
        employment_type,
        max_loan_limit,
        max_term_limit,
        status,
        disbursed_at,
        due_date,
        remaining_balance,
        signature_name,
        signed_at
    ) VALUES (
        'DL-' || substr(gen_random_uuid()::text, 1, 8),
        target_user_id,
        loan_amount,
        'USD',
        interest_rate,
        LEAST(3, max_term), -- 3 months or max allowed
        loan_amount * (interest_rate / 100) * 3,
        loan_amount + (loan_amount * (interest_rate / 100) * 3),
        (loan_amount + (loan_amount * (interest_rate / 100) * 3)) / 3,
        emp_type,
        max_amount,
        max_term,
        'active',
        NOW() - interval '30 days',
        NOW() + interval '60 days',
        loan_amount + (loan_amount * (interest_rate / 100) * 3),
        'Test User',
        NOW() - interval '30 days'
    )
    ON CONFLICT DO NOTHING;
    
    -- Insert sample completed loan
    INSERT INTO direct_loans (
        direct_loan_id,
        borrower_user_id,
        principal_amount,
        currency,
        interest_rate,
        term_months,
        total_interest,
        total_repayment,
        monthly_payment,
        employment_type,
        max_loan_limit,
        max_term_limit,
        status,
        disbursed_at,
        due_date,
        paid_amount,
        remaining_balance,
        payments_made,
        last_payment_date,
        signature_name,
        signed_at
    ) VALUES (
        'DL-' || substr(gen_random_uuid()::text, 1, 8),
        target_user_id,
        loan_amount * 0.5,
        'USD',
        interest_rate,
        1,
        (loan_amount * 0.5) * (interest_rate / 100),
        (loan_amount * 0.5) + ((loan_amount * 0.5) * (interest_rate / 100)),
        (loan_amount * 0.5) + ((loan_amount * 0.5) * (interest_rate / 100)),
        emp_type,
        max_amount,
        max_term,
        'paid',
        NOW() - interval '60 days',
        NOW() - interval '30 days',
        (loan_amount * 0.5) + ((loan_amount * 0.5) * (interest_rate / 100)),
        0,
        1,
        NOW() - interval '30 days',
        'Test User',
        NOW() - interval '60 days'
    )
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE PROFILES TABLE FOR EMPLOYMENT TYPE
-- =====================================================

-- Add employment_type column if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'private';

-- Add post_registration_completed if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS post_registration_completed BOOLEAN DEFAULT false;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check direct loans
-- SELECT * FROM direct_loans ORDER BY created_at DESC LIMIT 10;

-- Check offers
-- SELECT * FROM direct_loan_offers ORDER BY created_at DESC LIMIT 10;

-- Check employment distribution
-- SELECT employment_type, COUNT(*) FROM direct_loans GROUP BY employment_type;

-- Check loan limits by employment type
-- SELECT employment_type, MAX(principal_amount) as max_borrowed, AVG(principal_amount) as avg_borrowed 
-- FROM direct_loans GROUP BY employment_type;

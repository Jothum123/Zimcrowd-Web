-- ============================================================================
-- COMPLETE LOAN SYSTEMS SCHEMA
-- ============================================================================
-- P2P Market Loans + ZimDirect Loans + Payment History
-- Run this to create all loan-related tables
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. P2P PRIMARY MARKET TABLE
-- ============================================================================
-- Stores loans available for crowdfunding

CREATE TABLE IF NOT EXISTS public.p2p_primary_market (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Loan Details
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    funded_amount DECIMAL(15, 2) DEFAULT 0 CHECK (funded_amount >= 0),
    remaining_amount DECIMAL(15, 2) GENERATED ALWAYS AS (amount - funded_amount) STORED,
    funding_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN amount > 0 THEN (funded_amount / amount) * 100 ELSE 0 END
    ) STORED,
    
    -- Terms
    interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate > 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(15, 2) NOT NULL,
    
    -- Investment Limits
    min_investment DECIMAL(15, 2) DEFAULT 100 CHECK (min_investment > 0),
    max_investment DECIMAL(15, 2) CHECK (max_investment >= min_investment),
    
    -- Loan Information
    purpose TEXT NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    risk_score VARCHAR(5) CHECK (risk_score IN ('A', 'B', 'C', 'D', 'E')),
    zimscore INTEGER CHECK (zimscore >= 30 AND zimscore <= 85),
    
    -- Status
    status VARCHAR(20) DEFAULT 'funding' CHECK (status IN ('funding', 'funded', 'cancelled', 'expired')),
    funding_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Investor Count
    investor_count INTEGER DEFAULT 0 CHECK (investor_count >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(loan_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_p2p_primary_market_status ON public.p2p_primary_market(status);
CREATE INDEX IF NOT EXISTS idx_p2p_primary_market_borrower ON public.p2p_primary_market(borrower_id);
CREATE INDEX IF NOT EXISTS idx_p2p_primary_market_funding_deadline ON public.p2p_primary_market(funding_deadline);
CREATE INDEX IF NOT EXISTS idx_p2p_primary_market_risk_score ON public.p2p_primary_market(risk_score);

-- RLS Policies
ALTER TABLE public.p2p_primary_market ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view funding loans" ON public.p2p_primary_market
    FOR SELECT USING (status = 'funding');

CREATE POLICY "Borrowers can view own listings" ON public.p2p_primary_market
    FOR SELECT USING (auth.uid() = borrower_id);

-- ============================================================================
-- 2. P2P INVESTMENTS TABLE
-- ============================================================================
-- Stores individual investments in P2P loans

CREATE TABLE IF NOT EXISTS public.p2p_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_listing_id UUID NOT NULL REFERENCES public.p2p_primary_market(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Investment Details
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    expected_return DECIMAL(15, 2) NOT NULL,
    monthly_return DECIMAL(15, 2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'defaulted', 'sold')),
    
    -- Returns Tracking
    total_received DECIMAL(15, 2) DEFAULT 0 CHECK (total_received >= 0),
    outstanding_balance DECIMAL(15, 2),
    
    -- Timestamps
    invested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_p2p_investments_investor ON public.p2p_investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_p2p_investments_loan ON public.p2p_investments(loan_id);
CREATE INDEX IF NOT EXISTS idx_p2p_investments_status ON public.p2p_investments(status);
CREATE INDEX IF NOT EXISTS idx_p2p_investments_market_listing ON public.p2p_investments(market_listing_id);

-- RLS Policies
ALTER TABLE public.p2p_investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors can view own investments" ON public.p2p_investments
    FOR SELECT USING (auth.uid() = investor_id);

CREATE POLICY "Investors can create investments" ON public.p2p_investments
    FOR INSERT WITH CHECK (auth.uid() = investor_id);

-- ============================================================================
-- 3. ZIMDIRECT LOANS TABLE
-- ============================================================================
-- Stores direct platform loans with flexible credit requirements

CREATE TABLE IF NOT EXISTS public.zimdirect_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Loan Details
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate > 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(15, 2) NOT NULL,
    
    -- Credit Assessment
    zimscore_at_application INTEGER CHECK (zimscore_at_application >= 30 AND zimscore_at_application <= 85),
    credit_tier VARCHAR(20) CHECK (credit_tier IN ('new_user', 'low_score', 'medium_score', 'high_score')),
    risk_assessment JSONB DEFAULT '{}',
    
    -- Eligibility Checks
    is_new_user BOOLEAN DEFAULT FALSE,
    has_arrears BOOLEAN DEFAULT FALSE,
    has_defaults BOOLEAN DEFAULT FALSE,
    payment_history_score DECIMAL(5, 2) DEFAULT 0 CHECK (payment_history_score >= 0 AND payment_history_score <= 100),
    
    -- Approval
    auto_approved BOOLEAN DEFAULT FALSE,
    approval_reason TEXT,
    rejection_reason TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'active', 'completed', 'defaulted')),
    
    -- Disbursement
    disbursed_at TIMESTAMP WITH TIME ZONE,
    disbursement_method VARCHAR(50),
    disbursement_reference VARCHAR(100),
    
    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(loan_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zimdirect_loans_borrower ON public.zimdirect_loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_zimdirect_loans_status ON public.zimdirect_loans(status);
CREATE INDEX IF NOT EXISTS idx_zimdirect_loans_credit_tier ON public.zimdirect_loans(credit_tier);
CREATE INDEX IF NOT EXISTS idx_zimdirect_loans_auto_approved ON public.zimdirect_loans(auto_approved);

-- RLS Policies
ALTER TABLE public.zimdirect_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Borrowers can view own ZimDirect loans" ON public.zimdirect_loans
    FOR SELECT USING (auth.uid() = borrower_id);

-- ============================================================================
-- 4. PAYMENT HISTORY TABLE
-- ============================================================================
-- Tracks all loan payments and payment status

CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Payment Details
    payment_number INTEGER NOT NULL CHECK (payment_number > 0),
    due_date DATE NOT NULL,
    amount_due DECIMAL(15, 2) NOT NULL CHECK (amount_due > 0),
    amount_paid DECIMAL(15, 2) DEFAULT 0 CHECK (amount_paid >= 0),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'missed', 'partial')),
    days_overdue INTEGER DEFAULT 0 CHECK (days_overdue >= 0),
    
    -- Payment Information
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    transaction_id UUID,
    
    -- Late Fees
    late_fee DECIMAL(15, 2) DEFAULT 0 CHECK (late_fee >= 0),
    late_fee_paid DECIMAL(15, 2) DEFAULT 0 CHECK (late_fee_paid >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(loan_id, payment_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_borrower ON public.payment_history(borrower_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_loan ON public.payment_history(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_due_date ON public.payment_history(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_history_overdue ON public.payment_history(days_overdue) WHERE days_overdue > 0;

-- RLS Policies
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Borrowers can view own payment history" ON public.payment_history
    FOR SELECT USING (auth.uid() = borrower_id);

-- ============================================================================
-- 5. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_p2p_primary_market_updated_at') THEN
        CREATE TRIGGER update_p2p_primary_market_updated_at 
            BEFORE UPDATE ON public.p2p_primary_market
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_p2p_investments_updated_at') THEN
        CREATE TRIGGER update_p2p_investments_updated_at 
            BEFORE UPDATE ON public.p2p_investments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_zimdirect_loans_updated_at') THEN
        CREATE TRIGGER update_zimdirect_loans_updated_at 
            BEFORE UPDATE ON public.zimdirect_loans
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_payment_history_updated_at') THEN
        CREATE TRIGGER update_payment_history_updated_at 
            BEFORE UPDATE ON public.payment_history
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Function to calculate days overdue
CREATE OR REPLACE FUNCTION calculate_days_overdue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('late', 'missed') AND NEW.due_date < CURRENT_DATE THEN
        NEW.days_overdue = CURRENT_DATE - NEW.due_date;
    ELSE
        NEW.days_overdue = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate days overdue
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'calculate_payment_overdue') THEN
        CREATE TRIGGER calculate_payment_overdue
            BEFORE INSERT OR UPDATE ON public.payment_history
            FOR EACH ROW EXECUTE FUNCTION calculate_days_overdue();
    END IF;
END $$;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user has arrears
CREATE OR REPLACE FUNCTION has_arrears(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    arrears_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO arrears_count
    FROM public.payment_history
    WHERE borrower_id = user_uuid
    AND status IN ('late', 'missed')
    AND days_overdue > 0;
    
    RETURN arrears_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has defaults
CREATE OR REPLACE FUNCTION has_defaults(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    defaults_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO defaults_count
    FROM public.loans
    WHERE user_id = user_uuid
    AND status = 'defaulted';
    
    RETURN defaults_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate payment history score
CREATE OR REPLACE FUNCTION calculate_payment_history_score(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_payments INTEGER;
    on_time_payments INTEGER;
    score DECIMAL;
BEGIN
    SELECT COUNT(*) INTO total_payments
    FROM public.payment_history
    WHERE borrower_id = user_uuid;
    
    IF total_payments = 0 THEN
        RETURN 100.0; -- New users get perfect score
    END IF;
    
    SELECT COUNT(*) INTO on_time_payments
    FROM public.payment_history
    WHERE borrower_id = user_uuid
    AND status = 'paid'
    AND days_overdue = 0;
    
    score = (on_time_payments::DECIMAL / total_payments::DECIMAL) * 100;
    
    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.p2p_primary_market TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.p2p_investments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.zimdirect_loans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_history TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 8. VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LOAN SYSTEMS SCHEMA VERIFICATION:';
    RAISE NOTICE '========================================';
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'p2p_primary_market') THEN
        RAISE NOTICE '✅ p2p_primary_market table created';
    ELSE
        RAISE NOTICE '❌ p2p_primary_market table missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'p2p_investments') THEN
        RAISE NOTICE '✅ p2p_investments table created';
    ELSE
        RAISE NOTICE '❌ p2p_investments table missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zimdirect_loans') THEN
        RAISE NOTICE '✅ zimdirect_loans table created';
    ELSE
        RAISE NOTICE '❌ zimdirect_loans table missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_history') THEN
        RAISE NOTICE '✅ payment_history table created';
    ELSE
        RAISE NOTICE '❌ payment_history table missing';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🎉 LOAN SYSTEMS SCHEMA COMPLETE!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================

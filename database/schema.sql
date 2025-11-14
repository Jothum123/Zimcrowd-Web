-- ZimCrowd Database Schema
-- Matches the mock data structure exactly

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    country TEXT NOT NULL,
    city TEXT NOT NULL,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
    kyc_level INTEGER DEFAULT 0 CHECK (kyc_level >= 0 AND kyc_level <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WALLETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (balance >= 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    available_balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (available_balance >= 0),
    pending_balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (pending_balance >= 0),
    total_invested DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    total_borrowed DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    total_earned DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- LOANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate >= 0 AND interest_rate <= 100),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    purpose TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'defaulted', 'cancelled')),
    funded_amount DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (funded_amount >= 0),
    repaid_amount DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (repaid_amount >= 0),
    remaining_amount DECIMAL(15, 2) NOT NULL,
    next_payment_date DATE,
    next_payment_amount DECIMAL(15, 2) DEFAULT 0.00,
    risk_rating TEXT CHECK (risk_rating IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D')),
    collateral_type TEXT,
    monthly_payment DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    payments_made INTEGER DEFAULT 0 NOT NULL CHECK (payments_made >= 0),
    payments_remaining INTEGER NOT NULL CHECK (payments_remaining >= 0),
    funding_progress INTEGER DEFAULT 0 CHECK (funding_progress >= 0 AND funding_progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    funded_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INVESTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate >= 0 AND interest_rate <= 100),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted')),
    earned_interest DECIMAL(15, 2) DEFAULT 0.00 NOT NULL CHECK (earned_interest >= 0),
    expected_return DECIMAL(15, 2) NOT NULL,
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    payments_received INTEGER DEFAULT 0 NOT NULL CHECK (payments_received >= 0),
    next_payment_date DATE,
    next_payment_amount DECIMAL(15, 2) DEFAULT 0.00,
    invested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    maturity_date TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('investment', 'repayment', 'deposit', 'withdrawal', 'interest', 'fee', 'refund')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT NOT NULL,
    reference TEXT UNIQUE NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    payment_method TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('payment_due', 'payment_received', 'loan_funded', 'investment_return', 'kyc_update', 'system', 'security')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- STATISTICS TABLE (Cached aggregated data)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    total_loans INTEGER DEFAULT 0,
    active_loans INTEGER DEFAULT 0,
    pending_loans INTEGER DEFAULT 0,
    completed_loans INTEGER DEFAULT 0,
    total_investments INTEGER DEFAULT 0,
    active_investments INTEGER DEFAULT 0,
    completed_investments INTEGER DEFAULT 0,
    total_borrowed DECIMAL(15, 2) DEFAULT 0.00,
    total_invested DECIMAL(15, 2) DEFAULT 0.00,
    total_earned DECIMAL(15, 2) DEFAULT 0.00,
    total_repaid DECIMAL(15, 2) DEFAULT 0.00,
    average_return_rate DECIMAL(5, 2) DEFAULT 0.00,
    portfolio_performance DECIMAL(5, 2) DEFAULT 0.00,
    credit_score INTEGER DEFAULT 0 CHECK (credit_score >= 0 AND credit_score <= 850),
    success_rate DECIMAL(5, 2) DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON public.investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_loan_id ON public.investments(loan_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON public.investments(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON public.user_statistics(user_id);

-- ============================================
-- TRIGGERS for updated_at timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON public.investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON public.user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only view/update their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Wallets: Users can only view their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Loans: Users can view their own loans and public loan listings
CREATE POLICY "Users can view own loans" ON public.loans
    FOR SELECT USING (auth.uid() = borrower_id);

CREATE POLICY "Users can view public loan opportunities" ON public.loans
    FOR SELECT USING (status = 'pending');

-- Investments: Users can view their own investments
CREATE POLICY "Users can view own investments" ON public.investments
    FOR SELECT USING (auth.uid() = investor_id);

-- Transactions: Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Notifications: Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Statistics: Users can view their own statistics
CREATE POLICY "Users can view own statistics" ON public.user_statistics
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- VIEWS for Common Queries
-- ============================================

-- View: Loan details with borrower info
CREATE OR REPLACE VIEW public.loan_details AS
SELECT 
    l.*,
    up.first_name || ' ' || up.last_name AS borrower_name,
    up.credit_score AS borrower_credit_score
FROM public.loans l
JOIN public.user_profiles up ON l.borrower_id = up.id;

-- View: Investment details with loan and borrower info
CREATE OR REPLACE VIEW public.investment_details AS
SELECT 
    i.*,
    l.purpose AS loan_purpose,
    l.risk_rating,
    up.first_name || ' ' || up.last_name AS borrower_name
FROM public.investments i
JOIN public.loans l ON i.loan_id = l.id
JOIN public.user_profiles up ON l.borrower_id = up.id;

-- ============================================
-- FUNCTIONS for Business Logic
-- ============================================

-- Function: Calculate loan funding progress
CREATE OR REPLACE FUNCTION calculate_loan_funding_progress(loan_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    loan_amount DECIMAL(15, 2);
    funded_amount DECIMAL(15, 2);
    progress INTEGER;
BEGIN
    SELECT amount, funded_amount INTO loan_amount, funded_amount
    FROM public.loans
    WHERE id = loan_uuid;
    
    IF loan_amount > 0 THEN
        progress := ROUND((funded_amount / loan_amount) * 100);
        RETURN LEAST(progress, 100);
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Update user statistics
CREATE OR REPLACE FUNCTION update_user_statistics(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    stats RECORD;
BEGIN
    -- Calculate statistics
    SELECT 
        COUNT(DISTINCT l.id) FILTER (WHERE l.borrower_id = user_uuid) AS total_loans,
        COUNT(DISTINCT l.id) FILTER (WHERE l.borrower_id = user_uuid AND l.status = 'active') AS active_loans,
        COUNT(DISTINCT l.id) FILTER (WHERE l.borrower_id = user_uuid AND l.status = 'pending') AS pending_loans,
        COUNT(DISTINCT l.id) FILTER (WHERE l.borrower_id = user_uuid AND l.status = 'completed') AS completed_loans,
        COUNT(DISTINCT i.id) FILTER (WHERE i.investor_id = user_uuid) AS total_investments,
        COUNT(DISTINCT i.id) FILTER (WHERE i.investor_id = user_uuid AND i.status = 'active') AS active_investments,
        COUNT(DISTINCT i.id) FILTER (WHERE i.investor_id = user_uuid AND i.status = 'completed') AS completed_investments,
        COALESCE(SUM(l.amount) FILTER (WHERE l.borrower_id = user_uuid), 0) AS total_borrowed,
        COALESCE(SUM(i.amount) FILTER (WHERE i.investor_id = user_uuid), 0) AS total_invested,
        COALESCE(SUM(i.earned_interest) FILTER (WHERE i.investor_id = user_uuid), 0) AS total_earned,
        COALESCE(SUM(l.repaid_amount) FILTER (WHERE l.borrower_id = user_uuid), 0) AS total_repaid
    INTO stats
    FROM public.loans l
    FULL OUTER JOIN public.investments i ON FALSE;
    
    -- Insert or update statistics
    INSERT INTO public.user_statistics (
        user_id, total_loans, active_loans, pending_loans, completed_loans,
        total_investments, active_investments, completed_investments,
        total_borrowed, total_invested, total_earned, total_repaid
    ) VALUES (
        user_uuid, stats.total_loans, stats.active_loans, stats.pending_loans, stats.completed_loans,
        stats.total_investments, stats.active_investments, stats.completed_investments,
        stats.total_borrowed, stats.total_invested, stats.total_earned, stats.total_repaid
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_loans = EXCLUDED.total_loans,
        active_loans = EXCLUDED.active_loans,
        pending_loans = EXCLUDED.pending_loans,
        completed_loans = EXCLUDED.completed_loans,
        total_investments = EXCLUDED.total_investments,
        active_investments = EXCLUDED.active_investments,
        completed_investments = EXCLUDED.completed_investments,
        total_borrowed = EXCLUDED.total_borrowed,
        total_invested = EXCLUDED.total_invested,
        total_earned = EXCLUDED.total_earned,
        total_repaid = EXCLUDED.total_repaid,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

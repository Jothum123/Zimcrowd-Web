-- Create Missing Database Tables for ZimCrowd (SAFE VERSION)
-- This version checks for existing tables and only creates what's missing

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            action_url VARCHAR(500),
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            read_at TIMESTAMP
        );
        
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
        
        RAISE NOTICE 'Created notifications table';
    ELSE
        RAISE NOTICE 'notifications table already exists';
    END IF;
END $$;

-- ============================================
-- 2. LOAN REPAYMENTS TABLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_repayments') THEN
        CREATE TABLE loan_repayments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            amount DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(50),
            payment_reference VARCHAR(255),
            status VARCHAR(50) DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_loan_repayments_loan_id ON loan_repayments(loan_id);
        CREATE INDEX idx_loan_repayments_user_id ON loan_repayments(user_id);
        
        RAISE NOTICE 'Created loan_repayments table';
    ELSE
        RAISE NOTICE 'loan_repayments table already exists';
    END IF;
END $$;

-- ============================================
-- 3. INVESTMENTS TABLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments') THEN
        CREATE TABLE investments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
            amount DECIMAL(10, 2) NOT NULL,
            expected_return DECIMAL(10, 2),
            actual_return DECIMAL(10, 2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            start_date DATE DEFAULT CURRENT_DATE,
            end_date DATE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_investments_user_id ON investments(user_id);
        CREATE INDEX idx_investments_loan_id ON investments(loan_id);
        CREATE INDEX idx_investments_status ON investments(status);
        
        RAISE NOTICE 'Created investments table';
    ELSE
        RAISE NOTICE 'investments table already exists';
    END IF;
END $$;

-- ============================================
-- 4. INVESTMENT RETURNS TABLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_returns') THEN
        CREATE TABLE investment_returns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
            amount DECIMAL(10, 2) NOT NULL,
            return_date DATE DEFAULT CURRENT_DATE,
            type VARCHAR(50) DEFAULT 'interest',
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_investment_returns_investment_id ON investment_returns(investment_id);
        
        RAISE NOTICE 'Created investment_returns table';
    ELSE
        RAISE NOTICE 'investment_returns table already exists';
    END IF;
END $$;

-- ============================================
-- 5. REFERRALS TABLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals') THEN
        CREATE TABLE referrals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            referral_code VARCHAR(50) UNIQUE NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            reward_amount DECIMAL(10, 2) DEFAULT 0,
            reward_paid BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            completed_at TIMESTAMP
        );
        
        CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
        CREATE INDEX idx_referrals_referred_id ON referrals(referred_id);
        CREATE INDEX idx_referrals_code ON referrals(referral_code);
        
        RAISE NOTICE 'Created referrals table';
    ELSE
        RAISE NOTICE 'referrals table already exists';
    END IF;
END $$;

-- ============================================
-- 6. REFERRAL EARNINGS TABLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_earnings') THEN
        CREATE TABLE referral_earnings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            amount DECIMAL(10, 2) NOT NULL,
            type VARCHAR(50) DEFAULT 'signup_bonus',
            paid BOOLEAN DEFAULT false,
            paid_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_referral_earnings_referral_id ON referral_earnings(referral_id);
        CREATE INDEX idx_referral_earnings_user_id ON referral_earnings(user_id);
        
        RAISE NOTICE 'Created referral_earnings table';
    ELSE
        RAISE NOTICE 'referral_earnings table already exists';
    END IF;
END $$;

-- ============================================
-- 7. USER DOCUMENTS TABLE
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_documents') THEN
        CREATE TABLE user_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            document_type VARCHAR(50) NOT NULL,
            document_url VARCHAR(500) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            verified_at TIMESTAMP,
            verified_by UUID REFERENCES auth.users(id),
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
        CREATE INDEX idx_user_documents_status ON user_documents(status);
        
        RAISE NOTICE 'Created user_documents table';
    ELSE
        RAISE NOTICE 'user_documents table already exists';
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
    'notifications' as table_name, 
    EXISTS(SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') as exists
UNION ALL
SELECT 'loan_repayments', EXISTS(SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_repayments')
UNION ALL
SELECT 'investments', EXISTS(SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments')
UNION ALL
SELECT 'investment_returns', EXISTS(SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_returns')
UNION ALL
SELECT 'referrals', EXISTS(SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals')
UNION ALL
SELECT 'referral_earnings', EXISTS(SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referral_earnings')
UNION ALL
SELECT 'user_documents', EXISTS(SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_documents');

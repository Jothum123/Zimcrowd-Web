-- Create All Missing Database Tables for ZimCrowd
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'loan', 'investment', 'payment', 'wallet', 'security', 'system', 'referral', 'kyc'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 2. LOANS TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    term_months INTEGER NOT NULL,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'active', 'repaid', 'defaulted'
    approved_at TIMESTAMP,
    disbursed_at TIMESTAMP,
    due_date DATE,
    total_repaid DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- ============================================
-- 3. LOAN REPAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_user_id ON loan_repayments(user_id);

-- ============================================
-- 4. INVESTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expected_return DECIMAL(10, 2),
    actual_return DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'defaulted'
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_loan_id ON investments(loan_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);

-- ============================================
-- 5. INVESTMENT RETURNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS investment_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    return_date DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50) DEFAULT 'interest', -- 'interest', 'principal'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investment_returns_investment_id ON investment_returns(investment_id);

-- ============================================
-- 6. REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'expired'
    reward_amount DECIMAL(10, 2) DEFAULT 0,
    reward_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- ============================================
-- 7. REFERRAL EARNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50) DEFAULT 'signup_bonus', -- 'signup_bonus', 'investment_commission', 'loan_commission'
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referral_id ON referral_earnings(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_user_id ON referral_earnings(user_id);

-- ============================================
-- 8. USER DOCUMENTS TABLE (for KYC)
-- ============================================
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'national_id', 'passport', 'drivers_license', 'proof_of_address'
    document_url VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    verified_at TIMESTAMP,
    verified_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON user_documents(status);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'notifications',
    'loans',
    'loan_repayments',
    'investments',
    'investment_returns',
    'referrals',
    'referral_earnings',
    'user_documents',
    'wallets',
    'wallet_transactions',
    'payment_transactions',
    'user_settings',
    'user_notification_preferences',
    'user_security_settings',
    'user_sessions'
)
ORDER BY table_name;

-- Check row counts
SELECT 'notifications' as table_name, COUNT(*) as row_count FROM notifications
UNION ALL SELECT 'loans', COUNT(*) FROM loans
UNION ALL SELECT 'loan_repayments', COUNT(*) FROM loan_repayments
UNION ALL SELECT 'investments', COUNT(*) FROM investments
UNION ALL SELECT 'investment_returns', COUNT(*) FROM investment_returns
UNION ALL SELECT 'referrals', COUNT(*) FROM referrals
UNION ALL SELECT 'referral_earnings', COUNT(*) FROM referral_earnings
UNION ALL SELECT 'user_documents', COUNT(*) FROM user_documents
UNION ALL SELECT 'wallets', COUNT(*) FROM wallets
UNION ALL SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions
UNION ALL SELECT 'payment_transactions', COUNT(*) FROM payment_transactions;

-- BASE DATABASE SCHEMA
-- Run this FIRST before any other SQL files
-- This creates the foundational tables for ZimCrowd platform

-- =====================================================
-- 1. CREATE USERS TABLE (BASE)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for users table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
        CREATE INDEX idx_users_email ON users(email);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_role') THEN
        CREATE INDEX idx_users_role ON users(role);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_active') THEN
        CREATE INDEX idx_users_active ON users(is_active);
    END IF;
END $$;

-- =====================================================
-- 2. CREATE WALLETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    available_balance DECIMAL(15, 2) DEFAULT 0.00,
    locked_balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for wallets table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wallets_user') THEN
        CREATE INDEX idx_wallets_user ON wallets(user_id);
    END IF;
END $$;

-- =====================================================
-- 3. CREATE TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id),
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),
    description TEXT,
    reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure all columns exist (for existing tables that might be missing columns)
DO $$
BEGIN
    -- Add reference column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'reference'
    ) THEN
        ALTER TABLE transactions ADD COLUMN reference VARCHAR(100);
    END IF;
    
    -- Add metadata column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE transactions ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'status'
    ) THEN
        ALTER TABLE transactions ADD COLUMN status VARCHAR(50) DEFAULT 'completed';
    END IF;
END $$;

-- Create indexes for transactions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_user') THEN
        CREATE INDEX idx_transactions_user ON transactions(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_type') THEN
        CREATE INDEX idx_transactions_type ON transactions(type);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_date') THEN
        CREATE INDEX idx_transactions_date ON transactions(created_at DESC);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_transactions_reference') THEN
        CREATE INDEX idx_transactions_reference ON transactions(reference);
    END IF;
END $$;

-- Transaction Types:
-- 'credit', 'debit', 'loan_disbursement', 'loan_repayment', 
-- 'investment', 'investment_return', 'fee', 'withdrawal', 'deposit'

-- =====================================================
-- 4. CREATE LOANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    term INTEGER NOT NULL,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    zim_score INTEGER,
    monthly_payment DECIMAL(15, 2),
    total_repayment DECIMAL(15, 2),
    amount_funded DECIMAL(15, 2) DEFAULT 0.00,
    amount_repaid DECIMAL(15, 2) DEFAULT 0.00,
    outstanding_balance DECIMAL(15, 2),
    disbursed_at TIMESTAMP,
    first_payment_date DATE,
    last_payment_date DATE,
    completed_at TIMESTAMP,
    e_signature TEXT,
    agreement_accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for loans table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loans_user') THEN
        CREATE INDEX idx_loans_user ON loans(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loans_status') THEN
        CREATE INDEX idx_loans_status ON loans(status);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_loans_created') THEN
        CREATE INDEX idx_loans_created ON loans(created_at DESC);
    END IF;
END $$;

-- Loan Status:
-- 'pending', 'approved', 'funding', 'active', 'late', 'defaulted', 'completed', 'rejected'

-- =====================================================
-- 5. CREATE INVESTMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    net_amount DECIMAL(15, 2) NOT NULL,
    expected_return DECIMAL(15, 2),
    actual_return DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'active',
    investment_date TIMESTAMP DEFAULT NOW(),
    maturity_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for investments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_investments_user') THEN
        CREATE INDEX idx_investments_user ON investments(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_investments_loan') THEN
        CREATE INDEX idx_investments_loan ON investments(loan_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_investments_status') THEN
        CREATE INDEX idx_investments_status ON investments(status);
    END IF;
END $$;

-- Investment Status:
-- 'active', 'completed', 'defaulted', 'sold'

-- =====================================================
-- 6. CREATE LOAN_INSTALLMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_amount DECIMAL(15, 2) NOT NULL,
    fees DECIMAL(15, 2) DEFAULT 0.00,
    total_amount DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'pending',
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for loan_installments table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_installments_loan') THEN
        CREATE INDEX idx_installments_loan ON loan_installments(loan_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_installments_due_date') THEN
        CREATE INDEX idx_installments_due_date ON loan_installments(due_date);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_installments_status') THEN
        CREATE INDEX idx_installments_status ON loan_installments(status);
    END IF;
END $$;

-- Installment Status:
-- 'pending', 'paid', 'overdue', 'partial'

-- =====================================================
-- 7. CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for notifications table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_user') THEN
        CREATE INDEX idx_notifications_user ON notifications(user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_read') THEN
        CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_created') THEN
        CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
    END IF;
END $$;

-- Notification Types:
-- 'loan_approved', 'loan_rejected', 'payment_due', 'payment_received',
-- 'investment_return', 'kyc_approved', 'kyc_rejected', 'account_status_change'

-- =====================================================
-- 8. CREATE SECONDARY_MARKET TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS secondary_market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id),
    asking_price DECIMAL(15, 2) NOT NULL,
    original_investment DECIMAL(15, 2) NOT NULL,
    remaining_term INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    listed_at TIMESTAMP DEFAULT NOW(),
    sold_at TIMESTAMP,
    buyer_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for secondary_market_listings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_secondary_market_investment') THEN
        CREATE INDEX idx_secondary_market_investment ON secondary_market_listings(investment_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_secondary_market_seller') THEN
        CREATE INDEX idx_secondary_market_seller ON secondary_market_listings(seller_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_secondary_market_status') THEN
        CREATE INDEX idx_secondary_market_status ON secondary_market_listings(status);
    END IF;
END $$;

-- =====================================================
-- 9. CREATE FUNCTION TO UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON loan_installments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. CREATE INITIAL ADMIN USER (OPTIONAL)
-- =====================================================

-- Password: Admin@123 (hashed with bcrypt)
-- Change this password immediately after first login!

INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
VALUES (
    'admin@zimcrowd.com',
    '$2b$10$rKZLvXZvXZvXZvXZvXZvXeExample', -- Replace with actual bcrypt hash
    'System Administrator',
    'admin',
    true,
    true
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 11. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE users IS 'Core user accounts table';
COMMENT ON TABLE wallets IS 'User wallet balances';
COMMENT ON TABLE transactions IS 'All financial transactions';
COMMENT ON TABLE loans IS 'Loan applications and active loans';
COMMENT ON TABLE investments IS 'P2P loan investments';
COMMENT ON TABLE loan_installments IS 'Loan repayment schedule';
COMMENT ON TABLE notifications IS 'User notifications';
COMMENT ON TABLE secondary_market_listings IS 'Investment resale marketplace';

-- =====================================================
-- EXECUTION ORDER FOR ALL SQL FILES:
-- =====================================================

-- 1. DATABASE_BASE_SCHEMA.sql (THIS FILE) - Run FIRST
-- 2. DATABASE_ACCOUNT_FLAGS.sql - Account status system
-- 3. DATABASE_PROFILE_SETUP.sql - Profile completion system
-- 4. Any other custom tables

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

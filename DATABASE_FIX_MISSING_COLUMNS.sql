-- FIX MISSING COLUMNS IN EXISTING TABLES
-- Run this to add all missing columns to existing tables
-- Safe to run multiple times - only adds what's missing

-- =====================================================
-- FIX USERS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add phone_number if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(20);
        RAISE NOTICE '✓ Added users.phone_number';
    END IF;
    
    -- Add role if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
        RAISE NOTICE '✓ Added users.role';
    END IF;
    
    -- Add is_active if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✓ Added users.is_active';
    END IF;
    
    -- Add email_verified if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
        RAISE NOTICE '✓ Added users.email_verified';
    END IF;
    
    -- Add email_verified_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
        RAISE NOTICE '✓ Added users.email_verified_at';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '✓ Added users.updated_at';
    END IF;
    
    RAISE NOTICE '✓ Users table columns checked';
END $$;

-- =====================================================
-- FIX TRANSACTIONS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add wallet_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'wallet_id') THEN
        ALTER TABLE transactions ADD COLUMN wallet_id UUID;
        RAISE NOTICE '✓ Added transactions.wallet_id';
    END IF;
    
    -- Add balance_before if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'balance_before') THEN
        ALTER TABLE transactions ADD COLUMN balance_before DECIMAL(15, 2);
        RAISE NOTICE '✓ Added transactions.balance_before';
    END IF;
    
    -- Add balance_after if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'balance_after') THEN
        ALTER TABLE transactions ADD COLUMN balance_after DECIMAL(15, 2);
        RAISE NOTICE '✓ Added transactions.balance_after';
    END IF;
    
    -- Add reference if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'reference') THEN
        ALTER TABLE transactions ADD COLUMN reference VARCHAR(100);
        RAISE NOTICE '✓ Added transactions.reference';
    END IF;
    
    -- Add status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'status') THEN
        ALTER TABLE transactions ADD COLUMN status VARCHAR(50) DEFAULT 'completed';
        RAISE NOTICE '✓ Added transactions.status';
    END IF;
    
    -- Add metadata if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'metadata') THEN
        ALTER TABLE transactions ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE '✓ Added transactions.metadata';
    END IF;
    
    RAISE NOTICE '✓ Transactions table columns checked';
END $$;

-- =====================================================
-- FIX LOANS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'user_id') THEN
        ALTER TABLE loans ADD COLUMN user_id UUID;
        RAISE NOTICE '✓ Added loans.user_id';
    END IF;
    
    -- Add interest_rate if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'interest_rate') THEN
        ALTER TABLE loans ADD COLUMN interest_rate DECIMAL(5, 2);
        RAISE NOTICE '✓ Added loans.interest_rate';
    END IF;
    
    -- Add term if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'term') THEN
        ALTER TABLE loans ADD COLUMN term INTEGER;
        RAISE NOTICE '✓ Added loans.term';
    END IF;
    
    -- Add purpose if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'purpose') THEN
        ALTER TABLE loans ADD COLUMN purpose TEXT;
        RAISE NOTICE '✓ Added loans.purpose';
    END IF;
    
    -- Add zim_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'zim_score') THEN
        ALTER TABLE loans ADD COLUMN zim_score INTEGER;
        RAISE NOTICE '✓ Added loans.zim_score';
    END IF;
    
    -- Add monthly_payment if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'monthly_payment') THEN
        ALTER TABLE loans ADD COLUMN monthly_payment DECIMAL(15, 2);
        RAISE NOTICE '✓ Added loans.monthly_payment';
    END IF;
    
    -- Add total_repayment if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'total_repayment') THEN
        ALTER TABLE loans ADD COLUMN total_repayment DECIMAL(15, 2);
        RAISE NOTICE '✓ Added loans.total_repayment';
    END IF;
    
    -- Add amount_funded if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'amount_funded') THEN
        ALTER TABLE loans ADD COLUMN amount_funded DECIMAL(15, 2) DEFAULT 0.00;
        RAISE NOTICE '✓ Added loans.amount_funded';
    END IF;
    
    -- Add amount_repaid if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'amount_repaid') THEN
        ALTER TABLE loans ADD COLUMN amount_repaid DECIMAL(15, 2) DEFAULT 0.00;
        RAISE NOTICE '✓ Added loans.amount_repaid';
    END IF;
    
    -- Add outstanding_balance if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'outstanding_balance') THEN
        ALTER TABLE loans ADD COLUMN outstanding_balance DECIMAL(15, 2);
        RAISE NOTICE '✓ Added loans.outstanding_balance';
    END IF;
    
    -- Add e_signature if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'e_signature') THEN
        ALTER TABLE loans ADD COLUMN e_signature TEXT;
        RAISE NOTICE '✓ Added loans.e_signature';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'updated_at') THEN
        ALTER TABLE loans ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '✓ Added loans.updated_at';
    END IF;
    
    RAISE NOTICE '✓ Loans table columns checked';
END $$;

-- =====================================================
-- FIX INVESTMENTS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add user_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'user_id') THEN
        ALTER TABLE investments ADD COLUMN user_id UUID;
        RAISE NOTICE '✓ Added investments.user_id';
    END IF;
    
    -- Add loan_id if missing (THIS IS THE ONE CAUSING YOUR ERROR)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'loan_id') THEN
        ALTER TABLE investments ADD COLUMN loan_id UUID;
        RAISE NOTICE '✓ Added investments.loan_id';
    END IF;
    
    -- Add net_amount if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'net_amount') THEN
        ALTER TABLE investments ADD COLUMN net_amount DECIMAL(15, 2);
        RAISE NOTICE '✓ Added investments.net_amount';
    END IF;
    
    -- Add expected_return if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'expected_return') THEN
        ALTER TABLE investments ADD COLUMN expected_return DECIMAL(15, 2);
        RAISE NOTICE '✓ Added investments.expected_return';
    END IF;
    
    -- Add actual_return if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'actual_return') THEN
        ALTER TABLE investments ADD COLUMN actual_return DECIMAL(15, 2) DEFAULT 0.00;
        RAISE NOTICE '✓ Added investments.actual_return';
    END IF;
    
    -- Add investment_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'investment_date') THEN
        ALTER TABLE investments ADD COLUMN investment_date TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '✓ Added investments.investment_date';
    END IF;
    
    -- Add maturity_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'maturity_date') THEN
        ALTER TABLE investments ADD COLUMN maturity_date DATE;
        RAISE NOTICE '✓ Added investments.maturity_date';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investments' AND column_name = 'updated_at') THEN
        ALTER TABLE investments ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '✓ Added investments.updated_at';
    END IF;
    
    RAISE NOTICE '✓ Investments table columns checked';
END $$;

-- =====================================================
-- FIX WALLETS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add available_balance if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'available_balance') THEN
        ALTER TABLE wallets ADD COLUMN available_balance DECIMAL(15, 2) DEFAULT 0.00;
        RAISE NOTICE '✓ Added wallets.available_balance';
    END IF;
    
    -- Add locked_balance if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'locked_balance') THEN
        ALTER TABLE wallets ADD COLUMN locked_balance DECIMAL(15, 2) DEFAULT 0.00;
        RAISE NOTICE '✓ Added wallets.locked_balance';
    END IF;
    
    -- Add currency if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'currency') THEN
        ALTER TABLE wallets ADD COLUMN currency VARCHAR(10) DEFAULT 'USD';
        RAISE NOTICE '✓ Added wallets.currency';
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'updated_at') THEN
        ALTER TABLE wallets ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '✓ Added wallets.updated_at';
    END IF;
    
    RAISE NOTICE '✓ Wallets table columns checked';
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ ALL MISSING COLUMNS ADDED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Now you can run DATABASE_BASE_SCHEMA.sql';
    RAISE NOTICE 'All indexes will be created successfully';
END $$;

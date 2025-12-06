-- Clean Migration - Drops existing tables and recreates fresh schema
-- This ensures no conflicts from previous migration attempts

-- Drop all existing tables in reverse dependency order
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS repayment_schedule CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table - KYC and profile info
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    id_number TEXT,
    kyc_status TEXT DEFAULT 'pending',
    is_active BOOLEAN DEFAULT true,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Loans Table - The "Contract"
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term INTEGER NOT NULL, -- in months
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'pending_admin_review', 'approved', 'disbursed', 'active', 'completed', 'rejected')),
    loan_type TEXT DEFAULT 'p2p' CHECK (loan_type IN ('direct', 'p2p')),
    purpose TEXT,
    description TEXT,
    currency TEXT DEFAULT 'USD',
    
    -- Direct loan specific fields
    employment_type TEXT CHECK (employment_type IN ('government', 'private', 'informal')),
    monthly_salary DECIMAL(10,2),
    
    -- Workflow tracking
    approved_at TIMESTAMPTZ,
    approved_by TEXT,
    rejected_at TIMESTAMPTZ,
    rejected_by TEXT,
    rejection_reason TEXT,
    disbursed_at TIMESTAMPTZ,
    disbursed_by TEXT,
    
    -- Agreement tracking
    agreed_to_fees BOOLEAN DEFAULT false,
    agreed_to_terms BOOLEAN DEFAULT false,
    e_signature TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Repayment_Schedule Table - The "Plan"
CREATE TABLE repayment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    principal_due DECIMAL(10,2) NOT NULL,
    interest_due DECIMAL(10,2) NOT NULL,
    remaining_principal DECIMAL(10,2),
    status TEXT DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'PARTIALLY_PAID', 'OVERDUE')),
    paid_amount DECIMAL(10,2) DEFAULT 0,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions Table - The "Reality"
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('DISBURSEMENT', 'REPAYMENT', 'FEE', 'PENALTY')),
    amount DECIMAL(10,2) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference TEXT UNIQUE NOT NULL,
    description TEXT,
    created_by TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_loan_type ON loans(loan_type);
CREATE INDEX idx_loans_created_at ON loans(created_at);
CREATE INDEX idx_repayment_schedule_loan_id ON repayment_schedule(loan_id);
CREATE INDEX idx_repayment_schedule_due_date ON repayment_schedule(due_date);
CREATE INDEX idx_repayment_schedule_status ON repayment_schedule(status);
CREATE INDEX idx_transactions_loan_id ON transactions(loan_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Insert sample admin user
INSERT INTO users (id, email, first_name, last_name, role, is_active)
VALUES (
    gen_random_uuid(),
    'admin@zimcrowd.co.zw',
    'System',
    'Administrator',
    'admin',
    true
);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Clean migration completed successfully!';
    RAISE NOTICE 'All tables created fresh with proper schema';
    RAISE NOTICE 'Tables: users, loans, repayment_schedule, transactions';
END $$;

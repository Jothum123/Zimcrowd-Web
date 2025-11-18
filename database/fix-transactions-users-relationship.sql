-- Fix transactions-users relationship for admin manual transactions
-- This ensures Supabase can properly join transactions with users

-- First, ensure the users table exists with proper structure
-- Check if users table exists and add missing columns if needed
DO $$ 
BEGIN
    -- Create users table if it doesn't exist
    CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_sign_in_at TIMESTAMP WITH TIME ZONE,
        email_verified BOOLEAN DEFAULT false
    );
    
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
    
    -- Add email_verified column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
    END IF;
    
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'full_name') THEN
        ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
    END IF;
    
END $$;

-- Ensure the transactions table exists with proper foreign key
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(100),
    reference VARCHAR(255) UNIQUE,
    external_reference VARCHAR(255),
    payment_url TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_status ON transactions(user_id, status);

-- Ensure RLS is enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can access all transactions" ON transactions;
CREATE POLICY "Service role can access all transactions" ON transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for users
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can access all users" ON users;
CREATE POLICY "Service role can access all users" ON users
    FOR ALL USING (auth.role() = 'service_role');

-- Insert a test user for testing purposes
-- Use a more flexible approach that works with existing schema
DO $$
BEGIN
    -- Insert test user with only required columns first
    INSERT INTO users (id, email) 
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'test@zimcrowd.com'
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Update with optional columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'full_name') THEN
        UPDATE users SET full_name = 'Test User' 
        WHERE id = '00000000-0000-0000-0000-000000000001';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'phone') THEN
        UPDATE users SET phone = '+263771234567' 
        WHERE id = '00000000-0000-0000-0000-000000000001';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        UPDATE users SET email_verified = true 
        WHERE id = '00000000-0000-0000-0000-000000000001';
    END IF;
END $$;

-- Add some sample transaction types that the system supports
COMMENT ON TABLE transactions IS 'All financial transactions including deposits, withdrawals, manual transactions';
COMMENT ON COLUMN transactions.type IS 'Transaction types: deposit, withdrawal, manual_deposit, manual_debit, express_checkout, bank_transfer, etc.';
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, initiated, completed, failed, cancelled, pending_approval, approved, rejected';
COMMENT ON COLUMN transactions.metadata IS 'Additional transaction data including admin details, source information, etc.';

-- Refresh the schema cache (this helps Supabase recognize the relationships)
NOTIFY pgrst, 'reload schema';

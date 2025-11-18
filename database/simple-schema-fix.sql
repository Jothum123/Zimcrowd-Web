-- Simple Schema Fix for Admin Manual Transactions
-- Works with any existing users table structure

-- Ensure transactions table exists with proper foreign key
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
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

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'transactions_user_id_fkey' 
        AND table_name = 'transactions'
    ) THEN
        -- Add foreign key constraint
        ALTER TABLE transactions 
        ADD CONSTRAINT transactions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

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

-- Create RLS policies for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can access all transactions" ON transactions;
CREATE POLICY "Service role can access all transactions" ON transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Insert a simple test user with all required fields
-- First check what columns exist and are required
DO $$
DECLARE
    has_password_hash BOOLEAN;
    has_full_name BOOLEAN;
    has_role BOOLEAN;
BEGIN
    -- Check if password_hash column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) INTO has_password_hash;
    
    -- Check if full_name column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) INTO has_full_name;
    
    -- Check if role column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) INTO has_role;
    
    -- Insert test user with appropriate columns
    IF has_password_hash AND has_full_name AND has_role THEN
        INSERT INTO users (id, email, password_hash, full_name, role) 
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'test@zimcrowd.com',
            '$2b$10$dummy.hash.for.testing.purposes.only.not.real.password',
            'Test User',
            'user'
        ) ON CONFLICT (email) DO NOTHING;
    ELSIF has_password_hash AND has_full_name THEN
        INSERT INTO users (id, email, password_hash, full_name) 
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'test@zimcrowd.com',
            '$2b$10$dummy.hash.for.testing.purposes.only.not.real.password',
            'Test User'
        ) ON CONFLICT (email) DO NOTHING;
    ELSIF has_password_hash THEN
        INSERT INTO users (id, email, password_hash) 
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'test@zimcrowd.com',
            '$2b$10$dummy.hash.for.testing.purposes.only.not.real.password'
        ) ON CONFLICT (email) DO NOTHING;
    ELSE
        INSERT INTO users (id, email) 
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'test@zimcrowd.com'
        ) ON CONFLICT (email) DO NOTHING;
    END IF;
    
    RAISE NOTICE 'Test user inserted with password_hash: %, full_name: %, role: %', 
                 has_password_hash, has_full_name, has_role;
END $$;

-- Create admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES users(id),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for admin_actions
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Enable RLS for admin_actions
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access admin actions
DROP POLICY IF EXISTS "Service role can access admin actions" ON admin_actions;
CREATE POLICY "Service role can access admin actions" ON admin_actions
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'All financial transactions including deposits, withdrawals, manual transactions';
COMMENT ON TABLE admin_actions IS 'Audit trail for all admin actions including manual transactions';

-- Success message
SELECT 'Schema setup completed successfully!' as status;

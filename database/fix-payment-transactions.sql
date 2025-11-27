-- Fix payment_transactions table for wallet deposits
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_transactions') THEN
        RAISE NOTICE 'Creating payment_transactions table...';
        
        CREATE TABLE payment_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id),
            loan_id UUID,
            reference VARCHAR(255) UNIQUE NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(3) DEFAULT 'USD',
            payment_method VARCHAR(50),
            mobile_number VARCHAR(20),
            status VARCHAR(20) DEFAULT 'pending',
            description TEXT,
            poll_url TEXT,
            paynow_reference VARCHAR(255),
            paid_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
        CREATE INDEX idx_payment_transactions_reference ON payment_transactions(reference);
        CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
    ELSE
        RAISE NOTICE 'Table payment_transactions already exists';
    END IF;
END $$;

-- 2. Add missing columns if they don't exist
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS loan_id UUID,
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS poll_url TEXT,
ADD COLUMN IF NOT EXISTS paynow_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

-- 3. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_payment_transactions_loan_id ON payment_transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);

-- 4. Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;

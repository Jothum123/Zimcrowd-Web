-- Create wallet tables for payment system

-- 1. Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'deposit', 'withdrawal', 'investment', 'loan_payment', etc.
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    balance_before DECIMAL(10, 2),
    balance_after DECIMAL(10, 2),
    reference VARCHAR(255),
    description TEXT,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- 4. Add wallet_credited column to payment_transactions if missing
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS wallet_credited BOOLEAN DEFAULT false;

-- 5. Create wallet for your user (only if not exists)
INSERT INTO wallets (user_id, balance, currency)
SELECT '50a60ab6-d8bd-412a-a52c-f656d40b26e3', 0.00, 'USD'
WHERE NOT EXISTS (
    SELECT 1 FROM wallets WHERE user_id = '50a60ab6-d8bd-412a-a52c-f656d40b26e3'
);

-- 6. Verify tables
SELECT 'wallets' as table_name, COUNT(*) as row_count FROM wallets
UNION ALL
SELECT 'wallet_transactions', COUNT(*) FROM wallet_transactions
UNION ALL
SELECT 'payment_transactions', COUNT(*) FROM payment_transactions;

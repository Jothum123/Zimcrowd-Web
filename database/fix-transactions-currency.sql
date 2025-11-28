-- ============================================================================
-- FIX TRANSACTIONS TABLE - Support USD and ZWG currencies
-- ============================================================================

-- 1. Add currency column if it doesn't exist
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- 2. Create currency enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_type') THEN
        CREATE TYPE currency_type AS ENUM ('USD', 'ZWG');
        RAISE NOTICE '✅ Created currency_type enum';
    ELSE
        RAISE NOTICE 'ℹ️ currency_type enum already exists';
    END IF;
END $$;

-- 3. Update existing currency column to use the enum (if needed)
-- First, update any invalid values to USD
UPDATE transactions 
SET currency = 'USD' 
WHERE currency IS NULL OR currency NOT IN ('USD', 'ZWG');

-- 4. Add check constraint to ensure only USD or ZWG are allowed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_currency_check'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT transactions_currency_check 
        CHECK (currency IN ('USD', 'ZWG'));
        RAISE NOTICE '✅ Added currency check constraint';
    ELSE
        RAISE NOTICE 'ℹ️ Currency check constraint already exists';
    END IF;
END $$;

-- 5. Create index for faster currency-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_currency 
ON transactions(currency);

-- 6. Verify the fix
SELECT 
    'transactions' as table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name = 'currency';

-- 7. Check the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'transactions_currency_check';

SELECT '✅ Transactions table now supports USD and ZWG currencies!' as status;

-- Comprehensive diagnostic for payment_transactions table

-- 1. Check all columns
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
ORDER BY ordinal_position;

-- 2. Check if loan_id exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'payment_transactions' 
    AND column_name = 'loan_id'
) AS loan_id_exists;

-- 3. Try a test insert
DO $$
BEGIN
    INSERT INTO payment_transactions (
        reference,
        user_id,
        loan_id,
        amount,
        currency,
        payment_method,
        status,
        description
    ) VALUES (
        'TEST-DIAGNOSTIC-' || gen_random_uuid()::text,
        '50a60ab6-d8bd-412a-a52c-f656d40b26e3',
        NULL,
        100.00,
        'USD',
        'web',
        'pending',
        'Diagnostic test'
    );
    
    RAISE NOTICE 'Test insert successful!';
    
    -- Clean up test record
    DELETE FROM payment_transactions WHERE reference LIKE 'TEST-DIAGNOSTIC-%';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

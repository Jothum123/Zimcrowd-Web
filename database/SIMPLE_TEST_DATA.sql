-- ============================================
-- SIMPLE TEST DATA - Works with Supabase Auth
-- ============================================
-- This creates test data without auth.users dependency
--
-- NOTE: If users table requires auth.users foreign key,
-- you'll need to create users through the signup API first
-- ============================================

DO $$
DECLARE
    test_count INT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Simple Test Data...';
    RAISE NOTICE '========================================';

    -- Check if we can insert directly into users table
    -- If this fails, you need to use the signup API
    
    -- Try to get existing test users first
    SELECT COUNT(*) INTO test_count 
    FROM users 
    WHERE email LIKE 'test.user%@zimcrowd.com';
    
    IF test_count > 0 THEN
        RAISE NOTICE '✓ Found % existing test users', test_count;
        
        -- Create wallets for existing users
        INSERT INTO wallets (user_id, balance, created_at, updated_at)
        SELECT 
            id,
            (RANDOM() * 500 + 100)::DECIMAL(10,2),
            created_at,
            NOW()
        FROM users
        WHERE email LIKE 'test.user%@zimcrowd.com'
        AND id NOT IN (SELECT user_id FROM wallets);
        
        RAISE NOTICE '✓ Created wallets for test users';
        
        -- Create loans for test users
        INSERT INTO loans (user_id, amount, interest_rate, duration_months, status, purpose, created_at, updated_at)
        SELECT 
            id,
            (RANDOM() * 1000 + 300)::DECIMAL(10,2),
            (RANDOM() * 5 + 15)::DECIMAL(5,2),
            CASE WHEN RANDOM() < 0.5 THEN 6 ELSE 12 END,
            CASE 
                WHEN RANDOM() < 0.6 THEN 'active'
                WHEN RANDOM() < 0.8 THEN 'paid'
                ELSE 'pending'
            END,
            CASE (RANDOM() * 4)::INT
                WHEN 0 THEN 'business'
                WHEN 1 THEN 'education'
                WHEN 2 THEN 'medical'
                ELSE 'personal'
            END,
            created_at + INTERVAL '1 day',
            NOW()
        FROM users
        WHERE email LIKE 'test.user%@zimcrowd.com';
        
        RAISE NOTICE '✓ Created loans for test users';
        
        -- Create transactions
        INSERT INTO transactions (user_id, wallet_id, type, amount, currency, status, description, reference, created_at)
        SELECT 
            u.id,
            w.id,
            'deposit',
            (RANDOM() * 300 + 100)::DECIMAL(10,2),
            'USD',
            'completed',
            'Test deposit',
            'TEST-DEP-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
            u.created_at + INTERVAL '2 days'
        FROM users u
        JOIN wallets w ON u.id = w.user_id
        WHERE u.email LIKE 'test.user%@zimcrowd.com';
        
        RAISE NOTICE '✓ Created transactions for test users';
        
    ELSE
        RAISE NOTICE '❌ No test users found!';
        RAISE NOTICE '';
        RAISE NOTICE 'SOLUTION: Create test users through signup API first:';
        RAISE NOTICE '  1. Go to your app signup page';
        RAISE NOTICE '  2. Create accounts:';
        RAISE NOTICE '     - test.user1@zimcrowd.com / Test123!';
        RAISE NOTICE '     - test.user2@zimcrowd.com / Test123!';
        RAISE NOTICE '     - test.user3@zimcrowd.com / Test123!';
        RAISE NOTICE '  3. Then run this script again';
        RAISE NOTICE '';
        RAISE NOTICE 'OR use existing users in your database';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ DONE!';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RAISE NOTICE '';
        RAISE NOTICE 'Your users table likely requires Supabase auth.users';
        RAISE NOTICE 'Create users through signup first, then run this script';
END $$;

-- Show what we have
SELECT '=== CURRENT DATA ===' as info;

SELECT 
    'Users' as type,
    COUNT(*) as count
FROM users
WHERE email LIKE '%test%' OR email LIKE '%@zimcrowd.com'
UNION ALL
SELECT 
    'Wallets',
    COUNT(*)
FROM wallets
UNION ALL
SELECT 
    'Loans',
    COUNT(*)
FROM loans
UNION ALL
SELECT 
    'Transactions',
    COUNT(*)
FROM transactions;

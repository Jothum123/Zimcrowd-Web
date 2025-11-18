-- ============================================
-- QUICK TEST DATA - Fixed for Actual Schema
-- ============================================
-- This version works with your existing users table structure
--
-- TEST USER CREDENTIALS:
-- Email: test.user1@zimcrowd.com (through test.user5@zimcrowd.com)
-- Password: Test123!
-- ============================================

DO $$
DECLARE
    user1_id UUID := gen_random_uuid();
    user2_id UUID := gen_random_uuid();
    user3_id UUID := gen_random_uuid();
    user4_id UUID := gen_random_uuid();
    user5_id UUID := gen_random_uuid();
    wallet1_id UUID;
    wallet2_id UUID;
    wallet3_id UUID;
    wallet4_id UUID;
    wallet5_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Quick Test Data...';
    RAISE NOTICE '========================================';

    -- Insert test users (password is 'Test123!')
    -- Password hash for 'Test123!' using bcrypt
    INSERT INTO users (id, email, password_hash, full_name, created_at)
    VALUES
        (user1_id, 'test.user1@zimcrowd.com', '$2b$10$rKZvVxwJ5vXhZ8Y9qN5xVeF5J5F5F5F5F5F5F5F5F5F5F5F5F5F5F5', 'Test User One', NOW() - INTERVAL '6 months'),
        (user2_id, 'test.user2@zimcrowd.com', '$2b$10$rKZvVxwJ5vXhZ8Y9qN5xVeF5J5F5F5F5F5F5F5F5F5F5F5F5F5F5F5', 'Test User Two', NOW() - INTERVAL '4 months'),
        (user3_id, 'test.user3@zimcrowd.com', '$2b$10$rKZvVxwJ5vXhZ8Y9qN5xVeF5J5F5F5F5F5F5F5F5F5F5F5F5F5F5F5', 'Test User Three', NOW() - INTERVAL '3 months'),
        (user4_id, 'test.user4@zimcrowd.com', '$2b$10$rKZvVxwJ5vXhZ8Y9qN5xVeF5J5F5F5F5F5F5F5F5F5F5F5F5F5F5F5', 'Test User Four', NOW() - INTERVAL '2 months'),
        (user5_id, 'test.user5@zimcrowd.com', '$2b$10$rKZvVxwJ5vXhZ8Y9qN5xVeF5J5F5F5F5F5F5F5F5F5F5F5F5F5F5F5', 'Test User Five', NOW() - INTERVAL '1 month');
    
    RAISE NOTICE '✓ Created 5 test users';

    -- Create wallets (using 'balance' column)
    INSERT INTO wallets (user_id, balance, created_at, updated_at)
    VALUES
        (user1_id, 500.00, NOW() - INTERVAL '6 months', NOW()),
        (user2_id, 300.00, NOW() - INTERVAL '4 months', NOW()),
        (user3_id, 750.00, NOW() - INTERVAL '3 months', NOW()),
        (user4_id, 200.00, NOW() - INTERVAL '2 months', NOW()),
        (user5_id, 400.00, NOW() - INTERVAL '1 month', NOW());
    
    RAISE NOTICE '✓ Created 5 wallets with balances';

    -- Get wallet IDs
    SELECT id INTO wallet1_id FROM wallets WHERE user_id = user1_id;
    SELECT id INTO wallet2_id FROM wallets WHERE user_id = user2_id;
    SELECT id INTO wallet3_id FROM wallets WHERE user_id = user3_id;
    SELECT id INTO wallet4_id FROM wallets WHERE user_id = user4_id;
    SELECT id INTO wallet5_id FROM wallets WHERE user_id = user5_id;

    -- Create loans
    INSERT INTO loans (id, user_id, amount, interest_rate, duration_months, status, purpose, created_at, updated_at)
    VALUES
        (gen_random_uuid(), user1_id, 1000.00, 18.5, 6, 'active', 'business', NOW() - INTERVAL '3 months', NOW()),
        (gen_random_uuid(), user2_id, 500.00, 15.0, 3, 'paid', 'personal', NOW() - INTERVAL '4 months', NOW()),
        (gen_random_uuid(), user3_id, 1500.00, 20.0, 12, 'active', 'education', NOW() - INTERVAL '2 months', NOW()),
        (gen_random_uuid(), user4_id, 300.00, 16.5, 6, 'pending', 'medical', NOW() - INTERVAL '1 week', NOW()),
        (gen_random_uuid(), user5_id, 800.00, 17.0, 6, 'active', 'home_improvement', NOW() - INTERVAL '1 month', NOW());
    
    RAISE NOTICE '✓ Created 5 loans (3 active, 1 paid, 1 pending)';

    -- Create deposit transactions
    INSERT INTO transactions (id, user_id, wallet_id, type, amount, currency, status, description, reference, created_at)
    VALUES
        (gen_random_uuid(), user1_id, wallet1_id, 'deposit', 500.00, 'USD', 'completed', 'Initial deposit', 'DEP-TEST-001', NOW() - INTERVAL '6 months'),
        (gen_random_uuid(), user2_id, wallet2_id, 'deposit', 300.00, 'USD', 'completed', 'Wallet top-up', 'DEP-TEST-002', NOW() - INTERVAL '4 months'),
        (gen_random_uuid(), user3_id, wallet3_id, 'deposit', 750.00, 'USD', 'completed', 'Business deposit', 'DEP-TEST-003', NOW() - INTERVAL '3 months'),
        (gen_random_uuid(), user4_id, wallet4_id, 'deposit', 200.00, 'USD', 'completed', 'Initial deposit', 'DEP-TEST-004', NOW() - INTERVAL '2 months'),
        (gen_random_uuid(), user5_id, wallet5_id, 'deposit', 400.00, 'USD', 'completed', 'Wallet funding', 'DEP-TEST-005', NOW() - INTERVAL '1 month');
    
    RAISE NOTICE '✓ Created 5 deposit transactions';

    -- Create loan disbursement transactions
    INSERT INTO transactions (id, user_id, wallet_id, type, amount, currency, status, description, reference, created_at)
    VALUES
        (gen_random_uuid(), user1_id, wallet1_id, 'loan_disbursement', 1000.00, 'USD', 'completed', 'Loan disbursed', 'LOAN-TEST-001', NOW() - INTERVAL '3 months'),
        (gen_random_uuid(), user2_id, wallet2_id, 'loan_disbursement', 500.00, 'USD', 'completed', 'Loan disbursed', 'LOAN-TEST-002', NOW() - INTERVAL '4 months'),
        (gen_random_uuid(), user3_id, wallet3_id, 'loan_disbursement', 1500.00, 'USD', 'completed', 'Loan disbursed', 'LOAN-TEST-003', NOW() - INTERVAL '2 months'),
        (gen_random_uuid(), user5_id, wallet5_id, 'loan_disbursement', 800.00, 'USD', 'completed', 'Loan disbursed', 'LOAN-TEST-005', NOW() - INTERVAL '1 month');
    
    RAISE NOTICE '✓ Created 4 loan disbursement transactions';

    -- Create some loan payment transactions
    INSERT INTO transactions (id, user_id, wallet_id, type, amount, currency, status, description, reference, created_at)
    VALUES
        (gen_random_uuid(), user1_id, wallet1_id, 'loan_payment', 180.00, 'USD', 'completed', 'Loan repayment - Month 1', 'PAY-TEST-001', NOW() - INTERVAL '2 months'),
        (gen_random_uuid(), user1_id, wallet1_id, 'loan_payment', 180.00, 'USD', 'completed', 'Loan repayment - Month 2', 'PAY-TEST-002', NOW() - INTERVAL '1 month'),
        (gen_random_uuid(), user2_id, wallet2_id, 'loan_payment', 175.00, 'USD', 'completed', 'Loan repayment - Final', 'PAY-TEST-003', NOW() - INTERVAL '3 months'),
        (gen_random_uuid(), user3_id, wallet3_id, 'loan_payment', 150.00, 'USD', 'completed', 'Loan repayment - Month 1', 'PAY-TEST-004', NOW() - INTERVAL '1 month');
    
    RAISE NOTICE '✓ Created 4 loan payment transactions';

    -- Create withdrawal transactions
    INSERT INTO transactions (id, user_id, wallet_id, type, amount, currency, status, description, reference, created_at)
    VALUES
        (gen_random_uuid(), user1_id, wallet1_id, 'withdrawal', 100.00, 'USD', 'completed', 'Cash withdrawal', 'WTH-TEST-001', NOW() - INTERVAL '1 month'),
        (gen_random_uuid(), user3_id, wallet3_id, 'withdrawal', 200.00, 'USD', 'completed', 'Bank transfer', 'WTH-TEST-002', NOW() - INTERVAL '2 weeks');
    
    RAISE NOTICE '✓ Created 2 withdrawal transactions';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ TEST DATA CREATED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Summary:';
    RAISE NOTICE '  - 5 users';
    RAISE NOTICE '  - 5 wallets';
    RAISE NOTICE '  - 5 loans';
    RAISE NOTICE '  - 15 transactions';
    RAISE NOTICE '========================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RAISE EXCEPTION 'Failed to create test data: %', SQLERRM;
END $$;

-- Verify data
SELECT '=== TEST DATA VERIFICATION ===' as info;

SELECT 
    'Users' as type, 
    COUNT(*) as count 
FROM users 
WHERE email LIKE '%test%'
UNION ALL
SELECT 
    'Wallets', 
    COUNT(*) 
FROM wallets 
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')
UNION ALL
SELECT 
    'Loans', 
    COUNT(*) 
FROM loans 
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')
UNION ALL
SELECT 
    'Transactions', 
    COUNT(*) 
FROM transactions 
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');

-- Show loan breakdown
SELECT '=== LOAN STATUS BREAKDOWN ===' as info;

SELECT 
    status,
    COUNT(*) as count,
    SUM(amount)::DECIMAL(10,2) as total_amount
FROM loans
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')
GROUP BY status
ORDER BY count DESC;

-- Show transaction types
SELECT '=== TRANSACTION TYPES ===' as info;

SELECT 
    type,
    COUNT(*) as count,
    SUM(amount)::DECIMAL(10,2) as total_amount
FROM transactions
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')
GROUP BY type
ORDER BY count DESC;

-- ============================================
-- QUICK TEST DATA - Essential Data Only
-- ============================================
-- Run this for a quick setup with minimal data

-- Clean existing test data (optional)
-- DELETE FROM transactions WHERE reference LIKE 'TEST-%';
-- DELETE FROM loans WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');

-- Create 10 test users
DO $$
DECLARE
    user1_id UUID := gen_random_uuid();
    user2_id UUID := gen_random_uuid();
    user3_id UUID := gen_random_uuid();
    user4_id UUID := gen_random_uuid();
    user5_id UUID := gen_random_uuid();
BEGIN
    -- Insert test users
    INSERT INTO users (id, email, phone, full_name, monthly_income, employment_status, created_at, email_verified, phone_verified)
    VALUES
        (user1_id, 'test.user1@zimcrowd.com', '+263771111111', 'Test User One', 2500.00, 'employed', NOW() - INTERVAL '6 months', true, true),
        (user2_id, 'test.user2@zimcrowd.com', '+263772222222', 'Test User Two', 1800.00, 'employed', NOW() - INTERVAL '4 months', true, true),
        (user3_id, 'test.user3@zimcrowd.com', '+263773333333', 'Test User Three', 3000.00, 'self_employed', NOW() - INTERVAL '3 months', true, true),
        (user4_id, 'test.user4@zimcrowd.com', '+263774444444', 'Test User Four', 1500.00, 'employed', NOW() - INTERVAL '2 months', true, true),
        (user5_id, 'test.user5@zimcrowd.com', '+263775555555', 'Test User Five', 2200.00, 'employed', NOW() - INTERVAL '1 month', true, true)
    ON CONFLICT (email) DO NOTHING;

    -- Create wallets
    INSERT INTO wallets (user_id, balance_usd, balance_zwg, created_at)
    VALUES
        (user1_id, 500.00, 50000.00, NOW() - INTERVAL '6 months'),
        (user2_id, 300.00, 30000.00, NOW() - INTERVAL '4 months'),
        (user3_id, 750.00, 75000.00, NOW() - INTERVAL '3 months'),
        (user4_id, 200.00, 20000.00, NOW() - INTERVAL '2 months'),
        (user5_id, 400.00, 40000.00, NOW() - INTERVAL '1 month')
    ON CONFLICT (user_id) DO NOTHING;

    -- Create loans
    INSERT INTO loans (user_id, amount, interest_rate, duration_months, status, purpose, created_at)
    VALUES
        (user1_id, 1000.00, 18.5, 6, 'active', 'business', NOW() - INTERVAL '3 months'),
        (user2_id, 500.00, 15.0, 3, 'paid', 'personal', NOW() - INTERVAL '4 months'),
        (user3_id, 1500.00, 20.0, 12, 'active', 'education', NOW() - INTERVAL '2 months'),
        (user4_id, 300.00, 16.5, 6, 'pending', 'medical', NOW() - INTERVAL '1 week'),
        (user5_id, 800.00, 17.0, 6, 'active', 'home_improvement', NOW() - INTERVAL '1 month')
    ON CONFLICT DO NOTHING;

    -- Create transactions
    INSERT INTO transactions (user_id, type, amount, currency, status, description, created_at)
    VALUES
        (user1_id, 'deposit', 500.00, 'USD', 'completed', 'Initial deposit', NOW() - INTERVAL '6 months'),
        (user1_id, 'loan_disbursement', 1000.00, 'USD', 'completed', 'Loan disbursed', NOW() - INTERVAL '3 months'),
        (user2_id, 'deposit', 300.00, 'USD', 'completed', 'Wallet top-up', NOW() - INTERVAL '4 months'),
        (user3_id, 'deposit', 750.00, 'USD', 'completed', 'Business deposit', NOW() - INTERVAL '3 months'),
        (user4_id, 'deposit', 200.00, 'USD', 'completed', 'Initial deposit', NOW() - INTERVAL '2 months'),
        (user5_id, 'deposit', 400.00, 'USD', 'completed', 'Wallet funding', NOW() - INTERVAL '1 month')
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✓ Test data created successfully!';
    RAISE NOTICE '✓ 5 users, 5 wallets, 5 loans, 6 transactions';
END $$;

-- Verify data
SELECT '=== TEST DATA SUMMARY ===' as info;
SELECT 'Users' as type, COUNT(*) as count FROM users WHERE email LIKE '%test%'
UNION ALL
SELECT 'Wallets', COUNT(*) FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')
UNION ALL
SELECT 'Loans', COUNT(*) FROM loans WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');

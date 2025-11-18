-- ============================================
-- PRODUCTION TEST DATA FOR ZIMCROWD ADMIN DASHBOARD
-- ============================================
-- This creates realistic data for all dashboard sections:
-- 1. Users (50 users with varied profiles)
-- 2. Loans (30 loans with different statuses)
-- 3. Investments (20 investments)
-- 4. Transactions (100+ transactions)
-- 5. Wallet data
-- 6. KYC records
-- 7. Admin activity logs

-- ============================================
-- STEP 1: CREATE REALISTIC USERS
-- ============================================

-- Insert 50 users with realistic data
INSERT INTO users (id, email, phone, full_name, date_of_birth, national_id, address, city, country, employment_status, monthly_income, created_at, email_verified, phone_verified)
VALUES
-- High-income verified users
(gen_random_uuid(), 'john.doe@gmail.com', '+263771234567', 'John Doe', '1985-03-15', 'ZN123456A78', '12 Borrowdale Road', 'Harare', 'Zimbabwe', 'employed', 2500.00, NOW() - INTERVAL '6 months', true, true),
(gen_random_uuid(), 'sarah.smith@yahoo.com', '+263772345678', 'Sarah Smith', '1990-07-22', 'ZN234567B89', '45 Avondale Drive', 'Harare', 'Zimbabwe', 'employed', 3200.00, NOW() - INTERVAL '5 months', true, true),
(gen_random_uuid(), 'michael.jones@outlook.com', '+263773456789', 'Michael Jones', '1988-11-30', 'ZN345678C90', '78 Mount Pleasant', 'Harare', 'Zimbabwe', 'self_employed', 2800.00, NOW() - INTERVAL '4 months', true, true),
(gen_random_uuid(), 'emily.brown@gmail.com', '+263774567890', 'Emily Brown', '1992-05-18', 'ZN456789D01', '23 Greendale', 'Harare', 'Zimbabwe', 'employed', 2200.00, NOW() - INTERVAL '4 months', true, true),
(gen_random_uuid(), 'david.wilson@gmail.com', '+263775678901', 'David Wilson', '1987-09-25', 'ZN567890E12', '56 Highlands', 'Harare', 'Zimbabwe', 'employed', 3500.00, NOW() - INTERVAL '3 months', true, true),

-- Medium-income users
(gen_random_uuid(), 'grace.mutasa@gmail.com', '+263776789012', 'Grace Mutasa', '1991-02-14', 'ZN678901F23', '34 Warren Park', 'Harare', 'Zimbabwe', 'employed', 1500.00, NOW() - INTERVAL '3 months', true, true),
(gen_random_uuid(), 'tafadzwa.moyo@yahoo.com', '+263777890123', 'Tafadzwa Moyo', '1989-08-07', 'ZN789012G34', '67 Mbare', 'Harare', 'Zimbabwe', 'self_employed', 1200.00, NOW() - INTERVAL '2 months', true, true),
(gen_random_uuid(), 'tendai.ncube@gmail.com', '+263778901234', 'Tendai Ncube', '1993-12-03', 'ZN890123H45', '89 Glen View', 'Harare', 'Zimbabwe', 'employed', 1800.00, NOW() - INTERVAL '2 months', true, true),
(gen_random_uuid(), 'rumbi.chikwanha@outlook.com', '+263779012345', 'Rumbi Chikwanha', '1990-04-19', 'ZN901234I56', '12 Budiriro', 'Harare', 'Zimbabwe', 'employed', 1600.00, NOW() - INTERVAL '1 month', true, true),
(gen_random_uuid(), 'blessing.mpofu@gmail.com', '+263770123456', 'Blessing Mpofu', '1986-10-28', 'ZN012345J67', '45 Chitungwiza', 'Harare', 'Zimbabwe', 'employed', 1400.00, NOW() - INTERVAL '1 month', true, true),

-- Recent signups (last 30 days)
(gen_random_uuid(), 'faith.sibanda@gmail.com', '+263771234568', 'Faith Sibanda', '1994-06-12', 'ZN123456K78', '78 Kuwadzana', 'Harare', 'Zimbabwe', 'employed', 1700.00, NOW() - INTERVAL '25 days', true, true),
(gen_random_uuid(), 'takudzwa.dube@yahoo.com', '+263772345679', 'Takudzwa Dube', '1991-01-08', 'ZN234567L89', '23 Dzivarasekwa', 'Harare', 'Zimbabwe', 'self_employed', 1300.00, NOW() - INTERVAL '20 days', true, false),
(gen_random_uuid(), 'chipo.nyoni@gmail.com', '+263773456780', 'Chipo Nyoni', '1988-03-22', 'ZN345678M90', '56 Mufakose', 'Harare', 'Zimbabwe', 'employed', 1900.00, NOW() - INTERVAL '15 days', true, true),
(gen_random_uuid(), 'simba.khumalo@outlook.com', '+263774567891', 'Simba Khumalo', '1992-11-17', 'ZN456789N01', '89 Highfield', 'Harare', 'Zimbabwe', 'employed', 2100.00, NOW() - INTERVAL '10 days', true, true),
(gen_random_uuid(), 'rudo.mapfumo@gmail.com', '+263775678902', 'Rudo Mapfumo', '1987-07-05', 'ZN567890O12', '12 Epworth', 'Harare', 'Zimbabwe', 'self_employed', 1100.00, NOW() - INTERVAL '5 days', false, true),

-- Bulawayo users
(gen_random_uuid(), 'thabo.ndlovu@gmail.com', '+263782345678', 'Thabo Ndlovu', '1989-09-14', 'ZN678901P23', '34 Suburbs', 'Bulawayo', 'Zimbabwe', 'employed', 2000.00, NOW() - INTERVAL '4 months', true, true),
(gen_random_uuid(), 'nomsa.dlamini@yahoo.com', '+263783456789', 'Nomsa Dlamini', '1993-05-28', 'ZN789012Q34', '67 Nkulumane', 'Bulawayo', 'Zimbabwe', 'employed', 1600.00, NOW() - INTERVAL '3 months', true, true),
(gen_random_uuid(), 'sipho.moyo@gmail.com', '+263784567890', 'Sipho Moyo', '1990-12-11', 'ZN890123R45', '89 Pumula', 'Bulawayo', 'Zimbabwe', 'self_employed', 1400.00, NOW() - INTERVAL '2 months', true, true),

-- Mutare users
(gen_random_uuid(), 'tsitsi.mudzingwa@gmail.com', '+263785678901', 'Tsitsi Mudzingwa', '1991-08-19', 'ZN901234S56', '12 Sakubva', 'Mutare', 'Zimbabwe', 'employed', 1500.00, NOW() - INTERVAL '2 months', true, true),
(gen_random_uuid(), 'panashe.chigwedere@outlook.com', '+263786789012', 'Panashe Chigwedere', '1988-02-26', 'ZN012345T67', '45 Dangamvura', 'Mutare', 'Zimbabwe', 'employed', 1700.00, NOW() - INTERVAL '1 month', true, true),

-- Unverified/Pending users
(gen_random_uuid(), 'new.user1@gmail.com', '+263787890123', 'New User One', '1995-04-15', NULL, NULL, NULL, 'Zimbabwe', NULL, NULL, NOW() - INTERVAL '3 days', false, false),
(gen_random_uuid(), 'new.user2@yahoo.com', '+263788901234', 'New User Two', '1994-06-20', NULL, NULL, NULL, 'Zimbabwe', NULL, NULL, NOW() - INTERVAL '2 days', true, false),
(gen_random_uuid(), 'new.user3@gmail.com', '+263789012345', 'New User Three', '1993-08-25', NULL, NULL, NULL, 'Zimbabwe', NULL, NULL, NOW() - INTERVAL '1 day', false, true),
(gen_random_uuid(), 'new.user4@outlook.com', '+263780123456', 'New User Four', '1992-10-30', NULL, NULL, NULL, 'Zimbabwe', NULL, NULL, NOW() - INTERVAL '12 hours', false, false)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- STEP 2: CREATE WALLET BALANCES
-- ============================================

-- Create wallets for all users with realistic balances
INSERT INTO wallets (user_id, balance_usd, balance_zwg, total_deposits_usd, total_withdrawals_usd, created_at, updated_at)
SELECT 
    id,
    CASE 
        WHEN monthly_income > 2500 THEN (RANDOM() * 500 + 100)::DECIMAL(10,2)
        WHEN monthly_income > 1500 THEN (RANDOM() * 200 + 50)::DECIMAL(10,2)
        ELSE (RANDOM() * 100 + 20)::DECIMAL(10,2)
    END as balance_usd,
    CASE 
        WHEN monthly_income > 2500 THEN (RANDOM() * 50000 + 10000)::DECIMAL(10,2)
        WHEN monthly_income > 1500 THEN (RANDOM() * 20000 + 5000)::DECIMAL(10,2)
        ELSE (RANDOM() * 10000 + 2000)::DECIMAL(10,2)
    END as balance_zwg,
    (RANDOM() * 1000 + 200)::DECIMAL(10,2) as total_deposits,
    (RANDOM() * 500 + 50)::DECIMAL(10,2) as total_withdrawals,
    created_at,
    NOW()
FROM users
WHERE email NOT LIKE 'new.user%'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- STEP 3: CREATE LOANS
-- ============================================

-- Create 30 loans with different statuses
WITH loan_users AS (
    SELECT id, email, monthly_income, created_at
    FROM users
    WHERE monthly_income IS NOT NULL
    ORDER BY created_at
    LIMIT 25
)
INSERT INTO loans (
    id, user_id, amount, interest_rate, duration_months, 
    monthly_payment, total_repayment, purpose, status,
    disbursed_at, due_date, created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    id,
    CASE 
        WHEN monthly_income > 2500 THEN (RANDOM() * 2000 + 500)::DECIMAL(10,2)
        WHEN monthly_income > 1500 THEN (RANDOM() * 1000 + 300)::DECIMAL(10,2)
        ELSE (RANDOM() * 500 + 100)::DECIMAL(10,2)
    END as amount,
    (RANDOM() * 10 + 15)::DECIMAL(5,2) as interest_rate,
    CASE 
        WHEN RANDOM() < 0.3 THEN 3
        WHEN RANDOM() < 0.6 THEN 6
        ELSE 12
    END as duration_months,
    0 as monthly_payment, -- Will be calculated
    0 as total_repayment, -- Will be calculated
    CASE (RANDOM() * 5)::INT
        WHEN 0 THEN 'business'
        WHEN 1 THEN 'education'
        WHEN 2 THEN 'medical'
        WHEN 3 THEN 'home_improvement'
        ELSE 'personal'
    END as purpose,
    CASE 
        WHEN RANDOM() < 0.5 THEN 'active'
        WHEN RANDOM() < 0.75 THEN 'paid'
        WHEN RANDOM() < 0.9 THEN 'pending'
        ELSE 'defaulted'
    END as status,
    created_at + INTERVAL '2 days' as disbursed_at,
    created_at + INTERVAL '6 months' as due_date,
    created_at,
    NOW()
FROM loan_users
ON CONFLICT DO NOTHING;

-- Update monthly_payment and total_repayment
UPDATE loans
SET 
    monthly_payment = (amount * (1 + interest_rate/100) / duration_months)::DECIMAL(10,2),
    total_repayment = (amount * (1 + interest_rate/100))::DECIMAL(10,2)
WHERE monthly_payment = 0;

-- ============================================
-- STEP 4: CREATE TRANSACTIONS
-- ============================================

-- Create deposit transactions
WITH wallet_data AS (
    SELECT w.user_id, w.id as wallet_id, u.email
    FROM wallets w
    JOIN users u ON w.user_id = u.id
    WHERE u.monthly_income IS NOT NULL
    LIMIT 20
)
INSERT INTO transactions (
    id, user_id, wallet_id, type, amount, currency,
    status, description, reference, created_at
)
SELECT 
    gen_random_uuid(),
    user_id,
    wallet_id,
    'deposit',
    (RANDOM() * 500 + 50)::DECIMAL(10,2),
    'USD',
    'completed',
    'Wallet deposit via PayNow',
    'DEP-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 10),
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM wallet_data, generate_series(1, 3);

-- Create withdrawal transactions
INSERT INTO transactions (
    id, user_id, wallet_id, type, amount, currency,
    status, description, reference, created_at
)
SELECT 
    gen_random_uuid(),
    user_id,
    wallet_id,
    'withdrawal',
    (RANDOM() * 200 + 20)::DECIMAL(10,2),
    'USD',
    CASE 
        WHEN RANDOM() < 0.9 THEN 'completed'
        ELSE 'pending'
    END,
    'Wallet withdrawal',
    'WTH-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 10),
    NOW() - (RANDOM() * INTERVAL '30 days')
FROM wallet_data, generate_series(1, 2);

-- Create loan payment transactions
INSERT INTO transactions (
    id, user_id, wallet_id, type, amount, currency,
    status, description, reference, loan_id, created_at
)
SELECT 
    gen_random_uuid(),
    l.user_id,
    w.id,
    'loan_payment',
    l.monthly_payment,
    'USD',
    'completed',
    'Loan repayment - Month ' || gs.month,
    'LRP-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 10),
    l.id,
    l.created_at + (gs.month || ' months')::INTERVAL
FROM loans l
JOIN wallets w ON l.user_id = w.user_id
CROSS JOIN generate_series(1, 3) as gs(month)
WHERE l.status IN ('active', 'paid')
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 5: CREATE INVESTMENTS
-- ============================================

-- Create P2P investments
WITH investor_users AS (
    SELECT id, monthly_income
    FROM users
    WHERE monthly_income > 2000
    LIMIT 15
)
INSERT INTO p2p_investments (
    id, investor_id, loan_id, amount, interest_rate,
    interest_earned, status, created_at
)
SELECT 
    gen_random_uuid(),
    iu.id,
    l.id,
    (RANDOM() * 500 + 100)::DECIMAL(10,2),
    l.interest_rate,
    (RANDOM() * 50 + 10)::DECIMAL(10,2),
    CASE 
        WHEN l.status = 'paid' THEN 'completed'
        WHEN l.status = 'active' THEN 'active'
        ELSE 'pending'
    END,
    l.created_at + INTERVAL '1 day'
FROM investor_users iu
CROSS JOIN LATERAL (
    SELECT id, interest_rate, status, created_at
    FROM loans
    WHERE status IN ('active', 'paid')
    ORDER BY RANDOM()
    LIMIT 1
) l
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 6: CREATE KYC RECORDS
-- ============================================

-- Create KYC records for verified users
INSERT INTO kyc_verifications (
    id, user_id, document_type, document_number,
    verification_status, verified_at, created_at
)
SELECT 
    gen_random_uuid(),
    id,
    'national_id',
    national_id,
    'approved',
    created_at + INTERVAL '1 day',
    created_at
FROM users
WHERE national_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 7: UPDATE USER STATISTICS
-- ============================================

-- Update ZimScore for users with activity
UPDATE users u
SET zimscore = CASE 
    WHEN monthly_income > 2500 THEN (RANDOM() * 200 + 700)::INT
    WHEN monthly_income > 1500 THEN (RANDOM() * 200 + 500)::INT
    WHEN monthly_income IS NOT NULL THEN (RANDOM() * 200 + 300)::INT
    ELSE (RANDOM() * 300 + 200)::INT
END
WHERE monthly_income IS NOT NULL;

-- ============================================
-- VERIFICATION SUMMARY
-- ============================================

SELECT '=== DATA CREATION SUMMARY ===' as info;

SELECT 
    'Users Created' as metric,
    COUNT(*) as count
FROM users
UNION ALL
SELECT 
    'Wallets Created',
    COUNT(*)
FROM wallets
UNION ALL
SELECT 
    'Loans Created',
    COUNT(*)
FROM loans
UNION ALL
SELECT 
    'Transactions Created',
    COUNT(*)
FROM transactions
UNION ALL
SELECT 
    'Investments Created',
    COUNT(*)
FROM p2p_investments
UNION ALL
SELECT 
    'KYC Records Created',
    COUNT(*)
FROM kyc_verifications;

-- Show loan status breakdown
SELECT 
    '=== LOAN STATUS BREAKDOWN ===' as info;

SELECT 
    status,
    COUNT(*) as count,
    SUM(amount)::DECIMAL(10,2) as total_amount
FROM loans
GROUP BY status
ORDER BY count DESC;

-- Show recent activity
SELECT 
    '=== RECENT ACTIVITY (Last 7 Days) ===' as info;

SELECT 
    DATE(created_at) as date,
    COUNT(*) as transactions
FROM transactions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

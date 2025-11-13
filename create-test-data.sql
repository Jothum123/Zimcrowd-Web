-- Create test user directly in database
-- Run this in Supabase SQL Editor

-- Insert test profile with valid UUID
INSERT INTO profiles (
    id,
    first_name,
    last_name,
    email,
    phone,
    onboarding_completed,
    profile_completed,
    created_at,
    updated_at
) VALUES (
    '54065cea-3d22-4345-b237-641b1e9e2043',
    'Test',
    'User',
    'test-dashboard@example.com',
    '+263771234567',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    onboarding_completed = EXCLUDED.onboarding_completed,
    profile_completed = EXCLUDED.profile_completed,
    updated_at = NOW();

-- Insert some sample wallet transactions
INSERT INTO transactions (
    user_id,
    type,
    amount,
    description,
    balance_after,
    created_at
) VALUES
    ('54065cea-3d22-4345-b237-641b1e9e2043', 'deposit', 1000.00, 'Initial deposit', 1000.00, NOW()),
    ('54065cea-3d22-4345-b237-641b1e9e2043', 'deposit', 500.00, 'Additional funds', 1500.00, NOW() - INTERVAL '1 day')
ON CONFLICT (user_id, description, created_at) DO NOTHING;

-- Insert sample loan
INSERT INTO loans (
    user_id,
    loan_type,
    amount,
    interest_rate,
    duration_months,
    status,
    purpose,
    monthly_payment,
    total_payment,
    created_at,
    updated_at
) VALUES (
    '54065cea-3d22-4345-b237-641b1e9e2043',
    'personal',
    5000.00,
    12.5,
    12,
    'active',
    'Testing loan',
    450.00,
    5400.00,
    NOW(),
    NOW()
) ON CONFLICT (user_id, loan_type, amount) DO NOTHING;

-- Insert sample investment
INSERT INTO investments (
    user_id,
    investment_type,
    amount,
    expected_return,
    risk_level,
    status,
    description,
    created_at,
    updated_at
) VALUES (
    '54065cea-3d22-4345-b237-641b1e9e2043',
    'stocks',
    2000.00,
    8.5,
    'medium',
    'active',
    'Test investment portfolio',
    NOW(),
    NOW()
) ON CONFLICT (user_id, investment_type, amount) DO NOTHING;

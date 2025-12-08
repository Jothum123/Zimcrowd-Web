-- =====================================================
-- SEED DATA FOR PRIMARY MARKET AND INVESTMENTS
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- NOTE: Run loan-applications-schema.sql FIRST
-- This file depends on tables created in that schema
-- =====================================================

-- First, let's create some test borrower profiles if they don't exist
-- These will be linked to the loans

-- Insert test users for borrowers (if not exists)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    email,
    crypt('TestPassword123!', gen_salt('bf')),
    NOW(),
    NOW() - (random() * interval '365 days'),
    NOW()
FROM (VALUES 
    ('sarah.moyo@example.com'),
    ('tendai.ndlovu@example.com'),
    ('grace.chikwanha@example.com'),
    ('peter.mlambo@example.com'),
    ('nyasha.chirwa@example.com'),
    ('tatenda.mugabe@example.com'),
    ('rumbidzai.ncube@example.com'),
    ('farai.dube@example.com'),
    ('chipo.mutasa@example.com'),
    ('blessing.moyo@example.com'),
    ('tapiwa.zhou@example.com'),
    ('rudo.mapfumo@example.com')
) AS t(email)
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE auth.users.email = t.email)
ON CONFLICT DO NOTHING;

-- Add employment_type column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50) DEFAULT 'private';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS post_registration_completed BOOLEAN DEFAULT false;

-- Create profiles for borrowers with employment_type
INSERT INTO profiles (id, email, full_name, phone_number, occupation, location, zim_score, verified, employment_type, post_registration_completed, created_at)
SELECT 
    u.id,
    u.email,
    CASE u.email
        WHEN 'sarah.moyo@example.com' THEN 'Sarah Moyo'
        WHEN 'tendai.ndlovu@example.com' THEN 'Tendai Ndlovu'
        WHEN 'grace.chikwanha@example.com' THEN 'Grace Chikwanha'
        WHEN 'peter.mlambo@example.com' THEN 'Peter Mlambo'
        WHEN 'nyasha.chirwa@example.com' THEN 'Nyasha Chirwa'
        WHEN 'tatenda.mugabe@example.com' THEN 'Tatenda Mugabe'
        WHEN 'rumbidzai.ncube@example.com' THEN 'Rumbidzai Ncube'
        WHEN 'farai.dube@example.com' THEN 'Farai Dube'
        WHEN 'chipo.mutasa@example.com' THEN 'Chipo Mutasa'
        WHEN 'blessing.moyo@example.com' THEN 'Blessing Moyo'
        WHEN 'tapiwa.zhou@example.com' THEN 'Tapiwa Zhou'
        WHEN 'rudo.mapfumo@example.com' THEN 'Rudo Mapfumo'
        ELSE 'Unknown User'
    END,
    '+263' || (770000000 + floor(random() * 9999999)::int)::text,
    CASE u.email
        WHEN 'sarah.moyo@example.com' THEN 'Small Business Owner'
        WHEN 'tendai.ndlovu@example.com' THEN 'IT Professional'
        WHEN 'grace.chikwanha@example.com' THEN 'Teacher'
        WHEN 'peter.mlambo@example.com' THEN 'Farmer'
        WHEN 'nyasha.chirwa@example.com' THEN 'Nurse'
        WHEN 'tatenda.mugabe@example.com' THEN 'Software Developer'
        WHEN 'rumbidzai.ncube@example.com' THEN 'Accountant'
        WHEN 'farai.dube@example.com' THEN 'Mechanic'
        WHEN 'chipo.mutasa@example.com' THEN 'Market Vendor'
        WHEN 'blessing.moyo@example.com' THEN 'Student'
        WHEN 'tapiwa.zhou@example.com' THEN 'Entrepreneur'
        WHEN 'rudo.mapfumo@example.com' THEN 'Healthcare Worker'
        ELSE 'Other'
    END,
    CASE u.email
        WHEN 'sarah.moyo@example.com' THEN 'Harare'
        WHEN 'tendai.ndlovu@example.com' THEN 'Bulawayo'
        WHEN 'grace.chikwanha@example.com' THEN 'Mutare'
        WHEN 'peter.mlambo@example.com' THEN 'Masvingo'
        WHEN 'nyasha.chirwa@example.com' THEN 'Gweru'
        WHEN 'tatenda.mugabe@example.com' THEN 'Harare'
        WHEN 'rumbidzai.ncube@example.com' THEN 'Harare'
        WHEN 'farai.dube@example.com' THEN 'Chitungwiza'
        WHEN 'chipo.mutasa@example.com' THEN 'Harare'
        WHEN 'blessing.moyo@example.com' THEN 'Harare'
        WHEN 'tapiwa.zhou@example.com' THEN 'Victoria Falls'
        WHEN 'rudo.mapfumo@example.com' THEN 'Kwekwe'
        ELSE 'Unknown'
    END,
    CASE u.email
        WHEN 'sarah.moyo@example.com' THEN 82
        WHEN 'tendai.ndlovu@example.com' THEN 75
        WHEN 'grace.chikwanha@example.com' THEN 84
        WHEN 'peter.mlambo@example.com' THEN 65
        WHEN 'nyasha.chirwa@example.com' THEN 85
        WHEN 'tatenda.mugabe@example.com' THEN 78
        WHEN 'rumbidzai.ncube@example.com' THEN 72
        WHEN 'farai.dube@example.com' THEN 55
        WHEN 'chipo.mutasa@example.com' THEN 45
        WHEN 'blessing.moyo@example.com' THEN 38
        WHEN 'tapiwa.zhou@example.com' THEN 80
        WHEN 'rudo.mapfumo@example.com' THEN 76
        ELSE 50
    END,
    CASE u.email
        WHEN 'farai.dube@example.com' THEN false
        WHEN 'chipo.mutasa@example.com' THEN false
        WHEN 'blessing.moyo@example.com' THEN false
        ELSE true
    END,
    -- Employment type based on occupation
    CASE u.email
        WHEN 'grace.chikwanha@example.com' THEN 'civil_servant'  -- Teacher
        WHEN 'nyasha.chirwa@example.com' THEN 'civil_servant'    -- Nurse
        WHEN 'rudo.mapfumo@example.com' THEN 'civil_servant'     -- Healthcare Worker
        WHEN 'tendai.ndlovu@example.com' THEN 'private'          -- IT Professional
        WHEN 'tatenda.mugabe@example.com' THEN 'private'         -- Software Developer
        WHEN 'rumbidzai.ncube@example.com' THEN 'private'        -- Accountant
        WHEN 'sarah.moyo@example.com' THEN 'self_employed'       -- Small Business Owner
        WHEN 'tapiwa.zhou@example.com' THEN 'self_employed'      -- Entrepreneur
        WHEN 'peter.mlambo@example.com' THEN 'informal'          -- Farmer
        WHEN 'farai.dube@example.com' THEN 'informal'            -- Mechanic
        WHEN 'chipo.mutasa@example.com' THEN 'informal'          -- Market Vendor
        WHEN 'blessing.moyo@example.com' THEN 'unemployed'       -- Student
        ELSE 'private'
    END,
    -- Post registration completed (verified users)
    CASE u.email
        WHEN 'farai.dube@example.com' THEN false
        WHEN 'chipo.mutasa@example.com' THEN false
        WHEN 'blessing.moyo@example.com' THEN false
        ELSE true
    END,
    NOW() - (random() * interval '365 days')
FROM auth.users u
WHERE u.email LIKE '%@example.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    occupation = EXCLUDED.occupation,
    location = EXCLUDED.location,
    zim_score = EXCLUDED.zim_score,
    verified = EXCLUDED.verified,
    employment_type = EXCLUDED.employment_type,
    post_registration_completed = EXCLUDED.post_registration_completed;

-- =====================================================
-- PRIMARY MARKET LOANS (Available for Investment)
-- =====================================================

-- Create primary market loans table if not exists
CREATE TABLE IF NOT EXISTS primary_market_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID REFERENCES auth.users(id),
    title VARCHAR(255) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    purpose_description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    funded_amount DECIMAL(12,2) DEFAULT 0,
    funding_progress DECIMAL(5,2) DEFAULT 0,
    lenders_count INTEGER DEFAULT 0,
    min_investment DECIMAL(10,2) DEFAULT 25,
    status VARCHAR(20) DEFAULT 'funding', -- funding, funded, active, completed, defaulted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    funding_deadline TIMESTAMP WITH TIME ZONE,
    funded_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (status IN ('funding', 'funded', 'active', 'completed', 'defaulted', 'cancelled'))
);

-- Create investments table if not exists
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID REFERENCES auth.users(id) NOT NULL,
    loan_id UUID REFERENCES primary_market_loans(id),
    borrower_id UUID REFERENCES auth.users(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    ownership_percent DECIMAL(5,2),
    interest_rate DECIMAL(5,2),
    expected_return DECIMAL(12,2),
    actual_return DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, defaulted, sold
    invested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    maturity_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    payments_received INTEGER DEFAULT 0,
    total_payments INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Primary Market Loans
INSERT INTO primary_market_loans (
    borrower_id, title, purpose, purpose_description, amount, currency, 
    interest_rate, term_months, risk_level, funded_amount, funding_progress, 
    lenders_count, min_investment, status, funding_deadline
)
SELECT 
    p.id,
    loan.title,
    loan.purpose,
    loan.description,
    loan.amount,
    loan.currency,
    loan.interest_rate,
    loan.term_months,
    loan.risk_level,
    loan.funded_amount,
    loan.funding_progress,
    loan.lenders_count,
    loan.min_investment,
    loan.status,
    NOW() + interval '30 days'
FROM profiles p
CROSS JOIN (VALUES
    -- USD Loans
    ('sarah.moyo@example.com', 'Business Expansion Loan', 'Business', 'Expanding my retail shop with new inventory and equipment', 800.00, 'USD', 12.5, 12, 'Low', 520.00, 65.0, 8, 25.00, 'funding'),
    ('tendai.ndlovu@example.com', 'Tech Equipment Purchase', 'Business', 'Purchasing new computers and software for freelance work', 1200.00, 'USD', 10.0, 18, 'Low', 840.00, 70.0, 12, 50.00, 'funding'),
    ('grace.chikwanha@example.com', 'Education Funding', 'Education', 'Masters degree tuition fees for career advancement', 2500.00, 'USD', 8.5, 24, 'Very Low', 2000.00, 80.0, 25, 25.00, 'funding'),
    ('peter.mlambo@example.com', 'Agricultural Investment', 'Agriculture', 'Seeds, fertilizers and irrigation equipment for farming season', 1500.00, 'USD', 15.0, 12, 'Medium', 450.00, 30.0, 6, 25.00, 'funding'),
    ('nyasha.chirwa@example.com', 'Medical Equipment', 'Medical', 'Purchasing medical supplies for private practice', 3000.00, 'USD', 9.0, 24, 'Very Low', 2700.00, 90.0, 35, 50.00, 'funding'),
    ('tatenda.mugabe@example.com', 'Startup Capital', 'Business', 'Initial capital for tech startup development', 5000.00, 'USD', 11.0, 36, 'Low', 1500.00, 30.0, 15, 100.00, 'funding'),
    -- ZWG Loans
    ('rumbidzai.ncube@example.com', 'Home Improvement', 'Home', 'Renovating kitchen and bathroom facilities', 15000.00, 'ZWG', 18.0, 12, 'Low', 9000.00, 60.0, 10, 500.00, 'funding'),
    ('farai.dube@example.com', 'Workshop Equipment', 'Business', 'New tools and equipment for auto repair workshop', 25000.00, 'ZWG', 22.0, 18, 'High', 5000.00, 20.0, 4, 1000.00, 'funding'),
    ('tapiwa.zhou@example.com', 'Tourism Business', 'Business', 'Tour guide equipment and marketing for Victoria Falls tours', 35000.00, 'ZWG', 16.0, 24, 'Low', 28000.00, 80.0, 18, 1000.00, 'funding'),
    ('rudo.mapfumo@example.com', 'Emergency Medical', 'Medical', 'Urgent medical treatment and recovery expenses', 8000.00, 'ZWG', 20.0, 6, 'Medium', 6400.00, 80.0, 12, 500.00, 'funding'),
    -- More USD Loans
    ('sarah.moyo@example.com', 'Inventory Restocking', 'Business', 'Restocking popular items for holiday season', 600.00, 'USD', 14.0, 6, 'Low', 300.00, 50.0, 5, 25.00, 'funding'),
    ('grace.chikwanha@example.com', 'School Supplies', 'Education', 'Educational materials and teaching resources', 400.00, 'USD', 10.0, 6, 'Very Low', 360.00, 90.0, 8, 25.00, 'funding')
) AS loan(email, title, purpose, description, amount, currency, interest_rate, term_months, risk_level, funded_amount, funding_progress, lenders_count, min_investment, status)
WHERE p.email = loan.email
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE INVESTMENTS (For logged-in user's portfolio)
-- =====================================================

-- Note: These investments will be created for the currently logged-in user
-- You'll need to replace 'YOUR_USER_ID' with the actual user ID

-- Create a function to seed investments for a specific user
CREATE OR REPLACE FUNCTION seed_user_investments(user_id UUID)
RETURNS void AS $$
DECLARE
    loan_record RECORD;
    investment_amount DECIMAL;
    ownership DECIMAL;
BEGIN
    -- Get some loans to invest in
    FOR loan_record IN 
        SELECT * FROM primary_market_loans 
        WHERE status IN ('funding', 'active') 
        LIMIT 6
    LOOP
        -- Random investment amount between $50 and $500
        investment_amount := 50 + (random() * 450);
        ownership := (investment_amount / loan_record.amount) * 100;
        
        INSERT INTO investments (
            investor_id, loan_id, borrower_id, amount, currency,
            ownership_percent, interest_rate, expected_return,
            actual_return, status, maturity_date, next_payment_date,
            payments_received, total_payments
        ) VALUES (
            user_id,
            loan_record.id,
            loan_record.borrower_id,
            investment_amount,
            loan_record.currency,
            ownership,
            loan_record.interest_rate,
            investment_amount * (loan_record.interest_rate / 100) * (loan_record.term_months / 12.0),
            investment_amount * (loan_record.interest_rate / 100) * (loan_record.term_months / 12.0) * random() * 0.5,
            CASE WHEN random() > 0.2 THEN 'active' ELSE 'completed' END,
            NOW() + (loan_record.term_months || ' months')::interval,
            NOW() + interval '30 days',
            floor(random() * loan_record.term_months / 2)::int,
            loan_record.term_months
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_primary_market_loans_status ON primary_market_loans(status);
CREATE INDEX IF NOT EXISTS idx_primary_market_loans_currency ON primary_market_loans(currency);
CREATE INDEX IF NOT EXISTS idx_primary_market_loans_borrower ON primary_market_loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_investments_investor ON investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_loan ON investments(loan_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE primary_market_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Primary market loans are publicly viewable
CREATE POLICY "Primary market loans are viewable by everyone" 
ON primary_market_loans FOR SELECT 
USING (true);

-- Only authenticated users can invest
CREATE POLICY "Authenticated users can create investments" 
ON investments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = investor_id);

-- Users can view their own investments
CREATE POLICY "Users can view own investments" 
ON investments FOR SELECT 
TO authenticated 
USING (auth.uid() = investor_id);

-- Users can update their own investments
CREATE POLICY "Users can update own investments" 
ON investments FOR UPDATE 
TO authenticated 
USING (auth.uid() = investor_id);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Run this to verify the data was inserted:
-- SELECT COUNT(*) as loan_count FROM primary_market_loans;
-- SELECT * FROM primary_market_loans ORDER BY created_at DESC LIMIT 5;

-- =====================================================
-- LOAN APPLICATIONS SCHEMA
-- New loan application flow:
-- 1. User submits loan → Goes to Admin for review
-- 2. Admin approves → Posted to Primary Market
-- 3. Admin rejects → Shown in My Loans with rejection reason
-- =====================================================

-- =====================================================
-- DROP EXISTING POLICIES (to avoid conflicts on re-run)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own applications" ON loan_applications;
DROP POLICY IF EXISTS "Users can create applications" ON loan_applications;
DROP POLICY IF EXISTS "Primary market loans are viewable by everyone" ON primary_market_loans;
DROP POLICY IF EXISTS "Authenticated users can create investments" ON investments;
DROP POLICY IF EXISTS "Users can view own investments" ON investments;
DROP POLICY IF EXISTS "Users can update own investments" ON investments;
DROP POLICY IF EXISTS "Users can view own loans" ON loans;
DROP POLICY IF EXISTS "Anyone can view listed investments" ON secondary_market_listings;
DROP POLICY IF EXISTS "Sellers can create listings" ON secondary_market_listings;

-- =====================================================
-- DROP EXISTING TABLES (in reverse dependency order)
-- Uncomment these lines if you want to completely reset
-- =====================================================
-- DROP TABLE IF EXISTS secondary_market_listings CASCADE;
-- DROP TABLE IF EXISTS loans CASCADE;
-- DROP TABLE IF EXISTS investments CASCADE;
-- DROP TABLE IF EXISTS primary_market_loans CASCADE;
-- DROP TABLE IF EXISTS admin_notifications CASCADE;
-- DROP TABLE IF EXISTS loan_applications CASCADE;

-- =====================================================
-- LOAN APPLICATIONS TABLE
-- =====================================================

-- Create loan_applications table
CREATE TABLE IF NOT EXISTS loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Loan Details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    purpose VARCHAR(100) NOT NULL,
    purpose_description TEXT,
    term_months INTEGER NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    risk_level VARCHAR(20),
    
    -- Borrower Info (snapshot at time of application)
    borrower_name VARCHAR(255),
    borrower_occupation VARCHAR(100),
    borrower_location VARCHAR(100),
    borrower_zim_score INTEGER,
    borrower_verified BOOLEAN DEFAULT false,
    employment_type VARCHAR(50),
    monthly_income DECIMAL(12,2),
    
    -- Application Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    
    -- Rejection Details
    rejection_reason TEXT,
    admin_notes TEXT,
    can_resubmit BOOLEAN DEFAULT true,
    
    -- Resubmission Tracking
    resubmitted_from UUID REFERENCES loan_applications(id),
    resubmitted_as UUID REFERENCES loan_applications(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Add post_registration_completed column to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS post_registration_completed BOOLEAN DEFAULT false;

-- Add application_id to primary_market_loans to link approved applications
ALTER TABLE primary_market_loans 
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES loan_applications(id);

-- Create admin_notifications table for loan application alerts
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_loan_applications_user ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_submitted ON loan_applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications" 
ON loan_applications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can create applications" 
ON loan_applications FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications (via service role)
-- Note: Admin access is handled via service role key in backend

-- Admin notifications are only for admins (via service role)

-- =====================================================
-- GOVERNMENT EMPLOYEE BONUS ZIMSCORE
-- Update ZimScore calculation to give government employees better starting score
-- =====================================================

-- Function to calculate starting ZimScore based on employment type
-- Updated to use civil_servant instead of government
CREATE OR REPLACE FUNCTION calculate_starting_zimscore(employment_type TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE employment_type
        WHEN 'civil_servant' THEN RETURN 70; -- Civil servants get highest starting score
        WHEN 'private' THEN RETURN 60;       -- Private employees
        WHEN 'informal' THEN RETURN 50;      -- Informal sector
        WHEN 'self_employed' THEN RETURN 50; -- Self-employed
        WHEN 'unemployed' THEN RETURN 40;    -- Unemployed (not eligible for loans)
        ELSE RETURN 50;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate star rating from ZimScore
CREATE OR REPLACE FUNCTION calculate_star_rating(zim_score INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF zim_score >= 80 THEN RETURN 5;
    ELSIF zim_score >= 70 THEN RETURN 4;
    ELSIF zim_score >= 60 THEN RETURN 3;
    ELSIF zim_score >= 50 THEN RETURN 2;
    ELSIF zim_score >= 40 THEN RETURN 1;
    ELSE RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set initial ZimScore when profile is completed
CREATE OR REPLACE FUNCTION set_initial_zimscore()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set if post_registration just completed and zim_score is not set
    IF NEW.post_registration_completed = true 
       AND (OLD.post_registration_completed IS NULL OR OLD.post_registration_completed = false)
       AND (NEW.zim_score IS NULL OR NEW.zim_score = 0) THEN
        NEW.zim_score := calculate_starting_zimscore(NEW.employment_type);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_initial_zimscore ON profiles;
CREATE TRIGGER trigger_set_initial_zimscore
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_initial_zimscore();

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample pending applications for admin testing
-- (Uncomment to use)
/*
INSERT INTO loan_applications (
    user_id, amount, currency, purpose, purpose_description, term_months, interest_rate,
    risk_level, borrower_name, borrower_occupation, borrower_location, borrower_zim_score,
    borrower_verified, employment_type, monthly_income, status
)
SELECT 
    id,
    500 + (random() * 2000)::int,
    CASE WHEN random() > 0.5 THEN 'USD' ELSE 'ZWG' END,
    (ARRAY['Business', 'Education', 'Medical', 'Home', 'Agriculture'])[floor(random() * 5 + 1)::int],
    'Sample loan application for testing',
    (ARRAY[3, 6, 12, 18, 24])[floor(random() * 5 + 1)::int],
    10 + (random() * 10)::numeric(5,2),
    (ARRAY['Very Low', 'Low', 'Medium', 'High'])[floor(random() * 4 + 1)::int],
    full_name,
    occupation,
    location,
    COALESCE(zim_score, 50),
    verified,
    employment_type,
    monthly_income,
    'pending'
FROM profiles
WHERE post_registration_completed = true
LIMIT 5;
*/

-- =====================================================
-- PRIMARY MARKET LOANS TABLE
-- Must be created before loans and secondary_market_listings
-- =====================================================

CREATE TABLE IF NOT EXISTS primary_market_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID REFERENCES auth.users(id),
    application_id UUID REFERENCES loan_applications(id),
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
    CONSTRAINT valid_market_loan_status CHECK (status IN ('funding', 'funded', 'active', 'completed', 'defaulted', 'cancelled'))
);

-- Indexes for primary market loans
CREATE INDEX IF NOT EXISTS idx_primary_market_loans_status ON primary_market_loans(status);
CREATE INDEX IF NOT EXISTS idx_primary_market_loans_currency ON primary_market_loans(currency);
CREATE INDEX IF NOT EXISTS idx_primary_market_loans_borrower ON primary_market_loans(borrower_id);

-- =====================================================
-- INVESTMENTS TABLE
-- Must be created before secondary_market_listings
-- =====================================================

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
    status VARCHAR(20) DEFAULT 'active', -- active, completed, defaulted, for_sale, sold
    invested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    maturity_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    payments_received INTEGER DEFAULT 0,
    total_payments INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for investments
CREATE INDEX IF NOT EXISTS idx_investments_investor ON investments(investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_loan ON investments(loan_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);

-- RLS for primary_market_loans
ALTER TABLE primary_market_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Primary market loans are viewable by everyone" 
ON primary_market_loans FOR SELECT 
USING (true);

-- RLS for investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can create investments" 
ON investments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = investor_id);

CREATE POLICY "Users can view own investments" 
ON investments FOR SELECT 
TO authenticated 
USING (auth.uid() = investor_id);

CREATE POLICY "Users can update own investments" 
ON investments FOR UPDATE 
TO authenticated 
USING (auth.uid() = investor_id);

-- =====================================================
-- LOANS TABLE (Active and Completed Borrower Loans)
-- =====================================================

-- Create loans table for borrower's active and completed loans
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    market_loan_id UUID REFERENCES primary_market_loans(id),
    
    -- Loan Details
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    
    -- Payment Details
    monthly_payment DECIMAL(12,2),
    total_repayment DECIMAL(12,2),
    total_interest DECIMAL(12,2),
    remaining_balance DECIMAL(12,2),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, completed, defaulted
    purpose VARCHAR(100),
    purpose_description TEXT,
    
    -- Dates
    disbursed_at TIMESTAMP WITH TIME ZONE,
    maturity_date TIMESTAMP WITH TIME ZONE,
    next_payment_date TIMESTAMP WITH TIME ZONE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment Tracking
    payments_made INTEGER DEFAULT 0,
    total_payments INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_loan_status CHECK (status IN ('active', 'completed', 'defaulted'))
);

-- Add indexes for loans table
CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_market_loan ON loans(market_loan_id);

-- Enable RLS on loans table
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Users can view their own loans
CREATE POLICY "Users can view own loans" 
ON loans FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- =====================================================
-- SECONDARY MARKET LISTINGS TABLE
-- =====================================================

-- Create secondary_market_listings table for selling investments
CREATE TABLE IF NOT EXISTS secondary_market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investment_id UUID REFERENCES investments(id) NOT NULL,
    seller_id UUID REFERENCES auth.users(id) NOT NULL,
    loan_id UUID REFERENCES primary_market_loans(id),
    buyer_id UUID REFERENCES auth.users(id),
    
    -- Original Investment Details
    original_amount DECIMAL(12,2) NOT NULL,
    remaining_principal DECIMAL(12,2) NOT NULL,
    remaining_expected_return DECIMAL(12,2),
    
    -- Pricing
    asking_price DECIMAL(12,2) NOT NULL,
    platform_fee DECIMAL(12,2),
    net_proceeds DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Payment History
    payments_received INTEGER DEFAULT 0,
    payments_remaining INTEGER DEFAULT 0,
    interest_rate DECIMAL(5,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'listed', -- listed, sold, cancelled
    listed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_listing_status CHECK (status IN ('listed', 'sold', 'cancelled'))
);

-- Add indexes for secondary market
CREATE INDEX IF NOT EXISTS idx_secondary_listings_seller ON secondary_market_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_secondary_listings_status ON secondary_market_listings(status);
CREATE INDEX IF NOT EXISTS idx_secondary_listings_investment ON secondary_market_listings(investment_id);

-- Enable RLS
ALTER TABLE secondary_market_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view listed investments
CREATE POLICY "Anyone can view listed investments" 
ON secondary_market_listings FOR SELECT 
USING (status = 'listed' OR seller_id = auth.uid() OR buyer_id = auth.uid());

-- Sellers can create listings
CREATE POLICY "Sellers can create listings" 
ON secondary_market_listings FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = seller_id);

-- =====================================================
-- UPDATE INVESTMENTS TABLE FOR SECONDARY MARKET
-- =====================================================

-- Add columns to investments table for secondary market
ALTER TABLE investments 
ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES secondary_market_listings(id),
ADD COLUMN IF NOT EXISTS sold_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS purchased_from_secondary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS original_investment_id UUID REFERENCES investments(id);

-- Update status constraint to include new statuses
ALTER TABLE investments DROP CONSTRAINT IF EXISTS valid_investment_status;
ALTER TABLE investments ADD CONSTRAINT valid_investment_status 
CHECK (status IN ('active', 'completed', 'for_sale', 'sold', 'defaulted'));

-- =====================================================
-- FUNCTION: Increment ZimScore
-- =====================================================

CREATE OR REPLACE FUNCTION increment_zimscore(user_id UUID, points INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE profiles 
    SET zim_score = LEAST(100, COALESCE(zim_score, 50) + points)
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'loan_applications';

-- Check pending applications count
-- SELECT COUNT(*) as pending_count FROM loan_applications WHERE status = 'pending';

-- Check applications by status
-- SELECT status, COUNT(*) FROM loan_applications GROUP BY status;

-- Check active loans
-- SELECT * FROM loans WHERE status = 'active';

-- Check completed loans
-- SELECT * FROM loans WHERE status = 'completed';

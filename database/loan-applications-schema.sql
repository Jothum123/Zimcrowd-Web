-- =====================================================
-- LOAN APPLICATIONS SCHEMA
-- New loan application flow:
-- 1. User submits loan → Goes to Admin for review
-- 2. Admin approves → Posted to Primary Market
-- 3. Admin rejects → Shown in My Loans with rejection reason
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
CREATE OR REPLACE FUNCTION calculate_starting_zimscore(employment_type TEXT)
RETURNS INTEGER AS $$
BEGIN
    CASE employment_type
        WHEN 'government' THEN RETURN 65; -- Government employees get higher starting score
        WHEN 'private_formal' THEN RETURN 55;
        WHEN 'self_employed' THEN RETURN 50;
        WHEN 'informal' THEN RETURN 45;
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
-- VERIFICATION QUERIES
-- =====================================================

-- Check table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'loan_applications';

-- Check pending applications count
-- SELECT COUNT(*) as pending_count FROM loan_applications WHERE status = 'pending';

-- Check applications by status
-- SELECT status, COUNT(*) FROM loan_applications GROUP BY status;

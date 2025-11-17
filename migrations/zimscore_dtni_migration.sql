-- ============================================================================
-- ZimScore DTNI Implementation Migration
-- ============================================================================
-- This script creates the missing user_zimscores table and adds required
-- columns for DTNI-based cold start limits and employment type validation
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE user_zimscores TABLE (CRITICAL - MISSING)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Core Score Values
    score_value INTEGER NOT NULL CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) NOT NULL CHECK (star_rating BETWEEN 1.0 AND 5.0),
    max_loan_amount DECIMAL(10,2) NOT NULL,
    score_based_limit DECIMAL(10,2) NOT NULL,
    risk_level TEXT NOT NULL,
    
    -- Component Breakdown
    component1_banking INTEGER DEFAULT 0,
    component2_employment INTEGER DEFAULT 0,
    component3_performance INTEGER DEFAULT 0,
    
    -- Banking Factors (from OCR analysis)
    cash_flow_ratio DECIMAL(5,2),
    avg_balance DECIMAL(10,2),
    balance_consistency INTEGER,
    nsf_events INTEGER DEFAULT 0,
    account_age_months INTEGER DEFAULT 0,
    additional_accounts INTEGER DEFAULT 0,
    
    -- Employment Information
    employment_type TEXT, -- government, private, business, informal
    
    -- DTNI (Debt-to-Net-Income) Metrics - NEW FOR OUR IMPLEMENTATION
    dtni_ratio DECIMAL(5,4), -- DTNI ratio (e.g., 0.2500 = 25%)
    dtni_status TEXT, -- 'Excellent', 'Good', 'Fair', 'Limited', 'Denied'
    
    -- Performance Metrics
    total_loans INTEGER DEFAULT 0,
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    defaults INTEGER DEFAULT 0,
    max_loan_repaid DECIMAL(10,2) DEFAULT 0,
    platform_tenure_months INTEGER DEFAULT 0,
    
    -- Metadata
    score_factors JSONB, -- Detailed breakdown of all factors
    calculation_method TEXT, -- 'cold_start' or 'trust_loop'
    cold_start_active BOOLEAN DEFAULT TRUE, -- DTNI-based limit override
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add employment_type to users table (CRITICAL for employment validation)
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type TEXT;

-- Ensure employment_details has required columns
ALTER TABLE employment_details ADD COLUMN IF NOT EXISTS employment_type TEXT;
ALTER TABLE employment_details ADD COLUMN IF NOT EXISTS monthly_income DECIMAL(10,2);

-- Add DTNI support columns to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS term_days INTEGER;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS monthly_installment DECIMAL(10,2);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS dtni_validation JSONB;

-- Update zimscore_history table if it's missing columns
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT uuid_generate_v4();
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS old_score_value INTEGER;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS new_score_value INTEGER;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS score_change INTEGER;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS old_max_loan_amount DECIMAL(10,2);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS new_max_loan_amount DECIMAL(10,2);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS old_star_rating DECIMAL(2,1);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS new_star_rating DECIMAL(2,1);
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS old_risk_level TEXT;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS new_risk_level TEXT;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS change_reason TEXT;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS change_details JSONB;
ALTER TABLE zimscore_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary indexes for user_zimscores
CREATE INDEX IF NOT EXISTS idx_user_zimscores_user_id ON user_zimscores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_score_value ON user_zimscores(score_value);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_risk_level ON user_zimscores(risk_level);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_employment_type ON user_zimscores(employment_type);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_cold_start ON user_zimscores(cold_start_active);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_last_calculated ON user_zimscores(last_calculated);

-- Indexes for zimscore_history
CREATE INDEX IF NOT EXISTS idx_zimscore_history_user_id ON zimscore_history(user_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_history_created_at ON zimscore_history(created_at);

-- Indexes for employment_details
CREATE INDEX IF NOT EXISTS idx_employment_details_user_id ON employment_details(user_id);
CREATE INDEX IF NOT EXISTS idx_employment_details_employment_type ON employment_details(employment_type);

-- Indexes for loans
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);

-- ============================================================================
-- 4. SET UP ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on ZimScore tables
ALTER TABLE user_zimscores ENABLE ROW LEVEL SECURITY;
ALTER TABLE zimscore_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own zimscore" ON user_zimscores;
DROP POLICY IF EXISTS "Users can view own score history" ON zimscore_history;
DROP POLICY IF EXISTS "Service can manage all zimscores" ON user_zimscores;
DROP POLICY IF EXISTS "Service can manage all score history" ON zimscore_history;

-- Create RLS policies for user_zimscores
CREATE POLICY "Users can view own zimscore" ON user_zimscores
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can manage all zimscores" ON user_zimscores
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create RLS policies for zimscore_history
CREATE POLICY "Users can view own score history" ON zimscore_history
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service can manage all score history" ON zimscore_history
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. ADD TABLE AND COLUMN COMMENTS
-- ============================================================================

-- Table comments
COMMENT ON TABLE user_zimscores IS 'Stores current ZimScore for each user (30-85 range) with DTNI-based cold start limits';
COMMENT ON TABLE zimscore_history IS 'Tracks all ZimScore changes over time';

-- Column comments for user_zimscores
COMMENT ON COLUMN user_zimscores.score_value IS 'Internal score: 30-85 points';
COMMENT ON COLUMN user_zimscores.star_rating IS 'Public rating: 1.0-5.0 stars';
COMMENT ON COLUMN user_zimscores.max_loan_amount IS 'Current borrowing limit (DTNI-based: civil servants $60-$300, others $60-$100)';
COMMENT ON COLUMN user_zimscores.score_based_limit IS 'Actual limit based on score (unlocked after first repayment)';
COMMENT ON COLUMN user_zimscores.cold_start_active IS 'TRUE = DTNI-based limit, FALSE = score-based limit active';
COMMENT ON COLUMN user_zimscores.component1_banking IS 'Banking data component: 30-60 points';
COMMENT ON COLUMN user_zimscores.component2_employment IS 'Employment bonus: 0-10 points';
COMMENT ON COLUMN user_zimscores.component3_performance IS 'Performance adjustment: -20 to +39 points';
COMMENT ON COLUMN user_zimscores.dtni_ratio IS 'Debt-to-Net-Income ratio (0.0-1.0, e.g., 0.25 = 25%)';
COMMENT ON COLUMN user_zimscores.dtni_status IS 'DTNI status: Excellent (≤20%), Good (≤30%), Fair (≤40%), Limited, or Denied';
COMMENT ON COLUMN user_zimscores.employment_type IS 'Employment type: government (+10 pts), private (+6 pts), business (+3 pts), informal (+0 pts)';

-- Column comments for other tables
COMMENT ON COLUMN users.employment_type IS 'Employment type for ZimScore calculation: government, private, business, informal';
COMMENT ON COLUMN employment_details.employment_type IS 'Employment type: government, private, business, informal';
COMMENT ON COLUMN employment_details.monthly_income IS 'Monthly net income for DTNI calculation';
COMMENT ON COLUMN loans.term_days IS 'Loan term in days (30-720 days based on employment type)';
COMMENT ON COLUMN loans.monthly_installment IS 'Monthly installment calculated using reducing balance method';
COMMENT ON COLUMN loans.dtni_validation IS 'DTNI validation results and installment capacity data';

-- ============================================================================
-- 6. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_zimscores
DROP TRIGGER IF EXISTS update_user_zimscores_updated_at ON user_zimscores;
CREATE TRIGGER update_user_zimscores_updated_at
    BEFORE UPDATE ON user_zimscores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
DO $$
BEGIN
    -- Check if user_zimscores table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_zimscores') THEN
        RAISE NOTICE '✅ user_zimscores table created successfully';
    ELSE
        RAISE NOTICE '❌ user_zimscores table creation failed';
    END IF;
    
    -- Check if employment_type column exists in users table
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'employment_type') THEN
        RAISE NOTICE '✅ employment_type column added to users table';
    ELSE
        RAISE NOTICE '❌ employment_type column missing from users table';
    END IF;
    
    -- Check if dtni_ratio column exists in user_zimscores table
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'user_zimscores' AND column_name = 'dtni_ratio') THEN
        RAISE NOTICE '✅ DTNI columns added to user_zimscores table';
    ELSE
        RAISE NOTICE '❌ DTNI columns missing from user_zimscores table';
    END IF;
    
    RAISE NOTICE '🎉 ZimScore DTNI migration completed!';
    RAISE NOTICE '📊 Ready for DTNI-based cold start limits';
    RAISE NOTICE '👔 Ready for employment type validation';
    RAISE NOTICE '🧮 Ready for reducing balance calculations';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Show summary of what was created/modified
SELECT 
    'user_zimscores' AS table_name,
    'CREATED' AS action,
    'Main ZimScore table with DTNI support' AS description
UNION ALL
SELECT 
    'users.employment_type' AS table_name,
    'COLUMN ADDED' AS action,
    'Employment type for ZimScore validation' AS description
UNION ALL
SELECT 
    'loans.term_days' AS table_name,
    'COLUMN ADDED' AS action,
    'Loan term in days for DTNI calculation' AS description
UNION ALL
SELECT 
    'loans.monthly_installment' AS table_name,
    'COLUMN ADDED' AS action,
    'Monthly payment using reducing balance' AS description
UNION ALL
SELECT 
    'loans.dtni_validation' AS table_name,
    'COLUMN ADDED' AS action,
    'DTNI validation results storage' AS description;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

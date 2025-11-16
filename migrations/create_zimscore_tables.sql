-- ZimScore Tables Migration
-- Creates tables for ZimScore calculation and history tracking

-- ============================================================================
-- 1. user_zimscores Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score values
    score_value INTEGER NOT NULL CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) NOT NULL CHECK (star_rating BETWEEN 1.0 AND 5.0),
    max_loan_amount DECIMAL(10,2) NOT NULL,
    score_based_limit DECIMAL(10,2) NOT NULL, -- Actual limit based on score (unlocked after first repayment)
    risk_level TEXT NOT NULL,
    
    -- Component breakdown
    component1_banking INTEGER DEFAULT 0, -- 30-60 points
    component2_employment INTEGER DEFAULT 0, -- 0-10 points
    component3_performance INTEGER DEFAULT 0, -- -20 to +39 points
    
    -- Banking factors (from OCR)
    cash_flow_ratio DECIMAL(5,2),
    avg_balance DECIMAL(10,2),
    balance_consistency INTEGER,
    nsf_events INTEGER DEFAULT 0,
    account_age_months INTEGER DEFAULT 0,
    additional_accounts INTEGER DEFAULT 0,
    
    -- Employment
    employment_type TEXT, -- government, private, business, informal
    
    -- DTNI (Debt-to-Net-Income) metrics
    dtni_ratio DECIMAL(5,4), -- DTNI ratio (e.g., 0.2500 = 25%)
    dtni_status TEXT, -- 'Excellent', 'Good', 'Fair', 'Limited', 'Denied'
    
    -- Performance metrics
    total_loans INTEGER DEFAULT 0,
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    defaults INTEGER DEFAULT 0,
    max_loan_repaid DECIMAL(10,2) DEFAULT 0,
    platform_tenure_months INTEGER DEFAULT 0,
    
    -- Metadata
    score_factors JSONB, -- Detailed breakdown of all factors
    calculation_method TEXT, -- 'cold_start' or 'trust_loop'
    cold_start_active BOOLEAN DEFAULT TRUE, -- $100 limit override
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_zimscores_user_id ON user_zimscores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_score_value ON user_zimscores(score_value);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_risk_level ON user_zimscores(risk_level);

-- ============================================================================
-- 2. zimscore_history Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS zimscore_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Score changes
    old_score_value INTEGER,
    new_score_value INTEGER NOT NULL,
    score_change INTEGER GENERATED ALWAYS AS (new_score_value - COALESCE(old_score_value, 0)) STORED,
    
    -- Limit changes
    old_max_loan_amount DECIMAL(10,2),
    new_max_loan_amount DECIMAL(10,2) NOT NULL,
    
    -- Star rating changes
    old_star_rating DECIMAL(2,1),
    new_star_rating DECIMAL(2,1) NOT NULL,
    
    -- Risk level changes
    old_risk_level TEXT,
    new_risk_level TEXT NOT NULL,
    
    -- Change details
    change_reason TEXT NOT NULL, -- 'initial_calculation', 'loan_repaid_on_time', 'loan_repaid_late', etc.
    change_details JSONB, -- Additional context
    related_loan_id UUID, -- Reference to loan if applicable
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for history queries
CREATE INDEX IF NOT EXISTS idx_zimscore_history_user_id ON zimscore_history(user_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_history_created_at ON zimscore_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zimscore_history_related_loan ON zimscore_history(related_loan_id) WHERE related_loan_id IS NOT NULL;

-- ============================================================================
-- 3. Update Trigger for user_zimscores
-- ============================================================================
CREATE OR REPLACE FUNCTION update_zimscore_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_zimscore_timestamp ON user_zimscores;
CREATE TRIGGER trigger_update_zimscore_timestamp
    BEFORE UPDATE ON user_zimscores
    FOR EACH ROW
    EXECUTE FUNCTION update_zimscore_timestamp();

-- ============================================================================
-- 4. Add employment_type to users table (if not exists)
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'employment_type'
    ) THEN
        ALTER TABLE users ADD COLUMN employment_type TEXT;
        COMMENT ON COLUMN users.employment_type IS 'Employment type: government, private, business, informal';
    END IF;
END $$;

-- ============================================================================
-- 5. Helper Views
-- ============================================================================

-- View: User ZimScore Summary
CREATE OR REPLACE VIEW v_user_zimscore_summary AS
SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    u.employment_type,
    z.score_value,
    z.star_rating,
    z.max_loan_amount,
    z.score_based_limit,
    z.risk_level,
    z.cold_start_active,
    z.component1_banking,
    z.component2_employment,
    z.component3_performance,
    z.total_loans,
    z.on_time_payments,
    z.late_payments,
    z.defaults,
    CASE 
        WHEN z.total_loans > 0 THEN ROUND((z.on_time_payments::DECIMAL / z.total_loans) * 100, 2)
        ELSE 0
    END AS on_time_rate_percentage,
    z.last_calculated,
    z.created_at
FROM users u
LEFT JOIN user_zimscores z ON u.id = z.user_id;

-- View: ZimScore History with Changes
CREATE OR REPLACE VIEW v_zimscore_history_detailed AS
SELECT 
    h.id,
    h.user_id,
    u.full_name,
    u.email,
    h.old_score_value,
    h.new_score_value,
    h.score_change,
    h.old_max_loan_amount,
    h.new_max_loan_amount,
    h.old_star_rating,
    h.new_star_rating,
    h.old_risk_level,
    h.new_risk_level,
    h.change_reason,
    h.change_details,
    h.related_loan_id,
    h.created_at
FROM zimscore_history h
JOIN users u ON h.user_id = u.id
ORDER BY h.created_at DESC;

-- ============================================================================
-- 6. Sample Data Comments
-- ============================================================================

COMMENT ON TABLE user_zimscores IS 'Stores current ZimScore for each user (30-85 range)';
COMMENT ON TABLE zimscore_history IS 'Tracks all ZimScore changes over time';

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

-- ============================================================================
-- 7. Grant Permissions (adjust as needed)
-- ============================================================================

-- Grant SELECT to authenticated users (via RLS policies)
ALTER TABLE user_zimscores ENABLE ROW LEVEL SECURITY;
ALTER TABLE zimscore_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own ZimScore
CREATE POLICY "Users can view own zimscore" ON user_zimscores
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can view their own score history
CREATE POLICY "Users can view own score history" ON zimscore_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can manage all scores
CREATE POLICY "Service can manage all zimscores" ON user_zimscores
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service can manage all score history" ON zimscore_history
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables created
SELECT 
    'user_zimscores' AS table_name,
    COUNT(*) AS row_count
FROM user_zimscores
UNION ALL
SELECT 
    'zimscore_history' AS table_name,
    COUNT(*) AS row_count
FROM zimscore_history;

COMMENT ON SCHEMA public IS 'ZimScore tables created successfully';

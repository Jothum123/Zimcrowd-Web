-- ============================================
-- Zimcrowd Referral Link System - Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- REFERRAL LINKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    link_url TEXT NOT NULL,
    
    -- Tracking
    total_clicks INT DEFAULT 0,
    unique_clicks INT DEFAULT 0,
    total_signups INT DEFAULT 0,
    total_conversions INT DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    expiry_date TIMESTAMP, -- NULL = never expires
    
    -- Metadata
    utm_source VARCHAR(50) DEFAULT 'referral',
    utm_medium VARCHAR(50) DEFAULT 'link',
    utm_campaign VARCHAR(100) DEFAULT 'user_acquisition',
    
    CONSTRAINT fk_referral_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- REFERRAL CLICKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_link_id UUID NOT NULL,
    
    -- Tracking data
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- mobile, desktop, tablet
    browser VARCHAR(50),
    operating_system VARCHAR(50),
    
    -- Geographic data
    country VARCHAR(100),
    city VARCHAR(100),
    region VARCHAR(100),
    
    -- Conversion tracking
    converted_to_signup BOOLEAN DEFAULT FALSE,
    referee_user_id UUID,
    
    -- Timestamps
    clicked_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_click_referral_link FOREIGN KEY (referral_link_id) REFERENCES referral_links(id) ON DELETE CASCADE,
    CONSTRAINT fk_click_referee FOREIGN KEY (referee_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- REFERRAL CONVERSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_link_id UUID NOT NULL,
    referrer_user_id UUID NOT NULL,
    referee_user_id UUID NOT NULL,
    
    -- Conversion status
    status VARCHAR(50) DEFAULT 'signed_up' CHECK (status IN (
        'signed_up',
        'verified',
        'first_loan_applied',
        'first_loan_funded',
        'first_lending_completed',
        'completed'
    )),
    
    -- Rewards
    referrer_credit_amount DECIMAL(10,2) DEFAULT 0,
    referee_credit_amount DECIMAL(10,2) DEFAULT 0,
    referrer_credit_issued BOOLEAN DEFAULT FALSE,
    referee_credit_issued BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    signed_up_at TIMESTAMP,
    verified_at TIMESTAMP,
    first_loan_at TIMESTAMP,
    first_lending_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_conversion_referral_link FOREIGN KEY (referral_link_id) REFERENCES referral_links(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversion_referrer FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_conversion_referee FOREIGN KEY (referee_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_referee_conversion UNIQUE (referee_user_id)
);

-- ============================================
-- REFERRAL CREDITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Credit details
    credit_amount DECIMAL(10,2) NOT NULL,
    used_amount DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (credit_amount - used_amount) STORED,
    
    -- Credit type
    credit_type VARCHAR(50) NOT NULL CHECK (credit_type IN (
        'signup_bonus',
        'referral_reward',
        'achievement_bonus',
        'leaderboard_reward',
        'challenge_reward',
        'promotional'
    )),
    
    -- Source tracking
    source_referral_id UUID,
    source_conversion_id UUID,
    source_description TEXT,
    
    -- Expiration
    expiry_date TIMESTAMP NOT NULL,
    is_expired BOOLEAN DEFAULT FALSE,
    expired_at TIMESTAMP,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_credit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_credit_referral FOREIGN KEY (source_referral_id) REFERENCES referral_links(id) ON DELETE SET NULL,
    CONSTRAINT fk_credit_conversion FOREIGN KEY (source_conversion_id) REFERENCES referral_conversions(id) ON DELETE SET NULL
);

-- ============================================
-- CREDIT TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    credit_id UUID NOT NULL,
    
    -- Transaction details
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
        'earned',
        'used',
        'expired',
        'refunded',
        'cancelled'
    )),
    
    amount DECIMAL(10,2) NOT NULL,
    
    -- Usage details
    applied_to_type VARCHAR(50), -- loan_fee, late_fee, service_fee, etc.
    applied_to_id UUID, -- Reference to loan, payment, etc.
    
    -- Description
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_transaction_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_transaction_credit FOREIGN KEY (credit_id) REFERENCES referral_credits(id) ON DELETE CASCADE
);

-- ============================================
-- REFERRAL ACHIEVEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Achievement details
    achievement_type VARCHAR(100) NOT NULL,
    achievement_name VARCHAR(200) NOT NULL,
    achievement_description TEXT,
    
    -- Rewards
    credit_reward DECIMAL(10,2) DEFAULT 0,
    badge_name VARCHAR(100),
    badge_icon_url TEXT,
    
    -- Status
    unlocked_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_achievement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- REFERRAL LEADERBOARD TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Period
    period_type VARCHAR(50) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Metrics
    total_referrals INT DEFAULT 0,
    total_conversions INT DEFAULT 0,
    total_credits_earned DECIMAL(10,2) DEFAULT 0,
    rank INT,
    
    -- Rewards
    leaderboard_reward DECIMAL(10,2) DEFAULT 0,
    reward_issued BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_leaderboard_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_period UNIQUE (user_id, period_type, period_start)
);

-- ============================================
-- FRAUD DETECTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS referral_fraud_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Subject
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN (
        'ip_velocity',
        'device_fingerprint',
        'conversion_rate',
        'suspicious_pattern',
        'manual_review'
    )),
    
    -- Related entities
    user_id UUID,
    referral_link_id UUID,
    conversion_id UUID,
    
    -- Check details
    risk_score INT CHECK (risk_score BETWEEN 0 AND 100),
    risk_level VARCHAR(50) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Flags
    is_flagged BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    requires_manual_review BOOLEAN DEFAULT FALSE,
    
    -- Details
    check_details JSONB,
    notes TEXT,
    
    -- Resolution
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    resolution VARCHAR(50) CHECK (resolution IN ('approved', 'rejected', 'pending')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_fraud_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_referral FOREIGN KEY (referral_link_id) REFERENCES referral_links(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_conversion FOREIGN KEY (conversion_id) REFERENCES referral_conversions(id) ON DELETE CASCADE,
    CONSTRAINT fk_fraud_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Referral Links
CREATE INDEX idx_referral_links_user ON referral_links(user_id);
CREATE INDEX idx_referral_links_code ON referral_links(referral_code);
CREATE INDEX idx_referral_links_active ON referral_links(is_active) WHERE is_active = TRUE;

-- Referral Clicks
CREATE INDEX idx_referral_clicks_link ON referral_clicks(referral_link_id);
CREATE INDEX idx_referral_clicks_ip ON referral_clicks(ip_address);
CREATE INDEX idx_referral_clicks_converted ON referral_clicks(converted_to_signup) WHERE converted_to_signup = TRUE;
CREATE INDEX idx_referral_clicks_date ON referral_clicks(clicked_at);

-- Referral Conversions
CREATE INDEX idx_conversions_referrer ON referral_conversions(referrer_user_id);
CREATE INDEX idx_conversions_referee ON referral_conversions(referee_user_id);
CREATE INDEX idx_conversions_status ON referral_conversions(status);
CREATE INDEX idx_conversions_completed ON referral_conversions(completed_at) WHERE completed_at IS NOT NULL;

-- Referral Credits
CREATE INDEX idx_credits_user ON referral_credits(user_id);
CREATE INDEX idx_credits_status ON referral_credits(status);
CREATE INDEX idx_credits_expiry ON referral_credits(expiry_date);
CREATE INDEX idx_credits_active ON referral_credits(user_id, status) WHERE status = 'active';

-- Credit Transactions
CREATE INDEX idx_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_transactions_credit ON credit_transactions(credit_id);
CREATE INDEX idx_transactions_type ON credit_transactions(transaction_type);
CREATE INDEX idx_transactions_date ON credit_transactions(created_at);

-- Leaderboard
CREATE INDEX idx_leaderboard_period ON referral_leaderboard(period_type, period_start, period_end);
CREATE INDEX idx_leaderboard_rank ON referral_leaderboard(rank);

-- Fraud Checks
CREATE INDEX idx_fraud_user ON referral_fraud_checks(user_id);
CREATE INDEX idx_fraud_flagged ON referral_fraud_checks(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX idx_fraud_review ON referral_fraud_checks(requires_manual_review) WHERE requires_manual_review = TRUE;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_code VARCHAR(50);
    v_exists BOOLEAN;
BEGIN
    LOOP
        -- Format: ZIM_REF_{random_string}
        v_code := 'ZIM_REF_' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || p_user_id::TEXT) FROM 1 FOR 10));
        
        -- Check if code exists
        SELECT EXISTS(SELECT 1 FROM referral_links WHERE referral_code = v_code) INTO v_exists;
        
        EXIT WHEN NOT v_exists;
    END LOOP;
    
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Get user's available credits
CREATE OR REPLACE FUNCTION get_available_credits(p_user_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_total DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(remaining_amount), 0)
    INTO v_total
    FROM referral_credits
    WHERE user_id = p_user_id
    AND status = 'active'
    AND (expiry_date IS NULL OR expiry_date > NOW());
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Update referral link stats
CREATE OR REPLACE FUNCTION update_referral_link_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update click count
        UPDATE referral_links
        SET 
            total_clicks = total_clicks + 1,
            last_used_at = NEW.clicked_at
        WHERE id = NEW.referral_link_id;
        
        -- Update conversion count if converted
        IF NEW.converted_to_signup THEN
            UPDATE referral_links
            SET total_signups = total_signups + 1
            WHERE id = NEW.referral_link_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_stats
AFTER INSERT ON referral_clicks
FOR EACH ROW
EXECUTE FUNCTION update_referral_link_stats();

-- Auto-expire credits
CREATE OR REPLACE FUNCTION auto_expire_credits()
RETURNS void AS $$
BEGIN
    UPDATE referral_credits
    SET 
        status = 'expired',
        is_expired = TRUE,
        expired_at = NOW()
    WHERE status = 'active'
    AND expiry_date < NOW()
    AND is_expired = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Calculate conversion rate
CREATE OR REPLACE FUNCTION calculate_conversion_rate(p_referral_link_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    v_clicks INT;
    v_conversions INT;
    v_rate DECIMAL(5,2);
BEGIN
    SELECT total_clicks, total_conversions
    INTO v_clicks, v_conversions
    FROM referral_links
    WHERE id = p_referral_link_id;
    
    IF v_clicks = 0 THEN
        RETURN 0;
    END IF;
    
    v_rate := (v_conversions::DECIMAL / v_clicks::DECIMAL) * 100;
    
    RETURN ROUND(v_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- User referral summary
CREATE OR REPLACE VIEW v_user_referral_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    rl.referral_code,
    rl.total_clicks,
    rl.total_signups,
    rl.total_conversions,
    CASE 
        WHEN rl.total_clicks > 0 THEN ROUND((rl.total_conversions::DECIMAL / rl.total_clicks::DECIMAL) * 100, 2)
        ELSE 0
    END AS conversion_rate,
    COALESCE(SUM(rc.credit_amount), 0) AS total_credits_earned,
    COALESCE(SUM(rc.used_amount), 0) AS total_credits_used,
    COALESCE(SUM(rc.remaining_amount), 0) AS available_credits,
    COUNT(DISTINCT conv.id) AS total_referrals
FROM users u
LEFT JOIN referral_links rl ON u.id = rl.user_id
LEFT JOIN referral_credits rc ON u.id = rc.user_id
LEFT JOIN referral_conversions conv ON u.id = conv.referrer_user_id
GROUP BY u.id, u.email, rl.referral_code, rl.total_clicks, rl.total_signups, rl.total_conversions;

-- Leaderboard view
CREATE OR REPLACE VIEW v_referral_leaderboard_current AS
SELECT 
    u.id AS user_id,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT rc.id) AS total_referrals,
    COUNT(DISTINCT CASE WHEN rc.status = 'completed' THEN rc.id END) AS completed_referrals,
    COALESCE(SUM(rcr.credit_amount), 0) AS total_credits_earned,
    RANK() OVER (ORDER BY COUNT(DISTINCT rc.id) DESC) AS rank
FROM users u
LEFT JOIN referral_conversions rc ON u.id = rc.referrer_user_id
LEFT JOIN referral_credits rcr ON u.id = rcr.user_id AND rcr.credit_type = 'referral_reward'
WHERE rc.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_referrals DESC
LIMIT 100;

-- ============================================
-- SAMPLE DATA
-- ============================================

COMMENT ON TABLE referral_links IS 'Stores user referral links and tracking data';
COMMENT ON TABLE referral_clicks IS 'Tracks all clicks on referral links';
COMMENT ON TABLE referral_conversions IS 'Tracks referral conversion funnel';
COMMENT ON TABLE referral_credits IS 'Stores user referral credits and balances';
COMMENT ON TABLE credit_transactions IS 'Logs all credit transactions';
COMMENT ON TABLE referral_achievements IS 'Tracks user achievements and badges';
COMMENT ON TABLE referral_leaderboard IS 'Stores leaderboard rankings by period';
COMMENT ON TABLE referral_fraud_checks IS 'Fraud detection and prevention logs';

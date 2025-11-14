-- ============================================
-- ZIMCROWD SAFE SCHEMA UPDATE
-- ============================================
-- This file safely adds new tables without duplicating existing ones
-- Uses IF NOT EXISTS to prevent errors
-- ============================================

-- Enable UUID extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PAYMENT TRANSACTIONS TABLES (PayNow)
-- ============================================

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    reference VARCHAR(100) UNIQUE NOT NULL,
    poll_url TEXT,
    
    -- Payment details
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    payment_method VARCHAR(20) NOT NULL,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    paid BOOLEAN DEFAULT FALSE,
    
    -- User information
    user_email VARCHAR(255),
    user_phone VARCHAR(20),
    mobile_number VARCHAR(20),
    
    -- Metadata
    description TEXT,
    metadata JSONB,
    
    -- PayNow response
    paynow_reference VARCHAR(100),
    paynow_poll_url TEXT,
    hash VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_currency CHECK (currency IN ('USD', 'ZWG')),
    CONSTRAINT valid_payment_method CHECK (payment_method IN ('web', 'ecocash', 'onemoney')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired'))
);

-- Payment logs table
CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment webhooks table
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment analytics table
CREATE TABLE IF NOT EXISTS payment_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_transactions INTEGER DEFAULT 0,
    successful_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    total_amount_usd DECIMAL(12, 2) DEFAULT 0,
    total_amount_zwg DECIMAL(12, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. REFERRAL SYSTEM TABLES
-- ============================================

-- Referral links table
CREATE TABLE IF NOT EXISTS referral_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    referral_code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Referral clicks table
CREATE TABLE IF NOT EXISTS referral_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referral_code VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    clicked_at TIMESTAMP DEFAULT NOW()
);

-- Referral conversions table
CREATE TABLE IF NOT EXISTS referral_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL,
    referred_user_id UUID NOT NULL,
    referral_code VARCHAR(20) NOT NULL,
    conversion_type VARCHAR(50) DEFAULT 'signup',
    converted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referred_user_id)
);

-- Referral credits table
CREATE TABLE IF NOT EXISTS referral_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    total_credits DECIMAL(10, 2) DEFAULT 0,
    available_credits DECIMAL(10, 2) DEFAULT 0,
    used_credits DECIMAL(10, 2) DEFAULT 0,
    expired_credits DECIMAL(10, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Referral credit transactions table
CREATE TABLE IF NOT EXISTS referral_credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    description TEXT,
    related_user_id UUID,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_transaction_type CHECK (transaction_type IN ('earned', 'used', 'expired', 'bonus'))
);

-- Referral achievements table
CREATE TABLE IF NOT EXISTS referral_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_data JSONB,
    unlocked_at TIMESTAMP DEFAULT NOW()
);

-- Referral leaderboard table
CREATE TABLE IF NOT EXISTS referral_leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    total_credits_earned DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Referral fraud checks table
CREATE TABLE IF NOT EXISTS referral_fraud_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    check_type VARCHAR(50) NOT NULL,
    is_suspicious BOOLEAN DEFAULT FALSE,
    details JSONB,
    checked_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. ZIMSCORE & KYC TABLES
-- ============================================

-- User documents table
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    verification_notes TEXT,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_doc_type CHECK (doc_type IN ('ZIM_ID', 'PASSPORT', 'SELFIE', 'BANK_STATEMENT', 'ECOCASH_STATEMENT', 'PROOF_OF_ADDRESS'))
);

-- ZimScore users table
CREATE TABLE IF NOT EXISTS zimscore_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    current_score INTEGER,
    previous_score INTEGER,
    kyc_status VARCHAR(20) DEFAULT 'not_started',
    kyc_completed_at TIMESTAMP,
    kyc_failure_reason TEXT,
    financial_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_kyc_status CHECK (kyc_status IN ('not_started', 'pending', 'completed', 'failed', 'rejected')),
    CONSTRAINT valid_score_range CHECK (current_score BETWEEN 300 AND 850)
);

-- ZimScore history table
CREATE TABLE IF NOT EXISTS zimscore_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    score INTEGER NOT NULL,
    stars INTEGER,
    category VARCHAR(20),
    financial_data JSONB,
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_score CHECK (score BETWEEN 300 AND 850),
    CONSTRAINT valid_stars CHECK (stars BETWEEN 1 AND 5)
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE (Safe to run multiple times)
-- ============================================

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id ON payment_logs(transaction_id);

-- Referral indexes
CREATE INDEX IF NOT EXISTS idx_referral_links_user_id ON referral_links(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_links_code ON referral_links(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_referrer ON referral_conversions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_conversions_referred ON referral_conversions(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_credits_user_id ON referral_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_credit_transactions_user_id ON referral_credit_transactions(user_id);

-- ZimScore indexes
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_doc_type ON user_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_zimscore_users_user_id ON zimscore_users(user_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_history_user_id ON zimscore_history(user_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_history_created_at ON zimscore_history(created_at DESC);

-- ============================================
-- 5. HELPER FUNCTIONS (Safe to run multiple times)
-- ============================================

-- Function to log payment events
CREATE OR REPLACE FUNCTION log_payment_event(
    p_transaction_id UUID,
    p_event_type VARCHAR,
    p_event_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO payment_logs (transaction_id, event_type, event_data)
    VALUES (p_transaction_id, p_event_type, p_event_data)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update payment analytics
CREATE OR REPLACE FUNCTION update_payment_analytics() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        INSERT INTO payment_analytics (date, total_transactions, successful_transactions, total_amount_usd, total_amount_zwg)
        VALUES (
            CURRENT_DATE,
            1,
            1,
            CASE WHEN NEW.currency = 'USD' THEN NEW.amount ELSE 0 END,
            CASE WHEN NEW.currency = 'ZWG' THEN NEW.amount ELSE 0 END
        )
        ON CONFLICT (date) DO UPDATE SET
            total_transactions = payment_analytics.total_transactions + 1,
            successful_transactions = payment_analytics.successful_transactions + 1,
            total_amount_usd = payment_analytics.total_amount_usd + CASE WHEN NEW.currency = 'USD' THEN NEW.amount ELSE 0 END,
            total_amount_zwg = payment_analytics.total_amount_zwg + CASE WHEN NEW.currency = 'ZWG' THEN NEW.amount ELSE 0 END,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old payments
CREATE OR REPLACE FUNCTION expire_old_payments() RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE payment_transactions
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();
    
    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update referral leaderboard
CREATE OR REPLACE FUNCTION update_referral_leaderboard(p_user_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO referral_leaderboard (user_id, total_referrals, successful_referrals, total_credits_earned)
    SELECT 
        p_user_id,
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE conversion_type = 'signup') as successful_referrals,
        COALESCE(SUM(rc.total_credits), 0) as total_credits_earned
    FROM referral_conversions rc
    LEFT JOIN referral_credits rcr ON rcr.user_id = p_user_id
    WHERE rc.referrer_id = p_user_id
    GROUP BY p_user_id
    ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = EXCLUDED.total_referrals,
        successful_referrals = EXCLUDED.successful_referrals,
        total_credits_earned = EXCLUDED.total_credits_earned,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGERS (Safe to recreate)
-- ============================================

-- Trigger to update payment analytics
DROP TRIGGER IF EXISTS trigger_update_payment_analytics ON payment_transactions;
CREATE TRIGGER trigger_update_payment_analytics
    AFTER UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_analytics();

-- Trigger to update payment timestamp
CREATE OR REPLACE FUNCTION update_payment_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        NEW.paid_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_payment_timestamp ON payment_transactions;
CREATE TRIGGER trigger_update_payment_timestamp
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_timestamp();

-- ============================================
-- 7. VIEWS FOR EASY QUERYING (Safe to recreate)
-- ============================================

-- Payment summary view
CREATE OR REPLACE VIEW v_payment_summary AS
SELECT 
    DATE(created_at) as date,
    currency,
    payment_method,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    SUM(amount) FILTER (WHERE status = 'paid') as total_amount,
    AVG(amount) FILTER (WHERE status = 'paid') as avg_amount
FROM payment_transactions
GROUP BY DATE(created_at), currency, payment_method
ORDER BY date DESC;

-- Referral performance view
CREATE OR REPLACE VIEW v_referral_performance AS
SELECT 
    rl.user_id,
    rl.referral_code,
    COUNT(DISTINCT rc.id) as total_clicks,
    COUNT(DISTINCT rconv.id) as total_conversions,
    COALESCE(rcr.total_credits, 0) as total_credits,
    COALESCE(rcr.available_credits, 0) as available_credits
FROM referral_links rl
LEFT JOIN referral_clicks rc ON rc.referral_code = rl.referral_code
LEFT JOIN referral_conversions rconv ON rconv.referral_code = rl.referral_code
LEFT JOIN referral_credits rcr ON rcr.user_id = rl.user_id
WHERE rl.is_active = TRUE
GROUP BY rl.user_id, rl.referral_code, rcr.total_credits, rcr.available_credits;

-- ZimScore overview view
CREATE OR REPLACE VIEW v_zimscore_overview AS
SELECT 
    zu.user_id,
    zu.current_score,
    CASE 
        WHEN zu.current_score >= 750 THEN 5
        WHEN zu.current_score >= 650 THEN 4
        WHEN zu.current_score >= 550 THEN 3
        WHEN zu.current_score >= 450 THEN 2
        ELSE 1
    END as stars,
    CASE 
        WHEN zu.current_score >= 750 THEN 'Excellent'
        WHEN zu.current_score >= 650 THEN 'Good'
        WHEN zu.current_score >= 550 THEN 'Fair'
        WHEN zu.current_score >= 450 THEN 'Poor'
        ELSE 'Very Poor'
    END as category,
    zu.kyc_status,
    zu.updated_at,
    COUNT(ud.id) as total_documents,
    COUNT(ud.id) FILTER (WHERE ud.is_verified = TRUE) as verified_documents
FROM zimscore_users zu
LEFT JOIN user_documents ud ON ud.user_id = zu.user_id
GROUP BY zu.user_id, zu.current_score, zu.kyc_status, zu.updated_at;

-- ============================================
-- 8. INITIAL DATA (Safe to run multiple times)
-- ============================================

-- Insert default payment analytics for today if not exists
INSERT INTO payment_analytics (date, total_transactions, successful_transactions, failed_transactions, total_amount_usd, total_amount_zwg)
VALUES (CURRENT_DATE, 0, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- ============================================
-- SAFE SCHEMA UPDATE COMPLETE
-- ============================================
-- ✅ All tables use IF NOT EXISTS
-- ✅ All functions use CREATE OR REPLACE
-- ✅ All views use CREATE OR REPLACE
-- ✅ All triggers are dropped before recreation
-- ✅ Safe to run multiple times
-- ============================================

-- Verify what was created
SELECT 'Tables created/verified: ' || COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'payment_transactions', 'payment_logs', 'payment_webhooks', 'payment_analytics',
    'referral_links', 'referral_clicks', 'referral_conversions', 'referral_credits',
    'referral_credit_transactions', 'referral_achievements', 'referral_leaderboard', 'referral_fraud_checks',
    'user_documents', 'zimscore_users', 'zimscore_history'
);

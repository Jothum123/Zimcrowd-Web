-- ============================================
-- PayNow Payment Transactions Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PAYMENT TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Payment identification
    reference VARCHAR(100) UNIQUE NOT NULL,
    paynow_reference VARCHAR(100),
    
    -- User and loan references
    user_id UUID NOT NULL,
    loan_id UUID,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL CHECK (currency IN ('USD', 'ZWG')),
    description TEXT,
    
    -- Payment method
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('web', 'ecocash', 'onemoney')),
    mobile_number VARCHAR(20),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'paid',
        'failed',
        'cancelled',
        'expired'
    )),
    
    -- PayNow URLs
    poll_url TEXT,
    redirect_url TEXT,
    
    -- Error tracking
    error_message TEXT,
    error_code VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP,
    last_checked_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB,
    
    CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_payment_loan FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE SET NULL
);

-- ============================================
-- PAYMENT LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_transaction_id UUID NOT NULL,
    
    -- Log details
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    
    -- Status change tracking
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_log_transaction FOREIGN KEY (payment_transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE
);

-- ============================================
-- PAYMENT WEBHOOKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Webhook details
    reference VARCHAR(100) NOT NULL,
    paynow_reference VARCHAR(100),
    status VARCHAR(50),
    amount DECIMAL(10,2),
    
    -- Raw webhook data
    raw_data JSONB NOT NULL,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    
    -- Timestamp
    received_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_webhook_transaction FOREIGN KEY (reference) REFERENCES payment_transactions(reference) ON DELETE SET NULL
);

-- ============================================
-- PAYMENT ANALYTICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Time period
    date DATE NOT NULL,
    hour INT CHECK (hour BETWEEN 0 AND 23),
    
    -- Metrics
    total_payments INT DEFAULT 0,
    successful_payments INT DEFAULT 0,
    failed_payments INT DEFAULT 0,
    
    -- Amounts
    total_amount_usd DECIMAL(10,2) DEFAULT 0,
    total_amount_zwg DECIMAL(10,2) DEFAULT 0,
    
    -- By payment method
    web_payments INT DEFAULT 0,
    ecocash_payments INT DEFAULT 0,
    onemoney_payments INT DEFAULT 0,
    
    -- Performance metrics
    average_processing_time_seconds INT,
    success_rate DECIMAL(5,2),
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_analytics_period UNIQUE (date, hour)
);

-- ============================================
-- INDEXES
-- ============================================

-- Payment Transactions
CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_loan ON payment_transactions(loan_id);
CREATE INDEX idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created ON payment_transactions(created_at);
CREATE INDEX idx_payment_transactions_currency ON payment_transactions(currency);
CREATE INDEX idx_payment_transactions_method ON payment_transactions(payment_method);

-- Payment Logs
CREATE INDEX idx_payment_logs_transaction ON payment_logs(payment_transaction_id);
CREATE INDEX idx_payment_logs_event ON payment_logs(event_type);
CREATE INDEX idx_payment_logs_created ON payment_logs(created_at);

-- Payment Webhooks
CREATE INDEX idx_payment_webhooks_reference ON payment_webhooks(reference);
CREATE INDEX idx_payment_webhooks_processed ON payment_webhooks(processed);
CREATE INDEX idx_payment_webhooks_received ON payment_webhooks(received_at);

-- Payment Analytics
CREATE INDEX idx_payment_analytics_date ON payment_analytics(date);
CREATE INDEX idx_payment_analytics_period ON payment_analytics(date, hour);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Log payment event
CREATE OR REPLACE FUNCTION log_payment_event(
    p_transaction_id UUID,
    p_event_type VARCHAR,
    p_event_data JSONB DEFAULT NULL,
    p_old_status VARCHAR DEFAULT NULL,
    p_new_status VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO payment_logs (
        payment_transaction_id,
        event_type,
        event_data,
        old_status,
        new_status
    ) VALUES (
        p_transaction_id,
        p_event_type,
        p_event_data,
        p_old_status,
        p_new_status
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Update payment analytics
CREATE OR REPLACE FUNCTION update_payment_analytics()
RETURNS void AS $$
DECLARE
    v_date DATE := CURRENT_DATE;
    v_hour INT := EXTRACT(HOUR FROM NOW());
BEGIN
    INSERT INTO payment_analytics (date, hour)
    VALUES (v_date, v_hour)
    ON CONFLICT (date, hour) DO NOTHING;
    
    -- Update metrics
    UPDATE payment_analytics
    SET
        total_payments = (
            SELECT COUNT(*) 
            FROM payment_transactions 
            WHERE DATE(created_at) = v_date 
            AND EXTRACT(HOUR FROM created_at) = v_hour
        ),
        successful_payments = (
            SELECT COUNT(*) 
            FROM payment_transactions 
            WHERE DATE(created_at) = v_date 
            AND EXTRACT(HOUR FROM created_at) = v_hour
            AND status = 'paid'
        ),
        failed_payments = (
            SELECT COUNT(*) 
            FROM payment_transactions 
            WHERE DATE(created_at) = v_date 
            AND EXTRACT(HOUR FROM created_at) = v_hour
            AND status = 'failed'
        ),
        total_amount_usd = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payment_transactions
            WHERE DATE(created_at) = v_date
            AND EXTRACT(HOUR FROM created_at) = v_hour
            AND currency = 'USD'
            AND status = 'paid'
        ),
        total_amount_zwg = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payment_transactions
            WHERE DATE(created_at) = v_date
            AND EXTRACT(HOUR FROM created_at) = v_hour
            AND currency = 'ZWG'
            AND status = 'paid'
        ),
        web_payments = (
            SELECT COUNT(*)
            FROM payment_transactions
            WHERE DATE(created_at) = v_date
            AND EXTRACT(HOUR FROM created_at) = v_hour
            AND payment_method = 'web'
        ),
        ecocash_payments = (
            SELECT COUNT(*)
            FROM payment_transactions
            WHERE DATE(created_at) = v_date
            AND EXTRACT(HOUR FROM created_at) = v_hour
            AND payment_method = 'ecocash'
        ),
        onemoney_payments = (
            SELECT COUNT(*)
            FROM payment_transactions
            WHERE DATE(created_at) = v_date
            AND EXTRACT(HOUR FROM created_at) = v_hour
            AND payment_method = 'onemoney'
        ),
        success_rate = (
            CASE 
                WHEN total_payments > 0 THEN 
                    ROUND((successful_payments::DECIMAL / total_payments::DECIMAL) * 100, 2)
                ELSE 0
            END
        ),
        updated_at = NOW()
    WHERE date = v_date AND hour = v_hour;
END;
$$ LANGUAGE plpgsql;

-- Get payment statistics
CREATE OR REPLACE FUNCTION get_payment_statistics(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    total_payments BIGINT,
    successful_payments BIGINT,
    failed_payments BIGINT,
    total_amount_usd DECIMAL,
    total_amount_zwg DECIMAL,
    success_rate DECIMAL,
    average_amount_usd DECIMAL,
    average_amount_zwg DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_payments,
        COUNT(*) FILTER (WHERE status = 'paid')::BIGINT AS successful_payments,
        COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_payments,
        COALESCE(SUM(amount) FILTER (WHERE currency = 'USD' AND status = 'paid'), 0) AS total_amount_usd,
        COALESCE(SUM(amount) FILTER (WHERE currency = 'ZWG' AND status = 'paid'), 0) AS total_amount_zwg,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE status = 'paid')::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
            ELSE 0
        END AS success_rate,
        COALESCE(AVG(amount) FILTER (WHERE currency = 'USD' AND status = 'paid'), 0) AS average_amount_usd,
        COALESCE(AVG(amount) FILTER (WHERE currency = 'ZWG' AND status = 'paid'), 0) AS average_amount_zwg
    FROM payment_transactions
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Auto-expire old pending payments
CREATE OR REPLACE FUNCTION expire_old_payments()
RETURNS void AS $$
BEGIN
    UPDATE payment_transactions
    SET 
        status = 'expired',
        expires_at = NOW()
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Log status changes
CREATE OR REPLACE FUNCTION trigger_log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM log_payment_event(
            NEW.id,
            'status_change',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'timestamp', NOW()
            ),
            OLD.status,
            NEW.status
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_status_change
AFTER UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_log_status_change();

-- ============================================
-- VIEWS
-- ============================================

-- Payment summary by user
CREATE OR REPLACE VIEW v_user_payment_summary AS
SELECT
    u.id AS user_id,
    u.email,
    COUNT(pt.id) AS total_payments,
    COUNT(pt.id) FILTER (WHERE pt.status = 'paid') AS successful_payments,
    COUNT(pt.id) FILTER (WHERE pt.status = 'failed') AS failed_payments,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.currency = 'USD' AND pt.status = 'paid'), 0) AS total_paid_usd,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.currency = 'ZWG' AND pt.status = 'paid'), 0) AS total_paid_zwg,
    MAX(pt.created_at) AS last_payment_date
FROM users u
LEFT JOIN payment_transactions pt ON u.id = pt.user_id
GROUP BY u.id, u.email;

-- Recent payments view
CREATE OR REPLACE VIEW v_recent_payments AS
SELECT
    pt.id,
    pt.reference,
    pt.amount,
    pt.currency,
    pt.status,
    pt.payment_method,
    pt.created_at,
    u.email AS user_email,
    u.first_name,
    u.last_name
FROM payment_transactions pt
JOIN users u ON pt.user_id = u.id
ORDER BY pt.created_at DESC
LIMIT 100;

-- ============================================
-- SAMPLE DATA
-- ============================================

COMMENT ON TABLE payment_transactions IS 'Stores all PayNow payment transactions';
COMMENT ON TABLE payment_logs IS 'Logs all payment events and status changes';
COMMENT ON TABLE payment_webhooks IS 'Stores PayNow webhook callbacks';
COMMENT ON TABLE payment_analytics IS 'Aggregated payment analytics by hour';

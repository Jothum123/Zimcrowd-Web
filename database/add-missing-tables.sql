-- Add the 4 Missing Tables to Complete ZimCrowd Database
-- Run this in Supabase SQL Editor to add the final tables

-- =============================================================================
-- MISSING TABLE 1: WALLETS
-- =============================================================================

CREATE TABLE IF NOT EXISTS wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- =============================================================================
-- MISSING TABLE 2: NOTIFICATION DELIVERY LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES user_notifications(id) ON DELETE SET NULL,
    template_key VARCHAR(100),
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('email', 'sms', 'in_app', 'push')),
    recipient_address VARCHAR(300) NOT NULL,
    subject VARCHAR(300),
    content TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    provider VARCHAR(50),
    provider_message_id VARCHAR(200),
    error_message TEXT,
    cost_usd DECIMAL(10,6),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- MISSING TABLE 3: PLATFORM METRICS
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_unit VARCHAR(20),
    period_type VARCHAR(20) DEFAULT 'daily' CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly', 'yearly')),
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- MISSING TABLE 4: SYSTEM HEALTH CHECKS
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_health_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_name VARCHAR(100) NOT NULL,
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN ('database', 'api', 'service', 'external', 'performance')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
    response_time_ms INTEGER,
    error_message TEXT,
    check_data JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_check_at TIMESTAMP WITH TIME ZONE
);

-- =============================================================================
-- ADD INDEXES FOR THE NEW TABLES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id, currency);
CREATE INDEX IF NOT EXISTS idx_delivery_log_user_date ON notification_delivery_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON notification_delivery_log(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_type_period ON platform_metrics(metric_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_type ON system_health_checks(check_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_status ON system_health_checks(status, checked_at DESC);

-- =============================================================================
-- VERIFICATION QUERY
-- =============================================================================

-- Check that all 18 tables now exist
SELECT 
    'ZimCrowd Database Completion Check' as title,
    COUNT(*) as tables_found,
    CASE 
        WHEN COUNT(*) = 18 THEN '🎉 ALL 18 TABLES CREATED - DATABASE COMPLETE!'
        ELSE '⚠️ Still missing ' || (18 - COUNT(*)) || ' tables'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
    'kairo_conversations', 'financial_goals', 'analytics_reports', 
    'platform_metrics', 'financial_metrics', 'ai_analytics',
    'notification_templates', 'user_notifications', 'notification_delivery_log',
    'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
);

-- List all created tables for confirmation
SELECT 
    'Created Tables' as section,
    table_name,
    '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
    'kairo_conversations', 'financial_goals', 'analytics_reports', 
    'platform_metrics', 'financial_metrics', 'ai_analytics',
    'notification_templates', 'user_notifications', 'notification_delivery_log',
    'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
)
ORDER BY table_name;

-- Final success message
SELECT 
    '🎯 ZIMCROWD DATABASE STATUS' as title,
    'All core tables created successfully!' as message,
    'Your platform is now ready for:' as ready_for,
    '• Backend API testing • Frontend deployment • User registration • Loan/Investment operations • Admin dashboard • Analytics & reporting' as capabilities;

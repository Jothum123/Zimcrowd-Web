-- Admin Dashboard Schema
-- Tables for admin-specific functionality, system monitoring, and management

-- Admin Users and Roles
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_role_id UUID NOT NULL REFERENCES admin_roles(id),
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Admin Activity Log
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT NOT NULL,
    affected_table VARCHAR(100),
    affected_record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Configuration
CREATE TABLE IF NOT EXISTS system_configuration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) DEFAULT 'general',
    updated_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Health Monitoring
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

-- API Rate Limiting and Monitoring
CREATE TABLE IF NOT EXISTS api_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    ip_address INET,
    user_agent TEXT,
    api_key_id UUID,
    rate_limit_hit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Flags and A/B Testing
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flag_key VARCHAR(100) NOT NULL UNIQUE,
    flag_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_audience JSONB DEFAULT '{}',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Segments for Targeting
CREATE TABLE IF NOT EXISTS user_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    segment_name VARCHAR(100) NOT NULL,
    segment_description TEXT,
    criteria JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    user_count INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bulk Operations Queue
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    operation_name VARCHAR(200) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    target_criteria JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]',
    result_data JSONB DEFAULT '{}',
    started_by UUID NOT NULL REFERENCES admin_users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Export Requests
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    export_type VARCHAR(50) NOT NULL,
    export_name VARCHAR(200) NOT NULL,
    table_names TEXT[] NOT NULL,
    filters JSONB DEFAULT '{}',
    format VARCHAR(20) DEFAULT 'csv' CHECK (format IN ('csv', 'excel', 'json', 'pdf')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    file_size_bytes BIGINT,
    expires_at TIMESTAMP WITH TIME ZONE,
    requested_by UUID NOT NULL REFERENCES admin_users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Alerts and Monitoring
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    source_system VARCHAR(100),
    alert_data JSONB DEFAULT '{}',
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES admin_users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES admin_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Dashboard Widgets Configuration
CREATE TABLE IF NOT EXISTS admin_dashboard_widgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL,
    widget_config JSONB NOT NULL DEFAULT '{}',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 1,
    height INTEGER DEFAULT 1,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    report_config JSONB NOT NULL DEFAULT '{}',
    schedule_pattern VARCHAR(50) NOT NULL,
    recipients TEXT[] NOT NULL,
    format VARCHAR(20) DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv')),
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(admin_role_id, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_date ON admin_activity_log(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON admin_activity_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_configuration(config_key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_configuration(category, config_key);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_type ON system_health_checks(check_type, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_status ON system_health_checks(status, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_user_date ON api_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_log_endpoint ON api_usage_log(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled, rollout_percentage);
CREATE INDEX IF NOT EXISTS idx_user_segments_active ON user_segments(is_active, last_calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_started_by ON bulk_operations(started_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(requested_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity, is_resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged ON system_alerts(is_acknowledged, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_dashboard_widgets_user ON admin_dashboard_widgets(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_active ON scheduled_reports(is_active, next_run_at);

-- Default admin roles
INSERT INTO admin_roles (role_name, role_description, permissions) VALUES
('super_admin', 'Super Administrator', '["all"]'),
('admin', 'Administrator', '["users.read", "users.write", "loans.read", "loans.write", "investments.read", "investments.write", "analytics.read", "reports.read", "system.read"]'),
('manager', 'Manager', '["users.read", "loans.read", "loans.write", "investments.read", "analytics.read", "reports.read"]'),
('analyst', 'Data Analyst', '["users.read", "loans.read", "investments.read", "analytics.read", "reports.read"]'),
('support', 'Customer Support', '["users.read", "users.write", "loans.read", "investments.read"]'),
('auditor', 'Auditor', '["users.read", "loans.read", "investments.read", "analytics.read", "reports.read", "audit.read"]')
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Default system configuration
INSERT INTO system_configuration (config_key, config_value, config_type, description, category) VALUES
('platform.maintenance_mode', 'false', 'boolean', 'Enable maintenance mode to restrict user access', 'platform'),
('platform.max_loan_amount', '100000', 'number', 'Maximum loan amount allowed', 'loans'),
('platform.min_loan_amount', '100', 'number', 'Minimum loan amount allowed', 'loans'),
('platform.default_interest_rate', '15.0', 'number', 'Default interest rate for loans', 'loans'),
('platform.max_investment_amount', '1000000', 'number', 'Maximum investment amount allowed', 'investments'),
('platform.min_investment_amount', '50', 'number', 'Minimum investment amount allowed', 'investments'),
('notifications.email_enabled', 'true', 'boolean', 'Enable email notifications', 'notifications'),
('notifications.sms_enabled', 'true', 'boolean', 'Enable SMS notifications', 'notifications'),
('ai.primary_provider', '"openrouter"', 'string', 'Primary AI provider for Kairo AI', 'ai'),
('ai.fallback_enabled', 'true', 'boolean', 'Enable AI fallback to Gemini', 'ai'),
('security.max_login_attempts', '5', 'number', 'Maximum login attempts before lockout', 'security'),
('security.session_timeout_minutes', '60', 'number', 'Session timeout in minutes', 'security'),
('analytics.data_retention_days', '365', 'number', 'Number of days to retain analytics data', 'analytics'),
('reports.auto_generation_enabled', 'true', 'boolean', 'Enable automatic report generation', 'reports')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Default feature flags
INSERT INTO feature_flags (flag_key, flag_name, description, is_enabled, rollout_percentage) VALUES
('new_dashboard_ui', 'New Dashboard UI', 'Enable the new dashboard user interface', false, 0),
('advanced_analytics', 'Advanced Analytics', 'Enable advanced analytics features', true, 100),
('ai_chat_v2', 'AI Chat V2', 'Enable the new AI chat interface', true, 100),
('mobile_app_integration', 'Mobile App Integration', 'Enable mobile app specific features', false, 0),
('real_time_notifications', 'Real-time Notifications', 'Enable real-time notification system', true, 100),
('enhanced_security', 'Enhanced Security', 'Enable enhanced security features', true, 50),
('beta_investment_products', 'Beta Investment Products', 'Enable beta investment products', false, 10)
ON CONFLICT (flag_key) DO UPDATE SET
    flag_name = EXCLUDED.flag_name,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Views for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard_summary AS
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE created_at >= CURRENT_DATE) as new_users_today,
    (SELECT COUNT(*) FROM loans WHERE status = 'pending') as pending_loans,
    (SELECT COUNT(*) FROM investments WHERE created_at >= CURRENT_DATE) as new_investments_today,
    (SELECT COUNT(*) FROM system_alerts WHERE is_resolved = false) as unresolved_alerts,
    (SELECT COUNT(*) FROM bulk_operations WHERE status = 'processing') as active_bulk_operations,
    (SELECT AVG(response_time_ms) FROM system_health_checks WHERE checked_at >= NOW() - INTERVAL '1 hour') as avg_system_response_time;

CREATE OR REPLACE VIEW system_health_overview AS
SELECT 
    check_type,
    COUNT(*) as total_checks,
    COUNT(*) FILTER (WHERE status = 'healthy') as healthy_count,
    COUNT(*) FILTER (WHERE status = 'warning') as warning_count,
    COUNT(*) FILTER (WHERE status = 'critical') as critical_count,
    AVG(response_time_ms) as avg_response_time,
    MAX(checked_at) as last_check_time
FROM system_health_checks
WHERE checked_at >= NOW() - INTERVAL '24 hours'
GROUP BY check_type;

CREATE OR REPLACE VIEW api_usage_summary AS
SELECT 
    DATE(created_at) as date,
    endpoint,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
    COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
    AVG(response_time_ms) as avg_response_time,
    COUNT(*) FILTER (WHERE rate_limit_hit = true) as rate_limited_requests
FROM api_usage_log
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), endpoint
ORDER BY date DESC, total_requests DESC;

-- Functions for admin operations
CREATE OR REPLACE FUNCTION log_admin_activity(
    admin_id UUID,
    action_type VARCHAR(50),
    action_description TEXT,
    affected_table VARCHAR(100) DEFAULT NULL,
    affected_record_id UUID DEFAULT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_activity_log (
        admin_user_id, action_type, action_description, 
        affected_table, affected_record_id, old_values, new_values
    ) VALUES (
        admin_id, action_type, action_description,
        affected_table, affected_record_id, old_values, new_values
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_system_health_score()
RETURNS DECIMAL(5,2) AS $$
DECLARE
    health_score DECIMAL(5,2) := 0;
    total_checks INTEGER;
    healthy_checks INTEGER;
    critical_checks INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'healthy'),
        COUNT(*) FILTER (WHERE status = 'critical')
    INTO total_checks, healthy_checks, critical_checks
    FROM system_health_checks
    WHERE checked_at >= NOW() - INTERVAL '1 hour';
    
    IF total_checks = 0 THEN
        RETURN 0;
    END IF;
    
    -- Base score from healthy checks
    health_score := (healthy_checks::DECIMAL / total_checks) * 80;
    
    -- Penalty for critical issues
    health_score := health_score - (critical_checks * 20);
    
    -- Ensure score is between 0 and 100
    RETURN GREATEST(0, LEAST(100, health_score));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_feature_flag(flag_key VARCHAR(100), user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    flag_record RECORD;
    user_in_audience BOOLEAN := true;
BEGIN
    SELECT * INTO flag_record
    FROM feature_flags
    WHERE feature_flags.flag_key = check_feature_flag.flag_key
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW());
    
    IF NOT FOUND OR NOT flag_record.is_enabled THEN
        RETURN false;
    END IF;
    
    -- Check rollout percentage
    IF flag_record.rollout_percentage < 100 THEN
        -- Simple hash-based rollout
        IF (hashtext(flag_key || COALESCE(user_id::TEXT, '')) % 100) >= flag_record.rollout_percentage THEN
            RETURN false;
        END IF;
    END IF;
    
    -- TODO: Add target audience checking based on user_id and target_audience JSON
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Triggers for audit logging
CREATE OR REPLACE FUNCTION audit_admin_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log changes to sensitive tables
    IF TG_TABLE_NAME IN ('loans', 'investments', 'user_profiles', 'system_configuration') THEN
        INSERT INTO admin_activity_log (
            admin_user_id, action_type, action_description,
            affected_table, affected_record_id, old_values, new_values
        ) VALUES (
            COALESCE(current_setting('app.current_admin_id', true)::UUID, '00000000-0000-0000-0000-000000000000'),
            TG_OP,
            TG_OP || ' operation on ' || TG_TABLE_NAME,
            TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE admin_roles IS 'Admin user roles and their permissions';
COMMENT ON TABLE admin_users IS 'Admin users with their roles and metadata';
COMMENT ON TABLE admin_activity_log IS 'Audit log of all admin actions';
COMMENT ON TABLE system_configuration IS 'System-wide configuration settings';
COMMENT ON TABLE system_health_checks IS 'System health monitoring data';
COMMENT ON TABLE api_usage_log IS 'API usage tracking and rate limiting';
COMMENT ON TABLE feature_flags IS 'Feature flags for gradual rollouts and A/B testing';
COMMENT ON TABLE user_segments IS 'User segmentation for targeting and analytics';
COMMENT ON TABLE bulk_operations IS 'Queue for bulk operations like mass updates';
COMMENT ON TABLE data_export_requests IS 'Data export requests and their status';
COMMENT ON TABLE system_alerts IS 'System alerts and monitoring notifications';
COMMENT ON TABLE admin_dashboard_widgets IS 'Customizable admin dashboard widget configurations';
COMMENT ON TABLE scheduled_reports IS 'Scheduled report generation and delivery';

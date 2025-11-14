-- ZimCrowd Complete Platform Schema
-- Execute this file in Supabase SQL Editor to create all tables
-- This includes: Core tables, Kairo AI, Analytics, Notifications, and Admin Dashboard

-- =============================================================================
-- CORE PLATFORM TABLES (from schema.sql)
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Zimbabwe',
    postal_code VARCHAR(20),
    profile_picture_url TEXT,
    employment_status VARCHAR(50),
    employer_name VARCHAR(200),
    monthly_income DECIMAL(15,2),
    zimscore INTEGER DEFAULT 300 CHECK (zimscore >= 300 AND zimscore <= 850),
    is_verified BOOLEAN DEFAULT FALSE,
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'approved', 'rejected')),
    kyc_documents JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_type VARCHAR(50) NOT NULL CHECK (loan_type IN ('personal', 'business', 'emergency', 'asset_backed')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5,4) NOT NULL CHECK (interest_rate > 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(15,2) NOT NULL CHECK (monthly_payment > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'active', 'completed', 'defaulted')),
    purpose TEXT,
    collateral_description TEXT,
    application_data JSONB DEFAULT '{}',
    approval_data JSONB DEFAULT '{}',
    disbursement_date TIMESTAMP WITH TIME ZONE,
    first_payment_date DATE,
    final_payment_date DATE,
    outstanding_balance DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investments Table
CREATE TABLE IF NOT EXISTS investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_type VARCHAR(50) NOT NULL CHECK (investment_type IN ('money_market', 'treasury_bills', 'equity_funds', 'international_funds', 'high_yield_bonds')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    expected_return_rate DECIMAL(5,4) NOT NULL CHECK (expected_return_rate > 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matured', 'withdrawn', 'cancelled')),
    start_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    current_value DECIMAL(15,2),
    total_returns DECIMAL(15,2) DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_id VARCHAR(100) UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets Table
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
-- KAIRO AI TABLES
-- =============================================================================

-- Kairo AI Conversations Table
CREATE TABLE IF NOT EXISTS kairo_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    intent VARCHAR(50),
    context JSONB DEFAULT '{}',
    sentiment VARCHAR(20) DEFAULT 'neutral',
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Goals Table
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL CHECK (goal_type IN ('emergency_fund', 'investment', 'loan_payoff', 'major_purchase', 'retirement')),
    title VARCHAR(200),
    description TEXT,
    target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15,2) DEFAULT 0 CHECK (current_amount >= 0),
    timeframe_months INTEGER NOT NULL CHECK (timeframe_months > 0),
    monthly_target DECIMAL(15,2) NOT NULL CHECK (monthly_target > 0),
    strategy JSONB DEFAULT '[]',
    milestones JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- ANALYTICS TABLES
-- =============================================================================

-- Analytics Reports Table
CREATE TABLE IF NOT EXISTS analytics_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('financial', 'user_activity', 'loan_performance', 'investment_performance', 'risk_analysis', 'compliance')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    generated_by UUID REFERENCES auth.users(id),
    report_data JSONB NOT NULL DEFAULT '{}',
    parameters JSONB DEFAULT '{}',
    date_range_start DATE,
    date_range_end DATE,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Metrics Table
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

-- Financial Performance Metrics
CREATE TABLE IF NOT EXISTS financial_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    loan_revenue DECIMAL(15,2) DEFAULT 0,
    investment_revenue DECIMAL(15,2) DEFAULT 0,
    fee_revenue DECIMAL(15,2) DEFAULT 0,
    total_expenses DECIMAL(15,2) DEFAULT 0,
    net_profit DECIMAL(15,2) DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    total_loans_disbursed DECIMAL(15,2) DEFAULT 0,
    total_investments DECIMAL(15,2) DEFAULT 0,
    default_rate DECIMAL(5,4) DEFAULT 0,
    average_zimscore DECIMAL(5,2) DEFAULT 0,
    platform_health_score DECIMAL(5,2) DEFAULT 0,
    customer_satisfaction DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(metric_date)
);

-- AI Analytics
CREATE TABLE IF NOT EXISTS ai_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_provider VARCHAR(50) NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    response_time_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    tokens_used INTEGER,
    cost_usd DECIMAL(10,6),
    user_id UUID REFERENCES auth.users(id),
    conversation_id UUID REFERENCES kairo_conversations(id),
    model_used VARCHAR(100),
    fallback_used BOOLEAN DEFAULT FALSE,
    quality_score DECIMAL(3,2),
    user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5)
);

-- =============================================================================
-- NOTIFICATIONS TABLES
-- =============================================================================

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    template_name VARCHAR(200) NOT NULL,
    template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('email', 'sms', 'in_app', 'push')),
    subject VARCHAR(300),
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Notifications Table
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    category VARCHAR(50) DEFAULT 'general',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Delivery Log
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
-- ADMIN DASHBOARD TABLES
-- =============================================================================

-- Admin Roles
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Users
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

-- System Health Checks
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
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Core table indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_zimscore ON user_profiles(zimscore DESC);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status, maturity_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id, currency);

-- Kairo AI indexes
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_user_date ON kairo_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id, status);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type_date ON analytics_reports(report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_type_period ON platform_metrics(metric_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_date ON financial_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_timestamp ON ai_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_provider ON ai_analytics(ai_provider, timestamp DESC);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_date ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_user_date ON notification_delivery_log(user_id, created_at DESC);

-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_configuration(config_key);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_type ON system_health_checks(check_type, checked_at DESC);

-- =============================================================================
-- DEFAULT DATA
-- =============================================================================

-- Insert default admin roles
INSERT INTO admin_roles (role_name, role_description, permissions) VALUES
('super_admin', 'Super Administrator', '["all"]'),
('admin', 'Administrator', '["users.read", "users.write", "loans.read", "loans.write", "investments.read", "investments.write", "analytics.read", "reports.read", "system.read"]'),
('manager', 'Manager', '["users.read", "loans.read", "loans.write", "investments.read", "analytics.read", "reports.read"]'),
('analyst', 'Data Analyst', '["users.read", "loans.read", "investments.read", "analytics.read", "reports.read"]'),
('support', 'Customer Support', '["users.read", "users.write", "loans.read", "investments.read"]')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default system configuration
INSERT INTO system_configuration (config_key, config_value, config_type, description, category) VALUES
('platform.maintenance_mode', 'false', 'boolean', 'Enable maintenance mode to restrict user access', 'platform'),
('platform.max_loan_amount', '100000', 'number', 'Maximum loan amount allowed', 'loans'),
('platform.min_loan_amount', '100', 'number', 'Minimum loan amount allowed', 'loans'),
('ai.primary_provider', '"openrouter"', 'string', 'Primary AI provider for Kairo AI', 'ai'),
('ai.fallback_enabled', 'true', 'boolean', 'Enable AI fallback to Gemini', 'ai')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (template_key, template_name, template_type, subject, content, variables) VALUES
('welcome', 'Welcome to ZimCrowd', 'email', '🎊 Welcome to ZimCrowd!',
'<h2>Welcome to ZimCrowd, {{user_name}}!</h2>
<p>Thank you for joining Zimbabwe''s leading financial platform.</p>',
'["user_name"]'),
('loan_approved', 'Loan Approval Notification', 'email', '🎉 Your ZimCrowd Loan Has Been Approved!', 
'<h2>Congratulations {{user_name}}!</h2>
<p>Your loan application for <strong>${{loan_amount}}</strong> has been approved.</p>',
'["user_name", "loan_amount"]')
ON CONFLICT (template_key) DO NOTHING;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE user_profiles IS 'User profile information and KYC data';
COMMENT ON TABLE loans IS 'Loan applications and management';
COMMENT ON TABLE investments IS 'Investment products and portfolio management';
COMMENT ON TABLE kairo_conversations IS 'AI chat conversations and history';
COMMENT ON TABLE analytics_reports IS 'Business intelligence and analytics reports';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates';
COMMENT ON TABLE admin_roles IS 'Admin user roles and permissions';
COMMENT ON TABLE system_configuration IS 'System-wide configuration settings';

-- Schema creation completed successfully
SELECT 'ZimCrowd Complete Platform Schema created successfully!' as status;

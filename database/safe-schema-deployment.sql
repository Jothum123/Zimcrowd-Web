-- Safe ZimCrowd Schema Deployment
-- This version handles existing tables and prevents conflicts

-- =============================================================================
-- ENABLE EXTENSIONS SAFELY
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- CORE TABLES (Skip if they already exist)
-- =============================================================================

-- Only create user_profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        CREATE TABLE user_profiles (
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
    END IF;
END $$;

-- Only create loans if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') THEN
        CREATE TABLE loans (
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
    END IF;
END $$;

-- Only create investments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investments') THEN
        CREATE TABLE investments (
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
    END IF;
END $$;

-- =============================================================================
-- NEW TABLES (AI, Analytics, Notifications, Admin)
-- =============================================================================

-- Kairo AI Conversations
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

-- Financial Goals
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

-- Analytics Reports
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

-- Financial Metrics
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

-- Notification Templates
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

-- User Notifications
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

-- =============================================================================
-- INDEXES (Create only if they don't exist)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_user_date ON kairo_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user ON financial_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type_date ON analytics_reports(report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_date ON financial_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_timestamp ON ai_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_date ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_configuration(config_key);

-- =============================================================================
-- DEFAULT DATA (Insert only if not exists)
-- =============================================================================

-- Insert default admin roles
INSERT INTO admin_roles (role_name, role_description, permissions) 
SELECT 'super_admin', 'Super Administrator', '["all"]'
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE role_name = 'super_admin');

INSERT INTO admin_roles (role_name, role_description, permissions) 
SELECT 'admin', 'Administrator', '["users.read", "users.write", "loans.read", "loans.write", "investments.read", "investments.write", "analytics.read"]'
WHERE NOT EXISTS (SELECT 1 FROM admin_roles WHERE role_name = 'admin');

-- Insert default system configuration
INSERT INTO system_configuration (config_key, config_value, config_type, description, category) 
SELECT 'platform.maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', 'platform'
WHERE NOT EXISTS (SELECT 1 FROM system_configuration WHERE config_key = 'platform.maintenance_mode');

INSERT INTO system_configuration (config_key, config_value, config_type, description, category) 
SELECT 'ai.primary_provider', '"openrouter"', 'string', 'Primary AI provider', 'ai'
WHERE NOT EXISTS (SELECT 1 FROM system_configuration WHERE config_key = 'ai.primary_provider');

-- Insert default notification templates
INSERT INTO notification_templates (template_key, template_name, template_type, subject, content, variables) 
SELECT 'welcome', 'Welcome to ZimCrowd', 'email', '🎊 Welcome to ZimCrowd!', 
'<h2>Welcome to ZimCrowd, {{user_name}}!</h2><p>Thank you for joining Zimbabwe''s leading financial platform.</p>', 
'["user_name"]'
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE template_key = 'welcome');

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT 
    'ZimCrowd Database Setup Complete!' as status,
    'Run ultra-simple-check.sql to verify all tables created' as next_step;

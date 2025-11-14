-- Analytics and Business Intelligence Schema
-- Tables for comprehensive platform analytics and reporting

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

-- Platform Metrics Table (for real-time dashboard data)
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

-- User Analytics Table
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_url TEXT,
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    city VARCHAR(100),
    device_type VARCHAR(20),
    browser VARCHAR(50),
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

-- Loan Performance Analytics
CREATE TABLE IF NOT EXISTS loan_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL,
    days_since_disbursement INTEGER,
    payment_performance_score DECIMAL(5,2),
    risk_score DECIMAL(5,2),
    predicted_default_probability DECIMAL(5,4),
    actual_vs_expected_payment DECIMAL(10,2),
    borrower_engagement_score DECIMAL(5,2),
    external_risk_factors JSONB DEFAULT '{}',
    ai_insights TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investment Performance Analytics
CREATE TABLE IF NOT EXISTS investment_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
    analysis_date DATE NOT NULL,
    current_value DECIMAL(15,2) NOT NULL,
    return_rate DECIMAL(8,4),
    risk_adjusted_return DECIMAL(8,4),
    benchmark_comparison DECIMAL(8,4),
    volatility DECIMAL(8,4),
    sharpe_ratio DECIMAL(8,4),
    market_conditions JSONB DEFAULT '{}',
    performance_attribution JSONB DEFAULT '{}',
    ai_recommendations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI System Analytics
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

-- Risk Analytics Table
CREATE TABLE IF NOT EXISTS risk_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    analysis_date DATE NOT NULL,
    risk_type VARCHAR(50) NOT NULL CHECK (risk_type IN ('credit', 'market', 'operational', 'liquidity', 'regulatory')),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    affected_portfolios JSONB DEFAULT '[]',
    mitigation_strategies JSONB DEFAULT '[]',
    potential_impact DECIMAL(15,2),
    probability DECIMAL(5,4),
    risk_factors JSONB DEFAULT '{}',
    recommendations TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'accepted', 'transferred')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance Analytics
CREATE TABLE IF NOT EXISTS compliance_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    check_date DATE NOT NULL,
    regulation_type VARCHAR(100) NOT NULL,
    compliance_area VARCHAR(100) NOT NULL,
    compliance_score DECIMAL(5,2) NOT NULL CHECK (compliance_score >= 0 AND compliance_score <= 100),
    violations_count INTEGER DEFAULT 0,
    violations_details JSONB DEFAULT '[]',
    remediation_actions JSONB DEFAULT '[]',
    next_review_date DATE,
    responsible_officer VARCHAR(100),
    status VARCHAR(20) DEFAULT 'compliant' CHECK (status IN ('compliant', 'non_compliant', 'under_review', 'remediated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_reports_type_date ON analytics_reports(report_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_type_period ON platform_metrics(metric_type, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_date ON user_analytics(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event ON user_analytics(event_type, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_date ON financial_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_loan_analytics_loan_date ON loan_analytics(loan_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_analytics_investment_date ON investment_analytics(investment_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_timestamp ON ai_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analytics_provider ON ai_analytics(ai_provider, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_analytics_date_type ON risk_analytics(analysis_date DESC, risk_type);
CREATE INDEX IF NOT EXISTS idx_compliance_analytics_date ON compliance_analytics(check_date DESC);

-- Views for common analytics queries
CREATE OR REPLACE VIEW daily_platform_summary AS
SELECT 
    metric_date,
    total_revenue,
    net_profit,
    active_users,
    new_users,
    total_loans_disbursed,
    total_investments,
    default_rate,
    average_zimscore,
    platform_health_score,
    customer_satisfaction
FROM financial_metrics
ORDER BY metric_date DESC;

CREATE OR REPLACE VIEW ai_performance_summary AS
SELECT 
    DATE(timestamp) as date,
    ai_provider,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    ROUND(AVG(response_time_ms), 2) as avg_response_time,
    ROUND(AVG(quality_score), 2) as avg_quality_score,
    SUM(cost_usd) as total_cost
FROM ai_analytics
GROUP BY DATE(timestamp), ai_provider
ORDER BY date DESC, ai_provider;

CREATE OR REPLACE VIEW loan_performance_summary AS
SELECT 
    DATE_TRUNC('month', analysis_date) as month,
    COUNT(*) as loans_analyzed,
    ROUND(AVG(payment_performance_score), 2) as avg_payment_score,
    ROUND(AVG(risk_score), 2) as avg_risk_score,
    ROUND(AVG(predicted_default_probability), 4) as avg_default_probability
FROM loan_analytics
GROUP BY DATE_TRUNC('month', analysis_date)
ORDER BY month DESC;

-- Functions for analytics calculations
CREATE OR REPLACE FUNCTION calculate_platform_health_score(check_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    health_score DECIMAL(5,2) := 0;
    user_growth_score DECIMAL(5,2);
    financial_score DECIMAL(5,2);
    risk_score DECIMAL(5,2);
    ai_score DECIMAL(5,2);
BEGIN
    -- User growth component (25%)
    SELECT COALESCE(
        CASE 
            WHEN new_users > 100 THEN 25
            WHEN new_users > 50 THEN 20
            WHEN new_users > 20 THEN 15
            ELSE 10
        END, 10
    ) INTO user_growth_score
    FROM financial_metrics 
    WHERE metric_date = check_date;
    
    -- Financial performance component (35%)
    SELECT COALESCE(
        CASE 
            WHEN net_profit > 100000 THEN 35
            WHEN net_profit > 50000 THEN 30
            WHEN net_profit > 0 THEN 25
            ELSE 15
        END, 15
    ) INTO financial_score
    FROM financial_metrics 
    WHERE metric_date = check_date;
    
    -- Risk component (25%)
    SELECT COALESCE(
        CASE 
            WHEN default_rate < 0.02 THEN 25
            WHEN default_rate < 0.05 THEN 20
            WHEN default_rate < 0.10 THEN 15
            ELSE 10
        END, 15
    ) INTO risk_score
    FROM financial_metrics 
    WHERE metric_date = check_date;
    
    -- AI performance component (15%)
    SELECT COALESCE(
        CASE 
            WHEN AVG(quality_score) > 4.5 THEN 15
            WHEN AVG(quality_score) > 4.0 THEN 12
            WHEN AVG(quality_score) > 3.5 THEN 10
            ELSE 8
        END, 10
    ) INTO ai_score
    FROM ai_analytics 
    WHERE DATE(timestamp) = check_date;
    
    health_score := COALESCE(user_growth_score, 0) + 
                   COALESCE(financial_score, 0) + 
                   COALESCE(risk_score, 0) + 
                   COALESCE(ai_score, 0);
    
    RETURN LEAST(health_score, 100.00);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update platform health score daily
CREATE OR REPLACE FUNCTION update_platform_health_score()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE financial_metrics 
    SET platform_health_score = calculate_platform_health_score(NEW.metric_date)
    WHERE metric_date = NEW.metric_date;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_health
    AFTER INSERT OR UPDATE ON financial_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_health_score();

-- Comments for documentation
COMMENT ON TABLE analytics_reports IS 'Stores generated analytics reports and their metadata';
COMMENT ON TABLE platform_metrics IS 'Real-time platform metrics for dashboard displays';
COMMENT ON TABLE user_analytics IS 'User behavior and interaction tracking';
COMMENT ON TABLE financial_metrics IS 'Daily financial performance metrics';
COMMENT ON TABLE loan_analytics IS 'Detailed loan performance analysis';
COMMENT ON TABLE investment_analytics IS 'Investment portfolio performance tracking';
COMMENT ON TABLE ai_analytics IS 'AI system performance and usage analytics';
COMMENT ON TABLE risk_analytics IS 'Risk assessment and monitoring data';
COMMENT ON TABLE compliance_analytics IS 'Regulatory compliance tracking';

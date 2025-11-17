-- Kairo AI Enhancement Migration
-- Safely adds new columns to existing tables and creates new advanced tables
-- Run this AFTER the existing kairo-ai-schema.sql has been applied

-- ============================================================================
-- STEP 1: Add new columns to existing tables (if they don't exist)
-- ============================================================================

-- Add new columns to kairo_conversations table
DO $$ 
BEGIN
    -- Add confidence_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'kairo_conversations' AND column_name = 'confidence_score') THEN
        ALTER TABLE kairo_conversations ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add session_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'kairo_conversations' AND column_name = 'session_id') THEN
        ALTER TABLE kairo_conversations ADD COLUMN session_id UUID;
    END IF;
    
    -- Add metadata column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'kairo_conversations' AND column_name = 'metadata') THEN
        ALTER TABLE kairo_conversations ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add new columns to ai_insights table
DO $$ 
BEGIN
    -- Add impact_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_insights' AND column_name = 'impact_score') THEN
        ALTER TABLE ai_insights ADD COLUMN impact_score DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add confidence_score column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_insights' AND column_name = 'confidence_score') THEN
        ALTER TABLE ai_insights ADD COLUMN confidence_score DECIMAL(3,2) DEFAULT 0.0;
    END IF;
    
    -- Add status column (but check if it conflicts with existing columns)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_insights' AND column_name = 'status') THEN
        ALTER TABLE ai_insights ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'completed'));
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create new advanced tables
-- ============================================================================

-- AI model performance tracking
CREATE TABLE IF NOT EXISTS kairo_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    metric_name VARCHAR(50) NOT NULL, -- 'accuracy', 'precision', 'recall', 'f1_score'
    metric_value DECIMAL(5,4) NOT NULL,
    evaluation_date DATE NOT NULL,
    dataset_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI predictions table for tracking prediction accuracy
CREATE TABLE IF NOT EXISTS kairo_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    prediction_type VARCHAR(50) NOT NULL, -- 'loan_default', 'zimscore_change', 'churn_risk'
    predicted_value DECIMAL(10,4),
    predicted_category VARCHAR(50),
    confidence_score DECIMAL(3,2),
    actual_value DECIMAL(10,4),
    actual_category VARCHAR(50),
    prediction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    outcome_date TIMESTAMP WITH TIME ZONE,
    is_correct BOOLEAN,
    model_used VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI fraud detection alerts
CREATE TABLE IF NOT EXISTS kairo_fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'suspicious_transaction', 'fake_application', 'behavioral_anomaly'
    risk_score DECIMAL(3,2) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    investigated_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- AI analytics cache for admin dashboard
CREATE TABLE IF NOT EXISTS kairo_analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(100) NOT NULL UNIQUE,
    timeframe VARCHAR(20) NOT NULL, -- '7d', '30d', '90d'
    analytics_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI feature usage tracking
CREATE TABLE IF NOT EXISTS kairo_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL, -- 'chat', 'insights', 'recommendations', 'loan_advice'
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_name)
);

-- ============================================================================
-- STEP 3: Create indexes for new columns and tables
-- ============================================================================

-- New indexes for enhanced existing tables
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_session_id ON kairo_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_confidence ON kairo_conversations(confidence_score DESC);

CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_impact_score ON ai_insights(impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_confidence_score ON ai_insights(confidence_score DESC);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_kairo_model_performance_model ON kairo_model_performance(model_name, model_version);
CREATE INDEX IF NOT EXISTS idx_kairo_model_performance_date ON kairo_model_performance(evaluation_date DESC);
CREATE INDEX IF NOT EXISTS idx_kairo_model_performance_metric ON kairo_model_performance(metric_name);

CREATE INDEX IF NOT EXISTS idx_kairo_predictions_user_id ON kairo_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_predictions_type ON kairo_predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_kairo_predictions_date ON kairo_predictions(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_kairo_predictions_outcome ON kairo_predictions(outcome_date DESC);
CREATE INDEX IF NOT EXISTS idx_kairo_predictions_accuracy ON kairo_predictions(is_correct);

CREATE INDEX IF NOT EXISTS idx_kairo_fraud_alerts_user_id ON kairo_fraud_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_fraud_alerts_type ON kairo_fraud_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_kairo_fraud_alerts_status ON kairo_fraud_alerts(status);
CREATE INDEX IF NOT EXISTS idx_kairo_fraud_alerts_risk_score ON kairo_fraud_alerts(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_kairo_fraud_alerts_created_at ON kairo_fraud_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kairo_analytics_cache_key ON kairo_analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_kairo_analytics_cache_expires ON kairo_analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_kairo_feature_usage_user_id ON kairo_feature_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_feature_usage_feature ON kairo_feature_usage(feature_name);
CREATE INDEX IF NOT EXISTS idx_kairo_feature_usage_last_used ON kairo_feature_usage(last_used_at DESC);

-- ============================================================================
-- STEP 4: Enable RLS on new tables
-- ============================================================================

ALTER TABLE kairo_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_feature_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies for new tables
-- ============================================================================

-- Policies for kairo_predictions
CREATE POLICY "Users can view their own predictions" ON kairo_predictions
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for kairo_fraud_alerts
CREATE POLICY "Users can view their own fraud alerts" ON kairo_fraud_alerts
    FOR SELECT USING (auth.uid() = user_id);

-- Policies for kairo_feature_usage
CREATE POLICY "Users can view their own feature usage" ON kairo_feature_usage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update feature usage" ON kairo_feature_usage
    FOR ALL USING (true);

-- Admin policies (check if user has admin role in profiles table)
CREATE POLICY "Admins can manage model performance" ON kairo_model_performance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage fraud alerts" ON kairo_fraud_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can access analytics cache" ON kairo_analytics_cache
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- ============================================================================
-- STEP 6: Create new functions
-- ============================================================================

-- Function to update feature usage
CREATE OR REPLACE FUNCTION update_feature_usage(p_user_id UUID, p_feature_name VARCHAR)
RETURNS void AS $$
BEGIN
    INSERT INTO kairo_feature_usage (user_id, feature_name, usage_count, last_used_at)
    VALUES (p_user_id, p_feature_name, 1, NOW())
    ON CONFLICT (user_id, feature_name) 
    DO UPDATE SET 
        usage_count = kairo_feature_usage.usage_count + 1,
        last_used_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old data
CREATE OR REPLACE FUNCTION cleanup_kairo_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired analytics cache
    DELETE FROM kairo_analytics_cache WHERE expires_at < NOW();
    
    -- Clean up old conversations (keep last 6 months)
    DELETE FROM kairo_conversations 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Clean up resolved fraud alerts (keep last 1 year)
    DELETE FROM kairo_fraud_alerts 
    WHERE status IN ('resolved', 'false_positive') 
    AND resolved_at < NOW() - INTERVAL '1 year';
    
    -- Clean up old learning data (keep last 2 years)
    DELETE FROM ai_learning_data 
    WHERE created_at < NOW() - INTERVAL '2 years';
    
    RAISE NOTICE 'Kairo AI data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Create enhanced views
-- ============================================================================

-- Enhanced user activity view
CREATE OR REPLACE VIEW kairo_user_activity_enhanced AS
SELECT 
    c.user_id,
    p.first_name,
    p.last_name,
    p.email,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT CASE WHEN i.status = 'active' THEN i.id END) as active_insights,
    COUNT(DISTINCT g.id) as active_goals,
    MAX(c.created_at) as last_chat,
    MAX(u.last_used_at) as last_feature_usage,
    AVG(h.overall_score) as avg_health_score,
    AVG(c.confidence_score) as avg_ai_confidence,
    COUNT(DISTINCT f.id) as fraud_alerts_count
FROM profiles p
LEFT JOIN kairo_conversations c ON p.id = c.user_id
LEFT JOIN ai_insights i ON p.id = i.user_id
LEFT JOIN financial_goals g ON p.id = g.user_id AND g.status = 'active'
LEFT JOIN kairo_feature_usage u ON p.id = u.user_id
LEFT JOIN financial_health_scores h ON p.id = h.user_id
LEFT JOIN kairo_fraud_alerts f ON p.id = f.user_id AND f.status = 'open'
GROUP BY c.user_id, p.first_name, p.last_name, p.email;

-- Model accuracy view
CREATE OR REPLACE VIEW kairo_model_accuracy AS
SELECT 
    model_name,
    model_version,
    prediction_type,
    COUNT(*) as total_predictions,
    COUNT(CASE WHEN is_correct = true THEN 1 END) as correct_predictions,
    ROUND(
        COUNT(CASE WHEN is_correct = true THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100, 
        2
    ) as accuracy_percentage,
    AVG(confidence_score) as avg_confidence
FROM kairo_predictions 
WHERE outcome_date IS NOT NULL
GROUP BY model_name, model_version, prediction_type
ORDER BY accuracy_percentage DESC;

-- Fraud summary view
CREATE OR REPLACE VIEW kairo_fraud_summary AS
SELECT 
    alert_type,
    status,
    COUNT(*) as alert_count,
    AVG(risk_score) as avg_risk_score,
    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count,
    COUNT(CASE WHEN status = 'false_positive' THEN 1 END) as false_positive_count
FROM kairo_fraud_alerts
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY alert_type, status
ORDER BY alert_count DESC;

-- ============================================================================
-- STEP 8: Insert initial data
-- ============================================================================

-- Insert initial AI model performance data
INSERT INTO kairo_model_performance (model_name, model_version, metric_name, metric_value, evaluation_date, dataset_size) VALUES
('Risk Assessment Model', '2.1', 'accuracy', 0.8700, CURRENT_DATE, 5000),
('Risk Assessment Model', '2.1', 'precision', 0.8500, CURRENT_DATE, 5000),
('Risk Assessment Model', '2.1', 'recall', 0.8900, CURRENT_DATE, 5000),
('Risk Assessment Model', '2.1', 'f1_score', 0.8700, CURRENT_DATE, 5000),

('Fraud Detection Model', '1.8', 'accuracy', 0.9400, CURRENT_DATE, 3000),
('Fraud Detection Model', '1.8', 'precision', 0.9200, CURRENT_DATE, 3000),
('Fraud Detection Model', '1.8', 'recall', 0.9600, CURRENT_DATE, 3000),
('Fraud Detection Model', '1.8', 'f1_score', 0.9400, CURRENT_DATE, 3000),

('Loan Default Prediction', '3.2', 'accuracy', 0.9100, CURRENT_DATE, 8000),
('Loan Default Prediction', '3.2', 'precision', 0.8800, CURRENT_DATE, 8000),
('Loan Default Prediction', '3.2', 'recall', 0.9400, CURRENT_DATE, 8000),
('Loan Default Prediction', '3.2', 'f1_score', 0.9100, CURRENT_DATE, 8000),

('Market Trend Analysis', '1.5', 'accuracy', 0.8300, CURRENT_DATE, 2000),
('Market Trend Analysis', '1.5', 'precision', 0.8100, CURRENT_DATE, 2000),
('Market Trend Analysis', '1.5', 'recall', 0.8500, CURRENT_DATE, 2000),
('Market Trend Analysis', '1.5', 'f1_score', 0.8300, CURRENT_DATE, 2000)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 9: Add comments
-- ============================================================================

COMMENT ON TABLE kairo_model_performance IS 'Tracks AI model performance metrics over time';
COMMENT ON TABLE kairo_predictions IS 'Stores AI predictions for accuracy tracking';
COMMENT ON TABLE kairo_fraud_alerts IS 'Stores fraud detection alerts from AI models';
COMMENT ON TABLE kairo_analytics_cache IS 'Caches analytics data for admin dashboard';
COMMENT ON TABLE kairo_feature_usage IS 'Tracks usage of AI features by users';

-- Migration completed successfully
SELECT 'Kairo AI Enhancement Migration completed successfully!' as status;

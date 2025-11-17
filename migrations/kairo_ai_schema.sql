-- Kairo AI Database Schema
-- Tables and indexes for AI-powered features

-- Kairo conversations table for chat history
CREATE TABLE IF NOT EXISTS kairo_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    intent VARCHAR(50),
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    session_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI insights cache table for performance
CREATE TABLE IF NOT EXISTS kairo_user_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    insights_data JSONB NOT NULL,
    health_score INTEGER,
    risk_level VARCHAR(20),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AI recommendations table
CREATE TABLE IF NOT EXISTS kairo_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL, -- 'loan', 'investment', 'zimscore', 'financial_planning'
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'dismissed', 'completed'
    impact_score DECIMAL(3,2) DEFAULT 0.0,
    confidence_score DECIMAL(3,2) DEFAULT 0.0,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- 'suspicious_transaction', 'fake_application', 'behavioral_anomaly'
    risk_score DECIMAL(3,2) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
    investigated_by UUID REFERENCES profiles(id),
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
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL, -- 'chat', 'insights', 'recommendations', 'loan_advice'
    usage_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_name)
);

-- AI training data for model improvement
CREATE TABLE IF NOT EXISTS kairo_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type VARCHAR(50) NOT NULL, -- 'conversation', 'prediction', 'recommendation_feedback'
    input_data JSONB NOT NULL,
    expected_output JSONB,
    actual_output JSONB,
    quality_score DECIMAL(3,2),
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by UUID REFERENCES profiles(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_user_id ON kairo_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_created_at ON kairo_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_intent ON kairo_conversations(intent);
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_session_id ON kairo_conversations(session_id);

CREATE INDEX IF NOT EXISTS idx_kairo_user_insights_user_id ON kairo_user_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_user_insights_expires_at ON kairo_user_insights(expires_at);
CREATE INDEX IF NOT EXISTS idx_kairo_user_insights_health_score ON kairo_user_insights(health_score);

CREATE INDEX IF NOT EXISTS idx_kairo_recommendations_user_id ON kairo_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_recommendations_type ON kairo_recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_kairo_recommendations_status ON kairo_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_kairo_recommendations_priority ON kairo_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_kairo_recommendations_created_at ON kairo_recommendations(created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_kairo_training_data_type ON kairo_training_data(data_type);
CREATE INDEX IF NOT EXISTS idx_kairo_training_data_validated ON kairo_training_data(is_validated);
CREATE INDEX IF NOT EXISTS idx_kairo_training_data_quality ON kairo_training_data(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_kairo_training_data_created_at ON kairo_training_data(created_at DESC);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_kairo_conversations_updated_at 
    BEFORE UPDATE ON kairo_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kairo_recommendations_updated_at 
    BEFORE UPDATE ON kairo_recommendations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries
CREATE OR REPLACE VIEW kairo_user_activity AS
SELECT 
    u.user_id,
    p.first_name,
    p.last_name,
    p.email,
    COUNT(DISTINCT c.id) as total_conversations,
    COUNT(DISTINCT r.id) as active_recommendations,
    MAX(c.created_at) as last_chat,
    MAX(u.last_used_at) as last_feature_usage,
    AVG(i.health_score) as avg_health_score
FROM profiles p
LEFT JOIN kairo_conversations c ON p.id = c.user_id
LEFT JOIN kairo_recommendations r ON p.id = r.user_id AND r.status = 'active'
LEFT JOIN kairo_feature_usage u ON p.id = u.user_id
LEFT JOIN kairo_user_insights i ON p.id = i.user_id
GROUP BY u.user_id, p.first_name, p.last_name, p.email;

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

-- Create RLS (Row Level Security) policies
ALTER TABLE kairo_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_user_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kairo_feature_usage ENABLE ROW LEVEL SECURITY;

-- Policies for user data access
CREATE POLICY "Users can view their own conversations" ON kairo_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON kairo_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own insights" ON kairo_user_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user insights" ON kairo_user_insights
    FOR ALL USING (true);

CREATE POLICY "Users can view their own recommendations" ON kairo_recommendations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations" ON kairo_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own predictions" ON kairo_predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fraud alerts" ON kairo_fraud_alerts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own feature usage" ON kairo_feature_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Admin policies (assuming admin role exists)
CREATE POLICY "Admins can view all AI data" ON kairo_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

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

-- Create cleanup function for old data
CREATE OR REPLACE FUNCTION cleanup_kairo_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired insights cache
    DELETE FROM kairo_user_insights WHERE expires_at < NOW();
    
    -- Clean up expired analytics cache
    DELETE FROM kairo_analytics_cache WHERE expires_at < NOW();
    
    -- Clean up old conversations (keep last 6 months)
    DELETE FROM kairo_conversations 
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Clean up resolved fraud alerts (keep last 1 year)
    DELETE FROM kairo_fraud_alerts 
    WHERE status IN ('resolved', 'false_positive') 
    AND resolved_at < NOW() - INTERVAL '1 year';
    
    -- Clean up old training data (keep last 2 years)
    DELETE FROM kairo_training_data 
    WHERE created_at < NOW() - INTERVAL '2 years'
    AND is_validated = false;
    
    RAISE NOTICE 'Kairo AI data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (requires pg_cron extension)
-- SELECT cron.schedule('kairo-cleanup', '0 2 * * *', 'SELECT cleanup_kairo_data();');

COMMENT ON TABLE kairo_conversations IS 'Stores chat conversations between users and Kairo AI';
COMMENT ON TABLE kairo_user_insights IS 'Caches AI-generated user insights for performance';
COMMENT ON TABLE kairo_recommendations IS 'Stores AI-generated recommendations for users';
COMMENT ON TABLE kairo_model_performance IS 'Tracks AI model performance metrics over time';
COMMENT ON TABLE kairo_predictions IS 'Stores AI predictions for accuracy tracking';
COMMENT ON TABLE kairo_fraud_alerts IS 'Stores fraud detection alerts from AI models';
COMMENT ON TABLE kairo_analytics_cache IS 'Caches analytics data for admin dashboard';
COMMENT ON TABLE kairo_feature_usage IS 'Tracks usage of AI features by users';
COMMENT ON TABLE kairo_training_data IS 'Stores data for AI model training and improvement';

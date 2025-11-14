-- Kairo AI Agent Database Schema
-- Tables for AI conversations, financial goals, and user interactions

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
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- AI Insights and Recommendations Table
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    category VARCHAR(50) NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    is_acted_upon BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User AI Preferences Table
CREATE TABLE IF NOT EXISTS user_ai_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'sn', 'nd')),
    communication_style VARCHAR(20) DEFAULT 'friendly' CHECK (communication_style IN ('formal', 'friendly', 'casual')),
    notification_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (notification_frequency IN ('daily', 'weekly', 'monthly', 'never')),
    preferred_topics JSONB DEFAULT '[]',
    ai_enabled BOOLEAN DEFAULT TRUE,
    personalization_level VARCHAR(10) DEFAULT 'high' CHECK (personalization_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- AI Learning Data Table (for improving responses)
CREATE TABLE IF NOT EXISTS ai_learning_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES kairo_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'incorrect', 'excellent')),
    feedback_text TEXT,
    improvement_suggestion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial Health Scores Table
CREATE TABLE IF NOT EXISTS financial_health_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    zimscore_factor INTEGER DEFAULT 0,
    debt_factor INTEGER DEFAULT 0,
    investment_factor INTEGER DEFAULT 0,
    liquidity_factor INTEGER DEFAULT 0,
    factors JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_user_id ON kairo_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_created_at ON kairo_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kairo_conversations_intent ON kairo_conversations(intent);

CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(status);
CREATE INDEX IF NOT EXISTS idx_financial_goals_goal_type ON financial_goals(goal_type);

CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_is_read ON ai_insights(is_read);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority);
CREATE INDEX IF NOT EXISTS idx_ai_insights_category ON ai_insights(category);

CREATE INDEX IF NOT EXISTS idx_financial_health_scores_user_id ON financial_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_calculated_at ON financial_health_scores(calculated_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE kairo_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kairo_conversations
CREATE POLICY "Users can view their own conversations" ON kairo_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON kairo_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON kairo_conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for financial_goals
CREATE POLICY "Users can view their own goals" ON financial_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON financial_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON financial_goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON financial_goals
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_insights
CREATE POLICY "Users can view their own insights" ON ai_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" ON ai_insights
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_ai_preferences
CREATE POLICY "Users can view their own AI preferences" ON user_ai_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI preferences" ON user_ai_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI preferences" ON user_ai_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ai_learning_data
CREATE POLICY "Users can insert their own learning data" ON ai_learning_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for financial_health_scores
CREATE POLICY "Users can view their own health scores" ON financial_health_scores
    FOR SELECT USING (auth.uid() = user_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_kairo_conversations_updated_at 
    BEFORE UPDATE ON kairo_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_goals_updated_at 
    BEFORE UPDATE ON financial_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_insights_updated_at 
    BEFORE UPDATE ON ai_insights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_ai_preferences_updated_at 
    BEFORE UPDATE ON user_ai_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW user_conversation_summary AS
SELECT 
    user_id,
    COUNT(*) as total_conversations,
    COUNT(DISTINCT DATE(created_at)) as active_days,
    AVG(satisfaction_rating) as avg_satisfaction,
    MAX(created_at) as last_conversation,
    array_agg(DISTINCT intent) as common_intents
FROM kairo_conversations 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

CREATE OR REPLACE VIEW user_goal_progress AS
SELECT 
    fg.*,
    CASE 
        WHEN fg.target_amount > 0 THEN (fg.current_amount / fg.target_amount * 100)
        ELSE 0 
    END as progress_percentage,
    CASE 
        WHEN fg.timeframe_months > 0 THEN 
            EXTRACT(EPOCH FROM (NOW() - fg.created_at)) / (fg.timeframe_months * 30 * 24 * 3600) * 100
        ELSE 0 
    END as time_progress_percentage
FROM financial_goals fg
WHERE fg.status = 'active';

-- Sample data for testing (optional)
-- INSERT INTO user_ai_preferences (user_id, language, communication_style) 
-- VALUES (auth.uid(), 'en', 'friendly') ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE kairo_conversations IS 'Stores all conversations between users and Kairo AI agent';
COMMENT ON TABLE financial_goals IS 'User-defined financial goals with tracking and milestones';
COMMENT ON TABLE ai_insights IS 'AI-generated insights and recommendations for users';
COMMENT ON TABLE user_ai_preferences IS 'User preferences for AI interactions and personalization';
COMMENT ON TABLE ai_learning_data IS 'Feedback data for improving AI responses';
COMMENT ON TABLE financial_health_scores IS 'Calculated financial health scores with factors';

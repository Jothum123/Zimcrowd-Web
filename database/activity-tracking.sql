-- Activity Tracking System for User-Admin Dashboard Communication
-- This creates shared tables to track all user activities that appear in admin dashboard

-- User Activity Logs Table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'loan_application', 'investment', 'transaction', 'profile_update', etc.
    activity_data JSONB, -- Detailed activity data
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'failed', 'pending'
    metadata JSONB -- Additional metadata for admin processing
);

-- Real-time Notifications Table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_type VARCHAR(50) NOT NULL, -- 'new_user', 'loan_application', 'investment', 'suspicious_activity', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    related_entity_type VARCHAR(50), -- 'loan', 'investment', 'transaction', 'user'
    related_entity_id UUID,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

-- Dashboard Events Table (for real-time updates)
CREATE TABLE IF NOT EXISTS dashboard_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'user_login', 'loan_created', 'investment_made', 'transaction_completed'
    event_data JSONB NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    admin_relevant BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    event_category VARCHAR(50) -- 'financial', 'security', 'engagement', 'support'
);

-- User Session Tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    logout_at TIMESTAMP WITH TIME ZONE,
    session_data JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_priority ON admin_notifications(priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_created_at ON dashboard_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_events_admin_relevant ON dashboard_events(admin_relevant, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active, last_activity DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own activity logs
CREATE POLICY "Users can view own activity logs" ON user_activity_logs 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own activity logs
CREATE POLICY "Users can insert own activity logs" ON user_activity_logs 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin users can view all activity logs
CREATE POLICY "Admins can view all activity logs" ON user_activity_logs 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- Admin users can view all notifications
CREATE POLICY "Admins can view all notifications" ON admin_notifications 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- Admin users can update notifications
CREATE POLICY "Admins can update notifications" ON admin_notifications 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- System can insert notifications (for automated alerts)
CREATE POLICY "System can insert notifications" ON admin_notifications 
    FOR INSERT WITH CHECK (true);

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions" ON user_sessions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin users can view all sessions
CREATE POLICY "Admins can view all sessions" ON user_sessions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- Functions for automatic activity logging
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_activity_data JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_status VARCHAR(20) DEFAULT 'active',
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activity_logs (
        user_id, activity_type, activity_data, ip_address, 
        user_agent, session_id, status, metadata
    ) VALUES (
        p_user_id, p_activity_type, p_activity_data, p_ip_address,
        p_user_agent, p_session_id, p_status, p_metadata
    ) RETURNING id INTO activity_id;
    
    -- Also create dashboard event for real-time updates
    INSERT INTO dashboard_events (
        event_type, event_data, user_id, admin_relevant, event_category
    ) VALUES (
        p_activity_type, p_activity_data, p_user_id, true, 
        CASE 
            WHEN p_activity_type IN ('loan_application', 'investment', 'transaction') THEN 'financial'
            WHEN p_activity_type IN ('login', 'password_change', 'profile_update') THEN 'security'
            WHEN p_activity_type IN ('dashboard_view', 'page_view') THEN 'engagement'
            ELSE 'general'
        END
    );
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin notifications
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_notification_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_related_user_id UUID DEFAULT NULL,
    p_related_entity_type VARCHAR(50) DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'medium',
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO admin_notifications (
        notification_type, title, message, related_user_id,
        related_entity_type, related_entity_id, priority, metadata
    ) VALUES (
        p_notification_type, p_title, p_message, p_related_user_id,
        p_related_entity_type, related_entity_id, p_priority, p_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user session activity
CREATE OR REPLACE FUNCTION update_session_activity(
    p_session_id TEXT,
    p_user_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE user_sessions 
    SET 
        last_activity = NOW(),
        ip_address = COALESCE(p_ip_address, ip_address),
        user_agent = COALESCE(p_user_agent, user_agent)
    WHERE session_token = p_session_id AND is_active = true;
    
    -- If no rows updated, insert new session
    IF NOT FOUND THEN
        INSERT INTO user_sessions (
            user_id, session_token, ip_address, user_agent, started_at, last_activity
        ) VALUES (
            p_user_id, p_session_id, p_ip_address, p_user_agent, NOW(), NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_activity_logs
CREATE TRIGGER update_user_activity_logs_updated_at
    BEFORE UPDATE ON user_activity_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

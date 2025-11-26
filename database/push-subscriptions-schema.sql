-- =====================================================
-- PUSH NOTIFICATION SUBSCRIPTIONS SCHEMA
-- OneSignal Integration
-- =====================================================

-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    player_id VARCHAR(255) NOT NULL,
    token TEXT,
    platform VARCHAR(50) NOT NULL DEFAULT 'web', -- 'web', 'ios', 'android'
    device_type VARCHAR(100), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100), -- 'Chrome', 'Firefox', 'Safari', etc.
    is_active BOOLEAN DEFAULT true,
    subscribed_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP DEFAULT NOW(),
    unsubscribed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, player_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_player_id ON push_subscriptions(player_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_platform ON push_subscriptions(platform);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscription_timestamp();

-- Add token column to notification_delivery_log if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_delivery_log' 
        AND column_name = 'token'
    ) THEN
        ALTER TABLE notification_delivery_log ADD COLUMN token TEXT;
    END IF;
END $$;

-- View for active push subscriptions
CREATE OR REPLACE VIEW active_push_subscriptions AS
SELECT 
    ps.*,
    u.email,
    u.raw_user_meta_data->>'full_name' as user_name
FROM push_subscriptions ps
JOIN auth.users u ON ps.user_id = u.id
WHERE ps.is_active = true;

-- Function to get user's active push subscription
CREATE OR REPLACE FUNCTION get_user_push_subscription(p_user_id UUID)
RETURNS TABLE (
    player_id VARCHAR,
    platform VARCHAR,
    device_type VARCHAR,
    subscribed_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.player_id,
        ps.platform,
        ps.device_type,
        ps.subscribed_at
    FROM push_subscriptions ps
    WHERE ps.user_id = p_user_id
    AND ps.is_active = true
    ORDER BY ps.last_active_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup inactive subscriptions
CREATE OR REPLACE FUNCTION cleanup_inactive_push_subscriptions(days_inactive INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM push_subscriptions
    WHERE is_active = false
    AND unsubscribed_at < NOW() - (days_inactive || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Stats view for push notifications
CREATE OR REPLACE VIEW push_notification_stats AS
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(*) FILTER (WHERE is_active = true) as active_subscriptions,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_subscriptions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE platform = 'web') as web_subscriptions,
    COUNT(*) FILTER (WHERE platform = 'ios') as ios_subscriptions,
    COUNT(*) FILTER (WHERE platform = 'android') as android_subscriptions,
    COUNT(*) FILTER (WHERE device_type = 'desktop') as desktop_devices,
    COUNT(*) FILTER (WHERE device_type = 'mobile') as mobile_devices,
    COUNT(*) FILTER (WHERE device_type = 'tablet') as tablet_devices
FROM push_subscriptions;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated;
GRANT SELECT ON active_push_subscriptions TO authenticated;
GRANT SELECT ON push_notification_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_push_subscription(UUID) TO authenticated;

-- Comments
COMMENT ON TABLE push_subscriptions IS 'Stores OneSignal push notification subscriptions for users';
COMMENT ON COLUMN push_subscriptions.player_id IS 'OneSignal Player ID';
COMMENT ON COLUMN push_subscriptions.token IS 'OneSignal push token';
COMMENT ON COLUMN push_subscriptions.platform IS 'Platform: web, ios, or android';
COMMENT ON COLUMN push_subscriptions.device_type IS 'Device type: desktop, mobile, or tablet';
COMMENT ON COLUMN push_subscriptions.is_active IS 'Whether the subscription is currently active';

-- Sample data for testing (optional)
-- INSERT INTO push_subscriptions (user_id, player_id, platform, device_type, browser)
-- VALUES 
--     ('user-uuid-here', 'test-player-id-1', 'web', 'desktop', 'Chrome'),
--     ('user-uuid-here', 'test-player-id-2', 'web', 'mobile', 'Safari');

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Push subscriptions schema created successfully';
END $$;

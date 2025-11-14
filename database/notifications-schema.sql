-- Notifications System Schema
-- Comprehensive notification management for email, SMS, and in-app notifications

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

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'monthly', 'disabled')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'Africa/Harare',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

-- Scheduled Notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_key VARCHAR(100) NOT NULL,
    recipient_type VARCHAR(20) DEFAULT 'user' CHECK (recipient_type IN ('user', 'group', 'all_users', 'segment')),
    recipient_criteria JSONB DEFAULT '{}',
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('email', 'sms', 'in_app', 'push')),
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    repeat_pattern VARCHAR(50),
    repeat_until TIMESTAMP WITH TIME ZONE,
    template_data JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Campaigns
CREATE TABLE IF NOT EXISTS notification_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_name VARCHAR(200) NOT NULL,
    campaign_description TEXT,
    template_key VARCHAR(100) NOT NULL,
    target_audience JSONB NOT NULL DEFAULT '{}',
    delivery_method VARCHAR(20) NOT NULL CHECK (delivery_method IN ('email', 'sms', 'in_app', 'push')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Recipients (for tracking individual campaign sends)
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id UUID NOT NULL REFERENCES notification_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    delivery_log_id UUID REFERENCES notification_delivery_log(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'unsubscribed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, user_id)
);

-- Notification Statistics (aggregated data for reporting)
CREATE TABLE IF NOT EXISTS notification_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stat_date DATE NOT NULL,
    notification_type VARCHAR(50),
    delivery_method VARCHAR(20),
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    total_bounced INTEGER DEFAULT 0,
    total_unsubscribed INTEGER DEFAULT 0,
    delivery_rate DECIMAL(5,4),
    open_rate DECIMAL(5,4),
    click_rate DECIMAL(5,4),
    bounce_rate DECIMAL(5,4),
    total_cost_usd DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stat_date, notification_type, delivery_method)
);

-- Unsubscribe Tokens (for email unsubscribe links)
CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL UNIQUE,
    notification_type VARCHAR(50),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(template_type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_date ON user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_category ON user_notifications(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_user_date ON notification_delivery_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON notification_delivery_log(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_method ON notification_delivery_log(delivery_method, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_time ON scheduled_notifications(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON notification_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_stats_date ON notification_statistics(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_token ON unsubscribe_tokens(token);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_user ON unsubscribe_tokens(user_id, expires_at);

-- Default notification templates
INSERT INTO notification_templates (template_key, template_name, template_type, subject, content, variables) VALUES
('loan_approved', 'Loan Approval Notification', 'email', '🎉 Your ZimCrowd Loan Has Been Approved!', 
'<h2>Congratulations {{user_name}}!</h2>
<p>Your loan application for <strong>${{loan_amount}}</strong> has been approved.</p>
<p><strong>Loan Details:</strong></p>
<ul>
<li>Amount: ${{loan_amount}}</li>
<li>Interest Rate: {{interest_rate}}%</li>
<li>Term: {{loan_term}} months</li>
<li>Monthly Payment: ${{monthly_payment}}</li>
</ul>
<p>The funds will be disbursed to your account within 24 hours.</p>
<p><a href="{{dashboard_url}}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Loan Details</a></p>',
'["user_name", "loan_amount", "interest_rate", "loan_term", "monthly_payment", "dashboard_url"]'),

('loan_rejected', 'Loan Application Update', 'email', '❌ Loan Application Update',
'<h2>Hello {{user_name}},</h2>
<p>Thank you for your interest in ZimCrowd. After careful review, we are unable to approve your loan application at this time.</p>
<p><strong>Reasons:</strong></p>
<p>{{rejection_reason}}</p>
<p><strong>What you can do:</strong></p>
<ul>
<li>Improve your ZimScore by making timely payments</li>
<li>Increase your income documentation</li>
<li>Reduce existing debt obligations</li>
<li>Reapply after 30 days</li>
</ul>
<p><a href="{{zimscore_url}}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Check Your ZimScore</a></p>',
'["user_name", "rejection_reason", "zimscore_url"]'),

('investment_matured', 'Investment Maturity Notification', 'email', '💰 Your Investment Has Matured!',
'<h2>Great news {{user_name}}!</h2>
<p>Your investment in <strong>{{investment_product}}</strong> has reached maturity.</p>
<p><strong>Investment Summary:</strong></p>
<ul>
<li>Initial Investment: ${{initial_amount}}</li>
<li>Final Value: ${{final_amount}}</li>
<li>Total Return: ${{total_return}} ({{return_percentage}}%)</li>
<li>Investment Period: {{investment_period}} months</li>
</ul>
<p>Your returns have been credited to your ZimCrowd wallet.</p>
<p><a href="{{wallet_url}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Wallet</a></p>',
'["user_name", "investment_product", "initial_amount", "final_amount", "total_return", "return_percentage", "investment_period", "wallet_url"]'),

('payment_reminder', 'Payment Reminder', 'email', '⏰ Payment Reminder - ZimCrowd',
'<h2>Payment Reminder</h2>
<p>Hello {{user_name}},</p>
<p>This is a friendly reminder that your loan payment of <strong>${{payment_amount}}</strong> is due on <strong>{{due_date}}</strong>.</p>
<p><strong>Loan Details:</strong></p>
<ul>
<li>Loan ID: {{loan_id}}</li>
<li>Payment Amount: ${{payment_amount}}</li>
<li>Due Date: {{due_date}}</li>
<li>Remaining Balance: ${{remaining_balance}}</li>
</ul>
<p><a href="{{payment_url}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Make Payment</a></p>',
'["user_name", "payment_amount", "due_date", "loan_id", "remaining_balance", "payment_url"]'),

('welcome', 'Welcome to ZimCrowd', 'email', '🎊 Welcome to ZimCrowd!',
'<h2>Welcome to ZimCrowd, {{user_name}}!</h2>
<p>Thank you for joining Zimbabwe''s leading financial platform. We''re excited to help you achieve your financial goals.</p>
<p><strong>Get Started:</strong></p>
<ul>
<li>Complete your profile to improve your ZimScore</li>
<li>Explore our loan and investment products</li>
<li>Chat with Kairo, our AI financial assistant</li>
<li>Set up your financial goals</li>
</ul>
<p><a href="{{dashboard_url}}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Complete Your Profile</a></p>
<p>Need help? Chat with Kairo or contact our support team.</p>',
'["user_name", "dashboard_url"]'),

('referral_bonus', 'Referral Bonus Earned', 'email', '🎁 You Earned a Referral Bonus!',
'<h2>Congratulations {{user_name}}!</h2>
<p>You''ve earned a referral bonus of <strong>${{bonus_amount}}</strong> for referring {{referred_user_name}} to ZimCrowd.</p>
<p><strong>Referral Details:</strong></p>
<ul>
<li>Referred User: {{referred_user_name}}</li>
<li>Bonus Amount: ${{bonus_amount}}</li>
<li>Total Referrals: {{total_referrals}}</li>
<li>Total Earnings: ${{total_earnings}}</li>
</ul>
<p>Your bonus has been credited to your ZimCrowd wallet.</p>
<p><a href="{{referral_url}}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Refer More Friends</a></p>',
'["user_name", "bonus_amount", "referred_user_name", "total_referrals", "total_earnings", "referral_url"]')

ON CONFLICT (template_key) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    updated_at = NOW();

-- Default notification preferences for common notification types
INSERT INTO user_notification_preferences (user_id, notification_type, email_enabled, sms_enabled, in_app_enabled, push_enabled)
SELECT 
    id as user_id,
    unnest(ARRAY['loan_approved', 'loan_rejected', 'payment_reminder', 'investment_matured', 'referral_bonus', 'security_alert', 'marketing']) as notification_type,
    true as email_enabled,
    CASE 
        WHEN unnest(ARRAY['loan_approved', 'loan_rejected', 'payment_reminder', 'investment_matured', 'referral_bonus', 'security_alert', 'marketing']) IN ('payment_reminder', 'security_alert') THEN true 
        ELSE false 
    END as sms_enabled,
    true as in_app_enabled,
    true as push_enabled
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM user_notification_preferences 
    WHERE user_notification_preferences.user_id = auth.users.id
);

-- Views for common notification queries
CREATE OR REPLACE VIEW notification_delivery_stats AS
SELECT 
    DATE(created_at) as date,
    delivery_method,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
    COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as delivery_rate,
    ROUND(
        COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::DECIMAL / 
        NULLIF(COUNT(*) FILTER (WHERE status = 'delivered'), 0) * 100, 2
    ) as open_rate,
    ROUND(
        COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::DECIMAL / 
        NULLIF(COUNT(*) FILTER (WHERE opened_at IS NOT NULL), 0) * 100, 2
    ) as click_rate
FROM notification_delivery_log
GROUP BY DATE(created_at), delivery_method
ORDER BY date DESC, delivery_method;

CREATE OR REPLACE VIEW user_notification_summary AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_count,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
    MAX(created_at) as last_notification_at
FROM user_notifications
GROUP BY user_id;

-- Functions for notification management
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = notification_id AND user_notifications.user_id = mark_notification_as_read.user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_notification_count(user_id UUID)
RETURNS TABLE(total INTEGER, unread INTEGER, urgent INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total,
        COUNT(*) FILTER (WHERE is_read = false)::INTEGER as unread,
        COUNT(*) FILTER (WHERE priority = 'urgent' AND is_read = false)::INTEGER as urgent
    FROM user_notifications
    WHERE user_notifications.user_id = get_user_notification_count.user_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update notification statistics
CREATE OR REPLACE FUNCTION update_notification_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_statistics (
        stat_date, 
        delivery_method, 
        total_sent, 
        total_delivered, 
        total_failed
    )
    SELECT 
        DATE(NEW.created_at),
        NEW.delivery_method,
        1,
        CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END
    ON CONFLICT (stat_date, delivery_method) 
    DO UPDATE SET
        total_sent = notification_statistics.total_sent + 1,
        total_delivered = notification_statistics.total_delivered + 
            CASE WHEN NEW.status = 'delivered' THEN 1 ELSE 0 END,
        total_failed = notification_statistics.total_failed + 
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_stats
    AFTER INSERT ON notification_delivery_log
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_statistics();

-- Comments for documentation
COMMENT ON TABLE notification_templates IS 'Reusable templates for different types of notifications';
COMMENT ON TABLE user_notifications IS 'In-app notifications for users';
COMMENT ON TABLE notification_delivery_log IS 'Log of all notification deliveries across all channels';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for different notification types and channels';
COMMENT ON TABLE scheduled_notifications IS 'Notifications scheduled for future delivery';
COMMENT ON TABLE notification_campaigns IS 'Bulk notification campaigns for marketing and announcements';
COMMENT ON TABLE campaign_recipients IS 'Individual recipients and their status for each campaign';
COMMENT ON TABLE notification_statistics IS 'Aggregated statistics for notification performance analysis';
COMMENT ON TABLE unsubscribe_tokens IS 'Secure tokens for email unsubscribe functionality';

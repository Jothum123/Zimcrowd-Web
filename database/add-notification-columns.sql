-- Add missing notification preference columns to user_notification_preferences table
-- Run this in Supabase SQL Editor

-- Add email notification columns
ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS email_marketing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loan_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS investment_returns BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS loan_opportunities BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS security_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_summary BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false;

-- Add push notification columns
ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS transaction_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS account_activity BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS investment_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS promotional BOOLEAN DEFAULT false;

-- Add quiet hours columns
ALTER TABLE user_notification_preferences 
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Harare';

-- Verify columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_notification_preferences'
ORDER BY ordinal_position;

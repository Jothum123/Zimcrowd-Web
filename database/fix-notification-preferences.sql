-- Fix user_notification_preferences table
-- Add missing columns for notification settings

-- Check if table exists, if not create it
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Notification type preferences
    investment_updates BOOLEAN DEFAULT true,
    loan_updates BOOLEAN DEFAULT true,
    payment_reminders BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    security_alerts BOOLEAN DEFAULT true,
    newsletter BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add loan_updates if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'loan_updates'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN loan_updates BOOLEAN DEFAULT true;
    END IF;
    
    -- Add investment_updates if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'investment_updates'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN investment_updates BOOLEAN DEFAULT true;
    END IF;
    
    -- Add payment_reminders if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'payment_reminders'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN payment_reminders BOOLEAN DEFAULT true;
    END IF;
    
    -- Add marketing_emails if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'marketing_emails'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN marketing_emails BOOLEAN DEFAULT false;
    END IF;
    
    -- Add security_alerts if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'security_alerts'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN security_alerts BOOLEAN DEFAULT true;
    END IF;
    
    -- Add newsletter if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'newsletter'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN newsletter BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id 
ON user_notification_preferences(user_id);

-- Enable RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can view own notification preferences" 
ON user_notification_preferences FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can update own notification preferences" 
ON user_notification_preferences FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON user_notification_preferences;
CREATE POLICY "Users can insert own notification preferences" 
ON user_notification_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_notification_preferences TO authenticated;
GRANT ALL ON user_notification_preferences TO service_role;

SELECT '✅ Notification preferences table fixed!' as status;

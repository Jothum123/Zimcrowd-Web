-- Add missing columns to existing tables

-- Add missing columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Africa/Harare',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS number_format VARCHAR(20) DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS preferred_loan_types TEXT[] DEFAULT ARRAY['personal', 'business'],
ADD COLUMN IF NOT EXISTS min_interest_rate DECIMAL(5, 2) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS max_loan_term INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS show_investment_stats BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_sharing_enabled BOOLEAN DEFAULT false;

-- Add missing columns to user_notification_preferences
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS digest_frequency VARCHAR(20) DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME,
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

-- Success message
SELECT 'Missing columns added successfully' AS message;

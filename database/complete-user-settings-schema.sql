-- Complete user_settings table schema
-- Run this in Supabase SQL Editor to add all missing columns

-- ============================================
-- NOTIFICATION SETTINGS COLUMNS
-- ============================================
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS notifications_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notifications_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notifications_push BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS loan_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS investment_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS security_alerts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_reports BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS monthly_statements BOOLEAN DEFAULT true;

-- ============================================
-- DISPLAY SETTINGS COLUMNS
-- ============================================
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'dark',
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '24h',
ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_animations BOOLEAN DEFAULT true;

-- ============================================
-- INVESTMENT PREFERENCES COLUMNS
-- ============================================
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS auto_invest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_invest_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS risk_preference VARCHAR(20) DEFAULT 'moderate',
ADD COLUMN IF NOT EXISTS min_return_rate DECIMAL(5,2) DEFAULT 8.0,
ADD COLUMN IF NOT EXISTS max_loan_amount DECIMAL(15,2) DEFAULT 1000,
ADD COLUMN IF NOT EXISTS diversification_level VARCHAR(20) DEFAULT 'balanced',
ADD COLUMN IF NOT EXISTS investment_goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_sectors JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- PRIVACY SETTINGS COLUMNS
-- ============================================
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS portfolio_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_investments BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_loans BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS data_sharing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS analytics_tracking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS third_party_sharing BOOLEAN DEFAULT false;

-- ============================================
-- SECURITY SETTINGS COLUMNS
-- ============================================
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS login_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS session_timeout INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_secret_temp TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ;

-- ============================================
-- METADATA COLUMNS
-- ============================================
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- VERIFY ALL COLUMNS EXIST
-- ============================================
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_settings'
ORDER BY ordinal_position;

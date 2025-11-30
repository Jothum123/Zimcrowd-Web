-- Add 2FA columns to user_settings table
-- Run this in Supabase SQL Editor

-- Add columns for 2FA support
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_secret_temp TEXT,
ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.totp_secret IS 'Permanent TOTP secret for 2FA (stored after verification)';
COMMENT ON COLUMN user_settings.totp_secret_temp IS 'Temporary TOTP secret during 2FA setup (cleared after verification)';
COMMENT ON COLUMN user_settings.two_factor_enabled_at IS 'Timestamp when 2FA was enabled';

-- Verify columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name IN ('totp_secret', 'totp_secret_temp', 'two_factor_enabled_at', 'two_factor_enabled');

-- Cleanup Script - Run this FIRST before user-settings-schema-safe.sql
-- This removes any conflicting triggers and functions

-- Drop existing triggers on auth.users
DROP TRIGGER IF EXISTS trigger_initialize_user_settings ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS initialize_user_settings();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop any existing user settings tables (if you want a clean slate)
-- Uncomment these lines if you want to recreate tables from scratch
-- DROP TABLE IF EXISTS user_documents CASCADE;
-- DROP TABLE IF EXISTS user_sessions CASCADE;
-- DROP TABLE IF EXISTS user_security_settings CASCADE;
-- DROP TABLE IF EXISTS user_notification_preferences CASCADE;
-- DROP TABLE IF EXISTS user_settings CASCADE;

-- Success message
SELECT 'Cleanup complete. Now run user-settings-schema-safe.sql' AS message;

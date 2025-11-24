-- ============================================
-- CLEANUP DUPLICATE POLICIES
-- ============================================
-- Remove old policies and keep only the new ones

-- Clean up user_settings policies
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;

-- Clean up login_activity policies
DROP POLICY IF EXISTS "Users can view own login activity" ON login_activity;
DROP POLICY IF EXISTS "System can insert login activity" ON login_activity;

-- Verify - should only show the "their own" versions
SELECT 
    tablename,
    policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_settings', 'login_activity')
ORDER BY tablename, policyname;

-- ============================================
-- ZimCrowd RLS Policies Setup
-- ============================================
-- Run this AFTER creating tables successfully
-- This enables Row Level Security on all tables

-- ============================================
-- ENABLE RLS ON TABLES
-- ============================================

-- Only enable RLS if tables exist
DO $$ 
BEGIN
    -- Enable RLS on user_settings if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on user_settings';
    END IF;

    -- Enable RLS on login_activity if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_activity') THEN
        ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on login_activity';
    END IF;

    -- Enable RLS on loans if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on loans';
    END IF;

    -- Enable RLS on investments if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments') THEN
        ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on investments';
    END IF;

    -- Enable RLS on transactions if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on transactions';
    END IF;

    -- Enable RLS on referrals if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals') THEN
        ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on referrals';
    END IF;

    -- Enable RLS on documents if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on documents';
    END IF;

    -- Enable RLS on wallet if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wallet') THEN
        ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on wallet';
    END IF;

    -- Enable RLS on notifications if it exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on notifications';
    END IF;
END $$;

-- ============================================
-- USER SETTINGS POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" 
ON user_settings FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" 
ON user_settings FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" 
ON user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- LOGIN ACTIVITY POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view own login activity" ON login_activity;
CREATE POLICY "Users can view own login activity" 
ON login_activity FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert login activity" ON login_activity;
CREATE POLICY "System can insert login activity" 
ON login_activity FOR INSERT 
WITH CHECK (true);

-- ============================================
-- LOANS POLICIES (if table exists)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loans') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own loans" ON loans';
        EXECUTE 'CREATE POLICY "Users can view own loans" ON loans FOR SELECT USING (auth.uid() = user_id)';
        
        EXECUTE 'DROP POLICY IF EXISTS "Users can create loans" ON loans';
        EXECUTE 'CREATE POLICY "Users can create loans" ON loans FOR INSERT WITH CHECK (auth.uid() = user_id)';
        
        RAISE NOTICE 'Loans policies created';
    END IF;
END $$;

-- ============================================
-- INVESTMENTS POLICIES (if table exists)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own investments" ON investments';
        EXECUTE 'CREATE POLICY "Users can view own investments" ON investments FOR SELECT USING (auth.uid() = user_id)';
        
        EXECUTE 'DROP POLICY IF EXISTS "Users can create investments" ON investments';
        EXECUTE 'CREATE POLICY "Users can create investments" ON investments FOR INSERT WITH CHECK (auth.uid() = user_id)';
        
        RAISE NOTICE 'Investments policies created';
    END IF;
END $$;

-- ============================================
-- TRANSACTIONS POLICIES (if table exists)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transactions') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own transactions" ON transactions';
        EXECUTE 'CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id)';
        
        RAISE NOTICE 'Transactions policies created';
    END IF;
END $$;

-- ============================================
-- REFERRALS POLICIES (if table exists)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own referrals" ON referrals';
        EXECUTE 'CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id)';
        
        RAISE NOTICE 'Referrals policies created';
    END IF;
END $$;

-- ============================================
-- DOCUMENTS POLICIES (if table exists)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own documents" ON documents';
        EXECUTE 'CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id)';
        
        EXECUTE 'DROP POLICY IF EXISTS "Users can upload documents" ON documents';
        EXECUTE 'CREATE POLICY "Users can upload documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id)';
        
        RAISE NOTICE 'Documents policies created';
    END IF;
END $$;

-- ============================================
-- WALLET POLICIES (if table exists)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'wallet') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own wallet" ON wallet';
        EXECUTE 'CREATE POLICY "Users can view own wallet" ON wallet FOR SELECT USING (auth.uid() = user_id)';
        
        RAISE NOTICE 'Wallet policies created';
    END IF;
END $$;

-- ============================================
-- NOTIFICATIONS POLICIES (if table exists)
-- ============================================

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can view own notifications" ON notifications';
        EXECUTE 'CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id)';
        
        EXECUTE 'DROP POLICY IF EXISTS "Users can update own notifications" ON notifications';
        EXECUTE 'CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id)';
        
        RAISE NOTICE 'Notifications policies created';
    END IF;
END $$;

-- ============================================
-- SETUP COMPLETE
-- ============================================

SELECT 'RLS policies setup completed!' as message;

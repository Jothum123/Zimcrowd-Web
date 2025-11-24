-- ============================================
-- COMPLETE DATABASE SETUP FOR AUTHENTICATION
-- ============================================
-- Run this to ensure ALL auth-related tables exist

-- ============================================
-- 1. EMAIL VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'signup',
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_otp ON email_verifications(otp_code);

-- ============================================
-- 2. PHONE VERIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS phone_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'signup',
    verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_otp ON phone_verifications(otp_code);

-- ============================================
-- 3. USER SETTINGS TABLE
-- ============================================
-- Only create if profiles table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
            notifications_email BOOLEAN DEFAULT true,
            notifications_sms BOOLEAN DEFAULT false,
            notifications_push BOOLEAN DEFAULT true,
            language VARCHAR(10) DEFAULT 'en',
            currency VARCHAR(10) DEFAULT 'USD',
            theme VARCHAR(20) DEFAULT 'dark',
            auto_invest_enabled BOOLEAN DEFAULT false,
            auto_invest_amount DECIMAL(12, 2),
            risk_preference VARCHAR(20) DEFAULT 'moderate',
            portfolio_public BOOLEAN DEFAULT false,
            two_factor_enabled BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
        RAISE NOTICE 'user_settings table created';
    ELSE
        RAISE NOTICE 'profiles table does not exist, skipping user_settings';
    END IF;
END $$;

-- ============================================
-- 4. LOGIN ACTIVITY TABLE
-- ============================================
-- Only create if profiles table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS login_activity (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            activity_type VARCHAR(50) DEFAULT 'login',
            ip_address VARCHAR(45),
            device TEXT,
            location TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity(user_id);
        CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON login_activity(created_at DESC);
        RAISE NOTICE 'login_activity table created';
    ELSE
        RAISE NOTICE 'profiles table does not exist, skipping login_activity';
    END IF;
END $$;

-- ============================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Only enable RLS if tables exist
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on user_settings';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_activity') THEN
        ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on login_activity';
    END IF;
END $$;

-- ============================================
-- 6. RLS POLICIES - EMAIL VERIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert email verifications" ON email_verifications;
CREATE POLICY "Anyone can insert email verifications" 
ON email_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view email verifications" ON email_verifications;
CREATE POLICY "Anyone can view email verifications" 
ON email_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update email verifications" ON email_verifications;
CREATE POLICY "Anyone can update email verifications" 
ON email_verifications FOR UPDATE USING (true);

-- ============================================
-- 7. RLS POLICIES - PHONE VERIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can insert phone verifications" 
ON phone_verifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can view phone verifications" 
ON phone_verifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update phone verifications" ON phone_verifications;
CREATE POLICY "Anyone can update phone verifications" 
ON phone_verifications FOR UPDATE USING (true);

-- ============================================
-- 8. RLS POLICIES - USER SETTINGS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
CREATE POLICY "Users can view their own settings" 
ON user_settings FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings" 
ON user_settings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
CREATE POLICY "Users can insert their own settings" 
ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert user_settings" ON user_settings;
CREATE POLICY "Service role can insert user_settings" 
ON user_settings FOR INSERT WITH CHECK (true);

-- ============================================
-- 9. RLS POLICIES - LOGIN ACTIVITY
-- ============================================
DROP POLICY IF EXISTS "Users can view their own login activity" ON login_activity;
CREATE POLICY "Users can view their own login activity" 
ON login_activity FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create login activity" ON login_activity;
CREATE POLICY "System can create login activity" 
ON login_activity FOR INSERT WITH CHECK (true);

-- ============================================
-- 10. TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create trigger if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
        CREATE TRIGGER update_user_settings_updated_at 
        BEFORE UPDATE ON user_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Trigger created for user_settings';
    END IF;
END $$;

-- ============================================
-- 11. CREATE DEFAULT SETTINGS FOR EXISTING USERS
-- ============================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') 
       AND EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        INSERT INTO user_settings (user_id)
        SELECT id FROM profiles
        WHERE id NOT IN (SELECT user_id FROM user_settings)
        ON CONFLICT (user_id) DO NOTHING;
        RAISE NOTICE 'Default settings created for existing users';
    END IF;
END $$;

-- ============================================
-- 12. VERIFICATION - CHECK EVERYTHING
-- ============================================
SELECT 
    'Setup Complete!' as status,
    (SELECT COUNT(*) FROM email_verifications) as email_verifications,
    (SELECT COUNT(*) FROM phone_verifications) as phone_verifications,
    (SELECT COUNT(*) FROM user_settings) as user_settings,
    (SELECT COUNT(*) FROM login_activity) as login_activity,
    (SELECT COUNT(*) FROM profiles) as total_profiles;

-- Show all policies
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('email_verifications', 'phone_verifications', 'user_settings', 'login_activity')
GROUP BY tablename
ORDER BY tablename;

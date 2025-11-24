-- ============================================
-- FLEXIBLE SETTINGS TABLES SETUP
-- ============================================
-- Works with either 'users' or 'profiles' table

DO $$ 
DECLARE
    user_table_name TEXT;
    user_id_column TEXT := 'id';
BEGIN
    -- Determine which table exists: users or profiles
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        user_table_name := 'users';
        RAISE NOTICE 'Found users table';
    ELSIF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        user_table_name := 'profiles';
        RAISE NOTICE 'Found profiles table';
    ELSE
        RAISE EXCEPTION 'Neither users nor profiles table exists';
    END IF;
    
    -- Create user_settings table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id UUID PRIMARY KEY REFERENCES %I(id) ON DELETE CASCADE,
            notifications_email BOOLEAN DEFAULT true,
            notifications_sms BOOLEAN DEFAULT false,
            notifications_push BOOLEAN DEFAULT true,
            language VARCHAR(10) DEFAULT ''en'',
            currency VARCHAR(10) DEFAULT ''USD'',
            theme VARCHAR(20) DEFAULT ''dark'',
            auto_invest_enabled BOOLEAN DEFAULT false,
            auto_invest_amount DECIMAL(12, 2),
            risk_preference VARCHAR(20) DEFAULT ''moderate'',
            portfolio_public BOOLEAN DEFAULT false,
            two_factor_enabled BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )', user_table_name);
    
    RAISE NOTICE '✅ user_settings table created';
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    
    -- Create login_activity table
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS login_activity (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID REFERENCES %I(id) ON DELETE CASCADE,
            activity_type VARCHAR(50) DEFAULT ''login'',
            ip_address VARCHAR(45),
            device TEXT,
            location TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )', user_table_name);
    
    RAISE NOTICE '✅ login_activity table created';
    
    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON login_activity(created_at DESC);
    
    -- Enable RLS
    ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ RLS enabled';
    
    -- Create policies for user_settings
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
    
    RAISE NOTICE '✅ user_settings policies created';
    
    -- Create policies for login_activity
    DROP POLICY IF EXISTS "Users can view their own login activity" ON login_activity;
    CREATE POLICY "Users can view their own login activity" 
    ON login_activity FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "System can create login activity" ON login_activity;
    CREATE POLICY "System can create login activity" 
    ON login_activity FOR INSERT WITH CHECK (true);
    
    RAISE NOTICE '✅ login_activity policies created';
    
    -- Create trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $func$ language 'plpgsql';
    
    -- Create trigger
    DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
    CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    RAISE NOTICE '✅ Triggers created';
    
    -- Insert default settings for existing users
    EXECUTE format('
        INSERT INTO user_settings (user_id)
        SELECT id FROM %I
        WHERE id NOT IN (SELECT user_id FROM user_settings)
        ON CONFLICT (user_id) DO NOTHING', user_table_name);
    
    RAISE NOTICE '✅ Default settings created for existing users';
    
END $$;

-- Verify
SELECT 
    '✅ SETTINGS SETUP COMPLETE!' as status,
    (SELECT COUNT(*) FROM user_settings) as user_settings_count,
    (SELECT COUNT(*) FROM login_activity) as login_activity_count;

-- ============================================
-- ZimCrowd Minimal Database Setup
-- ============================================
-- Only creates user_settings and login_activity tables
-- Follows the same pattern as your existing tables

-- ============================================
-- 1. USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Notification Preferences
    notifications_email BOOLEAN DEFAULT true,
    notifications_sms BOOLEAN DEFAULT false,
    notifications_push BOOLEAN DEFAULT true,
    
    -- Display Preferences
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'USD',
    theme VARCHAR(20) DEFAULT 'dark',
    
    -- Investment Preferences
    auto_invest_enabled BOOLEAN DEFAULT false,
    auto_invest_amount DECIMAL(12, 2),
    risk_preference VARCHAR(20) DEFAULT 'moderate' CHECK (risk_preference IN ('low', 'moderate', 'high')),
    
    -- Privacy Preferences
    portfolio_public BOOLEAN DEFAULT false,
    
    -- Security Settings
    two_factor_enabled BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================
-- 2. LOGIN ACTIVITY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS login_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Activity Details
    activity_type VARCHAR(50) DEFAULT 'login' CHECK (activity_type IN ('login', 'logout', 'password_change', '2fa_enabled', '2fa_disabled', 'failed_login')),
    
    -- Device & Location Info
    ip_address VARCHAR(45),
    device TEXT,
    location TEXT,
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON login_activity(created_at DESC);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES (Following your existing pattern)
-- ============================================

-- User Settings Policies
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
CREATE POLICY "Users can view their own settings" 
ON user_settings FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
CREATE POLICY "Users can update their own settings" 
ON user_settings FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
CREATE POLICY "Users can insert their own settings" 
ON user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert user_settings" ON user_settings;
CREATE POLICY "Service role can insert user_settings" 
ON user_settings FOR INSERT 
WITH CHECK (true);

-- Login Activity Policies
DROP POLICY IF EXISTS "Users can view their own login activity" ON login_activity;
CREATE POLICY "Users can view their own login activity" 
ON login_activity FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create login activity" ON login_activity;
CREATE POLICY "System can create login activity" 
ON login_activity FOR INSERT 
WITH CHECK (true);

-- ============================================
-- 5. CREATE TRIGGER FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at 
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. CREATE DEFAULT SETTINGS FOR EXISTING USERS
-- ============================================

-- Insert default settings for all existing users who don't have settings yet
INSERT INTO user_settings (user_id)
SELECT id FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- SETUP COMPLETE
-- ============================================

SELECT 
    'Setup completed successfully!' as status,
    (SELECT COUNT(*) FROM user_settings) as total_user_settings,
    (SELECT COUNT(*) FROM login_activity) as total_login_records;

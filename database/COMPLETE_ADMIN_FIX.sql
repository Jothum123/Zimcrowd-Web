-- COMPLETE FIX: Admin Users Table
-- This script ensures admin_users has ALL required columns
-- Safe to run multiple times

-- Step 1: Ensure admin_users table exists
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add ALL missing columns
DO $$
DECLARE
    column_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fixing admin_users table structure...';
    RAISE NOTICE '========================================';
    
    -- admin_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'admin_email') THEN
        ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255);
        UPDATE admin_users SET admin_email = 'admin' || id::text || '@zimcrowd.com' WHERE admin_email IS NULL;
        ALTER TABLE admin_users ALTER COLUMN admin_email SET NOT NULL;
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_admin_email_key UNIQUE (admin_email);
        RAISE NOTICE '✓ Added admin_email';
        column_count := column_count + 1;
    END IF;
    
    -- admin_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'admin_name') THEN
        ALTER TABLE admin_users ADD COLUMN admin_name VARCHAR(255);
        UPDATE admin_users SET admin_name = 'Admin User' WHERE admin_name IS NULL;
        ALTER TABLE admin_users ALTER COLUMN admin_name SET NOT NULL;
        RAISE NOTICE '✓ Added admin_name';
        column_count := column_count + 1;
    END IF;
    
    -- api_key
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'api_key') THEN
        ALTER TABLE admin_users ADD COLUMN api_key VARCHAR(255);
        UPDATE admin_users SET api_key = 'zimcrowd-admin-' || substr(md5(random()::text || id::text), 1, 32) WHERE api_key IS NULL;
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_api_key_key UNIQUE (api_key);
        RAISE NOTICE '✓ Added api_key';
        column_count := column_count + 1;
    END IF;
    
    -- role_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'role_id') THEN
        ALTER TABLE admin_users ADD COLUMN role_id UUID;
        RAISE NOTICE '✓ Added role_id';
        column_count := column_count + 1;
    END IF;
    
    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'user_id') THEN
        ALTER TABLE admin_users ADD COLUMN user_id UUID;
        RAISE NOTICE '✓ Added user_id';
        column_count := column_count + 1;
    END IF;
    
    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'is_active') THEN
        ALTER TABLE admin_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        UPDATE admin_users SET is_active = true WHERE is_active IS NULL;
        RAISE NOTICE '✓ Added is_active';
        column_count := column_count + 1;
    END IF;
    
    -- last_login_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'last_login_at') THEN
        ALTER TABLE admin_users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✓ Added last_login_at';
        column_count := column_count + 1;
    END IF;
    
    -- created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'created_by') THEN
        ALTER TABLE admin_users ADD COLUMN created_by UUID;
        RAISE NOTICE '✓ Added created_by';
        column_count := column_count + 1;
    END IF;
    
    RAISE NOTICE '========================================';
    IF column_count > 0 THEN
        RAISE NOTICE '✓ Added % missing columns', column_count;
    ELSE
        RAISE NOTICE '✓ All columns already exist';
    END IF;
    RAISE NOTICE '========================================';
    
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_users_api_key ON admin_users(api_key);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Step 4: Verify structure
DO $$
DECLARE
    required_columns TEXT[] := ARRAY['admin_email', 'admin_name', 'api_key', 'role_id', 'is_active'];
    col TEXT;
    missing_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verifying required columns...';
    RAISE NOTICE '========================================';
    
    FOREACH col IN ARRAY required_columns
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = col) THEN
            RAISE NOTICE '✓ % exists', col;
        ELSE
            RAISE NOTICE '✗ % MISSING', col;
            missing_count := missing_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    IF missing_count = 0 THEN
        RAISE NOTICE '✓ SUCCESS: All required columns exist!';
        RAISE NOTICE '✓ You can now run admin-roles-schema-fixed.sql';
    ELSE
        RAISE NOTICE '✗ FAILED: % columns still missing', missing_count;
    END IF;
    RAISE NOTICE '========================================';
END $$;

-- Step 5: Display current structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- Step 6: Show existing data
SELECT 
    id,
    admin_email,
    admin_name,
    LEFT(api_key, 30) || '...' as api_key_preview,
    is_active
FROM admin_users
LIMIT 3;

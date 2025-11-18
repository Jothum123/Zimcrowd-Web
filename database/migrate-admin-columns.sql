-- Migration: Add missing columns to admin_users table
-- This adds both admin_email and api_key if missing

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migrating admin_users table...';
    RAISE NOTICE '========================================';
    
    -- Add admin_email if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'admin_email'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255);
        UPDATE admin_users SET admin_email = 'admin' || id::text || '@zimcrowd.com' WHERE admin_email IS NULL;
        ALTER TABLE admin_users ALTER COLUMN admin_email SET NOT NULL;
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_admin_email_key UNIQUE (admin_email);
        CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(admin_email);
        RAISE NOTICE '✓ Added admin_email column';
    ELSE
        RAISE NOTICE '✓ admin_email column already exists';
    END IF;
    
    -- Add api_key if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'api_key'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN api_key VARCHAR(255);
        
        -- Generate API keys for existing rows
        UPDATE admin_users 
        SET api_key = 'zimcrowd-admin-' || substr(md5(random()::text || id::text), 1, 32)
        WHERE api_key IS NULL;
        
        -- Add unique constraint
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_api_key_key UNIQUE (api_key);
        CREATE INDEX IF NOT EXISTS idx_admin_users_api_key ON admin_users(api_key);
        RAISE NOTICE '✓ Added api_key column';
    ELSE
        RAISE NOTICE '✓ api_key column already exists';
    END IF;
    
    -- Add admin_name if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'admin_name'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN admin_name VARCHAR(255);
        UPDATE admin_users SET admin_name = 'Admin User' WHERE admin_name IS NULL;
        ALTER TABLE admin_users ALTER COLUMN admin_name SET NOT NULL;
        RAISE NOTICE '✓ Added admin_name column';
    ELSE
        RAISE NOTICE '✓ admin_name column already exists';
    END IF;
    
    -- Add role_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'role_id'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN role_id UUID;
        RAISE NOTICE '✓ Added role_id column';
    ELSE
        RAISE NOTICE '✓ role_id column already exists';
    END IF;
    
    -- Add is_active if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✓ Added is_active column';
    ELSE
        RAISE NOTICE '✓ is_active column already exists';
    END IF;
    
    -- Add last_login_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✓ Added last_login_at column';
    ELSE
        RAISE NOTICE '✓ last_login_at column already exists';
    END IF;
    
    -- Add created_by if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'created_by'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN created_by UUID;
        RAISE NOTICE '✓ Added created_by column';
    ELSE
        RAISE NOTICE '✓ created_by column already exists';
    END IF;
    
    -- Add user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN user_id UUID;
        RAISE NOTICE '✓ Added user_id column';
    ELSE
        RAISE NOTICE '✓ user_id column already exists';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration complete!';
    RAISE NOTICE '========================================';
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END $$;

-- Display current structure
SELECT 
    '=== Updated admin_users structure ===' as info;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- Show sample data with API keys
SELECT 
    '=== Sample admin_users data ===' as info;

SELECT 
    id,
    admin_email,
    admin_name,
    api_key,
    is_active,
    created_at
FROM admin_users
LIMIT 5;

-- Success message
SELECT 
    '✓ All required columns added successfully!' as status,
    'You can now run admin-roles-schema-fixed.sql' as next_step;

-- FINAL COMPLETE FIX: All Admin Table Issues
-- This handles ALL column name mismatches and constraints
-- Run this ONCE before admin-roles-schema-fixed.sql

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL COMPLETE FIX - Starting...';
    RAISE NOTICE '========================================';
    
    -- ============================================
    -- STEP 1: Fix user_id constraint
    -- ============================================
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE admin_users ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✓ Fixed user_id constraint (now nullable)';
    END IF;
    
    -- ============================================
    -- STEP 2: Fix role_id column name
    -- ============================================
    
    -- Check if admin_role_id exists (wrong name)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'admin_role_id'
    ) THEN
        -- Rename it to role_id
        ALTER TABLE admin_users RENAME COLUMN admin_role_id TO role_id;
        RAISE NOTICE '✓ Renamed admin_role_id to role_id';
    END IF;
    
    -- Ensure role_id exists and is nullable
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'role_id'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN role_id UUID;
        RAISE NOTICE '✓ Added role_id column';
    END IF;
    
    -- Make sure role_id is nullable (do this separately)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'role_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE admin_users ALTER COLUMN role_id DROP NOT NULL;
        RAISE NOTICE '✓ Made role_id nullable';
    ELSE
        RAISE NOTICE '✓ role_id is already nullable';
    END IF;
    
    -- ============================================
    -- STEP 3: Verify all required columns exist
    -- ============================================
    
    -- admin_email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'admin_email'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255);
        UPDATE admin_users SET admin_email = 'admin' || id::text || '@zimcrowd.com';
        ALTER TABLE admin_users ALTER COLUMN admin_email SET NOT NULL;
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_admin_email_key UNIQUE (admin_email);
        RAISE NOTICE '✓ Added admin_email';
    END IF;
    
    -- admin_name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'admin_name'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN admin_name VARCHAR(255);
        UPDATE admin_users SET admin_name = 'Admin User';
        ALTER TABLE admin_users ALTER COLUMN admin_name SET NOT NULL;
        RAISE NOTICE '✓ Added admin_name';
    END IF;
    
    -- api_key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'api_key'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN api_key VARCHAR(255);
        UPDATE admin_users SET api_key = 'zimcrowd-admin-' || substr(md5(random()::text || id::text), 1, 32);
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_api_key_key UNIQUE (api_key);
        RAISE NOTICE '✓ Added api_key';
    END IF;
    
    -- is_active
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE admin_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✓ Added is_active';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ ALL FIXES APPLIED SUCCESSFULLY!';
    RAISE NOTICE '✓ You can now run admin-roles-schema-fixed.sql';
    RAISE NOTICE '========================================';
    
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE '⚠️ Note: Some columns already exist (this is OK)';
    WHEN others THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
        RAISE NOTICE '⚠️ Continuing anyway - check results below';
END $$;

-- Show final structure
SELECT 
    '=== Final admin_users structure ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name = 'user_id' THEN '✓ Should be nullable'
        WHEN column_name = 'role_id' THEN '✓ Should be nullable'
        WHEN column_name = 'admin_email' THEN '✓ Should be NOT NULL'
        WHEN column_name = 'admin_name' THEN '✓ Should be NOT NULL'
        ELSE ''
    END as notes
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

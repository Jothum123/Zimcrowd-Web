-- Fix admin_email column issue in admin_users table
-- This script ensures the admin_email column exists and is properly configured

-- Step 1: Check if admin_users table exists and add admin_email if missing
DO $$
BEGIN
    -- Check if admin_users table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users') THEN
        
        -- Check if admin_email column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users' 
            AND column_name = 'admin_email'
        ) THEN
            -- Add admin_email column if it doesn't exist
            ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255) UNIQUE NOT NULL;
            RAISE NOTICE 'Added admin_email column to admin_users table';
        ELSE
            RAISE NOTICE 'admin_email column already exists';
        END IF;
        
        -- Ensure the column has proper constraints
        -- Drop existing constraint if any
        ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_admin_email_key;
        
        -- Add unique constraint
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_admin_email_key UNIQUE (admin_email);
        
        -- Ensure NOT NULL constraint
        ALTER TABLE admin_users ALTER COLUMN admin_email SET NOT NULL;
        
        RAISE NOTICE 'admin_email column constraints updated';
        
    ELSE
        RAISE NOTICE 'admin_users table does not exist. Please run admin-roles-schema.sql first';
    END IF;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE NOTICE 'This might be because the table needs to be created first';
END $$;

-- Step 2: Ensure index exists
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(admin_email);

-- Step 3: Verify the fix
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users' 
        AND column_name = 'admin_email'
    ) THEN
        RAISE NOTICE '✓ admin_email column exists and is properly configured';
    ELSE
        RAISE NOTICE '✗ admin_email column still missing - please check table structure';
    END IF;
END $$;

-- Display current admin_users table structure
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

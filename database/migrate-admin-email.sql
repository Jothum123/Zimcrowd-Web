-- Migration: Add admin_email column to existing admin_users table
-- This script safely adds the column even if the table already exists

-- Step 1: Check and add admin_email column
DO $$
BEGIN
    -- Add admin_email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users' 
        AND column_name = 'admin_email'
    ) THEN
        -- Add the column as nullable first
        ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255);
        RAISE NOTICE '✓ Added admin_email column';
        
        -- Populate with default values for existing rows
        UPDATE admin_users 
        SET admin_email = 'admin' || id::text || '@zimcrowd.com' 
        WHERE admin_email IS NULL;
        RAISE NOTICE '✓ Populated admin_email for existing rows';
        
        -- Now make it NOT NULL
        ALTER TABLE admin_users ALTER COLUMN admin_email SET NOT NULL;
        RAISE NOTICE '✓ Set admin_email as NOT NULL';
        
        -- Add unique constraint
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_admin_email_key UNIQUE (admin_email);
        RAISE NOTICE '✓ Added UNIQUE constraint on admin_email';
        
        -- Create index
        CREATE INDEX idx_admin_users_email ON admin_users(admin_email);
        RAISE NOTICE '✓ Created index on admin_email';
    ELSE
        RAISE NOTICE 'admin_email column already exists';
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'admin_email column already exists (caught exception)';
    WHEN others THEN
        RAISE NOTICE 'Error: %', SQLERRM;
END $$;

-- Step 2: Verify the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'admin_users' 
        AND column_name = 'admin_email'
    ) THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ SUCCESS: admin_email column is ready!';
        RAISE NOTICE '========================================';
    ELSE
        RAISE EXCEPTION 'FAILED: admin_email column still missing';
    END IF;
END $$;

-- Step 3: Display current table structure
SELECT 
    'Current admin_users structure:' as info,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'admin_users'
ORDER BY ordinal_position;

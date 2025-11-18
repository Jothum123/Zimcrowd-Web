-- Fix: Remove NOT NULL constraint from user_id column
-- The user_id should be optional (nullable) since admin users don't need to be linked to regular users

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fixing user_id constraint...';
    RAISE NOTICE '========================================';
    
    -- Check if user_id column exists and has NOT NULL constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Remove NOT NULL constraint
        ALTER TABLE admin_users ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✓ Removed NOT NULL constraint from user_id';
    ELSE
        RAISE NOTICE '✓ user_id is already nullable';
    END IF;
    
    -- Verify the fix
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'user_id'
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ SUCCESS! user_id is now nullable';
        RAISE NOTICE '✓ You can now run admin-roles-schema-fixed.sql';
        RAISE NOTICE '========================================';
    ELSE
        RAISE NOTICE '========================================';
        RAISE NOTICE '✗ FAILED: user_id is still NOT NULL';
        RAISE NOTICE '========================================';
    END IF;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- Show current user_id column info
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_users' 
AND column_name = 'user_id';

-- SIMPLE FIX: Just fix the constraints
-- Run this if FINAL_COMPLETE_FIX.sql has errors

-- Step 1: Rename admin_role_id to role_id (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' AND column_name = 'admin_role_id'
    ) THEN
        ALTER TABLE admin_users RENAME COLUMN admin_role_id TO role_id;
        RAISE NOTICE '✓ Renamed admin_role_id to role_id';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: admin_role_id might not exist';
END $$;

-- Step 2: Make user_id nullable
DO $$
BEGIN
    ALTER TABLE admin_users ALTER COLUMN user_id DROP NOT NULL;
    RAISE NOTICE '✓ Made user_id nullable';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: user_id constraint already removed or column does not exist';
END $$;

-- Step 3: Make role_id nullable
DO $$
BEGIN
    ALTER TABLE admin_users ALTER COLUMN role_id DROP NOT NULL;
    RAISE NOTICE '✓ Made role_id nullable';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Note: role_id constraint already removed or column does not exist';
END $$;

-- Verify
SELECT 
    '✓ DONE! Check the structure below:' as status;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
AND column_name IN ('user_id', 'role_id', 'admin_role_id', 'admin_email', 'api_key')
ORDER BY column_name;

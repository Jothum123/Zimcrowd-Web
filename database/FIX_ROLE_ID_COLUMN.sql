-- Fix: Rename admin_role_id to role_id (or vice versa)
-- The schema expects role_id but the table might have admin_role_id

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fixing role_id column name...';
    RAISE NOTICE '========================================';
    
    -- Check if admin_role_id exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'admin_role_id'
    ) THEN
        -- Rename admin_role_id to role_id
        ALTER TABLE admin_users RENAME COLUMN admin_role_id TO role_id;
        RAISE NOTICE '✓ Renamed admin_role_id to role_id';
    
    -- Check if role_id exists
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name = 'role_id'
    ) THEN
        RAISE NOTICE '✓ role_id column already exists';
        
        -- Ensure it's nullable
        ALTER TABLE admin_users ALTER COLUMN role_id DROP NOT NULL;
        RAISE NOTICE '✓ Ensured role_id is nullable';
    
    ELSE
        -- Neither exists, add role_id
        ALTER TABLE admin_users ADD COLUMN role_id UUID;
        RAISE NOTICE '✓ Added role_id column';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ SUCCESS! role_id column is ready';
    RAISE NOTICE '========================================';
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;

-- Show current columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users' 
AND column_name IN ('role_id', 'admin_role_id')
ORDER BY column_name;

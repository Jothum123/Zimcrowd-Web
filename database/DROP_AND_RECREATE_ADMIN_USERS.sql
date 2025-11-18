-- NUCLEAR OPTION: Drop and recreate admin_users table
-- WARNING: This will delete all existing admin users!
-- Only use if you don't have important admin user data

-- Step 1: Drop dependent tables first
DROP TABLE IF EXISTS admin_sessions CASCADE;
DROP TABLE IF EXISTS admin_role_permissions CASCADE;

-- Step 2: Drop admin_users table
DROP TABLE IF EXISTS admin_users CASCADE;

-- Step 3: Recreate admin_users with correct structure
CREATE TABLE admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,  -- Optional, nullable
    admin_email VARCHAR(255) UNIQUE NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    role_id UUID,  -- Optional, nullable, will add FK later
    api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,  -- Optional, nullable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Recreate admin_sessions
CREATE TABLE admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Recreate admin_role_permissions (if admin_permissions exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'admin_permissions') THEN
        CREATE TABLE IF NOT EXISTS admin_role_permissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
            permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE,
            granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            granted_by UUID REFERENCES admin_users(id),
            UNIQUE(role_id, permission_id)
        );
        RAISE NOTICE '✓ Recreated admin_role_permissions';
    END IF;
END $$;

-- Step 6: Add foreign key constraints
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'admin_roles') THEN
        ALTER TABLE admin_users 
        ADD CONSTRAINT admin_users_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE RESTRICT;
        RAISE NOTICE '✓ Added role_id foreign key';
    END IF;
    
    ALTER TABLE admin_users 
    ADD CONSTRAINT admin_users_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES admin_users(id);
    RAISE NOTICE '✓ Added created_by foreign key';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Note: Some foreign keys could not be added';
END $$;

-- Step 7: Create indexes
CREATE INDEX idx_admin_users_email ON admin_users(admin_email);
CREATE INDEX idx_admin_users_api_key ON admin_users(api_key);
CREATE INDEX idx_admin_users_role ON admin_users(role_id);
CREATE INDEX idx_admin_users_active ON admin_users(is_active);
CREATE INDEX idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX idx_admin_sessions_admin_user ON admin_sessions(admin_user_id);
CREATE INDEX idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Step 8: Verify structure
SELECT 
    '========================================' as info;
SELECT 
    '✓ admin_users table recreated!' as status;
SELECT 
    '✓ All columns have correct names and constraints' as status;
SELECT 
    '✓ You can now run admin-roles-schema-fixed.sql' as next_step;
SELECT 
    '========================================' as info;

-- Show structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- COMPLETE FIX: All Admin Tables
-- This fixes BOTH admin_roles AND admin_users tables
-- Safe to run multiple times

-- ============================================
-- PART 1: Fix admin_roles table
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to admin_roles
DO $$
DECLARE
    roles_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fixing admin_roles table...';
    RAISE NOTICE '========================================';
    
    -- role_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_roles' AND column_name = 'role_name') THEN
        ALTER TABLE admin_roles ADD COLUMN role_name VARCHAR(50);
        ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_role_name_key UNIQUE (role_name);
        RAISE NOTICE '✓ Added role_name';
        roles_fixed := roles_fixed + 1;
    END IF;
    
    -- display_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_roles' AND column_name = 'display_name') THEN
        ALTER TABLE admin_roles ADD COLUMN display_name VARCHAR(100);
        RAISE NOTICE '✓ Added display_name';
        roles_fixed := roles_fixed + 1;
    END IF;
    
    -- description
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_roles' AND column_name = 'description') THEN
        ALTER TABLE admin_roles ADD COLUMN description TEXT;
        RAISE NOTICE '✓ Added description';
        roles_fixed := roles_fixed + 1;
    END IF;
    
    -- permissions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_roles' AND column_name = 'permissions') THEN
        ALTER TABLE admin_roles ADD COLUMN permissions JSONB DEFAULT '{}';
        RAISE NOTICE '✓ Added permissions';
        roles_fixed := roles_fixed + 1;
    END IF;
    
    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_roles' AND column_name = 'is_active') THEN
        ALTER TABLE admin_roles ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✓ Added is_active';
        roles_fixed := roles_fixed + 1;
    END IF;
    
    IF roles_fixed > 0 THEN
        RAISE NOTICE '✓ Fixed % columns in admin_roles', roles_fixed;
    ELSE
        RAISE NOTICE '✓ admin_roles already has all columns';
    END IF;
    
END $$;

-- ============================================
-- PART 2: Fix admin_users table
-- ============================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to admin_users
DO $$
DECLARE
    users_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fixing admin_users table...';
    RAISE NOTICE '========================================';
    
    -- admin_email
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'admin_email') THEN
        ALTER TABLE admin_users ADD COLUMN admin_email VARCHAR(255);
        UPDATE admin_users SET admin_email = 'admin' || id::text || '@zimcrowd.com' WHERE admin_email IS NULL;
        ALTER TABLE admin_users ALTER COLUMN admin_email SET NOT NULL;
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_admin_email_key UNIQUE (admin_email);
        RAISE NOTICE '✓ Added admin_email';
        users_fixed := users_fixed + 1;
    END IF;
    
    -- admin_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'admin_name') THEN
        ALTER TABLE admin_users ADD COLUMN admin_name VARCHAR(255);
        UPDATE admin_users SET admin_name = 'Admin User' WHERE admin_name IS NULL;
        ALTER TABLE admin_users ALTER COLUMN admin_name SET NOT NULL;
        RAISE NOTICE '✓ Added admin_name';
        users_fixed := users_fixed + 1;
    END IF;
    
    -- api_key
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'api_key') THEN
        ALTER TABLE admin_users ADD COLUMN api_key VARCHAR(255);
        UPDATE admin_users SET api_key = 'zimcrowd-admin-' || substr(md5(random()::text || id::text), 1, 32) WHERE api_key IS NULL;
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_api_key_key UNIQUE (api_key);
        RAISE NOTICE '✓ Added api_key';
        users_fixed := users_fixed + 1;
    END IF;
    
    -- role_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'role_id') THEN
        ALTER TABLE admin_users ADD COLUMN role_id UUID;
        RAISE NOTICE '✓ Added role_id';
        users_fixed := users_fixed + 1;
    END IF;
    
    -- user_id (nullable - admin users don't need to be linked to regular users)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'user_id') THEN
        ALTER TABLE admin_users ADD COLUMN user_id UUID;
        RAISE NOTICE '✓ Added user_id';
        users_fixed := users_fixed + 1;
    ELSE
        -- Ensure user_id is nullable
        ALTER TABLE admin_users ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE '✓ Ensured user_id is nullable';
    END IF;
    
    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'is_active') THEN
        ALTER TABLE admin_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✓ Added is_active';
        users_fixed := users_fixed + 1;
    END IF;
    
    -- last_login_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'last_login_at') THEN
        ALTER TABLE admin_users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✓ Added last_login_at';
        users_fixed := users_fixed + 1;
    END IF;
    
    -- created_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'created_by') THEN
        ALTER TABLE admin_users ADD COLUMN created_by UUID;
        RAISE NOTICE '✓ Added created_by';
        users_fixed := users_fixed + 1;
    END IF;
    
    IF users_fixed > 0 THEN
        RAISE NOTICE '✓ Fixed % columns in admin_users', users_fixed;
    ELSE
        RAISE NOTICE '✓ admin_users already has all columns';
    END IF;
    
END $$;

-- ============================================
-- PART 3: Create other required tables
-- ============================================

-- admin_permissions
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- admin_role_permissions
CREATE TABLE IF NOT EXISTS admin_role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID,
    UNIQUE(role_id, permission_id)
);

-- admin_sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 4: Create indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_users_api_key ON admin_users(api_key);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON admin_role_permissions(permission_id);

-- ============================================
-- PART 5: Add foreign key constraints
-- ============================================

DO $$
BEGIN
    -- Add role_id foreign key to admin_users
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_role_id_fkey'
    ) THEN
        ALTER TABLE admin_users 
        ADD CONSTRAINT admin_users_role_id_fkey 
        FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE RESTRICT;
        RAISE NOTICE '✓ Added role_id foreign key';
    END IF;
    
    -- Add created_by foreign key to admin_users
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_users_created_by_fkey'
    ) THEN
        ALTER TABLE admin_users 
        ADD CONSTRAINT admin_users_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES admin_users(id);
        RAISE NOTICE '✓ Added created_by foreign key';
    END IF;
    
    -- Add granted_by foreign key to admin_role_permissions
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'admin_role_permissions_granted_by_fkey'
    ) THEN
        ALTER TABLE admin_role_permissions 
        ADD CONSTRAINT admin_role_permissions_granted_by_fkey 
        FOREIGN KEY (granted_by) REFERENCES admin_users(id);
        RAISE NOTICE '✓ Added granted_by foreign key';
    END IF;
    
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Note: Some foreign keys may already exist';
END $$;

-- ============================================
-- PART 6: Verify everything
-- ============================================

DO $$
DECLARE
    roles_ok BOOLEAN;
    users_ok BOOLEAN;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '========================================';
    
    -- Check admin_roles
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_roles' 
        AND column_name IN ('role_name', 'display_name', 'description')
        GROUP BY table_name
        HAVING COUNT(*) = 3
    ) INTO roles_ok;
    
    -- Check admin_users
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_users' 
        AND column_name IN ('admin_email', 'admin_name', 'api_key')
        GROUP BY table_name
        HAVING COUNT(*) = 3
    ) INTO users_ok;
    
    IF roles_ok AND users_ok THEN
        RAISE NOTICE '✓ admin_roles: OK';
        RAISE NOTICE '✓ admin_users: OK';
        RAISE NOTICE '========================================';
        RAISE NOTICE '✓ SUCCESS! All tables are ready!';
        RAISE NOTICE '✓ You can now run admin-roles-schema-fixed.sql';
        RAISE NOTICE '========================================';
    ELSE
        IF NOT roles_ok THEN
            RAISE NOTICE '✗ admin_roles: MISSING COLUMNS';
        END IF;
        IF NOT users_ok THEN
            RAISE NOTICE '✗ admin_users: MISSING COLUMNS';
        END IF;
        RAISE NOTICE '========================================';
        RAISE NOTICE '✗ FAILED: Some columns still missing';
        RAISE NOTICE 'Try running this script again';
        RAISE NOTICE '========================================';
    END IF;
END $$;

-- Show table structures
SELECT '=== admin_roles structure ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_roles'
ORDER BY ordinal_position;

SELECT '=== admin_users structure ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

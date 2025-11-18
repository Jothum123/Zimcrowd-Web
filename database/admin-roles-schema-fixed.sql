-- Admin Roles and Permissions System - FIXED VERSION
-- Comprehensive role-based access control for admin dashboard
-- This version handles existing tables and missing columns gracefully

-- Step 1: Drop existing tables if they have issues (OPTIONAL - comment out if you want to preserve data)
-- DROP TABLE IF EXISTS admin_sessions CASCADE;
-- DROP TABLE IF EXISTS admin_role_permissions CASCADE;
-- DROP TABLE IF EXISTS admin_permissions CASCADE;
-- DROP TABLE IF EXISTS admin_users CASCADE;
-- DROP TABLE IF EXISTS admin_roles CASCADE;

-- Step 2: Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create admin_users table with admin_email column
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,  -- Made optional, references users(id) if exists
    admin_email VARCHAR(255) UNIQUE NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES admin_roles(id) ON DELETE RESTRICT,
    api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,  -- Made optional to avoid circular reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add foreign key constraints after table creation (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_fkey;
        ALTER TABLE admin_users ADD CONSTRAINT admin_users_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to users table';
    ELSE
        RAISE NOTICE 'users table does not exist - skipping foreign key constraint';
    END IF;
END $$;

-- Step 5: Add self-referencing foreign key for created_by
DO $$
BEGIN
    ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_created_by_fkey;
    ALTER TABLE admin_users ADD CONSTRAINT admin_users_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES admin_users(id);
    RAISE NOTICE 'Added self-referencing foreign key for created_by';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add created_by constraint: %', SQLERRM;
END $$;

-- Step 6: Create admin_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create role_permissions junction table
CREATE TABLE IF NOT EXISTS admin_role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID,  -- Made optional
    UNIQUE(role_id, permission_id)
);

-- Step 8: Add foreign key for granted_by after admin_users exists
DO $$
BEGIN
    ALTER TABLE admin_role_permissions DROP CONSTRAINT IF EXISTS admin_role_permissions_granted_by_fkey;
    ALTER TABLE admin_role_permissions ADD CONSTRAINT admin_role_permissions_granted_by_fkey 
        FOREIGN KEY (granted_by) REFERENCES admin_users(id);
    RAISE NOTICE 'Added granted_by foreign key constraint';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add granted_by constraint: %', SQLERRM;
END $$;

-- Step 9: Create admin_sessions table for session management
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

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_users_api_key ON admin_users(api_key);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON admin_role_permissions(permission_id);

-- Step 11: Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Step 12: Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can access admin_roles" ON admin_roles;
DROP POLICY IF EXISTS "Service role can access admin_users" ON admin_users;
DROP POLICY IF EXISTS "Service role can access admin_permissions" ON admin_permissions;
DROP POLICY IF EXISTS "Service role can access admin_role_permissions" ON admin_role_permissions;
DROP POLICY IF EXISTS "Service role can access admin_sessions" ON admin_sessions;

-- Step 13: Create RLS Policies - Only service role can access admin tables
CREATE POLICY "Service role can access admin_roles" ON admin_roles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access admin_users" ON admin_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access admin_permissions" ON admin_permissions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access admin_role_permissions" ON admin_role_permissions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access admin_sessions" ON admin_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Step 14: Insert default permissions
INSERT INTO admin_permissions (permission_name, display_name, description, category) VALUES
-- Dashboard permissions
('dashboard.view', 'View Dashboard', 'Access to main dashboard', 'dashboard'),
('dashboard.analytics', 'View Analytics', 'Access to analytics and reports', 'dashboard'),

-- User management permissions
('users.view', 'View Users', 'View user list and details', 'users'),
('users.create', 'Create Users', 'Create new users', 'users'),
('users.update', 'Update Users', 'Edit user information', 'users'),
('users.delete', 'Delete Users', 'Delete users', 'users'),
('users.suspend', 'Suspend Users', 'Suspend/unsuspend users', 'users'),

-- KYC permissions
('kyc.view', 'View KYC', 'View KYC submissions', 'kyc'),
('kyc.approve', 'Approve KYC', 'Approve KYC submissions', 'kyc'),
('kyc.reject', 'Reject KYC', 'Reject KYC submissions', 'kyc'),

-- Loan permissions
('loans.view', 'View Loans', 'View loan applications', 'loans'),
('loans.approve', 'Approve Loans', 'Approve loan applications', 'loans'),
('loans.reject', 'Reject Loans', 'Reject loan applications', 'loans'),
('loans.manage', 'Manage Loans', 'Full loan management', 'loans'),

-- Finance permissions
('finance.view', 'View Finance', 'View financial data', 'finance'),
('finance.transactions', 'Manage Transactions', 'Process transactions', 'finance'),
('finance.reports', 'Financial Reports', 'Generate financial reports', 'finance'),

-- Wallet permissions
('wallet.view', 'View Wallets', 'View wallet information', 'wallet'),
('wallet.manage', 'Manage Wallets', 'Manage wallet operations', 'wallet'),
('wallet.monitor', 'Monitor Wallets', 'Monitor wallet activity', 'wallet'),

-- Transaction permissions
('transactions.view', 'View Transactions', 'View transaction history', 'transactions'),
('transactions.create', 'Create Transactions', 'Create manual transactions', 'transactions'),
('transactions.approve', 'Approve Transactions', 'Approve pending transactions', 'transactions'),

-- Admin management permissions
('admin.view', 'View Admins', 'View admin users', 'admin'),
('admin.create', 'Create Admins', 'Create new admin users', 'admin'),
('admin.update', 'Update Admins', 'Edit admin users', 'admin'),
('admin.delete', 'Delete Admins', 'Delete admin users', 'admin'),
('admin.roles', 'Manage Roles', 'Manage admin roles', 'admin'),

-- System permissions
('system.settings', 'System Settings', 'Manage system settings', 'system'),
('system.logs', 'View Logs', 'View system logs', 'system'),
('system.backup', 'System Backup', 'Perform system backups', 'system'),

-- Notification permissions
('notifications.view', 'View Notifications', 'View notifications', 'notifications'),
('notifications.send', 'Send Notifications', 'Send notifications to users', 'notifications'),

-- Report permissions
('reports.view', 'View Reports', 'View all reports', 'reports'),
('reports.generate', 'Generate Reports', 'Generate custom reports', 'reports'),
('reports.export', 'Export Reports', 'Export reports', 'reports')
ON CONFLICT (permission_name) DO NOTHING;

-- Step 15: Insert default roles
INSERT INTO admin_roles (role_name, display_name, description) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions'),
('admin', 'Administrator', 'General admin access with most permissions'),
('finance_manager', 'Finance Manager', 'Financial operations and reporting'),
('customer_support', 'Customer Support', 'User support and basic operations'),
('analyst', 'Analyst', 'Read-only access for analytics'),
('moderator', 'Moderator', 'User moderation and content management')
ON CONFLICT (role_name) DO NOTHING;

-- Step 16: Assign permissions to roles
DO $$
DECLARE
    super_admin_id UUID;
    admin_id UUID;
    finance_manager_id UUID;
    customer_support_id UUID;
    analyst_id UUID;
    moderator_id UUID;
    perm_id UUID;
BEGIN
    -- Get role IDs
    SELECT id INTO super_admin_id FROM admin_roles WHERE role_name = 'super_admin';
    SELECT id INTO admin_id FROM admin_roles WHERE role_name = 'admin';
    SELECT id INTO finance_manager_id FROM admin_roles WHERE role_name = 'finance_manager';
    SELECT id INTO customer_support_id FROM admin_roles WHERE role_name = 'customer_support';
    SELECT id INTO analyst_id FROM admin_roles WHERE role_name = 'analyst';
    SELECT id INTO moderator_id FROM admin_roles WHERE role_name = 'moderator';

    -- Super Admin gets ALL permissions
    FOR perm_id IN SELECT id FROM admin_permissions LOOP
        INSERT INTO admin_role_permissions (role_id, permission_id) 
        VALUES (super_admin_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Admin gets most permissions (except system critical ones)
    FOR perm_id IN SELECT id FROM admin_permissions 
        WHERE permission_name NOT IN ('admin.delete', 'system.backup') LOOP
        INSERT INTO admin_role_permissions (role_id, permission_id) 
        VALUES (admin_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Finance Manager gets finance-related permissions
    FOR perm_id IN SELECT id FROM admin_permissions 
        WHERE category IN ('dashboard', 'finance', 'wallet', 'transactions', 'reports') LOOP
        INSERT INTO admin_role_permissions (role_id, permission_id) 
        VALUES (finance_manager_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Customer Support gets user and basic permissions
    FOR perm_id IN SELECT id FROM admin_permissions 
        WHERE category IN ('dashboard', 'users', 'kyc', 'notifications') 
        AND permission_name NOT LIKE '%.delete' LOOP
        INSERT INTO admin_role_permissions (role_id, permission_id) 
        VALUES (customer_support_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Analyst gets read-only permissions
    FOR perm_id IN SELECT id FROM admin_permissions 
        WHERE permission_name LIKE '%.view' OR category = 'reports' LOOP
        INSERT INTO admin_role_permissions (role_id, permission_id) 
        VALUES (analyst_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Moderator gets user management permissions
    FOR perm_id IN SELECT id FROM admin_permissions 
        WHERE category IN ('dashboard', 'users', 'kyc', 'notifications') LOOP
        INSERT INTO admin_role_permissions (role_id, permission_id) 
        VALUES (moderator_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Permissions assigned to all roles successfully';
END $$;

-- Step 17: Create a default super admin user
DO $$
DECLARE
    super_admin_role_id UUID;
    admin_user_id UUID;
    generated_api_key VARCHAR(255);
BEGIN
    SELECT id INTO super_admin_role_id FROM admin_roles WHERE role_name = 'super_admin';
    
    -- Generate a secure API key
    generated_api_key := 'zimcrowd-admin-' || substr(md5(random()::text || clock_timestamp()::text), 1, 32);
    
    INSERT INTO admin_users (
        admin_email, 
        admin_name, 
        role_id, 
        api_key,
        is_active
    ) VALUES (
        'admin@zimcrowd.com',
        'System Administrator',
        super_admin_role_id,
        generated_api_key,
        true
    ) ON CONFLICT (admin_email) DO UPDATE 
    SET 
        role_id = super_admin_role_id,
        is_active = true,
        updated_at = NOW()
    RETURNING id INTO admin_user_id;
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE '✓ Super admin created/updated: admin@zimcrowd.com';
        RAISE NOTICE '✓ API Key: %', generated_api_key;
    END IF;
END $$;

-- Step 18: Add comments for documentation
COMMENT ON TABLE admin_roles IS 'Admin roles with different permission levels';
COMMENT ON TABLE admin_users IS 'Admin users with role assignments';
COMMENT ON TABLE admin_permissions IS 'Granular permissions for admin operations';
COMMENT ON TABLE admin_role_permissions IS 'Junction table linking roles to permissions';
COMMENT ON TABLE admin_sessions IS 'Admin user session management';
COMMENT ON COLUMN admin_users.admin_email IS 'Unique email address for admin user';
COMMENT ON COLUMN admin_users.api_key IS 'API key for programmatic access';

-- Step 19: Verify the setup
DO $$
DECLARE
    role_count INTEGER;
    permission_count INTEGER;
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM admin_roles;
    SELECT COUNT(*) INTO permission_count FROM admin_permissions;
    SELECT COUNT(*) INTO admin_count FROM admin_users;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Admin Roles System Setup Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Roles created: %', role_count;
    RAISE NOTICE 'Permissions created: %', permission_count;
    RAISE NOTICE 'Admin users created: %', admin_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Default roles: super_admin, admin, finance_manager, customer_support, analyst, moderator';
    RAISE NOTICE 'Default admin: admin@zimcrowd.com';
    RAISE NOTICE '========================================';
END $$;

-- Success message
SELECT 
    '✓ Admin roles system created successfully!' as status,
    'Default roles: super_admin, admin, finance_manager, customer_support, analyst, moderator' as roles_created,
    'Check the notices above for the admin API key' as note;

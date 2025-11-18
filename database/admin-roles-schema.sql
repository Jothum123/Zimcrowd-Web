-- Admin Roles and Permissions System
-- Comprehensive role-based access control for admin dashboard

-- Create admin_roles table
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

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    admin_email VARCHAR(255) UNIQUE NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES admin_roles(id) ON DELETE RESTRICT,
    api_key VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS admin_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS admin_role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES admin_permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES admin_users(id),
    UNIQUE(role_id, permission_id)
);

-- Create admin_sessions table for session management
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_users_api_key ON admin_users(api_key);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON admin_role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON admin_role_permissions(permission_id);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only service role can access admin tables
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

-- Insert default permissions
INSERT INTO admin_permissions (permission_name, display_name, description, category) VALUES
-- Dashboard permissions
('dashboard.view', 'View Dashboard', 'Access to main admin dashboard', 'dashboard'),
('dashboard.analytics', 'View Analytics', 'Access to analytics and reports', 'dashboard'),

-- User management permissions
('users.view', 'View Users', 'View user list and details', 'users'),
('users.edit', 'Edit Users', 'Edit user information', 'users'),
('users.suspend', 'Suspend Users', 'Suspend/unsuspend user accounts', 'users'),
('users.delete', 'Delete Users', 'Delete user accounts', 'users'),

-- Financial permissions
('finance.view', 'View Financial Data', 'View financial transactions and reports', 'finance'),
('finance.deposits', 'Manual Deposits', 'Process manual deposits', 'finance'),
('finance.withdrawals', 'Manual Withdrawals', 'Process manual withdrawals and debits', 'finance'),
('finance.bulk_operations', 'Bulk Operations', 'Process bulk financial operations', 'finance'),
('finance.bank_transfers', 'Bank Transfers', 'Process bank transfer deposits', 'finance'),

-- Wallet management permissions
('wallet.view', 'View Wallets', 'View user wallet balances and history', 'wallet'),
('wallet.monitor', 'Monitor Wallets', 'Access wallet monitoring dashboard', 'wallet'),
('wallet.suspicious', 'Suspicious Activity', 'View and manage suspicious wallet activity', 'wallet'),

-- Transaction permissions
('transactions.view', 'View Transactions', 'View transaction history', 'transactions'),
('transactions.approve', 'Approve Transactions', 'Approve pending transactions', 'transactions'),
('transactions.cancel', 'Cancel Transactions', 'Cancel transactions', 'transactions'),
('transactions.refund', 'Process Refunds', 'Process transaction refunds', 'transactions'),

-- Loan management permissions
('loans.view', 'View Loans', 'View loan applications and details', 'loans'),
('loans.approve', 'Approve Loans', 'Approve loan applications', 'loans'),
('loans.reject', 'Reject Loans', 'Reject loan applications', 'loans'),
('loans.manage', 'Manage Loans', 'Full loan management capabilities', 'loans'),

-- KYC permissions
('kyc.view', 'View KYC', 'View KYC submissions', 'kyc'),
('kyc.approve', 'Approve KYC', 'Approve KYC submissions', 'kyc'),
('kyc.reject', 'Reject KYC', 'Reject KYC submissions', 'kyc'),

-- System administration permissions
('system.settings', 'System Settings', 'Manage system settings', 'system'),
('system.admin_users', 'Manage Admins', 'Manage admin users and roles', 'system'),
('system.audit_logs', 'Audit Logs', 'View system audit logs', 'system'),
('system.maintenance', 'System Maintenance', 'System maintenance operations', 'system'),

-- Reporting permissions
('reports.financial', 'Financial Reports', 'Generate financial reports', 'reports'),
('reports.user', 'User Reports', 'Generate user reports', 'reports'),
('reports.export', 'Export Data', 'Export data and reports', 'reports'),

-- Notification permissions
('notifications.send', 'Send Notifications', 'Send notifications to users', 'notifications'),
('notifications.bulk', 'Bulk Notifications', 'Send bulk notifications', 'notifications')

ON CONFLICT (permission_name) DO NOTHING;

-- Insert default admin roles
INSERT INTO admin_roles (role_name, display_name, description, permissions) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', '{"all": true}'),
('admin', 'Administrator', 'Standard admin with most permissions', '{"level": "admin"}'),
('finance_manager', 'Finance Manager', 'Financial operations and wallet management', '{"level": "finance"}'),
('customer_support', 'Customer Support', 'User support and basic operations', '{"level": "support"}'),
('analyst', 'Data Analyst', 'Read-only access for analytics and reporting', '{"level": "analyst"}'),
('moderator', 'Content Moderator', 'User management and content moderation', '{"level": "moderator"}')

ON CONFLICT (role_name) DO NOTHING;

-- Assign permissions to roles
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

    -- Admin gets most permissions (except system admin functions)
    FOR perm_id IN SELECT id FROM admin_permissions WHERE permission_name NOT LIKE 'system.%' LOOP
        INSERT INTO admin_role_permissions (role_id, permission_id) 
        VALUES (admin_id, perm_id) ON CONFLICT DO NOTHING;
    END LOOP;

    -- Finance Manager gets financial and wallet permissions
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

END $$;

-- Create a default super admin user (you should change these details)
DO $$
DECLARE
    super_admin_role_id UUID;
    admin_user_id UUID;
BEGIN
    SELECT id INTO super_admin_role_id FROM admin_roles WHERE role_name = 'super_admin';
    
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
        'admin-super-key-' || substr(md5(random()::text), 1, 16),
        true
    ) ON CONFLICT (admin_email) DO NOTHING
    RETURNING id INTO admin_user_id;
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Created default super admin: admin@zimcrowd.com';
    ELSE
        RAISE NOTICE 'Super admin already exists: admin@zimcrowd.com';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE admin_roles IS 'Admin roles with different permission levels';
COMMENT ON TABLE admin_users IS 'Admin users with role assignments';
COMMENT ON TABLE admin_permissions IS 'Granular permissions for admin operations';
COMMENT ON TABLE admin_role_permissions IS 'Junction table linking roles to permissions';
COMMENT ON TABLE admin_sessions IS 'Admin user session management';

-- Success message
SELECT 'Admin roles system created successfully!' as status,
       'Default roles: super_admin, admin, finance_manager, customer_support, analyst, moderator' as roles_created;

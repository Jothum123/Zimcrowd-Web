-- =====================================================
-- SEED DATA FOR ADMIN DASHBOARD
-- Run this SQL in your Supabase SQL Editor
-- Run AFTER: loan-applications-schema.sql and admin-dashboard-schema.sql
-- =====================================================

-- =====================================================
-- DROP EXISTING POLICIES (only if tables exist)
-- =====================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        DROP POLICY IF EXISTS "Admin users can view own data" ON admin_users;
        DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
    END IF;
END $$;

-- =====================================================
-- ENSURE ADMIN TABLES EXIST
-- =====================================================

-- Admin Roles Table
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    role_description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_role_id UUID REFERENCES admin_roles(id),
    full_name VARCHAR(255),
    email VARCHAR(255),
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SEED ADMIN ROLES
-- =====================================================

INSERT INTO admin_roles (role_name, role_description, permissions) VALUES
('super_admin', 'Super Administrator - Full system access', '["all"]'),
('admin', 'Administrator - Manage users, loans, investments', '["users.read", "users.write", "loans.read", "loans.write", "loans.approve", "loans.reject", "investments.read", "investments.write", "analytics.read", "reports.read", "system.read"]'),
('loan_officer', 'Loan Officer - Review and process loan applications', '["users.read", "loans.read", "loans.write", "loans.approve", "loans.reject", "analytics.read"]'),
('support', 'Customer Support - View and assist users', '["users.read", "users.write", "loans.read", "investments.read"]'),
('analyst', 'Data Analyst - View analytics and reports', '["users.read", "loans.read", "investments.read", "analytics.read", "reports.read"]'),
('auditor', 'Auditor - Read-only access for compliance', '["users.read", "loans.read", "investments.read", "analytics.read", "reports.read", "audit.read"]')
ON CONFLICT (role_name) DO UPDATE SET
    role_description = EXCLUDED.role_description,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- =====================================================
-- CREATE DEFAULT ADMIN USER
-- Note: You need to first create a user in Supabase Auth
-- Then update this with the actual user_id
-- =====================================================

-- Function to create admin user from email
CREATE OR REPLACE FUNCTION create_admin_from_email(
    admin_email TEXT,
    admin_name TEXT,
    admin_role TEXT DEFAULT 'admin'
)
RETURNS UUID AS $$
DECLARE
    auth_user_id UUID;
    role_id UUID;
    new_admin_id UUID;
BEGIN
    -- Get user_id from auth.users
    SELECT id INTO auth_user_id FROM auth.users WHERE email = admin_email;
    
    IF auth_user_id IS NULL THEN
        RAISE NOTICE 'User with email % not found in auth.users', admin_email;
        RETURN NULL;
    END IF;
    
    -- Get role_id
    SELECT id INTO role_id FROM admin_roles WHERE role_name = admin_role;
    
    IF role_id IS NULL THEN
        SELECT id INTO role_id FROM admin_roles WHERE role_name = 'admin';
    END IF;
    
    -- Check if admin already exists
    SELECT id INTO new_admin_id FROM admin_users WHERE user_id = auth_user_id;
    
    IF new_admin_id IS NOT NULL THEN
        RAISE NOTICE 'Admin user already exists for %', admin_email;
        RETURN new_admin_id;
    END IF;
    
    -- Create admin user
    INSERT INTO admin_users (user_id, admin_role_id, full_name, email, role, is_active)
    VALUES (auth_user_id, role_id, admin_name, admin_email, admin_role, true)
    RETURNING id INTO new_admin_id;
    
    RAISE NOTICE 'Created admin user % with role %', admin_email, admin_role;
    RETURN new_admin_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTIFICATIONS TABLE FOR USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications') THEN
        CREATE POLICY "Users can view own notifications" 
        ON notifications FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- =====================================================
-- ADMIN DASHBOARD STATS VIEW
-- =====================================================

CREATE OR REPLACE VIEW admin_loan_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as pending_applications,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_applications,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_applications,
    COUNT(*) as total_applications,
    COALESCE(SUM(amount) FILTER (WHERE status = 'approved'), 0) as total_approved_amount,
    COALESCE(AVG(amount) FILTER (WHERE status = 'approved'), 0) as avg_approved_amount
FROM loan_applications;

CREATE OR REPLACE VIEW admin_market_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'funding') as loans_funding,
    COUNT(*) FILTER (WHERE status = 'active') as loans_active,
    COUNT(*) FILTER (WHERE status = 'completed') as loans_completed,
    COUNT(*) as total_market_loans,
    COALESCE(SUM(amount), 0) as total_loan_volume,
    COALESCE(SUM(funded_amount), 0) as total_funded_amount,
    COALESCE(AVG(funding_progress), 0) as avg_funding_progress
FROM primary_market_loans;

CREATE OR REPLACE VIEW admin_user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as new_users_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_month
FROM auth.users;

-- =====================================================
-- SAMPLE LOAN APPLICATIONS FOR ADMIN TESTING
-- =====================================================

-- Insert sample pending applications (only if loan_applications table exists and is empty)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loan_applications') THEN
        IF NOT EXISTS (SELECT 1 FROM loan_applications LIMIT 1) THEN
            INSERT INTO loan_applications (
                user_id, amount, currency, purpose, purpose_description, 
                term_months, interest_rate, risk_level, 
                borrower_name, borrower_occupation, borrower_location, 
                borrower_zim_score, borrower_verified, employment_type, 
                monthly_income, status, submitted_at
            )
            SELECT 
                id,
                (500 + (random() * 2500))::numeric(10,2),
                CASE WHEN random() > 0.3 THEN 'USD' ELSE 'ZWG' END,
                (ARRAY['Business', 'Education', 'Medical', 'Home', 'Agriculture'])[floor(random() * 5 + 1)::int],
                'Sample loan application for admin testing',
                (ARRAY[3, 6, 12, 18, 24])[floor(random() * 5 + 1)::int],
                (10 + random() * 10)::numeric(5,2),
                (ARRAY['Very Low', 'Low', 'Medium', 'High'])[floor(random() * 4 + 1)::int],
                'Test User ' || row_number() OVER (),
                'Employee',
                'Harare',
                (50 + random() * 35)::int,
                random() > 0.3,
                (ARRAY['civil_servant', 'private', 'informal', 'self_employed'])[floor(random() * 4 + 1)::int],
                (500 + random() * 2000)::numeric(10,2),
                'pending',
                NOW() - (random() * interval '7 days')
            FROM auth.users
            LIMIT 5;
            
            RAISE NOTICE 'Created sample loan applications for admin testing';
        END IF;
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check admin roles
-- SELECT * FROM admin_roles;

-- Check admin users
-- SELECT au.*, ar.role_name FROM admin_users au JOIN admin_roles ar ON au.admin_role_id = ar.id;

-- Check loan application stats
-- SELECT * FROM admin_loan_stats;

-- Check market stats
-- SELECT * FROM admin_market_stats;

-- Check pending applications for admin
-- SELECT * FROM loan_applications WHERE status = 'pending' ORDER BY submitted_at DESC;

-- =====================================================
-- HOW TO CREATE AN ADMIN USER
-- =====================================================
-- 1. First, register a user through the normal signup flow
-- 2. Then run: SELECT create_admin_from_email('your-email@example.com', 'Your Name', 'super_admin');
-- 3. The user will now have admin access

-- Example:
-- SELECT create_admin_from_email('admin@zimcrowd.com', 'Admin User', 'super_admin');

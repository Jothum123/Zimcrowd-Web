-- ZimScore Admin Features Migration
-- Adds tables and columns for admin ZimScore management and audit logging

-- Add ZimScore tracking columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS zimscore INTEGER CHECK (zimscore >= 0 AND zimscore <= 100),
ADD COLUMN IF NOT EXISTS zimscore_last_updated TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS zimscore_downgrade_reason TEXT,
ADD COLUMN IF NOT EXISTS zimscore_downgraded_by UUID,
ADD COLUMN IF NOT EXISTS zimscore_downgraded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS zimscore_increase_reason TEXT,
ADD COLUMN IF NOT EXISTS zimscore_increased_by UUID,
ADD COLUMN IF NOT EXISTS zimscore_increased_at TIMESTAMPTZ;

-- Create ZimScore audit log table for tracking all score changes
CREATE TABLE IF NOT EXISTS zimscore_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('MANUAL_DOWNGRADE', 'MANUAL_INCREASE', 'AUTOMATIC_CALCULATION', 'APPEAL_APPROVED', 'APPEAL_REJECTED', 'SYSTEM_ADJUSTMENT')),
    old_score INTEGER NOT NULL CHECK (old_score >= 0 AND old_score <= 100),
    new_score INTEGER NOT NULL CHECK (new_score >= 0 AND new_score <= 100),
    reason TEXT NOT NULL,
    evidence TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_zimscore_audit_user_id ON zimscore_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_audit_admin_id ON zimscore_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_audit_timestamp ON zimscore_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_zimscore_audit_action_type ON zimscore_audit_log(action_type);

-- Add index for user_profiles downgrade tracking
CREATE INDEX IF NOT EXISTS idx_user_profiles_zimscore_downgraded_by ON user_profiles(zimscore_downgraded_by);

-- Row Level Security for zimscore_audit_log
ALTER TABLE zimscore_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zimscore_audit_log
CREATE POLICY "Users can view own ZimScore audit log" ON zimscore_audit_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ZimScore audit logs" ON zimscore_audit_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- Create view for ZimScore change summary
CREATE OR REPLACE VIEW zimscore_change_summary AS
SELECT 
    u.id as user_id,
    u.email,
    up.zimscore as current_score,
    up.zimscore_last_updated,
    COUNT(zal.id) as total_changes,
    COUNT(CASE WHEN zal.action_type = 'MANUAL_DOWNGRADE' THEN 1 END) as manual_downgrades,
    MAX(zal.timestamp) as last_change_at,
    CASE 
        WHEN up.zimscore_downgraded_at IS NOT NULL THEN true 
        ELSE false 
    END as has_manual_downgrade
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
LEFT JOIN zimscore_audit_log zal ON u.id = zal.user_id
GROUP BY u.id, up.zimscore, up.zimscore_last_updated, up.zimscore_downgraded_at;

-- Function to log ZimScore changes manually (used by admin endpoints)
CREATE OR REPLACE FUNCTION log_zimscore_change(
    p_user_id UUID,
    p_admin_id UUID,
    p_action_type TEXT,
    p_old_score INTEGER,
    p_new_score INTEGER,
    p_reason TEXT,
    p_evidence TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO zimscore_audit_log (
        user_id,
        admin_id,
        action_type,
        old_score,
        new_score,
        reason,
        evidence,
        notes,
        timestamp
    ) VALUES (
        p_user_id,
        p_admin_id,
        p_action_type,
        p_old_score,
        p_new_score,
        p_reason,
        p_evidence,
        p_notes,
        NOW()
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ ZimScore admin features migration completed successfully!';
    RAISE NOTICE 'Added: zimscore_audit_log table, user_profiles downgrade columns, indexes, RLS policies, and triggers';
END $$;

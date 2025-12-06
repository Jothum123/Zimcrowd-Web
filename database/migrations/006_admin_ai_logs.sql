-- Admin AI Logs Migration
-- Creates audit trail table for admin AI interactions

-- Create admin AI logs table
CREATE TABLE IF NOT EXISTS admin_ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    intent TEXT,
    ai_provider TEXT NOT NULL,
    suggestions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS admin_ai_logs_admin_id_idx ON admin_ai_logs(admin_id);
CREATE INDEX IF NOT EXISTS admin_ai_logs_created_at_idx ON admin_ai_logs(created_at);
CREATE INDEX IF NOT EXISTS admin_ai_logs_ai_provider_idx ON admin_ai_logs(ai_provider);
CREATE INDEX IF NOT EXISTS admin_ai_logs_intent_idx ON admin_ai_logs(intent);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_ai_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admins can view their own logs, super admins can view all
CREATE POLICY "Admins can view own AI logs" ON admin_ai_logs
    FOR SELECT USING (
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- RLS policy: Admins can insert their own logs
CREATE POLICY "Admins can insert own AI logs" ON admin_ai_logs
    FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Admin AI logs table created successfully!';
    RAISE NOTICE 'Added: admin_ai_logs table with RLS policies';
    RAISE NOTICE 'Features: Admin audit trail, performance indexes, role-based access';
END $$;

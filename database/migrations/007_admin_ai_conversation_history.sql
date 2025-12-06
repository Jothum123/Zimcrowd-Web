-- Admin AI Conversation History Migration
-- Creates conversation history table for admin AI multi-turn context

-- Create admin AI conversation history table
CREATE TABLE IF NOT EXISTS admin_ai_conversation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id),
    session_id TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    intent TEXT,
    ai_provider TEXT NOT NULL,
    suggestions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS admin_ai_conversation_history_admin_id_idx ON admin_ai_conversation_history(admin_id);
CREATE INDEX IF NOT EXISTS admin_ai_conversation_history_session_id_idx ON admin_ai_conversation_history(session_id);
CREATE INDEX IF NOT EXISTS admin_ai_conversation_history_created_at_idx ON admin_ai_conversation_history(created_at);
CREATE INDEX IF NOT EXISTS admin_ai_conversation_history_ai_provider_idx ON admin_ai_conversation_history(ai_provider);
CREATE INDEX IF NOT EXISTS admin_ai_conversation_history_intent_idx ON admin_ai_conversation_history(intent);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_ai_conversation_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admins can view their own conversation history, super admins can view all
CREATE POLICY "Admins can view own conversation history" ON admin_ai_conversation_history
    FOR SELECT USING (
        auth.uid() = admin_id OR
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- RLS policy: Admins can insert their own conversation history
CREATE POLICY "Admins can insert own conversation history" ON admin_ai_conversation_history
    FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- RLS policy: Admins can update their own conversation history
CREATE POLICY "Admins can update own conversation history" ON admin_ai_conversation_history
    FOR UPDATE USING (auth.uid() = admin_id);

-- RLS policy: Admins can delete their own conversation history
CREATE POLICY "Admins can delete own conversation history" ON admin_ai_conversation_history
    FOR DELETE USING (auth.uid() = admin_id);

-- Function to get recent conversation history for context
CREATE OR REPLACE FUNCTION get_admin_conversation_history(
    p_admin_id UUID,
    p_session_id TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    session_id TEXT,
    message TEXT,
    response TEXT,
    intent TEXT,
    ai_provider TEXT,
    suggestions JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.id,
        ch.session_id,
        ch.message,
        ch.response,
        ch.intent,
        ch.ai_provider,
        ch.suggestions,
        ch.created_at
    FROM admin_ai_conversation_history ch
    WHERE ch.admin_id = p_admin_id
    AND (p_session_id IS NULL OR ch.session_id = p_session_id)
    ORDER BY ch.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old conversation history (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_admin_conversation_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_ai_conversation_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Admin AI conversation history table created successfully!';
    RAISE NOTICE 'Added: admin_ai_conversation_history table with RLS policies';
    RAISE NOTICE 'Features: Multi-turn context, session management, automatic cleanup';
    RAISE NOTICE 'Functions: get_admin_conversation_history(), cleanup_admin_conversation_history()';
END $$;

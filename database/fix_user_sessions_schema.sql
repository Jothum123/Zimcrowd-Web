-- Fix for user_sessions table missing started_at column
-- This script adds missing columns from activity-tracking.sql to the user_sessions table
-- that was likely created by user-settings-schema.sql

-- Add started_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'started_at') THEN
        ALTER TABLE user_sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- If created_at exists, copy its value to started_at
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'created_at') THEN
            UPDATE user_sessions SET started_at = created_at;
        END IF;
    END IF;
END $$;

-- Add logout_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'logout_at') THEN
        ALTER TABLE user_sessions ADD COLUMN logout_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add session_data if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'session_data') THEN
        ALTER TABLE user_sessions ADD COLUMN session_data JSONB;
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_sessions'
ORDER BY ordinal_position;

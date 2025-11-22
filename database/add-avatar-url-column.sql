-- Add avatar_url column to profiles table if it doesn't exist
-- This stores social profile pictures from Google/Facebook

DO $$ 
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture from social auth or uploaded image';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'avatar_url';

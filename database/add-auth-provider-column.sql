-- Add auth_provider column to profiles table
-- This column tracks the original authentication method used to sign up
-- Values: 'email', 'phone', 'google', 'facebook', etc.
-- Users must continue using the same auth method they originally signed up with

-- Add the auth_provider column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- Add last_login_at column to track when user last logged in
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add last_login_method column to track which method was used for last login (for badge display)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_method TEXT;

-- Add a comment explaining the columns
COMMENT ON COLUMN public.profiles.auth_provider IS 'The authentication provider used for initial signup (email, phone, google, facebook). Users must use the same provider to login.';
COMMENT ON COLUMN public.profiles.last_login_at IS 'Timestamp of the user last successful login.';
COMMENT ON COLUMN public.profiles.last_login_method IS 'The sign-in method used for the last login (for displaying badge on login page).';

-- Update existing users who signed up via social auth (based on Supabase auth.users metadata)
-- This is a one-time migration for existing users
UPDATE public.profiles p
SET auth_provider = COALESCE(
    (SELECT raw_app_meta_data->>'provider' FROM auth.users WHERE id = p.id),
    CASE 
        WHEN p.phone IS NOT NULL AND p.email IS NULL THEN 'phone'
        ELSE 'email'
    END
),
last_login_method = COALESCE(
    (SELECT raw_app_meta_data->>'provider' FROM auth.users WHERE id = p.id),
    CASE 
        WHEN p.phone IS NOT NULL AND p.email IS NULL THEN 'phone'
        ELSE 'email'
    END
)
WHERE p.auth_provider IS NULL OR p.auth_provider = 'email';

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles(auth_provider);

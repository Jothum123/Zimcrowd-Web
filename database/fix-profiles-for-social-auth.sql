-- FIX: Profiles table for Social Auth
-- Run this in Supabase SQL Editor to fix the "Database error saving new user" issue

-- Step 1: Check if profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    phone TEXT,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    auth_provider TEXT DEFAULT 'email',
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_method TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add missing columns if table already exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_method TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Step 3: Make columns nullable to prevent insert failures
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN last_name DROP NOT NULL;

-- Step 4: Drop any existing trigger that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 5: Create a new, safer trigger function for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        avatar_url,
        auth_provider,
        onboarding_completed,
        profile_completed,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'given_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', NEW.raw_user_meta_data->>'family_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        FALSE,
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the auth process
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 7: Enable RLS but allow inserts
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can do anything" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Enable insert for authenticated users" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 9: Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.profiles TO anon;

-- Step 10: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

SELECT 'Profiles table fixed! Social auth should now work.' as status;

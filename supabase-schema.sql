-- ZimCrowd Supabase Database Schema
-- Run these SQL commands in your Supabase SQL Editor

-- Note: auth.users already has RLS enabled by default in Supabase
-- No need to modify system tables

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),

    -- Profile Information
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),

    -- Address
    street TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT,

    -- Employment
    employment_status TEXT CHECK (employment_status IN ('employed', 'self_employed', 'unemployed', 'student', 'retired')),
    monthly_income DECIMAL(15,2),
    employer_name TEXT,
    occupation TEXT,

    -- Financial
    credit_score INTEGER,
    bank_name TEXT,
    account_number TEXT,

    -- Next of Kin
    next_of_kin_name TEXT,
    next_of_kin_relationship TEXT,
    next_of_kin_phone TEXT,
    next_of_kin_email TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, phone)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Trigger on auth.users will be created separately in Supabase dashboard
-- with service role permissions. For now, we'll handle profile creation in our
-- registration endpoint if the trigger isn't set up.

-- Create loans table
CREATE TABLE IF NOT EXISTS loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    loan_type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    duration_months INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
    purpose TEXT,
    collateral TEXT,
    monthly_payment DECIMAL(15,2),
    total_payment DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on loans
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Create policies for loans
CREATE POLICY "Users can view own loans" ON loans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans" ON loans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create investments table
CREATE TABLE IF NOT EXISTS investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    investment_type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    expected_return DECIMAL(5,2),
    risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on investments
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Create policies for investments
CREATE POLICY "Users can view own investments" ON investments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investments" ON investments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'loan_payment', 'investment_return', 'fee')),
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- Reference to loan/investment
    balance_after DECIMAL(15,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions" ON transactions
    FOR INSERT WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON profiles(phone);
CREATE INDEX IF NOT EXISTS loans_user_id_idx ON loans(user_id);
CREATE INDEX IF NOT EXISTS loans_status_idx ON loans(status);
CREATE INDEX IF NOT EXISTS investments_user_id_idx ON investments(user_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx ON transactions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_loans
    BEFORE UPDATE ON loans
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_investments
    BEFORE UPDATE ON investments
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Insert sample data (optional)
-- You can uncomment these to add sample data for testing

/*
INSERT INTO profiles (id, first_name, last_name, email, onboarding_completed, profile_completed)
VALUES
    ('00000000-0000-0000-0000-000000000000', 'John', 'Doe', 'john@example.com', true, true),
    ('00000000-0000-0000-0000-000000000001', 'Jane', 'Smith', 'jane@example.com', true, false);

INSERT INTO loans (user_id, loan_type, amount, interest_rate, duration_months, status, purpose)
VALUES
    ('00000000-0000-0000-0000-000000000000', 'personal', 5000.00, 12.5, 24, 'approved', 'Home improvement');

INSERT INTO investments (user_id, investment_type, amount, expected_return, risk_level, description)
VALUES
    ('00000000-0000-0000-0000-000000000000', 'stocks', 10000.00, 8.5, 'medium', 'Tech stocks portfolio');
*/

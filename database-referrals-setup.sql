-- =====================================================
-- REFERRAL SYSTEM TABLES SETUP
-- =====================================================
-- This script creates tables for the referral program
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Create referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    referral_code VARCHAR(50) NOT NULL,
    referred_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'expired')),
    earnings DECIMAL(10, 2) DEFAULT 0.00,
    loans_count INTEGER DEFAULT 0,
    first_loan_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create referral_codes table (stores user's referral code)
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    active_referrals INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Create referral_earnings table (tracks individual earnings)
CREATE TABLE IF NOT EXISTS public.referral_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(20) DEFAULT 'commission' CHECK (type IN ('commission', 'bonus', 'milestone')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create referral_payouts table (tracks payout requests)
CREATE TABLE IF NOT EXISTS public.referral_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    account_details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status ON public.referral_earnings(status);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_user ON public.referral_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_payouts_status ON public.referral_payouts(status);

-- 6. Enable Row Level Security
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies

-- Referrals policies
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can insert their own referrals" ON public.referrals;
CREATE POLICY "Users can insert their own referrals"
    ON public.referrals FOR INSERT
    WITH CHECK (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can update their own referrals" ON public.referrals;
CREATE POLICY "Users can update their own referrals"
    ON public.referrals FOR UPDATE
    USING (auth.uid() = referrer_id);

-- Referral codes policies
DROP POLICY IF EXISTS "Users can view their own referral code" ON public.referral_codes;
CREATE POLICY "Users can view their own referral code"
    ON public.referral_codes FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own referral code" ON public.referral_codes;
CREATE POLICY "Users can insert their own referral code"
    ON public.referral_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own referral code" ON public.referral_codes;
CREATE POLICY "Users can update their own referral code"
    ON public.referral_codes FOR UPDATE
    USING (auth.uid() = user_id);

-- Referral earnings policies
DROP POLICY IF EXISTS "Users can view their own earnings" ON public.referral_earnings;
CREATE POLICY "Users can view their own earnings"
    ON public.referral_earnings FOR SELECT
    USING (auth.uid() = referrer_id);

-- Referral payouts policies
DROP POLICY IF EXISTS "Users can view their own payouts" ON public.referral_payouts;
CREATE POLICY "Users can view their own payouts"
    ON public.referral_payouts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payouts" ON public.referral_payouts;
CREATE POLICY "Users can create their own payouts"
    ON public.referral_payouts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 8. Create function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    code VARCHAR(50);
    user_part VARCHAR(10);
    timestamp_part VARCHAR(10);
BEGIN
    -- Get first 6 chars of user_id
    user_part := UPPER(SUBSTRING(user_id::TEXT, 1, 6));
    
    -- Get last 4 digits of current timestamp
    timestamp_part := SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT, -4);
    
    -- Combine to create code
    code := 'ZCRWD-' || user_part || '-' || timestamp_part;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to auto-create referral code for new users
CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.referral_codes (user_id, referral_code)
    VALUES (NEW.id, generate_referral_code(NEW.id))
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to auto-create referral code
DROP TRIGGER IF EXISTS trigger_create_referral_code ON public.profiles;
CREATE TRIGGER trigger_create_referral_code
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code_for_user();

-- 11. Create function to update referral stats
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update referral_codes stats when referrals change
    UPDATE public.referral_codes
    SET 
        total_referrals = (
            SELECT COUNT(*) 
            FROM public.referrals 
            WHERE referrer_id = NEW.referrer_id
        ),
        active_referrals = (
            SELECT COUNT(*) 
            FROM public.referrals 
            WHERE referrer_id = NEW.referrer_id AND status = 'active'
        ),
        total_earnings = (
            SELECT COALESCE(SUM(earnings), 0) 
            FROM public.referrals 
            WHERE referrer_id = NEW.referrer_id
        ),
        updated_at = NOW()
    WHERE user_id = NEW.referrer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to update stats
DROP TRIGGER IF EXISTS trigger_update_referral_stats ON public.referrals;
CREATE TRIGGER trigger_update_referral_stats
    AFTER INSERT OR UPDATE ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_stats();

-- 13. Create referral code for existing users (run once)
INSERT INTO public.referral_codes (user_id, referral_code)
SELECT 
    id,
    generate_referral_code(id)
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.referral_codes)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created
SELECT 
    'referrals' as table_name,
    COUNT(*) as row_count
FROM public.referrals
UNION ALL
SELECT 
    'referral_codes' as table_name,
    COUNT(*) as row_count
FROM public.referral_codes
UNION ALL
SELECT 
    'referral_earnings' as table_name,
    COUNT(*) as row_count
FROM public.referral_earnings
UNION ALL
SELECT 
    'referral_payouts' as table_name,
    COUNT(*) as row_count
FROM public.referral_payouts;

-- Check your referral code
SELECT 
    p.email,
    rc.referral_code,
    rc.total_referrals,
    rc.total_earnings,
    rc.active_referrals
FROM public.referral_codes rc
JOIN public.profiles p ON rc.user_id = p.id
WHERE p.email = 'jothumchitewe@gmail.com';

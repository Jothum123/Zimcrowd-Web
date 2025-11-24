-- =====================================================
-- FIX REFERRAL CODE GENERATION FUNCTION
-- =====================================================
-- This fixes the "value too long" error
-- Run this instead of the full setup script
-- =====================================================

-- 1. Drop existing function if it exists
DROP FUNCTION IF EXISTS generate_referral_code(UUID) CASCADE;

-- 2. Create corrected function with proper length handling
CREATE OR REPLACE FUNCTION generate_referral_code(user_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    code VARCHAR(50);
    user_part VARCHAR(6);
    timestamp_part VARCHAR(4);
BEGIN
    -- Get first 6 chars of user_id (already limited to 6)
    user_part := UPPER(SUBSTRING(user_id::TEXT, 1, 6));
    
    -- Get last 4 digits of current timestamp (properly limited to 4)
    timestamp_part := RIGHT(FLOOR(EXTRACT(EPOCH FROM NOW()))::TEXT, 4);
    
    -- Combine to create code: ZCRWD-XXXXXX-XXXX (total: 17 chars)
    code := 'ZCRWD-' || user_part || '-' || timestamp_part;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 3. Test the function
SELECT generate_referral_code('550e8400-e29b-41d4-a716-446655440000'::UUID) as test_code;

-- Expected output: ZCRWD-550E84-1234 (or similar)

-- 4. Now create the referral_codes table with correct varchar length
CREATE TABLE IF NOT EXISTS public.referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL,  -- Changed from VARCHAR(50) to match function
    total_referrals INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    active_referrals INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 5. Create other tables
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

-- 6. Create indexes
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

-- 7. Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies
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

DROP POLICY IF EXISTS "Users can view their own earnings" ON public.referral_earnings;
CREATE POLICY "Users can view their own earnings"
    ON public.referral_earnings FOR SELECT
    USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can view their own payouts" ON public.referral_payouts;
CREATE POLICY "Users can view their own payouts"
    ON public.referral_payouts FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own payouts" ON public.referral_payouts;
CREATE POLICY "Users can create their own payouts"
    ON public.referral_payouts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 9. Create trigger function
CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.referral_codes (user_id, referral_code)
    VALUES (NEW.id, generate_referral_code(NEW.id))
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger
DROP TRIGGER IF EXISTS trigger_create_referral_code ON public.profiles;
CREATE TRIGGER trigger_create_referral_code
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_referral_code_for_user();

-- 11. Create stats update function
CREATE OR REPLACE FUNCTION update_referral_stats()
RETURNS TRIGGER AS $$
BEGIN
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

-- 12. Create stats trigger
DROP TRIGGER IF EXISTS trigger_update_referral_stats ON public.referrals;
CREATE TRIGGER trigger_update_referral_stats
    AFTER INSERT OR UPDATE ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referral_stats();

-- 13. Generate referral code for existing users
INSERT INTO public.referral_codes (user_id, referral_code)
SELECT 
    id,
    generate_referral_code(id)
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.referral_codes)
ON CONFLICT (user_id) DO NOTHING;

-- 14. Verify setup
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

-- 15. Check your referral code
SELECT 
    p.email,
    rc.referral_code,
    rc.total_referrals,
    rc.total_earnings,
    rc.active_referrals
FROM public.referral_codes rc
JOIN public.profiles p ON rc.user_id = p.id
WHERE p.email = 'jothumchitewe@gmail.com';

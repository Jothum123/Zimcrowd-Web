-- Check if phone_verifications table exists and has data
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'phone_verifications';

-- Check recent OTP records (last 5 minutes)
SELECT
    phone_number,
    otp_code,
    purpose,
    verified,
    expires_at,
    created_at
FROM phone_verifications
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 5;

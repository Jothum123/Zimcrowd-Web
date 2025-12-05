-- Check what the calculate_dtni_from_verified_salary function expects
SELECT 
    proname,
    prosrc::TEXT as function_source
FROM pg_proc 
WHERE proname = 'calculate_dtni_from_verified_salary'
LIMIT 1;

-- Also check if there's a separate salary_verifications table
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%salary%' AND table_schema = 'public';

-- Check what salary-related columns exist in profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name LIKE '%salary%'
ORDER BY column_name;

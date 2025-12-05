/**
 * Fix Missing ZimScore Columns in Profiles Table
 * Add columns that calculate_enhanced_cold_start_rating function expects
 */

-- Add missing columns for ZimScore calculation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cold_start_rating INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cold_start_rated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20);

-- Verify columns were added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('cold_start_rating', 'cold_start_rated_at', 'risk_level', 'zimscore', 'repayment_score')
ORDER BY column_name;

SELECT 
    '=== ZIMSCORE SCHEMA FIX COMPLETE ===' as info,
       'Missing columns added to profiles table',
       'Now run: \\i database/zimscore-penalty-system.sql to create functions';

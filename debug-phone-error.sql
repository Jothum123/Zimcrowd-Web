-- ============================================
-- DEBUG: Find what's referencing 'phone' column
-- ============================================

-- Check if phone_verifications already exists
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'phone_verifications'
ORDER BY ordinal_position;

-- Check for any triggers on phone_verifications
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'phone_verifications';

-- Check for any functions that might reference phone
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition LIKE '%phone%';

-- Check existing policies on phone_verifications
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'phone_verifications';

-- Check if there are any views referencing phone
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%phone%';

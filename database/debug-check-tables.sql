-- Check if required tables exist before creating foreign key references
-- Run this to see what's missing

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_documents', 'document_types', 'document_approval_history')
ORDER BY table_name;

-- Check if profiles table has the expected columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if tables exist
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'loans', 'investments', 'transactions')
ORDER BY tablename;

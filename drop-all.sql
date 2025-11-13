-- Clean slate: Drop ALL existing objects in correct order
-- Run this FIRST to start fresh

-- Step 1: Drop policies FIRST (before tables)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own loans" ON loans;
DROP POLICY IF EXISTS "Users can insert own loans" ON loans;
DROP POLICY IF EXISTS "Users can view own investments" ON investments;
DROP POLICY IF EXISTS "Users can insert own investments" ON investments;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Borrowers can view offers on their loans" ON loan_offers;
DROP POLICY IF EXISTS "Borrowers can update offer status on their loans" ON loan_offers;

-- Step 2: Drop triggers (before functions) - Note: CASCADE on function will handle these
-- DROP TRIGGER IF EXISTS handle_updated_at_profiles ON profiles;
-- DROP TRIGGER IF EXISTS handle_updated_at_loans ON loans;
-- DROP TRIGGER IF EXISTS handle_updated_at_investments ON investments;

-- Step 3: Drop functions (with CASCADE for all dependencies)
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

-- Step 4: Drop indexes
DROP INDEX IF EXISTS profiles_email_idx;
DROP INDEX IF EXISTS profiles_phone_idx;
DROP INDEX IF EXISTS loans_user_id_idx;
DROP INDEX IF EXISTS loans_status_idx;
DROP INDEX IF EXISTS investments_user_id_idx;
DROP INDEX IF EXISTS transactions_user_id_idx;
DROP INDEX IF EXISTS transactions_created_at_idx;

-- Step 5: Drop tables LAST (with CASCADE to handle any remaining dependencies)
DROP TABLE IF EXISTS loan_progress CASCADE;
DROP TABLE IF EXISTS loan_offers CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS investments CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Check what employment status values are allowed
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c' 
AND conname LIKE '%employment%';

-- Also check all check constraints on profiles
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND contype = 'c';

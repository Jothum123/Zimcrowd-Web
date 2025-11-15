# DATABASE SETUP INSTRUCTIONS

## ⚠️ IMPORTANT: Execute SQL Files in This Order

### **STEP 0: Diagnose Existing Database (If you have errors)**
If you're getting column errors, run this FIRST to see what exists:
```sql
DATABASE_DIAGNOSTIC.sql
```

### **STEP 0.5: Fix Missing Columns (If tables already exist)**
If tables exist but are missing columns, run this:
```sql
DATABASE_FIX_MISSING_COLUMNS.sql
```
This will add ALL missing columns to existing tables safely.

### **STEP 1: Create Base Schema**
Run this file FIRST (or after fixing missing columns):
```sql
DATABASE_BASE_SCHEMA.sql
```

This creates:
- ✅ users table (base)
- ✅ wallets table
- ✅ transactions table
- ✅ loans table
- ✅ investments table
- ✅ loan_installments table
- ✅ notifications table
- ✅ secondary_market_listings table

**Status:** Must run before any other SQL files

---

### **STEP 2: Add Account Flagging System**
Run this file SECOND:
```sql
DATABASE_ACCOUNT_FLAGS.sql
```

This adds:
- ✅ account_status column to users
- ✅ account_flags column to users
- ✅ kyc_status column to users
- ✅ account_status_history table
- ✅ account_flags table
- ✅ arrears_tracking table
- ✅ account_restrictions table
- ✅ verification_documents table
- ✅ Automatic triggers for arrears detection

**Requires:** users table from Step 1

---

### **STEP 3: Add Profile Completion System**
Run this file THIRD:
```sql
DATABASE_PROFILE_SETUP.sql
```

This adds:
- ✅ profile_completed column to users
- ✅ employment_completed column to users
- ✅ next_of_kin_completed column to users
- ✅ payment_details_completed column to users
- ✅ kyc_documents_submitted column to users
- ✅ setup_completion_percentage column to users
- ✅ employment_details table
- ✅ next_of_kin table
- ✅ payment_details table
- ✅ profile_completion_tracking table
- ✅ Automatic triggers for completion tracking

**Requires:** users table from Step 1 + account_status fields from Step 2

---

## 🚀 Quick Setup (All-in-One)

If you want to run everything at once, use:
```sql
DATABASE_SETUP_COMPLETE.sql
```

This file includes all base tables and fields in the correct order.

---

## ❌ Common Errors & Solutions

### Error: "relation 'users' does not exist"
**Cause:** Trying to run Step 2 or 3 before Step 1  
**Solution:** Run DATABASE_BASE_SCHEMA.sql first

### Error: "column 'account_status' does not exist"
**Cause:** Trying to run Step 3 before Step 2  
**Solution:** Run DATABASE_ACCOUNT_FLAGS.sql before DATABASE_PROFILE_SETUP.sql

### Error: "duplicate key value violates unique constraint"
**Cause:** Trying to run SQL files multiple times  
**Solution:** Use `IF NOT EXISTS` or `ADD COLUMN IF NOT EXISTS` (already included)

---

## ✅ Verification

After running all SQL files, verify with:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check users table has all columns
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Expected columns in users table:
-- id, email, password_hash, full_name, phone_number, role,
-- is_active, email_verified, email_verified_at,
-- account_status, account_flags, kyc_status, kyc_verified_at,
-- profile_completed, employment_completed, next_of_kin_completed,
-- payment_details_completed, kyc_documents_submitted,
-- setup_completion_percentage, date_of_birth, gender, national_id,
-- address, city, country, postal_code, marital_status,
-- created_at, updated_at
```

---

## 📊 Expected Tables After Complete Setup

1. **users** - User accounts with all fields
2. **wallets** - User wallet balances
3. **transactions** - Financial transactions
4. **loans** - Loan applications
5. **investments** - P2P investments
6. **loan_installments** - Repayment schedules
7. **notifications** - User notifications
8. **secondary_market_listings** - Investment marketplace
9. **account_status_history** - Status change tracking
10. **account_flags** - Account flags and alerts
11. **arrears_tracking** - Overdue payment tracking
12. **account_restrictions** - Account restrictions
13. **verification_documents** - KYC documents
14. **employment_details** - Employment information
15. **next_of_kin** - Emergency contacts
16. **payment_details** - Payment methods
17. **profile_completion_tracking** - Setup progress

---

## 🔧 Supabase Setup

If using Supabase:

1. Go to Supabase Dashboard
2. Select your project
3. Go to SQL Editor
4. Create new query
5. Paste contents of **DATABASE_BASE_SCHEMA.sql**
6. Click "Run"
7. Wait for completion
8. Repeat for **DATABASE_ACCOUNT_FLAGS.sql**
9. Repeat for **DATABASE_PROFILE_SETUP.sql**

---

## 🐘 PostgreSQL Setup

If using local PostgreSQL:

```bash
# Connect to your database
psql -U your_username -d zimcrowd_db

# Run SQL files in order
\i DATABASE_BASE_SCHEMA.sql
\i DATABASE_ACCOUNT_FLAGS.sql
\i DATABASE_PROFILE_SETUP.sql

# Verify
\dt
\d users
```

---

## 📝 Notes

- All SQL files use `IF NOT EXISTS` to prevent errors on re-run
- All `ALTER TABLE` commands use `IF NOT EXISTS` for safety
- Triggers are created with `DROP TRIGGER IF EXISTS` first
- Foreign key constraints are properly defined
- Indexes are created for performance
- Comments are added for documentation

---

## ✨ After Setup

Once database is set up:

1. ✅ Start your Node.js server
2. ✅ Test user registration
3. ✅ Verify red completion card appears
4. ✅ Test profile setup wizard
5. ✅ Test admin KYC approval
6. ✅ Verify status transitions

---

**Need help?** Check the error message and refer to the "Common Errors" section above.

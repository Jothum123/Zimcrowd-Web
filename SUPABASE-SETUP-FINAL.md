# 🗄️ Supabase Database Setup - Final Guide

## 🎯 **Safe Database Setup (No Duplicates)**

### **📁 Files Available:**

1. **`database/check-existing-tables.sql`** - Check what already exists
2. **`database/safe-schema-update.sql`** - Safe update (no duplicates)
3. **`database/complete-schema.sql`** - Complete fresh schema

---

## 🚀 **Recommended Setup Process:**

### **Step 1: Check Existing Tables**
```
1. Open: https://supabase.com/dashboard/project/gjtkdrrvnffrmzigdqyp/editor
2. Copy contents of: database/check-existing-tables.sql
3. Paste and Run
4. Review what tables already exist
```

### **Step 2: Run Safe Schema Update**
```
1. Copy contents of: database/safe-schema-update.sql
2. Paste and Run in Supabase SQL Editor
3. This will ONLY create missing tables
4. Safe to run multiple times
```

---

## ✅ **What the Safe Schema Does:**

### **Smart Creation:**
- ✅ Uses `CREATE TABLE IF NOT EXISTS` - won't duplicate
- ✅ Uses `CREATE OR REPLACE FUNCTION` - updates safely
- ✅ Uses `CREATE OR REPLACE VIEW` - updates safely
- ✅ Drops and recreates triggers - ensures they work
- ✅ Uses `CREATE INDEX IF NOT EXISTS` - no duplicates

### **Tables That Will Be Created (if missing):**

**Payment System:**
```sql
payment_transactions      -- Main payment records
payment_logs             -- Event logging  
payment_webhooks         -- Webhook data
payment_analytics        -- Daily statistics
```

**Referral System:**
```sql
referral_links              -- User referral codes
referral_clicks             -- Click tracking
referral_conversions        -- Successful referrals
referral_credits            -- Credit balances
referral_credit_transactions -- Credit history
referral_achievements       -- Badges/rewards
referral_leaderboard        -- Rankings
referral_fraud_checks       -- Security checks
```

**ZimScore & KYC:**
```sql
user_documents           -- Uploaded documents
zimscore_users          -- User scores and KYC status
zimscore_history        -- Score change history
```

---

## 🔍 **Verification After Setup:**

Run this query to verify everything was created:

```sql
-- Check all new tables exist
SELECT table_name, 
       CASE WHEN table_name IN (
           'payment_transactions', 'payment_logs', 'payment_webhooks', 'payment_analytics',
           'referral_links', 'referral_clicks', 'referral_conversions', 'referral_credits',
           'referral_credit_transactions', 'referral_achievements', 'referral_leaderboard', 
           'referral_fraud_checks', 'user_documents', 'zimscore_users', 'zimscore_history'
       ) THEN '✅ NEW' ELSE '📋 EXISTING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY status DESC, table_name;

-- Check functions were created
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('log_payment_event', 'update_payment_analytics', 'expire_old_payments', 'update_referral_leaderboard');

-- Check views were created  
SELECT table_name as view_name
FROM information_schema.views 
WHERE table_schema = 'public'
AND table_name IN ('v_payment_summary', 'v_referral_performance', 'v_zimscore_overview');
```

---

## 📊 **Expected Results:**

After running the safe schema, you should see:

### **New Tables (15 tables):**
- ✅ payment_transactions
- ✅ payment_logs  
- ✅ payment_webhooks
- ✅ payment_analytics
- ✅ referral_links
- ✅ referral_clicks
- ✅ referral_conversions
- ✅ referral_credits
- ✅ referral_credit_transactions
- ✅ referral_achievements
- ✅ referral_leaderboard
- ✅ referral_fraud_checks
- ✅ user_documents
- ✅ zimscore_users
- ✅ zimscore_history

### **Existing Tables (preserved):**
- 📋 users
- 📋 profiles
- 📋 loans
- 📋 investments
- 📋 Any other existing tables

### **Functions (4 functions):**
- ✅ log_payment_event()
- ✅ update_payment_analytics()
- ✅ expire_old_payments()
- ✅ update_referral_leaderboard()

### **Views (3 views):**
- ✅ v_payment_summary
- ✅ v_referral_performance
- ✅ v_zimscore_overview

---

## 🧪 **Test Your Setup:**

### **1. Test Payment System:**
```sql
-- Insert a test payment
INSERT INTO payment_transactions (user_id, reference, amount, currency, payment_method, user_email)
VALUES (uuid_generate_v4(), 'TEST_001', 100.00, 'USD', 'web', 'test@example.com');

-- Check it was created
SELECT * FROM payment_transactions WHERE reference = 'TEST_001';

-- Check analytics
SELECT * FROM payment_analytics WHERE date = CURRENT_DATE;
```

### **2. Test Referral System:**
```sql
-- Insert a test referral link
INSERT INTO referral_links (user_id, referral_code)
VALUES (uuid_generate_v4(), 'TEST123');

-- Check it was created
SELECT * FROM referral_links WHERE referral_code = 'TEST123';
```

### **3. Test ZimScore System:**
```sql
-- Insert a test user score
INSERT INTO zimscore_users (user_id, current_score, kyc_status)
VALUES (uuid_generate_v4(), 720, 'completed');

-- Check the view
SELECT * FROM v_zimscore_overview WHERE current_score = 720;
```

---

## ⚠️ **Important Notes:**

### **Safe to Run Multiple Times:**
- The safe schema can be run multiple times
- Won't create duplicate tables
- Won't lose existing data
- Updates functions and views safely

### **Existing Data Preserved:**
- Your existing users, profiles, loans tables are untouched
- Only adds new tables for new features
- No data loss risk

### **Foreign Key Considerations:**
- New tables reference user_id (UUID)
- Make sure your users table uses UUID primary keys
- If using different ID format, update the schema accordingly

---

## 🔧 **Troubleshooting:**

### **Error: "relation already exists"**
- This means table already exists
- Safe schema prevents this error
- Check with `check-existing-tables.sql` first

### **Error: "permission denied"**
- Use service role key in Supabase
- Or ensure your user has CREATE permissions

### **Error: "function does not exist"**
- Functions might not have been created
- Re-run the safe schema
- Check functions exist with verification query

---

## 📈 **Performance Optimization:**

The schema includes optimized indexes:

```sql
-- Payment performance
idx_payment_transactions_user_id     -- Fast user lookups
idx_payment_transactions_status      -- Fast status filtering
idx_payment_transactions_created_at  -- Fast date sorting

-- Referral performance  
idx_referral_links_user_id          -- Fast user referral lookups
idx_referral_conversions_referrer   -- Fast referrer stats

-- ZimScore performance
idx_zimscore_users_user_id          -- Fast score lookups
idx_zimscore_history_created_at     -- Fast history sorting
```

---

## 🎯 **Next Steps After Setup:**

1. **✅ Run the safe schema** in Supabase
2. **✅ Verify tables created** with verification queries
3. **✅ Test with sample data** (optional)
4. **✅ Your backend APIs will work immediately**
5. **✅ Admin dashboard will show real data**

---

## 📞 **Support:**

If you encounter issues:

1. **Check existing tables first** with `check-existing-tables.sql`
2. **Use the safe schema** - it handles duplicates
3. **Verify with test queries** after setup
4. **Check Supabase logs** for any errors

---

## ✅ **Final Checklist:**

- [ ] Opened Supabase SQL Editor
- [ ] Ran `check-existing-tables.sql` to see current state
- [ ] Ran `safe-schema-update.sql` to add missing tables
- [ ] Verified new tables with verification queries
- [ ] Tested with sample data
- [ ] Backend APIs working with real database

---

**Status:** ✅ **READY TO RUN**  
**File:** `database/safe-schema-update.sql`  
**Safety:** 🛡️ **100% Safe - No Duplicates**  
**Result:** 🎯 **Complete Database Setup**

---

## 🎉 **You're All Set!**

Your Zimcrowd platform will have:
- ✅ **PayNow Payments** - Full payment processing
- ✅ **Referral System** - Complete referral tracking  
- ✅ **ZimScore & KYC** - Credit scoring and verification
- ✅ **Admin Dashboard** - Real-time monitoring with charts
- ✅ **Analytics** - Performance tracking and reporting

**Run the safe schema and your platform is production-ready!** 🚀

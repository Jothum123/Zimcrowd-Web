# 🗄️ Zimcrowd Database Setup Guide

## 📋 **Complete SQL Schema**

All database tables, functions, triggers, and views are in:
```
database/complete-schema.sql
```

---

## 🚀 **Quick Setup (3 Steps)**

### **Step 1: Open Supabase SQL Editor**
1. Go to: https://supabase.com/dashboard/project/gjtkdrrvnffrmzigdqyp/editor
2. Click "SQL Editor" in the left sidebar
3. Click "+ New query"

### **Step 2: Copy & Paste Schema**
1. Open `database/complete-schema.sql`
2. Copy ALL contents (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click "Run" button

### **Step 3: Verify Tables Created**
Check in Supabase Table Editor that these tables exist:
- ✅ payment_transactions
- ✅ payment_logs
- ✅ referral_links
- ✅ referral_credits
- ✅ user_documents
- ✅ zimscore_users
- ✅ zimscore_history

---

## 📊 **What Gets Created:**

### **1. Payment System (8 objects)**
- `payment_transactions` - Main payment records
- `payment_logs` - Event logging
- `payment_webhooks` - Webhook data
- `payment_analytics` - Daily statistics
- Functions for logging and analytics
- Triggers for auto-updates
- Views for reporting

### **2. Referral System (8 objects)**
- `referral_links` - User referral codes
- `referral_clicks` - Click tracking
- `referral_conversions` - Successful referrals
- `referral_credits` - Credit balances
- `referral_credit_transactions` - Credit history
- `referral_achievements` - Badges/rewards
- `referral_leaderboard` - Rankings
- `referral_fraud_checks` - Security

### **3. ZimScore & KYC (3 objects)**
- `user_documents` - Uploaded documents
- `zimscore_users` - User scores and KYC status
- `zimscore_history` - Score change history

### **4. Helper Functions (4 functions)**
- `log_payment_event()` - Log payment events
- `update_payment_analytics()` - Update daily stats
- `expire_old_payments()` - Auto-expire old payments
- `update_referral_leaderboard()` - Update rankings

### **5. Triggers (2 triggers)**
- Auto-update payment analytics on status change
- Auto-update timestamps on payment updates

### **6. Views (3 views)**
- `v_payment_summary` - Payment statistics by date
- `v_referral_performance` - Referral metrics per user
- `v_zimscore_overview` - Score overview with categories

---

## 🔍 **Table Details:**

### **Payment Transactions**
```sql
Columns:
- id (UUID) - Primary key
- user_id (UUID) - User reference
- reference (VARCHAR) - Unique payment reference
- amount (DECIMAL) - Payment amount
- currency (VARCHAR) - USD or ZWG
- payment_method (VARCHAR) - web, ecocash, onemoney
- status (VARCHAR) - pending, paid, failed, etc.
- created_at, updated_at, paid_at, expires_at (TIMESTAMP)
```

### **Referral Links**
```sql
Columns:
- id (UUID) - Primary key
- user_id (UUID) - User who owns the link
- referral_code (VARCHAR) - Unique code
- is_active (BOOLEAN) - Active status
- created_at, expires_at (TIMESTAMP)
```

### **ZimScore Users**
```sql
Columns:
- id (UUID) - Primary key
- user_id (UUID) - User reference
- current_score (INTEGER) - Score 300-850
- previous_score (INTEGER) - Previous score
- kyc_status (VARCHAR) - not_started, pending, completed, etc.
- financial_data (JSONB) - Financial metrics
- created_at, updated_at (TIMESTAMP)
```

---

## 🧪 **Test Queries:**

### **Check Payment Stats:**
```sql
SELECT * FROM v_payment_summary 
ORDER BY date DESC 
LIMIT 7;
```

### **Check Referral Performance:**
```sql
SELECT * FROM v_referral_performance 
ORDER BY total_conversions DESC 
LIMIT 10;
```

### **Check ZimScore Overview:**
```sql
SELECT * FROM v_zimscore_overview 
WHERE current_score IS NOT NULL 
ORDER BY current_score DESC;
```

### **Get Payment Analytics:**
```sql
SELECT 
    date,
    total_transactions,
    successful_transactions,
    total_amount_usd,
    total_amount_zwg
FROM payment_analytics
ORDER BY date DESC
LIMIT 30;
```

---

## 🔧 **Maintenance Functions:**

### **Expire Old Payments (Run Daily):**
```sql
SELECT expire_old_payments();
```

### **Update Referral Leaderboard:**
```sql
SELECT update_referral_leaderboard('user-uuid-here');
```

### **Log Payment Event:**
```sql
SELECT log_payment_event(
    'transaction-uuid',
    'status_changed',
    '{"old_status": "pending", "new_status": "paid"}'::jsonb
);
```

---

## 📝 **Row Level Security (RLS)**

After creating tables, you may want to add RLS policies:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE zimscore_users ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see their own payments
CREATE POLICY "Users can view own payments" 
ON payment_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Example policy: Users can only see their own documents
CREATE POLICY "Users can view own documents" 
ON user_documents 
FOR SELECT 
USING (auth.uid() = user_id);
```

---

## ⚠️ **Important Notes:**

1. **UUID Extension:** The schema automatically enables `uuid-ossp` extension
2. **Timestamps:** All tables use `TIMESTAMP` with automatic `NOW()` defaults
3. **Constraints:** Tables have CHECK constraints for data validation
4. **Indexes:** Performance indexes are created automatically
5. **JSONB:** Some tables use JSONB for flexible data storage

---

## 🐛 **Troubleshooting:**

### **Error: "extension uuid-ossp does not exist"**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### **Error: "relation already exists"**
The schema uses `IF NOT EXISTS` so it's safe to run multiple times.

### **Error: "permission denied"**
Make sure you're using the service role key or have proper permissions.

---

## 📊 **Database Size Estimates:**

| Table | Est. Rows/Month | Storage/Month |
|-------|----------------|---------------|
| payment_transactions | 1,000-10,000 | 1-10 MB |
| payment_logs | 5,000-50,000 | 2-20 MB |
| referral_clicks | 10,000-100,000 | 5-50 MB |
| referral_conversions | 100-1,000 | <1 MB |
| user_documents | 500-5,000 | 50-500 MB* |
| zimscore_history | 500-5,000 | 1-10 MB |

*Note: Actual document files should be stored in Supabase Storage, not in the database.

---

## ✅ **Verification Checklist:**

After running the schema, verify:

- [ ] All 19 tables created
- [ ] All indexes created (check with `\di` in psql)
- [ ] All 4 functions created
- [ ] All 2 triggers created
- [ ] All 3 views created
- [ ] Can insert test data
- [ ] Can query views successfully

---

## 🚀 **Next Steps:**

1. **Run the schema** in Supabase SQL Editor
2. **Verify tables** in Table Editor
3. **Test with sample data** (optional)
4. **Set up RLS policies** (recommended)
5. **Configure backups** in Supabase settings

---

**Status:** ✅ **READY TO RUN**  
**File:** `database/complete-schema.sql`  
**Tables:** 19 tables + 4 functions + 2 triggers + 3 views

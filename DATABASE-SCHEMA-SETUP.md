# Database Schema Setup Guide

## 📋 Overview

This guide explains how to set up the unified settings schema for ZimCrowd platform.

**Created:** November 28, 2025  
**Purpose:** Fix missing tables causing 404 errors in production

---

## 🗄️ Tables Created

### **1. user_statistics**
Stores aggregated user performance metrics
- Investment stats (total invested, returns, active/completed)
- Loan stats (borrowed, repaid, active/completed/defaulted)
- Performance metrics (ROI, payment rates, default rate)
- Activity tracking (last investment/loan dates)
- Wallet statistics (balance, deposits, withdrawals)

### **2. user_settings**
Stores general user preferences
- Display preferences (theme, language, currency, timezone)
- Privacy settings (visibility, data sharing)
- Communication preferences (email/phone verified, 2FA)

### **3. notification_preferences**
Stores notification preferences across all channels
- Email notifications (loans, payments, summaries, security)
- Push notifications (updates, reminders, alerts)
- SMS notifications (payments, security, approvals)
- In-app notifications (sound, vibration)
- Notification frequency and quiet hours

### **4. investment_preferences**
Stores investment preferences and auto-invest settings
- Risk profile (tolerance, goals)
- Investment limits (min/max amounts)
- Loan preferences (types, interest rates, terms, ZimScore)
- Auto-invest settings (enabled, amount, frequency)
- Geographic preferences (regions)

### **5. user_documents**
Stores user document metadata
- Document information (type, number, URL, file details)
- Verification status (pending, verified, rejected, expired)
- Document validity (issue/expiry dates)
- Metadata and notes

---

## 🚀 Setup Instructions

### **Step 1: Check Current Database State**

Run this query in Supabase SQL Editor:
```sql
-- File: database/check-settings-tables.sql
```

This will show you:
- ✅ Which tables already exist
- ✅ Column structure of existing tables
- ✅ Indexes and policies
- ✅ Record counts

### **Step 2: Create Missing Tables**

Run this script in Supabase SQL Editor:
```sql
-- File: database/unified-settings-schema.sql
```

This will:
- ✅ Create all 5 tables with proper structure
- ✅ Add indexes for performance
- ✅ Set up triggers for auto-updates
- ✅ Configure Row Level Security (RLS)
- ✅ Grant proper permissions
- ✅ Create auto-initialization for new users

### **Step 3: Verify Installation**

The script automatically runs verification at the end. You should see:
```
✅ user_statistics table exists
✅ user_settings table exists
✅ notification_preferences table exists
✅ investment_preferences table exists
✅ user_documents table exists
```

---

## 🔐 Security Features

### **Row Level Security (RLS)**
- ✅ Users can only view/update their own data
- ✅ Policies enforced at database level
- ✅ No data leakage between users

### **Automatic Initialization**
- ✅ New users automatically get default settings
- ✅ Triggered on user signup
- ✅ No manual setup required

### **Data Validation**
- ✅ CHECK constraints on all numeric fields
- ✅ ENUM constraints on status fields
- ✅ Foreign key constraints to auth.users
- ✅ Unique constraints on user_id

---

## 📊 Table Relationships

```
auth.users (Supabase Auth)
    ↓
    ├── user_statistics (1:1)
    ├── user_settings (1:1)
    ├── notification_preferences (1:1)
    ├── investment_preferences (1:1)
    └── user_documents (1:many)
```

---

## 🔄 Automatic Features

### **Timestamp Updates**
All tables automatically update `updated_at` on any modification

### **User Initialization**
When a new user signs up:
1. `user_statistics` record created with defaults
2. `user_settings` record created with defaults
3. `notification_preferences` record created with defaults
4. `investment_preferences` record created with defaults

### **Data Validation**
- Negative values prevented on amounts
- Percentages constrained to 0-100
- Dates validated
- Enums enforced

---

## 📝 Default Values

### **user_statistics**
```sql
total_invested: 0
total_returns: 0
active_investments: 0
average_roi: 0
on_time_payment_rate: 100
default_rate: 0
```

### **user_settings**
```sql
theme: 'dark'
language: 'en'
currency: 'USD'
timezone: 'Africa/Harare'
profile_visibility: 'private'
allow_messages: true
```

### **notification_preferences**
```sql
email_*: true (except marketing)
push_*: true (except promotional)
sms_security_alerts: true
digest_frequency: 'daily'
```

### **investment_preferences**
```sql
risk_tolerance: 'moderate'
min_investment: 100
max_investment: 10000
auto_invest_enabled: false
diversification_enabled: true
```

---

## 🧪 Testing

### **1. Check Table Creation**
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents');
```

### **2. Test User Initialization**
Create a new test user and verify all settings tables are populated:
```sql
SELECT 
    (SELECT COUNT(*) FROM user_statistics WHERE user_id = 'test-user-id') as stats,
    (SELECT COUNT(*) FROM user_settings WHERE user_id = 'test-user-id') as settings,
    (SELECT COUNT(*) FROM notification_preferences WHERE user_id = 'test-user-id') as notif,
    (SELECT COUNT(*) FROM investment_preferences WHERE user_id = 'test-user-id') as invest;
```

### **3. Test RLS Policies**
Try to access another user's data (should fail):
```sql
SELECT * FROM user_settings WHERE user_id != auth.uid();
-- Should return 0 rows
```

---

## 🔧 Troubleshooting

### **Issue: Tables already exist**
```sql
-- Drop existing tables (CAUTION: This deletes data!)
DROP TABLE IF EXISTS public.user_documents CASCADE;
DROP TABLE IF EXISTS public.investment_preferences CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
DROP TABLE IF EXISTS public.user_statistics CASCADE;

-- Then run unified-settings-schema.sql again
```

### **Issue: Permission denied**
Make sure you're running as a superuser or have proper permissions:
```sql
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
```

### **Issue: Trigger not firing**
Check if trigger exists:
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
```

---

## 📊 Performance Considerations

### **Indexes Created:**
- `idx_user_statistics_user_id` - Fast user lookups
- `idx_user_statistics_updated_at` - Fast time-based queries
- `idx_user_settings_user_id` - Fast user lookups
- `idx_notification_preferences_user_id` - Fast user lookups
- `idx_investment_preferences_user_id` - Fast user lookups
- `idx_investment_preferences_auto_invest` - Fast auto-invest queries
- `idx_user_documents_user_id` - Fast user lookups
- `idx_user_documents_status` - Fast status filtering
- `idx_user_documents_type` - Fast type filtering

### **Expected Performance:**
- User settings load: < 50ms
- Statistics calculation: < 100ms
- Document queries: < 50ms

---

## ✅ Checklist

Before deploying to production:

- [ ] Run `check-settings-tables.sql` to verify current state
- [ ] Backup existing data (if any)
- [ ] Run `unified-settings-schema.sql` in Supabase
- [ ] Verify all 5 tables created successfully
- [ ] Test with a new user signup
- [ ] Verify RLS policies working
- [ ] Test API endpoints (should now return 200 instead of 404)
- [ ] Monitor production logs for errors
- [ ] Verify frontend settings page loads correctly

---

## 📚 Related Files

- `database/unified-settings-schema.sql` - Main schema file
- `database/check-settings-tables.sql` - Verification script
- `MISSING-API-ENDPOINTS.md` - API endpoints documentation

---

## 🎯 Expected Results

After running the schema:

**Before:**
```
❌ 404 - Route not found: GET /api/settings/profile
❌ 404 - Route not found: GET /api/settings/display
❌ Statistics error: Could not find table 'user_statistics'
```

**After:**
```
✅ 200 - GET /api/settings/profile
✅ 200 - GET /api/settings/display
✅ Statistics loaded successfully
```

---

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Status:** Ready for Production Deployment

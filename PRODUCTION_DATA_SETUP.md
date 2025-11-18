# 🎯 Production Test Data Setup Guide

## 📋 Overview

This guide helps you populate your ZimCrowd database with realistic production-like data for testing the admin dashboard.

---

## 🚀 Quick Start (Recommended)

### **Option 1: Quick Test Data** ⭐ **FASTEST**

Creates minimal but complete data (5 users, 5 loans, transactions):

```sql
-- Run in Supabase SQL Editor:
database/QUICK_TEST_DATA.sql
```

**What you get:**
- ✅ 5 test users with verified accounts
- ✅ 5 wallets with balances
- ✅ 5 loans (active, paid, pending)
- ✅ 6 transactions
- ⏱️ Takes: ~5 seconds

---

### **Option 2: Full Production Data** 🎨 **REALISTIC**

Creates comprehensive realistic data (50+ users, 30 loans, 100+ transactions):

```sql
-- Run in Supabase SQL Editor:
database/PRODUCTION_TEST_DATA.sql
```

**What you get:**
- ✅ 50 users from different cities
- ✅ 30 loans with varied statuses
- ✅ 20 investments
- ✅ 100+ transactions
- ✅ KYC records
- ✅ Wallet balances
- ⏱️ Takes: ~30 seconds

---

## 📊 What Data Gets Created

### **1. Users Section**
- **High-income users** ($2,500+/month)
- **Medium-income users** ($1,500-2,500/month)
- **Low-income users** (<$1,500/month)
- **Verified users** (email + phone)
- **Unverified users** (new signups)
- **Geographic diversity** (Harare, Bulawayo, Mutare)

### **2. Financial Section**
- **Active loans** (currently being repaid)
- **Paid loans** (completed successfully)
- **Pending loans** (awaiting approval)
- **Defaulted loans** (overdue payments)
- **Deposits** (wallet top-ups)
- **Withdrawals** (cash-outs)
- **Loan payments** (monthly repayments)

### **3. Loans Section**
- **Business loans** (for business expansion)
- **Education loans** (school fees)
- **Medical loans** (healthcare)
- **Personal loans** (general purpose)
- **Home improvement loans** (renovations)

### **4. System Section**
- **Transaction history** (last 30 days)
- **User activity** (signups, logins)
- **Payment statistics** (success rates)
- **Growth metrics** (daily/weekly/monthly)

---

## 🎯 Step-by-Step Setup

### **Step 1: Choose Your Data Set**

**For Quick Testing:**
```sql
-- Copy and paste from:
database/QUICK_TEST_DATA.sql
```

**For Realistic Demo:**
```sql
-- Copy and paste from:
database/PRODUCTION_TEST_DATA.sql
```

### **Step 2: Run in Supabase**

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Paste the SQL script
5. Click **Run** (or press F5)

### **Step 3: Verify Data**

Check the summary output:
```
=== DATA CREATION SUMMARY ===
Users Created: 50
Wallets Created: 45
Loans Created: 30
Transactions Created: 120
Investments Created: 20
KYC Records Created: 45
```

### **Step 4: Refresh Dashboard**

1. Go to: `http://localhost:3001/admin-dashboard-unified.html`
2. Press `Ctrl + Shift + R` (hard refresh)
3. See your data populate all sections!

---

## 📈 Expected Dashboard Stats

### **After Quick Test Data:**
- 👥 **Total Users:** 5
- 💰 **Total Loans:** 5
- 💵 **Loan Volume:** ~$4,100
- 📊 **Active Loans:** 3
- ✅ **Paid Loans:** 1
- ⏳ **Pending Loans:** 1

### **After Full Production Data:**
- 👥 **Total Users:** 50
- 💰 **Total Loans:** 30
- 💵 **Loan Volume:** ~$35,000
- 📊 **Active Loans:** ~15
- ✅ **Paid Loans:** ~8
- ⏳ **Pending Loans:** ~5
- ❌ **Defaulted:** ~2

---

## 🔧 Customization

### **Modify User Count**

Edit `PRODUCTION_TEST_DATA.sql`:
```sql
-- Change LIMIT to create more/fewer users
LIMIT 25  -- Change to 50, 100, etc.
```

### **Adjust Loan Amounts**

```sql
-- Modify the amount ranges
WHEN monthly_income > 2500 THEN (RANDOM() * 2000 + 500)
-- Change 2000 to higher/lower max amount
```

### **Change Transaction Volume**

```sql
-- Modify generate_series count
FROM wallet_data, generate_series(1, 3);
-- Change 3 to create more transactions per user
```

---

## 🧹 Clean Up Test Data

### **Remove All Test Data:**
```sql
-- Delete test users and related data
DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM loans WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM wallets WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM users WHERE email LIKE '%test%';
```

### **Remove Specific Test Users:**
```sql
DELETE FROM users WHERE email = 'test.user1@zimcrowd.com';
```

---

## 📊 Dashboard Sections Populated

### ✅ **Dashboard Overview**
- Total users count
- Active loans count
- Total loan volume
- Success rate
- Growth metrics

### ✅ **Financial Section**
- Wallet balances
- Transaction history
- Payment statistics
- Revenue metrics

### ✅ **Users Section**
- User list with details
- Verification status
- ZimScore ratings
- Activity timeline

### ✅ **Loans Section**
- Loan applications
- Repayment schedules
- Default rates
- Interest earned

### ✅ **System Section**
- Transaction logs
- User activity
- System health
- Performance metrics

---

## 🎨 Data Characteristics

### **Realistic Features:**
- ✅ Varied income levels
- ✅ Different employment types
- ✅ Geographic distribution
- ✅ Time-based creation (spread over 6 months)
- ✅ Realistic phone numbers (+263 Zimbabwe)
- ✅ Proper email formats
- ✅ Zimbabwean names and addresses
- ✅ Realistic loan amounts based on income
- ✅ Varied loan purposes
- ✅ Multiple transaction types
- ✅ Success/failure rates

---

## 🚨 Important Notes

1. **Run Once:** Don't run the same script multiple times (will create duplicates)
2. **Check Conflicts:** Scripts use `ON CONFLICT DO NOTHING` to prevent duplicates
3. **Backup First:** If you have real data, backup before running
4. **Test Environment:** Recommended for development/staging only
5. **Supabase Limits:** Be aware of row limits on free tier

---

## 🎯 Next Steps

After populating data:

1. **Test Dashboard Sections:**
   - Overview stats
   - User management
   - Loan management
   - Financial reports

2. **Test Filters:**
   - Date ranges
   - Status filters
   - Search functionality

3. **Test Exports:**
   - CSV downloads
   - JSON exports
   - Report generation

4. **Test Analytics:**
   - Charts rendering
   - Growth metrics
   - Performance stats

---

## 📞 Troubleshooting

### **Error: "relation does not exist"**
- **Solution:** Run the main schema first (`admin-roles-schema-fixed.sql`)

### **Error: "duplicate key value"**
- **Solution:** Data already exists, use clean-up script first

### **No data showing in dashboard**
- **Solution:** Hard refresh browser (`Ctrl + Shift + R`)

### **Wrong totals in dashboard**
- **Solution:** Check SQL queries in admin service

---

## ✅ Verification Checklist

- [ ] Users created successfully
- [ ] Wallets have balances
- [ ] Loans show different statuses
- [ ] Transactions recorded
- [ ] Dashboard shows correct totals
- [ ] Charts render properly
- [ ] Filters work correctly
- [ ] Search functions properly

---

## 🎉 Success!

Your admin dashboard now has realistic production data for testing and demonstration!

**Access your dashboard:**
```
http://localhost:3001/admin-dashboard-unified.html
```

**Login with:**
```
API Key: zimcrowd-admin-dfc7e9a5e1ba1508d0d4950b9765a934
```

---

**Enjoy your fully populated admin dashboard!** 🚀

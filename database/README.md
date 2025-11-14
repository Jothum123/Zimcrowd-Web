# 🗄️ ZimCrowd Database Documentation

## Overview

This directory contains the complete database schema and seeding scripts for the ZimCrowd platform. The database is designed to match the mock data structure exactly, ensuring seamless transition from development to production.

---

## 📁 Files

### **schema.sql**
Complete PostgreSQL database schema including:
- Tables for users, wallets, loans, investments, transactions, notifications
- Indexes for optimal query performance
- Row Level Security (RLS) policies
- Triggers for automatic timestamp updates
- Views for common queries
- Functions for business logic

### **seed-data.js**
Node.js script to populate the database with initial realistic data:
- Test user profile
- Wallet with balance
- Sample loans (active, pending, completed)
- Sample investments
- Transaction history
- Notifications
- User statistics

---

## 🏗️ Database Structure

### **Tables**

#### **user_profiles**
Extends Supabase auth.users with additional profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (references auth.users) |
| email | TEXT | User email (unique) |
| phone | TEXT | User phone (unique) |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| country | TEXT | Country |
| city | TEXT | City |
| avatar_url | TEXT | Profile picture URL |
| email_verified | BOOLEAN | Email verification status |
| phone_verified | BOOLEAN | Phone verification status |
| kyc_status | TEXT | KYC status (pending/verified/rejected) |
| kyc_level | INTEGER | KYC level (0-3) |
| created_at | TIMESTAMP | Account creation date |
| updated_at | TIMESTAMP | Last update date |

#### **wallets**
User wallet and balance information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to user_profiles |
| balance | DECIMAL(15,2) | Current balance |
| currency | TEXT | Currency code (default: USD) |
| available_balance | DECIMAL(15,2) | Available for withdrawal |
| pending_balance | DECIMAL(15,2) | Pending transactions |
| total_invested | DECIMAL(15,2) | Total amount invested |
| total_borrowed | DECIMAL(15,2) | Total amount borrowed |
| total_earned | DECIMAL(15,2) | Total interest earned |
| created_at | TIMESTAMP | Wallet creation date |
| updated_at | TIMESTAMP | Last update date |

#### **loans**
Loan requests and active loans.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| borrower_id | UUID | Foreign key to user_profiles |
| amount | DECIMAL(15,2) | Loan amount |
| currency | TEXT | Currency code |
| interest_rate | DECIMAL(5,2) | Annual interest rate (%) |
| term_months | INTEGER | Loan term in months |
| purpose | TEXT | Loan purpose |
| status | TEXT | Loan status (pending/active/completed/defaulted) |
| funded_amount | DECIMAL(15,2) | Amount funded so far |
| repaid_amount | DECIMAL(15,2) | Amount repaid |
| remaining_amount | DECIMAL(15,2) | Amount remaining |
| next_payment_date | DATE | Next payment due date |
| next_payment_amount | DECIMAL(15,2) | Next payment amount |
| risk_rating | TEXT | Risk rating (A+, A, B+, etc.) |
| collateral_type | TEXT | Type of collateral |
| monthly_payment | DECIMAL(15,2) | Monthly payment amount |
| payments_made | INTEGER | Number of payments made |
| payments_remaining | INTEGER | Number of payments remaining |
| funding_progress | INTEGER | Funding progress (0-100%) |
| created_at | TIMESTAMP | Loan request date |
| funded_at | TIMESTAMP | Loan funded date |
| completed_at | TIMESTAMP | Loan completion date |
| updated_at | TIMESTAMP | Last update date |

#### **investments**
User investments in loans.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| investor_id | UUID | Foreign key to user_profiles |
| loan_id | UUID | Foreign key to loans |
| amount | DECIMAL(15,2) | Investment amount |
| currency | TEXT | Currency code |
| interest_rate | DECIMAL(5,2) | Interest rate (%) |
| status | TEXT | Investment status (active/completed/defaulted) |
| earned_interest | DECIMAL(15,2) | Interest earned so far |
| expected_return | DECIMAL(15,2) | Expected total return |
| term_months | INTEGER | Investment term |
| payments_received | INTEGER | Number of payments received |
| next_payment_date | DATE | Next payment date |
| next_payment_amount | DECIMAL(15,2) | Next payment amount |
| invested_at | TIMESTAMP | Investment date |
| maturity_date | TIMESTAMP | Investment maturity date |
| completed_at | TIMESTAMP | Investment completion date |
| updated_at | TIMESTAMP | Last update date |

#### **transactions**
All financial transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to user_profiles |
| type | TEXT | Transaction type (investment/repayment/deposit/withdrawal/interest/fee/refund) |
| amount | DECIMAL(15,2) | Transaction amount |
| currency | TEXT | Currency code |
| status | TEXT | Transaction status (pending/completed/failed/cancelled) |
| description | TEXT | Transaction description |
| reference | TEXT | Unique reference number |
| balance_after | DECIMAL(15,2) | Balance after transaction |
| payment_method | TEXT | Payment method used |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Transaction date |
| completed_at | TIMESTAMP | Completion date |
| updated_at | TIMESTAMP | Last update date |

#### **notifications**
User notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to user_profiles |
| type | TEXT | Notification type (payment_due/loan_funded/etc.) |
| title | TEXT | Notification title |
| message | TEXT | Notification message |
| read | BOOLEAN | Read status |
| action_url | TEXT | Action URL |
| priority | TEXT | Priority (low/medium/high/urgent) |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Notification date |
| read_at | TIMESTAMP | Read date |

#### **user_statistics**
Cached user statistics for dashboard.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to user_profiles |
| total_loans | INTEGER | Total number of loans |
| active_loans | INTEGER | Active loans count |
| pending_loans | INTEGER | Pending loans count |
| completed_loans | INTEGER | Completed loans count |
| total_investments | INTEGER | Total investments count |
| active_investments | INTEGER | Active investments count |
| completed_investments | INTEGER | Completed investments count |
| total_borrowed | DECIMAL(15,2) | Total amount borrowed |
| total_invested | DECIMAL(15,2) | Total amount invested |
| total_earned | DECIMAL(15,2) | Total interest earned |
| total_repaid | DECIMAL(15,2) | Total amount repaid |
| average_return_rate | DECIMAL(5,2) | Average return rate (%) |
| portfolio_performance | DECIMAL(5,2) | Portfolio performance (%) |
| credit_score | INTEGER | Credit score (0-850) |
| success_rate | DECIMAL(5,2) | Success rate (%) |
| updated_at | TIMESTAMP | Last update date |

---

## 🔐 Security

### **Row Level Security (RLS)**

All tables have RLS enabled with policies that ensure:
- Users can only view their own data
- Users cannot modify other users' data
- Public loan opportunities are visible to all authenticated users
- Service role can bypass RLS for admin operations

### **Example Policies**

```sql
-- Users can only view their own wallet
CREATE POLICY "Users can view own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view their own loans
CREATE POLICY "Users can view own loans" ON public.loans
    FOR SELECT USING (auth.uid() = borrower_id);

-- Users can view public loan opportunities
CREATE POLICY "Users can view public loan opportunities" ON public.loans
    FOR SELECT USING (status = 'pending');
```

---

## 🚀 Setup Instructions

### **1. Run Schema**

```sql
-- In Supabase SQL Editor
-- Copy and paste contents of schema.sql
-- Click "Run"
```

### **2. Seed Database**

```bash
# Ensure .env file has Supabase credentials
node database/seed-data.js
```

### **3. Verify Setup**

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check data was seeded
SELECT COUNT(*) FROM user_profiles;
SELECT COUNT(*) FROM loans;
SELECT COUNT(*) FROM investments;
SELECT COUNT(*) FROM transactions;
```

---

## 📊 Sample Queries

### **Get User Dashboard Data**

```sql
SELECT 
    w.balance,
    w.total_invested,
    w.total_earned,
    s.active_loans,
    s.active_investments,
    s.credit_score
FROM wallets w
JOIN user_statistics s ON w.user_id = s.user_id
WHERE w.user_id = 'user-id-here';
```

### **Get Active Loans with Borrower Info**

```sql
SELECT 
    l.*,
    up.first_name || ' ' || up.last_name AS borrower_name
FROM loans l
JOIN user_profiles up ON l.borrower_id = up.id
WHERE l.status = 'active';
```

### **Get Investment Portfolio**

```sql
SELECT 
    i.*,
    l.purpose AS loan_purpose,
    l.risk_rating,
    up.first_name || ' ' || up.last_name AS borrower_name
FROM investments i
JOIN loans l ON i.loan_id = l.id
JOIN user_profiles up ON l.borrower_id = up.id
WHERE i.investor_id = 'user-id-here'
ORDER BY i.invested_at DESC;
```

### **Get Recent Transactions**

```sql
SELECT *
FROM transactions
WHERE user_id = 'user-id-here'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔄 Maintenance

### **Update Statistics**

```sql
-- Manually update user statistics
SELECT update_user_statistics('user-id-here');
```

### **Calculate Loan Funding Progress**

```sql
-- Get funding progress for a loan
SELECT calculate_loan_funding_progress('loan-id-here');
```

### **Backup Database**

```bash
# Using Supabase CLI
supabase db dump > backup.sql

# Or use Supabase Dashboard
# Settings > Database > Backups
```

---

## 📈 Performance Optimization

### **Indexes**

All frequently queried columns have indexes:
- `user_id` on all user-related tables
- `status` on loans and investments
- `created_at` on transactions (DESC order)
- `read` on notifications

### **Views**

Pre-defined views for common queries:
- `loan_details` - Loans with borrower information
- `investment_details` - Investments with loan and borrower info

### **Query Tips**

```sql
-- Use indexes
WHERE user_id = 'xxx'  -- ✅ Uses index
WHERE LOWER(email) = 'xxx'  -- ❌ Doesn't use index

-- Use pagination
LIMIT 10 OFFSET 0  -- ✅ Good
LIMIT 10000  -- ❌ Bad

-- Use specific columns
SELECT id, amount, status  -- ✅ Good
SELECT *  -- ❌ Bad for large tables
```

---

## 🐛 Troubleshooting

### **Issue: Tables not created**

```sql
-- Check for errors
SELECT * FROM pg_stat_activity;

-- Drop and recreate
DROP TABLE IF EXISTS table_name CASCADE;
-- Then re-run schema.sql
```

### **Issue: RLS blocking queries**

```sql
-- Temporarily disable RLS for testing
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### **Issue: Seeding fails**

```bash
# Check Supabase connection
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Check if tables exist
# Go to Supabase > Table Editor

# Clear existing data
DELETE FROM transactions;
DELETE FROM investments;
DELETE FROM loans;
DELETE FROM wallets;
DELETE FROM user_profiles;

# Re-run seeding
node database/seed-data.js
```

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Design Best Practices](https://supabase.com/docs/guides/database/design)

---

**Database Version:** 1.0.0  
**Last Updated:** November 2024  
**Compatible with:** Supabase PostgreSQL 15+

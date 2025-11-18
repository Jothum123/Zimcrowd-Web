# 🔧 Test Data Creation - Solutions

## ❌ **THE PROBLEM**

Your `users` table has a foreign key constraint to `auth.users` (Supabase Auth). This means you **cannot** insert users directly via SQL - they must be created through the Supabase Auth system.

**Error:**
```
insert or update on table "wallets" violates foreign key constraint "wallets_user_id_fkey"
```

This happens because the user IDs we're trying to use don't exist in `auth.users`.

---

## ✅ **SOLUTION 1: Use Existing Users** ⭐ **EASIEST**

If you already have users in your database, use them for test data!

### **Run this script:**
```sql
database/SIMPLE_TEST_DATA.sql
```

**What it does:**
- ✅ Finds existing users
- ✅ Creates wallets for them
- ✅ Creates loans for them
- ✅ Creates transactions for them

**No need to create new users!**

---

## ✅ **SOLUTION 2: Create Users via Signup**

### **Step 1: Create Test Users**

Go to your signup page and create accounts:

```
Email: test.user1@zimcrowd.com
Password: Test123!
Name: Test User One
```

```
Email: test.user2@zimcrowd.com
Password: Test123!
Name: Test User Two
```

```
Email: test.user3@zimcrowd.com
Password: Test123!
Name: Test User Three
```

### **Step 2: Run the Simple Script**

```sql
database/SIMPLE_TEST_DATA.sql
```

This will add wallets, loans, and transactions to your newly created users.

---

## ✅ **SOLUTION 3: Use Supabase Dashboard**

### **Create Users in Supabase:**

1. Go to **Supabase Dashboard**
2. Click **Authentication** → **Users**
3. Click **Add User**
4. Create test users:
   - Email: `test.user1@zimcrowd.com`
   - Password: `Test123!`
   - Auto Confirm: ✅ Yes

5. Repeat for more users

### **Then Run:**
```sql
database/SIMPLE_TEST_DATA.sql
```

---

## ✅ **SOLUTION 4: Manual SQL (Advanced)**

If you really need to insert directly:

```sql
-- Insert into auth.users first (Supabase specific)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'test.user1@zimcrowd.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
);

-- Then insert into your users table
-- using the same UUID from auth.users
```

**⚠️ Warning:** This is complex and can break auth. Not recommended!

---

## 🎯 **RECOMMENDED APPROACH**

### **Option A: Use What You Have**

1. Check if you have existing users:
   ```sql
   SELECT id, email, full_name, created_at 
   FROM users 
   LIMIT 10;
   ```

2. If yes, run:
   ```sql
   database/SIMPLE_TEST_DATA.sql
   ```

### **Option B: Create Fresh Test Users**

1. Use your app's signup page
2. Create 3-5 test accounts
3. Run the simple script

---

## 📊 **WHAT YOU'LL GET**

After running `SIMPLE_TEST_DATA.sql`:

- ✅ Wallets for all test users
- ✅ Loans (random amounts, statuses)
- ✅ Transactions (deposits)
- ✅ Realistic data spread over time

---

## 🔍 **CHECK YOUR CURRENT DATA**

Run this to see what you already have:

```sql
-- Check users
SELECT COUNT(*) as user_count FROM users;

-- Check wallets
SELECT COUNT(*) as wallet_count FROM wallets;

-- Check loans
SELECT COUNT(*) as loan_count FROM loans;

-- Check transactions
SELECT COUNT(*) as transaction_count FROM transactions;
```

---

## 💡 **WHY THIS HAPPENS**

Supabase uses `auth.users` for authentication. Your `users` table is linked to it:

```
auth.users (Supabase Auth)
    ↓ (foreign key)
users (your table)
    ↓ (foreign key)
wallets, loans, transactions
```

You can't skip the top level!

---

## 🚀 **QUICK START**

### **Fastest Way:**

1. **Run this:**
   ```sql
   database/SIMPLE_TEST_DATA.sql
   ```

2. **If it says "No test users found":**
   - Create 1-3 users via signup
   - Run the script again

3. **Done!** ✅

---

## 📝 **SUMMARY**

| Solution | Difficulty | Time | Best For |
|----------|-----------|------|----------|
| Use existing users | ⭐ Easy | 1 min | If you have users |
| Signup page | ⭐⭐ Easy | 5 min | Clean test data |
| Supabase Dashboard | ⭐⭐ Medium | 5 min | Admin access |
| Manual SQL | ⭐⭐⭐⭐⭐ Hard | 30 min | Advanced only |

---

**Recommendation: Use Solution 1 or 2!** 🎯

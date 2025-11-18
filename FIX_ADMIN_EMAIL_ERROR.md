# 🔧 Fix: admin_email Column Error

## ❌ **ERROR**
```
ERROR: 42703: column "admin_email" does not exist
```

## 🎯 **ROOT CAUSE**

The `admin_users` table either:
1. Doesn't exist yet
2. Was created without the `admin_email` column
3. Has a different column name

---

## ✅ **SOLUTION - 3 OPTIONS**

### **OPTION 1: Quick Fix (If table exists)** ⚡

Run this SQL file to add the missing column:

```bash
# In Supabase SQL Editor or psql
\i database/fix-admin-email-column.sql
```

**What it does:**
- Checks if `admin_users` table exists
- Adds `admin_email` column if missing
- Adds proper constraints (UNIQUE, NOT NULL)
- Creates index for performance

---

### **OPTION 2: Complete Fresh Install** 🆕 **RECOMMENDED**

Use the fixed schema that handles all edge cases:

```bash
# In Supabase SQL Editor or psql
\i database/admin-roles-schema-fixed.sql
```

**What it does:**
- Creates all tables properly
- Handles missing foreign key tables gracefully
- Adds all constraints correctly
- Creates default roles and permissions
- Creates default super admin user
- Provides API key in output

**Benefits:**
- ✅ Handles all edge cases
- ✅ No circular dependency issues
- ✅ Creates everything in correct order
- ✅ Provides detailed feedback

---

### **OPTION 3: Manual Fix** 🛠️

If you prefer manual control:

```sql
-- 1. Check if table exists
SELECT * FROM pg_tables WHERE tablename = 'admin_users';

-- 2. Check current columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'admin_users';

-- 3. Add admin_email column if missing
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255) UNIQUE NOT NULL;

-- 4. Create index
CREATE INDEX IF NOT EXISTS idx_admin_users_email 
ON admin_users(admin_email);

-- 5. Verify
SELECT * FROM admin_users LIMIT 1;
```

---

## 📋 **STEP-BY-STEP GUIDE**

### **For Supabase Users:**

1. **Open Supabase Dashboard**
   - Go to your project
   - Click "SQL Editor" in left sidebar

2. **Run the Fixed Schema**
   ```sql
   -- Copy and paste content from:
   -- database/admin-roles-schema-fixed.sql
   ```

3. **Click "Run"**
   - Wait for completion
   - Check for success messages

4. **Verify Setup**
   ```sql
   -- Check tables created
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename LIKE 'admin%';
   
   -- Check admin_email column
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'admin_users' 
   AND column_name = 'admin_email';
   
   -- Check default admin
   SELECT admin_email, admin_name, api_key 
   FROM admin_users 
   WHERE admin_email = 'admin@zimcrowd.com';
   ```

---

## 🔍 **TROUBLESHOOTING**

### **Error: "table admin_users does not exist"**

**Solution:** Run the complete schema first:
```bash
\i database/admin-roles-schema-fixed.sql
```

---

### **Error: "column admin_email already exists"**

**Solution:** The column exists but might have wrong constraints:
```sql
-- Fix constraints
ALTER TABLE admin_users 
ALTER COLUMN admin_email SET NOT NULL;

ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_admin_email_key 
UNIQUE (admin_email);
```

---

### **Error: "relation users does not exist"**

**Solution:** The schema tries to reference `users` table. Two options:

**Option A:** Create users table first
```sql
-- Create basic users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Option B:** Use the fixed schema (already handles this)
```bash
\i database/admin-roles-schema-fixed.sql
```

---

### **Error: "circular dependency"**

**Solution:** The fixed schema handles this by:
1. Creating tables without foreign keys first
2. Adding foreign keys after all tables exist
3. Making some foreign keys optional

---

## ✅ **VERIFICATION CHECKLIST**

After running the fix, verify:

- [ ] `admin_users` table exists
- [ ] `admin_email` column exists
- [ ] Column is UNIQUE
- [ ] Column is NOT NULL
- [ ] Index exists on admin_email
- [ ] Default admin user created
- [ ] API key generated

**Verification SQL:**
```sql
-- 1. Check table structure
\d admin_users

-- 2. Check constraints
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'admin_users'::regclass;

-- 3. Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'admin_users';

-- 4. Check data
SELECT admin_email, admin_name, is_active 
FROM admin_users;
```

---

## 🎯 **RECOMMENDED APPROACH**

**For Production:**
```bash
# Use the fixed schema - it's bulletproof
\i database/admin-roles-schema-fixed.sql
```

**For Development:**
```bash
# Quick fix if you just need the column
\i database/fix-admin-email-column.sql
```

---

## 📊 **WHAT GETS CREATED**

### **Tables:**
1. `admin_roles` - Role definitions
2. `admin_users` - Admin user accounts (with admin_email)
3. `admin_permissions` - Permission definitions
4. `admin_role_permissions` - Role-permission mappings
5. `admin_sessions` - Session management

### **Default Roles:**
- super_admin (all permissions)
- admin (most permissions)
- finance_manager (finance operations)
- customer_support (user support)
- analyst (read-only)
- moderator (user management)

### **Default Admin:**
- Email: admin@zimcrowd.com
- Role: super_admin
- API Key: Generated automatically (shown in output)

---

## 🚀 **AFTER FIXING**

1. **Save the API Key**
   ```
   Look for: "API Key: zimcrowd-admin-xxxxx"
   Save this in your .env file
   ```

2. **Update .env**
   ```env
   ADMIN_API_KEY=zimcrowd-admin-xxxxx
   ```

3. **Test the Admin Dashboard**
   ```bash
   # Start your server
   npm start
   
   # Access admin dashboard
   http://localhost:3001/admin-dashboard-unified.html
   ```

4. **Verify API Access**
   ```bash
   curl http://localhost:3001/api/admin-role-management/profile \
     -H "x-api-key: zimcrowd-admin-xxxxx"
   ```

---

## 📝 **FILES CREATED**

1. **fix-admin-email-column.sql** - Quick fix for missing column
2. **admin-roles-schema-fixed.sql** - Complete bulletproof schema
3. **FIX_ADMIN_EMAIL_ERROR.md** - This guide

---

## ✅ **SUCCESS INDICATORS**

You'll know it worked when you see:

```
✓ Admin Roles System Setup Complete!
========================================
Roles created: 6
Permissions created: 38
Admin users created: 1
========================================
Default admin: admin@zimcrowd.com
API Key: zimcrowd-admin-xxxxx
========================================
```

---

## 🎊 **DONE!**

Your admin system should now be working with:
- ✅ admin_email column properly configured
- ✅ All tables created
- ✅ Default roles and permissions
- ✅ Default super admin user
- ✅ API key for access

**Next:** Test your admin dashboard! 🚀

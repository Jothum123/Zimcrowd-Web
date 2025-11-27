# Render Environment Variables - URGENT FIX

## 🚨 Critical Missing Variable

The backend is failing because `JWT_SECRET` is missing or incorrect on Render.

### **Add This to Render Dashboard:**

1. Go to https://dashboard.render.com
2. Select your **zimcrowd-api** backend service
3. Click **Environment** tab
4. Click **Add Environment Variable**
5. Add the following:

```
JWT_SECRET=ZimCrowd_Prod_JWT_Secret_2024_a8f3e9d2c1b4a7f6e5d8c3b2a1f9e8d7c6b5a4f3e2d1
```

6. Click **Save Changes**
7. Render will automatically redeploy

---

## ✅ All Required Environment Variables for Render

Make sure these are all set:

### **Database**
```
SUPABASE_URL=https://gjtkdrrvnffrmzigdqyp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc3NzIyNywiZXhwIjoyMDc4MzUzMjI3fQ.vRj7-jpNX3nAdL5QrDEEmWNGFMlxBmNTGTD--nArT1Y
```

### **Authentication**
```
JWT_SECRET=ZimCrowd_Prod_JWT_Secret_2024_a8f3e9d2c1b4a7f6e5d8c3b2a1f9e8d7c6b5a4f3e2d1
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=ZimCrowd_Prod_Refresh_Token_2024_f9e8d7c6b5a4f3e2d1a8f7e6d5c4b3a2f1e9d8c7b6a5
REFRESH_TOKEN_EXPIRES_IN=30d
```

### **Twilio (SMS)**
```
TWILIO_ACCOUNT_SID=ACb0000257c28e2e0cb777f83886464d5a
TWILIO_AUTH_TOKEN=af2576610944a4a3c188d875f1f12fdc
TWILIO_PHONE_NUMBER=+12298509774
TWILIO_VERIFY_SERVICE_SID=VAc849e45511e030bfc7988b124e1e394f
```

### **PayNow**
```
PAYNOW_INTEGRATION_ID=your_paynow_integration_id
PAYNOW_INTEGRATION_KEY=your_paynow_integration_key
```

### **Frontend URLs**
```
FRONTEND_URL=https://zimcrowd.com
ADMIN_FRONTEND_URL=https://admin.zimcrowd.com
```

### **Environment**
```
NODE_ENV=production
PORT=10000
```

---

## 🔧 After Adding JWT_SECRET:

1. Wait for Render to redeploy (~2 minutes)
2. **Log out and log back in** on the frontend (to get new valid token)
3. Try payment again
4. Should work!

---

## 📊 Other Issues to Fix (After JWT):

### **Database Columns Missing:**

Run this SQL in Supabase:

```sql
-- Add missing columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS show_profile_picture BOOLEAN DEFAULT true;

-- Add missing columns to user_notification_preferences  
ALTER TABLE user_notification_preferences
ADD COLUMN IF NOT EXISTS investment_updates BOOLEAN DEFAULT true;

-- Add missing column to loans table
ALTER TABLE loans
ADD COLUMN IF NOT EXISTS borrower_id UUID REFERENCES auth.users(id);
```

---

## ⚠️ Priority Order:

1. **URGENT:** Add `JWT_SECRET` to Render (fixes all auth errors)
2. Run SQL to add missing columns (fixes settings errors)
3. Log out and log back in (get fresh token)
4. Test payment

---

**Start with JWT_SECRET on Render - this is blocking everything!**

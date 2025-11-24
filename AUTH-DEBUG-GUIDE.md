# Authentication Debug Guide

## 🔍 Current Issues
- ❌ Email registration failing
- ❌ Phone registration failing  
- ❌ Social auth failing
- ❌ Login failing

---

## 📊 Step 1: Check Vercel Backend Logs

### **Access Logs:**
1. Go to: https://vercel.com/jojola/zimcrowd-backend
2. Click on "Logs" tab
3. Filter by:
   - `/api/email-auth/register-email`
   - `/api/phone-auth/register-phone`
   - `/api/social-auth/google`
   - `/api/auth/login`

### **What to Look For:**
```
❌ Error messages
❌ Stack traces
❌ Database connection errors
❌ Missing environment variables
```

---

## 🗄️ Step 2: Verify Database Tables Exist

Run this in **Supabase SQL Editor**:

```sql
-- Check if all required tables exist
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'profiles',
    'email_verifications',
    'phone_verifications',
    'user_settings',
    'login_activity'
)
ORDER BY table_name;
```

**Expected Result:**
| table_name | column_count |
|------------|--------------|
| email_verifications | 7 |
| login_activity | 6 |
| phone_verifications | 7 |
| profiles | 10+ |
| user_settings | 13 |

---

## 🔑 Step 3: Check Environment Variables

Verify these are set in Vercel:

### **Required Variables:**
```bash
# Supabase
SUPABASE_URL=https://gjtkdrrvnffrmzigdqyp.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# JWT
JWT_SECRET=your-secret-key

# Email Service (Resend)
RESEND_API_KEY=re_...

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### **Check in Vercel:**
1. Go to project settings
2. Click "Environment Variables"
3. Verify all keys are present
4. Check for typos or missing values

---

## 🧪 Step 4: Test Each Auth Method

### **Test 1: Email Registration**

**In Browser Console:**
```javascript
const testEmailRegistration = async () => {
    const response = await fetch('https://zimcrowd-backend.vercel.app/api/email-auth/register-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'Test123456',
            country: 'Zimbabwe',
            city: 'Harare'
        })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return data;
};

await testEmailRegistration();
```

**Expected Success:**
```json
{
  "success": true,
  "message": "Verification code sent to your email",
  "tempToken": "...",
  "email": "t***@example.com"
}
```

**If Failed, Check:**
- ❌ Status 500: Backend error (check Vercel logs)
- ❌ Status 400: Validation error
- ❌ "Failed to generate verification code": Missing `email_verifications` table

---

### **Test 2: Phone Registration**

```javascript
const testPhoneRegistration = async () => {
    const response = await fetch('https://zimcrowd-backend.vercel.app/api/phone-auth/register-phone', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            firstName: 'Test',
            lastName: 'User',
            phone: '+263771234567',
            password: 'Test123456',
            country: 'Zimbabwe',
            city: 'Harare'
        })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return data;
};

await testPhoneRegistration();
```

**Expected Success:**
```json
{
  "success": true,
  "message": "Verification code sent to your phone",
  "tempToken": "...",
  "phone": "+263***1234567"
}
```

**If Failed, Check:**
- ❌ "Failed to generate verification code": Missing `phone_verifications` table
- ❌ "Failed to send SMS": Twilio credentials missing/invalid

---

### **Test 3: Social Auth (Google)**

**Check OAuth Redirect:**
```javascript
// Test Google OAuth initiation
window.location.href = 'https://zimcrowd-backend.vercel.app/api/social-auth/google?mode=signup';
```

**Expected Flow:**
1. Redirects to Google login
2. User authorizes
3. Redirects back to callback URL
4. Creates/updates profile
5. Redirects to dashboard or onboarding

**If Failed, Check:**
- ❌ "bad_oauth_state": OAuth configuration issue
- ❌ Redirect loop: Callback URL mismatch
- ❌ 500 error: Profile creation failed

---

### **Test 4: Login**

```javascript
const testLogin = async () => {
    const response = await fetch('https://zimcrowd-backend.vercel.app/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'test@example.com',
            password: 'Test123456'
        })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return data;
};

await testLogin();
```

**Expected Success:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

---

## 🔧 Step 5: Common Fixes

### **Fix 1: Missing Verification Tables**
```sql
-- Run in Supabase SQL Editor
-- File: database-verification-tables.sql
```

### **Fix 2: Missing User Settings Table**
```sql
-- Run in Supabase SQL Editor
-- File: database-setup-minimal.sql
```

### **Fix 3: Check Supabase Connection**
```javascript
// Test Supabase connection
const { createClient } = supabase;
const supabaseUrl = 'https://gjtkdrrvnffrmzigdqyp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const client = createClient(supabaseUrl, supabaseKey);

const { data, error } = await client.from('profiles').select('count');
console.log('Supabase test:', { data, error });
```

### **Fix 4: Redeploy Backend**
```bash
# In project directory
vercel --prod
```

---

## 📋 Debug Checklist

Run through this checklist:

- [ ] Verified all tables exist in Supabase
- [ ] Checked Vercel logs for errors
- [ ] Confirmed environment variables are set
- [ ] Tested email registration endpoint
- [ ] Tested phone registration endpoint
- [ ] Tested social auth redirect
- [ ] Tested login endpoint
- [ ] Checked browser console for errors
- [ ] Verified network requests in DevTools
- [ ] Confirmed Supabase RLS policies are correct

---

## 🚨 Most Common Issues

### **Issue 1: Missing Tables**
**Symptom:** "Failed to generate verification code"
**Fix:** Run `database-verification-tables.sql`

### **Issue 2: Environment Variables**
**Symptom:** Various 500 errors
**Fix:** Check Vercel environment variables

### **Issue 3: RLS Policies Too Strict**
**Symptom:** "new row violates row-level security policy"
**Fix:** Check policies allow INSERT during signup

### **Issue 4: CORS Issues**
**Symptom:** "CORS policy blocked"
**Fix:** Check CORS settings in `backend-server.js`

### **Issue 5: Token Issues**
**Symptom:** 401 Unauthorized
**Fix:** Check JWT_SECRET is set and tokens are valid

---

## 🎯 Next Steps

1. **Check Vercel Logs First** - This will show the exact error
2. **Verify Database Tables** - Run the SQL check query
3. **Test Each Endpoint** - Use the test scripts above
4. **Check Environment Variables** - Ensure all are set
5. **Redeploy if Needed** - After fixing issues

---

## 📞 Get Specific Error Details

Run this to capture the exact error:

```javascript
const debugAuth = async (method, endpoint, body) => {
    try {
        console.log(`🔍 Testing ${method} ${endpoint}`);
        console.log('📤 Request body:', body);
        
        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        console.log('📥 Status:', response.status);
        console.log('📥 Response:', data);
        console.log('📥 Headers:', Object.fromEntries(response.headers));
        
        return { status: response.status, data };
    } catch (error) {
        console.error('❌ Error:', error);
        return { error: error.message };
    }
};

// Test email registration
await debugAuth('POST', 'https://zimcrowd-backend.vercel.app/api/email-auth/register-email', {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'Test123456'
});
```

---

**Share the output from the debug script and Vercel logs, and I'll help you fix the specific issue!**

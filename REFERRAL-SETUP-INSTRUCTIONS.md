# 🎁 Referral System Setup Instructions

## ⚠️ IMPORTANT: Check Before Running

**DO NOT run `database-referrals-setup.sql` until you check if tables already exist!**

---

## 📋 Step 1: Check Existing Tables

### **Run This First:**

Open **Supabase SQL Editor** and run:

```sql
-- File: check-referral-tables.sql
```

This will show you:
- ✅ Which tables already exist
- 📊 Your current referral code (if any)
- 👥 Your existing referrals
- 🔒 RLS policies status
- 🔧 Functions and triggers

---

## 🎯 Step 2: Interpret Results

### **Scenario A: All Tables Exist ✅**

If you see:
```
referrals         | ✅ EXISTS
referral_codes    | ✅ EXISTS
referral_earnings | ✅ EXISTS
referral_payouts  | ✅ EXISTS
```

**Action:** ✅ **SKIP the setup script!** Your referral system is already configured.

**Next Steps:**
1. Check if you have a referral code (query shows it)
2. If no code exists, run only this:
   ```sql
   INSERT INTO public.referral_codes (user_id, referral_code)
   SELECT 
       id,
       'ZCRWD-' || UPPER(SUBSTRING(id::TEXT, 1, 6)) || '-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT, -4)
   FROM public.profiles
   WHERE email = 'jothumchitewe@gmail.com'
   AND id NOT IN (SELECT user_id FROM public.referral_codes)
   ON CONFLICT (user_id) DO NOTHING;
   ```
3. Refresh your dashboard - referrals should work!

---

### **Scenario B: No Tables Exist ❌**

If you see:
```
referrals         | ❌ MISSING
referral_codes    | ❌ MISSING
referral_earnings | ❌ MISSING
referral_payouts  | ❌ MISSING
```

**Action:** ✅ **RUN the full setup script**

**Steps:**
1. Open `database-referrals-setup.sql`
2. Copy the entire script
3. Paste into Supabase SQL Editor
4. Click "Run"
5. Wait for completion (should take 5-10 seconds)
6. Verify with the check script again

---

### **Scenario C: Partial Setup ⚠️**

If some tables exist but not all:

**Action:** 🔧 **Fix the incomplete setup**

**Option 1: Clean Slate (Recommended)**
```sql
-- Drop existing tables
DROP TABLE IF EXISTS public.referral_payouts CASCADE;
DROP TABLE IF EXISTS public.referral_earnings CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.referral_codes CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS generate_referral_code(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_referral_code_for_user() CASCADE;
DROP FUNCTION IF EXISTS update_referral_stats() CASCADE;

-- Now run the full setup script
```

**Option 2: Create Only Missing Tables**
- Manually extract the CREATE TABLE statements for missing tables from `database-referrals-setup.sql`
- Run only those specific statements

---

## 🧪 Step 3: Verify Setup

After running the setup (if needed), verify everything works:

### **1. Check Your Referral Code**

```sql
SELECT 
    p.email,
    rc.referral_code,
    rc.total_referrals,
    rc.total_earnings
FROM public.referral_codes rc
JOIN public.profiles p ON rc.user_id = p.id
WHERE p.email = 'jothumchitewe@gmail.com';
```

**Expected Result:**
```
email                    | referral_code      | total_referrals | total_earnings
jothumchitewe@gmail.com | ZCRWD-ABC123-4567 | 0               | 0.00
```

---

### **2. Test API Endpoint**

In your browser console:

```javascript
const testReferralCode = async () => {
    const token = JSON.parse(localStorage.getItem('authData') || '{}').access_token;
    
    const res = await fetch('https://zimcrowd-backend.vercel.app/api/referrals/code', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    console.log('✅ Referral Code:', data);
    
    if (data.success) {
        console.log('🎉 Your Code:', data.data.referral_code);
        console.log('🔗 Share URL:', data.data.share_url);
    } else {
        console.error('❌ Error:', data.message);
    }
};

await testReferralCode();
```

**Expected Output:**
```javascript
{
  success: true,
  data: {
    referral_code: "ZCRWD-ABC123-4567",
    share_url: "https://zimcrowd.com/signup?ref=ZCRWD-ABC123-4567",
    qr_code_url: "https://api.qrserver.com/v1/create-qr-code/..."
  }
}
```

---

### **3. Test Referral Stats**

```javascript
const testReferralStats = async () => {
    const token = JSON.parse(localStorage.getItem('authData') || '{}').access_token;
    
    const res = await fetch('https://zimcrowd-backend.vercel.app/api/referrals/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = await res.json();
    console.log('📊 Referral Stats:', data);
};

await testReferralStats();
```

**Expected Output:**
```javascript
{
  success: true,
  data: {
    total_referrals: 0,
    active_referrals: 0,
    pending_referrals: 0,
    total_earnings: 0,
    this_month_earnings: 0,
    active_loans_from_referrals: 0,
    average_loan_amount: 0,
    conversion_rate: 0
  }
}
```

---

## 🎯 Step 4: View in Dashboard

1. **Refresh Dashboard** (`Ctrl + Shift + R`)
2. **Navigate to:** Referral Program section
3. **You should see:**
   - ✅ Your unique referral code
   - ✅ QR code for sharing
   - ✅ Share buttons (WhatsApp, Facebook, Twitter, Email)
   - ✅ Empty referral list (until someone signs up with your code)
   - ✅ Stats showing 0 referrals, $0 earnings

---

## 🐛 Troubleshooting

### **Problem: "Loading..." stuck on referral code**

**Solution:**
1. Check browser console for errors
2. Verify token exists: `localStorage.getItem('authData')`
3. Test API directly (see Step 3.2 above)
4. Check Vercel logs for backend errors

---

### **Problem: 401 Unauthorized Error**

**Solution:**
1. Logout and login again
2. Check if token is valid:
   ```javascript
   const token = JSON.parse(localStorage.getItem('authData') || '{}').access_token;
   console.log('Token:', token ? 'EXISTS' : 'MISSING');
   ```
3. Verify backend deployment is live

---

### **Problem: 500 Internal Server Error**

**Solution:**
1. Check if referral tables exist (run check script)
2. Verify RLS policies are created
3. Check Vercel backend logs
4. Ensure your profile exists in `profiles` table

---

### **Problem: No referral code generated**

**Solution:**
```sql
-- Manually create referral code
INSERT INTO public.referral_codes (user_id, referral_code)
SELECT 
    id,
    'ZCRWD-' || UPPER(SUBSTRING(id::TEXT, 1, 6)) || '-' || SUBSTRING(EXTRACT(EPOCH FROM NOW())::TEXT, -4)
FROM public.profiles
WHERE email = 'jothumchitewe@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET
    referral_code = EXCLUDED.referral_code;

-- Verify
SELECT * FROM public.referral_codes 
WHERE user_id = (SELECT id FROM public.profiles WHERE email = 'jothumchitewe@gmail.com');
```

---

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `check-referral-tables.sql` | ✅ **RUN THIS FIRST** - Check existing setup |
| `database-referrals-setup.sql` | 🔧 Full setup script (run if tables missing) |
| `routes/referrals.js` | 🚀 Backend API routes (already deployed) |
| `js/production-data-loader.js` | 📊 Frontend data loader (already updated) |

---

## ✅ Success Checklist

- [ ] Ran `check-referral-tables.sql` to verify current state
- [ ] Decided whether to run full setup or skip
- [ ] If needed, ran `database-referrals-setup.sql`
- [ ] Verified referral code exists in database
- [ ] Tested `/api/referrals/code` endpoint successfully
- [ ] Tested `/api/referrals/stats` endpoint successfully
- [ ] Refreshed dashboard and see referral code
- [ ] Can copy and share referral link

---

## 🎉 Next Steps After Setup

1. **Share your referral code** with friends
2. **Track referrals** in the dashboard
3. **Earn commissions** when referrals take loans
4. **Request payouts** when you reach minimum threshold

---

**Need Help?** Check the console logs and Vercel backend logs for detailed error messages.

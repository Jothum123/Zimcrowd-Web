# 🔐 Authentication Fix Summary

## **Problem Identified:**

Multiple route files are using **custom JWT verification** instead of the centralized `authenticateUser` middleware that properly uses Supabase auth.

---

## **Routes Using Wrong Auth (causing JWT signature errors):**

1. ❌ `routes/wallet.js` - Line 21
2. ❌ `routes/transactions.js` - Line 21  
3. ❌ `routes/documents.js` - Line 41
4. ❌ `routes/admin.js` - Line 21
5. ❌ `routes/dashboard.js` - Line 31 (fallback)
6. ❌ `routes/referrals.js` - Line 31 (fallback)
7. ❌ `routes/phone-auth.js` - Lines 113, 169
8. ❌ `routes/zimscore.js` - Line 50

---

## **The Issue:**

These routes are doing:
```javascript
const jwt = require('jsonwebtoken');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
```

But they should be using:
```javascript
const { authenticateUser } = require('../middleware/auth');
router.get('/endpoint', authenticateUser, async (req, res) => {
    // req.user is already set by middleware
});
```

---

## **Why This Causes Errors:**

1. **Google OAuth tokens** are issued by Supabase
2. **Supabase tokens** use Supabase's JWT secret
3. **Your JWT_SECRET** is different from Supabase's secret
4. **jwt.verify()** fails because it's using wrong secret
5. **Result:** `JsonWebTokenError: invalid signature`

---

## **Solution:**

### **Option 1: Use Existing Middleware (Recommended)**

All these routes should import and use the `authenticateUser` middleware:

```javascript
const { authenticateUser } = require('../middleware/auth');

// Instead of custom auth in each route:
router.get('/balance', authenticateUser, async (req, res) => {
    const userId = req.user.id; // Already verified by middleware
    // ... rest of code
});
```

### **Option 2: Quick Fix - Use Supabase Directly**

Replace `jwt.verify()` with Supabase auth:

```javascript
// OLD (❌ causes error)
const jwt = require('jsonwebtoken');
const decoded = jwt.verify(token, process.env.JWT_SECRET);
const userId = decoded.userId;

// NEW (✅ works)
const { supabase } = require('../utils/supabase-auth');
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
}
const userId = user.id;
```

---

## **Files That Need Updating:**

### **Priority 1 (High Traffic):**
- ✅ `middleware/auth.js` - Already correct!
- ❌ `routes/wallet.js` - Fix authenticateUser function
- ❌ `routes/transactions.js` - Fix authenticateUser function
- ❌ `routes/documents.js` - Fix authenticateUser function

### **Priority 2 (Medium Traffic):**
- ❌ `routes/dashboard.js` - Remove JWT fallback
- ❌ `routes/referrals.js` - Remove JWT fallback
- ❌ `routes/admin.js` - Fix authenticateUser function

### **Priority 3 (Low Traffic):**
- ❌ `routes/phone-auth.js` - Fix 2FA endpoints
- ❌ `routes/zimscore.js` - Fix auth check

---

## **Quick Test After Fix:**

```javascript
// In browser console
const testAuth = async () => {
    const token = localStorage.getItem('authToken');
    
    const endpoints = [
        '/api/wallet/balance',
        '/api/transactions',
        '/api/user/documents',
        '/api/user/profile'
    ];
    
    for (const endpoint of endpoints) {
        const response = await fetch(`https://zimcrowd-api.onrender.com${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(`${endpoint}: ${response.status}`);
    }
};

testAuth();
```

**Expected:** All should return `200 OK` or `404` (not `401`)

---

## **Immediate Workaround:**

Since the backend just restarted, the easiest fix is to:

1. **Logout and re-login** to get a fresh token
2. **Or** wait for me to fix the auth in these routes
3. **Or** use the routes that already work (like `/api/user/profile`)

---

## **Status:**

- ✅ `middleware/auth.js` - Correct (uses Supabase)
- ✅ `routes/user.js` - Correct (uses middleware)
- ❌ 8 route files - Need fixing
- ⏳ Estimated fix time: 10 minutes

---

**Next: I'll fix the auth in the high-priority routes (wallet, transactions, documents).**

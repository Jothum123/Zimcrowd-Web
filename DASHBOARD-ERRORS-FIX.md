# Dashboard Errors - Quick Fix Guide

## 🔴 Current Issues

Based on console logs:

### **1. Authentication Issues (401 Errors)**
```
GET /api/transactions 401 (Unauthorized)
GET /api/referrals/my-referrals 401 (Unauthorized)
GET /api/wallet/balance 401 (Unauthorized)
GET /api/documents 401 (Unauthorized)
```

**Cause:** Google OAuth token in localStorage isn't being accepted by backend

### **2. Backend Errors (500 Errors)**
```
GET /api/profile 500 (Internal Server Error)
GET /api/settings 500 (Internal Server Error)
GET /api/dashboard/notifications 500 (Internal Server Error)
GET /api/dashboard/wallet 500 (Internal Server Error)
```

**Cause:** Routes exist but failing internally (likely auth middleware issue)

### **3. Missing Endpoints (404 Errors)**
```
GET /api/dashboard/overview 404 (Not Found)
GET /api/investments/opportunities 404 (Not Found)
GET /api/analytics/portfolio-history 404 (Not Found)
GET /api/analytics/loan-distribution 404 (Not Found)
GET /api/analytics/monthly-activity 404 (Not Found)
```

**Cause:** These routes don't exist in backend yet

---

## ✅ **IMMEDIATE FIX: Check Your Token**

Run this in console:

```javascript
// Check what auth data you have
console.log('Auth Data:', localStorage.getItem('authData'));
console.log('Auth Token:', localStorage.getItem('authToken'));
console.log('Access Token:', localStorage.getItem('access_token'));

// Parse the auth data
const authData = JSON.parse(localStorage.getItem('authData') || '{}');
console.log('Parsed Auth Data:', authData);
console.log('Token from authData:', authData.access_token);
```

---

## 🔧 **Fix 1: Update Token Retrieval**

The issue is that your Google OAuth stores the token differently. Update `production-data-loader.js`:

```javascript
getAuthToken() {
    // Try multiple token locations
    const authData = JSON.parse(localStorage.getItem('authData') || '{}');
    
    return authData.access_token ||
           authData.token ||
           localStorage.getItem('authToken') || 
           localStorage.getItem('token') ||
           localStorage.getItem('access_token');
},
```

---

## 🔧 **Fix 2: Backend Auth Middleware**

The backend is trying to validate a Google OAuth token as a Supabase token. We need to handle both.

**Problem in `routes/settings.js` line 17:**
```javascript
const { data: { user }, error } = await supabase.auth.getUser(token);
```

This only works with Supabase tokens, not Google OAuth tokens.

**Solution:** Check if user is already authenticated via session, or validate the token differently.

---

## 🔧 **Fix 3: Missing Routes**

These routes need to be created:

1. `/api/dashboard/overview` - Dashboard stats
2. `/api/investments/opportunities` - Investment opportunities
3. `/api/analytics/*` - All analytics endpoints

---

## 🎯 **Quick Test**

After fixes, run this:

```javascript
const quickTest = async () => {
    const authData = JSON.parse(localStorage.getItem('authData') || '{}');
    const token = authData.access_token;
    
    console.log('Testing with token:', token?.substring(0, 20) + '...');
    
    // Test settings endpoint
    const res = await fetch('https://zimcrowd-backend.vercel.app/api/settings', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);
};

await quickTest();
```

---

## 📋 **Priority Fixes**

1. **HIGH:** Fix auth token handling (causing 401s)
2. **HIGH:** Fix backend auth middleware (causing 500s)
3. **MEDIUM:** Add missing dashboard/overview route
4. **LOW:** Add analytics routes (fallback data works)
5. **LOW:** Fix CSP violations (cosmetic)

---

## 🚀 **Temporary Workaround**

Until backend is fixed, the dashboard should still work with fallback data. The console shows:

```
⚠️ Showing fallback data for investments
⚠️ Showing fallback data for transactions
⚠️ Showing fallback data for analytics
⚠️ Showing fallback data for settings
```

This means the UI is functional, just showing static data instead of real data.

---

## 💡 **Root Cause**

The main issue is that you logged in with **Google OAuth** (social auth), which stores the token differently than email/password login. The backend routes are expecting a Supabase JWT token, but receiving a Google OAuth token.

**Two solutions:**

1. **Update backend** to handle Google OAuth tokens
2. **Exchange Google token** for Supabase session token on login

---

## 🔍 **Next Steps**

1. Check your token format (run the diagnostic above)
2. Share the token structure with me
3. I'll update the backend auth middleware to handle it
4. Redeploy backend
5. Test again


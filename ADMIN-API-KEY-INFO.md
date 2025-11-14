# 🔑 Admin API Key - Quick Reference

## 📍 **Where to Find Your Admin API Key:**

### **1. Local Development (.env file)**

**Location:** `c:\Users\Moffat\Desktop\Zimcrowd-Web-1\.env`

**Line 75:**
```bash
ADMIN_API_KEY=zimcrowd-admin-2025-secure-key-xyz789
```

---

### **2. In Your Code**

**Backend (routes/admin-dashboard.js):**
```javascript
const apiKey = req.headers['x-admin-key'];

if (apiKey === process.env.ADMIN_API_KEY || apiKey === 'admin-dev-key-123') {
    // Authenticated
}
```

**Frontend (public/admin-dashboard.html):**
```javascript
const ADMIN_KEY = 'zimcrowd-admin-2025-secure-key-xyz789';

fetch('/api/admin-dashboard/overview', {
    headers: {
        'X-Admin-Key': ADMIN_KEY
    }
});
```

---

## 🔐 **Current API Keys:**

### **Development/Local:**
```
Key: zimcrowd-admin-2025-secure-key-xyz789
Location: .env file (line 75)
Used in: admin-dashboard.html
```

### **Fallback (for testing):**
```
Key: admin-dev-key-123
Location: routes/admin-dashboard.js (line 16)
Purpose: Development testing only
```

---

## 🚀 **How to Use:**

### **Option 1: Access Dashboard (Browser)**
1. Open: `http://localhost:3000/admin-dashboard.html`
2. API key is automatically included in requests
3. No manual entry needed

### **Option 2: API Calls (curl)**
```bash
curl -H "X-Admin-Key: zimcrowd-admin-2025-secure-key-xyz789" \
  http://localhost:3000/api/admin-dashboard/overview
```

### **Option 3: API Calls (JavaScript)**
```javascript
fetch('http://localhost:3000/api/admin-dashboard/overview', {
    headers: {
        'X-Admin-Key': 'zimcrowd-admin-2025-secure-key-xyz789'
    }
})
.then(res => res.json())
.then(data => console.log(data));
```

### **Option 4: API Calls (Postman)**
1. Create new request
2. Add header: `X-Admin-Key`
3. Value: `zimcrowd-admin-2025-secure-key-xyz789`
4. Send request

---

## 🔄 **How to Change the API Key:**

### **Step 1: Update .env file**
```bash
# Change this line in .env
ADMIN_API_KEY=your-new-secure-key-here
```

### **Step 2: Update admin-dashboard.html**
```javascript
// Change this line in admin-dashboard.html (line 307)
const ADMIN_KEY = 'your-new-secure-key-here';
```

### **Step 3: Restart server**
```bash
npm restart
```

---

## 🔒 **Security Best Practices:**

### **For Production:**

1. **Generate Strong Key:**
   ```bash
   # Use this command to generate a secure key
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Set in Vercel:**
   - Go to: https://vercel.com/jojola/zimcrowd-backend/settings/environment-variables
   - Add: `ADMIN_API_KEY=your-generated-key`
   - Redeploy

3. **Update Dashboard:**
   - For production, consider using environment-specific keys
   - Or implement proper login system

---

## 📝 **API Endpoints That Use This Key:**

All admin dashboard endpoints require the API key:

```
GET  /api/admin-dashboard/overview
GET  /api/admin-dashboard/users
GET  /api/admin-dashboard/loans
GET  /api/admin-dashboard/stats/users
GET  /api/admin-dashboard/stats/loans
GET  /api/admin-dashboard/stats/payments
GET  /api/admin-dashboard/activity/recent
```

---

## ⚠️ **Troubleshooting:**

### **401 Unauthorized Error:**
**Cause:** Wrong API key or missing header

**Solution:**
1. Check `.env` file has `ADMIN_API_KEY`
2. Verify key in `admin-dashboard.html` matches
3. Ensure header name is `X-Admin-Key` (case-sensitive)

### **Dashboard Shows "Failed to load data":**
**Cause:** API key mismatch

**Solution:**
1. Open browser console (F12)
2. Check for 401 errors
3. Verify API key in both files match
4. Restart server after changing `.env`

---

## 🎯 **Quick Test:**

Test if your API key works:

```bash
# Should return dashboard data
curl -H "X-Admin-Key: zimcrowd-admin-2025-secure-key-xyz789" \
  http://localhost:3000/api/admin-dashboard/overview

# Should return 401 Unauthorized
curl -H "X-Admin-Key: wrong-key" \
  http://localhost:3000/api/admin-dashboard/overview
```

---

## 📌 **Summary:**

**Your Admin API Key:**
```
zimcrowd-admin-2025-secure-key-xyz789
```

**Where it's used:**
- ✅ `.env` file (line 75)
- ✅ `admin-dashboard.html` (line 307)
- ✅ `admin-dashboard.js` (checks this key)

**How to access:**
- 🌐 Open: `http://localhost:3000/admin-dashboard.html`
- 🔑 Key is automatically included
- ✅ Dashboard loads with real data

---

**Status:** ✅ **CONFIGURED AND READY**

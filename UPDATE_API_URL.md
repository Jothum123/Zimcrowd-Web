# 🔄 API URL UPDATE GUIDE

## ✅ WHAT'S BEEN UPDATED

### **1. Created Centralized Config** ✅
- **File:** `js/config.js`
- **Production URL:** `https://zimcrowd-api.onrender.com`
- **Development URL:** `http://localhost:3001`
- **Auto-detection:** Switches based on hostname

### **2. Updated Test Page** ✅
- **File:** `public/test-ocr.html`
- Now auto-detects environment
- Uses Render URL in production
- Uses localhost in development

---

## 🎯 HOW TO USE THE CONFIG

### **In Your HTML Files:**

```html
<!-- Add this before your script -->
<script src="js/config.js"></script>

<script>
    // Use the config
    const apiUrl = CONFIG.API_BASE_URL;
    
    // Or use helper
    const loginUrl = CONFIG.getUrl(CONFIG.ENDPOINTS.AUTH.LOGIN);
    
    // Make API call
    fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
</script>
```

---

## 📝 MANUAL UPDATE FOR EXISTING FILES

If you want to update existing HTML files manually, replace:

### **Old:**
```javascript
const API_BASE_URL = 'http://localhost:3001';
```

### **New (Auto-detect):**
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'  // Local development
    : 'https://zimcrowd-api.onrender.com';  // Production
```

### **Or (Use Config):**
```html
<script src="js/config.js"></script>
<script>
    const API_BASE_URL = CONFIG.API_BASE_URL;
</script>
```

---

## 🔍 FILES THAT NEED UPDATING

Based on grep search, these files have `API_BASE_URL`:

1. ✅ `public/test-ocr.html` - **UPDATED**
2. ⚠️ `admin-dashboard-real.html` - Needs update
3. ⚠️ `dashboard-real.html` - Needs update
4. ⚠️ `dashboard.html` - Needs update
5. ⚠️ `direct-loan-request.html` - Needs update
6. ⚠️ `kairo-ai-real.html` - Needs update
7. ⚠️ `login.html` - Needs update
8. ⚠️ `js/p2p-primary-market.js` - Needs update
9. ⚠️ `js/p2p-secondary-market.js` - Needs update
10. ⚠️ `ADMIN_DASHBOARD_ENHANCEMENTS.js` - Needs update

---

## 🚀 QUICK UPDATE SCRIPT

### **Option 1: Use Config File (Recommended)**

Add to the `<head>` of each HTML file:
```html
<script src="js/config.js"></script>
```

Then in your scripts, replace:
```javascript
const API_BASE_URL = 'http://localhost:3001';
```

With:
```javascript
const API_BASE_URL = CONFIG.API_BASE_URL;
```

---

### **Option 2: Auto-Detect (No Config File)**

Replace:
```javascript
const API_BASE_URL = 'http://localhost:3001';
```

With:
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://zimcrowd-api.onrender.com';
```

---

## 🎯 RECOMMENDED APPROACH

### **For New Files:**
Use `js/config.js` - it's centralized and easy to maintain

### **For Existing Files:**
1. Add `<script src="js/config.js"></script>` to head
2. Replace `API_BASE_URL` declarations with `CONFIG.API_BASE_URL`
3. Test locally
4. Deploy

---

## ✅ BENEFITS OF CONFIG FILE

1. **Single Source of Truth** - Change once, affects all files
2. **Environment Detection** - Auto-switches based on hostname
3. **Easy Switching** - `CONFIG.setEnvironment('production')`
4. **All Endpoints** - Centralized endpoint definitions
5. **Type Safety** - Consistent endpoint names

---

## 🧪 TESTING

### **Local Development:**
```
http://localhost:3000/test-ocr.html
→ Uses: http://localhost:3001
```

### **Production (Vercel):**
```
https://zimcrowd-backend-*.vercel.app/test-ocr.html
→ Uses: https://zimcrowd-api.onrender.com
```

---

## 📊 CURRENT STATUS

✅ **Config file created:** `js/config.js`
✅ **Test page updated:** `public/test-ocr.html`
✅ **Production URL set:** `https://zimcrowd-api.onrender.com`
✅ **Auto-detection enabled**
⚠️ **Other HTML files:** Need manual update (optional)

---

## 🎯 NEXT STEPS

1. **Test OCR page:**
   ```bash
   npm run api:dev
   # Visit: http://localhost:3001/test-ocr.html
   ```

2. **Update other files** (optional):
   - Use find & replace in your IDE
   - Or add config.js to each file

3. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

4. **Test production:**
   ```
   https://your-vercel-url/test-ocr.html
   ```

---

## 💡 PRO TIP

You can manually switch environments in browser console:

```javascript
// Switch to development
CONFIG.setEnvironment('development');

// Switch to production
CONFIG.setEnvironment('production');

// Check current URL
console.log(CONFIG.API_BASE_URL);
```

---

## ✅ SUMMARY

**What Changed:**
- ✅ Created `js/config.js` with production URL
- ✅ Updated `public/test-ocr.html` to auto-detect
- ✅ Production URL: `https://zimcrowd-api.onrender.com`
- ✅ Development URL: `http://localhost:3001`

**What's Next:**
- Update other HTML files (optional)
- Test locally
- Deploy to Vercel
- Test production

**Your OCR test page is ready for production!** 🎉

# PayNow Configuration Files

## 🔐 Security Setup

This directory contains two versions of the PayNow configuration:

### **1. `paynow-config.js` (Local Only - NOT in Git)**
- Contains hardcoded fallback values for local development
- **NEVER commit this file to Git**
- Already added to `.gitignore`
- Use this for your local development

### **2. `paynow-config.secure.js` (Safe for Git)**
- Contains NO hardcoded credentials
- Requires all values from environment variables
- Safe to commit to public repositories
- Use this in production

---

## 🚀 Usage

### **For Local Development:**
Keep using `paynow-config.js` as-is. It will work with your `.env` file.

### **For Production/Git:**
When deploying or sharing code:

1. **Rename the secure version:**
   ```bash
   cp config/paynow-config.secure.js config/paynow-config.js
   ```

2. **Ensure environment variables are set:**
   ```bash
   EXPO_PUBLIC_PAYNOW_USD_INTEGRATION_ID=your_id
   EXPO_PUBLIC_PAYNOW_USD_INTEGRATION_KEY=your_key
   EXPO_PUBLIC_PAYNOW_ZWG_INTEGRATION_ID=your_id
   EXPO_PUBLIC_PAYNOW_ZWG_INTEGRATION_KEY=your_key
   EXPO_PUBLIC_PAYNOW_RESULT_URL=your_url
   EXPO_PUBLIC_PAYNOW_RETURN_URL=your_url
   ```

3. **The app will throw clear errors if credentials are missing**

---

## ⚠️ Important Notes

- **`paynow-config.js`** is in `.gitignore` - it won't be committed
- **`paynow-config.secure.js`** is the version that gets committed
- Both files have the same functionality
- The secure version just has better error messages when credentials are missing

---

## 🔄 Switching Between Versions

### **Use Local Version (with fallbacks):**
```bash
# Already set up - no action needed
```

### **Use Secure Version (no fallbacks):**
```bash
# Backup your local version
cp config/paynow-config.js config/paynow-config.local.js

# Use secure version
cp config/paynow-config.secure.js config/paynow-config.js
```

### **Restore Local Version:**
```bash
cp config/paynow-config.local.js config/paynow-config.js
```

---

## ✅ Security Checklist

- [x] `paynow-config.js` added to `.gitignore`
- [x] `paynow-config.secure.js` has no hardcoded credentials
- [x] `.env` file is in `.gitignore`
- [x] Production uses environment variables only
- [x] Clear error messages when credentials missing

**Status: ✅ SECURE - Safe to commit `paynow-config.secure.js`**

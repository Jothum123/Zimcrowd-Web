# 🚀 Production Setup for ZimCrowd.com

Your site is LIVE at: **https://www.zimcrowd.com/** ✅

But your backend is still on `localhost:5003` ❌

**Let's fix this in 3 steps!**

---

## Step 1: Deploy Backend to Vercel (5 minutes)

### Install Vercel CLI
```bash
npm install -g vercel
```

### Login to Vercel
```bash
vercel login
```

### Deploy Your Backend
```bash
cd c:\Users\Moffat\Documents\Zimcrowd-Web
vercel --prod
```

**Answer the prompts:**
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **zimcrowd-backend**
- Directory? **./** (just press Enter)
- Override settings? **N**

### You'll Get a URL Like:
```
✅ Production: https://zimcrowd-backend.vercel.app
```

**SAVE THIS URL!** You'll need it for Step 2.

---

## Step 2: Add Environment Variables to Vercel

Go to: [https://vercel.com/dashboard](https://vercel.com/dashboard)

1. Click your **zimcrowd-backend** project
2. Go to **Settings** → **Environment Variables**
3. Add these variables:

### Required Environment Variables:

| Variable Name | Value | Where to Get It |
|---------------|-------|-----------------|
| `SUPABASE_URL` | `https://gjtkdrrvnffrmzigdqyp.supabase.co` | From your `.env` file |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` | From your `.env` file (line 13) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | From your `.env` file (line 14) |
| `JWT_SECRET` | `hMJW3vnx...` | From your `.env` file (line 17) |
| `FRONTEND_URL` | `https://www.zimcrowd.com` | Your live site URL |
| `NODE_ENV` | `production` | Literal value |
| `PORT` | `3000` | Vercel uses 3000 by default |

### How to Add Each Variable:
1. Click "Add New" → "Environment Variable"
2. Enter **Name** (e.g., `SUPABASE_URL`)
3. Enter **Value** (copy from your `.env` file)
4. Select **Production** environment
5. Click "Save"
6. Repeat for all variables

### After Adding All Variables:
Click **"Redeploy"** to apply the environment variables.

---

## Step 3: Update Your Live Site with Backend URL

### Create a Config File (Best Practice)

Create this file to manage API URLs:

**File: `js/api-config.js`**
```javascript
// API Configuration
const API_CONFIG = {
  // Use Vercel backend for production, localhost for development
  BASE_URL: window.location.hostname === 'localhost' 
    ? 'http://localhost:5003'
    : 'https://zimcrowd-backend.vercel.app',  // ⚠️ UPDATE with your Vercel URL
  
  get ENDPOINTS() {
    return {
      HEALTH: `${this.BASE_URL}/api/health`,
      REGISTER: `${this.BASE_URL}/api/auth/register`,
      LOGIN: `${this.BASE_URL}/api/auth/login`,
      FORGOT_PASSWORD: `${this.BASE_URL}/api/auth/forgot-password`,
      VERIFY_OTP: `${this.BASE_URL}/api/auth/verify-otp`,
      RESET_PASSWORD: `${this.BASE_URL}/api/auth/reset-password`,
      RESEND_OTP: `${this.BASE_URL}/api/auth/resend-otp`,
    };
  }
};

// Make it globally available
window.API_CONFIG = API_CONFIG;
```

### Update Each HTML File

**In these files:**
- `login.html`
- `signup.html`
- `forgot-password.html`
- `verify-otp.html`
- `reset-password.html`
- `api-test.html`

**Add this script tag in the `<head>` section:**
```html
<script src="js/api-config.js"></script>
```

**Find and replace API URLs:**

**OLD CODE (example from signup.html):**
```javascript
const response = await fetch('http://localhost:5003/api/auth/register', {
```

**NEW CODE:**
```javascript
const response = await fetch(API_CONFIG.ENDPOINTS.REGISTER, {
```

**Repeat for all API endpoints in all files.**

---

## Step 4: Update Supabase Settings

Go to: [Supabase Dashboard](https://supabase.com/dashboard/project/gjtkdrrvnffrmzigdqyp/settings/auth)

### Update Site URL:
```
https://www.zimcrowd.com
```

### Add Redirect URLs:
```
https://www.zimcrowd.com/**
https://zimcrowd-backend.vercel.app/**
```

---

## Step 5: Push Changes to GitHub

```bash
cd c:\Users\Moffat\Documents\Zimcrowd-Web

# Add all changes
git add .

# Commit
git commit -m "Update API URLs for production backend"

# Push to GitHub
git push origin main
```

**✅ Your live site will auto-update with the changes!**

---

## Step 6: Test Your Live Site

### Test Registration:
1. Go to: https://www.zimcrowd.com/signup.html
2. Fill in the form with a **real email**
3. Submit
4. ✅ Should see success message
5. Check email for verification

### Test Login:
1. Go to: https://www.zimcrowd.com/login.html
2. Use registered credentials
3. ✅ Should redirect to dashboard

### Check API Connection:
1. Open browser console (F12)
2. Go to Network tab
3. Try to register/login
4. Check that API calls go to `zimcrowd-backend.vercel.app`, NOT `localhost`

---

## 🎯 Quick Reference

### Your URLs:
| Component | URL |
|-----------|-----|
| **Live Site** | https://www.zimcrowd.com |
| **Backend API** | https://zimcrowd-backend.vercel.app |
| **Database** | Supabase (already hosted) |

### API Endpoints:
- Health: `https://zimcrowd-backend.vercel.app/api/health`
- Register: `https://zimcrowd-backend.vercel.app/api/auth/register`
- Login: `https://zimcrowd-backend.vercel.app/api/auth/login`

---

## 🆘 Troubleshooting

### "Network error" still appearing:
1. Check browser console for actual error
2. Verify backend is deployed: Visit `https://your-backend.vercel.app/api/health`
3. Check HTML files are using `API_CONFIG.ENDPOINTS`
4. Clear browser cache

### "CORS error":
1. Verify `FRONTEND_URL` in Vercel env variables is `https://www.zimcrowd.com`
2. Check backend CORS settings allow your domain
3. Redeploy backend after changing env variables

### "Authentication failed":
1. Verify all Supabase env variables are correct on Vercel
2. Check Supabase redirect URLs include your live domain
3. Test API directly with curl/Postman

---

## ✅ Checklist

- [ ] Deploy backend to Vercel: `vercel --prod`
- [ ] Add environment variables on Vercel dashboard
- [ ] Create `js/api-config.js` file
- [ ] Update all HTML files to use `API_CONFIG`
- [ ] Update Supabase site URL and redirects
- [ ] Push changes to GitHub
- [ ] Test registration on live site
- [ ] Test login on live site
- [ ] Verify no "Network error" messages

---

## 🎉 When Complete

Your full production stack will be:

```
User → https://www.zimcrowd.com (GitHub Pages/Netlify)
         ↓ API Calls
     https://zimcrowd-backend.vercel.app (Vercel)
         ↓ Database
     Supabase PostgreSQL (Hosted)
```

**No localhost, all production-ready!** 🚀

---

**Start with Step 1 now:** `vercel --prod` 

Let me know when you have your Vercel backend URL and I'll help update the frontend! 🎯

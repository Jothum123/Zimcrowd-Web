# 🚀 Deploy Backend to Vercel (5 Minutes)

## Why You Need This
Your live site on GitHub is trying to connect to `http://localhost:5003` which only exists on your computer. We need to put your backend on the internet!

---

## Quick Deploy Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```
Choose your preferred login method (GitHub recommended)

### 3. Deploy Your Backend
```bash
cd c:\Users\Moffat\Documents\Zimcrowd-Web
vercel --prod
```

**Answer the prompts:**
- Set up and deploy? **Y**
- Which scope? **Your account**
- Link to existing project? **N**
- Project name? **zimcrowd-api** (or your choice)
- Directory? **./backend-server.js**
- Override settings? **N**

### 4. Copy Your Backend URL
After deployment, you'll get a URL like:
```
https://zimcrowd-api.vercel.app
```

**✅ Save this URL!**

---

## Update Frontend to Use Deployed Backend

### Option A: Update All HTML Files (Manual)

Replace `http://localhost:5003` with your Vercel URL in these files:
- `login.html`
- `signup.html`
- `forgot-password.html`
- `verify-otp.html`
- `reset-password.html`
- `api-test.html`

**Find:**
```javascript
const response = await fetch('http://localhost:5003/api/auth/register', {
```

**Replace with:**
```javascript
const response = await fetch('https://zimcrowd-api.vercel.app/api/auth/register', {
```

### Option B: Create Config File (Better)

Create `js/config.js`:
```javascript
// Auto-detect environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5003'
  : 'https://zimcrowd-api.vercel.app';

export const API_CONFIG = {
  BASE_URL: API_URL,
  ENDPOINTS: {
    REGISTER: `${API_URL}/api/auth/register`,
    LOGIN: `${API_URL}/api/auth/login`,
    FORGOT_PASSWORD: `${API_URL}/api/auth/forgot-password`,
    VERIFY_OTP: `${API_URL}/api/auth/verify-otp`,
    RESET_PASSWORD: `${API_URL}/api/auth/reset-password`,
  }
};
```

Then in your HTML files:
```javascript
import { API_CONFIG } from './js/config.js';

// Use it
const response = await fetch(API_CONFIG.ENDPOINTS.REGISTER, {
  method: 'POST',
  // ...
});
```

---

## Set Environment Variables on Vercel

### Via Vercel Dashboard:
1. Go to your project: https://vercel.com/dashboard
2. Click your project → Settings → Environment Variables
3. Add these:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://gjtkdrrvnffrmzigdqyp.supabase.co` |
| `SUPABASE_ANON_KEY` | Your anon key from `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key from `.env` |
| `JWT_SECRET` | Your JWT secret from `.env` |
| `FRONTEND_URL` | Your GitHub Pages URL |
| `NODE_ENV` | `production` |

### Via CLI:
```bash
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add JWT_SECRET production
vercel env add FRONTEND_URL production
vercel env add NODE_ENV production
```

---

## Update Supabase Settings

Go to Supabase Dashboard → Authentication → Settings:
- **Site URL:** Your GitHub Pages URL
- **Redirect URLs:** Add both:
  - Your GitHub Pages URL
  - Your Vercel backend URL

---

## Push Changes to GitHub

After updating your HTML files:
```bash
git add .
git commit -m "Update API URLs for production"
git push origin main
```

**✅ Your live site will auto-update!**

---

## Test Your Deployment

1. Visit your live site (GitHub Pages)
2. Try to register/login
3. Check browser console (F12) for errors
4. Verify API calls go to Vercel, not localhost

---

## 🎉 Complete Flow

```
User Browser
    ↓
GitHub Pages (Frontend)
    ↓ API Calls
Vercel (Backend API)
    ↓ Database Queries
Supabase (Database)
```

**All hosted, no localhost needed!** 🚀

---

## Troubleshooting

### "Still getting network errors"
- Check browser console for actual error
- Verify Vercel backend is running
- Check CORS settings in backend

### "API calls return 404"
- Verify routes in `vercel.json`
- Check backend URL is correct
- Test backend directly: `https://your-api.vercel.app/api/health`

### "Database errors"
- Verify environment variables on Vercel
- Check Supabase credentials
- Ensure RLS policies are correct

---

## Alternative: Use Netlify Functions Instead

If you prefer keeping everything on Netlify, I can convert your Express backend to Netlify Functions. Let me know!

---

**Run this now to deploy:**
```bash
vercel --prod
```

Then update your HTML files with the new backend URL! 🎯

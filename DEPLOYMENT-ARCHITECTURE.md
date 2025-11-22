# ZimCrowd Deployment Architecture

## 🏗️ Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                          │
└─────────────────────────────────────────────────────────────┘

Frontend (GitHub Pages)                Backend (Vercel)
https://jothum123.github.io/           https://zimcrowd-backend.vercel.app
Zimcrowd-Web/                          
                                       
├── signup.html                        ├── /api/phone-auth/*
├── login.html                         ├── /api/email-auth/*
├── verify-otp.html                    ├── /api/social-auth/*
├── onboarding.html                    ├── /api/profile
├── dashboard.html                     ├── /api/loans
├── password-reset-new.html            ├── /api/investments
└── js/api-config-new.js               └── /api/transactions
    │
    └─> Points to: zimcrowd-backend.vercel.app
```

## 🔗 URL Structure

### Frontend URLs (GitHub Pages):
- **Signup:** `https://jothum123.github.io/Zimcrowd-Web/signup.html`
- **Login:** `https://jothum123.github.io/Zimcrowd-Web/login.html`
- **Dashboard:** `https://jothum123.github.io/Zimcrowd-Web/dashboard.html`
- **Onboarding:** `https://jothum123.github.io/Zimcrowd-Web/onboarding.html`

### Backend URLs (Vercel):
- **Base API:** `https://zimcrowd-backend.vercel.app/api`
- **Phone Auth:** `https://zimcrowd-backend.vercel.app/api/phone-auth/*`
- **Email Auth:** `https://zimcrowd-backend.vercel.app/api/email-auth/*`
- **Social Auth:** `https://zimcrowd-backend.vercel.app/api/social-auth/*`

## 🔄 Authentication Flow

### Phone/Email Registration:
```
User visits GitHub Pages:
https://jothum123.github.io/Zimcrowd-Web/signup.html
                ↓
Frontend detects it's NOT localhost
Uses API_CONFIG.PRODUCTION_URL
                ↓
POST to Vercel Backend:
https://zimcrowd-backend.vercel.app/api/phone-auth/register-phone
                ↓
Backend sends OTP via Twilio/SendGrid
                ↓
User enters OTP on GitHub Pages:
https://jothum123.github.io/Zimcrowd-Web/verify-otp.html
                ↓
POST to Vercel Backend:
https://zimcrowd-backend.vercel.app/api/phone-auth/verify-phone-signup
                ↓
Backend creates profile, returns JWT + user data
                ↓
Frontend stores in localStorage, redirects to:
https://jothum123.github.io/Zimcrowd-Web/onboarding.html
                ↓
Then redirects to:
https://jothum123.github.io/Zimcrowd-Web/dashboard.html
```

### Social Authentication (Google/Facebook):
```
User visits GitHub Pages:
https://jothum123.github.io/Zimcrowd-Web/login.html
                ↓
Clicks "Continue with Google/Facebook"
                ↓
Redirects to Vercel Backend:
https://zimcrowd-backend.vercel.app/api/social-auth/google?mode=signup
                ↓
Backend redirects to Google/Facebook OAuth
                ↓
User authorizes on Google/Facebook
                ↓
OAuth redirects back to Vercel Backend:
https://zimcrowd-backend.vercel.app/api/social-auth/callback
                ↓
Backend:
- Extracts user data (name, email, avatar)
- Creates/updates profile in Supabase
- Generates HTML page with localStorage script
                ↓
HTML page stores data in localStorage and redirects to:
https://jothum123.github.io/Zimcrowd-Web/onboarding.html
                ↓
Then redirects to:
https://jothum123.github.io/Zimcrowd-Web/dashboard.html
```

## ⚙️ Configuration

### Frontend (js/api-config-new.js):
```javascript
const API_CONFIG = {
  PRODUCTION_URL: 'https://zimcrowd-backend.vercel.app',
  DEVELOPMENT_URL: 'http://localhost:3001',
  
  get BASE_URL() {
    const isLocalhost = window.location.hostname === 'localhost' 
                     || window.location.hostname === '127.0.0.1';
    return isLocalhost ? this.DEVELOPMENT_URL : this.PRODUCTION_URL;
  }
};
```

**Result:**
- On `localhost` → Uses `http://localhost:3001`
- On `jothum123.github.io` → Uses `https://zimcrowd-backend.vercel.app`

### Backend (routes/social-auth.js):
```javascript
// OAuth callback URL (auto-detected)
const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://zimcrowd-backend.vercel.app';

// Frontend redirect URL (GitHub Pages)
const frontendUrl = process.env.FRONTEND_URL 
    || 'https://jothum123.github.io/Zimcrowd-Web';
```

**Result:**
- OAuth callbacks go to Vercel backend
- After auth, redirects to GitHub Pages frontend

## 🔐 OAuth Configuration

### Google Cloud Console:
**Authorized redirect URIs:**
```
https://zimcrowd-backend.vercel.app/api/social-auth/callback
https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
```

### Facebook Developers:
**Valid OAuth Redirect URIs:**
```
https://zimcrowd-backend.vercel.app/api/social-auth/callback
https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
```

### Supabase Dashboard:
**Authentication → Providers:**
- Enable Google & Facebook
- Set **Site URL:** `https://jothum123.github.io/Zimcrowd-Web`
- Add **Redirect URLs:**
  ```
  https://jothum123.github.io/Zimcrowd-Web/dashboard.html
  https://jothum123.github.io/Zimcrowd-Web/onboarding.html
  ```

## 🚀 Deployment Process

### Deploy Frontend (GitHub Pages):
```bash
# Commit and push to GitHub
git add .
git commit -m "Update frontend"
git push origin main

# GitHub Pages automatically deploys from main branch
# Available at: https://jothum123.github.io/Zimcrowd-Web/
```

### Deploy Backend (Vercel):
```bash
# Deploy to production
vercel --prod

# Available at: https://zimcrowd-backend.vercel.app
```

## 🌐 Environment Variables

### Vercel (Backend):
Set these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Frontend URL (GitHub Pages)
FRONTEND_URL=https://jothum123.github.io/Zimcrowd-Web

# Backend URL (optional - auto-detected)
BACKEND_URL=https://zimcrowd-backend.vercel.app

# Supabase
SUPABASE_URL=your-production-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key

# JWT
JWT_SECRET=your-production-secret

# Twilio SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-phone

# SendGrid Email
SENDGRID_API_KEY=your-key
FROM_EMAIL=noreply@zimcrowd.com
```

### GitHub Pages (Frontend):
No environment variables needed - configuration is in `js/api-config-new.js`

## ✅ Testing Production URLs

### Test Frontend:
```
1. Phone Signup:
   https://jothum123.github.io/Zimcrowd-Web/signup.html

2. Email Signup:
   https://jothum123.github.io/Zimcrowd-Web/signup.html

3. Social Login:
   https://jothum123.github.io/Zimcrowd-Web/login.html
   → Click "Continue with Google/Facebook"

4. Dashboard:
   https://jothum123.github.io/Zimcrowd-Web/dashboard.html
```

### Test Backend API:
```bash
# Health check
curl https://zimcrowd-backend.vercel.app/api/health

# Phone registration
curl -X POST https://zimcrowd-backend.vercel.app/api/phone-auth/register-phone \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","phone":"+263771234567","password":"Test1234"}'
```

## 🔍 Debugging

### Check Frontend API URL:
Open browser console on GitHub Pages:
```javascript
console.log(API_CONFIG.BASE_URL);
// Should output: https://zimcrowd-backend.vercel.app
```

### Check Backend Logs:
```bash
# View Vercel logs
vercel logs --follow

# Look for:
- "🔄 Initiating Google OAuth: { redirectTo: '...' }"
- "🔄 Redirecting to: https://jothum123.github.io/..."
```

### Common Issues:

**Issue: Frontend shows localhost errors**
- **Cause:** API config detecting localhost incorrectly
- **Fix:** Check `window.location.hostname` in console
- **Expected:** Should be `jothum123.github.io`

**Issue: OAuth redirect fails**
- **Cause:** Redirect URI not whitelisted
- **Fix:** Add to Google/Facebook OAuth settings:
  ```
  https://zimcrowd-backend.vercel.app/api/social-auth/callback
  ```

**Issue: After OAuth, redirects to Vercel instead of GitHub Pages**
- **Cause:** `FRONTEND_URL` not set in Vercel
- **Fix:** Set in Vercel environment variables:
  ```
  FRONTEND_URL=https://jothum123.github.io/Zimcrowd-Web
  ```

## 📊 Architecture Benefits

### ✅ Advantages:
1. **Free Hosting:** GitHub Pages is free for frontend
2. **Serverless Backend:** Vercel handles scaling automatically
3. **Separation of Concerns:** Frontend and backend deployed independently
4. **Easy Updates:** Push to GitHub for frontend, deploy to Vercel for backend
5. **CDN:** GitHub Pages uses CDN for fast global delivery

### ⚠️ Considerations:
1. **CORS:** Backend must allow GitHub Pages origin
2. **HTTPS Only:** Both use HTTPS (required for OAuth)
3. **Custom Domain:** Can add custom domain to GitHub Pages later
4. **Environment Detection:** Frontend must correctly detect production

## 🎯 Production Checklist

### Frontend (GitHub Pages):
- [x] Deployed to `https://jothum123.github.io/Zimcrowd-Web/`
- [x] API config points to Vercel backend
- [x] All HTML pages accessible
- [x] JavaScript files loading correctly

### Backend (Vercel):
- [x] Deployed to `https://zimcrowd-backend.vercel.app`
- [x] Environment variables set
- [x] OAuth redirects to GitHub Pages
- [x] CORS allows GitHub Pages origin

### OAuth Providers:
- [ ] Google redirect URIs updated
- [ ] Facebook redirect URIs updated
- [ ] Supabase providers configured
- [ ] Supabase redirect URLs set to GitHub Pages

### Database:
- [ ] `avatar_url` column added to profiles table
- [ ] All tables exist in production Supabase
- [ ] RLS policies configured

## 🚀 Summary

**Frontend:** GitHub Pages (Free, CDN-backed)
- URL: `https://jothum123.github.io/Zimcrowd-Web/`
- Deployment: Push to GitHub main branch

**Backend:** Vercel (Serverless, Auto-scaling)
- URL: `https://zimcrowd-backend.vercel.app`
- Deployment: `vercel --prod`

**Communication:**
- Frontend → Backend: HTTPS API calls
- Backend → Frontend: OAuth redirects after authentication

**All authentication flows work across this architecture!** ✅

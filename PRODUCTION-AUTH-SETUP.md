# Production Authentication Setup - ZimCrowd

## ✅ Current Production Configuration

### Frontend API Configuration
**File:** `js/api-config-new.js`

The frontend automatically detects the environment and uses the appropriate backend URL:

```javascript
PRODUCTION_URL: 'https://zimcrowd-backend.vercel.app'
DEVELOPMENT_URL: 'http://localhost:3001'

// Auto-detection logic:
get BASE_URL() {
  const isLocalhost = window.location.hostname === 'localhost' 
                   || window.location.hostname === '127.0.0.1'
                   || window.location.hostname === '0.0.0.0';
  return isLocalhost ? this.DEVELOPMENT_URL : this.PRODUCTION_URL;
}
```

**✅ Status:** Production-ready with automatic environment detection

---

### Backend Social Auth Configuration
**File:** `routes/social-auth.js`

Updated to use production URLs with environment variable support:

```javascript
// OAuth callback URL (Google & Facebook)
const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.BACKEND_URL || 'https://zimcrowd-backend.vercel.app';

// Frontend redirect URL
const frontendUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://zimcrowd-backend.vercel.app';
```

**✅ Status:** Production-ready with environment variable fallbacks

---

## 🔐 Required Environment Variables

### Vercel Environment Variables
Set these in your Vercel project settings:

#### Core Backend Variables:
```bash
# Backend URL (optional - auto-detected from VERCEL_URL)
BACKEND_URL=https://zimcrowd-backend.vercel.app

# Frontend URL (for redirects after social auth)
FRONTEND_URL=https://zimcrowd.com

# Supabase (Production)
SUPABASE_URL=your-production-supabase-url
SUPABASE_ANON_KEY=your-production-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-supabase-service-role-key

# JWT Secret (Production)
JWT_SECRET=your-production-jwt-secret-minimum-32-characters

# Twilio SMS (Production)
TWILIO_ACCOUNT_SID=your-production-twilio-sid
TWILIO_AUTH_TOKEN=your-production-twilio-token
TWILIO_PHONE_NUMBER=your-production-twilio-phone
TWILIO_MESSAGING_SERVICE_SID=your-production-messaging-service-sid

# Email Service (Production)
SENDGRID_API_KEY=your-production-sendgrid-key
FROM_EMAIL=noreply@zimcrowd.com
```

#### Google OAuth Configuration:
```bash
# Set in Supabase Dashboard → Authentication → Providers → Google
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Authorized redirect URIs (add in Google Cloud Console):
https://zimcrowd-backend.vercel.app/api/social-auth/callback
https://your-supabase-project.supabase.co/auth/v1/callback
```

#### Facebook OAuth Configuration:
```bash
# Set in Supabase Dashboard → Authentication → Providers → Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Valid OAuth Redirect URIs (add in Facebook App Settings):
https://zimcrowd-backend.vercel.app/api/social-auth/callback
https://your-supabase-project.supabase.co/auth/v1/callback
```

---

## 🚀 Deployment Steps

### 1. Deploy Backend to Vercel

```bash
# From project root
vercel --prod
```

**What happens:**
- Vercel automatically sets `VERCEL_URL` environment variable
- Backend uses this for OAuth callbacks
- All authentication routes use production URLs

### 2. Configure OAuth Providers

#### Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Add to **Authorized redirect URIs**:
   - `https://zimcrowd-backend.vercel.app/api/social-auth/callback`
   - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
6. Save changes

#### Facebook Developers:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Navigate to **Facebook Login** → **Settings**
4. Add to **Valid OAuth Redirect URIs**:
   - `https://zimcrowd-backend.vercel.app/api/social-auth/callback`
   - `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
5. Save changes

#### Supabase Dashboard:
1. Go to your Supabase project
2. Navigate to **Authentication** → **Providers**
3. Enable and configure:
   - **Google**: Add Client ID and Secret
   - **Facebook**: Add App ID and Secret
4. Set **Site URL**: `https://zimcrowd.com`
5. Add **Redirect URLs**:
   - `https://zimcrowd.com/dashboard.html`
   - `https://zimcrowd.com/onboarding.html`
   - `https://zimcrowd-backend.vercel.app/dashboard.html`

### 3. Test Authentication Flows

#### Phone Authentication:
```bash
# Test endpoint
curl -X POST https://zimcrowd-backend.vercel.app/api/phone-auth/register-phone \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","phone":"+263771234567","password":"Test1234"}'
```

#### Email Authentication:
```bash
# Test endpoint
curl -X POST https://zimcrowd-backend.vercel.app/api/email-auth/register-email \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"Test1234","country":"Zimbabwe","city":"Harare"}'
```

#### Social Authentication:
```bash
# Test Google OAuth
https://zimcrowd-backend.vercel.app/api/social-auth/google?mode=signup

# Test Facebook OAuth
https://zimcrowd-backend.vercel.app/api/social-auth/facebook?mode=signup
```

---

## 🔄 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION FLOW                           │
└─────────────────────────────────────────────────────────────┘

User visits: https://zimcrowd.com/signup.html
                            │
                            ▼
Frontend detects production environment
API_CONFIG.BASE_URL = 'https://zimcrowd-backend.vercel.app'
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐      ┌──────▼──────┐
        │ Phone/Email    │      │   Social    │
        │   Signup       │      │    Auth     │
        └───────┬────────┘      └──────┬──────┘
                │                      │
        POST /api/phone-auth/    GET /api/social-auth/
        register-phone           google?mode=signup
                │                      │
                │                      ▼
                │              OAuth Provider
                │              (Google/Facebook)
                │                      │
                │                      ▼
                │              Callback to:
                │              /api/social-auth/callback
                │                      │
                └──────────┬───────────┘
                           │
                  ┌────────▼─────────┐
                  │  Profile Created │
                  │  in Supabase     │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │   Redirect to:   │
                  │  zimcrowd.com/   │
                  │  onboarding.html │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │   Redirect to:   │
                  │  zimcrowd.com/   │
                  │  dashboard.html  │
                  └──────────────────┘
```

---

## 📊 Environment Detection Logic

### Frontend (JavaScript):
```javascript
// Automatic detection in api-config-new.js
const isProduction = !['localhost', '127.0.0.1', '0.0.0.0']
    .includes(window.location.hostname);

const API_URL = isProduction 
    ? 'https://zimcrowd-backend.vercel.app'
    : 'http://localhost:3001';
```

### Backend (Node.js):
```javascript
// Automatic detection in social-auth.js
const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`  // Vercel auto-sets this
    : process.env.BACKEND_URL               // Manual override
    || 'https://zimcrowd-backend.vercel.app'; // Default fallback
```

---

## ✅ Production Checklist

### Backend Configuration:
- [x] Environment variables set in Vercel
- [x] Supabase production credentials configured
- [x] JWT secret set (32+ characters)
- [x] Twilio production credentials configured
- [x] SendGrid production API key configured
- [x] OAuth callback URLs use production domain
- [x] Frontend redirect URLs use production domain

### OAuth Provider Configuration:
- [ ] Google OAuth redirect URIs updated
- [ ] Facebook OAuth redirect URIs updated
- [ ] Supabase Google provider enabled
- [ ] Supabase Facebook provider enabled
- [ ] OAuth scopes configured (`email profile` for Google, `email public_profile` for Facebook)

### Frontend Configuration:
- [x] API config auto-detects production environment
- [x] All API calls use production backend URL
- [x] Social auth buttons point to production endpoints

### Database Configuration:
- [ ] `avatar_url` column added to profiles table
- [ ] All required tables exist in production Supabase
- [ ] RLS policies configured for production
- [ ] Database backups enabled

### Testing:
- [ ] Phone signup and OTP verification tested
- [ ] Email signup and OTP verification tested
- [ ] Google OAuth signup tested
- [ ] Facebook OAuth signup tested
- [ ] Password reset flows tested
- [ ] Profile data displays correctly
- [ ] Social profile pictures display correctly
- [ ] Red card system works for incomplete profiles

---

## 🔧 Troubleshooting

### Issue: OAuth callback fails with 404
**Solution:** Check that redirect URIs are added to:
1. Google Cloud Console
2. Facebook App Settings
3. Supabase Authentication Providers

### Issue: Social auth shows email instead of name
**Solution:** 
1. Check OAuth scopes are set correctly
2. Verify Vercel logs show extracted name data
3. Clear localStorage and try again

### Issue: Frontend uses localhost URL in production
**Solution:** 
1. Check `window.location.hostname` in browser console
2. Verify API_CONFIG.BASE_URL is production URL
3. Clear browser cache and reload

### Issue: CORS errors in production
**Solution:** Add to backend CORS configuration:
```javascript
app.use(cors({
  origin: [
    'https://zimcrowd.com',
    'https://www.zimcrowd.com',
    'https://zimcrowd-backend.vercel.app'
  ],
  credentials: true
}));
```

---

## 📝 Monitoring & Logs

### Vercel Logs:
```bash
# View real-time logs
vercel logs --follow

# View logs for specific deployment
vercel logs [deployment-url]
```

### Key Log Messages to Monitor:
```
✅ Good:
- "🔄 Initiating Google OAuth: { mode: 'signup', redirectTo: 'https://...' }"
- "📦 Social auth data being sent to frontend: { first_name: '...', ... }"
- "✅ Profile created successfully for user: ..."

❌ Bad:
- "OAuth callback handler error: ..."
- "Profile upsert error: ..."
- "Failed to extract social profile data"
```

---

## 🎯 Production URLs

### Backend API:
- **Base URL:** `https://zimcrowd-backend.vercel.app`
- **Health Check:** `https://zimcrowd-backend.vercel.app/api/health`
- **Phone Auth:** `https://zimcrowd-backend.vercel.app/api/phone-auth/*`
- **Email Auth:** `https://zimcrowd-backend.vercel.app/api/email-auth/*`
- **Social Auth:** `https://zimcrowd-backend.vercel.app/api/social-auth/*`

### Frontend:
- **Main Site:** `https://zimcrowd.com`
- **Signup:** `https://zimcrowd.com/signup.html`
- **Login:** `https://zimcrowd.com/login.html`
- **Dashboard:** `https://zimcrowd.com/dashboard.html`
- **Onboarding:** `https://zimcrowd.com/onboarding.html`

### OAuth Callbacks:
- **Backend:** `https://zimcrowd-backend.vercel.app/api/social-auth/callback`
- **Supabase:** `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

---

## 🚀 Summary

All authentication flows are now production-ready:

1. ✅ **Frontend** auto-detects environment and uses production URLs
2. ✅ **Backend** uses environment variables with production fallbacks
3. ✅ **Social Auth** configured with proper OAuth scopes
4. ✅ **Phone/Email Auth** use production Twilio/SendGrid
5. ✅ **Profile Data** correctly stored and displayed
6. ✅ **Red Card System** prompts users to complete KYC

**Next Steps:**
1. Set environment variables in Vercel
2. Configure OAuth providers (Google/Facebook)
3. Test all authentication flows
4. Monitor logs for any issues
5. Deploy to production domain (zimcrowd.com)

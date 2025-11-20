# ZimCrowd User Registration & Onboarding Flow

## Complete User Journey

### 1. Account Creation (3 Methods)

#### A. Email Registration
1. User fills signup form with email
2. System sends OTP to email
3. User verifies OTP on `verify-otp.html`
4. ✅ **Redirects to `onboarding.html`**
5. User completes onboarding
6. ✅ **Redirects to `dashboard.html`**
7. Dashboard displays user's name from registration
8. Red card appears for profile completion

#### B. Phone Registration
1. User fills signup form with phone number
2. System sends SMS OTP via Twilio
3. User verifies OTP on `verify-otp.html`
4. ✅ **Redirects to `onboarding.html`**
5. User completes onboarding
6. ✅ **Redirects to `dashboard.html`**
7. Dashboard displays user's name from registration
8. Red card appears for profile completion

#### C. Social Authentication (Google/Facebook)
1. User clicks "Sign up with Google/Facebook"
2. Supabase handles OAuth flow
3. User authenticates with social provider
4. Returns to dashboard with OAuth callback
5. System detects new user (signup mode)
6. ✅ **Redirects to `onboarding.html`**
7. User completes onboarding
8. ✅ **Redirects to `dashboard.html`**
9. Dashboard displays user's name from social profile
10. Red card appears for profile completion

### 2. Onboarding Page (`onboarding.html`)

**Purpose:** Welcome new users and collect basic preferences

**Features:**
- Splash screen with ZimCrowd branding
- User type selection (Borrower/Lender/Both)
- Quick introduction to platform features
- Smooth animations and transitions

**Data Stored:**
- `onboardingCompleted`: 'true'
- `userType`: 'borrower'/'lender'/'both'
- Clears `newUser` flag

**Exit:** Always redirects to `dashboard.html`

### 3. Dashboard Display

**User Name Display:**
- Shows `first_name` from registration
- Falls back to `fullName` or `email` if first_name not available
- For social users: Uses name from Google/Facebook profile

**Profile Completion Red Card:**
- Appears if profile is incomplete
- Shows completion percentage
- Links to `post-registration.html`

### 4. Profile Completion (`post-registration.html`)

**Red Card System Triggers When:**
- `profileCompleted` !== 'true'
- Missing employment details
- Missing next of kin information
- Missing document uploads
- Missing profile picture

**Completion Steps:**
1. Personal Details (if not from social)
2. Employment Information
3. Next of Kin Details
4. Document Uploads (ID, Proof of Address, etc.)
5. Profile Picture

**After Completion:**
- Sets `profileCompleted`: 'true'
- Red card disappears from dashboard
- User has full access to all features

## Data Flow

### LocalStorage Keys Used:

**Authentication:**
- `authToken`: JWT token
- `userData`: User profile data
- `isAuthenticated`: 'true'/'false'
- `socialAuthData`: Social login data
- `socialSignupCompleted`: 'true' for social users

**Onboarding:**
- `newUser`: 'true' for first-time users
- `onboardingCompleted`: 'true' after onboarding
- `userType`: User's selected type

**Profile Completion:**
- `profileCompleted`: 'true'/'false'
- `documentsUploaded`: 'true'/'false'
- `employmentVerified`: 'true'/'false'
- `paymentSetup`: 'true'/'false'

**Verification:**
- `signupSuccess`: 'true' after successful signup
- `userEmail`: Registered email
- `userPhone`: Registered phone

## API Endpoints

### Email Auth:
- `POST /api/email-auth/register-email`
- `POST /api/email-auth/verify-email`

### Phone Auth:
- `POST /api/phone-auth/register-phone`
- `POST /api/phone-auth/verify-phone`

### Social Auth:
- Supabase OAuth (handled client-side)
- `POST /api/profile-completion/update-completion`

### Profile:
- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/upload-picture`

## User Experience Flow Chart

```
┌─────────────────┐
│  Signup Page    │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Method? │
    └────┬────┘
         │
    ┌────┴────────────────────┐
    │                         │
┌───▼────┐              ┌─────▼─────┐
│ Email/ │              │  Social   │
│ Phone  │              │  (OAuth)  │
└───┬────┘              └─────┬─────┘
    │                         │
┌───▼────────┐           ┌────▼─────┐
│ OTP Verify │           │ Callback │
└───┬────────┘           └────┬─────┘
    │                         │
    └────────┬────────────────┘
             │
      ┌──────▼──────┐
      │ Onboarding  │
      └──────┬──────┘
             │
      ┌──────▼──────┐
      │  Dashboard  │
      │ (Show Name) │
      └──────┬──────┘
             │
    ┌────────▼────────┐
    │ Profile         │
    │ Complete?       │
    └────┬────────────┘
         │
    ┌────┴────┐
    │   No    │
    │         │
┌───▼─────────────────┐
│ Red Card Appears    │
│ Click to Complete   │
└───┬─────────────────┘
    │
┌───▼──────────────────┐
│ Post-Registration    │
│ Complete Profile     │
└───┬──────────────────┘
    │
┌───▼──────────────────┐
│ Dashboard            │
│ Full Access          │
└──────────────────────┘
```

## Implementation Status

✅ Email/Phone signup → OTP → Onboarding → Dashboard
✅ Social signup → Onboarding → Dashboard  
✅ Dashboard displays user name from registration
✅ Red card system for profile completion
✅ Post-registration profile completion flow
✅ Proper logout clearing all auth data
✅ Supabase OAuth integration

## Testing Checklist

- [ ] Email signup → Verify OTP → Onboarding → Dashboard shows email
- [ ] Phone signup → Verify SMS → Onboarding → Dashboard shows phone
- [ ] Google signup → Onboarding → Dashboard shows Google name
- [ ] Facebook signup → Onboarding → Dashboard shows Facebook name
- [ ] Red card appears for incomplete profiles
- [ ] Red card disappears after profile completion
- [ ] Logout clears all data and prevents auto-login
- [ ] Returning users skip onboarding
- [ ] Profile completion persists across sessions

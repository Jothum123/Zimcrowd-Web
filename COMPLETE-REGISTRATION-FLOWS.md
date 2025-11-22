# Complete Registration Flows - ZimCrowd Platform

## ✅ Flow 1: Phone Number Registration

### Steps:
1. **Create Account** (`signup.html`)
   - User enters: First Name, Last Name, Phone Number, Password
   - Backend: `POST /api/phone-auth/register-phone`
   - Generates 6-digit OTP
   - Sends SMS via Twilio
   - Returns `tempToken` for verification

2. **Verify Phone** (`verify-otp.html`)
   - User enters 6-digit OTP
   - Backend: `POST /api/phone-auth/verify-phone-signup`
   - Verifies OTP from database
   - Creates Supabase Auth user with `phone_confirm: true`
   - Creates profile in `profiles` table with:
     - `id`, `first_name`, `last_name`, `phone`
     - `onboarding_completed: false`
     - `profile_completed: false`
     - `role: 'user'`
   - Returns JWT token and user data
   - Stores in localStorage:
     - `authToken`
     - `userData: { firstName, lastName, phone }`
     - `isAuthenticated: true`

3. **Onboarding** (`onboarding.html`)
   - Welcome screens and app introduction
   - Sets `onboardingCompleted: true` in localStorage
   - Redirects to dashboard

4. **Dashboard** (`dashboard.html`)
   - Displays user's full name from `userData`
   - Shows phone number in Settings → Profile tab
   - **Red Card System**: Shows completion banner if:
     - `profileCompleted !== true`
     - `documentsUploaded !== true`
     - `employmentVerified !== true`
     - `paymentSetup !== true`
   - **KYC Status**: User flagged as "pending" until verification complete

### Data Flow:
```
Phone Signup → OTP Verification → Profile Created → Onboarding → Dashboard
                                   ↓
                            localStorage.userData:
                            {
                              firstName: "Jothum",
                              lastName: "Chitewe Thomas",
                              phone: "+263...",
                              verified: true
                            }
```

---

## ✅ Flow 2: Email Registration

### Steps:
1. **Create Account** (`signup.html`)
   - User enters: First Name, Last Name, Email, Password, Country, City
   - Backend: `POST /api/email-auth/register-email`
   - Generates 6-digit OTP
   - Sends email via SendGrid/Resend
   - Returns `tempToken` for verification

2. **Verify Email** (`verify-otp.html`)
   - User enters 6-digit OTP
   - Backend: `POST /api/email-auth/verify-email-signup`
   - Verifies OTP from database
   - Creates Supabase Auth user with `email_confirm: true`
   - Creates profile in `profiles` table with:
     - `id`, `first_name`, `last_name`, `email`, `country`, `city`
     - `onboarding_completed: false`
     - `profile_completed: false`
     - `role: 'user'`
   - Returns JWT token and user data
   - Stores in localStorage:
     - `authToken`
     - `userData: { firstName, lastName, email }`
     - `isAuthenticated: true`

3. **Onboarding** (`onboarding.html`)
   - Same as phone flow

4. **Dashboard** (`dashboard.html`)
   - Displays user's full name from `userData`
   - Shows email in Settings → Profile tab
   - **Red Card System**: Same as phone flow
   - **KYC Status**: User flagged as "pending"

### Data Flow:
```
Email Signup → OTP Verification → Profile Created → Onboarding → Dashboard
                                   ↓
                            localStorage.userData:
                            {
                              firstName: "Jothum",
                              lastName: "Chitewe",
                              email: "jchitewe@gmail.com",
                              verified: true
                            }
```

---

## ✅ Flow 3: Social Authentication (Google/Facebook)

### Steps:
1. **Social Login/Signup** (`login.html` or `signup.html`)
   - User clicks "Continue with Google" or "Continue with Facebook"
   - Backend: `GET /api/social-auth/google?mode=signup` or `GET /api/social-auth/facebook?mode=signup`
   - Redirects to OAuth provider
   - **OAuth Scopes Requested**:
     - Google: `email profile`
     - Facebook: `email public_profile`

2. **OAuth Callback** (`/api/social-auth/callback`)
   - Receives user data from provider:
     - `user_metadata.given_name` / `user_metadata.first_name`
     - `user_metadata.family_name` / `user_metadata.last_name`
     - `user_metadata.email`
     - `user_metadata.picture` / `user_metadata.avatar_url`
   - Extracts and logs raw metadata for debugging
   - Checks if profile exists in database
   - **Upserts profile** (creates or updates) with:
     - `id`, `first_name`, `last_name`, `email`
     - `avatar_url` (profile picture from social provider)
     - `onboarding_completed`, `profile_completed`
     - `role: 'user'`
   - Stores in localStorage:
     - `socialAuthData: { first_name, last_name, email, avatar_url, provider }`
     - `userData: { first_name, last_name, email, avatar_url }`
     - `authToken` (Supabase session token)
     - `isAuthenticated: true`
     - `socialSignupCompleted: true`

3. **Onboarding** (`onboarding.html`)
   - Same as other flows
   - Detects social signup via URL param `?source=social`

4. **Dashboard** (`dashboard.html`)
   - **Displays real name** from `socialAuthData.first_name` and `socialAuthData.last_name`
   - **Displays profile picture** from `socialAuthData.avatar_url`
   - Shows in both:
     - Header (top right)
     - Sidebar
     - Settings → Profile tab
   - **Red Card System**: Same as other flows
   - **KYC Status**: User flagged as "pending"

### Data Flow:
```
Social Auth → OAuth Provider → Callback → Profile Upserted → Onboarding → Dashboard
                                           ↓
                                    localStorage.socialAuthData:
                                    {
                                      first_name: "Jothum",
                                      last_name: "Chitewe",
                                      email: "jchitewe@gmail.com",
                                      avatar_url: "https://lh3.googleusercontent.com/...",
                                      provider: "google",
                                      auth_provider: "google"
                                    }
```

---

## 🔴 Red Card System (Profile Completion Banner)

### When It Appears:
The red completion banner appears on the dashboard if ANY of these are incomplete:
- `profileCompleted !== true`
- `documentsUploaded !== true`
- `employmentVerified !== true`
- `paymentSetup !== true`

### Banner Content:
```
⚠️ Complete Your Registration

To fully access ZimCrowd's features and apply for loans, please complete your profile verification. 
This includes KYC verification, personal details, and payment method setup.

Why complete registration? It helps us verify your identity, assess your creditworthiness, 
and provide you with personalized loan offers and better interest rates.

Click anywhere on this banner to get started →
```

### Functionality Limitations:
When profile is incomplete:
- Limited access to loan applications
- Cannot make investments
- Cannot withdraw funds
- Reduced dashboard features

### Code Location:
- Banner HTML: `dashboard.html` line ~3325
- Check function: `checkProfileCompletion()` line ~10327
- Show function: `showCompletionMessageCard()` line ~10339

---

## 📊 KYC Status & Profile Completion

### Profile Completion Tracking:
Located in Settings → Profile tab:

1. **Profile Completion Bar**
   - Shows percentage: 0% → 100%
   - Updates based on completed sections
   - Visual progress indicator

2. **Completion Checklist**:
   - ✅ Personal Information (name, email, phone, DOB, country)
   - ✅ Address Information (street, city, suburb)
   - ✅ KYC Documents (ID, proof of address, selfie)
   - ✅ Employment Information (status, employer, income)
   - ✅ Payment Method Setup (bank account, mobile money)

### KYC Verification Status:
- **Pending**: Default status after signup (red card shown)
- **Submitted**: Documents uploaded, awaiting review
- **Verified**: KYC approved, full access granted
- **Rejected**: Documents rejected, re-submission required

### Database Fields:
```sql
profiles table:
- onboarding_completed: BOOLEAN
- profile_completed: BOOLEAN
- kyc_status: TEXT ('pending', 'submitted', 'verified', 'rejected')
- avatar_url: TEXT (for social profile pictures)
```

---

## 🎯 Settings Tab - Profile Display

### Personal Information Section:
Displays and allows editing of:
- **First Name** (from `userData.firstName` or `socialAuthData.first_name`)
- **Last Name** (from `userData.lastName` or `socialAuthData.last_name`)
- **Email** (from `userData.email` or `socialAuthData.email`)
- **Phone** (from `userData.phone`)
- **Date of Birth**
- **Country**

### Profile Picture:
- **Phone/Email users**: Shows initials (e.g., "JC" for Jothum Chitewe)
- **Social auth users**: Shows actual profile picture from Google/Facebook
- Can upload custom picture (stored in `avatar_url`)
- Remove button to revert to initials

### Data Sources Priority:
1. `socialAuthData` (for social auth users)
2. `userData` (for phone/email users)
3. API response from `/api/profile`

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION                         │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
        ┌───────▼────────┐      ┌──────▼──────┐
        │ Phone/Email    │      │   Social    │
        │   Signup       │      │    Auth     │
        └───────┬────────┘      └──────┬──────┘
                │                      │
        ┌───────▼────────┐      ┌──────▼──────────┐
        │  OTP Verify    │      │ OAuth Provider  │
        │  (SMS/Email)   │      │ (Google/FB)     │
        └───────┬────────┘      └──────┬──────────┘
                │                      │
                └──────────┬───────────┘
                           │
                  ┌────────▼─────────┐
                  │  Profile Created │
                  │  in Database     │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │   Onboarding     │
                  │   (Welcome)      │
                  └────────┬─────────┘
                           │
                  ┌────────▼─────────┐
                  │    Dashboard     │
                  │  - Real Name     │
                  │  - Profile Pic   │
                  │  - Red Card      │
                  │  - KYC Pending   │
                  └──────────────────┘
```

---

## ✅ Verification Checklist

### Phone Registration Flow:
- [x] Phone signup creates user
- [x] OTP sent via SMS
- [x] OTP verification works
- [x] Profile created with phone number
- [x] JWT token generated
- [x] Data stored in localStorage
- [x] Onboarding redirect works
- [x] Dashboard shows real name
- [x] Settings shows phone number
- [x] Red card appears for incomplete profile

### Email Registration Flow:
- [x] Email signup creates user
- [x] OTP sent via email
- [x] OTP verification works
- [x] Profile created with email
- [x] JWT token generated
- [x] Data stored in localStorage
- [x] Onboarding redirect works
- [x] Dashboard shows real name
- [x] Settings shows email
- [x] Red card appears for incomplete profile

### Social Auth Flow:
- [x] Google OAuth requests profile scope
- [x] Facebook OAuth requests public_profile scope
- [x] Callback extracts name from metadata
- [x] Profile picture URL extracted
- [x] Profile upserted in database
- [x] Avatar URL saved to profiles table
- [x] Data stored in localStorage
- [x] Onboarding redirect works
- [x] Dashboard shows real name (not email)
- [x] Dashboard shows profile picture
- [x] Settings shows social data
- [x] Red card appears for incomplete profile

---

## 🚀 Next Steps for Users

After completing registration, users should:

1. **Complete Profile** (Settings → Profile tab)
   - Fill in all personal information
   - Add address details
   - Upload profile picture (if not from social)

2. **Upload KYC Documents** (Settings → Documents tab)
   - National ID or Passport
   - Proof of Address
   - Selfie for verification

3. **Add Employment Info** (Settings → Profile tab)
   - Employment status
   - Employer name
   - Monthly income

4. **Setup Payment Method** (Settings → Payment tab)
   - Bank account details
   - Mobile money number
   - Payment preferences

5. **Wait for Verification**
   - KYC team reviews documents
   - Status changes from "pending" to "verified"
   - Red card disappears
   - Full platform access granted

---

## 📝 Database Setup Required

Run this SQL in Supabase to add avatar_url column:

```sql
-- Add avatar_url column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'avatar_url';
```

---

## 🔧 Technical Implementation

### Backend Routes:
- `POST /api/phone-auth/register-phone` - Phone signup
- `POST /api/phone-auth/verify-phone-signup` - Phone OTP verification
- `POST /api/email-auth/register-email` - Email signup
- `POST /api/email-auth/verify-email-signup` - Email OTP verification
- `GET /api/social-auth/google?mode=signup` - Google OAuth
- `GET /api/social-auth/facebook?mode=signup` - Facebook OAuth
- `GET /api/social-auth/callback` - OAuth callback handler

### Frontend Pages:
- `signup.html` - Registration form
- `verify-otp.html` - OTP verification
- `onboarding.html` - Welcome screens
- `dashboard.html` - Main dashboard with red card system

### LocalStorage Keys:
- `authToken` - JWT authentication token
- `userData` - User profile data (phone/email users)
- `socialAuthData` - Social profile data (Google/Facebook users)
- `isAuthenticated` - Authentication flag
- `onboardingCompleted` - Onboarding completion flag
- `profileCompleted` - Profile completion flag
- `socialSignupCompleted` - Social signup completion flag

---

## 🎉 Summary

All three registration flows are now complete and working:

1. ✅ **Phone Registration** - Full name and phone stored, displayed in dashboard and settings
2. ✅ **Email Registration** - Full name and email stored, displayed in dashboard and settings
3. ✅ **Social Auth** - Real name and profile picture fetched from Google/Facebook, displayed everywhere

The red card system ensures users complete their KYC verification before accessing full platform features. Users are flagged as "pending" until all verification steps are completed.

# Supabase Email Template Tokens Guide

## Available Template Tokens

Supabase provides these tokens for email templates:

### Confirmation/Verification Emails
```
{{ .ConfirmationURL }} - Full confirmation URL
{{ .Email }} - User's email address
{{ .SiteURL }} - Your site URL
{{ .Token }} - Confirmation token (same as {{ .ConfirmationToken }})
{{ .ConfirmationToken }} - The actual confirmation token
```

### Password Reset Emails
```
{{ .RecoveryURL }} - Full password reset URL
{{ .Email }} - User's email address
{{ .SiteURL }} - Your site URL
{{ .Token }} - Reset token
```

### Magic Link Emails
```
{{ .SiteURL }} - Your site URL
{{ .Token }} - Magic link token
```

## How to Use Tokens

### Option 1: Redirect to Your OTP Page
```
Subject: Confirm your ZimCrowd account

Hi there,

Click here to verify your email: {{ .ConfirmationURL }}

Or use this token: {{ .Token }}

---
This email was sent by ZimCrowd
```

### Option 2: Custom URL with Token
```
Subject: Welcome to ZimCrowd - Verify Your Email

Hi there,

Your verification token is: {{ .Token }}

Or click: {{ .SiteURL }}/verify-email-otp?email={{ .Email }}&token={{ .Token }}

---
This email was sent by ZimCrowd
```

### Option 3: Empty Template (Disable Supabase Emails)
```
Subject: Email Verification

Your account has been verified. No further action needed.

---
ZimCrowd
```

## Token Usage Examples

### For Email Verification:
- `{{ .Token }}` - The confirmation token
- `{{ .ConfirmationToken }}` - Same as Token
- `{{ .ConfirmationURL }}` - Full URL like: `https://yourapp.supabase.co/auth/confirm?token=xyz`

### For Password Reset:
- `{{ .Token }}` - The reset token
- `{{ .RecoveryURL }}` - Full URL like: `https://yourapp.supabase.co/auth/reset?token=xyz`

## Custom Implementation

If you want to handle tokens in your app:

```javascript
// In your verify-email-otp.html
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const email = urlParams.get('email');

// Use token to verify user
fetch('/api/email-auth/verify-with-supabase-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, token })
});
```

## Important Notes

1. **{{ .Token }}** is the actual token string
2. **{{ .ConfirmationURL }}** includes the full URL with token
3. Tokens are single-use and expire
4. Always validate tokens server-side

## Current Issue Solution

For your Supabase email duplication issue:

### Step 1: Go to Supabase Dashboard
- Authentication → Email Templates → Confirmation

### Step 2: Replace with:
```
Subject: ZimCrowd Email Verification

Your verification token is: {{ .Token }}

Please use this token in the app to complete verification.

---
ZimCrowd Team
```

### Step 3: Or redirect to your page:
```
Subject: Verify Your ZimCrowd Account

Click here: {{ .SiteURL }}/verify-email-otp?email={{ .Email }}&token={{ .Token }}

---
ZimCrowd
```

This way Supabase sends emails but directs users to your OTP verification page instead of its own confirmation flow.

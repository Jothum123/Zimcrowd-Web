# Email OTP Setup Guide for ZimCrowd

This guide explains how to configure email OTP (One-Time Password) functionality for user verification in ZimCrowd.

## 📧 Overview

The email OTP system allows users to verify their accounts using 6-digit codes sent via email, providing an alternative to traditional email link verification.

## 🔧 Configuration Options

### Option 1: Gmail (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Copy the 16-character password

3. **Add to Environment Variables**:
```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
EMAIL_SERVICE=gmail
FROM_EMAIL=your-email@gmail.com
```

### Option 2: Outlook/Hotmail

1. **Enable SMTP Access** in your Outlook account
2. **Generate App Password** if 2FA is enabled

```bash
OUTLOOK_USER=your-email@outlook.com
OUTLOOK_PASSWORD=your-password-or-app-password
EMAIL_SERVICE=outlook
FROM_EMAIL=your-email@outlook.com
```

### Option 3: Custom SMTP Server

For production, use a dedicated email service:

```bash
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_SECURE=false
FROM_EMAIL=noreply@yourdomain.com
```

## 🚀 Supported Email Services

### Gmail
- **Pros**: Easy setup, reliable
- **Cons**: Daily sending limits
- **Limit**: 500 emails/day

### Outlook
- **Pros**: Good deliverability
- **Cons**: May require app password

### SMTP Providers (Production)
- **SendGrid**: High volume, excellent deliverability
- **Mailgun**: Good analytics, webhooks
- **AWS SES**: Cost-effective for high volume
- **Postmark**: Excellent deliverability

## 📋 Required Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration
EMAIL_SERVICE=gmail|outlook|smtp
FROM_EMAIL=noreply@zimcrowd.com

# Gmail Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password

# Outlook Configuration
OUTLOOK_USER=your-email@outlook.com
OUTLOOK_PASSWORD=your-password

# SMTP Configuration (for production)
SMTP_HOST=smtp.sendgrid.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_SECURE=false
```

## 🗄️ Database Setup

Run the email verification schema in your Supabase SQL Editor:

```sql
-- Execute the contents of supabase-email-schema.sql
```

This creates:
- `email_verifications` table for tracking OTP codes
- Proper RLS policies
- Cleanup functions for expired codes

## 🔍 Testing Email OTP

### 1. Start the Backend Server
```bash
npm install
npm run dev
```

### 2. Test Email Connection
The server will automatically test email connectivity on startup:
```
✅ Email service connected successfully
```

### 3. Test Email Signup
```bash
node test-email-signup.js
```

### 4. Manual Testing
1. Open `signup.html` in browser
2. Select "📧 Email Signup" tab
3. Fill form and submit
4. Check email for OTP code
5. Use code to complete verification

## 📊 Email OTP Flow

### Registration Process:
1. **User submits signup form** → Email OTP sent
2. **User receives 6-digit code** → Via email
3. **User enters OTP** → Account verified
4. **User redirected** → To onboarding

### OTP Details:
- **Length**: 6 digits
- **Expiry**: 10 minutes
- **Format**: Numeric only
- **Attempts**: Unlimited (but rate limited)

## 🔐 Security Features

### Rate Limiting:
- 5 attempts per 15 minutes per IP
- Automatic cleanup of expired codes

### Database Security:
- OTP codes hashed in database
- Row Level Security (RLS) enabled
- Automatic expiration handling

### Email Security:
- No sensitive data in emails
- OTP codes expire quickly
- One-time use only

## 🐛 Troubleshooting

### Common Issues:

**"Email service connection failed"**
- Check credentials in `.env`
- Verify app password (for Gmail)
- Test SMTP settings

**"Failed to send OTP email"**
- Check spam/junk folder
- Verify FROM_EMAIL setting
- Check email provider limits

**"Invalid or expired verification code"**
- Codes expire in 10 minutes
- Check database for code: `SELECT * FROM email_verifications WHERE email = 'user@example.com'`

### Email Testing Services:

For development, consider:
- **Mailtrap**: Captures all emails
- **MailHog**: Local email testing
- **Ethereal Email**: Fake SMTP service

## 📈 Monitoring & Analytics

### Email Delivery Tracking:
- Check server logs for send status
- Monitor bounce rates
- Track OTP verification success rates

### Database Queries:
```sql
-- Check recent verifications
SELECT email, purpose, verified, created_at
FROM email_verifications
ORDER BY created_at DESC
LIMIT 10;

-- Count successful verifications
SELECT COUNT(*) as verified_count
FROM email_verifications
WHERE verified = true;
```

## 🚀 Production Deployment

### Email Service Recommendations:

1. **SendGrid** (Recommended)
   - Excellent deliverability
   - Good analytics
   - Reasonable pricing

2. **AWS SES**
   - Cost-effective
   - Highly scalable
   - Good integration

3. **Mailgun**
   - Good API
   - Webhook support
   - Spam filtering

### Environment Variables for Production:
```bash
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.sendgrid.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.your-sendgrid-api-key
SMTP_SECURE=false
FROM_EMAIL=noreply@zimcrowd.com
```

## ✅ Success Indicators

When properly configured:
- ✅ Server startup shows "Email service connected successfully"
- ✅ Test script sends email successfully
- ✅ OTP codes arrive in inbox (not spam)
- ✅ Verification completes successfully
- ✅ Users can sign up and verify accounts

---

**Need Help?**
- Check server logs for detailed error messages
- Test with different email providers
- Verify SMTP settings with your email service dashboard

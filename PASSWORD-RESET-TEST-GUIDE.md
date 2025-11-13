# Password Reset OTP Test Guide

## Overview
This guide walks you through testing the complete email-based password reset flow using OTP.

---

## Prerequisites

1. **Email must be registered** in the system
2. **Access to email inbox** (kchitewe@gmail.com)
3. **Backend deployed** and running

---

## Test Flow

### Step 1: Send Password Reset OTP

**Command:**
```powershell
powershell -ExecutionPolicy Bypass -File test-send-reset-otp.ps1 -Email "kchitewe@gmail.com"
```

**Expected Result:**
- ✅ Success message: "Password reset OTP sent"
- ✅ Email received with subject: "ZimCrowd Password Reset"
- ✅ Email contains 6-digit OTP code
- ✅ OTP valid for 10 minutes

**Email Template:**
- **Subject:** ZimCrowd Password Reset
- **From:** team@zimcrowd.com
- **Design:** Red-themed security alert
- **Content:** Large 6-digit OTP code
- **Expiry:** 10 minutes

---

### Step 2: Complete Password Reset Flow

**Command:**
```powershell
powershell -ExecutionPolicy Bypass -File test-password-reset-flow.ps1 -Email "kchitewe@gmail.com"
```

**Interactive Steps:**

1. **Request OTP**
   - Script sends password reset request
   - Check email for OTP

2. **Enter OTP**
   - Script prompts: "Enter the 6-digit OTP you received"
   - Type the OTP from email
   - Press Enter

3. **Verify OTP**
   - Script verifies OTP with backend
   - Must be done within 10 minutes

4. **Enter New Password**
   - Script prompts: "Enter new password"
   - Requirements:
     - Minimum 8 characters
     - At least 1 uppercase letter
     - At least 1 lowercase letter
     - At least 1 number
   - Example: `NewPass123!`

5. **Confirm Reset**
   - Script resets password
   - Success message displayed

---

## API Endpoints Tested

### 1. Request Password Reset
```http
POST /api/email-auth/forgot-password-email
Content-Type: application/json

{
  "email": "kchitewe@gmail.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If your email is registered, you will receive a reset code",
  "email": "kc***@gmail.com"
}
```

### 2. Verify OTP
```http
POST /api/email-auth/verify-email-otp
Content-Type: application/json

{
  "email": "kchitewe@gmail.com",
  "otp": "123456",
  "type": "reset"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "email": "kchitewe@gmail.com"
}
```

### 3. Reset Password
```http
POST /api/email-auth/reset-password-email
Content-Type: application/json

{
  "email": "kchitewe@gmail.com",
  "otp": "123456",
  "newPassword": "NewPass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Test Scripts

### 1. test-send-reset-otp.ps1
Sends password reset OTP to specified email.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File test-send-reset-otp.ps1 -Email "kchitewe@gmail.com"
```

**Purpose:**
- Quick test to send OTP
- Verify email delivery
- Check email template

### 2. test-password-reset-flow.ps1
Complete interactive password reset flow.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File test-password-reset-flow.ps1 -Email "kchitewe@gmail.com"
```

**Purpose:**
- Full end-to-end test
- Interactive OTP entry
- Password validation
- Complete reset process

### 3. test-check-email.ps1
Check if email is registered in the system.

**Usage:**
```powershell
powershell -ExecutionPolicy Bypass -File test-check-email.ps1 -Email "kchitewe@gmail.com"
```

**Purpose:**
- Verify email registration
- Debug issues

---

## Common Issues & Solutions

### Issue 1: Email Not Received
**Symptoms:**
- No email in inbox after 1-2 minutes

**Solutions:**
1. Check spam/junk folder
2. Verify email address is correct
3. Check Resend dashboard for delivery status
4. Ensure email is registered in system

### Issue 2: OTP Expired
**Symptoms:**
- Error: "Invalid or expired verification code"

**Solutions:**
1. Request new OTP (run test-send-reset-otp.ps1 again)
2. Complete flow within 10 minutes
3. Don't reuse old OTP codes

### Issue 3: OTP Already Used
**Symptoms:**
- Error: "Invalid or expired verification code"
- OTP was already verified

**Solutions:**
1. Request new OTP
2. Each OTP can only be used once

### Issue 4: Invalid Password Format
**Symptoms:**
- Error: "Password must contain..."

**Solutions:**
1. Ensure minimum 8 characters
2. Include uppercase letter (A-Z)
3. Include lowercase letter (a-z)
4. Include number (0-9)
5. Example: `SecurePass123`

### Issue 5: Email Not Registered
**Symptoms:**
- OTP sent but not received
- Email doesn't exist in database

**Solutions:**
1. Register email first at: https://www.zimcrowd.com/signup.html
2. Complete email verification
3. Then test password reset

---

## Testing Checklist

- [ ] Email registered in system
- [ ] Password reset OTP sent successfully
- [ ] Email received within 2 minutes
- [ ] Email template displays correctly
- [ ] OTP is 6 digits
- [ ] OTP verification succeeds
- [ ] Password validation works
- [ ] Password reset completes successfully
- [ ] Can login with new password
- [ ] Old password no longer works

---

## Database Verification

### Check OTP in Database
The OTP is stored in the `email_verifications` table:

**Fields:**
- `email`: kchitewe@gmail.com
- `otp_code`: 6-digit code
- `purpose`: password_reset
- `verified`: false (becomes true after verification)
- `expires_at`: timestamp (10 minutes from creation)
- `created_at`: timestamp

### Check Password Update
After reset, the password is updated in Supabase Auth:
- User's password hash is updated
- Old password is invalidated
- New password becomes active immediately

---

## Security Features

1. **OTP Expiration**: 10 minutes
2. **Single Use**: OTP can only be used once
3. **Email Masking**: Email displayed as `kc***@gmail.com`
4. **No Email Disclosure**: Endpoint doesn't reveal if email exists
5. **Password Strength**: Enforced validation rules
6. **Rate Limiting**: 5 requests per 15 minutes

---

## Next Steps After Testing

1. **Test Login**: Verify new password works
2. **Test Old Password**: Confirm old password fails
3. **Test Multiple Resets**: Ensure flow works repeatedly
4. **Monitor Logs**: Check for any errors
5. **Production Deploy**: If all tests pass

---

## Support

- **Resend Dashboard:** https://resend.com/emails
- **Backend Logs:** Check Vercel function logs
- **Database:** Supabase dashboard

---

**Test Date:** November 13, 2025
**Email:** kchitewe@gmail.com
**Status:** Ready for testing

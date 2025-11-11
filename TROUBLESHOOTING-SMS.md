# SMS Verification Troubleshooting Guide

## 🔍 Diagnosing "Failed to send verification SMS"

### Step 1: Check What You Entered

**Common Issues:**

1. **Password doesn't meet requirements**
   - Must have uppercase letter (A-Z)
   - Must have lowercase letter (a-z)
   - Must have number (0-9)
   - Must be at least 8 characters
   - ❌ Bad: `password`, `PASSWORD123`, `Password`
   - ✅ Good: `Password123`, `Test1234`, `MyPass99`

2. **Phone number missing country code**
   - ❌ Bad: `0771234567`, `771234567`
   - ✅ Good: `+263771234567`, `+263 77 123 4567`

### Step 2: Open Browser Console

1. Press **F12** to open DevTools
2. Click **Console** tab
3. Try signing up again
4. Look for error messages

**What to look for:**
```
Phone signup response: { success: false, message: "..." }
```

### Step 3: Common Error Messages

#### "Password must contain at least one uppercase letter..."
**Solution:** Use a password like `Test1234` or `Password123`

#### "Invalid phone number format"
**Solution:** Add country code: `+263771234567`

#### "Phone number already registered"
**Solution:** This phone number already has an account. Try logging in instead.

#### "Validation failed"
**Solution:** Check the console for specific field errors

#### "Network error"
**Possible causes:**
- Backend server not running
- Wrong API URL
- Internet connection issue

**Check backend:**
```powershell
# In terminal, run:
curl http://localhost:5003/api/health
```

Should return:
```json
{
  "success": true,
  "message": "ZimCrowd API is running"
}
```

### Step 4: Test Backend Directly

Run the test script:
```powershell
node test-phone-signup.js
```

**If this succeeds but browser fails:**
- Issue is in frontend JavaScript
- Check browser console for errors
- Verify you're using correct password format

**If this fails:**
- Backend issue
- Check Twilio credentials in `.env`
- Verify backend server is running

### Step 5: Verify Twilio Setup

Check `.env` file has:
```
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here
```

### Step 6: Enhanced Error Messages

The latest version now shows detailed error messages:

**In browser console:**
```javascript
Phone signup response: {
  success: false,
  message: "Validation failed",
  errors: [
    { msg: "Password must contain at least one uppercase letter..." }
  ]
}
```

**In alert dialog:**
```
Registration failed. Please try again.

Details: Password validation failed

Validation errors:
• Password must contain at least one uppercase letter, one lowercase letter, and one number
```

## 🧪 Quick Test

Use these exact values:

```
First Name: Test
Last Name: User
Phone: +263771234567
Password: Test1234
Confirm Password: Test1234
✓ Accept Terms
```

If this works, your setup is correct!

## 🚨 Still Not Working?

1. **Check backend logs:**
   - Look at terminal where backend is running
   - Check for error messages

2. **Verify phone number:**
   - Must be a real Zimbabwe number
   - Must be able to receive SMS

3. **Check Twilio account:**
   - Log into Twilio dashboard
   - Verify account is active
   - Check SMS logs

4. **Test with different phone:**
   - Try another phone number
   - Some numbers may be blocked

## 📞 Error Code Reference

| Error | Cause | Solution |
|-------|-------|----------|
| 400 | Validation failed | Check password & phone format |
| 401 | Authentication failed | Check Twilio credentials |
| 429 | Too many requests | Wait 15 minutes and try again |
| 500 | Server error | Check backend logs |

## ✅ Success Indicators

When SMS sends successfully:

**Browser console:**
```javascript
Phone signup response: {
  success: true,
  message: "Verification code sent to your phone",
  tempToken: "eyJ...",
  phone: "+263 771 234 567"
}
```

**What happens:**
1. Alert closes
2. Redirects to OTP verification page
3. SMS arrives on phone within 1-2 minutes

---

**Last Updated**: November 10, 2025

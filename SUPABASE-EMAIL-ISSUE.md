# Quick Fix: Disable Supabase Confirmation Emails

## Step-by-Step Solution

### 1. Go to Supabase Dashboard
Navigate to: **Your Project** → **Authentication** → **Email Templates**

### 2. Edit Confirmation Template
Find the **"Confirm signup"** template and replace it with:

```
Subject: Account Created

Your ZimCrowd account has been successfully created and verified.

No further action is required.

---
ZimCrowd Team
```

### 3. Edit Password Reset Template (Optional)
```
Subject: Password Reset

If you requested a password reset, please use the code provided in the ZimCrowd app.

---
ZimCrowd Team
```

### 4. Save Changes
Click **Save** for each template.

### 5. Test
```bash
# Start backend
npm run dev

# Open test page
http://localhost:5003/test-signup-flows.html

# Try email signup - should only receive YOUR OTP email
```

## What This Does

- ✅ **Stops Supabase confirmation emails**
- ✅ **Users only get your custom OTP email**
- ✅ **No duplicate emails**
- ✅ **Higher rate limits still apply**

## Alternative: Disable Email Confirmations

If the template override doesn't work:

1. **Supabase Dashboard** → **Authentication** → **Settings**
2. **Uncheck**: "Enable email confirmations"
3. **Uncheck**: "Enable email change confirmations"
4. **Save**

This completely disables Supabase email sending while keeping your custom SMTP active.

# ZimCrowd Signup Requirements

## 📱 Phone Number Format

### Required Format
- **Must include country code**: `+263` for Zimbabwe
- **Valid formats**:
  - `+263771234567`
  - `+263 77 123 4567`
  - `+263 77-123-4567`

### Invalid Formats ❌
- `0771234567` (missing country code)
- `771234567` (missing country code)
- `263771234567` (missing + symbol)

### Examples by Country
- **Zimbabwe**: `+263 77 123 4567`
- **South Africa**: `+27 82 123 4567`
- **Botswana**: `+267 71 123 456`

---

## 🔒 Password Requirements

### Minimum Requirements
Your password **MUST** contain:
1. ✅ At least **8 characters**
2. ✅ At least **one uppercase letter** (A-Z)
3. ✅ At least **one lowercase letter** (a-z)
4. ✅ At least **one number** (0-9)

### Valid Password Examples ✅
- `Password123`
- `MyPass99`
- `SecureP@ss1`
- `ZimCrowd2024`
- `Test1234`

### Invalid Password Examples ❌
- `password` (no uppercase, no number)
- `PASSWORD123` (no lowercase)
- `Password` (no number)
- `Pass123` (less than 8 characters)

---

## 🎯 User Experience Features

### Visual Hints
Both signup forms now display helpful hints below input fields:

**Password Field:**
```
Must be 8+ characters with uppercase, lowercase, and number (e.g., Password123)
```

**Phone Number Field:**
```
Include country code (e.g., +263 for Zimbabwe)
```

### Error Messages
Clear, actionable error messages are shown when validation fails:

**Password Validation Error:**
```
Password must contain:
• At least one uppercase letter (A-Z)
• At least one lowercase letter (a-z)
• At least one number (0-9)

Example: Password123
```

---

## 🧪 Testing

### Test Data
Use these credentials to test the signup flow:

```
First Name: Test
Last Name: User
Phone: +263771234567
Email: test@example.com
Password: Test1234
Confirm Password: Test1234
✓ Accept Terms
```

### Backend Verification
The backend has been tested and confirmed working:
- ✅ Twilio SMS sending operational
- ✅ OTP generation working
- ✅ Database storage functional
- ✅ API endpoints responding correctly

---

## 🚀 Implementation Status

### ✅ Completed Features
1. **Visual Hints**: Added to both email and phone signup forms
2. **Password Validation**: Client-side validation with detailed error messages
3. **Phone Format Validation**: Automatic formatting for Zimbabwe numbers
4. **Backend Integration**: Fully functional SMS OTP delivery
5. **Error Handling**: Clear, user-friendly error messages

### 📝 User Flow
1. User clicks "Get Started" on homepage
2. Modal opens with Email/Phone signup tabs
3. User sees helpful hints below password and phone fields
4. User fills in form with valid data
5. Client-side validation checks requirements
6. If validation fails, clear error message is shown
7. If validation passes, SMS OTP is sent
8. User redirected to OTP verification page

---

## 🔧 Troubleshooting

### "Failed to send verification code"

**Possible causes:**
1. **Password doesn't meet requirements**
   - Check for uppercase, lowercase, and number
   - Must be at least 8 characters

2. **Phone number format incorrect**
   - Must include country code (+263)
   - Check for typos

3. **Backend not running**
   - Ensure server is running on port 5003
   - Check console for errors

### How to Debug
1. Open browser DevTools (F12)
2. Go to Console tab
3. Submit the form
4. Check for error messages
5. Go to Network tab
6. Look for "register-phone" request
7. Check request/response data

---

## 📞 Support

If users continue to experience issues:
1. Verify backend server is running
2. Check Twilio credentials in `.env`
3. Review browser console for errors
4. Test with the provided test credentials above
5. Ensure phone number has country code

---

**Last Updated**: November 10, 2025
**Version**: 1.0

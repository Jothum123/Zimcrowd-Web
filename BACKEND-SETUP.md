# 🚀 ZimCrowd Backend Setup Guide

## Prerequisites
- Node.js (v16+)
- MongoDB (local or cloud)
- Gmail account (for emails)

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Start MongoDB
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env
```

### 4. Configure Email
1. Enable 2FA on Gmail
2. Generate App Password
3. Update `.env`:
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
```

### 5. Start Backend
```bash
npm run dev  # Development
npm start    # Production
```

### 6. Test API
```bash
node test-backend.js
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Reset request |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/reset-password` | Reset password |

## Example Usage

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "john@example.com",
    "password": "SecurePass123!"
  }'
```

## Database Setup

The backend will automatically create collections:
- `users` - User accounts
- `otps` - Temporary OTP codes

## Security Features

- ✅ JWT Authentication
- ✅ Password Hashing (bcrypt)
- ✅ Rate Limiting
- ✅ Input Validation
- ✅ OTP Expiration (5 min)
- ✅ Account Locking
- ✅ CORS Protection

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**
   - Check if MongoDB is running
   - Verify MONGODB_URI in .env

2. **Email Not Sending**
   - Check Gmail credentials
   - Enable "Less secure app access" or use App Password

3. **Port Already in Use**
   - Change PORT in .env
   - Kill existing process: `lsof -ti:5000 | xargs kill`

4. **CORS Errors**
   - Update FRONTEND_URL in .env

## File Structure
```
├── backend-server.js      # Main server
├── routes/auth.js         # Auth routes
├── models/
│   ├── User.js           # User model
│   └── OTP.js            # OTP model
├── utils/auth.js         # Auth utilities
├── test-backend.js       # Test script
├── .env                  # Environment vars
└── BACKEND-README.md     # Full docs
```

## Next Steps

1. **Test all endpoints** using the test script
2. **Configure email** properly for production
3. **Add user profile routes** for dashboard features
4. **Implement loan/investment APIs**
5. **Add file upload** for KYC documents

---

**Happy coding! 🎉**

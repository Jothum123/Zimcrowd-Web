# ZimCrowd Backend API

A comprehensive authentication system for the ZimCrowd platform built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Registration & Login** - Secure authentication with JWT tokens
- **Password Reset** - OTP-based password recovery via email
- **Email Verification** - OTP verification for new accounts
- **Rate Limiting** - Protection against brute force attacks
- **Security Features** - Helmet, CORS, input validation
- **Email Integration** - Professional email templates
- **OTP Management** - Secure temporary codes with expiration

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Gmail account (for email sending) or SMTP service

## 🛠️ Installation

1. **Clone and navigate to the project:**
   ```bash
   cd zimcrowd-web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/zimcrowd

   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=24h

   # Email (Gmail)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-gmail-app-password
   EMAIL_FROM=ZimCrowd <noreply@zimcrowd.com>

   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB** (if running locally)

5. **Start the backend server:**
   ```bash
   npm run dev  # Development mode with auto-reload
   # or
   npm start    # Production mode
   ```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/resend-otp` | Resend OTP code |

### Utility Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/test` | API test endpoint |

## 🔐 Authentication Flow

### User Registration
1. **POST** `/api/auth/register` - Create account
2. **System sends** OTP to email
3. **POST** `/api/auth/verify-otp` - Verify email
4. **User** can now log in

### User Login
1. **POST** `/api/auth/login` - Authenticate
2. **Receive** JWT token for API access

### Password Reset
1. **POST** `/api/auth/forgot-password` - Request reset
2. **System sends** OTP to email
3. **POST** `/api/auth/verify-otp` - Verify code
4. **POST** `/api/auth/reset-password` - Set new password

## 📧 Email Configuration

### Gmail Setup (Recommended)
1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" in Google Account settings
3. Use the App Password in `EMAIL_PASS` environment variable

### Alternative SMTP Services
- SendGrid
- Mailgun
- AWS SES
- Postmark

## 🗄️ Database Schema

### User Model
```javascript
{
  firstName, lastName, email, phone,
  password, emailVerified, phoneVerified,
  onboardingCompleted, profileCompleted,
  role, isActive, loginAttempts,
  createdAt, updatedAt
}
```

### OTP Model
```javascript
{
  identifier, otp, type, expiresAt,
  attempts, verified, userId,
  createdAt
}
```

## 🔒 Security Features

- **Password Hashing** - bcrypt with 12 rounds
- **JWT Tokens** - Secure authentication
- **Rate Limiting** - 5 requests per 15 minutes
- **Input Validation** - Comprehensive validation
- **OTP Expiration** - 5 minutes lifetime
- **Account Locking** - After 5 failed login attempts
- **CORS Protection** - Configured for frontend
- **Helmet Security** - Security headers

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Test Endpoints
```bash
curl http://localhost:5000/api/test
```

### Register User (Example)
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

## 🚀 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zimcrowd
JWT_SECRET=your_production_secret_key
EMAIL_USER=your-production-email@domain.com
FRONTEND_URL=https://zimcrowd.com
```

### PM2 Deployment (Recommended)
```bash
npm install -g pm2
pm2 start backend-server.js --name "zimcrowd-api"
pm2 startup
pm2 save
```

## 📝 API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Validation error details"]
}
```

## 🔧 Development

### Project Structure
```
zimcrowd-web/
├── backend-server.js    # Main server file
├── routes/
│   └── auth.js         # Authentication routes
├── models/
│   ├── User.js         # User model
│   └── OTP.js          # OTP model
├── utils/
│   └── auth.js         # Authentication utilities
├── package.json        # Dependencies
├── .env.example        # Environment template
└── README.md          # This file
```

### Adding New Features
1. Create new routes in `/routes/`
2. Add business logic to utilities
3. Update models as needed
4. Add validation and error handling
5. Update this README

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@zimcrowd.com or create an issue in the repository.

---

**Built with ❤️ for the ZimCrowd community**

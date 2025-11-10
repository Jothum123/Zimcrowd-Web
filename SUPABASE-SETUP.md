# 🚀 ZimCrowd Supabase Integration Guide

## Overview

Your ZimCrowd application now uses **Supabase** as the backend instead of a custom Node.js + MongoDB setup. This provides:

- ✅ **Built-in Authentication** (sign up, login, password reset)
- ✅ **PostgreSQL Database** with real-time capabilities
- ✅ **Email/SMS Integration** 
- ✅ **Security & Scalability**
- ✅ **Admin Dashboard**
- ✅ **File Storage** (for KYC documents)

## 📋 Prerequisites

- Supabase account: [supabase.com](https://supabase.com)
- Node.js installed
- GitHub account (for deployment)

## 🛠️ Setup Steps

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name:** `zimcrowd` (or your choice)
   - **Database Password:** Choose a strong password
   - **Region:** Choose closest to your users
5. Click "Create new project"

### 2. Get API Keys

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL:** `https://your-project-id.supabase.co`
   - **Anon public key:** `your-anon-key`
   - **Service_role key:** `your-service-role-key` (keep secret!)

### 3. Configure Environment

Create `.env` file in your project root:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT (for additional security layer)
JWT_SECRET=your_super_secret_jwt_key_here

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 4. Setup Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase-schema.sql`
3. Paste and run the SQL commands
4. This creates:
   - `profiles` table (user profiles)
   - `loans` table (loan applications)
   - `investments` table (investments)
   - `transactions` table (transaction history)
   - Row Level Security policies
   - Triggers and indexes

### 5. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure:
   - **Site URL:** `http://localhost:3000` (for development)
   - **Redirect URLs:** Add your production URLs later
3. Go to **Authentication** → **Email Templates**
4. Customize email templates (optional)

### 6. Install Dependencies

```bash
npm install
```

### 7. Start the Backend

```bash
npm run dev
```

You should see:
```
✅ Supabase connection successful
🚀 ZimCrowd Supabase API
Server: http://localhost:5000
```

## 🔧 API Endpoints

Your backend now provides these endpoints:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/reset-password` - Password update

### Testing
- `GET /api/health` - Health check
- `GET /api/test` - API test

## 🧪 Testing the Integration

### 1. Test Health Check
```bash
curl http://localhost:5000/api/health
```

### 2. Test User Registration
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

### 3. Check Supabase Dashboard
- Go to **Table Editor** in Supabase
- Verify user was created in `profiles` table
- Check `auth.users` for authentication data

## 🔐 Supabase Features Used

### Authentication
- **Email/Password Auth** - Built-in sign up/login
- **Password Reset** - Automatic email flow
- **Email Verification** - OTP via email
- **Session Management** - JWT tokens

### Database
- **PostgreSQL** - Powerful relational database
- **Row Level Security** - Automatic data isolation
- **Real-time** - Live data updates
- **Foreign Keys** - Data relationships

### Security
- **Automatic Encryption** - Data at rest/transit
- **SQL Injection Protection** - Built-in sanitization
- **Rate Limiting** - API protection
- **CORS** - Cross-origin protection

## 🚀 Deployment

### Deploy Backend to Vercel

1. **Connect GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Push to GitHub
   ```

2. **Deploy to Vercel:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

3. **Set Environment Variables:**
   - Go to Vercel dashboard
   - Add all `.env` variables

### Deploy Frontend

Your existing frontend works unchanged! Just update API calls to point to your deployed backend.

## 📊 Supabase Dashboard

### Monitor Your App
- **Authentication** - View user signups/logins
- **Database** - Browse tables and data
- **Logs** - View API requests
- **Realtime** - Monitor live connections

### Useful Queries
```sql
-- Count total users
SELECT COUNT(*) FROM profiles;

-- Recent signups
SELECT email, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- Active loans
SELECT COUNT(*) FROM loans WHERE status = 'active';
```

## 🆘 Troubleshooting

### Common Issues

1. **"Supabase connection test failed"**
   - Check your `.env` variables
   - Verify project URL and keys
   - Make sure project is active

2. **"Email not sending"**
   - Configure email templates in Supabase
   - Check spam folder
   - Verify SMTP settings (optional)

3. **"Table doesn't exist"**
   - Run the SQL schema setup
   - Check Supabase SQL Editor for errors

4. **CORS Errors**
   - Add your domain to Supabase CORS settings
   - Update `FRONTEND_URL` in environment

### Debug Mode
Set `NODE_ENV=development` to see detailed error messages.

## 🎯 Benefits of Supabase

### vs Custom Backend
- ✅ **Faster setup** - No database/server management
- ✅ **Built-in features** - Auth, emails, storage
- ✅ **Scalability** - Handles traffic spikes
- ✅ **Security** - Enterprise-grade security
- ✅ **Real-time** - Live data updates
- ✅ **Admin dashboard** - User management UI

### vs Firebase
- ✅ **PostgreSQL** - More powerful queries
- ✅ **Open source** - Self-hostable
- ✅ **Better pricing** - Generous free tier
- ✅ **SQL access** - Direct database queries

## 🔄 Migration from Custom Backend

If you were using the previous Node.js + MongoDB setup:

1. ✅ **Keep your frontend** - No changes needed
2. ✅ **Export data** - From MongoDB to Supabase
3. ✅ **Update environment** - New Supabase credentials
4. ✅ **Test thoroughly** - All auth flows
5. ✅ **Deploy** - Use Supabase hosting or Vercel

## 📚 Next Steps

1. **Test all auth flows** (register → verify → login)
2. **Set up email templates** in Supabase
3. **Add user profile management** routes
4. **Implement loan/investment APIs**
5. **Add file upload** for KYC documents
6. **Configure monitoring** and alerts

## 🆘 Support

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Community:** [supabase.com/community](https://supabase.com/community)
- **GitHub Issues:** Report bugs and request features

---

**🎉 Welcome to Supabase-powered ZimCrowd!**

Your app now has enterprise-grade backend infrastructure with minimal maintenance overhead.

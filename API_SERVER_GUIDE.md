# 🚀 ZIMCROWD API SERVER - SETUP & RUN GUIDE

## ✅ SERVER CREATED

**File:** `api-server.js`

**Complete Express server with all routes integrated:**
- ✅ Authentication & Profile
- ✅ Wallet & Transactions
- ✅ Loans & Investments
- ✅ Admin Dashboard
- ✅ **KYC OCR (NEW!)**
- ✅ Account Status
- ✅ Notifications
- ✅ Market & Analytics
- ✅ Referrals

---

## 🏃 HOW TO RUN

### **Option 1: Production Mode**

```bash
npm run api
```

### **Option 2: Development Mode (Auto-restart)**

```bash
npm run api:dev
```

### **Option 3: Direct Node**

```bash
node api-server.js
```

---

## 📋 BEFORE RUNNING

### **1. Check Environment Variables**

Make sure your `.env` file has:

```env
# Server Configuration
API_PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database (Supabase)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
SUPABASE_SERVICE_KEY=your_service_key

# JWT
JWT_SECRET=your_jwt_secret_key

# Google Cloud Vision AI
GOOGLE_VISION_KEY_PATH=./config/google-vision-key.json

# Admin
ADMIN_API_KEY=admin-dev-key-123

# Email (Optional)
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@zimcrowd.co.zw
```

---

### **2. Verify Files Exist**

Check that these route files exist:

```
routes/
├── auth.js
├── profile.js
├── profile-setup.js
├── wallet.js
├── transactions.js
├── loans.js
├── investments.js
├── admin-dashboard.js
├── kyc-ocr.js ✅ (NEW)
├── account-status.js
├── notifications.js
├── market.js
├── analytics.js
└── referrals.js
```

**Missing routes?** The server will show an error. Comment out missing routes in `api-server.js`.

---

### **3. Verify Google Vision Key**

```
config/
└── google-vision-key.json ✅
```

If missing, OCR routes won't work.

---

## 🚀 START THE SERVER

```bash
npm run api:dev
```

**You should see:**

```
============================================================
🚀 ZimCrowd API Server Started Successfully!
============================================================
📡 Server running on: http://localhost:3001
🏥 Health check: http://localhost:3001/api/health
🔍 OCR Service: http://localhost:3001/api/kyc-ocr
👤 Profile: http://localhost:3001/api/profile
💰 Wallet: http://localhost:3001/api/wallet
📊 Loans: http://localhost:3001/api/loans
📈 Investments: http://localhost:3001/api/investments
👑 Admin: http://localhost:3001/api/admin-dashboard
============================================================
⏰ Started at: 11/15/2025, 2:45:00 PM
🌍 Environment: development
============================================================
```

---

## 🧪 TEST THE SERVER

### **1. Health Check**

```bash
curl http://localhost:3001/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ZimCrowd API Server Running",
  "timestamp": "2025-11-15T14:45:00.000Z",
  "version": "1.0.0",
  "services": {
    "ocr": "Google Cloud Vision AI",
    "database": "Supabase PostgreSQL",
    "storage": "Supabase Storage"
  }
}
```

---

### **2. Test OCR Service**

```bash
curl http://localhost:3001/api/kyc-ocr/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OCR service is running",
  "service": "Google Cloud Vision AI",
  "features": [
    "Text extraction",
    "Face detection",
    "Quality verification",
    "Document type detection",
    "Comprehensive analysis"
  ]
}
```

---

### **3. Test OCR Document Processing**

```bash
curl -X POST http://localhost:3001/api/kyc-ocr/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@path/to/id-card.jpg" \
  -F "documentType=national_id"
```

---

## 📡 ALL AVAILABLE ENDPOINTS

### **Authentication**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### **Profile**
```
GET    /api/profile
PUT    /api/profile
POST   /api/profile/upload-picture
GET    /api/profile/picture
```

### **Profile Setup & KYC**
```
GET    /api/profile-setup/status
POST   /api/profile-setup/profile
POST   /api/profile-setup/employment
POST   /api/profile-setup/next-of-kin
POST   /api/profile-setup/payment-details
POST   /api/profile-setup/upload-document
GET    /api/profile-setup/documents
```

### **KYC OCR (NEW!)**
```
POST   /api/kyc-ocr/process           - Full document processing
POST   /api/kyc-ocr/analyze           - Comprehensive analysis
POST   /api/kyc-ocr/extract-text      - Text extraction only
POST   /api/kyc-ocr/verify-face       - Face verification
POST   /api/kyc-ocr/check-quality     - Quality check
GET    /api/kyc-ocr/test              - Service health
```

### **Wallet & Transactions**
```
GET    /api/wallet
GET    /api/wallet/balance
POST   /api/wallet/deposit
POST   /api/wallet/withdraw
GET    /api/transactions
GET    /api/transactions/:id
```

### **Loans**
```
GET    /api/loans
POST   /api/loans/apply
GET    /api/loans/:id
POST   /api/loans/:id/repay
GET    /api/loans/stats
```

### **Investments**
```
GET    /api/investments
POST   /api/investments/invest
GET    /api/investments/:id
GET    /api/investments/portfolio
GET    /api/investments/analytics
```

### **Admin Dashboard**
```
GET    /api/admin-dashboard/overview
GET    /api/admin-dashboard/users
GET    /api/admin-dashboard/loans
GET    /api/admin-dashboard/stats
POST   /api/profile-setup/admin/review-kyc/:user_id
```

### **Account Status**
```
GET    /api/account-status/statistics
GET    /api/account-status/arrears
POST   /api/account-status/update
POST   /api/account-status/flag
```

### **Notifications**
```
GET    /api/notifications
POST   /api/notifications/mark-read
DELETE /api/notifications/:id
```

### **Market**
```
GET    /api/market/loans
GET    /api/market/loans/:id
POST   /api/market/invest
```

### **Analytics**
```
GET    /api/analytics/dashboard
GET    /api/analytics/loans
GET    /api/analytics/investments
```

### **Referrals**
```
GET    /api/referrals
POST   /api/referrals/generate
GET    /api/referrals/stats
```

---

## 🔧 TROUBLESHOOTING

### **Error: "Cannot find module './routes/xxx'"**

**Solution:** Comment out the missing route in `api-server.js`:

```javascript
// const missingRoute = require('./routes/missing');
// app.use('/api/missing', missingRoute);
```

---

### **Error: "EADDRINUSE: address already in use"**

**Solution:** Port 3001 is already in use. Either:

1. **Kill the process:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

2. **Change port in `.env`:**
```env
API_PORT=3002
```

---

### **Error: "keyFilename must point to a valid key file"**

**Solution:** 
- Verify `config/google-vision-key.json` exists
- Check path in `services/vision-ocr.service.js`

---

### **Error: "authenticateUser is not defined"**

**Solution:** Create `middleware/auth.js`:

```javascript
const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
}

module.exports = { authenticateUser };
```

---

### **Server starts but routes don't work**

**Check:**
1. Database connection (Supabase)
2. Environment variables loaded
3. Route files exist
4. Authentication middleware configured

---

## 📊 MONITORING

### **Check Server Logs**

The server logs all requests:
```
2025-11-15T14:45:23.123Z - POST /api/kyc-ocr/process
2025-11-15T14:45:24.456Z - GET /api/profile
```

### **Check Google Cloud Usage**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Dashboard"
4. Click "Cloud Vision API"
5. View usage graphs

---

## 🚀 PRODUCTION DEPLOYMENT

### **1. Update Environment**

```env
NODE_ENV=production
API_PORT=3001
FRONTEND_URL=https://zimcrowd.co.zw
```

### **2. Use Process Manager**

**PM2 (Recommended):**

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start api-server.js --name zimcrowd-api

# Monitor
pm2 monit

# Logs
pm2 logs zimcrowd-api

# Restart
pm2 restart zimcrowd-api

# Stop
pm2 stop zimcrowd-api
```

### **3. Enable HTTPS**

Use a reverse proxy like Nginx:

```nginx
server {
    listen 443 ssl;
    server_name api.zimcrowd.co.zw;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## ✅ STARTUP CHECKLIST

- [ ] `.env` file configured
- [ ] All route files exist
- [ ] Google Vision key in place
- [ ] Database connection working
- [ ] Port 3001 available
- [ ] Dependencies installed (`npm install`)
- [ ] Server starts without errors
- [ ] Health check returns success
- [ ] OCR test endpoint works
- [ ] Frontend can connect

---

## 🎯 NEXT STEPS

1. **Start the server:** `npm run api:dev`
2. **Test health check:** `curl http://localhost:3001/api/health`
3. **Test OCR service:** Upload a test ID document
4. **Update frontend:** Point API calls to `http://localhost:3001`
5. **Test all features:** Login, KYC upload, loans, investments
6. **Deploy to production:** Use PM2 and Nginx

---

**Your complete API server is ready to run! 🎊**

**Start it with:** `npm run api:dev`

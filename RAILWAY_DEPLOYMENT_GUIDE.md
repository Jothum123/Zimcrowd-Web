# 🚂 RAILWAY DEPLOYMENT GUIDE

## 🎯 DEPLOYING EXPRESS API TO RAILWAY

### **Prerequisites:**
- ✅ Railway account (you have this)
- ✅ Express server (`api-server-minimal.js`)
- ✅ GitHub repo connected

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Install Railway CLI**

```bash
npm install -g @railway/cli
```

---

### **Step 2: Login to Railway**

```bash
railway login
```

This will open your browser to authenticate.

---

### **Step 3: Initialize Project**

```bash
# Navigate to your project
cd c:\Users\Moffat\Desktop\Zimcrowd-Web-1

# Initialize Railway
railway init
```

**Select:**
- Create new project: `zimcrowd-api`
- Or link to existing project

---

### **Step 4: Create Railway Configuration**

Railway needs to know how to start your server. Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node api-server-minimal.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

### **Step 5: Add Procfile (Alternative)**

Or create a `Procfile`:

```
web: node api-server-minimal.js
```

---

### **Step 6: Update package.json**

Ensure your `package.json` has the start script:

```json
{
  "scripts": {
    "start": "node api-server-minimal.js",
    "api": "node api-server-minimal.js",
    "api:dev": "nodemon api-server-minimal.js"
  },
  "engines": {
    "node": ">=18.x"
  }
}
```

---

### **Step 7: Set Environment Variables**

```bash
# Set environment variables on Railway
railway variables set SUPABASE_URL=https://gjtkdrrvnffrmzigdqyp.supabase.co
railway variables set SUPABASE_ANON_KEY=your_key
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
railway variables set JWT_SECRET=your_secret
railway variables set NODE_ENV=production
railway variables set API_PORT=3001
```

**Or set via Railway Dashboard:**
1. Go to https://railway.app/dashboard
2. Select your project
3. Go to "Variables" tab
4. Add all environment variables

---

### **Step 8: Deploy**

```bash
# Deploy to Railway
railway up
```

This will:
- ✅ Upload your code
- ✅ Install dependencies
- ✅ Build the project
- ✅ Start the server

---

### **Step 9: Get Your URL**

```bash
# Generate public URL
railway domain
```

You'll get something like:
```
https://zimcrowd-api-production.up.railway.app
```

---

### **Step 10: Test Deployment**

```bash
# Test health endpoint
curl https://your-railway-url.railway.app/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "message": "ZimCrowd API Server Running",
  "version": "1.0.0"
}
```

---

## 🔐 IMPORTANT: GOOGLE VISION KEY

**Railway doesn't support file uploads directly**, so you need to use environment variable for Google Vision credentials:

### **Option 1: Use Environment Variable (Recommended)**

Update `services/vision-ocr.service.js`:

```javascript
constructor() {
    // Use environment variable instead of file
    const credentials = process.env.GOOGLE_VISION_CREDENTIALS 
        ? JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS)
        : null;

    if (credentials) {
        this.client = new vision.ImageAnnotatorClient({ credentials });
    } else {
        // Fallback to file (for local development)
        this.client = new vision.ImageAnnotatorClient({
            keyFilename: path.join(__dirname, '../config/google-vision-key.json')
        });
    }
}
```

Then set on Railway:
```bash
railway variables set GOOGLE_VISION_CREDENTIALS='{"type":"service_account","project_id":"..."}'
```

### **Option 2: Use Railway Volumes**

1. Create volume in Railway dashboard
2. Upload `google-vision-key.json`
3. Mount to `/app/config`

---

## 📊 MONITORING

### **View Logs:**
```bash
railway logs
```

### **Check Status:**
```bash
railway status
```

### **Open Dashboard:**
```bash
railway open
```

---

## 🔄 CONTINUOUS DEPLOYMENT

### **Connect GitHub (Recommended):**

1. Go to Railway Dashboard
2. Select your project
3. Click "Settings"
4. Connect GitHub repository
5. Select branch: `main`

**Now every push to `main` auto-deploys!** 🎉

---

## 💰 PRICING

**Railway Pricing:**
- **Free Trial:** $5 credit (no credit card)
- **Hobby Plan:** $5/month
- **Pro Plan:** $20/month

**Usage:**
- Pay per resource usage
- ~$5-10/month for small API
- Scales automatically

---

## 🎯 POST-DEPLOYMENT CHECKLIST

- [ ] Railway CLI installed
- [ ] Logged into Railway
- [ ] Project initialized
- [ ] Environment variables set
- [ ] Code deployed
- [ ] Domain generated
- [ ] Health check passing
- [ ] Google Vision configured
- [ ] GitHub connected (optional)
- [ ] Frontend updated with new API URL

---

## 🔗 UPDATE FRONTEND

After deployment, update your Vercel frontend:

**In your frontend JavaScript:**
```javascript
// Old
const API_BASE_URL = 'http://localhost:3001';

// New
const API_BASE_URL = 'https://your-railway-url.railway.app';
```

**Or use environment variable:**
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-railway-url.railway.app';
```

---

## 🐛 TROUBLESHOOTING

### **Error: "Module not found"**
```bash
# Make sure all dependencies are in package.json
railway run npm install
```

### **Error: "Port already in use"**
```javascript
// Railway provides PORT via environment
const PORT = process.env.PORT || 3001;
```

### **Error: "Supabase connection failed"**
```bash
# Check environment variables
railway variables
```

### **Logs not showing**
```bash
# Tail logs in real-time
railway logs --follow
```

---

## 🚀 DEPLOYMENT COMMANDS SUMMARY

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Set variables
railway variables set KEY=VALUE

# Deploy
railway up

# Get URL
railway domain

# View logs
railway logs

# Open dashboard
railway open
```

---

## ✅ SUCCESS CRITERIA

Your deployment is successful when:

✅ `railway up` completes without errors
✅ `railway logs` shows "Server running on port..."
✅ Health check returns 200 OK
✅ OCR endpoint responds
✅ Frontend can connect to API
✅ All routes load successfully

---

## 🎊 FINAL ARCHITECTURE

```
┌─────────────────────────────────────┐
│  VERCEL (Frontend)                  │
│  zimcrowd-backend-*.vercel.app      │
│  - HTML/CSS/JS                      │
│  - Static files                     │
└──────────────┬──────────────────────┘
               │
               │ API Calls
               ▼
┌─────────────────────────────────────┐
│  RAILWAY (Backend API)              │
│  zimcrowd-api.railway.app           │
│  - Express server                   │
│  - All API routes                   │
│  - OCR processing                   │
│  - Database operations              │
└─────────────────────────────────────┘
```

**Perfect setup for production!** 🎯

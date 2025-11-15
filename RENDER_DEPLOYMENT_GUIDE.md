# 🎨 RENDER DEPLOYMENT GUIDE

## 🚀 DEPLOYING EXPRESS API TO RENDER

Render is **easier than Railway** - no CLI needed, just connect GitHub!

---

## ✅ PREREQUISITES

- ✅ Render account (free)
- ✅ GitHub repo (you have this)
- ✅ Code pushed to GitHub (done)

---

## 🎯 DEPLOYMENT STEPS (5 MINUTES!)

### **Step 1: Go to Render Dashboard**

1. Visit: https://dashboard.render.com/
2. Sign in with GitHub
3. Click **"New +"** → **"Web Service"**

---

### **Step 2: Connect GitHub Repository**

1. Click **"Connect account"** (if first time)
2. Authorize Render to access your repos
3. Find: **"Zimcrowd-Web"** repository
4. Click **"Connect"**

---

### **Step 3: Configure Service**

Fill in these settings:

**Name:**
```
zimcrowd-api
```

**Region:**
```
Oregon (US West) or Frankfurt (Europe)
```

**Branch:**
```
main
```

**Root Directory:**
```
(leave empty)
```

**Runtime:**
```
Node
```

**Build Command:**
```
npm install
```

**Start Command:**
```
npm start
```
(This will run `node api-server-minimal.js`)

**Instance Type:**
```
Free (0.1 CPU, 512 MB RAM)
```

---

### **Step 4: Add Environment Variables**

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```
NODE_ENV = production

SUPABASE_URL = https://gjtkdrrvnffrmzigdqyp.supabase.co

SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzcyMjcsImV4cCI6MjA3ODM1MzIyN30.IlE2yODTRQCl29OlwuZ-CtMxkg1OSPpSEqQVl-X0DtA

SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc3NzIyNywiZXhwIjoyMDc4MzUzMjI3fQ.vRj7-jpNX3nAdL5QrDEEmWNGFMlxBmNTGTD--nArT1Y

JWT_SECRET = hMJW3vnxCpflO1FjpXnjAn76QdQhHcy1/tRptahh20D31QmKJDjvQYY3fhbaBYAJ6+4rgvPPxUdPVV8SSYAlTw==

ADMIN_API_KEY = admin-dev-key-123

FRONTEND_URL = https://zimcrowd-backend-osqns4r32-jojola.vercel.app
```

**For Google Vision (copy entire JSON as one line):**
```
GOOGLE_VISION_CREDENTIALS = {"type":"service_account","project_id":"..."}
```

---

### **Step 5: Deploy!**

1. Click **"Create Web Service"**
2. Render will automatically:
   - ✅ Clone your repo
   - ✅ Install dependencies
   - ✅ Start your server
   - ✅ Give you a URL

**Deployment takes 2-3 minutes** ⏱️

---

## 🎉 YOUR API URL

After deployment, you'll get:
```
https://zimcrowd-api.onrender.com
```

Or custom:
```
https://zimcrowd-api-xxxx.onrender.com
```

---

## 🧪 TEST DEPLOYMENT

### **1. Health Check**
```bash
curl https://zimcrowd-api.onrender.com/api/health
```

**Expected:**
```json
{
  "success": true,
  "message": "ZimCrowd API Server Running",
  "version": "1.0.0"
}
```

### **2. Test OCR Endpoint**
```bash
curl https://zimcrowd-api.onrender.com/api/kyc-ocr/test
```

---

## 📊 MONITORING

### **View Logs:**
1. Go to your service dashboard
2. Click **"Logs"** tab
3. See real-time logs

### **View Metrics:**
1. Click **"Metrics"** tab
2. See CPU, Memory, Requests

### **Manual Deploy:**
1. Click **"Manual Deploy"**
2. Select branch
3. Click **"Deploy"**

---

## 🔄 AUTO-DEPLOYMENT

**Every push to `main` branch auto-deploys!** 🎉

```bash
git add .
git commit -m "Update API"
git push origin main
```

Render automatically:
1. Detects push
2. Builds new version
3. Deploys
4. Switches traffic

**Zero downtime!** ✅

---

## 🔐 GOOGLE VISION CREDENTIALS

### **Option 1: Environment Variable (Recommended)**

Update `services/vision-ocr.service.js`:

```javascript
constructor() {
    // Check for environment variable first
    if (process.env.GOOGLE_VISION_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS);
        this.client = new vision.ImageAnnotatorClient({ credentials });
    } else {
        // Fallback to file (local development)
        this.client = new vision.ImageAnnotatorClient({
            keyFilename: path.join(__dirname, '../config/google-vision-key.json')
        });
    }
}
```

### **Option 2: Secret Files**

1. Go to service settings
2. Click **"Secret Files"**
3. Add file: `config/google-vision-key.json`
4. Paste JSON content
5. Save

---

## 💰 PRICING

### **Free Tier:**
- ✅ 750 hours/month (enough for 1 service 24/7)
- ✅ 512 MB RAM
- ✅ 0.1 CPU
- ✅ Auto-sleep after 15 min inactivity
- ⚠️ Cold starts (30s-1min)

### **Paid Plans:**
- **Starter:** $7/month
  - No sleep
  - Faster CPU
  - More RAM

---

## 🚨 IMPORTANT: FREE TIER BEHAVIOR

**Free services sleep after 15 minutes of inactivity**

**Solutions:**

### **1. Keep-Alive Ping (Recommended)**

Add to your Vercel frontend:
```javascript
// Ping API every 10 minutes to keep it awake
setInterval(() => {
    fetch('https://zimcrowd-api.onrender.com/api/health')
        .catch(err => console.log('Keep-alive ping'));
}, 10 * 60 * 1000);
```

### **2. External Monitor**

Use free services:
- **UptimeRobot** - https://uptimerobot.com
- **Cron-job.org** - https://cron-job.org

Set to ping your API every 10 minutes.

### **3. Upgrade to Paid**

$7/month = No sleep, faster performance

---

## 🔧 TROUBLESHOOTING

### **Build Failed**

**Check:**
1. `package.json` has correct start script
2. All dependencies in `package.json`
3. Node version compatible

**Fix:**
```json
{
  "engines": {
    "node": ">=18.x"
  }
}
```

### **Service Won't Start**

**Check Logs:**
1. Go to service dashboard
2. Click "Logs"
3. Look for errors

**Common Issues:**
- Missing environment variables
- Port binding (use `process.env.PORT`)
- Supabase connection failed

### **Routes Not Loading**

**This is OK!** Routes show "file not found" but will work when:
- Supabase is accessible
- Environment variables are set
- Service is running

---

## 🎯 POST-DEPLOYMENT CHECKLIST

- [ ] Service created on Render
- [ ] GitHub repo connected
- [ ] Environment variables added
- [ ] Service deployed successfully
- [ ] Health check returns 200
- [ ] Logs show "Server running"
- [ ] Got your API URL
- [ ] Tested with cURL
- [ ] Updated frontend with new URL

---

## 🔗 UPDATE FRONTEND

Update your Vercel frontend to use Render API:

**In your JavaScript files:**
```javascript
// Old
const API_BASE_URL = 'http://localhost:3001';

// New
const API_BASE_URL = 'https://zimcrowd-api.onrender.com';
```

**Or use environment variable in Vercel:**

1. Go to Vercel dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   ```
   NEXT_PUBLIC_API_URL = https://zimcrowd-api.onrender.com
   ```
5. Redeploy

**Then in code:**
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
```

---

## 🎊 FINAL ARCHITECTURE

```
┌─────────────────────────────────────┐
│  VERCEL (Frontend)                  │
│  zimcrowd-backend-*.vercel.app      │
│  - HTML/CSS/JS                      │
│  - Static files                     │
│  - Auto-deploy on push              │
└──────────────┬──────────────────────┘
               │
               │ API Calls
               ▼
┌─────────────────────────────────────┐
│  RENDER (Backend API)               │
│  zimcrowd-api.onrender.com          │
│  - Express server                   │
│  - All API routes                   │
│  - OCR processing                   │
│  - Database operations              │
│  - Auto-deploy on push              │
└─────────────────────────────────────┘
```

---

## ✅ ADVANTAGES OF RENDER

✅ **No CLI needed** - Just use dashboard
✅ **Free tier generous** - 750 hours/month
✅ **Auto-deploy** - Push to GitHub = Deploy
✅ **Easy environment variables** - Simple UI
✅ **Good logs** - Real-time log viewer
✅ **PostgreSQL included** - Free database
✅ **SSL automatic** - HTTPS by default
✅ **No credit card** - For free tier

---

## 🚀 QUICK START

1. **Go to:** https://dashboard.render.com/
2. **Click:** New + → Web Service
3. **Connect:** Your GitHub repo
4. **Configure:** Settings above
5. **Add:** Environment variables
6. **Deploy:** Click "Create Web Service"
7. **Wait:** 2-3 minutes
8. **Test:** `curl https://your-url.onrender.com/api/health`
9. **Done!** 🎉

---

## 📝 SUMMARY

**Render is perfect for ZimCrowd because:**
- ✅ Free tier is enough
- ✅ No CLI setup needed
- ✅ Auto-deploys from GitHub
- ✅ Easy to configure
- ✅ Good for Node.js APIs
- ✅ Reliable and fast

**Your setup will be:**
- Frontend: Vercel (already deployed)
- Backend: Render (deploying now)
- Database: Supabase (already configured)

**Total cost: $0/month** (with free tiers) 💰

---

**Ready to deploy? Go to https://dashboard.render.com/ and follow the steps!** 🚀

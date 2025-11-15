# 🚀 RENDER DEPLOYMENT - QUICK START

## ⚡ 5-MINUTE DEPLOYMENT

### **Step 1: Open Render Dashboard**
👉 https://dashboard.render.com/

### **Step 2: Create New Web Service**
Click: **"New +"** → **"Web Service"**

### **Step 3: Connect GitHub**
1. Click **"Connect account"** (if needed)
2. Find: **"Zimcrowd-Web"**
3. Click **"Connect"**

### **Step 4: Configure**

```
Name: zimcrowd-api
Region: Oregon (US West)
Branch: main
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free
```

### **Step 5: Add Environment Variables**

Click **"Advanced"** → Add these:

```bash
NODE_ENV=production

SUPABASE_URL=https://gjtkdrrvnffrmzigdqyp.supabase.co

SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzcyMjcsImV4cCI6MjA3ODM1MzIyN30.IlE2yODTRQCl29OlwuZ-CtMxkg1OSPpSEqQVl-X0DtA

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc3NzIyNywiZXhwIjoyMDc4MzUzMjI3fQ.vRj7-jpNX3nAdL5QrDEEmWNGFMlxBmNTGTD--nArT1Y

JWT_SECRET=hMJW3vnxCpflO1FjpXnjAn76QdQhHcy1/tRptahh20D31QmKJDjvQYY3fhbaBYAJ6+4rgvPPxUdPVV8SSYAlTw==

ADMIN_API_KEY=admin-dev-key-123

FRONTEND_URL=https://zimcrowd-backend-osqns4r32-jojola.vercel.app
```

**For Google Vision** (get from your `config/google-vision-key.json`):
```bash
GOOGLE_VISION_CREDENTIALS={"type":"service_account","project_id":"zimcrowd-kyc-ocr",...}
```
*(Copy entire JSON file content as one line)*

### **Step 6: Deploy!**
Click **"Create Web Service"** → Wait 2-3 minutes ⏱️

---

## ✅ AFTER DEPLOYMENT

### **Your API URL:**
```
https://zimcrowd-api.onrender.com
```

### **Test It:**
```bash
curl https://zimcrowd-api.onrender.com/api/health
```

### **Update Frontend:**
In your Vercel frontend, update:
```javascript
const API_BASE_URL = 'https://zimcrowd-api.onrender.com';
```

---

## 🎯 THAT'S IT!

**Your backend is now live!** 🎉

**Auto-deploys:** Every push to `main` branch

**View Logs:** Dashboard → Your Service → Logs

**Monitor:** Dashboard → Your Service → Metrics

---

## 🚨 IMPORTANT: FREE TIER

**Free services sleep after 15 min of inactivity**

**Keep it awake:** Add to your frontend:
```javascript
// Ping every 10 minutes
setInterval(() => {
    fetch('https://zimcrowd-api.onrender.com/api/health');
}, 10 * 60 * 1000);
```

**Or upgrade:** $7/month for always-on service

---

## 📖 FULL GUIDE

See `RENDER_DEPLOYMENT_GUIDE.md` for:
- Detailed instructions
- Troubleshooting
- Advanced configuration
- Monitoring tips

---

**Need help? Check the full guide or Render docs!** 📚

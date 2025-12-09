# ✅ Production Environment Variables Checklist

Use this guide to configure your environment variables for your **Render API Server**.

---

## 🏗️ 1. API SERVER (Hosted on Render)
**Go to:** Render Dashboard → Select Web Service → Environment
*These variables are CRITICAL for your API to function.*

### **Essential Configuration**
- [ ] `NODE_ENV` = `production`
- [ ] `FRONTEND_URL` = `https://zimcrowd.com`
- [ ] `ADMIN_FRONTEND_URL` = `https://admin-portal.zimcrowd.com`

### **Database & Auth (Supabase)**
- [ ] `SUPABASE_URL` = *(Your URL)*
- [ ] `SUPABASE_ANON_KEY` = *(Your Key)*
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = *(Your Secret Key)*

### **Security & Keys**
- [ ] `ADMIN_API_KEY` = *(Your Key)*
- [ ] `INTERNAL_API_KEY` = *(Your Key)*
- [ ] `JWT_SECRET` = *(Your Secret)*
- [ ] `JWT_EXPIRES_IN` = `7d`
- [ ] `REFRESH_TOKEN_SECRET` = *(Your Secret)*
- [ ] `REFRESH_TOKEN_EXPIRES_IN` = `30d`
- [ ] `TRANSACTION_SECRET` = *(Your Secret)*
- [ ] `ENCRYPTION_KEY` = *(Your Key)*

### **Payments (Paynow)**
- [ ] `PAYNOW_MERCHANT_EMAIL` = `jothum@zimcrowd.co.zw`
- [ ] `PAYNOW_TEST_MODE` = `false`
- [ ] `PAYNOW_USD_INTEGRATION_ID`
- [ ] `PAYNOW_USD_INTEGRATION_KEY`
- [ ] `PAYNOW_ZWG_INTEGRATION_ID`
- [ ] `PAYNOW_ZWG_INTEGRATION_KEY`
- [ ] `PAYNOW_RESULT_URL` = `https://zimcrowd.com/api/payments/result`
- [ ] `PAYNOW_RETURN_URL` = `https://zimcrowd.com/dashboard.html?payment=success`

### **AI Services (OpenRouter / Kairo AI)**
- [ ] `PRIMARY_AI_ENABLED` = `true`
- [ ] `PRIMARY_AI_PROVIDER` = `openrouter`
- [ ] `PRIMARY_AI_API_KEY`
- [ ] `PRIMARY_AI_MODEL`
- [ ] `FALLBACK_AI_ENABLED` = `true`
- [ ] `FALLBACK_AI_PROVIDER` = `openrouter`
- [ ] `FALLBACK_AI_API_KEY`
- [ ] `FALLBACK_AI_MODEL`
- [ ] `AI_EMBEDDING_PROVIDER` = `openrouter`
- [ ] `AI_EMBEDDING_API_KEY`
- [ ] `GEMINI_API_KEY`

### **Cognitive Services (Azure & Google)**
- [ ] `AZURE_VISION_ENABLED` = `true`
- [ ] `AZURE_VISION_ENDPOINT`
- [ ] `AZURE_VISION_KEY`
- [ ] `AZURE_FACE_ENDPOINT`
- [ ] `AZURE_FACE_KEY`
- [ ] `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`
- [ ] `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- [ ] `GOOGLE_CLOUD_CREDENTIALS`
- [ ] `GOOGLE_CLOUD_PROJECT_ID`

### **Communication (Resend, Twilio, OneSignal)**
- [ ] `RESEND_API_KEY`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_PHONE_NUMBER`
- [ ] `ONESIGNAL_REST_API_KEY`
- [ ] `ONESIGNAL_APP_ID`

---

## 🖥️ 2. FRONTEND (Hosted on Vercel)
**Go to:** Vercel Dashboard → Settings → Environment Variables

**❌ NO VARIABLES NEEDED**

Since you are using Vanilla JS, your configuration is handled directly in your code files (`js/api-config-new.js` and `js/supabase-config.js`). 
You do **NOT** need to add any environment variables to the Frontend project in Vercel.

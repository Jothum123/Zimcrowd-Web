# 🔑 Azure API Keys Setup Guide

## Overview

This guide shows you how to get API keys for:
1. **Azure Document Intelligence** (OCR for documents)
2. **Azure Face API** (Face verification)

Both services have **FREE tiers** that are perfect for testing!

---

## 📋 Prerequisites

1. **Microsoft Account** (free)
   - If you don't have one: https://account.microsoft.com/account
   - Use your existing email or create new one

2. **Credit/Debit Card** (for verification only)
   - Won't be charged in free tier
   - Required by Azure for account verification

3. **5-10 minutes** per service

---

# 🎯 Part 1: Azure Document Intelligence (OCR)

## Step 1: Create Azure Account

1. **Go to Azure Portal:**
   ```
   https://portal.azure.com
   ```

2. **Sign in** with your Microsoft account
   - Or click "Create one" if you don't have an account

3. **Start Free Trial** (if first time)
   - Click "Start free"
   - Fill in your details
   - Add credit card (for verification only)
   - **You get $200 credit for 30 days**
   - **Plus always-free services**

---

## Step 2: Create Document Intelligence Resource

1. **In Azure Portal, click "Create a resource"** (top left)

2. **Search for "Document Intelligence"**
   - Or search "Form Recognizer" (old name)
   - Click on it

3. **Click "Create"**

4. **Fill in the details:**

   **Basics Tab:**
   - **Subscription:** Your subscription (usually "Free Trial" or "Pay-As-You-Go")
   - **Resource Group:** 
     - Click "Create new"
     - Name it: `zimcrowd-resources`
     - Click OK
   
   - **Region:** Choose closest to you:
     - **East US** (recommended for Africa)
     - West Europe
     - Southeast Asia
   
   - **Name:** `zimcrowd-document-intelligence`
     - Must be globally unique
     - If taken, try: `zimcrowd-doc-intel-2024`
   
   - **Pricing Tier:** 
     - **Free F0** ← SELECT THIS!
     - 500 pages/month free forever
     - Perfect for testing

5. **Click "Review + Create"**

6. **Click "Create"**

7. **Wait 1-2 minutes** for deployment

8. **Click "Go to resource"** when deployment completes

---

## Step 3: Get Document Intelligence API Keys

1. **In your resource, look at left menu**

2. **Click "Keys and Endpoint"**
   - Under "Resource Management" section

3. **You'll see:**
   ```
   Endpoint: https://zimcrowd-document-intelligence.cognitiveservices.azure.com/
   
   KEY 1: abc123def456...
   KEY 2: xyz789uvw012...
   ```

4. **Copy these values:**
   - Click the copy icon next to Endpoint
   - Click the copy icon next to KEY 1

5. **Save them somewhere safe!**

---

## Step 4: Add to Your .env File

1. **Open your `.env` file**

2. **Find these lines:**
   ```env
   # Azure Document Intelligence (OCR) - Optional
   AZURE_DOCUMENT_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
   AZURE_DOCUMENT_KEY=your-api-key-here
   ```

3. **Replace with your actual values:**
   ```env
   # Azure Document Intelligence (OCR)
   AZURE_DOCUMENT_ENDPOINT=https://zimcrowd-document-intelligence.cognitiveservices.azure.com/
   AZURE_DOCUMENT_KEY=abc123def456...
   ```

4. **Save the file**

5. **Restart your server:**
   ```bash
   npm run api:dev
   ```

6. **Look for this message:**
   ```
   ✅ Azure Document Intelligence initialized
   ✅ Using Azure Document Intelligence (Primary)
   ```

---

# 👤 Part 2: Azure Face API (Face Verification)

## Step 1: Create Face API Resource

1. **In Azure Portal, click "Create a resource"**

2. **Search for "Face"**
   - Click on "Face" service

3. **Click "Create"**

4. **Fill in the details:**

   **Basics Tab:**
   - **Subscription:** Your subscription
   - **Resource Group:** 
     - Select existing: `zimcrowd-resources`
     - (The one you created earlier)
   
   - **Region:** Choose same as Document Intelligence:
     - **East US** (recommended)
     - West Europe
     - Southeast Asia
   
   - **Name:** `zimcrowd-face-api`
     - Must be globally unique
     - If taken, try: `zimcrowd-face-2024`
   
   - **Pricing Tier:** 
     - **Free F0** ← SELECT THIS!
     - 30,000 transactions/month free forever
     - Perfect for testing

5. **Click "Review + Create"**

6. **Click "Create"**

7. **Wait 1-2 minutes** for deployment

8. **Click "Go to resource"**

---

## Step 2: Get Face API Keys

1. **In your Face resource, look at left menu**

2. **Click "Keys and Endpoint"**

3. **You'll see:**
   ```
   Endpoint: https://zimcrowd-face-api.cognitiveservices.azure.com/
   
   KEY 1: xyz789abc123...
   KEY 2: def456ghi789...
   ```

4. **Copy these values:**
   - Click copy icon next to Endpoint
   - Click copy icon next to KEY 1

5. **Save them!**

---

## Step 3: Add to Your .env File

1. **Open your `.env` file**

2. **Find these lines:**
   ```env
   # Azure Face API (Face Verification) - Optional
   # AZURE_FACE_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
   # AZURE_FACE_KEY=your-api-key-here
   ```

3. **Uncomment and replace:**
   ```env
   # Azure Face API (Face Verification)
   AZURE_FACE_ENDPOINT=https://zimcrowd-face-api.cognitiveservices.azure.com/
   AZURE_FACE_KEY=xyz789abc123...
   ```

4. **Save the file**

5. **Restart your server:**
   ```bash
   npm run api:dev
   ```

6. **Look for this message:**
   ```
   ✅ Azure Face API initialized
   ✅ Loading route: Face Verification
   ```

---

# ✅ Verification

## Test Document Intelligence

1. **Open test page:**
   ```
   http://localhost:3001/test-ocr.html
   ```

2. **Upload an ID or bank statement**

3. **Check results:**
   - Should show "Azure Document Intelligence" as OCR engine
   - Confidence should be 90-100%
   - All fields extracted

---

## Test Face API

1. **Test endpoint:**
   ```bash
   curl http://localhost:3001/api/face/test
   ```

2. **Should return:**
   ```json
   {
     "success": true,
     "message": "Face service is running",
     "service": "Azure Face API",
     "available": true,
     "features": [
       "Face Detection",
       "Face Comparison",
       "Liveness Verification",
       "ID Photo Analysis"
     ]
   }
   ```

---

# 💰 Free Tier Limits

## Document Intelligence (Free F0)

- **500 pages per month**
- **Forever free** (no expiration)
- **All features included**
- **No credit card charged**

**Perfect for:**
- Testing
- Small deployments
- Up to 16 IDs per day

---

## Face API (Free F0)

- **30,000 transactions per month**
- **Forever free** (no expiration)
- **All features included**
- **No credit card charged**

**Perfect for:**
- Testing
- ~1,000 KYC verifications per month
- Face detection, comparison, liveness

---

# 🔄 If You Exceed Free Tier

## Document Intelligence

**Upgrade to Standard S0:**
- **$1.50 per 1,000 pages**
- Unlimited volume

**Cost Examples:**
- 100 IDs/day = ~$4.50/month
- 500 IDs/day = ~$22.50/month

---

## Face API

**Upgrade to Standard S0:**
- **$1 per 1,000 transactions**
- Unlimited volume

**Cost Examples:**
- 100 verifications/day = ~$3/month
- 500 verifications/day = ~$15/month

---

# 🔐 Security Best Practices

## 1. Protect Your Keys

✅ **DO:**
- Keep keys in `.env` file
- Add `.env` to `.gitignore`
- Use environment variables in production

❌ **DON'T:**
- Commit keys to GitHub
- Share keys publicly
- Hardcode keys in code

---

## 2. Rotate Keys Regularly

1. **Go to Azure Portal**
2. **Navigate to your resource**
3. **Click "Keys and Endpoint"**
4. **Click "Regenerate Key 1"**
5. **Update your `.env` file**
6. **Restart server**

**Rotate every 3-6 months**

---

## 3. Use Key 2 for Zero-Downtime Rotation

1. **Update app to use KEY 2**
2. **Deploy**
3. **Regenerate KEY 1**
4. **Update app back to KEY 1**
5. **Deploy**

---

# 🐛 Troubleshooting

## Issue: "Azure not configured"

**Causes:**
- Keys not in `.env` file
- Typo in variable names
- Server not restarted

**Solutions:**
1. Check `.env` file exists
2. Verify variable names:
   - `AZURE_DOCUMENT_ENDPOINT` (not AZURE_ENDPOINT)
   - `AZURE_DOCUMENT_KEY` (not AZURE_KEY)
   - `AZURE_FACE_ENDPOINT`
   - `AZURE_FACE_KEY`
3. Restart server: `npm run api:dev`

---

## Issue: "Authentication failed"

**Causes:**
- Invalid API key
- Wrong endpoint URL
- Key regenerated but not updated

**Solutions:**
1. Go to Azure Portal
2. Check "Keys and Endpoint"
3. Copy KEY 1 again
4. Update `.env`
5. Restart server

---

## Issue: "Quota exceeded"

**Causes:**
- Used all free tier transactions
- Too many requests

**Solutions:**
1. **Wait until next month** (quota resets)
2. **Upgrade to Standard tier**
3. **Create another Free resource** (different name)
4. **Optimize usage** (cache results)

---

## Issue: "Resource not found"

**Causes:**
- Wrong endpoint URL
- Resource deleted
- Wrong region

**Solutions:**
1. Go to Azure Portal
2. Find your resource
3. Copy endpoint exactly
4. Ensure it ends with `/`

---

# 📊 Monitor Usage

## Check Usage in Azure Portal

1. **Go to your resource**

2. **Click "Metrics"** (left menu)

3. **Select metric:**
   - "Total Calls" - Number of API calls
   - "Data In" - Data processed

4. **Set time range:**
   - Last 24 hours
   - Last 7 days
   - Last 30 days

5. **Monitor to stay within free tier**

---

## Set Up Alerts

1. **Click "Alerts"** (left menu)

2. **Click "Create alert rule"**

3. **Configure:**
   - **Condition:** Total Calls > 450 (90% of 500)
   - **Action:** Send email
   - **Email:** your-email@example.com

4. **Get notified** before hitting limit

---

# 🎓 Summary

## What You Need

### For Document Intelligence:
```env
AZURE_DOCUMENT_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_KEY=your-32-character-key
```

### For Face API:
```env
AZURE_FACE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FACE_KEY=your-32-character-key
```

---

## Quick Checklist

- [ ] Created Azure account
- [ ] Created Document Intelligence resource (Free F0)
- [ ] Copied Document Intelligence endpoint and key
- [ ] Added to `.env` file
- [ ] Created Face API resource (Free F0)
- [ ] Copied Face API endpoint and key
- [ ] Added to `.env` file
- [ ] Restarted server
- [ ] Verified services are running
- [ ] Tested with sample documents

---

## Free Tier Benefits

**Total Free Per Month:**
- ✅ 500 document pages (Document Intelligence)
- ✅ 30,000 face transactions (Face API)
- ✅ $0 cost
- ✅ No expiration
- ✅ All features included

**Perfect for ZimCrowd testing and initial deployment!**

---

# 📞 Need Help?

## Resources

- **Azure Portal:** https://portal.azure.com
- **Document Intelligence Docs:** https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/
- **Face API Docs:** https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-identity
- **Pricing Calculator:** https://azure.microsoft.com/en-us/pricing/calculator/

## Support

- **Azure Support:** Available in portal (free tier includes basic support)
- **Community:** Stack Overflow, Azure forums
- **Documentation:** Comprehensive guides and tutorials

---

**You're now ready to use Azure AI services! 🎉**

*Last Updated: November 16, 2025*

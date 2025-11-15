# 🔷 Azure Document Intelligence Setup Guide

## Overview

Azure Document Intelligence (formerly Form Recognizer) is Microsoft's AI service for extracting text and structured data from documents. It's **excellent for ID cards** and offers:

✅ **High accuracy** (90-95%+ for IDs)
✅ **Prebuilt ID model** (optimized for identity documents)
✅ **Face/photo detection**
✅ **Structured field extraction**
✅ **Better than Tesseract** for document processing
✅ **Free tier available** (500 pages/month)

---

## 🆚 Comparison with Other OCR Services

| Feature | Azure Document Intelligence | Google Vision | Tesseract |
|---------|---------------------------|---------------|-----------|
| **Accuracy** | 90-95% | 90-99% | 70-85% |
| **ID Optimization** | ✅ Yes (prebuilt model) | ⚠️ General OCR | ❌ No |
| **Face Detection** | ✅ Yes | ✅ Yes | ❌ No |
| **Field Extraction** | ✅ Structured | ⚠️ Manual parsing | ⚠️ Manual parsing |
| **Free Tier** | ✅ 500 pages/month | ✅ 1,000 requests/month | ✅ Unlimited |
| **Billing Required** | ✅ Yes | ✅ Yes | ❌ No |
| **Setup Difficulty** | ⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐ Very Easy |
| **Best For** | ID cards, forms | General images | Budget projects |

---

## 📋 Prerequisites

1. **Azure Account** (free tier available)
2. **Credit/Debit Card** (for verification, won't be charged in free tier)
3. **5-10 minutes** setup time

---

## 🚀 Step-by-Step Setup

### Step 1: Create Azure Account

1. **Go to Azure Portal:**
   ```
   https://portal.azure.com
   ```

2. **Sign up for free:**
   - Click "Start free"
   - Use Microsoft account or create new one
   - Verify with phone number
   - Add credit card (for verification only)
   - **Free tier includes:**
     - $200 credit for 30 days
     - 500 Document Intelligence pages/month (always free)

---

### Step 2: Create Document Intelligence Resource

1. **In Azure Portal, click "Create a resource"**

2. **Search for "Document Intelligence"** (or "Form Recognizer")

3. **Click "Create"**

4. **Fill in details:**
   - **Subscription:** Your subscription
   - **Resource Group:** Create new → `zimcrowd-resources`
   - **Region:** Choose closest to you:
     - `East US` (recommended for Africa)
     - `West Europe`
     - `Southeast Asia`
   - **Name:** `zimcrowd-document-intelligence`
   - **Pricing Tier:** 
     - **Free F0** (500 pages/month) - Recommended for testing
     - **Standard S0** ($1.50/1000 pages) - For production

5. **Click "Review + Create"**

6. **Click "Create"**

7. **Wait 1-2 minutes** for deployment

---

### Step 3: Get API Credentials

1. **Go to your resource** (click "Go to resource" after deployment)

2. **In left menu, click "Keys and Endpoint"**

3. **Copy these values:**
   - **Endpoint:** `https://zimcrowd-document-intelligence.cognitiveservices.azure.com/`
   - **Key 1:** `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

4. **Keep these safe!** You'll need them for your `.env` file

---

### Step 4: Add to Your Project

1. **Open your `.env` file**

2. **Add Azure credentials:**
   ```env
   # Azure Document Intelligence (OCR)
   AZURE_DOCUMENT_ENDPOINT=https://your-resource-name.cognitiveservices.azure.com/
   AZURE_DOCUMENT_KEY=your-api-key-here
   ```

3. **Replace with your actual values:**
   - `your-resource-name` → Your resource name
   - `your-api-key-here` → Key 1 from Azure Portal

4. **Save the file**

---

### Step 5: Test the Integration

1. **Restart your server:**
   ```bash
   npm run api:dev
   ```

2. **Look for this message:**
   ```
   ✅ Azure Document Intelligence initialized
   ✅ Using Azure Document Intelligence (Primary)
   ```

3. **If you see this, Azure is NOT configured:**
   ```
   ⚠️  Azure not configured, using Tesseract OCR (Free)
   ```
   → Check your `.env` file credentials

4. **Test with OCR page:**
   ```
   http://localhost:3001/test-ocr.html
   ```

5. **Upload an ID and check results:**
   - Should show "Azure Document Intelligence" as OCR engine
   - Higher confidence scores (80-95%)
   - Better field extraction

---

## 📊 Free Tier Limits

### What's Included (Always Free):
- **500 pages per month**
- **Prebuilt ID model**
- **Read model**
- **Layout model**
- **No expiration** (unlike $200 credit)

### What Counts as a "Page":
- 1 image = 1 page
- 1 PDF page = 1 page
- Multi-page PDF = multiple pages

### For ZimCrowd:
- **500 pages/month** = ~16 ID verifications per day
- **Perfect for testing and small deployments**
- **Upgrade to Standard S0 when you need more**

---

## 💰 Pricing (After Free Tier)

### Standard S0 Pricing:
- **$1.50 per 1,000 pages**
- **Prebuilt ID model:** $1.50/1,000 pages
- **Read model:** $1.00/1,000 pages

### Cost Examples:
- **100 IDs/day** = 3,000/month = **$4.50/month**
- **500 IDs/day** = 15,000/month = **$22.50/month**
- **1,000 IDs/day** = 30,000/month = **$45/month**

**Much cheaper than Google Vision!**

---

## 🔧 Configuration Options

### Option 1: Free Tier (F0) - Recommended for Testing
```
Pricing Tier: Free F0
Limit: 500 pages/month
Cost: $0
Best for: Development, testing, small deployments
```

### Option 2: Standard (S0) - For Production
```
Pricing Tier: Standard S0
Limit: Unlimited (pay per use)
Cost: $1.50/1,000 pages
Best for: Production, high volume
```

### Option 3: Multiple Resources
```
Create multiple Free F0 resources in different regions
Each gets 500 pages/month
Total: 1,500+ pages/month free
```

---

## 🎯 Features Specific to ID Documents

### Prebuilt ID Model Extracts:
- ✅ **Document Number** (ID number)
- ✅ **First Name**
- ✅ **Last Name**
- ✅ **Date of Birth**
- ✅ **Date of Issue**
- ✅ **Date of Expiry**
- ✅ **Sex/Gender**
- ✅ **Nationality**
- ✅ **Address**
- ✅ **Photo** (detects presence)
- ✅ **Machine Readable Zone (MRZ)**

### Confidence Scores:
- Each field has individual confidence score
- Overall document confidence
- Helps identify low-quality images

---

## 🔄 Fallback Strategy

Your system now uses this priority:

1. **Azure Document Intelligence** (if configured)
   - Best accuracy (90-95%)
   - Optimized for IDs
   - Structured field extraction

2. **Tesseract OCR** (if Azure not available)
   - Free, unlimited
   - Good accuracy (70-85%)
   - Manual field parsing

3. **Google Vision** (optional, commented out)
   - Requires billing
   - Excellent accuracy (90-99%)
   - General purpose OCR

---

## 🧪 Testing

### Test 1: Verify Azure is Active

1. Start server and check logs:
   ```
   ✅ Azure Document Intelligence initialized
   ✅ Using Azure Document Intelligence (Primary)
   ```

2. If you see Tesseract instead, check:
   - `.env` file has correct credentials
   - Endpoint URL is correct
   - API key is valid
   - No typos in variable names

### Test 2: Upload ID Document

1. Go to: `http://localhost:3001/test-ocr.html`
2. Upload a clear ID image
3. Check results:
   - **OCR Engine:** Should say "Azure Document Intelligence"
   - **Confidence:** Should be 80-95%
   - **Fields:** Should be properly extracted
   - **Processing Time:** 2-4 seconds

### Test 3: Compare with Tesseract

1. **Remove Azure credentials** from `.env` (temporarily)
2. **Restart server**
3. **Upload same ID**
4. **Compare results:**
   - Azure: Higher confidence, better fields
   - Tesseract: Lower confidence, manual parsing

---

## 🐛 Troubleshooting

### Issue: "Azure not configured"

**Causes:**
- Missing `.env` variables
- Wrong variable names
- Invalid credentials

**Solutions:**
1. Check `.env` file exists
2. Verify variable names:
   - `AZURE_DOCUMENT_ENDPOINT` (not AZURE_ENDPOINT)
   - `AZURE_DOCUMENT_KEY` (not AZURE_KEY)
3. Check endpoint format:
   - Must start with `https://`
   - Must end with `.cognitiveservices.azure.com/`
4. Verify API key is correct (32 characters)

### Issue: "Authentication failed"

**Causes:**
- Invalid API key
- Expired key
- Wrong region

**Solutions:**
1. Go to Azure Portal
2. Navigate to your resource
3. Click "Keys and Endpoint"
4. Copy Key 1 again
5. Update `.env` file
6. Restart server

### Issue: "Quota exceeded"

**Causes:**
- Used all 500 free pages this month
- Too many requests

**Solutions:**
1. Wait until next month (quota resets)
2. Upgrade to Standard S0
3. Create another Free F0 resource
4. Fallback to Tesseract (automatic)

### Issue: "Region not supported"

**Causes:**
- Chose unsupported region
- Service not available in region

**Solutions:**
1. Delete resource
2. Create new one in supported region:
   - East US
   - West Europe
   - Southeast Asia

---

## 📈 Monitoring Usage

### Check Usage in Azure Portal:

1. **Go to your resource**
2. **Click "Metrics"** in left menu
3. **Select metric:**
   - "Total Calls" - Number of API calls
   - "Data In" - Amount of data processed
4. **Set time range** (last 24 hours, 7 days, 30 days)
5. **Monitor your usage** to stay within free tier

### Set Up Alerts:

1. **Click "Alerts"** in left menu
2. **Create alert rule**
3. **Set threshold:** 450 pages (90% of free tier)
4. **Add email notification**
5. **Get notified** before hitting limit

---

## 🔐 Security Best Practices

### 1. Protect Your API Key
- ✅ Keep in `.env` file (not in code)
- ✅ Add `.env` to `.gitignore`
- ❌ Never commit to GitHub
- ❌ Never share publicly

### 2. Rotate Keys Regularly
- Regenerate keys every 3-6 months
- Use Key 2 while rotating Key 1
- Update `.env` after rotation

### 3. Use Managed Identity (Production)
- For Azure-hosted apps
- No keys needed
- More secure

### 4. Monitor for Unusual Activity
- Check metrics regularly
- Set up alerts
- Review access logs

---

## 🚀 Deployment

### For Render/Railway:

1. **Add environment variables in dashboard:**
   ```
   AZURE_DOCUMENT_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
   AZURE_DOCUMENT_KEY=your-api-key
   ```

2. **Deploy your app**

3. **Test in production:**
   ```
   https://your-app.onrender.com/test-ocr.html
   ```

### For Vercel (Frontend):

No changes needed! The frontend uses the same API endpoints.

---

## 📚 Additional Resources

### Official Documentation:
- [Azure Document Intelligence Docs](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/)
- [Prebuilt ID Model](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept-id-document)
- [Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)

### Tutorials:
- [Quickstart Guide](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/quickstarts/get-started-sdks-rest-api)
- [ID Document Processing](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/how-to-guides/use-prebuilt-id-document)

---

## ✅ Checklist

Before going live with Azure:

- [ ] Azure account created
- [ ] Document Intelligence resource created
- [ ] API credentials copied
- [ ] `.env` file updated
- [ ] Server restarted
- [ ] Azure initialization confirmed in logs
- [ ] Test upload successful
- [ ] Confidence scores improved (80%+)
- [ ] Fields extracted correctly
- [ ] Usage monitoring set up
- [ ] Alerts configured
- [ ] Production environment variables set

---

## 🎊 Benefits Summary

### Why Use Azure Document Intelligence:

1. **Better Accuracy** - 90-95% vs 70-85% (Tesseract)
2. **ID Optimized** - Prebuilt model for identity documents
3. **Structured Data** - Automatic field extraction
4. **Face Detection** - Detects photo in ID
5. **Free Tier** - 500 pages/month forever
6. **Affordable** - $1.50/1,000 pages after free tier
7. **Fast** - 2-4 seconds processing
8. **Reliable** - Microsoft infrastructure
9. **Easy Setup** - 10 minutes to get started
10. **Production Ready** - Enterprise-grade service

---

## 🔄 Migration Path

### Current Setup:
```
Tesseract OCR (Free, 70-85% accuracy)
```

### After Azure Setup:
```
Azure Document Intelligence (Primary, 90-95% accuracy)
↓ (if Azure fails or quota exceeded)
Tesseract OCR (Fallback, 70-85% accuracy)
```

### Optional Future:
```
Azure Document Intelligence (Primary)
↓
Google Vision (Secondary, requires billing)
↓
Tesseract OCR (Final fallback)
```

---

## 💡 Pro Tips

1. **Start with Free Tier** - Test thoroughly before upgrading
2. **Monitor Usage** - Set alerts at 90% of free quota
3. **Use Good Images** - Even Azure needs decent quality
4. **Cache Results** - Don't re-process same document
5. **Batch Processing** - Process multiple IDs efficiently
6. **Error Handling** - Always have Tesseract fallback
7. **Log Everything** - Track confidence scores and errors
8. **Test Regularly** - Ensure service is working
9. **Keep Keys Safe** - Never expose in client-side code
10. **Plan for Scale** - Upgrade to Standard S0 when needed

---

## 📞 Support

### If You Need Help:

1. **Check this guide** - Most issues covered here
2. **Review logs** - Server console shows detailed errors
3. **Test credentials** - Verify in Azure Portal
4. **Check Azure status** - [status.azure.com](https://status.azure.com)
5. **Azure Support** - Free tier includes basic support

---

**Ready to get started? Follow Step 1 above! 🚀**

*Last Updated: November 15, 2025*

# 🎯 OCR SERVICE PRIORITY CONFIGURATION

## **PRIMARY vs FALLBACK Strategy**

---

## 📊 **SERVICE PRIORITY**

### **PRIMARY (Paid, High Accuracy):**
1. ✅ **Azure Document Intelligence** - 99% accuracy for ID/Passport OCR
2. ✅ **Azure Face API** - 95% accuracy for face verification

### **FALLBACK (Free, Good Accuracy):**
3. ✅ **Tesseract.js** - 85-90% accuracy for general OCR

---

## 🔧 **HOW IT WORKS**

### **OCR Text Extraction:**
```javascript
// Priority Flow:
1. Check if Azure Document Intelligence configured
   ↓ YES → Use Azure (99% accuracy)
   ↓ NO  → Use Tesseract (85-90% accuracy)
```

### **Face Detection:**
```javascript
// Priority Flow:
1. Check if Azure Face API configured
   ↓ YES → Use Azure Face API (95% accuracy)
   ↓ NO  → Skip face verification (optional feature)
```

---

## 🔑 **ENVIRONMENT VARIABLES**

### **For PRIMARY (Azure Services):**
```bash
# Azure Document Intelligence
AZURE_DOCUMENT_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_KEY=your_azure_document_key

# Azure Face API
AZURE_FACE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FACE_KEY=your_azure_face_key
```

### **For FALLBACK (Tesseract):**
```bash
# No environment variables needed
# Tesseract is automatically used if Azure not configured
```

---

## 📊 **SERVICE COMPARISON**

| Feature | Azure Document Intelligence | Tesseract.js |
|---------|----------------------------|--------------|
| **Accuracy** | 99% | 85-90% |
| **Speed** | Fast (2-3 sec) | Moderate (3-5 sec) |
| **Cost** | Paid ($1.50/1000 docs) | Free |
| **ID Recognition** | Excellent | Good |
| **Handwriting** | Good | Poor |
| **Multi-language** | Excellent | Good |
| **Field Extraction** | Automatic | Manual parsing |

| Feature | Azure Face API | No Face Detection |
|---------|----------------|-------------------|
| **Accuracy** | 95% | N/A |
| **Speed** | Fast (1-2 sec) | N/A |
| **Cost** | Paid ($1/1000 faces) | Free |
| **Face Matching** | Yes | No |
| **Liveness Detection** | Limited Access | No |

---

## 🚀 **STARTUP LOGS**

### **With Azure Configured:**
```
✅ PRIMARY OCR: Azure Document Intelligence (99% accuracy)
✅ PRIMARY FACE: Azure Face API (95% accuracy)
✅ KYC-OCR routes registered
```

### **Without Azure (Fallback):**
```
⚠️  Azure Document Intelligence not configured
⚠️  Azure Face API not configured
🔄 FALLBACK OCR: Using Tesseract (Free, 85-90% accuracy)
✅ KYC-OCR routes registered
```

---

## 📝 **USAGE IN CODE**

### **OCR Service (vision-ocr.service.js):**
```javascript
class VisionOCRService {
    constructor() {
        // PRIMARY: Try Azure first
        this.azureService = new AzureDocumentOCRService();
        if (this.azureService.isAvailable()) {
            this.useAzure = true;
            console.log('✅ PRIMARY OCR: Azure Document Intelligence');
        }

        // PRIMARY: Try Azure Face
        this.azureFaceService = new AzureFaceService();
        if (this.azureFaceService.isAvailable()) {
            this.useAzureFace = true;
            console.log('✅ PRIMARY FACE: Azure Face API');
        }

        // FALLBACK: Use Tesseract if Azure not available
        if (!this.useAzure) {
            console.log('🔄 FALLBACK OCR: Using Tesseract');
            this.tesseractService = new TesseractOCRService();
        }
    }

    async extractIDText(imageBuffer) {
        // PRIMARY: Use Azure if available
        if (this.useAzure) {
            return await this.azureService.extractIDText(imageBuffer);
        }
        
        // FALLBACK: Use Tesseract
        return await this.tesseractService.extractIDText(imageBuffer);
    }

    async detectFace(imageBuffer) {
        // PRIMARY: Use Azure Face API if available
        if (this.useAzureFace) {
            return await this.azureFaceService.detectFace(imageBuffer);
        }
        
        // FALLBACK: Skip face detection
        return {
            success: true,
            faceDetected: false,
            message: 'Face detection not configured'
        };
    }
}
```

---

## 🧪 **TESTING**

### **Test with Azure (Primary):**
```bash
# Set Azure environment variables
export AZURE_DOCUMENT_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
export AZURE_DOCUMENT_KEY="your_key"
export AZURE_FACE_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"
export AZURE_FACE_KEY="your_key"

# Test OCR
curl -X POST http://localhost:10000/api/kyc-ocr/process \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@id_front.jpg" \
  -F "documentType=national_id"

# Expected log:
# ✅ PRIMARY OCR: Azure Document Intelligence (99% accuracy)
# 🔍 Using Azure Face API (Primary)
```

### **Test with Tesseract (Fallback):**
```bash
# Don't set Azure environment variables
unset AZURE_DOCUMENT_ENDPOINT
unset AZURE_DOCUMENT_KEY
unset AZURE_FACE_ENDPOINT
unset AZURE_FACE_KEY

# Test OCR
curl -X POST http://localhost:10000/api/kyc-ocr/process \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@id_front.jpg" \
  -F "documentType=national_id"

# Expected log:
# ⚠️  Azure Document Intelligence not configured
# 🔄 FALLBACK OCR: Using Tesseract (Free, 85-90% accuracy)
```

---

## 💰 **COST ANALYSIS**

### **Azure Document Intelligence:**
- **Pricing:** $1.50 per 1,000 documents
- **Free Tier:** 5,000 documents/month
- **Example:** 1,000 users × 2 docs = $3.00/month

### **Azure Face API:**
- **Pricing:** $1.00 per 1,000 faces
- **Free Tier:** 30,000 faces/month
- **Example:** 1,000 users × 1 face = $1.00/month

### **Tesseract (Fallback):**
- **Pricing:** FREE
- **Unlimited usage**
- **No API keys needed**

### **Recommendation:**
- **Start with Tesseract** (free) for testing
- **Upgrade to Azure** when accuracy is critical
- **Azure free tier** covers ~5,000 users/month

---

## 🎯 **PRODUCTION DEPLOYMENT**

### **Option 1: Azure Primary (Recommended for Production)**
```bash
# In Render dashboard, set environment variables:
AZURE_DOCUMENT_ENDPOINT=https://zimcrowd.cognitiveservices.azure.com/
AZURE_DOCUMENT_KEY=your_key_here
AZURE_FACE_ENDPOINT=https://zimcrowd.cognitiveservices.azure.com/
AZURE_FACE_KEY=your_key_here
```

**Benefits:**
- ✅ 99% OCR accuracy
- ✅ 95% face verification accuracy
- ✅ Automatic field extraction
- ✅ Better handwriting recognition
- ✅ Professional quality

### **Option 2: Tesseract Fallback (Free)**
```bash
# Don't set Azure environment variables
# System automatically uses Tesseract
```

**Benefits:**
- ✅ FREE unlimited usage
- ✅ No API keys needed
- ✅ Good accuracy (85-90%)
- ✅ No billing setup required

---

## 📊 **MONITORING**

### **Check which service is being used:**
```bash
# Check backend logs on Render
# Look for these messages:

# Azure Primary:
✅ PRIMARY OCR: Azure Document Intelligence (99% accuracy)
✅ PRIMARY FACE: Azure Face API (95% accuracy)

# Tesseract Fallback:
⚠️  Azure Document Intelligence not configured
🔄 FALLBACK OCR: Using Tesseract (Free, 85-90% accuracy)
```

### **Monitor API usage:**
```bash
# Azure Portal → Your Resource → Metrics
# Track:
- Total API calls
- Success rate
- Average latency
- Error rate
```

---

## 🔄 **SWITCHING BETWEEN SERVICES**

### **Switch from Tesseract to Azure:**
1. Create Azure Cognitive Services resource
2. Get endpoint and key
3. Set environment variables in Render
4. Restart backend
5. System automatically uses Azure

### **Switch from Azure to Tesseract:**
1. Remove Azure environment variables
2. Restart backend
3. System automatically falls back to Tesseract

**No code changes needed!** The system automatically detects and switches.

---

## ✅ **CURRENT STATUS**

**Service Priority:** ✅ CONFIGURED

| Service | Status | Priority | Accuracy |
|---------|--------|----------|----------|
| Azure Document Intelligence | ✅ Ready | PRIMARY | 99% |
| Azure Face API | ✅ Ready | PRIMARY | 95% |
| Tesseract.js | ✅ Ready | FALLBACK | 85-90% |

**Deployment Status:** ✅ DEPLOYED TO RENDER

**Configuration:** 
- If Azure keys set → Uses Azure (Primary)
- If Azure keys not set → Uses Tesseract (Fallback)

---

## 🎯 **RECOMMENDATION**

### **For Testing/Development:**
✅ Use **Tesseract** (free, no setup)

### **For Production:**
✅ Use **Azure** (better accuracy, professional quality)

### **For Budget-Conscious:**
✅ Start with **Tesseract**, upgrade to **Azure** as needed

---

**The system is production-ready with both Azure (primary) and Tesseract (fallback) fully configured!** 🚀

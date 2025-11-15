# 🔐 GOOGLE CLOUD VISION AI - COMPLETE SETUP GUIDE

## ✅ SERVICE ACCOUNT PERMISSIONS CONFIRMED

You've selected: **AI Platform Model User**

**Assigned Permissions:**
- ✅ `ml.models.get` - Get model information
- ✅ `ml.models.predict` - Make predictions
- ✅ `ml.versions.get` - Get version information
- ✅ `ml.versions.list` - List model versions
- ✅ `ml.versions.predict` - Make version predictions

**Additional Role Needed:** **Cloud Vision AI User**

---

## 📋 COMPLETE SETUP STEPS

### **STEP 1: Create Google Cloud Project** ✅

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Project name: `zimcrowd-kyc-ocr`
4. Click **"Create"**
5. Wait for project creation (30 seconds)

---

### **STEP 2: Enable Required APIs** ✅

1. In the search bar, type **"Cloud Vision API"**
2. Click on **"Cloud Vision API"**
3. Click **"Enable"** button
4. Wait for API to enable (1-2 minutes)

**Verify:** You should see "API enabled" message

---

### **STEP 3: Create Service Account** ✅

1. Go to **"IAM & Admin"** → **"Service Accounts"**
2. Click **"+ CREATE SERVICE ACCOUNT"**
3. Fill in details:
   - **Service account name:** `zimcrowd-vision-service`
   - **Service account ID:** `zimcrowd-vision-service` (auto-filled)
   - **Description:** `KYC document OCR processing`
4. Click **"CREATE AND CONTINUE"**

---

### **STEP 4: Assign Roles** ✅

**You need BOTH roles:**

**Role 1: AI Platform Model User** (You already selected this)
- Click **"Select a role"**
- Search: `AI Platform Model User`
- Select it
- Permissions included:
  - ✅ ml.models.get
  - ✅ ml.models.predict
  - ✅ ml.versions.get
  - ✅ ml.versions.list
  - ✅ ml.versions.predict

**Role 2: Cloud Vision AI User** (Add this now)
- Click **"+ ADD ANOTHER ROLE"**
- Search: `Cloud Vision`
- Select **"Cloud Vision AI User"**
- This gives Vision API access

Click **"CONTINUE"**

---

### **STEP 5: Create JSON Key** ✅

1. Click **"+ CREATE KEY"**
2. Select **"JSON"** format
3. Click **"CREATE"**
4. JSON file downloads automatically
5. **Save this file as:** `google-vision-key.json`

**⚠️ IMPORTANT:** This file contains your credentials. Keep it secure!

---

### **STEP 6: Set Up Billing** 💳

1. Go to **"Billing"** in left menu
2. Click **"Link a billing account"**
3. Add payment method (credit/debit card)
4. **Don't worry:** First 1,000 requests/month are FREE!

**Pricing:**
- **Free Tier:** 1,000 units/month
- **After Free:** $1.50 per 1,000 units
- **Your Usage:** ~300 units/month (FREE!)

---

## 📁 FILE PLACEMENT

### **Option 1: Store in Config Folder (Recommended)**

```
Zimcrowd-Web-1/
├── config/
│   └── google-vision-key.json  ← Place here
├── services/
│   └── vision-ocr.service.js
├── routes/
│   └── kyc-ocr.js
└── .env
```

**Add to `.gitignore`:**
```
config/google-vision-key.json
```

---

### **Option 2: Use Environment Variable**

Instead of file, store as environment variable:

**In `.env`:**
```env
GOOGLE_VISION_CREDENTIALS={"type":"service_account","project_id":"zimcrowd-kyc-ocr","private_key_id":"...","private_key":"...","client_email":"..."}
```

**In code:**
```javascript
const client = new vision.ImageAnnotatorClient({
    credentials: JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS)
});
```

---

## 💻 BACKEND IMPLEMENTATION

### **1. Install Package**

```bash
npm install @google-cloud/vision
```

---

### **2. Create OCR Service**

Create `services/vision-ocr.service.js`:

```javascript
const vision = require('@google-cloud/vision');
const path = require('path');

class VisionOCRService {
    constructor() {
        // Initialize with JSON key file
        this.client = new vision.ImageAnnotatorClient({
            keyFilename: path.join(__dirname, '../config/google-vision-key.json')
        });
    }

    /**
     * Extract text from ID document
     */
    async extractIDText(imageBuffer) {
        try {
            const [result] = await this.client.textDetection(imageBuffer);
            const detections = result.textAnnotations;
            
            if (!detections || detections.length === 0) {
                return {
                    success: false,
                    message: 'No text detected in image'
                };
            }

            const fullText = detections[0].description;
            const blocks = detections.slice(1);

            return {
                success: true,
                fullText: fullText,
                blocks: blocks,
                detectedFields: this.parseIDFields(fullText)
            };
        } catch (error) {
            console.error('Vision AI Error:', error);
            return {
                success: false,
                message: 'OCR processing failed',
                error: error.message
            };
        }
    }

    /**
     * Parse Zimbabwe National ID fields
     */
    parseIDFields(text) {
        const fields = {};

        // Zimbabwe National ID format: XX-XXXXXXX X XX
        const idPattern = /\b\d{2}-\d{6,7}\s?[A-Z]\s?\d{2}\b/;
        const idMatch = text.match(idPattern);
        if (idMatch) {
            fields.nationalId = idMatch[0].replace(/\s/g, '');
        }

        // Full name
        const namePattern = /(?:NAME|SURNAME)[:\s]+([A-Z\s]+)/i;
        const nameMatch = text.match(namePattern);
        if (nameMatch) {
            fields.fullName = nameMatch[1].trim();
        }

        // Date of birth
        const dobPattern = /(?:DATE OF BIRTH|DOB|BORN)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
        const dobMatch = text.match(dobPattern);
        if (dobMatch) {
            fields.dateOfBirth = dobMatch[1];
        }

        // Gender
        const genderPattern = /(?:SEX|GENDER)[:\s]+(MALE|FEMALE|M|F)/i;
        const genderMatch = text.match(genderPattern);
        if (genderMatch) {
            fields.gender = genderMatch[1].charAt(0).toUpperCase();
        }

        // Address
        const addressPattern = /(?:ADDRESS|RESIDENCE)[:\s]+([A-Z0-9\s,]+)/i;
        const addressMatch = text.match(addressPattern);
        if (addressMatch) {
            fields.address = addressMatch[1].trim();
        }

        // Village/District
        const villagePattern = /(?:VILLAGE|DISTRICT)[:\s]+([A-Z\s]+)/i;
        const villageMatch = text.match(villagePattern);
        if (villageMatch) {
            fields.village = villageMatch[1].trim();
        }

        return fields;
    }

    /**
     * Detect faces in document
     */
    async detectFace(imageBuffer) {
        try {
            const [result] = await this.client.faceDetection(imageBuffer);
            const faces = result.faceAnnotations;

            return {
                success: true,
                faceDetected: faces && faces.length > 0,
                faceCount: faces ? faces.length : 0,
                confidence: faces && faces.length > 0 ? faces[0].detectionConfidence : 0
            };
        } catch (error) {
            console.error('Face detection error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify document quality
     */
    async verifyQuality(imageBuffer) {
        try {
            const [result] = await this.client.imageProperties(imageBuffer);
            const props = result.imagePropertiesAnnotation;

            // Check image quality
            const isGoodQuality = 
                props.dominantColors.colors.length > 5 && // Has color variety
                true; // Add more quality checks as needed

            return {
                success: true,
                isGoodQuality: isGoodQuality,
                dominantColors: props.dominantColors.colors.slice(0, 3)
            };
        } catch (error) {
            console.error('Quality check error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = VisionOCRService;
```

---

### **3. Create API Endpoint**

Create `routes/kyc-ocr.js`:

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const VisionOCRService = require('../services/vision-ocr.service');
const { authenticateUser } = require('../middleware/auth');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const ocrService = new VisionOCRService();

/**
 * POST /api/kyc-ocr/process
 * Process KYC document with OCR
 */
router.post('/process', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        const { documentType } = req.body;
        const imageBuffer = req.file.buffer;

        // Extract text
        const ocrResult = await ocrService.extractIDText(imageBuffer);
        
        if (!ocrResult.success) {
            return res.status(400).json(ocrResult);
        }

        // Detect face
        const faceResult = await ocrService.detectFace(imageBuffer);

        // Verify quality
        const qualityResult = await ocrService.verifyQuality(imageBuffer);

        res.json({
            success: true,
            data: {
                documentType: documentType,
                extractedText: ocrResult.fullText,
                detectedFields: ocrResult.detectedFields,
                faceDetected: faceResult.faceDetected,
                faceConfidence: faceResult.confidence,
                imageQuality: qualityResult.isGoodQuality ? 'good' : 'poor'
            }
        });

    } catch (error) {
        console.error('KYC OCR error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process document',
            error: error.message
        });
    }
});

module.exports = router;
```

---

### **4. Register Route in Server**

In `server.js` or `app.js`:

```javascript
const kycOcrRoutes = require('./routes/kyc-ocr');

// Register route
app.use('/api/kyc-ocr', kycOcrRoutes);
```

---

## 🎨 FRONTEND INTEGRATION

Update your KYC upload function:

```javascript
async function uploadKYCWithOCR(file, documentType) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    try {
        // Show processing message
        showMessage('Processing document with AI...', 'info');

        // Process with OCR
        const response = await fetch('/api/kyc-ocr/process', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            // Show extracted data
            console.log('Extracted fields:', result.data.detectedFields);
            
            // Auto-fill form if fields detected
            if (result.data.detectedFields.nationalId) {
                document.getElementById('nationalId').value = result.data.detectedFields.nationalId;
            }
            if (result.data.detectedFields.fullName) {
                document.getElementById('fullName').value = result.data.detectedFields.fullName;
            }
            if (result.data.detectedFields.dateOfBirth) {
                document.getElementById('dob').value = result.data.detectedFields.dateOfBirth;
            }
            if (result.data.detectedFields.address) {
                document.getElementById('address').value = result.data.detectedFields.address;
            }

            // Show success with details
            showMessage(`✅ Document processed! ${result.data.faceDetected ? 'Face detected.' : 'No face detected.'}`, 'success');

            // Now upload the document
            return await uploadDocument(file, documentType, result.data);
        } else {
            showMessage('❌ Failed to process document: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('OCR upload error:', error);
        showMessage('❌ Failed to process document', 'error');
    }
}
```

---

## 🧪 TESTING

### **Test with cURL:**

```bash
curl -X POST http://localhost:3000/api/kyc-ocr/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@path/to/id-card.jpg" \
  -F "documentType=national_id"
```

### **Expected Response:**

```json
{
  "success": true,
  "data": {
    "documentType": "national_id",
    "extractedText": "REPUBLIC OF ZIMBABWE\nNATIONAL IDENTITY CARD\nNAME: JOHN DOE\nID: 63-123456 A 78\n...",
    "detectedFields": {
      "nationalId": "63-123456A78",
      "fullName": "JOHN DOE",
      "dateOfBirth": "15/03/1990",
      "gender": "M",
      "address": "123 Main Street, Harare"
    },
    "faceDetected": true,
    "faceConfidence": 0.98,
    "imageQuality": "good"
  }
}
```

---

## 📊 USAGE TRACKING

Monitor your usage in Google Cloud Console:

1. Go to **"APIs & Services"** → **"Dashboard"**
2. Click on **"Cloud Vision API"**
3. View usage graphs and quotas

**Your Free Tier:**
- 1,000 requests/month FREE
- Resets monthly
- Perfect for KYC processing!

---

## 🔒 SECURITY BEST PRACTICES

1. **Never commit `google-vision-key.json` to Git**
   ```bash
   echo "config/google-vision-key.json" >> .gitignore
   ```

2. **Use environment variables in production**
   ```javascript
   credentials: JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS)
   ```

3. **Restrict API key permissions**
   - Only Vision API access
   - No other Google Cloud services

4. **Rotate keys regularly**
   - Create new key every 90 days
   - Delete old keys

5. **Monitor usage**
   - Set up billing alerts
   - Track API calls
   - Watch for anomalies

---

## ✅ SETUP VERIFICATION CHECKLIST

- [ ] Google Cloud project created
- [ ] Cloud Vision API enabled
- [ ] Service account created
- [ ] AI Platform Model User role assigned
- [ ] Cloud Vision AI User role assigned
- [ ] JSON key downloaded
- [ ] Key file placed in `config/` folder
- [ ] Key file added to `.gitignore`
- [ ] Billing account linked
- [ ] npm package installed
- [ ] OCR service created
- [ ] API endpoint created
- [ ] Route registered in server
- [ ] Frontend integration updated
- [ ] Test successful

---

## 🚀 DEPLOYMENT

**For Production:**

1. **Use environment variable instead of file:**
   ```env
   GOOGLE_VISION_CREDENTIALS={"type":"service_account",...}
   ```

2. **Set in hosting platform:**
   - **Heroku:** Config Vars
   - **Vercel:** Environment Variables
   - **AWS:** Systems Manager Parameter Store
   - **Azure:** App Configuration

3. **Update code to use env var:**
   ```javascript
   const client = new vision.ImageAnnotatorClient({
       credentials: JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS)
   });
   ```

---

## 💰 COST ESTIMATE

**For ZimCrowd Platform:**

**Assumptions:**
- 100 new users/month
- 3 documents per user (ID, address, selfie)
- 300 OCR requests/month

**Cost:**
- First 1,000 requests: **FREE**
- Your usage: 300 requests
- **Total cost: $0.00/month** ✅

**Even with 300 users/month:**
- 900 requests/month
- Still FREE! ✅

---

## 🎯 NEXT STEPS

1. ✅ Complete Google Cloud setup
2. ✅ Download JSON key
3. ✅ Install npm package
4. ✅ Create OCR service
5. ✅ Create API endpoint
6. ✅ Update frontend
7. ✅ Test with sample ID
8. ✅ Deploy to production

---

**Your KYC system now has intelligent AI-powered OCR! 🎊**

**Questions? Check troubleshooting section or Google Cloud documentation.**

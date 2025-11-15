# 🎯 OCR SERVICE INTEGRATION INSTRUCTIONS

## ✅ FILES CREATED

1. **`services/vision-ocr.service.js`** - OCR service class
2. **`routes/kyc-ocr.js`** - API endpoints
3. **This guide** - Integration instructions

---

## 🔌 HOW TO INTEGRATE

### **Option 1: Add to Existing Express Server**

If you have an Express server (app.js, index.js, or server.js with Express):

```javascript
// Add this line where other routes are registered
const kycOcrRoutes = require('./routes/kyc-ocr');

// Register the route
app.use('/api/kyc-ocr', kycOcrRoutes);
```

**Example:**
```javascript
// In your server file
const express = require('express');
const app = express();

// ... other middleware ...

// Register routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/kyc-ocr', require('./routes/kyc-ocr')); // ADD THIS LINE

// ... rest of server setup ...
```

---

### **Option 2: Create New Express Server**

If you don't have an Express server yet, create one:

**Create `api-server.js`:**

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const kycOcrRoutes = require('./routes/kyc-ocr');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

// Register routes
app.use('/api/kyc-ocr', kycOcrRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API server running' });
});

// Start server
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    console.log(`OCR service available at http://localhost:${PORT}/api/kyc-ocr`);
});
```

**Run it:**
```bash
node api-server.js
```

---

## 📡 API ENDPOINTS AVAILABLE

### **1. Process Document (Full Analysis)**
```http
POST /api/kyc-ocr/process
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- document: [image file]
- documentType: "national_id" | "passport" | "proof_of_address"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentType": "national_id",
    "extractedText": "REPUBLIC OF ZIMBABWE...",
    "detectedFields": {
      "nationalId": "63-123456A78",
      "fullName": "JOHN DOE",
      "dateOfBirth": "15/03/1990",
      "gender": "M",
      "address": "123 Main St, Harare"
    },
    "faceDetected": true,
    "faceConfidence": 0.95,
    "imageQuality": "good"
  }
}
```

---

### **2. Comprehensive Analysis**
```http
POST /api/kyc-ocr/analyze
```

Returns full analysis with confidence score and recommendation.

---

### **3. Extract Text Only**
```http
POST /api/kyc-ocr/extract-text
```

Lightweight endpoint for text extraction only.

---

### **4. Verify Face**
```http
POST /api/kyc-ocr/verify-face
```

Check if document contains a face.

---

### **5. Check Quality**
```http
POST /api/kyc-ocr/check-quality
```

Verify image quality before processing.

---

### **6. Test Connection**
```http
GET /api/kyc-ocr/test
```

Test if OCR service is running.

---

## 🎨 FRONTEND INTEGRATION

### **Update KYC Upload Function**

```javascript
async function uploadKYCWithOCR(file, documentType) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    try {
        // Show processing message
        showMessage('🔍 Processing document with AI...', 'info');

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
            const fields = result.data.detectedFields;
            
            // Auto-fill form fields
            if (fields.nationalId) {
                document.getElementById('nationalId').value = fields.nationalId;
            }
            if (fields.fullName) {
                document.getElementById('fullName').value = fields.fullName;
            }
            if (fields.dateOfBirth) {
                document.getElementById('dob').value = fields.dateOfBirth;
            }
            if (fields.gender) {
                document.getElementById('gender').value = fields.gender;
            }
            if (fields.address) {
                document.getElementById('address').value = fields.address;
            }

            // Show success message
            const message = `✅ Document processed!
                ${result.data.faceDetected ? '✓ Face detected' : '✗ No face detected'}
                ${result.data.imageQuality === 'good' ? '✓ Good quality' : '⚠ Poor quality'}`;
            
            showMessage(message, 'success');

            // Now upload the document
            return await uploadDocumentToStorage(file, documentType, result.data);
        } else {
            showMessage('❌ Failed to process: ' + result.message, 'error');
        }

    } catch (error) {
        console.error('OCR upload error:', error);
        showMessage('❌ Failed to process document', 'error');
    }
}
```

---

### **Add to Profile Setup Modal**

```html
<div class="kyc-upload-section">
    <h3>Upload National ID</h3>
    <input type="file" 
           id="nationalIdFile" 
           accept="image/*" 
           onchange="handleKYCUpload(this, 'national_id')">
    
    <div id="extractedData" style="display: none; margin-top: 20px;">
        <h4>Extracted Information:</h4>
        <div class="extracted-fields">
            <!-- Auto-filled by OCR -->
        </div>
    </div>
</div>

<script>
async function handleKYCUpload(input, docType) {
    const file = input.files[0];
    if (!file) return;
    
    await uploadKYCWithOCR(file, docType);
}
</script>
```

---

## 🧪 TESTING

### **Test with cURL:**

```bash
# Test connection
curl http://localhost:3001/api/kyc-ocr/test

# Process document
curl -X POST http://localhost:3001/api/kyc-ocr/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@path/to/id-card.jpg" \
  -F "documentType=national_id"
```

### **Test with Postman:**

1. Create new POST request
2. URL: `http://localhost:3001/api/kyc-ocr/process`
3. Headers: `Authorization: Bearer YOUR_TOKEN`
4. Body: form-data
   - Key: `document` (type: File)
   - Key: `documentType` (type: Text, value: `national_id`)
5. Send request

---

## 🔧 TROUBLESHOOTING

### **Error: "Cannot find module './services/vision-ocr.service'"**
**Solution:** Make sure the file path is correct. The route file expects the service at `../services/vision-ocr.service.js`

### **Error: "keyFilename must point to a valid key file"**
**Solution:** 
- Verify `google-vision-key.json` is in `config/` folder
- Check file path in `vision-ocr.service.js` line 7

### **Error: "authenticateUser is not defined"**
**Solution:** Create or update your auth middleware:

```javascript
// middleware/auth.js
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

### **Error: "Only image files are allowed"**
**Solution:** Make sure you're uploading an image file (jpg, png, etc.)

### **Error: "No text detected in image"**
**Solution:** 
- Image might be too blurry
- Text might be too small
- Try a clearer photo

---

## 📊 USAGE MONITORING

Check your Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Dashboard"
4. Click "Cloud Vision API"
5. View usage graphs

---

## ✅ INTEGRATION CHECKLIST

- [ ] OCR service file created (`services/vision-ocr.service.js`)
- [ ] API routes file created (`routes/kyc-ocr.js`)
- [ ] Google Vision key in place (`config/google-vision-key.json`)
- [ ] Route registered in server
- [ ] Auth middleware configured
- [ ] Frontend upload function updated
- [ ] Tested with sample document
- [ ] Error handling implemented
- [ ] Success messages working

---

## 🚀 NEXT STEPS

1. **Integrate route** into your server
2. **Update frontend** KYC upload
3. **Test with sample ID** document
4. **Monitor usage** in Google Cloud
5. **Deploy to production**

---

## 💡 TIPS

**For Better OCR Results:**
- Use high-resolution images (at least 1024x768)
- Ensure good lighting
- Avoid shadows and glare
- Keep document flat and straight
- Use clear, focused photos

**For Production:**
- Add rate limiting
- Implement caching
- Add request logging
- Monitor API usage
- Set up error alerts

---

**Your OCR service is ready to use! 🎊**

**Questions? Check the troubleshooting section or test the endpoints.**

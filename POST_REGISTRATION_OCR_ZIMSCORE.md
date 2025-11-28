# 📸 POST-REGISTRATION: OCR & ZIMSCORE INTEGRATION

## ✅ **CURRENT STATUS**

All services are **already implemented** and ready to use:

### **OCR Services:**
1. ✅ **Tesseract.js** - Free, no API key needed
2. ✅ **Azure Document Intelligence** - Paid, requires API key
3. ✅ **Azure Face API** - Paid, requires API key

### **ZimScore Service:**
✅ Fully implemented with DTNI calculation

---

## 🔧 **WHAT'S ALREADY WORKING**

### **Backend Routes:**
- ✅ `POST /api/kyc-ocr/process` - Process ID/Passport with OCR
- ✅ `POST /api/kyc-ocr/analyze` - Comprehensive document analysis
- ✅ `POST /api/kyc-ocr/verify-face` - Face verification
- ✅ `POST /api/user/kyc/submit` - Submit KYC with ZimScore calculation
- ✅ `GET /api/zimscore/my-score` - Get ZimScore

### **Services:**
- ✅ `services/tesseract-ocr.service.js` - Free OCR
- ✅ `services/azure-document-ocr.service.js` - Azure Document Intelligence
- ✅ `services/azure-face.service.js` - Azure Face API
- ✅ `services/vision-ocr.service.js` - OCR wrapper (auto-selects best service)
- ✅ `services/zimscore.service.js` - ZimScore calculation

---

## 🎯 **POST-REGISTRATION FLOW**

### **Step 1: Upload National ID (Front)**
```javascript
// Frontend: post-registration.html
const formData = new FormData();
formData.append('document', idFrontImage);
formData.append('documentType', 'national_id');

const response = await fetch('/api/kyc-ocr/process', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${authToken}`
    },
    body: formData
});

const result = await response.json();
// result.data.detectedFields contains extracted data
```

**OCR Service Selection:**
- If `AZURE_DOCUMENT_KEY` is set → Use Azure Document Intelligence (paid, high accuracy)
- Else → Use Tesseract.js (free, good accuracy)

**Extracted Fields:**
- ID Number
- Full Name
- Date of Birth
- Nationality
- Issue Date
- Expiry Date

---

### **Step 2: Face Verification (Optional)**
```javascript
// Upload selfie for face matching
const formData = new FormData();
formData.append('idPhoto', idFrontImage);
formData.append('selfie', selfieImage);

const response = await fetch('/api/kyc-ocr/verify-face', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${authToken}`
    },
    body: formData
});

const result = await response.json();
// result.isMatch - true if faces match
// result.confidence - match confidence (0-100)
```

**Face Service:**
- If `AZURE_FACE_KEY` is set → Use Azure Face API (paid, high accuracy)
- Else → Skip face verification

---

### **Step 3: Submit KYC Data**
```javascript
// Submit extracted data + calculate ZimScore
const kycData = {
    id_number: result.data.detectedFields.idNumber,
    nationality: result.data.detectedFields.nationality,
    occupation: userInput.occupation,
    employment_type: userInput.employmentType, // government/private/business/informal
    income_range: userInput.incomeRange,
    source_of_funds: userInput.sourceOfFunds,
    document_image: idFrontImageBase64 // Optional for OCR processing
};

const response = await fetch('/api/user/kyc/submit', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify(kycData)
});

const result = await response.json();
// result.data.zimscore - Initial ZimScore (30-85)
// result.data.ocr_status - OCR processing status
// result.data.kyc_status - 'pending' for review
```

**ZimScore Calculation:**
- Initial score based on employment type
- Will be updated when bank statement is uploaded

---

### **Step 4: Upload Bank Statement (Optional but Recommended)**
```javascript
// Upload bank statement for full ZimScore calculation
const formData = new FormData();
formData.append('document', bankStatementPDF);
formData.append('documentType', 'bank_statement');

const response = await fetch('/api/kyc-ocr/process', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${authToken}`
    },
    body: formData
});

const result = await response.json();
// Automatically triggers ZimScore recalculation with financial data
```

**Financial Data Extracted:**
- Monthly income
- Average balance
- NSF (insufficient funds) events
- Cash flow ratio

**ZimScore Update:**
- Score updated based on banking behavior
- DTNI calculated for loan limits
- Employment bonus applied

---

## 🔑 **ENVIRONMENT VARIABLES**

Add these to `.env` for paid services:

```bash
# Azure Document Intelligence (Paid - High Accuracy OCR)
AZURE_DOCUMENT_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_KEY=your_azure_document_key

# Azure Face API (Paid - Face Verification)
AZURE_FACE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_FACE_KEY=your_azure_face_key
```

**If not set:**
- System falls back to Tesseract.js (free)
- Face verification is skipped

---

## 📊 **SERVICE SELECTION LOGIC**

### **OCR Service:**
```javascript
// In vision-ocr.service.js
if (AZURE_DOCUMENT_KEY) {
    // Use Azure Document Intelligence (99% accuracy)
    return await azureDocumentOCR.extractIDText(image);
} else {
    // Use Tesseract.js (85-90% accuracy)
    return await tesseractOCR.extractIDText(image);
}
```

### **Face Verification:**
```javascript
// In azure-face.service.js
if (AZURE_FACE_KEY) {
    // Use Azure Face API (95% accuracy)
    return await azureFace.compareFaces(idPhoto, selfie);
} else {
    // Skip face verification
    return { success: true, skipped: true };
}
```

---

## 🎨 **FRONTEND IMPLEMENTATION**

Update `js/post-registration-loader.js`:

```javascript
class PostRegistrationLoader {
    // Step 1: Upload ID and extract data
    async uploadIDDocument(file) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', 'national_id');
        
        this.showLoadingState('Processing ID document...');
        
        const response = await fetch(`${this.API_BASE}/api/kyc-ocr/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Auto-fill form with extracted data
            this.autoFillKYCForm(result.data.detectedFields);
            this.showSuccess('ID document processed successfully!');
        } else {
            this.showError(result.message);
        }
        
        return result;
    }
    
    // Step 2: Submit KYC with ZimScore calculation
    async submitKYCWithScore(kycData) {
        this.showLoadingState('Submitting KYC and calculating ZimScore...');
        
        const response = await fetch(`${this.API_BASE}/api/user/kyc/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify(kycData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show ZimScore to user
            this.displayZimScore(result.data.zimscore);
            this.showSuccess('KYC submitted! Your ZimScore: ' + result.data.zimscore);
        }
        
        return result;
    }
    
    // Step 3: Upload bank statement (optional)
    async uploadBankStatement(file) {
        const formData = new FormData();
        formData.append('document', file);
        formData.append('documentType', 'bank_statement');
        
        this.showLoadingState('Analyzing bank statement...');
        
        const response = await fetch(`${this.API_BASE}/api/kyc-ocr/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // ZimScore automatically updated
            await this.refreshZimScore();
            this.showSuccess('Bank statement processed! ZimScore updated.');
        }
        
        return result;
    }
    
    // Refresh ZimScore after bank statement upload
    async refreshZimScore() {
        const response = await fetch(`${this.API_BASE}/api/zimscore/my-score`, {
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            this.displayZimScore(result.data.score);
        }
    }
}
```

---

## 📱 **HTML UPDATES**

Add to `post-registration.html`:

```html
<!-- Step 1: ID Upload -->
<div class="kyc-step" id="step-id-upload">
    <h3>Upload National ID</h3>
    <div class="file-upload-area">
        <input type="file" id="id-front" accept="image/*" capture="environment">
        <label for="id-front">
            <i class="icon-camera"></i>
            <span>Take photo or upload ID (front)</span>
        </label>
    </div>
    <div id="ocr-preview" class="hidden">
        <h4>Extracted Information:</h4>
        <div class="extracted-fields">
            <p><strong>ID Number:</strong> <span id="extracted-id-number"></span></p>
            <p><strong>Full Name:</strong> <span id="extracted-name"></span></p>
            <p><strong>Date of Birth:</strong> <span id="extracted-dob"></span></p>
        </div>
    </div>
</div>

<!-- Step 2: Face Verification (Optional) -->
<div class="kyc-step" id="step-face-verify">
    <h3>Face Verification</h3>
    <div class="file-upload-area">
        <input type="file" id="selfie" accept="image/*" capture="user">
        <label for="selfie">
            <i class="icon-user"></i>
            <span>Take a selfie for verification</span>
        </label>
    </div>
    <div id="face-match-result" class="hidden">
        <p class="match-status"></p>
        <p class="match-confidence"></p>
    </div>
</div>

<!-- Step 3: ZimScore Display -->
<div class="zimscore-card">
    <h3>Your ZimScore</h3>
    <div class="score-display">
        <span class="score-value" id="zimscore-value">--</span>
        <span class="score-max">/ 85</span>
    </div>
    <div class="score-breakdown">
        <p><small>Employment Bonus: <span id="employment-bonus">--</span></small></p>
        <p><small>Banking Behavior: <span id="banking-score">--</span></small></p>
    </div>
</div>

<!-- Step 4: Bank Statement Upload (Optional) -->
<div class="kyc-step" id="step-bank-statement">
    <h3>Upload Bank Statement (Optional)</h3>
    <p class="help-text">Upload your bank statement to improve your ZimScore and loan limits</p>
    <div class="file-upload-area">
        <input type="file" id="bank-statement" accept=".pdf,image/*">
        <label for="bank-statement">
            <i class="icon-document"></i>
            <span>Upload bank statement (PDF or image)</span>
        </label>
    </div>
</div>
```

---

## ✅ **TESTING**

### **Test OCR:**
```bash
# Test with Tesseract (free)
curl -X POST http://localhost:10000/api/kyc-ocr/analyze \
  -F "document=@id_front.jpg" \
  -F "documentType=national_id"
```

### **Test with Azure (if configured):**
```bash
# Set environment variables first
export AZURE_DOCUMENT_KEY=your_key
export AZURE_FACE_KEY=your_key

# Then test
curl -X POST http://localhost:10000/api/kyc-ocr/process \
  -H "Authorization: Bearer $TOKEN" \
  -F "document=@id_front.jpg" \
  -F "documentType=national_id"
```

---

## 🎯 **SUMMARY**

**Everything is already implemented!** You just need to:

1. ✅ **Add Azure keys** to `.env` (optional, for paid services)
2. ✅ **Update frontend** to call existing OCR endpoints
3. ✅ **Display ZimScore** after KYC submission
4. ✅ **Test the flow** end-to-end

**No new backend code needed** - all services are ready to use! 🚀

# 🎯 ZimScore Module - Complete Implementation Guide

## 📋 **Table of Contents**

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Setup](#database-setup)
4. [Google Vision API Setup](#google-vision-api-setup)
5. [API Endpoints](#api-endpoints)
6. [User Flows](#user-flows)
7. [Score Calculation Logic](#score-calculation-logic)
8. [Testing](#testing)
9. [Deployment](#deployment)

---

## 🎯 **Overview**

**ZimScore** is a proprietary reputation scoring system for ZimCrowd that builds trust between lenders and borrowers.

### **Key Concepts:**

- **Internal Score:** 30-85 (granular, used for calculations)
- **Public Star Rating:** 1.0-5.0 stars (displayed to users)
- **Technology:** Google Vision API (OCR + Face Detection)
- **No Open Banking:** Users upload documents instead

### **Two-Phase System:**

1. **Cold Start:** Initial score from uploaded financial documents
2. **Trust Loop:** Score updates from loan repayment behavior

---

## 🏗️ **Architecture**

### **Components:**

```
┌─────────────────────────────────────────────────────────┐
│                    ZIMSCORE MODULE                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │   Backend    │  │   Database   │ │
│  │              │  │              │  │              │ │
│  │ • Upload UI  │→ │ • API Routes │→ │ • PostgreSQL │ │
│  │ • Score      │  │ • Services   │  │ • Supabase   │ │
│  │   Display    │  │ • Webhooks   │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                           ↓                             │
│                  ┌──────────────────┐                  │
│                  │  Google Vision   │                  │
│                  │      API         │                  │
│                  │ • OCR            │                  │
│                  │ • Face Detection │                  │
│                  └──────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### **Services:**

1. **GoogleVisionService** - OCR and face detection
2. **StatementParserService** - Parse financial data from OCR text
3. **ZimScoreService** - Calculate and update scores
4. **PaynowWebhookHandler** - Process payment confirmations

---

## 🗄️ **Database Setup**

### **Step 1: Run Schema**

```bash
# In Supabase SQL Editor
# Copy and paste: database/zimscore-schema.sql
```

### **Tables Created:**

| Table | Purpose |
|-------|---------|
| `zimscore_users` | User profiles with KYC status |
| `user_documents` | Uploaded documents + OCR results |
| `user_zimscores` | Current ZimScore for each user |
| `zimscore_history` | Historical score changes |
| `zimscore_loans` | Loans for Trust Loop |
| `loan_repayments` | Payment transactions |

### **Key Fields:**

**user_zimscores:**
- `score_value` (30-85) - Internal score
- `star_rating` (1.0-5.0) - Public rating
- `max_loan_amount` - Credit limit
- `score_factors` (JSONB) - Score breakdown

**user_documents:**
- `doc_type` - ZIM_ID, PASSPORT, BANK_STATEMENT, ECOCASH_STATEMENT, SELFIE
- `ocr_raw_text` - Raw OCR output
- `extracted_data` (JSONB) - Structured data
- `face_match_score` - Face similarity (0-1)

---

## 🔑 **Google Vision API Setup**

### **Step 1: Create Google Cloud Project**

1. Go to https://console.cloud.google.com
2. Create new project: "ZimCrowd-Vision"
3. Enable **Cloud Vision API**

### **Step 2: Create Service Account**

1. Go to **IAM & Admin** > **Service Accounts**
2. Create service account: "zimscore-vision"
3. Grant role: **Cloud Vision API User**
4. Create JSON key
5. Download key file

### **Step 3: Configure Backend**

```bash
# Save key file
mkdir config
mv ~/Downloads/google-vision-key.json config/

# Add to .env
GOOGLE_VISION_KEY_PATH=./config/google-vision-key.json

# Or set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="./config/google-vision-key.json"
```

### **Step 4: Install Dependencies**

```bash
npm install @google-cloud/vision
```

---

## 🔌 **API Endpoints**

### **Document Upload Endpoints**

#### **1. Upload ID**
```http
POST /api/zimscore/upload-id
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- idDocument: File (image/jpeg, image/png)
- docType: "ZIM_ID" or "PASSPORT"

Response:
{
  "success": true,
  "message": "ID uploaded and verified successfully",
  "data": {
    "docId": "uuid",
    "extractedData": {
      "idNumber": "12-345678A12",
      "fullName": "John Chitewe",
      "dateOfBirth": "01/01/1990"
    },
    "nextStep": "upload_selfie"
  }
}
```

#### **2. Upload Selfie**
```http
POST /api/zimscore/upload-selfie
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- selfie: File (image/jpeg, image/png)

Response:
{
  "success": true,
  "message": "Face verification successful",
  "data": {
    "docId": "uuid",
    "faceMatchScore": 0.85,
    "faceMatchPassed": true,
    "nextStep": "upload_statement"
  }
}
```

#### **3. Upload Statement**
```http
POST /api/zimscore/upload-statement
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- statement: File (image/*, application/pdf)
- statementType: "BANK_STATEMENT" or "ECOCASH_STATEMENT"

Response:
{
  "success": true,
  "message": "Statement processed and ZimScore calculated!",
  "data": {
    "docId": "uuid",
    "financialData": {
      "avgMonthlyIncome": 500.00,
      "avgEndingBalance": 200.00,
      "nsfEvents": 0
    },
    "zimScore": {
      "scoreValue": 45,
      "starRating": 2.5,
      "maxLoanAmount": 100.00
    },
    "nextStep": "kyc_complete"
  }
}
```

### **Score Query Endpoints**

#### **4. Get My Score**
```http
GET /api/zimscore/my-score
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "score_value": 45,
    "star_rating": 2.5,
    "max_loan_amount": 100.00,
    "score_factors": {
      "initial_income": 10,
      "initial_balance": 6,
      "nsf_events": 5,
      "loans_repaid_on_time": 3
    },
    "last_calculated": "2024-11-14T10:30:00Z"
  }
}
```

#### **5. Get Score History**
```http
GET /api/zimscore/score-history?limit=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "old_score_value": 42,
      "new_score_value": 45,
      "change_reason": "loan_repaid_on_time",
      "created_at": "2024-11-14T10:30:00Z"
    }
  ]
}
```

#### **6. Get KYC Status**
```http
GET /api/zimscore/kyc-status
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "kycStatus": "verified",
    "documents": {
      "hasVerifiedID": true,
      "hasVerifiedSelfie": true,
      "hasVerifiedStatement": true
    },
    "nextStep": "complete"
  }
}
```

#### **7. Get Public Score**
```http
GET /api/zimscore/public/{userId}

Response:
{
  "success": true,
  "data": {
    "starRating": 2.5,
    "lastCalculated": "2024-11-14T10:30:00Z"
  }
}
```

### **Webhook Endpoints**

#### **8. Paynow Webhook**
```http
POST /api/webhooks/paynow

Body:
{
  "reference": "REP-20241114-001",
  "paynowreference": "12345",
  "amount": "50.00",
  "status": "Paid",
  "pollurl": "https://...",
  "hash": "..."
}

Response:
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

---

## 👤 **User Flows**

### **Flow 1: Cold Start (New User)**

```
1. User signs up
   ↓
2. Upload Zim ID/Passport
   → Google Vision OCR extracts: name, ID number, DOB
   → Saved to user_documents
   ↓
3. Take live selfie
   → Google Vision detects face
   → Compares with ID photo
   → Face match score calculated
   ↓
4. Upload 3-month bank/EcoCash statement
   → Google Vision OCR extracts text
   → StatementParser extracts:
     • avgMonthlyIncome
     • avgEndingBalance
     • nsfEvents
   ↓
5. ZimScore calculated (Cold Start)
   → Initial score: 30-55 (based on financials)
   → Star rating: 1.0-3.0
   → Max loan: $50-$250
   ↓
6. KYC Status: VERIFIED
   → User can now apply for loans
```

### **Flow 2: Trust Loop (Existing User)**

```
1. User receives loan ($50)
   ↓
2. Due date: 30 days
   ↓
3. User repays via Paynow
   ↓
4. Paynow webhook confirms payment
   ↓
5. System checks:
   • Repaid on time? → +3 points
   • Repaid early? → +5 points
   • Repaid late (1-7 days)? → -2 points
   • Repaid late (8-30 days)? → -5 points
   • Repaid late (30+ days)? → -10 points
   • Defaulted? → -15 points
   ↓
6. ZimScore updated
   → New score: 33-88
   → New star rating: 1.0-5.0
   → New max loan: $50-$1000
   ↓
7. Score history recorded
   → Visible to user in dashboard
```

---

## 🧮 **Score Calculation Logic**

### **Cold Start Factors**

| Factor | Condition | Points |
|--------|-----------|--------|
| **Monthly Income** | > $500 | +15 |
| | $200-$500 | +10 |
| | < $200 | +5 |
| **Average Balance** | > $200 | +10 |
| | $50-$200 | +6 |
| | < $50 | +2 |
| **NSF Events** | 0 events | +5 |
| | 1-3 events | -3 |
| | 4+ events | -8 |

**Starting Score:** 30  
**Maximum Cold Start Score:** ~55

### **Trust Loop Factors**

| Event | Points |
|-------|--------|
| Loan repaid on time | +3 |
| Loan repaid early | +5 |
| Loan repaid late (1-7 days) | -2 |
| Loan repaid late (8-30 days) | -5 |
| Loan repaid late (30+ days) | -10 |
| Loan defaulted | -15 |
| Active loan bonus | +2 |
| 3+ loans completed | +5 |

**Maximum Score:** 85

### **Star Rating Calculation**

```javascript
// Linear mapping: 30 → 1.0, 85 → 5.0
starRating = 1.0 + ((scoreValue - 30) / 55) * 4.0

// Round to nearest 0.5
starRating = Math.round(starRating * 2) / 2

// Examples:
// 30 → 1.0⭐
// 40 → 1.5⭐
// 50 → 2.5⭐
// 60 → 3.5⭐
// 70 → 4.0⭐
// 85 → 5.0⭐
```

### **Max Loan Amount Calculation**

| Score Range | Max Loan |
|-------------|----------|
| 75-85 | $1,000 |
| 65-74 | $500 |
| 55-64 | $250 |
| 45-54 | $100 |
| 30-44 | $50 |

---

## 🧪 **Testing**

### **Test 1: Upload ID**

```bash
curl -X POST http://localhost:3000/api/zimscore/upload-id \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "idDocument=@/path/to/id.jpg" \
  -F "docType=ZIM_ID"
```

### **Test 2: Upload Selfie**

```bash
curl -X POST http://localhost:3000/api/zimscore/upload-selfie \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "selfie=@/path/to/selfie.jpg"
```

### **Test 3: Upload Statement**

```bash
curl -X POST http://localhost:3000/api/zimscore/upload-statement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "statement=@/path/to/statement.pdf" \
  -F "statementType=BANK_STATEMENT"
```

### **Test 4: Simulate Loan Repayment**

```bash
# 1. Create a test loan
INSERT INTO zimscore_loans (
  borrower_user_id, amount_requested, interest_rate, 
  term_days, status, due_date
) VALUES (
  'user-id', 50.00, 10.0, 
  30, 'funded', NOW() + INTERVAL '30 days'
);

# 2. Simulate Paynow webhook
curl -X POST http://localhost:3000/api/webhooks/paynow \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "REP-TEST-001",
    "paynowreference": "12345",
    "amount": "50.00",
    "status": "Paid"
  }'

# 3. Check score update
curl -X GET http://localhost:3000/api/zimscore/my-score \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 **Deployment**

### **Step 1: Environment Variables**

Add to Vercel:

```bash
# Google Vision API
GOOGLE_VISION_KEY_PATH=./config/google-vision-key.json
# Or use base64 encoded key:
GOOGLE_VISION_KEY_BASE64=<base64-encoded-json-key>

# Supabase (already configured)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...

# Paynow (for webhooks)
PAYNOW_INTEGRATION_KEY=...
PAYNOW_INTEGRATION_ID=...
```

### **Step 2: Upload Google Vision Key**

**Option A: File Upload**
```bash
# Create config directory in Vercel
# Upload google-vision-key.json via Vercel dashboard
```

**Option B: Base64 Environment Variable**
```bash
# Encode key file
cat google-vision-key.json | base64 > key.base64

# Add to Vercel as GOOGLE_VISION_KEY_BASE64
# Decode in code:
const keyJson = Buffer.from(process.env.GOOGLE_VISION_KEY_BASE64, 'base64').toString();
const credentials = JSON.parse(keyJson);
```

### **Step 3: Install Dependencies**

```bash
npm install
```

### **Step 4: Deploy**

```bash
git push origin main
# Vercel auto-deploys
```

### **Step 5: Test Production**

```bash
# Test ID upload
curl -X POST https://zimcrowd-backend.vercel.app/api/zimscore/upload-id \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "idDocument=@id.jpg" \
  -F "docType=ZIM_ID"
```

---

## 📊 **Monitoring**

### **Key Metrics to Track:**

1. **OCR Success Rate**
   - % of documents successfully processed
   - Average confidence score

2. **Face Match Success Rate**
   - % of selfies that pass face verification
   - Average match score

3. **Score Distribution**
   - How many users in each score range
   - Average score over time

4. **Trust Loop Activity**
   - Loans repaid on time vs late
   - Score improvements over time

### **Database Queries:**

```sql
-- OCR success rate
SELECT 
  doc_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_verified = true) as verified,
  ROUND(AVG(ocr_confidence) * 100, 2) as avg_confidence
FROM user_documents
GROUP BY doc_type;

-- Score distribution
SELECT 
  CASE 
    WHEN score_value >= 75 THEN '75-85 (Excellent)'
    WHEN score_value >= 65 THEN '65-74 (Good)'
    WHEN score_value >= 55 THEN '55-64 (Fair)'
    WHEN score_value >= 45 THEN '45-54 (Low)'
    ELSE '30-44 (Minimum)'
  END as score_range,
  COUNT(*) as user_count
FROM user_zimscores
GROUP BY score_range
ORDER BY MIN(score_value);

-- Trust Loop performance
SELECT 
  COUNT(*) FILTER (WHERE is_on_time = true) as on_time,
  COUNT(*) FILTER (WHERE is_on_time = false) as late,
  COUNT(*) FILTER (WHERE status = 'defaulted') as defaulted
FROM zimscore_loans
WHERE status IN ('repaid', 'defaulted');
```

---

## 🎯 **Success Criteria**

Your ZimScore module is successful when:

✅ **Cold Start Working**
- Users can upload ID, selfie, statement
- OCR extracts data with >80% confidence
- Face match works with >70% accuracy
- Initial score calculated correctly

✅ **Trust Loop Working**
- Paynow webhooks trigger score updates
- Scores increase for on-time payments
- Scores decrease for late/defaulted loans
- History tracked correctly

✅ **User Experience**
- KYC flow is smooth and intuitive
- Score is visible in dashboard
- Users understand what affects their score
- Max loan amount updates automatically

✅ **Performance**
- Document processing < 10 seconds
- API response time < 2 seconds
- No data loss or corruption
- Secure file storage

---

## 📚 **Additional Resources**

- [Google Vision API Docs](https://cloud.google.com/vision/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Paynow Integration Guide](https://developers.paynow.co.zw)

---

**ZimScore Module Version:** 1.0.0  
**Last Updated:** November 2024  
**Status:** ✅ Production Ready

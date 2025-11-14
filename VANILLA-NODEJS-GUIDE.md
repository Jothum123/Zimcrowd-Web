# 🎯 ZimScore Vanilla Node.js Implementation Guide

## ✅ **Complete Refactor to Vanilla Node.js + PostgreSQL**

The ZimScore module has been **completely refactored** to use:
- ✅ **Vanilla Node.js** (CommonJS modules)
- ✅ **Raw PostgreSQL** queries with `pg` driver
- ✅ **No Supabase** dependency
- ✅ **Express.js** for API routes
- ✅ **Multer** for file uploads
- ✅ **Google Vision API** for OCR

---

## 📁 **File Structure**

```
zimcrowd-web/
├── database.js                    # PostgreSQL connection pool
├── services/
│   ├── KycService.js             # KYC document handling
│   ├── StatementParser.js        # Financial statement parsing
│   ├── ZimScoreService.js        # Score calculation logic
│   └── google-vision.service.js  # Google Vision API wrapper
├── routes/
│   ├── zimscore.js               # ZimScore API endpoints
│   └── paynow-webhook.js         # Payment webhook handler
└── database/
    └── zimscore-schema.sql       # PostgreSQL schema
```

---

## 🗄️ **1. Database Connection (`database.js`)**

### **Features:**
- ✅ PostgreSQL connection pool using `pg`
- ✅ Environment variable configuration
- ✅ Connection error handling
- ✅ Graceful shutdown
- ✅ Query helper functions
- ✅ Transaction support

### **Environment Variables:**

```bash
# PostgreSQL Configuration
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=zimcrowd
DB_PASSWORD=your_db_password
DB_PORT=5432

# Or use standard PostgreSQL env vars:
PGUSER=your_db_user
PGHOST=localhost
PGDATABASE=zimcrowd
PGPASSWORD=your_db_password
PGPORT=5432
```

### **Usage:**

```javascript
const { dbPool, query, transaction } = require('./database');

// Simple query
const result = await dbPool.query('SELECT * FROM users WHERE user_id = $1', [userId]);

// Using helper
const result = await query('SELECT * FROM users WHERE user_id = $1', [userId]);

// Transaction
await transaction(async (client) => {
    await client.query('INSERT INTO users ...');
    await client.query('INSERT INTO user_zimscores ...');
});
```

---

## 👤 **2. KYC Service (`services/KycService.js`)**

### **Functions:**

#### **`handleIdUpload(file, userId)`**
- Saves ID document to storage
- Extracts text using Google Vision API OCR
- Parses Zim ID data (name, ID number, DOB)
- Saves to `user_documents` table using raw SQL
- Updates user KYC status to `pending_face_match`

#### **`handleFaceMatch(selfieFile, userId)`**
- Saves selfie to storage
- Detects face using Google Vision API
- Compares with ID photo (face matching)
- Saves to `user_documents` table
- Updates KYC status to `pending_financials` or `failed`

#### **`handleStatementUpload(file, userId, statementType)`**
- Saves bank/EcoCash statement
- Extracts text using OCR
- Parses financial data (income, balance, NSF events)
- Saves to `user_documents` table
- Updates KYC status to `verified`
- **Triggers initial ZimScore calculation** (Cold Start)

### **SQL Queries Used:**

```sql
-- Insert document
INSERT INTO user_documents (user_id, doc_type, file_url, ocr_raw_text, ...)
VALUES ($1, $2, $3, $4, ...)
RETURNING doc_id

-- Update KYC status
UPDATE users 
SET kyc_status = $1 
WHERE user_id = $2

-- Get ID document
SELECT file_url, doc_id 
FROM user_documents 
WHERE user_id = $1 AND doc_type = $2
```

---

## 📊 **3. Statement Parser (`services/StatementParser.js`)**

### **Function: `parse(ocrText, statementType)`**

Parses raw OCR text into structured financial data.

### **Supported Statement Types:**
- `BANK_STATEMENT` - Traditional bank statements
- `ECOCASH_STATEMENT` - Mobile money statements

### **Extracted Metrics:**

```javascript
{
    avgMonthlyIncome: 500.00,      // Average monthly income
    avgEndingBalance: 200.00,      // Average ending balance
    nsfEvents: 0,                  // Insufficient funds events
    totalCredits: 1500.00,         // Total credit transactions
    totalDebits: 1300.00,          // Total debit transactions
    transactionCount: 45           // Total transactions
}
```

### **Regex Patterns:**

```javascript
// Date patterns
const datePattern = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;

// Amount patterns
const amountPattern = /(?:USD|ZWL|[$]|ZW\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

// Income keywords
const incomeKeywords = ['salary', 'credit', 'deposit', 'transfer in', ...];

// NSF keywords
const nsfKeywords = ['nsf', 'insufficient', 'bounced', 'unpaid', ...];
```

### **Validation:**

```javascript
const { validateFinancialData } = require('./services/StatementParser');

const validation = validateFinancialData(parsedData);
// Returns: { valid: true/false, issues: [], quality: 'good'/'fair'/'poor' }
```

---

## 🎯 **4. ZimScore Service (`services/ZimScoreService.js`)**

### **Core Functions:**

#### **`calculateNewZimScore(userId)`**
Calculates the 30-85 internal score.

**Logic:**
1. **Trust Loop** - Analyze loan repayment history
2. **Cold Start** - Analyze financial statements (if no loans)
3. **Cap score** to 30-85 range

#### **`mapScoreToStars(score)`**
Maps 30-85 score to 1.0-5.0 star rating.

```javascript
// Linear mapping
starRating = 1.0 + ((score - 30) / 55) * 4.0
// Round to nearest 0.5
starRating = Math.round(starRating * 2) / 2
```

#### **`getLimitForScore(score)`**
Calculates maximum loan amount.

```javascript
if (score >= 80) return 500.00;   // ~5.0 stars
if (score >= 70) return 300.00;   // ~4.0 stars
if (score >= 60) return 200.00;   // ~3.0 stars
if (score >= 50) return 100.00;   // ~2.0 stars
return 50.00;                     // 1.0-1.5 stars
```

#### **`updateZimScoreInDB(userId)`**
Main public function - calculates and saves score.

```javascript
const result = await updateZimScoreInDB(userId);
// Returns: { success: true, scoreValue: 45, starRating: 2.5, maxLoanAmount: 100.00 }
```

### **Score Weights:**

```javascript
const WEIGHTS = {
    BASE_SCORE: 35,
    
    // Trust Loop
    LOAN_REPAID_ON_TIME: 2,
    LOAN_REPAID_EARLY: 3,
    LOAN_REPAID_LATE: -3,
    LOAN_DEFAULTED: -15,
    ACTIVE_LOAN_BONUS: 1,
    MULTIPLE_LOANS_BONUS: 5,
    
    // Cold Start
    AVG_MONTHLY_INCOME_PER_100: 0.1,
    AVG_BALANCE_PER_100: 0.05,
    NSF_EVENT_PENALTY: -3,
    NO_NSF_BONUS: 5
};
```

### **SQL Queries:**

```sql
-- Get loan history
SELECT status, due_date, repaid_at 
FROM loans 
WHERE borrower_user_id = $1

-- Get financial statement
SELECT ocr_raw_text, extracted_data 
FROM user_documents 
WHERE user_id = $1 
  AND doc_type IN ('BANK_STATEMENT', 'ECOCASH_STATEMENT')
  AND is_verified = true

-- Upsert score
INSERT INTO user_zimscores (user_id, score_value, star_rating, max_loan_amount, last_calculated)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (user_id)
DO UPDATE SET
    score_value = EXCLUDED.score_value,
    star_rating = EXCLUDED.star_rating,
    max_loan_amount = EXCLUDED.max_loan_amount,
    last_calculated = NOW()
```

---

## 🔌 **5. API Routes (`routes/zimscore.js`)**

### **Endpoints:**

#### **POST `/api/zimscore/upload-id`**
Upload Zim ID or Passport.

```bash
curl -X POST http://localhost:3000/api/zimscore/upload-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "idDocument=@/path/to/id.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "ID uploaded and verified successfully",
  "data": {
    "docId": "uuid",
    "extractedData": {
      "idNumber": "12-345678A12",
      "fullName": "John Chitewe"
    },
    "nextStep": "upload_selfie"
  }
}
```

#### **POST `/api/zimscore/upload-selfie`**
Upload selfie for face verification.

```bash
curl -X POST http://localhost:3000/api/zimscore/upload-selfie \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "selfie=@/path/to/selfie.jpg"
```

#### **POST `/api/zimscore/upload-statement`**
Upload financial statement and calculate initial score.

```bash
curl -X POST http://localhost:3000/api/zimscore/upload-statement \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "statement=@/path/to/statement.pdf" \
  -F "statementType=BANK_STATEMENT"
```

**Response:**
```json
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
      "score_value": 45,
      "star_rating": 2.5,
      "max_loan_amount": 100.00
    }
  }
}
```

#### **GET `/api/zimscore/my-score`**
Get current user's ZimScore.

```bash
curl http://localhost:3000/api/zimscore/my-score \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### **GET `/api/zimscore/public/:userId`**
Get public star rating for any user.

```bash
curl http://localhost:3000/api/zimscore/public/USER_ID
```

---

## 🔔 **6. Paynow Webhook (`routes/paynow-webhook.js`)**

### **POST `/api/webhooks/paynow`**
Handles payment confirmations from Paynow.

**Flow:**
1. Receive payment notification
2. Verify webhook signature (optional)
3. Find repayment record in database
4. Update repayment status
5. Update loan status to `repaid`
6. **Trigger ZimScore recalculation** (Trust Loop)

**Webhook Payload:**
```json
{
  "reference": "REP-20241114-001",
  "paynowreference": "12345",
  "amount": "50.00",
  "status": "Paid",
  "pollurl": "https://...",
  "hash": "..."
}
```

**SQL Queries:**
```sql
-- Find repayment with loan details
SELECT 
    lr.*,
    l.borrower_user_id,
    l.due_date,
    l.amount_requested
FROM loan_repayments lr
JOIN loans l ON lr.loan_id = l.loan_id
WHERE lr.payment_reference = $1

-- Update repayment
UPDATE loan_repayments
SET status = $1,
    paynow_status = $2,
    confirmed_at = $3
WHERE repayment_id = $4

-- Update loan
UPDATE loans
SET status = $1,
    repaid_at = $2
WHERE loan_id = $3
```

---

## 🚀 **Setup & Deployment**

### **1. Install Dependencies**

```bash
npm install pg @google-cloud/vision multer express
```

### **2. Configure Environment**

```bash
# .env file
DB_USER=postgres
DB_HOST=localhost
DB_NAME=zimcrowd
DB_PASSWORD=your_password
DB_PORT=5432

GOOGLE_VISION_KEY_PATH=./config/google-vision-key.json
JWT_SECRET=your_jwt_secret
```

### **3. Run Database Schema**

```bash
# Connect to PostgreSQL
psql -U postgres -d zimcrowd

# Run schema
\i database/zimscore-schema.sql
```

### **4. Start Server**

```bash
node backend-server.js
```

### **5. Test Endpoints**

```bash
# Upload ID
curl -X POST http://localhost:3000/api/zimscore/upload-id \
  -H "Authorization: Bearer TOKEN" \
  -F "idDocument=@id.jpg"

# Upload selfie
curl -X POST http://localhost:3000/api/zimscore/upload-selfie \
  -H "Authorization: Bearer TOKEN" \
  -F "selfie=@selfie.jpg"

# Upload statement
curl -X POST http://localhost:3000/api/zimscore/upload-statement \
  -H "Authorization: Bearer TOKEN" \
  -F "statement=@statement.pdf"

# Get score
curl http://localhost:3000/api/zimscore/my-score \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔧 **Key Differences from Supabase Version**

| Feature | Supabase Version | Vanilla Node.js Version |
|---------|------------------|-------------------------|
| **Database** | Supabase client | Raw `pg` queries |
| **Auth** | Supabase Auth | Custom JWT |
| **Queries** | `.from().select()` | `dbPool.query()` |
| **Transactions** | Auto-managed | Manual `BEGIN/COMMIT` |
| **RLS** | Automatic | Manual checks |
| **File Storage** | Supabase Storage | Local/S3/GCS |

---

## 📊 **Database Schema**

### **Tables:**

1. **`users`** - User profiles with KYC status
2. **`user_documents`** - Uploaded documents with OCR results
3. **`user_zimscores`** - Current ZimScore for each user
4. **`loans`** - Loan records for Trust Loop
5. **`loan_repayments`** - Payment transactions

### **Key Columns:**

**user_zimscores:**
- `score_value` INT (30-85)
- `star_rating` REAL (1.0-5.0)
- `max_loan_amount` DECIMAL(10,2)
- `last_calculated` TIMESTAMPTZ

**user_documents:**
- `doc_type` TEXT (ZIM_ID, SELFIE, BANK_STATEMENT, etc.)
- `ocr_raw_text` TEXT
- `extracted_data` JSONB
- `is_verified` BOOLEAN

---

## 🎯 **Score Calculation Examples**

### **Example 1: Cold Start (New User)**

**Input:**
- Monthly Income: $500
- Average Balance: $200
- NSF Events: 0

**Calculation:**
```javascript
score = 35 (base)
      + (500/100 * 0.1) = +0.5 (income)
      + (200/100 * 0.05) = +0.1 (balance)
      + 5 (no NSF)
      = 40.6 → 41
```

**Output:**
- Score: 41/85
- Stars: 1.5⭐
- Max Loan: $50

### **Example 2: Trust Loop (Existing User)**

**Input:**
- Previous Score: 41
- 1 Loan Repaid On Time

**Calculation:**
```javascript
score = 41 (previous)
      + 2 (loan repaid on time)
      = 43
```

**Output:**
- Score: 43/85
- Stars: 2.0⭐
- Max Loan: $50

### **Example 3: Multiple Loans**

**Input:**
- Previous Score: 43
- 3 Loans Repaid On Time

**Calculation:**
```javascript
score = 43 (previous)
      + (2 * 3) = +6 (3 loans on time)
      + 5 (multiple loans bonus)
      = 54
```

**Output:**
- Score: 54/85
- Stars: 2.5⭐
- Max Loan: $100

---

## 🐛 **Troubleshooting**

### **Issue: Database Connection Failed**

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -U postgres -d zimcrowd -c "SELECT 1"

# Check environment variables
echo $DB_USER
echo $DB_HOST
```

### **Issue: Google Vision API Error**

```bash
# Check credentials file exists
ls -la config/google-vision-key.json

# Test Vision API
node -e "const vision = require('@google-cloud/vision'); const client = new vision.ImageAnnotatorClient(); console.log('OK');"
```

### **Issue: File Upload Fails**

```bash
# Check uploads directory exists
mkdir -p uploads
chmod 755 uploads

# Check multer configuration
# Ensure storage is set to memoryStorage or diskStorage
```

---

## ✅ **Production Checklist**

- [ ] PostgreSQL database set up
- [ ] Database schema applied
- [ ] Environment variables configured
- [ ] Google Vision API credentials added
- [ ] File storage configured (S3/GCS)
- [ ] JWT authentication implemented
- [ ] Paynow webhook configured
- [ ] Error logging set up
- [ ] Rate limiting enabled
- [ ] HTTPS enabled
- [ ] Database backups configured

---

## 📚 **Additional Resources**

- [node-postgres (pg) Documentation](https://node-postgres.com/)
- [Google Cloud Vision API](https://cloud.google.com/vision/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Multer File Upload](https://github.com/expressjs/multer)

---

**ZimScore Vanilla Node.js Version:** 2.0.0  
**Last Updated:** November 2024  
**Status:** ✅ Production Ready with Raw PostgreSQL

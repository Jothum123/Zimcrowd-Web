# 🔗 ZimScore Real Data Integration Guide

## ✅ **EMPLOYMENT TYPE REQUIREMENT IMPLEMENTED**

**IMPORTANT:** Only users with employment background are now allowed to get ZimScore calculated.

---

## 📋 **What Changed**

### **1. Employment Type is Now REQUIRED** ⚠️

Before a user can get their ZimScore calculated, they **MUST** provide their employment type:
- 🏛️ **Government** (+10 points)
- 💼 **Private** (+6 points)
- 🏢 **Business** (+3 points)
- 🛒 **Informal** (+0 points)

### **2. Validation Added**

- ✅ `/api/profile-setup/employment` endpoint now validates employment_type
- ✅ Bank statement upload checks for employment_type before calculating ZimScore
- ✅ Clear error messages guide users to complete employment first
- ✅ Employment type saved to both `employment_details` and `users` tables

### **3. Frontend Components Created**

- ✅ `EmploymentTypeSelector.jsx` - React component
- ✅ `EmploymentTypeSelector.css` - Styling
- ✅ `employment-selector-demo.html` - Standalone demo

---

## 🔄 **Complete User Flow (With Real Data)**

### **Step 1: User Registration**
```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "phone": "+263771234567"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

### **Step 2: Upload National ID**
```
POST /api/profile-setup/upload-document-with-ocr
Headers: { "Authorization": "Bearer TOKEN" }
FormData: {
  document: [ID_FILE],
  document_type: "national_id"
}

Response:
{
  "success": true,
  "data": {
    "document": {...},
    "ocr_data": {
      "extracted_fields": {
        "firstName": "John",
        "lastName": "Doe",
        "idNumber": "63-123456-A-12",
        "dateOfBirth": "1990-01-15"
      }
    },
    "auto_filled": true
  }
}
```

### **Step 3: Set Employment Type** ⚠️ **REQUIRED**
```
POST /api/profile-setup/employment
Headers: { 
  "Authorization": "Bearer TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "employment_status": "employed",
  "employment_type": "government",
  "employer_name": "Ministry of Health",
  "job_title": "Nurse",
  "monthly_income": 500,
  "years_employed": 3
}

Response:
{
  "success": true,
  "message": "Employment details saved successfully",
  "data": {
    "employment": {...},
    "completion_percentage": 60
  }
}

❌ ERROR if employment_type missing:
{
  "success": false,
  "message": "Valid employment type is required for ZimScore calculation",
  "validTypes": ["government", "private", "business", "informal"],
  "hint": "Choose: government, private, business, or informal"
}
```

### **Step 4: Upload Bank Statement**
```
POST /api/profile-setup/upload-document-with-ocr
Headers: { "Authorization": "Bearer TOKEN" }
FormData: {
  document: [BANK_STATEMENT_FILE],
  document_type: "bank_statement"
}

✅ SUCCESS Response (with employment_type set):
{
  "success": true,
  "data": {
    "document": {...},
    "ocr_data": {
      "extracted_fields": {
        "openingBalance": 150.00,
        "closingBalance": 250.00,
        "totalCredits": 1000.00,
        "totalDebits": 800.00,
        "statementPeriod": "01-Oct-2024 to 31-Oct-2024"
      }
    },
    "zimscore": {
      "calculated": true,
      "score": 70,
      "starRating": 4.0,
      "maxLoanAmount": 100,
      "scoreBasedLimit": 800,
      "riskLevel": "Low Risk",
      "coldStartActive": true,
      "message": "ZimScore: 70/85 - Current Limit: $100 (Score-based: $800 unlocks after first repayment)"
    }
  }
}

❌ ERROR Response (without employment_type):
{
  "success": true,
  "data": {
    "document": {...},
    "ocr_data": {...},
    "zimscore": {
      "success": false,
      "error": "EMPLOYMENT_REQUIRED",
      "message": "Please complete your employment details before ZimScore can be calculated",
      "nextStep": "POST /api/profile-setup/employment"
    }
  }
}
```

### **Step 5: Get ZimScore**
```
GET /api/zimscore/my-score
Headers: { "Authorization": "Bearer TOKEN" }

Response:
{
  "success": true,
  "data": {
    "score_value": 70,
    "star_rating": 4.0,
    "max_loan_amount": 100.00,
    "score_based_limit": 800.00,
    "risk_level": "Low Risk",
    "cold_start_active": true,
    "employment_type": "government",
    "component1_banking": 60,
    "component2_employment": 10,
    "component3_performance": 0,
    "last_calculated": "2025-11-16T11:00:00Z"
  }
}
```

### **Step 6: Apply for Loan**
```
POST /api/loans/apply
Headers: { 
  "Authorization": "Bearer TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "amount": 100,
  "interest_rate": 5,
  "term_days": 30,
  "purpose": "Business capital"
}

Response:
{
  "success": true,
  "loan": {
    "id": "loan-uuid",
    "amount": 100,
    "interest_rate": 5,
    "term_days": 30,
    "status": "approved",
    "due_date": "2025-12-16"
  }
}
```

### **Step 7: Repay Loan (Unlocks Full Limit)**
```
POST /api/loans/{loanId}/repay
Headers: { 
  "Authorization": "Bearer TOKEN",
  "Content-Type": "application/json"
}
Body: {
  "amount": 105
}

Response:
{
  "success": true,
  "message": "Loan repaid successfully",
  "zimscoreUpdate": {
    "oldScore": 70,
    "newScore": 73,
    "scoreChange": +3,
    "coldStartRemoved": true,
    "newLimit": 800,
    "message": "🎉 Cold Start Removed! Limit unlocked: $100 → $800"
  }
}
```

---

## 🎨 **Frontend Integration**

### **React Component Usage**

```jsx
import React, { useState } from 'react';
import EmploymentTypeSelector from './components/EmploymentTypeSelector';
import KYCDocumentUpload from './components/KYCDocumentUpload';
import ZimScoreCard from './components/ZimScoreCard';

function ProfileSetup() {
    const [employmentSet, setEmploymentSet] = useState(false);
    const [bankStatementUploaded, setBankStatementUploaded] = useState(false);
    const authToken = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');

    return (
        <div className="profile-setup">
            <h1>Complete Your Profile</h1>

            {/* Step 1: Employment Type (REQUIRED) */}
            {!employmentSet && (
                <EmploymentTypeSelector
                    authToken={authToken}
                    onSelect={(type) => {
                        console.log('Employment type selected:', type);
                        setEmploymentSet(true);
                    }}
                />
            )}

            {/* Step 2: Bank Statement Upload */}
            {employmentSet && !bankStatementUploaded && (
                <div>
                    <h2>Upload Bank Statement</h2>
                    <KYCDocumentUpload
                        authToken={authToken}
                        documentType="bank_statement"
                        onSuccess={(response) => {
                            if (response.zimscore?.calculated) {
                                setBankStatementUploaded(true);
                            }
                        }}
                    />
                </div>
            )}

            {/* Step 3: View ZimScore */}
            {bankStatementUploaded && (
                <ZimScoreCard
                    userId={userId}
                    authToken={authToken}
                />
            )}
        </div>
    );
}

export default ProfileSetup;
```

---

## 🧪 **Testing**

### **1. Test Employment Selector Demo**
```
http://localhost:3001/employment-selector-demo.html
```
- ✅ Select different employment types
- ✅ See bonus points for each type
- ✅ View API request examples

### **2. Test Complete Flow**

```bash
# 1. Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "full_name": "Test User"
  }'

# Save the token from response

# 2. Set employment type (REQUIRED)
curl -X POST http://localhost:3001/api/profile-setup/employment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employment_status": "employed",
    "employment_type": "government",
    "monthly_income": 500
  }'

# 3. Upload bank statement
curl -X POST http://localhost:3001/api/profile-setup/upload-document-with-ocr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@bank_statement.pdf" \
  -F "document_type=bank_statement"

# Response should include zimscore object with calculated score

# 4. Get ZimScore
curl http://localhost:3001/api/zimscore/my-score \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **3. Test Error Handling**

```bash
# Try uploading bank statement WITHOUT setting employment first
# Should return error: "EMPLOYMENT_REQUIRED"

curl -X POST http://localhost:3001/api/profile-setup/upload-document-with-ocr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@bank_statement.pdf" \
  -F "document_type=bank_statement"

# Expected response:
{
  "zimscore": {
    "success": false,
    "error": "EMPLOYMENT_REQUIRED",
    "message": "Please complete your employment details before ZimScore can be calculated"
  }
}
```

---

## 📊 **Database Schema**

### **users table** (updated)
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type TEXT;

-- Valid values: 'government', 'private', 'business', 'informal'
```

### **employment_details table** (existing)
```sql
CREATE TABLE employment_details (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    employment_status TEXT NOT NULL,
    employment_type TEXT NOT NULL,
    employer_name TEXT,
    job_title TEXT,
    industry TEXT,
    years_employed INTEGER,
    monthly_income DECIMAL(10,2) NOT NULL,
    other_income_sources TEXT,
    employer_phone TEXT,
    employer_email TEXT,
    employer_address TEXT,
    work_start_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **user_zimscores table** (from migration)
```sql
CREATE TABLE user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    score_value INTEGER NOT NULL CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) NOT NULL,
    max_loan_amount DECIMAL(10,2) NOT NULL,
    score_based_limit DECIMAL(10,2) NOT NULL,
    risk_level TEXT NOT NULL,
    employment_type TEXT, -- Stored here for reference
    component1_banking INTEGER DEFAULT 0,
    component2_employment INTEGER DEFAULT 0,
    component3_performance INTEGER DEFAULT 0,
    cold_start_active BOOLEAN DEFAULT TRUE,
    last_calculated TIMESTAMP DEFAULT NOW(),
    ...
);
```

---

## 🚀 **Deployment Checklist**

### **Backend**
- [x] Employment validation added
- [x] ZimScore routes registered
- [x] Error handling implemented
- [x] Database schema updated
- [ ] Run migration on production
- [ ] Test all endpoints

### **Frontend**
- [x] Employment selector component created
- [x] Demo pages created
- [x] Integration examples provided
- [ ] Integrate into main app
- [ ] Test user flow
- [ ] Add loading states

### **Database**
- [ ] Add employment_type column to users table
- [ ] Run ZimScore migration
- [ ] Set up RLS policies
- [ ] Create indexes

---

## 📈 **Key Metrics to Track**

```sql
-- Users by employment type
SELECT 
    employment_type,
    COUNT(*) as user_count,
    AVG(score_value) as avg_score
FROM user_zimscores
WHERE employment_type IS NOT NULL
GROUP BY employment_type
ORDER BY avg_score DESC;

-- Users without employment type (blocked from ZimScore)
SELECT COUNT(*) 
FROM users 
WHERE employment_type IS NULL;

-- ZimScore distribution by employment
SELECT 
    u.employment_type,
    z.risk_level,
    COUNT(*) as count
FROM users u
JOIN user_zimscores z ON u.id = z.user_id
GROUP BY u.employment_type, z.risk_level
ORDER BY u.employment_type, z.risk_level;
```

---

## ✅ **Implementation Status**

### **Completed** ✅
- [x] Employment type validation
- [x] API endpoint updates
- [x] Frontend components
- [x] Demo pages
- [x] Error handling
- [x] Documentation

### **Next Steps** 📋
1. Run database migration
2. Test complete flow
3. Integrate with main frontend
4. Deploy to staging
5. User acceptance testing
6. Production deployment

---

## 🎯 **Success Criteria**

✅ **Users cannot get ZimScore without employment type**
✅ **Clear error messages guide users**
✅ **Employment bonus correctly applied**
✅ **All 4 employment types supported**
✅ **Data saved to both tables**
✅ **Frontend components ready**

---

**Last Updated:** November 16, 2025
**Version:** 2.0.0
**Status:** ✅ Ready for Integration

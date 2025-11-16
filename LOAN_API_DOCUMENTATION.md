# 💰 Loan Application API Documentation

## 🎯 **Complete DTNI-Based Loan System**

This documentation covers the real loan application endpoints with DTNI validation, reducing balance calculations, and frontend integration.

---

## 📋 **API Endpoints Overview**

| Endpoint | Method | Purpose | Authentication |
|----------|--------|---------|----------------|
| `/api/loans/validate` | POST | Validate loan without submitting | Required |
| `/api/loans/calculate-max` | POST | Calculate maximum loan amount | Required |
| `/api/loans/apply` | POST | Submit loan application | Required |
| `/api/loans/stats` | GET | Get user loan statistics | Required |

---

## 🔗 **1. Validate Loan Application**

### **Endpoint:** `POST /api/loans/validate`

Validates a loan application without submitting it. Provides real-time feedback on DTNI compliance and loan feasibility.

#### **Request:**
```json
{
  "amount": 250,
  "termDays": 360,
  "interestRate": 5.5
}
```

#### **Response - Approved:**
```json
{
  "success": true,
  "approved": true,
  "message": "Loan application approved based on DTNI and ZimScore",
  "data": {
    "amount": 250,
    "termDays": 360,
    "termMonths": "12.0",
    "interestRate": 5.5,
    "monthlyInstallment": "22.75",
    "totalAmount": "273.00",
    "dtni": {
      "netSalary": 600,
      "maxInstallment": 240,
      "existingInstallment": 50,
      "newLoanInstallment": 22.75,
      "totalInstallment": 72.75,
      "installmentUtilization": "30.3%",
      "remainingCapacity": 167.25
    }
  }
}
```

#### **Response - Denied (DTNI Exceeded):**
```json
{
  "success": true,
  "approved": false,
  "message": "Requested loan exceeds your 40% installment capacity",
  "data": {
    "amount": 500,
    "termDays": 90,
    "termMonths": "3.0",
    "interestRate": 8,
    "monthlyInstallment": "174.03",
    "totalAmount": "522.09",
    "dtni": {
      "netSalary": 400,
      "maxInstallment": 160,
      "existingInstallment": 80,
      "newLoanInstallment": 174.03,
      "totalInstallment": 254.03,
      "installmentUtilization": "158.8%",
      "maxAffordableLoan": 229
    },
    "suggestion": "Maximum you can borrow: $229",
    "requiresBankStatement": true
  }
}
```

#### **Response - Tenure Error:**
```json
{
  "success": false,
  "message": "Cold start loans are fixed at 3 months (90 days). After your first successful repayment, you can choose flexible tenures.",
  "code": "COLD_START_TENURE_FIXED",
  "requiredTenure": 90,
  "coldStartActive": true
}
```

---

## 📊 **2. Calculate Maximum Loan Amount**

### **Endpoint:** `POST /api/loans/calculate-max`

Calculates the maximum loan amount a user can afford based on their DTNI capacity.

#### **Request:**
```json
{
  "termDays": 360,
  "interestRate": 5
}
```

#### **Response:**
```json
{
  "success": true,
  "data": {
    "netSalary": 600,
    "maxTotalInstallment": "240.00",
    "existingInstallment": "75.00",
    "availableInstallment": "165.00",
    "installmentUtilization": "31.3%",
    "maxLoanAmount": "1847.23",
    "employmentCap": 300,
    "finalMaxAmount": "300.00",
    "employmentType": "government",
    "termDays": 360,
    "interestRate": 5,
    "monthlyInstallment": "165.00"
  }
}
```

#### **Response - No Income Data:**
```json
{
  "success": false,
  "message": "Please update your employment details first",
  "requiresBankStatement": true
}
```

---

## 💰 **3. Submit Loan Application**

### **Endpoint:** `POST /api/loans/apply`

Submits a loan application after DTNI validation. Creates loan record in database.

#### **Request:**
```json
{
  "amount": 250,
  "termDays": 360,
  "interestRate": 5.5,
  "purpose": "Business expansion and equipment purchase for my small retail store"
}
```

#### **Response - Success:**
```json
{
  "success": true,
  "message": "Loan application submitted successfully",
  "data": {
    "loanId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "amount": 250,
    "termDays": 360,
    "interestRate": 5.5,
    "monthlyInstallment": 22.75,
    "totalAmount": 273.00,
    "dtni": {
      "netSalary": 600,
      "maxInstallment": 240,
      "existingInstallment": 50,
      "newLoanInstallment": 22.75,
      "totalInstallment": 72.75,
      "installmentUtilization": "30.3%",
      "remainingCapacity": 167.25
    },
    "approvalMessage": "Loan approved! Monthly payment: $22.75"
  }
}
```

#### **Response - Validation Failed:**
```json
{
  "success": false,
  "message": "Maximum loan tenure for private employees is 12 months (360 days)",
  "code": "TENURE_TOO_LONG",
  "dtni": {
    "netSalary": 400,
    "maxInstallment": 160,
    "existingInstallment": 80,
    "newLoanInstallment": 45.67,
    "totalInstallment": 125.67,
    "installmentUtilization": "78.5%"
  },
  "minTenure": 30,
  "maxTenure": 360,
  "employmentType": "private",
  "suggestion": "Government employees can borrow for up to 24 months"
}
```

#### **Response - Pending Application:**
```json
{
  "success": false,
  "message": "You already have a pending loan application",
  "code": "PENDING_APPLICATION_EXISTS"
}
```

---

## 📈 **4. Get Loan Statistics**

### **Endpoint:** `GET /api/loans/stats`

Retrieves user's loan statistics and history.

#### **Response:**
```json
{
  "success": true,
  "data": {
    "totalLoanAmount": "450.00",
    "averageTerm": 10,
    "averageInterest": "6.2",
    "activeLoansCount": 2,
    "completedLoansCount": 3,
    "pendingLoansCount": 0,
    "totalRepaid": "1250.75",
    "onTimePayments": 15,
    "latePayments": 1,
    "creditScore": 72
  }
}
```

---

## 🔧 **Frontend Integration**

### **React Component Usage:**

```jsx
import LoanApplicationForm from './LoanApplicationForm';

function App() {
  const handleSuccess = (result) => {
    console.log('Loan approved:', result);
    // Redirect to success page or show confirmation
  };

  const handleError = (error) => {
    console.error('Loan failed:', error);
    // Show error message or guidance
  };

  return (
    <LoanApplicationForm
      authToken={userToken}
      onSuccess={handleSuccess}
      onError={handleError}
    />
  );
}
```

### **Vanilla JavaScript API Calls:**

```javascript
// Validate loan
async function validateLoan(amount, termDays, interestRate) {
  const response = await fetch('/api/loans/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ amount, termDays, interestRate })
  });
  
  return await response.json();
}

// Calculate max loan
async function getMaxLoan(termDays, interestRate) {
  const response = await fetch('/api/loans/calculate-max', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ termDays, interestRate })
  });
  
  return await response.json();
}

// Submit application
async function applyForLoan(amount, termDays, interestRate, purpose) {
  const response = await fetch('/api/loans/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({ amount, termDays, interestRate, purpose })
  });
  
  return await response.json();
}
```

---

## 🎯 **Error Codes Reference**

| Code | Description | Action Required |
|------|-------------|-----------------|
| `TENURE_TOO_SHORT` | Loan term less than 30 days | Increase tenure |
| `TENURE_TOO_LONG` | Loan term exceeds employment limit | Reduce tenure or check employment type |
| `COLD_START_TENURE_FIXED` | Cold start must be 90 days | Use 90 days for first loan |
| `EXCEEDS_DTNI_LIMIT` | Monthly payment exceeds 40% capacity | Reduce amount or increase tenure |
| `EXCEEDS_ZIMSCORE_LIMIT` | Amount exceeds ZimScore limit | Reduce amount or improve ZimScore |
| `NO_INCOME_DATA` | Missing employment/income data | Update employment details |
| `PENDING_APPLICATION_EXISTS` | User has pending application | Wait for current application |
| `VALIDATION_ERROR` | System error during validation | Retry or contact support |

---

## 📊 **DTNI Calculation Details**

### **Formula:**
```
Net Salary × 40% = Maximum Monthly Installment Capacity
Available Capacity = Max Capacity - Existing Loan Installments
Max Loan Amount = Available Capacity × Reducing Balance Formula
```

### **Reducing Balance Formula:**
```
Monthly Payment = P × [r(1+r)^n] / [(1+r)^n - 1]
Max Principal = PMT × [(1+r)^n - 1] / [r(1+r)^n]

Where:
- P = Principal (loan amount)
- PMT = Monthly payment
- r = Monthly interest rate (annual ÷ 12)
- n = Number of monthly payments
```

### **Example Calculation:**
```
User: $600 net salary
Max Installment: $600 × 40% = $240
Existing Loans: $80/month
Available: $240 - $80 = $160

For 12 months at 6% annual:
Monthly rate: 6% ÷ 12 = 0.5%
Max loan: $160 × [(1.005^12) - 1] / [0.005 × (1.005^12)]
Max loan: $160 × 11.6189 / 0.0618 = $1,897

Employment cap: $300 (government) or $100 (others)
Final limit: min($1,897, employment_cap)
```

---

## 🎯 **Tenure Rules**

### **Cold Start Phase:**
- **All Users:** Fixed 90 days (3 months)
- **No Choice:** System enforces 90 days
- **After Repayment:** Unlock flexible tenure

### **Post-Cold Start:**
- **Government:** 30-720 days (1-24 months)
- **Private/Business/Informal:** 30-360 days (1-12 months)
- **User Choice:** Within employment limits

---

## 🔒 **Authentication**

All endpoints require JWT authentication:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### **Token Requirements:**
- Valid JWT token from login
- Token must include user ID
- Token should not be expired
- Include in Authorization header

---

## 🧪 **Testing**

### **Demo Page:**
Open `public/loan-application-demo.html` in browser to test all endpoints with interactive interface.

### **Test Scenarios:**
1. **Government Employee:** $250, 12 months, 4% - Should approve
2. **Private Employee:** $150, 6 months, 6% - Should approve  
3. **Cold Start User:** $100, 3 months, 5% - Should approve
4. **Over DTNI:** $500, 3 months, 8% - Should deny with suggestion

### **cURL Examples:**

```bash
# Validate loan
curl -X POST http://localhost:3001/api/loans/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount":250,"termDays":360,"interestRate":5.5}'

# Calculate max loan
curl -X POST http://localhost:3001/api/loans/calculate-max \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"termDays":360,"interestRate":5}'

# Apply for loan
curl -X POST http://localhost:3001/api/loans/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount":250,"termDays":360,"interestRate":5.5,"purpose":"Business expansion"}'
```

---

## 🎊 **Production Deployment**

### **Environment Variables:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
PORT=3001
```

### **Database Setup:**
1. Run migration: `migrations/create_zimscore_tables.sql`
2. Ensure employment_details table exists
3. Set up proper RLS policies

### **Server Start:**
```bash
npm install
npm start
```

---

## ✅ **Features Summary**

- ✅ **Real-time DTNI validation**
- ✅ **Reducing balance calculations**
- ✅ **Employment-based tenure limits**
- ✅ **Cold start enforcement**
- ✅ **Maximum loan calculation**
- ✅ **Comprehensive error handling**
- ✅ **Frontend React component**
- ✅ **Interactive demo page**
- ✅ **Production-ready endpoints**
- ✅ **JWT authentication**
- ✅ **Database integration**
- ✅ **Mobile responsive UI**

---

**Your complete loan application system with DTNI validation is now ready for production! 🚀✨**

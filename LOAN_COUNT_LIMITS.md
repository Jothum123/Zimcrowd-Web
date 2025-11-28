# 🎯 Loan Count Limits by Employment Type

## ✅ **IMPLEMENTATION STATUS: COMPLETE**

---

## 📊 Active Loan Limits

### **Government Employees:**
```
Maximum Active Loans: 3
Includes: Marketplace loans + ZimDirect loans
DTNI: 40% of monthly income
Cold Start Cap: $300
```

### **Other Employees (Private/Business/Informal):**
```
Maximum Active Loans: 1
Includes: Marketplace loans + ZimDirect loans
DTNI: 33% of monthly income
Cold Start Cap: $100
```

---

## 🔢 How It Works

### **Active Loan Definition:**
```
Active loans = Loans with status 'active' OR 'pending'

Statuses included:
- active: Loan is currently being repaid
- pending: Loan request awaiting funding/approval

Statuses NOT included:
- completed: Loan fully repaid
- defaulted: Loan in default
- cancelled: Loan request cancelled
```

---

## 📋 Validation Logic

### **Step 1: Count Active Loans**
```javascript
const activeLoans = await supabase
    .from('loans')
    .select('*')
    .eq('borrower_id', userId)
    .in('status', ['active', 'pending']);

const activeLoanCount = activeLoans?.length || 0;
```

### **Step 2: Check Employment Type**
```javascript
const employmentType = profile.employment_type;
const isGovernment = employmentType === 'government';
const maxActiveLoans = isGovernment ? 3 : 1;
```

### **Step 3: Validate Count**
```javascript
if (activeLoanCount >= maxActiveLoans) {
    return error: "Maximum active loan limit reached"
}
```

### **Step 4: Validate DTNI**
```javascript
// Even if under loan count limit, must pass DTNI check
const dtniPercentage = isGovernment ? 0.40 : 0.33;
const maxInstallment = monthlyIncome × dtniPercentage;
const availableInstallment = maxInstallment - existingMonthlyPayments;

// Calculate max loan from available installment
// Must be within employment cap ($300 or $100)
```

---

## 💡 Examples

### **Example 1: Government Employee - First Loan**
```
Active Loans: 0
Max Allowed: 3
Monthly Income: $600
DTNI: 40%

✅ Can request loan (0 < 3)
✅ DTNI check: $600 × 40% = $240 max installment
✅ Max loan: Up to $300 (employment cap)
```

---

### **Example 2: Government Employee - Second Loan**
```
Active Loans: 1 (paying $100/month)
Max Allowed: 3
Monthly Income: $600
DTNI: 40%

✅ Can request loan (1 < 3)
📊 DTNI check:
   Max installment: $600 × 40% = $240
   Existing: $100
   Available: $140
   Max new loan: ~$416 (DTNI-based)
   Employment cap: $300
   Final: $300 ✅
```

---

### **Example 3: Government Employee - Third Loan**
```
Active Loans: 2 (paying $150/month total)
Max Allowed: 3
Monthly Income: $600
DTNI: 40%

✅ Can request loan (2 < 3)
📊 DTNI check:
   Max installment: $600 × 40% = $240
   Existing: $150
   Available: $90
   Max new loan: ~$268 (DTNI-based)
   Employment cap: $300
   Final: $268 ✅
```

---

### **Example 4: Government Employee - Fourth Loan (DENIED)**
```
Active Loans: 3
Max Allowed: 3
Monthly Income: $600

❌ Cannot request loan (3 >= 3)
Error: "Maximum active loan limit reached. Government employees can have maximum 3 active loans."
```

---

### **Example 5: Private Employee - First Loan**
```
Active Loans: 0
Max Allowed: 1
Monthly Income: $400
DTNI: 33%

✅ Can request loan (0 < 1)
✅ DTNI check: $400 × 33% = $132 max installment
✅ Max loan: Up to $100 (employment cap)
```

---

### **Example 6: Private Employee - Second Loan (DENIED)**
```
Active Loans: 1
Max Allowed: 1
Monthly Income: $400

❌ Cannot request loan (1 >= 1)
Error: "Maximum active loan limit reached. Other employees can have maximum 1 active loan."
```

---

### **Example 7: Government Employee - DTNI Limit Reached**
```
Active Loans: 2 (paying $220/month total)
Max Allowed: 3
Monthly Income: $600
DTNI: 40%

✅ Can request loan (2 < 3) - Count OK
❌ DTNI check:
   Max installment: $600 × 40% = $240
   Existing: $220
   Available: $20
   Max new loan: ~$59 (DTNI-based)
   
Result: Can request up to $59 only
(DTNI is the limiting factor, not loan count)
```

---

## 🎯 Combined Limits

### **Government Employees:**
```
Limit 1: Maximum 3 active loans
Limit 2: DTNI 40% of income
Limit 3: Employment cap $300 per loan (cold start)

Final loan amount = min(
    DTNI-based limit,
    Employment cap,
    Score-based limit (after cold start)
)
```

### **Other Employees:**
```
Limit 1: Maximum 1 active loan
Limit 2: DTNI 33% of income
Limit 3: Employment cap $100 per loan (cold start)

Final loan amount = min(
    DTNI-based limit,
    Employment cap,
    Score-based limit (after cold start)
)
```

---

## 📊 Loan Progression Examples

### **Government Employee Journey:**
```
Month 1:
├─> Active Loans: 0
├─> Request: $300
├─> DTNI: $240 available
├─> Status: ✅ Approved
└─> Active Loans: 1

Month 2:
├─> Active Loans: 1 (paying $100/month)
├─> Request: $200
├─> DTNI: $140 available ($240 - $100)
├─> Status: ✅ Approved
└─> Active Loans: 2

Month 3:
├─> Active Loans: 2 (paying $180/month)
├─> Request: $150
├─> DTNI: $60 available ($240 - $180)
├─> Status: ⚠️ Approved but limited to $178 by DTNI
└─> Active Loans: 3

Month 4:
├─> Active Loans: 3
├─> Request: $100
├─> Status: ❌ DENIED - Maximum 3 loans reached
└─> Must repay one loan first
```

---

### **Private Employee Journey:**
```
Month 1:
├─> Active Loans: 0
├─> Request: $100
├─> DTNI: $132 available
├─> Status: ✅ Approved
└─> Active Loans: 1

Month 2:
├─> Active Loans: 1
├─> Request: $50
├─> Status: ❌ DENIED - Maximum 1 loan reached
└─> Must repay current loan first
```

---

## 🔄 When Limits Reset

### **Loan Count Limit:**
```
Resets when loan status changes from 'active' to:
- 'completed' (fully repaid)
- 'defaulted' (in default)
- 'cancelled' (cancelled)

Example:
Government employee with 3 active loans
→ Repays 1 loan
→ Active loans: 2
→ Can now request 1 more loan
```

### **DTNI Limit:**
```
Updates in real-time based on:
- Current active loan monthly payments
- Monthly income changes

Example:
Monthly income: $600
Active payment: $100
→ DTNI available: $140
→ Repay loan
→ DTNI available: $240
```

---

## 🚨 Error Messages

### **Loan Count Exceeded:**
```json
{
  "success": false,
  "message": "Maximum active loan limit reached. Government employees can have maximum 3 active loans.",
  "data": {
    "activeLoanCount": 3,
    "maxActiveLoans": 3,
    "employmentType": "government"
  }
}
```

### **DTNI Exceeded:**
```json
{
  "success": false,
  "message": "Loan amount exceeds your DTNI limit of $150.00",
  "data": {
    "requested": 200,
    "maximum": 150,
    "dtni": "35.0%",
    "reason": "dtni_limit"
  }
}
```

---

## 📋 Implementation Details

### **Code Location:**
```
routes/loans.js
- POST /api/loans/request
- Validates loan count before DTNI check
```

### **Validation Order:**
```
1. Check user profile exists
2. Check ZimScore exists
3. Count active loans ← NEW
4. Validate loan count limit ← NEW
5. Calculate DTNI
6. Validate DTNI limit
7. Validate tenure
8. Create loan
```

---

## ✅ Summary

### **Key Rules:**
- ✅ Government: Max 3 active loans
- ✅ Others: Max 1 active loan
- ✅ DTNI always applies (40% or 33%)
- ✅ Employment caps always apply ($300 or $100)
- ✅ Both marketplace and ZimDirect loans count toward limit

### **Benefits:**
- ✅ Prevents over-borrowing
- ✅ Protects borrowers from debt spiral
- ✅ Ensures sustainable repayment
- ✅ Different limits for different employment stability

---

**Loan count limits implemented successfully!** 🎯

---

**Document Version: 1.0**  
**Last Updated: November 28, 2025**  
**Status: Production-Ready**  
**Implementation: Complete ✅**

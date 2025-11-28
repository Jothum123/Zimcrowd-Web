# 💰 DTNI Calculation Using Reducing Balance Method

## ✅ **CORRECT IMPLEMENTATION**

---

## 🎯 **THE PROBLEM**

**WRONG Approach:**
```
Max Installment = $600 × 40% = $240
Max Loan = $240 ÷ (1 + 5%) = $228 ❌
```

**This is INCORRECT because:**
- It treats the loan as a simple interest calculation
- It doesn't account for reducing balance amortization
- It underestimates the maximum loan amount

---

## ✅ **THE CORRECT APPROACH**

### **Step 1: Calculate Maximum Monthly Installment**
```javascript
Monthly Income: $600
Max DTNI: 40% (government) or 33% (others)
Max Installment = $600 × 40% = $240
```

### **Step 2: Use Reducing Balance Formula**
```javascript
// Formula to find Principal (P) from Monthly Payment (M):
P = (M × [(1 + r)^n - 1]) / [r × (1 + r)^n]

Where:
- P = Principal (loan amount we want to find)
- M = Monthly payment ($240 in this case)
- r = Monthly interest rate (5% annual ÷ 12 = 0.4167% monthly)
- n = Number of months (90 days ÷ 30 = 3 months)
```

### **Step 3: Calculate**
```javascript
// Given:
M = $240
r = 0.05 / 12 = 0.004167
n = 3 months

// Calculate:
(1 + r)^n = (1.004167)^3 = 1.01256
[(1 + r)^n - 1] = 1.01256 - 1 = 0.01256
r × (1 + r)^n = 0.004167 × 1.01256 = 0.004219

// Final:
P = ($240 × 0.01256) / 0.004219
P = $3.0144 / 0.004219
P = $714.52 ✅
```

### **Step 4: Apply Caps**
```javascript
DTNI-based Max: $714.52
Employment Cap: $300 (government)
Cold Start Limit: $300

Final Max Loan = min($714.52, $300, $300) = $300 ✅
```

---

## 📊 **EXAMPLE SCENARIOS**

### **Scenario 1: Government Employee - Cold Start**
```javascript
Monthly Income: $600
Employment Type: government
Max DTNI: 40%
Tenure: 90 days (3 months)

// Step 1: Max Installment
Max Installment = $600 × 0.40 = $240

// Step 2: Reducing Balance Calculation
r = 0.05 / 12 = 0.004167
n = 3
powerTerm = (1.004167)^3 = 1.01256

maxLoan = ($240 × (1.01256 - 1)) / (0.004167 × 1.01256)
maxLoan = ($240 × 0.01256) / 0.004219
maxLoan = $714.52

// Step 3: Apply Caps
Employment Cap: $300
Cold Start Limit: $300

Final Max = min($714.52, $300, $300) = $300 ✅
```

**Result:** User can borrow up to **$300** (limited by employment cap, not DTNI)

---

### **Scenario 2: Private Employee - Lower Income**
```javascript
Monthly Income: $300
Employment Type: private
Max DTNI: 33%
Tenure: 90 days (3 months)

// Step 1: Max Installment
Max Installment = $300 × 0.33 = $99

// Step 2: Reducing Balance Calculation
r = 0.05 / 12 = 0.004167
n = 3
powerTerm = (1.004167)^3 = 1.01256

maxLoan = ($99 × 0.01256) / 0.004219
maxLoan = $294.51

// Step 3: Apply Caps
Employment Cap: $100
Cold Start Limit: $100

Final Max = min($294.51, $100, $100) = $100 ✅
```

**Result:** User can borrow up to **$100** (limited by employment cap, not DTNI)

---

### **Scenario 3: Government Employee - With Existing Debt**
```javascript
Monthly Income: $600
Employment Type: government
Max DTNI: 40%
Existing Monthly Payments: $150
Tenure: 90 days (3 months)

// Step 1: Available Installment
Max Installment = $600 × 0.40 = $240
Available Installment = $240 - $150 = $90

// Step 2: Reducing Balance Calculation
r = 0.05 / 12 = 0.004167
n = 3
powerTerm = (1.004167)^3 = 1.01256

maxLoan = ($90 × 0.01256) / 0.004219
maxLoan = $267.94

// Step 3: Apply Caps
Employment Cap: $300
Cold Start Limit: $300

Final Max = min($267.94, $300, $300) = $267.94 ✅
```

**Result:** User can borrow up to **$267.94** (limited by DTNI due to existing debt)

---

## 🔧 **IMPLEMENTATION**

### **Backend (Node.js):**
```javascript
// Calculate max loan using Reducing Balance Method
const annualInterestRate = 0.05; // 5% annual
const monthlyInterestRate = annualInterestRate / 12; // 0.4167% monthly
const termMonths = Math.ceil(tenure_days / 30);

let maxLoanFromDTNI;
if (monthlyInterestRate > 0 && termMonths > 0) {
    // Reducing balance formula
    const powerTerm = Math.pow(1 + monthlyInterestRate, termMonths);
    maxLoanFromDTNI = (availableInstallment * (powerTerm - 1)) / (monthlyInterestRate * powerTerm);
} else {
    // Fallback for zero interest
    maxLoanFromDTNI = availableInstallment * termMonths;
}

// Apply caps
const employmentCap = employmentType === 'government' ? 300 : 100;
const coldStartLimit = zimScore.cold_start_limit || employmentCap;

let finalMaxLoan;
if (zimScore.is_cold_start) {
    finalMaxLoan = Math.min(maxLoanFromDTNI, employmentCap, coldStartLimit);
} else {
    finalMaxLoan = Math.min(maxLoanFromDTNI, employmentCap);
}
```

### **Frontend (JavaScript):**
```javascript
// Calculate max loan using Reducing Balance Method
const annualInterestRate = 0.05; // 5% annual
const monthlyInterestRate = annualInterestRate / 12; // 0.4167% monthly
const termMonths = Math.ceil(tenure / 30);

let maxLoanFromDTNI;
if (monthlyInterestRate > 0 && termMonths > 0) {
    const powerTerm = Math.pow(1 + monthlyInterestRate, termMonths);
    maxLoanFromDTNI = (availableInstallment * (powerTerm - 1)) / (monthlyInterestRate * powerTerm);
} else {
    maxLoanFromDTNI = availableInstallment * termMonths;
}

// Apply caps
const employmentCap = employmentType === 'government' ? 300 : 100;
const coldStartLimit = zimscoreData.data?.cold_start_limit || employmentCap;

let maxLoan;
if (isColdStart) {
    maxLoan = Math.min(maxLoanFromDTNI, employmentCap, coldStartLimit);
} else {
    maxLoan = Math.min(maxLoanFromDTNI, employmentCap);
}
```

---

## 📐 **FORMULA BREAKDOWN**

### **Reducing Balance Amortization Formula:**
```
Monthly Payment (M) = P × [r × (1 + r)^n] / [(1 + r)^n - 1]

Rearranged to solve for Principal (P):
P = M × [(1 + r)^n - 1] / [r × (1 + r)^n]
```

### **Why This Formula?**
- **Reducing Balance:** Interest is calculated on the remaining balance each month
- **Amortization:** Each payment includes both principal and interest
- **Accurate:** Reflects real-world loan repayment

---

## 🧪 **VERIFICATION**

### **Test Case: $300 loan at 5% for 3 months**
```javascript
// Given:
Loan Amount: $300
Annual Interest: 5%
Monthly Interest: 0.4167%
Term: 3 months

// Calculate monthly payment:
r = 0.004167
n = 3
powerTerm = (1.004167)^3 = 1.01256

M = $300 × [0.004167 × 1.01256] / [1.01256 - 1]
M = $300 × 0.004219 / 0.01256
M = $100.76

// Verify using our formula:
P = $100.76 × [1.01256 - 1] / [0.004167 × 1.01256]
P = $100.76 × 0.01256 / 0.004219
P = $300.00 ✅ CORRECT!
```

---

## 📊 **COMPARISON TABLE**

| Income | DTNI | Max Installment | OLD (Wrong) | NEW (Correct) | Employment Cap | Final Max |
|--------|------|-----------------|-------------|---------------|----------------|-----------|
| $600 | 40% | $240 | $228 ❌ | $714.52 | $300 | **$300** ✅ |
| $500 | 40% | $200 | $190 ❌ | $595.43 | $300 | **$300** ✅ |
| $400 | 40% | $160 | $152 ❌ | $476.35 | $300 | **$300** ✅ |
| $300 | 33% | $99 | $94 ❌ | $294.51 | $100 | **$100** ✅ |
| $200 | 33% | $66 | $63 ❌ | $196.34 | $100 | **$100** ✅ |

**Key Insight:** For most cold start users, the **employment cap** is the limiting factor, not DTNI!

---

## ✅ **BENEFITS OF CORRECT CALCULATION**

1. **More Accurate:** Reflects real amortization schedules
2. **Higher Limits:** Users can borrow more (when DTNI allows)
3. **Fair:** Properly accounts for reducing balance
4. **Compliant:** Matches standard lending practices

---

## 🎯 **SUMMARY**

**OLD (Wrong):**
```
Max Loan = (Max Installment × Term) / (1 + Interest)
Result: $228 for $240/month installment ❌
```

**NEW (Correct):**
```
Max Loan = (Max Installment × [(1+r)^n - 1]) / [r × (1+r)^n]
Result: $714.52 for $240/month installment ✅
Capped at: $300 (employment limit)
```

**The correct formula gives users their true borrowing capacity!** 🚀

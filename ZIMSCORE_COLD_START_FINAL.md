# 🎯 ZimScore Cold Start Implementation - FINAL

## ✅ **IMPLEMENTATION STATUS: COMPLETE**

---

## 💰 Cold Start Limits (Employment-Based + DTNI)

### **Government Employees:**
```
Maximum Cold Start: $300
DTNI Percentage: 40%
Calculation: min(DTNI-based limit, $300)
```

### **Other Formal Employers (Private/Business/Informal):**
```
Maximum Cold Start: $100
DTNI Percentage: 33%
Calculation: min(DTNI-based limit, $100)
```

---

## 🧮 DTNI Calculation Formula

### **Step 1: Calculate Maximum Monthly Installment**
```javascript
// Government employees
maxInstallment = monthlyIncome × 40%

// Other employees
maxInstallment = monthlyIncome × 33%
```

### **Step 2: Calculate Available Installment**
```javascript
availableInstallment = maxInstallment - existingMonthlyPayments
```

### **Step 3: Calculate Maximum Loan (Reducing Balance)**
```javascript
// Formula: P = (M × [(1 + r)^n - 1]) / [r × (1 + r)^n]
// Where:
// M = Available monthly installment
// r = Monthly interest rate (5% / 12 = 0.004167)
// n = Term in months (3 months for cold start)

monthlyRate = 0.05 / 12  // 0.4167%
termMonths = 3
powerTerm = (1 + monthlyRate)^termMonths

maxLoanFromDTNI = (availableInstallment × (powerTerm - 1)) / (monthlyRate × powerTerm)
```

### **Step 4: Apply Employment Cap**
```javascript
// Government
employmentCap = $300

// Others
employmentCap = $100

// Final cold start limit
coldStartLimit = min(maxLoanFromDTNI, employmentCap)
```

---

## 📊 Examples

### **Example 1: Government Employee - $600 Income**

```
Monthly Income: $600
Employment Type: government
DTNI: 40%
Existing Debt: $0

Step 1: Max Installment
$600 × 40% = $240

Step 2: Available Installment
$240 - $0 = $240

Step 3: DTNI-based Limit (Reducing Balance)
r = 0.004167
n = 3
powerTerm = (1.004167)^3 = 1.01256

maxLoan = ($240 × 0.01256) / 0.004219
maxLoan = $714.52

Step 4: Apply Employment Cap
coldStartLimit = min($714.52, $300)
coldStartLimit = $300 ✅

Result: Government employee can borrow up to $300
```

---

### **Example 2: Government Employee - $300 Income**

```
Monthly Income: $300
Employment Type: government
DTNI: 40%
Existing Debt: $0

Step 1: Max Installment
$300 × 40% = $120

Step 2: Available Installment
$120 - $0 = $120

Step 3: DTNI-based Limit
maxLoan = ($120 × 0.01256) / 0.004219
maxLoan = $357.26

Step 4: Apply Employment Cap
coldStartLimit = min($357.26, $300)
coldStartLimit = $300 ✅

Result: Can still borrow $300 (DTNI allows it)
```

---

### **Example 3: Government Employee - $200 Income**

```
Monthly Income: $200
Employment Type: government
DTNI: 40%
Existing Debt: $0

Step 1: Max Installment
$200 × 40% = $80

Step 2: Available Installment
$80 - $0 = $80

Step 3: DTNI-based Limit
maxLoan = ($80 × 0.01256) / 0.004219
maxLoan = $238.17

Step 4: Apply Employment Cap
coldStartLimit = min($238.17, $300)
coldStartLimit = $238 ✅

Result: DTNI limits to $238 (below $300 cap)
```

---

### **Example 4: Private Employee - $400 Income**

```
Monthly Income: $400
Employment Type: private
DTNI: 33%
Existing Debt: $0

Step 1: Max Installment
$400 × 33% = $132

Step 2: Available Installment
$132 - $0 = $132

Step 3: DTNI-based Limit
maxLoan = ($132 × 0.01256) / 0.004219
maxLoan = $392.83

Step 4: Apply Employment Cap
coldStartLimit = min($392.83, $100)
coldStartLimit = $100 ✅

Result: Employment cap limits to $100
```

---

### **Example 5: Private Employee - $200 Income**

```
Monthly Income: $200
Employment Type: private
DTNI: 33%
Existing Debt: $0

Step 1: Max Installment
$200 × 33% = $66

Step 2: Available Installment
$66 - $0 = $66

Step 3: DTNI-based Limit
maxLoan = ($66 × 0.01256) / 0.004219
maxLoan = $196.42

Step 4: Apply Employment Cap
coldStartLimit = min($196.42, $100)
coldStartLimit = $100 ✅

Result: Employment cap limits to $100
```

---

### **Example 6: Private Employee - $100 Income**

```
Monthly Income: $100
Employment Type: private
DTNI: 33%
Existing Debt: $0

Step 1: Max Installment
$100 × 33% = $33

Step 2: Available Installment
$33 - $0 = $33

Step 3: DTNI-based Limit
maxLoan = ($33 × 0.01256) / 0.004219
maxLoan = $98.21

Step 4: Apply Employment Cap
coldStartLimit = min($98.21, $100)
coldStartLimit = $98 ✅

Result: DTNI limits to $98 (just below $100 cap)
```

---

### **Example 7: Government Employee with Existing Debt**

```
Monthly Income: $600
Employment Type: government
DTNI: 40%
Existing Monthly Payments: $150

Step 1: Max Installment
$600 × 40% = $240

Step 2: Available Installment
$240 - $150 = $90

Step 3: DTNI-based Limit
maxLoan = ($90 × 0.01256) / 0.004219
maxLoan = $267.94

Step 4: Apply Employment Cap
coldStartLimit = min($267.94, $300)
coldStartLimit = $268 ✅

Result: DTNI limits to $268 due to existing debt
```

---

## 🎯 Key Insights

### **Government Employees:**
- ✅ Higher DTNI allowance (40% vs 33%)
- ✅ Higher cold start cap ($300 vs $100)
- ✅ Can borrow more with same income
- ✅ DTNI becomes limiting factor only at lower incomes

### **Other Employees:**
- ✅ Lower DTNI allowance (33%)
- ✅ Lower cold start cap ($100)
- ✅ Employment cap is usually the limiting factor
- ✅ DTNI matters only at very low incomes

---

## 📋 Implementation Details

### **Code Location:**
```
services/zimscore.service.js
- calculateColdStartScore() → Main entry point
- calculateColdStartLimit() → DTNI calculation
```

### **Key Variables:**
```javascript
// Employment-based DTNI
const dtniPercentage = isCivilServant ? 0.40 : 0.33;

// Employment-based caps
const employmentCap = employmentType === 'government' ? 300 : 100;

// Final limit
const maxLoanAmount = Math.min(dtniBasedLimit, employmentCap);
```

---

## 🔄 After First Repayment

### **Cold Start Removed:**
```
User repays first loan on-time
→ Cold start flag removed
→ Score-based limit unlocked
→ Can now borrow based on ZimScore (up to $1,000)
```

### **Score-Based Limits:**
```javascript
| ZimScore | Max Loan |
|----------|----------|
| 80-85    | $1,000   |
| 70-79    | $800     |
| 60-69    | $600     |
| 50-59    | $400     |
| 40-49    | $300     |
| 30-39    | $100     |
```

---

## ✅ Summary

### **Cold Start Formula:**
```
Final Limit = min(DTNI-based limit, Employment cap)

Where:
- DTNI-based = Calculated from reducing balance method
- Employment cap = $300 (government) or $100 (others)
- DTNI % = 40% (government) or 33% (others)
```

### **When DTNI Matters:**
- ✅ Government employees with income < $250
- ✅ Other employees with income < $100
- ✅ Anyone with existing debt
- ✅ Low-income borrowers

### **When Employment Cap Matters:**
- ✅ Government employees with income > $250
- ✅ Other employees with income > $100
- ✅ High-income borrowers with no debt

---

**ZimScore cold start implementation is complete with proper employment-based caps and DTNI validation!** 🎯

---

**Document Version: 1.0 (Final)**  
**Last Updated: November 28, 2025**  
**Status: Production-Ready**  
**Implementation: Complete ✅**

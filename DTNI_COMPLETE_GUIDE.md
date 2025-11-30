# 💰 DTNI Complete Implementation Guide

## ✅ **PRODUCTION-READY IMPLEMENTATION**

**Last Updated:** November 30, 2025  
**Version:** 3.0.0  
**Status:** ✅ Complete & Production-Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Reducing Balance Formula](#reducing-balance-formula)
3. [Cold Start Limits](#cold-start-limits)
4. [DTNI Calculation Steps](#dtni-calculation-steps)
5. [Employment-Based Limits](#employment-based-limits)
6. [Installment Utilization](#installment-utilization)
7. [API Endpoints](#api-endpoints)
8. [Implementation Code](#implementation-code)
9. [Examples](#examples)
10. [Testing & Verification](#testing--verification)

---

## Overview

**DTNI (Debt-to-Net-Income)** is the core loan affordability calculation that determines how much a user can borrow based on their income and existing debt obligations.

### ⚠️ DTNI is ALWAYS Required

**Bank statement submission is mandatory for EVERY loan request**, regardless of whether the user is in cold start or has an established ZimScore. DTNI ensures responsible lending by verifying the borrower can afford the loan.

### Key Principles:
- ✅ Maximum 40% of net salary for loan installments (government)
- ✅ Maximum 33% of net salary for loan installments (others)
- ✅ Uses reducing balance amortization (not simple interest)
- ✅ Employment caps apply during cold start phase
- ✅ ZimScore limits apply after cold start (but still capped by DTNI)
- ✅ **Bank statement required for EVERY loan application**

### When DTNI is Used:

| Phase | Loan Limit Formula |
|-------|-------------------|
| **Cold Start (1st loan)** | `min(DTNI, Employment Cap)` |
| **Post-Cold Start** | `min(DTNI, ZimScore Limit)` |

### Why Bank Statement is Always Required:
1. **Income Verification** - Confirms current monthly income
2. **Existing Debt Check** - Calculates current debt obligations  
3. **Affordability Assessment** - Ensures user can repay
4. **Regulatory Compliance** - Responsible lending requirement
5. **Risk Management** - Prevents over-indebtedness

---

## Reducing Balance Formula

### ❌ **WRONG Approach (Simple Interest)**
```
Max Installment = $600 × 40% = $240
Max Loan = $240 ÷ (1 + 5%) = $228 ❌
```

**This is INCORRECT because:**
- Treats the loan as simple interest
- Doesn't account for reducing balance amortization
- Underestimates the maximum loan amount

### ✅ **CORRECT Approach (Reducing Balance)**

#### Formula to Find Principal from Monthly Payment:
```
P = (M × [(1 + r)^n - 1]) / [r × (1 + r)^n]

Where:
- P = Principal (loan amount)
- M = Monthly payment (available installment)
- r = Monthly interest rate (annual ÷ 12)
- n = Number of months
```

#### Example Calculation:
```javascript
// Given:
M = $240 (available monthly installment)
r = 0.05 / 12 = 0.004167 (monthly rate)
n = 3 months

// Calculate:
(1 + r)^n = (1.004167)^3 = 1.01256
[(1 + r)^n - 1] = 0.01256
r × (1 + r)^n = 0.004167 × 1.01256 = 0.004219

// Final:
P = ($240 × 0.01256) / 0.004219
P = $714.52 ✅
```

---

## Cold Start Limits

### Employment-Based Caps

| Employment Type | Max Cold Start | Max DTNI % |
|-----------------|----------------|------------|
| **Government** | $300 | 40% |
| **Private** | $100 | 33% |
| **Business** | $100 | 33% |
| **Informal** | $100 | 33% |

### Cold Start Formula:
```javascript
Final Limit = min(DTNI-based limit, Employment cap)
```

### After First Repayment:
- Cold start flag removed
- Score-based limit unlocked (up to $1,000)
- Progressive borrowing enabled

---

## DTNI Calculation Steps

### Step 1: Calculate Maximum Monthly Installment
```javascript
// Government employees
maxInstallment = monthlyIncome × 40%

// Other employees
maxInstallment = monthlyIncome × 33%
```

### Step 2: Calculate Available Installment
```javascript
availableInstallment = maxInstallment - existingMonthlyPayments
```

### Step 3: Calculate Maximum Loan (Reducing Balance)
```javascript
const annualInterestRate = 0.05; // 5% annual
const monthlyInterestRate = annualInterestRate / 12;
const termMonths = Math.ceil(tenure_days / 30);

let maxLoanFromDTNI;
if (monthlyInterestRate > 0 && termMonths > 0) {
    const powerTerm = Math.pow(1 + monthlyInterestRate, termMonths);
    maxLoanFromDTNI = (availableInstallment * (powerTerm - 1)) / (monthlyInterestRate * powerTerm);
} else {
    maxLoanFromDTNI = availableInstallment * termMonths;
}
```

### Step 4: Apply Employment Cap
```javascript
const employmentCap = employmentType === 'government' ? 300 : 100;
const coldStartLimit = zimScore.cold_start_limit || employmentCap;

let finalMaxLoan;
if (zimScore.is_cold_start) {
    finalMaxLoan = Math.min(maxLoanFromDTNI, employmentCap, coldStartLimit);
} else {
    finalMaxLoan = Math.min(maxLoanFromDTNI, employmentCap);
}
```

---

## Employment-Based Limits

| Employment | Max Loan | Max Tenure | DTNI % | ZimScore Bonus |
|------------|----------|------------|--------|----------------|
| **Government** | $300 | 24 months | 40% | +10 points |
| **Private** | $100 | 12 months | 33% | +6 points |
| **Business** | $100 | 12 months | 33% | +3 points |
| **Informal** | $100 | 12 months | 33% | +0 points |

---

## Installment Utilization

### Thresholds

| Utilization | Status | Description |
|-------------|--------|-------------|
| **0%** | Excellent | No existing debt, full capacity |
| **1-20%** | Excellent | Very low debt, excellent capacity |
| **21-50%** | Good | Moderate debt, good capacity |
| **51-80%** | Fair | Higher debt, limited capacity |
| **81-99%** | Limited | Near maximum capacity |
| **100%+** | Denied | At/over limit, must repay first |

### DTNI Limits by Status

| DTNI Ratio | Status | Civil Servants | Others |
|------------|--------|----------------|--------|
| 0-20% | Excellent | $300 (100%) | $100 (100%) |
| 21-30% | Good | $240 (80%) | $80 (80%) |
| 31-40% | Fair | $180 (60%) | ❌ Denied |
| At Max | Limited | $180 | $60 |
| Over Max | Denied | $0 | $0 |

---

## API Endpoints

### POST /api/loans/validate
Validate loan application without submitting.

```bash
curl -X POST http://localhost:3001/api/loans/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount":200,"termDays":90,"interestRate":5}'
```

### POST /api/loans/calculate-max
Calculate maximum loan amount user can afford.

```bash
curl -X POST http://localhost:3001/api/loans/calculate-max \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"termDays":360,"interestRate":5}'
```

### POST /api/loans/apply
Submit loan application with full validation.

```bash
curl -X POST http://localhost:3001/api/loans/apply \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount":200,"termDays":90,"interestRate":5,"purpose":"Business"}'
```

### API Response Format
```json
{
  "success": true,
  "approved": true,
  "message": "Loan application approved based on DTNI and ZimScore",
  "data": {
    "amount": 200,
    "monthlyInstallment": "67.22",
    "totalAmount": "201.67",
    "dtni": {
      "netSalary": 600,
      "maxInstallment": "240.00",
      "availableInstallment": "240.00",
      "installmentUtilization": "28.0%",
      "remainingCapacity": "172.78"
    },
    "validation": {
      "dtniApproved": true,
      "employmentCapApproved": true,
      "tenureValid": true
    }
  }
}
```

---

## Implementation Code

### Backend (Node.js)
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

### Frontend (JavaScript)
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

## Examples

### Example 1: Government Employee - No Existing Debt
```
Monthly Income: $600
Employment Type: government
Max DTNI: 40%
Existing Debt: $0
Tenure: 90 days (3 months)

Step 1: Max Installment = $600 × 40% = $240
Step 2: Available Installment = $240 - $0 = $240
Step 3: DTNI-based Limit = $714.52
Step 4: Cold Start Limit = min($714.52, $300) = $300 ✅
```

### Example 2: Private Employee - Lower Income
```
Monthly Income: $300
Employment Type: private
Max DTNI: 33%
Existing Debt: $0
Tenure: 90 days (3 months)

Step 1: Max Installment = $300 × 33% = $99
Step 2: Available Installment = $99 - $0 = $99
Step 3: DTNI-based Limit = $294.51
Step 4: Cold Start Limit = min($294.51, $100) = $100 ✅
```

### Example 3: Government Employee - With Existing Debt
```
Monthly Income: $600
Employment Type: government
Max DTNI: 40%
Existing Monthly Payments: $150
Tenure: 90 days (3 months)

Step 1: Max Installment = $600 × 40% = $240
Step 2: Available Installment = $240 - $150 = $90
Step 3: DTNI-based Limit = $267.94
Step 4: Cold Start Limit = min($267.94, $300) = $267.94 ✅
```

### Example 4: At Maximum DTNI - Denied
```
Monthly Income: $200
Employment Type: informal
Max DTNI: 33%
Existing Monthly Payments: $66 (33% of income)

Step 1: Max Installment = $200 × 33% = $66
Step 2: Available Installment = $66 - $66 = $0
Step 3: DTNI-based Limit = $0
Result: DENIED ❌ - Must repay existing debt first
```

---

## Testing & Verification

### Test Case: $300 loan at 5% for 3 months
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

### Comparison Table

| Income | DTNI | Max Installment | OLD (Wrong) | NEW (Correct) | Employment Cap | Final Max |
|--------|------|-----------------|-------------|---------------|----------------|-----------|
| $600 | 40% | $240 | $228 ❌ | $714.52 | $300 | **$300** ✅ |
| $500 | 40% | $200 | $190 ❌ | $595.43 | $300 | **$300** ✅ |
| $400 | 40% | $160 | $152 ❌ | $476.35 | $300 | **$300** ✅ |
| $300 | 33% | $99 | $94 ❌ | $294.51 | $100 | **$100** ✅ |
| $200 | 33% | $66 | $63 ❌ | $196.34 | $100 | **$100** ✅ |

**Key Insight:** For most cold start users, the **employment cap** is the limiting factor, not DTNI!

---

## Database Schema

```sql
-- Enhanced loans table with DTNI validation
ALTER TABLE loans ADD COLUMN dtni_validation JSONB;
ALTER TABLE loans ADD COLUMN monthly_installment DECIMAL(10,2);

-- Employment details for DTNI calculation
ALTER TABLE employment_details ADD COLUMN employment_type VARCHAR(20);
ALTER TABLE employment_details ADD COLUMN monthly_income DECIMAL(10,2);

-- ZimScore integration
ALTER TABLE user_zimscores ADD COLUMN cold_start_active BOOLEAN DEFAULT true;
ALTER TABLE user_zimscores ADD COLUMN max_loan_amount DECIMAL(10,2);
ALTER TABLE user_zimscores ADD COLUMN dtni_ratio DECIMAL(5,4);
ALTER TABLE user_zimscores ADD COLUMN dtni_status TEXT;
```

---

## Benefits

### 1. More Accurate ✅
- Reflects real amortization schedules
- Uses industry-standard reducing balance method

### 2. Higher Limits ✅
- Users can borrow more when DTNI allows
- Fair calculation of borrowing capacity

### 3. Risk-Based Lending ✅
- Limits based on actual ability to repay
- Prevents over-indebtedness
- Protects both lender and borrower

### 4. Transparent ✅
- Clear DTNI calculation
- Visible status (Excellent, Good, Fair, etc.)
- Users understand their limits

---

## Summary

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

---

*This document consolidates all DTNI documentation into a single comprehensive guide.*

# 🎯 ZimScore Complete Implementation Guide

## ✅ **PRODUCTION-READY IMPLEMENTATION**

**Last Updated:** November 30, 2025  
**Version:** 3.0.0  
**Status:** ✅ Complete & Production-Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Score Range & Loan Limits](#score-range--loan-limits)
3. [Three-Component Calculation](#three-component-calculation)
4. [Cold Start Strategy](#cold-start-strategy)
5. [DTNI Calculation](#dtni-calculation)
6. [Employment Types](#employment-types)
7. [Trust Loop (Score Updates)](#trust-loop-score-updates)
8. [API Endpoints](#api-endpoints)
9. [Database Schema](#database-schema)
10. [Frontend Integration](#frontend-integration)
11. [Complete User Flow](#complete-user-flow)
12. [Examples](#examples)

---

## Overview

**ZimScore** is ZimCrowd's proprietary credit scoring system (30-85 points) that determines maximum loan amounts based on:
- Banking data (from OCR)
- Employment type
- Repayment behavior

### Key Principles:
- ✅ Score determines loan amount limit ONLY
- ✅ Users always choose their own interest rate (0-10%)
- ✅ All new users start with cold start limit
- ✅ Score updates after each loan repayment

---

## Score Range & Loan Limits

| ZimScore | Risk Level | Max Loan | Star Rating |
|----------|-----------|----------|-------------|
| **80-85** | Very Low Risk | $1,000 | ⭐⭐⭐⭐⭐ 5.0 |
| **70-79** | Low Risk | $800 | ⭐⭐⭐⭐☆ 4.0 |
| **60-69** | Medium Risk | $600 | ⭐⭐⭐☆☆ 3.0 |
| **50-59** | High Risk | $400 | ⭐⭐☆☆☆ 2.5 |
| **40-49** | Very High Risk | $300 | ⭐⭐☆☆☆ 2.0 |
| **30-39** | Building Credit | $100 | ⭐☆☆☆☆ 1.0 |

### Star Rating Formula:
```javascript
starRating = 1.0 + ((score - 30) / 55) * 4.0
// Rounded to nearest 0.5
```

---

## Three-Component Calculation

### **Final Score = Component 1 + Component 2 + Component 3**

```
Component 1: Banking Data Analysis (30-60 points)
Component 2: Employment Bonus (0-10 points)
Component 3: Performance Adjustment (-20 to +39 points)

Total Range: 30-85 points
```

---

### Component 1: Banking Data Analysis (30-60 points)

**Source:** Extracted from bank statement via OCR

#### Factor 1: Cash Flow Ratio (0-20 points)
```javascript
cashFlowRatio = totalCredits / totalDebits

if (cashFlowRatio >= 1.2) → +20 points (Excellent)
else if (cashFlowRatio >= 1.0) → +15 points (Good)
else if (cashFlowRatio >= 0.8) → +10 points (Moderate)
else if (cashFlowRatio >= 0.6) → +5 points (Weak)
else → +0 points (Poor)
```

#### Factor 2: Average Balance (0-10 points)
```javascript
avgBalance = (openingBalance + closingBalance) / 2

if (avgBalance > 200) → +10 points
else if (avgBalance >= 50) → +6 points
else if (avgBalance > 0) → +2 points
else → +0 points
```

#### Factor 3: Balance Consistency (0-5 points)
```javascript
consistency = closingBalance / openingBalance

if (consistency >= 0.9) → +5 points
else if (consistency >= 0.7) → +3 points
else → +0 points
```

#### Factor 4: NSF/Overdraft Events (0-10 points)
```javascript
if (nsfEvents === 0) → +10 points
else if (nsfEvents <= 2) → +5 points
else → +0 points
```

#### Factor 5: Account Tenor (0-5 points)
```javascript
if (accountAge >= 12) → +5 points
else if (accountAge >= 6) → +3 points
else if (accountAge >= 3) → +1 point
else → +0 points
```

#### Factor 6: Additional Accounts (0-10 points)
```javascript
additionalAccounts × 2 points (max 10)
```

---

### Component 2: Employment Bonus (0-10 points)

| Employment Type | Bonus Points | Rationale |
|-----------------|--------------|-----------|
| **Government** | +10 points | Guaranteed salary, deduction at source |
| **Private** | +6 points | Formal employment with payroll |
| **Business** | +3 points | Self-employed but established |
| **Informal** | +0 points | Irregular income |

---

### Component 3: Performance Adjustment (-20 to +39 points)

**Based on on-platform repayment behavior.**

#### On-Time Payment Rate:
```javascript
if (onTimeRate >= 95%) → +25 points
else if (onTimeRate >= 90%) → +20 points
else if (onTimeRate >= 80%) → +15 points
else if (onTimeRate >= 70%) → +10 points
else if (onTimeRate >= 60%) → +5 points
else → -10 points
```

#### Late Payment Penalty:
```javascript
Each late payment: -5 points
Maximum penalty: -20 points total
```

#### Loan Size Progression (0-10 points):
```javascript
Successfully repaid ≥$800: +10 points
Successfully repaid ≥$600: +8 points
Successfully repaid ≥$400: +6 points
Successfully repaid ≥$200: +4 points
Successfully repaid ≥$100: +2 points
```

#### Platform Tenure (0-4 points):
```javascript
Active ≥24 months: +4 points
Active ≥12 months: +3 points
Active ≥6 months: +2 points
Active ≥3 months: +1 point
```

---

## Cold Start Strategy

### Employment-Based Caps

| Employment Type | Cold Start Cap | DTNI % |
|-----------------|----------------|--------|
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
- Score-based limit unlocked
- Can borrow based on ZimScore (up to $1,000)

---

## DTNI Calculation

**DTNI (Debt-to-Net-Income)** determines how much a user can borrow based on their income and existing debt.

### ❌ Wrong Approach (Simple Interest)
```javascript
// DON'T DO THIS - Underestimates borrowing capacity
Max Loan = $240 ÷ (1 + 5%) = $228 ❌
```

### ✅ Correct Approach (Reducing Balance)

#### Step 1: Calculate Maximum Monthly Installment
```javascript
// Government employees (40% DTNI)
maxInstallment = monthlyIncome × 0.40

// Other employees (33% DTNI)
maxInstallment = monthlyIncome × 0.33

// Example: $600 income × 40% = $240
```

#### Step 2: Calculate Available Installment
```javascript
availableInstallment = maxInstallment - existingMonthlyPayments

// Example: $240 - $0 = $240
```

#### Step 3: Calculate Maximum Loan (Reducing Balance Formula)
```javascript
// Formula: P = (M × [(1 + r)^n - 1]) / [r × (1 + r)^n]
// Where:
// P = Principal (loan amount)
// M = Available monthly installment
// r = Monthly interest rate (5% annual ÷ 12 = 0.004167)
// n = Term in months (90 days ÷ 30 = 3 months)

const annualInterestRate = 0.05;
const monthlyRate = annualInterestRate / 12; // 0.004167
const termMonths = Math.ceil(tenure_days / 30); // 3

const powerTerm = Math.pow(1 + monthlyRate, termMonths); // 1.01256
const maxLoanFromDTNI = (availableInstallment * (powerTerm - 1)) / (monthlyRate * powerTerm);

// Example: ($240 × 0.01256) / 0.004219 = $714.52 ✅
```

#### Step 4: Apply Employment Cap
```javascript
const employmentCap = employmentType === 'government' ? 300 : 100;

let finalMaxLoan;
if (isColdStart) {
    finalMaxLoan = Math.min(maxLoanFromDTNI, employmentCap);
} else {
    finalMaxLoan = Math.min(maxLoanFromDTNI, scoreBasedLimit);
}

// Example: min($714.52, $300) = $300 ✅
```

### DTNI Comparison Table

| Income | DTNI % | Max Installment | OLD (Wrong) | NEW (Correct) | Employment Cap | Final |
|--------|--------|-----------------|-------------|---------------|----------------|-------|
| $600 | 40% | $240 | $228 ❌ | $714.52 | $300 | **$300** |
| $500 | 40% | $200 | $190 ❌ | $595.43 | $300 | **$300** |
| $400 | 40% | $160 | $152 ❌ | $476.35 | $300 | **$300** |
| $300 | 33% | $99 | $94 ❌ | $294.51 | $100 | **$100** |
| $200 | 33% | $66 | $63 ❌ | $196.34 | $100 | **$100** |

**Key Insight:** For most cold start users, the **employment cap** is the limiting factor, not DTNI!

### Installment Utilization Thresholds

| Utilization | Status | Description |
|-------------|--------|-------------|
| **0%** | Excellent | No existing debt, full capacity |
| **1-20%** | Excellent | Very low debt |
| **21-50%** | Good | Moderate debt |
| **51-80%** | Fair | Limited capacity |
| **81-99%** | Limited | Near maximum |
| **100%+** | Denied | Must repay first |

### Implementation Code
```javascript
// Backend: Calculate max loan using Reducing Balance Method
function calculateMaxLoan(monthlyIncome, employmentType, existingDebt, tenureDays) {
    const dtniPercent = employmentType === 'government' ? 0.40 : 0.33;
    const maxInstallment = monthlyIncome * dtniPercent;
    const availableInstallment = maxInstallment - existingDebt;
    
    if (availableInstallment <= 0) {
        return { maxLoan: 0, status: 'Denied - DTNI too high' };
    }
    
    const annualRate = 0.05;
    const monthlyRate = annualRate / 12;
    const termMonths = Math.ceil(tenureDays / 30);
    
    let maxLoanFromDTNI;
    if (monthlyRate > 0 && termMonths > 0) {
        const powerTerm = Math.pow(1 + monthlyRate, termMonths);
        maxLoanFromDTNI = (availableInstallment * (powerTerm - 1)) / (monthlyRate * powerTerm);
    } else {
        maxLoanFromDTNI = availableInstallment * termMonths;
    }
    
    const employmentCap = employmentType === 'government' ? 300 : 100;
    return {
        maxLoan: Math.min(maxLoanFromDTNI, employmentCap),
        dtniBasedLimit: maxLoanFromDTNI,
        employmentCap: employmentCap,
        utilizationPercent: ((maxInstallment - availableInstallment) / maxInstallment) * 100
    };
}
```

---

## Employment Types

### Validation Required
Employment type is **REQUIRED** before ZimScore can be calculated.

```javascript
const validEmploymentTypes = ['government', 'private', 'business', 'informal'];
```

### API Endpoint:
```
POST /api/profile-setup/employment
{
  "employment_status": "employed",
  "employment_type": "government",
  "employer_name": "Ministry of Health",
  "job_title": "Nurse",
  "monthly_income": 500
}
```

---

## Trust Loop (Score Updates)

### Score Update Events:

| Event | Score Change |
|-------|--------------|
| `LOAN_REPAID_ON_TIME` | +3 points |
| `LOAN_REPAID_EARLY` | +5 points |
| `LOAN_REPAID_LATE` | -5 points |
| `LOAN_DEFAULTED` | -15 points |
| `FIRST_LOAN_COMPLETED` | Removes cold start |

### Implementation:
```javascript
await zimScoreService.updateScoreFromTrustLoop(userId, {
    type: 'LOAN_REPAID_ON_TIME',
    loanId: 'loan-123',
    loanAmount: 100
});
```

---

## API Endpoints

### Get Current ZimScore (Dashboard)
```
GET /api/zimscore/current
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "score_value": 70,
    "star_rating": 4.0,
    "max_loan_amount": 100,
    "score_based_limit": 800,
    "risk_level": "Low Risk",
    "cold_start_active": true
  }
}
```

### Get Detailed Score
```
GET /api/zimscore/my-score
Authorization: Bearer TOKEN
```

### Get Score Breakdown
```
GET /api/zimscore/breakdown
Authorization: Bearer TOKEN

Response:
{
  "success": true,
  "data": {
    "score": 70,
    "components": {
      "component1": { "name": "Banking Data", "score": 60, "maxScore": 60 },
      "component2": { "name": "Employment", "score": 10, "maxScore": 10 },
      "component3": { "name": "Performance", "score": 0, "maxScore": 39 }
    }
  }
}
```

### Get Score History
```
GET /api/zimscore/score-history
Authorization: Bearer TOKEN
```

### Get Public Star Rating
```
GET /api/zimscore/public/:userId
```

---

## Database Schema

### user_zimscores Table
```sql
CREATE TABLE user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    score_value INTEGER NOT NULL CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) NOT NULL,
    max_loan_amount DECIMAL(10,2) NOT NULL,
    score_based_limit DECIMAL(10,2) NOT NULL,
    risk_level TEXT NOT NULL,
    employment_type TEXT,
    component1_banking INTEGER DEFAULT 0,
    component2_employment INTEGER DEFAULT 0,
    component3_performance INTEGER DEFAULT 0,
    cold_start_active BOOLEAN DEFAULT TRUE,
    last_calculated TIMESTAMP DEFAULT NOW()
);
```

### zimscore_history Table
```sql
CREATE TABLE zimscore_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    old_score_value INTEGER,
    new_score_value INTEGER,
    score_change INTEGER,
    change_reason TEXT,
    related_loan_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Frontend Integration

### Dashboard Header Display
```html
<span id="zimscore-display">
    <span id="zimscore-stars" class="zimscore-stars">★★★★☆</span>
    <span id="zimscore-value" class="zimscore-value">70/85</span>
</span>
```

### JavaScript to Load ZimScore
```javascript
async function loadZimScore() {
    const authToken = localStorage.getItem('authToken');
    const response = await fetch('/api/zimscore/current', {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    if (data.success && data.data) {
        displayZimScore(data.data);
    }
}

function displayZimScore(zimscoreData) {
    const starRating = zimscoreData.star_rating || 0;
    const fullStars = Math.floor(starRating);
    let starsHtml = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
    
    document.getElementById('zimscore-stars').innerHTML = starsHtml;
    document.getElementById('zimscore-value').textContent = 
        `${zimscoreData.score_value}/85`;
}
```

---

## Complete User Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ZIMSCORE USER FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SIGNUP                                                                   │
│     └── Google / Facebook / Phone / Email                                    │
│                                                                              │
│  2. POST-REGISTRATION                                                        │
│     ├── Upload National ID (Front + Back) → OCR extracts data              │
│     ├── Upload Selfie → Face detection                                       │
│     ├── Set Employment Type (REQUIRED)                                       │
│     ├── Upload Bank Statement → OCR extracts financial data                 │
│     └── Upload Payslip (optional)                                            │
│                                                                              │
│  3. ZIMSCORE CALCULATION                                                     │
│     ├── Component 1: Banking Data (30-60 pts)                               │
│     ├── Component 2: Employment Bonus (0-10 pts)                            │
│     └── Component 3: Performance (0 for new users)                          │
│                                                                              │
│  4. COLD START LIMIT                                                         │
│     ├── Government: min(DTNI, $300)                                         │
│     └── Others: min(DTNI, $100)                                              │
│                                                                              │
│  5. FIRST LOAN                                                               │
│     └── Borrow up to cold start limit                                        │
│                                                                              │
│  6. FIRST REPAYMENT                                                          │
│     ├── Score updated (+3 points)                                            │
│     ├── Cold start removed                                                   │
│     └── Score-based limit unlocked                                           │
│                                                                              │
│  7. PROGRESSIVE BORROWING                                                    │
│     └── Limit increases with good behavior (up to $1,000)                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Examples

### Example 1: Government Employee - $600 Income
```
Monthly Income: $600
Employment Type: government
DTNI: 40%
Existing Debt: $0

Step 1: Max Installment = $600 × 40% = $240
Step 2: Available Installment = $240 - $0 = $240
Step 3: DTNI-based Limit = $714.52
Step 4: Cold Start Limit = min($714.52, $300) = $300 ✅
```

### Example 2: Private Employee - $400 Income
```
Monthly Income: $400
Employment Type: private
DTNI: 33%
Existing Debt: $0

Step 1: Max Installment = $400 × 33% = $132
Step 2: Available Installment = $132 - $0 = $132
Step 3: DTNI-based Limit = $392.83
Step 4: Cold Start Limit = min($392.83, $100) = $100 ✅
```

### Example 3: New User Score Calculation
```
Banking Data:
- Cash flow ratio: 1.25 → +20 points
- Avg balance: $200 → +10 points
- Consistency: 95% → +5 points
- NSF events: 0 → +10 points
- Account age: 18 months → +5 points
- Additional accounts: 2 → +4 points
Component 1 Total: 30 + 54 = 84 → capped at 60

Employment: Private → +6 points

Performance: New user → +0 points

Final Score: 60 + 6 + 0 = 66
Risk Level: Medium Risk
Cold Start Limit: $100
Score-based Limit: $600 (unlocks after first repayment)
```

### Example 4: After 5 On-Time Repayments
```
Previous Score: 66
Trust Loop: 5 × LOAN_REPAID_ON_TIME = +15 points
New Score: 66 + 15 = 81
Risk Level: Very Low Risk
New Limit: $1,000
```

---

## Files Reference

### Backend Services
- `services/zimscore.service.js` - Main ZimScore calculation
- `services/google-docai.service.js` - OCR for bank statements
- `services/vision-ocr.service.js` - OCR orchestration

### API Routes
- `routes/zimscore.js` - ZimScore endpoints
- `routes/profile-setup.js` - KYC and document upload

### Database
- `migrations/create_zimscore_tables.sql` - Schema

### Frontend
- `dashboard.html` - ZimScore display in header
- `post-registration.html` - Document upload flow

---

## What ZimScore Does NOT Do

❌ Control interest rates (users choose 0-10%)
❌ Force pricing tiers
❌ Guarantee loan approval
❌ Replace credit bureaus

## What ZimScore DOES Do

✅ Determine maximum loan amount
✅ Provide risk assessment
✅ Track repayment behavior
✅ Reward good performance
✅ Penalize late payments
✅ Enable progressive borrowing

---

**ZimScore is a simple, transparent system that rewards good financial behavior and enables progressive borrowing for Zimbabwean users.** 🎯

---

*This document consolidates all ZimScore documentation into a single comprehensive guide.*

# 🎯 ZimScore Calculation & Borrowing Limits

## Overview

ZimScore is ZimCrowd's proprietary credit scoring system that determines user borrowing limits based on financial behavior and repayment history.

---

## 💰 Cold Start Strategy

### **New Users (First-Time Borrowers):**

```
All approved KYC users → $100 cold start limit
```

**Why $100?**
- ✅ Low risk for platform
- ✅ Accessible to all users
- ✅ Allows users to build credit history
- ✅ Tests repayment behavior
- ✅ Generates initial ZimScore data

**Requirements:**
- ✅ Complete KYC verification
- ✅ All 4 documents submitted
- ✅ Admin approval
- ✅ Bank statement uploaded

**Initial ZimScore:** 300 (Cold Start Score)

---

## 📊 ZimScore Calculation

### **Score Range:**
```
Minimum: 300 (Cold Start)
Maximum: 850 (Excellent)
```

### **Score Tiers:**

| ZimScore Range | Credit Rating | Borrowing Limit | Interest Rate |
|----------------|---------------|-----------------|---------------|
| 300 - 400 | Poor | $100 - $200 | 15% |
| 401 - 500 | Fair | $201 - $500 | 12% |
| 501 - 600 | Good | $501 - $1,000 | 10% |
| 601 - 700 | Very Good | $1,001 - $2,500 | 8% |
| 701 - 850 | Excellent | $2,501 - $5,000 | 5% |

---

## 🧮 ZimScore Factors

### **1. Bank Statement Analysis (40% weight)**

Extracted from uploaded bank statement:

#### **Income Stability (15%)**
```javascript
// Monthly income consistency
const incomeStability = calculateIncomeStability(bankStatement);

Factors:
- Regular deposits (salary, business income)
- Frequency of income (monthly, weekly)
- Income amount consistency
- Multiple income sources

Score Impact:
- Regular monthly income: +150 points
- Irregular income: +75 points
- No clear income pattern: +0 points
```

#### **Account Balance (10%)**
```javascript
// Average balance over statement period
const avgBalance = (openingBalance + closingBalance) / 2;

Score Impact:
- Balance > $500: +100 points
- Balance $200-$500: +50 points
- Balance $50-$200: +25 points
- Balance < $50: +0 points
```

#### **Cash Flow (10%)**
```javascript
// Total credits vs debits
const cashFlowRatio = totalCredits / totalDebits;

Score Impact:
- Ratio > 1.5 (positive cash flow): +100 points
- Ratio 1.0-1.5 (balanced): +50 points
- Ratio < 1.0 (negative): +0 points
```

#### **Transaction Activity (5%)**
```javascript
// Number and frequency of transactions
const transactionActivity = calculateActivity(transactions);

Score Impact:
- Active account (20+ transactions/month): +50 points
- Moderate (10-20 transactions): +25 points
- Low activity: +0 points
```

---

### **2. Repayment History (35% weight)**

#### **On-Time Payments (20%)**
```javascript
const onTimeRate = onTimePayments / totalLoans;

Score Impact:
- 100% on-time: +200 points
- 90-99% on-time: +150 points
- 80-89% on-time: +100 points
- 70-79% on-time: +50 points
- < 70% on-time: -50 points
```

#### **Loan Completion Rate (10%)**
```javascript
const completionRate = completedLoans / totalLoans;

Score Impact:
- 100% completion: +100 points
- 90-99%: +75 points
- 80-89%: +50 points
- < 80%: +0 points
```

#### **Default History (5%)**
```javascript
const defaultRate = defaultedLoans / totalLoans;

Score Impact:
- 0% defaults: +50 points
- 1-5% defaults: +0 points
- > 5% defaults: -100 points
```

---

### **3. Loan Utilization (15% weight)**

#### **Credit Utilization Ratio (10%)**
```javascript
const utilizationRatio = currentDebt / borrowingLimit;

Score Impact:
- < 30% utilization: +100 points
- 30-50%: +75 points
- 50-70%: +50 points
- 70-90%: +25 points
- > 90%: +0 points
```

#### **Loan Frequency (5%)**
```javascript
const loanFrequency = loansPerMonth;

Score Impact:
- 1-2 loans/month: +50 points
- 3-4 loans/month: +25 points
- > 4 loans/month: +0 points (over-borrowing)
```

---

### **4. Account Age & Activity (10% weight)**

#### **Account Age (5%)**
```javascript
const accountAgeMonths = calculateAccountAge();

Score Impact:
- > 12 months: +50 points
- 6-12 months: +35 points
- 3-6 months: +20 points
- < 3 months: +0 points
```

#### **Platform Engagement (5%)**
```javascript
const engagementScore = calculateEngagement();

Score Impact:
- Active investor + borrower: +50 points
- Active borrower only: +25 points
- Inactive: +0 points
```

---

## 🚀 Progressive Borrowing System

### **Journey from $100 to $5,000:**

```
Stage 1: Cold Start ($100)
├─> User completes KYC
├─> ZimScore: 300 (Cold Start)
├─> Borrowing Limit: $100
└─> Interest Rate: 15%

Stage 2: First Repayment ($200-$500)
├─> User borrows $100
├─> User repays on time
├─> ZimScore recalculated: 400-500
├─> New Limit: $200-$500
└─> Interest Rate: 12%

Stage 3: Building Credit ($500-$1,000)
├─> Multiple successful repayments
├─> Bank statement shows stable income
├─> ZimScore: 501-600
├─> New Limit: $500-$1,000
└─> Interest Rate: 10%

Stage 4: Established Borrower ($1,000-$2,500)
├─> 6+ months history
├─> 100% on-time payments
├─> Strong bank statement
├─> ZimScore: 601-700
├─> New Limit: $1,000-$2,500
└─> Interest Rate: 8%

Stage 5: Premium Borrower ($2,500-$5,000)
├─> 12+ months history
├─> Perfect repayment record
├─> High income stability
├─> ZimScore: 701-850
├─> New Limit: $2,500-$5,000
└─> Interest Rate: 5%
```

---

## 📈 ZimScore Calculation Formula

### **Complete Formula:**

```javascript
function calculateZimScore(user) {
  let score = 300; // Cold start base
  
  // 1. Bank Statement Analysis (40%)
  score += analyzeBankStatement(user.bankStatement) * 0.40;
  
  // 2. Repayment History (35%)
  score += analyzeRepaymentHistory(user.loans) * 0.35;
  
  // 3. Loan Utilization (15%)
  score += analyzeLoanUtilization(user) * 0.15;
  
  // 4. Account Age & Activity (10%)
  score += analyzeAccountActivity(user) * 0.10;
  
  // Cap at 850
  return Math.min(Math.round(score), 850);
}
```

### **Bank Statement Analysis:**

```javascript
function analyzeBankStatement(statement) {
  let points = 0;
  
  // Income Stability (150 max)
  const hasRegularIncome = detectRegularIncome(statement);
  if (hasRegularIncome) {
    points += 150;
  } else if (hasIrregularIncome(statement)) {
    points += 75;
  }
  
  // Account Balance (100 max)
  const avgBalance = (statement.openingBalance + statement.closingBalance) / 2;
  if (avgBalance > 500) points += 100;
  else if (avgBalance > 200) points += 50;
  else if (avgBalance > 50) points += 25;
  
  // Cash Flow (100 max)
  const cashFlowRatio = statement.totalCredits / statement.totalDebits;
  if (cashFlowRatio > 1.5) points += 100;
  else if (cashFlowRatio > 1.0) points += 50;
  
  // Transaction Activity (50 max)
  const transactionCount = statement.transactions?.length || 0;
  if (transactionCount > 20) points += 50;
  else if (transactionCount > 10) points += 25;
  
  return points; // Max 400 points
}
```

### **Repayment History Analysis:**

```javascript
function analyzeRepaymentHistory(loans) {
  if (!loans || loans.length === 0) return 0; // Cold start
  
  let points = 0;
  
  // On-Time Payments (200 max)
  const onTimeRate = loans.filter(l => l.paidOnTime).length / loans.length;
  if (onTimeRate === 1.0) points += 200;
  else if (onTimeRate >= 0.9) points += 150;
  else if (onTimeRate >= 0.8) points += 100;
  else if (onTimeRate >= 0.7) points += 50;
  else points -= 50;
  
  // Completion Rate (100 max)
  const completionRate = loans.filter(l => l.status === 'completed').length / loans.length;
  if (completionRate === 1.0) points += 100;
  else if (completionRate >= 0.9) points += 75;
  else if (completionRate >= 0.8) points += 50;
  
  // Default History (50 max or -100)
  const defaultRate = loans.filter(l => l.status === 'defaulted').length / loans.length;
  if (defaultRate === 0) points += 50;
  else if (defaultRate > 0.05) points -= 100;
  
  return points; // Max 350 points
}
```

---

## 🎯 Borrowing Limit Calculation

### **Formula:**

```javascript
function calculateBorrowingLimit(zimScore, repaymentHistory) {
  // Cold start: $100
  if (!repaymentHistory || repaymentHistory.length === 0) {
    return 100;
  }
  
  // Base limit from ZimScore
  let limit = 0;
  
  if (zimScore >= 701) limit = 5000;
  else if (zimScore >= 601) limit = 2500;
  else if (zimScore >= 501) limit = 1000;
  else if (zimScore >= 401) limit = 500;
  else limit = 200;
  
  // Adjust based on income (from bank statement)
  const monthlyIncome = calculateMonthlyIncome(user.bankStatement);
  const incomeBasedLimit = monthlyIncome * 0.3; // Max 30% of monthly income
  
  // Take lower of score-based or income-based limit
  limit = Math.min(limit, incomeBasedLimit);
  
  // Ensure minimum progression after first repayment
  if (repaymentHistory.length >= 1) {
    limit = Math.max(limit, 200);
  }
  
  return Math.round(limit);
}
```

---

## 📊 Example Scenarios

### **Scenario 1: New User (Cold Start)**

```javascript
User: John Doe
KYC Status: Approved
Bank Statement: 
  - Opening Balance: $150
  - Closing Balance: $200
  - Total Credits: $800
  - Total Debits: $750
  - Regular salary deposits: Yes

ZimScore Calculation:
  Base: 300
  + Bank Statement: 325 (good income, positive flow)
  + Repayment History: 0 (no history)
  + Utilization: 0 (no loans)
  + Account Age: 0 (new)
  = 625 points... BUT COLD START!

Initial ZimScore: 300 (Cold Start Override)
Borrowing Limit: $100
Interest Rate: 15%
```

### **Scenario 2: After First Repayment**

```javascript
User: John Doe
First Loan: $100 (Repaid on time)
Bank Statement: Same as above

ZimScore Calculation:
  Base: 300
  + Bank Statement: 325
  + Repayment History: 250 (100% on-time, 1 loan)
  + Utilization: 50 (good utilization)
  + Account Age: 10 (1 month)
  = 935 points (capped at 850)

New ZimScore: 850? No! Gradual increase...
Actual ZimScore: 450 (gradual progression)
Borrowing Limit: $500
Interest Rate: 12%
```

### **Scenario 3: Established User (6 months)**

```javascript
User: John Doe
Loans: 6 total, all repaid on time
Bank Statement: Strong income pattern

ZimScore Calculation:
  Base: 300
  + Bank Statement: 350 (excellent)
  + Repayment History: 350 (perfect record)
  + Utilization: 100 (optimal usage)
  + Account Age: 40 (6 months)
  = 1140 points (capped at 850)

ZimScore: 650
Borrowing Limit: $2,000
Interest Rate: 8%
```

---

## 🔄 ZimScore Update Triggers

### **When ZimScore is Recalculated:**

1. **After Each Loan Repayment** ✅
   - Immediate recalculation
   - Limit updated if score improves

2. **Monthly (Automatic)** ✅
   - Scheduled recalculation
   - Accounts for account age

3. **New Bank Statement Upload** ✅
   - User uploads updated statement
   - Income/balance changes reflected

4. **Missed Payment** ❌
   - Immediate recalculation
   - Score decreases, limit may reduce

5. **Default** ❌
   - Severe score reduction
   - Limit suspended until resolved

---

## 🎨 User Dashboard Display

### **ZimScore Card:**

```
┌─────────────────────────────────────┐
│  Your ZimScore: 650                 │
│  ████████████░░░░░░░░ Very Good     │
│                                     │
│  Borrowing Limit: $2,000            │
│  Interest Rate: 8%                  │
│                                     │
│  Next Review: After next repayment  │
│                                     │
│  [View Score Breakdown]             │
└─────────────────────────────────────┘
```

### **Score Breakdown:**

```
┌─────────────────────────────────────┐
│  ZimScore Breakdown                 │
├─────────────────────────────────────┤
│  Bank Statement Analysis    ████ 85%│
│  - Income Stability         ████ 90%│
│  - Account Balance          ███░ 75%│
│  - Cash Flow                ████ 95%│
│                                     │
│  Repayment History          ████100%│
│  - On-Time Payments         ████100%│
│  - Completion Rate          ████100%│
│  - No Defaults              ████100%│
│                                     │
│  Loan Utilization           ███░ 70%│
│  Account Age (6 months)     ███░ 60%│
│                                     │
│  Overall Score: 650 / 850           │
│                                     │
│  Tips to Improve:                   │
│  • Continue on-time payments        │
│  • Maintain account for 12+ months  │
│  • Keep utilization below 50%       │
└─────────────────────────────────────┘
```

---

## 🚀 Implementation

### **Database Schema:**

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN zimscore INTEGER DEFAULT 300;
ALTER TABLE users ADD COLUMN borrowing_limit DECIMAL(10,2) DEFAULT 100.00;
ALTER TABLE users ADD COLUMN interest_rate DECIMAL(5,2) DEFAULT 15.00;
ALTER TABLE users ADD COLUMN zimscore_last_updated TIMESTAMP;

-- ZimScore history table
CREATE TABLE zimscore_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  score INTEGER,
  borrowing_limit DECIMAL(10,2),
  factors JSONB, -- Breakdown of score factors
  trigger_event VARCHAR(50), -- 'repayment', 'monthly', 'bank_statement'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **API Endpoints:**

```javascript
// Get user's ZimScore
GET /api/zimscore/my-score

// Get ZimScore breakdown
GET /api/zimscore/breakdown

// Recalculate ZimScore (admin or after repayment)
POST /api/zimscore/recalculate

// Get ZimScore history
GET /api/zimscore/history
```

---

## 🎊 Summary

### **Cold Start Strategy:**
- ✅ All new users: $100 limit
- ✅ ZimScore: 300 (base)
- ✅ Interest: 15%

### **Score Progression:**
- ✅ Based on bank statement (40%)
- ✅ Based on repayment history (35%)
- ✅ Based on utilization (15%)
- ✅ Based on account age (10%)

### **Borrowing Limits:**
- 300-400: $100-$200
- 401-500: $201-$500
- 501-600: $501-$1,000
- 601-700: $1,001-$2,500
- 701-850: $2,501-$5,000

### **Key Features:**
- ✅ Automatic calculation
- ✅ Real-time updates
- ✅ Transparent scoring
- ✅ Progressive limits
- ✅ Fair interest rates

---

**Your ZimScore system is ready to assess creditworthiness and manage borrowing limits! 🎯✨**

*Last Updated: November 16, 2025*

# 🎯 ZimScore Unified Implementation Guide

## Overview

**ZimScore** is ZimCrowd's proprietary credit scoring system (30-85 points) that determines maximum loan amounts based on banking data and repayment behavior. **All users start with $100 cold start limit, then progress based on their ZimScore.**

---

## 💰 Cold Start Strategy

### **All New Users:**
```
Complete KYC → Upload Bank Statement → Get $100 Limit
```

**Initial Setup:**
- ✅ **Starting Limit:** $100 (guaranteed)
- ✅ **Initial ZimScore:** 30-60 (based on bank statement)
- ✅ **Interest Rate:** 0-10% (user chooses)
- ✅ **First Loan:** Maximum $100

**After First Repayment:**
- ✅ ZimScore recalculated
- ✅ Limit increases based on score
- ✅ Progressive borrowing unlocked

---

## 📊 Score Range & Loan Limits

| ZimScore | Risk Level | Max Loan | Interest Rate | Star Rating |
|----------|-----------|----------|---------------|-------------|
| **80-85** | Very Low Risk | $1,000 | 0-10% (user choice) | ⭐⭐⭐⭐⭐ 5.0 |
| **70-79** | Low Risk | $800 | 0-10% (user choice) | ⭐⭐⭐⭐☆ 4.0 |
| **60-69** | Medium Risk | $600 | 0-10% (user choice) | ⭐⭐⭐☆☆ 3.0 |
| **50-59** | High Risk | $400 | 0-10% (user choice) | ⭐⭐☆☆☆ 2.5 |
| **40-49** | Very High Risk | $300 | 0-10% (user choice) | ⭐☆☆☆☆ 2.0 |
| **30-39** | Building Credit | $100 | 0-10% (user choice) | ⭐☆☆☆☆ 1.0 |

**Key Principle:** Score determines loan amount ONLY. Users always choose their own interest rate (0-10%).

---

## 🧮 Three-Component Calculation

### **Final Score = Component 1 + Component 2 + Component 3**

```
Component 1: Banking Data Analysis (30-60 points) - From OCR
Component 2: Employment Bonus (0-10 points) - From KYC
Component 3: Performance Adjustment (-20 to +39 points) - From Loans

Total Range: 30-85 points
```

---

## 📋 Component 1: Banking Data Analysis (30-60 points)

**Source:** Extracted from uploaded bank statement via OCR

### **Factor 1: Cash Flow Ratio (0-20 points)**

```javascript
cashFlowRatio = totalCredits / totalDebits

if (cashFlowRatio >= 1.2) → +20 points (Excellent)
else if (cashFlowRatio >= 1.0) → +15 points (Good)
else if (cashFlowRatio >= 0.8) → +10 points (Moderate)
else if (cashFlowRatio >= 0.6) → +5 points (Weak)
else → +0 points (Poor)
```

**From Bank Statement OCR:**
```javascript
{
  totalCredits: 1000,
  totalDebits: 800,
  cashFlowRatio: 1.25 → +20 points
}
```

---

### **Factor 2: Average Balance (0-10 points)**

```javascript
avgBalance = (openingBalance + closingBalance) / 2

if (avgBalance > 200) → +10 points (High)
else if (avgBalance >= 50) → +6 points (Medium)
else if (avgBalance > 0) → +2 points (Low)
else → +0 points (None)
```

**From Bank Statement OCR:**
```javascript
{
  openingBalance: 150,
  closingBalance: 250,
  avgBalance: 200 → +10 points
}
```

---

### **Factor 3: Balance Consistency (0-5 points)**

```javascript
// Measure of balance stability (0-10 scale)
if (balanceConsistency >= 7) → +5 points
else if (balanceConsistency >= 4) → +3 points
else if (balanceConsistency > 0) → +1 point
else → +0 points
```

---

### **Factor 4: NSF Events / Overdrafts (0-10 points or -8 penalty)**

```javascript
// Non-Sufficient Funds events
if (nsfEvents === 0) → +10 points (No overdrafts)
else if (nsfEvents <= 3) → -3 points (Few overdrafts)
else → -8 points (Many overdrafts)
```

---

### **Factor 5: Account Tenor (0-5 points)**

```javascript
// Account age in months
if (accountAgeMonths >= 12) → +5 points
else if (accountAgeMonths >= 6) → +3 points
else if (accountAgeMonths >= 3) → +1 point
else → +0 points
```

---

### **Factor 6: Additional Accounts (0-10 points)**

```javascript
// Multiple bank accounts bonus
accountBonus = Math.min(additionalAccounts × 2, 10)

1 account → +2 points
2 accounts → +4 points
3 accounts → +6 points
4 accounts → +8 points
5+ accounts → +10 points (capped)
```

---

**Component 1 Total: 30 (base) + 0-30 (factors) = 30-60 points**

---

## 📋 Component 2: Employment Bonus (0-10 points)

**Source:** From KYC employment letter or user profile

```javascript
const EMPLOYMENT_BONUS = {
    government: 10,   // Civil servants, guaranteed salary
    private: 6,       // Formal employment with payroll
    business: 3,      // Self-employed, established
    informal: 0       // Irregular income
};
```

**Rationale:**
- **Government:** Guaranteed salary, easy deduction at source, 18-month terms
- **Private:** Formal employment with payroll systems, 12-month terms
- **Business:** Self-employed but established, 9-month terms
- **Informal:** Irregular income, 6-month terms

---

## 📋 Component 3: Performance Adjustment (-20 to +39 points)

**Source:** On-platform loan repayment behavior

### **Factor 1: On-Time Payment Rate (0-25 points or -10 penalty)**

```javascript
onTimeRate = onTimePayments / totalLoans

if (onTimeRate >= 0.95) → +25 points (95%+)
else if (onTimeRate >= 0.90) → +20 points (90-94%)
else if (onTimeRate >= 0.80) → +15 points (80-89%)
else if (onTimeRate >= 0.70) → +10 points (70-79%)
else if (onTimeRate >= 0.60) → +5 points (60-69%)
else → -10 points (<60%)
```

---

### **Factor 2: Late Payment Penalty (-20 to 0 points)**

```javascript
latePaymentPenalty = Math.max(latePayments × -5, -20)

Each late payment: -5 points
Maximum penalty: -20 points total (capped)
```

---

### **Factor 3: Loan Size Progression (0-10 points)**

```javascript
// Highest loan amount successfully repaid
if (maxLoanRepaid >= 800) → +10 points
else if (maxLoanRepaid >= 600) → +8 points
else if (maxLoanRepaid >= 400) → +6 points
else if (maxLoanRepaid >= 200) → +4 points
else if (maxLoanRepaid >= 100) → +2 points
else → +0 points
```

---

### **Factor 4: Platform Tenure (0-4 points)**

```javascript
// Time as active borrower
if (platformMonths >= 24) → +4 points
else if (platformMonths >= 12) → +3 points
else if (platformMonths >= 6) → +2 points
else if (platformMonths >= 3) → +1 point
else → +0 points
```

---

**Component 3 Total: -20 to +39 points**

---

## 🎯 Complete Calculation Examples

### **Example 1: New User (Cold Start with $100 Limit)**

**KYC Documents Uploaded:**
- ✅ National ID (Front & Back)
- ✅ Bank Statement (via OCR)
- ✅ Employment Letter
- ✅ Selfie

**Bank Statement OCR Data:**
```javascript
{
  openingBalance: 150,
  closingBalance: 250,
  totalCredits: 1000,
  totalDebits: 800,
  accountAge: 18 // months
}
```

**Component 1: Banking Data (30-60)**
```
Base: 30 points
Cash Flow (1000/800 = 1.25): +20 points
Avg Balance ((150+250)/2 = 200): +10 points
Balance Consistency (8/10): +5 points
NSF Events (0): +10 points
Account Tenor (18 months): +5 points
Additional Accounts (2): +4 points
─────────────────────────────────────
Subtotal: 84 → capped at 60 points
```

**Component 2: Employment (+6)**
```
Employment Type: Private Sector
Bonus: +6 points
```

**Component 3: Performance (+0)**
```
New user, no loan history: +0 points
```

**Final Score:**
```
Component 1: 60
Component 2: +6
Component 3: +0
─────────────
Total: 66 points

Risk Level: Medium Risk
Max Loan: $600
Star Rating: 3.5 ⭐⭐⭐☆
Interest Rate: 0-10% (user chooses)
```

**BUT COLD START OVERRIDE:**
```
First-time borrower → $100 limit (regardless of score)
After first repayment → $600 limit unlocked
```

---

### **Example 2: After First $100 Loan Repaid On-Time**

**Previous Score:** 66 (from cold start)

**Loan Event:**
- Borrowed: $100
- Repaid: On-time
- Trust Loop Update: +3 points

**New Calculation:**
```
Component 1: 60 (unchanged)
Component 2: +6 (unchanged)
Component 3: +3 (on-time payment)
─────────────
New Score: 69 points

Risk Level: Medium Risk
Max Loan: $600 (now unlocked!)
Star Rating: 3.5 ⭐⭐⭐☆
```

**User can now borrow up to $600!**

---

### **Example 3: After 5 On-Time Repayments**

**Loan History:**
- 5 loans, all repaid on-time
- Largest loan: $400

**Component 3 Calculation:**
```
On-time rate: 100% → +25 points
Late payments: 0 → +0 penalty
Max loan repaid: $400 → +6 points
Platform tenure: 6 months → +2 points
─────────────
Component 3 Total: +33 points
```

**Final Score:**
```
Component 1: 60
Component 2: +6
Component 3: +33
─────────────
Total: 99 → capped at 85

Final Score: 85 points
Risk Level: Very Low Risk
Max Loan: $1,000
Star Rating: 5.0 ⭐⭐⭐⭐⭐
```

---

### **Example 4: Government Employee (Civil Servant)**

**Bank Statement:**
```javascript
{
  openingBalance: 500,
  closingBalance: 600,
  totalCredits: 2000, // Monthly salary
  totalDebits: 1800,
  accountAge: 24
}
```

**Component 1: Banking Data**
```
Base: 30
Cash Flow (2000/1800 = 1.11): +15
Avg Balance (550): +10
Consistency (9/10): +5
NSF (0): +10
Tenor (24 months): +5
Additional (1): +2
─────────────
Total: 77 → capped at 60
```

**Component 2: Employment**
```
Government Employee: +10 points
```

**Component 3: Performance**
```
10 loans, 100% on-time: +25
Max loan $800: +10
Platform 12 months: +3
─────────────
Total: +38
```

**Final Score:**
```
60 + 10 + 38 = 108 → capped at 85

Score: 85
Risk Level: Very Low Risk
Max Loan: $1,000
```

**DTNI Calculation (Civil Servants Only):**
```javascript
monthlyNetIncome = 2000
loanTerm = 18 // months (government max)
dtniLimit = 2000 × 0.5 × 18 = 18,000
dtniCap = 2500

scoreBasedLimit = 1000 (from ZimScore 85)
finalLimit = Math.min(18000, 2500, 1000) = $1,000

// Score-based limit is usually the binding constraint
```

---

## 🔄 Integration with OCR System

### **Step 1: User Uploads Bank Statement**

```javascript
// User uploads bank statement via KYC
POST /api/profile-setup/upload-document-with-ocr
{
  document_type: 'bank_statement',
  document: <file>
}

// OCR extracts data
{
  bankName: 'CBZ',
  accountNumber: '001206000000342',
  openingBalance: 150,
  closingBalance: 250,
  totalCredits: 1000,
  totalDebits: 800,
  statementPeriod: '01-Oct-2025 to 31-Oct-2025'
}
```

---

### **Step 2: Calculate Initial ZimScore**

```javascript
// Automatically triggered after bank statement upload
const zimScoreService = new ZimScoreService();

const financialData = {
  cashFlowRatio: ocrData.totalCredits / ocrData.totalDebits,
  avgEndingBalance: (ocrData.openingBalance + ocrData.closingBalance) / 2,
  balanceConsistencyScore: calculateConsistency(ocrData),
  nsfEvents: detectOverdrafts(ocrData.fullText),
  accountAgeMonths: calculateAccountAge(ocrData.statementPeriod),
  additionalAccountsCount: 0 // From user profile
};

const employmentType = user.employment_type; // From KYC

const initialScore = await zimScoreService.calculateColdStartScore(
  userId,
  financialData,
  employmentType
);

// Result: 30-70 points (Component 1 + Component 2)
// Max Loan: $100 (cold start override)
```

---

### **Step 3: First Loan ($100)**

```javascript
// User applies for first loan
POST /api/loans/create
{
  amount: 100,
  interestRate: 5, // User chooses 0-10%
  term: 30 // days
}

// System checks
if (amount <= user.borrowingLimit) {
  // Approve loan
  // Post to marketplace or direct lending
}
```

---

### **Step 4: First Repayment**

```javascript
// User repays loan on-time
POST /api/loans/:loanId/repay

// Trigger ZimScore update
await zimScoreService.updateScoreFromTrustLoop(userId, {
  event: 'LOAN_REPAID_ON_TIME',
  loanAmount: 100,
  loanId: loanId
});

// Score increases
// New borrowing limit unlocked based on score
```

---

## 📊 Database Schema

### **user_zimscores Table**

```sql
CREATE TABLE user_zimscores (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    score_value INTEGER CHECK (score_value BETWEEN 30 AND 85),
    star_rating DECIMAL(2,1) CHECK (star_rating BETWEEN 1.0 AND 5.0),
    max_loan_amount DECIMAL(10,2),
    risk_level TEXT,
    
    -- Component breakdown
    component1_banking INTEGER, -- 30-60
    component2_employment INTEGER, -- 0-10
    component3_performance INTEGER, -- -20 to +39
    
    -- Banking factors (from OCR)
    cash_flow_ratio DECIMAL(5,2),
    avg_balance DECIMAL(10,2),
    balance_consistency INTEGER,
    nsf_events INTEGER,
    account_age_months INTEGER,
    additional_accounts INTEGER,
    
    -- Employment
    employment_type TEXT, -- government, private, business, informal
    
    -- Performance metrics
    total_loans INTEGER DEFAULT 0,
    on_time_payments INTEGER DEFAULT 0,
    late_payments INTEGER DEFAULT 0,
    defaults INTEGER DEFAULT 0,
    max_loan_repaid DECIMAL(10,2) DEFAULT 0,
    platform_tenure_months INTEGER DEFAULT 0,
    
    -- Metadata
    score_factors JSONB,
    calculation_method TEXT,
    last_calculated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### **zimscore_history Table**

```sql
CREATE TABLE zimscore_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    
    -- Score changes
    old_score_value INTEGER,
    new_score_value INTEGER,
    score_change INTEGER,
    
    -- Limit changes
    old_max_loan_amount DECIMAL(10,2),
    new_max_loan_amount DECIMAL(10,2),
    
    -- Star rating changes
    old_star_rating DECIMAL(2,1),
    new_star_rating DECIMAL(2,1),
    
    -- Change details
    change_reason TEXT, -- 'cold_start', 'loan_repaid_on_time', 'loan_repaid_late', etc.
    change_details JSONB,
    related_loan_id UUID,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 Service Implementation

### **ZimScoreService Methods**

```javascript
class ZimScoreService {
  
  /**
   * Calculate initial score from bank statement OCR data
   */
  async calculateColdStartScore(userId, financialData, employmentType) {
    let score = 30; // Base
    const factors = {};
    
    // Component 1: Banking Data (30-60)
    const bankingScore = this.calculateBankingScore(financialData);
    score += Math.min(bankingScore, 30); // Cap at 60 total
    factors.banking = bankingScore;
    
    // Component 2: Employment Bonus (0-10)
    const employmentBonus = this.EMPLOYMENT_BONUS[employmentType] || 0;
    score += employmentBonus;
    factors.employment = employmentBonus;
    
    // Component 3: Performance (0 for new users)
    factors.performance = 0;
    
    // Calculate derived values
    const maxLoanAmount = 100; // Cold start override
    const starRating = this.calculateStarRating(score);
    const riskLevel = this.getRiskLevel(score);
    
    // Save to database
    await this.saveZimScore(userId, {
      score_value: score,
      star_rating: starRating,
      max_loan_amount: maxLoanAmount,
      risk_level: riskLevel,
      component1_banking: 30 + Math.min(bankingScore, 30),
      component2_employment: employmentBonus,
      component3_performance: 0,
      ...financialData,
      employment_type: employmentType,
      score_factors: factors
    });
    
    return { score, maxLoanAmount, starRating, riskLevel };
  }
  
  /**
   * Update score after loan event
   */
  async updateScoreFromTrustLoop(userId, loanEvent) {
    const currentScore = await this.getZimScore(userId);
    let performanceChange = 0;
    
    switch(loanEvent.event) {
      case 'LOAN_REPAID_ON_TIME':
        performanceChange = 3;
        break;
      case 'LOAN_REPAID_EARLY':
        performanceChange = 5;
        break;
      case 'LOAN_REPAID_LATE':
        performanceChange = -5;
        break;
      case 'LOAN_DEFAULTED':
        performanceChange = -15;
        break;
    }
    
    // Calculate new score
    const newScore = Math.max(30, Math.min(85, 
      currentScore.score_value + performanceChange
    ));
    
    // Calculate new max loan amount (remove cold start override)
    const newMaxLoan = this.calculateMaxLoanAmount(newScore);
    
    // Update database
    await this.updateZimScore(userId, {
      score_value: newScore,
      max_loan_amount: newMaxLoan,
      component3_performance: currentScore.component3_performance + performanceChange
    });
    
    // Record history
    await this.recordScoreHistory(userId, {
      old_score_value: currentScore.score_value,
      new_score_value: newScore,
      change_reason: loanEvent.event,
      related_loan_id: loanEvent.loanId
    });
    
    return { newScore, newMaxLoan };
  }
  
  /**
   * Calculate max loan amount from score
   */
  calculateMaxLoanAmount(scoreValue) {
    if (scoreValue >= 80) return 1000;
    if (scoreValue >= 70) return 800;
    if (scoreValue >= 60) return 600;
    if (scoreValue >= 50) return 400;
    if (scoreValue >= 40) return 300;
    return 100;
  }
  
  /**
   * Calculate star rating from score
   */
  calculateStarRating(scoreValue) {
    let starRating = 1.0 + ((scoreValue - 30) / 55) * 4.0;
    starRating = Math.round(starRating * 2) / 2; // Round to 0.5
    return Math.max(1.0, Math.min(5.0, starRating));
  }
  
  /**
   * Get risk level from score
   */
  getRiskLevel(scoreValue) {
    if (scoreValue >= 80) return 'Very Low Risk';
    if (scoreValue >= 70) return 'Low Risk';
    if (scoreValue >= 60) return 'Medium Risk';
    if (scoreValue >= 50) return 'High Risk';
    if (scoreValue >= 40) return 'Very High Risk';
    return 'Building Credit';
  }
}
```

---

## 🎯 API Endpoints

### **Get User's ZimScore**

```javascript
GET /api/zimscore/my-score

Response:
{
  success: true,
  data: {
    score: 66,
    starRating: 3.5,
    maxLoanAmount: 600,
    riskLevel: 'Medium Risk',
    components: {
      banking: 60,
      employment: 6,
      performance: 0
    },
    coldStartActive: false // After first repayment
  }
}
```

---

### **Get Score Breakdown**

```javascript
GET /api/zimscore/breakdown

Response:
{
  success: true,
  data: {
    score: 66,
    components: {
      component1: {
        name: 'Banking Data',
        score: 60,
        maxScore: 60,
        factors: {
          cashFlowRatio: { value: 1.25, points: 20 },
          avgBalance: { value: 200, points: 10 },
          balanceConsistency: { value: 8, points: 5 },
          nsfEvents: { value: 0, points: 10 },
          accountTenor: { value: 18, points: 5 },
          additionalAccounts: { value: 2, points: 4 }
        }
      },
      component2: {
        name: 'Employment',
        score: 6,
        maxScore: 10,
        employmentType: 'private'
      },
      component3: {
        name: 'Performance',
        score: 0,
        maxScore: 39,
        factors: {
          onTimeRate: { value: 0, points: 0 },
          latePayments: { value: 0, points: 0 },
          maxLoanRepaid: { value: 0, points: 0 },
          platformTenure: { value: 0, points: 0 }
        }
      }
    }
  }
}
```

---

### **Get Score History**

```javascript
GET /api/zimscore/history

Response:
{
  success: true,
  data: [
    {
      date: '2025-11-16',
      oldScore: 66,
      newScore: 69,
      change: +3,
      reason: 'LOAN_REPAID_ON_TIME',
      loanId: 'uuid'
    },
    {
      date: '2025-11-01',
      oldScore: 0,
      newScore: 66,
      change: +66,
      reason: 'COLD_START',
      loanId: null
    }
  ]
}
```

---

## 🎨 User Dashboard Display

### **ZimScore Card**

```
┌─────────────────────────────────────┐
│  🎯 Your ZimScore                   │
│                                     │
│  66 / 85                            │
│  ⭐⭐⭐☆☆ 3.5 Stars                 │
│  ████████████░░░░░░░░ Medium Risk   │
│                                     │
│  💰 Borrowing Limit: $600           │
│  📊 Interest Rate: 0-10% (you choose)│
│  📈 Next Review: After repayment    │
│                                     │
│  Score Breakdown:                   │
│  • Banking Data: 60/60 ████         │
│  • Employment: 6/10 ███             │
│  • Performance: 0/39 ░              │
│                                     │
│  💡 Tips to Improve:                │
│  • Repay your first loan on-time   │
│  • Build repayment history          │
│  • Maintain good banking habits     │
│                                     │
│  [View Detailed Breakdown]          │
└─────────────────────────────────────┘
```

---

## 🚀 Progressive Borrowing Journey

```
Month 1: Cold Start
├─> Complete KYC
├─> Upload bank statement
├─> ZimScore: 66 calculated
├─> Limit: $100 (cold start)
└─> Borrow: $100

Month 2: First Repayment
├─> Repay $100 on-time
├─> ZimScore: 69 (+3)
├─> Limit: $600 (unlocked!)
└─> Borrow: $400

Month 4: Building Credit
├─> 3 loans, all on-time
├─> ZimScore: 75 (+6)
├─> Limit: $800
└─> Borrow: $600

Month 7: Established
├─> 6 loans, perfect record
├─> ZimScore: 82 (+7)
├─> Limit: $1,000
└─> Borrow: $1,000

Month 13: Premium
├─> 12+ loans, 100% on-time
├─> ZimScore: 85 (max)
├─> Limit: $1,000
└─> Trusted borrower!
```

---

## 🎊 Summary

### **Cold Start:**
- ✅ All users: **$100 limit**
- ✅ ZimScore: **30-70** (banking + employment)
- ✅ Interest: **0-10%** (user chooses)

### **After First Repayment:**
- ✅ Score recalculated
- ✅ Limit unlocked (up to $1,000)
- ✅ Progressive borrowing enabled

### **Score Components:**
- ✅ **Banking (40%):** From bank statement OCR
- ✅ **Employment (12%):** From KYC documents
- ✅ **Performance (48%):** From loan repayments

### **Maximum Potential:**
- 🏆 **ZimScore: 85**
- 💰 **Limit: $1,000**
- ⭐ **Rating: 5.0 stars**
- 💳 **Interest: 0-10%** (user choice)

---

**Your ZimScore system integrates seamlessly with OCR-extracted bank statement data to provide fair, transparent credit scoring! 🎯✨**

---

**Document Version: 1.0 (Unified)**
**Last Updated: November 16, 2025**
**Status: Production-Ready Implementation Guide**

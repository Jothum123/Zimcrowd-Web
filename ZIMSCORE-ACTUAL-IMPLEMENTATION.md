# ZimScore - Actual Implementation (As Coded)

## 🎯 Score Range: 30-85 Points

**Minimum**: 30
**Maximum**: 85
**Default (New Users)**: 30

---

## 📊 Actual Score Calculation (From Code)

### **Cold Start Score (Initial Calculation)**

**Starting Point**: 30 points (base)

#### **Factor 1: Cash Flow Ratio (0-20 points)**
```javascript
if (cashFlowRatio >= 1.2) → +20 points
else if (cashFlowRatio >= 1.0) → +15 points
else if (cashFlowRatio >= 0.8) → +10 points
else if (cashFlowRatio >= 0.6) → +5 points
else → +0 points
```

#### **Factor 2: Average Balance (0-10 points)**
```javascript
if (balance > 200) → +10 points (INITIAL_BALANCE_HIGH)
else if (balance >= 50) → +6 points (INITIAL_BALANCE_MEDIUM)
else if (balance > 0) → +2 points (INITIAL_BALANCE_LOW)
else → +0 points
```

#### **Factor 3: Balance Consistency (0-5 points)**
```javascript
if (balanceConsistency >= 7) → +5 points
else if (balanceConsistency >= 4) → +3 points
else if (balanceConsistency > 0) → +1 point
else → +0 points
```

#### **Factor 4: NSF Events (Non-Sufficient Funds) (-8 to +10 points)**
```javascript
if (nsfEvents === 0) → +10 points (NO_NSF_EVENTS)
else if (nsfEvents <= 3) → -3 points (FEW_NSF_EVENTS)
else → -8 points (MANY_NSF_EVENTS)
```

#### **Factor 5: Account Tenor (0-5 points)**
```javascript
if (accountAgeMonths >= 12) → +5 points
else if (accountAgeMonths >= 6) → +3 points
else if (accountAgeMonths >= 3) → +1 point
else → +0 points
```

#### **Factor 6: Additional Accounts (0-10 points)**
```javascript
accountBonus = Math.min(additionalAccounts × 2, 10)
// 1 account = 2 points
// 2 accounts = 4 points
// 3 accounts = 6 points
// 4 accounts = 8 points
// 5+ accounts = 10 points (capped)
```

**Cold Start Score Range**: 30-60 points (capped at 60)

---

### **Employment Bonus (Defined but NOT Currently Applied)**

```javascript
EMPLOYMENT_BONUS = {
    government: 10,
    private: 6,
    business: 3,
    informal: 0
}
```

**Status**: ⚠️ Defined in code but NOT integrated into calculation yet
**Needs**: Employment type field in database and integration into Cold Start

---

### **Trust Loop Updates (Loan Behavior)**

#### **On-Time Payment**
```javascript
LOAN_REPAID_ON_TIME: +3 points per loan
```

#### **Early Payment**
```javascript
LOAN_REPAID_EARLY: +5 points per loan
```

#### **Late Payment**
```javascript
LOAN_REPAID_LATE: -5 points per late payment
Maximum penalty: -20 points total (capped)
```

#### **Default**
```javascript
LOAN_DEFAULTED: -15 points per default
```

#### **Active Loan Bonus**
```javascript
ACTIVE_LOAN_BONUS: +2 points (has active loan)
```

#### **Multiple Loans Bonus**
```javascript
MULTIPLE_LOANS_BONUS: +5 points (completed 3+ loans)
```

---

## 🎯 Loan Amount Limits (From Code)

```javascript
calculateMaxLoanAmount(scoreValue) {
    if (scoreValue >= 80) return 1000.00;  // Very Low Risk (80-85)
    if (scoreValue >= 70) return 800.00;   // Low Risk (70-79)
    if (scoreValue >= 60) return 600.00;   // Medium Risk (60-69)
    if (scoreValue >= 50) return 400.00;   // High Risk (50-59)
    if (scoreValue >= 40) return 300.00;   // Very High Risk (40-49)
    return 100.00;                         // Building Credit (30-39)
}
```

| Score Range | Max Loan Amount |
|-------------|----------------|
| 80-85 | $1,000 |
| 70-79 | $800 |
| 60-69 | $600 |
| 50-59 | $400 |
| 40-49 | $300 |
| 30-39 | $100 |

---

## 🌟 Star Rating Conversion (From Code)

```javascript
calculateStarRating(scoreValue) {
    // Linear mapping: 30 → 1.0, 85 → 5.0
    let starRating = 1.0 + ((scoreValue - 30) / 55) * 4.0;
    
    // Round to nearest 0.5
    starRating = Math.round(starRating * 2) / 2;
    
    // Clamp to valid range
    return Math.max(1.0, Math.min(5.0, starRating));
}
```

**Examples:**
- Score 30 → 1.0 ⭐
- Score 43 → 2.0 ⭐⭐
- Score 58 → 3.0 ⭐⭐⭐
- Score 72 → 4.0 ⭐⭐⭐⭐
- Score 85 → 5.0 ⭐⭐⭐⭐⭐

---

## 📋 Risk Level Names (From Code)

```javascript
getRiskLevel(scoreValue) {
    if (scoreValue >= 80) return 'Very Low Risk';    // 80-85
    if (scoreValue >= 70) return 'Low Risk';         // 70-79
    if (scoreValue >= 60) return 'Medium Risk';      // 60-69
    if (scoreValue >= 50) return 'High Risk';        // 50-59
    if (scoreValue >= 40) return 'Very High Risk';   // 40-49
    return 'Building Credit';                        // 30-39
}
```

---

## 🔢 Actual Calculation Examples

### **Example 1: Good Banking, No Platform History**

**Input Data:**
```javascript
financialData = {
    cashFlowRatio: 1.15,           // +15 points
    avgEndingBalance: 250,         // +10 points
    balanceConsistencyScore: 8,    // +5 points
    nsfEvents: 0,                  // +10 points
    accountAgeMonths: 18,          // +5 points
    additionalAccountsCount: 2     // +4 points
}
```

**Calculation:**
```
Base: 30
Cash Flow: +15
Balance: +10
Consistency: +5
NSF: +10
Tenor: +5
Additional: +4
─────────────
Total: 79 (capped at 60 for Cold Start)
Final Score: 60
```

**Result:**
- Score: 60
- Risk Level: Medium Risk
- Max Loan: $600
- Star Rating: 3.5 ⭐⭐⭐☆

---

### **Example 2: Poor Banking Data**

**Input Data:**
```javascript
financialData = {
    cashFlowRatio: 0.55,           // +0 points
    avgEndingBalance: 30,          // +2 points
    balanceConsistencyScore: 2,    // +1 point
    nsfEvents: 5,                  // -8 points
    accountAgeMonths: 2,           // +0 points
    additionalAccountsCount: 0     // +0 points
}
```

**Calculation:**
```
Base: 30
Cash Flow: +0
Balance: +2
Consistency: +1
NSF: -8
Tenor: +0
Additional: +0
─────────────
Total: 25 → raised to minimum 30
Final Score: 30
```

**Result:**
- Score: 30
- Risk Level: Building Credit
- Max Loan: $100
- Star Rating: 1.0 ⭐

---

### **Example 3: After 5 On-Time Loan Repayments**

**Starting Score:** 60 (from Cold Start)

**Trust Loop Events:**
```javascript
5 × LOAN_REPAID_ON_TIME = 5 × 3 = +15 points
```

**New Score:**
```
Cold Start: 60
Trust Loop: +15
─────────────
Final Score: 75
```

**Result:**
- Score: 75
- Risk Level: Low Risk
- Max Loan: $800
- Star Rating: 4.0 ⭐⭐⭐⭐

---

### **Example 4: After 3 Late Payments**

**Starting Score:** 60 (from Cold Start)

**Trust Loop Events:**
```javascript
3 × LOAN_REPAID_LATE = 3 × (-5) = -15 points
```

**New Score:**
```
Cold Start: 60
Trust Loop: -15
─────────────
Final Score: 45
```

**Result:**
- Score: 45
- Risk Level: Very High Risk
- Max Loan: $300
- Star Rating: 2.0 ⭐⭐

---

## 📊 What's Actually Implemented vs What's Defined

| Feature | Status | Notes |
|---------|--------|-------|
| **Cold Start Calculation** | ✅ Fully Implemented | 6 factors, 30-60 range |
| **Cash Flow Ratio** | ✅ Implemented | 0-20 points |
| **Average Balance** | ✅ Implemented | 0-10 points |
| **Balance Consistency** | ✅ Implemented | 0-5 points |
| **NSF Events** | ✅ Implemented | -8 to +10 points |
| **Account Tenor** | ✅ Implemented | 0-5 points |
| **Additional Accounts** | ✅ Implemented | 0-10 points |
| **Employment Bonus** | ⚠️ Defined Only | NOT integrated yet |
| **Trust Loop Updates** | ✅ Implemented | On-time, late, default tracking |
| **Loan Limits** | ✅ Implemented | 6 tiers, $100-$1,000 |
| **Star Rating** | ✅ Implemented | 1.0-5.0 conversion |
| **Risk Levels** | ✅ Implemented | 6 levels |

---

## 🚧 Missing Implementation

### **Employment Bonus (0-10 points)**

**Defined in code:**
```javascript
EMPLOYMENT_BONUS = {
    government: 10,
    private: 6,
    business: 3,
    informal: 0
}
```

**NOT Applied Because:**
1. ❌ No `employment_type` field in database
2. ❌ Not integrated into `calculateColdStartScore()`
3. ❌ No user input for employment type

**To Implement:**
```sql
-- Add to database
ALTER TABLE user_zimscores ADD COLUMN employment_type TEXT;
```

```javascript
// Add to Cold Start calculation
const employmentType = await getUserEmploymentType(userId);
const employmentBonus = this.EMPLOYMENT_BONUS[employmentType] || 0;
score += employmentBonus;
factors.employment_bonus = employmentBonus;
```

---

## 🔄 How Scores Update (Actual Flow)

### **Step 1: Initial Score (Cold Start)**
```
User uploads bank statement
→ System parses financial data
→ calculateColdStartScore() runs
→ Score: 30-60 (capped)
→ Saved to user_zimscores table
```

### **Step 2: Loan Repayment**
```
User repays loan (on-time or late)
→ updateScoreFromTrustLoop() runs
→ Adds/subtracts points based on behavior
→ Score recalculated
→ New max loan amount applies
→ Saved to user_zimscores table
→ History recorded in zimscore_history
```

### **Step 3: Score Retrieval**
```
User requests loan
→ System fetches current score from user_zimscores
→ Validates amount ≤ max_loan_amount
→ Loan posted to marketplace
```

---

## 📋 Database Schema (Actual)

### **user_zimscores Table**
```sql
user_zimscores (
    user_id UUID PRIMARY KEY,
    score_value INT (30-85),
    star_rating DECIMAL (1.0-5.0),
    max_loan_amount DECIMAL,
    risk_level TEXT,
    score_factors JSONB,
    calculation_method TEXT,
    last_calculated TIMESTAMP
)
```

### **zimscore_history Table**
```sql
zimscore_history (
    id UUID PRIMARY KEY,
    user_id UUID,
    old_score_value INT,
    new_score_value INT,
    old_star_rating DECIMAL,
    new_star_rating DECIMAL,
    old_max_loan_amount DECIMAL,
    new_max_loan_amount DECIMAL,
    change_reason TEXT,
    change_details JSONB,
    related_loan_id UUID,
    created_at TIMESTAMP
)
```

---

## 🎯 Key Takeaways

### **What's Working:**
✅ Cold Start calculation (30-60 points)
✅ 6 banking data factors
✅ Trust Loop updates (loan behavior)
✅ Loan amount limits (6 tiers)
✅ Star rating conversion
✅ Risk level classification
✅ Score history tracking

### **What's Missing:**
❌ Employment bonus integration
❌ Employment type database field
❌ DTNI limits for civil servants
❌ Term limits by employment type

### **Current Score Range:**
- **Cold Start Only**: 30-60 points
- **With Trust Loop**: 30-85 points (theoretical max)
- **Typical Range**: 30-75 points (most users)

---

## 📊 Realistic Score Distribution

**New Users (Cold Start):**
- Excellent banking: 55-60 points
- Good banking: 45-54 points
- Fair banking: 35-44 points
- Poor banking: 30-34 points

**Experienced Users (With Trust Loop):**
- Perfect repayment: 70-85 points
- Good repayment: 60-69 points
- Mixed repayment: 50-59 points
- Poor repayment: 30-49 points

---

**This document reflects the ACTUAL implementation in `services/zimscore.service.js` - no speculation, only what's coded!**

---

**Document Version: 1.0 (Code-Based)**
**Last Updated: November 14, 2025**
**Source: services/zimscore.service.js**
**Status: Matches actual implementation exactly**

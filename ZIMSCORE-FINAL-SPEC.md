# ZimScore Final Specification - As Implemented

## 🎯 Core Principle

**ZimScore is a 30-85 point system that determines maximum loan amounts. It does NOT control interest rates.**

---

## 📊 Score Range & Loan Limits

| ZimScore | Risk Level | Max Loan Amount | Interest Rate |
|----------|-----------|----------------|---------------|
| **80-85** | Very Low Risk | $1,000 | 0-10% (user choice) |
| **70-79** | Low Risk | $800 | 0-10% (user choice) |
| **60-69** | Medium Risk | $600 | 0-10% (user choice) |
| **50-59** | High Risk | $400 | 0-10% (user choice) |
| **40-49** | Very High Risk | $300 | 0-10% (user choice) |
| **30-39** | Building Credit | $100 | 0-10% (user choice) |

**Key Point**: Score determines loan amount limit ONLY. Users always choose their own interest rate (0-10%).

---

## 🏗️ Three-Component Calculation

### **Final Score = Component 1 + Component 2 + Component 3**

```
Component 1: Initial Risk Assessment (30-60 points)
Component 2: Employment Bonus (0-10 points)
Component 3: Performance Adjustment (-20 to +39 points)

Total Range: 30-85 points
```

---

## 📋 Component 1: Initial Risk Assessment (30-60 points)

**Based on banking data when user connects their account.**

### **Factor 1: Cash Flow Ratio (0-20 points)**
```
Ratio ≥1.2: +20 points (Excellent)
Ratio ≥1.0: +15 points (Good)
Ratio ≥0.8: +10 points (Moderate)
Ratio ≥0.6: +5 points (Weak)
Ratio <0.6: +0 points (Poor)
```

### **Factor 2: Account Health (0-15 points)**
```
No overdrafts: +10 points
Balance consistency ≥70%: +5 points
Total: 0-15 points
```

### **Factor 3: Account Tenor (0-5 points)**
```
≥12 months active: +5 points
≥6 months active: +3 points
≥3 months active: +1 point
<3 months active: +0 points
```

### **Factor 4: Additional Accounts (0-10 points)**
```
1 additional account: +2 points
2 additional accounts: +4 points
3+ additional accounts: +6-10 points (max 10)
```

**Component 1 Total: 30-60 points** (base 30 + up to 30 from factors)

---

## 📋 Component 2: Employment Bonus (0-10 points)

**Zimbabwe-specific factor based on employment stability.**

```javascript
Government Employee: +10 points
Private Sector Employee: +6 points
Business Owner: +3 points
Informal/Other: +0 points
```

**Rationale:**
- Government: Guaranteed salary, easy deduction at source
- Private: Formal employment with payroll systems
- Business: Self-employed but established
- Informal: Irregular income

---

## 📋 Component 3: Performance Adjustment (-20 to +39 points)

**Based on on-platform repayment behavior.**

### **Factor 1: On-Time Payment Rate (Primary)**
```
≥95% on-time: +25 points
90-94% on-time: +20 points
80-89% on-time: +15 points
70-79% on-time: +10 points
60-69% on-time: +5 points
<60% on-time: -10 points
```

### **Factor 2: Late Payment Penalty**
```
Each late payment: -5 points
Maximum penalty: -20 points total
```

### **Factor 3: Loan Size Progression (0-10 points)**
```
Successfully repaid ≥$800 loans: +10 points
Successfully repaid ≥$600 loans: +8 points
Successfully repaid ≥$400 loans: +6 points
Successfully repaid ≥$200 loans: +4 points
Successfully repaid ≥$100 loans: +2 points
```

### **Factor 4: Platform Tenure (0-4 points)**
```
Active ≥24 months: +4 points
Active ≥12 months: +3 points
Active ≥6 months: +2 points
Active ≥3 months: +1 point
```

**Component 3 Total: -20 to +39 points**

---

## 🎯 Score Calculation Examples

### **Example 1: New User (Cold Start)**
```
Banking Data:
- Cash flow ratio: 1.09 → +15 points
- No overdrafts → +10 points
- Balance consistency: 9.5/10 → +5 points
- Account age: 24 months → +5 points
- Additional accounts: 2 → +4 points

Employment:
- Private sector → +6 points

Platform Behavior:
- New user → +0 points

Final Score: 30 + 39 + 6 + 0 = 75
Risk Level: Low Risk
Max Loan: $800
```

### **Example 2: Experienced User**
```
Banking Data:
- Cash flow ratio: 0.95 → +15 points
- No overdrafts → +10 points
- Balance consistency: 5/10 → +0 points
- Account age: 6 months → +3 points
- Additional accounts: 1 → +2 points

Employment:
- Government → +10 points

Platform Behavior:
- On-time rate: 100% → +25 points
- No late payments → +0 penalty
- Max loan repaid: $800 → +10 points
- Platform tenure: 12 months → +3 points

Final Score: 30 + 30 + 10 + 38 = 108 → capped at 85
Risk Level: Very Low Risk
Max Loan: $1,000
```

### **Example 3: Poor Performance**
```
Banking Data:
- Cash flow ratio: 0.75 → +10 points
- 3 overdrafts → +0 points
- Balance consistency: 3/10 → +0 points
- Account age: 3 months → +1 point
- Additional accounts: 0 → +0 points

Employment:
- Informal → +0 points

Platform Behavior:
- On-time rate: 50% → -10 points
- 4 late payments → -20 points (capped)
- Max loan repaid: $100 → +2 points
- Platform tenure: 3 months → +1 point

Final Score: 30 + 11 + 0 + (-27) = 14 → raised to minimum 30
Risk Level: Building Credit
Max Loan: $100
```

---

## 🏛️ Civil Servant DTNI Limits

**Government employees receive special consideration:**

### **DTNI Calculation**
```javascript
DTNI Limit = Monthly Net Income × 0.5 × Loan Term (months)
Maximum DTNI Cap = $2,500
Final Limit = MIN(DTNI Limit, Score-based Limit, $2,500)
```

### **Term Limits by Employment Type**
```
Government: 18 months maximum
Private: 12 months maximum
Business: 9 months maximum
Informal: 6 months maximum
```

### **Example**
```
Civil servant with ZimScore 75 (Low Risk)
Monthly net income: $1,000
Score-based limit: $800
DTNI calculation: $1,000 × 0.5 × 18 = $9,000 → capped at $2,500
Final approved limit: MIN($2,500, $800) = $800

The score-based limit is usually the binding constraint.
```

---

## 📊 Star Rating Conversion

**For public display, scores are converted to 1.0-5.0 stars:**

```javascript
starRating = 1.0 + ((score - 30) / 55) * 4.0
// Rounded to nearest 0.5

Examples:
Score 30 → 1.0 ⭐
Score 43 → 2.0 ⭐⭐
Score 58 → 3.0 ⭐⭐⭐
Score 72 → 4.0 ⭐⭐⭐⭐
Score 85 → 5.0 ⭐⭐⭐⭐⭐
```

---

## 🔄 How Scores Update

### **Initial Score (Cold Start)**
- User connects bank account
- System analyzes banking data
- Calculates Component 1 (30-60 points)
- Adds employment bonus (0-10 points)
- Initial score: 30-70 points

### **Score Updates (Platform Behavior)**
- After each loan repayment
- Component 3 adjusts based on performance
- Score recalculated automatically
- Valid for 30 days

### **Score Refresh**
- Automatic: After loan activities
- Manual: Available after 7 days
- Banking data: When reconnected

---

## 🚫 What ZimScore Does NOT Do

❌ Control interest rates
❌ Force pricing tiers
❌ Guarantee loan approval
❌ Predict future behavior
❌ Replace credit bureaus
❌ Tier upgrades or downgrades (score just updates based on behavior)

---

## ✅ What ZimScore DOES Do

✅ Determine maximum loan amount
✅ Provide risk assessment
✅ Track repayment behavior
✅ Reward good performance
✅ Penalize late payments
✅ Enable progressive borrowing

---

## 📋 Implementation Details

### **Database Tables**
```sql
-- User ZimScores
user_zimscores (
    user_id,
    score_value (30-85),
    star_rating (1.0-5.0),
    max_loan_amount,
    risk_level,
    score_factors (JSON),
    last_calculated
)

-- Score History
zimscore_history (
    user_id,
    old_score_value,
    new_score_value,
    change_reason,
    related_loan_id
)
```

### **Service Methods**
```javascript
// Calculate initial score from banking data
calculateColdStartScore(userId, financialData)

// Update score after loan event
updateTrustLoop(userId, loanEvent)

// Get current score
getZimScore(userId)

// Calculate max loan amount
calculateMaxLoanAmount(scoreValue)

// Get risk level
getRiskLevel(scoreValue)

// Calculate star rating
calculateStarRating(scoreValue)
```

---

## 📊 Key Formulas

### **APR Calculation (for disclosure)**
```javascript
APR = (fee / principal) × (365 / days) × 100

Example:
Principal: $100
Fee: $8
Days: 30
APR = (8/100) × (365/30) × 100 = 292%
```

### **Interest Calculation (user-selected rate)**
```javascript
Interest = Principal × (Monthly Rate / 100)

Example:
Principal: $500
User-selected rate: 5%
Interest = $500 × 0.05 = $25
Total repayment = $525
```

---

## 🎯 Product Integration

### **P2P Marketplace Loans**
- Amount: Up to max loan amount (ZimScore-based)
- Interest: 0-10% (user choice)
- Term: 7-90 days (user choice)
- Approval: Depends on lender matching

### **ZimCrowd Direct Loans**
- Amount: Up to max loan amount (ZimScore-based)
- Fee: 5-12% one-time (ZimScore-based)
- Term: 30 days (fixed)
- Approval: Guaranteed (instant)

---

## 📋 Regulatory Compliance

### **Transparency Requirements**
✅ Clear score calculation methodology
✅ APR disclosure on all loans
✅ No hidden fees
✅ User consent for data usage

### **Consumer Protection**
✅ No discriminatory pricing (user chooses rate)
✅ Loan amount limits based on ability to repay
✅ Clear terms and conditions
✅ Right to dispute score

### **Data Privacy**
✅ Secure banking data handling
✅ User consent required
✅ Data retention policies
✅ Right to delete data

---

## 🎯 Summary

**ZimScore is a simple, transparent system:**

1. **Initial Assessment**: Banking data analysis (30-60 points)
2. **Employment Bonus**: Zimbabwe-specific factor (0-10 points)
3. **Performance Tracking**: Repayment behavior (-20 to +39 points)
4. **Final Score**: 30-85 points
5. **Loan Limit**: Score determines max amount
6. **Interest Rate**: User always chooses (0-10%)

**No tier upgrades, no complex mechanics, just straightforward scoring based on data and behavior.**

---

**Document Version: 1.0 (Final)**
**Last Updated: November 14, 2025**
**Status: As Implemented - No Tier Upgrade Mechanics**

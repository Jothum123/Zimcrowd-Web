# ZimScore & Fee Structure Alignment Analysis

## 🎯 Critical Discrepancies Found

### **1. ZimScore Range Mismatch**

| Document | Score Range | Status |
|----------|------------|--------|
| **ZimScore Spec** | 30-85 | ✅ Correct |
| **Fee Structure Doc** | 20-100 | ❌ WRONG |
| **Current Implementation** | 30-85 | ✅ Updated |

**Issue**: Fee structure document shows ZimScore range as 20-100, but specification clearly states 30-85.

---

### **2. Tier Definitions Mismatch**

#### **ZimScore Specification (30-85 range):**
```
80-85: Very Low Risk    → Max $1,000
70-79: Low Risk         → Max $800
60-69: Medium Risk      → Max $600
50-59: High Risk        → Max $400
40-49: Very High Risk   → Max $300
30-39: Building Credit  → Max $100
```

#### **Fee Structure Document (20-100 range):**
```
Tier A: 80-100 → Max $2,000
Tier B: 60-79  → Max $2,500 (Government/Civil Servants)
Tier C: 40-59  → Max $1,500
Tier D: 20-39  → Max $1,000
```

**Major Issues:**
1. ❌ Score range extends to 100 (should cap at 85)
2. ❌ Tier A max is $2,000 (spec says $1,000 for 80-85)
3. ❌ Tier B max is $2,500 (spec says $800 for 70-79)
4. ❌ Tier C max is $1,500 (spec says $600 for 60-69)
5. ❌ Tier D max is $1,000 (spec says $400 for 50-59)
6. ❌ Missing 30-39 tier (Building Credit, $100 max)

---

### **3. Civil Servant DTNI Limits**

#### **ZimScore Specification:**
```
Government employees get DTNI-based limits:
- Up to 50% of monthly net income
- Maximum cap: $2,500
- Formula: Min(DTNI Limit, Score-based Limit, $2,500)
```

#### **Fee Structure Document:**
```
Tier B (60-79): Government/Civil Servants → Max $2,500
```

**Issue**: Fee doc treats $2,500 as a fixed tier limit, but spec says it's a DTNI calculation cap that must also respect score-based limits.

**Correct Implementation:**
```javascript
if (employmentType === 'government') {
    const dtniLimit = monthlyNetIncome * 0.5 * loanTermMonths;
    const scoreBasedLimit = getScoreBasedLimit(zimScore); // $800 for 70-79
    maxLoanAmount = Math.min(dtniLimit, scoreBasedLimit, 2500);
}
```

**Example:**
- Civil servant with ZimScore 75 (Tier B: 70-79)
- Monthly net income: $1,000
- Score-based limit: $800
- DTNI limit: $1,000 × 0.5 × 36 = $18,000 (capped at $2,500)
- **Final limit: Min($2,500, $800) = $800** ❌ Fee doc says $2,500

---

### **4. Interest Rate System Mismatch**

#### **ZimScore Specification:**
```
ALL borrowers can choose 0-10% per month regardless of tier
Risk managed through loan amount limits, not forced rates
```

#### **Fee Structure Document:**
```
Tier A: Suggested 3.00% - 3.99% per month
Tier B: Suggested 4.00% - 4.99% per month
Tier C: Suggested 5.00% - 5.99% per month
Tier D: Suggested 6.00% - 7.00% per month
```

**Status**: ⚠️ Partially aligned
- Fee doc shows "suggested" ranges (good)
- But states "Everyone is free to select 0-10%" (matches spec ✅)
- Confusing presentation could mislead users

---

### **5. ZimCredits vs ZimScore Confusion**

#### **Fee Structure Document:**
```
ZimCredits Direct Lending:
- Monthly Interest: 5%
- APR: 60%
- Terms: 3-25 months

Loan Amount Tiers:
Tier A (80-100): Max $2,000
Tier B (60-79): Max $2,500 (Government)
Tier C (40-59): Max $1,500
Tier D (20-39): Max $1,000
```

**Issues:**
1. ❌ Uses same tier system as P2P loans (should be separate)
2. ❌ Score range 20-100 (should be 30-85)
3. ❌ Loan limits don't match ZimScore spec
4. ❌ Fixed 5% rate contradicts "0-10% user choice" in spec

**Clarification Needed:**
- Are ZimCredits a separate product with fixed rates?
- Or are they using the same ZimScore-based limits?
- If separate, they need their own tier system

---

### **6. Term Limits Missing**

#### **ZimScore Specification:**
```
Government: 18 months max
Private:    12 months max
Business:    9 months max
Informal:    6 months max
```

#### **Fee Structure Document:**
```
ZimCredits: 3-25 months (flexible terms)
Regular Loans: 12 months (in examples)
```

**Issue**: No mention of employment-based term limits in fee structure.

---

## 🔧 Required Corrections to Fee Structure Document

### **1. Update ZimScore Range**
```diff
- ZimScore Risk Assessment: Range 20-100
+ ZimScore Risk Assessment: Range 30-85
```

### **2. Fix Tier Definitions**
```diff
- Tier A (80-100): Lowest Risk, Max $2,000
- Tier B (60-79): Low Risk, Max $2,500 (Government)
- Tier C (40-59): Medium Risk, Max $1,500
- Tier D (20-39): Higher Risk, Max $1,000

+ Score 80-85: Very Low Risk, Max $1,000
+ Score 70-79: Low Risk, Max $800
+ Score 60-69: Medium Risk, Max $600
+ Score 50-59: High Risk, Max $400
+ Score 40-49: Very High Risk, Max $300
+ Score 30-39: Building Credit, Max $100
```

### **3. Clarify Civil Servant Limits**
```diff
- Tier B (60-79): Government/Civil Servants → Max $2,500

+ Government Employees (All Scores):
+ - DTNI-based limit: Up to 50% of monthly net income × term
+ - Maximum cap: $2,500
+ - Final limit: Min(DTNI, Score-based limit, $2,500)
+ 
+ Example: Civil servant, ZimScore 75 (70-79 range)
+ - Score-based limit: $800
+ - DTNI limit: $1,000 × 0.5 × 36 = $18,000 → capped at $2,500
+ - Final approved: Min($2,500, $800) = $800
```

### **4. Add Employment-Based Term Limits**
```diff
+ Loan Term Limits by Employment Type:
+ - Government: 18 months maximum
+ - Private Sector: 12 months maximum
+ - Business Owner: 9 months maximum
+ - Informal/Other: 6 months maximum
```

### **5. Separate ZimCredits Product Definition**
```
Option A: ZimCredits use same ZimScore tiers
- Apply 30-85 score range
- Use score-based loan limits
- Allow 0-10% user-selected rates

Option B: ZimCredits are separate product
- Define separate tier system
- Fixed 5% rate for all
- Different loan limits
- Clearly distinguish from P2P loans
```

---

## 📊 Corrected Tier System

### **Standard Score-Based Limits (All Borrowers)**

| ZimScore | Risk Level | Max Loan | Interest Range | Star Rating |
|----------|-----------|----------|----------------|-------------|
| **80-85** | Very Low Risk | $1,000 | 0-10% (user choice) | ⭐⭐⭐⭐⭐ |
| **70-79** | Low Risk | $800 | 0-10% (user choice) | ⭐⭐⭐⭐☆ |
| **60-69** | Medium Risk | $600 | 0-10% (user choice) | ⭐⭐⭐☆☆ |
| **50-59** | High Risk | $400 | 0-10% (user choice) | ⭐⭐☆☆☆ |
| **40-49** | Very High Risk | $300 | 0-10% (user choice) | ⭐☆☆☆☆ |
| **30-39** | Building Credit | $100 | 0-10% (user choice) | ⭐☆☆☆☆ |

### **Civil Servant DTNI-Based Limits (Government Employees Only)**

```javascript
// Calculate DTNI limit
const dtniLimit = monthlyNetIncome * 0.5 * loanTermMonths;
const dtniCap = 2500; // Maximum DTNI limit

// Get score-based limit
const scoreBasedLimit = getScoreBasedLimit(zimScore);

// Final limit is the LOWER of the two
const finalLimit = Math.min(dtniLimit, scoreBasedLimit, dtniCap);
```

**Examples:**

| ZimScore | Score Limit | Monthly Income | DTNI Calc | DTNI Cap | Final Limit |
|----------|-------------|----------------|-----------|----------|-------------|
| 85 | $1,000 | $800 | $14,400 | $2,500 | **$1,000** (score limit) |
| 75 | $800 | $1,200 | $21,600 | $2,500 | **$800** (score limit) |
| 65 | $600 | $1,500 | $27,000 | $2,500 | **$600** (score limit) |
| 55 | $400 | $2,000 | $36,000 | $2,500 | **$400** (score limit) |

**Key Insight**: In most cases, score-based limit is the binding constraint, not DTNI!

---

## 🎯 Three-Component Score Calculation

### **Component 1: Initial Risk Assessment (30-60 points)**
✅ Cash Flow Ratio (0-20)
✅ Account Balance (0-10)
✅ Balance Consistency (0-5)
✅ No Overdrafts (10)
✅ Account Tenor (0-5)
✅ Additional Accounts (0-10)

### **Component 2: Employment Bonus (0-10 points)**
```javascript
Government:  +10 points
Private:     +6 points
Business:    +3 points
Informal:    +0 points
```

### **Component 3: Performance Adjustment (-20 to +39 points)**
✅ On-time payment rate (up to +25)
✅ Late payment penalty (-5 per, max -20)
✅ Loan size progression (up to +10)
✅ Platform tenure (up to +4)

**Final Score = Component 1 + Component 2 + Component 3**
**Range: 30-85**

---

## 📋 Recommended Actions

### **Immediate (Critical):**
1. ✅ Update all references from "20-100" to "30-85"
2. ✅ Fix tier definitions to match 6-tier system
3. ✅ Correct loan amount limits
4. ✅ Clarify DTNI calculation for civil servants
5. ✅ Add employment-based term limits

### **High Priority:**
6. ⚠️ Decide on ZimCredits product positioning
7. ⚠️ Update all examples with correct limits
8. ⚠️ Add employment bonus to documentation
9. ⚠️ Clarify interest rate selection process

### **Medium Priority:**
10. 📝 Add three-component score breakdown
11. 📝 Include score calculation examples
12. 📝 Document tier upgrade paths
13. 📝 Add DTNI calculation examples

---

## ✅ What's Already Correct

1. ✅ Interest rate range: 0-10% user choice
2. ✅ Upfront fees: 10% service + 3% insurance
3. ✅ Monthly fees: 1% tenure + 5% collection
4. ✅ Late fee structure: 10% total (5% platform + 5% lender)
5. ✅ Unified payment system: End-of-month scheduling
6. ✅ Grace period: 24 hours
7. ✅ Recovery fees: 30% of collected amounts

---

## 🎯 Compliance Summary

| Aspect | Fee Doc Status | ZimScore Spec | Action Needed |
|--------|---------------|---------------|---------------|
| Score Range | 20-100 ❌ | 30-85 ✅ | Update to 30-85 |
| Tier Count | 4 tiers ❌ | 6 tiers ✅ | Add 2 missing tiers |
| Loan Limits | Wrong values ❌ | Correct values ✅ | Fix all limits |
| Civil Servant | Fixed $2,500 ❌ | DTNI calc ✅ | Add DTNI formula |
| Term Limits | Missing ❌ | Defined ✅ | Add employment-based |
| Interest Rates | 0-10% choice ✅ | 0-10% choice ✅ | Already aligned |
| Employment Bonus | Missing ❌ | 0-10 points ✅ | Add to docs |

**Overall Alignment: 40%**
**Target: 100%**

---

## 📝 Updated Fee Structure Section (Corrected)

### **ZimScore-Based Loan Limits (30-85 Range)**

All borrowers are evaluated using the ZimScore system (range: 30-85) which determines maximum loan amounts. **All borrowers can choose interest rates from 0-10% per month regardless of their score.**

#### **Standard Limits (All Borrowers)**

| ZimScore | Risk Level | Max Loan | Term Limit (Non-Gov) |
|----------|-----------|----------|---------------------|
| 80-85 | Very Low Risk | $1,000 | 12 months |
| 70-79 | Low Risk | $800 | 12 months |
| 60-69 | Medium Risk | $600 | 12 months |
| 50-59 | High Risk | $400 | 12 months |
| 40-49 | Very High Risk | $300 | 12 months |
| 30-39 | Building Credit | $100 | 12 months |

#### **Government Employee DTNI Limits**

Government employees receive special consideration due to guaranteed income and salary deduction capability:

**DTNI Formula:**
```
DTNI Limit = Monthly Net Income × 0.5 × Loan Term (months)
Maximum DTNI Cap = $2,500
Final Limit = MIN(DTNI Limit, Score-based Limit, $2,500)
```

**Term Limits by Employment Type:**
- Government: 18 months maximum
- Private Sector: 12 months maximum
- Business Owner: 9 months maximum
- Informal: 6 months maximum

**Example:**
```
Civil servant with ZimScore 75 (Low Risk tier)
Monthly net income: $1,000
Score-based limit: $800
DTNI calculation: $1,000 × 0.5 × 18 = $9,000 → capped at $2,500
Final approved limit: MIN($2,500, $800) = $800
```

---

**Document Version: 1.0**
**Last Updated: November 14, 2025**
**Status: Alignment analysis complete, corrections needed**

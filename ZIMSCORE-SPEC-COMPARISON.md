# ZimScore Specification vs Current Implementation - Gap Analysis

## 📊 Score Range Comparison

| Aspect | Specification | Current Implementation | Status |
|--------|--------------|----------------------|--------|
| **Score Range** | 30-85 | 30-99 | ❌ MISMATCH |
| **Base Score** | 30 | 30 | ✅ MATCH |
| **Max Score** | 85 | 99 | ❌ NEEDS UPDATE |

---

## 🏗️ Three-Component System

### **Specification Requirements:**
1. **Initial Risk Assessment**: 30-60 points (banking data)
2. **Employment Type Bonus**: 0-10 points (Zimbabwe-specific)
3. **Performance-Based Adjustment**: -20 to +39 points (platform behavior)

### **Current Implementation:**
1. **Cold Start Score**: 30-65 points (banking data) ✅
2. **Employment Bonus**: ❌ **NOT IMPLEMENTED**
3. **Trust Loop**: -20 to +39 points ✅

---

## 📋 Component 1: Initial Risk Assessment (30-60 points)

### **Cash Flow History (0-20 points)**

| Criteria | Spec Points | Current Points | Status |
|----------|------------|----------------|--------|
| Ratio ≥1.2 | 20 | 20 | ✅ MATCH |
| Ratio ≥1.0 | 15 | 15 | ✅ MATCH |
| Ratio ≥0.8 | 10 | 10 | ✅ MATCH |
| Ratio ≥0.6 | 5 | 5 | ✅ MATCH |
| Ratio <0.6 | 0 | 0 | ✅ MATCH |

### **Account Health (0-15 points)**

| Criteria | Spec Points | Current Points | Status |
|----------|------------|----------------|--------|
| No overdrafts | 10 | 5 | ⚠️ NEEDS ADJUSTMENT |
| Balance consistency ≥70% | 5 | 5 (at ≥7/10) | ✅ MATCH |

**Issue**: Current gives 5 points for no NSF, spec requires 10 points

### **Account Tenor (0-5 points)**

| Criteria | Spec Points | Current Implementation | Status |
|----------|------------|----------------------|--------|
| ≥12 months | 5 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| ≥6 months | 3 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| ≥3 months | 1 | ❌ NOT IMPLEMENTED | ❌ MISSING |

### **Additional Accounts Bonus (0-10 points)**

| Criteria | Spec Points | Current Implementation | Status |
|----------|------------|----------------------|--------|
| 1 additional | 2 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| 2 additional | 4 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| 3+ additional | 6-10 | ❌ NOT IMPLEMENTED | ❌ MISSING |

---

## 📋 Component 2: Employment Type Bonus (0-10 points)

### **Zimbabwe-Specific Employment Factors**

| Employment Type | Spec Points | Current Implementation | Status |
|----------------|------------|----------------------|--------|
| Government Employee | 10 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| Private Sector | 6 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| Business Owner | 3 | ❌ NOT IMPLEMENTED | ❌ MISSING |
| Informal/Other | 0 | ❌ NOT IMPLEMENTED | ❌ MISSING |

**Critical Gap**: Entire employment bonus system missing!

---

## 📋 Component 3: Performance-Based Adjustment

### **Repayment History (Primary Factor)**

| Criteria | Spec Points | Current Points | Status |
|----------|------------|----------------|--------|
| ≥95% on-time | 25 | 25 | ✅ MATCH |
| 90-94% on-time | 20 | 20 | ✅ MATCH |
| 80-89% on-time | 15 | 15 | ✅ MATCH |
| 70-79% on-time | 10 | 10 | ✅ MATCH |
| 60-69% on-time | 5 | 5 | ✅ MATCH |
| <60% on-time | -10 | -10 | ✅ MATCH |

### **Delinquency History**

| Criteria | Spec | Current | Status |
|----------|------|---------|--------|
| Late payment penalty | -5 per (max -20) | -2 to -10 per | ⚠️ NEEDS ADJUSTMENT |

**Issue**: Current has variable penalties, spec requires -5 per late payment

### **Loan Size Progression (0-10 points)**

| Criteria | Spec Points | Current Points | Status |
|----------|------------|----------------|--------|
| ≥$800 repaid | 10 | 10 | ✅ MATCH |
| ≥$600 repaid | 8 | 8 | ✅ MATCH |
| ≥$400 repaid | 6 | 6 | ✅ MATCH |
| ≥$200 repaid | 4 | 4 | ✅ MATCH |
| ≥$100 repaid | 2 | 2 | ✅ MATCH |

### **Platform Tenure (0-4 points)**

| Criteria | Spec Points | Current Points | Status |
|----------|------------|----------------|--------|
| ≥24 months | 4 | 4 | ✅ MATCH |
| ≥12 months | 3 | 3 | ✅ MATCH |
| ≥6 months | 2 | 2 | ✅ MATCH |
| ≥3 months | 1 | 1 | ✅ MATCH |

---

## 🎯 Risk Level Classifications

### **Specification:**

| Score Range | Risk Level | Max Loan | Interest Range |
|-------------|-----------|----------|----------------|
| 80-85 | Very Low Risk | $1,000 | 0-10% |
| 70-79 | Low Risk | $800 | 0-10% |
| 60-69 | Medium Risk | $600 | 0-10% |
| 50-59 | High Risk | $400 | 0-10% |
| 40-49 | Very High Risk | $300 | 0-10% |
| 30-39 | Building Credit | $100 | 0-10% |

### **Current Implementation:**

| Score Range | Risk Level | Max Loan | Status |
|-------------|-----------|----------|--------|
| 90-99 | Excellent | $1,000 | ❌ OUT OF RANGE |
| 80-89 | Great | $800 | ⚠️ NEEDS ADJUSTMENT |
| 70-79 | Good | $600 | ✅ MATCH |
| 60-69 | Fair | $400 | ✅ MATCH |
| 50-59 | Building | $300 | ✅ MATCH |
| 40-49 | Early | $200 | ⚠️ SPEC SAYS $300 |
| 35-39 | Starting | $100 | ✅ MATCH |
| <35 | New | $50 | ⚠️ SPEC SAYS $100 |

---

## 🏛️ Civil Servant Special Limits

### **Specification Requirements:**

**DTNI-Based Limits for Government Employees:**
- Up to 50% of monthly net income
- Maximum: $2,500
- Term: 36 months
- Formula: `Min(DTNI Limit, Score-based Limit)`

### **Current Implementation:**
❌ **NOT IMPLEMENTED**

---

## 📅 Term Limit System

### **Specification:**

| Employment Type | Max Term | Current | Status |
|----------------|----------|---------|--------|
| Government | 18 months | ❌ NOT IMPLEMENTED | ❌ MISSING |
| Private | 12 months | ❌ NOT IMPLEMENTED | ❌ MISSING |
| Business | 9 months | ❌ NOT IMPLEMENTED | ❌ MISSING |
| Informal | 6 months | ❌ NOT IMPLEMENTED | ❌ MISSING |

---

## 🔧 Required Changes Summary

### **Critical (Must Fix):**

1. **✅ Update MAX_SCORE from 99 to 85**
2. **❌ Add Employment Type Bonus System (0-10 points)**
   - Government: +10
   - Private: +6
   - Business: +3
   - Informal: +0
3. **❌ Add Account Tenor Scoring (0-5 points)**
4. **❌ Add Additional Accounts Bonus (0-10 points)**
5. **⚠️ Fix No-Overdraft Points (5 → 10)**
6. **⚠️ Fix Late Payment Penalty (-2/-5/-10 → -5 per, max -20)**
7. **⚠️ Update Risk Level Names**
8. **⚠️ Adjust Loan Limits for 30-85 range**

### **High Priority:**

9. **❌ Implement DTNI-Based Limits for Civil Servants**
10. **❌ Add Term Limit System by Employment Type**
11. **❌ Add Employment Type to Database Schema**

### **Medium Priority:**

12. **⚠️ Update Score Validity to 30 days**
13. **⚠️ Add Manual Refresh (7-day cooldown)**
14. **⚠️ Enhance Factor Analysis Messages**

---

## 📊 Score Calculation Comparison

### **Specification Formula:**
```
Final Score = Initial Risk (30-60) + Employment Bonus (0-10) + Performance (-20 to +39)
Range: 30-85
```

### **Current Formula:**
```
Final Score = Cold Start (30-65) + Trust Loop (-20 to +39)
Range: 30-99 (WRONG!)
```

### **What's Missing:**
- Employment Bonus component
- Account tenor scoring
- Additional accounts bonus
- Proper max score cap at 85

---

## 🎯 Implementation Priority

### **Phase 1: Core Fixes (Immediate)**
1. Change MAX_SCORE to 85
2. Add employment_type field to database
3. Implement Employment Bonus (0-10 points)
4. Fix no-overdraft points (5 → 10)
5. Update risk level classifications

### **Phase 2: Enhanced Scoring (Week 1)**
6. Add account tenor scoring
7. Add additional accounts bonus
8. Fix late payment penalties
9. Update loan limit tiers

### **Phase 3: Advanced Features (Week 2)**
10. DTNI-based limits for civil servants
11. Term limits by employment type
12. Enhanced factor analysis
13. Score validity and refresh logic

---

## 📝 Database Schema Changes Needed

```sql
-- Add to zimscore_users table
ALTER TABLE zimscore_users ADD COLUMN employment_type TEXT;
ALTER TABLE zimscore_users ADD COLUMN monthly_net_income DECIMAL(10,2);
ALTER TABLE zimscore_users ADD COLUMN account_age_months INT;
ALTER TABLE zimscore_users ADD COLUMN additional_accounts_count INT DEFAULT 0;

-- Add employment type constraint
ALTER TABLE zimscore_users ADD CONSTRAINT check_employment_type 
CHECK (employment_type IN ('government', 'private', 'business', 'informal', NULL));
```

---

## ✅ What's Already Correct

1. ✅ Base score of 30
2. ✅ Cash flow ratio scoring (0-20 points)
3. ✅ Balance consistency scoring
4. ✅ On-time payment rate tiers
5. ✅ Progressive borrowing bonus
6. ✅ Platform tenure bonus
7. ✅ Loan size progression
8. ✅ Interest rate range (0-10%)

---

## 🎯 Success Criteria

**Implementation is complete when:**
- [ ] Score range is 30-85 (not 30-99)
- [ ] Employment bonus system implemented
- [ ] Account tenor scoring added
- [ ] Additional accounts bonus added
- [ ] All point values match specification
- [ ] Risk levels match specification
- [ ] Loan limits match specification
- [ ] DTNI limits for civil servants work
- [ ] Term limits by employment type work

---

**Current Compliance: 60%**
**Target Compliance: 100%**
**Estimated Work: 2-3 days**

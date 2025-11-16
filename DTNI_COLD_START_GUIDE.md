# 💰 DTNI-Based Cold Start Limits Guide

## 🎯 **NEW: Dynamic Cold Start Limits**

The system now calculates cold start limits based on **DTNI (Debt-to-Net-Income) ratio** instead of fixed amounts.

---

## 📊 **Cold Start Limits by Employment Type**

### **🏛️ Civil Servants (Government Employees)**
- **Maximum Cold Start:** $300
- **Maximum DTNI:** 40%
- **Minimum Cold Start:** $60 (at 40% DTNI)

### **💼 Other Employment Types** (Private, Business, Informal)
- **Maximum Cold Start:** $100
- **Maximum DTNI:** 33%
- **Minimum Cold Start:** $60 (at 33% DTNI)

---

## 📈 **DTNI Calculation Formula**

```
DTNI Ratio = Total Monthly Debt / Monthly Net Income

Where:
- Total Monthly Debt = Sum of all active loan repayments
- Monthly Net Income = User's declared monthly income
```

### **Example 1: Civil Servant**
```
Monthly Income: $500
Active Loans: $50 (total monthly repayment)
DTNI = $50 / $500 = 0.10 (10%)

Result: Excellent DTNI → Full $300 cold start limit
```

### **Example 2: Private Sector**
```
Monthly Income: $400
Active Loans: $120 (total monthly repayment)
DTNI = $120 / $400 = 0.30 (30%)

Result: Good DTNI → $80 cold start limit (80% of $100)
```

---

## 🎚️ **DTNI Thresholds & Limits**

### **Excellent DTNI (≤20%)**
- **Status:** Excellent
- **Civil Servants:** $300 (100% of max)
- **Others:** $100 (100% of max)
- **Description:** Very low debt, excellent borrowing capacity

### **Good DTNI (21-30%)**
- **Status:** Good
- **Civil Servants:** $240 (80% of max)
- **Others:** $80 (80% of max)
- **Description:** Manageable debt, good borrowing capacity

### **Fair DTNI (31-40%)** ⚠️ *Civil Servants Only*
- **Status:** Fair
- **Civil Servants:** $180 (60% of max)
- **Others:** Denied (exceeds 33% max)
- **Description:** Higher debt, limited borrowing capacity

### **Limited (At Max DTNI)**
- **Status:** Limited
- **Civil Servants:** $180 (at 40% DTNI)
- **Others:** $60 (at 33% DTNI)
- **Description:** At maximum acceptable debt level

### **Denied (Over Max DTNI)**
- **Status:** Denied - DTNI too high
- **Cold Start Limit:** $0
- **Description:** Debt level too high, must reduce debt first

---

## 🔄 **Complete User Flow**

### **Step 1: User Completes Profile**
```
1. Register account
2. Upload National ID
3. Set employment type (REQUIRED)
4. Provide monthly income (REQUIRED)
```

### **Step 2: Upload Bank Statement**
```
System extracts:
- Opening balance
- Closing balance
- Total credits (income)
- Total debits (expenses)
- NSF events
- Account age
```

### **Step 3: DTNI Calculation**
```
System checks:
1. Monthly income from employment_details
2. Active loans from loans table
3. Calculates total monthly debt
4. Computes DTNI ratio
5. Determines cold start limit
```

### **Step 4: ZimScore Calculated**
```
Component 1: Banking Data (30-60 points)
Component 2: Employment Bonus (0-10 points)
Component 3: Performance (0 points for new users)

Total Score: 30-85 points
Cold Start Limit: $60-$300 (DTNI-based)
Score-based Limit: Unlocks after first repayment
```

---

## 📋 **DTNI Calculation Examples**

### **Example 1: New Civil Servant - Excellent DTNI**
```
Profile:
- Employment: Government
- Monthly Income: $600
- Active Loans: $0
- DTNI: 0% (no debt)

ZimScore Calculation:
- Banking Score: 60/60
- Employment Bonus: +10
- Performance: 0
- Total Score: 70/85

Cold Start Result:
- DTNI Status: Excellent (0%)
- Cold Start Limit: $300 ✅
- Score-based Limit: $800 (unlocks after first repayment)
```

### **Example 2: Private Sector - Good DTNI**
```
Profile:
- Employment: Private
- Monthly Income: $400
- Active Loans: $100 (25% DTNI)
- DTNI: 25%

ZimScore Calculation:
- Banking Score: 55/60
- Employment Bonus: +6
- Performance: 0
- Total Score: 61/85

Cold Start Result:
- DTNI Status: Good (25%)
- Cold Start Limit: $80 ✅ (80% of $100)
- Score-based Limit: $600 (unlocks after first repayment)
```

### **Example 3: Civil Servant - Fair DTNI**
```
Profile:
- Employment: Government
- Monthly Income: $500
- Active Loans: $180 (36% DTNI)
- DTNI: 36%

ZimScore Calculation:
- Banking Score: 58/60
- Employment Bonus: +10
- Performance: 0
- Total Score: 68/85

Cold Start Result:
- DTNI Status: Fair (36%)
- Cold Start Limit: $180 ✅ (60% of $300)
- Score-based Limit: $600 (unlocks after first repayment)
```

### **Example 4: Business Owner - At Max DTNI**
```
Profile:
- Employment: Business
- Monthly Income: $300
- Active Loans: $99 (33% DTNI)
- DTNI: 33%

ZimScore Calculation:
- Banking Score: 50/60
- Employment Bonus: +3
- Performance: 0
- Total Score: 53/85

Cold Start Result:
- DTNI Status: Limited (33%)
- Cold Start Limit: $60 ⚠️ (minimum)
- Score-based Limit: $400 (unlocks after first repayment)
```

### **Example 5: Informal Sector - Denied**
```
Profile:
- Employment: Informal
- Monthly Income: $200
- Active Loans: $80 (40% DTNI)
- DTNI: 40%

ZimScore Calculation:
- Banking Score: 45/60
- Employment Bonus: +0
- Performance: 0
- Total Score: 45/85

Cold Start Result:
- DTNI Status: Denied - DTNI too high (40%)
- Cold Start Limit: $0 ❌
- Message: "Your debt level is too high. Please reduce existing debt before applying."
```

---

## 🔧 **API Response Format**

### **Successful Calculation**
```json
{
  "success": true,
  "scoreValue": 70,
  "starRating": 4.0,
  "maxLoanAmount": 300,
  "scoreBasedLimit": 800,
  "riskLevel": "Low Risk",
  "coldStartActive": true,
  "employmentType": "government",
  "dtni": {
    "ratio": 0.0,
    "status": "Excellent",
    "monthlyIncome": 600,
    "monthlyDebt": 0
  },
  "factors": {
    "component1_banking": 60,
    "component2_employment": 10,
    "component3_performance": 0
  }
}
```

### **DTNI Too High**
```json
{
  "success": true,
  "scoreValue": 45,
  "starRating": 2.0,
  "maxLoanAmount": 0,
  "scoreBasedLimit": 300,
  "riskLevel": "Very High Risk",
  "coldStartActive": true,
  "employmentType": "informal",
  "dtni": {
    "ratio": 0.40,
    "status": "Denied - DTNI too high",
    "monthlyIncome": 200,
    "monthlyDebt": 80
  },
  "message": "Your debt-to-income ratio is too high. Please reduce existing debt before applying for new loans."
}
```

---

## 📊 **DTNI Limits Summary Table**

| DTNI Ratio | Status | Civil Servants | Others | Description |
|------------|--------|----------------|--------|-------------|
| 0-20% | Excellent | $300 (100%) | $100 (100%) | Full limit |
| 21-30% | Good | $240 (80%) | $80 (80%) | Reduced limit |
| 31-40% | Fair | $180 (60%) | ❌ Denied | Civil servants only |
| At Max | Limited | $180 | $60 | Minimum limit |
| Over Max | Denied | $0 | $0 | Too much debt |

---

## 🎯 **Key Benefits**

### **1. Risk-Based Lending** ✅
- Limits based on actual ability to repay
- Prevents over-indebtedness
- Protects both lender and borrower

### **2. Fair to Civil Servants** ✅
- Higher limits ($300 vs $100)
- More lenient DTNI threshold (40% vs 33%)
- Recognizes stable income

### **3. Dynamic & Responsive** ✅
- Adjusts to user's financial situation
- Updates as debt is repaid
- Rewards good behavior

### **4. Transparent** ✅
- Clear DTNI calculation
- Visible status (Excellent, Good, Fair, etc.)
- Users understand their limits

---

## 🔄 **How Limits Increase**

### **Cold Start Phase**
```
Initial Limit: $60-$300 (DTNI-based)
Status: Cold Start Active
Requirement: Repay first loan on-time
```

### **After First Repayment**
```
New Limit: Score-based ($100-$1,000)
Status: Cold Start Removed
Calculation: Based on ZimScore (30-85)
```

### **Progressive Borrowing**
```
Continue repaying on-time → Score increases
Score increases → Limit increases
Max Score (85) → Max Limit ($1,000)
```

---

## 🛡️ **Regulatory Compliance**

### **Consumer Protection**
- ✅ Prevents predatory lending
- ✅ Ensures affordability
- ✅ Transparent pricing

### **Responsible Lending**
- ✅ DTNI ratio checks
- ✅ Income verification required
- ✅ Debt capacity assessment

### **Financial Inclusion**
- ✅ Access for civil servants ($300)
- ✅ Access for informal sector ($100)
- ✅ Progressive borrowing for all

---

## 📝 **Implementation Checklist**

### **Backend** ✅
- [x] DTNI calculation method
- [x] Cold start limit logic
- [x] Database fields (dtni_ratio, dtni_status)
- [x] API response updates

### **Database** 📋
- [ ] Run migration to add DTNI fields
- [ ] Update existing records
- [ ] Create DTNI indexes

### **Frontend** 📋
- [ ] Display DTNI ratio to users
- [ ] Show cold start limit
- [ ] Explain DTNI status
- [ ] Add DTNI improvement tips

### **Testing** 📋
- [ ] Test all DTNI thresholds
- [ ] Test civil servant vs others
- [ ] Test with existing debt
- [ ] Test denial scenarios

---

## 🚀 **Next Steps**

1. **Run Database Migration**
   ```sql
   -- Add DTNI fields to user_zimscores table
   ALTER TABLE user_zimscores ADD COLUMN dtni_ratio DECIMAL(5,4);
   ALTER TABLE user_zimscores ADD COLUMN dtni_status TEXT;
   ```

2. **Test DTNI Calculations**
   - Create test users with different employment types
   - Set various monthly incomes
   - Create active loans
   - Verify cold start limits

3. **Update Frontend**
   - Show DTNI ratio in ZimScore card
   - Display cold start limit
   - Add DTNI status indicator
   - Provide tips to improve DTNI

4. **Monitor & Optimize**
   - Track DTNI distribution
   - Analyze denial rates
   - Adjust thresholds if needed
   - Gather user feedback

---

## ✅ **Summary**

**Old System:**
- Fixed $100 cold start for everyone
- No consideration of debt capacity
- Same limit regardless of employment

**New System:**
- Dynamic $60-$300 based on DTNI
- Considers existing debt and income
- Civil servants get higher limits
- Prevents over-indebtedness
- More fair and responsible

---

**Last Updated:** November 16, 2025
**Version:** 3.0.0
**Status:** ✅ Implemented & Ready for Testing

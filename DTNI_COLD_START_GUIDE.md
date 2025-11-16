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
Step 1: Net Salary × 40% = Maximum Monthly Installment
Step 2: Available Installment = Max Installment - Existing Installments
Step 3: Max Loan Amount = (Available Installment × Term) / (1 + Interest Rate)
Step 4: Apply Employment Cap (Civil Servants: $300, Others: $100)

Where:
- Net Salary = User's declared monthly income
- Existing Installments = Sum of all active loan monthly payments
- Term = Assumed 1 month (30 days) for cold start
- Interest Rate = Assumed 5% for cold start calculation
```

### **Example 1: Civil Servant - No Existing Debt**
```
Net Salary: $500
Max Installment: $500 × 40% = $200
Existing Installments: $0
Available Installment: $200 - $0 = $200

Max Loan Amount = ($200 × 1) / (1 + 0.05) = $190.48
Employment Cap: $300
Result: $190 cold start limit ✅
```

### **Example 2: Private Sector - With Existing Debt**
```
Net Salary: $400
Max Installment: $400 × 40% = $160
Existing Installments: $100
Available Installment: $160 - $100 = $60

Max Loan Amount = ($60 × 1) / (1 + 0.05) = $57.14
Employment Cap: $100
Result: $57 cold start limit ✅
```

---

## 🎚️ **Installment Utilization Thresholds**

### **Excellent (0% Utilization)**
- **Status:** Excellent - No existing debt
- **Description:** No active loans, full borrowing capacity available
- **Cold Start:** Based on 40% of net salary, capped at employment limit

### **Excellent (1-20% Utilization)**
- **Status:** Excellent - Low debt
- **Description:** Very low existing debt, excellent borrowing capacity
- **Cold Start:** High available installment capacity

### **Good (21-50% Utilization)**
- **Status:** Good
- **Description:** Moderate existing debt, good borrowing capacity
- **Cold Start:** Moderate available installment capacity

### **Fair (51-80% Utilization)**
- **Status:** Fair
- **Description:** Higher existing debt, limited borrowing capacity
- **Cold Start:** Limited available installment capacity

### **Limited (81-99% Utilization)**
- **Status:** Limited
- **Description:** Near maximum installment capacity
- **Cold Start:** Minimal available borrowing capacity

### **Denied (100%+ Utilization)**
- **Status:** Denied - At maximum capacity
- **Cold Start Limit:** $0
- **Description:** Already at or over 40% installment limit, must repay existing loans first

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
1. Net salary from employment_details
2. Calculates max installment: Net Salary × 40%
3. Gets active loans from loans table
4. Calculates existing monthly installments
5. Computes available installment capacity
6. Determines max loan amount from available installment
7. Applies employment cap ($300 or $100)
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

### **Example 1: New Civil Servant - No Existing Debt**
```
Profile:
- Employment: Government
- Net Salary: $600
- Active Loans: $0

DTNI Calculation:
- Max Installment: $600 × 40% = $240
- Existing Installments: $0
- Available Installment: $240
- Max Loan Amount: ($240 × 1) / 1.05 = $228.57
- Employment Cap: $300
- Final Limit: $228 (rounded)

ZimScore Calculation:
- Banking Score: 60/60
- Employment Bonus: +10
- Performance: 0
- Total Score: 70/85

Cold Start Result:
- Installment Utilization: 0%
- Status: Excellent - No existing debt
- Cold Start Limit: $228 ✅
- Score-based Limit: $800 (unlocks after first repayment)
```

### **Example 2: Private Sector - With Existing Debt**
```
Profile:
- Employment: Private
- Net Salary: $400
- Active Loans: 1 loan with $80 monthly installment

DTNI Calculation:
- Max Installment: $400 × 40% = $160
- Existing Installments: $80
- Available Installment: $160 - $80 = $80
- Max Loan Amount: ($80 × 1) / 1.05 = $76.19
- Employment Cap: $100
- Final Limit: $76 (rounded)

ZimScore Calculation:
- Banking Score: 55/60
- Employment Bonus: +6
- Performance: 0
- Total Score: 61/85

Cold Start Result:
- Installment Utilization: 50% ($80/$160)
- Status: Good
- Cold Start Limit: $76 ✅
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

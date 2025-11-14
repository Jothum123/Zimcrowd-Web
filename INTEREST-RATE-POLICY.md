# ZimCrowd Interest Rate Policy - User Choice Model

## 🎯 Core Principle

**ALL borrowers can choose their own interest rate from 0-10% per month, regardless of ZimScore tier.**

---

## 📊 How It Works

### **User Selection (0-10% Monthly)**
```
Borrower selects their preferred rate:
- 0% = No interest (goodwill loans)
- 1-3% = Low interest (confident in quick repayment)
- 4-6% = Standard interest (typical market rate)
- 7-10% = Higher interest (attract more lenders)
```

### **ZimScore Determines AMOUNT, Not Rate**

| ZimScore | Max Loan Amount | Interest Rate Choice |
|----------|----------------|---------------------|
| 80-85 | $1,000 | 0-10% (user choice) |
| 70-79 | $800 | 0-10% (user choice) |
| 60-69 | $600 | 0-10% (user choice) |
| 50-59 | $400 | 0-10% (user choice) |
| 40-49 | $300 | 0-10% (user choice) |
| 30-39 | $100 | 0-10% (user choice) |

**Key Point**: A borrower with ZimScore 35 can offer 3% interest just like a borrower with ZimScore 85. The difference is the loan amount limit ($100 vs $1,000).

---

## 🎯 Why User Choice?

### **1. Financial Inclusion**
- Lower-tier borrowers aren't forced into high rates
- Everyone has access to competitive pricing
- Reduces predatory lending concerns

### **2. Market Dynamics**
- Borrowers compete for lenders by offering attractive rates
- Lenders choose based on risk/reward preference
- Natural market equilibrium

### **3. User Empowerment**
- Borrowers control their own costs
- Transparency in pricing
- No hidden rate markups

### **4. Regulatory Compliance**
- Avoids discriminatory pricing
- Clear disclosure requirements
- Consumer protection friendly

---

## 📋 How Borrowers Choose Rates

### **Low Interest (0-3%)**
**When to use:**
- Very short-term loan (7-14 days)
- Confident in quick repayment
- Want to attract lenders quickly
- Building reputation

**Example:**
```
$500 at 2% for 30 days
Interest: $10
Total repayment: $510
APR: 24%
```

### **Standard Interest (4-6%)**
**When to use:**
- Typical 30-day loan
- Standard market rate
- Balanced risk/reward
- Most common choice

**Example:**
```
$500 at 5% for 30 days
Interest: $25
Total repayment: $525
APR: 60%
```

### **Higher Interest (7-10%)**
**When to use:**
- Longer-term loan (60-90 days)
- Lower ZimScore (need to attract lenders)
- Urgent funding needed
- Willing to pay premium

**Example:**
```
$500 at 8% for 30 days
Interest: $40
Total repayment: $540
APR: 96%
```

---

## 🔄 Lender Perspective

### **Lenders Filter by Preference**
```javascript
// Lender can filter loan requests:
- Minimum interest rate: 5%
- Maximum interest rate: 10%
- ZimScore range: 60-85
- Loan amount: $200-$1,000
```

### **Risk/Reward Matching**
| Lender Type | Preferred Rate | Preferred ZimScore | Strategy |
|-------------|---------------|-------------------|----------|
| Conservative | 3-5% | 70-85 | Low risk, steady returns |
| Balanced | 5-7% | 50-79 | Moderate risk/reward |
| Aggressive | 7-10% | 30-59 | High risk, high returns |

---

## 🚫 What ZimScore Does NOT Control

❌ Interest rate selection
❌ Forced pricing tiers
❌ Rate discrimination
❌ Hidden fees based on score

---

## ✅ What ZimScore DOES Control

✅ Maximum loan amount
✅ Loan approval likelihood
✅ Platform trust indicators
✅ Lender confidence signals

---

## 📊 Real-World Scenarios

### **Scenario 1: Low Score, Low Rate**
```
Borrower: ZimScore 35 (Building Credit)
Max Loan: $100
Chosen Rate: 3%
Strategy: Build trust with low rate

Result:
- Loan Amount: $100
- Interest (30 days): $3
- Total Repayment: $103
- APR: 36%
- Lender Appeal: High (low risk amount + low rate)
```

### **Scenario 2: High Score, High Rate**
```
Borrower: ZimScore 82 (Very Low Risk)
Max Loan: $1,000
Chosen Rate: 8%
Strategy: Urgent need, willing to pay premium

Result:
- Loan Amount: $1,000
- Interest (30 days): $80
- Total Repayment: $1,080
- APR: 96%
- Lender Appeal: Very High (low risk + high return)
```

### **Scenario 3: Medium Score, Medium Rate**
```
Borrower: ZimScore 65 (Medium Risk)
Max Loan: $600
Chosen Rate: 5%
Strategy: Standard market rate

Result:
- Loan Amount: $600
- Interest (30 days): $30
- Total Repayment: $630
- APR: 60%
- Lender Appeal: Moderate (balanced risk/reward)
```

---

## 🎯 Platform Benefits

### **1. Competitive Marketplace**
- Borrowers compete on rate, not forced into tiers
- Natural price discovery
- Market-driven equilibrium

### **2. Faster Funding**
- Borrowers can adjust rate to attract lenders
- No waiting for "tier approval"
- Dynamic pricing

### **3. Better User Experience**
- Transparent pricing
- User control
- No surprises

### **4. Regulatory Compliance**
- No discriminatory pricing
- Clear disclosure
- Consumer-friendly

---

## 📋 UI/UX Implementation

### **Loan Request Form**
```html
<div class="loan-request-form">
    <h3>Request a Loan</h3>
    
    <!-- Amount (ZimScore-limited) -->
    <label>Loan Amount</label>
    <input type="number" max="{{maxLoanAmount}}" />
    <small>Your max: ${{maxLoanAmount}} (based on ZimScore {{zimScore}})</small>
    
    <!-- Interest Rate (User Choice) -->
    <label>Monthly Interest Rate</label>
    <input type="range" min="0" max="10" step="0.5" />
    <div class="rate-display">{{selectedRate}}%</div>
    
    <div class="rate-guidance">
        <p>💡 Suggested rates:</p>
        <ul>
            <li>0-3%: Quick funding, build trust</li>
            <li>4-6%: Standard market rate</li>
            <li>7-10%: Attract more lenders</li>
        </ul>
    </div>
    
    <!-- Calculated Costs -->
    <div class="cost-breakdown">
        <p>Interest (30 days): ${{calculatedInterest}}</p>
        <p>Total Repayment: ${{totalRepayment}}</p>
        <p>APR: {{apr}}%</p>
    </div>
</div>
```

---

## 🔧 Technical Implementation

### **Validation Logic**
```javascript
function validateLoanRequest(userId, amount, rate) {
    // Get user's ZimScore
    const zimScore = await getZimScore(userId);
    const maxAmount = getMaxLoanAmount(zimScore);
    
    // Validate amount (ZimScore-based)
    if (amount > maxAmount) {
        throw new Error(`Amount exceeds your limit of $${maxAmount}`);
    }
    
    // Validate rate (always 0-10%)
    if (rate < 0 || rate > 10) {
        throw new Error('Interest rate must be between 0-10%');
    }
    
    return {
        approved: true,
        amount,
        rate,
        maxAmount,
        zimScore
    };
}
```

### **Interest Calculation**
```javascript
function calculateInterest(principal, monthlyRate, days = 30) {
    // Monthly rate is user-selected (0-10%)
    const dailyRate = monthlyRate / 30;
    const interest = principal * (dailyRate / 100) * days;
    
    return {
        interest: Math.round(interest * 100) / 100,
        totalRepayment: principal + interest,
        apr: (monthlyRate * 12) // Simple APR
    };
}

// Example
calculateInterest(500, 5, 30);
// Returns: { interest: 25, totalRepayment: 525, apr: 60 }
```

---

## 📊 Comparison: Old vs New Model

### **Old Model (Tier-Based Rates) ❌**
```
Score 80-85: Forced 3-4% rate
Score 70-79: Forced 4-5% rate
Score 60-69: Forced 5-6% rate
Score 50-59: Forced 6-7% rate
Score 40-49: Forced 7-8% rate
Score 30-39: Forced 8-10% rate

Problems:
- Discriminatory pricing
- No user control
- Regulatory concerns
- Poor UX
```

### **New Model (User Choice) ✅**
```
ALL Scores: User chooses 0-10% rate

Benefits:
- User empowerment
- Market-driven pricing
- Regulatory compliant
- Better UX
- Competitive marketplace
```

---

## 🎯 Key Messaging

### **For Borrowers:**
> "You choose your interest rate (0-10%). Your ZimScore determines how much you can borrow, not what you pay in interest."

### **For Lenders:**
> "Filter loans by interest rate, ZimScore, and amount. Choose investments that match your risk tolerance and return expectations."

### **For Platform:**
> "ZimCrowd provides a fair, transparent marketplace where borrowers set their own rates and lenders choose their investments."

---

## ✅ Summary

**What Users Choose:**
- ✅ Interest rate (0-10%)
- ✅ Loan amount (up to their max)
- ✅ Loan duration (7-90 days)

**What ZimScore Controls:**
- ✅ Maximum loan amount
- ✅ Platform trust indicators
- ✅ Approval likelihood

**What Platform Does:**
- ✅ Facilitates matching
- ✅ Provides transparency
- ✅ Ensures compliance
- ✅ Protects both parties

---

**The ZimCrowd model empowers users while managing risk through loan amount limits, not forced interest rates!** 🎯

---

**Document Version: 1.0**
**Last Updated: November 14, 2025**
**Policy: User-selected interest rates (0-10%) for all borrowers**

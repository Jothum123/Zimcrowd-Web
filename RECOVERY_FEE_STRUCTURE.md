# RECOVERY FEE STRUCTURE

**Last Updated:** November 15, 2025

---

## OVERVIEW

The Recovery Fee is charged **ONLY when a borrower defaults** and collection efforts are required. This fee is deducted from the **lender's recovered amount** and paid to recovery companies.

---

## WHEN RECOVERY FEE APPLIES

### **Default Triggers:**
1. Payment **30+ days overdue**
2. Borrower files bankruptcy
3. Borrower provides false information
4. Borrower violates loan terms
5. Multiple consecutive missed payments

### **NOT Triggered By:**
- Late payments (1-29 days)
- Single missed payment
- Borrower communication issues
- Temporary financial hardship

---

## RECOVERY FEE CALCULATION

### **Fee Structure:**
- **Rate:** 30% of successfully collected amount
- **Charged To:** Lenders (investors)
- **Paid To:** Recovery companies
- **Charged When:** Recovery is successful

### **Example 1: Full Recovery**
```
Borrower Default Amount: $4,500
Recovery Company Collects: $4,500
Recovery Fee (30%): $1,350
Lender Receives: $3,150 (70%)
```

### **Example 2: Partial Recovery**
```
Borrower Default Amount: $4,500
Recovery Company Collects: $2,000
Recovery Fee (30%): $600
Lender Receives: $1,400 (70%)
```

### **Example 3: No Recovery**
```
Borrower Default Amount: $4,500
Recovery Company Collects: $0
Recovery Fee: $0
Lender Receives: $0
```

---

## RECOVERY PROCESS

### **Step 1: Default Declaration**
- Loan marked as "defaulted"
- All lenders notified
- Recovery process initiated

### **Step 2: Internal Collection Attempts**
- Platform attempts contact (30 days)
- No recovery fee during this phase
- If successful, no recovery fee charged

### **Step 3: External Recovery**
- Recovery company engaged
- Legal action may be initiated
- Recovery fee applies to any amount collected

### **Step 4: Distribution**
```
Amount Collected by Recovery Company
↓
Recovery Fee Deducted (30%)
↓
Remaining Amount (70%)
↓
Distributed to Lenders Proportionally
```

---

## LENDER IMPACT

### **Investment at Risk:**
When a loan defaults, lenders face:
1. **Principal Loss Risk:** May lose entire investment
2. **Recovery Fee:** 30% of any recovered amount
3. **Time Delay:** Recovery can take months/years
4. **No Guarantees:** Recovery not guaranteed

### **Net Recovery Calculation:**
```
Original Investment: $1,000
Borrower Defaults on: $4,500 (remaining balance)
Your Share (20%): $900 at risk

If $2,000 Recovered:
- Your Proportional Share: $400
- Recovery Fee (30%): -$120
- Net Recovery: $280

Total Loss: $1,000 - $280 = $720 (72% loss)
```

---

## RECOVERY FEE DISCLOSURE

### **Lenders Must Understand:**
- Recovery fee is **30% of collected amount**
- Fee deducted **before distribution** to lenders
- Fee only charged **if recovery successful**
- **No recovery = No fee** (but also no recovery)
- Recovery companies paid from this fee

### **In Loan Investment Agreement:**
> "In the event of borrower default and engagement of recovery services, a recovery fee of 30% of any successfully collected amount will be deducted before distribution to lenders. This fee is paid to recovery companies for their collection efforts."

---

## COMPARISON WITH OTHER FEES

### **Regular Fees (No Default):**
| Fee Type | Rate | Charged To | When |
|----------|------|------------|------|
| Service Fee | 10% | Borrower & Lender | Upfront |
| Insurance Fee | 3% | Borrower & Lender | Upfront |
| Tenure Fee | 1%/month | Borrower | Monthly |
| Collection Fee | 5% | Borrower & Lender | Monthly |
| Late Fee | 10%, min $50 | Borrower | 1+ days late |

### **Default Scenario:**
| Fee Type | Rate | Charged To | When |
|----------|------|------------|------|
| **Recovery Fee** | **30%** | **Lenders** | **On successful recovery** |

---

## RISK MITIGATION FOR LENDERS

### **To Minimize Recovery Fee Impact:**
1. **Diversify Investments:** Spread across multiple loans
2. **Choose Low-Risk Borrowers:** Higher ZimScore = Lower default risk
3. **Monitor Loans:** Early warning signs
4. **Accept Risk:** Understand recovery fee before investing

### **Platform Protection:**
- Insurance fee (3%) provides some coverage
- Platform attempts internal collection first
- Recovery companies only engaged when necessary
- Transparent fee structure

---

## LEGAL COMPLIANCE

### **Recovery Fee Justification:**
- Covers actual recovery company costs
- Industry-standard rate (20-40%)
- Only charged on successful recovery
- Disclosed upfront to all lenders
- Cannot be waived or negotiated

### **Lender Agreement:**
Lenders must acknowledge:
- Understanding of recovery fee
- Acceptance of 30% deduction
- No guarantee of recovery
- Potential total loss of investment

---

## EXAMPLE SCENARIOS

### **Scenario 1: High Recovery**
```
Loan Amount: $5,000
Your Investment: $1,000 (20%)
Borrower Defaults: $4,000 remaining

Recovery: $3,500 (87.5%)
Recovery Fee: $1,050 (30%)
Net to Distribute: $2,450

Your Share: $490 (20% of $2,450)
Your Loss: $510 (51% of investment)
```

### **Scenario 2: Low Recovery**
```
Loan Amount: $5,000
Your Investment: $1,000 (20%)
Borrower Defaults: $4,000 remaining

Recovery: $800 (20%)
Recovery Fee: $240 (30%)
Net to Distribute: $560

Your Share: $112 (20% of $560)
Your Loss: $888 (88.8% of investment)
```

### **Scenario 3: No Recovery**
```
Loan Amount: $5,000
Your Investment: $1,000 (20%)
Borrower Defaults: $4,000 remaining

Recovery: $0
Recovery Fee: $0
Net to Distribute: $0

Your Share: $0
Your Loss: $1,000 (100% of investment)
```

---

## RECOVERY FEE IN API

### **Calculation Endpoint:**
```
POST /api/fees/calculate-recovery-fee

Request:
{
  "collected_amount": 2000,
  "lender_investment": 1000,
  "total_loan_amount": 5000
}

Response:
{
  "collected_amount": 2000,
  "recovery_fee": 600,
  "net_distribution": 1400,
  "lender_proportion": 0.20,
  "lender_share_gross": 400,
  "lender_recovery_fee": 120,
  "lender_net_recovery": 280
}
```

---

## SUMMARY

**Recovery Fee:**
- **30% of successfully collected amount**
- **Charged to lenders** (deducted from recovery)
- **Paid to recovery companies**
- **Only when borrower defaults**
- **Only if recovery successful**

**Key Points:**
- ✅ Transparent disclosure required
- ✅ Industry-standard rate
- ✅ Covers actual recovery costs
- ✅ No fee if no recovery
- ✅ Lenders bear the cost

**This protects the platform while ensuring recovery efforts are funded.**

---

*Recovery fees are a necessary cost of default management and are clearly disclosed to all lenders before investment.*

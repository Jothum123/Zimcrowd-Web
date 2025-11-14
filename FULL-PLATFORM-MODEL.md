# 🏦 ZimCrowd Platform - Complete Three-System Model

## 🎯 Core Architecture

ZimCrowd operates on **three distinct, interconnected systems**:

### **1. ZimScore (Reputation) ⭐ - Cannot Be Spent**
- Proprietary score: 30-99 (displayed as 1.0-5.0 stars)
- Determines trustworthiness and max loan amount ($50-$1000)
- Built from KYC/statements (OCR) + repayment history
- **Cannot be spent or withdrawn - only indicates trust**

### **2. Cash Balance (Wallet 1) 💵 - Real Money**
- Real, withdrawable cash (e.g., $100.00)
- Filled by: Loan disbursements (borrowers), Repayments (lenders)
- Used for: Withdrawals, Funding loans
- **Fully liquid, can withdraw to bank/EcoCash**

### **3. ZimCrowd Credit Balance (Wallet 2) 🎁 - In-App Currency**
- Non-withdrawable in-app currency (e.g., $25.00 credits)
- Filled by: Signup bonus, Referrals, **Payment Coverage acceptance**
- Used for: Platform fees, **Funding new loans**
- **Cannot withdraw - keeps value in ecosystem**

---

## 💡 Payment Coverage Innovation (The Game Changer)

### **The Problem:**
Borrower misses payment → Lender waits → Money stuck

### **The Solution:**
Platform offers lender **credits instead of waiting**

### **How It Works:**

**1. Borrower Misses Payment**
```
Installment Due: $100
Days Late: 5
Status: LATE
```

**2. System Creates Coverage Offer**
```
Original: $100
Coverage: 70% (80% - 2% per day late)
Offer: $70 in credits
Expires: 180 days
```

**3. Lender Chooses:**

**Accept Credits:**
- ✅ Get $70 credits immediately (Wallet 2)
- ✅ Use to fund new loans
- ✅ Keep money circulating
- Installment marked "covered_by_platform"

**Decline:**
- ❌ Wait for borrower cash payment
- ⏳ Money stuck until paid
- 💰 Get full $100 if borrower pays

---

## 📊 Coverage Formula

```javascript
Coverage % = 80% - (2% × days_late)
Minimum: 50%

Examples:
Day 1: 78%
Day 5: 70%
Day 10: 60%
Day 15+: 50% (floor)
```

---

## 🔄 The Closed Loop Economy

**Why this works:**

```
1. Lender accepts $70 credits for late $100 payment
   → Credits to Wallet 2

2. Lender uses $70 credits to fund new loan
   → New borrower gets $70 cash (Wallet 1)

3. New borrower repays $75 (with interest)
   → Lender gets $75 cash (Wallet 1)

Net: Lost $30 on first, gained $5 on second = -$25
But money kept moving! Platform facilitated 2 loans vs 1 stuck.
```

**Key:** Credits can't be withdrawn BUT can fund loans → generate real cash returns

---

## 💰 Database Schema

### **Updated Tables:**

**zimscore_users**
```sql
+ cash_balance DECIMAL(10,2)              -- Wallet 1
+ non_withdrawable_credit DECIMAL(10,2)   -- Wallet 2
```

**zimscore_loans**
```sql
+ lender_user_id UUID
+ number_of_installments INT
+ funded_with_cash DECIMAL(10,2)
+ funded_with_credits DECIMAL(10,2)
```

### **New Tables:**

**credit_ledger** (Wallet 2 audit)
```sql
- ledger_id, user_id, amount
- balance_before, balance_after
- type (SIGNUP_BONUS, PAYMENT_COVERAGE, FEE_PAYMENT, LOAN_FUNDING)
- reference_id, notes, created_at
```

**cash_ledger** (Wallet 1 audit)
```sql
- ledger_id, user_id, amount
- balance_before, balance_after
- type (LOAN_DISBURSEMENT, LOAN_REPAYMENT_RECEIVED, WITHDRAWAL)
- reference_id, created_at
```

**loan_repayment_schedule**
```sql
- repayment_id, loan_id, installment_number
- amount_due, principal_portion, interest_portion
- due_date, status (pending, late, paid, covered_by_platform)
- paid_amount, paid_at, days_late
```

**payment_coverage_offers**
```sql
- offer_id, repayment_id, loan_id
- lender_user_id, borrower_user_id
- original_amount_due, offer_amount_credits
- coverage_percentage, days_late
- status (pending, accepted, declined, expired)
- expires_at, accepted_at, created_at
```

---

## 🔧 Services Implemented

### **1. Credit Ledger Service**
```javascript
creditLedgerService.addCredits(userId, amount, type, refId, notes)
creditLedgerService.deductCredits(userId, amount, type, refId, notes)
creditLedgerService.getBalance(userId)
creditLedgerService.awardSignupBonus(userId, 25.00)
creditLedgerService.awardReferralBonus(referrerId, referredId, 10.00)
```

### **2. Payment Coverage Service**
```javascript
paymentCoverageService.createOffer(repaymentId, loanId, lenderId, borrowerId, amount, daysLate)
paymentCoverageService.acceptOffer(offerId, lenderId)
paymentCoverageService.declineOffer(offerId, lenderId)
paymentCoverageService.getPendingOffers(lenderId)
paymentCoverageService.checkAndCreateOffersForLatePayments() // Cron
paymentCoverageService.expireOldOffers() // Cron
```

---

## 📱 User Experience

### **Borrower Dashboard:**
```
┌─────────────────────────────────┐
│ Your Balances                   │
├─────────────────────────────────┤
│ 💵 Cash (Wallet 1): $150.00     │
│    [Withdraw to Bank]           │
│                                 │
│ 🎁 Credits (Wallet 2): $25.00   │
│    Use for fees & funding       │
│                                 │
│ ⭐ ZimScore: 65/99 (3.0★)       │
│    Max Loan: $400               │
└─────────────────────────────────┘
```

### **Lender Payment Coverage Offer:**
```
🚨 Late Payment Alert

Borrower: John D. (ZimScore: 55)
Installment: $105
Days Late: 7

┌─────────────────────────────────┐
│ Payment Coverage Offer          │
├─────────────────────────────────┤
│ Original: $105                  │
│ Coverage: 66% (7 days late)     │
│ Offer: $69.30 credits           │
│                                 │
│ Accept: Get credits now         │
│ Decline: Wait for cash          │
│                                 │
│ Expires: 180 days               │
│ [Accept] [Decline]              │
└─────────────────────────────────┘
```

---

## 📈 Example Scenario

**Setup:**
- Loan: $200 @ 5%, 2 installments of $105 each
- Lender: Alice, Borrower: Bob

**Installment 1:** ✅ On time
- Bob pays $105 → Alice Wallet 1 +$105

**Installment 2:** ❌ 5 days late
- System creates offer: $73.50 credits (70% coverage)
- Alice accepts → Alice Wallet 2 +$73.50
- Alice uses $73.50 to fund new loan
- New borrower repays $77.70
- Alice Wallet 1 +$77.70

**Result:**
- Lost $31.50 on first loan ($105 - $73.50)
- Gained $4.20 on second loan ($77.70 - $73.50)
- Net: -$27.30, but facilitated 2 loans instead of 1 stuck!

---

## 🎯 Key Benefits

**For Borrowers:**
- Clear reputation path ($50 → $1000)
- Signup bonus helps with fees
- On-time payments increase limits

**For Lenders:**
- Payment coverage option
- Keep money circulating
- Credits fund new loans → generate returns

**For Platform:**
- Closed-loop economy
- Reduced default impact
- Higher loan velocity
- Sustainable model

---

## 🚀 Deployment

### **1. Run Database Migration:**
```sql
-- In Supabase SQL Editor:
-- Run: database/full-platform-schema.sql
```

### **2. Test Services:**
```javascript
// Award signup bonus
await creditLedgerService.awardSignupBonus(userId, 25.00);

// Create coverage offer
await paymentCoverageService.createOffer(...);

// Accept offer
await paymentCoverageService.acceptOffer(offerId, lenderId);
```

### **3. Setup Cron Jobs:**
```javascript
// Every hour: Check late payments
cron.schedule('0 * * * *', async () => {
    await paymentCoverageService.checkAndCreateOffersForLatePayments();
});

// Daily: Expire old offers
cron.schedule('0 0 * * *', async () => {
    await paymentCoverageService.expireOldOffers();
});
```

---

## 📝 Summary

**Three Systems:**
1. **ZimScore** - Reputation (30-99) - Cannot spend
2. **Wallet 1** - Cash - Withdrawable
3. **Wallet 2** - Credits - In-app currency

**Innovation:**
- Payment Coverage for late payments
- Lenders choose: wait OR accept credits
- Credits fund loans → generate returns
- Closed-loop keeps money circulating

**Files Created:**
- ✅ `database/full-platform-schema.sql`
- ✅ `services/credit-ledger.service.js`
- ✅ `services/payment-coverage.service.js`
- ✅ `FULL-PLATFORM-MODEL.md`

**The system works because credits can't be withdrawn but CAN fund loans!** 🎯

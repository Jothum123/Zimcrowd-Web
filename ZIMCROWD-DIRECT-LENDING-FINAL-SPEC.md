# ZimCrowd Direct Lending - Final Consolidated Specification

## 📋 Executive Summary

**ZimCrowd Direct** is an instant funding product funded directly by ZimCrowd Capital (not P2P). This document consolidates all specifications from multiple source files to create a single source of truth.

---

## 🎯 Product Overview

| Attribute | Value |
|-----------|-------|
| **Product Name** | ZimCrowd Direct |
| **Tagline** | "Instant cash when you need it" |
| **Funding Source** | ZimCrowd Capital (not P2P lenders) |
| **Speed** | Instant (minutes) |
| **Approval** | Guaranteed (based on documents) |
| **Target Market** | Emergency cash, payday alternative |

---

## ✅ Eligibility Requirements

### NOT TIED TO ZIMSCORE

Anyone registered can apply for Direct Lending. The system checks for **required documents only**:

| Document | Required | Purpose |
|----------|----------|---------|
| **National ID** | ✅ Yes | Identity verification |
| **Selfie Photo** | ✅ Yes | Face match verification |
| **Payslip** | ✅ Yes | Income verification |
| **Bank Statement** | ✅ Yes | Financial history & DTNI calculation |
| **Proof of Residence** | ✅ Yes | Address verification |

### Key Points

- ❌ **NOT tied to ZimScore** - No credit score required
- ✅ **Document-based** - Just upload required documents
- ✅ **DTNI-based limit** - Max loan based on income
- ✅ **No cold start** - Full limit immediately

---

## 💰 Loan Amounts (Based on DTNI)

### Maximum Loan: $3,000

Loan amount is determined by **DTNI (Debt-to-Net-Income)** from payslip/bank statement:

| Employment Type | DTNI Ratio | Max Tenure | Example ($500 salary) |
|-----------------|------------|------------|----------------------|
| **Government** | 40% | 24 months | $200/month available |
| **Private** | 33% | 12 months | $165/month available |
| **Business** | 33% | 12 months | $165/month available |
| **Informal** | 33% | 12 months | $165/month available |

### Formula

```
Max Installment = Net Salary × DTNI Ratio
Available Installment = Max Installment - Existing Debt
Max Loan = (Available × Term) / (1 + Interest Rate × Term)
Final Max = min(Max Loan, $3,000)
```

---

## 📊 Interest Rate

### SINGLE FIXED RATE FOR ALL USERS

**8% per month = 96% per annum**

| Rate Type | Value |
|-----------|-------|
| **Monthly Interest Rate** | 8% |
| **Annual Interest Rate** | 96% |
| **Calculation Method** | Simple Interest |

### Interest Calculation Examples

| Principal | Term | Monthly Interest | Total Interest | Total Repayment |
|-----------|------|------------------|----------------|-----------------|
| $100 | 1 month | $8 | $8 | $108 |
| $100 | 3 months | $8 | $24 | $124 |
| $500 | 1 month | $40 | $40 | $540 |
| $500 | 3 months | $40 | $120 | $620 |
| $1,000 | 1 month | $80 | $80 | $1,080 |
| $1,000 | 6 months | $80 | $480 | $1,480 |
| $3,000 | 12 months | $240 | $2,880 | $5,880 |

### Formula

```
Monthly Interest = Principal × 8%
Total Interest = Monthly Interest × Term (months)
Total Repayment = Principal + Total Interest
Monthly Payment = Total Repayment ÷ Term (months)
```

### Key Points

- ✅ **Same rate for ALL users** - No tiered pricing based on ZimScore
- ✅ **Simple interest** - Easy to understand
- ✅ **Transparent** - No hidden fees
- ✅ **ZimScore determines LIMIT only** - Not the interest rate

---

## 📅 Loan Terms

### Available Durations

| Employment Type | Cold Start | Post-Cold Start |
|-----------------|------------|-----------------|
| **Government** | Up to 24 months | Up to 24 months |
| **Private** | 3 months (fixed) | Up to 12 months |
| **Business** | 3 months (fixed) | Up to 12 months |
| **Informal** | 3 months (fixed) | Up to 12 months |

### Term Options

- **Short-term:** 7, 14, 30 days (single repayment)
- **Medium-term:** 3, 6 months (monthly installments)
- **Long-term:** 9, 12, 18, 24 months (monthly installments - Government only)

---

## 💳 Late Fees

| Component | Rate | Minimum |
|-----------|------|---------|
| **Total Late Fee** | 10% of payment | $50 |
| **Platform Share** | 5% | $25 |
| **Lender Share** | 5% | $25 |
| **Grace Period** | 24 hours | - |

---

## 🔄 User Flow

### Step 1: Check Eligibility
```
User Dashboard → "Get Instant Funding"
→ System checks ZimScore and DTNI
→ Returns max loan amount
```

### Step 2: View Guaranteed Offer
```
Display:
- Principal Amount: $100
- Fixed Finance Fee: $8 (8%)
- Total Repayment: $108
- APR: 97% (disclosed)
- Due Date: 30 days from now
- Expires: 24 hours
```

### Step 3: Accept & Sign Agreement
```
User:
1. Reviews key terms
2. Reads full agreement (scrollable)
3. Checks "I agree" box
4. Types full legal name (e-signature)
5. Clicks "Accept & Receive Funds"
```

### Step 4: Instant Disbursement
```
System:
1. Validates e-signature
2. Creates direct_loan record
3. Adds cash to Wallet 1
4. Sends confirmation SMS/Email

User sees:
"✅ $100.00 added to your Cash Balance"
```

### Step 5: Repayment
```
Options:
- Paynow
- EcoCash
- Bank Transfer

On repayment:
- Update loan status
- Update ZimScore (+3 for on-time)
- Remove cold start (if first loan)
```

---

## 🗄️ Database Schema

### Tables Required

1. **direct_loans** - Main loan records
2. **direct_loan_offers** - Offer history
3. **direct_loan_repayments** - Payment records
4. **direct_loan_installments** - For monthly payment loans (NEW)

### Key Fields

```sql
direct_loans:
- direct_loan_id (UUID)
- borrower_user_id (UUID)
- principal_amount (DECIMAL)
- fixed_finance_fee (DECIMAL)
- total_repayment_amount (DECIMAL)
- apr (DECIMAL)
- due_date (TIMESTAMP)
- status (offer_pending, agreement_signed, disbursed, repaid, late, defaulted)
- agreement_signed (BOOLEAN)
- signature_name (TEXT)
- signature_ip_address (TEXT)
- signed_at (TIMESTAMP)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/direct-loans/create-offer` | Create/get pending offer |
| GET | `/api/direct-loans/offers/:offerId` | Get offer details |
| POST | `/api/direct-loans/accept-offer` | Accept with e-signature |
| POST | `/api/direct-loans/disburse` | Disburse funds |
| GET | `/api/direct-loans/my-loans` | Get user's loans |
| POST | `/api/direct-loans/repayment` | Record repayment |
| GET | `/api/direct-loans/stats` | Get loan statistics |

---

## ✅ Implementation Checklist

### Backend (Completed)
- [x] `services/direct-loan.service.js` - Core service
- [x] `routes/direct-loans.js` - API routes
- [x] `database/direct-loans-schema.sql` - Database schema
- [x] `constants/fees.js` - Fee constants

### Backend (To Do)
- [ ] Integrate with ZimScore service for cold start logic
- [ ] Add monthly installment support
- [ ] Add late fee calculation
- [ ] Add SMS/Email notifications
- [ ] Add cron jobs for late loan detection

### Frontend (To Do)
- [ ] Direct loan offer page (`direct-loan-offer.html`)
- [ ] E-signature agreement page (`direct-loan-agreement.html`)
- [ ] Success/confirmation page
- [ ] Loan management in dashboard
- [ ] Repayment interface

---

## 🎯 Key Decisions Required

### 1. Fee Model
**Question:** One-time fixed fee OR monthly interest?

| Option | Pros | Cons |
|--------|------|------|
| **One-time fee** | Simple, transparent | Higher APR disclosure |
| **Monthly interest** | Lower APR, familiar | More complex |

**Recommendation:** Use **one-time fixed fee** for short-term (7-30 days) and **monthly interest** for longer terms (3+ months).

### 2. Loan Terms
**Question:** Fixed 30 days OR flexible terms?

**Recommendation:** Offer multiple options:
- 7, 14, 30 days (single repayment)
- 3, 6, 12 months (monthly installments)

### 3. Cold Start for Government
**Decision Made:** Government employees have **NO cold start cap** - they get full DTNI-based limit immediately.

---

## 📊 Revenue Projections

### Per Loan Revenue

| Loan Amount | Fee (8%) | Platform Revenue |
|-------------|----------|------------------|
| $100 | $8 | $8 |
| $500 | $40 | $40 |
| $1,000 | $80 | $80 |
| $3,000 | $240 | $240 |

### Monthly Projections

| Scenario | Loans/Month | Avg Loan | Avg Fee | Revenue |
|----------|-------------|----------|---------|---------|
| Conservative | 100 | $200 | 8% | $1,600 |
| Moderate | 500 | $300 | 8% | $12,000 |
| Aggressive | 1,000 | $500 | 8% | $40,000 |

---

## 🚀 Next Steps

### Phase 1: Core Implementation (Week 1)
1. Update direct-loan.service.js with new fee tiers
2. Integrate with ZimScore cold start logic
3. Create offer and agreement pages
4. Test end-to-end flow

### Phase 2: Enhanced Features (Week 2)
1. Add monthly installment support
2. Implement late fee calculation
3. Add SMS/Email notifications
4. Create admin dashboard

### Phase 3: Launch (Week 3)
1. Final testing
2. Documentation
3. Soft launch to beta users
4. Monitor and iterate

---

## 📁 Related Files

| File | Purpose |
|------|---------|
| `services/direct-loan.service.js` | Core loan service |
| `services/zimscore.service.js` | ZimScore calculations |
| `routes/direct-loans.js` | API endpoints |
| `database/direct-loans-schema.sql` | Database schema |
| `constants/fees.js` | Fee constants |
| `public/direct-loan-offer.html` | Offer UI |
| `direct-loan-request.html` | Request UI |

---

**Document Version:** 2.0
**Last Updated:** December 3, 2025
**Status:** Ready for Implementation

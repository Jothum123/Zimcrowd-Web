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
| **Approval** | Guaranteed (based on ZimScore) |
| **Target Market** | Emergency cash, payday alternative |

---

## 💰 Loan Amounts (Based on ZimScore)

### Updated Limits (Max $3,000)

| ZimScore | Star Rating | Risk Level | Max Loan |
|----------|-------------|------------|----------|
| **80-85** | 5.0⭐ | Very Low Risk | **$3,000** |
| **70-79** | 4.0⭐ | Low Risk | **$2,000** |
| **60-69** | 3.0⭐ | Medium Risk | **$1,500** |
| **50-59** | 2.5⭐ | High Risk | **$1,000** |
| **40-49** | 2.0⭐ | Very High Risk | **$500** |
| **30-39** | 1.0⭐ | Building Credit | **$100** |

### ❌ NO COLD START in Direct Lending

**Key Difference from P2P:** Direct Lending has **NO COLD START** restrictions. Users get their full DTNI-based limit immediately after completing KYC.

| Employment Type | Cold Start | DTNI Ratio | Max Tenure |
|-----------------|------------|------------|------------|
| **Government** | ❌ None | 40% | 24 months |
| **Private** | ❌ None | 33% | 12 months |
| **Business** | ❌ None | 33% | 12 months |
| **Informal** | ❌ None | 33% | 12 months |

**Formula:** `Max Loan = min(DTNI-based limit, ZimScore limit, $3,000 ceiling)`

---

## 📊 Fee Structure

### Option A: One-Time Fixed Fee (Current Implementation)

Based on ZimScore tier - charged once at disbursement:

| ZimScore | Fee % | Example ($100 loan) | APR (30 days) |
|----------|-------|---------------------|---------------|
| 80-85 | 5% | $5 fee | 61% |
| 70-79 | 6% | $6 fee | 73% |
| 60-69 | 7% | $7 fee | 85% |
| 50-59 | 8% | $8 fee | 97% |
| 40-49 | 9% | $9 fee | 110% |
| 30-39 | 10% | $10 fee | 122% |

**APR Formula:** `APR = (Fee / Principal) × (365 / Days) × 100`

### Option B: Monthly Interest (From Fee Document)

5% monthly interest rate (60% APR):

| Loan Amount | Monthly Interest | Term | Total Interest |
|-------------|------------------|------|----------------|
| $100 | $5 | 3 months | $15 |
| $500 | $25 | 6 months | $150 |
| $1,000 | $50 | 12 months | $600 |

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

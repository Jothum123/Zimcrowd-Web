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

## User Registration Flow

```
1. User registers with Phone/Email
    ↓
2. OTP sent to confirm Phone/Email
    ↓
3. User completes Onboarding
    ↓
4. Dashboard - System fetches user details (from input or social account)
    ↓
5. User completes KYC & uploads all documents
    ↓
6. Documents verified by AI
    ↓
7. ZimScore calculated based on employment type
    ↓
8. User can request loans based on their limits
```

## Employment Types & Loan Limits

| Employment Type | Cold Start | Loan Range | Max Tenure | DTNI Max |
|-----------------|------------|------------|------------|----------|
| **Government** | ❌ NO | **$25 - $3,000** | **24 months** | 40% |
| **Private** | ✅ $300 | **$25 - $1,000** | **12 months** | 33% |
| **Informal** | ✅ $100 | **$25 - $500** | **6 months** | 25% |
| **Business** | ✅ $200 | **$25 - $1,000** | **12 months** | 30% |

## Cold Start Rules

### Direct Lending (ZimCrowd Direct)
- **NO COLD START** for any employment type
- Loan approval based on **DTNI calculation** + **verified documents**
- Users can access full limit based on their income and DTNI ratio

### P2P Marketplace (Cold Start Applies)
**Cold start applies ONLY to P2P Marketplace for first-time private/informal borrowers:**

| Employment Type | First Loan (Cold Start) | After First Repayment |
|-----------------|-------------------------|----------------------|
| **Government** | Full limit ($25-$3,000) | Full limit |
| **Private** | Max **$300** | Up to $1,000 |
| **Informal** | Max **$100** | Up to $500 |
| **Business** | Max **$200** | Up to $1,000 |

- Government employees are **exempt** from cold start (both Direct & P2P)
- Private and Informal employees must complete their first P2P loan successfully to unlock higher marketplace limits

## Interest Rates

### Direct Lending (ZimCrowd Direct)
- **FIXED 8% per month** (96% per annum)
- No negotiation - instant funding from ZimCrowd Capital
- Same rate for all employment types

### P2P Marketplace
- **User selectable: 0% - 10% per month**
- Borrower chooses their preferred interest rate when requesting
- Lower rates may attract more lenders but take longer to fund
- Higher rates fund faster but cost more

### Government Employees
- **NO cold start** - Can access full DTNI-based limit immediately
- **Loan range: $25 - $3,000** (based on DTNI)
- **Maximum tenure: 24 months**
- Higher ZimScore bonus (+10 points)
- Same documents as private employees

### Private Employees (Verified)
- **Cold start: $300** - For verified private employees only
- **Loan range: $25 - $1,000** (after verification)
- **Maximum tenure: 12 months**
- After first successful repayment: Unlocks full limit
- ZimScore bonus: +6 points

### Informal Employees
- **Cold start: $100** - Lower initial limit
- **Loan range: $25 - $500** (after verification)
- **Maximum tenure: 6 months**
- Different document requirements (see below)
- ZimScore bonus: 0 points

## Required Documents by Employment Type

### Government & Private Employees

| Document | Required | Purpose |
|----------|----------|---------|
| **National ID (Front & Back)** | ✅ Yes | Identity verification |
| **Selfie Photo** | ✅ Yes | Face match verification |
| **Payslip** | ✅ Yes | Income verification |
| **Bank Statement** | ✅ Yes | Financial history & DTNI calculation |
| **Proof of Residence** | ✅ Yes | Address verification |
| **Employment Contract** | ✅ Yes | Employment confirmation |

### Informal Employees (Different Requirements)

| Document | Required | Purpose |
|----------|----------|---------|
| **National ID (Front & Back)** | ✅ Yes | Identity verification |
| **Selfie Photo** | ✅ Yes | Face match verification |
| **Proof of Residence** | ✅ Yes | Address verification |
| **Bank Statement** | ✅ Yes | Proof of address + income |
| **Mobile Money Statement** | ✅ Yes | Proof of income |
| **Payslip** | ❌ No | Not required |
| **Employment Contract** | ❌ No | Not required |

### Accepted Mobile Money Statements

| Provider | Network | USSD Code |
|----------|---------|-----------|
| **EcoCash** | Econet | *151# |
| **OneMoney** | NetOne | *111# |
| **Omari** | Telecel | *133# |
| **InnBucks** | InnBucks | App |

**Requirements:**
- Statement must be from the **last 3 months**
- Must show transaction history
- Must show account holder name

**Note:** Informal employees do NOT need to fill employment fields (employer name, EC number, work address, etc.)

### Proof of Residence Options

Users can upload ANY of the following as proof of residence:

| Document Type | Requirements |
|---------------|--------------|
| **Utility Bill** | ZESA, water, internet - not older than 3 months |
| **Lease Agreement** | Signed rental/lease contract |
| **Bank Statement** | Must show full name AND residential address |
| **Council Rates** | City council rates statement |

### ⚠️ MANDATORY VERIFICATION

**ALL proof of residence documents MUST show:**

1. **User's Full Name** - Must match the name in user profile
2. **Residential Address** - Must match the address user entered during registration

### Document AI Verification Process

```
Document Uploaded
    ↓
AI extracts: Name + Address from document
    ↓
System compares:
    ├── Document Name vs Profile Name → MATCH/MISMATCH
    └── Document Address vs Profile Address → MATCH/MISMATCH
    ↓
Result:
    ✅ BOTH match → APPROVED
    ❌ Name mismatch → REJECTED (reason: "Name does not match")
    ❌ Address mismatch → REJECTED (reason: "Address does not match")
    ❌ Both mismatch → REJECTED (reason: "Name and address do not match")
```

### Rejection Reasons

| Issue | Message |
|-------|---------|
| Name not found | "Could not extract name from document. Please ensure your full name is clearly visible." |
| Name mismatch | "Name on document does not match your registered name" |
| Address not found | "Could not extract address from document. Please ensure your address is clearly visible." |
| Address mismatch | "Address on document does not match your registered address" |
| Document too old | "Document appears to be older than 3 months. Please upload a recent document." |

### Document Status Badges

Documents are fetched from the **Document Center** with status badges:

| Status | Badge | Meaning | Action |
|--------|-------|---------|--------|
| **VERIFIED** | ✅ | Document approved | None - Ready |
| **PENDING** | 🟡 | Under review | Wait 24-48 hours |
| **REJECTED** | 🔴 | Document rejected | Re-upload from Document Center |
| **MISSING** | 🔴 | Not uploaded | Upload from Document Center or KYC |

### Document Check Flow

```
1. User applies for Direct Lending
   ↓
2. System fetches documents from Document Center (user_documents table)
   ↓
3. Checks status of each required document:
   - National ID: ✅ VERIFIED
   - Selfie: ✅ VERIFIED
   - Payslip: 🟡 PENDING
   - Bank Statement: 🔴 MISSING
   - Proof of Residence: 🔴 REJECTED
   ↓
4. Returns actionable guidance:
   - "Missing 1 document: Bank Statement"
   - "1 document rejected: Proof of Residence - Please re-upload"
   - "1 document pending: Payslip - Please wait"
   ↓
5. User directed to Document Center or KYC page
```

### API Response Example

```json
{
  "success": true,
  "eligible": false,
  "summary": {
    "totalRequired": 5,
    "totalVerified": 2,
    "totalPending": 1,
    "totalMissing": 1,
    "totalRejected": 1,
    "completionPercent": 40
  },
  "documents": [
    {
      "type": "national_id",
      "name": "National ID",
      "status": "VERIFIED",
      "statusBadge": "✅ VERIFIED"
    },
    {
      "type": "bank_statement",
      "name": "Bank Statement",
      "status": "MISSING",
      "statusBadge": "🔴 MISSING",
      "action": "Upload your Bank Statement",
      "actionUrl": "/document-center?upload=bank_statement"
    }
  ],
  "message": "🔴 Missing 1 document(s): Bank Statement",
  "primaryAction": {
    "type": "UPLOAD",
    "label": "Upload Missing Documents",
    "url": "/document-center"
  }
}
```

### Key Points

- ❌ **NOT tied to ZimScore** - No credit score required
- ✅ **Document-based** - Just upload required documents
- ✅ **DTNI-based limit** - Max loan based on income
- ✅ **No cold start** - Full limit immediately
- ✅ **All documents must be VERIFIED** - Not just uploaded

---

## � Eligibility Rules

### BLOCKING RULES

Users will be **BLOCKED** from Direct Lending if:

| Rule | Condition | Action Required |
|------|-----------|-----------------|
| **NO_ARREARS** | Has loan in arrears from P2P marketplace | Clear arrears first |
| **NO_DIRECT_ARREARS** | Has Direct Loan in arrears | Clear arrears first |
| **NOT_SUSPENDED** | Account is suspended | Request to lift ban |
| **NOT_BANNED** | Account is banned | Contact support |

### Rule Details

#### 1. No Loans in Arrears
```
❌ BLOCKED if user has ANY loan with status:
   - 'late'
   - 'defaulted'
   - 'in_arrears'
   - 'overdue'

✅ Must clear ALL arrears before applying
```

#### 2. Account Not Suspended
```
❌ BLOCKED if account status = 'suspended'

✅ User must:
   1. Submit unban request with reason
   2. Wait for admin review (24-48 hours)
   3. Get suspension lifted
```

#### 3. Account Not Banned
```
❌ BLOCKED if account status = 'banned'

✅ User must:
   1. Contact support
   2. Resolve the issue that caused the ban
   3. Get ban lifted by admin
```

### API Endpoints for Rules

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/direct-loans/eligibility` | GET | Check if user is eligible |
| `/api/direct-loans/documents` | GET | Check document status |
| `/api/direct-loans/request-unban` | POST | Request to lift suspension |

---

## �💰 Loan Amounts (Based on DTNI)

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

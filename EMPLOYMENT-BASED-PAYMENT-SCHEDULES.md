# Employment-Based Payment Schedules

## 🎯 Overview

**ZimCrowd uses TWO different payment schedule systems based on employment type:**

1. **Government Employees**: Payment window system (aligns with salary cycle)
2. **Private/Business/Informal**: Simple 35-day grace from loan date

---

## 📊 System Comparison

| Feature | Government Employees | Private/Business/Informal |
|---------|---------------------|---------------------------|
| **First Payment Logic** | Payment window (SAME/NEXT month) | 35 days from loan date |
| **Payment Dates** | Last day of month | 35 days, then monthly |
| **Grace Period** | 35 days after due date | Built into 35-day period |
| **Alignment** | Government salary cycle | Flexible |

---

## 🏛️ GOVERNMENT EMPLOYEES

### **Payment Window System:**

| Application Date | Payment Group | First Payment Due |
|------------------|---------------|-------------------|
| **Days 1-14** | SAME_MONTH | End of **same** month |
| **Days 15-31** | NEXT_MONTH | End of **next** month |

**All payments on LAST DAY of month** (when salaries are paid)

---

### **Government Employee Examples:**

#### **Example 1: Apply November 10 (Day 10 ≤ 14)**

```
Employment Type: GOVERNMENT
Application: November 10, 2025
Payment Group: SAME_MONTH

Payment Schedule:
├─ Payment 1: November 30, 2025 (20 days later)
│  └─ Grace until: January 4, 2026 (35 days after due)
├─ Payment 2: December 31, 2025
├─ Payment 3: January 31, 2026
└─ Payment 4: February 28, 2026
   ... (last day of each month)
```

**Total grace for first payment: 20 days + 35 days = 55 days from loan**

---

#### **Example 2: Apply November 20 (Day 20 > 14)**

```
Employment Type: GOVERNMENT
Application: November 20, 2025
Payment Group: NEXT_MONTH

Payment Schedule:
├─ Payment 1: December 31, 2025 (41 days later)
│  └─ Grace until: February 4, 2026 (35 days after due)
├─ Payment 2: January 31, 2026
├─ Payment 3: February 28, 2026
└─ Payment 4: March 31, 2026
   ... (last day of each month)
```

**Total grace for first payment: 41 days + 35 days = 76 days from loan**

---

## 💼 PRIVATE/BUSINESS/INFORMAL EMPLOYEES

### **Simple 35-Day System:**

```
Loan Date → 35 Days → First Payment Due
```

**No payment windows, no salary cycle alignment - just 35 days from loan date**

---

### **Private Employee Examples:**

#### **Example 1: Apply November 10**

```
Employment Type: PRIVATE
Application: November 10, 2025

Payment Schedule:
├─ Payment 1: December 15, 2025 (35 days later)
│  └─ Late after: December 15, 2025 (no additional grace)
├─ Payment 2: January 15, 2026 (monthly)
├─ Payment 3: February 15, 2026 (monthly)
└─ Payment 4: March 15, 2026 (monthly)
   ... (same day each month)
```

**Total grace for first payment: 35 days from loan**

---

#### **Example 2: Apply November 20**

```
Employment Type: PRIVATE
Application: November 20, 2025

Payment Schedule:
├─ Payment 1: December 25, 2025 (35 days later)
│  └─ Late after: December 25, 2025 (no additional grace)
├─ Payment 2: January 25, 2026 (monthly)
├─ Payment 3: February 25, 2026 (monthly)
└─ Payment 4: March 25, 2026 (monthly)
   ... (same day each month)
```

**Total grace for first payment: 35 days from loan**

---

#### **Example 3: Apply December 5**

```
Employment Type: PRIVATE
Application: December 5, 2025

Payment Schedule:
├─ Payment 1: January 9, 2026 (35 days later)
│  └─ Late after: January 9, 2026 (no additional grace)
├─ Payment 2: February 9, 2026 (monthly)
├─ Payment 3: March 9, 2026 (monthly)
└─ Payment 4: April 9, 2026 (monthly)
   ... (same day each month)
```

**Total grace for first payment: 35 days from loan**

---

## 💻 Implementation

### **Calculate First Payment (Government):**

```javascript
const PaymentScheduleService = require('./services/payment-schedule.service');
const service = new PaymentScheduleService();

// Government employee - Applied November 10
const govPayment = service.calculateFirstPaymentDate(
    new Date('2025-11-10'),
    'government'
);

console.log(govPayment);
```

**Output:**
```javascript
{
    employmentType: 'government',
    applicationDate: '2025-11-10',
    applicationDay: 10,
    paymentGroup: 'SAME_MONTH',
    firstPaymentDue: '2025-11-30',      // End of same month
    gracePeriodEnd: '2026-01-04',       // 35 days after due
    daysUntilDue: 20,
    gracePeriodDays: 35
}
```

---

### **Calculate First Payment (Private):**

```javascript
// Private employee - Applied November 10
const privatePayment = service.calculateFirstPaymentDate(
    new Date('2025-11-10'),
    'private'
);

console.log(privatePayment);
```

**Output:**
```javascript
{
    employmentType: 'private',
    applicationDate: '2025-11-10',
    paymentGroup: null,
    firstPaymentDue: '2025-12-15',      // 35 days from loan
    gracePeriodEnd: '2025-12-15',       // Same as due date
    daysUntilDue: 35,
    gracePeriodDays: 35
}
```

---

### **Create Full Schedule:**

```javascript
// Government employee schedule
const govSchedule = await service.createPaymentSchedule({
    loanId: 'loan-uuid',
    applicationDate: new Date('2025-11-10'),
    employmentType: 'government',
    loanAmount: 1000,
    termMonths: 12,
    monthlyPayment: 150
});

// Private employee schedule
const privateSchedule = await service.createPaymentSchedule({
    loanId: 'loan-uuid',
    applicationDate: new Date('2025-11-10'),
    employmentType: 'private',
    loanAmount: 1000,
    termMonths: 12,
    monthlyPayment: 150
});
```

---

## 📅 Side-by-Side Comparison

### **Same Application Date (November 10, 2025):**

| Feature | Government | Private |
|---------|-----------|---------|
| **Application** | Nov 10, 2025 | Nov 10, 2025 |
| **Payment Group** | SAME_MONTH | None |
| **First Payment** | Nov 30, 2025 | Dec 15, 2025 |
| **Days Until Due** | 20 days | 35 days |
| **Grace Ends** | Jan 4, 2026 | Dec 15, 2025 |
| **Total Grace** | 55 days | 35 days |
| **Payment 2** | Dec 31, 2025 | Jan 15, 2026 |
| **Payment 3** | Jan 31, 2026 | Feb 15, 2026 |

---

### **Same Application Date (November 20, 2025):**

| Feature | Government | Private |
|---------|-----------|---------|
| **Application** | Nov 20, 2025 | Nov 20, 2025 |
| **Payment Group** | NEXT_MONTH | None |
| **First Payment** | Dec 31, 2025 | Dec 25, 2025 |
| **Days Until Due** | 41 days | 35 days |
| **Grace Ends** | Feb 4, 2026 | Dec 25, 2025 |
| **Total Grace** | 76 days | 35 days |
| **Payment 2** | Jan 31, 2026 | Jan 25, 2026 |
| **Payment 3** | Feb 28, 2026 | Feb 25, 2026 |

---

## 🎯 Why Two Systems?

### **Government Employees:**
- ✅ Salaries paid on last day of month
- ✅ Predictable income schedule
- ✅ Payment aligns with salary receipt
- ✅ Lower default risk

### **Private/Business/Informal:**
- ✅ Flexible salary schedules
- ✅ Varied payment dates
- ✅ Simple 35-day grace
- ✅ No salary cycle dependency

---

## 📊 Grace Period Breakdown

### **Government Employees:**

```
SAME_MONTH (Days 1-14):
- Shortest: 16 days until due + 35 days grace = 51 days total
- Longest: 29 days until due + 35 days grace = 64 days total

NEXT_MONTH (Days 15-31):
- Shortest: 31 days until due + 35 days grace = 66 days total
- Longest: 47 days until due + 35 days grace = 82 days total
```

### **Private Employees:**

```
ALL APPLICATIONS:
- Fixed: 35 days from loan date
- No additional grace period
- Total: 35 days
```

---

## 🔔 Notification Examples

### **Government Employee (Applied Nov 10):**

```
Nov 10: Loan funded
Nov 23: "First payment due in 7 days (Nov 30)"
Nov 27: "First payment due in 3 days (Nov 30)"
Nov 30: "First payment due today. Grace until Jan 4."
Dec 28: "Grace period ends in 7 days (Jan 4)"
Jan 1:  "Grace period ends in 3 days (Jan 4)"
Jan 5:  "Payment is late. Late fee applied."
```

### **Private Employee (Applied Nov 10):**

```
Nov 10: Loan funded
Dec 8:  "First payment due in 7 days (Dec 15)"
Dec 12: "First payment due in 3 days (Dec 15)"
Dec 15: "First payment due today"
Dec 16: "Payment is late. Late fee applied."
```

---

## ✅ Implementation Checklist

### **Database:**
- [x] `payment_group` field in `loan_installments` table
- [x] Support for both government and private schedules
- [x] Employment type tracking

### **Service:**
- [x] `calculateGovernmentFirstPayment()` method
- [x] `calculatePrivateFirstPayment()` method
- [x] `calculateFirstPaymentDate()` with employment type
- [x] `createPaymentSchedule()` with employment type

### **Usage:**
- [ ] Pass `employmentType` from user profile
- [ ] Display appropriate schedule to user
- [ ] Send employment-specific notifications

---

## 🎯 Summary

**Government Employees:**
- ✅ Payment window system (SAME_MONTH/NEXT_MONTH)
- ✅ Payments on last day of month
- ✅ 35-day grace after due date
- ✅ Total grace: 51-82 days from loan

**Private/Business/Informal:**
- ✅ Simple 35-day system
- ✅ First payment 35 days from loan
- ✅ Monthly payments on same day
- ✅ Total grace: 35 days from loan

**Both systems:**
- ✅ Subsequent payments: 24-hour grace
- ✅ Late fees: 10% or $50 minimum
- ✅ Platform/lender 50/50 split

---

**Document Version: 1.0**
**Last Updated: November 14, 2025**
**Implementation: Dual payment schedule system**

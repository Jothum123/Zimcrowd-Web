# Payment Window System - Government Employee Salary Cycle

## 🎯 Overview

**Payment windows align with Zimbabwe government employee salary cycles.**

Borrowers are grouped based on their application date to ensure first payments align with when they receive their salaries.

---

## 📅 Payment Window Rules

### **The 14-Day Cutoff:**

| Application Date | Payment Group | First Payment Due | Example |
|------------------|---------------|-------------------|---------|
| **Days 1-14** | SAME_MONTH | End of **same** month | Apply Nov 10 → Pay Nov 30 |
| **Days 15-31** | NEXT_MONTH | End of **next** month | Apply Nov 20 → Pay Dec 31 |

**All payments due on the LAST DAY of the month** (aligns with government salary payments)

---

## 📊 Real Examples

### **Example 1: Applied November 10, 2025 (Day 10)**

```
Application Date: November 10, 2025
Application Day: 10 (≤ 14)
Payment Group: SAME_MONTH

First Payment Due: November 30, 2025 (end of same month)
Grace Period: 35 days
Grace Ends: January 4, 2026
Days Until Due: 20 days

Subsequent Payments:
- Payment 2: December 31, 2025
- Payment 3: January 31, 2026
- Payment 4: February 28, 2026
- ... (last day of each month)
```

**Timeline:**
```
Nov 10: Loan funded
Nov 30: Payment 1 DUE (20 days later)
Jan 4:  Grace period ends (35 days after due)
Dec 31: Payment 2 DUE
Jan 31: Payment 3 DUE
```

---

### **Example 2: Applied November 20, 2025 (Day 20)**

```
Application Date: November 20, 2025
Application Day: 20 (> 14)
Payment Group: NEXT_MONTH

First Payment Due: December 31, 2025 (end of next month)
Grace Period: 35 days
Grace Ends: February 4, 2026
Days Until Due: 41 days

Subsequent Payments:
- Payment 2: January 31, 2026
- Payment 3: February 28, 2026
- Payment 4: March 31, 2026
- ... (last day of each month)
```

**Timeline:**
```
Nov 20: Loan funded
Dec 31: Payment 1 DUE (41 days later)
Feb 4:  Grace period ends (35 days after due)
Jan 31: Payment 2 DUE
Feb 28: Payment 3 DUE
```

---

### **Example 3: Applied December 5, 2025 (Day 5)**

```
Application Date: December 5, 2025
Application Day: 5 (≤ 14)
Payment Group: SAME_MONTH

First Payment Due: December 31, 2025 (end of same month)
Grace Period: 35 days
Grace Ends: February 4, 2026
Days Until Due: 26 days

Subsequent Payments:
- Payment 2: January 31, 2026
- Payment 3: February 28, 2026
- Payment 4: March 31, 2026
```

**Timeline:**
```
Dec 5:  Loan funded
Dec 31: Payment 1 DUE (26 days later)
Feb 4:  Grace period ends
Jan 31: Payment 2 DUE
Feb 28: Payment 3 DUE
```

---

### **Example 4: Applied December 18, 2025 (Day 18)**

```
Application Date: December 18, 2025
Application Day: 18 (> 14)
Payment Group: NEXT_MONTH

First Payment Due: January 31, 2026 (end of next month)
Grace Period: 35 days
Grace Ends: March 7, 2026
Days Until Due: 44 days

Subsequent Payments:
- Payment 2: February 28, 2026
- Payment 3: March 31, 2026
- Payment 4: April 30, 2026
```

**Timeline:**
```
Dec 18: Loan funded
Jan 31: Payment 1 DUE (44 days later)
Mar 7:  Grace period ends
Feb 28: Payment 2 DUE
Mar 31: Payment 3 DUE
```

---

## 💻 Implementation

### **Calculate First Payment Date:**

```javascript
const PaymentScheduleService = require('./services/payment-schedule.service');
const service = new PaymentScheduleService();

// Example 1: Applied November 10
const firstPayment1 = service.calculateFirstPaymentDate(new Date('2025-11-10'));
console.log(firstPayment1);

// Output:
{
    applicationDate: '2025-11-10',
    applicationDay: 10,
    paymentGroup: 'SAME_MONTH',
    firstPaymentDue: '2025-11-30',
    gracePeriodEnd: '2026-01-04',
    daysUntilDue: 20,
    gracePeriodDays: 35
}

// Example 2: Applied November 20
const firstPayment2 = service.calculateFirstPaymentDate(new Date('2025-11-20'));
console.log(firstPayment2);

// Output:
{
    applicationDate: '2025-11-20',
    applicationDay: 20,
    paymentGroup: 'NEXT_MONTH',
    firstPaymentDue: '2025-12-31',
    gracePeriodEnd: '2026-02-04',
    daysUntilDue: 41,
    gracePeriodDays: 35
}
```

---

### **Create Full Payment Schedule:**

```javascript
// Create schedule for loan applied on November 10
const schedule = await service.createPaymentSchedule({
    loanId: 'loan-uuid',
    applicationDate: new Date('2025-11-10'),
    loanAmount: 1000,
    termMonths: 12,
    monthlyPayment: 150
});

console.log(schedule.installments);
```

**Output:**
```javascript
[
    {
        installment_number: 1,
        due_date: '2025-11-30',
        amount_due: 150,
        payment_group: 'SAME_MONTH',
        is_first_payment: true,
        grace_period_days: 35,
        grace_period_end: '2026-01-04T00:00:00Z'
    },
    {
        installment_number: 2,
        due_date: '2025-12-31',
        amount_due: 150,
        payment_group: null,
        is_first_payment: false,
        grace_period_hours: 24,
        grace_period_end: '2026-01-01T00:00:00Z'
    },
    {
        installment_number: 3,
        due_date: '2026-01-31',
        amount_due: 150,
        payment_group: null,
        is_first_payment: false,
        grace_period_hours: 24,
        grace_period_end: '2026-02-01T00:00:00Z'
    }
    // ... 9 more payments
]
```

---

## 📅 Month-by-Month Examples

### **November Applications:**

| Apply Date | Day | Group | First Payment | Days Until | Grace Ends |
|------------|-----|-------|---------------|------------|------------|
| Nov 1 | 1 | SAME_MONTH | Nov 30 | 29 | Jan 4 |
| Nov 5 | 5 | SAME_MONTH | Nov 30 | 25 | Jan 4 |
| Nov 10 | 10 | SAME_MONTH | Nov 30 | 20 | Jan 4 |
| Nov 14 | 14 | SAME_MONTH | Nov 30 | 16 | Jan 4 |
| **Nov 15** | **15** | **NEXT_MONTH** | **Dec 31** | **46** | **Feb 4** |
| Nov 20 | 20 | NEXT_MONTH | Dec 31 | 41 | Feb 4 |
| Nov 25 | 25 | NEXT_MONTH | Dec 31 | 36 | Feb 4 |
| Nov 30 | 30 | NEXT_MONTH | Dec 31 | 31 | Feb 4 |

---

### **December Applications:**

| Apply Date | Day | Group | First Payment | Days Until | Grace Ends |
|------------|-----|-------|---------------|------------|------------|
| Dec 1 | 1 | SAME_MONTH | Dec 31 | 30 | Feb 4 |
| Dec 5 | 5 | SAME_MONTH | Dec 31 | 26 | Feb 4 |
| Dec 10 | 10 | SAME_MONTH | Dec 31 | 21 | Feb 4 |
| Dec 14 | 14 | SAME_MONTH | Dec 31 | 17 | Feb 4 |
| **Dec 15** | **15** | **NEXT_MONTH** | **Jan 31** | **47** | **Mar 7** |
| Dec 20 | 20 | NEXT_MONTH | Jan 31 | 42 | Mar 7 |
| Dec 25 | 25 | NEXT_MONTH | Jan 31 | 37 | Mar 7 |
| Dec 31 | 31 | NEXT_MONTH | Jan 31 | 31 | Mar 7 |

---

## 🎯 Why This System Works

### **1. Aligns with Government Salaries**
- ✅ Government employees paid on last day of month
- ✅ First payment due when they have money
- ✅ Reduces defaults significantly

### **2. Predictable Payment Dates**
- ✅ Always last day of month
- ✅ Easy to remember
- ✅ Consistent across all loans

### **3. Fair Grace Periods**
- ✅ SAME_MONTH: 16-29 days until due + 35 days grace
- ✅ NEXT_MONTH: 31-47 days until due + 35 days grace
- ✅ Everyone gets adequate time

### **4. Reduces Late Payments**
- ✅ Borrowers have salary before payment due
- ✅ Natural cash flow alignment
- ✅ Lower default risk

---

## 📊 Grace Period Analysis

### **SAME_MONTH Group (Days 1-14):**

```
Shortest grace: Apply Day 14
- Days until due: 16-17 days
- Grace period: 35 days
- Total time: 51-52 days

Longest grace: Apply Day 1
- Days until due: 29-30 days
- Grace period: 35 days
- Total time: 64-65 days
```

### **NEXT_MONTH Group (Days 15-31):**

```
Shortest grace: Apply Day 31
- Days until due: 31 days
- Grace period: 35 days
- Total time: 66 days

Longest grace: Apply Day 15
- Days until due: 46-47 days
- Grace period: 35 days
- Total time: 81-82 days
```

---

## 🔔 Notification Examples

### **SAME_MONTH Group (Applied Nov 10):**

```
Nov 10: Loan funded
Nov 23: "First payment due in 7 days (Nov 30)"
Nov 27: "First payment due in 3 days (Nov 30)"
Nov 30: "First payment due today. Grace until Jan 4."
Dec 28: "Grace period ends in 7 days (Jan 4)"
Jan 1:  "Grace period ends in 3 days (Jan 4)"
Jan 5:  "Payment is late. Late fee applied."
```

### **NEXT_MONTH Group (Applied Nov 20):**

```
Nov 20: Loan funded
Dec 24: "First payment due in 7 days (Dec 31)"
Dec 28: "First payment due in 3 days (Dec 31)"
Dec 31: "First payment due today. Grace until Feb 4."
Jan 28: "Grace period ends in 7 days (Feb 4)"
Feb 1:  "Grace period ends in 3 days (Feb 4)"
Feb 5:  "Payment is late. Late fee applied."
```

---

## 💡 Key Benefits

### **For Government Employees:**
- ✅ Payments align with salary dates
- ✅ Always have money when payment is due
- ✅ Predictable monthly schedule
- ✅ Reduced financial stress

### **For Platform:**
- ✅ Lower default rates
- ✅ Better cash flow predictability
- ✅ Easier collections management
- ✅ Higher customer satisfaction

### **For Lenders:**
- ✅ More reliable repayments
- ✅ Lower risk of late payments
- ✅ Predictable return schedule
- ✅ Better portfolio performance

---

## 📋 Database Schema

```sql
CREATE TABLE loan_installments (
    id UUID PRIMARY KEY,
    loan_id UUID NOT NULL,
    installment_number INT NOT NULL,
    
    -- Payment Details
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    
    -- Payment Window
    payment_group TEXT CHECK (payment_group IN ('SAME_MONTH', 'NEXT_MONTH')),
    
    -- Grace Period
    is_first_payment BOOLEAN DEFAULT FALSE,
    grace_period_days INT DEFAULT 0,
    grace_period_hours INT DEFAULT 24,
    grace_period_end TIMESTAMP NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'pending'
);
```

---

## ✅ Summary

**Payment Window System:**
- ✅ Days 1-14: First payment end of SAME month
- ✅ Days 15-31: First payment end of NEXT month
- ✅ All payments on last day of month
- ✅ 35-day grace for first payment
- ✅ 24-hour grace for subsequent payments

**Result:** Aligns with government salary cycles, reduces defaults, improves user experience! 🎯

---

**Document Version: 1.0**
**Last Updated: November 14, 2025**
**Implementation: Government employee salary cycle alignment**

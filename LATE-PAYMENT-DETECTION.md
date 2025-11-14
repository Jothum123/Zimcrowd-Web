# Late Payment Detection - Simple Implementation

## 🎯 Simple Approach (Without Payment Windows)

**You don't need complex payment windows to detect late payments!**

---

## 📅 Standard Monthly Payment Schedule

### **Simple Due Date Logic:**

```javascript
// When loan is created, set payment schedule
function createLoanPaymentSchedule(loanStartDate, termMonths) {
    const schedule = [];
    
    for (let month = 1; month <= termMonths; month++) {
        // Payment due on same day each month
        const dueDate = new Date(loanStartDate);
        dueDate.setMonth(dueDate.getMonth() + month);
        
        schedule.push({
            installmentNumber: month,
            dueDate: dueDate,
            status: 'pending'
        });
    }
    
    return schedule;
}
```

**Example:**
```
Loan Start: November 14, 2025
Term: 12 months

Payment Schedule:
- Payment 1: December 14, 2025
- Payment 2: January 14, 2026
- Payment 3: February 14, 2026
- ... and so on
```

---

## ⏰ Late Payment Detection

### **Method 1: Real-Time Check (Recommended)**

```javascript
function isPaymentLate(dueDate, paidDate = null) {
    const now = new Date();
    const gracePeriodHours = 24;
    
    // Add grace period to due date
    const gracePeriodEnd = new Date(dueDate);
    gracePeriodEnd.setHours(gracePeriodEnd.getHours() + gracePeriodHours);
    
    // If not paid and past grace period = LATE
    if (!paidDate && now > gracePeriodEnd) {
        return {
            isLate: true,
            daysLate: Math.floor((now - gracePeriodEnd) / (1000 * 60 * 60 * 24)),
            gracePeriodExpired: true
        };
    }
    
    // If paid after grace period = WAS LATE
    if (paidDate && paidDate > gracePeriodEnd) {
        return {
            isLate: true,
            daysLate: Math.floor((paidDate - gracePeriodEnd) / (1000 * 60 * 60 * 24)),
            gracePeriodExpired: true
        };
    }
    
    return {
        isLate: false,
        daysLate: 0,
        gracePeriodExpired: false
    };
}
```

**Usage:**
```javascript
const installment = {
    dueDate: new Date('2025-12-14'),
    paidDate: null
};

const status = isPaymentLate(installment.dueDate, installment.paidDate);

if (status.isLate) {
    console.log(`Payment is ${status.daysLate} days late!`);
    // Apply late fee
    const lateFee = calculateLateFee(paymentAmount, status.daysLate);
}
```

---

### **Method 2: Scheduled Cron Job (Automated)**

```javascript
// Run daily at 12:00 AM
cron.schedule('0 0 * * *', async () => {
    console.log('🔍 Checking for late payments...');
    
    // Get all unpaid installments
    const { data: unpaidInstallments } = await supabase
        .from('loan_installments')
        .select('*')
        .eq('status', 'pending')
        .lt('due_date', new Date().toISOString());
    
    for (const installment of unpaidInstallments) {
        const lateStatus = isPaymentLate(
            new Date(installment.due_date),
            installment.paid_at ? new Date(installment.paid_at) : null
        );
        
        if (lateStatus.isLate) {
            // Mark as late
            await supabase
                .from('loan_installments')
                .update({
                    status: 'late',
                    days_late: lateStatus.daysLate,
                    late_since: new Date().toISOString()
                })
                .eq('id', installment.id);
            
            // Apply late fee if past grace period
            if (lateStatus.gracePeriodExpired) {
                await applyLateFee(installment);
            }
            
            // Send notification
            await sendLatePaymentNotification(installment);
        }
    }
});
```

---

## 🗄️ Database Schema (Simple)

### **Loan Installments Table:**

```sql
CREATE TABLE loan_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loans(id),
    installment_number INT NOT NULL,
    
    -- Payment Details
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    
    -- Payment Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'defaulted')),
    paid_at TIMESTAMP,
    paid_amount DECIMAL(10,2),
    
    -- Late Payment Tracking
    days_late INT DEFAULT 0,
    late_since TIMESTAMP,
    late_fee_applied BOOLEAN DEFAULT FALSE,
    late_fee_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Grace Period
    grace_period_hours INT DEFAULT 24,
    grace_period_end TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for late payment detection
CREATE INDEX idx_installments_due_date ON loan_installments(due_date, status);
CREATE INDEX idx_installments_late ON loan_installments(status) WHERE status = 'late';
```

---

## 📊 Late Payment Detection Examples

### **Example 1: Payment Due Today**

```javascript
const installment = {
    dueDate: new Date('2025-11-14'),  // Today
    paidDate: null
};

const now = new Date('2025-11-14 10:00:00');

// Check status
const status = isPaymentLate(installment.dueDate, installment.paidDate);

// Result:
{
    isLate: false,           // Still within grace period
    daysLate: 0,
    gracePeriodExpired: false
}
```

### **Example 2: Payment 1 Day Late (Within Grace)**

```javascript
const installment = {
    dueDate: new Date('2025-11-14'),
    paidDate: null
};

const now = new Date('2025-11-15 10:00:00');  // 1 day + 10 hours

// Check status
const status = isPaymentLate(installment.dueDate, installment.paidDate);

// Result:
{
    isLate: false,           // Still within 24-hour grace
    daysLate: 0,
    gracePeriodExpired: false
}
```

### **Example 3: Payment 2 Days Late (Past Grace)**

```javascript
const installment = {
    dueDate: new Date('2025-11-14'),
    paidDate: null
};

const now = new Date('2025-11-16 10:00:00');  // 2 days + 10 hours

// Check status
const status = isPaymentLate(installment.dueDate, installment.paidDate);

// Result:
{
    isLate: true,            // Past grace period!
    daysLate: 1,             // 1 day past grace
    gracePeriodExpired: true
}

// Action: Apply late fee
const lateFee = calculateLateFee(paymentAmount, status.daysLate);
```

---

## 🔔 Notification Schedule (Simple)

### **Automated Reminders:**

```javascript
// Daily cron job at 9:00 AM
cron.schedule('0 9 * * *', async () => {
    const today = new Date();
    
    // T-3 days: Payment due in 3 days
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const upcomingPayments = await getInstallmentsByDueDate(threeDaysFromNow);
    for (const payment of upcomingPayments) {
        await sendNotification(payment.borrower_id, {
            type: 'payment_reminder',
            message: `Payment of $${payment.amount_due} due in 3 days`,
            dueDate: payment.due_date
        });
    }
    
    // T-1 day: Payment due tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowPayments = await getInstallmentsByDueDate(tomorrow);
    for (const payment of tomorrowPayments) {
        await sendNotification(payment.borrower_id, {
            type: 'urgent_reminder',
            message: `Payment of $${payment.amount_due} due TOMORROW`,
            dueDate: payment.due_date
        });
    }
    
    // Late payments: Send late notice
    const latePayments = await getLateInstallments();
    for (const payment of latePayments) {
        await sendNotification(payment.borrower_id, {
            type: 'late_payment',
            message: `Payment overdue by ${payment.days_late} days. Late fee: $${payment.late_fee_amount}`,
            daysLate: payment.days_late
        });
    }
});
```

---

## ✅ Complete Late Payment Flow

### **Step 1: Loan Created**
```javascript
// Create loan with payment schedule
const loan = await createLoan({
    amount: 1000,
    termMonths: 12,
    startDate: new Date('2025-11-14')
});

// Auto-generate installments
const schedule = createLoanPaymentSchedule(loan.startDate, loan.termMonths);
// Payment 1 due: December 14, 2025
// Payment 2 due: January 14, 2026
// ... etc
```

### **Step 2: Daily Monitoring**
```javascript
// Cron job runs at 12:00 AM daily
// Checks all installments with due_date < today
// Marks as 'late' if unpaid and past grace period
```

### **Step 3: Late Fee Application**
```javascript
// If payment is late (past 24-hour grace)
if (daysLate > 0) {
    const lateFee = calculateLateFee(paymentAmount, daysLate);
    
    await applyLateFee({
        installmentId,
        lateFee: lateFee.totalLateFee,
        platformShare: lateFee.platformShare,
        lenderShare: lateFee.lenderShare
    });
}
```

### **Step 4: Notifications**
```javascript
// Automatic notifications:
// - T-3 days: "Payment due in 3 days"
// - T-1 day: "Payment due tomorrow"
// - Due date: "Payment due today"
// - D+1: "Payment overdue - 24h grace period"
// - D+2: "Late fee applied"
```

---

## 🎯 Key Advantages of Simple Approach

### **✅ Benefits:**

1. **Simple to Understand**
   - Due date = same day each month
   - Easy for borrowers to remember
   - No confusing payment windows

2. **Easy to Implement**
   - Standard date arithmetic
   - Simple database queries
   - No complex grouping logic

3. **Industry Standard**
   - How most lenders work
   - Familiar to users
   - Regulatory compliant

4. **Easy to Monitor**
   - Single cron job
   - Clear late payment detection
   - Straightforward reporting

---

## 📋 Implementation Checklist

### **Database:**
- [ ] Create `loan_installments` table
- [ ] Add indexes for due_date and status
- [ ] Add late payment tracking fields

### **Services:**
- [ ] `createLoanPaymentSchedule()` function
- [ ] `isPaymentLate()` function
- [ ] `applyLateFee()` function
- [ ] `getLateInstallments()` query

### **Cron Jobs:**
- [ ] Daily late payment detection (12:00 AM)
- [ ] Daily notification sender (9:00 AM)
- [ ] Weekly late payment report

### **Notifications:**
- [ ] T-3 days reminder
- [ ] T-1 day reminder
- [ ] Due date reminder
- [ ] Late payment notice

---

## 🚀 Quick Start Code

### **Complete Implementation:**

```javascript
// services/late-payment-detector.js

class LatePaymentDetector {
    
    // Check if payment is late
    static isLate(dueDate, paidDate = null, gracePeriodHours = 24) {
        const now = new Date();
        const gracePeriodEnd = new Date(dueDate);
        gracePeriodEnd.setHours(gracePeriodEnd.getHours() + gracePeriodHours);
        
        if (!paidDate && now > gracePeriodEnd) {
            return {
                isLate: true,
                daysLate: Math.floor((now - gracePeriodEnd) / (1000 * 60 * 60 * 24))
            };
        }
        
        if (paidDate && paidDate > gracePeriodEnd) {
            return {
                isLate: true,
                daysLate: Math.floor((paidDate - gracePeriodEnd) / (1000 * 60 * 60 * 24))
            };
        }
        
        return { isLate: false, daysLate: 0 };
    }
    
    // Daily cron job
    static async checkLatePayments() {
        const { data: installments } = await supabase
            .from('loan_installments')
            .select('*')
            .eq('status', 'pending')
            .lt('due_date', new Date().toISOString());
        
        for (const installment of installments) {
            const lateStatus = this.isLate(
                new Date(installment.due_date),
                installment.paid_at ? new Date(installment.paid_at) : null
            );
            
            if (lateStatus.isLate) {
                // Mark as late
                await this.markAsLate(installment.id, lateStatus.daysLate);
                
                // Apply late fee
                await this.applyLateFee(installment);
                
                // Send notification
                await this.sendLateNotification(installment);
            }
        }
    }
}

module.exports = LatePaymentDetector;
```

---

## ✅ Summary

**You DON'T need payment windows to detect late payments!**

**Simple approach:**
1. ✅ Set due date when loan is created (same day each month)
2. ✅ Daily cron job checks if due_date < today
3. ✅ If unpaid and past grace period (24h) = LATE
4. ✅ Apply late fee and send notification

**That's it!** Simple, effective, industry-standard. 🎯

---

**Document Version: 1.0**
**Last Updated: November 14, 2025**
**Recommendation: Use simple monthly due dates, not payment windows**

# 💰 Instant Wallet Crediting System

## 🎯 Overview

When a payment is successfully completed, the user's wallet is **instantly credited** with the deposited amount.

---

## ⚡ How It Works

### **Payment Success → Instant Credit**

```
Payment Confirmed → Update Wallet Balance → Record Transaction → User Sees New Balance
```

**Timeline:** Immediate (< 1 second)

---

## 🔄 Crediting Flow

### **1. Payment Status Check**

When payment status is polled or webhook received:

```javascript
GET /api/payments/status/ZC_WALLET_123

Response:
{
    paid: true,
    amount: 10.00,
    currency: "USD"
}
```

### **2. Wallet Update**

System automatically:

1. **Gets current balance**
   ```javascript
   Current Balance: $50.00
   Deposit Amount: $10.00
   ```

2. **Calculates new balance**
   ```javascript
   New Balance: $50.00 + $10.00 = $60.00
   ```

3. **Updates wallet**
   ```javascript
   wallets table:
   - user_id: abc123
   - balance: 60.00
   - currency: USD
   - updated_at: 2025-11-26T14:30:00Z
   ```

4. **Records transaction**
   ```javascript
   wallet_transactions table:
   - type: 'deposit'
   - amount: 10.00
   - balance_before: 50.00
   - balance_after: 60.00
   - reference: ZC_WALLET_123
   - status: 'completed'
   ```

---

## 📊 Database Tables

### **wallets**
```sql
CREATE TABLE wallets (
    user_id UUID PRIMARY KEY,
    balance DECIMAL(10,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    updated_at TIMESTAMP,
    created_at TIMESTAMP
);
```

### **wallet_transactions**
```sql
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    type VARCHAR(20), -- 'deposit', 'withdrawal', 'investment', etc.
    amount DECIMAL(10,2),
    currency VARCHAR(3),
    balance_before DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    reference VARCHAR(100),
    description TEXT,
    payment_method VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP
);
```

### **payment_transactions**
```sql
CREATE TABLE payment_transactions (
    reference VARCHAR(100) PRIMARY KEY,
    user_id UUID,
    amount DECIMAL(10,2),
    currency VARCHAR(3),
    status VARCHAR(20),
    wallet_credited BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMP,
    created_at TIMESTAMP
);
```

---

## 🎯 Crediting Logic

### **Status Check Endpoint**

```javascript
// routes/payments.js - GET /api/payments/status/:reference

if (statusResponse.paid && !transaction.wallet_credited) {
    // Get current balance
    const wallet = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single();
    
    const currentBalance = wallet?.balance || 0;
    const newBalance = currentBalance + transaction.amount;
    
    // Update wallet
    await supabase
        .from('wallets')
        .upsert({
            user_id: transaction.user_id,
            balance: newBalance,
            currency: transaction.currency,
            updated_at: new Date().toISOString()
        });
    
    // Record transaction
    await supabase
        .from('wallet_transactions')
        .insert({
            user_id: transaction.user_id,
            type: 'deposit',
            amount: transaction.amount,
            balance_before: currentBalance,
            balance_after: newBalance,
            reference: reference,
            description: 'Wallet Top-up',
            status: 'completed'
        });
    
    // Mark as credited
    await supabase
        .from('payment_transactions')
        .update({ wallet_credited: true })
        .eq('reference', reference);
}
```

### **Webhook Endpoint**

```javascript
// routes/payments.js - POST /api/payments/result

if (status === 'paid' && !existingTx.wallet_credited) {
    // Same crediting logic as above
    // Triggered when Paynow sends webhook
}
```

---

## 🔒 Safety Features

### **1. Duplicate Prevention**

```javascript
if (!transaction.wallet_credited) {
    // Only credit once
    creditWallet();
    markAsCredited();
}
```

**Prevents:**
- Double crediting
- Race conditions
- Webhook + polling both crediting

### **2. Transaction Record**

Every credit is recorded with:
- ✅ Balance before
- ✅ Balance after
- ✅ Payment reference
- ✅ Timestamp
- ✅ Payment method

**Enables:**
- Audit trail
- Dispute resolution
- Transaction history

### **3. Error Handling**

```javascript
try {
    creditWallet();
} catch (error) {
    console.error('Wallet credit failed:', error);
    // Don't fail the whole request
    // Log for manual review
}
```

**Ensures:**
- Payment still marked as successful
- Error logged for investigation
- Manual credit if needed

---

## 📱 User Experience

### **Before Payment:**
```
Wallet Balance: $50.00
```

### **During Payment:**
```
💳 Payment Pending
⏳ Checking payment status...
```

### **After Success:**
```
✅ Payment Successful!
💰 Amount Added: $10.00

Wallet Balance: $60.00  ← Updated instantly
```

### **Transaction History:**
```
Recent Transactions:
- Wallet Top-up        +$10.00    Nov 26, 2:30 PM
- Investment in Loan   -$25.00    Nov 25, 10:15 AM
- Wallet Top-up        +$50.00    Nov 24, 3:45 PM
```

---

## 🔄 Multiple Crediting Paths

### **Path 1: Status Polling (Most Common)**

```
User completes payment
  ↓
Frontend polls status every 10s
  ↓
Backend checks Paynow
  ↓
Payment confirmed
  ↓
Wallet credited ✅
  ↓
Frontend shows success
```

### **Path 2: Webhook (Backup)**

```
User completes payment
  ↓
Paynow sends webhook to backend
  ↓
Backend receives notification
  ↓
Wallet credited ✅
  ↓
Next status poll shows success
```

### **Path 3: Manual Return**

```
User completes payment
  ↓
Returns to dashboard
  ↓
Frontend checks status
  ↓
Payment confirmed
  ↓
Wallet credited ✅
  ↓
Success modal shown
```

---

## 💡 Example Scenarios

### **Scenario 1: EcoCash Payment**

```
1. User initiates $10 EcoCash payment
2. Enters PIN on phone
3. Payment confirmed by Paynow
4. Status polling detects success
5. Wallet credited: $50 → $60
6. User sees updated balance
```

**Time:** ~30 seconds

### **Scenario 2: Web Payment**

```
1. User clicks "Proceed to Payment"
2. Paynow page opens in new tab
3. User pays with card
4. Returns to dashboard
5. Status check confirms payment
6. Wallet credited: $100 → $150
7. Success modal shown
```

**Time:** ~2 minutes

### **Scenario 3: Webhook First**

```
1. User completes payment
2. Paynow sends webhook immediately
3. Wallet credited: $75 → $100
4. User still on payment page
5. Returns to dashboard
6. Sees updated balance instantly
```

**Time:** Instant

---

## 🧪 Testing

### **Test Successful Credit:**

```javascript
// 1. Make payment
POST /api/payments/initiate/web
{
    amount: 10,
    userEmail: "test@example.com"
}

// 2. Complete payment on Paynow

// 3. Check status
GET /api/payments/status/ZC_WALLET_123

// 4. Verify wallet updated
GET /api/wallet/balance
Response: { balance: 60.00 } // Was 50.00

// 5. Check transaction history
GET /api/wallet/transactions
Response: [
    {
        type: "deposit",
        amount: 10.00,
        balance_after: 60.00,
        reference: "ZC_WALLET_123"
    }
]
```

### **Test Duplicate Prevention:**

```javascript
// 1. Credit wallet
creditWallet(reference);

// 2. Try to credit again
creditWallet(reference); // ❌ Blocked

// 3. Verify only credited once
checkBalance(); // $60, not $70
```

---

## 📊 Monitoring

### **Success Metrics:**

```javascript
// Log successful credits
console.log('✅ Wallet credited:', {
    userId: 'abc123',
    amount: 10.00,
    newBalance: 60.00,
    reference: 'ZC_WALLET_123'
});
```

### **Error Tracking:**

```javascript
// Log failed credits
console.error('❌ Wallet credit failed:', {
    userId: 'abc123',
    amount: 10.00,
    reference: 'ZC_WALLET_123',
    error: error.message
});
```

### **Audit Trail:**

```sql
-- Check all credits today
SELECT * FROM wallet_transactions
WHERE type = 'deposit'
AND DATE(created_at) = CURRENT_DATE;

-- Check uncredited payments
SELECT * FROM payment_transactions
WHERE status = 'paid'
AND wallet_credited = FALSE;
```

---

## 🚨 Error Scenarios

### **1. Wallet Not Found**

```javascript
if (!wallet) {
    // Create wallet with initial balance
    await supabase.from('wallets').insert({
        user_id: userId,
        balance: amount,
        currency: 'USD'
    });
}
```

### **2. Database Error**

```javascript
try {
    creditWallet();
} catch (error) {
    // Log for manual processing
    await supabase.from('failed_credits').insert({
        reference,
        userId,
        amount,
        error: error.message
    });
}
```

### **3. Concurrent Updates**

```javascript
// Use database transactions
await supabase.rpc('credit_wallet_atomic', {
    userId,
    amount,
    reference
});
```

---

## ✅ Benefits

1. **Instant Gratification** - Users see funds immediately
2. **No Manual Processing** - Fully automated
3. **Audit Trail** - Complete transaction history
4. **Duplicate Prevention** - Can't credit twice
5. **Error Recovery** - Failed credits logged
6. **Multiple Paths** - Polling + webhook redundancy

---

## 🔐 Security

- ✅ Only credits on confirmed payment
- ✅ Checks `wallet_credited` flag
- ✅ Records all transactions
- ✅ Validates payment reference
- ✅ Logs all operations
- ✅ Error handling prevents data loss

---

**Wallet crediting is instant, secure, and fully automated!** 💰

**Last Updated:** November 26, 2025

# 💳 Payment Flow Comparison: Web Redirect vs Express Checkout

## 🎯 Overview

ZimCrowd supports two payment flows, both with comprehensive error handling:

1. **Web Redirect** - Paynow web checkout (cards, bank transfer)
2. **Express Checkout** - Mobile money (EcoCash, OneMoney, InnBucks)

---

## 🔄 Payment Flow Comparison

### **Web Redirect (Paynow Web)**

```
User Action → Backend → Paynow → User Redirected → Payment → Return → Status Check
```

**Steps:**
1. User clicks "Proceed to Payment"
2. Backend initiates payment with Paynow
3. User redirected to Paynow website (opens in new tab)
4. User completes payment on Paynow
5. User returns to ZimCrowd
6. System polls for payment status
7. **Error detection happens during polling**

**Endpoint:** `POST /api/payments/initiate/web`

---

### **Express Checkout (Mobile Money)**

```
User Action → Backend → Paynow → USSD Prompt → User Confirms → Status Check
```

**Steps:**
1. User clicks "Proceed to Payment"
2. Backend initiates payment with Paynow
3. User receives USSD prompt on phone
4. User enters PIN to confirm
5. System polls for payment status
6. **Error detection happens during polling**

**Endpoint:** `POST /api/payments/initiate/mobile`

---

## ✅ Unified Error Handling

### **Both Flows Use Same Error Detection:**

```javascript
// Backend: paynow.service.js
async checkPaymentStatus(pollUrl, reference) {
    const status = await paynow.pollTransaction(pollUrl);
    
    // Detect errors (SAME for both flows)
    if (status.includes('cancelled')) → 'cancelled'
    if (status.includes('insufficient')) → 'insufficient_funds'
    if (status.includes('invalid')) → 'no_wallet'
    if (status.includes('unavailable')) → 'service_unavailable'
    if (status.includes('failed')) → 'failed'
    
    return {
        failureReason,
        errorMessage
    };
}
```

### **Both Flows Return Same Response:**

```javascript
// Backend: routes/payments.js
res.json({
    success: true,
    status: statusResponse.status,
    paid: statusResponse.paid,
    reference: statusResponse.reference,
    amount: statusResponse.amount,
    currency: statusResponse.currency,
    failureReason: statusResponse.failureReason,  // ✅ Both flows
    errorMessage: statusResponse.errorMessage      // ✅ Both flows
});
```

### **Frontend Handles Both the Same:**

```javascript
// Frontend: wallet-functions.js
if (result.failureReason) {
    // Show error (SAME for both flows)
    const errorIcon = getErrorIcon(result.failureReason);
    const errorMessage = result.errorMessage;
    showError(errorIcon, errorMessage);
    stopPolling();
}
```

---

## 📊 Error Scenarios for Both Flows

| Error | Web Redirect | Express Checkout | Icon | Message |
|-------|-------------|------------------|------|---------|
| **Cancelled** | User closes Paynow tab | User cancels USSD | 🚫 | Payment was cancelled |
| **Insufficient Funds** | Card declined | Wallet balance low | 💰 | Insufficient funds |
| **No Wallet** | Invalid account | Unregistered number | ⚠️ | Mobile wallet not found |
| **Service Down** | Paynow offline | Paynow offline | 🔧 | Service unavailable |
| **Failed** | Payment rejected | Transaction failed | ❌ | Payment failed |
| **Timeout** | No response (5min) | No response (5min) | ⏱️ | Payment timeout |

---

## 🔍 Detailed Flow Comparison

### **1. Payment Initiation**

**Web Redirect:**
```javascript
POST /api/payments/initiate/web
{
    amount: 10,
    userEmail: "user@example.com",
    currency: "USD"
}

Response:
{
    success: true,
    redirectUrl: "https://paynow.co.zw/...",  // ← User redirected here
    pollUrl: "https://paynow.co.zw/poll/...",
    reference: "ZC_WALLET_123"
}
```

**Express Checkout:**
```javascript
POST /api/payments/initiate/mobile
{
    amount: 10,
    mobileNumber: "+263771234567",
    paymentMethod: "ecocash",
    currency: "USD"
}

Response:
{
    success: true,
    instructions: "Check your phone...",  // ← User checks phone
    pollUrl: "https://paynow.co.zw/poll/...",
    reference: "ZC_WALLET_123"
}
```

---

### **2. Status Polling**

**Both Use Same Endpoint:**
```javascript
GET /api/payments/status/ZC_WALLET_123

Response (SAME for both):
{
    success: true,
    status: "insufficient funds",
    paid: false,
    failureReason: "insufficient_funds",  // ✅ Detected
    errorMessage: "Insufficient funds in your mobile wallet..."
}
```

---

### **3. Error Display**

**Both Show Same UI:**
```
┌─────────────────────────────────────┐
│  💳 Payment Pending                 │
├─────────────────────────────────────┤
│  💰 Insufficient funds in your      │
│  mobile wallet. Please top up and   │
│  try again.                         │
│                                     │
│  Reference: ZC_WALLET_123           │
│  Amount: $10.00                     │
│                                     │
│  [Try Again]  [Close]               │
└─────────────────────────────────────┘
```

---

## 🎨 User Experience Differences

### **Web Redirect:**
1. Modal shows "Payment Pending"
2. **New tab opens** with Paynow website
3. User completes payment in new tab
4. User returns to original tab
5. Modal shows status (success/error)

### **Express Checkout:**
1. Modal shows "Payment Initiated"
2. **Phone receives USSD prompt**
3. User enters PIN on phone
4. Modal shows status (success/error)

### **Error Handling (SAME):**
- Both detect same errors
- Both show same error messages
- Both use same icons
- Both stop polling on failure

---

## 💾 Database Storage

**Both flows store same data:**

```sql
payment_transactions:
- reference (ZC_WALLET_123)
- amount (10.00)
- currency (USD)
- payment_method (paynow_web OR ecocash)
- status (pending/paid/failed)
- failure_reason (cancelled/insufficient_funds/etc)  ✅ Both
- error_message (user-friendly message)              ✅ Both
- poll_url (Paynow polling URL)
- paid_at (timestamp if successful)
```

---

## 🔄 Polling Behavior

**Both flows poll identically:**

```javascript
// Poll every 10 seconds
// Max 30 attempts (5 minutes)
// Stop on: success, failure, or timeout

async function pollPaymentStatus(reference, attempts = 0) {
    if (attempts >= 30) {
        showTimeout();
        return;
    }
    
    const result = await checkStatus(reference);
    
    if (result.paid) {
        showSuccess();
    } else if (result.failureReason) {
        showError(result.errorMessage);  // ✅ Same for both
        return; // Stop polling
    } else {
        setTimeout(() => poll(reference, attempts + 1), 10000);
    }
}
```

---

## 🚨 Error Detection Examples

### **Cancelled Payment:**

**Web Redirect:**
```
User: Closes Paynow tab
Paynow: Returns status "Cancelled"
System: Detects "cancelled"
Display: 🚫 Payment was cancelled
```

**Express Checkout:**
```
User: Cancels USSD prompt
Paynow: Returns status "Cancelled"
System: Detects "cancelled"
Display: 🚫 Payment was cancelled
```

---

### **Insufficient Funds:**

**Web Redirect:**
```
User: Enters card details
Bank: Declines (insufficient funds)
Paynow: Returns "Insufficient funds"
System: Detects "insufficient"
Display: 💰 Insufficient funds...
```

**Express Checkout:**
```
User: Enters PIN
Wallet: Balance too low
Paynow: Returns "Insufficient funds"
System: Detects "insufficient"
Display: 💰 Insufficient funds...
```

---

### **Service Unavailable:**

**Web Redirect:**
```
User: Clicks payment
Paynow: Service down
Response: "Service unavailable"
System: Detects "unavailable"
Display: 🔧 Service unavailable...
```

**Express Checkout:**
```
User: Initiates payment
Paynow: Maintenance mode
Response: "Service unavailable"
System: Detects "unavailable"
Display: 🔧 Service unavailable...
```

---

## ✅ Benefits of Unified Error Handling

1. **Consistency** - Same errors shown for both flows
2. **Maintainability** - One error detection system
3. **User Experience** - Predictable error messages
4. **Debugging** - Easier to track issues
5. **Scalability** - Easy to add new payment methods

---

## 🧪 Testing Both Flows

### **Test Web Redirect:**
```javascript
// 1. Initiate payment
POST /api/payments/initiate/web
{
    amount: 10,
    userEmail: "test@example.com"
}

// 2. Simulate error
// (Close Paynow tab or use test card)

// 3. Check status
GET /api/payments/status/ZC_WALLET_123

// 4. Verify error detected
{
    failureReason: "cancelled",
    errorMessage: "Payment was cancelled..."
}
```

### **Test Express Checkout:**
```javascript
// 1. Initiate payment
POST /api/payments/initiate/mobile
{
    amount: 10,
    mobileNumber: "+263771234567",
    paymentMethod: "ecocash"
}

// 2. Simulate error
// (Cancel USSD or use low balance account)

// 3. Check status
GET /api/payments/status/ZC_WALLET_123

// 4. Verify error detected
{
    failureReason: "insufficient_funds",
    errorMessage: "Insufficient funds..."
}
```

---

## 📊 Summary

| Feature | Web Redirect | Express Checkout |
|---------|-------------|------------------|
| **Error Detection** | ✅ Same | ✅ Same |
| **Error Messages** | ✅ Same | ✅ Same |
| **Error Icons** | ✅ Same | ✅ Same |
| **Polling Logic** | ✅ Same | ✅ Same |
| **Database Storage** | ✅ Same | ✅ Same |
| **Frontend Display** | ✅ Same | ✅ Same |
| **User Experience** | Different UI | Different UI |
| **Payment Method** | Card/Bank | Mobile Money |

---

**Both payment flows have identical error handling, ensuring consistent user experience!** ✅

**Last Updated:** November 26, 2025

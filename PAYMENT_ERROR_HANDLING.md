# 💳 Payment Error Handling Guide

## 🎯 Overview

The system now detects and handles specific payment failure scenarios to provide clear feedback to users.

---

## 🚨 Detected Payment Failures

### **1. Payment Cancelled**
**Trigger:** User cancels the payment on their mobile device

**Detection:** Paynow status contains "cancelled"

**User Message:**
```
🚫 Payment was cancelled. You can try again when ready.
```

**Icon:** `fa-ban` (ban icon)

**Action:** Stop polling, show error in modal

---

### **2. Insufficient Funds**
**Trigger:** User's mobile wallet has insufficient balance

**Detection:** Paynow status contains "insufficient"

**User Message:**
```
💰 Insufficient funds in your mobile wallet. Please top up and try again.
```

**Icon:** `fa-wallet` (wallet icon)

**Action:** Stop polling, show error in modal

---

### **3. No Mobile Wallet**
**Trigger:** Mobile number not registered for mobile money

**Detection:** Paynow status contains "invalid" or "not found"

**User Message:**
```
⚠️ Mobile wallet not found or not registered. Please ensure your mobile money account is active.
```

**Icon:** `fa-exclamation-triangle` (warning icon)

**Action:** Stop polling, show error in modal

---

### **4. General Payment Failure**
**Trigger:** Any other payment failure

**Detection:** Paynow status contains "failed"

**User Message:**
```
❌ Payment failed. Please try again or contact support if the issue persists.
```

**Icon:** `fa-times-circle` (error icon)

**Action:** Stop polling, show error in modal

---

### **5. Service Unavailable**
**Trigger:** Paynow payment service is down or under maintenance

**Detection:** Paynow status contains "unavailable", "service down", or "maintenance"

**User Message:**
```
🔧 Paynow payment service is currently unavailable. Please try again later or use an alternative payment method.
```

**Icon:** `fa-server` (server icon)

**Action:** Stop polling, show service unavailable error

---

### **6. Payment Timeout**
**Trigger:** No response after 30 polling attempts (~5 minutes)

**User Message:**
```
⏱️ Payment timeout. Please check your transaction history.
```

**Icon:** `fa-exclamation-circle` (warning icon)

**Action:** Stop polling, show timeout message

---

## 🔍 Detection Logic

### **Backend (paynow.service.js)**

```javascript
// Poll Paynow status
const status = await paynow.pollTransaction(pollUrl);

// Detect specific failures
let failureReason = null;
if (status.status.toLowerCase().includes('cancelled')) {
    failureReason = 'cancelled';
} else if (status.status.toLowerCase().includes('insufficient')) {
    failureReason = 'insufficient_funds';
} else if (status.status.toLowerCase().includes('invalid') || 
           status.status.toLowerCase().includes('not found')) {
    failureReason = 'no_wallet';
} else if (status.status.toLowerCase().includes('failed')) {
    failureReason = 'failed';
}

// Return with failure reason
return {
    success: true,
    status: status.status,
    paid: status.paid,
    failureReason: failureReason,
    errorMessage: failureReason ? this.getPaymentErrorMessage(failureReason) : null
};
```

### **Frontend (wallet-functions.js)**

```javascript
// Check for payment failure
if (result.failureReason || result.status === 'cancelled' || result.status === 'failed') {
    // Show specific error icon
    const errorIcon = result.failureReason === 'cancelled' ? 'fa-ban' : 
                     result.failureReason === 'insufficient_funds' ? 'fa-wallet' :
                     result.failureReason === 'no_wallet' ? 'fa-exclamation-triangle' :
                     'fa-times-circle';
    
    // Show error message
    const errorMessage = result.errorMessage || `Payment ${result.status}`;
    statusText.innerHTML = `<i class="fas ${errorIcon}" style="color: #ef4444;"></i> ${errorMessage}`;
    
    // Stop polling
    return;
}
```

---

## 📊 Error Message Mapping

| Failure Reason | Icon | Color | Message |
|---------------|------|-------|---------|
| `cancelled` | 🚫 ban | Red | Payment was cancelled. You can try again when ready. |
| `insufficient_funds` | 💰 wallet | Red | Insufficient funds in your mobile wallet. Please top up and try again. |
| `no_wallet` | ⚠️ warning | Red | Mobile wallet not found or not registered. Please ensure your mobile money account is active. |
| `service_unavailable` | 🔧 server | Red | Paynow payment service is currently unavailable. Please try again later or use an alternative payment method. |
| `failed` | ❌ error | Red | Payment failed. Please try again or contact support if the issue persists. |
| `timeout` | ⏱️ clock | Orange | Payment timeout. Please check your transaction history. |

---

## 🎨 User Experience

### **Payment Pending Modal**

When payment is initiated, user sees:
```
┌─────────────────────────────────────┐
│  💳 Payment Pending                 │
├─────────────────────────────────────┤
│  ⏳ Waiting for payment...          │
│                                     │
│  Reference: ZC_WALLET_123456789     │
│  Amount: $10.00                     │
│                                     │
│  Please complete the payment on     │
│  your mobile device.                │
│                                     │
│  [Check Status]  [Close]            │
└─────────────────────────────────────┘
```

### **On Failure**

Modal updates to show specific error:
```
┌─────────────────────────────────────┐
│  💳 Payment Pending                 │
├─────────────────────────────────────┤
│  💰 Insufficient funds in your      │
│  mobile wallet. Please top up and   │
│  try again.                         │
│                                     │
│  Reference: ZC_WALLET_123456789     │
│  Amount: $10.00                     │
│                                     │
│  [Try Again]  [Close]               │
└─────────────────────────────────────┘
```

---

## 🔄 Polling Behavior

### **Normal Flow:**
1. Payment initiated
2. Poll every 10 seconds
3. Max 30 attempts (5 minutes)
4. On success: Show success modal
5. On failure: Show error and stop polling

### **Failure Detection:**
- Polling stops immediately when failure is detected
- No unnecessary API calls after failure
- User can manually check status if needed

---

## 🛠️ Implementation Details

### **Backend Response Structure:**

```json
{
  "success": true,
  "status": "insufficient funds",
  "paid": false,
  "reference": "ZC_WALLET_123456789",
  "amount": 10.00,
  "currency": "USD",
  "failureReason": "insufficient_funds",
  "errorMessage": "Insufficient funds in your mobile wallet. Please top up and try again."
}
```

### **Frontend Handling:**

```javascript
// Automatic polling
async function pollPaymentStatus(reference, attempts = 0) {
    const result = await fetch(`/api/payments/status/${reference}`);
    
    if (result.paid) {
        showSuccess();
    } else if (result.failureReason) {
        showError(result.errorMessage);
        return; // Stop polling
    } else {
        // Continue polling
        setTimeout(() => pollPaymentStatus(reference, attempts + 1), 10000);
    }
}

// Manual check
async function checkPaymentStatus(reference) {
    const result = await fetch(`/api/payments/status/${reference}`);
    
    if (result.paid) {
        showSuccess();
    } else if (result.failureReason) {
        alert(`${emoji} ${result.errorMessage}`);
    } else {
        alert('Payment still pending...');
    }
}
```

---

## 📱 Mobile Money Specific Errors

### **EcoCash:**
- Insufficient funds
- Wallet not active
- Transaction limit exceeded
- Network timeout

### **OneMoney:**
- Insufficient balance
- Account not registered
- Daily limit reached
- Service unavailable

### **Common Issues:**
- User cancels USSD prompt
- PIN entry timeout
- Network connectivity
- Service downtime

---

## 🧪 Testing

### **Test Scenarios:**

1. **Cancelled Payment:**
   - Initiate payment
   - Cancel USSD prompt on phone
   - Verify "cancelled" message shows

2. **Insufficient Funds:**
   - Use account with low balance
   - Attempt payment above balance
   - Verify "insufficient funds" message

3. **No Wallet:**
   - Use unregistered number
   - Verify "no wallet" message

4. **Network Timeout:**
   - Wait 5 minutes without completing
   - Verify timeout message

---

## 📊 Analytics

Track payment failures for insights:

```javascript
// Log failure reasons
console.log(`Payment failed: ${failureReason}`);

// Can be sent to analytics
analytics.track('payment_failed', {
    reason: failureReason,
    amount: amount,
    method: paymentMethod,
    reference: reference
});
```

---

## 🆘 Support

### **User Actions:**

**For Cancelled:**
- Try payment again
- Ensure phone is ready

**For Insufficient Funds:**
- Top up mobile wallet
- Try smaller amount

**For No Wallet:**
- Register for mobile money
- Verify number is correct
- Contact mobile network

**For General Failure:**
- Try again later
- Contact support
- Check transaction history

---

## 🔐 Security

- Error messages don't expose sensitive data
- Generic messages for unknown errors
- Failure reasons logged server-side
- User-friendly messages client-side

---

**Last Updated:** November 26, 2025

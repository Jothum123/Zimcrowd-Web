# 🧪 Paynow Integration - Testing & Enhancement Plan

## Current Status

✅ **Implemented:**
- Web checkout (cards, bank transfer)
- Mobile money (EcoCash, OneMoney, InnBucks)
- Webhook handling
- Status polling
- Hash validation
- Multi-currency (USD, ZWG)

---

## 1. Test Payment Flows

### Test Checklist

#### A. Web Checkout Flow
```
[ ] Open deposit modal
[ ] Enter amount ($1-$10,000)
[ ] Select "Paynow Web Checkout"
[ ] Enter email
[ ] Click "Proceed to Payment"
[ ] Verify redirect to Paynow
[ ] Complete payment on Paynow
[ ] Verify return to zimcrowd.com
[ ] Check wallet credited
[ ] Verify transaction in database
```

#### B. EcoCash Flow
```
[ ] Open deposit modal
[ ] Enter amount
[ ] Select "EcoCash"
[ ] Enter phone (0771234567)
[ ] Click "Proceed to Payment"
[ ] Check USSD instructions displayed
[ ] Dial USSD code
[ ] Complete on phone
[ ] Verify wallet credited
```

#### C. OneMoney Flow
```
[ ] Same as EcoCash
[ ] Use OneMoney number
[ ] Verify different USSD code
```

#### D. InnBucks Flow
```
[ ] Select InnBucks
[ ] Enter phone
[ ] Check QR code displayed
[ ] Scan with InnBucks app
[ ] Complete payment
[ ] Verify wallet credited
```

---

## 2. Configuration Updates

### A. Add Test Mode Toggle

**File:** `config/paynow-config.js`

```javascript
// Add test credentials
test: {
    usd: {
        integrationId: 'TEST_USD_ID',
        integrationKey: 'TEST_USD_KEY'
    },
    zwg: {
        integrationId: 'TEST_ZWG_ID',
        integrationKey: 'TEST_ZWG_KEY'
    }
},

// Helper to get active config
getActiveConfig(currency) {
    const env = this.settings.testMode ? 'test' : currency.toLowerCase();
    return this[env];
}
```

### B. Add Currency Switcher

**File:** `wallet-functions.js`

```javascript
// Add currency selection to deposit modal
<div style="margin-bottom: 20px;">
    <label>Currency</label>
    <select id="depositCurrency">
        <option value="USD">USD ($)</option>
        <option value="ZWG">ZWG (Z$)</option>
    </select>
</div>
```

### C. Update Amount Limits by Currency

```javascript
function updateAmountLimits() {
    const currency = document.getElementById('depositCurrency').value;
    const amountInput = document.getElementById('depositAmount');
    
    if (currency === 'USD') {
        amountInput.min = 1;
        amountInput.max = 10000;
        amountInput.placeholder = 'Min: $1, Max: $10,000';
    } else {
        amountInput.min = 200;
        amountInput.max = 10000000;
        amountInput.placeholder = 'Min: Z$200, Max: Z$10M';
    }
}
```

---

## 3. New Features to Add

### Feature 1: Payment Status Modal

Show real-time payment status with polling:

```javascript
function showPaymentStatusModal(reference, pollUrl) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="payment-status-modal">
            <h3>Payment Status</h3>
            <div id="statusIndicator">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Processing payment...</p>
            </div>
            <div id="statusDetails">
                <p>Reference: ${reference}</p>
                <p>Status: <span id="currentStatus">Pending</span></p>
            </div>
            <button onclick="closeStatusModal()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Start polling
    pollPaymentStatus(reference, pollUrl);
}
```

### Feature 2: Payment History

Show user's payment history:

```javascript
async function showPaymentHistory() {
    const response = await fetch(`${API_BASE}/api/payments/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const payments = await response.json();
    
    // Display in modal
    displayPaymentHistory(payments);
}
```

### Feature 3: Quick Deposit Amounts

Add preset amounts for faster deposits:

```javascript
<div class="quick-amounts">
    <button onclick="setAmount(5)">$5</button>
    <button onclick="setAmount(10)">$10</button>
    <button onclick="setAmount(20)">$20</button>
    <button onclick="setAmount(50)">$50</button>
    <button onclick="setAmount(100)">$100</button>
</div>
```

### Feature 4: Save Payment Method

Remember user's preferred payment method:

```javascript
function savePreferredMethod(method) {
    localStorage.setItem('preferredPaymentMethod', method);
}

function loadPreferredMethod() {
    const preferred = localStorage.getItem('preferredPaymentMethod');
    if (preferred) {
        document.getElementById('depositMethod').value = preferred;
        togglePaymentFields();
    }
}
```

### Feature 5: Express Checkout

Add one-click deposit for returning users:

```javascript
async function expressCheckout(amount) {
    const savedMethod = localStorage.getItem('preferredPaymentMethod');
    const savedPhone = localStorage.getItem('savedPhone');
    
    if (savedMethod && savedPhone) {
        // Skip modal, go straight to payment
        await handleDeposit({
            amount,
            method: savedMethod,
            phone: savedPhone
        });
    }
}
```

### Feature 6: Payment Notifications

Add browser notifications for payment status:

```javascript
async function requestNotificationPermission() {
    if ('Notification' in window) {
        await Notification.requestPermission();
    }
}

function notifyPaymentComplete(amount) {
    if (Notification.permission === 'granted') {
        new Notification('Payment Successful! 🎉', {
            body: `$${amount} has been added to your wallet`,
            icon: '/logo.png'
        });
    }
}
```

---

## 4. Testing Procedures

### A. Local Testing

```bash
# 1. Start local server
python -m http.server 8000

# 2. Open in browser
http://localhost:8000

# 3. Test each payment method
```

### B. Test with Paynow Sandbox

```javascript
// Update config for testing
settings: {
    testMode: true,
    paynowBase: 'https://sandbox.paynow.co.zw'
}
```

### C. Test Webhook Locally

Use ngrok to test webhooks:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Update result URL
PAYNOW_RESULT_URL=https://your-ngrok-url.ngrok.io/api/payments/result
```

### D. Test Error Scenarios

```javascript
// Test cases
1. Invalid amount (< $1 or > $10,000)
2. Invalid phone number
3. Network timeout
4. Paynow service down
5. Invalid hash in webhook
6. Duplicate transaction reference
```

---

## 5. Performance Enhancements

### A. Optimize Polling

```javascript
// Exponential backoff for polling
const pollWithBackoff = async (pollUrl) => {
    let delay = 3000; // Start with 3s
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
        const status = await checkStatus(pollUrl);
        
        if (status.paid) return status;
        
        await sleep(delay);
        delay = Math.min(delay * 1.2, 10000); // Max 10s
        attempts++;
    }
};
```

### B. Cache Payment Methods

```javascript
// Cache available payment methods
const paymentMethodsCache = {
    data: null,
    timestamp: null,
    ttl: 3600000, // 1 hour
    
    async get() {
        if (this.isValid()) return this.data;
        
        this.data = await fetchPaymentMethods();
        this.timestamp = Date.now();
        return this.data;
    },
    
    isValid() {
        return this.data && (Date.now() - this.timestamp < this.ttl);
    }
};
```

### C. Preload Payment Modal

```javascript
// Preload modal HTML on page load
window.addEventListener('DOMContentLoaded', () => {
    preloadDepositModal();
});
```

---

## 6. Security Enhancements

### A. Add CSRF Protection

```javascript
// Generate CSRF token
function generateCSRFToken() {
    return crypto.randomUUID();
}

// Include in payment requests
headers: {
    'X-CSRF-Token': csrfToken
}
```

### B. Rate Limiting

```javascript
// Limit payment attempts
const rateLimiter = {
    attempts: 0,
    resetTime: Date.now() + 3600000,
    
    canAttempt() {
        if (Date.now() > this.resetTime) {
            this.attempts = 0;
            this.resetTime = Date.now() + 3600000;
        }
        
        return this.attempts < 10; // Max 10 per hour
    },
    
    recordAttempt() {
        this.attempts++;
    }
};
```

### C. Amount Validation

```javascript
function validateAmount(amount, currency) {
    const config = getCurrencyConfig(currency);
    
    if (amount < config.limits.min) {
        throw new Error(`Minimum amount is ${config.limits.min}`);
    }
    
    if (amount > config.limits.max) {
        throw new Error(`Maximum amount is ${config.limits.max}`);
    }
    
    // Check decimal places
    if (currency === 'USD' && !isValidDecimal(amount, 2)) {
        throw new Error('USD amounts must have max 2 decimal places');
    }
    
    return true;
}
```

---

## 7. User Experience Improvements

### A. Loading States

```javascript
// Better loading indicators
function showPaymentProcessing() {
    return `
        <div class="processing-animation">
            <div class="spinner"></div>
            <h3>Processing Payment</h3>
            <p>Please wait while we process your payment...</p>
            <div class="progress-bar">
                <div class="progress" id="paymentProgress"></div>
            </div>
        </div>
    `;
}
```

### B. Error Messages

```javascript
const errorMessages = {
    'INVALID_AMOUNT': 'Please enter a valid amount',
    'PAYMENT_FAILED': 'Payment failed. Please try again',
    'NETWORK_ERROR': 'Network error. Check your connection',
    'TIMEOUT': 'Payment timed out. Please check your wallet',
    'DUPLICATE': 'Duplicate transaction detected'
};

function showError(errorCode) {
    const message = errorMessages[errorCode] || 'An error occurred';
    // Display user-friendly error
}
```

### C. Success Animations

```javascript
function showPaymentSuccess(amount) {
    return `
        <div class="success-animation">
            <div class="checkmark-circle">
                <div class="checkmark"></div>
            </div>
            <h2>Payment Successful! 🎉</h2>
            <p>$${amount} has been added to your wallet</p>
            <button onclick="closeModal()">Continue</button>
        </div>
    `;
}
```

---

## 8. Analytics & Monitoring

### A. Track Payment Events

```javascript
function trackPaymentEvent(event, data) {
    // Google Analytics
    gtag('event', event, {
        'event_category': 'Payment',
        'event_label': data.method,
        'value': data.amount
    });
    
    // Custom analytics
    fetch('/api/analytics/payment', {
        method: 'POST',
        body: JSON.stringify({ event, data })
    });
}

// Usage
trackPaymentEvent('payment_initiated', { method: 'ecocash', amount: 10 });
trackPaymentEvent('payment_completed', { method: 'ecocash', amount: 10 });
trackPaymentEvent('payment_failed', { method: 'ecocash', error: 'timeout' });
```

### B. Error Logging

```javascript
function logPaymentError(error, context) {
    console.error('Payment Error:', error);
    
    // Send to error tracking service
    fetch('/api/errors/log', {
        method: 'POST',
        body: JSON.stringify({
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        })
    });
}
```

---

## 9. Testing Commands

```bash
# Run all tests
npm test

# Test specific payment method
npm test -- --grep "EcoCash"

# Test with coverage
npm run test:coverage

# Load testing
npm run test:load
```

---

## 10. Deployment Checklist

```
[ ] All tests passing
[ ] Environment variables set
[ ] Webhook URL configured in Paynow dashboard
[ ] Return URL configured
[ ] SSL certificate valid
[ ] Error logging enabled
[ ] Analytics tracking enabled
[ ] Rate limiting configured
[ ] CSRF protection enabled
[ ] Payment methods tested
[ ] Mobile responsiveness verified
[ ] Browser compatibility checked
[ ] Performance optimized
[ ] Security audit completed
```

---

## Summary

**Testing:**
- ✅ 4 payment flows to test
- ✅ 8 error scenarios
- ✅ Local and production testing

**Configuration:**
- ✅ Test mode toggle
- ✅ Currency switcher
- ✅ Dynamic limits

**New Features:**
- ✅ 6 major features to add
- ✅ Payment status modal
- ✅ Payment history
- ✅ Quick amounts
- ✅ Express checkout

**Enhancements:**
- ✅ Performance optimizations
- ✅ Security improvements
- ✅ UX improvements
- ✅ Analytics & monitoring

**Ready to implement!** 🚀

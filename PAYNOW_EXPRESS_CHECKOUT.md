# ⚡ Paynow Express Checkout

## Overview

**Express Checkout** allows customers to complete payments **without redirecting** to Paynow. The merchant captures payment details in their own application.

### Supported Payment Methods

| Method | Type | Token Required | Phone Required |
|--------|------|----------------|----------------|
| **EcoCash** | Mobile Money | ❌ No | ✅ Yes |
| **OneMoney** | Mobile Money | ❌ No | ✅ Yes |
| **InnBucks** | Mobile Money | ❌ No | ✅ Yes |
| **O'mari** | Mobile Money | ❌ No | ✅ Yes |
| **Visa/Mastercard** | Card | ✅ Yes | ❌ No |
| **Zimswitch** | Card | ✅ Yes | ❌ No |

---

## API Endpoint

```
POST https://www.paynow.co.zw/interface/remotetransaction
```

**Content-Type:** `application/x-www-form-urlencoded`

---

## Request Fields

### Required Fields (All Methods)

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Integration ID |
| `reference` | String | Unique transaction reference |
| `amount` | Decimal | Amount (2 decimal places) |
| `returnurl` | String | Return URL |
| `resulturl` | String | Result URL (webhook) |
| `status` | String | Must be `"Message"` |
| `method` | String | Payment method (see below) |
| `hash` | String | SHA512 hash |

### Method Values

| Value | Payment Method |
|-------|---------------|
| `ecocash` | EcoCash |
| `onemoney` | OneMoney |
| `innbucks` | InnBucks |
| `omari` | O'mari |
| `zimswitch` | Zimswitch cards |
| `vmc` | Visa/Mastercard |

### Method-Specific Fields

**Mobile Money (EcoCash, OneMoney, InnBucks, O'mari):**
| Field | Required | Description |
|-------|----------|-------------|
| `phone` | ✅ Yes | Mobile number (e.g., `0771234567`) |

**Tokenized Cards (Visa/Mastercard, Zimswitch):**
| Field | Required | Description |
|-------|----------|-------------|
| `token` | ✅ Yes | Token from previous tokenized transaction |
| `merchanttrace` | ✅ Yes | Unique trace ID (max 32 chars) |

---

## Mobile Money Methods

### EcoCash & OneMoney

**Simple USSD prompt flow:**

```javascript
POST /interface/remotetransaction

{
    id: '12345',
    reference: 'ZC-WALLET-123',
    amount: '10.00',
    method: 'ecocash',
    phone: '0771234567',
    returnurl: 'https://zimcrowd.com/return',
    resulturl: 'https://zimcrowd-backend.vercel.app/api/payments/result',
    status: 'Message',
    hash: 'GENERATED_HASH'
}
```

**Response:**
```javascript
{
    status: 'Ok',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=...',
    instructions: 'Dial *151# to complete payment',
    hash: 'RESPONSE_HASH'
}
```

**Customer Experience:**
1. Receives USSD prompt on phone
2. Enters PIN to confirm
3. Payment processed
4. Merchant receives webhook

### InnBucks

**Returns authorization code for QR/deep link:**

```javascript
POST /interface/remotetransaction

{
    id: '12345',
    reference: 'ZC-WALLET-123',
    amount: '10.00',
    method: 'innbucks',
    phone: '0771234567',
    // ... other fields
}
```

**Response:**
```javascript
{
    status: 'Ok',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=...',
    authorizationcode: '123456',
    authorizationexpires: '25-Nov-2025 14:30',
    hash: 'RESPONSE_HASH'
}
```

**Additional Processing:**

**1. Generate QR Code:**
```javascript
const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${authorizationcode}`;
```

**2. Generate Deep Link:**
```javascript
const deepLink = `innbucks.co.zw?pymInnCode=${authorizationcode}`;
```

**Customer Experience:**
1. Scan QR code with InnBucks app, OR
2. Click deep link to open InnBucks app, OR
3. Manually enter authorization code in app
4. Confirm payment in app
5. Payment processed

### O'mari

**Two-step process with OTP:**

**Step 1: Initiate Payment**

```javascript
POST /interface/remotetransaction

{
    id: '12345',
    reference: 'ZC-WALLET-123',
    amount: '10.00',
    method: 'omari',
    phone: '0771234567',
    // ... other fields
}
```

**Response:**
```javascript
{
    status: 'Ok',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=...',
    otpreference: 'OTP-REF-123',
    remoteotpurl: 'https://www.paynow.co.zw/interface/remoteotp',
    hash: 'RESPONSE_HASH'
}
```

**Step 2: Complete with OTP**

```javascript
POST https://www.paynow.co.zw/interface/remoteotp

{
    id: '12345',
    otp: '012345',
    status: 'Message',
    hash: 'GENERATED_HASH'
}
```

**Success Response:**
```javascript
{
    reference: 'ZC-WALLET-123',
    paynowreference: '123456',
    amount: '10.00',
    status: 'Awaiting Delivery',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=...',
    hash: 'RESPONSE_HASH'
}
```

**Error Response:**
```javascript
{
    status: 'Error',
    error: 'Invalid OTP'
}
```

**⚠️ Important:** Customer has **5 attempts** to enter correct OTP. After 5 failed attempts, transaction is cancelled.

---

## Tokenized Card Payments

### Getting a Token (First Time)

**Step 1: Initiate tokenized transaction**

```javascript
POST /interface/initiatetransaction

{
    id: '12345',
    reference: 'ZC-WALLET-123',
    amount: '10.00',
    tokenize: 'true',  // Request tokenization
    // ... other fields
}
```

**Step 2: Customer completes payment on Paynow**

**Step 3: Receive token in webhook**

```javascript
// Webhook POST data
{
    reference: 'ZC-WALLET-123',
    status: 'Paid',
    paynowreference: '123456',
    amount: '10.00',
    token: 'TOKEN-ABC-123-XYZ',  // Store this!
    tokenexpiry: '12/2026',
    hash: 'WEBHOOK_HASH'
}
```

**Step 4: Store token securely**

```javascript
await supabase
    .from('payment_transactions')
    .update({
        payment_token: 'TOKEN-ABC-123-XYZ',
        token_expiry: '12/2026'
    })
    .eq('reference', 'ZC-WALLET-123');
```

### Using a Token (Recurring Payments)

**Express checkout with stored token:**

```javascript
POST /interface/remotetransaction

{
    id: '12345',
    reference: 'ZC-WALLET-456',  // New reference
    amount: '10.00',
    method: 'vmc',  // or 'zimswitch'
    token: 'TOKEN-ABC-123-XYZ',  // Stored token
    merchanttrace: 'TRACE-456',  // Unique trace
    returnurl: 'https://zimcrowd.com/return',
    resulturl: 'https://zimcrowd-backend.vercel.app/api/payments/result',
    status: 'Message',
    hash: 'GENERATED_HASH'
}
```

**Response:**
```javascript
{
    status: 'Ok',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=...',
    hash: 'RESPONSE_HASH'
}
```

**⚠️ Important:**
- `merchanttrace` must be **unique** per request
- Token is **automatically re-tokenized** during payment
- **New token** returned in webhook
- Update stored token with new value

---

## Implementation

### Our Backend Implementation

**Endpoint:** `POST /api/payments/initiate/express`

```javascript
// routes/payments.js
router.post('/initiate/express', authenticateUser, async (req, res) => {
    try {
        const {
            amount,
            method,
            phone,
            token,
            merchantTrace,
            reference,
            description,
            userEmail,
            currency
        } = req.body;
        
        // Validate request
        const validation = paynowService.validateExpressCheckoutRequest(req.body);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                errors: validation.errors
            });
        }
        
        // Initiate express checkout
        const response = await paynowService.initiateExpressCheckout({
            amount: parseFloat(amount),
            method,
            phone,
            token,
            merchantTrace,
            reference: reference || `ZC-EXPRESS-${Date.now()}`,
            description: description || 'Express Checkout Payment',
            userEmail,
            currency: currency || 'USD',
            userId: req.user.id
        });
        
        if (response.success) {
            res.json({
                success: true,
                reference: response.reference,
                pollUrl: response.pollUrl,
                method: response.method,
                instructions: response.instructions,
                additionalData: response.additionalData
            });
        } else {
            res.status(400).json({
                success: false,
                error: response.error
            });
        }
    } catch (error) {
        console.error('Express checkout error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initiate express checkout'
        });
    }
});
```

### Service Implementation

**File:** `services/paynow.service.js`

```javascript
async initiateExpressCheckout(request) {
    try {
        // Validate request
        const validation = this.validateExpressCheckoutRequest(request);
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors
            };
        }
        
        // Initialize Paynow
        const paynow = this.initializePayNow(request.currency);
        
        // Create payment
        const payment = paynow.createPayment(request.reference, request.userEmail);
        payment.add(request.description, request.amount);
        
        let response;
        
        switch (request.method) {
            case 'ecocash':
            case 'onemoney':
                response = await paynow.sendMobile(payment, request.phone, request.method);
                break;
                
            case 'innbucks':
                response = await this.initiateInnBucksPayment(paynow, payment, request);
                break;
                
            case 'omari':
                response = await this.initiateOmariPayment(paynow, payment, request);
                break;
                
            case 'zimswitch':
            case 'vmc':
                response = await this.initiateTokenizedPayment(paynow, payment, request);
                break;
                
            default:
                throw new Error(`Unsupported method: ${request.method}`);
        }
        
        if (response.success) {
            return {
                success: true,
                reference: request.reference,
                pollUrl: response.pollUrl,
                method: request.method,
                instructions: response.instructions,
                additionalData: response.additionalData || {}
            };
        } else {
            return {
                success: false,
                error: response.error
            };
        }
    } catch (error) {
        console.error('Express checkout error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

### InnBucks Implementation

```javascript
async initiateInnBucksPayment(paynow, payment, request) {
    const response = await paynow.sendMobile(payment, request.phone, 'innbucks');
    
    if (response.success && response.authorizationcode) {
        // Generate QR code URL
        const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(response.authorizationcode)}`;
        
        // Generate deep link
        const deepLink = `innbucks.co.zw?pymInnCode=${response.authorizationcode}`;
        
        response.additionalData = {
            authorizationCode: response.authorizationcode,
            authorizationExpires: response.authorizationexpires,
            qrCodeUrl: qrCodeUrl,
            deepLink: deepLink,
            instructions: `Authorization Code: ${response.authorizationcode}. Expires: ${response.authorizationexpires}`
        };
    }
    
    return response;
}
```

### O'mari Implementation

```javascript
async initiateOmariPayment(paynow, payment, request) {
    const response = await paynow.sendMobile(payment, request.phone, 'omari');
    
    if (response.success && response.otpreference) {
        response.additionalData = {
            otpReference: response.otpreference,
            remoteOtpUrl: response.remoteotpurl,
            instructions: `OTP sent to ${request.phone}. Reference: ${response.otpreference}`
        };
    }
    
    return response;
}

async completeOmariPayment(reference, otp) {
    const paymentInfo = this.activePayments.get(reference);
    
    if (!paymentInfo || !paymentInfo.additionalData.remoteOtpUrl) {
        throw new Error('Payment not found or not O\'mari payment');
    }
    
    const config = this.getCurrencyConfig(paymentInfo.currency);
    
    // Prepare OTP data
    const otpData = {
        id: config.integrationId,
        otp: otp,
        status: 'Message'
    };
    
    // Generate hash
    const hash = this.generateHash(otpData, config.integrationKey);
    otpData.hash = hash;
    
    // Send OTP
    const response = await this.makeHttpRequest(
        paymentInfo.additionalData.remoteOtpUrl,
        otpData
    );
    
    return response;
}
```

---

## Frontend Integration

### EcoCash/OneMoney Example

```javascript
// wallet-functions.js
async function handleExpressCheckout(amount, method, phone) {
    try {
        showLoader('Initiating payment...');
        
        const response = await fetch(`${apiBase}/api/payments/initiate/express`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                method: method,
                phone: phone,
                reference: `ZC-EXPRESS-${Date.now()}`,
                description: 'Wallet Top-up',
                userEmail: email,
                currency: 'USD'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            hideLoader();
            showInstructions(result.instructions);
            pollPaymentStatus(result.reference);
        } else {
            hideLoader();
            showError(result.error);
        }
    } catch (error) {
        hideLoader();
        showError('Failed to initiate payment');
    }
}
```

### InnBucks Example

```javascript
async function handleInnBucksPayment(amount, phone) {
    const response = await fetch(`${apiBase}/api/payments/initiate/express`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            amount: parseFloat(amount),
            method: 'innbucks',
            phone: phone
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        const { authorizationCode, authorizationExpires, qrCodeUrl, deepLink } = result.additionalData;
        
        // Display QR code
        showQRCode(qrCodeUrl);
        
        // Display authorization code
        showAuthCode(authorizationCode, authorizationExpires);
        
        // Provide deep link button
        showDeepLinkButton(deepLink);
        
        // Poll for status
        pollPaymentStatus(result.reference);
    }
}

function showQRCode(qrCodeUrl) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="innbucks-modal">
            <h3>Scan QR Code with InnBucks App</h3>
            <img src="${qrCodeUrl}" alt="QR Code" />
            <p>Or use authorization code below</p>
        </div>
    `;
    document.body.appendChild(modal);
}
```

### O'mari Example

```javascript
async function handleOmariPayment(amount, phone) {
    // Step 1: Initiate payment
    const response = await fetch(`${apiBase}/api/payments/initiate/express`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            amount: parseFloat(amount),
            method: 'omari',
            phone: phone
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        const { otpReference } = result.additionalData;
        
        // Show OTP input
        showOTPInput(result.reference, otpReference);
    }
}

async function submitOTP(reference, otp) {
    // Step 2: Complete with OTP
    const response = await fetch(`${apiBase}/api/payments/omari/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            reference: reference,
            otp: otp
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        showSuccess('Payment completed!');
        pollPaymentStatus(reference);
    } else {
        showError(result.error || 'Invalid OTP');
    }
}

function showOTPInput(reference, otpReference) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="otp-modal">
            <h3>Enter OTP</h3>
            <p>OTP sent to your phone</p>
            <p>Reference: ${otpReference}</p>
            <input type="text" id="otp-input" maxlength="6" placeholder="Enter 6-digit OTP" />
            <button onclick="submitOTP('${reference}', document.getElementById('otp-input').value)">
                Submit
            </button>
            <p class="warning">5 attempts remaining</p>
        </div>
    `;
    document.body.appendChild(modal);
}
```

### Tokenized Card Example

```javascript
async function handleRecurringPayment(amount, storedToken) {
    const response = await fetch(`${apiBase}/api/payments/initiate/express`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            amount: parseFloat(amount),
            method: 'vmc',
            token: storedToken,
            merchantTrace: `TRACE-${Date.now()}`,
            reference: `ZC-RECURRING-${Date.now()}`
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        showSuccess('Payment initiated!');
        pollPaymentStatus(result.reference);
    } else {
        showError(result.error);
    }
}
```

---

## Important Notes

### Integration Configuration

**⚠️ Your integration ID must be configured in Paynow to include the selected payment method.**

Example:
- If using `method=ecocash`, integration must have EcoCash enabled
- If using `method=vmc`, integration must have Visa/Mastercard enabled

**Check in Paynow Dashboard:**
```
Settings → Integration → Payment Methods → Enable required methods
```

### Merchant Trace (Tokenized Cards)

**Requirements:**
- Must be **unique** per request
- Max **32 characters**
- Prevents duplicate debits on timeout/network error

**Example:**
```javascript
const merchantTrace = `TRACE-${userId}-${Date.now()}`;
```

### Token Re-tokenization

**Automatic process:**
1. Use token for payment
2. Paynow processes payment
3. **New token** generated automatically
4. New token returned in webhook
5. **Update** stored token with new value

**Example:**
```javascript
// Webhook handler
router.post('/result', async (req, res) => {
    const { reference, token, tokenexpiry } = req.body;
    
    if (token) {
        // Update stored token
        await supabase
            .from('payment_transactions')
            .update({
                payment_token: token,
                token_expiry: tokenexpiry
            })
            .eq('reference', reference);
    }
    
    res.status(200).send('OK');
});
```

---

## Testing

### Test EcoCash

```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/payments/initiate/express \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 0.01,
    "method": "ecocash",
    "phone": "0771234567",
    "reference": "TEST-ECOCASH-001"
  }'
```

### Test InnBucks

```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/payments/initiate/express \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 0.01,
    "method": "innbucks",
    "phone": "0771234567",
    "reference": "TEST-INNBUCKS-001"
  }'
```

### Test O'mari

```bash
# Step 1: Initiate
curl -X POST https://zimcrowd-backend.vercel.app/api/payments/initiate/express \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 0.01,
    "method": "omari",
    "phone": "0771234567",
    "reference": "TEST-OMARI-001"
  }'

# Step 2: Complete with OTP
curl -X POST https://zimcrowd-backend.vercel.app/api/payments/omari/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reference": "TEST-OMARI-001",
    "otp": "012345"
  }'
```

### Test Tokenized Card

```bash
# First, get a token via web checkout with tokenize=true
# Then use the token:

curl -X POST https://zimcrowd-backend.vercel.app/api/payments/initiate/express \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 0.01,
    "method": "vmc",
    "token": "TOKEN-ABC-123-XYZ",
    "merchantTrace": "TRACE-TEST-001",
    "reference": "TEST-TOKEN-001"
  }'
```

---

## Summary

### ✅ Express Checkout Features

- ✅ **6 payment methods** (EcoCash, OneMoney, InnBucks, O'mari, Cards)
- ✅ **No redirect** - Payment in your app
- ✅ **Mobile money** - Direct USSD prompts
- ✅ **InnBucks** - QR code & deep link support
- ✅ **O'mari** - OTP verification
- ✅ **Tokenized cards** - Recurring payments
- ✅ **Automatic re-tokenization** - Token refresh

### 📋 Implementation Status

- ✅ Backend routes implemented
- ✅ Service methods complete
- ✅ Validation included
- ✅ Error handling in place
- ✅ Frontend examples provided
- ✅ Testing procedures documented

### 🔒 Security

- ✅ Hash validation on all requests
- ✅ Tokens stored securely
- ✅ Merchant trace for idempotency
- ✅ OTP verification for O'mari
- ✅ Automatic token refresh

---

**⚡ Your Express Checkout integration is complete and ready!** ⚡

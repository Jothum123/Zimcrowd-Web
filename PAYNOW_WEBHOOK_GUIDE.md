# 🔔 Paynow Webhook Configuration Guide

## Overview

Your backend is now configured to handle **all Paynow webhook fields** including:
- ✅ Basic status updates
- ✅ Hash validation for security
- ✅ Token support for recurring payments
- ✅ Payment instrument details
- ✅ Fraud detection scores
- ✅ Automatic wallet crediting

---

## Webhook Endpoint

**URL:** `https://zimcrowd-backend.vercel.app/api/payments/result`

This endpoint receives POST requests from Paynow whenever a transaction status changes.

---

## Supported Webhook Fields

### Core Fields (Always Present)

| Field | Type | Description |
|-------|------|-------------|
| `reference` | String | Your transaction reference (e.g., `ZC-WALLET-123`) |
| `paynowreference` | String | Paynow's internal reference |
| `amount` | Decimal | Final transaction amount (e.g., `10.00`) |
| `pollurl` | String | URL to poll for status updates |
| `status` | String | Transaction status (see statuses below) |
| `hash` | String | SHA512 hash for validation |

### Optional Token Fields (Recurring Payments)

| Field | Type | Description |
|-------|------|-------------|
| `token` | String | Payment instrument token |
| `tokenexpiry` | String | Token expiry date (DDMMMYYYY) |

### Optional Payment Instrument Fields

| Field | Type | Description |
|-------|------|-------------|
| `paymentchannel` | String | Channel used (Visa, Mastercard, Ecocash) |
| `paymentinstrument` | String | Masked card/mobile number |
| `paymentinstrumentname` | String | Cardholder name |
| `paymentinstrumentnationality` | String | Domestic or Foreign |
| `paymentchannelreference` | String | Approval transaction code |
| `paymentchanneleci` | String | Electronic Commerce Indicator |
| `paymentfraudscore` | String | Fraud risk score |
| `paymentfrauddecision` | String | Issue, Request Manual Review, Reject |

---

## Webhook Statuses

### Success Statuses (Payment Completed)

| Status | Description | Action |
|--------|-------------|--------|
| **Paid** | Payment successful, funds at next settlement | ✅ Credit wallet |
| **Awaiting Delivery** | Paid, waiting for delivery confirmation | ✅ Credit wallet |
| **Delivered** | Delivery confirmed, 24hr window active | ✅ Credit wallet |

### Pending Statuses

| Status | Description | Action |
|--------|-------------|--------|
| **Created** | Transaction created, not yet paid | ⏳ Wait |
| **Sent** | Referred to upstream system, awaiting payment | ⏳ Wait |

### Failed Statuses

| Status | Description | Action |
|--------|-------------|--------|
| **Cancelled** | Transaction cancelled, cannot resume | ❌ Mark failed |
| **Disputed** | Customer disputed, funds in suspense | ⚠️ Hold |
| **Refunded** | Funds refunded to customer | ❌ Reverse credit |

---

## How Your Backend Handles Webhooks

### 1. Receive Webhook
```javascript
POST /api/payments/result
Content-Type: application/x-www-form-urlencoded

reference=ZC-WALLET-123&paynowreference=456&amount=10.00&status=Paid&hash=...
```

### 2. Validate Hash
```javascript
// Extract all fields
const { reference, amount, status, hash, ...otherFields } = req.body;

// Validate hash for security
const isValid = paynowService.validateWebhookHash(req.body);
if (!isValid) {
    return res.status(400).send('INVALID_HASH');
}
```

### 3. Update Transaction
```javascript
// Update database with all webhook data
await supabase
    .from('payment_transactions')
    .update({
        status: status.toLowerCase(),
        paynow_reference: paynowreference,
        paid_at: new Date().toISOString(),
        payment_details: {
            channel: paymentchannel,
            instrument: paymentinstrument,
            // ... other fields
        }
    })
    .eq('reference', reference);
```

### 4. Credit Wallet (if Paid)
```javascript
if (status.toLowerCase() === 'paid' && !existingTx.wallet_credited) {
    await supabase.rpc('credit_wallet', {
        p_user_id: existingTx.user_id,
        p_amount: parseFloat(amount),
        p_transaction_ref: reference,
        p_description: `Deposit via ${paymentchannel || 'Paynow'}`
    });
}
```

### 5. Respond to Paynow
```javascript
// 200 OK prevents Paynow from retrying
res.status(200).send('OK');
```

---

## Hash Validation Process

### Why Hash Validation?
- Ensures webhook is from Paynow (not a fake request)
- Prevents tampering with transaction data
- Required for PCI compliance

### How It Works

**1. Paynow sends webhook with hash:**
```
reference=ABC123&amount=10.00&status=Paid&hash=785659BF...
```

**2. Your backend extracts fields and sorts them:**
```javascript
const fields = {
    amount: '10.00',
    paynowreference: '456',
    pollurl: 'https://...',
    reference: 'ABC123',
    status: 'Paid'
};
```

**3. Concatenate values + integration key:**
```javascript
const hashString = '10.00' + '456' + 'https://...' + 'ABC123' + 'Paid' + 'YOUR_INTEGRATION_KEY';
```

**4. Generate SHA512 hash:**
```javascript
const calculatedHash = crypto
    .createHash('sha512')
    .update(hashString)
    .digest('hex')
    .toUpperCase();
```

**5. Compare hashes:**
```javascript
if (calculatedHash === receivedHash) {
    // Valid webhook from Paynow
} else {
    // Invalid - reject
}
```

---

## Webhook Retry Logic

### Paynow Retry Behavior
- If your endpoint returns **HTTP error** (4xx, 5xx), Paynow retries
- Retries up to **10 times**
- Exponential backoff between retries

### Your Response Strategy

**✅ Success:**
```javascript
res.status(200).send('OK');
```

**❌ Invalid Hash:**
```javascript
res.status(400).send('INVALID_HASH');
```

**❌ Transaction Not Found:**
```javascript
res.status(404).send('TRANSACTION_NOT_FOUND');
```

**❌ Database Error:**
```javascript
res.status(500).send('DATABASE_ERROR');
```

---

## Database Schema Requirements

Your `payment_transactions` table should have these columns:

```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference VARCHAR(100) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    
    -- Paynow fields
    paynow_reference VARCHAR(100),
    poll_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP,
    failed_at TIMESTAMP,
    last_checked_at TIMESTAMP,
    
    -- Wallet integration
    wallet_credited BOOLEAN DEFAULT FALSE,
    
    -- Token support (recurring payments)
    payment_token VARCHAR(255),
    token_expiry VARCHAR(20),
    
    -- Payment details (JSONB for flexibility)
    payment_details JSONB,
    webhook_data JSONB
);
```

---

## Testing Webhooks

### Test with Paynow Sandbox

1. **Make test payment** with small amount ($0.01)
2. **Check Vercel logs** for webhook receipt:
   ```
   📥 PayNow webhook received: { reference: 'ZC-WALLET-123', status: 'Paid' }
   ✅ Wallet credited: user123 10.00
   ✅ Webhook processed successfully: ZC-WALLET-123 Paid
   ```

### Test Hash Validation

**Valid webhook:**
```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/payments/result \
  -d "reference=TEST-123&amount=1.00&status=Paid&hash=VALID_HASH"
```

**Invalid hash (should be rejected):**
```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/payments/result \
  -d "reference=TEST-123&amount=1.00&status=Paid&hash=INVALID"
```

---

## Monitoring Webhooks

### Check Vercel Logs

1. Go to https://vercel.com/jojola/zimcrowd-backend
2. Click **Functions** → **Logs**
3. Filter by `/api/payments/result`

### Look for These Log Messages

**✅ Success:**
```
📥 PayNow webhook received: { reference: 'ZC-WALLET-123', status: 'Paid' }
✅ Wallet credited: user123 10.00
✅ Webhook processed successfully: ZC-WALLET-123 Paid
```

**❌ Hash Validation Failed:**
```
❌ Invalid webhook hash for reference: ZC-WALLET-123
Received: ABC123...
Calculated: XYZ789...
```

**❌ Transaction Not Found:**
```
Transaction not found: ZC-WALLET-123
```

---

## Troubleshooting

### Webhook Not Received

**Check:**
1. Result URL configured in Paynow dashboard
2. URL is publicly accessible (not localhost)
3. Vercel function is deployed
4. No firewall blocking Paynow's IP

**Test URL accessibility:**
```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/payments/result
# Should return 404 or error (not timeout)
```

### Hash Validation Failing

**Possible causes:**
1. Wrong integration key in Vercel env vars
2. Extra spaces in integration key
3. Fields being modified before validation
4. URL encoding issues

**Fix:**
- Verify `PAYNOW_USD_INTEGRATION_KEY` in Vercel
- Copy key exactly from Paynow (no spaces)
- Don't modify webhook data before validation

### Wallet Not Credited

**Check:**
1. `credit_wallet` function exists in Supabase
2. User ID is valid
3. Transaction not already credited (`wallet_credited` flag)
4. Database permissions

**Verify in Supabase:**
```sql
SELECT * FROM payment_transactions 
WHERE reference = 'ZC-WALLET-123';

-- Check wallet_credited column
```

### Duplicate Webhooks

**Paynow may send same webhook multiple times:**
- Use `wallet_credited` flag to prevent double-crediting
- Check if transaction already processed
- Idempotent operations (safe to run multiple times)

---

## Security Best Practices

### ✅ Always Validate Hash
```javascript
const isValid = paynowService.validateWebhookHash(req.body);
if (!isValid) {
    return res.status(400).send('INVALID_HASH');
}
```

### ✅ Verify Transaction Exists
```javascript
const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('reference', reference)
    .single();

if (!transaction) {
    return res.status(404).send('TRANSACTION_NOT_FOUND');
}
```

### ✅ Prevent Double-Crediting
```javascript
if (status === 'paid' && !existingTx.wallet_credited) {
    // Credit wallet
    updateData.wallet_credited = true;
}
```

### ✅ Log Everything
```javascript
console.log('📥 Webhook received:', { reference, status, amount });
console.log('✅ Wallet credited:', userId, amount);
```

### ✅ Use HTTPS Only
- Never use HTTP for webhook URL
- Paynow requires HTTPS

---

## Example Webhook Payloads

### Basic Payment (Web Checkout)
```
reference=ZC-WALLET-1234567890
paynowreference=123456
amount=10.00
status=Paid
pollurl=https%3A%2F%2Fwww.paynow.co.zw%2FInterface%2FCheckPayment%2F%3Fguid%3D...
hash=785659BF4970D86C4F5B9357473B53F43AF3FFA28E6A622D8EF83B69B68E5464...
```

### Mobile Money Payment (EcoCash)
```
reference=ZC-WALLET-1234567890
paynowreference=123456
amount=10.00
status=Paid
pollurl=https%3A%2F%2Fwww.paynow.co.zw%2FInterface%2FCheckPayment%2F%3Fguid%3D...
paymentchannel=Ecocash
paymentinstrument=077****567
hash=785659BF...
```

### Card Payment with Details
```
reference=ZC-WALLET-1234567890
paynowreference=123456
amount=10.00
status=Paid
pollurl=https%3A%2F%2Fwww.paynow.co.zw%2FInterface%2FCheckPayment%2F%3Fguid%3D...
paymentchannel=Visa
paymentinstrument=4111****1111
paymentinstrumentname=JOHN DOE
paymentinstrumentnationality=Domestic
paymentchannelreference=AUTH123456
hash=785659BF...
```

### Recurring Payment with Token
```
reference=ZC-WALLET-1234567890
paynowreference=123456
amount=10.00
status=Paid
pollurl=https%3A%2F%2Fwww.paynow.co.zw%2FInterface%2FCheckPayment%2F%3Fguid%3D...
token=abc123def456
tokenexpiry=31DEC2025
hash=785659BF...
```

---

## Summary

✅ **Your backend is fully configured to handle:**
- All Paynow webhook fields
- Hash validation for security
- Automatic wallet crediting
- Token storage for recurring payments
- Payment instrument details
- Fraud detection data
- All transaction statuses

✅ **Next steps:**
1. Configure Result URL in Paynow dashboard
2. Add integration credentials to Vercel
3. Test with small payment
4. Monitor Vercel logs
5. Verify wallet crediting works

**Webhook URL to configure in Paynow:**
```
https://zimcrowd-backend.vercel.app/api/payments/result
```

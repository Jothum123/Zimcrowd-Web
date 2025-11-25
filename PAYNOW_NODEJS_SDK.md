# 📚 Paynow Node.js SDK - Complete Reference

## Overview

Complete documentation for the official Paynow Node.js library.

**Package:** `paynow`  
**Installation:** `npm install paynow`

---

## Quick Start

### Web Payment

```javascript
const { Paynow } = require('paynow');

const paynow = new Paynow(
    'INTEGRATION_ID',
    'INTEGRATION_KEY',
    'https://example.com/result',
    'https://example.com/return'
);

const payment = paynow.createPayment('INV001', 'user@example.com');
payment.add('Product', 10.00);

const response = await paynow.send(payment);
if (response.success) {
    console.log('Redirect:', response.redirectUrl);
}
```

### Mobile Money

```javascript
const payment = paynow.createPayment('INV002', 'user@example.com');
payment.add('Airtime', 5.00);

const response = await paynow.sendMobile(payment, '0771234567', 'ecocash');
if (response.success) {
    console.log('Instructions:', response.instructions);
}
```

---

## Class: Paynow

### Constructor

```javascript
new Paynow(integrationId, integrationKey, resultUrl, returnUrl)
```

**Parameters:**
- `integrationId` (String) - Merchant integration ID
- `integrationKey` (String) - Merchant integration key
- `resultUrl` (String) - Webhook URL for status updates
- `returnUrl` (String) - Redirect URL after payment

### Properties

- `integrationId` (String) - Merchant's integration ID
- `integrationKey` (String) - Merchant's integration key
- `resultUrl` (String) - Webhook URL
- `returnUrl` (String) - Redirect URL

### Methods

#### createPayment(reference, authEmail): Payment

Create new payment.

```javascript
const payment = paynow.createPayment('INV001', 'user@example.com');
```

#### send(payment): Promise\<InitResponse\>

Send web payment.

```javascript
const response = await paynow.send(payment);
```

#### sendMobile(payment, phone, method): Promise\<InitResponse\>

Send mobile payment.

```javascript
const response = await paynow.sendMobile(payment, '0771234567', 'ecocash');
```

**Methods:** `'ecocash'`, `'onemoney'`

#### pollTransaction(url): Promise\<StatusResponse\>

Check transaction status.

```javascript
const status = await paynow.pollTransaction(pollUrl);
```

#### generateHash(values, integrationKey): String

Generate SHA512 hash.

```javascript
const hash = paynow.generateHash(data, integrationKey);
```

#### verifyHash(values): Boolean

Verify webhook hash.

```javascript
if (paynow.verifyHash(webhookData)) {
    // Valid
}
```

#### parseStatusUpdate(response): StatusResponse

Parse status update.

```javascript
const status = paynow.parseStatusUpdate(queryString);
```

---

## Class: Payment

### Constructor

```javascript
new Payment(reference, authEmail)
```

### Properties

- `reference` (String) - Transaction reference
- `authEmail` (String) - Payer email
- `items` (Array) - Payment items

### Methods

#### add(title, amount): Payment

Add item to payment.

```javascript
payment.add('Product', 10.00);
```

#### total(): Number

Get total amount.

```javascript
const total = payment.total();
```

#### info(): String

Get items description.

```javascript
const description = payment.info();
```

---

## Class: InitResponse

Response from payment initiation.

### Properties

- `success` (Boolean) - Whether initiation succeeded
- `hasRedirect` (Boolean) - Whether redirect URL exists
- `redirectUrl` (String) - Payment page URL
- `pollUrl` (String) - Status polling URL
- `instructions` (String) - USSD instructions (mobile)
- `status` (String) - Status message
- `error` (String) - Error message if failed

### Example

```javascript
const response = await paynow.send(payment);

if (response.success) {
    console.log('Redirect:', response.redirectUrl);
    console.log('Poll URL:', response.pollUrl);
} else {
    console.error('Error:', response.error);
}
```

---

## Class: StatusResponse

Response from status check.

### Properties

- `reference` (String) - Merchant reference
- `paynowreference` (String) - Paynow reference
- `amount` (String) - Transaction amount
- `status` (String) - Transaction status
- `pollurl` (String) - Poll URL
- `error` (String) - Error message

### Status Values

- `'Paid'` - Payment successful
- `'Awaiting Delivery'` - Paid, awaiting delivery
- `'Delivered'` - Order delivered
- `'Cancelled'` - Cancelled
- `'Disputed'` - Disputed
- `'Refunded'` - Refunded
- `'Created'` - Created
- `'Sent'` - Sent to gateway
- `'Failed'` - Failed

### Example

```javascript
const status = await paynow.pollTransaction(pollUrl);

console.log('Status:', status.status);
console.log('Paynow Ref:', status.paynowreference);
console.log('Amount:', status.amount);
```

---

## Complete Examples

### Web Payment with Polling

```javascript
const paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID,
    process.env.PAYNOW_INTEGRATION_KEY,
    'https://example.com/result',
    'https://example.com/return'
);

const payment = paynow.createPayment('INV001', 'user@example.com');
payment.add('Product 1', 10.00);
payment.add('Product 2', 5.50);

const response = await paynow.send(payment);

if (response.success) {
    console.log('Redirect:', response.redirectUrl);
    
    // Poll every 5 seconds
    const interval = setInterval(async () => {
        const status = await paynow.pollTransaction(response.pollUrl);
        
        if (status.status === 'Paid') {
            console.log('✅ Payment successful');
            clearInterval(interval);
        }
    }, 5000);
}
```

### Webhook Handler

```javascript
const express = require('express');
const app = express();
app.use(express.urlencoded({ extended: true }));

app.post('/result', (req, res) => {
    // Verify hash
    if (!paynow.verifyHash(req.body)) {
        return res.status(400).send('INVALID_HASH');
    }
    
    const { status, reference, amount } = req.body;
    
    if (status === 'Paid') {
        // Credit wallet
        creditUserWallet(reference, amount);
    }
    
    res.status(200).send('OK');
});
```

---

## Best Practices

### 1. Environment Variables

```javascript
// ✅ Good
const paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID,
    process.env.PAYNOW_INTEGRATION_KEY,
    process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
);
```

### 2. Verify Hashes

```javascript
// ✅ Always verify
if (!paynow.verifyHash(webhookData)) {
    return res.status(400).send('INVALID_HASH');
}
```

### 3. Unique References

```javascript
// ✅ Unique reference
const ref = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### 4. Error Handling

```javascript
try {
    const response = await paynow.send(payment);
    if (!response.success) {
        console.error('Error:', response.error);
    }
} catch (error) {
    console.error('SDK error:', error);
}
```

### 5. Polling with Timeout

```javascript
const pollWithTimeout = async (pollUrl, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
        const status = await paynow.pollTransaction(pollUrl);
        if (['Paid', 'Failed'].includes(status.status)) {
            return status;
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('Timeout');
};
```

---

## Summary

### Key Classes
- `Paynow` - Main SDK class
- `Payment` - Payment object
- `InitResponse` - Initiation response
- `StatusResponse` - Status response

### Key Methods
- `createPayment()` - Create payment
- `send()` - Send web payment
- `sendMobile()` - Send mobile payment
- `pollTransaction()` - Check status
- `verifyHash()` - Verify webhook

### Security
- ✅ Environment variables
- ✅ Hash verification
- ✅ Error handling
- ✅ Unique references

**📚 Complete SDK documentation!** 📚

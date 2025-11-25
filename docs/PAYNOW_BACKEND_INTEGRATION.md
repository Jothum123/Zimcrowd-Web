# Paynow Backend Integration Guide

## Overview
This document outlines the backend implementation for Paynow payment integration.
**IMPORTANT:** All Paynow API communication must happen server-side. Never expose Integration Keys to the frontend.

---

## Complete Transaction Flow

```
┌──────────────┐     1. Initiate Payment      ┌──────────────┐
│   Frontend   │ ───────────────────────────► │   Backend    │
│   (Browser)  │                              │   (Node.js)  │
└──────────────┘                              └──────┬───────┘
                                                     │
                                                     │ 2. POST to Paynow
                                                     │    (with hash)
                                                     ▼
                                              ┌──────────────┐
                                              │   Paynow     │
                                              │   Server     │
                                              └──────┬───────┘
                                                     │
                    3. Return browserurl/pollurl     │
┌──────────────┐ ◄─────────────────────────────────┘
│   Backend    │
└──────┬───────┘
       │
       │ 4. Redirect customer to browserurl
       ▼
┌──────────────┐     5. Customer pays      ┌──────────────┐
│   Frontend   │ ─────────────────────────►│   Paynow     │
│   (Browser)  │                           │   Checkout   │
└──────────────┘                           └──────┬───────┘
                                                  │
       ┌──────────────────────────────────────────┤
       │                                          │
       │ 6a. POST to resulturl (webhook)          │ 6b. Redirect to returnurl
       ▼                                          ▼
┌──────────────┐                           ┌──────────────┐
│   Backend    │                           │   Frontend   │
│   Callback   │                           │   Return     │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │ 7. Update DB, credit wallet              │ 8. Verify payment
       │                                          │    via /verify endpoint
       ▼                                          ▼
┌──────────────┐                           ┌──────────────┐
│   Database   │                           │   Show       │
│   Updated    │                           │   Result     │
└──────────────┘                           └──────────────┘
```

### Flow Explanation:

1. **Frontend initiates** - User clicks "Pay", frontend calls backend `/paynow/initiate`
2. **Backend POSTs to Paynow** - With hash, amount, reference, returnurl, resulturl
3. **Paynow returns URLs** - `browserurl` (checkout page) and `pollurl` (status check)
4. **Customer redirected** - To Paynow checkout page
5. **Customer pays** - On Paynow's secure page
6. **Two callbacks happen**:
   - **6a. resulturl (webhook)** - Paynow POSTs status to backend
   - **6b. returnurl** - Customer's browser redirected back to merchant
7. **Backend processes webhook** - Updates database, credits wallet
8. **Frontend verifies** - Calls `/verify` endpoint to confirm and show result

---

## Paynow API Endpoints

| Type | URL |
|------|-----|
| Web Checkout | `https://www.paynow.co.zw/interface/initiatetransaction` |
| Express Checkout | `https://www.paynow.co.zw/interface/remotetransaction` |

## Required Environment Variables
```env
PAYNOW_INTEGRATION_ID=your_integration_id
PAYNOW_INTEGRATION_KEY=your_integration_key
PAYNOW_RESULT_URL=https://zimcrowd-backend.vercel.app/api/payments/paynow/callback
PAYNOW_RETURN_URL=https://zimcrowd.com/dashboard?payment=complete
```

---

## Paynow Initiate Transaction Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | Integer | Yes | Integration ID from Paynow dashboard |
| reference | String | Yes | Unique transaction reference |
| amount | Decimal | Yes | Amount to 2 decimal places (no currency symbol) |
| additionalinfo | String | No | Info displayed to customer on Paynow |
| returnurl | String | Yes | URL customer returns to after payment |
| resulturl | String | Yes | URL Paynow posts results to (webhook) |
| authemail | String | No* | Customer email (*Required for Express Checkout) |
| authphone | String | No | Customer mobile number |
| authname | String | No | Customer name |
| status | String | Yes | Must be "Message" for initiation |
| hash | String | Yes | SHA512 hash for verification |

---

## Hash Generation

**CRITICAL:** Every message to/from Paynow must include a hash for authenticity verification.

### Steps to Generate Hash

1. **Concatenate all values** in order (raw form, NOT URL encoded)
2. **Append Integration Key** to the end
3. **UTF-8 encode** the string
4. **Create SHA512 hash** and output as **UPPERCASE hexadecimal**

### Example: Outbound Message

**Message fields:**
```
id=1201
reference=TEST REF
amount=99.99
additionalinfo=A test ticket transaction
returnurl=http://www.google.com/search?q=returnurl
resulturl=http://www.google.com/search?q=resulturl
status=Message
```

**Step 1 - Concatenate values (in order):**
```
1201TEST REF99.99A test ticket transactionhttp://www.google.com/search?q=returnurlhttp://www.google.com/search?q=resulturlMessage
```

**Step 2 - Append Integration Key:**
```
1201TEST REF99.99A test ticket transactionhttp://www.google.com/search?q=returnurlhttp://www.google.com/search?q=resulturlMessage3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977
```

**Step 3 & 4 - SHA512 hash (uppercase hex):**
```
2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689
```

### Hash Generation Code (Node.js)

```javascript
const crypto = require('crypto');

/**
 * Generate SHA512 hash for Paynow
 * @param {Array} values - Array of field values in order
 * @param {string} integrationKey - Your Paynow Integration Key
 * @returns {string} Uppercase hexadecimal SHA512 hash
 */
function generateHash(values, integrationKey) {
    // Step 1 & 2: Concatenate values + integration key
    const concatenated = values.join('') + integrationKey;
    
    // Step 3 & 4: SHA512 hash, uppercase hex
    return crypto
        .createHash('sha512')
        .update(concatenated, 'utf8')
        .digest('hex')
        .toUpperCase();
}

// Example usage for initiate transaction:
const hash = generateHash([
    '1201',                                           // id
    'TEST REF',                                       // reference
    '99.99',                                          // amount
    'A test ticket transaction',                      // additionalinfo
    'http://www.google.com/search?q=returnurl',       // returnurl
    'http://www.google.com/search?q=resulturl',       // resulturl
    'Message'                                         // status
], '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977');

console.log(hash);
// Output: 2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689
```

### Hash Generation Code (PHP)

```php
<?php
function generateHash($values, $integrationKey) {
    // Concatenate values + integration key
    $concatenated = implode('', $values) . $integrationKey;
    
    // SHA512 hash, uppercase hex
    return strtoupper(hash('sha512', $concatenated));
}

// Example usage:
$hash = generateHash([
    '1201',
    'TEST REF',
    '99.99',
    'A test ticket transaction',
    'http://www.google.com/search?q=returnurl',
    'http://www.google.com/search?q=resulturl',
    'Message'
], '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977');

echo $hash;
// Output: 2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689
?>
```

### Hash Generation Code (Python)

```python
import hashlib

def generate_hash(values, integration_key):
    # Concatenate values + integration key
    concatenated = ''.join(values) + integration_key
    
    # SHA512 hash, uppercase hex
    return hashlib.sha512(concatenated.encode('utf-8')).hexdigest().upper()

# Example usage:
hash_value = generate_hash([
    '1201',
    'TEST REF',
    '99.99',
    'A test ticket transaction',
    'http://www.google.com/search?q=returnurl',
    'http://www.google.com/search?q=resulturl',
    'Message'
], '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977')

print(hash_value)
# Output: 2A033FC38798D913D42ECB786B9B19645ADEDBDE788862032F1BD82CF3B92DEF84F316385D5B40DBB35F1A4FD7D5BFE73835174136463CDD48C9366B0749C689
```

### Verifying Incoming Hash

When receiving a message from Paynow (callback or poll response), you MUST validate the hash.

### Example: Validating Inbound Message

**Raw Paynow Response (URL encoded):**
```
status=Ok&browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510&pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413&paynowreference=9510&hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D
```

**Step 1 & 2 - Parse into key/value pairs:**
```javascript
{
    status: 'Ok',
    browserurl: 'https://staging.paynow.co.zw/Payment/ConfirmPayment/9510',
    pollurl: 'https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f770413',
    paynowreference: '9510',
    hash: '750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D'
}
```

**Step 3 - Concatenate all values EXCEPT hash (URL decoded):**
```
Okhttps://staging.paynow.co.zw/Payment/ConfirmPayment/9510https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f7704139510
```

**Step 4 - Append Integration Key:**
```
Okhttps://staging.paynow.co.zw/Payment/ConfirmPayment/9510https://staging.paynow.co.zw/Interface/CheckPayment/?guid=c7ed41da-0159-46da-b428-69549f77041395103e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977
```

**Step 5 - SHA512 hash (uppercase hex):**
```
750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D
```

**Step 6 - Compare:** Hash matches ✅ Message is authentic!

### Hash Validation Code (Node.js)

```javascript
const crypto = require('crypto');

/**
 * Parse URL-encoded Paynow response into object
 * @param {string} responseString - Raw URL-encoded response
 * @returns {Object} Parsed key-value pairs (URL decoded)
 */
function parsePaynowResponse(responseString) {
    const result = {};
    const pairs = responseString.split('&');
    
    for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=');
        // URL decode the value
        const value = decodeURIComponent(valueParts.join('='));
        result[key.toLowerCase()] = value;
    }
    
    return result;
}

/**
 * Generate SHA512 hash for Paynow
 */
function generateHash(values, integrationKey) {
    const concatenated = values.join('') + integrationKey;
    return crypto
        .createHash('sha512')
        .update(concatenated, 'utf8')
        .digest('hex')
        .toUpperCase();
}

/**
 * Verify hash from Paynow response
 * @param {Object} response - Parsed response object (URL decoded values)
 * @param {string} integrationKey - Your Integration Key
 * @returns {boolean} True if hash is valid
 */
function verifyPaynowHash(response, integrationKey) {
    // Get all values EXCEPT hash, in the order they appear
    const values = [];
    
    // Iterate through response in order, skip hash
    for (const [key, value] of Object.entries(response)) {
        if (key !== 'hash' && value) {
            values.push(value);
        }
    }
    
    // Generate expected hash
    const expectedHash = generateHash(values, integrationKey);
    
    // Compare hashes (case-insensitive)
    const receivedHash = response.hash?.toUpperCase();
    const isValid = expectedHash === receivedHash;
    
    if (!isValid) {
        console.error('Hash mismatch!');
        console.error('Expected:', expectedHash);
        console.error('Received:', receivedHash);
    }
    
    return isValid;
}

// Example usage:
const rawResponse = 'status=Ok&browserurl=https%3a%2f%2fstaging.paynow.co.zw%2fPayment%2fConfirmPayment%2f9510&pollurl=https%3a%2f%2fstaging.paynow.co.zw%2fInterface%2fCheckPayment%2f%3fguid%3dc7ed41da-0159-46da-b428-69549f770413&paynowreference=9510&hash=750DD0B0DF374678707BB5AF915AF81C228B9058AD57BB7120569EC68BBB9C2EFC1B26C6375D2BC562AC909B3CD6B2AF1D42E1A5E479FFAC8F4FB3FDCE71DF4D';

const parsed = parsePaynowResponse(rawResponse);
const isValid = verifyPaynowHash(parsed, '3e9fed89-60e1-4ce5-ab6e-6b1eb2d4f977');

console.log('Hash valid:', isValid); // true
```

### Hash Validation in Express Middleware

```javascript
/**
 * Middleware to validate Paynow hash on all callbacks
 */
function validatePaynowHash(req, res, next) {
    // Parse the raw body if it's a string
    let response;
    if (typeof req.body === 'string') {
        response = parsePaynowResponse(req.body);
    } else {
        response = req.body;
    }
    
    // Verify hash
    if (!verifyPaynowHash(response, process.env.PAYNOW_INTEGRATION_KEY)) {
        console.error('❌ Invalid Paynow hash - rejecting request');
        return res.status(400).send('Hash verification failed');
    }
    
    // Attach parsed response to request
    req.paynowData = response;
    next();
}

// Use in routes:
router.post('/paynow/callback', validatePaynowHash, async (req, res) => {
    // Hash already validated, safe to process
    const { reference, status, amount } = req.paynowData;
    // ... process payment
});
```

### Important: Preserve Field Order

When validating, the order of fields matters. Paynow sends fields in a specific order:

**Initiate Response:**
```
status + browserurl + pollurl + paynowreference + hash
```

**Status Update:**
```
reference + paynowreference + amount + status + pollurl + hash
```

To preserve order when parsing, use this approach:

```javascript
/**
 * Parse Paynow response preserving field order
 */
function parsePaynowResponseOrdered(responseString) {
    const result = {};
    const orderedKeys = [];
    const pairs = responseString.split('&');
    
    for (const pair of pairs) {
        const [key, ...valueParts] = pair.split('=');
        const lowerKey = key.toLowerCase();
        const value = decodeURIComponent(valueParts.join('='));
        result[lowerKey] = value;
        orderedKeys.push(lowerKey);
    }
    
    // Return with order preserved
    result._fieldOrder = orderedKeys;
    return result;
}

/**
 * Verify hash using preserved field order
 */
function verifyPaynowHashOrdered(response, integrationKey) {
    const values = [];
    
    // Use the original field order
    for (const key of response._fieldOrder) {
        if (key !== 'hash' && response[key]) {
            values.push(response[key]);
        }
    }
    
    const expectedHash = generateHash(values, integrationKey);
    return expectedHash === response.hash?.toUpperCase();
}
```

### Important Hash Rules

1. **Order matters** - Values must be in the exact order specified
2. **Raw values** - Do NOT URL encode values before hashing
3. **Include only present fields** - Skip empty/null fields
4. **Case sensitive** - Output must be UPPERCASE hex
5. **UTF-8 encoding** - Ensure string is UTF-8 encoded before hashing

### Field Order for Different Messages

**Initiate Transaction:**
```
id + reference + amount + additionalinfo + returnurl + resulturl + authemail + status
```

**Express Checkout (Mobile Money):**
```
id + reference + amount + additionalinfo + returnurl + resulturl + authemail + phone + method + status
```

**Status Update (Callback):**
```
reference + paynowreference + amount + status + pollurl
```

**Trace Request:**
```
id + merchanttrace + status
```

---

## Backend Implementation (Node.js)

```javascript
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const querystring = require('querystring');

const router = express.Router();

// Environment variables
const PAYNOW_ID = process.env.PAYNOW_INTEGRATION_ID;
const PAYNOW_KEY = process.env.PAYNOW_INTEGRATION_KEY;
const PAYNOW_RESULT_URL = process.env.PAYNOW_RESULT_URL;
const PAYNOW_RETURN_URL = process.env.PAYNOW_RETURN_URL;
const PAYNOW_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';

/**
 * Generate SHA512 hash for Paynow
 */
function generateHash(values, integrationKey) {
    const string = values.join('') + integrationKey;
    return crypto.createHash('sha512').update(string).digest('hex').toUpperCase();
}

/**
 * Parse Paynow response (URL encoded string)
 */
function parsePaynowResponse(responseString) {
    const params = new URLSearchParams(responseString);
    const result = {};
    for (const [key, value] of params) {
        result[key.toLowerCase()] = value;
    }
    return result;
}

/**
 * Verify hash from Paynow response
 */
function verifyHash(response, integrationKey) {
    const values = [];
    // Add all fields except hash in the order they appear
    for (const [key, value] of Object.entries(response)) {
        if (key !== 'hash') {
            values.push(value);
        }
    }
    const expectedHash = generateHash(values, integrationKey);
    return expectedHash === response.hash?.toUpperCase();
}

/**
 * POST /api/payments/paynow/initiate
 * Initiates a Paynow transaction
 */
router.post('/paynow/initiate', async (req, res) => {
    try {
        const { amount, method, phone, email, description } = req.body;
        const userId = req.user?.id || 'guest';
        
        // Validate amount
        if (!amount || parseFloat(amount) < 1) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Minimum is $1.00'
            });
        }
        
        // Generate unique reference
        const reference = `ZC-${userId}-${Date.now()}`;
        
        // Build return URL with reference for tracking
        const returnUrl = `${PAYNOW_RETURN_URL}&ref=${reference}`;
        
        // Prepare Paynow request data
        const paynowData = {
            id: PAYNOW_ID,
            reference: reference,
            amount: parseFloat(amount).toFixed(2),
            additionalinfo: description || 'ZimCrowd Wallet Top-up',
            returnurl: returnUrl,
            resulturl: PAYNOW_RESULT_URL,
            status: 'Message'
        };
        
        // Add optional fields
        if (email) {
            paynowData.authemail = email;
        }
        if (phone) {
            paynowData.authphone = phone;
        }
        
        // Generate hash (concatenate values in order + key)
        const hashValues = [
            paynowData.id,
            paynowData.reference,
            paynowData.amount,
            paynowData.additionalinfo,
            paynowData.returnurl,
            paynowData.resulturl,
            paynowData.authemail || '',
            paynowData.status
        ].filter(v => v !== ''); // Remove empty values
        
        paynowData.hash = generateHash(hashValues, PAYNOW_KEY);
        
        // Save pending transaction to database
        await db.transactions.create({
            user_id: userId,
            reference: reference,
            amount: parseFloat(amount),
            method: method,
            status: 'pending',
            created_at: new Date()
        });
        
        // Send POST request to Paynow (URL encoded)
        const response = await axios.post(PAYNOW_URL, 
            querystring.stringify(paynowData),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        // Parse Paynow response
        const paynowResponse = parsePaynowResponse(response.data);
        
        console.log('Paynow Response:', paynowResponse);
        
        // Check for error
        if (paynowResponse.status === 'Error') {
            return res.status(400).json({
                success: false,
                message: paynowResponse.error || 'Payment initiation failed'
            });
        }
        
        // Verify response hash
        if (!verifyHash(paynowResponse, PAYNOW_KEY)) {
            console.error('Hash verification failed');
            return res.status(400).json({
                success: false,
                message: 'Security verification failed'
            });
        }
        
        // Update transaction with poll URL
        await db.transactions.update(
            { poll_url: paynowResponse.pollurl },
            { where: { reference: reference } }
        );
        
        // Return success with redirect URL
        return res.json({
            success: true,
            redirectUrl: paynowResponse.browserurl,
            pollUrl: paynowResponse.pollurl,
            reference: reference
        });
        
    } catch (error) {
        console.error('Paynow initiate error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to initiate payment'
        });
    }
});

/**
 * POST /api/payments/paynow/status
 * Check payment status by polling Paynow
 */
router.post('/paynow/status', async (req, res) => {
    try {
        const { pollUrl } = req.body;
        
        if (!pollUrl) {
            return res.status(400).json({
                success: false,
                message: 'Poll URL is required'
            });
        }
        
        // Poll Paynow for status
        const response = await axios.get(pollUrl);
        const statusResponse = parsePaynowResponse(response.data);
        
        console.log('Paynow Status:', statusResponse);
        
        // Check if paid
        const isPaid = statusResponse.status === 'Paid' || 
                       statusResponse.status === 'Awaiting Delivery' ||
                       statusResponse.status === 'Delivered';
        
        if (isPaid) {
            // Find and update transaction
            const transaction = await db.transactions.findOne({
                where: { poll_url: pollUrl }
            });
            
            if (transaction && transaction.status !== 'completed') {
                // Update transaction status
                await db.transactions.update(
                    { status: 'completed', paynow_reference: statusResponse.paynowreference },
                    { where: { poll_url: pollUrl } }
                );
                
                // Credit user's wallet
                await db.wallets.increment('balance', {
                    by: transaction.amount,
                    where: { user_id: transaction.user_id }
                });
            }
            
            return res.json({
                success: true,
                paid: true,
                status: statusResponse.status,
                amount: transaction?.amount,
                reference: statusResponse.reference
            });
        }
        
        // Return current status
        return res.json({
            success: true,
            paid: false,
            status: statusResponse.status || 'Pending'
        });
        
    } catch (error) {
        console.error('Paynow status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check payment status'
        });
    }
});

/**
 * POST /api/payments/paynow/verify
 * Verify payment by reference (called when customer returns from Paynow)
 */
router.post('/paynow/verify', async (req, res) => {
    try {
        const { reference } = req.body;
        
        if (!reference) {
            return res.status(400).json({
                success: false,
                message: 'Reference is required'
            });
        }
        
        // Find transaction by reference
        const transaction = await db.transactions.findOne({
            where: { reference: reference }
        });
        
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
        
        // If already completed, return success
        if (transaction.status === 'completed') {
            return res.json({
                success: true,
                paid: true,
                status: 'Paid',
                amount: transaction.amount,
                reference: reference
            });
        }
        
        // Poll Paynow for current status using stored poll_url
        if (transaction.poll_url) {
            const response = await axios.get(transaction.poll_url);
            const statusResponse = parsePaynowResponse(response.data);
            
            const isPaid = statusResponse.status === 'Paid' || 
                           statusResponse.status === 'Awaiting Delivery' ||
                           statusResponse.status === 'Delivered';
            
            if (isPaid && transaction.status !== 'completed') {
                // Update transaction
                await db.transactions.update(
                    { 
                        status: 'completed', 
                        paynow_reference: statusResponse.paynowreference,
                        completed_at: new Date()
                    },
                    { where: { reference: reference } }
                );
                
                // Credit wallet
                await db.wallets.increment('balance', {
                    by: transaction.amount,
                    where: { user_id: transaction.user_id }
                });
                
                return res.json({
                    success: true,
                    paid: true,
                    status: 'Paid',
                    amount: transaction.amount,
                    reference: reference
                });
            }
            
            return res.json({
                success: true,
                paid: false,
                status: statusResponse.status || transaction.status
            });
        }
        
        // No poll URL, return current status
        return res.json({
            success: true,
            paid: false,
            status: transaction.status
        });
        
    } catch (error) {
        console.error('Paynow verify error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to verify payment'
        });
    }
});

/**
 * POST /api/payments/paynow/callback
 * Webhook endpoint - Paynow posts Status Updates here (resulturl)
 * 
 * Paynow sends this whenever transaction status changes.
 * Format: URL-encoded POST (application/x-www-form-urlencoded)
 * 
 * IMPORTANT: 
 * - Validate hash before processing
 * - Paynow will retry up to 10 times if HTTP error returned
 * - For important updates (Paid), poll Paynow to confirm
 */
router.post('/paynow/callback', async (req, res) => {
    try {
        console.log('Paynow Status Update received:', req.body);
        
        // Standard Status Update fields
        const { 
            reference,           // Merchant's transaction reference
            paynowreference,     // Paynow's reference number
            amount,              // Final amount (2 decimal places)
            status,              // Transaction status
            pollurl,             // URL to poll for status
            hash,                // Hash for verification
            
            // Optional tokenization fields (if enabled)
            token,               // Payment instrument token for recurring payments
            tokenexpiry,         // Token expiry (DDMMMYYYY format)
            
            // Optional payment instrument details (if enabled)
            paymentchannel,          // e.g. Visa, Mastercard, Ecocash
            paymentinstrument,       // Masked card/MSISDN
            paymentinstrumentname,   // Cardholder name
            paymentinstrumentnationality, // Domestic or Foreign
            paymentchannelreference, // Approval transaction code
            paymentchanneleci,       // Electronic Commerce Indicator
            paymentfraudscore,       // Fraud score
            paymentfrauddecision     // Issue, Request Manual Review, Reject
        } = req.body;
        
        // Verify hash from Paynow (CRITICAL for security)
        const hashValues = [reference, paynowreference, amount, status, pollurl];
        const expectedHash = generateHash(hashValues, PAYNOW_KEY);
        
        if (hash?.toUpperCase() !== expectedHash) {
            console.error('❌ Hash verification failed for:', reference);
            return res.status(400).send('Hash verification failed');
        }
        
        // Find transaction
        const transaction = await db.transactions.findOne({
            where: { reference: reference }
        });
        
        if (!transaction) {
            console.error('❌ Transaction not found:', reference);
            return res.status(404).send('Transaction not found');
        }
        
        // For important updates, poll Paynow to confirm (recommended)
        if (['Paid', 'Awaiting Delivery', 'Delivered'].includes(status)) {
            try {
                const pollResponse = await axios.get(pollurl);
                const pollStatus = parsePaynowResponse(pollResponse.data);
                if (pollStatus.status !== status) {
                    console.warn('⚠️ Poll status mismatch:', status, 'vs', pollStatus.status);
                }
            } catch (pollError) {
                console.warn('⚠️ Could not verify via poll:', pollError.message);
            }
        }
        
        // Process based on status
        switch (status) {
            case 'Paid':
            case 'Awaiting Delivery':
            case 'Delivered':
                // Payment successful - credit wallet
                if (transaction.status !== 'completed') {
                    await db.transactions.update({
                        status: 'completed',
                        paynow_reference: paynowreference,
                        paynow_status: status,
                        payment_channel: paymentchannel || null,
                        payment_instrument: paymentinstrument || null,
                        token: token || null,
                        token_expiry: tokenexpiry || null,
                        completed_at: new Date()
                    }, { where: { reference: reference } });
                    
                    // Credit user's wallet
                    await db.wallets.increment('balance', {
                        by: parseFloat(amount),
                        where: { user_id: transaction.user_id }
                    });
                    
                    console.log(`✅ Payment ${status}: ${reference}, Amount: $${amount}`);
                    
                    // Store token for recurring payments if provided
                    if (token && tokenexpiry) {
                        await db.payment_tokens.upsert({
                            user_id: transaction.user_id,
                            token: token,
                            token_expiry: tokenexpiry,
                            payment_channel: paymentchannel,
                            masked_instrument: paymentinstrument,
                            created_at: new Date()
                        });
                        console.log(`🔐 Token stored for user: ${transaction.user_id}`);
                    }
                }
                break;
                
            case 'Cancelled':
                await db.transactions.update({
                    status: 'cancelled',
                    paynow_status: status
                }, { where: { reference: reference } });
                console.log(`❌ Payment Cancelled: ${reference}`);
                break;
                
            case 'Disputed':
                await db.transactions.update({
                    status: 'disputed',
                    paynow_status: status
                }, { where: { reference: reference } });
                console.log(`⚠️ Payment Disputed: ${reference}`);
                // TODO: Notify admin of dispute
                break;
                
            case 'Refunded':
                if (transaction.status === 'completed') {
                    // Debit the wallet for refund
                    await db.wallets.decrement('balance', {
                        by: parseFloat(amount),
                        where: { user_id: transaction.user_id }
                    });
                }
                await db.transactions.update({
                    status: 'refunded',
                    paynow_status: status,
                    refunded_at: new Date()
                }, { where: { reference: reference } });
                console.log(`💰 Payment Refunded: ${reference}`);
                break;
                
            case 'Created':
            case 'Sent':
                // Transaction in progress, no action needed
                await db.transactions.update({
                    paynow_status: status
                }, { where: { reference: reference } });
                console.log(`⏳ Payment ${status}: ${reference}`);
                break;
                
            default:
                console.log(`ℹ️ Unknown status ${status}: ${reference}`);
        }
        
        // Respond OK to Paynow (prevents retries)
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('Paynow callback error:', error);
        // Return 500 - Paynow will retry
        res.status(500).send('Error');
    }
});

module.exports = router;
```

---

## Status Update Fields Reference

### Standard Fields (Always Sent)

| Field | Type | Description |
|-------|------|-------------|
| reference | String | Merchant's transaction reference |
| amount | Decimal | Final amount (2 decimal places) |
| paynowreference | String | Paynow's reference number |
| pollurl | String | URL to poll for current status |
| status | String | Transaction status (see below) |
| hash | String | SHA512 hash for verification |

### Optional Tokenization Fields

| Field | Type | Description |
|-------|------|-------------|
| token | String | Payment instrument token for recurring payments |
| tokenexpiry | String | Token expiry date (DDMMMYYYY format) |

### Optional Payment Instrument Fields

| Field | Type | Description |
|-------|------|-------------|
| paymentchannel | String | Channel used (Visa, Mastercard, Ecocash) |
| paymentinstrument | String | Masked card number or MSISDN |
| paymentinstrumentname | String | Cardholder name |
| paymentinstrumentnationality | String | Domestic or Foreign |
| paymentchannelreference | String | Approval transaction code |
| paymentchanneleci | String | Electronic Commerce Indicator |
| paymentfraudscore | String | Fraud score |
| paymentfrauddecision | String | Issue, Request Manual Review, Reject |

---

## Transaction Statuses

### Success Statuses (Credit Wallet)

| Status | Description |
|--------|-------------|
| Paid | Transaction paid successfully, funds at next settlement |
| Awaiting Delivery | Paid, in suspense waiting for delivery confirmation |
| Delivered | Delivery acknowledged, funds in suspense for 24hr window |

### Pending Statuses (No Action)

| Status | Description |
|--------|-------------|
| Created | Transaction created, not yet paid |
| Sent | Sent to upstream system, awaiting payment |

### Failure/Other Statuses

| Status | Description |
|--------|-------------|
| Cancelled | Transaction cancelled, cannot be resumed |
| Disputed | Customer disputed, funds held in suspense |
| Refunded | Funds refunded to customer |

---

## Token Usage for Recurring Payments

Tokens are valid for up to **6 months** from issue date (or card expiry, whichever is sooner).

To use a stored token for recurring payment:
```javascript
const paynowData = {
    id: PAYNOW_ID,
    reference: `ZC-${userId}-${Date.now()}`,
    amount: '10.00',
    additionalinfo: 'Monthly subscription',
    returnurl: PAYNOW_RETURN_URL,
    resulturl: PAYNOW_RESULT_URL,
    method: 'vmc',  // or 'zimswitch'
    token: storedToken,
    merchanttrace: `TRACE-${Date.now()}`,  // Must be unique
    status: 'Message',
    hash: generateHash([...], PAYNOW_KEY)
};
```

---

## Mobile Money (Express Checkout)

For EcoCash/OneMoney/InnBucks, use the Express Checkout endpoint:
```
POST https://www.paynow.co.zw/interface/remotetransaction
Content-Type: application/x-www-form-urlencoded
```

### Additional Fields for Express Checkout

| Field | Required For | Type | Description |
|-------|--------------|------|-------------|
| method | All | String | `ecocash`, `onemoney`, `innbucks`, `vmc`, `zimswitch` |
| phone | Mobile Money | String | Subscriber mobile number |
| token | Card Payments | String | Tokenized card from previous transaction |
| merchanttrace | Card Payments | String | Unique per request (prevents duplicates) |

### Express Checkout Backend Implementation

```javascript
/**
 * POST /api/payments/paynow/express
 * Express Checkout for mobile money (EcoCash, OneMoney, InnBucks)
 */
router.post('/paynow/express', async (req, res) => {
    try {
        const { amount, method, phone, email, description } = req.body;
        const userId = req.user?.id || 'guest';
        
        // Validate
        if (!amount || parseFloat(amount) < 1) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }
        if (!phone) {
            return res.status(400).json({ success: false, message: 'Phone number required' });
        }
        if (!['ecocash', 'onemoney', 'innbucks'].includes(method)) {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }
        
        const reference = `ZC-${userId}-${Date.now()}`;
        const returnUrl = `${PAYNOW_RETURN_URL}&ref=${reference}`;
        
        // Prepare Express Checkout data
        const paynowData = {
            id: PAYNOW_ID,
            reference: reference,
            amount: parseFloat(amount).toFixed(2),
            additionalinfo: description || 'ZimCrowd Wallet Top-up',
            returnurl: returnUrl,
            resulturl: PAYNOW_RESULT_URL,
            authemail: email || '',
            phone: phone,
            method: method,
            status: 'Message'
        };
        
        // Generate hash
        const hashValues = [
            paynowData.id,
            paynowData.reference,
            paynowData.amount,
            paynowData.additionalinfo,
            paynowData.returnurl,
            paynowData.resulturl,
            paynowData.authemail,
            paynowData.phone,
            paynowData.method,
            paynowData.status
        ].filter(v => v !== '');
        
        paynowData.hash = generateHash(hashValues, PAYNOW_KEY);
        
        // Save transaction
        await db.transactions.create({
            user_id: userId,
            reference: reference,
            amount: parseFloat(amount),
            method: method,
            phone: phone,
            status: 'pending'
        });
        
        // POST to Paynow Express Checkout
        const PAYNOW_EXPRESS_URL = 'https://www.paynow.co.zw/interface/remotetransaction';
        const response = await axios.post(PAYNOW_EXPRESS_URL,
            querystring.stringify(paynowData),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        const paynowResponse = parsePaynowResponse(response.data);
        console.log('Paynow Express Response:', paynowResponse);
        
        if (paynowResponse.status === 'Error') {
            return res.status(400).json({
                success: false,
                message: paynowResponse.error || 'Payment failed'
            });
        }
        
        // Update transaction with poll URL
        await db.transactions.update(
            { poll_url: paynowResponse.pollurl },
            { where: { reference: reference } }
        );
        
        // Handle InnBucks specific response
        if (method === 'innbucks' && paynowResponse.authorizationcode) {
            return res.json({
                success: true,
                authorizationCode: paynowResponse.authorizationcode,
                authorizationExpires: paynowResponse.authorizationexpires,
                pollUrl: paynowResponse.pollurl,
                reference: reference,
                message: 'Enter the authorization code in your InnBucks app'
            });
        }
        
        // EcoCash/OneMoney response
        return res.json({
            success: true,
            instructions: paynowResponse.instructions || 'Check your phone for the payment prompt',
            pollUrl: paynowResponse.pollurl,
            reference: reference
        });
        
    } catch (error) {
        console.error('Paynow Express error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to initiate payment'
        });
    }
});
```

### InnBucks Response Fields

| Field | Description |
|-------|-------------|
| authorizationcode | Code for customer to enter in InnBucks app |
| authorizationexpires | Expiry datetime (format: d-MMM-yyyy HH:mm) |

**Deep Link for InnBucks app:**
```
schinn.wbpycode://innbucks.co.zw?pymInnCode=XXXXXX
```

---

## Polling for Status Update

Poll Paynow to confirm transaction status. Use only in these scenarios:
1. **Confirm important status updates** - When receiving Paid/Delivered status
2. **Before deleting old transactions** - Confirm status before cleanup

### How to Poll

Perform an **empty HTTP POST** to the `pollurl`:

```javascript
/**
 * Poll Paynow for transaction status
 * @param {string} pollUrl - The pollurl from initiation or status update
 */
async function pollPaynowStatus(pollUrl) {
    try {
        // Empty POST to pollurl
        const response = await axios.post(pollUrl, '', {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        // Parse URL-encoded response
        const statusData = parsePaynowResponse(response.data);
        
        // Verify hash
        const hashValues = [
            statusData.reference,
            statusData.paynowreference,
            statusData.amount,
            statusData.status,
            statusData.pollurl
        ];
        const expectedHash = generateHash(hashValues, PAYNOW_KEY);
        
        if (statusData.hash?.toUpperCase() !== expectedHash) {
            throw new Error('Hash verification failed');
        }
        
        return statusData;
    } catch (error) {
        console.error('Poll error:', error);
        throw error;
    }
}
```

### Poll Response

Same format as Status Update:
```
reference=ABC123&paynowreference=123456&amount=1.00&status=Paid&pollurl=...&hash=...
```

---

## Merchant Trace (Transaction Recovery)

Use `merchanttrace` to recover transaction status when `pollurl` was lost (network error, timeout).

### When to Use Merchant Trace

- Network interruption during Express Checkout
- Timeout before receiving `pollurl`
- Lost transaction reference

### Trace Endpoint

```
POST https://www.paynow.co.zw/interface/trace
Content-Type: application/x-www-form-urlencoded
```

### Trace Request Fields

| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Integration ID |
| merchanttrace | String | Original merchanttrace (up to 32 chars) |
| status | String | Must be "Message" |
| hash | String | SHA512 hash |

### Backend Implementation

```javascript
/**
 * POST /api/payments/paynow/trace
 * Trace a transaction by merchanttrace (for recovery)
 */
router.post('/paynow/trace', async (req, res) => {
    try {
        const { merchanttrace } = req.body;
        
        if (!merchanttrace) {
            return res.status(400).json({
                success: false,
                message: 'Merchant trace is required'
            });
        }
        
        // Prepare trace request
        const traceData = {
            id: PAYNOW_ID,
            merchanttrace: merchanttrace,
            status: 'Message'
        };
        
        // Generate hash
        const hashValues = [traceData.id, traceData.merchanttrace, traceData.status];
        traceData.hash = generateHash(hashValues, PAYNOW_KEY);
        
        // POST to Paynow trace endpoint
        const PAYNOW_TRACE_URL = 'https://www.paynow.co.zw/interface/trace';
        const response = await axios.post(PAYNOW_TRACE_URL,
            querystring.stringify(traceData),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        
        const traceResponse = parsePaynowResponse(response.data);
        
        // Check response status
        if (traceResponse.status === 'NotFound') {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }
        
        if (traceResponse.status === 'Error') {
            return res.status(400).json({
                success: false,
                message: traceResponse.error || 'Trace failed'
            });
        }
        
        // Transaction found - return status update
        return res.json({
            success: true,
            reference: traceResponse.reference,
            paynowReference: traceResponse.paynowreference,
            amount: traceResponse.amount,
            status: traceResponse.status,
            pollUrl: traceResponse.pollurl
        });
        
    } catch (error) {
        console.error('Paynow trace error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to trace transaction'
        });
    }
});
```

### Trace Responses

**Transaction Found:**
```
reference=ABC123&paynowreference=123456&amount=1.00&status=Paid&pollurl=...&hash=...
```

**Transaction Not Found:**
```
status=NotFound&hash=...
```

**Error:**
```
status=Error&error=Trace+failed
```

### Using Merchant Trace in Express Checkout

Always include `merchanttrace` for Express Checkout to enable recovery:

```javascript
const paynowData = {
    id: PAYNOW_ID,
    reference: `ZC-${userId}-${Date.now()}`,
    amount: '10.00',
    // ... other fields ...
    method: 'ecocash',
    phone: '0771234567',
    merchanttrace: `MT-${userId}-${Date.now()}`.substring(0, 32), // Max 32 chars
    status: 'Message',
    hash: generateHash([...], PAYNOW_KEY)
};

// Store merchanttrace in database for recovery
await db.transactions.create({
    reference: paynowData.reference,
    merchanttrace: paynowData.merchanttrace,
    // ... other fields
});
```

---

## Transaction Cleanup Job

Before deleting old/unpaid transactions, always poll to confirm status:

```javascript
/**
 * Cleanup old pending transactions
 * Run as scheduled job (e.g., daily)
 */
async function cleanupOldTransactions() {
    // Find transactions older than 24 hours that are still pending
    const oldTransactions = await db.transactions.findAll({
        where: {
            status: 'pending',
            created_at: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
    });
    
    for (const tx of oldTransactions) {
        try {
            // Poll Paynow to confirm status before deletion
            if (tx.poll_url) {
                const status = await pollPaynowStatus(tx.poll_url);
                
                if (['Paid', 'Awaiting Delivery', 'Delivered'].includes(status.status)) {
                    // Transaction was actually paid! Process it
                    await processSuccessfulPayment(tx, status);
                    continue;
                }
            }
            
            // Safe to mark as expired/delete
            await db.transactions.update(
                { status: 'expired' },
                { where: { id: tx.id } }
            );
            console.log(`Transaction expired: ${tx.reference}`);
            
        } catch (error) {
            console.error(`Error checking transaction ${tx.reference}:`, error);
        }
    }
}
```

---

## Paynow Response Status Values

| Status | Description |
|--------|-------------|
| Ok | Transaction initiated successfully |
| Error | Transaction initiation failed |
| Paid | Customer has paid |
| Awaiting Delivery | Paid, awaiting merchant delivery |
| Delivered | Merchant confirmed delivery |
| Cancelled | Customer cancelled |
| Failed | Transaction failed |
| Disputed | Customer disputed transaction |
| Refunded | Transaction refunded |

---

## Security Checklist

- [ ] Integration Key stored in environment variables only
- [ ] All Paynow communication over HTTPS
- [ ] Hash verified on all incoming responses
- [ ] Hash verified on all webhook callbacks
- [ ] Idempotent transaction processing (handle duplicate callbacks)
- [ ] Transaction logging for audit trail
- [ ] Rate limiting on payment endpoints

---

## Testing

1. Get test credentials from Paynow dashboard
2. Use sandbox URL if available, or test with small amounts
3. Test all payment methods: Web, EcoCash, OneMoney
4. Test callback handling
5. Test hash verification

---

## Frontend Integration

The frontend (`wallet-functions.js`) sends requests to:
- `POST /api/payments/paynow/initiate` - Start payment
- `POST /api/payments/paynow/status` - Poll for status

Frontend handles:
- Redirect to `browserurl` for web checkout
- Display `instructions` for mobile money
- Poll status until paid/failed/cancelled

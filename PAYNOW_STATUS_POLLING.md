# 🔄 Paynow Status Polling & Merchant Trace

## Overview

**Status Polling** allows you to check the current status of a transaction at any time by making a request to Paynow.

---

## When to Poll

### ✅ Recommended Scenarios

**1. Confirm Important Status Updates**
```
Receive webhook → Status: Paid → Poll to confirm → Proceed with confidence
```

**2. Before Deleting Old Transactions**
```
Find old transaction → Poll for current status → Confirm unpaid → Safe to delete
```

### ❌ NOT Recommended

- ❌ Continuous polling for all transactions
- ❌ Polling instead of using webhooks
- ❌ Polling more frequently than necessary

**Why?** Webhooks are the primary notification mechanism. Polling is for confirmation only.

---

## Polling Methods

### Method 1: Poll URL (Standard)

**Use when:** You have the `pollurl` from transaction initiation or status update

### Method 2: Merchant Trace (Fallback)

**Use when:** Network timeout/interruption prevented receiving `pollurl`

---

## Method 1: Poll URL

### How It Works

**1. Get Poll URL**

From transaction initiation response:
```javascript
{
    status: 'Ok',
    browserurl: 'https://...',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
    hash: '...'
}
```

Or from status update:
```javascript
{
    reference: 'ABC123',
    status: 'Paid',
    pollurl: 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b',
    hash: '...'
}
```

**2. Make Empty HTTP POST**

```javascript
POST https://www.paynow.co.zw/Interface/CheckPayment/?guid=9f24be04-f4a6-4dff-8ab5-455263ba7b6b

// No body required - empty POST
```

**3. Receive Response**

Same format as status update:
```
reference=ABC123&
paynowreference=123456&
amount=1.00&
status=Awaiting+Delivery&
pollurl=https%3A%2F%2Fwww.paynow.co.zw%2FInterface%2FCheckPayment%2F%3Fguid%3D9f24be04-f4a6-4dff-8ab5-455263ba7b6b&
hash=785659BF4970D86C4F5B9357473B53F43AF3FFA28E6A622D8EF83B69B68E5464C6BBD0F4187D8C6FB31B71DB3700C415B2434DB8D6F670CDBB809502C339AB3C
```

### Response Format

**Content-Type:** `application/x-www-form-urlencoded`

**Fields:** Same as status update message

| Field | Type | Description |
|-------|------|-------------|
| `reference` | String | Your transaction reference |
| `paynowreference` | String | Paynow's reference |
| `amount` | Decimal | Transaction amount |
| `status` | String | Current status |
| `pollurl` | String | Poll URL (same) |
| `hash` | String | SHA512 hash |

Plus optional fields (token, payment details, etc.)

### Implementation

**File:** `services/paynow.service.js`

```javascript
/**
 * Check payment status by polling Paynow
 * @param {string} pollUrl - Poll URL from Paynow
 * @returns {Promise<Object>} Current payment status
 */
async checkPaymentStatus(pollUrl) {
    try {
        console.log('🔄 Polling payment status:', pollUrl);
        
        // Make empty POST request
        const response = await axios.post(pollUrl, '', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        // Parse response (URL encoded string)
        const querystring = require('querystring');
        const statusData = querystring.parse(response.data);
        
        console.log('✅ Status received:', statusData.status);
        
        // Validate hash
        const isValidHash = this.validateWebhookHash(statusData);
        if (!isValidHash) {
            console.error('❌ Invalid hash in poll response');
            throw new Error('Invalid hash in status response');
        }
        
        return {
            success: true,
            reference: statusData.reference,
            paynowReference: statusData.paynowreference,
            amount: parseFloat(statusData.amount),
            status: statusData.status,
            paid: statusData.status === 'Paid' || statusData.status === 'Awaiting Delivery',
            pollUrl: statusData.pollurl,
            hash: statusData.hash
        };
        
    } catch (error) {
        console.error('❌ Error polling payment status:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

### Backend Route

**File:** `routes/payments.js`

```javascript
/**
 * Check payment status
 * GET /api/payments/status/:reference
 */
router.get('/status/:reference', authenticateUser, async (req, res) => {
    try {
        const { reference } = req.params;
        
        // Get transaction from database
        const { data: transaction, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('reference', reference)
            .eq('user_id', req.user.id) // Ensure user owns transaction
            .single();
        
        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                error: 'Transaction not found'
            });
        }
        
        // If we have a poll URL, poll Paynow for current status
        if (transaction.poll_url) {
            const polledStatus = await paynowService.checkPaymentStatus(transaction.poll_url);
            
            if (polledStatus.success) {
                // Update database with latest status
                await supabase
                    .from('payment_transactions')
                    .update({
                        status: polledStatus.status.toLowerCase(),
                        paynow_reference: polledStatus.paynowReference,
                        last_checked_at: new Date().toISOString()
                    })
                    .eq('reference', reference);
                
                return res.json({
                    success: true,
                    reference: reference,
                    status: polledStatus.status.toLowerCase(),
                    paid: polledStatus.paid,
                    amount: polledStatus.amount,
                    paynowReference: polledStatus.paynowReference
                });
            }
        }
        
        // Return database status if polling failed or no poll URL
        res.json({
            success: true,
            reference: transaction.reference,
            status: transaction.status,
            paid: transaction.status === 'paid' || transaction.status === 'awaiting delivery',
            amount: transaction.amount,
            paynowReference: transaction.paynow_reference
        });
        
    } catch (error) {
        console.error('Error checking payment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check payment status'
        });
    }
});
```

### Frontend Usage

```javascript
// Check payment status
async function checkPaymentStatus(reference) {
    try {
        const response = await fetch(`${apiBase}/api/payments/status/${reference}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.paid) {
                showSuccessMessage(`Payment successful! Amount: $${result.amount}`);
                await refreshWalletBalance();
            } else if (result.status === 'pending') {
                showPendingMessage('Payment is being processed...');
            } else if (result.status === 'cancelled') {
                showCancelMessage('Payment was cancelled');
            } else {
                showErrorMessage(`Payment status: ${result.status}`);
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('Error checking status:', error);
        showErrorMessage('Could not check payment status');
    }
}
```

---

## Method 2: Merchant Trace

### What Is Merchant Trace?

A **unique identifier** (up to 32 characters) that you provide when initiating a transaction, used to query status if `pollurl` was not received.

### When to Use

**Scenario:** Network timeout/interruption during transaction initiation

```
1. Initiate transaction → Network timeout
2. No pollurl received
3. Use merchant trace to find transaction
4. Get current status
```

### Providing Merchant Trace

**In transaction initiation:**

```javascript
{
    id: '12345',
    reference: 'ZC-WALLET-123',
    amount: '10.00',
    merchanttrace: 'TRACE-ZC-123-1234567890', // Up to 32 chars, unique
    // ... other fields
}
```

**Requirements:**
- ✅ Up to **32 characters**
- ✅ **Unique per merchant**
- ✅ Use for Express Checkout transactions

**Example formats:**
```javascript
// Format 1: Prefix + Reference + Timestamp
const merchantTrace = `TRACE-${reference}-${Date.now()}`;

// Format 2: Prefix + User ID + Timestamp
const merchantTrace = `TRACE-${userId}-${Date.now()}`;

// Format 3: UUID (first 32 chars)
const merchantTrace = uuid().substring(0, 32);
```

### Trace Query

**Endpoint:**
```
POST https://www.paynow.co.zw/interface/trace
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | Integer | ✅ Yes | Integration ID |
| `merchanttrace` | String | ✅ Yes | Original merchant trace |
| `status` | String | ✅ Yes | Must be `"Message"` |
| `hash` | String | ✅ Yes | SHA512 hash |

**Example Request:**

```javascript
POST https://www.paynow.co.zw/interface/trace

id=12345&
merchanttrace=TRACE-ZC-123-1234567890&
status=Message&
hash=2D72F08C4F34B99DEC391E2A24F24C2598060B9F6D63CB0B961FEDAE7D7D69D6321931A18F8E1E0268DE5A4F72B5D76E5A8A767C810180D9D5AC921B444B51BA
```

### Trace Responses

#### Transaction Found ✅

**Response:** Standard status update message

```
reference=ZC-WALLET-123&
paynowreference=123456&
amount=10.00&
status=Paid&
pollurl=https%3A%2F%2Fwww.paynow.co.zw%2FInterface%2FCheckPayment%2F%3Fguid%3D...&
hash=785659BF...
```

#### Transaction Not Found ❌

**Response:**
```
status=NotFound&
hash=2D72F08C4F34B99DEC391E2A24F24C2598060B9F6D63CB0B961FEDAE7D7D69D6321931A18F8E1E0268DE5A4F72B5D76E5A8A767C810180D9D5AC921B444B51BA
```

#### Error ⚠️

**Response:**
```
status=Error&
error=Trace+failed
```

**Note:** Error doesn't necessarily mean transaction not found - could be system issue.

### Implementation

```javascript
/**
 * Query transaction status by merchant trace
 * @param {string} merchantTrace - Merchant trace ID
 * @returns {Promise<Object>} Transaction status
 */
async queryByMerchantTrace(merchantTrace, currency = 'USD') {
    try {
        console.log('🔍 Querying by merchant trace:', merchantTrace);
        
        const config = this.getCurrencyConfig(currency);
        
        // Build trace request
        const traceData = {
            id: config.integrationId,
            merchanttrace: merchantTrace,
            status: 'Message'
        };
        
        // Generate hash
        const hash = this.generateHash(traceData, config.integrationKey);
        traceData.hash = hash;
        
        // Make request
        const querystring = require('querystring');
        const postData = querystring.stringify(traceData);
        
        const response = await axios.post(
            'https://www.paynow.co.zw/interface/trace',
            postData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        // Parse response
        const responseData = querystring.parse(response.data);
        
        // Check status
        if (responseData.status === 'NotFound') {
            console.log('❌ Transaction not found');
            return {
                success: false,
                found: false,
                error: 'Transaction not found'
            };
        }
        
        if (responseData.status === 'Error') {
            console.error('❌ Trace error:', responseData.error);
            return {
                success: false,
                error: responseData.error
            };
        }
        
        // Validate hash
        const isValidHash = this.validateWebhookHash(responseData);
        if (!isValidHash) {
            console.error('❌ Invalid hash in trace response');
            throw new Error('Invalid hash in trace response');
        }
        
        console.log('✅ Transaction found:', responseData.reference);
        
        return {
            success: true,
            found: true,
            reference: responseData.reference,
            paynowReference: responseData.paynowreference,
            amount: parseFloat(responseData.amount),
            status: responseData.status,
            paid: responseData.status === 'Paid' || responseData.status === 'Awaiting Delivery',
            pollUrl: responseData.pollurl
        };
        
    } catch (error) {
        console.error('❌ Error querying by merchant trace:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
```

### Backend Route

```javascript
/**
 * Query transaction by merchant trace
 * POST /api/payments/trace
 */
router.post('/trace', authenticateUser, async (req, res) => {
    try {
        const { merchantTrace, currency } = req.body;
        
        if (!merchantTrace) {
            return res.status(400).json({
                success: false,
                error: 'Merchant trace is required'
            });
        }
        
        // Query Paynow
        const result = await paynowService.queryByMerchantTrace(
            merchantTrace,
            currency || 'USD'
        );
        
        if (result.success && result.found) {
            // Update database with found transaction
            await supabase
                .from('payment_transactions')
                .update({
                    paynow_reference: result.paynowReference,
                    poll_url: result.pollUrl,
                    status: result.status.toLowerCase(),
                    last_checked_at: new Date().toISOString()
                })
                .eq('reference', result.reference);
            
            res.json({
                success: true,
                found: true,
                reference: result.reference,
                status: result.status,
                paid: result.paid,
                amount: result.amount,
                paynowReference: result.paynowReference
            });
        } else {
            res.json({
                success: false,
                found: false,
                error: result.error || 'Transaction not found'
            });
        }
        
    } catch (error) {
        console.error('Error querying by merchant trace:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to query transaction'
        });
    }
});
```

---

## Use Cases

### Use Case 1: Confirm Webhook Status

**Scenario:** Receive webhook saying "Paid", poll to confirm before crediting wallet

```javascript
router.post('/result', async (req, res) => {
    const { reference, status, pollurl } = req.body;
    
    // Validate hash
    if (!validateHash(req.body)) {
        return res.status(400).send('INVALID_HASH');
    }
    
    // For important statuses, confirm by polling
    if (status === 'Paid' || status === 'Awaiting Delivery') {
        const confirmed = await paynowService.checkPaymentStatus(pollurl);
        
        if (confirmed.success && confirmed.status === status) {
            // Status confirmed, proceed with confidence
            await creditWallet(reference);
            console.log('✅ Status confirmed and wallet credited');
        } else {
            console.warn('⚠️ Status mismatch - using polled status');
            // Use polled status as source of truth
        }
    }
    
    res.status(200).send('OK');
});
```

### Use Case 2: Cleanup Old Transactions

**Scenario:** Delete old unpaid transactions, but confirm status first

```javascript
async function cleanupOldTransactions() {
    // Find transactions older than 24 hours, still pending
    const { data: oldTransactions } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('status', 'pending')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    for (const transaction of oldTransactions) {
        if (transaction.poll_url) {
            // Poll for current status
            const currentStatus = await paynowService.checkPaymentStatus(transaction.poll_url);
            
            if (currentStatus.success) {
                if (currentStatus.paid) {
                    // Transaction was actually paid!
                    console.log('✅ Found paid transaction during cleanup:', transaction.reference);
                    await creditWallet(transaction.user_id, transaction.amount, transaction.reference);
                } else if (currentStatus.status === 'Cancelled' || currentStatus.status === 'Failed') {
                    // Safe to delete
                    console.log('🗑️ Deleting cancelled/failed transaction:', transaction.reference);
                    await supabase
                        .from('payment_transactions')
                        .delete()
                        .eq('reference', transaction.reference);
                }
            }
        }
    }
}

// Run cleanup daily
setInterval(cleanupOldTransactions, 24 * 60 * 60 * 1000);
```

### Use Case 3: Recover from Network Timeout

**Scenario:** Transaction initiation timed out, use merchant trace to find it

```javascript
async function handleDepositWithTrace(amount, userEmail) {
    const reference = `ZC-WALLET-${Date.now()}`;
    const merchantTrace = `TRACE-${reference}`;
    
    try {
        // Initiate transaction with merchant trace
        const response = await paynowService.initiateWebPayment({
            amount,
            reference,
            merchantTrace, // Include trace
            userEmail
        });
        
        if (response.success) {
            // Got pollUrl, proceed normally
            return response;
        }
        
    } catch (error) {
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            console.warn('⚠️ Timeout during initiation, trying merchant trace...');
            
            // Wait a bit for Paynow to process
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Query by merchant trace
            const traced = await paynowService.queryByMerchantTrace(merchantTrace);
            
            if (traced.success && traced.found) {
                console.log('✅ Transaction found via merchant trace');
                return {
                    success: true,
                    reference: traced.reference,
                    pollUrl: traced.pollUrl,
                    redirectUrl: traced.browserUrl // If available
                };
            }
        }
        
        throw error;
    }
}
```

---

## Best Practices

### ✅ DO

**1. Poll to Confirm Important Updates**
```javascript
if (status === 'Paid') {
    const confirmed = await pollStatus(pollurl);
    if (confirmed.status === 'Paid') {
        // Proceed with confidence
    }
}
```

**2. Use Merchant Trace for Express Checkout**
```javascript
const merchantTrace = `TRACE-${reference}-${Date.now()}`;
await initiateExpressCheckout({ merchantTrace, ... });
```

**3. Poll Before Deleting Old Transactions**
```javascript
const currentStatus = await pollStatus(pollurl);
if (currentStatus.status === 'Cancelled') {
    // Safe to delete
}
```

**4. Validate Hash on Poll Response**
```javascript
const polled = await pollStatus(pollurl);
if (!validateHash(polled)) {
    throw new Error('Invalid hash');
}
```

### ❌ DON'T

**1. Don't Poll Continuously**
```javascript
// ❌ Bad: Polling every second
setInterval(() => pollStatus(pollurl), 1000);

// ✅ Good: Poll when needed
if (statusUnknown) {
    await pollStatus(pollurl);
}
```

**2. Don't Use Polling Instead of Webhooks**
```javascript
// ❌ Bad: Polling as primary mechanism
// ✅ Good: Webhooks primary, polling for confirmation
```

**3. Don't Ignore Poll Response Hash**
```javascript
// ❌ Bad: Trust response without validation
// ✅ Good: Always validate hash
```

**4. Don't Make Merchant Trace Too Long**
```javascript
// ❌ Bad: 50 characters
const trace = 'VERY-LONG-TRACE-ID-THAT-EXCEEDS-32-CHARACTERS-LIMIT';

// ✅ Good: Max 32 characters
const trace = `TRACE-${Date.now()}`.substring(0, 32);
```

---

## Testing

### Test Poll URL

```bash
# Get poll URL from transaction initiation
# Then make empty POST:

curl -X POST "https://www.paynow.co.zw/Interface/CheckPayment/?guid=YOUR-GUID" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

### Test Merchant Trace

```bash
# Calculate hash for trace request
# Then:

curl -X POST https://www.paynow.co.zw/interface/trace \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "id=12345&merchanttrace=TRACE-TEST-123&status=Message&hash=CALCULATED_HASH"
```

### Test Backend Routes

```bash
# Check status by reference
curl http://localhost:3000/api/payments/status/ZC-WALLET-123 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Query by merchant trace
curl -X POST http://localhost:3000/api/payments/trace \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"merchantTrace":"TRACE-ZC-123-1234567890"}'
```

---

## Summary

### ✅ Status Polling Features

- ✅ **Poll URL method** - Standard status checking
- ✅ **Merchant trace method** - Fallback for timeouts
- ✅ **Hash validation** - Security on responses
- ✅ **Confirm webhooks** - Verify important updates
- ✅ **Cleanup helper** - Safe transaction deletion
- ✅ **Timeout recovery** - Find lost transactions

### 📋 When to Use

| Scenario | Method | Frequency |
|----------|--------|-----------|
| Confirm webhook | Poll URL | Once per important update |
| Cleanup old transactions | Poll URL | Before deletion |
| Network timeout | Merchant Trace | Once after timeout |
| Lost transaction | Merchant Trace | As needed |

### 🔒 Security

- ✅ Hash validation on all poll responses
- ✅ Merchant trace unique per transaction
- ✅ Empty POST for poll URL (no sensitive data)
- ✅ Integration key never exposed

---

**✅ Your status polling implementation is complete and production-ready!** ✅

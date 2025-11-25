# 🔔 Paynow Custom Template Notifications

## Overview

When using **Custom Button Templates**, Paynow can send notifications to your server about payment status updates via POST requests.

### Three Types of URLs

| URL Type | Purpose | Method | Data |
|----------|---------|--------|------|
| **Notification URL** | Status updates | POST | Full payment data + hash |
| **Success URL** | Payment success | GET (redirect) | No data |
| **Cancel URL** | Payment cancelled | GET (redirect) | No data |

---

## Notification URL (Webhook)

### What It Does

Paynow **POSTs** payment data to your Notification URL when:
- Payment is completed
- Payment status changes
- Customer completes checkout

### POST Data Fields

#### Standard Fields

| Field | Description | Type | Example |
|-------|-------------|------|---------|
| `Paynow_Reference` | Paynow transaction reference | String | `40222` |
| `Customer_Name` | Customer's name | String | `John Smith` |
| `Customer_Email` | Customer's email | String | `customer@gmail.com` |
| `Customer_Phone` | Customer's phone | String | `0733123456` |
| `Transaction_Amount` | Transaction amount | Number | `25.00` |
| `Amount_Paid` | Amount debited (with fees) | Number | `26.30` |
| `Hash` | SHA512 hash for verification | String | `81D4957A0EB...` |

#### Custom Fields

Any extra fields from your template are included with spaces replaced by underscores:

| Template Field | POST Field | Example Value |
|----------------|------------|---------------|
| Item Colour | `Item_Colour` | `Red` |
| Caption | `Caption` | `Pay when? Pay now!` |
| Size | `Size` | `32` |

### Example POST Data

```
Paynow_Reference=40222
Customer_Name=John Smith
Customer_Email=customer@gmail.com
Customer_Phone=0733123456
Transaction_Amount=25.00
Amount_Paid=26.30
Item_Colour=Red
Caption=Pay when? Pay now!
Size=32
Hash=81D4957A0EB18F8079D33E5C0AF0F0F604D6F127F3C9EC90D09FDB9001E1197CB0B27638348BD9FDB1ED72DA608306F7E050C9445BFA08AC1A71F83F500CA59C
```

---

## Hash Verification

### Why Verify Hash?

**Security:** Ensures the notification is actually from Paynow, not a spoofed request.

### Verification Steps

**1. Concatenate key + value pairs (excluding Hash)**
```javascript
let hashString = '';
hashString += 'Paynow_Reference' + '40222';
hashString += 'Customer_Name' + 'John Smith';
hashString += 'Customer_Email' + 'customer@gmail.com';
hashString += 'Customer_Phone' + '0733123456';
hashString += 'Transaction_Amount' + '25.00';
hashString += 'Amount_Paid' + '26.30';
hashString += 'Item_Colour' + 'Red';
hashString += 'Caption' + 'Pay when? Pay now!';
hashString += 'Size' + '32';
```

**2. Append Integration Key**
```javascript
hashString += 'YOUR_INTEGRATION_KEY';
```

**3. UTF-8 Encode** (automatic in Node.js)

**4. SHA512 Hash → Uppercase Hex**
```javascript
const calculatedHash = crypto
    .createHash('sha512')
    .update(hashString, 'utf8')
    .digest('hex')
    .toUpperCase();
```

**5. Compare**
```javascript
if (calculatedHash === receivedHash) {
    // Valid notification from Paynow
} else {
    // Invalid - reject
}
```

### Implementation

**✅ Created: `routes/paynow-notifications.js`**

```javascript
function verifyNotificationHash(postData, integrationKey) {
    const receivedHash = postData.Hash;
    
    // Concatenate key + value pairs
    let hashString = '';
    const keys = Object.keys(postData).filter(key => key !== 'Hash');
    
    keys.forEach(key => {
        hashString += key + postData[key];
    });
    
    // Append integration key
    hashString += integrationKey;
    
    // Generate SHA512 hash
    const calculatedHash = crypto
        .createHash('sha512')
        .update(hashString, 'utf8')
        .digest('hex')
        .toUpperCase();
    
    return calculatedHash === receivedHash.toUpperCase();
}
```

---

## Backend Routes

### 1. Notification Handler

```javascript
POST /api/paynow-notifications/notification

// Paynow POSTs data here
// Verifies hash
// Stores notification
// Updates transaction
// Credits wallet
// Responds with 200 OK
```

**Example Handler:**
```javascript
router.post('/notification', async (req, res) => {
    const {
        Paynow_Reference,
        Customer_Name,
        Customer_Email,
        Transaction_Amount,
        Hash,
        ...customFields
    } = req.body;
    
    // Verify hash
    const isValid = verifyNotificationHash(req.body, integrationKey);
    if (!isValid) {
        return res.status(400).send('INVALID_HASH');
    }
    
    // Store notification
    await supabase.from('paynow_notifications').insert({
        paynow_reference: Paynow_Reference,
        customer_name: Customer_Name,
        customer_email: Customer_Email,
        transaction_amount: parseFloat(Transaction_Amount),
        custom_fields: customFields
    });
    
    // Update transaction and credit wallet
    // ...
    
    res.status(200).send('OK');
});
```

### 2. Success Redirect

```javascript
GET /api/paynow-notifications/success

// Customer redirected here after successful payment
// No POST data
// Redirect to frontend success page
```

**Example:**
```javascript
router.get('/success', (req, res) => {
    res.redirect('https://zimcrowd.com/dashboard.html?payment=success');
});
```

### 3. Cancel Redirect

```javascript
GET /api/paynow-notifications/cancel

// Customer redirected here if they cancel
// No POST data
// Redirect to frontend cancel page
```

**Example:**
```javascript
router.get('/cancel', (req, res) => {
    res.redirect('https://zimcrowd.com/dashboard.html?payment=cancelled');
});
```

---

## Configuration in Paynow

### Setting Up URLs in Custom Template

**1. Edit Your Custom Template**
- Login to Paynow
- Go to your Custom Button Template
- Click **"Edit"**

**2. Configure URLs**

| Field | URL | Purpose |
|-------|-----|---------|
| **Notification URL** | `https://zimcrowd-backend.vercel.app/api/paynow-notifications/notification` | Receives POST data |
| **Success URL** | `https://zimcrowd-backend.vercel.app/api/paynow-notifications/success` | Success redirect |
| **Cancel URL** | `https://zimcrowd-backend.vercel.app/api/paynow-notifications/cancel` | Cancel redirect |

**3. Get Integration Key**
- In the template edit page
- Copy the **Integration Key**
- Add to your environment variables

---

## Environment Variables

Add to your backend (Vercel):

```env
# Template Integration Key (from Paynow template settings)
PAYNOW_TEMPLATE_INTEGRATION_KEY=your_template_integration_key

# Or use your main integration key if same
PAYNOW_USD_INTEGRATION_KEY=your_main_integration_key

# Frontend URL for redirects
FRONTEND_URL=https://zimcrowd.com
```

---

## Database Schema

### Create Notifications Table

```sql
CREATE TABLE paynow_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paynow_reference VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    transaction_amount DECIMAL(10, 2),
    amount_paid DECIMAL(10, 2),
    custom_fields JSONB,
    notification_data JSONB,
    received_at TIMESTAMP DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_paynow_notifications_reference 
ON paynow_notifications(paynow_reference);

CREATE INDEX idx_paynow_notifications_email 
ON paynow_notifications(customer_email);
```

---

## Flow Diagram

```
Customer fills form on Paynow
         ↓
Customer completes payment
         ↓
    ┌────────────────────────────────┐
    │                                │
    ↓                                ↓
Notification URL              Success/Cancel URL
(POST with data)              (GET redirect)
    ↓                                ↓
Verify hash                   Redirect to frontend
    ↓                                ↓
Store notification            Show success/cancel page
    ↓
Update transaction
    ↓
Credit wallet
    ↓
Send confirmation email
    ↓
Respond 200 OK
```

---

## Example Notification Processing

```javascript
router.post('/notification', async (req, res) => {
    try {
        // 1. Extract data
        const {
            Paynow_Reference,
            Customer_Name,
            Customer_Email,
            Customer_Phone,
            Transaction_Amount,
            Amount_Paid,
            Hash,
            // Custom fields from template
            Item_Colour,
            Caption,
            Size
        } = req.body;
        
        // 2. Verify hash
        const isValid = verifyNotificationHash(
            req.body, 
            process.env.PAYNOW_TEMPLATE_INTEGRATION_KEY
        );
        
        if (!isValid) {
            console.error('Invalid hash - possible spoofed request');
            return res.status(400).send('INVALID_HASH');
        }
        
        // 3. Store notification
        await supabase.from('paynow_notifications').insert({
            paynow_reference: Paynow_Reference,
            customer_name: Customer_Name,
            customer_email: Customer_Email,
            customer_phone: Customer_Phone,
            transaction_amount: parseFloat(Transaction_Amount),
            amount_paid: parseFloat(Amount_Paid),
            custom_fields: {
                item_colour: Item_Colour,
                caption: Caption,
                size: Size
            }
        });
        
        // 4. Find related order/transaction
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('customer_email', Customer_Email)
            .eq('amount', Transaction_Amount)
            .eq('status', 'pending')
            .single();
        
        if (order) {
            // 5. Update order status
            await supabase
                .from('orders')
                .update({
                    status: 'paid',
                    paynow_reference: Paynow_Reference,
                    paid_at: new Date().toISOString(),
                    product_details: {
                        colour: Item_Colour,
                        caption: Caption,
                        size: Size
                    }
                })
                .eq('id', order.id);
            
            // 6. Process fulfillment
            await processOrderFulfillment(order.id);
            
            // 7. Send confirmation email
            await sendOrderConfirmation(Customer_Email, order.id);
        }
        
        // 8. Respond to Paynow
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('Error processing notification:', error);
        res.status(500).send('ERROR');
    }
});
```

---

## Testing

### Test Hash Verification

```javascript
POST /api/paynow-notifications/test-hash

{
  "data": {
    "Paynow_Reference": "40222",
    "Customer_Name": "John Smith",
    "Customer_Email": "test@example.com",
    "Transaction_Amount": "25.00",
    "Hash": "81D4957A0EB..."
  },
  "integrationKey": "your_integration_key"
}

Response:
{
  "success": true,
  "isValid": true,
  "receivedHash": "81D4957A0EB...",
  "calculatedHash": "81D4957A0EB...",
  "hashString": "Paynow_Reference40222Customer_NameJohn Smith..."
}
```

### Test Notification Locally

```bash
# Simulate Paynow notification
curl -X POST http://localhost:3000/api/paynow-notifications/notification \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Paynow_Reference=TEST123&Customer_Name=Test User&Customer_Email=test@example.com&Transaction_Amount=10.00&Amount_Paid=10.50&Hash=YOUR_CALCULATED_HASH"
```

### Generate Test Hash

```javascript
const crypto = require('crypto');

const data = {
    Paynow_Reference: 'TEST123',
    Customer_Name: 'Test User',
    Customer_Email: 'test@example.com',
    Transaction_Amount: '10.00',
    Amount_Paid: '10.50'
};

const integrationKey = 'your_key';

let hashString = '';
Object.keys(data).forEach(key => {
    hashString += key + data[key];
});
hashString += integrationKey;

const hash = crypto
    .createHash('sha512')
    .update(hashString, 'utf8')
    .digest('hex')
    .toUpperCase();

console.log('Hash:', hash);
```

---

## Security Best Practices

### ✅ Always Verify Hash
```javascript
const isValid = verifyNotificationHash(req.body, integrationKey);
if (!isValid) {
    return res.status(400).send('INVALID_HASH');
}
```

### ✅ Store All Notifications
```javascript
// Keep audit trail
await supabase.from('paynow_notifications').insert({
    notification_data: req.body,
    received_at: new Date().toISOString()
});
```

### ✅ Idempotent Processing
```javascript
// Check if already processed
const { data: existing } = await supabase
    .from('paynow_notifications')
    .select('*')
    .eq('paynow_reference', Paynow_Reference)
    .eq('processed', true)
    .single();

if (existing) {
    console.log('Already processed');
    return res.status(200).send('OK');
}
```

### ✅ Log Everything
```javascript
console.log('📥 Notification received:', {
    reference: Paynow_Reference,
    amount: Transaction_Amount,
    customer: Customer_Email
});
```

### ✅ Use HTTPS Only
- Never use HTTP for notification URLs
- Paynow requires HTTPS

---

## Troubleshooting

### Notification Not Received

**Check:**
1. Notification URL is correct in Paynow template
2. URL is publicly accessible (not localhost)
3. Vercel function is deployed
4. No firewall blocking Paynow's IP

**Test URL:**
```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/paynow-notifications/notification
# Should return 400 (missing data) not timeout
```

### Hash Validation Failing

**Possible causes:**
1. Wrong integration key
2. Extra spaces in integration key
3. Field order mismatch
4. Character encoding issues

**Debug:**
```javascript
console.log('Received hash:', receivedHash);
console.log('Calculated hash:', calculatedHash);
console.log('Hash string:', hashString);
```

### Duplicate Notifications

**Solution:**
```javascript
// Check if already processed
const { data: existing } = await supabase
    .from('paynow_notifications')
    .select('*')
    .eq('paynow_reference', Paynow_Reference)
    .eq('processed', true)
    .single();

if (existing) {
    return res.status(200).send('OK'); // Already processed
}
```

---

## Frontend Handling

### Detect Return from Paynow

```javascript
// dashboard.html
const urlParams = new URLSearchParams(window.location.search);
const paymentStatus = urlParams.get('payment');
const source = urlParams.get('source');

if (paymentStatus === 'success' && source === 'template') {
    showSuccessModal('Payment completed successfully!');
} else if (paymentStatus === 'cancelled' && source === 'template') {
    showCancelModal('Payment was cancelled');
}
```

### Success Modal

```javascript
function showSuccessModal(message) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                    background: rgba(0,0,0,0.8); display: flex; 
                    align-items: center; justify-content: center; z-index: 10000;">
            <div style="background: #1e293b; border-radius: 20px; 
                        padding: 40px; max-width: 450px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
                <h2 style="color: #10b981; margin-bottom: 15px;">Payment Successful!</h2>
                <p style="color: #94a3b8; margin-bottom: 30px;">${message}</p>
                <button onclick="this.closest('div').remove(); location.reload();" 
                        class="btn-primary">Continue</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
```

---

## Summary

### ✅ Features Implemented
- Notification URL handler with POST data
- Hash verification for security
- Success/Cancel redirect handlers
- Database storage for notifications
- Transaction processing
- Wallet crediting
- Test endpoints

### ✅ Routes Created
- `POST /api/paynow-notifications/notification` - Webhook handler
- `GET /api/paynow-notifications/success` - Success redirect
- `GET /api/paynow-notifications/cancel` - Cancel redirect
- `GET /api/paynow-notifications/history` - View notifications
- `POST /api/paynow-notifications/test-hash` - Test hash generation

### 📋 Configuration Required
1. Add Notification/Success/Cancel URLs to Paynow template
2. Get Integration Key from template
3. Add to Vercel environment variables
4. Create `paynow_notifications` table in Supabase
5. Test with small payment

### 🔒 Security
- ✅ Hash verification on all notifications
- ✅ HTTPS required
- ✅ Audit trail in database
- ✅ Idempotent processing

---

**Your notification system is ready for custom button templates!** ✅

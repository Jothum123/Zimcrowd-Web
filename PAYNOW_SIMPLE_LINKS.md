# 🔗 Paynow Simple Payment Links

## Overview

Simple Payment Links provide an **alternative to full API integration**. Instead of using the Paynow SDK, you generate direct URLs that redirect users to Paynow's payment page.

### When to Use Simple Links

**✅ Use Simple Links for:**
- Quick payment requests via email
- Embedding payment buttons on websites
- Invoices and billing
- Donations (unlocked amounts)
- Simple integrations without webhooks

**❌ Use Full API Integration for:**
- Automated payment processing
- Mobile money (EcoCash, OneMoney)
- Real-time status updates via webhooks
- Complex payment flows
- Wallet crediting automation

---

## How It Works

### 1. Generate Link
```
Merchant creates link with:
- Merchant email
- Amount (optional)
- Reference (optional)
- Locked flag (optional)
```

### 2. Share Link
```
Link is shared via:
- Email
- Website button
- SMS
- Social media
```

### 3. Customer Pays
```
Customer clicks link →
Redirected to Paynow →
Makes payment →
Paynow notifies merchant
```

---

## Link Format

### Base URL
```
https://www.paynow.co.zw/payment/link/[customer-email]?q=[encoded-arguments]
```

### Arguments

| Argument | Key | Type | Description | Required |
|----------|-----|------|-------------|----------|
| Merchant Email | `search` | String | Your Paynow email | ✅ Yes |
| Amount | `amount` | Number | Payment amount | ❌ No |
| Reference | `reference` | String | Payment reference | ❌ No |
| Locked | `l` | 0 or 1 | Lock amount/reference | ❌ No |

### Encoding Process

1. **URL encode** each argument value
2. **Construct** key=value pairs with `&`
3. **Base64 encode** the entire string
4. **URL encode** the base64 result
5. **Append** as `?q=` parameter

---

## Implementation

### Backend Utility

**✅ Created: `utils/paynow-link-generator.js`**

```javascript
const { generatePaynowLink } = require('./utils/paynow-link-generator');

// Generate payment link
const link = generatePaynowLink({
    merchantEmail: 'jothum@zimcrowd.co.zw',
    amount: 10.00,
    reference: 'INV-12345',
    locked: true,
    customerEmail: 'customer@example.com'
});

console.log(link);
// https://www.paynow.co.zw/payment/link/customer@example.com?q=c2VhcmNoPWpvdGh1bSU0MHppbWNyb3dkLmNvLnp3JmFtb3VudD0xMC4wMCZyZWZlcmVuY2U9SU5WLTEyMzQ1Jmw9MQ%3D%3D
```

### Backend Routes

**✅ Created: `routes/paynow-links.js`**

#### 1. Generate Custom Link
```javascript
POST /api/paynow-links/generate

{
  "merchantEmail": "jothum@zimcrowd.co.zw",
  "amount": 10.00,
  "reference": "INV-12345",
  "locked": true,
  "customerEmail": "customer@example.com"
}

Response:
{
  "success": true,
  "paymentLink": "https://www.paynow.co.zw/payment/link/...",
  "details": {
    "merchantEmail": "jothum@zimcrowd.co.zw",
    "amount": 10.00,
    "reference": "INV-12345",
    "locked": true
  }
}
```

#### 2. Generate Deposit Link
```javascript
POST /api/paynow-links/deposit

{
  "userId": "user123",
  "amount": 25.00,
  "userEmail": "user@example.com"
}

Response:
{
  "success": true,
  "paymentLink": "https://www.paynow.co.zw/payment/link/...",
  "reference": "ZC-WALLET-user123-1234567890",
  "amount": 25.00,
  "message": "Click the link to complete your deposit"
}
```

#### 3. Generate Invoice Link
```javascript
POST /api/paynow-links/invoice

{
  "invoiceNumber": "INV-12345",
  "amount": 150.00,
  "customerEmail": "client@example.com"
}

Response:
{
  "success": true,
  "paymentLink": "https://www.paynow.co.zw/payment/link/...",
  "invoiceNumber": "INV-12345",
  "amount": 150.00
}
```

#### 4. Generate Donation Link (Unlocked)
```javascript
POST /api/paynow-links/donation

{
  "campaignId": "CAMPAIGN-001",
  "donorEmail": "donor@example.com"
}

Response:
{
  "success": true,
  "paymentLink": "https://www.paynow.co.zw/payment/link/...",
  "campaignId": "CAMPAIGN-001",
  "message": "Donor can choose their donation amount"
}
```

#### 5. Parse Payment Link
```javascript
POST /api/paynow-links/parse

{
  "url": "https://www.paynow.co.zw/payment/link/...?q=..."
}

Response:
{
  "success": true,
  "details": {
    "merchantEmail": "jothum@zimcrowd.co.zw",
    "amount": 10.00,
    "reference": "INV-12345",
    "locked": true,
    "customerEmail": "customer@example.com"
  }
}
```

---

## Frontend Integration

### Add to API Config

```javascript
// js/api-config-new.js
PAYNOW_LINK_GENERATE: `${this.BASE_URL}/api/paynow-links/generate`,
PAYNOW_LINK_DEPOSIT: `${this.BASE_URL}/api/paynow-links/deposit`,
PAYNOW_LINK_INVOICE: `${this.BASE_URL}/api/paynow-links/invoice`,
```

### Generate Link in Frontend

```javascript
// Generate deposit link
async function generateDepositLink(amount) {
    const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    const userEmail = localStorage.getItem('userEmail');
    
    const response = await fetch(`${apiBase}/api/paynow-links/deposit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            userId,
            amount: parseFloat(amount),
            userEmail
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        // Redirect to payment link
        window.location.href = result.paymentLink;
    }
}
```

### Payment Button

```html
<button onclick="generateAndPay(10.00)" class="btn-primary">
    Pay $10.00
</button>

<script>
async function generateAndPay(amount) {
    try {
        const response = await fetch('/api/paynow-links/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: 'user123',
                amount: amount,
                userEmail: 'user@example.com'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Redirect to Paynow
            window.location.href = result.paymentLink;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to generate payment link');
    }
}
</script>
```

---

## Examples

### Example 1: Locked Payment (Invoice)

**Input:**
```javascript
{
  merchantEmail: 'jothum@zimcrowd.co.zw',
  amount: 12.50,
  reference: 'ABC123',
  locked: true
}
```

**Process:**
```
1. URL encode: search=jothum%40zimcrowd.co.zw&amount=12.50&reference=ABC123&l=1
2. Base64: c2VhcmNoPWpvdGh1bSU0MHppbWNyb3dkLmNvLnp3JmFtb3VudD0xMi41MCZyZWZlcmVuY2U9QUJDMTIzJmw9MQ==
3. URL encode: c2VhcmNoPWpvdGh1bSU0MHppbWNyb3dkLmNvLnp3JmFtb3VudD0xMi41MCZyZWZlcmVuY2U9QUJDMTIzJmw9MQ%3D%3D
```

**Output:**
```
https://www.paynow.co.zw/payment/link?q=c2VhcmNoPWpvdGh1bSU0MHppbWNyb3dkLmNvLnp3JmFtb3VudD0xMi41MCZyZWZlcmVuY2U9QUJDMTIzJmw9MQ%3D%3D
```

### Example 2: Unlocked Donation

**Input:**
```javascript
{
  merchantEmail: 'jothum@zimcrowd.co.zw',
  reference: 'DONATION-001',
  locked: false
}
```

**Output:**
```
https://www.paynow.co.zw/payment/link?q=c2VhcmNoPWpvdGh1bSU0MHppbWNyb3dkLmNvLnp3JnJlZmVyZW5jZT1ET05BVElPTi0wMDE=
```

**Result:** Customer can enter any amount they want to donate.

### Example 3: With Customer Email

**Input:**
```javascript
{
  merchantEmail: 'jothum@zimcrowd.co.zw',
  amount: 50.00,
  reference: 'INV-789',
  locked: true,
  customerEmail: 'customer@gmail.com'
}
```

**Output:**
```
https://www.paynow.co.zw/payment/link/customer@gmail.com?q=c2VhcmNoPWpvdGh1bSU0MHppbWNyb3dkLmNvLnp3JmFtb3VudD01MC4wMCZyZWZlcmVuY2U9SU5WLTc4OSZsPTE=
```

**Result:** Customer is auto-logged in at Paynow if they have an account with that email.

---

## Comparison: Simple Links vs Full API

| Feature | Simple Links | Full API Integration |
|---------|--------------|---------------------|
| **Setup** | ✅ Very easy | ⚠️ Moderate |
| **Webhooks** | ❌ No | ✅ Yes |
| **Mobile Money** | ❌ No | ✅ Yes (EcoCash, OneMoney) |
| **Status Polling** | ❌ Manual | ✅ Automatic |
| **Wallet Credit** | ❌ Manual | ✅ Automatic |
| **Customization** | ⚠️ Limited | ✅ Full control |
| **Use Case** | Invoices, donations | Full payment system |
| **Customer Experience** | Redirect to Paynow | Can stay on your site |

---

## Security Considerations

### ⚠️ Important Limitations

**1. Customer Can Modify Values**
- Even if `locked=1`, technically savvy users can decode and modify
- Always verify amount and reference after payment
- Don't rely solely on link parameters

**2. No Webhook Integration**
- You won't receive automatic status updates
- Must manually check Paynow dashboard
- Or use full API integration for webhooks

**3. Best Practices**
```javascript
// ✅ DO: Verify payment details after receiving payment
if (receivedAmount === expectedAmount && 
    receivedReference === expectedReference) {
    // Process payment
}

// ❌ DON'T: Trust link parameters alone
// Customer could have modified them
```

---

## Use Cases

### 1. Email Invoices
```javascript
const link = generateInvoiceLink({
    invoiceNumber: 'INV-12345',
    amount: 150.00,
    customerEmail: 'client@example.com'
});

// Send in email:
// "Click here to pay your invoice: [link]"
```

### 2. Website Donation Button
```javascript
const link = generateDonationLink({
    campaignId: 'SAVE-WILDLIFE',
    donorEmail: '' // Let them enter email
});

// <a href="[link]">Donate Now</a>
```

### 3. Quick Wallet Top-up
```javascript
const link = generateDepositLink({
    userId: 'user123',
    amount: 25.00,
    userEmail: 'user@example.com'
});

// Redirect user to link
window.location.href = link;
```

### 4. SMS Payment Request
```
Hi John,
Please pay your invoice here:
https://www.paynow.co.zw/payment/link/...
Amount: $50.00
Ref: INV-789
```

---

## Testing

### Test Link Generation

```javascript
const { generatePaynowLink } = require('./utils/paynow-link-generator');

// Test 1: Basic link
const link1 = generatePaynowLink({
    merchantEmail: 'test@example.com',
    amount: 10.00,
    reference: 'TEST-001',
    locked: true
});
console.log('Link 1:', link1);

// Test 2: Unlocked donation
const link2 = generatePaynowLink({
    merchantEmail: 'test@example.com',
    reference: 'DONATION',
    locked: false
});
console.log('Link 2:', link2);

// Test 3: With customer email
const link3 = generatePaynowLink({
    merchantEmail: 'test@example.com',
    amount: 25.00,
    reference: 'TEST-003',
    locked: true,
    customerEmail: 'customer@test.com'
});
console.log('Link 3:', link3);
```

### Test in Browser

1. Generate a test link
2. Open link in browser
3. Should redirect to Paynow payment page
4. Verify amount and reference are correct
5. Complete test payment (if in production)

---

## Integration Steps

### 1. Add Routes to Backend

```javascript
// server.js or app.js
const paynowLinksRoutes = require('./routes/paynow-links');
app.use('/api/paynow-links', paynowLinksRoutes);
```

### 2. Update Frontend API Config

```javascript
// js/api-config-new.js
PAYNOW_LINK_GENERATE: `${this.BASE_URL}/api/paynow-links/generate`,
PAYNOW_LINK_DEPOSIT: `${this.BASE_URL}/api/paynow-links/deposit`,
```

### 3. Add Deposit Link Option to Wallet

```javascript
// wallet-functions.js
function showDepositOptions() {
    // Option 1: Full API (with mobile money)
    // Option 2: Simple Link (redirect to Paynow)
    
    if (method === 'simple_link') {
        const link = await generateDepositLink(amount);
        window.location.href = link;
    }
}
```

### 4. Test

```bash
# Test link generation
curl -X POST http://localhost:3000/api/paynow-links/deposit \
  -H "Content-Type: application/json" \
  -d '{"userId":"test123","amount":10,"userEmail":"test@example.com"}'
```

---

## Summary

### ✅ Created Files
1. `utils/paynow-link-generator.js` - Link generation utility
2. `routes/paynow-links.js` - Backend routes
3. `PAYNOW_SIMPLE_LINKS.md` - This documentation

### ✅ Features
- Generate locked/unlocked payment links
- Deposit links for wallet top-ups
- Invoice payment links
- Donation links
- Parse existing links

### ⚠️ Limitations
- No webhook integration
- No mobile money support
- Customer can potentially modify values
- Manual payment verification required

### 💡 Recommendation
- Use **Simple Links** for invoices, donations, simple payments
- Use **Full API Integration** for automated wallet deposits, mobile money, real-time updates

---

**Your simple payment link system is ready to use!** ✅

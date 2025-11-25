# 🎨 Paynow Advanced Payment Buttons

## Overview

Advanced Payment Buttons allow customers to enter additional details about products/services using **Custom Button Templates** created in your Paynow account.

### Difference from Simple Links

| Feature | Simple Links | Advanced Links |
|---------|--------------|----------------|
| **Custom Fields** | ❌ No | ✅ Yes (f1, f2, f3...) |
| **Quantity Support** | ❌ No | ✅ Yes |
| **Template Required** | ❌ No | ✅ Yes (from Paynow) |
| **Use Case** | Invoices, donations | Products, services |
| **URL** | `/payment/link` | `/payment/billpaymentlink` |

---

## Prerequisites

### 1. Create Custom Button Template in Paynow

**Steps:**
1. Login to your Paynow account
2. Navigate to **"Receive Payments"** → **"Create Payment Button"**
3. Click **"Advanced"** or **"Custom Button Template"**
4. Add custom fields (e.g., Color, Size, Caption)
5. Save template and **note the Integration ID**

**Example Template:**
```
Template Name: T-Shirt Order
Integration ID: 1046

Custom Fields:
1. Item Colour (Select List): Red, Blue, Green
2. Caption (Text): Custom text on shirt
3. Size (Text + Numeric): S, M, L, XL
```

---

## Link Format

### Base URL
```
https://www.paynow.co.zw/payment/billpaymentlink/[customer-email]?q=[encoded-arguments]
```

### Arguments

| Argument | Key | Type | Description | Required |
|----------|-----|------|-------------|----------|
| Template ID | `id` | Number | Integration ID from Paynow | ✅ Yes |
| Amount | `amount` | Number | Unit price (if using quantity) | ❌ No |
| Quantity | `quantity` | Number | Quantity being purchased | ❌ No |
| Locked | `l` | 0 or 1 | Lock fields from editing | ❌ No |
| Custom Fields | `f1`, `f2`, `f3`... | String | Template custom fields in order | ❌ No |

### Custom Fields Order

**Important:** Custom fields (`f1`, `f2`, `f3`) must match the **exact order** they appear in your Paynow template.

**Example:**
```
Template Fields (in order):
1. Color → f1
2. Caption → f2  
3. Size → f3
```

---

## Implementation

### Backend Utility

**✅ Updated: `utils/paynow-link-generator.js`**

```javascript
const { generateAdvancedPaymentLink } = require('./utils/paynow-link-generator');

// Generate advanced payment link
const link = generateAdvancedPaymentLink({
    templateId: 1046,
    amount: 75.50,
    quantity: 2,
    customFields: {
        f1: 'Red',
        f2: 'Pay when? Paynow!',
        f3: '32'
    },
    locked: true,
    customerEmail: 'customer@example.com'
});

console.log(link);
// https://www.paynow.co.zw/payment/billpaymentlink/customer@example.com?q=aWQ9MTA0NiZhbW91bnQ9NzUuNTAmcXVhbnRpdHk9MiZmMT1SZWQmZjI9UGF5K3doZW4lM0YrUGF5bm93JTIxJmYzPTMyJmw9MQ%3D%3D
```

### Product Purchase Helper

```javascript
const { generateProductPurchaseLink } = require('./utils/paynow-link-generator');

// Simplified product purchase
const link = generateProductPurchaseLink({
    templateId: 1046,
    unitPrice: 25.00,
    quantity: 2,
    productDetails: {
        color: 'Blue',
        size: 'Large',
        customText: 'ZimCrowd'
    },
    customerEmail: 'customer@example.com'
});

// Automatically maps productDetails to f1, f2, f3 in order
```

---

## Backend Routes

### 1. Generate Advanced Payment Link

```javascript
POST /api/paynow-links/advanced

{
  "templateId": 1046,
  "amount": 75.50,
  "quantity": 2,
  "customFields": {
    "f1": "Red",
    "f2": "Pay when? Paynow!",
    "f3": "32"
  },
  "locked": true,
  "customerEmail": "customer@example.com"
}

Response:
{
  "success": true,
  "paymentLink": "https://www.paynow.co.zw/payment/billpaymentlink/...",
  "details": {
    "templateId": 1046,
    "amount": 75.50,
    "quantity": 2,
    "customFields": {...},
    "locked": true
  },
  "message": "Advanced payment link generated with custom template"
}
```

### 2. Generate Product Purchase Link

```javascript
POST /api/paynow-links/product

{
  "templateId": 1046,
  "unitPrice": 25.00,
  "quantity": 2,
  "productDetails": {
    "color": "Blue",
    "size": "Large",
    "customText": "ZimCrowd"
  },
  "customerEmail": "customer@example.com"
}

Response:
{
  "success": true,
  "paymentLink": "https://www.paynow.co.zw/payment/billpaymentlink/...",
  "details": {
    "templateId": 1046,
    "unitPrice": 25.00,
    "quantity": 2,
    "totalAmount": 50.00,
    "productDetails": {...}
  },
  "message": "Product purchase link generated"
}
```

---

## Examples

### Example 1: T-Shirt Order (From Documentation)

**Template Setup:**
```
Template ID: 1046
Fields:
- f1: Item Colour (Red, Blue, Green)
- f2: Caption (text)
- f3: Size (S, M, L, XL)
```

**Generate Link:**
```javascript
const link = generateAdvancedPaymentLink({
    templateId: 1046,
    amount: 75.50,
    customFields: {
        f1: 'Red',
        f2: 'Pay when? Paynow!',
        f3: '32'
    },
    locked: true,
    customerEmail: 'customer@gmail.com'
});
```

**Encoding Process:**
```
1. Construct: id=1046&amount=75.50&f1=Red&f2=Pay+when%3F+Paynow%21&f3=32&l=1
2. Base64: aWQ9MTA0NiZhbW91bnQ9NzUuNTAmZjE9UmVkJmYyPVBheSt3aGVuJTNGK1BheW5vdyUyMSZmMz0zMiZsPTE=
3. URL encode: aWQ9MTA0NiZhbW91bnQ9NzUuNTAmZjE9UmVkJmYyPVBheSt3aGVuJTNGK1BheW5vdyUyMSZmMz0zMiZsPTE%3D
```

**Result:**
```
https://www.paynow.co.zw/payment/billpaymentlink/customer@gmail.com?q=aWQ9MTA0NiZhbW91bnQ9NzUuNTAmZjE9UmVkJmYyPVBheSt3aGVuJTNGK1BheW5vdyUyMSZmMz0zMiZsPTE%3D
```

### Example 2: Product with Quantity

**Template Setup:**
```
Template ID: 2001
Use Quantity: Yes
Fields:
- f1: Product Name
- f2: Color
- f3: Size
```

**Generate Link:**
```javascript
const link = generateProductPurchaseLink({
    templateId: 2001,
    unitPrice: 25.00,
    quantity: 3,
    productDetails: {
        productName: 'ZimCrowd T-Shirt',
        color: 'Blue',
        size: 'Large'
    },
    customerEmail: 'buyer@example.com'
});

// Total: 25.00 × 3 = $75.00
```

### Example 3: Service Booking

**Template Setup:**
```
Template ID: 3005
Fields:
- f1: Service Type
- f2: Preferred Date
- f3: Time Slot
- f4: Special Requests
```

**Generate Link:**
```javascript
const link = generateAdvancedPaymentLink({
    templateId: 3005,
    amount: 50.00,
    customFields: {
        f1: 'Web Development',
        f2: '2025-12-01',
        f3: '10:00 AM',
        f4: 'Rush delivery needed'
    },
    locked: false, // Allow customer to edit
    customerEmail: 'client@example.com'
});
```

---

## Frontend Integration

### Product Purchase Button

```html
<div class="product-card">
    <h3>ZimCrowd T-Shirt</h3>
    <p>Price: $25.00</p>
    
    <select id="color">
        <option value="Red">Red</option>
        <option value="Blue">Blue</option>
        <option value="Green">Green</option>
    </select>
    
    <select id="size">
        <option value="S">Small</option>
        <option value="M">Medium</option>
        <option value="L">Large</option>
    </select>
    
    <input type="number" id="quantity" value="1" min="1">
    
    <button onclick="buyProduct()">Buy Now</button>
</div>

<script>
async function buyProduct() {
    const color = document.getElementById('color').value;
    const size = document.getElementById('size').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    
    const response = await fetch('/api/paynow-links/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            templateId: 1046,
            unitPrice: 25.00,
            quantity: quantity,
            productDetails: {
                color: color,
                size: size
            },
            customerEmail: 'customer@example.com'
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        // Redirect to Paynow
        window.location.href = result.paymentLink;
    }
}
</script>
```

### Service Booking Form

```javascript
async function bookService(serviceType, date, time) {
    const response = await fetch('/api/paynow-links/advanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            templateId: 3005,
            amount: 50.00,
            customFields: {
                f1: serviceType,
                f2: date,
                f3: time,
                f4: 'Standard delivery'
            },
            locked: true,
            customerEmail: localStorage.getItem('userEmail')
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        window.location.href = result.paymentLink;
    }
}
```

---

## Parsing Advanced Links

```javascript
const { parsePaynowLink } = require('./utils/paynow-link-generator');

const url = 'https://www.paynow.co.zw/payment/billpaymentlink/...?q=...';
const details = parsePaynowLink(url);

console.log(details);
// {
//   type: 'advanced',
//   templateId: '1046',
//   amount: 75.50,
//   quantity: 2,
//   locked: true,
//   customFields: {
//     f1: 'Red',
//     f2: 'Pay when? Paynow!',
//     f3: '32'
//   },
//   customerEmail: 'customer@example.com'
// }
```

---

## Creating Custom Templates in Paynow

### Step-by-Step Guide

**1. Login to Paynow**
- Go to https://www.paynow.co.zw
- Login with merchant credentials

**2. Navigate to Payment Buttons**
- Click **"Receive Payments"**
- Select **"Create Payment Button"**

**3. Choose Advanced/Custom Template**
- Select **"Advanced"** or **"Custom Button Template"**
- Enter template name (e.g., "T-Shirt Orders")

**4. Add Custom Fields**
```
Field 1: Item Colour
Type: Select List
Options: Red, Blue, Green

Field 2: Caption
Type: Text
Max Length: 50

Field 3: Size
Type: Select List
Options: S, M, L, XL
```

**5. Configure Settings**
- ☑ Use Quantity (if selling products)
- ☐ Allow customer to edit amount
- Set default amount (if applicable)

**6. Save Template**
- Click **"Save"**
- **Note the Integration ID** (e.g., 1046)
- Use this ID in your code

---

## Use Cases

### 1. E-Commerce Products
```javascript
// T-shirts, merchandise, physical products
generateProductPurchaseLink({
    templateId: 1046,
    unitPrice: 25.00,
    quantity: 2,
    productDetails: {
        color: 'Blue',
        size: 'Large',
        customText: 'ZimCrowd'
    }
});
```

### 2. Service Bookings
```javascript
// Consultations, appointments, services
generateAdvancedPaymentLink({
    templateId: 3005,
    amount: 100.00,
    customFields: {
        f1: 'Legal Consultation',
        f2: '2025-12-15',
        f3: '2:00 PM',
        f4: 'Corporate law'
    }
});
```

### 3. Event Tickets
```javascript
// Conferences, concerts, events
generateAdvancedPaymentLink({
    templateId: 4010,
    amount: 50.00,
    quantity: 3,
    customFields: {
        f1: 'VIP',
        f2: 'John Doe',
        f3: 'john@example.com',
        f4: 'Vegetarian meal'
    }
});
```

### 4. Custom Orders
```javascript
// Made-to-order products
generateAdvancedPaymentLink({
    templateId: 5020,
    amount: 150.00,
    customFields: {
        f1: 'Custom Logo Design',
        f2: 'Blue and Gold',
        f3: 'Vector format',
        f4: '3 revisions included'
    },
    locked: false // Allow customer to adjust
});
```

---

## Security Considerations

### ⚠️ Important

**1. Customer Can Modify Values**
- Even with `locked=1`, savvy users can decode and modify
- Always verify amount and custom fields after payment
- Check Paynow dashboard for actual payment details

**2. Template ID Exposure**
- Template ID is visible in URL
- Not a security risk, but customers can see it
- Use descriptive template names

**3. Best Practices**
```javascript
// ✅ DO: Verify payment details after receiving payment
if (receivedAmount === expectedAmount && 
    receivedCustomFields.color === expectedColor) {
    // Process order
}

// ❌ DON'T: Trust link parameters alone
```

---

## Testing

### Test Template Creation

1. Create test template in Paynow
2. Add 2-3 custom fields
3. Note the Integration ID
4. Generate test link
5. Open link in browser
6. Verify fields appear correctly

### Test Link Generation

```javascript
// Test advanced link
const link = generateAdvancedPaymentLink({
    templateId: 1046, // Your test template ID
    amount: 1.00, // Test with $1
    customFields: {
        f1: 'Test Color',
        f2: 'Test Caption'
    },
    locked: true,
    customerEmail: 'test@example.com'
});

console.log('Test link:', link);
// Open in browser and verify
```

---

## Summary

### ✅ Features Added
- Advanced payment link generation
- Custom template support
- Product purchase helper
- Quantity support
- Custom fields (f1, f2, f3...)
- Link parsing for advanced links

### ✅ Routes Created
- `POST /api/paynow-links/advanced` - Custom template links
- `POST /api/paynow-links/product` - Product purchase links

### ✅ Use Cases
- E-commerce products
- Service bookings
- Event tickets
- Custom orders
- Made-to-order items

### 📋 Next Steps
1. Create custom button template in Paynow
2. Note the Integration ID
3. Test link generation
4. Integrate into your product pages
5. Verify payments in Paynow dashboard

---

**Your advanced payment button system is ready!** ✅

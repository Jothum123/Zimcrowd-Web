# 💱 **PayNow Currency Detection Logic**

## **Requirement:**
When a deposit is made via PayNow integration, the system must automatically detect whether the payment was made in **USD** or **ZWG** and set the transaction currency accordingly.

---

## **How PayNow Works:**

PayNow returns payment information that includes:
- `currency` field in the response
- `amount` in the specified currency
- Payment method used (EcoCash, OneMoney, etc.)

---

## **Implementation Strategy:**

### **1. Backend: Transaction Creation**

When receiving a PayNow webhook/callback, extract the currency from PayNow's response:

```javascript
// routes/wallet.js or routes/transactions.js

// PayNow webhook handler
router.post('/paynow-webhook', async (req, res) => {
    try {
        const { 
            reference,
            paynowreference,
            amount,
            status,
            currency // PayNow provides this
        } = req.body;

        // Validate currency is USD or ZWG
        const validCurrency = ['USD', 'ZWG'].includes(currency) ? currency : 'USD';

        // Create transaction with PayNow-detected currency
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                amount: parseFloat(amount),
                currency: validCurrency, // From PayNow
                type: 'deposit',
                status: status === 'Paid' ? 'completed' : 'pending',
                payment_method: 'paynow',
                reference: reference,
                paynow_reference: paynowreference,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, transaction });
    } catch (error) {
        console.error('PayNow webhook error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
```

---

### **2. PayNow Integration Detection:**

PayNow API returns different currency codes based on payment method:

| Payment Method | Currency | Notes |
|----------------|----------|-------|
| EcoCash USD | USD | US Dollar mobile money |
| EcoCash ZWG | ZWG | Zimbabwe Gold mobile money |
| OneMoney | ZWG | Local currency |
| Visa/Mastercard | USD | International cards |

**PayNow Response Example:**
```json
{
  "status": "Paid",
  "reference": "Invoice #123",
  "paynowreference": "12345",
  "amount": "100.00",
  "currency": "USD",
  "pollurl": "https://www.paynow.co.zw/interface/checkpayment/?guid=..."
}
```

---

### **3. Frontend: Initiate Payment**

When user initiates a deposit, specify the currency they want to use:

```javascript
// js/wallet-manager.js

async initiateDeposit(amount, currency = 'USD') {
    try {
        // Call backend to create PayNow payment
        const response = await fetch(`${this.API_BASE}/api/wallet/deposit/paynow`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: parseFloat(amount),
                currency: currency, // User selects USD or ZWG
                email: this.userEmail,
                phone: this.userPhone
            })
        });

        const data = await response.json();

        if (data.success) {
            // Redirect to PayNow payment page
            window.location.href = data.redirectUrl;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Deposit initiation error:', error);
        throw error;
    }
}
```

---

### **4. Backend: Create PayNow Payment**

```javascript
// routes/wallet.js

router.post('/deposit/paynow', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, currency, email, phone } = req.body;

        // Validate currency
        if (!['USD', 'ZWG'].includes(currency)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid currency. Must be USD or ZWG'
            });
        }

        // Initialize PayNow payment
        const paynow = require('../utils/paynow-service');
        
        const payment = paynow.createPayment(
            `Deposit-${userId}-${Date.now()}`,
            email
        );

        // Add item with specified currency
        payment.add(`Wallet Deposit (${currency})`, amount);

        // Send payment to PayNow
        const response = await paynow.send(payment);

        if (response.success) {
            // Store pending transaction with currency
            const { data: transaction, error } = await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    amount: parseFloat(amount),
                    currency: currency, // Store requested currency
                    type: 'deposit',
                    status: 'pending',
                    payment_method: 'paynow',
                    reference: payment.reference,
                    paynow_poll_url: response.pollUrl,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            res.json({
                success: true,
                redirectUrl: response.redirectUrl,
                pollUrl: response.pollUrl,
                transaction: transaction
            });
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        console.error('PayNow deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate deposit',
            error: error.message
        });
    }
});
```

---

### **5. Verify PayNow Payment Status**

```javascript
// utils/paynow-service.js

const pollPaymentStatus = async (pollUrl) => {
    try {
        const response = await paynow.pollTransaction(pollUrl);
        
        return {
            paid: response.paid,
            amount: response.amount,
            currency: response.currency, // PayNow returns this
            reference: response.reference,
            paynowReference: response.paynowreference
        };
    } catch (error) {
        console.error('PayNow poll error:', error);
        throw error;
    }
};

module.exports = { pollPaymentStatus };
```

---

## **Database Schema Update:**

The `transactions` table needs these columns:

```sql
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS paynow_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS paynow_poll_url TEXT;

-- Add constraint
ALTER TABLE transactions 
ADD CONSTRAINT transactions_currency_check 
CHECK (currency IN ('USD', 'ZWG'));
```

---

## **Flow Summary:**

1. **User initiates deposit** → Selects amount and currency (USD or ZWG)
2. **Backend creates PayNow payment** → Sends to PayNow with selected currency
3. **User completes payment** → PayNow processes in selected currency
4. **PayNow webhook/callback** → Returns payment status with currency
5. **Backend updates transaction** → Sets currency from PayNow response
6. **Wallet balance updated** → In correct currency (USD or ZWG)

---

## **Key Points:**

✅ **Currency is determined by PayNow**, not manually set
✅ **User selects currency** when initiating deposit
✅ **PayNow confirms currency** in webhook response
✅ **Database validates** only USD or ZWG allowed
✅ **Separate wallet balances** for USD and ZWG

---

## **Next Steps:**

1. ✅ Update `transactions` table schema (add currency column)
2. ⏳ Implement PayNow webhook handler
3. ⏳ Add currency selection to deposit UI
4. ⏳ Update wallet balance calculation to handle both currencies
5. ⏳ Test with PayNow sandbox

---

**The currency will be automatically detected from PayNow's response!** 🚀

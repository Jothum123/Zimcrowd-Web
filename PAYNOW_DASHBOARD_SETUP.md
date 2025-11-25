# 🔧 Paynow Dashboard URL Configuration Guide

## Step-by-Step Instructions

### Step 1: Login to Paynow Dashboard

1. Go to **https://www.paynow.co.zw**
2. Click **"Login"** or **"Merchant Login"**
3. Enter your merchant credentials:
   - Email/Username
   - Password
4. Click **"Sign In"**

---

### Step 2: Navigate to Integration Settings

Once logged in, you'll see the merchant dashboard. Follow these steps:

#### Option A: Via Receive Payment Links
1. Look for **"Receive Payment Links"** in the left sidebar or top menu
2. Click on it
3. You'll see a list of your payment integration links
4. Find your **USD Integration** (or the one you want to configure)
5. Click **"Edit"** or the **pencil icon** next to it

#### Option B: Via Integration/Settings
1. Look for **"Integration"** or **"Settings"** in the menu
2. Click on **"Integration Settings"** or **"API Settings"**
3. Select your integration (USD or ZWG)

---

### Step 3: Configure Result URL (Webhook)

The **Result URL** is where Paynow sends payment status updates.

1. Look for a field labeled:
   - **"Result URL"** or
   - **"Webhook URL"** or
   - **"IPN URL"** (Instant Payment Notification) or
   - **"Callback URL"**

2. **Enter this URL exactly:**
   ```
   https://zimcrowd-backend.vercel.app/api/payments/result
   ```

3. **Important Notes:**
   - ✅ Must be HTTPS (secure)
   - ✅ Must be publicly accessible (not localhost)
   - ✅ This is where Paynow POSTs payment updates
   - ✅ Your backend webhook handler receives data here

#### What This URL Does:
- Paynow sends payment status updates here automatically
- Sends data like: reference, status, amount, paynowreference
- Your backend processes the payment and updates database
- Happens in the background (customer doesn't see this)

---

### Step 4: Configure Return URL

The **Return URL** is where customers are redirected after payment.

1. Look for a field labeled:
   - **"Return URL"** or
   - **"Redirect URL"** or
   - **"Success URL"** or
   - **"Customer Return URL"**

2. **Enter this URL exactly:**
   ```
   https://zimcrowd.com/dashboard.html?payment=complete
   ```

3. **Important Notes:**
   - ✅ This is where customers land after completing payment
   - ✅ Can include query parameters (like `?payment=complete`)
   - ✅ Customer sees this URL in their browser
   - ✅ Your frontend checks payment status here

#### What This URL Does:
- Customer clicks "Return to Merchant" on Paynow
- Browser redirects to this URL
- Your frontend detects the return and verifies payment
- Shows success/pending/failed modal to customer

---

### Step 5: Save Configuration

1. Scroll down to find the **"Save"** or **"Update"** button
2. Click it to save your changes
3. You should see a success message like:
   - "Integration updated successfully"
   - "Settings saved"

---

### Step 6: Verify Configuration

After saving, verify the URLs are correct:

1. Go back to your integration settings
2. Check that both URLs are displayed:
   - ✅ Result URL: `https://zimcrowd-backend.vercel.app/api/payments/result`
   - ✅ Return URL: `https://zimcrowd.com/dashboard.html?payment=complete`

---

## Visual Reference

### Typical Paynow Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Paynow Merchant Dashboard                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Receive Payment Links                                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Integration Name: USD Payments                      │    │
│  │ Integration ID: 22095                               │    │
│  │                                                      │    │
│  │ Result URL (Webhook):                               │    │
│  │ [https://zimcrowd-backend.vercel.app/api/payments/result] │
│  │                                                      │    │
│  │ Return URL:                                         │    │
│  │ [https://zimcrowd.com/dashboard.html?payment=complete]    │
│  │                                                      │    │
│  │ Integration Key: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxx │    │
│  │                                                      │    │
│  │                                    [Save] [Cancel]   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Field Names in Paynow

Different versions of Paynow dashboard may use different labels:

### For Result URL (Webhook):
- "Result URL"
- "Webhook URL"
- "IPN URL"
- "Callback URL"
- "Notification URL"
- "Status Update URL"

### For Return URL:
- "Return URL"
- "Redirect URL"
- "Success URL"
- "Customer Return URL"
- "Completion URL"

---

## Testing the URLs

### Test Result URL (Webhook)
After configuration, make a test payment:

1. The webhook should receive a POST request from Paynow
2. Check your Vercel function logs:
   ```
   📥 PayNow result callback: { reference: 'TEST-123', status: 'Paid' }
   ```

### Test Return URL
After completing a payment:

1. You should be redirected to: `https://zimcrowd.com/dashboard.html?payment=complete`
2. Your frontend should detect the return and verify payment
3. A success modal should appear

---

## Troubleshooting

### ❌ "Result URL is invalid"
**Possible Issues:**
- URL is not HTTPS
- URL contains spaces or special characters
- URL is not publicly accessible
- Firewall blocking Paynow's IP

**Solution:**
- Ensure URL starts with `https://`
- Copy-paste exactly as shown above
- Test URL in browser (should return 404 or "Method not allowed" for GET)

### ❌ "Return URL is invalid"
**Possible Issues:**
- URL format incorrect
- Domain not accessible

**Solution:**
- Ensure URL is valid and accessible
- Test in browser - should load your dashboard

### ❌ Webhook not receiving callbacks
**Check:**
1. Result URL is saved correctly in Paynow
2. Vercel function is deployed and accessible
3. Check Vercel function logs for errors
4. Verify Paynow's IP is not blocked

### ❌ Customer not redirected after payment
**Check:**
1. Return URL is saved correctly in Paynow
2. Customer clicked "Return to Merchant" button
3. URL is accessible (not 404)

---

## Security Notes

### Result URL (Webhook)
- ✅ Always verify hash from Paynow
- ✅ Check request origin if possible
- ✅ Log all webhook calls for audit
- ✅ Handle duplicate callbacks (idempotency)

### Return URL
- ✅ Never trust query parameters alone
- ✅ Always verify payment status via backend
- ✅ Don't expose sensitive data in URL
- ✅ Use HTTPS only

---

## Multiple Integrations

If you have both USD and ZWG integrations:

### USD Integration
```
Result URL: https://zimcrowd-backend.vercel.app/api/payments/result
Return URL: https://zimcrowd.com/dashboard.html?payment=complete
```

### ZWG Integration (if separate)
```
Result URL: https://zimcrowd-backend.vercel.app/api/payments/result
Return URL: https://zimcrowd.com/dashboard.html?payment=complete
```

**Note:** You can use the same URLs for both integrations. Your backend will handle both currencies.

---

## Quick Checklist

Before testing:
- [ ] Logged into Paynow merchant dashboard
- [ ] Found "Receive Payment Links" or "Integration" section
- [ ] Clicked "Edit" on your integration
- [ ] Entered Result URL: `https://zimcrowd-backend.vercel.app/api/payments/result`
- [ ] Entered Return URL: `https://zimcrowd.com/dashboard.html?payment=complete`
- [ ] Clicked "Save" or "Update"
- [ ] Verified URLs are saved correctly
- [ ] Copied Integration ID and Integration Key
- [ ] Added credentials to Vercel environment variables

---

## Need Help?

If you can't find these settings in your Paynow dashboard:

1. **Contact Paynow Support:**
   - Email: support@paynow.co.zw
   - Phone: Check Paynow website for contact number
   - Ask: "How do I configure Result URL and Return URL for my integration?"

2. **Check Paynow Documentation:**
   - Look for "Integration Guide" or "API Documentation"
   - Search for "webhook" or "callback" setup

3. **Request Screenshots:**
   - Ask Paynow support for screenshots of where to configure URLs
   - Different merchant accounts may have different dashboard layouts

---

**Next Step:** After configuring these URLs, add your Integration ID and Key to Vercel environment variables, then test with a $1 payment.

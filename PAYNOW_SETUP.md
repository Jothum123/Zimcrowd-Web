# 🔐 Paynow Real Credentials Setup Guide

## Current Status

Your Paynow integration is configured but needs **real credentials** from your Paynow merchant account.

### Configuration Files Found
- ✅ `config/paynow-config.js` - Has placeholder IDs (22095, 22100)
- ✅ `config/paynow-config.secure.js` - Requires env variables (production-ready)
- ✅ `services/paynow.service.js` - SDK integration ready
- ✅ `routes/payments.js` - Backend routes ready

### What's Missing
❌ Real Paynow Integration Keys (currently empty strings)

---

## Step 1: Get Your Paynow Credentials

### Login to Paynow Dashboard
1. Go to https://www.paynow.co.zw
2. Login to your merchant account
3. Navigate to **"Receive Payment Links"** or **"Integration"** section

### Get Integration Details
You need these 4 values:

| Credential | Where to Find | Example |
|------------|---------------|---------|
| **USD Integration ID** | Paynow Dashboard → USD Integration | `12345` |
| **USD Integration Key** | Paynow Dashboard → USD Integration | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| **ZWG Integration ID** | Paynow Dashboard → ZWG Integration | `12346` |
| **ZWG Integration Key** | Paynow Dashboard → ZWG Integration | `yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy` |

---

## Step 2: Configure Backend (Vercel)

### Add Environment Variables in Vercel

1. Go to https://vercel.com/jojola/zimcrowd-backend
2. Click **Settings** → **Environment Variables**
3. Add these variables:

```env
# Paynow USD Integration
PAYNOW_USD_INTEGRATION_ID=your_real_usd_integration_id
PAYNOW_USD_INTEGRATION_KEY=your_real_usd_integration_key

# Paynow ZWG Integration (if you have it)
PAYNOW_ZWG_INTEGRATION_ID=your_real_zwg_integration_id
PAYNOW_ZWG_INTEGRATION_KEY=your_real_zwg_integration_key

# Paynow URLs
PAYNOW_RESULT_URL=https://zimcrowd-backend.vercel.app/api/payments/result
PAYNOW_RETURN_URL=https://zimcrowd.com/dashboard.html?payment=complete

# Paynow Settings
PAYNOW_TEST_MODE=false
PAYNOW_MERCHANT_EMAIL=jothum@zimcrowd.co.zw
DEFAULT_CURRENCY=USD
```

4. Click **Save**
5. **Redeploy** your backend

---

## Step 3: Configure Paynow Dashboard

### Set Webhook URLs in Paynow

In your Paynow merchant dashboard, configure these URLs:

| Setting | URL |
|---------|-----|
| **Result URL** | `https://zimcrowd-backend.vercel.app/api/payments/result` |
| **Return URL** | `https://zimcrowd.com/dashboard.html?payment=complete` |

### Enable Payment Methods

Make sure these are enabled in your Paynow account:
- ✅ Web Checkout (Cards)
- ✅ EcoCash
- ✅ OneMoney
- ✅ InnBucks (if available)

---

## Step 4: Test the Integration

### Test with Small Amount

1. Go to https://zimcrowd.com/dashboard.html
2. Click **Deposit**
3. Enter amount: `$1.00`
4. Select payment method: **Paynow Web**
5. Complete payment on Paynow page
6. Verify:
   - ✅ Payment completes successfully
   - ✅ Wallet balance updates
   - ✅ Transaction appears in history
   - ✅ Backend receives webhook callback

### Test Mobile Money

1. Try **EcoCash** deposit
2. Check phone for payment prompt
3. Approve payment
4. Verify wallet updates

### Check Backend Logs

In Vercel:
1. Go to **Deployments** → Latest deployment
2. Click **Functions** → View logs
3. Look for:
   ```
   💳 Initiating USD payment: ZC-WALLET-xxx - $1.00
   ✅ Payment initiated successfully: ZC-WALLET-xxx
   📥 PayNow result callback: { reference: 'ZC-WALLET-xxx', status: 'Paid' }
   ```

---

## Step 5: Verify Database

### Check Supabase Tables

Your `payment_transactions` table should have:

| Field | Value |
|-------|-------|
| reference | `ZC-WALLET-1234567890` |
| status | `paid` |
| amount | `1.00` |
| currency | `USD` |
| payment_method | `web` or `ecocash` |
| paynow_reference | Paynow's reference |
| poll_url | Paynow's poll URL |
| paid_at | Timestamp |

---

## Troubleshooting

### ❌ "Integration key not configured"
**Solution:** Add `PAYNOW_USD_INTEGRATION_KEY` to Vercel env vars

### ❌ "Hash verification failed"
**Solution:** Check that Integration Key matches exactly (no extra spaces)

### ❌ "Payment initiation failed"
**Solution:** 
- Verify Integration ID is correct
- Check Paynow account is active
- Ensure payment method is enabled

### ❌ Webhook not receiving callbacks
**Solution:**
- Verify Result URL in Paynow dashboard
- Check Vercel function logs
- Ensure URL is accessible (not localhost)

### ❌ "Transaction not found"
**Solution:**
- Check database connection
- Verify Supabase credentials
- Check table permissions

---

## Security Checklist

- [ ] Integration keys stored in Vercel env vars (NOT in code)
- [ ] `.env` files added to `.gitignore`
- [ ] No credentials committed to git
- [ ] HTTPS used for all URLs
- [ ] Hash verification enabled
- [ ] Test mode disabled in production
- [ ] Webhook signature validation (if available)

---

## Current Configuration Status

### ✅ Ready
- Frontend deposit modal
- Backend routes and service
- Paynow SDK integration
- Database schema
- Webhook handler
- Status polling

### ⏳ Needs Setup
- Real Paynow credentials in Vercel
- Webhook URL in Paynow dashboard
- Test transaction to verify

---

## Quick Setup Commands

### Check Current Config
```bash
# In Vercel CLI
vercel env ls
```

### Add Environment Variable
```bash
vercel env add PAYNOW_USD_INTEGRATION_ID
vercel env add PAYNOW_USD_INTEGRATION_KEY
```

### Redeploy Backend
```bash
vercel --prod
```

---

## Support

If you encounter issues:
1. Check Vercel function logs
2. Check Paynow dashboard for transaction status
3. Verify webhook URL is accessible
4. Contact Paynow support: support@paynow.co.zw

---

**Next Step:** Get your real Integration ID and Key from Paynow dashboard, then add them to Vercel environment variables.

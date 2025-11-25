# 🚀 Paynow Integration - Deployment Checklist

## Pre-Deployment Checklist

### ✅ 1. Environment Variables (Vercel)

**Navigate to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these variables:**

```env
# Required - Paynow Credentials
☐ PAYNOW_USD_INTEGRATION_ID=your_usd_integration_id
☐ PAYNOW_USD_INTEGRATION_KEY=your_usd_integration_key

# Optional - ZWG Support
☐ PAYNOW_ZWG_INTEGRATION_ID=your_zwg_integration_id
☐ PAYNOW_ZWG_INTEGRATION_KEY=your_zwg_integration_key

# Required - URLs
☐ PAYNOW_RESULT_URL=https://zimcrowd-backend.vercel.app/api/payments/result
☐ PAYNOW_RETURN_URL=https://zimcrowd.com/dashboard.html?payment=complete
☐ FRONTEND_URL=https://zimcrowd.com

# Required - Merchant Info
☐ PAYNOW_MERCHANT_EMAIL=jothum@zimcrowd.co.zw

# Required - Database
☐ SUPABASE_URL=your_supabase_url
☐ SUPABASE_SERVICE_KEY=your_supabase_service_key

# Optional - Custom Templates
☐ PAYNOW_TEMPLATE_INTEGRATION_KEY=your_template_key

# Optional - Configuration
☐ DEFAULT_CURRENCY=USD
☐ PAYNOW_TEST_MODE=false
```

**Verification:**
```bash
# After adding, redeploy to apply
vercel --prod
```

---

### ✅ 2. Paynow Dashboard Configuration

**Login to:** https://www.paynow.co.zw

#### Step 2.1: Navigate to Integration Settings

```
Dashboard → Sell or Receive → Receive Payment Links → 3rd Party Site or Link Profile
```

#### Step 2.2: Configure URLs

| Field | Value | Status |
|-------|-------|--------|
| **Result URL** | `https://zimcrowd-backend.vercel.app/api/payments/result` | ☐ |
| **Return URL** | `https://zimcrowd.com/dashboard.html?payment=complete` | ☐ |

#### Step 2.3: Get Credentials

| Credential | Location | Status |
|------------|----------|--------|
| **Integration ID** | Copy from dashboard | ☐ |
| **Integration Key** | Copy from dashboard | ☐ |

#### Step 2.4: Custom Templates (Optional)

If using advanced payment buttons:

```
Dashboard → Custom Button Templates → Create/Edit Template
```

| Field | Value | Status |
|-------|-------|--------|
| **Notification URL** | `https://zimcrowd-backend.vercel.app/api/paynow-notifications/notification` | ☐ |
| **Success URL** | `https://zimcrowd-backend.vercel.app/api/paynow-notifications/success` | ☐ |
| **Cancel URL** | `https://zimcrowd-backend.vercel.app/api/paynow-notifications/cancel` | ☐ |
| **Template ID** | Note the ID | ☐ |
| **Integration Key** | Copy key | ☐ |

---

### ✅ 3. Database Setup

#### Step 3.1: Payment Transactions Table

**Run in Supabase SQL Editor:**

```sql
-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
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
    
    -- Token support
    payment_token VARCHAR(255),
    token_expiry VARCHAR(20),
    
    -- Details
    payment_details JSONB,
    webhook_data JSONB,
    
    -- User info
    user_email VARCHAR(255),
    user_phone VARCHAR(50)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference 
ON payment_transactions(reference);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id 
ON payment_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
ON payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_paynow_ref 
ON payment_transactions(paynow_reference);
```

**Status:** ☐ Completed

#### Step 3.2: Paynow Notifications Table (Optional)

**Run in Supabase SQL Editor:**

```sql
-- Create paynow_notifications table
CREATE TABLE IF NOT EXISTS paynow_notifications (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paynow_notifications_reference 
ON paynow_notifications(paynow_reference);

CREATE INDEX IF NOT EXISTS idx_paynow_notifications_email 
ON paynow_notifications(customer_email);
```

**Status:** ☐ Completed

#### Step 3.3: Wallet Credit Function

**Verify RPC function exists:**

```sql
-- Check if credit_wallet function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'credit_wallet';
```

**Status:** ☐ Verified

---

### ✅ 4. Code Verification

#### Step 4.1: Backend Routes

**Verify these files exist:**

```bash
☐ routes/payments.js              # Main payment routes
☐ routes/paynow-links.js          # Payment link generation
☐ routes/paynow-notifications.js  # Custom template notifications
☐ services/paynow.service.js      # Paynow SDK wrapper
☐ config/paynow-config.js         # Configuration
☐ utils/paynow-link-generator.js  # Link generation utility
```

#### Step 4.2: Frontend Files

**Verify these files exist:**

```bash
☐ js/api-config-new.js            # API endpoints
☐ wallet-functions.js             # Payment UI logic
```

#### Step 4.3: Documentation

**Verify these files exist:**

```bash
☐ PAYNOW_README.md                # Main index
☐ PAYNOW_INTEGRATION_COMPLETE.md # Complete overview
☐ PAYNOW_SETUP.md                 # Setup guide
☐ PAYNOW_DASHBOARD_SETUP.md       # Dashboard config
☐ PAYNOW_SDK_IMPLEMENTATION.md    # SDK verification
☐ PAYNOW_INITIATE_TRANSACTION.md  # HTTP API spec
☐ PAYNOW_WEBHOOK_GUIDE.md         # Webhook setup
☐ PAYNOW_SIMPLE_LINKS.md          # Payment links
☐ PAYNOW_ADVANCED_LINKS.md        # Custom templates
☐ PAYNOW_NOTIFICATIONS.md         # Template notifications
☐ PAYNOW_ENCODING.md              # URL encoding
☐ PAYNOW_SECURITY_AUDIT.md        # Security guide
☐ DEPLOYMENT_CHECKLIST.md         # This file
```

---

### ✅ 5. Security Audit

#### Step 5.1: No Exposed Keys

**Check frontend files for exposed keys:**

```bash
# Run this command in project root
grep -r "PAYNOW.*KEY" --include="*.js" --include="*.html" frontend/ public/ js/

# Should return NO results
```

**Status:** ☐ No keys found in frontend

#### Step 5.2: Environment Variables Only

**Verify backend uses environment variables:**

```bash
# Check that keys come from process.env
grep -r "process.env.PAYNOW" --include="*.js" backend/ routes/ services/ config/

# Should show usage of environment variables
```

**Status:** ☐ Using environment variables

#### Step 5.3: Hash Validation

**Verify hash validation is enabled:**

```javascript
// routes/payments.js - Webhook handler
const isValidHash = paynowService.validateWebhookHash(req.body);
if (!isValidHash) {
    return res.status(400).send('INVALID_HASH');
}
```

**Status:** ☐ Hash validation enabled

#### Step 5.4: HTTPS Enforcement

**Verify all URLs use HTTPS:**

```bash
☐ Result URL uses HTTPS
☐ Return URL uses HTTPS
☐ Notification URL uses HTTPS
☐ Success URL uses HTTPS
☐ Cancel URL uses HTTPS
```

---

### ✅ 6. Testing

#### Step 6.1: Encoding Tests

```bash
# Run encoding tests
node utils/paynow-encoding-test.js

# Expected output:
# ✅ All encoding tests passed!
```

**Status:** ☐ Tests passed

#### Step 6.2: Test Payment (Small Amount)

**Web Payment Test:**

```bash
1. ☐ Go to https://zimcrowd.com
2. ☐ Login to your account
3. ☐ Click "Deposit" button
4. ☐ Enter amount: $0.01
5. ☐ Select "Card Payment"
6. ☐ Click "Proceed"
7. ☐ Verify redirect to Paynow
8. ☐ Complete payment on Paynow
9. ☐ Verify redirect back to ZimCrowd
10. ☐ Check wallet credited
```

**Mobile Money Test:**

```bash
1. ☐ Go to https://zimcrowd.com
2. ☐ Login to your account
3. ☐ Click "Deposit" button
4. ☐ Enter amount: $0.01
5. ☐ Select "EcoCash"
6. ☐ Enter phone number
7. ☐ Click "Proceed"
8. ☐ Verify USSD prompt received
9. ☐ Enter PIN and confirm
10. ☐ Check wallet credited
```

**Payment Link Test:**

```bash
# Generate link
curl -X POST https://zimcrowd-backend.vercel.app/api/paynow-links/deposit \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","amount":0.01,"userEmail":"test@example.com"}'

1. ☐ Copy generated link
2. ☐ Open in browser
3. ☐ Complete payment
4. ☐ Verify link works
```

#### Step 6.3: Webhook Test

**Check webhook logs:**

```bash
# View Vercel logs
vercel logs --follow

# Look for:
☐ "📥 Webhook received"
☐ "✅ Hash validation passed"
☐ "💰 Wallet credited"
```

**Verify database:**

```sql
-- Check recent transactions
SELECT * FROM payment_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- Should show:
☐ Transaction created
☐ Status updated to 'paid'
☐ Paynow reference set
☐ wallet_credited = true
```

---

## Deployment Steps

### Step 1: Final Code Review

```bash
☐ All tests passing
☐ No console.log statements with sensitive data
☐ Error handling in place
☐ Documentation complete
```

### Step 2: Commit & Push

```bash
# Commit all changes
git add -A
git commit -m "Paynow integration - Production ready"

# Push to GitHub
git push origin main
```

**Status:** ☐ Pushed to GitHub

### Step 3: Vercel Deployment

```bash
# Vercel auto-deploys from GitHub
# Wait for deployment to complete

# Or manually deploy
vercel --prod
```

**Status:** ☐ Deployed to production

### Step 4: Verify Deployment

```bash
# Check health endpoint
curl https://zimcrowd-backend.vercel.app/health

# Should return 200 OK
```

**Status:** ☐ Deployment verified

### Step 5: Test Live

```bash
☐ Test web payment with $0.01
☐ Test mobile money with $0.01
☐ Verify webhook received
☐ Check wallet credited
☐ Test payment link
☐ Monitor logs for errors
```

---

## Post-Deployment Monitoring

### First 24 Hours

**Monitor these metrics:**

```bash
☐ Payment success rate
☐ Webhook delivery rate
☐ Wallet crediting success
☐ Error logs
☐ Response times
```

**Check logs regularly:**

```bash
# View real-time logs
vercel logs --follow

# Look for:
✅ Successful payments
✅ Webhooks received
✅ Wallets credited
❌ Any errors
```

### Database Monitoring

```sql
-- Payments in last hour
SELECT COUNT(*), status 
FROM payment_transactions 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;

-- Failed payments
SELECT * FROM payment_transactions 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Pending payments (older than 10 minutes)
SELECT * FROM payment_transactions 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '10 minutes';
```

### Alert Thresholds

**Set up alerts for:**

```bash
☐ Webhook failures (>5% failure rate)
☐ Payment failures (>10% failure rate)
☐ Wallet crediting failures (>1% failure rate)
☐ Response time >2 seconds
☐ Database errors
```

---

## Rollback Plan

### If Issues Occur

**Step 1: Identify Issue**

```bash
# Check logs
vercel logs

# Check database
SELECT * FROM payment_transactions 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Step 2: Quick Fixes**

```bash
# If environment variable issue:
1. Update in Vercel dashboard
2. Redeploy

# If code issue:
1. Revert commit
2. Push to GitHub
3. Vercel auto-deploys
```

**Step 3: Manual Processing**

```sql
-- If webhooks failed, manually credit wallets
UPDATE payment_transactions 
SET wallet_credited = true 
WHERE reference = 'FAILED_REF' 
AND status = 'paid';

-- Then manually credit wallet
SELECT credit_wallet('user_id', amount, 'reference');
```

---

## Success Criteria

### ✅ Deployment Successful When:

```bash
☐ All environment variables configured
☐ Paynow dashboard configured
☐ Database tables created
☐ Test payments successful
☐ Webhooks received and processed
☐ Wallets credited correctly
☐ No errors in logs
☐ Security audit passed
☐ Documentation complete
```

### 📊 Performance Targets

```bash
☐ Payment initiation: <500ms
☐ Webhook processing: <200ms
☐ Status polling: <300ms
☐ Link generation: <100ms
☐ Success rate: >95%
```

---

## Support Contacts

### Paynow Support

**Email:** support@paynow.co.zw  
**Phone:** Check Paynow dashboard  
**Hours:** Business hours (Zimbabwe time)

### Issues to Report

```bash
☐ Webhook not received
☐ Payment stuck in pending
☐ Integration key issues
☐ Dashboard configuration problems
```

---

## Final Checklist

### Before Going Live

```bash
☐ Environment variables configured
☐ Paynow dashboard configured
☐ Database tables created
☐ Test payments successful
☐ Webhooks working
☐ Wallets crediting correctly
☐ Security audit passed
☐ Documentation reviewed
☐ Team trained
☐ Monitoring set up
```

### Go-Live Approval

```bash
☐ Technical lead approval
☐ Security review passed
☐ Test results documented
☐ Rollback plan ready
☐ Support contacts confirmed
```

---

## 🎉 Deployment Complete!

**Once all items are checked:**

✅ Your Paynow integration is **LIVE** and **PRODUCTION-READY**!

**Next steps:**
1. Monitor logs for first few transactions
2. Verify webhook delivery
3. Check wallet crediting
4. Document any issues
5. Celebrate! 🎉

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Verified By:** _______________  
**Status:** ☐ Production Ready

---

*Last Updated: November 25, 2025*  
*Version: 1.0.0*

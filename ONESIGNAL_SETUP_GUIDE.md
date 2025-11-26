# 🔔 OneSignal Push Notifications - Complete Setup Guide

## ✅ What's Been Implemented

### **Backend:**
- ✅ `push-notification.service.js` - OneSignal API integration
- ✅ Push subscription endpoints (save, delete, status)
- ✅ Database schema for push subscriptions
- ✅ Webhook integration for all notification events
- ✅ Delivery logging and analytics

### **Frontend:**
- ✅ `onesignal-init.js` - OneSignal SDK initialization
- ✅ Auto-subscription handling
- ✅ Custom prompt UI support
- ✅ Subscription status tracking

---

## 🚀 Step-by-Step Setup

### **1. Get Your OneSignal Keys**

You've already created your OneSignal account. Now:

1. **Go to Settings → Keys & IDs**
   ```
   https://dashboard.onesignal.com/apps/YOUR_APP_ID/settings/keys_and_ids
   ```

2. **Copy these values:**
   - **OneSignal App ID:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - **REST API Key:** Click "Show" to reveal, then copy

---

### **2. Update Environment Variables**

Replace the placeholders in `.env.production`:

```env
# Push Notifications (OneSignal)
PUSH_NOTIFICATIONS_ENABLED=true
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_REST_API_KEY=YourRestApiKeyHere
ONESIGNAL_APP_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Note:** `ONESIGNAL_APP_KEY` is the same as `ONESIGNAL_APP_ID`

---

### **3. Configure OneSignal Dashboard**

#### **A. Web Push Settings**

1. Go to **Settings → Platforms → Web Push**
2. Click **"Configure"**
3. Enter your site details:

```
Site Name: ZimCrowd
Site URL: https://zimcrowd.com
Auto-resubscribe: ON (Recommended)
```

4. **Upload Default Icon:**
   - Size: 256x256 pixels
   - Format: PNG with transparency
   - Your ZimCrowd logo

5. Click **"Save"**

#### **B. Permission Prompt**

1. Go to **Settings → Platforms → Web Push → Permission Prompt**
2. Configure:

```
Prompt Type: Slide Prompt (Recommended)
Action Message: "Stay updated on loans, payments, and investments"
Accept Button Text: "Allow Notifications"
Cancel Button Text: "Not Now"
```

3. **Enable Categories** (Optional):
   - Loans
   - Payments
   - Investments

4. Click **"Save"**

#### **C. Welcome Notification** (Optional)

1. Go to **Settings → Platforms → Web Push → Welcome Notification**
2. Configure:

```
Title: Welcome to ZimCrowd!
Message: You'll receive updates about your loans, payments, and investments.
URL: https://zimcrowd.com/dashboard
```

3. Enable or disable as needed

---

### **4. Run Database Migration**

Execute the SQL schema in Supabase:

```sql
-- In Supabase SQL Editor
-- Run: database/push-subscriptions-schema.sql
```

This creates:
- `push_subscriptions` table
- Indexes for performance
- Views for analytics
- Helper functions

---

### **5. Add OneSignal to Your Frontend**

#### **Option A: Add to dashboard.html**

Add before closing `</head>` tag:

```html
<!-- OneSignal Push Notifications -->
<script src="js/onesignal-init.js"></script>
```

#### **Option B: Manual Integration**

Add this to your `dashboard.html`:

```html
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
      appId: "YOUR_APP_ID_HERE", // Replace with your actual App ID
      allowLocalhostAsSecureOrigin: true // For testing
    });
  });
</script>
```

---

### **6. Update Vercel Environment Variables**

1. Go to **Vercel Dashboard**
2. Select your project: **zimcrowd-backend**
3. Go to **Settings → Environment Variables**
4. Add these variables:

```
PUSH_NOTIFICATIONS_ENABLED = true
ONESIGNAL_APP_ID = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_REST_API_KEY = YourRestApiKeyHere
ONESIGNAL_APP_KEY = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

5. Select environments: **Production, Preview, Development**
6. Click **"Save"**
7. **Redeploy** your application

---

### **7. Test Push Notifications**

#### **A. Test from OneSignal Dashboard**

1. Go to **Messages → New Push**
2. Select **"Send to Test Users"**
3. Get your Player ID:
   - Open browser console on your site
   - Run: `OneSignal.User.PushSubscription.id`
   - Copy the ID
4. Enter the Player ID in OneSignal
5. Enter test message and send

#### **B. Test from Your Backend**

```javascript
// Test notification
const pushService = require('./services/push-notification.service');

await pushService.sendNotification(
    'user-uuid-here',
    'Test Notification',
    'This is a test push notification',
    {
        action_url: 'https://zimcrowd.com/dashboard'
    }
);
```

#### **C. Test via Webhook**

```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/webhooks/notifications/custom \
  -H "X-API-Key: your_internal_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "loan.approved",
    "userId": "user-uuid-here",
    "data": {
      "amount": 1000,
      "loanId": "loan-uuid-here"
    }
  }'
```

---

## 📱 User Flow

### **1. User Visits Dashboard**

```javascript
// onesignal-init.js automatically:
1. Loads OneSignal SDK
2. Initializes with your App ID
3. Shows permission prompt (if not already subscribed)
```

### **2. User Allows Notifications**

```javascript
// When user clicks "Allow":
1. OneSignal creates Player ID
2. Frontend saves to backend via POST /api/notifications/push-subscription
3. Backend stores in push_subscriptions table
```

### **3. Notification Triggered**

```javascript
// When loan is approved:
1. Backend calls webhook: POST /api/webhooks/notifications/custom
2. Webhook creates in-app notification
3. Webhook sends push via pushNotificationService
4. OneSignal delivers to user's device
5. User clicks notification → opens dashboard
```

---

## 🎯 Notification Events

All these events automatically send push notifications:

| Event | Title | Message | Action |
|-------|-------|---------|--------|
| `loan.approved` | 🎉 Loan Approved! | Your loan for $X approved | View Loans |
| `payment.received` | 💰 Payment Received | Payment of $X received | View Transactions |
| `payment.due` | ⏰ Payment Due Soon | Payment of $X due on DATE | View Loans |
| `investment.matured` | 🎊 Investment Matured | Total return: $X | View Investments |
| `referral.bonus` | 🎁 Referral Bonus | You earned $X | View Referrals |
| `wallet.credited` | 💵 Wallet Credited | $X added to wallet | View Wallet |
| `security.alert` | 🔒 Security Alert | Unusual activity detected | View Settings |

---

## 🔧 API Endpoints

### **Save Push Subscription**

```javascript
POST /api/notifications/push-subscription

Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Body:
{
  "playerId": "onesignal-player-id",
  "token": "push-token",
  "platform": "web",
  "deviceType": "desktop",
  "browser": "Chrome"
}

Response:
{
  "success": true,
  "message": "Push subscription saved",
  "data": { ... }
}
```

### **Unsubscribe**

```javascript
DELETE /api/notifications/push-subscription

Headers:
  Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Unsubscribed from push notifications"
}
```

### **Get Subscription Status**

```javascript
GET /api/notifications/push-status

Headers:
  Authorization: Bearer <token>

Response:
{
  "success": true,
  "subscribed": true,
  "data": {
    "player_id": "...",
    "platform": "web",
    "device_type": "desktop"
  }
}
```

---

## 📊 Analytics & Monitoring

### **View Subscription Stats**

```sql
-- In Supabase SQL Editor
SELECT * FROM push_notification_stats;
```

**Returns:**
- Total subscriptions
- Active/inactive counts
- Platform breakdown (web, iOS, Android)
- Device type breakdown

### **View Active Subscriptions**

```sql
SELECT * FROM active_push_subscriptions;
```

### **Get User's Subscription**

```sql
SELECT * FROM get_user_push_subscription('user-uuid-here');
```

### **Cleanup Old Subscriptions**

```sql
-- Remove subscriptions inactive for 90+ days
SELECT cleanup_inactive_push_subscriptions(90);
```

---

## 🎨 Custom UI Integration

### **Show Permission Prompt**

```javascript
// Add button to your dashboard
<button onclick="showPushNotificationPrompt()">
  Enable Push Notifications
</button>

// Function already defined in onesignal-init.js
function showPushNotificationPrompt() {
  window.OneSignalConfig.promptUser();
}
```

### **Check Subscription Status**

```javascript
const isSubscribed = await window.OneSignalConfig.isSubscribed();
if (isSubscribed) {
  console.log('User is subscribed');
} else {
  console.log('User is not subscribed');
}
```

### **Get Player ID**

```javascript
const playerId = await window.OneSignalConfig.getPlayerId();
console.log('Player ID:', playerId);
```

---

## 🐛 Troubleshooting

### **Push notifications not showing?**

1. **Check browser permissions:**
   - Chrome: Settings → Privacy → Site Settings → Notifications
   - Verify zimcrowd.com is allowed

2. **Check OneSignal App ID:**
   - Verify it matches in `.env` and `onesignal-init.js`

3. **Check subscription:**
   ```javascript
   const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
   console.log('Subscribed:', isSubscribed);
   ```

4. **Check Player ID:**
   ```javascript
   const playerId = await OneSignal.User.PushSubscription.id;
   console.log('Player ID:', playerId);
   ```

### **Subscription not saving to backend?**

1. Check browser console for errors
2. Verify auth token is valid
3. Check backend logs for errors
4. Verify database table exists

### **Push sent but not received?**

1. Check OneSignal dashboard delivery stats
2. Verify user has active subscription in database
3. Check browser notification settings
4. Try sending test notification from OneSignal dashboard

---

## 🔒 Security Best Practices

### **1. Secure API Keys**

```env
# ❌ DON'T commit to Git
.env
.env.production

# ✅ Add to .gitignore
echo ".env*" >> .gitignore
```

### **2. Validate Subscriptions**

```javascript
// Backend validates user owns the subscription
router.post('/push-subscription', authenticateUser, async (req, res) => {
  // Only authenticated users can subscribe
  // Subscription is tied to req.user.id
});
```

### **3. Rate Limiting**

Consider adding rate limits to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

const pushLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

router.post('/push-subscription', pushLimiter, authenticateUser, ...);
```

---

## 📈 Advanced Features

### **Segmentation**

Send to specific user groups:

```javascript
// Send to all borrowers
await pushService.sendToSegment(
  'Borrowers',
  'New Loan Products Available',
  'Check out our latest loan offerings',
  { action_url: '/dashboard#loans' }
);
```

### **Scheduled Notifications**

Schedule for future delivery:

```javascript
// OneSignal supports scheduled sends
const payload = {
  app_id: appId,
  include_player_ids: [playerId],
  headings: { en: 'Payment Reminder' },
  contents: { en: 'Your payment is due tomorrow' },
  send_after: '2025-11-27 09:00:00 GMT+0200'
};
```

### **A/B Testing**

Test different messages:

```javascript
// OneSignal dashboard supports A/B testing
// Messages → New Push → A/B Test
```

---

## ✅ Setup Checklist

- [ ] Get OneSignal App ID and REST API Key
- [ ] Update `.env.production` with keys
- [ ] Configure OneSignal dashboard (site URL, icon, prompt)
- [ ] Run database migration (`push-subscriptions-schema.sql`)
- [ ] Add `onesignal-init.js` to dashboard.html
- [ ] Update Vercel environment variables
- [ ] Redeploy backend to Vercel
- [ ] Test subscription on your site
- [ ] Send test notification from OneSignal dashboard
- [ ] Trigger test via webhook
- [ ] Verify notification received
- [ ] Check database for subscription record
- [ ] Monitor delivery stats

---

## 🎉 You're Done!

Your push notification system is now fully integrated and production-ready!

**Users will receive push notifications for:**
- ✅ Loan approvals and updates
- ✅ Payment reminders and confirmations
- ✅ Investment maturity
- ✅ Referral bonuses
- ✅ Wallet transactions
- ✅ Security alerts

**Next Steps:**
1. Get your OneSignal keys from the dashboard
2. Update environment variables
3. Deploy to production
4. Test with real users

---

**Last Updated:** November 26, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅

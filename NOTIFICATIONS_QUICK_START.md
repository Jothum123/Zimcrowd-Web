# 🚀 Notifications System - Quick Start Guide

## ✅ What's Been Implemented

### **1. Database Schema** ✅
- `user_notifications` - In-app notifications
- `notification_delivery_log` - Email/SMS tracking
- `user_notification_preferences` - User settings
- `notification_templates` - Reusable templates
- Pre-loaded with 6 default templates

### **2. API Endpoints** ✅
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all read
- `GET /api/notifications/unread-count` - Get count
- `DELETE /api/notifications/:id` - Delete one
- `DELETE /api/notifications/clear-all` - Clear all

### **3. Webhook Handlers** ✅
- `POST /api/webhooks/notifications/resend` - Email webhooks
- `POST /api/webhooks/notifications/twilio` - SMS webhooks
- `POST /api/webhooks/notifications/custom` - Internal triggers

### **4. Frontend** ✅
- `NotificationsPage` JavaScript module
- Real-time updates (30s polling)
- Filter by category and read status
- Pagination support
- Mark as read/delete actions

---

## 🔧 Setup Required

### **1. Environment Variables**

Add to your `.env` file:

```env
# Email Service (Resend)
RESEND_API_KEY=re_your_key_here
RESEND_WEBHOOK_SECRET=whsec_your_secret_here

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=AC_your_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Internal API Key
INTERNAL_API_KEY=your_secret_key_here
```

### **2. Database Migration**

Run the schema file in Supabase:

```bash
# In Supabase SQL Editor
Run: database/notifications-schema.sql
```

### **3. Configure Webhooks**

#### **Resend Dashboard:**
```
Webhook URL: https://zimcrowd-backend.vercel.app/api/webhooks/notifications/resend
Events: All email events
```

#### **Twilio Console:**
```
Webhook URL: https://zimcrowd-backend.vercel.app/api/webhooks/notifications/twilio
Method: POST
```

### **4. Add to Express App**

In `server.js` or `app.js`:

```javascript
const notificationRoutes = require('./routes/notifications');
const notificationWebhooks = require('./routes/notification-webhooks');

app.use('/api/notifications', notificationRoutes);
app.use('/api/webhooks/notifications', notificationWebhooks);
```

### **5. Add to Dashboard HTML**

In `dashboard.html`, add the script:

```html
<script src="js/notifications-page.js"></script>
```

---

## 📱 Usage Examples

### **Trigger a Notification**

```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/webhooks/notifications/custom \
  -H "X-API-Key: your_secret_key" \
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

### **Get User Notifications**

```javascript
const response = await fetch('/api/notifications?page=1&limit=20', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
console.log(result.data); // Array of notifications
console.log(result.unreadCount); // 12
```

### **Mark as Read**

```javascript
await fetch(`/api/notifications/${notificationId}/read`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

---

## 🎯 Notification Events

### **Available Events:**

| Event | Description | Priority | Channels |
|-------|-------------|----------|----------|
| `loan.approved` | Loan approved | High | Email, SMS, In-app |
| `loan.rejected` | Loan rejected | Normal | Email, In-app |
| `payment.received` | Payment received | Normal | Email, In-app |
| `payment.due` | Payment due soon | High | Email, SMS, In-app |
| `investment.matured` | Investment matured | High | Email, In-app |
| `referral.bonus` | Referral bonus earned | Normal | Email, In-app |
| `wallet.credited` | Wallet credited | Normal | In-app |
| `security.alert` | Security alert | Urgent | Email, SMS, In-app |

---

## 🧪 Testing

### **1. Test Notification Creation**

```javascript
// In your backend code
const { createNotification } = require('./routes/notification-webhooks');

await createNotification(userId, {
  type: 'test_notification',
  title: 'Test Notification',
  message: 'This is a test notification',
  category: 'system',
  priority: 'normal',
  action_url: '/dashboard',
  data: {}
});
```

### **2. Test Frontend**

```javascript
// In browser console
await NotificationsPage.loadNotifications();
console.log(NotificationsPage.notifications);
console.log(NotificationsPage.unreadCount);
```

### **3. Test Webhooks**

```bash
# Test Resend webhook
curl -X POST http://localhost:3000/api/webhooks/notifications/resend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.delivered",
    "data": {
      "email_id": "test_123",
      "to": ["test@example.com"]
    }
  }'
```

---

## 📊 Monitoring

### **Check Notification Stats**

```sql
-- Unread notifications per user
SELECT user_id, COUNT(*) as unread_count
FROM user_notifications
WHERE is_read = false
GROUP BY user_id
ORDER BY unread_count DESC;

-- Delivery stats by method
SELECT 
  delivery_method,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  ROUND(COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL / COUNT(*) * 100, 2) as delivery_rate
FROM notification_delivery_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY delivery_method;
```

---

## 🐛 Troubleshooting

### **Notifications not showing?**

1. Check database table exists: `user_notifications`
2. Check API endpoint: `GET /api/notifications`
3. Check browser console for errors
4. Verify authentication token is valid

### **Webhooks not working?**

1. Check webhook URL is publicly accessible
2. Verify signature verification is correct
3. Check environment variables are set
4. Look at server logs for errors

### **Email/SMS not sending?**

1. Verify Resend/Twilio API keys
2. Check delivery log table for errors
3. Verify user has email/phone number
4. Check user preferences allow that channel

---

## 🎉 Next Steps

1. **Deploy to Production** - Push to Vercel/server
2. **Configure Webhooks** - Set up Resend and Twilio
3. **Test Thoroughly** - Create test notifications
4. **Monitor Performance** - Check delivery rates
5. **Gather Feedback** - User experience improvements

---

## 📚 Full Documentation

See `NOTIFICATIONS_SYSTEM.md` for complete documentation including:
- Detailed API reference
- Database schema details
- Security best practices
- Analytics queries
- Advanced features

---

**Status:** ✅ Production Ready  
**Last Updated:** November 26, 2025  
**Version:** 1.0.0

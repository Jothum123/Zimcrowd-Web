# 🔔 ZimCrowd Notifications System - Production Ready

## 📋 Overview

Comprehensive notification system with multi-channel delivery (in-app, email, SMS), webhooks, real-time updates, and user preferences.

---

## 🎯 Features

### ✅ Core Features
- **Multi-Channel Delivery**: In-app, Email, SMS, Push notifications
- **Real-Time Updates**: 30-second polling for new notifications
- **User Preferences**: Granular control over notification types and channels
- **Webhook Integration**: External service webhooks (Resend, Twilio)
- **Template System**: Reusable notification templates
- **Priority Levels**: Low, Normal, High, Urgent
- **Categories**: Loans, Investments, Payments, Wallet, Referrals, System, Security
- **Read/Unread Tracking**: Mark as read, mark all as read
- **Pagination**: Efficient loading of large notification lists
- **Filtering**: By category, read status
- **Scheduled Notifications**: Future delivery scheduling
- **Campaigns**: Bulk notification campaigns
- **Analytics**: Delivery stats, open rates, click rates

---

## 📊 Database Schema

### **Tables:**

#### `user_notifications`
```sql
- id (UUID)
- user_id (UUID) → auth.users
- notification_type (VARCHAR)
- title (VARCHAR)
- message (TEXT)
- data (JSONB)
- priority (low|normal|high|urgent)
- category (VARCHAR)
- is_read (BOOLEAN)
- read_at (TIMESTAMP)
- action_url (TEXT)
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

#### `notification_delivery_log`
```sql
- id (UUID)
- user_id (UUID)
- notification_id (UUID)
- template_key (VARCHAR)
- delivery_method (email|sms|in_app|push)
- recipient_address (VARCHAR)
- subject (VARCHAR)
- content (TEXT)
- status (pending|sent|delivered|failed|bounced)
- provider (VARCHAR)
- provider_message_id (VARCHAR)
- error_message (TEXT)
- cost_usd (DECIMAL)
- sent_at, delivered_at, opened_at, clicked_at (TIMESTAMP)
```

#### `user_notification_preferences`
```sql
- id (UUID)
- user_id (UUID)
- notification_type (VARCHAR)
- email_enabled (BOOLEAN)
- sms_enabled (BOOLEAN)
- in_app_enabled (BOOLEAN)
- push_enabled (BOOLEAN)
- frequency (immediate|daily|weekly|monthly|disabled)
- quiet_hours_start, quiet_hours_end (TIME)
- timezone (VARCHAR)
```

#### `notification_templates`
```sql
- id (UUID)
- template_key (VARCHAR) UNIQUE
- template_name (VARCHAR)
- template_type (email|sms|in_app|push)
- subject (VARCHAR)
- content (TEXT)
- variables (JSONB)
- is_active (BOOLEAN)
```

---

## 🔌 API Endpoints

### **User Notifications**

#### `GET /api/notifications`
Get user's notifications with pagination and filtering.

**Query Parameters:**
```
page: number (default: 1)
limit: number (default: 20)
unread_only: boolean (default: false)
category: string (all|loans|investments|payments|wallet|referrals|system|security)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "🎉 Loan Approved!",
      "message": "Your loan application for $1000 has been approved.",
      "category": "loans",
      "priority": "high",
      "is_read": false,
      "action_url": "/dashboard#loans",
      "created_at": "2025-11-26T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  },
  "unreadCount": 12
}
```

#### `PUT /api/notifications/:id/read`
Mark notification as read.

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read",
  "data": { ... }
}
```

#### `PUT /api/notifications/mark-all-read`
Mark all notifications as read.

#### `GET /api/notifications/unread-count`
Get unread notification count.

**Response:**
```json
{
  "success": true,
  "count": 12
}
```

#### `DELETE /api/notifications/:id`
Delete a notification.

#### `DELETE /api/notifications/clear-all`
Clear all notifications.

---

### **Notification Preferences**

#### `GET /api/notifications/preferences`
Get user's notification preferences.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": true,
    "sms": true,
    "push": true,
    "loan_updates": true,
    "investment_updates": true,
    "payment_reminders": true,
    "marketing": false
  }
}
```

#### `PUT /api/notifications/preferences`
Update notification preferences.

**Body:**
```json
{
  "email": true,
  "sms": false,
  "push": true,
  "loan_updates": true,
  "marketing": false
}
```

---

### **Webhooks**

#### `POST /api/webhooks/notifications/resend`
Handle Resend email delivery webhooks.

**Events:**
- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.complained`
- `email.opened`
- `email.clicked`

**Webhook Signature Verification:**
```javascript
const signature = req.headers['resend-signature'];
const secret = process.env.RESEND_WEBHOOK_SECRET;
```

#### `POST /api/webhooks/notifications/twilio`
Handle Twilio SMS delivery webhooks.

**Events:**
- `queued`
- `sending`
- `sent`
- `delivered`
- `undelivered`
- `failed`

**Webhook Signature Verification:**
```javascript
const twilioSignature = req.headers['x-twilio-signature'];
twilio.validateRequest(authToken, signature, url, body);
```

#### `POST /api/webhooks/notifications/custom`
Custom internal notification triggers.

**Headers:**
```
X-API-Key: <INTERNAL_API_KEY>
```

**Body:**
```json
{
  "event": "loan.approved",
  "userId": "uuid",
  "data": {
    "amount": 1000,
    "loanId": "uuid"
  }
}
```

**Supported Events:**
- `loan.approved`
- `loan.rejected`
- `payment.received`
- `payment.due`
- `investment.matured`
- `referral.bonus`
- `wallet.credited`
- `security.alert`

---

## 🎨 Frontend Integration

### **Notifications Page**

```javascript
// Initialize
NotificationsPage.init();

// Load notifications
await NotificationsPage.loadNotifications(page);

// Mark as read
await NotificationsPage.markAsRead(notificationId);

// Mark all as read
await NotificationsPage.markAllAsRead();

// Delete notification
await NotificationsPage.deleteNotification(notificationId);

// Clear all
await NotificationsPage.clearAllNotifications();

// Filter by status
NotificationsPage.handleFilterChange('unread');

// Filter by category
NotificationsPage.handleCategoryChange('loans');
```

### **Real-Time Updates**

```javascript
// Auto-polls every 30 seconds
NotificationsPage.startRealTimeUpdates();

// Manual check
await NotificationsPage.checkForNewNotifications();
```

---

## 📧 Notification Templates

### **Pre-defined Templates:**

1. **loan_approved** - Loan approval notification
2. **loan_rejected** - Loan rejection notification
3. **investment_matured** - Investment maturity notification
4. **payment_reminder** - Payment due reminder
5. **welcome** - Welcome email for new users
6. **referral_bonus** - Referral bonus earned

### **Template Variables:**

```javascript
{
  user_name: "John Doe",
  loan_amount: "1000",
  interest_rate: "12",
  loan_term: "12",
  monthly_payment: "88.85",
  dashboard_url: "https://zimcrowd.com/dashboard"
}
```

---

## 🔔 Notification Types

### **By Category:**

| Category | Examples | Priority | Channels |
|----------|----------|----------|----------|
| **Loans** | Approved, Rejected, Disbursed | High | Email, SMS, In-app |
| **Investments** | Matured, Returns | High | Email, In-app |
| **Payments** | Received, Due, Failed | High | Email, SMS, In-app |
| **Wallet** | Credited, Debited | Normal | In-app |
| **Referrals** | Bonus Earned | Normal | Email, In-app |
| **System** | Maintenance, Updates | Normal | In-app |
| **Security** | Login, Password Change | Urgent | Email, SMS |
| **Marketing** | Promotions, News | Low | Email |

---

## 🎯 Notification Flow

### **1. Create Notification**

```javascript
// Via webhook
POST /api/webhooks/notifications/custom
{
  "event": "loan.approved",
  "userId": "user-uuid",
  "data": {
    "amount": 1000,
    "loanId": "loan-uuid"
  }
}
```

### **2. Store in Database**

```sql
INSERT INTO user_notifications (
  user_id, notification_type, title, message, 
  category, priority, action_url, data
) VALUES (...);
```

### **3. Deliver via Channels**

```javascript
// Check user preferences
const prefs = await getUserPreferences(userId);

// Send email if enabled
if (prefs.email_enabled) {
  await sendEmail(userId, template, data);
}

// Send SMS if enabled
if (prefs.sms_enabled) {
  await sendSMS(userId, template, data);
}

// In-app notification always created
```

### **4. Track Delivery**

```sql
INSERT INTO notification_delivery_log (
  user_id, notification_id, delivery_method,
  recipient_address, status, provider
) VALUES (...);
```

### **5. Update Status via Webhooks**

```javascript
// Resend webhook
POST /api/webhooks/notifications/resend
{
  "type": "email.delivered",
  "data": {
    "email_id": "msg_123",
    "to": ["user@example.com"]
  }
}

// Update delivery log
UPDATE notification_delivery_log
SET status = 'delivered', delivered_at = NOW()
WHERE provider_message_id = 'msg_123';
```

---

## 📊 Analytics & Reporting

### **Delivery Stats**

```sql
SELECT 
  DATE(created_at) as date,
  delivery_method,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
  ROUND(COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL / COUNT(*) * 100, 2) as delivery_rate,
  ROUND(COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::DECIMAL / COUNT(*) * 100, 2) as open_rate
FROM notification_delivery_log
GROUP BY DATE(created_at), delivery_method;
```

### **User Engagement**

```sql
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = true) as read_count,
  COUNT(*) FILTER (WHERE is_read = false) as unread_count,
  MAX(read_at) as last_read_at
FROM user_notifications
GROUP BY user_id;
```

---

## 🔒 Security

### **Webhook Signature Verification**

```javascript
// Resend
function verifyResendSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Twilio
function verifyTwilioSignature(authToken, signature, url, params) {
  return twilio.validateRequest(authToken, signature, url, params);
}
```

### **API Key Authentication**

```javascript
// Custom webhooks
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.INTERNAL_API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

---

## 🧪 Testing

### **Test Notification Creation**

```bash
curl -X POST https://zimcrowd-backend.vercel.app/api/webhooks/notifications/custom \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "loan.approved",
    "userId": "user-uuid",
    "data": {
      "amount": 1000,
      "loanId": "loan-uuid"
    }
  }'
```

### **Test Webhook Delivery**

```bash
# Resend webhook
curl -X POST https://zimcrowd-backend.vercel.app/api/webhooks/notifications/resend \
  -H "Resend-Signature: signature" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.delivered",
    "data": {
      "email_id": "msg_123",
      "to": ["user@example.com"]
    }
  }'
```

---

## 🚀 Deployment

### **Environment Variables**

```env
# Email Service (Resend)
RESEND_API_KEY=re_xxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxx

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Internal API
INTERNAL_API_KEY=your-secret-key

# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=xxxxx
```

### **Webhook URLs**

Configure these URLs in your service providers:

**Resend:**
```
https://zimcrowd-backend.vercel.app/api/webhooks/notifications/resend
```

**Twilio:**
```
https://zimcrowd-backend.vercel.app/api/webhooks/notifications/twilio
```

---

## 📱 User Experience

### **Notification Badge**

```html
<div class="notification-icon">
  <i class="fas fa-bell"></i>
  <span class="notification-badge">12</span>
</div>
```

### **Notification Item**

```html
<div class="notification-item unread high">
  <div class="notification-icon loans">
    <i class="fas fa-hand-holding-usd"></i>
  </div>
  <div class="notification-content">
    <h4>🎉 Loan Approved!</h4>
    <p>Your loan application for $1000 has been approved.</p>
    <a href="/dashboard#loans">View Details →</a>
  </div>
  <span class="notification-time">5m ago</span>
  <div class="notification-unread-dot"></div>
</div>
```

---

## 🎉 Benefits

✅ **Multi-Channel** - Reach users via email, SMS, in-app  
✅ **Real-Time** - Instant notifications with polling  
✅ **Customizable** - User preferences for each type  
✅ **Trackable** - Full delivery and engagement analytics  
✅ **Scalable** - Handles bulk campaigns  
✅ **Reliable** - Webhook-based status updates  
✅ **Secure** - Signature verification for webhooks  
✅ **Production-Ready** - Complete error handling  

---

**Last Updated:** November 26, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅

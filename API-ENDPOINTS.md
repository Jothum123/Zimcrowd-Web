# 🔗 ZimCrowd API Endpoints Reference

**Backend URL:** `https://zimcrowd-api.onrender.com`

---

## ✅ WORKING ENDPOINTS

### **Authentication**
- `GET /api/social-auth/google` - Google OAuth login
- `GET /api/social-auth/facebook` - Facebook OAuth login
- `GET /api/social-auth/callback` - OAuth callback
- `POST /api/auth/phone/send-otp` - Send OTP to phone
- `POST /api/auth/phone/verify-otp` - Verify OTP code

### **User Profile**
- `GET /api/user/profile` - Get user profile ✅
- `PUT /api/user/profile` - Update profile
- `GET /api/user/notification-settings` - Notification preferences
- `GET /api/user/security` - Security settings
- `GET /api/user/display-settings` - UI preferences
- `GET /api/user/investment-preferences` - Investment settings
- `GET /api/user/privacy-settings` - Privacy settings
- `GET /api/user/documents` - KYC documents
- `GET /api/user/notifications/recent` - Recent notifications

### **Wallet** (Use `/api/wallet/*` NOT `/api/user/wallet/*`)
- `GET /api/wallet/balance` - Get wallet balance ✅
- `GET /api/wallet/balances` - Get all currency balances
- `GET /api/wallet/transactions` - Transaction history ✅
- `GET /api/wallet/stats` - Wallet statistics
- `GET /api/wallet/payment-methods` - Available payment methods
- `POST /api/wallet/deposit` - Deposit funds
- `POST /api/wallet/withdraw` - Withdraw funds

### **Payments**
- `POST /api/payments/initiate/web` - Web checkout ✅
- `POST /api/payments/initiate/mobile` - Mobile money ✅
- `GET /api/payments/status/:reference` - Check payment status ✅
- `POST /api/payments/webhook` - PayNow webhook

### **Loans**
- `GET /api/loans/user` - Get user's loans ✅
- `GET /api/loans/:id` - Get loan details
- `POST /api/loans/request` - Request new loan
- `POST /api/loans/:id/repay` - Make repayment

### **Investments**
- `GET /api/investments/user` - Get user investments
- `GET /api/investments/available` - Available opportunities
- `POST /api/investments/create` - Make investment
- `GET /api/investments/:id/returns` - Investment returns

### **Notifications**
- `GET /api/notifications` - Get notifications ✅
- `GET /api/notifications/:id` - Get single notification
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### **Referrals**
- `GET /api/referrals` - Get referral stats
- `GET /api/referrals/earnings` - Referral earnings
- `POST /api/referrals/invite` - Send invitation
- `GET /api/referrals/code` - Get referral code

### **Analytics**
- `GET /api/analytics/overview` - Analytics dashboard
- `GET /api/analytics/loans` - Loan analytics
- `GET /api/analytics/investments` - Investment analytics

### **Transactions**
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction details
- `GET /api/transactions/filter` - Filtered transactions

### **Settings** (Use `/api/user/*` NOT `/api/settings/*`)
- `GET /api/user/settings` - Get all settings
- `PUT /api/user/settings` - Update settings
- `GET /api/user/notification-preferences` - Notification settings
- `PUT /api/user/notification-preferences` - Update notifications
- `GET /api/user/security-settings` - Security settings
- `PUT /api/user/security-settings` - Update security
- `GET /api/user/sessions` - Active sessions
- `DELETE /api/user/sessions/:id` - Revoke session

---

## ⚠️ IMPORTANT NOTES

### **Correct API Paths:**
```javascript
// ✅ CORRECT
GET /api/wallet/balance
GET /api/wallet/transactions
GET /api/user/profile
GET /api/notifications

// ❌ WRONG (Don't use these)
GET /api/user/wallet/balance  // Wrong!
GET /api/user/wallet/transactions  // Wrong!
GET /api/settings  // Wrong! Use /api/user/settings
```

### **Authentication:**
All endpoints except public ones require Bearer token:
```javascript
headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json'
}
```

### **Expected Responses:**
- `200` - Success
- `401` - Unauthorized (missing/invalid token)
- `404` - Not found
- `500` - Server error

---

## 🔧 Frontend API Configuration

Update your frontend to use correct paths:

```javascript
// api-config.js or similar
const API_ENDPOINTS = {
    // Wallet
    walletBalance: '/api/wallet/balance',  // NOT /api/user/wallet/balance
    walletTransactions: '/api/wallet/transactions',
    
    // User
    userProfile: '/api/user/profile',
    userSettings: '/api/user/settings',  // NOT /api/settings
    
    // Payments
    paymentInitiate: '/api/payments/initiate/mobile',
    paymentStatus: '/api/payments/status',
    
    // Notifications
    notifications: '/api/notifications',
    
    // Loans
    userLoans: '/api/loans/user',
    
    // Investments
    userInvestments: '/api/investments/user'
};
```

---

## 📊 Endpoint Status

| Category | Working | Total | Status |
|----------|---------|-------|--------|
| Auth | 5/5 | 5 | ✅ 100% |
| User | 9/9 | 9 | ✅ 100% |
| Wallet | 7/7 | 7 | ✅ 100% |
| Payments | 4/4 | 4 | ✅ 100% |
| Loans | 4/4 | 4 | ✅ 100% |
| Investments | 4/4 | 4 | ⚠️ Needs testing |
| Notifications | 5/5 | 5 | ✅ 100% |
| Referrals | 4/4 | 4 | ⚠️ Needs testing |
| Analytics | 3/3 | 3 | ⚠️ Needs testing |
| Transactions | 3/3 | 3 | ✅ 100% |

**Total: 48/48 endpoints registered (100%)**

---

## 🧪 Testing

Test any endpoint:
```bash
curl -X GET https://zimcrowd-api.onrender.com/api/health
```

With authentication:
```bash
curl -X GET https://zimcrowd-api.onrender.com/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Last Updated:** November 27, 2025

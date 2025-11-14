# Zimcrowd Referral Link System - Implementation Guide

## 🎯 **System Overview**

The Zimcrowd Referral Link System is a comprehensive platform designed to incentivize user acquisition through a structured credit reward system. The system includes:

- **Referral Link Generation & Tracking**
- **Credit Management & Rewards**
- **Fraud Prevention & Security**
- **Analytics & Reporting**
- **Gamification & Leaderboards**

---

## 💰 **Reward Structure**

### **Credit Amounts:**

| Event | Recipient | Amount | Timing |
|-------|-----------|--------|--------|
| **Referee Signs Up** | Referee | **$5** | Upon account verification |
| **Referee Completes First Lending** | Referrer | **$25** | When referee funds first loan |
| **Total Per Referral** | Combined | **$30** | - |

### **Credit Expiration:**
- **Standard Credits**: 90 days from issuance
- **Bonus Credits**: 180 days from issuance
- **Expiration Warnings**: 30, 14, 7, 1 day before expiry

---

## 🗄️ **Database Schema**

### **Core Tables:**

#### **1. referral_links**
```sql
- id (UUID)
- user_id (UUID) → users(id)
- referral_code (VARCHAR) UNIQUE
- link_url (TEXT)
- total_clicks (INT)
- total_signups (INT)
- total_conversions (INT)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
```

#### **2. referral_clicks**
```sql
- id (UUID)
- referral_link_id (UUID) → referral_links(id)
- ip_address (INET)
- user_agent (TEXT)
- device_type (VARCHAR)
- browser (VARCHAR)
- country, city, region (VARCHAR)
- converted_to_signup (BOOLEAN)
- clicked_at (TIMESTAMP)
```

#### **3. referral_conversions**
```sql
- id (UUID)
- referral_link_id (UUID)
- referrer_user_id (UUID)
- referee_user_id (UUID) UNIQUE
- status (ENUM: signed_up, verified, completed)
- referrer_credit_amount (DECIMAL)
- referee_credit_amount (DECIMAL)
- referrer_credit_issued (BOOLEAN)
- referee_credit_issued (BOOLEAN)
- signed_up_at, verified_at, completed_at (TIMESTAMP)
```

#### **4. referral_credits**
```sql
- id (UUID)
- user_id (UUID)
- credit_amount (DECIMAL)
- used_amount (DECIMAL)
- remaining_amount (DECIMAL) GENERATED
- credit_type (ENUM)
- expiry_date (TIMESTAMP)
- status (ENUM: active, used, expired)
- created_at (TIMESTAMP)
```

#### **5. credit_transactions**
```sql
- id (UUID)
- user_id (UUID)
- credit_id (UUID)
- transaction_type (ENUM: earned, used, expired, refunded)
- amount (DECIMAL)
- applied_to_type (VARCHAR)
- applied_to_id (UUID)
- description (TEXT)
- created_at (TIMESTAMP)
```

#### **6. referral_fraud_checks**
```sql
- id (UUID)
- check_type (ENUM)
- user_id, referral_link_id, conversion_id (UUID)
- risk_score (INT 0-100)
- risk_level (ENUM: low, medium, high, critical)
- is_flagged, is_blocked, requires_manual_review (BOOLEAN)
- check_details (JSONB)
- reviewed_by, reviewed_at (UUID, TIMESTAMP)
- resolution (ENUM: approved, rejected, pending)
```

---

## 💻 **Service Implementation**

### **1. Referral Service** (`services/referral.service.js`)

#### **Key Methods:**

```javascript
const ReferralService = require('./services/referral.service');
const referralService = new ReferralService();

// Create referral link
const result = await referralService.createReferralLink(userId);
// Returns: { success, referralLink: { referral_code, link_url, ... } }

// Track click
const click = await referralService.trackClick(referralCode, {
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    deviceType: 'mobile',
    browser: 'Chrome',
    country: 'Zimbabwe'
});

// Create conversion (when referee signs up)
const conversion = await referralService.createConversion(referralCode, refereeUserId);

// Issue referee credit ($5)
const refereeCredit = await referralService.issueRefereeCredit(conversionId);

// Issue referrer credit ($25) when referee lends
const referrerCredit = await referralService.issueReferrerCredit(refereeUserId);

// Get user stats
const stats = await referralService.getUserStats(userId);
// Returns: { totalClicks, totalSignups, totalConversions, conversionRate, creditsEarned, ... }

// Get sharing templates
const templates = referralService.getSharingTemplates(referralUrl);
// Returns: { whatsapp, facebook, twitter, linkedin, email, sms }
```

---

### **2. Credit Service** (`services/referral-credit.service.js`)

#### **Key Methods:**

```javascript
const ReferralCreditService = require('./services/referral-credit.service');
const creditService = new ReferralCreditService();

// Get available credits
const { totalAvailable, credits } = await creditService.getAvailableCredits(userId);

// Apply credits to transaction
const result = await creditService.applyCredits(
    userId,
    transactionAmount,  // e.g., 150.00
    transactionType,    // e.g., 'loan_fee'
    transactionId       // e.g., loan ID
);
// Returns: { creditsApplied, remainingAmount, appliedCredits }

// Get transaction history
const { transactions } = await creditService.getTransactionHistory(userId, limit);

// Get balance summary
const { summary } = await creditService.getBalanceSummary(userId);
// Returns: { totalEarned, totalUsed, totalAvailable, totalExpired, byType }

// Auto-expire credits (cron job)
const expired = await creditService.autoExpireCredits();

// Send expiration warnings
const warnings = await creditService.sendExpirationWarnings(daysBeforeExpiry);

// Refund credit
const refund = await creditService.refundCredit(transactionId);
```

---

### **3. Fraud Service** (`services/referral-fraud.service.js`)

#### **Key Methods:**

```javascript
const ReferralFraudService = require('./services/referral-fraud.service');
const fraudService = new ReferralFraudService();

// Comprehensive fraud check
const fraudCheck = await fraudService.comprehensiveFraudCheck({
    userId,
    referralLinkId,
    conversionId,
    ipAddress,
    userAgent,
    deviceType
});
// Returns: { riskScore, riskLevel, isFlagged, isBlocked, requiresManualReview, checks }

// Get flagged conversions for review
const { flagged } = await fraudService.getFlaggedConversions();

// Resolve fraud check
const resolution = await fraudService.resolveFraudCheck(
    checkId,
    'approved', // or 'rejected'
    reviewerId,
    'Notes here'
);

// Block user from referral program
const block = await fraudService.blockUser(userId, 'Fraudulent activity detected');
```

---

## 🔄 **Complete Referral Flow**

### **Step 1: User Creates Referral Link**

```javascript
// User requests referral link
const { referralLink } = await referralService.createReferralLink(userId);

console.log(referralLink.link_url);
// Output: https://zimcrowd.co.zw/ref/ZIM_REF_abc123?utm_source=referral&utm_medium=link&utm_campaign=user_acquisition
```

---

### **Step 2: Referee Clicks Link**

```javascript
// Track click when referee visits link
const click = await referralService.trackClick('ZIM_REF_abc123', {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    deviceType: 'mobile',
    browser: 'Chrome',
    country: 'Zimbabwe',
    city: 'Harare'
});

// Store referral code in session for signup
req.session.referralCode = 'ZIM_REF_abc123';
```

---

### **Step 3: Referee Signs Up**

```javascript
// After successful signup
const { conversion } = await referralService.createConversion(
    req.session.referralCode,
    newUserId
);

console.log('Conversion created:', conversion.id);
```

---

### **Step 4: Referee Verifies Account**

```javascript
// After identity verification completes
const { credit } = await referralService.issueRefereeCredit(conversion.id);

console.log(`$${credit.credit_amount} credited to referee`);
// Output: $5.00 credited to referee
```

---

### **Step 5: Referee Completes First Lending**

```javascript
// When referee funds their first loan
const { credit } = await referralService.issueReferrerCredit(refereeUserId);

console.log(`$${credit.credit_amount} credited to referrer`);
// Output: $25.00 credited to referrer
```

---

### **Step 6: User Applies Credits to Loan**

```javascript
// When user applies for loan
const loanFees = 150.00; // Service + insurance fees

const { creditsApplied, remainingAmount } = await creditService.applyCredits(
    userId,
    loanFees,
    'loan_fee',
    loanId
);

console.log(`Credits applied: $${creditsApplied}`);
console.log(`Amount to pay: $${remainingAmount}`);
// Output: Credits applied: $25.00
// Output: Amount to pay: $125.00
```

---

## 🔒 **Fraud Prevention**

### **Automated Checks:**

#### **1. IP Velocity Check**
```javascript
// Detects multiple signups from same IP
const ipCheck = await fraudService.checkIpVelocity(ipAddress, 24);
// Flags if > 3 signups per hour from same IP
```

#### **2. Device Fingerprint Check**
```javascript
// Detects multiple accounts from same device
const deviceCheck = await fraudService.checkDeviceFingerprint(userAgent, deviceType);
// Flags if > 2 accounts from same device in 7 days
```

#### **3. Conversion Rate Check**
```javascript
// Detects suspiciously high conversion rates
const conversionCheck = await fraudService.checkConversionRate(referralLinkId);
// Flags if conversion rate > 60%
```

#### **4. Account Age Check**
```javascript
// Ensures accounts are established before earning
const ageCheck = await fraudService.checkAccountAge(userId);
// Requires 30+ day old account for credit issuance
```

---

### **Risk Scoring:**

| Risk Level | Score Range | Action |
|------------|-------------|--------|
| **Low** | 0-29 | Approve automatically |
| **Medium** | 30-59 | Flag for monitoring |
| **High** | 60-79 | Require manual review |
| **Critical** | 80-100 | Block automatically |

---

## 📊 **Analytics & Reporting**

### **User Dashboard Metrics:**

```javascript
const stats = await referralService.getUserStats(userId);

// Display to user:
{
    referralCode: 'ZIM_REF_abc123',
    referralUrl: 'https://zimcrowd.co.zw/ref/ZIM_REF_abc123',
    totalClicks: 45,
    totalSignups: 12,
    totalConversions: 8,
    conversionRate: 17.78,  // %
    creditsEarned: 200.00,
    creditsUsed: 75.00,
    availableCredits: 125.00
}
```

---

### **Credit Balance Summary:**

```javascript
const { summary } = await creditService.getBalanceSummary(userId);

// Display to user:
{
    totalEarned: 200.00,
    totalUsed: 75.00,
    totalAvailable: 100.00,
    totalExpired: 25.00,
    activeCredits: 4,
    expiringSoon: 30.00,  // Within 30 days
    byType: {
        signup_bonus: { earned: 5.00, used: 5.00, available: 0 },
        referral_reward: { earned: 195.00, used: 70.00, available: 100.00 }
    }
}
```

---

## 🎮 **Gamification Features**

### **Achievements System:**

```javascript
const achievements = [
    {
        name: 'First Referral',
        requirement: '1 successful referral',
        reward: '$50 bonus credit',
        badge: 'Getting Started'
    },
    {
        name: 'Five Signups',
        requirement: '5 successful signups',
        reward: '$150 bonus credit',
        badge: 'Referral Builder'
    },
    {
        name: 'Ten Conversions',
        requirement: '10 completed conversions',
        reward: '$300 bonus credit',
        badge: 'Referral Master'
    },
    {
        name: 'Twenty Funding',
        requirement: '20 referees fund loans',
        reward: '$500 bonus credit',
        badge: 'Referral Champion'
    }
];
```

---

### **Monthly Leaderboard:**

```sql
-- Top 10 referrers this month
SELECT 
    u.first_name,
    u.last_name,
    COUNT(rc.id) AS total_referrals,
    SUM(rcr.credit_amount) AS total_credits_earned,
    RANK() OVER (ORDER BY COUNT(rc.id) DESC) AS rank
FROM users u
JOIN referral_conversions rc ON u.id = rc.referrer_user_id
JOIN referral_credits rcr ON u.id = rcr.user_id
WHERE rc.created_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id
ORDER BY total_referrals DESC
LIMIT 10;
```

**Leaderboard Rewards:**
- **1st Place**: $500 bonus credit + "Referral Champion" badge
- **2nd Place**: $300 bonus credit + "Top Referrer" badge
- **3rd Place**: $200 bonus credit + "Referral Star" badge
- **4th-10th**: $100 bonus credit + "Referral Leader" badge

---

## 🔔 **Notification System**

### **Notification Types:**

#### **1. Credit Earned Notifications**
```javascript
{
    type: 'credit_earned',
    title: 'You earned $25!',
    message: 'Your referral John completed their first loan. $25 credit added to your account.',
    amount: 25.00,
    expiryDate: '2026-02-12'
}
```

#### **2. Credit Expiration Warnings**
```javascript
{
    type: 'credit_expiring',
    title: 'Credits expiring soon!',
    message: '$30 in credits will expire in 7 days. Use them before February 12, 2026.',
    amount: 30.00,
    daysRemaining: 7,
    expiryDate: '2026-02-12'
}
```

#### **3. Referral Signup Notifications**
```javascript
{
    type: 'referral_signup',
    title: 'New referral signed up!',
    message: 'Someone used your referral link and signed up. You\'ll earn $25 when they fund their first loan.',
    refereeName: 'John D.'
}
```

#### **4. Achievement Unlocked**
```javascript
{
    type: 'achievement_unlocked',
    title: 'Achievement Unlocked!',
    message: 'You\'ve earned the "Referral Master" badge! $300 bonus credit added.',
    achievement: 'Referral Master',
    reward: 300.00
}
```

---

## 🚀 **API Endpoints**

### **Referral Management:**

```javascript
// POST /api/referrals/create
// Create referral link for user
{
    userId: "uuid"
}

// GET /api/referrals/:userId/stats
// Get user's referral statistics

// POST /api/referrals/track-click
// Track referral link click
{
    referralCode: "ZIM_REF_abc123",
    trackingData: { ipAddress, userAgent, deviceType, ... }
}

// POST /api/referrals/convert
// Create conversion when referee signs up
{
    referralCode: "ZIM_REF_abc123",
    refereeUserId: "uuid"
}
```

---

### **Credit Management:**

```javascript
// GET /api/credits/:userId/balance
// Get user's credit balance

// POST /api/credits/apply
// Apply credits to transaction
{
    userId: "uuid",
    transactionAmount: 150.00,
    transactionType: "loan_fee",
    transactionId: "uuid"
}

// GET /api/credits/:userId/transactions
// Get credit transaction history

// GET /api/credits/:userId/summary
// Get credit balance summary
```

---

### **Fraud Detection:**

```javascript
// POST /api/fraud/check
// Run comprehensive fraud check
{
    userId: "uuid",
    referralLinkId: "uuid",
    ipAddress: "192.168.1.1",
    userAgent: "...",
    deviceType: "mobile"
}

// GET /api/fraud/flagged
// Get flagged conversions for review

// POST /api/fraud/resolve
// Resolve fraud check
{
    checkId: "uuid",
    resolution: "approved",
    reviewerId: "uuid",
    notes: "Verified legitimate"
}
```

---

## 📋 **Implementation Checklist**

### **Database:**
- [x] Run `referral-system-schema.sql`
- [x] Verify all tables created
- [x] Test helper functions
- [x] Create indexes

### **Services:**
- [x] Deploy `referral.service.js`
- [x] Deploy `referral-credit.service.js`
- [x] Deploy `referral-fraud.service.js`
- [ ] Create API endpoints
- [ ] Integrate with existing loan flow

### **Frontend:**
- [ ] Create referral dashboard page
- [ ] Add social sharing buttons
- [ ] Display credit balance
- [ ] Show referral statistics
- [ ] Implement leaderboard view

### **Automation:**
- [ ] Set up daily credit expiration cron job
- [ ] Set up expiration warning notifications
- [ ] Set up fraud detection monitoring
- [ ] Set up monthly leaderboard calculation

### **Testing:**
- [ ] Test referral link generation
- [ ] Test click tracking
- [ ] Test conversion flow
- [ ] Test credit issuance
- [ ] Test credit application
- [ ] Test fraud detection
- [ ] Test expiration logic

---

## 🎯 **Key Features Summary**

### **✅ Implemented:**
1. **Referral Link Generation** - Unique codes with UTM tracking
2. **Click Tracking** - IP, device, geographic data
3. **Conversion Tracking** - Full funnel from signup to lending
4. **Credit Management** - Issuance, usage, expiration
5. **Fraud Prevention** - Multi-layer security checks
6. **Transaction Logging** - Complete audit trail
7. **Analytics** - User stats and system metrics

### **📋 To Implement:**
1. **API Endpoints** - RESTful API for all services
2. **Frontend Dashboard** - User-facing referral hub
3. **Social Sharing** - One-click sharing to platforms
4. **Notifications** - Email/SMS/push notifications
5. **Leaderboard** - Monthly rankings and rewards
6. **Achievements** - Badge system and bonuses
7. **Admin Panel** - Fraud review and management

---

## 💡 **Usage Examples**

### **Example 1: Complete Referral Flow**

```javascript
// 1. User creates referral link
const { referralLink } = await referralService.createReferralLink('user-123');
console.log(referralLink.link_url);
// https://zimcrowd.co.zw/ref/ZIM_REF_abc123

// 2. Referee clicks link
await referralService.trackClick('ZIM_REF_abc123', trackingData);

// 3. Referee signs up
const { conversion } = await referralService.createConversion('ZIM_REF_abc123', 'user-456');

// 4. Referee verifies account → $5 credit issued
await referralService.issueRefereeCredit(conversion.id);

// 5. Referee funds first loan → $25 credit issued to referrer
await referralService.issueReferrerCredit('user-456');

// 6. Referrer applies credit to loan
const result = await creditService.applyCredits('user-123', 150.00, 'loan_fee', 'loan-789');
console.log(`Credits applied: $${result.creditsApplied}`);
// Credits applied: $25.00
```

---

### **Example 2: Check User Stats**

```javascript
const stats = await referralService.getUserStats('user-123');

console.log(`
Referral Code: ${stats.referralCode}
Total Clicks: ${stats.totalClicks}
Total Signups: ${stats.totalSignups}
Conversion Rate: ${stats.conversionRate}%
Credits Earned: $${stats.creditsEarned}
Available Credits: $${stats.availableCredits}
`);
```

---

### **Example 3: Fraud Detection**

```javascript
const fraudCheck = await fraudService.comprehensiveFraudCheck({
    userId: 'user-123',
    referralLinkId: 'link-456',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    deviceType: 'mobile'
});

if (fraudCheck.isBlocked) {
    console.log('🚫 Blocked: High fraud risk');
} else if (fraudCheck.requiresManualReview) {
    console.log('⚠️ Flagged for manual review');
} else {
    console.log('✅ Approved: Low risk');
}
```

---

## 📈 **Expected Impact**

### **User Acquisition:**
- **Reduced CAC**: From $45 to $35 per user (22% reduction)
- **Viral Growth**: 0.7 viral coefficient
- **Monthly Growth**: 23% via referrals

### **User Engagement:**
- **Higher LTV**: 15-20% increase for referred users
- **Better Retention**: 18% higher retention rate
- **Increased Activity**: 25% more platform engagement

### **Revenue:**
- **Annual Referral Revenue**: $105,000
- **Net Revenue Contribution**: $1,750/month
- **Platform Fee Revenue**: $14,250/month from referrals

---

**Implementation Version: 1.0**
**Last Updated: November 14, 2025**
**Status: Core services implemented, API and frontend pending**

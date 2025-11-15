# ACCOUNT FLAGGING SYSTEM

**Comprehensive Account Status Management**

---

## OVERVIEW

The Account Flagging System provides comprehensive tracking and management of user account statuses, including active accounts, arrears, pending verification, and suspended accounts.

---

## ACCOUNT STATUSES

### **1. PENDING_VERIFICATION**
**Description:** New account awaiting KYC verification  
**User Can:**
- View dashboard
- Browse loans and investments
- Access wallet

**User Cannot:**
- Request loans
- Make investments
- Withdraw funds

**Auto-Transition:** → `active` when KYC verified

---

### **2. ACTIVE**
**Description:** Fully verified and operational account  
**User Can:**
- Request loans
- Make investments
- Withdraw funds
- Use all platform features

**User Cannot:**
- N/A (full access)

**Auto-Transition:** → `arrears` when payment overdue

---

### **3. ARREARS**
**Description:** Account with overdue payments  
**User Can:**
- View account
- Make payments
- Contact support

**User Cannot:**
- Request new loans
- Make new investments
- Withdraw funds

**Auto-Transition:** → `active` when all arrears cleared

---

### **4. SUSPENDED**
**Description:** Temporarily suspended account  
**User Can:**
- View account (read-only)
- Contact support

**User Cannot:**
- Any transactions
- Request loans
- Make investments
- Withdraw funds

**Manual Transition:** Admin review required

---

### **5. RESTRICTED**
**Description:** Limited functionality account  
**User Can:**
- Limited based on restriction type
- View account
- Make payments on existing loans

**User Cannot:**
- Varies by restriction type

**Manual Transition:** Admin review required

---

### **6. UNDER_REVIEW**
**Description:** Account under investigation  
**User Can:**
- View account (read-only)
- Respond to inquiries

**User Cannot:**
- Any new transactions
- Withdraw funds

**Manual Transition:** Admin review required

---

### **7. CLOSED**
**Description:** Permanently closed account  
**User Can:**
- View historical data (limited)

**User Cannot:**
- Any platform activity
- Login (in most cases)

**Manual Transition:** Cannot be reversed

---

## FLAG TYPES

### **Payment Default**
- **Severity:** Low → Critical (based on days overdue)
- **Auto-Applied:** Yes (when payment 1+ days late)
- **Category:** Arrears
- **Actions:** Account status → arrears, restrictions applied

### **Suspicious Activity**
- **Severity:** Medium → High
- **Auto-Applied:** Yes (by fraud detection system)
- **Category:** Security
- **Actions:** Account under review, transactions monitored

### **Fraud Alert**
- **Severity:** Critical
- **Auto-Applied:** Yes (by fraud detection)
- **Category:** Security
- **Actions:** Account suspended, manual review required

### **KYC Incomplete**
- **Severity:** Low
- **Auto-Applied:** Yes (after 30 days)
- **Category:** Verification
- **Actions:** Restricted functionality

### **Multiple Accounts**
- **Severity:** High
- **Auto-Applied:** Yes (by system detection)
- **Category:** Compliance
- **Actions:** All accounts under review

### **High Risk**
- **Severity:** High
- **Auto-Applied:** Yes (by risk assessment)
- **Category:** Risk Management
- **Actions:** Enhanced monitoring, reduced limits

### **Manual Review**
- **Severity:** Varies
- **Auto-Applied:** No (admin only)
- **Category:** Administrative
- **Actions:** Varies by case

---

## KYC STATUSES

### **Not Submitted**
- No KYC documents uploaded
- Account status: pending_verification
- Limited platform access

### **Submitted**
- Documents uploaded
- Awaiting admin review
- Status unchanged until review

### **Under Review**
- Admin reviewing documents
- May request additional documents
- Estimated review time: 24-48 hours

### **Verified**
- KYC approved
- Full platform access
- Account status → active

### **Rejected**
- KYC not approved
- Reason provided
- Can resubmit with corrections

### **Expired**
- KYC verification expired (after 2 years)
- Must re-verify
- Account status → restricted

---

## ARREARS TRACKING

### **Automatic Detection**
```
Payment Due Date Passes
↓
System checks daily
↓
If 1+ days overdue:
  - Create arrears record
  - Update account status → arrears
  - Apply payment_default flag
  - Send notification
  - Apply restrictions
```

### **Severity Levels**
| Days Overdue | Severity | Actions |
|--------------|----------|---------|
| 1-7 days | Low | Reminder notifications |
| 8-14 days | Medium | Account flagged, restrictions applied |
| 15-30 days | High | Late fees, collection process started |
| 30+ days | Critical | Account suspended, recovery initiated |

### **Resolution**
```
All Arrears Paid
↓
System verifies payment
↓
Remove arrears records
↓
Remove payment_default flag
↓
Update account status → active
↓
Remove restrictions
↓
Send confirmation notification
```

---

## ACCOUNT RESTRICTIONS

### **Types of Restrictions:**

#### **No New Loans**
- Cannot request new loans
- Existing loans unaffected
- Applied when: Arrears, high risk

#### **No Investments**
- Cannot make new investments
- Existing investments unaffected
- Applied when: KYC incomplete, suspended

#### **No Withdrawals**
- Cannot withdraw funds
- Can still receive payments
- Applied when: Under review, suspicious activity

#### **No Secondary Market**
- Cannot buy/sell on secondary market
- Applied when: Restricted status

#### **Reduced Limits**
- Lower transaction limits
- Applied when: High risk, new account

#### **KYC Required**
- Must complete KYC to proceed
- Applied when: KYC expired, not submitted

---

## API ENDPOINTS

### **GET /api/account-status/current**
Get current user's account status

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "account_status": "active",
      "kyc_status": "verified",
      "account_flags": [],
      "status_reason": null
    },
    "flags": [],
    "restrictions": [],
    "arrears": [],
    "can_borrow": true,
    "can_invest": true,
    "requires_action": false
  }
}
```

### **POST /api/account-status/update** (Admin)
Update account status

**Request:**
```json
{
  "user_id": "uuid",
  "new_status": "suspended",
  "reason": "Suspicious activity detected"
}
```

### **POST /api/account-status/flag** (Admin)
Flag an account

**Request:**
```json
{
  "user_id": "uuid",
  "flag_type": "suspicious_activity",
  "flag_category": "security",
  "severity": "high",
  "reason": "Multiple failed login attempts",
  "details": {}
}
```

### **POST /api/account-status/resolve-flag/:flag_id** (Admin)
Resolve a flag

**Request:**
```json
{
  "resolution_notes": "Verified legitimate activity"
}
```

### **GET /api/account-status/arrears** (Admin)
Get all accounts in arrears

### **GET /api/account-status/statistics** (Admin)
Get account status statistics

### **POST /api/account-status/restrict** (Admin)
Apply restriction to account

**Request:**
```json
{
  "user_id": "uuid",
  "restriction_type": "no_new_loans",
  "description": "Account in arrears",
  "expires_at": "2025-12-31T00:00:00Z"
}
```

### **POST /api/account-status/remove-restriction/:restriction_id** (Admin)
Remove restriction

---

## UI INDICATORS

### **Status Badges**

#### **Active**
```html
<span class="status-badge status-active">
  <i class="fas fa-check-circle"></i> Active
</span>
```
**Color:** Green (#10b981)

#### **Pending Verification**
```html
<span class="status-badge status-pending">
  <i class="fas fa-clock"></i> Pending Verification
</span>
```
**Color:** Yellow (#f59e0b)

#### **Arrears**
```html
<span class="status-badge status-arrears">
  <i class="fas fa-exclamation-triangle"></i> Arrears
</span>
```
**Color:** Orange (#f97316)

#### **Suspended**
```html
<span class="status-badge status-suspended">
  <i class="fas fa-ban"></i> Suspended
</span>
```
**Color:** Red (#ef4444)

---

## AUTOMATIC WORKFLOWS

### **1. New User Registration**
```
User Registers
↓
account_status = 'pending_verification'
kyc_status = 'not_submitted'
↓
Send welcome email with KYC instructions
↓
After 7 days: Reminder email
↓
After 30 days: Apply 'kyc_incomplete' flag
```

### **2. Payment Becomes Overdue**
```
Payment Due Date + 1 day
↓
Trigger: check_and_flag_arrears()
↓
Create arrears_tracking record
↓
Update account_status = 'arrears'
↓
Apply 'payment_default' flag
↓
Apply 'no_new_loans' restriction
↓
Send overdue notification
↓
Calculate severity based on days
↓
If 30+ days: Initiate recovery process
```

### **3. KYC Verification**
```
User Submits Documents
↓
kyc_status = 'submitted'
↓
Admin Reviews
↓
kyc_status = 'under_review'
↓
If Approved:
  kyc_status = 'verified'
  account_status = 'active'
  Remove restrictions
  Send confirmation
↓
If Rejected:
  kyc_status = 'rejected'
  Send rejection reason
  Allow resubmission
```

### **4. Arrears Resolution**
```
User Makes Payment
↓
System Verifies Payment
↓
Update arrears_tracking status = 'resolved'
↓
Check if all arrears cleared
↓
If Yes:
  Remove 'payment_default' flag
  Update account_status = 'active'
  Remove restrictions
  Send confirmation
```

---

## NOTIFICATIONS

### **Account Status Change**
```
Title: Account Status Updated
Message: Your account status has been changed to: [status]
Priority: High
```

### **Flag Added**
```
Title: Account Flag Added
Message: Your account has been flagged: [reason]
Priority: High/Medium (based on severity)
```

### **Restriction Applied**
```
Title: Account Restriction Applied
Message: A restriction has been applied: [description]
Priority: High
```

### **Arrears Alert**
```
Title: Payment Overdue
Message: Your payment is [X] days overdue. Please make payment immediately.
Priority: High
```

---

## ADMIN DASHBOARD FEATURES

### **Status Overview**
- Total users by status
- Active vs inactive accounts
- KYC verification rates
- Arrears statistics

### **Flag Management**
- View all active flags
- Filter by severity/type
- Resolve flags
- Add manual flags

### **Arrears Management**
- List of accounts in arrears
- Days overdue
- Amount overdue
- Initiate recovery

### **User Actions**
- Change account status
- Apply/remove restrictions
- Review KYC documents
- Send notifications

---

## DATABASE TABLES

### **users** (Extended)
- `account_status` - Current status
- `account_flags` - Array of active flags
- `status_reason` - Reason for current status
- `kyc_status` - KYC verification status
- `last_activity_at` - Last activity timestamp

### **account_status_history**
- Tracks all status changes
- Includes admin who made change
- Reason for change

### **account_flags**
- Active and resolved flags
- Severity levels
- Flag types and categories

### **arrears_tracking**
- Overdue payments
- Days overdue
- Recovery status

### **account_restrictions**
- Active restrictions
- Expiration dates
- Removal history

### **verification_documents**
- KYC documents
- Review status
- Rejection reasons

---

## BEST PRACTICES

### **For Admins:**
1. Always provide clear reasons for status changes
2. Document all manual actions
3. Review flags promptly
4. Communicate with users about restrictions
5. Monitor arrears daily

### **For System:**
1. Automatic status updates based on triggers
2. Daily arrears checking
3. Notification on all status changes
4. Audit trail for all actions
5. Severity escalation based on time

### **For Users:**
1. Complete KYC promptly
2. Maintain good payment history
3. Monitor account status
4. Respond to notifications
5. Contact support if flagged

---

## SECURITY CONSIDERATIONS

- All status changes logged
- Admin actions tracked
- IP addresses recorded
- Sensitive operations require admin role
- Automatic fraud detection
- Regular security audits

---

*This system ensures comprehensive account management with automatic detection, clear workflows, and robust admin controls.*

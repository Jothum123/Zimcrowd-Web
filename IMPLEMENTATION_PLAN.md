# Real API Integration Implementation Plan

## ✅ COMPLETED

### 1. My Loans Section
- ✅ Loan statistics API endpoint (`GET /api/loans/stats`)
- ✅ Total loan amount (real-time from DB)
- ✅ Average term (calculated from active loans)
- ✅ Average interest (calculated from active loans)
- ✅ Current loans count (real-time)
- ✅ Active loans tab with real data
- ✅ Completed loans tab with real data
- ✅ Applications tab with real data
- ✅ Dynamic loan cards with progress tracking
- ✅ ZimCrowd Direct CTA

### 2. Wallet Section (Partial)
- ✅ Wallet stats API integration
- ✅ Available balance (real-time)
- ✅ Pending balance (real-time)
- ✅ Total transactions amount (real-time)
- ✅ This month amount (real-time)
- ✅ Recent transactions list (real-time)
- ✅ Transaction type indicators
- ✅ Auto-load on section open

### 3. Investments Section (Partial)
- ✅ Portfolio stats API integration
- ✅ Total invested (real-time)
- ✅ Average return (real-time)
- ✅ Active investments count (real-time)
- ✅ Total returns (real-time)
- ✅ Investment cards with real data
- ✅ Auto-load on section open

## 🔄 IN PROGRESS / PENDING

### 4. Investments - Performance Tab
**Needs:**
- Add IDs to performance stats cards
- Create `updatePerformanceStats()` function
- Load performance data from API
- Display:
  - Total earnings (all time)
  - This month earnings
  - Average annual return
  - On-time payments percentage
  - Performance chart (Chart.js integration)
  - Risk distribution breakdown

**Implementation:**
```javascript
// Add IDs to performance tab stats
<h3 id="perfTotalEarnings">+$0</h3>
<h3 id="perfThisMonth">+$0</h3>
<h3 id="perfAvgReturn">0%</h3>
<h3 id="perfOnTimePayments">0%</h3>

// Create function
async function loadPerformanceData() {
    const response = await window.ZimCrowdAPI.getInvestmentStats();
    updatePerformanceStats(response.data);
}
```

### 5. Transactions Section
**Needs:**
- Add IDs to transaction filters and list
- Create `updateTransactionsSection()` function
- Load transactions from API
- Display:
  - All transactions with filters
  - Transaction type filter
  - Date range filter
  - Amount filter
  - Status filter
  - Pagination

**Implementation:**
```javascript
<div id="transactionsList"></div>

async function loadTransactionsData() {
    const response = await window.ZimCrowdAPI.getTransactions(page, limit);
    updateTransactionsSection(response.data);
}
```

### 6. Referral Program
**Needs:**
- Add IDs to referral stats
- Create referral API endpoints
- Load referral data
- Display:
  - Total referrals count
  - Total earnings
  - Active loans from referrals
  - Referral code (from API)
  - QR code generation
  - Social media share links
  - Referral history table

**Backend API Needed:**
```javascript
// routes/referrals.js
GET /api/referrals/stats
GET /api/referrals/code
GET /api/referrals/my-referrals?page=1&limit=10
```

**Frontend Implementation:**
```javascript
<h3 id="refTotalReferrals">0</h3>
<h3 id="refTotalEarnings">$0</h3>
<h3 id="refActiveLoans">0</h3>
<span id="referralCode">Loading...</span>
<div id="referralQRCode"></div>
<tbody id="referralHistoryTable"></tbody>

async function loadReferralsData() {
    const statsResponse = await window.ZimCrowdAPI.getReferralStats();
    const codeResponse = await window.ZimCrowdAPI.getReferralCode();
    const historyResponse = await window.ZimCrowdAPI.getReferrals(1, 10);
    
    updateReferralStats(statsResponse.data);
    updateReferralCode(codeResponse.data);
    updateReferralHistory(historyResponse.data);
    generateQRCode(codeResponse.data.code);
}
```

### 7. Settings Section
**Needs:**
- Profile Settings Tab
  - Load user profile data
  - Update profile form
  - Save profile changes
  
- Security Tab
  - Change password form
  - Two-factor authentication
  - Login history
  
- Notifications Tab
  - Email notifications toggle
  - SMS notifications toggle
  - Push notifications toggle
  - Notification preferences
  
- Display Tab
  - Theme selection (dark/light)
  - Language selection
  - Currency preference
  
- Privacy Tab
  - Privacy settings
  - Data sharing preferences
  - Account visibility
  
- Documents Tab
  - Document upload status
  - Document verification status
  - Document history

**Backend APIs Needed:**
```javascript
// Already exist in routes/profile.js
GET /api/profile
PUT /api/profile/update
POST /api/profile/change-password
PUT /api/profile/notification-settings
```

**Frontend Implementation:**
```javascript
// Profile Tab
async function loadProfileSettings() {
    const response = await window.ZimCrowdAPI.getProfile();
    populateProfileForm(response.data);
}

async function saveProfileSettings(formData) {
    const response = await window.ZimCrowdAPI.updateProfile(formData);
    showSuccessMessage('Profile updated successfully');
}

// Security Tab
async function changePassword(oldPassword, newPassword) {
    const response = await window.ZimCrowdAPI.changePassword(oldPassword, newPassword);
    showSuccessMessage('Password changed successfully');
}

// Notifications Tab
async function updateNotificationSettings(settings) {
    const response = await window.ZimCrowdAPI.updateNotificationSettings(settings);
    showSuccessMessage('Notification settings updated');
}
```

## 📋 DETAILED IMPLEMENTATION STEPS

### Step 1: Complete Investments Performance Tab
1. Add IDs to performance stats in HTML
2. Create `loadPerformanceData()` function
3. Create `updatePerformanceStats()` function
4. Integrate Chart.js for performance chart
5. Add risk distribution visualization

### Step 2: Complete Transactions Section
1. Add IDs to transaction elements
2. Create `loadTransactionsData()` function
3. Create `updateTransactionsSection()` function
4. Add filter functionality
5. Add pagination

### Step 3: Implement Referrals Backend
1. Create `routes/referrals.js` if not exists
2. Add referral stats endpoint
3. Add referral code endpoint
4. Add referral history endpoint
5. Test all endpoints

### Step 4: Implement Referrals Frontend
1. Add IDs to referral elements
2. Create `loadReferralsData()` function
3. Create `updateReferralStats()` function
4. Create `updateReferralCode()` function
5. Create `updateReferralHistory()` function
6. Integrate QR code library
7. Add social media share functionality

### Step 5: Implement Settings Section
1. Add IDs to all settings tabs
2. Create tab switching function
3. Implement Profile Settings
4. Implement Security Settings
5. Implement Notifications Settings
6. Implement Display Settings
7. Implement Privacy Settings
8. Implement Documents Settings

## 🔌 API ENDPOINTS STATUS

### ✅ Already Implemented
- `GET /api/loans/stats` - Loan statistics
- `GET /api/loans/my-loans` - User loans
- `GET /api/wallet/stats` - Wallet statistics
- `GET /api/wallet/transactions` - Wallet transactions
- `GET /api/investments/portfolio` - Investment portfolio
- `GET /api/investments/my-investments` - User investments
- `GET /api/investments/stats` - Investment statistics
- `GET /api/profile` - User profile
- `PUT /api/profile/update` - Update profile
- `POST /api/profile/change-password` - Change password
- `PUT /api/profile/notification-settings` - Update notifications

### ❌ Need to Implement
- `GET /api/referrals/stats` - Referral statistics
- `GET /api/referrals/code` - User referral code
- `GET /api/referrals/my-referrals` - Referral history
- `GET /api/transactions` - All transactions (if different from wallet)

## 📊 DATA FLOW

### Current Implementation:
```
User Opens Section → loadSectionData() → API Call → updateSectionUI() → Display Data
```

### Example for Loans:
```
User clicks "My Loans" 
  → loadLoansData()
    → getLoanStats() API
    → getMyLoans('active') API
    → getMyLoans('completed') API
    → getMyLoans('pending') API
  → updateLoanStats()
  → updateLoansList()
  → Display loan cards
```

## 🎯 PRIORITY ORDER

1. **HIGH PRIORITY**
   - Referrals backend API (needed for frontend)
   - Referrals frontend implementation
   - Settings Profile tab
   - Settings Security tab

2. **MEDIUM PRIORITY**
   - Investments Performance tab
   - Transactions section
   - Settings Notifications tab
   - Settings Display tab

3. **LOW PRIORITY**
   - Settings Privacy tab
   - Settings Documents tab
   - Chart.js integration
   - QR code generation

## 🚀 NEXT STEPS

1. Create referrals backend API endpoints
2. Implement referrals frontend
3. Complete settings section
4. Test all functionality
5. Add error handling
6. Add loading states
7. Add empty states
8. Final testing and deployment

## 📝 NOTES

- All API methods are already defined in `window.ZimCrowdAPI`
- Navigation system auto-loads section data
- Error handling should be consistent across all sections
- Loading states should show spinners
- Empty states should show helpful messages
- All amounts should be formatted with 2 decimal places
- All dates should be formatted consistently
- All sections should have retry buttons on error

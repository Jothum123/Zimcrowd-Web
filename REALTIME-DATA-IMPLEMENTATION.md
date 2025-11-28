# Real-Time Data & Production Loader Implementation

## 🎯 Overview

This document outlines the comprehensive real-time data loading system implemented for ZimCrowd, including production API integration, automatic updates, and platform fees calculations.

---

## 📁 Files Implemented

### Core Loaders
1. **`production-data-loader.js`** - Main production data loader with real-time updates
2. **`dashboard-realtime.js`** - WebSocket and polling for live updates
3. **`realtime-integration.js`** - Coordinates all real-time updates across modules
4. **`analytics-production-loader.js`** - Analytics with auto-refresh
5. **`settings-production-loader.js`** - Settings data management
6. **`dashboard-loader.js`** - Dashboard initialization

---

## 🚀 Features Implemented

### 1. Real-Time Data Updates

#### **Critical Data (15-second updates)**
- ✅ Wallet balance
- ✅ Notifications count
- ✅ Active loans status
- ✅ Investment returns

#### **Standard Data (30-second updates)**
- ✅ Loan listings
- ✅ Investment opportunities
- ✅ Transaction history
- ✅ Referral stats

#### **Analytics Data (60-second updates)**
- ✅ Portfolio performance
- ✅ Loan distribution
- ✅ Monthly activity
- ✅ Investment breakdown

### 2. Platform Fees Integration

All loaders now include platform fees calculations based on `PLATFORM-FEES-UPDATED.md`:

#### **Borrower Fees**
```javascript
{
    serviceFee: 10%,      // Upfront
    insuranceFee: 5%,     // Upfront
    tenureFee: 1%,        // Per month
    collectionFee: 5%     // Of payment
}
```

#### **Lender Fees**
```javascript
{
    serviceFee: 10%,      // Upfront (MANDATORY)
    insuranceFee: 5%,     // Upfront (OPTIONAL - investor chooses)
    collectionFee: 5%,    // Of returns
    dealFee: 2%           // Secondary market
}
```

### 3. Smart Update Mechanisms

#### **Visibility Detection**
- Pauses updates when tab is hidden
- Resumes and refreshes immediately when tab becomes visible
- Saves bandwidth and API calls

#### **Section-Based Loading**
- Only updates data for the currently visible section
- Prevents unnecessary API calls
- Improves performance

#### **Error Handling**
- Automatic retry with exponential backoff
- Fallback to cached data
- User-friendly error messages

---

## 🔧 Usage

### Initialization

All loaders initialize automatically when the DOM is ready:

```javascript
// production-data-loader.js initializes first
ProductionDataLoader.init();

// Then dashboard-realtime.js
DashboardRealtime.init();

// Finally realtime-integration.js coordinates everything
RealtimeIntegration.init();
```

### Manual Refresh

Users can manually trigger a refresh:

```javascript
// From anywhere in the app
window.refreshDashboard();

// Or specifically
RealtimeIntegration.manualRefresh();
```

### Pause/Resume Updates

```javascript
// Pause real-time updates
RealtimeIntegration.pause();

// Resume updates
RealtimeIntegration.resume();
```

### Calculate Fees

```javascript
// Calculate borrower fees
const borrowerFees = ProductionDataLoader.calculateBorrowerFees(
    loanAmount,      // e.g., 100
    termMonths,      // e.g., 3
    monthlyPayment   // e.g., 36.72
);

console.log(borrowerFees);
// {
//     upfront: { serviceFee: 10, insuranceFee: 5, total: 15 },
//     ongoing: { tenureFeePerMonth: 1, totalTenureFees: 3, ... },
//     netReceived: 85,
//     totalPlatformFees: 23.51,
//     effectiveFeePercentage: 23.51
// }

// Calculate lender fees
const lenderFees = ProductionDataLoader.calculateLenderFees(
    investmentAmount,  // e.g., 100
    returns,           // e.g., 110.16
    termMonths         // e.g., 3
);

console.log(lenderFees);
// {
//     upfront: { serviceFee: 10, insuranceFee: 3, total: 13 },
//     ongoing: { collectionFee: 5.51 },
//     totalPaid: 113,
//     grossReturns: 110.16,
//     netReturns: 104.65,
//     totalFees: 18.51,
//     netProfit: -8.35,
//     roi: -7.4
// }
```

---

## 📊 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Opens Dashboard                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ProductionDataLoader.init()                     │
│  • Loads all sections in parallel                           │
│  • Starts real-time updates (30s interval)                  │
│  • Sets up visibility handler                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              DashboardRealtime.init()                        │
│  • Attempts WebSocket connection                            │
│  • Falls back to polling if WebSocket fails                 │
│  • Polls every 30 seconds                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            RealtimeIntegration.init()                        │
│  • Coordinates all loaders                                  │
│  • Critical updates: 15s                                    │
│  • Standard updates: 30s                                    │
│  • Analytics updates: 60s                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Continuous Updates                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Wallet     │  │ Notifications│  │ Active Loans │     │
│  │  (15s)       │  │   (15s)      │  │   (15s)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Loans      │  │ Investments  │  │ Transactions │     │
│  │  (30s)       │  │   (30s)      │  │   (30s)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │              Analytics (60s)                      │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI Indicators

### Real-Time Status Indicator

Add this to your dashboard HTML:

```html
<div id="realtimeStatus" style="position: fixed; bottom: 20px; right: 20px; 
     background: rgba(15, 23, 42, 0.9); padding: 8px 16px; border-radius: 20px; 
     backdrop-filter: blur(10px); border: 1px solid rgba(56, 231, 123, 0.2);">
    <i class="fas fa-circle" style="color: #38e77b; font-size: 8px; margin-right: 5px;"></i>
    <span style="color: #94a3b8; font-size: 12px;">Live • Updated just now</span>
</div>
```

### Manual Refresh Button

```html
<button id="manualRefreshBtn" class="btn-secondary" onclick="refreshDashboard()">
    <i class="fas fa-sync-alt"></i> Refresh
</button>
```

### Pause/Resume Button

```html
<button id="pauseRealtimeBtn" class="btn-secondary">
    <i class="fas fa-pause"></i> Pause Updates
</button>
```

---

## 📡 API Endpoints Used

### Dashboard
- `GET /api/dashboard/` - Complete dashboard overview
- `GET /api/dashboard/wallet` - Wallet balance
- `GET /api/dashboard/stats` - Statistics
- `GET /api/dashboard/notifications?unread=true` - Unread notifications

### Loans
- `GET /api/loans/my-loans` - User's loans
- `GET /api/loans/my-loans?status=active` - Active loans only

### Investments
- `GET /api/investments/portfolio` - Portfolio overview
- `GET /api/investments/performance` - Performance metrics
- `GET /api/investments/my-investments?page=1&limit=10` - Investment list

### Transactions
- `GET /api/transactions?page=1&limit=50` - Transaction history
- `GET /api/wallet/transactions?page=1&limit=10` - Wallet transactions

### Referrals
- `GET /api/referrals/code` - Referral code and link
- `GET /api/referrals/stats` - Referral statistics
- `GET /api/referrals/my-referrals` - Referral list

### Analytics
- `GET /api/analytics/portfolio-history` - Portfolio history
- `GET /api/analytics/loan-distribution` - Loan distribution
- `GET /api/analytics/monthly-activity` - Monthly activity

### Settings
- `GET /api/profile` - User profile
- `GET /api/settings` - User settings
- `GET /api/documents` - KYC documents
- `GET /api/security/login-activity` - Login history

---

## 🔐 Authentication

All API requests include the authentication token:

```javascript
headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
}
```

Token is retrieved from:
1. `localStorage.getItem('authToken')`
2. `localStorage.getItem('token')`
3. `localStorage.getItem('access_token')`
4. `JSON.parse(localStorage.getItem('authData')).access_token`

---

## ⚡ Performance Optimizations

### 1. Parallel Loading
All initial data loads in parallel using `Promise.allSettled()`:

```javascript
await Promise.allSettled([
    this.loadOverviewData(),
    this.loadLoansData(),
    this.loadInvestmentsData(),
    // ... more sections
]);
```

### 2. Caching
Data is cached in localStorage for offline fallback:

```javascript
localStorage.setItem(`cached_${section}`, JSON.stringify(data));
```

### 3. Debouncing
Updates are debounced to prevent excessive API calls

### 4. Conditional Updates
Only visible sections are updated:

```javascript
if (analyticsSection && !analyticsSection.classList.contains('hidden')) {
    await this.loadAllAnalytics();
}
```

---

## 🐛 Error Handling

### Automatic Retry
Failed requests automatically retry with exponential backoff:

```javascript
this.reconnectDelay * this.reconnectAttempts
```

### Fallback to Cache
If API fails, cached data is used:

```javascript
const cachedData = localStorage.getItem(`cached_${section}`);
if (cachedData) {
    this.updateUI(JSON.parse(cachedData));
}
```

### User Notifications
Errors are shown to users via toast notifications:

```javascript
this.showToast('Failed to load data', 'error');
```

---

## 🧪 Testing

### Check Real-Time Status

```javascript
// In browser console
console.log(RealtimeIntegration.getStatus());
// {
//     initialized: true,
//     paused: false,
//     lastUpdate: Date,
//     updateCount: 42,
//     errors: 0,
//     currentSection: 'overview'
// }
```

### Manual Test Updates

```javascript
// Test critical updates
await ProductionDataLoader.refreshCriticalData();

// Test wallet update
await ProductionDataLoader.refreshWalletBalance();

// Test notifications
await ProductionDataLoader.refreshNotifications();
```

### Monitor Network Requests

Open DevTools → Network tab and filter by:
- `dashboard`
- `loans`
- `investments`
- `wallet`

You should see requests every 15-60 seconds depending on the data type.

---

## 📝 Configuration

### Adjust Update Intervals

In `realtime-integration.js`:

```javascript
config: {
    enabled: true,
    updateInterval: 30000,           // Standard: 30s
    criticalUpdateInterval: 15000,   // Critical: 15s
    analyticsUpdateInterval: 60000   // Analytics: 60s
}
```

### Disable Real-Time Updates

```javascript
// Temporarily disable
RealtimeIntegration.pause();

// Permanently disable
RealtimeIntegration.config.enabled = false;
RealtimeIntegration.stop();
```

---

## 🚨 Troubleshooting

### Updates Not Working

1. **Check if loaders are initialized:**
   ```javascript
   console.log(window.ProductionDataLoader);
   console.log(window.DashboardRealtime);
   console.log(window.RealtimeIntegration);
   ```

2. **Check authentication:**
   ```javascript
   console.log(localStorage.getItem('authToken'));
   ```

3. **Check for errors:**
   ```javascript
   console.log(RealtimeIntegration.state.errors);
   ```

### High API Usage

If you're hitting rate limits, increase intervals:

```javascript
RealtimeIntegration.config.updateInterval = 60000; // 60s
RealtimeIntegration.config.criticalUpdateInterval = 30000; // 30s
```

### WebSocket Not Connecting

This is normal - the system automatically falls back to polling. WebSocket is optional.

---

## 🎉 Summary

✅ **Real-time updates** for all dashboard sections  
✅ **Platform fees** integrated into all calculations  
✅ **Smart polling** with visibility detection  
✅ **Error handling** with automatic retry  
✅ **Caching** for offline support  
✅ **Performance optimized** with parallel loading  
✅ **User controls** for manual refresh and pause/resume  

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check authentication token is valid
4. Review network requests in DevTools

---

**Last Updated:** November 28, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

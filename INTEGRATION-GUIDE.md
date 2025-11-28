# Integration Guide - Real-Time Data Loaders

## 🚀 Quick Start

### Step 1: Add Scripts to Your HTML

Add these scripts to your dashboard HTML file **in this order** (before closing `</body>` tag):

```html
<!-- Core API Configuration -->
<script src="js/api-config.js"></script>

<!-- Production Data Loaders -->
<script src="js/production-data-loader.js"></script>
<script src="js/dashboard-realtime.js"></script>
<script src="js/analytics-production-loader.js"></script>
<script src="js/settings-production-loader.js"></script>

<!-- Real-Time Integration (Coordinates everything) -->
<script src="js/realtime-integration.js"></script>
```

### Step 2: Add UI Elements

#### Real-Time Status Indicator

Add this anywhere in your dashboard (recommended: bottom-right corner):

```html
<div id="realtimeStatus" style="position: fixed; bottom: 20px; right: 20px; 
     background: rgba(15, 23, 42, 0.9); padding: 8px 16px; border-radius: 20px; 
     backdrop-filter: blur(10px); border: 1px solid rgba(56, 231, 123, 0.2);
     z-index: 1000;">
    <i class="fas fa-circle" style="color: #38e77b; font-size: 8px; margin-right: 5px;"></i>
    <span style="color: #94a3b8; font-size: 12px;">Initializing...</span>
</div>
```

#### Manual Refresh Button

Add this to your dashboard header or toolbar:

```html
<button id="manualRefreshBtn" class="btn-secondary" 
        style="display: inline-flex; align-items: center; gap: 8px;">
    <i class="fas fa-sync-alt"></i> Refresh
</button>
```

#### Last Update Time (Optional)

Add this near your dashboard title:

```html
<span id="lastUpdateTime" style="color: #94a3b8; font-size: 12px; margin-left: 10px;">
    Updated just now
</span>
```

### Step 3: Verify Integration

Open your browser console and check:

```javascript
// Should all return objects (not undefined)
console.log(window.ProductionDataLoader);
console.log(window.DashboardRealtime);
console.log(window.RealtimeIntegration);

// Check status
console.log(RealtimeIntegration.getStatus());
```

Expected output:
```javascript
{
    initialized: true,
    paused: false,
    lastUpdate: Date,
    updateCount: 5,
    errors: 0,
    currentSection: 'overview'
}
```

---

## 🎯 HTML Element IDs Required

Make sure these IDs exist in your HTML for the loaders to work:

### Wallet Section
```html
<span id="walletAccountValue">$0.00</span>
<span id="walletAvailableBalance">$0.00</span>
<span id="walletInvestedFunds">$0.00</span>
<span id="walletReservedFunds">$0.00</span>
<span id="walletTotalTransactions">$0.00</span>
<div id="walletRecentTransactions"></div>
```

### Notifications
```html
<span id="notificationCount" class="notification-badge">0</span>
```

### Loans Section
```html
<span id="activeLoans">0</span>
<span id="activeLoansCount">0 Active</span>
<span id="totalLoanAmount">$0.00</span>
<div id="loans-container"></div>
```

### Investments Section
```html
<span id="portfolioTotalInvested">$0.00</span>
<span id="portfolioTotalReturns">$0.00</span>
<span id="portfolioAvgReturn">0%</span>
<span id="portfolioActiveCount">0</span>
<div id="portfolioCardsContainer"></div>
```

### Analytics Section
```html
<canvas id="portfolio-chart"></canvas>
<canvas id="loan-distribution-chart"></canvas>
<canvas id="monthly-activity-chart"></canvas>
```

---

## 🔧 Configuration Options

### Adjust Update Intervals

Edit `js/realtime-integration.js`:

```javascript
config: {
    enabled: true,
    updateInterval: 30000,           // 30 seconds (standard data)
    criticalUpdateInterval: 15000,   // 15 seconds (wallet, notifications)
    analyticsUpdateInterval: 60000   // 60 seconds (charts)
}
```

### Disable Specific Features

```javascript
// Disable auto-refresh for analytics
window.analyticsLoader.autoRefreshEnabled = false;
window.analyticsLoader.stopAutoRefresh();

// Disable real-time updates completely
RealtimeIntegration.config.enabled = false;
RealtimeIntegration.stop();
```

---

## 🎨 Styling

### Add Loading States

```css
.loading {
    opacity: 0.6;
    pointer-events: none;
    position: relative;
}

.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid #38e77b;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}
```

### Status Indicator Styles

```css
#realtimeStatus {
    transition: all 0.3s ease;
}

#realtimeStatus:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(56, 231, 123, 0.3);
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
```

---

## 📱 Mobile Optimization

For mobile devices, adjust the real-time status indicator:

```html
<div id="realtimeStatus" class="realtime-status">
    <i class="fas fa-circle status-dot"></i>
    <span class="status-text">Live</span>
</div>

<style>
@media (max-width: 768px) {
    #realtimeStatus {
        bottom: 10px;
        right: 10px;
        padding: 6px 12px;
        font-size: 11px;
    }
    
    .status-text {
        display: none; /* Hide text on very small screens */
    }
}
</style>
```

---

## 🔍 Debugging

### Enable Verbose Logging

```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

### Monitor API Calls

```javascript
// Track all API requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('API Request:', args[0]);
    return originalFetch.apply(this, args);
};
```

### Check Update Frequency

```javascript
// Monitor update count
setInterval(() => {
    console.log('Updates:', RealtimeIntegration.state.updateCount);
}, 5000);
```

---

## ⚠️ Common Issues

### Issue 1: "ProductionDataLoader is undefined"

**Solution:** Make sure scripts are loaded in the correct order. `production-data-loader.js` must load before `realtime-integration.js`.

### Issue 2: Updates not happening

**Solution:** Check if user is authenticated:
```javascript
console.log(localStorage.getItem('authToken'));
```

### Issue 3: High API usage

**Solution:** Increase update intervals or pause updates when not needed:
```javascript
RealtimeIntegration.pause();
```

### Issue 4: WebSocket errors in console

**Solution:** This is normal. The system automatically falls back to polling. WebSocket is optional.

---

## 🧪 Testing Checklist

- [ ] All scripts load without errors
- [ ] Real-time status indicator shows "Live"
- [ ] Wallet balance updates automatically
- [ ] Notification count updates
- [ ] Manual refresh button works
- [ ] Data persists when switching tabs
- [ ] Updates pause when tab is hidden
- [ ] Updates resume when tab becomes visible
- [ ] Platform fees are calculated correctly
- [ ] No excessive API calls (check Network tab)

---

## 📊 Performance Metrics

Expected performance:
- **Initial load:** < 3 seconds
- **Update frequency:** 15-60 seconds (configurable)
- **API calls per minute:** ~4-6 calls
- **Memory usage:** < 50MB
- **CPU usage:** < 5% (idle)

---

## 🎉 You're Done!

Your dashboard now has:
- ✅ Real-time data updates
- ✅ Platform fees integration
- ✅ Smart polling with visibility detection
- ✅ Automatic error handling
- ✅ Offline support with caching
- ✅ Manual refresh controls

For detailed documentation, see `REALTIME-DATA-IMPLEMENTATION.md`.

---

**Need Help?**
- Check browser console for errors
- Verify API endpoints are accessible
- Review `REALTIME-DATA-IMPLEMENTATION.md` for detailed docs
- Test with `RealtimeIntegration.getStatus()`

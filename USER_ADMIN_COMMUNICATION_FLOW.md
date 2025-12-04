# User-Admin Dashboard Communication Flow

## 🔄 Data Flow Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │    │                 │
│  User Dashboard │───▶│     Server      │───▶│    Database     │    │                 │
│                 │    │                 │    │                 │    │                 │
│ - Activity      │    │ - API Endpoints │    │ - Activity Logs │    │                 │
│   Logger        │    │ - Processing    │    │ - Notifications │    │                 │
│ - Real-time     │    │ - Validation    │    │ - Sessions      │    │                 │
│   Tracking      │    │ - Security      │    │ - Events        │    │                 │
│                 │    │                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │                       │
         │                       │                       │                       │
         │                       │                       │                       │
         │                       ▼                       │                       │
         │              ┌─────────────────┐              │                       │
         │              │                 │              │                       │
         └──────────────│   Admin API     │◀─────────────┘                       │
                        │                 │                                      │
                        │ - Auth Check    │                                      │
                        │ - Data Query    │                                      │
                        │ - Real-time     │                                      │
                        │   Updates       │                                      │
                        │                 │                                      │
                        └─────────────────┘                                      │
                                 │                                               │
                                 ▼                                               │
                        ┌─────────────────┐                                      │
                        │                 │                                      │
                        │ Admin Dashboard │◀─────────────────────────────────────┘
                        │                 │
                        │ - Activity      │
                        │   Monitor       │
                        │ - Live Feed     │
                        │ - Notifications │
                        │ - Statistics    │
                        │                 │
                        └─────────────────┘
```

## 📊 Step-by-Step Data Flow

### 1. **User Dashboard → Server**
**Action**: User performs any activity
```javascript
// User Dashboard (js/activity-logger.js)
await window.ActivityLogger.logActivity('loan_application', {
    amount: 5000,
    purpose: 'Business expansion',
    risk_level: 'medium'
});
```

**API Call**: 
```http
POST /api/activity/log
Authorization: Bearer <user_token>
Content-Type: application/json

{
    "activity_type": "loan_application",
    "activity_data": {
        "amount": 5000,
        "purpose": "Business expansion",
        "risk_level": "medium",
        "timestamp": "2025-12-04T18:08:00.000Z",
        "page_url": "https://zimcrowd.com/dashboard",
        "page_title": "Dashboard"
    },
    "ip_address": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "session_id": "session_1704386880000_abc123",
    "status": "active",
    "metadata": {}
}
```

### 2. **Server Processing**
**Route**: `routes/activity-tracking.js`
```javascript
// Server processes the activity
const activityId = await supabase.rpc('log_user_activity', {
    p_user_id: userId,
    p_activity_type: activityType,
    p_activity_data: activityData,
    p_ip_address: clientIP,
    p_user_agent: userAgent,
    p_session_id: sessionId,
    p_status: status,
    p_metadata: metadata
});

// Creates admin notification for important activities
if (['loan_application', 'large_investment', 'suspicious_activity'].includes(activityType)) {
    await createActivityNotification(activityType, userId, activityData);
}
```

**Database Functions**:
```sql
-- Automatic activity logging
CREATE OR REPLACE FUNCTION log_user_activity(...) RETURNS UUID AS $$
BEGIN
    INSERT INTO user_activity_logs (...) VALUES (...);
    
    -- Also create dashboard event for real-time updates
    INSERT INTO dashboard_events (...) VALUES (...);
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. **Database Storage**
**Tables Updated**:
```sql
-- Main activity log
INSERT INTO user_activity_logs (
    id, user_id, activity_type, activity_data, 
    ip_address, user_agent, session_id, 
    created_at, status, metadata
) VALUES (...);

-- Real-time events for admin dashboard
INSERT INTO dashboard_events (
    event_type, event_data, user_id, 
    admin_relevant, event_category, created_at
) VALUES (...);

-- Admin notifications for important activities
INSERT INTO admin_notifications (
    notification_type, title, message, 
    related_user_id, priority, created_at
) VALUES (...);
```

### 4. **Server → Admin Dashboard**
**Admin Request**:
```http
GET /api/activity/recent?limit=20
Authorization: Bearer <admin_token>
```

**Server Response**:
```json
{
    "success": true,
    "data": {
        "activities": [
            {
                "id": "uuid-123",
                "user_id": "uuid-456",
                "activity_type": "loan_application",
                "activity_data": {
                    "amount": 5000,
                    "purpose": "Business expansion"
                },
                "ip_address": "192.168.1.100",
                "created_at": "2025-12-04T18:08:00.000Z",
                "status": "active",
                "profiles": {
                    "full_name": "John Doe",
                    "email": "john@example.com"
                }
            }
        ],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 156,
            "pages": 8
        }
    }
}
```

### 5. **Admin Dashboard Display**
**Real-time Updates**:
```javascript
// Admin Dashboard (js/admin-activity-monitor.js)
updateRecentActivitiesUI(activities) {
    const activitiesHTML = activities.map(activity => `
        <div class="activity-item ${activity.activity_type}">
            <div class="activity-icon">
                <i class="fas fa-hand-holding-usd"></i>
            </div>
            <div class="activity-details">
                <div class="activity-title">Loan application submitted</div>
                <div class="activity-user">
                    <strong>John Doe</strong> (john@example.com)
                </div>
                <div class="activity-time">2 minutes ago</div>
            </div>
            <div class="activity-status">
                <span class="status-badge active">active</span>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = activitiesHTML;
}
```

## 🔄 Real-Time Polling Cycle

### **Every 30 Seconds (Admin Dashboard)**:
```javascript
// Auto-refresh cycle
setInterval(() => {
    Promise.all([
        this.loadRecentActivities(true),
        this.loadNotifications(true),
        this.loadActivityStats(true)
    ]);
}, 30000);
```

### **Every 10 Seconds (New Activity Check)**:
```javascript
// Check for new activities since last check
setInterval(async () => {
    const lastCheck = localStorage.getItem('adminLastActivityCheck');
    const response = await fetch(`/api/activity/dashboard-events?since=${lastCheck}`);
    
    if (data.data.events.length > 0) {
        this.showNewActivityAlert(data.data.events.length);
        localStorage.setItem('adminLastActivityCheck', new Date().toISOString());
    }
}, 10000);
```

## 📊 Activity Types & Data Flow

| Activity Type | User Action | Server Processing | Admin Display |
|---------------|-------------|-------------------|---------------|
| **Login** | User signs in | Log session, update last activity | "User logged in" with IP/location |
| **Loan Application** | Submit loan form | Create notification, high priority | Alert with loan details |
| **Large Investment** | Investment > $10k | Critical notification | "Large investment made" alert |
| **Transaction** | Payment/transfer | Log financial activity | Transaction details |
| **Profile Update** | Change user info | Log account changes | "Account updated" notification |
| **KYC Submission** | Upload documents | Security notification | Document verification alert |
| **Suspicious Activity** | Unusual patterns | Security alert, critical | Red alert for admin review |

## 🔐 Security & Authentication

### **User Dashboard**:
```javascript
// User token authentication
const token = localStorage.getItem('authToken');
const response = await fetch('/api/activity/log', {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

### **Admin Dashboard**:
```javascript
// Admin token verification
const adminToken = localStorage.getItem('adminAuthToken');
const response = await fetch('/api/activity/recent', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

### **Server Security**:
```javascript
// User authentication middleware
const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ message: 'Invalid token' });
    req.user = user;
    next();
};

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    // Verify admin role in admin_users table
    const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
    if (!adminCheck) return res.status(403).json({ message: 'Admin access required' });
    next();
};
```

## 🚀 Performance Optimizations

### **Batch Processing**:
```javascript
// User dashboard batches activities
this.activityQueue.push(activity);
if (this.activityQueue.length >= this.batchSize || options.immediate) {
    await this.processActivityQueue();
}
```

### **Smart Polling**:
```javascript
// Pause when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        this.pauseMonitoring();
    } else {
        this.resumeMonitoring();
    }
});
```

### **Database Indexing**:
```sql
-- Optimized queries with indexes
CREATE INDEX idx_user_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read, created_at DESC);
CREATE INDEX idx_dashboard_events_admin_relevant ON dashboard_events(admin_relevant, created_at DESC);
```

## 📱 Live Production URLs

- **User Dashboard**: `https://zimcrowd-frontend-6nmvle4mz-jojola.vercel.app/dashboard.html`
- **Admin Dashboard**: `https://zimcrowd-frontend-6nmvle4mz-jojola.vercel.app/admin-dashboard-complete.html`
- **API Base**: `https://zimcrowd-backend.vercel.app`

## ✅ Complete Integration Status

- ✅ **User Activity Logging** - All user actions tracked
- ✅ **Real-time Processing** - Immediate server processing
- ✅ **Database Storage** - Persistent activity storage
- ✅ **Admin Monitoring** - Live admin dashboard updates
- ✅ **Security** - Role-based authentication
- ✅ **Performance** - Optimized batching and polling
- ✅ **Notifications** - Priority-based admin alerts
- ✅ **Analytics** - Activity statistics and reporting

**🎉 The complete user-admin dashboard communication system is now live and operational!**

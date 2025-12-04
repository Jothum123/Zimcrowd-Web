// Admin Activity Monitor - Real-time monitoring of user activities
// Connects admin dashboard to user activity tracking system

class AdminActivityMonitor {
    constructor() {
        this.isAdmin = false;
        this.adminToken = null;
        this.apiBaseUrl = window.API_BASE_URL || 'https://zimcrowd-backend.vercel.app';
        this.isInitialized = false;
        this.refreshInterval = 30000; // 30 seconds
        this.refreshTimer = null;
        this.notificationCount = 0;
        this.eventHandlers = {};
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    // Initialize the admin activity monitor
    async init() {
        try {
            console.log('🔄 Initializing Admin Activity Monitor...');
            
            // Get admin authentication
            this.adminToken = localStorage.getItem('adminAuthToken');
            if (!this.adminToken) {
                console.warn('⚠️ No admin token found, activity monitoring disabled');
                return;
            }

            // Verify admin access
            const isAdminValid = await this.verifyAdminAccess();
            if (!isAdminValid) {
                console.warn('⚠️ Invalid admin token, activity monitoring disabled');
                return;
            }

            this.isInitialized = true;
            this.isAdmin = true;

            // Start real-time monitoring
            this.startMonitoring();

            // Load initial data
            await this.loadInitialData();

            console.log('✅ Admin Activity Monitor initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Admin Activity Monitor:', error);
        }
    }

    // Verify admin access
    async verifyAdminAccess() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/admin-role-management/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Error verifying admin access:', error);
            return false;
        }
    }

    // Start real-time monitoring
    startMonitoring() {
        // Start periodic refresh
        this.refreshTimer = setInterval(() => {
            this.refreshActivityData();
        }, this.refreshInterval);

        // Monitor page visibility to pause/resume updates
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseMonitoring();
            } else {
                this.resumeMonitoring();
            }
        });

        // Setup real-time notifications
        this.setupRealTimeNotifications();
    }

    // Pause monitoring when page is hidden
    pauseMonitoring() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        console.log('⏸️ Admin monitoring paused');
    }

    // Resume monitoring when page is visible
    resumeMonitoring() {
        if (!this.refreshTimer && this.isInitialized) {
            this.refreshTimer = setInterval(() => {
                this.refreshActivityData();
            }, this.refreshInterval);
            console.log('▶️ Admin monitoring resumed');
        }
    }

    // Load initial data
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadRecentActivities(),
                this.loadNotifications(),
                this.loadActivityStats(),
                this.loadDashboardEvents()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Refresh all activity data
    async refreshActivityData() {
        if (!this.isInitialized) return;

        try {
            await Promise.all([
                this.loadRecentActivities(true),
                this.loadNotifications(true),
                this.loadActivityStats(true)
            ]);
        } catch (error) {
            console.error('Error refreshing activity data:', error);
        }
    }

    // Load recent activities
    async loadRecentActivities(silent = false) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity/recent?limit=20`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateRecentActivitiesUI(data.data.activities);
                    if (!silent) {
                        console.log(`📊 Loaded ${data.data.activities.length} recent activities`);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading recent activities:', error);
        }
    }

    // Load admin notifications
    async loadNotifications(silent = false) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity/notifications?limit=10&is_read=false`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateNotificationsUI(data.data.notifications);
                    this.notificationCount = data.data.notifications.length;
                    this.updateNotificationBadge();
                    
                    if (!silent) {
                        console.log(`🔔 Loaded ${data.data.notifications.length} unread notifications`);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // Load activity statistics
    async loadActivityStats(silent = false) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity/stats?period=24h`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateStatsUI(data.data);
                    if (!silent) {
                        console.log('📈 Activity statistics updated');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading activity stats:', error);
        }
    }

    // Load dashboard events
    async loadDashboardEvents() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity/dashboard-events?limit=50`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateDashboardEventsUI(data.data.events);
                    console.log(`🎯 Loaded ${data.data.events.length} dashboard events`);
                }
            }
        } catch (error) {
            console.error('Error loading dashboard events:', error);
        }
    }

    // Update recent activities UI
    updateRecentActivitiesUI(activities) {
        const container = document.getElementById('recent-activities-list');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = '<p class="no-activities">No recent activities</p>';
            return;
        }

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item ${activity.activity_type}" data-activity-id="${activity.id}">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.activity_type)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${this.formatActivityTitle(activity)}</div>
                    <div class="activity-user">
                        <strong>${activity.profiles?.full_name || 'Unknown User'}</strong>
                        ${activity.profiles?.email ? `(${activity.profiles.email})` : ''}
                    </div>
                    <div class="activity-time">${this.formatTime(activity.created_at)}</div>
                </div>
                <div class="activity-status">
                    <span class="status-badge ${activity.status}">${activity.status}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = activitiesHTML;
    }

    // Update notifications UI
    updateNotificationsUI(notifications) {
        const container = document.getElementById('admin-notifications-list');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<p class="no-notifications">No new notifications</p>';
            return;
        }

        const notificationsHTML = notifications.map(notification => `
            <div class="notification-item ${notification.priority}" data-notification-id="${notification.id}">
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notification.notification_type)}"></i>
                </div>
                <div class="notification-details">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${this.formatTime(notification.created_at)}</div>
                </div>
                <div class="notification-actions">
                    <button class="btn-mark-read" onclick="window.AdminActivityMonitor.markNotificationRead('${notification.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.innerHTML = notificationsHTML;
    }

    // Update statistics UI
    updateStatsUI(stats) {
        // Update total activities
        const totalActivitiesEl = document.getElementById('stat-total-activities');
        if (totalActivitiesEl) {
            totalActivitiesEl.textContent = stats.total_activities.toLocaleString();
        }

        // Update active users
        const activeUsersEl = document.getElementById('stat-active-users');
        if (activeUsersEl) {
            activeUsersEl.textContent = stats.unique_active_users.toLocaleString();
        }

        // Update unread notifications
        const unreadNotificationsEl = document.getElementById('stat-unread-notifications');
        if (unreadNotificationsEl) {
            unreadNotificationsEl.textContent = stats.unread_notifications.toLocaleString();
        }

        // Update activity by type chart
        this.updateActivityChart(stats.activity_by_type);
    }

    // Update dashboard events UI
    updateDashboardEventsUI(events) {
        const container = document.getElementById('dashboard-events-list');
        if (!container) return;

        if (events.length === 0) {
            container.innerHTML = '<p class="no-events">No recent events</p>';
            return;
        }

        const eventsHTML = events.map(event => `
            <div class="event-item ${event.event_category}" data-event-id="${event.id}">
                <div class="event-icon">
                    <i class="fas fa-${this.getEventIcon(event.event_type)}"></i>
                </div>
                <div class="event-details">
                    <div class="event-title">${this.formatEventTitle(event)}</div>
                    <div class="event-user">
                        <strong>${event.profiles?.full_name || 'Unknown User'}</strong>
                    </div>
                    <div class="event-time">${this.formatTime(event.created_at)}</div>
                </div>
                <div class="event-category">
                    <span class="category-badge ${event.event_category}">${event.event_category}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = eventsHTML;
    }

    // Mark notification as read
    async markNotificationRead(notificationId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Remove notification from UI
                const notificationEl = document.querySelector(`[data-notification-id="${notificationId}"]`);
                if (notificationEl) {
                    notificationEl.style.opacity = '0.5';
                    setTimeout(() => notificationEl.remove(), 300);
                }

                // Update notification count
                this.notificationCount = Math.max(0, this.notificationCount - 1);
                this.updateNotificationBadge();

                console.log('✅ Notification marked as read');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    // Update notification badge
    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            badge.textContent = this.notificationCount;
            badge.style.display = this.notificationCount > 0 ? 'block' : 'none';
        }
    }

    // Setup real-time notifications (WebSocket or polling)
    setupRealTimeNotifications() {
        // For now, use polling for real-time updates
        // In production, this could be upgraded to WebSocket
        setInterval(() => {
            if (!document.hidden && this.isInitialized) {
                this.checkForNewActivities();
            }
        }, 10000); // Check every 10 seconds
    }

    // Check for new activities since last check
    async checkForNewActivities() {
        try {
            const lastCheck = localStorage.getItem('adminLastActivityCheck') || new Date(Date.now() - 60000).toISOString();
            
            const response = await fetch(`${this.apiBaseUrl}/api/activity/dashboard-events?since=${lastCheck}&limit=10`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.events.length > 0) {
                    this.showNewActivityAlert(data.data.events.length);
                    // Update last check time
                    localStorage.setItem('adminLastActivityCheck', new Date().toISOString());
                }
            }
        } catch (error) {
            console.error('Error checking for new activities:', error);
        }
    }

    // Show alert for new activities
    showNewActivityAlert(count) {
        // Create or update alert notification
        let alert = document.getElementById('new-activity-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'new-activity-alert';
            alert.className = 'activity-alert';
            document.body.appendChild(alert);
        }

        alert.innerHTML = `
            <i class="fas fa-bell"></i>
            ${count} new user activit${count > 1 ? 'ies' : 'y'}
        `;
        
        alert.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }

    // Utility methods
    getActivityIcon(activityType) {
        const icons = {
            'login': 'sign-in-alt',
            'loan_application': 'hand-holding-usd',
            'investment': 'chart-line',
            'transaction_completed': 'exchange-alt',
            'profile_update': 'user-edit',
            'kyc_submitted': 'user-check',
            'page_view': 'eye',
            'button_click': 'mouse-pointer',
            'session_start': 'play',
            'session_end': 'stop',
            'default': 'circle'
        };
        return icons[activityType] || icons.default;
    }

    getNotificationIcon(notificationType) {
        const icons = {
            'new_loan_application': 'file-invoice-dollar',
            'large_investment': 'coins',
            'suspicious_activity': 'exclamation-triangle',
            'account_change': 'user-cog',
            'security_alert': 'shield-alt',
            'new_user': 'user-plus',
            'default': 'bell'
        };
        return icons[notificationType] || icons.default;
    }

    getEventIcon(eventType) {
        const icons = {
            'user_login': 'sign-in-alt',
            'loan_created': 'file-invoice',
            'investment_made': 'chart-line',
            'transaction_completed': 'exchange-alt',
            'profile_updated': 'user-edit',
            'default': 'circle'
        };
        return icons[eventType] || icons.default;
    }

    formatActivityTitle(activity) {
        const titles = {
            'login': 'User logged in',
            'loan_application': 'Loan application submitted',
            'investment': 'Investment made',
            'transaction_completed': 'Transaction completed',
            'profile_update': 'Profile updated',
            'kyc_submitted': 'KYC documents submitted',
            'page_view': 'Page viewed',
            'button_click': 'Button clicked',
            'session_start': 'Session started',
            'session_end': 'Session ended'
        };
        return titles[activity.activity_type] || activity.activity_type.replace(/_/g, ' ');
    }

    formatEventTitle(event) {
        return event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }

    updateActivityChart(activityByType) {
        // This would update a chart showing activities by type
        // Implementation depends on the charting library used
        console.log('Activity by type:', activityByType);
    }
}

// Global instance
window.AdminActivityMonitor = new AdminActivityMonitor();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminActivityMonitor;
}

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

            // Initialize advanced features
            this.initializeAdvancedFeatures();

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
            <div class="activity-item ${this.getActivityCategory(activity.activity_type)}" data-activity-id="${activity.id}">
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
    // Get activity icon
    getActivityIcon(activityType) {
        const icons = {
            // Navigation activities
            'tab_navigation': 'exchange-alt',
            'tab_interaction': 'mouse-pointer',
            
            // Loan activities
            'loan_application_started': 'file-plus',
            'loan_application': 'file-invoice-dollar',
            'loan_details_view': 'search',
            
            // Wallet activities
            'wallet_section_access': 'wallet',
            'wallet_withdrawal_attempt': 'money-bill-wave',
            'wallet_deposit_attempt': 'money-bill',
            'wallet_balance_check': 'balance-scale',
            
            // Investment activities
            'investment_section_access': 'chart-line',
            'investment_opportunity_view': 'search-dollar',
            'investment': 'chart-line',
            'large_investment': 'coins',
            
            // Transaction activities
            'transaction_section_access': 'exchange-alt',
            'transaction_details_view': 'search',
            'transaction_completed': 'exchange-alt',
            
            // Referral activities
            'referral_section_access': 'gift',
            'referral_code_generated': 'ticket-alt',
            'referral_shared': 'share-alt',
            
            // Settings activities
            'settings_section_access': 'cog',
            'profile_update': 'user-edit',
            'account_change': 'user-cog',
            
            // Security activities
            'password_change': 'key',
            '2fa_enabled': 'shield-alt',
            'security_alert': 'exclamation-triangle',
            'suspicious_activity': 'user-shield',
            
            // Form activities
            'form_submission': 'paper-plane',
            'form_interaction': 'edit',
            
            // General activities
            'button_click': 'mouse-pointer',
            'login': 'sign-in-alt',
            'page_view': 'eye',
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
            // Navigation activities
            'tab_navigation': `Navigated to ${activity.activity_data?.section_name || activity.activity_data?.to_section || 'section'}`,
            'tab_interaction': `Interacted with ${activity.activity_data?.tab_name || 'tab'}`,
            
            // Loan activities
            'loan_application_started': 'Started loan application',
            'loan_application': `Loan application for $${activity.activity_data?.amount || '0'}`,
            'loan_details_view': 'Viewed loan details',
            
            // Wallet activities
            'wallet_section_access': 'Accessed wallet',
            'wallet_withdrawal_attempt': `Withdrawal attempt: $${activity.activity_data?.amount || '0'}`,
            'wallet_deposit_attempt': `Deposit attempt: $${activity.activity_data?.amount || '0'}`,
            'wallet_balance_check': 'Checked wallet balance',
            
            // Investment activities
            'investment_section_access': 'Accessed investments',
            'investment_opportunity_view': 'Viewed investment opportunity',
            'investment': `Investment: $${activity.activity_data?.amount || '0'}`,
            'large_investment': `Large investment: $${activity.activity_data?.amount || '0'}`,
            
            // Transaction activities
            'transaction_section_access': 'Accessed transactions',
            'transaction_details_view': 'Viewed transaction details',
            'transaction_completed': `Transaction: $${activity.activity_data?.amount || '0'}`,
            
            // Referral activities
            'referral_section_access': 'Accessed referral program',
            'referral_code_generated': 'Generated referral code',
            'referral_shared': `Shared referral via ${activity.activity_data?.share_method || 'unknown'}`,
            
            // Settings activities
            'settings_section_access': 'Accessed settings',
            'profile_update': `Updated profile: ${activity.activity_data?.updated_fields?.join(', ') || 'multiple fields'}`,
            'account_change': 'Account settings changed',
            
            // Security activities
            'password_change': 'Password changed',
            '2fa_enabled': `2FA enabled: ${activity.activity_data?.method || 'unknown'}`,
            'security_alert': `Security alert: ${activity.activity_data?.alert_type || 'unknown'}`,
            'suspicious_activity': 'Suspicious activity detected',
            
            // Form activities
            'form_submission': `Form submitted: ${activity.activity_data?.form_id || 'unknown form'}`,
            'form_interaction': `Form interaction: ${activity.activity_data?.field_type || 'unknown field'}`,
            
            // Button activities
            'button_click': `Clicked: ${activity.activity_data?.button_text || 'button'}`,
            
            // General activities
            'login': 'User logged in',
            'page_view': 'Page viewed',
            'session_start': 'Session started',
            'session_end': 'Session ended',
            'kyc_submitted': 'KYC documents submitted'
        };
        
        return titles[activity.activity_type] || activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

    // Advanced filtering and search functionality
    addAdvancedFilters() {
        const filterPanel = document.createElement('div');
        filterPanel.className = 'filter-panel';
        filterPanel.innerHTML = `
            <div class="filter-group">
                <label>Activity Type:</label>
                <select id="activityTypeFilter" onchange="window.AdminActivityMonitor.applyFilters()">
                    <option value="all">All Activities</option>
                    <option value="financial">Financial</option>
                    <option value="security">Security</option>
                    <option value="navigation">Navigation</option>
                    <option value="engagement">Engagement</option>
                    <option value="loan">Loan Related</option>
                    <option value="wallet">Wallet Related</option>
                    <option value="investment">Investment Related</option>
                    <option value="transaction">Transaction Related</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Priority:</label>
                <select id="priorityFilter" onchange="window.AdminActivityMonitor.applyFilters()">
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Time Period:</label>
                <select id="timeFilter" onchange="window.AdminActivityMonitor.applyFilters()">
                    <option value="1h">Last Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h" selected>Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Search User:</label>
                <input type="text" id="userSearchFilter" placeholder="Search by name or email" onkeyup="window.AdminActivityMonitor.applyFilters()">
            </div>
            <div class="filter-actions">
                <button class="btn-primary" onclick="window.AdminActivityMonitor.applyFilters()">
                    <i class="fas fa-search"></i> Apply Filters
                </button>
                <button class="btn-secondary" onclick="window.AdminActivityMonitor.clearFilters()">
                    <i class="fas fa-times"></i> Clear
                </button>
            </div>
        `;
        
        // Insert filter panel at the top of activity monitoring section
        const activitySection = document.getElementById('activity-monitoring');
        const sectionHeader = activitySection.querySelector('.section-header');
        sectionHeader.insertAdjacentElement('afterend', filterPanel);
    }

    // Apply filters to activity display
    async applyFilters() {
        const activityType = document.getElementById('activityTypeFilter').value;
        const priority = document.getElementById('priorityFilter').value;
        const timePeriod = document.getElementById('timeFilter').value;
        const userSearch = document.getElementById('userSearchFilter').value.toLowerCase();
        
        try {
            let url = `${this.apiBaseUrl}/api/activity/recent?limit=50`;
            
            // Add time filter
            if (timePeriod !== 'all') {
                const hours = timePeriod.replace('h', '').replace('d', '');
                const since = new Date(Date.now() - (parseInt(hours) * 60 * 60 * 1000 * (timePeriod.includes('d') ? 24 : 1)));
                url += `&since=${since.toISOString()}`;
            }
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                let filteredActivities = data.data.activities;
                
                // Apply activity type filter
                if (activityType !== 'all') {
                    filteredActivities = filteredActivities.filter(activity => {
                        return this.getActivityCategory(activity.activity_type) === activityType;
                    });
                }
                
                // Apply user search filter
                if (userSearch) {
                    filteredActivities = filteredActivities.filter(activity => {
                        const userName = activity.profiles?.full_name || '';
                        const userEmail = activity.profiles?.email || '';
                        return userName.toLowerCase().includes(userSearch) || userEmail.toLowerCase().includes(userSearch);
                    });
                }
                
                // Update UI with filtered results
                this.updateRecentActivitiesUI(filteredActivities);
                
                // Show filter results count
                this.showFilterResults(filteredActivities.length, data.data.activities.length);
            }
        } catch (error) {
            console.error('Error applying filters:', error);
        }
    }

    // Get activity category for filtering
    getActivityCategory(activityType) {
        const categories = {
            // Financial
            'loan_application': 'financial',
            'loan_application_started': 'financial',
            'investment': 'financial',
            'large_investment': 'financial',
            'transaction_completed': 'financial',
            'wallet_withdrawal_attempt': 'financial',
            'wallet_deposit_attempt': 'financial',
            
            // Security
            'password_change': 'security',
            '2fa_enabled': 'security',
            'security_alert': 'security',
            'suspicious_activity': 'security',
            
            // Navigation
            'tab_navigation': 'navigation',
            'tab_interaction': 'navigation',
            
            // Loan specific
            'loan_details_view': 'loan',
            
            // Wallet specific
            'wallet_section_access': 'wallet',
            'wallet_balance_check': 'wallet',
            
            // Investment specific
            'investment_section_access': 'investment',
            'investment_opportunity_view': 'investment',
            
            // Transaction specific
            'transaction_section_access': 'transaction',
            'transaction_details_view': 'transaction',
            
            // Default to engagement
            'default': 'engagement'
        };
        
        return categories[activityType] || categories.default;
    }

    // Clear all filters
    clearFilters() {
        document.getElementById('activityTypeFilter').value = 'all';
        document.getElementById('priorityFilter').value = 'all';
        document.getElementById('timeFilter').value = '24h';
        document.getElementById('userSearchFilter').value = '';
        
        // Reload original data
        this.loadRecentActivities();
    }

    // Show filter results notification
    showFilterResults(filteredCount, totalCount) {
        let resultsAlert = document.getElementById('filter-results-alert');
        if (!resultsAlert) {
            resultsAlert = document.createElement('div');
            resultsAlert.id = 'filter-results-alert';
            resultsAlert.className = 'filter-results-alert';
            document.getElementById('activity-monitoring').insertBefore(resultsAlert, document.querySelector('.monitoring-grid'));
        }
        
        resultsAlert.innerHTML = `
            <i class="fas fa-filter"></i>
            Showing ${filteredCount} of ${totalCount} activities
        `;
        
        resultsAlert.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            resultsAlert.style.display = 'none';
        }, 3000);
    }

    // Export activity data
    async exportActivityData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity/recent?limit=1000&format=csv`, {
                headers: {
                    'Authorization': `Bearer ${this.adminToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `activity-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showExportSuccess();
            }
        } catch (error) {
            console.error('Error exporting data:', error);
        }
    }

    // Show export success notification
    showExportSuccess() {
        const successAlert = document.createElement('div');
        successAlert.className = 'export-success-alert';
        successAlert.innerHTML = `
            <i class="fas fa-check-circle"></i>
            Activity data exported successfully!
        `;
        
        document.body.appendChild(successAlert);
        successAlert.style.display = 'block';
        
        setTimeout(() => {
            successAlert.style.display = 'none';
            document.body.removeChild(successAlert);
        }, 3000);
    }

    // Initialize advanced features
    initializeAdvancedFeatures() {
        // Add filters to activity monitoring
        this.addAdvancedFilters();
        
        // Add export button
        const exportButton = document.createElement('button');
        exportButton.className = 'btn-export';
        exportButton.innerHTML = '<i class="fas fa-download"></i> Export Data';
        exportButton.onclick = () => this.exportActivityData();
        
        const headerActions = document.querySelector('#activity-monitoring .header-actions');
        if (headerActions) {
            headerActions.appendChild(exportButton);
        }
    }
}

// Global instance
window.AdminActivityMonitor = new AdminActivityMonitor();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminActivityMonitor;
}

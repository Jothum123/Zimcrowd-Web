/**
 * Notification Bell Icon Handler
 * Connects the bell icon to real-time notifications from backend
 */

class NotificationBell {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isOpen = false;
        this.pollInterval = null;
        this.apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
    }

    async init() {
        console.log('🔔 Initializing Notification Bell...');
        this.setupEventListeners();
        await this.loadNotifications();
        this.startPolling();
    }

    setupEventListeners() {
        // Bell icon click
        const bellBtn = document.getElementById('notification-btn');
        if (bellBtn) {
            bellBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePanel();
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notification-panel');
            const bellBtn = document.getElementById('notification-btn');
            
            if (this.isOpen && panel && !panel.contains(e.target) && !bellBtn.contains(e.target)) {
                this.closePanel();
            }
        });

        // Mark all as read button
        const markAllBtn = document.querySelector('.mark-all-read');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // View all notifications link
        const viewAllLink = document.querySelector('.notification-footer a');
        if (viewAllLink) {
            viewAllLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToNotificationsPage();
            });
        }
    }

    async loadNotifications() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Failed to load notifications:', response.status);
                return;
            }

            const data = await response.json();
            
            if (data.success) {
                this.notifications = data.notifications || [];
                this.unreadCount = data.unreadCount || 0;
                this.updateBadge();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    updateBadge() {
        const badge = document.getElementById('notification-count');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    renderNotifications() {
        const container = document.querySelector('.notification-list');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No notifications yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(notification => {
            const icon = this.getNotificationIcon(notification.type);
            const color = this.getNotificationColor(notification.type);
            const timeAgo = this.getTimeAgo(notification.created_at);

            return `
                <div class="notification-item ${notification.is_read ? '' : 'unread'}" 
                     data-id="${notification.id}"
                     onclick="notificationBell.handleNotificationClick('${notification.id}')">
                    <div class="notification-icon ${color}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <h4>${notification.title}</h4>
                        <p>${notification.message}</p>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    ${!notification.is_read ? '<div class="notification-dot"></div>' : ''}
                </div>
            `;
        }).join('');
    }

    getNotificationIcon(type) {
        const icons = {
            'loan': 'fa-hand-holding-usd',
            'investment': 'fa-chart-line',
            'payment': 'fa-credit-card',
            'wallet': 'fa-wallet',
            'security': 'fa-shield-alt',
            'system': 'fa-info-circle',
            'referral': 'fa-users',
            'kyc': 'fa-id-card',
            'default': 'fa-bell'
        };
        return icons[type] || icons.default;
    }

    getNotificationColor(type) {
        const colors = {
            'loan': 'warning',
            'investment': 'success',
            'payment': 'info',
            'wallet': 'success',
            'security': 'danger',
            'system': 'info',
            'referral': 'success',
            'kyc': 'warning',
            'default': 'info'
        };
        return colors[type] || colors.default;
    }

    getTimeAgo(timestamp) {
        const now = new Date();
        const notificationTime = new Date(timestamp);
        const diffMs = now - notificationTime;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return notificationTime.toLocaleDateString();
    }

    togglePanel() {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    openPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.add('active');
            this.isOpen = true;
        }
    }

    closePanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.classList.remove('active');
            this.isOpen = false;
        }
    }

    async handleNotificationClick(notificationId) {
        // Mark as read
        await this.markAsRead(notificationId);
        
        // Find notification and navigate if it has a link
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && notification.action_url) {
            window.location.href = notification.action_url;
        }
    }

    async markAsRead(notificationId) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update local state
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification && !notification.is_read) {
                    notification.is_read = true;
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    this.updateBadge();
                    this.renderNotifications();
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/api/notifications/mark-all-read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Update local state
                this.notifications.forEach(n => n.is_read = true);
                this.unreadCount = 0;
                this.updateBadge();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    navigateToNotificationsPage() {
        // Check if we're in dashboard with tab navigation
        if (typeof window.ProductionDataLoader !== 'undefined') {
            window.ProductionDataLoader.loadNotificationsPage();
            this.closePanel();
        } else {
            // Fallback to separate page if it exists
            window.location.href = '/notifications.html';
        }
    }

    startPolling() {
        // Poll for new notifications every 30 seconds
        this.pollInterval = setInterval(() => {
            this.loadNotifications();
        }, 30000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    // Public method to add a new notification (for real-time updates)
    addNotification(notification) {
        this.notifications.unshift(notification);
        if (this.notifications.length > 5) {
            this.notifications.pop();
        }
        if (!notification.is_read) {
            this.unreadCount++;
        }
        this.updateBadge();
        this.renderNotifications();
        
        // Show toast notification
        this.showToast(notification);
    }

    showToast(notification) {
        const toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.innerHTML = `
            <div class="notification-toast-icon ${this.getNotificationColor(notification.type)}">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-toast-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

// Initialize notification bell when DOM is ready
let notificationBell;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        notificationBell = new NotificationBell();
        notificationBell.init();
    });
} else {
    notificationBell = new NotificationBell();
    notificationBell.init();
}

// Export for use in other scripts
window.notificationBell = notificationBell;

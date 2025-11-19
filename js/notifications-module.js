/**
 * ZimCrowd Notifications Module
 * Handles in-app notifications, alerts, and notification management
 */

class NotificationsModule {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isOpen = false;
    }

    initialize() {
        console.log('🔔 Initializing Notifications Module...');
        
        this.setupEventListeners();
        this.loadNotifications();
        this.createNotificationPanel();
        
        console.log('✅ Notifications Module initialized');
    }

    setupEventListeners() {
        // Notification button click
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.toggleNotificationPanel();
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-panel') && !e.target.closest('#notificationBtn')) {
                this.closeNotificationPanel();
            }
        });
    }

    async loadNotifications() {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/notifications`,
                { headers: API_CONFIG.HEADERS }
            );

            if (response.ok) {
                const data = await response.json();
                this.notifications = data.data || [];
                this.updateUnreadCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            // Use mock notifications for development
            this.notifications = this.getMockNotifications();
            this.updateUnreadCount();
            this.renderNotifications();
        }
    }

    createNotificationPanel() {
        // Remove existing panel
        const existingPanel = document.getElementById('notificationPanel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Create notification panel
        const panel = document.createElement('div');
        panel.id = 'notificationPanel';
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div class="notification-header">
                <h3>Notifications</h3>
                <div class="notification-actions">
                    <button class="btn-text" onclick="NotificationsModule.markAllAsRead()">Mark all as read</button>
                    <button class="btn-text" onclick="NotificationsModule.clearAll()">Clear all</button>
                </div>
            </div>
            <div class="notification-list" id="notificationList">
                <div class="loading">
                    <div class="spinner"></div>
                    <p>Loading notifications...</p>
                </div>
            </div>
            <div class="notification-footer">
                <button class="btn btn-outline btn-sm" onclick="NotificationsModule.viewAllNotifications()">
                    View All Notifications
                </button>
            </div>
        `;

        // Append to body
        document.body.appendChild(panel);
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        if (this.isOpen) {
            this.closeNotificationPanel();
        } else {
            this.openNotificationPanel();
        }
    }

    openNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (!panel) return;

        // Position panel relative to notification button
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            const rect = notificationBtn.getBoundingClientRect();
            panel.style.top = (rect.bottom + 10) + 'px';
            panel.style.right = (window.innerWidth - rect.right) + 'px';
        }

        panel.classList.add('open');
        this.isOpen = true;

        // Mark notifications as read when opened
        this.markVisibleAsRead();
    }

    closeNotificationPanel() {
        const panel = document.getElementById('notificationPanel');
        if (panel) {
            panel.classList.remove('open');
        }
        this.isOpen = false;
    }

    renderNotifications() {
        const listContainer = document.getElementById('notificationList');
        if (!listContainer) return;

        if (this.notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        let html = '';
        this.notifications.slice(0, 10).forEach(notification => {
            html += this.renderNotificationItem(notification);
        });

        listContainer.innerHTML = html;
    }

    renderNotificationItem(notification) {
        const timeAgo = this.getTimeAgo(new Date(notification.created_at));
        const isUnread = !notification.read;

        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notification.title}</div>
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${isUnread ? '<div class="notification-dot"></div>' : ''}
                <button class="notification-close" onclick="NotificationsModule.dismissNotification('${notification.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        
        const countElement = document.getElementById('notificationCount');
        if (countElement) {
            countElement.textContent = this.unreadCount;
            countElement.style.display = this.unreadCount > 0 ? 'block' : 'none';
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/notifications/mark-all-read`,
                {
                    method: 'POST',
                    headers: API_CONFIG.HEADERS
                }
            );

            if (response.ok) {
                this.notifications.forEach(n => n.read = true);
                this.updateUnreadCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            // Fallback: mark locally
            this.notifications.forEach(n => n.read = true);
            this.updateUnreadCount();
            this.renderNotifications();
        }
    }

    async markVisibleAsRead() {
        const unreadNotifications = this.notifications.filter(n => !n.read).slice(0, 10);
        
        if (unreadNotifications.length === 0) return;

        try {
            const ids = unreadNotifications.map(n => n.id);
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/notifications/mark-read`,
                {
                    method: 'POST',
                    headers: API_CONFIG.HEADERS,
                    body: JSON.stringify({ ids })
                }
            );

            if (response.ok) {
                unreadNotifications.forEach(n => n.read = true);
                this.updateUnreadCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }

    async dismissNotification(id) {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/notifications/${id}`,
                {
                    method: 'DELETE',
                    headers: API_CONFIG.HEADERS
                }
            );

            if (response.ok) {
                this.notifications = this.notifications.filter(n => n.id !== id);
                this.updateUnreadCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error dismissing notification:', error);
            // Fallback: remove locally
            this.notifications = this.notifications.filter(n => n.id !== id);
            this.updateUnreadCount();
            this.renderNotifications();
        }
    }

    async clearAll() {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/notifications/clear-all`,
                {
                    method: 'DELETE',
                    headers: API_CONFIG.HEADERS
                }
            );

            if (response.ok) {
                this.notifications = [];
                this.updateUnreadCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error clearing notifications:', error);
            // Fallback: clear locally
            this.notifications = [];
            this.updateUnreadCount();
            this.renderNotifications();
        }
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${this.getToastIcon(type)}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to toast container or create one
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);

        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);

        // Add to notifications list
        this.addNotification({
            id: Date.now().toString(),
            title: this.getToastTitle(type),
            message: message,
            type: type,
            created_at: new Date().toISOString(),
            read: false
        });
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        this.updateUnreadCount();
        
        if (this.isOpen) {
            this.renderNotifications();
        }
    }

    viewAllNotifications() {
        // Could navigate to a dedicated notifications page
        console.log('View all notifications');
        this.closeNotificationPanel();
    }

    // Utility methods
    getNotificationIcon(type) {
        const icons = {
            'success': 'fa-check-circle',
            'warning': 'fa-exclamation-triangle',
            'error': 'fa-times-circle',
            'info': 'fa-info-circle',
            'loan': 'fa-money-bill-wave',
            'investment': 'fa-chart-line',
            'payment': 'fa-credit-card',
            'security': 'fa-shield-alt'
        };
        return icons[type] || 'fa-bell';
    }

    getToastIcon(type) {
        const icons = {
            'success': 'fa-check',
            'warning': 'fa-exclamation',
            'error': 'fa-times',
            'info': 'fa-info'
        };
        return icons[type] || 'fa-info';
    }

    getToastTitle(type) {
        const titles = {
            'success': 'Success',
            'warning': 'Warning',
            'error': 'Error',
            'info': 'Information'
        };
        return titles[type] || 'Notification';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }

    getMockNotifications() {
        return [
            {
                id: '1',
                title: 'Loan Payment Due',
                message: 'Your loan payment of $250 is due in 3 days.',
                type: 'warning',
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                read: false
            },
            {
                id: '2',
                title: 'Investment Update',
                message: 'Your portfolio gained 2.5% this week!',
                type: 'success',
                created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                read: false
            },
            {
                id: '3',
                title: 'Security Alert',
                message: 'New login detected from Chrome on Windows.',
                type: 'security',
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                read: true
            },
            {
                id: '4',
                title: 'Payment Received',
                message: 'You received $500 from John Doe.',
                type: 'payment',
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                read: true
            }
        ];
    }

    // Static methods for global access
    static markAllAsRead() {
        if (window.NotificationsModule) {
            window.NotificationsModule.markAllAsRead();
        }
    }

    static clearAll() {
        if (window.NotificationsModule) {
            window.NotificationsModule.clearAll();
        }
    }

    static dismissNotification(id) {
        if (window.NotificationsModule) {
            window.NotificationsModule.dismissNotification(id);
        }
    }

    static viewAllNotifications() {
        if (window.NotificationsModule) {
            window.NotificationsModule.viewAllNotifications();
        }
    }

    static showToast(message, type = 'info', duration = 5000) {
        if (window.NotificationsModule) {
            window.NotificationsModule.showToast(message, type, duration);
        }
    }
}

// Initialize notifications module
window.NotificationsModule = new NotificationsModule();

// Auto-initialize when dashboard loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.NotificationsModule) {
        window.NotificationsModule.initialize();
    }
});

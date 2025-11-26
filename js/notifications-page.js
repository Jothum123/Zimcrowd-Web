/**
 * Notifications Page - Production Ready
 * Handles notification display, filtering, and real-time updates
 */

const NotificationsPage = {
    notifications: [],
    currentPage: 1,
    totalPages: 1,
    unreadCount: 0,
    currentFilter: 'all', // all, unread, read
    currentCategory: 'all', // all, loans, investments, payments, system, referrals
    
    async init() {
        console.log('📬 Initializing Notifications Page...');
        this.setupEventListeners();
        await this.loadNotifications();
        this.startRealTimeUpdates();
    },
    
    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.notification-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });
        
        // Category tabs
        document.querySelectorAll('.notification-category-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.handleCategoryChange(e.target.dataset.category);
            });
        });
        
        // Mark all as read
        const markAllBtn = document.getElementById('markAllReadBtn');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllAsRead());
        }
        
        // Clear all notifications
        const clearAllBtn = document.getElementById('clearAllBtn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllNotifications());
        }
    },
    
    async loadNotifications(page = 1) {
        try {
            const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
            const token = localStorage.getItem('authToken');
            
            const params = new URLSearchParams({
                page: page,
                limit: 20,
                unread_only: this.currentFilter === 'unread' ? 'true' : 'false'
            });
            
            if (this.currentCategory !== 'all') {
                params.append('category', this.currentCategory);
            }
            
            const response = await fetch(`${apiBase}/api/notifications?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.notifications = result.data || [];
                this.currentPage = result.pagination?.page || 1;
                this.totalPages = result.pagination?.pages || 1;
                this.unreadCount = result.unreadCount || 0;
                
                this.renderNotifications();
                this.updateUnreadBadge();
                this.updatePagination();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showError('Failed to load notifications');
        }
    },
    
    renderNotifications() {
        const container = document.getElementById('notificationsContainer');
        if (!container) return;
        
        if (this.notifications.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }
        
        container.innerHTML = this.notifications.map(notification => 
            this.getNotificationHTML(notification)
        ).join('');
        
        // Add click handlers
        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.notificationId;
                this.handleNotificationClick(id);
            });
        });
    },
    
    getNotificationHTML(notification) {
        const isUnread = !notification.is_read;
        const icon = this.getNotificationIcon(notification.category || notification.notification_type);
        const timeAgo = this.getTimeAgo(notification.created_at);
        const priorityClass = notification.priority === 'urgent' ? 'urgent' : notification.priority === 'high' ? 'high' : '';
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''} ${priorityClass}" 
                 data-notification-id="${notification.id}">
                <div class="notification-icon ${notification.category || 'general'}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h4 class="notification-title">${notification.title}</h4>
                        <span class="notification-time">${timeAgo}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    ${notification.action_url ? `
                        <a href="${notification.action_url}" class="notification-action" onclick="event.stopPropagation()">
                            View Details <i class="fas fa-arrow-right"></i>
                        </a>
                    ` : ''}
                </div>
                ${isUnread ? '<div class="notification-unread-dot"></div>' : ''}
                <div class="notification-actions">
                    <button class="notification-action-btn" onclick="event.stopPropagation(); NotificationsPage.markAsRead('${notification.id}')" title="Mark as read">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="notification-action-btn" onclick="event.stopPropagation(); NotificationsPage.deleteNotification('${notification.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },
    
    getNotificationIcon(category) {
        const icons = {
            'loans': 'fa-hand-holding-usd',
            'investments': 'fa-chart-line',
            'payments': 'fa-credit-card',
            'wallet': 'fa-wallet',
            'referrals': 'fa-users',
            'system': 'fa-cog',
            'security': 'fa-shield-alt',
            'marketing': 'fa-bullhorn',
            'general': 'fa-bell'
        };
        return icons[category] || icons['general'];
    },
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000); // seconds
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        
        return time.toLocaleDateString();
    },
    
    getEmptyState() {
        const messages = {
            'all': {
                icon: 'fa-bell-slash',
                title: 'No Notifications',
                message: 'You\'re all caught up! No notifications to display.'
            },
            'unread': {
                icon: 'fa-check-circle',
                title: 'All Caught Up!',
                message: 'You have no unread notifications.'
            },
            'read': {
                icon: 'fa-inbox',
                title: 'No Read Notifications',
                message: 'You haven\'t read any notifications yet.'
            }
        };
        
        const state = messages[this.currentFilter] || messages['all'];
        
        return `
            <div class="empty-state">
                <i class="fas ${state.icon}"></i>
                <h3>${state.title}</h3>
                <p>${state.message}</p>
            </div>
        `;
    },
    
    async handleNotificationClick(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (!notification) return;
        
        // Mark as read if unread
        if (!notification.is_read) {
            await this.markAsRead(id);
        }
        
        // Navigate to action URL if exists
        if (notification.action_url) {
            window.location.href = notification.action_url;
        }
    },
    
    async markAsRead(id) {
        try {
            const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${apiBase}/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // Update local state
                const notification = this.notifications.find(n => n.id === id);
                if (notification) {
                    notification.is_read = true;
                    notification.read_at = new Date().toISOString();
                }
                
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.renderNotifications();
                this.updateUnreadBadge();
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    },
    
    async markAllAsRead() {
        try {
            const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${apiBase}/api/notifications/mark-all-read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.notifications.forEach(n => {
                    n.is_read = true;
                    n.read_at = new Date().toISOString();
                });
                
                this.unreadCount = 0;
                this.renderNotifications();
                this.updateUnreadBadge();
                
                this.showSuccess('All notifications marked as read');
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            this.showError('Failed to mark all as read');
        }
    },
    
    async deleteNotification(id) {
        if (!confirm('Delete this notification?')) return;
        
        try {
            const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${apiBase}/api/notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.notifications = this.notifications.filter(n => n.id !== id);
                this.renderNotifications();
                this.showSuccess('Notification deleted');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showError('Failed to delete notification');
        }
    },
    
    async clearAllNotifications() {
        if (!confirm('Clear all notifications? This action cannot be undone.')) return;
        
        try {
            const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${apiBase}/api/notifications/clear-all`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.notifications = [];
                this.unreadCount = 0;
                this.renderNotifications();
                this.updateUnreadBadge();
                this.showSuccess('All notifications cleared');
            }
        } catch (error) {
            console.error('Error clearing notifications:', error);
            this.showError('Failed to clear notifications');
        }
    },
    
    handleFilterChange(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        
        // Update active button
        document.querySelectorAll('.notification-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.loadNotifications();
    },
    
    handleCategoryChange(category) {
        this.currentCategory = category;
        this.currentPage = 1;
        
        // Update active tab
        document.querySelectorAll('.notification-category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        this.loadNotifications();
    },
    
    updateUnreadBadge() {
        // Update header badge
        const headerBadge = document.querySelector('.notification-badge');
        if (headerBadge) {
            if (this.unreadCount > 0) {
                headerBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                headerBadge.style.display = 'flex';
            } else {
                headerBadge.style.display = 'none';
            }
        }
        
        // Update page badge
        const pageBadge = document.getElementById('notificationPageBadge');
        if (pageBadge) {
            pageBadge.textContent = `${this.unreadCount} unread`;
        }
    },
    
    updatePagination() {
        const container = document.getElementById('notificationsPagination');
        if (!container || this.totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }
        
        let html = '<div class="pagination">';
        
        // Previous button
        html += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="NotificationsPage.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === 1 || i === this.totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                html += `
                    <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="NotificationsPage.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                html += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        // Next button
        html += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                    onclick="NotificationsPage.goToPage(${this.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.loadNotifications(page);
    },
    
    startRealTimeUpdates() {
        // Poll for new notifications every 30 seconds
        setInterval(() => {
            this.checkForNewNotifications();
        }, 30000);
    },
    
    async checkForNewNotifications() {
        try {
            const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
            const token = localStorage.getItem('authToken');
            
            const response = await fetch(`${apiBase}/api/notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const newUnreadCount = result.count || 0;
                
                if (newUnreadCount > this.unreadCount) {
                    // New notifications arrived
                    this.loadNotifications(this.currentPage);
                }
            }
        } catch (error) {
            console.error('Error checking for new notifications:', error);
        }
    },
    
    showSuccess(message) {
        // Use existing toast/alert system
        if (window.showToast) {
            window.showToast(message, 'success');
        } else {
            alert(message);
        }
    },
    
    showError(message) {
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            alert(message);
        }
    }
};

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('notifications-section')) {
            NotificationsPage.init();
        }
    });
} else {
    if (document.getElementById('notifications-section')) {
        NotificationsPage.init();
    }
}

// Export for use in other scripts
window.NotificationsPage = NotificationsPage;

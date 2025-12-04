/**
 * Toast/Push Notification System for User Dashboard
 * Provides real-time feedback for user actions and system events
 */

class ToastNotificationSystem {
    constructor() {
        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 4000;
        this.container = null;
        this.isInitialized = false;
        
        // Notification types with their configurations
        this.notificationTypes = {
            success: {
                icon: 'fa-check-circle',
                color: '#10b981',
                bgColor: 'linear-gradient(135deg, #10b981, #34d399)',
                duration: 3000
            },
            error: {
                icon: 'fa-exclamation-circle',
                color: '#ef4444',
                bgColor: 'linear-gradient(135deg, #ef4444, #f87171)',
                duration: 5000
            },
            warning: {
                icon: 'fa-exclamation-triangle',
                color: '#f59e0b',
                bgColor: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                duration: 4000
            },
            info: {
                icon: 'fa-info-circle',
                color: '#3b82f6',
                bgColor: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                duration: 3000
            },
            loan: {
                icon: 'fa-hand-holding-usd',
                color: '#38e07b',
                bgColor: 'linear-gradient(135deg, #38e07b, #34d399)',
                duration: 4000
            },
            investment: {
                icon: 'fa-chart-line',
                color: '#8b5cf6',
                bgColor: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
                duration: 4000
            },
            transaction: {
                icon: 'fa-exchange-alt',
                color: '#f97316',
                bgColor: 'linear-gradient(135deg, #f97316, #fb923c)',
                duration: 4000
            },
            security: {
                icon: 'fa-shield-alt',
                color: '#dc2626',
                bgColor: 'linear-gradient(135deg, #dc2626, #ef4444)',
                duration: 6000
            },
            referral: {
                icon: 'fa-gift',
                color: '#ec4899',
                bgColor: 'linear-gradient(135deg, #ec4899, #f472b6)',
                duration: 4000
            }
        };
    }

    /**
     * Initialize the toast notification system
     */
    initialize() {
        if (this.isInitialized) return;

        this.createContainer();
        this.addStyles();
        this.setupEventListeners();
        this.isInitialized = true;

        console.log('✅ Toast Notification System initialized');
    }

    /**
     * Create the notification container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'toast-notification-container';
        this.container.className = 'toast-notification-container';
        document.body.appendChild(this.container);
    }

    /**
     * Add CSS styles for notifications
     */
    addStyles() {
        const styles = `
            .toast-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                pointer-events: none;
            }

            .toast-notification {
                background: #1f2937;
                border-radius: 12px;
                padding: 16px;
                min-width: 320px;
                max-width: 400px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                pointer-events: auto;
                transform: translateX(100%);
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                position: relative;
                overflow: hidden;
            }

            .toast-notification.show {
                transform: translateX(0);
                opacity: 1;
            }

            .toast-notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .toast-notification::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 4px;
                background: var(--toast-color);
            }

            .toast-notification-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 8px;
            }

            .toast-notification-icon {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: var(--toast-bg);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 14px;
            }

            .toast-notification-title {
                flex: 1;
                font-weight: 600;
                color: white;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .toast-notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                font-size: 16px;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .toast-notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }

            .toast-notification-message {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 8px;
            }

            .toast-notification-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            .toast-notification-action {
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-decoration: none;
                display: inline-block;
            }

            .toast-notification-action:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }

            .toast-notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: var(--toast-color);
                transition: width linear;
            }

            /* Mobile responsive */
            @media (max-width: 640px) {
                .toast-notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                }

                .toast-notification {
                    min-width: auto;
                    max-width: none;
                }
            }

            /* Notification animations */
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            @keyframes pulse {
                0%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.05);
                }
            }

            .toast-notification.urgent {
                animation: slideInRight 0.3s ease-out, pulse 2s infinite;
            }

            /* Stack management */
            .toast-notification:nth-child(1) { z-index: 10000; }
            .toast-notification:nth-child(2) { z-index: 9999; }
            .toast-notification:nth-child(3) { z-index: 9998; }
            .toast-notification:nth-child(4) { z-index: 9997; }
            .toast-notification:nth-child(5) { z-index: 9996; }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Clear all notifications with Escape key
            if (e.key === 'Escape') {
                this.clearAll();
            }
        });

        // Pause auto-hide on hover
        this.container.addEventListener('mouseenter', () => {
            this.notifications.forEach(notification => {
                if (notification.autoHideTimer) {
                    clearTimeout(notification.autoHideTimer);
                }
            });
        });

        this.container.addEventListener('mouseleave', () => {
            this.notifications.forEach(notification => {
                if (notification.autoHide) {
                    this.setAutoHideTimer(notification);
                }
            });
        });
    }

    /**
     * Show a toast notification
     */
    show(options) {
        if (!this.isInitialized) {
            this.initialize();
        }

        // Normalize options
        const notification = {
            id: Date.now() + Math.random(),
            type: options.type || 'info',
            title: options.title || 'Notification',
            message: options.message || '',
            duration: options.duration !== undefined ? options.duration : this.defaultDuration,
            autoHide: options.autoHide !== false,
            persistent: options.persistent || false,
            actions: options.actions || [],
            urgent: options.urgent || false,
            onClick: options.onClick || null,
            ...options
        };

        // Get type configuration
        const typeConfig = this.notificationTypes[notification.type] || this.notificationTypes.info;

        // Create notification element
        const element = this.createNotificationElement(notification, typeConfig);
        
        // Add to container
        this.container.appendChild(element);

        // Store notification
        notification.element = element;
        this.notifications.push(notification);

        // Manage stack size
        this.manageStackSize();

        // Show notification
        setTimeout(() => {
            element.classList.add('show');
            
            // Set auto-hide timer
            if (notification.autoHide && !notification.persistent) {
                this.setAutoHideTimer(notification);
            }
        }, 10);

        // Log notification
        console.log(`🔔 Toast notification shown: ${notification.title} - ${notification.message}`);

        return notification.id;
    }

    /**
     * Create notification DOM element
     */
    createNotificationElement(notification, typeConfig) {
        const element = document.createElement('div');
        element.className = `toast-notification ${notification.type} ${notification.urgent ? 'urgent' : ''}`;
        element.dataset.notificationId = notification.id;
        
        // Set CSS variables for styling
        element.style.setProperty('--toast-color', typeConfig.color);
        element.style.setProperty('--toast-bg', typeConfig.bgColor);

        // Build notification HTML
        let actionsHTML = '';
        if (notification.actions.length > 0) {
            actionsHTML = `
                <div class="toast-notification-actions">
                    ${notification.actions.map(action => 
                        `<${action.href ? 'a' : 'button'} 
                            class="toast-notification-action" 
                            ${action.href ? `href="${action.href}"` : `onclick="${action.onclick}"`}
                            ${action.target ? `target="${action.target}"` : ''}>
                            ${action.text}
                        </${action.href ? 'a' : 'button'}>`
                    ).join('')}
                </div>
            `;
        }

        element.innerHTML = `
            <div class="toast-notification-header">
                <div class="toast-notification-icon">
                    <i class="fas ${typeConfig.icon}"></i>
                </div>
                <div class="toast-notification-title">${notification.title}</div>
                <button class="toast-notification-close" onclick="window.ToastNotifications.hide('${notification.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${notification.message ? `<div class="toast-notification-message">${notification.message}</div>` : ''}
            ${actionsHTML}
            ${notification.autoHide && !notification.persistent ? '<div class="toast-notification-progress"></div>' : ''}
        `;

        // Add click handler
        if (notification.onClick) {
            element.addEventListener('click', (e) => {
                if (!e.target.closest('.toast-notification-close') && !e.target.closest('.toast-notification-action')) {
                    notification.onClick(notification);
                }
            });
            element.style.cursor = 'pointer';
        }

        return element;
    }

    /**
     * Set auto-hide timer for notification
     */
    setAutoHideTimer(notification) {
        const typeConfig = this.notificationTypes[notification.type] || this.notificationTypes.info;
        const duration = notification.duration || typeConfig.duration;

        // Start progress bar animation
        const progressBar = notification.element.querySelector('.toast-notification-progress');
        if (progressBar) {
            progressBar.style.transition = `width ${duration}ms linear`;
            progressBar.style.width = '0%';
        }

        notification.autoHideTimer = setTimeout(() => {
            this.hide(notification.id);
        }, duration);
    }

    /**
     * Hide a specific notification
     */
    hide(notificationId) {
        const notification = this.notifications.find(n => n.id == notificationId);
        if (!notification) return;

        // Clear auto-hide timer
        if (notification.autoHideTimer) {
            clearTimeout(notification.autoHideTimer);
        }

        // Add hide animation
        notification.element.classList.add('hide');

        // Remove after animation
        setTimeout(() => {
            if (notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
            
            // Remove from notifications array
            this.notifications = this.notifications.filter(n => n.id != notificationId);
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach(notification => {
            if (notification.autoHideTimer) {
                clearTimeout(notification.autoHideTimer);
            }
            
            notification.element.classList.add('hide');
            
            setTimeout(() => {
                if (notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            }, 100);
        });

        this.notifications = [];
    }

    /**
     * Manage notification stack size
     */
    manageStackSize() {
        if (this.notifications.length > this.maxNotifications) {
            const oldestNotification = this.notifications[0];
            this.hide(oldestNotification.id);
        }
    }

    /**
     * Convenience methods for different notification types
     */
    success(title, message, options = {}) {
        return this.show({ type: 'success', title, message, ...options });
    }

    error(title, message, options = {}) {
        return this.show({ type: 'error', title, message, urgent: true, ...options });
    }

    warning(title, message, options = {}) {
        return this.show({ type: 'warning', title, message, ...options });
    }

    info(title, message, options = {}) {
        return this.show({ type: 'info', title, message, ...options });
    }

    loan(title, message, options = {}) {
        return this.show({ 
            type: 'loan', 
            title, 
            message, 
            actions: [
                { text: 'View Loans', href: '#loans', onclick: 'showSection("loans")' }
            ],
            ...options 
        });
    }

    investment(title, message, options = {}) {
        return this.show({ 
            type: 'investment', 
            title, 
            message, 
            actions: [
                { text: 'View Investments', href: '#investments', onclick: 'showSection("investments")' }
            ],
            ...options 
        });
    }

    transaction(title, message, options = {}) {
        return this.show({ 
            type: 'transaction', 
            title, 
            message, 
            actions: [
                { text: 'View Transactions', href: '#transactions', onclick: 'showSection("transactions")' }
            ],
            ...options 
        });
    }

    security(title, message, options = {}) {
        return this.show({ 
            type: 'security', 
            title, 
            message, 
            urgent: true, 
            persistent: true,
            duration: 10000,
            ...options 
        });
    }

    referral(title, message, options = {}) {
        return this.show({ 
            type: 'referral', 
            title, 
            message, 
            actions: [
                { text: 'Refer Friends', href: '#referrals', onclick: 'showSection("referrals")' }
            ],
            ...options 
        });
    }

    /**
     * Show notification for activity completion
     */
    activityCompleted(activityType, details) {
        const messages = {
            loan_application: {
                title: 'Loan Application Submitted',
                message: `Your loan application for $${details.amount} has been submitted successfully.`,
                type: 'loan'
            },
            investment_made: {
                title: 'Investment Completed',
                message: `Your investment of $${details.amount} has been processed successfully.`,
                type: 'investment'
            },
            transaction_completed: {
                title: 'Transaction Successful',
                message: `Your transaction of $${details.amount} has been completed.`,
                type: 'transaction'
            },
            profile_updated: {
                title: 'Profile Updated',
                message: 'Your profile has been updated successfully.',
                type: 'success'
            },
            password_changed: {
                title: 'Password Changed',
                message: 'Your password has been changed successfully.',
                type: 'security'
            },
            2fa_enabled: {
                title: '2FA Enabled',
                message: 'Two-factor authentication has been enabled for your account.',
                type: 'security'
            }
        };

        const config = messages[activityType] || {
            title: 'Activity Completed',
            message: 'Your action has been completed successfully.',
            type: 'success'
        };

        return this.show(config);
    }

    /**
     * Show error notification for activity failure
     */
    activityFailed(activityType, error) {
        const messages = {
            loan_application: {
                title: 'Loan Application Failed',
                message: 'There was an error submitting your loan application. Please try again.',
                type: 'error'
            },
            investment_made: {
                title: 'Investment Failed',
                message: 'There was an error processing your investment. Please try again.',
                type: 'error'
            },
            transaction_completed: {
                title: 'Transaction Failed',
                message: 'There was an error processing your transaction. Please try again.',
                type: 'error'
            },
            profile_updated: {
                title: 'Profile Update Failed',
                message: 'There was an error updating your profile. Please try again.',
                type: 'error'
            }
        };

        const config = messages[activityType] || {
            title: 'Action Failed',
            message: error || 'There was an error processing your request. Please try again.',
            type: 'error'
        };

        return this.show(config);
    }
}

// Create global instance
window.ToastNotifications = new ToastNotificationSystem();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ToastNotifications.initialize();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastNotificationSystem;
}

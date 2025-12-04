/**
 * Simple Test Notification System
 * Replaces complex toast notifications with simple test notifications
 */

class TestNotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the test notification system
     */
    initialize() {
        if (this.isInitialized) return;

        this.createContainer();
        this.addStyles();
        this.isInitialized = true;

        console.log('✅ Test Notification System initialized');
    }

    /**
     * Create the notification container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'test-notification-container';
        this.container.className = 'test-notification-container';
        document.body.appendChild(this.container);
    }

    /**
     * Add CSS styles for notifications
     */
    addStyles() {
        const styles = `
            .test-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .test-notification {
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 12px;
                padding: 20px;
                min-width: 320px;
                max-width: 420px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                backdrop-filter: blur(10px);
            }

            .test-notification.success {
                border-left: 4px solid #10b981;
            }

            .test-notification.error {
                border-left: 4px solid #ef4444;
            }

            .test-notification.warning {
                border-left: 4px solid #f59e0b;
            }

            .test-notification.info {
                border-left: 4px solid #3b82f6;
            }

            .test-notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .test-notification-title {
                font-weight: 600;
                font-size: 16px;
                color: white;
                letter-spacing: -0.025em;
            }

            .test-notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.6);
                cursor: pointer;
                font-size: 20px;
                padding: 0;
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                transition: all 0.2s ease;
                font-weight: 300;
            }

            .test-notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }

            .test-notification-message {
                color: rgba(255, 255, 255, 0.8);
                font-size: 15px;
                line-height: 1.5;
                font-weight: 400;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            .test-notification.hiding {
                animation: slideOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Show a notification
     */
    show(title, message, type = 'info', options = {}) {
        console.log('🔔 TestNotification showing:', { title, message, type, options });
        
        const notification = document.createElement('div');
        notification.className = `test-notification ${type}`;
        
        const icon = this.config.icons[type] || this.config.icons.info;
        const color = this.config.colors[type] || this.config.colors.info;
        
        notification.innerHTML = `
            <div class="test-notification-icon" style="color: ${color}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="test-notification-content">
                <div class="test-notification-title">${title}</div>
                ${message ? `<div class="test-notification-message">${message}</div>` : ''}
            </div>
            <button class="test-notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        const container = this.getOrCreateContainer();
        container.appendChild(notification);
        
        // Auto remove
        const duration = options.duration || this.config.defaultDuration;
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);
        
        return notification;
    }

    /**
     * Get or create the notification container
     */
    getOrCreateContainer() {
        if (this.container) {
            return this.container;
        }

        this.createContainer();
        return this.container;
    }

    /**
     * Convenience methods
     */
    success(title, message) {
        this.show(title, message, 'success');
    }

    error(title, message) {
        this.show(title, message, 'error', 6000);
    }

    warning(title, message) {
        this.show(title, message, 'warning');
    }

    info(title, message) {
        this.show(title, message, 'info');
    }

    /**
     * Real Dashboard Data Notifications
     */
    
    // Profile notifications
    profileUpdated() {
        this.success('Profile Updated', 'Your profile information has been saved successfully!');
    }

    profileUpdateFailed(error) {
        this.error('Profile Update Failed', error || 'Failed to update profile. Please try again.');
    }

    // Security notifications
    passwordChanged() {
        this.success('Password Changed', 'Your password has been updated successfully!');
    }

    twoFactorEnabled() {
        this.success('2FA Enabled', 'Two-factor authentication is now active on your account!');
    }

    twoFactorDisabled() {
        this.warning('2FA Disabled', 'Two-factor authentication has been turned off');
    }

    securitySettingsSaved() {
        this.success('Security Settings', 'Your security preferences have been saved!');
    }

    // Wallet notifications
    transactionCompleted(type, amount, description) {
        this.success('Transaction Complete', `${type}: $${amount} - ${description}`);
    }

    withdrawalProcessed(amount) {
        this.success('Withdrawal Processed', `$${amount} has been sent to your account`);
    }

    depositReceived(amount) {
        this.success('Deposit Received', `$${amount} has been added to your wallet`);
    }

    // Loan notifications
    loanApproved(amount) {
        this.success('Loan Approved', `Your loan application for $${amount} has been approved!`);
    }

    loanRejected(reason) {
        this.error('Loan Rejected', reason || 'Your loan application could not be approved at this time');
    }

    paymentDue(amount, dueDate) {
        this.warning('Payment Due', `Payment of $${amount} is due on ${dueDate}`);
    }

    paymentCompleted(amount) {
        this.success('Payment Complete', `Your payment of $${amount} has been processed`);
    }

    // Investment notifications
    investmentOpportunity(title, expectedReturn) {
        this.info('New Investment', `${title} - Expected return: ${expectedReturn}`);
    }

    investmentPurchased(title, amount) {
        this.success('Investment Made', `You've invested $${amount} in ${title}`);
    }

    investmentReturn(amount, type) {
        this.success('Return Received', `${type}: $${amount} has been added to your wallet`);
    }

    // Referral notifications
    referralEarnings(amount, referralName) {
        this.success('Referral Bonus', `You earned $${amount} from ${referralName}'s signup!`);
    }

    newReferral(name) {
        this.info('New Referral', `${name} joined using your referral link!`);
    }

    // System notifications
    dataSynced() {
        this.info('Data Synced', 'Your dashboard data has been updated');
    }

    settingsSaved(category) {
        this.success('Settings Saved', `${category} preferences have been updated`);
    }

    notificationPreferenceUpdated(type, status) {
        this.success('Notifications Updated', `${type} notifications ${status}`);
    }

    // Error notifications
    networkError(action) {
        this.error('Connection Error', `Failed to ${action}. Please check your internet connection.`);
    }

    serverError(action) {
        this.error('Server Error', `Failed to ${action}. Please try again in a few moments.`);
    }

    // Real-time updates
    realTimeUpdate(type, message) {
        this.info(type, message);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.container.innerHTML = '';
    }
}

// Create global instance
window.TestNotifications = new TestNotificationSystem();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.TestNotifications.initialize();
    
    // Monitor for any red notifications from external sources (lightweight safety net)
    monitorForRedNotifications();
    
    // Show welcome notification for real dashboard
    setTimeout(() => {
        window.TestNotifications.success(
            'Welcome to ZimCrowd', 
            'Your financial dashboard is ready! All notifications are now using the modern dark theme.'
        );
    }, 1000);
});

// Monitor for red notifications from external sources like OneSignal
function monitorForRedNotifications() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    // Check if this is a notification element
                    const style = window.getComputedStyle(node);
                    const backgroundColor = style.backgroundColor;
                    const borderColor = style.borderColor;
                    const boxShadow = style.boxShadow;
                    const position = style.position;
                    const className = node.className.toLowerCase();
                    
                    // Check for any red-like colors in background, border, or shadow
                    const hasRedBackground = backgroundColor.includes('255, 0, 0') || 
                                            backgroundColor.includes('220, 53, 69') ||
                                            backgroundColor.includes('239, 68, 68') ||
                                            backgroundColor.includes('red');
                    
                    const hasRedBorder = borderColor.includes('255, 0, 0') || 
                                       borderColor.includes('220, 53, 69') ||
                                       borderColor.includes('239, 68, 68') ||
                                       borderColor.includes('red');
                    
                    const hasRedShadow = boxShadow.includes('255, 0, 0') || 
                                       boxShadow.includes('220, 53, 69') ||
                                       boxShadow.includes('239, 68, 68') ||
                                       boxShadow.includes('red');
                    
                    // Check for notification-like classes or positioning
                    const isNotificationLike = position === 'fixed' || 
                                              position === 'absolute' ||
                                              className.includes('notification') ||
                                              className.includes('toast') ||
                                              className.includes('alert') ||
                                              className.includes('message');
                    
                    // If any red styling AND notification-like characteristics
                    if ((hasRedBackground || hasRedBorder || hasRedShadow) && isNotificationLike) {
                        console.error('🚨 RED NOTIFICATION DETECTED:', {
                            element: node,
                            className: node.className,
                            backgroundColor: backgroundColor,
                            borderColor: borderColor,
                            boxShadow: boxShadow,
                            position: position,
                            innerHTML: node.innerHTML.substring(0, 200) + '...',
                            computedStyles: {
                                color: style.color,
                                background: style.background,
                                border: style.border,
                                display: style.display,
                                zIndex: style.zIndex
                            }
                        });
                        
                        // Log the source if possible
                        if (className.includes('onesignal') || node.id.includes('onesignal')) {
                            console.error('🔴 Red notification from OneSignal detected!');
                        }
                        
                        // Try to hide the red notification
                        node.style.display = 'none';
                        console.warn('🚫 Attempted to hide red notification');
                    }
                }
            });
        });
    });
    
    // Start observing the entire document
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
    
    console.log('🔍 Enhanced red notification monitor activated');
}

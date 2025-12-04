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
    
    // Monitor for any red notifications from external sources
    monitorForRedNotifications();
    
    // Show welcome notification
    setTimeout(() => {
        window.TestNotifications.success(
            'Test Notifications Active', 
            'Simple notification system is working!'
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
                    const position = style.position;
                    
                    // Check for red background and fixed positioning (typical notification)
                    if (position === 'fixed' && 
                        (backgroundColor.includes('255, 0, 0') || 
                         backgroundColor.includes('220, 53, 69') ||
                         backgroundColor.includes('239, 68, 68') ||
                         node.style?.background?.includes('red'))) {
                        
                        console.warn('🚨 RED NOTIFICATION DETECTED:', {
                            element: node,
                            backgroundColor: backgroundColor,
                            innerHTML: node.innerHTML,
                            className: node.className
                        });
                        
                        // Log the source if possible
                        if (node.classList.contains('onesignal')) {
                            console.error('🔴 Red notification from OneSignal detected!');
                        }
                    }
                }
            });
        });
    });
    
    // Start observing the entire document
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('🔍 Red notification monitor activated');
}

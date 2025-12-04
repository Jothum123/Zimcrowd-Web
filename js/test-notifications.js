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
     * Show a test notification
     */
    show(title, message, type = 'info', duration = 4000) {
        if (!this.isInitialized) {
            this.initialize();
        }

        const notification = document.createElement('div');
        notification.className = `test-notification ${type}`;
        
        notification.innerHTML = `
            <div class="test-notification-header">
                <div class="test-notification-title">${title}</div>
                <button class="test-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="test-notification-message">${message}</div>
        `;

        this.container.appendChild(notification);

        // Auto-hide after duration
        setTimeout(() => {
            notification.classList.add('hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);

        console.log(`🔔 Test notification: ${title} - ${message}`);
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
    
    // Show welcome notification
    setTimeout(() => {
        window.TestNotifications.success(
            'Test Notifications Active', 
            'Simple notification system is working!'
        );
    }, 1000);
});

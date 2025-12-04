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
                gap: 10px;
            }

            .test-notification {
                background: #1f2937;
                border: 2px solid #38e07b;
                border-radius: 8px;
                padding: 16px;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                color: white;
                font-family: 'Space Grotesk', sans-serif;
                animation: slideIn 0.3s ease-out;
                position: relative;
            }

            .test-notification.success {
                border-color: #10b981;
                background: linear-gradient(135deg, #065f46, #064e3b);
            }

            .test-notification.error {
                border-color: #ef4444;
                background: linear-gradient(135deg, #7f1d1d, #991b1b);
            }

            .test-notification.warning {
                border-color: #f59e0b;
                background: linear-gradient(135deg, #78350f, #92400e);
            }

            .test-notification.info {
                border-color: #3b82f6;
                background: linear-gradient(135deg, #1e3a8a, #1e40af);
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
            }

            .test-notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: all 0.2s ease;
            }

            .test-notification-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: white;
            }

            .test-notification-message {
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                line-height: 1.4;
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
                animation: slideOut 0.3s ease-out forwards;
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

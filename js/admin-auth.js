/**
 * Admin Authentication Module
 * Handles role-based authentication and session management
 */

class AdminAuth {
    constructor() {
        this.currentAdmin = null;
        this.sessionTimeout = null;
        this.apiKey = null;
        this.init();
    }

    /**
     * Initialize authentication
     */
    init() {
        this.apiKey = this.getStoredApiKey();
        this.setupSessionTimeout();
        console.log('🔐 Admin authentication initialized');
    }

    /**
     * Get stored API key
     */
    getStoredApiKey() {
        return localStorage.getItem(ADMIN_CONFIG.auth.storageKey) || ADMIN_CONFIG.auth.defaultKey;
    }

    /**
     * Store API key
     */
    storeApiKey(apiKey) {
        localStorage.setItem(ADMIN_CONFIG.auth.storageKey, apiKey);
        this.apiKey = apiKey;
    }

    /**
     * Authenticate admin user
     */
    async authenticate(apiKey = null) {
        try {
            const keyToUse = apiKey || this.apiKey;
            
            const response = await fetch(ADMIN_CONFIG.api.baseUrl + '/api/admin-role-management/profile', {
                method: 'GET',
                headers: {
                    'x-admin-key': keyToUse,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.currentAdmin = data.data.admin;
                this.storeApiKey(keyToUse);
                this.resetSessionTimeout();
                
                console.log(`✅ Admin authenticated: ${this.currentAdmin.name} (${this.currentAdmin.role})`);
                return { success: true, admin: this.currentAdmin };
            } else {
                throw new Error(data.error || 'Authentication failed');
            }

        } catch (error) {
            console.error('❌ Authentication error:', error);
            this.logout();
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if admin has specific permission
     */
    hasPermission(permission) {
        if (!this.currentAdmin || !this.currentAdmin.permissions) return false;
        return AdminUtils.hasPermission(this.currentAdmin.permissions, permission);
    }

    /**
     * Check if admin has any of the specified permissions
     */
    hasAnyPermission(permissions) {
        if (!Array.isArray(permissions)) return false;
        return permissions.some(permission => this.hasPermission(permission));
    }

    /**
     * Check if admin has specific role
     */
    hasRole(role) {
        return this.currentAdmin && this.currentAdmin.role === role;
    }

    /**
     * Check if admin has any of the specified roles
     */
    hasAnyRole(roles) {
        if (!Array.isArray(roles)) return false;
        return roles.some(role => this.hasRole(role));
    }

    /**
     * Get admin info
     */
    getAdmin() {
        return this.currentAdmin;
    }

    /**
     * Setup session timeout
     */
    setupSessionTimeout() {
        this.resetSessionTimeout();
    }

    /**
     * Reset session timeout
     */
    resetSessionTimeout() {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }

        this.sessionTimeout = setTimeout(() => {
            this.handleSessionTimeout();
        }, ADMIN_CONFIG.auth.sessionTimeout);
    }

    /**
     * Handle session timeout
     */
    handleSessionTimeout() {
        console.warn('⏰ Admin session timed out');
        this.showSessionTimeoutModal();
    }

    /**
     * Show session timeout modal
     */
    showSessionTimeoutModal() {
        const modal = document.createElement('div');
        modal.className = 'session-timeout-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Session Timeout</h3>
                    <i class="fas fa-clock"></i>
                </div>
                <div class="modal-body">
                    <p>Your admin session has expired for security reasons.</p>
                    <p>Please re-authenticate to continue.</p>
                </div>
                <div class="modal-actions">
                    <button onclick="adminAuth.reauthenticate()" class="btn-primary">
                        Re-authenticate
                    </button>
                    <button onclick="adminAuth.logout()" class="btn-secondary">
                        Logout
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * Re-authenticate admin
     */
    async reauthenticate() {
        const modal = document.querySelector('.session-timeout-modal');
        if (modal) modal.remove();

        const result = await this.authenticate();
        if (result.success) {
            window.location.reload();
        } else {
            this.logout();
        }
    }

    /**
     * Logout admin
     */
    logout() {
        this.currentAdmin = null;
        localStorage.removeItem(ADMIN_CONFIG.auth.storageKey);
        
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }

        console.log('👋 Admin logged out');
        window.location.reload();
    }

    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'x-admin-key': this.apiKey,
                'Content-Type': 'application/json'
            }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        // Merge headers properly
        if (options.headers) {
            finalOptions.headers = { ...defaultOptions.headers, ...options.headers };
        }

        try {
            const response = await fetch(ADMIN_CONFIG.api.baseUrl + endpoint, finalOptions);
            
            if (response.status === 401) {
                // Unauthorized - try to re-authenticate
                const authResult = await this.authenticate();
                if (!authResult.success) {
                    this.logout();
                    throw new Error('Authentication failed');
                }
                
                // Retry request with new auth
                finalOptions.headers['x-admin-key'] = this.apiKey;
                const retryResponse = await fetch(ADMIN_CONFIG.api.baseUrl + endpoint, finalOptions);
                return await retryResponse.json();
            }

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            this.resetSessionTimeout(); // Reset timeout on successful request
            return await response.json();

        } catch (error) {
            console.error('❌ API request error:', error);
            throw error;
        }
    }

    /**
     * Check permission and show error if not authorized
     */
    requirePermission(permission, showError = true) {
        if (this.hasPermission(permission)) {
            return true;
        }

        if (showError) {
            this.showPermissionError(permission);
        }

        return false;
    }

    /**
     * Show permission error
     */
    showPermissionError(permission) {
        const notification = {
            type: 'error',
            title: 'Access Denied',
            message: `You don't have permission to perform this action. Required: ${permission}`,
            duration: 5000
        };

        this.showNotification(notification);
    }

    /**
     * Show notification
     */
    showNotification(notification) {
        const notificationEl = document.createElement('div');
        notificationEl.className = `admin-notification ${notification.type}`;
        notificationEl.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <i class="${ADMIN_CONFIG.notifications.types[notification.type].icon}"></i>
                    <strong>${notification.title}</strong>
                </div>
                <p>${notification.message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to page
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notificationEl);

        // Auto remove
        setTimeout(() => {
            if (notificationEl.parentElement) {
                notificationEl.remove();
            }
        }, notification.duration || ADMIN_CONFIG.notifications.duration);
    }

    /**
     * Get role color
     */
    getRoleColor() {
        if (!this.currentAdmin) return '#6b7280';
        const roleConfig = AdminUtils.getRoleConfig(this.currentAdmin.role);
        return roleConfig ? roleConfig.color : '#6b7280';
    }

    /**
     * Get role display name
     */
    getRoleDisplayName() {
        if (!this.currentAdmin) return 'Unknown';
        const roleConfig = AdminUtils.getRoleConfig(this.currentAdmin.role);
        return roleConfig ? roleConfig.displayName : this.currentAdmin.role;
    }
}

// Create global admin auth instance
const adminAuth = new AdminAuth();

// Export for global access
window.adminAuth = adminAuth;

// Add CSS for notifications and modals
const authStyles = `
<style>
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
}

.admin-notification {
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    margin-bottom: 12px;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    border-left: 4px solid;
    animation: slideIn 0.3s ease;
}

.admin-notification.success { border-left-color: #10b981; }
.admin-notification.warning { border-left-color: #f59e0b; }
.admin-notification.error { border-left-color: #ef4444; }
.admin-notification.info { border-left-color: #3b82f6; }

.notification-content {
    flex: 1;
}

.notification-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.notification-header i {
    font-size: 16px;
}

.notification-close {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
}

.session-timeout-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10001;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    text-align: center;
}

.modal-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 16px;
}

.modal-header h3 {
    margin: 0;
    color: #1f2937;
}

.modal-header i {
    font-size: 24px;
    color: #f59e0b;
}

.modal-body p {
    color: #6b7280;
    margin-bottom: 8px;
}

.modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
}

.btn-primary, .btn-secondary {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
}

.btn-primary {
    background: #38e07b;
    color: white;
}

.btn-primary:hover {
    background: #2dd46a;
}

.btn-secondary {
    background: #f3f4f6;
    color: #374151;
}

.btn-secondary:hover {
    background: #e5e7eb;
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
</style>
`;

document.head.insertAdjacentHTML('beforeend', authStyles);

/**
 * Admin Dashboard Configuration
 * Central configuration for the unified admin dashboard
 */

// Environment Configuration
const ADMIN_CONFIG = {
    // API Configuration
    api: {
        baseUrl: window.location.hostname === 'localhost' 
            ? 'http://localhost:3001' 
            : 'https://zimcrowd-api.onrender.com',
        timeout: 30000,
        retryAttempts: 3
    },
    
    // Authentication
    auth: {
        storageKey: 'admin_api_key',
        defaultKey: 'admin-dev-key-123',
        sessionTimeout: 3600000 // 1 hour
    },
    
    // UI Configuration
    ui: {
        theme: {
            primaryGreen: '#38e07b',
            primaryDark: '#191A23',
            primaryLight: '#F3F3F3',
            primaryWhite: '#FFFFFF'
        },
        sidebar: {
            width: 280,
            collapsedWidth: 60
        },
        refreshInterval: 30000, // 30 seconds
        animationDuration: 300
    },
    
    // Feature Flags
    features: {
        kairoAI: true,
        realTimeUpdates: true,
        advancedAnalytics: true,
        bulkOperations: true,
        auditLogging: true
    },
    
    // Role-based Configuration
    roles: {
        super_admin: {
            displayName: 'Super Administrator',
            color: '#ef4444',
            permissions: ['*']
        },
        admin: {
            displayName: 'Administrator', 
            color: '#f59e0b',
            permissions: ['dashboard.*', 'users.*', 'finance.*', 'loans.*', 'reports.*']
        },
        finance_manager: {
            displayName: 'Finance Manager',
            color: '#10b981',
            permissions: ['dashboard.view', 'finance.*', 'wallet.*', 'transactions.*', 'reports.financial']
        },
        customer_support: {
            displayName: 'Customer Support',
            color: '#3b82f6',
            permissions: ['dashboard.view', 'users.view', 'users.edit', 'kyc.*', 'notifications.*']
        },
        analyst: {
            displayName: 'Data Analyst',
            color: '#8b5cf6',
            permissions: ['dashboard.view', '*.view', 'reports.*']
        },
        moderator: {
            displayName: 'Content Moderator',
            color: '#06b6d4',
            permissions: ['dashboard.view', 'users.*', 'kyc.*', 'notifications.*']
        }
    },
    
    // Dashboard Sections
    sections: {
        overview: {
            title: 'Overview',
            icon: 'fas fa-tachometer-alt',
            permissions: ['dashboard.view']
        },
        analytics: {
            title: 'Analytics',
            icon: 'fas fa-chart-bar',
            permissions: ['dashboard.analytics']
        },
        'wallet-monitoring': {
            title: 'Wallet Monitoring',
            icon: 'fas fa-wallet',
            permissions: ['wallet.view', 'wallet.monitor']
        },
        'manual-transactions': {
            title: 'Manual Transactions',
            icon: 'fas fa-exchange-alt',
            permissions: ['finance.deposits', 'finance.withdrawals', 'finance.bank_transfers']
        },
        'transaction-history': {
            title: 'Transaction History',
            icon: 'fas fa-history',
            permissions: ['transactions.view']
        },
        'financial-reports': {
            title: 'Financial Reports',
            icon: 'fas fa-file-invoice-dollar',
            permissions: ['reports.financial']
        },
        users: {
            title: 'User Management',
            icon: 'fas fa-users',
            permissions: ['users.view']
        },
        'kyc-review': {
            title: 'KYC Review',
            icon: 'fas fa-id-card',
            permissions: ['kyc.view', 'kyc.approve', 'kyc.reject']
        },
        'account-status': {
            title: 'Account Status',
            icon: 'fas fa-flag',
            permissions: ['users.view', 'users.suspend']
        },
        loans: {
            title: 'Loan Management',
            icon: 'fas fa-hand-holding-usd',
            permissions: ['loans.view', 'loans.manage']
        },
        'loan-applications': {
            title: 'Loan Applications',
            icon: 'fas fa-file-contract',
            permissions: ['loans.view', 'loans.approve', 'loans.reject']
        },
        'admin-users': {
            title: 'Admin Users',
            icon: 'fas fa-user-shield',
            permissions: ['system.admin_users']
        },
        'audit-logs': {
            title: 'Audit Logs',
            icon: 'fas fa-clipboard-list',
            permissions: ['system.audit_logs']
        },
        'system-settings': {
            title: 'System Settings',
            icon: 'fas fa-cogs',
            permissions: ['system.settings']
        }
    },
    
    // Notification Types
    notifications: {
        types: {
            success: { color: '#10b981', icon: 'fas fa-check-circle' },
            warning: { color: '#f59e0b', icon: 'fas fa-exclamation-triangle' },
            error: { color: '#ef4444', icon: 'fas fa-times-circle' },
            info: { color: '#3b82f6', icon: 'fas fa-info-circle' }
        },
        duration: 5000
    },
    
    // Chart Configuration
    charts: {
        defaultColors: ['#38e07b', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    },
    
    // Table Configuration
    tables: {
        defaultPageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
        maxRows: 1000
    },
    
    // Kairo AI Configuration
    kairo: {
        enabled: true,
        adminContext: {
            systemInfo: {
                platform: 'ZimCrowd Financial Platform',
                version: '2.0.0',
                environment: 'production'
            },
            capabilities: [
                'System performance analysis',
                'Risk assessment and alerts',
                'Revenue optimization insights', 
                'Troubleshooting guidance',
                'Data analysis and reporting',
                'Security monitoring',
                'User behavior analysis',
                'Financial anomaly detection',
                'Operational efficiency recommendations'
            ]
        },
        widget: {
            position: 'bottom-right',
            width: 400,
            height: 500,
            minimizedHeight: 60
        }
    }
};

// Utility Functions
const AdminUtils = {
    /**
     * Get configuration value by path
     */
    getConfig: function(path, defaultValue = null) {
        const keys = path.split('.');
        let value = ADMIN_CONFIG;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    },
    
    /**
     * Check if feature is enabled
     */
    isFeatureEnabled: function(feature) {
        return this.getConfig(`features.${feature}`, false);
    },
    
    /**
     * Get role configuration
     */
    getRoleConfig: function(roleName) {
        return this.getConfig(`roles.${roleName}`, null);
    },
    
    /**
     * Get section configuration
     */
    getSectionConfig: function(sectionName) {
        return this.getConfig(`sections.${sectionName}`, null);
    },
    
    /**
     * Format currency
     */
    formatCurrency: function(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },
    
    /**
     * Format number with abbreviations
     */
    formatNumber: function(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },
    
    /**
     * Format date
     */
    formatDate: function(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
    },
    
    /**
     * Generate random ID
     */
    generateId: function() {
        return 'admin_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * Debounce function
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Deep clone object
     */
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    /**
     * Check if user has permission
     */
    hasPermission: function(userPermissions, requiredPermission) {
        if (!userPermissions || !Array.isArray(userPermissions)) return false;
        
        // Super admin has all permissions
        if (userPermissions.includes('*')) return true;
        
        // Check exact match
        if (userPermissions.includes(requiredPermission)) return true;
        
        // Check wildcard permissions
        const parts = requiredPermission.split('.');
        for (let i = parts.length - 1; i >= 0; i--) {
            const wildcardPermission = parts.slice(0, i).join('.') + '.*';
            if (userPermissions.includes(wildcardPermission)) return true;
        }
        
        return false;
    },
    
    /**
     * Get theme colors
     */
    getThemeColors: function() {
        return this.getConfig('ui.theme');
    },
    
    /**
     * Log admin action
     */
    logAction: function(action, details = {}) {
        console.log(`🔍 Admin Action: ${action}`, details);
        
        // Send to audit log if enabled
        if (this.isFeatureEnabled('auditLogging')) {
            // Implementation would send to audit API
        }
    }
};

// Export configuration and utilities
window.ADMIN_CONFIG = ADMIN_CONFIG;
window.AdminUtils = AdminUtils;

// Initialize theme CSS variables
document.addEventListener('DOMContentLoaded', function() {
    const theme = AdminUtils.getThemeColors();
    const root = document.documentElement;
    
    Object.entries(theme).forEach(([key, value]) => {
        const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(cssVar, value);
    });
    
    console.log('🎨 Admin theme initialized');
});

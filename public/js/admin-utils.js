/**
 * Admin Dashboard Utility Functions
 * Helper functions for formatting, validation, and common operations
 */

const AdminUtils = {
    /**
     * Format currency values
     */
    formatCurrency(amount, currency = 'USD') {
        if (amount === null || amount === undefined) return '$0.00';
        
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        return formatter.format(amount);
    },

    /**
     * Format date values
     */
    formatDate(dateString, format = 'short') {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        
        if (format === 'short') {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } else if (format === 'long') {
            return date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else if (format === 'relative') {
            return this.getRelativeTime(date);
        }
        
        return date.toLocaleDateString();
    },

    /**
     * Get relative time (e.g., "2 hours ago")
     */
    getRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSecs < 60) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return this.formatDate(date, 'short');
    },

    /**
     * Format percentage
     */
    formatPercentage(value, decimals = 1) {
        if (value === null || value === undefined) return '0%';
        return `${parseFloat(value).toFixed(decimals)}%`;
    },

    /**
     * Format large numbers (e.g., 1.2K, 3.5M)
     */
    formatNumber(num) {
        if (num === null || num === undefined) return '0';
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        
        return num.toString();
    },

    /**
     * Get role configuration
     */
    getRoleConfig(role) {
        const roles = {
            super_admin: { color: '#ef4444', label: 'Super Admin' },
            admin: { color: '#f59e0b', label: 'Admin' },
            finance_manager: { color: '#38e07b', label: 'Finance Manager' },
            customer_support: { color: '#3b82f6', label: 'Customer Support' },
            analyst: { color: '#8b5cf6', label: 'Analyst' },
            moderator: { color: '#6b7280', label: 'Moderator' }
        };
        
        return roles[role] || { color: '#6b7280', label: role };
    },

    /**
     * Get status badge class
     */
    getStatusClass(status) {
        const statusMap = {
            active: 'success',
            pending: 'warning',
            suspended: 'error',
            rejected: 'error',
            completed: 'info',
            approved: 'success',
            failed: 'error'
        };
        
        return statusMap[status?.toLowerCase()] || 'default';
    },

    /**
     * Validate email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    /**
     * Validate phone number
     */
    isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s-()]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    },

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    },

    /**
     * Copy to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    },

    /**
     * Download data as CSV
     */
    downloadCSV(data, filename) {
        if (!data || data.length === 0) return;

        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'string' && value.includes(',') 
                        ? `"${value}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Download data as JSON
     */
    downloadJSON(data, filename) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
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
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Generate random ID
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Parse query string
     */
    parseQueryString(queryString) {
        const params = new URLSearchParams(queryString);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    /**
     * Build query string
     */
    buildQueryString(params) {
        return Object.keys(params)
            .filter(key => params[key] !== null && params[key] !== undefined)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
            .join('&');
    },

    /**
     * Calculate percentage change
     */
    calculatePercentageChange(oldValue, newValue) {
        if (oldValue === 0) return newValue > 0 ? 100 : 0;
        return ((newValue - oldValue) / oldValue) * 100;
    },

    /**
     * Get trend indicator
     */
    getTrendIndicator(change) {
        if (change > 0) {
            return { icon: 'fa-arrow-up', class: 'trend-up', text: 'increase' };
        } else if (change < 0) {
            return { icon: 'fa-arrow-down', class: 'trend-down', text: 'decrease' };
        }
        return { icon: 'fa-minus', class: 'trend-neutral', text: 'no change' };
    },

    /**
     * Truncate text
     */
    truncate(text, maxLength, suffix = '...') {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    },

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Convert to title case
     */
    toTitleCase(str) {
        if (!str) return '';
        return str.replace(/\w\S*/g, txt => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },

    /**
     * Sleep/delay function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Check if object is empty
     */
    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Group array by key
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) {
                result[group] = [];
            }
            result[group].push(item);
            return result;
        }, {});
    },

    /**
     * Sort array by key
     */
    sortBy(array, key, order = 'asc') {
        return array.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (order === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }
};

// Export to global scope
window.AdminUtils = AdminUtils;

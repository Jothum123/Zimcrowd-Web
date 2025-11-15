// ZimCrowd API Configuration
// Centralized configuration for all API endpoints

const CONFIG = {
    // API Base URL - Change this for different environments
    API_BASE_URL: 'https://zimcrowd-api.onrender.com',
    
    // Alternative URLs for different environments
    ENVIRONMENTS: {
        production: 'https://zimcrowd-api.onrender.com',
        development: 'http://localhost:3001',
        staging: 'https://zimcrowd-api-staging.onrender.com'
    },
    
    // API Endpoints
    ENDPOINTS: {
        // Authentication
        AUTH: {
            LOGIN: '/api/auth/login',
            REGISTER: '/api/auth/register',
            LOGOUT: '/api/auth/logout',
            VERIFY_OTP: '/api/auth/verify-otp',
            RESEND_OTP: '/api/auth/resend-otp',
            FORGOT_PASSWORD: '/api/auth/forgot-password',
            RESET_PASSWORD: '/api/auth/reset-password'
        },
        
        // Profile
        PROFILE: {
            GET: '/api/profile',
            UPDATE: '/api/profile',
            SETUP: '/api/profile-setup',
            DOCUMENTS: '/api/profile-setup/documents'
        },
        
        // KYC & OCR
        KYC: {
            OCR_PROCESS: '/api/kyc-ocr/process',
            OCR_ANALYZE: '/api/kyc-ocr/analyze',
            OCR_EXTRACT: '/api/kyc-ocr/extract-text',
            OCR_VERIFY_FACE: '/api/kyc-ocr/verify-face',
            OCR_QUALITY: '/api/kyc-ocr/check-quality',
            STATUS: '/api/account-status'
        },
        
        // Wallet & Transactions
        WALLET: {
            GET: '/api/wallet',
            DEPOSIT: '/api/wallet/deposit',
            WITHDRAW: '/api/wallet/withdraw',
            TRANSFER: '/api/wallet/transfer',
            TRANSACTIONS: '/api/transactions'
        },
        
        // Loans
        LOANS: {
            LIST: '/api/loans',
            APPLY: '/api/loans/apply',
            DETAILS: '/api/loans/:id',
            REPAY: '/api/loans/:id/repay',
            DIRECT: '/api/direct-loans'
        },
        
        // Investments
        INVESTMENTS: {
            LIST: '/api/investments',
            INVEST: '/api/investments/invest',
            DETAILS: '/api/investments/:id',
            PORTFOLIO: '/api/investments/portfolio'
        },
        
        // Market
        MARKET: {
            PRIMARY: '/api/market/primary',
            SECONDARY: '/api/market/secondary',
            OVERVIEW: '/api/market/overview'
        },
        
        // Admin
        ADMIN: {
            DASHBOARD: '/api/admin-dashboard',
            USERS: '/api/admin-dashboard/users',
            LOANS: '/api/admin-dashboard/loans',
            KYC_REVIEW: '/api/admin-dashboard/kyc-review',
            ANALYTICS: '/api/analytics'
        },
        
        // Notifications
        NOTIFICATIONS: {
            LIST: '/api/notifications',
            MARK_READ: '/api/notifications/:id/read',
            MARK_ALL_READ: '/api/notifications/read-all'
        },
        
        // Referrals
        REFERRALS: {
            CODE: '/api/referrals/code',
            STATS: '/api/referrals/stats'
        },
        
        // AI Assistant
        AI: {
            CHAT: '/api/kairo-ai/chat',
            HISTORY: '/api/kairo-ai/history'
        },
        
        // Payments
        PAYMENTS: {
            PAYNOW: '/api/payments/paynow',
            WEBHOOK: '/api/paynow-webhook'
        }
    },
    
    // Helper function to get full URL
    getUrl: function(endpoint) {
        return this.API_BASE_URL + endpoint;
    },
    
    // Helper function to switch environment
    setEnvironment: function(env) {
        if (this.ENVIRONMENTS[env]) {
            this.API_BASE_URL = this.ENVIRONMENTS[env];
            console.log(`🔄 API Environment switched to: ${env} (${this.API_BASE_URL})`);
        } else {
            console.error(`❌ Unknown environment: ${env}`);
        }
    },
    
    // Check if running locally
    isLocal: function() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    },
    
    // Auto-detect environment
    autoDetect: function() {
        if (this.isLocal()) {
            this.setEnvironment('development');
        } else {
            this.setEnvironment('production');
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Log current configuration
console.log('🔧 ZimCrowd API Config Loaded');
console.log('📡 API Base URL:', CONFIG.API_BASE_URL);
console.log('🌍 Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');

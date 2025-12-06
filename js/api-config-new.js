// ZimCrowd API Configuration
// Centralized configuration for all API endpoints

const API_CONFIG = {
  // Backend URLs
  PRODUCTION_URL: 'https://zimcrowd-api.onrender.com',
  DEVELOPMENT_URL: 'http://localhost:3001',
  
  // Auto-detect environment
  get BASE_URL() {
    const isLocalhost = window.location.hostname === 'localhost' 
                     || window.location.hostname === '127.0.0.1'
                     || window.location.hostname === '0.0.0.0';
    return isLocalhost ? this.DEVELOPMENT_URL : this.PRODUCTION_URL;
  },
  
  // API Endpoints
  get ENDPOINTS() {
    return {
      // Health check
      HEALTH: `${this.BASE_URL}/api/health`,
      
      // Authentication
      REGISTER: `${this.BASE_URL}/api/auth/register`,
      LOGIN: `${this.BASE_URL}/api/auth/login`,
      FORGOT_PASSWORD: `${this.BASE_URL}/api/auth/forgot-password`,
      VERIFY_OTP: `${this.BASE_URL}/api/auth/verify-otp`,
      RESET_PASSWORD: `${this.BASE_URL}/api/auth/reset-password`,
      RESEND_OTP: `${this.BASE_URL}/api/auth/resend-otp`,
      
      // Phone Authentication
      PHONE_REGISTER: `${this.BASE_URL}/api/phone-auth/register-phone`,
      PHONE_LOGIN: `${this.BASE_URL}/api/phone-auth/login-phone`,
      PHONE_VERIFY: `${this.BASE_URL}/api/phone-auth/verify-phone`,
      PHONE_RESEND: `${this.BASE_URL}/api/phone-auth/resend-phone-otp`,
      PHONE_RESET_REQUEST: `${this.BASE_URL}/api/phone-auth/request-reset-otp`,
      PHONE_RESET_VERIFY: `${this.BASE_URL}/api/phone-auth/verify-reset-otp`,
      PHONE_RESET_PASSWORD: `${this.BASE_URL}/api/phone-auth/reset-password`,
      
      // Email Authentication
      EMAIL_REGISTER: `${this.BASE_URL}/api/email-auth/register-email`,
      EMAIL_LOGIN: `${this.BASE_URL}/api/email-auth/login-email`,
      EMAIL_VERIFY: `${this.BASE_URL}/api/email-auth/verify-email`,
      EMAIL_RESEND: `${this.BASE_URL}/api/email-auth/resend-email-otp`,
      EMAIL_RESET_REQUEST: `${this.BASE_URL}/api/email-auth/request-reset-otp`,
      EMAIL_RESET_VERIFY: `${this.BASE_URL}/api/email-auth/verify-reset-otp`,
      EMAIL_RESET_PASSWORD: `${this.BASE_URL}/api/email-auth/reset-password`,
      
      // Social Authentication
      GOOGLE_AUTH: `${this.BASE_URL}/api/social-auth/google`,
      FACEBOOK_AUTH: `${this.BASE_URL}/api/social-auth/facebook`,
      
      // Profile
      PROFILE_GET: `${this.BASE_URL}/api/profile`,
      PROFILE_UPDATE: `${this.BASE_URL}/api/profile`,
      PROFILE_UPLOAD_PICTURE: `${this.BASE_URL}/api/profile/upload-picture`,
      PROFILE_DELETE_PICTURE: `${this.BASE_URL}/api/profile/picture`,
      
      // Dashboard
      DASHBOARD_DATA: `${this.BASE_URL}/api/dashboard`,
      
      // Loans
      LOANS: `${this.BASE_URL}/api/loans`,
      
      // Investments
      INVESTMENTS: `${this.BASE_URL}/api/investments`,
      
      // Transactions
      TRANSACTIONS: `${this.BASE_URL}/api/transactions`,
      
      // Wallet
      WALLET: `${this.BASE_URL}/api/wallet`,
      
      // ZimScore
      ZIMSCORE: `${this.BASE_URL}/api/zimscore`,
      
      // Documents
      DOCUMENTS: `${this.BASE_URL}/api/documents`,
      
      // Referrals
      REFERRALS: `${this.BASE_URL}/api/referrals`,
      
      // Payments (using existing SDK-based backend)
      PAYMENTS: `${this.BASE_URL}/api/payments`,
      PAYMENT_INITIATE_WEB: `${this.BASE_URL}/api/payments/initiate/web`,
      PAYMENT_INITIATE_MOBILE: `${this.BASE_URL}/api/payments/initiate/mobile`,
      PAYMENT_STATUS: `${this.BASE_URL}/api/payments/status`,
      PAYMENT_RESULT: `${this.BASE_URL}/api/payments/result`,
      PAYMENT_METHODS: `${this.BASE_URL}/api/payments/methods`,
      PAYMENT_HISTORY: `${this.BASE_URL}/api/payments/history`,
      
      // Admin
      ADMIN: `${this.BASE_URL}/api/admin`,
      ADMIN_DASHBOARD: `${this.BASE_URL}/api/admin-dashboard`,
      
      // Admin Fee Configuration
      ADMIN_FEE_CONFIG: `${this.BASE_URL}/api/admin/fee-config`,
      ADMIN_FEE_CONFIG_HISTORY: `${this.BASE_URL}/api/admin/fee-config/history`,
      ADMIN_FEE_CONFIG_CALCULATE: `${this.BASE_URL}/api/admin/fee-config/calculate`,
      ADMIN_FEE_CONFIG_CATEGORIES: `${this.BASE_URL}/api/admin/fee-config/categories`,
      
      // Admin AI
      ADMIN_AI: `${this.BASE_URL}/api/admin/kairo-ai`,
      ADMIN_AI_CHAT: `${this.BASE_URL}/api/admin/kairo-ai/chat`,
      ADMIN_AI_INSIGHTS: `${this.BASE_URL}/api/admin/kairo-ai/insights`,
      ADMIN_AI_STATS: `${this.BASE_URL}/api/admin/kairo-ai/stats`,
      ADMIN_AI_ANALYZE: `${this.BASE_URL}/api/admin/kairo-ai/analyze`,
      ADMIN_AI_CONFIGURE: `${this.BASE_URL}/api/admin/kairo-ai/configure`,
      ADMIN_AI_HISTORY: `${this.BASE_URL}/api/admin/kairo-ai/history`
    };
  },
  
  // Helper to get full endpoint URL
  getEndpoint(key) {
    return this.ENDPOINTS[key] || null;
  },
  
  // Helper to log current configuration
  logConfig() {
    console.log('🔧 API Configuration:');
    console.log('Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
    console.log('API Base URL:', this.BASE_URL);
    console.log('Available Endpoints:', Object.keys(this.ENDPOINTS));
  }
};

// Make it globally available
window.API_CONFIG = API_CONFIG;

// Log configuration on load (helpful for debugging)
console.log('🚀 API Config loaded');
console.log('Current API URL:', API_CONFIG.BASE_URL);
console.log('Environment:', API_CONFIG.BASE_URL.includes('localhost') ? 'Development' : 'Production');

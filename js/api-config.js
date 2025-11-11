// API Configuration for ZimCrowd
// Automatically uses localhost for development, Vercel for production

const API_CONFIG = {
  // Production backend URL (deployed on Vercel)
<<<<<<< HEAD
  PRODUCTION_URL: 'https://zimcrowd-backend-qiapq9wbe-jojola.vercel.app',
=======
  PRODUCTION_URL: 'https://zimcrowd-backend-qsvfl2nqu-jojola.vercel.app',
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2
  DEVELOPMENT_URL: 'http://localhost:5003',
  
  // Auto-detect environment
  get BASE_URL() {
    const isLocalhost = window.location.hostname === 'localhost' 
                     || window.location.hostname === '127.0.0.1';
    return isLocalhost ? this.DEVELOPMENT_URL : this.PRODUCTION_URL;
  },
  
  // API Endpoints
  get ENDPOINTS() {
    return {
      HEALTH: `${this.BASE_URL}/api/health`,
      REGISTER: `${this.BASE_URL}/api/auth/register`,
      LOGIN: `${this.BASE_URL}/api/auth/login`,
      FORGOT_PASSWORD: `${this.BASE_URL}/api/auth/forgot-password`,
      VERIFY_OTP: `${this.BASE_URL}/api/auth/verify-otp`,
      RESET_PASSWORD: `${this.BASE_URL}/api/auth/reset-password`,
      RESEND_OTP: `${this.BASE_URL}/api/auth/resend-otp`,
    };
  },
  
  // Helper to log current configuration
  logConfig() {
    console.log('🔧 API Configuration:');
    console.log('Environment:', window.location.hostname === 'localhost' ? 'Development' : 'Production');
    console.log('API Base URL:', this.BASE_URL);
    console.log('Endpoints:', this.ENDPOINTS);
  }
};

// Make it globally available
window.API_CONFIG = API_CONFIG;

// Log configuration on load (helpful for debugging)
console.log('✅ API Config loaded');
console.log('Current API URL:', API_CONFIG.BASE_URL);

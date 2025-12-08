require('dotenv').config({ path: '.env.production' });
require('express-async-errors');

console.log('🚀 Starting ZimCrowd server...');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

console.log('📦 Loaded dependencies...');

// Import routes
try {
    console.log('📂 Loading routes...');
    var authRoutes = require('./routes/auth');
    console.log('✅ Auth routes loaded');
    var phoneAuthRoutes = require('./routes/phone-auth');
    console.log('✅ Phone auth routes loaded');
    var emailAuthRoutes = require('./routes/email-auth');
    console.log('✅ Email auth routes loaded');
    var dashboardRoutes = require('./routes/dashboard');
    console.log('✅ Dashboard routes loaded');
    var zimscoreRoutes = require('./routes/zimscore');
    console.log('✅ ZimScore routes loaded');
    var kycOcrRoutes = require('./routes/kyc-ocr');
    console.log('✅ KYC-OCR routes loaded');
    var paynowWebhookRoutes = require('./routes/paynow-webhook');
    console.log('✅ Paynow webhook routes loaded');
    var socialAuthRoutes = require('./routes/social-auth');
    console.log('✅ Social auth routes loaded');
    var profileRoutes = require('./routes/profile');
    console.log('✅ Profile routes loaded');
    var loansRoutes = require('./routes/loans');
    console.log('✅ Loans routes loaded');
    var investmentsRoutes = require('./routes/investments');
    console.log('✅ Investments routes loaded');
    var transactionsRoutes = require('./routes/transactions');
    console.log('✅ Transactions routes loaded');
    var walletRoutes = require('./routes/wallet');
    console.log('✅ Wallet routes loaded');
    var documentsRoutes = require('./routes/documents');
    console.log('✅ Documents routes loaded');
    var referralsRoutes = require('./routes/referrals');
    console.log('✅ Referrals routes loaded');
    var activityTrackingRoutes = require('./routes/activity-tracking');
    console.log('✅ Activity tracking routes loaded');
    var adminRoutes = require('./routes/admin');
    console.log('✅ Admin routes loaded');
    var adminDashboardRoutes = require('./routes/admin-dashboard');
    console.log('✅ Admin dashboard routes loaded');
    var adminManualTransactionsRoutes = require('./routes/admin-manual-transactions');
    console.log('✅ Admin manual transactions routes loaded');
    var adminRoleManagementRoutes = require('./routes/admin-role-management');
    console.log('✅ Admin role management routes loaded');
    var adminWalletMonitoringRoutes = require('./routes/admin-wallet-monitoring');
    console.log('✅ Admin wallet monitoring routes loaded');
    var paymentRoutes = require('./routes/payments');
    console.log('✅ Payment routes loaded');
    var testRoutes = require('./routes/test');
    console.log('✅ Test routes loaded');
    var notificationRoutes = require('./routes/notifications');
    console.log('✅ Notification routes loaded');
    var analyticsRoutes = require('./routes/analytics');
    console.log('✅ Analytics routes loaded');
    var primaryMarketRoutes = require('./routes/primary-market');
    console.log('✅ Primary market routes loaded');
    var secondaryMarketRoutes = require('./routes/secondary-market');
    console.log(' Secondary market routes loaded');
    var legacyKairoRoutes = require('./routes/kairo'); // Legacy Kairo routes
    console.log(' Legacy Kairo routes loaded');
    var kairoAIRoutes = require('./routes/kairo-ai');
    console.log(' Kairo AI routes loaded');
    var adminKairoAIRoutes = require('./routes/admin-kairo-ai');
    console.log(' Admin Kairo AI routes loaded');
    var adminFeeConfigRoutes = require('./routes/admin-fee-config');
    console.log(' Admin Fee Config routes loaded');
    var walletCreditsRoutes = require('./routes/wallet-credits');
    console.log(' Wallet Credits routes loaded');
    var p2pPrimaryMarketRoutes = require('./routes/p2p-primary-market');
    console.log(' P2P Primary Market routes loaded');
    var p2pSecondaryMarketRoutes = require('./routes/p2p-secondary-market');
    console.log(' P2P Secondary Market routes loaded');
    var settingsRoutes = require('./routes/settings');
    console.log(' Settings routes loaded');
    console.log('✅ Settings routes loaded');
    var securityRoutes = require('./routes/security');
    console.log('✅ Security routes loaded');
    var userRoutes = require('./routes/user');
    console.log('✅ User routes loaded');
    var faceVerificationRoutes = require('./routes/face-verification');
    console.log('✅ Face verification routes loaded');
    var profileSetupRoutes = require('./routes/profile-setup');
    console.log('✅ Profile setup routes loaded');
    var storageRoutes = require('./routes/storage');
    console.log('✅ Storage routes loaded');
    var accountStatusRoutes = require('./routes/account-status');
    console.log('✅ Account status routes loaded');
    var marketApiRoutes = require('./routes/market-api');
    console.log('✅ Market API routes loaded');
    var loanApplicationsRoutes = require('./routes/loan-applications');
    console.log('✅ Loan Applications routes loaded');
    console.log('✅ All routes loaded successfully');
} catch (error) {
    console.error('❌ Error loading routes:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}

// Import Supabase utilities
const { supabase } = require('./utils/supabase-auth');

// Import Twilio utilities
const { testTwilioConnection } = require('./utils/twilio-service');

// Import Email utilities
const { testEmailConnection } = require('./utils/email-service');

const app = express();

// Trust proxy for Vercel deployment
app.set('trust proxy', 1);

// Security middleware with relaxed CSP for development
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://kit.fontawesome.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com", "https://ka-f.fontawesome.com", "https://ka-p.fontawesome.com", "data:"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://zimcrowd-backend.vercel.app", "https://zimcrowd.com", "https://www.zimcrowd.com", "http://localhost:3000", "https://gjtkdrrvnffrmzigdqyp.supabase.co", "wss://gjtkdrrvnffrmzigdqyp.supabase.co", "https://*.supabase.co", "wss://*.supabase.co", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            frameSrc: ["'self'", "https://accounts.google.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// CORS configuration - Allow all origins for testing
app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files - serve from root directory to access HTML files
app.use(express.static(path.join(__dirname)));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
console.log('🔗 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');
app.use('/api/phone-auth', phoneAuthRoutes);
console.log('✅ Phone auth routes registered');
app.use('/api/social-auth', socialAuthRoutes);
console.log('✅ Social auth routes registered');
app.use('/api/email-auth', emailAuthRoutes);
console.log('✅ Email auth routes registered');
app.use('/api/profile', profileRoutes);
console.log('✅ Profile routes registered');
app.use('/api/dashboard', dashboardRoutes);
console.log('✅ Dashboard routes registered');
app.use('/api/activity', activityTrackingRoutes);
console.log('✅ Activity tracking routes registered');
app.use('/api/zimscore', zimscoreRoutes);
console.log('✅ ZimScore routes registered');
app.use('/api/kyc-ocr', kycOcrRoutes);
console.log('✅ KYC-OCR routes registered');
app.use('/api/webhooks', paynowWebhookRoutes);
console.log('✅ Paynow webhook routes registered');
app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'terms.html'));
});
console.log('✅ Terms page route registered');
app.get('/privacy-policy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy.html'));
});
console.log('✅ Privacy policy page route registered');

// Root route - serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login route - serve login.html
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Dashboard route - serve dashboard.html (development access)
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});
app.use('/api/loans', loansRoutes);
console.log('✅ Loans routes registered');
app.use('/api/investments', investmentsRoutes);
console.log('✅ Investments routes registered');
app.use('/api/transactions', transactionsRoutes);
console.log('✅ Transactions routes registered');
app.use('/api/wallet', walletRoutes);
console.log('✅ Wallet routes registered');
app.use('/api/documents', documentsRoutes);
console.log('✅ Documents routes registered');
app.use('/api/referrals', referralsRoutes);
console.log('✅ Referrals routes registered');
app.use('/api/admin', adminRoutes);
console.log('✅ Admin routes registered');
app.use('/api/admin-dashboard', adminDashboardRoutes);
console.log('✅ Admin dashboard routes registered');
app.use('/api/admin-manual-transactions', adminManualTransactionsRoutes);
console.log('✅ Admin manual transactions routes registered');
app.use('/api/admin-role-management', adminRoleManagementRoutes);
console.log('✅ Admin role management routes registered');
app.use('/api/admin-wallet-monitoring', adminWalletMonitoringRoutes);
console.log('✅ Admin wallet monitoring routes registered');
app.use('/api/payments', paymentRoutes);
console.log('✅ Payment routes registered');
app.use('/api/test', testRoutes);
console.log('✅ Test routes registered');
app.use('/api/notifications', notificationRoutes);
console.log('✅ Notification routes registered');
app.use('/api/analytics', analyticsRoutes);
console.log('✅ Analytics routes registered');
app.use('/api/primary-market', primaryMarketRoutes);
console.log('✅ Primary market routes registered');
app.use('/api/secondary-market', secondaryMarketRoutes);
console.log('✅ Secondary market routes registered');
app.use('/api/kairo', legacyKairoRoutes); // Mount legacy Kairo routes
console.log('✅ Legacy Kairo routes registered');
app.use('/api/kairo-ai', kairoAIRoutes);
console.log('✅ Kairo AI routes registered');
app.use('/api/admin/kairo-ai', adminKairoAIRoutes);
console.log('✅ Admin Kairo AI routes registered');
app.use('/api/admin/fee-config', adminFeeConfigRoutes);
console.log('✅ Admin Fee Config routes registered');
app.use('/api/p2p/primary', p2pPrimaryMarketRoutes);
console.log('✅ P2P Primary Market routes registered at /api/p2p/primary');
app.use('/api/p2p/secondary', p2pSecondaryMarketRoutes);
console.log('✅ P2P Secondary Market routes registered at /api/p2p/secondary');
app.use('/api/settings', settingsRoutes);
console.log('✅ Settings routes registered');
app.use('/api/security', securityRoutes);
console.log('✅ Security routes registered');
app.use('/api/user', userRoutes);
console.log('✅ User routes registered');
app.use('/api/face', faceVerificationRoutes);
console.log('✅ Face verification routes registered');
app.use('/api/profile-setup', profileSetupRoutes);
console.log('✅ Profile setup routes registered');
app.use('/api/storage', storageRoutes);
console.log('✅ Storage routes registered');
app.use('/api/wallet-credits', walletCreditsRoutes);
console.log('✅ Wallet Credits routes registered');
app.use('/api/account', accountStatusRoutes);
console.log('✅ Account status routes registered');
app.use('/api/market', marketApiRoutes);
console.log('✅ Market API routes registered at /api/market');
app.use('/api/loan-applications', loanApplicationsRoutes);
console.log('✅ Loan Applications routes registered at /api/loan-applications');
app.use('/api/kyc', kycOcrRoutes); // Alias for /api/kyc-ocr
console.log('✅ KYC routes registered (alias for kyc-ocr)');

// Direct loans routes
const directLoansRoutes = require('./routes/direct-loans');
app.use('/api/direct-loans', directLoansRoutes);
console.log('✅ Direct Loans routes registered at /api/direct-loans');

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'ZimCrowd API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: 'Supabase'
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                verifyOTP: 'POST /api/auth/verify-otp',
                resendOTP: 'POST /api/auth/resend-otp'
            },
            socialAuth: {
                google: 'GET /api/social-auth/google',
                facebook: 'GET /api/social-auth/facebook',
                callback: 'GET /api/social-auth/callback',
                dataDeletion: 'POST /api/social-auth/data-deletion',
                dataDeletionStatus: 'GET /api/social-auth/data-deletion-status'
            },
            phoneAuth: {
                registerPhone: 'POST /api/phone-auth/register-phone',
                verifyPhoneSignup: 'POST /api/phone-auth/verify-phone-signup',
                loginPhone: 'POST /api/phone-auth/login-phone',
                passwordlessLogin: 'POST /api/phone-auth/passwordless-login',
                passwordlessVerify: 'POST /api/phone-auth/passwordless-verify',
                forgotPasswordPhone: 'POST /api/phone-auth/forgot-password-phone',
                verifyResetOtp: 'POST /api/phone-auth/verify-reset-otp',
                resetPasswordPhone: 'POST /api/phone-auth/reset-password-phone',
                resendPhoneOTP: 'POST /api/phone-auth/resend-phone-otp',
                setupTOTP: 'POST /api/phone-auth/setup-totp',
                verifyTOTPSetup: 'POST /api/phone-auth/verify-totp-setup',
                smartLogin: 'POST /api/phone-auth/smart-login',
                devGetOtp: 'GET /api/phone-auth/dev-get-otp/:phone'
            },
            emailAuth: {
                registerEmail: 'POST /api/email-auth/register-email',
                verifyEmailSignup: 'POST /api/email-auth/verify-email-signup',
                loginEmail: 'POST /api/email-auth/login-email',
                forgotPasswordEmail: 'POST /api/email-auth/forgot-password-email',
                resetPasswordEmail: 'POST /api/email-auth/reset-password-email',
                resendEmailOTP: 'POST /api/email-auth/resend-email-otp'
            },
            dashboard: {
                overview: 'GET /api/dashboard/overview'
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Default error
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : err.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        requested: `${req.method} ${req.originalUrl}`,
        availableRoutes: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/verify-otp',
            'POST /api/auth/resend-otp',
            'GET /api/social-auth/google',
            'GET /api/social-auth/facebook',
            'GET /api/social-auth/callback',
            'POST /api/social-auth/data-deletion',
            'GET /api/social-auth/data-deletion-status',
            'POST /api/phone-auth/register-phone',
            'POST /api/phone-auth/verify-phone-signup',
            'POST /api/phone-auth/login-phone',
            'POST /api/phone-auth/passwordless-login',
            'POST /api/phone-auth/passwordless-verify',
            'POST /api/phone-auth/setup-totp',
            'POST /api/phone-auth/verify-totp-setup',
            'POST /api/phone-auth/smart-login',
            'POST /api/phone-auth/forgot-password-phone',
            'POST /api/phone-auth/verify-reset-otp',
            'POST /api/phone-auth/reset-password-phone',
            'POST /api/phone-auth/resend-phone-otp',
            'GET /api/phone-auth/dev-get-otp/:phone',
            'POST /api/email-auth/register-email',
            'POST /api/email-auth/verify-email-signup',
            'POST /api/email-auth/login-email',
            'POST /api/email-auth/forgot-password-email',
            'POST /api/email-auth/reset-password-email',
            'POST /api/email-auth/resend-email-otp',
            'GET /api/health',
            'GET /api/test',
            'GET /api/dashboard/overview',
            'GET /api/profile',
            'PUT /api/profile',
            'PUT /api/profile/complete-onboarding',
            'PUT /api/profile/complete-profile',
            'GET /api/loans',
            'GET /api/loans/:id',
            'POST /api/loans/apply',
            'PUT /api/loans/:id/pay',
            'GET /api/loans/types',
            'GET /api/investments',
            'GET /api/investments/portfolio',
            'GET /api/investments/performance',
            'POST /api/investments',
            'GET /api/investments/types',
            'GET /api/transactions',
            'GET /api/transactions/:id',
            'GET /api/transactions/summary',
            'GET /api/transactions/types',
            'GET /api/wallet/balance',
            'GET /api/wallet/transactions',
            'POST /api/wallet/deposit',
            'POST /api/wallet/withdraw',
            'GET /api/wallet/payment-methods',
            'GET /api/documents',
            'POST /api/documents/upload',
            'GET /api/documents/:id/download',
            'DELETE /api/documents/:id',
            'GET /api/documents/types',
            'GET /api/referrals/code',
            'GET /api/referrals/stats',
            'GET /api/referrals/history',
            'POST /api/referrals/track',
            'POST /api/referrals/payout',
            'GET /api/referrals/leaderboard',
            'GET /api/referrals/program-info',
            'GET /api/admin/stats',
            'GET /api/admin/users',
            'GET /api/admin/users/:id',
            'PUT /api/admin/users/:id/status',
            'GET /api/admin/loans',
            'PUT /api/admin/loans/:id/approve',
            'GET /api/admin/transactions',
            'GET /api/admin/reports/overview'
        ]
    });
});

// Test Supabase connection on startup
const testSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);

        if (error) {
            console.warn('ÔÜá´©Å  Supabase connection test failed:', error.message);
            console.warn('   Make sure your environment variables are set correctly');
        } else {
            console.log('Ô£à Supabase connection successful');
        }
    } catch (error) {
        console.warn('ÔÜá´©Å  Supabase connection test error:', error.message);
    }
};

// Test Twilio connection on startup
const testTwilioConnectionOnStartup = async () => {
    const twilioConfigured = process.env.TWILIO_ACCOUNT_SID && 
                            process.env.TWILIO_AUTH_TOKEN && 
                            process.env.TWILIO_VERIFY_SERVICE_SID;
    
    if (twilioConfigured) {
        try {
            await testTwilioConnection();
            console.log('📱 Twilio connection successful - SMS features enabled');
        } catch (error) {
            console.warn('⚠️  Twilio connection failed:', error.message);
            console.warn('   SMS features will work with database verification only');
        }
    } else {
        console.warn('⚠️  Twilio credentials not found - SMS features disabled');
        console.warn('   Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID to enable SMS');
    }
};

// Test Email connection on startup
const testEmailConnectionOnStartup = async () => {
    const emailConfigured = process.env.RESEND_API_KEY;
    if (emailConfigured) {
        await testEmailConnection();
    } else {
        console.warn('ÔÜá´©Å  Email credentials not found - Email OTP features disabled');
        console.warn('   Add RESEND_API_KEY to enable email OTP');
    }
};

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // Test connections
        await testSupabaseConnection();
        await testTwilioConnectionOnStartup();
        await testEmailConnectionOnStartup();

        app.listen(PORT, () => {
            console.log(`

ÔòöÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòù
Ôòæ                     ­ƒÜÇ ZimCrowd Supabase API                  Ôòæ
Ôòæ                                                              Ôòæ
Ôòæ  Server:    http://localhost:${PORT}                           Ôòæ
Ôòæ  Environment: ${process.env.NODE_ENV || 'development'}                  Ôòæ
Ôòæ  Database:  Supabase PostgreSQL                             Ôòæ
Ôòæ  Timestamp: ${new Date().toISOString()}                      Ôòæ
Ôòæ                                                              Ôòæ
Ôòæ  API Endpoints:                                              Ôòæ
Ôòæ  ÔÇó POST /api/auth/register     - User registration           Ôòæ
Ôòæ  ÔÇó POST /api/auth/login        - User login                  Ôòæ
Ôòæ  ÔÇó POST /api/auth/verify-otp   - OTP verification            Ôòæ
Ôòæ  ÔÇó POST /api/auth/resend-otp   - Resend OTP                  Ôòæ
Ôòæ  ÔÇó GET  /api/health          - Health check                  Ôòæ
Ôòæ                                                              Ôòæ
Ôòæ  Ready to accept connections! ­ƒÄë                            Ôòæ
ÔòÜÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòÉÔòØ
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Promise Rejection:', err.message);
    // Close server & exit process
    server.close(() => {
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

// Only start server in development (not on Vercel)
if (process.env.VERCEL !== '1') {
    startServer();
}

// Export for Vercel serverless
module.exports = app;

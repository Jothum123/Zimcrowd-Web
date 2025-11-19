require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve JS files from js directory
app.use('/js', express.static(path.join(__dirname, 'js')));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================================================
// HELPER FUNCTION TO LOAD ROUTES SAFELY
// =====================================================

function loadRoute(routePath, routeName) {
    try {
        const fullPath = path.join(__dirname, routePath + '.js');
        if (fs.existsSync(fullPath)) {
            const route = require(routePath);
            console.log(`✅ Loading route: ${routeName}`);
            return route;
        } else {
            console.log(`⚠️  Skipping route: ${routeName} (file not found)`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error loading route: ${routeName}`);
        console.log(`   Error: ${error.message}`);
        if (process.env.NODE_ENV === 'development') {
            console.log(`   Path: ${routePath}`);
        }
        return null;
    }
}

// =====================================================
// LOAD ROUTES
// =====================================================

console.log('\n' + '='.repeat(60));
console.log('📦 Loading Routes...');
console.log('='.repeat(60));

const routes = {
    authProduction: loadRoute('./routes/auth-production', 'Authentication (Production)'),
    auth: loadRoute('./routes/auth', 'Authentication (Legacy)'),
    socialAuth: loadRoute('./routes/social-auth', 'Social Authentication (Google/Facebook)'),
    passwordReset: loadRoute('./routes/password-reset', 'Password Reset (OTP)'),
    profile: loadRoute('./routes/profile', 'Profile'),
    profileSetup: loadRoute('./routes/profile-setup', 'Profile Setup'),
    wallet: loadRoute('./routes/wallet', 'Wallet'),
    transactions: loadRoute('./routes/transactions', 'Transactions'),
    loans: loadRoute('./routes/loans', 'Loans'),
    investments: loadRoute('./routes/investments', 'Investments'),
    adminDashboard: loadRoute('./routes/admin-dashboard', 'Admin Dashboard'),
    kycOcr: loadRoute('./routes/kyc-ocr', 'KYC OCR'),
    faceVerification: loadRoute('./routes/face-verification', 'Face Verification'),
    accountStatus: loadRoute('./routes/account-status', 'Account Status'),
    notifications: loadRoute('./routes/notifications', 'Notifications'),
    market: loadRoute('./routes/market', 'Market'),
    analytics: loadRoute('./routes/analytics', 'Analytics'),
    referrals: loadRoute('./routes/referrals', 'Referrals'),
    zimscore: loadRoute('./routes/zimscore', 'ZimScore'),
    kairo: loadRoute('./routes/kairo', 'Kairo AI'),
    kairoAzure: loadRoute('./routes/kairo-azure', 'Kairo AI with Azure OpenAI'),
    // Production Financial Routes
    paynowProduction: loadRoute('./routes/paynow-production', 'PayNow Production'),
    referralCredits: loadRoute('./routes/referral-credits', 'Referral Credits'),
    transactionsRealtime: loadRoute('./routes/transactions-realtime', 'Real-Time Transactions'),
    paymentFallback: loadRoute('./routes/payment-fallback', 'Payment Fallback'),
    adminWalletMonitoring: loadRoute('./routes/admin-wallet-monitoring', 'Admin Wallet Monitoring'),
    adminManualTransactions: loadRoute('./routes/admin-manual-transactions', 'Admin Manual Transactions'),
    adminRoleManagement: loadRoute('./routes/admin-role-management', 'Admin Role Management'),
    cleanupOrphaned: loadRoute('./routes/cleanup-orphaned', 'Cleanup Orphaned Records')
};

console.log('='.repeat(60) + '\n');

// =====================================================
// REGISTER ROUTES
// =====================================================

// Health check
app.get('/api/health', (req, res) => {
    const loadedRoutes = Object.keys(routes).filter(key => routes[key] !== null);
    res.json({
        success: true,
        message: 'ZimCrowd API Server Running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        loadedRoutes: loadedRoutes,
        services: {
            ocr: routes.kycOcr ? 'Google Cloud Vision AI' : 'Not loaded',
            database: 'Supabase PostgreSQL',
            storage: 'Supabase Storage'
        }
    });
});

// Register routes if they loaded successfully
if (routes.authProduction) app.use('/api/auth', routes.authProduction);
else if (routes.auth) app.use('/api/auth', routes.auth);
if (routes.socialAuth) app.use('/api/social-auth', routes.socialAuth);
if (routes.passwordReset) app.use('/api/auth/password-reset', routes.passwordReset);
if (routes.profile) app.use('/api/profile', routes.profile);
if (routes.profileSetup) app.use('/api/profile-setup', routes.profileSetup);
if (routes.wallet) app.use('/api/wallet', routes.wallet);
if (routes.transactions) app.use('/api/transactions', routes.transactions);
if (routes.loans) app.use('/api/loans', routes.loans);
if (routes.investments) app.use('/api/investments', routes.investments);
if (routes.adminDashboard) app.use('/api/admin-dashboard', routes.adminDashboard);
if (routes.kycOcr) app.use('/api/kyc-ocr', routes.kycOcr);
if (routes.faceVerification) app.use('/api/face', routes.faceVerification);
if (routes.accountStatus) app.use('/api/account-status', routes.accountStatus);
if (routes.notifications) app.use('/api/notifications', routes.notifications);
if (routes.market) app.use('/api/market', routes.market);
if (routes.analytics) app.use('/api/analytics', routes.analytics);
if (routes.referrals) app.use('/api/referrals', routes.referrals);
if (routes.zimscore) app.use('/api/zimscore', routes.zimscore);
if (routes.kairo) app.use('/api/kairo', routes.kairo);
if (routes.kairoAzure) app.use('/api/kairo-azure', routes.kairoAzure);

// Production Financial Routes
if (routes.paynowProduction) app.use('/api/paynow-production', routes.paynowProduction);
if (routes.referralCredits) app.use('/api/referral-credits', routes.referralCredits);
if (routes.transactionsRealtime) app.use('/api/transactions-realtime', routes.transactionsRealtime);
if (routes.paymentFallback) app.use('/api/payment-fallback', routes.paymentFallback);
if (routes.adminWalletMonitoring) app.use('/api/admin-wallet-monitoring', routes.adminWalletMonitoring);
if (routes.adminManualTransactions) app.use('/api/admin-manual-transactions', routes.adminManualTransactions);
if (routes.adminRoleManagement) app.use('/api/admin-role-management', routes.adminRoleManagement);
if (routes.cleanupOrphaned) app.use('/api/cleanup', routes.cleanupOrphaned);

// =====================================================
// ERROR HANDLING
// =====================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB'
        });
    }

    if (err.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// =====================================================
// START SERVER
// =====================================================

// Use API_PORT first (for local dev), then PORT (for Railway/Render), then default 3001
const PORT = process.env.API_PORT || process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 ZimCrowd API Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    
    if (routes.kycOcr) {
        console.log(`🔍 OCR Service: http://localhost:${PORT}/api/kyc-ocr`);
    }
    if (routes.profile) {
        console.log(`👤 Profile: http://localhost:${PORT}/api/profile`);
    }
    if (routes.wallet) {
        console.log(`💰 Wallet: http://localhost:${PORT}/api/wallet`);
    }
    if (routes.loans) {
        console.log(`📊 Loans: http://localhost:${PORT}/api/loans`);
    }
    if (routes.investments) {
        console.log(`📈 Investments: http://localhost:${PORT}/api/investments`);
    }
    if (routes.adminDashboard) {
        console.log(`👑 Admin: http://localhost:${PORT}/api/admin-dashboard`);
    }
    
    console.log('='.repeat(60));
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(60) + '\n');
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    process.exit(0);
});

module.exports = app;

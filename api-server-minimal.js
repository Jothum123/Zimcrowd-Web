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

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// =====================================================
// HELPER FUNCTION TO LOAD ROUTES SAFELY
// =====================================================

function loadRoute(routePath, routeName) {
    try {
        if (fs.existsSync(path.join(__dirname, routePath))) {
            console.log(`✅ Loading route: ${routeName}`);
            return require(routePath);
        } else {
            console.log(`⚠️  Skipping route: ${routeName} (file not found)`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error loading route: ${routeName} - ${error.message}`);
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
    auth: loadRoute('./routes/auth', 'Authentication'),
    profile: loadRoute('./routes/profile', 'Profile'),
    profileSetup: loadRoute('./routes/profile-setup', 'Profile Setup'),
    wallet: loadRoute('./routes/wallet', 'Wallet'),
    transactions: loadRoute('./routes/transactions', 'Transactions'),
    loans: loadRoute('./routes/loans', 'Loans'),
    investments: loadRoute('./routes/investments', 'Investments'),
    adminDashboard: loadRoute('./routes/admin-dashboard', 'Admin Dashboard'),
    kycOcr: loadRoute('./routes/kyc-ocr', 'KYC OCR'),
    accountStatus: loadRoute('./routes/account-status', 'Account Status'),
    notifications: loadRoute('./routes/notifications', 'Notifications'),
    market: loadRoute('./routes/market', 'Market'),
    analytics: loadRoute('./routes/analytics', 'Analytics'),
    referrals: loadRoute('./routes/referrals', 'Referrals')
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
if (routes.auth) app.use('/api/auth', routes.auth);
if (routes.profile) app.use('/api/profile', routes.profile);
if (routes.profileSetup) app.use('/api/profile-setup', routes.profileSetup);
if (routes.wallet) app.use('/api/wallet', routes.wallet);
if (routes.transactions) app.use('/api/transactions', routes.transactions);
if (routes.loans) app.use('/api/loans', routes.loans);
if (routes.investments) app.use('/api/investments', routes.investments);
if (routes.adminDashboard) app.use('/api/admin-dashboard', routes.adminDashboard);
if (routes.kycOcr) app.use('/api/kyc-ocr', routes.kycOcr);
if (routes.accountStatus) app.use('/api/account-status', routes.accountStatus);
if (routes.notifications) app.use('/api/notifications', routes.notifications);
if (routes.market) app.use('/api/market', routes.market);
if (routes.analytics) app.use('/api/analytics', routes.analytics);
if (routes.referrals) app.use('/api/referrals', routes.referrals);

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

// Railway provides PORT, fallback to API_PORT or 3001
const PORT = process.env.PORT || process.env.API_PORT || 3001;

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

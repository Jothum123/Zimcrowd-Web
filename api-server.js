require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// =====================================================
// MIDDLEWARE
// =====================================================

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Static files (optional - for serving frontend)
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// IMPORT ROUTES
// =====================================================

// Authentication & User Management
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const profileSetupRoutes = require('./routes/profile-setup');

// Financial Routes
const walletRoutes = require('./routes/wallet');
const transactionsRoutes = require('./routes/transactions');
const loansRoutes = require('./routes/loans');
const investmentsRoutes = require('./routes/investments');

// Admin Routes
const adminDashboardRoutes = require('./routes/admin-dashboard');

// KYC & OCR
const kycOcrRoutes = require('./routes/kyc-ocr');

// Account Status
const accountStatusRoutes = require('./routes/account-status');

// Notifications
const notificationsRoutes = require('./routes/notifications');

// Market Routes
const marketRoutes = require('./routes/market');

// Analytics
const analyticsRoutes = require('./routes/analytics');

// Referrals
const referralsRoutes = require('./routes/referrals');

// =====================================================
// REGISTER ROUTES
// =====================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'ZimCrowd API Server Running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            ocr: 'Google Cloud Vision AI',
            database: 'Supabase PostgreSQL',
            storage: 'Supabase Storage'
        }
    });
});

// Authentication & Profile
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/profile-setup', profileSetupRoutes);

// Financial Services
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/investments', investmentsRoutes);

// Admin
app.use('/api/admin-dashboard', adminDashboardRoutes);

// KYC & OCR
app.use('/api/kyc-ocr', kycOcrRoutes);

// Account Management
app.use('/api/account-status', accountStatusRoutes);

// Notifications
app.use('/api/notifications', notificationsRoutes);

// Market
app.use('/api/market', marketRoutes);

// Analytics
app.use('/api/analytics', analyticsRoutes);

// Referrals
app.use('/api/referrals', referralsRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Multer file upload errors
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

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.API_PORT || 3001;

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 ZimCrowd API Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔍 OCR Service: http://localhost:${PORT}/api/kyc-ocr`);
    console.log(`👤 Profile: http://localhost:${PORT}/api/profile`);
    console.log(`💰 Wallet: http://localhost:${PORT}/api/wallet`);
    console.log(`📊 Loans: http://localhost:${PORT}/api/loans`);
    console.log(`📈 Investments: http://localhost:${PORT}/api/investments`);
    console.log(`👑 Admin: http://localhost:${PORT}/api/admin-dashboard`);
    console.log('='.repeat(60));
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    process.exit(0);
});

module.exports = app;

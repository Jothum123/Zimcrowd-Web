require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');

// Import Supabase utilities
const { supabase } = require('./utils/supabase-auth');

const app = express();

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
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

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);

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
                forgotPassword: 'POST /api/auth/forgot-password',
                verifyOTP: 'POST /api/auth/verify-otp',
                resetPassword: 'POST /api/auth/reset-password',
                resendOTP: 'POST /api/auth/resend-otp'
            },
            health: 'GET /api/health'
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
    res.status(404).json({
        success: false,
        message: 'Route not found',
        availableRoutes: [
            'POST /api/auth/register',
            'POST /api/auth/login',
            'POST /api/auth/forgot-password',
            'POST /api/auth/verify-otp',
            'POST /api/auth/reset-password',
            'POST /api/auth/resend-otp',
            'GET /api/health',
            'GET /api/test'
        ]
    });
});

// Test Supabase connection on startup
const testSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);

        if (error) {
            console.warn('⚠️  Supabase connection test failed:', error.message);
            console.warn('   Make sure your environment variables are set correctly');
        } else {
            console.log('✅ Supabase connection successful');
        }
    } catch (error) {
        console.warn('⚠️  Supabase connection test error:', error.message);
    }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Test Supabase connection
        await testSupabaseConnection();

        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     🚀 ZimCrowd Supabase API                  ║
║                                                              ║
║  Server:    http://localhost:${PORT}                           ║
║  Environment: ${process.env.NODE_ENV || 'development'}                  ║
║  Database:  Supabase PostgreSQL                             ║
║                                                              ║
║  API Endpoints:                                              ║
║  • POST /api/auth/register     - User registration           ║
║  • POST /api/auth/login        - User login                  ║
║  • POST /api/auth/forgot-password - Password reset request   ║
║  • POST /api/auth/verify-otp   - OTP verification            ║
║  • POST /api/auth/reset-password - Password reset            ║
║  • POST /api/auth/resend-otp   - Resend OTP                  ║
║  • GET  /api/health          - Health check                  ║
║                                                              ║
║  Ready to accept connections! 🎉                            ║
╚══════════════════════════════════════════════════════════════╝
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

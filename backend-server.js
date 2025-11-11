require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const phoneAuthRoutes = require('./routes/phone-auth');
const emailAuthRoutes = require('./routes/email-auth');

// Import Supabase utilities
const { supabase } = require('./utils/supabase-auth');

// Import Twilio utilities
const { testTwilioConnection } = require('./utils/twilio-service');

// Import Email utilities
const { testEmailConnection } = require('./utils/email-service');

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
app.use('/api/phone-auth', phoneAuthRoutes);
app.use('/api/email-auth', emailAuthRoutes);

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
            phoneAuth: {
                registerPhone: 'POST /api/phone-auth/register-phone',
                verifyPhoneSignup: 'POST /api/phone-auth/verify-phone-signup',
                loginPhone: 'POST /api/phone-auth/login-phone',
                forgotPasswordPhone: 'POST /api/phone-auth/forgot-password-phone',
                verifyResetOtp: 'POST /api/phone-auth/verify-reset-otp',
                resetPasswordPhone: 'POST /api/phone-auth/reset-password-phone',
                resendPhoneOTP: 'POST /api/phone-auth/resend-phone-otp'
            },
            emailAuth: {
                registerEmail: 'POST /api/email-auth/register-email',
                verifyEmailSignup: 'POST /api/email-auth/verify-email-signup',
                loginEmail: 'POST /api/email-auth/login-email',
                forgotPasswordEmail: 'POST /api/email-auth/forgot-password-email',
                resetPasswordEmail: 'POST /api/email-auth/reset-password-email',
                resendEmailOTP: 'POST /api/email-auth/resend-email-otp'
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
            'POST /api/phone-auth/register-phone',
            'POST /api/phone-auth/verify-phone-signup',
            'POST /api/phone-auth/login-phone',
            'POST /api/phone-auth/forgot-password-phone',
            'POST /api/phone-auth/verify-reset-otp',
            'POST /api/phone-auth/reset-password-phone',
            'POST /api/phone-auth/resend-phone-otp',
            'POST /api/email-auth/register-email',
            'POST /api/email-auth/verify-email-signup',
            'POST /api/email-auth/login-email',
            'POST /api/email-auth/forgot-password-email',
            'POST /api/email-auth/reset-password-email',
            'POST /api/email-auth/resend-email-otp',
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
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        await testTwilioConnection();
    } else {
        console.warn('ÔÜá´©Å  Twilio credentials not found - SMS features disabled');
        console.warn('   Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable SMS');
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
const PORT = process.env.PORT || 5000;

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
Ôòæ                                                              Ôòæ
Ôòæ  API Endpoints:                                              Ôòæ
Ôòæ  ÔÇó POST /api/auth/register     - User registration           Ôòæ
Ôòæ  ÔÇó POST /api/auth/login        - User login                  Ôòæ
Ôòæ  ÔÇó POST /api/auth/forgot-password - Password reset request   Ôòæ
Ôòæ  ÔÇó POST /api/auth/verify-otp   - OTP verification            Ôòæ
Ôòæ  ÔÇó POST /api/auth/reset-password - Password reset            Ôòæ
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

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
<<<<<<< HEAD
const phoneAuthRoutes = require('./routes/phone-auth');
const emailAuthRoutes = require('./routes/email-auth');
=======
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2

// Import Supabase utilities
const { supabase } = require('./utils/supabase-auth');

<<<<<<< HEAD
// Import Twilio utilities
const { testTwilioConnection } = require('./utils/twilio-service');

// Import Email utilities
const { testEmailConnection } = require('./utils/email-service');

=======
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2
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
<<<<<<< HEAD
app.use('/api/phone-auth', phoneAuthRoutes);
app.use('/api/email-auth', emailAuthRoutes);
=======
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2

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
<<<<<<< HEAD
            phoneAuth: {
                registerPhone: 'POST /api/phone-auth/register-phone',
                verifyPhoneSignup: 'POST /api/phone-auth/verify-phone-signup',
                loginPhone: 'POST /api/phone-auth/login-phone',
                forgotPasswordPhone: 'POST /api/phone-auth/forgot-password-phone',
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
=======
            health: 'GET /api/health'
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2
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
<<<<<<< HEAD
            'POST /api/phone-auth/register-phone',
            'POST /api/phone-auth/verify-phone-signup',
            'POST /api/phone-auth/login-phone',
            'POST /api/phone-auth/forgot-password-phone',
            'POST /api/phone-auth/reset-password-phone',
            'POST /api/phone-auth/resend-phone-otp',
            'POST /api/email-auth/register-email',
            'POST /api/email-auth/verify-email-signup',
            'POST /api/email-auth/login-email',
            'POST /api/email-auth/forgot-password-email',
            'POST /api/email-auth/reset-password-email',
            'POST /api/email-auth/resend-email-otp',
=======
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2
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

<<<<<<< HEAD
// Test Twilio connection on startup
const testTwilioConnectionOnStartup = async () => {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        await testTwilioConnection();
    } else {
        console.warn('⚠️  Twilio credentials not found - SMS features disabled');
        console.warn('   Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable SMS');
    }
};

// Test Email connection on startup
const testEmailConnectionOnStartup = async () => {
    const emailConfigured = process.env.GMAIL_USER || process.env.OUTLOOK_USER || process.env.SMTP_HOST;
    if (emailConfigured) {
        await testEmailConnection();
    } else {
        console.warn('⚠️  Email credentials not found - Email OTP features disabled');
        console.warn('   Add email credentials (GMAIL_USER/GMAIL_APP_PASSWORD or OUTLOOK_USER/OUTLOOK_PASSWORD or SMTP_*) to enable email OTP');
    }
};

=======
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2
// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
<<<<<<< HEAD
        // Test connections
        await testSupabaseConnection();
        await testTwilioConnectionOnStartup();
        await testEmailConnectionOnStartup();
=======
        // Test Supabase connection
        await testSupabaseConnection();
>>>>>>> fa6ee7f379aeda482e2f2cff449928ff250a7fd2

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

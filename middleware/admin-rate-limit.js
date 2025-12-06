/**
 * Admin AI Rate Limiting Middleware
 * Prevents AI API abuse by limiting requests per admin
 */

const rateLimit = require('express-rate-limit');

// Admin AI specific rate limiting
const adminAIRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 20, // Limit each admin to 20 requests per minute
    message: {
        success: false,
        message: 'Too many AI requests. Please try again later.',
        retryAfter: '60 seconds'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        // Use admin ID for rate limiting
        return req.user?.id || req.ip;
    },
    skip: (req) => {
        // Skip rate limiting for specific admin roles if needed
        return req.user?.role === 'super_admin';
    }
});

// Stricter rate limiting for analysis endpoints
const adminAnalysisRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 5, // Limit each admin to 5 analysis requests per minute
    message: {
        success: false,
        message: 'Too many analysis requests. Please try again later.',
        retryAfter: '60 seconds'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip,
    skip: (req) => req.user?.role === 'super_admin'
});

module.exports = {
    adminAIRateLimit,
    adminAnalysisRateLimit
};

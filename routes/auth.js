const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const {
    registerUser,
    signInUser,
    sendPasswordReset,
    updatePassword,
    verifyOTP,
    checkRateLimit,
    isValidPhone
} = require('../utils/supabase-auth');

const router = express.Router();

// Rate limiting temporarily disabled for testing
// TODO: Re-enable in production with appropriate limits

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// @route   POST /api/auth/register
// @desc    Register a new user with Supabase
// @access  Public
router.post('/register', [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('phone')
        .optional()
        .custom((value) => {
            if (value && !isValidPhone(value)) {
                throw new Error('Please provide a valid phone number');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;

        const result = await registerUser({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password
        });

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user with Supabase
// @access  Public
router.post('/login', [
    body('emailOrPhone')
        .notEmpty()
        .withMessage('Email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { emailOrPhone, password, rememberMe } = req.body;

        const result = await signInUser(emailOrPhone, password, rememberMe);

        if (result.success) {
            res.json(result);
        } else {
            res.status(401).json(result);
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset via Supabase
// @access  Public
router.post('/forgot-password', [
    body('emailOrPhone')
        .notEmpty()
        .withMessage('Email is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { emailOrPhone } = req.body;

        // Check rate limiting
        if (!checkRateLimit(req, { windowMs: 15 * 60 * 1000, max: 3 })) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }

        // For now, assume emailOrPhone is email
        const result = await sendPasswordReset(emailOrPhone);

        if (result.success) {
            res.json({
                success: true,
                message: 'Password reset email sent. Please check your email.'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process request. Please try again.'
        });
    }
});

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP with Supabase
// @access  Public
router.post('/verify-otp', [
    body('identifier')
        .notEmpty()
        .withMessage('Identifier is required'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be 6 digits'),
    body('type')
        .isIn(['signup', 'reset', 'verification'])
        .withMessage('Invalid OTP type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { identifier, otp, type } = req.body;

        const result = await verifyOTP(identifier, otp);

        if (result.success) {
            res.json({
                success: true,
                message: 'OTP verified successfully',
                type: type
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'OTP verification failed. Please try again.'
        });
    }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password (handled by Supabase redirect)
// @access  Public
router.post('/reset-password', [
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { newPassword } = req.body;

        const result = await updatePassword(newPassword);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset failed. Please try again.'
        });
    }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP (simplified for Supabase)
// @access  Public
router.post('/resend-otp', [
    body('identifier')
        .notEmpty()
        .withMessage('Identifier is required'),
    body('type')
        .isIn(['signup', 'reset', 'verification'])
        .withMessage('Invalid OTP type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { identifier, type } = req.body;

        // Check rate limiting
        if (!checkRateLimit(req, { windowMs: 5 * 60 * 1000, max: 3 })) { // 5 minutes window
            return res.status(429).json({
                success: false,
                message: 'Please wait before requesting another code.'
            });
        }

        // Resend based on type
        let result;
        if (type === 'reset') {
            result = await sendPasswordReset(identifier);
        } else {
            // For signup verification, Supabase handles this automatically
            result = { success: true, message: 'Verification email sent' };
        }

        if (result.success) {
            res.json({
                success: true,
                message: 'Code resent successfully.'
            });
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend code. Please try again.'
        });
    }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        
        if (!refresh_token) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }
        
        // Use Supabase to refresh the session
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        
        const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refresh_token
        });
        
        if (error) {
            console.error('Token refresh error:', error);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token'
            });
        }
        
        if (data.session) {
            res.json({
                success: true,
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in,
                user: data.user
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Could not refresh session'
            });
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh token'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side clears localStorage, this is for logging)
// @access  Public
router.post('/logout', async (req, res) => {
    try {
        // Log logout event (optional)
        console.log('User logged out at:', new Date().toISOString());
        
        // In a JWT-based system, logout is handled client-side by removing the token
        // This endpoint exists for logging purposes and to confirm logout
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// @route   POST /api/auth/check-login-method
// @desc    Get the last-used sign-in method for a user (for displaying badge on login page)
// @access  Public
router.post('/check-login-method', [
    body('identifier')
        .notEmpty()
        .withMessage('Email or phone is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { identifier } = req.body;
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );
        
        // Determine if identifier is email or phone
        const isEmail = identifier.includes('@');
        
        // Query profile by email or phone
        let query = supabase
            .from('profiles')
            .select('auth_provider, last_login_method, last_login_at');
        
        if (isEmail) {
            query = query.eq('email', identifier.toLowerCase());
        } else {
            // Try to match phone number (with or without formatting)
            query = query.or(`phone.eq.${identifier},phone.eq.+${identifier.replace(/^\+/, '')}`);
        }
        
        const { data: profile, error } = await query.single();
        
        if (error || !profile) {
            // Don't reveal if user exists - return null badge
            return res.json({
                success: true,
                badge: null,
                message: 'No login history found'
            });
        }
        
        // Return the badge info
        const badgeInfo = {
            authProvider: profile.auth_provider,
            lastLoginMethod: profile.last_login_method || profile.auth_provider,
            lastLoginAt: profile.last_login_at,
            // Human-readable badge text
            badgeText: getBadgeText(profile.last_login_method || profile.auth_provider),
            badgeIcon: getBadgeIcon(profile.last_login_method || profile.auth_provider)
        };
        
        res.json({
            success: true,
            badge: badgeInfo
        });
        
    } catch (error) {
        console.error('Check login method error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check login method'
        });
    }
});

// Helper function to get badge text
function getBadgeText(method) {
    const badges = {
        'google': 'Last signed in with Google',
        'facebook': 'Last signed in with Facebook',
        'email': 'Last signed in with Email',
        'phone': 'Last signed in with Phone',
        'apple': 'Last signed in with Apple',
        'twitter': 'Last signed in with Twitter'
    };
    return badges[method] || 'Last signed in with ' + (method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Unknown');
}

// Helper function to get badge icon
function getBadgeIcon(method) {
    const icons = {
        'google': '🔵',
        'facebook': '🔷',
        'email': '✉️',
        'phone': '📱',
        'apple': '🍎',
        'twitter': '🐦'
    };
    return icons[method] || '🔐';
}

module.exports = router;

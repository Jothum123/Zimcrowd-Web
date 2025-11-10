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

module.exports = router;

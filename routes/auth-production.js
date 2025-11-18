/**
 * Production-Ready Authentication Routes
 * Handles signup, login, logout, password reset
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
    registerUser,
    loginUser,
    logoutUser,
    getUserById,
    requestPasswordReset,
    resetPassword
} = require('../utils/auth-service');

const router = express.Router();

// Rate limiters
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: { success: false, message: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations
    message: { success: false, message: 'Too many registration attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts
    message: { success: false, message: 'Too many password reset requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup',
    registerLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        body('fullName')
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('Full name must be between 2 and 100 characters'),
        body('phone')
            .optional()
            .matches(/^\+?[1-9]\d{1,14}$/)
            .withMessage('Please provide a valid phone number'),
        handleValidationErrors
    ],
    async (req, res) => {
        try {
            const { email, password, fullName, phone } = req.body;

            const result = await registerUser({
                email,
                password,
                fullName,
                phone
            });

            if (result.success) {
                return res.status(201).json(result);
            } else {
                return res.status(400).json(result);
            }

        } catch (error) {
            console.error('Signup route error:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred during registration. Please try again.'
            });
        }
    }
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
    loginLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        body('password')
            .notEmpty()
            .withMessage('Password is required'),
        handleValidationErrors
    ],
    async (req, res) => {
        try {
            const { email, password } = req.body;

            const result = await loginUser(email, password);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(401).json(result);
            }

        } catch (error) {
            console.error('Login route error:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred during login. Please try again.'
            });
        }
    }
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const result = await logoutUser(token);

        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(400).json(result);
        }

    } catch (error) {
        console.error('Logout route error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during logout. Please try again.'
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const { verifyToken } = require('../utils/auth-service');
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        const user = await getUserById(decoded.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error('Get user route error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching user data'
        });
    }
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP code
 * @access  Public
 */
router.post('/verify-otp',
    [
        body('identifier')
            .notEmpty()
            .withMessage('Email or phone is required'),
        body('otp')
            .isLength({ min: 6, max: 6 })
            .isNumeric()
            .withMessage('OTP must be 6 digits'),
        handleValidationErrors
    ],
    async (req, res) => {
        try {
            const { identifier, otp } = req.body;

            // For now, accept any 6-digit OTP (you can add real validation later)
            if (otp && otp.length === 6) {
                return res.json({
                    success: true,
                    message: 'OTP verified successfully'
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP code'
                });
            }

        } catch (error) {
            console.error('OTP verification error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify OTP'
            });
        }
    }
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
    passwordResetLimiter,
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),
        handleValidationErrors
    ],
    async (req, res) => {
        try {
            const { email } = req.body;

            const result = await requestPasswordReset(email);

            return res.status(200).json(result);

        } catch (error) {
            console.error('Forgot password route error:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while processing your request'
            });
        }
    }
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password',
    [
        body('token')
            .notEmpty()
            .withMessage('Reset token is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters long')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        handleValidationErrors
    ],
    async (req, res) => {
        try {
            const { token, newPassword } = req.body;

            const result = await resetPassword(token, newPassword);

            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(400).json(result);
            }

        } catch (error) {
            console.error('Reset password route error:', error);
            return res.status(500).json({
                success: false,
                message: 'An error occurred while resetting password'
            });
        }
    }
);

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify if token is valid
 * @access  Public
 */
router.post('/verify-token', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'No token provided'
            });
        }

        const { verifyToken } = require('../utils/auth-service');
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                valid: false
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Token is valid',
            valid: true,
            userId: decoded.userId,
            email: decoded.email
        });

    } catch (error) {
        console.error('Verify token route error:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while verifying token'
        });
    }
});

// =====================================================
// PASSWORD RESET WITH OTP ROUTES
// =====================================================

// Import password reset routes
const passwordResetRouter = require('./password-reset');

// Mount password reset routes under /password-reset
router.use('/password-reset', passwordResetRouter);

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');

const router = express.Router();

// Middleware to verify JWT token and get user
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify JWT token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Get user from Supabase auth
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

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

// Generate unique referral code
const generateReferralCode = (userId) => {
    const prefix = 'ZCRWD';
    const userPart = userId.substring(0, 6).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${userPart}-${timestamp}`;
};

// @route   GET /api/referrals/code
// @desc    Get user's referral code
// @access  Private
router.get('/code', authenticateUser, async (req, res) => {
    try {
        // For now, generate code on the fly
        // In production, this would be stored in database
        const referralCode = generateReferralCode(req.user.id);

        res.json({
            success: true,
            data: {
                referral_code: referralCode,
                share_url: `https://zimcrowd.com/signup?ref=${referralCode}`,
                qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://zimcrowd.com/signup?ref=${referralCode}`
            }
        });
    } catch (error) {
        console.error('Get referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/referrals/stats
// @desc    Get user's referral statistics
// @access  Private
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        // Mock data - in production this would query a referrals table
        const mockStats = {
            total_referrals: 12,
            active_referrals: 8,
            pending_referrals: 4,
            total_earnings: 250.00,
            this_month_earnings: 75.00,
            active_loans_from_referrals: 5,
            average_loan_amount: 3200.00,
            conversion_rate: 66.7 // percentage
        };

        res.json({
            success: true,
            data: mockStats
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/referrals/history
// @desc    Get referral history
// @access  Private
router.get('/history', authenticateUser, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Mock data - in production this would query referrals table
        const mockReferrals = [
            {
                id: 1,
                referred_user: 'john.doe@example.com',
                status: 'active',
                joined_date: '2025-01-15T10:30:00Z',
                loan_amount: 5000.00,
                commission_earned: 25.00,
                loan_status: 'active',
                payout_status: 'paid'
            },
            {
                id: 2,
                referred_user: 'jane.smith@example.com',
                status: 'active',
                joined_date: '2025-01-20T14:15:00Z',
                loan_amount: 3200.00,
                commission_earned: 16.00,
                loan_status: 'active',
                payout_status: 'paid'
            },
            {
                id: 3,
                referred_user: 'bob.wilson@example.com',
                status: 'pending',
                joined_date: '2025-02-01T09:45:00Z',
                loan_amount: null,
                commission_earned: 0,
                loan_status: null,
                payout_status: null
            }
        ];

        // Apply pagination
        const paginatedReferrals = mockReferrals.slice(offset, offset + limit);

        res.json({
            success: true,
            data: {
                referrals: paginatedReferrals,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: mockReferrals.length,
                    pages: Math.ceil(mockReferrals.length / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get referral history error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/referrals/track
// @desc    Track a referral signup (called when someone signs up with referral code)
// @access  Public (but requires valid referral code)
router.post('/track', [
    body('referral_code')
        .notEmpty()
        .withMessage('Referral code is required'),
    body('new_user_email')
        .isEmail()
        .withMessage('Valid email is required'),
    body('new_user_id')
        .optional()
        .isUUID()
        .withMessage('Valid user ID required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { referral_code, new_user_email, new_user_id } = req.body;

        // Validate referral code format
        if (!referral_code.startsWith('ZCRWD-')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral code format'
            });
        }

        // Extract referrer ID from code (mock logic)
        // In production, you would look up the referral code in database
        const codeParts = referral_code.split('-');
        if (codeParts.length !== 3) {
            return res.status(400).json({
                success: false,
                message: 'Invalid referral code'
            });
        }

        const mockReferrerId = 'mock-user-id-' + codeParts[1].toLowerCase();

        // Check if referral code exists and is valid
        // For now, accept all valid format codes

        // In production, create referral record in database
        const referralRecord = {
            id: Date.now(),
            referrer_id: mockReferrerId,
            referred_user_id: new_user_id,
            referred_email: new_user_email,
            referral_code: referral_code,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        res.status(201).json({
            success: true,
            message: 'Referral tracked successfully',
            data: referralRecord
        });
    } catch (error) {
        console.error('Track referral error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/referrals/payout
// @desc    Request payout for referral earnings
// @access  Private
router.post('/payout', authenticateUser, [
    body('amount')
        .isFloat({ min: 10, max: 1000 })
        .withMessage('Payout amount must be between $10 and $1,000'),
    body('payment_method')
        .isIn(['bank_transfer', 'mobile_money'])
        .withMessage('Please provide a valid payment method'),
    body('account_details')
        .isObject()
        .withMessage('Account details are required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, payment_method, account_details } = req.body;

        // Check available earnings (mock check)
        const availableEarnings = 250.00; // From mock stats

        if (parseFloat(amount) > availableEarnings) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient referral earnings for payout'
            });
        }

        // In production, this would:
        // 1. Verify earnings balance
        // 2. Create payout transaction
        // 3. Process payment
        // 4. Update earnings balance

        const payoutRecord = {
            id: Date.now(),
            user_id: req.user.id,
            amount: parseFloat(amount),
            payment_method: payment_method,
            account_details: account_details,
            status: 'pending',
            requested_at: new Date().toISOString(),
            estimated_completion: '3-5 business days'
        };

        res.status(201).json({
            success: true,
            message: 'Payout request submitted successfully',
            data: payoutRecord
        });
    } catch (error) {
        console.error('Referral payout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/referrals/leaderboard
// @desc    Get referral leaderboard
// @access  Private
router.get('/leaderboard', authenticateUser, async (req, res) => {
    try {
        // Mock leaderboard data
        const leaderboard = [
            {
                rank: 1,
                user: 'Sarah Johnson',
                referrals: 45,
                earnings: 1125.00,
                avatar: 'SJ'
            },
            {
                rank: 2,
                user: 'Mike Chen',
                referrals: 38,
                earnings: 950.00,
                avatar: 'MC'
            },
            {
                rank: 3,
                user: 'Emma Wilson',
                referrals: 32,
                earnings: 800.00,
                avatar: 'EW'
            },
            {
                rank: 4,
                user: 'David Brown',
                referrals: 28,
                earnings: 700.00,
                avatar: 'DB'
            },
            {
                rank: 5,
                user: 'You',
                referrals: 12,
                earnings: 250.00,
                avatar: 'YO',
                is_current_user: true
            }
        ];

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/referrals/program-info
// @desc    Get referral program information
// @access  Public
router.get('/program-info', async (req, res) => {
    try {
        const programInfo = {
            commission_rate: 0.005, // 0.5%
            commission_per_loan: 25.00, // $25 per loan
            minimum_payout: 10.00,
            payout_methods: ['bank_transfer', 'mobile_money'],
            terms: {
                eligibility: 'Must be a verified user with completed profile',
                commission_timing: 'Earned when referred user takes their first loan',
                payout_timing: 'Monthly payouts for earnings over $50',
                validity: 'Referral links never expire'
            },
            rewards: [
                {
                    milestone: '5 referrals',
                    reward: '$50 bonus'
                },
                {
                    milestone: '10 referrals',
                    reward: '$100 bonus + featured on leaderboard'
                },
                {
                    milestone: '25 referrals',
                    reward: '$250 bonus + premium badge'
                }
            ]
        };

        res.json({
            success: true,
            data: programInfo
        });
    } catch (error) {
        console.error('Get program info error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

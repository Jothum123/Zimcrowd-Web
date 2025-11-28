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

        // Verify token with Supabase (handles all auth types)
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
        const userId = req.user.id;

        // Get or create referral code from database
        let { data: referralCode, error } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('user_id', userId)
            .single();

        // If no code exists, create one
        if (error || !referralCode) {
            const newCode = generateReferralCode(userId);
            const { data: created, error: createError } = await supabase
                .from('referral_codes')
                .insert({
                    user_id: userId,
                    referral_code: newCode
                })
                .select()
                .single();

            if (createError) throw createError;
            referralCode = created;
        }

        const code = referralCode.referral_code;
        const shareUrl = `https://zimcrowd.com/signup?ref=${code}`;

        res.json({
            success: true,
            data: {
                referral_code: code,
                share_url: shareUrl,
                qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`
            }
        });
    } catch (error) {
        console.error('Get referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get referral code',
            error: error.message
        });
    }
});

// @route   GET /api/referrals/stats
// @desc    Get user's referral statistics
// @access  Private
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get referral code stats
        const { data: codeStats, error: codeError } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (codeError && codeError.code !== 'PGRST116') throw codeError;

        // Get referral counts by status
        const { data: referrals, error: refError } = await supabase
            .from('referrals')
            .select('status, earnings, loans_count')
            .eq('referrer_id', userId);

        if (refError) throw refError;

        // Calculate stats
        const totalReferrals = referrals?.length || 0;
        const activeReferrals = referrals?.filter(r => r.status === 'active').length || 0;
        const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
        const totalEarnings = codeStats?.total_earnings || 0;
        const totalLoans = referrals?.reduce((sum, r) => sum + (r.loans_count || 0), 0) || 0;
        const avgLoanAmount = totalLoans > 0 ? (totalEarnings / totalLoans * 100) : 0;

        // Get this month's earnings
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: monthEarnings, error: monthError } = await supabase
            .from('referral_earnings')
            .select('amount')
            .eq('referrer_id', userId)
            .gte('created_at', startOfMonth.toISOString());

        const thisMonthEarnings = monthEarnings?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

        res.json({
            success: true,
            data: {
                total_referrals: totalReferrals,
                active_referrals: activeReferrals,
                pending_referrals: pendingReferrals,
                total_earnings: parseFloat(totalEarnings),
                this_month_earnings: thisMonthEarnings,
                active_loans_from_referrals: totalLoans,
                average_loan_amount: avgLoanAmount,
                conversion_rate: totalReferrals > 0 ? ((activeReferrals / totalReferrals) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get referral stats',
            error: error.message
        });
    }
});

// @route   GET /api/referrals/my-referrals
// @desc    Get user's referrals
// @access  Private
router.get('/my-referrals', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Get referrals with referred user profile data
        const { data: referrals, error, count } = await supabase
            .from('referrals')
            .select(`
                id,
                status,
                earnings,
                loans_count,
                created_at,
                referred_email,
                profiles!referrals_referred_user_id_fkey(
                    first_name,
                    last_name,
                    email
                )
            `, { count: 'exact' })
            .eq('referrer_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Transform data for frontend
        const formattedReferrals = (referrals || []).map(ref => {
            const firstName = ref.profiles?.first_name || '';
            const lastName = ref.profiles?.last_name || '';
            const name = `${firstName} ${lastName}`.trim() || 'Anonymous';
            const email = ref.profiles?.email || ref.referred_email || 'N/A';
            const initials = firstName && lastName 
                ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                : name.substring(0, 2).toUpperCase();

            return {
                id: ref.id,
                name,
                email,
                avatar: initials,
                status: ref.status,
                joined_date: ref.created_at?.split('T')[0] || 'N/A',
                loans_count: ref.loans_count || 0,
                earnings: parseFloat(ref.earnings || 0)
            };
        });

        res.json({
            success: true,
            data: formattedReferrals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get my referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get referrals',
            error: error.message
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

// Alias routes for frontend compatibility
router.get('/', authenticateUser, async (req, res) => {
    // Redirect to /stats
    try {
        const userId = req.user.id;
        
        const { data: referrals, error } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', userId);
        
        if (error) throw error;
        
        const totalReferrals = referrals?.length || 0;
        const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
        const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;
        
        res.json({
            success: true,
            stats: {
                totalReferrals,
                completedReferrals,
                pendingReferrals,
                totalEarnings: referrals?.reduce((sum, r) => sum + (r.reward_amount || 0), 0) || 0
            },
            referrals: referrals || []
        });
    } catch (error) {
        console.error('Referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load referrals',
            error: error.message
        });
    }
});

router.get('/earnings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data: earnings, error } = await supabase
            .from('referral_earnings')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0;
        const paidEarnings = earnings?.filter(e => e.paid).reduce((sum, e) => sum + e.amount, 0) || 0;
        const pendingEarnings = totalEarnings - paidEarnings;
        
        res.json({
            success: true,
            earnings: earnings || [],
            summary: {
                total: totalEarnings,
                paid: paidEarnings,
                pending: pendingEarnings
            }
        });
    } catch (error) {
        console.error('Referral earnings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load earnings',
            error: error.message
        });
    }
});

module.exports = router;

// Dashboard overview routes
const express = require('express');
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

// @route   GET /api/dashboard/ or /api/dashboard/overview
// @desc    Get complete dashboard overview with all key data
// @access  Private
const getDashboardOverview = async (req, res) => {
    try {
        const userId = req.user.id;

        // Execute all dashboard queries in parallel for performance
        const [
            { data: profile, error: profileError },
            { count: loansCount, error: loansCountError },
            { count: investmentsCount, error: investmentsCountError },
            { count: transactionsCount, error: transactionsCountError },
            { data: recentTransactions, error: recentTransactionsError },
            { data: recentLoans, error: recentLoansError }
        ] = await Promise.all([
            // Profile data
            supabase.from('profiles').select('*').eq('id', userId).single(),
            
            // Loans count
            supabase.from('loans').select('*', { count: 'exact', head: true }).eq('borrower_id', userId),
            
            // Investments count
            supabase.from('investments').select('*', { count: 'exact', head: true }).eq('investor_id', userId),
            
            // Transactions count
            supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            
            // Recent transactions (last 5)
            supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
            
            // Recent loans (last 3)
            supabase.from('loans').select('*').eq('borrower_id', userId).order('created_at', { ascending: false }).limit(3)
        ]);

        // Check for critical errors
        if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError);
        }

        // Prepare dashboard data with fallbacks
        const dashboardData = {
            // User profile
            profile: profile || null,
            
            // Wallet information (mock for now)
            wallet: {
                balance: 0,
                available_balance: 0,
                pending_balance: 0
            },
            
            // Statistics overview
            stats: {
                total_loans: loansCount || 0,
                total_investments: investmentsCount || 0,
                total_returns: 0,
                portfolio_value: 0
            },
            
            // Summary counts
            summary: {
                loans_count: loansCount || 0,
                investments_count: investmentsCount || 0,
                transactions_count: transactionsCount || 0,
                notifications_count: 0
            },
            
            // Recent activity
            recent: {
                transactions: recentTransactions || [],
                loans: recentLoans || [],
                investments: [],
                notifications: []
            }
        };

        console.log('✅ Dashboard overview loaded for user:', userId, {
            profile_loaded: !!profile,
            loans_count: loansCount,
            investments_count: investmentsCount
        });

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard overview',
            error: error.message
        });
    }
};

router.get('/', authenticateUser, getDashboardOverview);
router.get('/overview', authenticateUser, getDashboardOverview);

// @route   GET /api/dashboard/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load profile'
        });
    }
});

// @route   GET /api/dashboard/wallet
// @desc    Get wallet balance
// @access  Private
router.get('/wallet', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // For now, return mock wallet data
        // TODO: Create wallets table and implement real wallet functionality
        const mockWallet = {
            user_id: userId,
            balance: 0,
            available_balance: 0,
            pending_balance: 0,
            currency: 'USD',
            updated_at: new Date().toISOString()
        };

        res.json({
            success: true,
            data: mockWallet
        });
    } catch (error) {
        console.error('Wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load wallet'
        });
    }
});

// @route   GET /api/dashboard/loans
// @desc    Get user's loans with pagination
// @access  Private
router.get('/loans', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const { count, error: countError } = await supabase
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('borrower_id', userId);

        if (countError) throw countError;

        // Get paginated loans
        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('borrower_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                loans,
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load loans'
        });
    }
});

// @route   GET /api/dashboard/investments
// @desc    Get user's investments with pagination
// @access  Private
router.get('/investments', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const { count, error: countError } = await supabase
            .from('investments')
            .select('*', { count: 'exact', head: true })
            .eq('investor_id', userId);

        if (countError) throw countError;

        // Get paginated investments with loan details
        const { data: investments, error } = await supabase
            .from('investment_details')
            .select('*')
            .eq('investor_id', userId)
            .order('invested_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                investments,
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Investments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load investments'
        });
    }
});

// @route   GET /api/dashboard/transactions
// @desc    Get user's transactions with pagination
// @access  Private
router.get('/transactions', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const { count, error: countError } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (countError) throw countError;

        // Get paginated transactions
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                transactions,
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load transactions'
        });
    }
});

// @route   GET /api/dashboard/stats
// @desc    Get user statistics
// @access  Private
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('user_statistics')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        // Return default stats if no row exists
        const stats = data || {
            user_id: userId,
            total_invested: 0,
            total_borrowed: 0,
            total_returns: 0,
            active_investments: 0,
            active_loans: 0,
            completed_investments: 0,
            completed_loans: 0,
            average_return_rate: 0,
            zim_score: 0
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load statistics'
        });
    }
});

// @route   GET /api/dashboard/notifications
// @desc    Get user notifications
// @access  Private
router.get('/notifications', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const unreadOnly = req.query.unread === 'true';

        // For now, return empty notifications
        // TODO: Create notifications table and implement real notifications
        const mockNotifications = [];

        res.json({
            success: true,
            data: {
                notifications: mockNotifications,
                unread_count: 0,
                total: 0
            }
        });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load notifications'
        });
    }
});

// @route   GET /api/dashboard/loan-opportunities
// @desc    Get available loan opportunities for investors
// @access  Private
router.get('/loan-opportunities', authenticateUser, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count of pending loans
        const { count, error: countError } = await supabase
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (countError) throw countError;

        // Get paginated loan opportunities with borrower details
        const { data: opportunities, error } = await supabase
            .from('loan_details')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                opportunities,
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Loan opportunities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load loan opportunities'
        });
    }
});

module.exports = router;

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

        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
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
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data
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

        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (unreadOnly) {
            query = query.eq('read', false);
        }

        const { data: notifications, error } = await query;

        if (error) throw error;

        // Get unread count
        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        res.json({
            success: true,
            data: {
                notifications,
                unread_count: unreadCount || 0,
                total: notifications.length
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

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

// @route   GET /api/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { page = 1, limit = 20, type, start_date, end_date } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq('type', type);
        }

        if (start_date) {
            query = query.gte('created_at', start_date);
        }

        if (end_date) {
            query = query.lte('created_at', end_date);
        }

        const { data: transactions, error, count } = await query;

        if (error) {
            console.error('Transactions fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions'
            });
        }

        // Calculate summary statistics
        const totalTransactions = count;
        const totalCredits = transactions
            .filter(t => ['deposit', 'investment_return'].includes(t.type))
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const totalDebits = transactions
            .filter(t => ['withdrawal', 'loan_payment', 'fee'].includes(t.type))
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Group by type for summary
        const typeSummary = {};
        transactions.forEach(transaction => {
            if (!typeSummary[transaction.type]) {
                typeSummary[transaction.type] = {
                    count: 0,
                    total: 0
                };
            }
            typeSummary[transaction.type].count += 1;
            typeSummary[transaction.type].total += parseFloat(transaction.amount);
        });

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / limit)
                },
                summary: {
                    total_transactions: totalTransactions,
                    total_credits: totalCredits,
                    total_debits: totalDebits,
                    net_flow: totalCredits - totalDebits,
                    type_breakdown: typeSummary
                }
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/transactions/:id
// @desc    Get specific transaction details
// @access  Private
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (error) {
            console.error('Transaction fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch transaction'
            });
        }

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Get related data based on reference_id and type
        let relatedData = null;
        if (transaction.reference_id) {
            if (transaction.type === 'loan_payment') {
                const { data: loan } = await supabase
                    .from('loans')
                    .select('loan_type, amount')
                    .eq('id', transaction.reference_id)
                    .single();
                relatedData = loan ? { type: 'loan', details: loan } : null;
            } else if (transaction.type === 'investment_return') {
                const { data: investment } = await supabase
                    .from('investments')
                    .select('investment_type, amount')
                    .eq('id', transaction.reference_id)
                    .single();
                relatedData = investment ? { type: 'investment', details: investment } : null;
            }
        }

        res.json({
            success: true,
            data: {
                ...transaction,
                related_data: relatedData
            }
        });
    } catch (error) {
        console.error('Get transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/transactions/summary
// @desc    Get transaction summary for dashboard
// @access  Private
router.get('/summary', authenticateUser, async (req, res) => {
    try {
        // Get last 30 days transactions
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentTransactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Recent transactions fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch transaction summary'
            });
        }

        // Calculate monthly summary
        const monthlyCredits = recentTransactions
            .filter(t => ['deposit', 'investment_return'].includes(t.type))
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        const monthlyDebits = recentTransactions
            .filter(t => ['withdrawal', 'loan_payment', 'fee'].includes(t.type))
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Get transaction counts by type
        const transactionCounts = {};
        recentTransactions.forEach(transaction => {
            transactionCounts[transaction.type] = (transactionCounts[transaction.type] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                recent_transactions: recentTransactions,
                monthly_summary: {
                    credits: monthlyCredits,
                    debits: monthlyDebits,
                    net: monthlyCredits - monthlyDebits
                },
                transaction_counts: transactionCounts,
                total_recent: recentTransactions.length
            }
        });
    } catch (error) {
        console.error('Get transaction summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/transactions/types
// @desc    Get available transaction types
// @access  Private
router.get('/types', authenticateUser, async (req, res) => {
    try {
        const transactionTypes = [
            {
                type: 'deposit',
                name: 'Deposit',
                category: 'credit',
                description: 'Money added to account'
            },
            {
                type: 'withdrawal',
                name: 'Withdrawal',
                category: 'debit',
                description: 'Money withdrawn from account'
            },
            {
                type: 'loan_payment',
                name: 'Loan Payment',
                category: 'debit',
                description: 'Payment towards loan'
            },
            {
                type: 'investment_return',
                name: 'Investment Return',
                category: 'credit',
                description: 'Returns from investments'
            },
            {
                type: 'fee',
                name: 'Fee',
                category: 'debit',
                description: 'Service or transaction fees'
            }
        ];

        res.json({
            success: true,
            data: transactionTypes
        });
    } catch (error) {
        console.error('Get transaction types error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

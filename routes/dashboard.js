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

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private
router.get('/overview', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get loan statistics
        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('status, amount, monthly_payment')
            .eq('user_id', userId);

        if (loansError) {
            console.error('Loans query error:', loansError);
        }

        // Get investment statistics
        const { data: investments, error: investmentsError } = await supabase
            .from('investments')
            .select('amount, expected_return, status')
            .eq('user_id', userId);

        if (investmentsError) {
            console.error('Investments query error:', investmentsError);
        }

        // Get wallet balance (sum of transactions)
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (transactionsError) {
            console.error('Transactions query error:', transactionsError);
        }

        // Calculate wallet balance
        let walletBalance = 0;
        if (transactions) {
            transactions.forEach(transaction => {
                if (transaction.type === 'deposit' || transaction.type === 'investment_return') {
                    walletBalance += parseFloat(transaction.amount);
                } else if (transaction.type === 'withdrawal' || transaction.type === 'loan_payment' || transaction.type === 'fee') {
                    walletBalance -= parseFloat(transaction.amount);
                }
            });
        }

        // Calculate loan statistics
        const loanStats = {
            totalLoans: loans ? loans.length : 0,
            activeLoans: loans ? loans.filter(loan => loan.status === 'active').length : 0,
            pendingLoans: loans ? loans.filter(loan => loan.status === 'pending').length : 0,
            totalLoanAmount: loans ? loans.reduce((sum, loan) => sum + parseFloat(loan.amount), 0) : 0,
            monthlyPayments: loans ? loans.filter(loan => loan.status === 'active').reduce((sum, loan) => sum + parseFloat(loan.monthly_payment || 0), 0) : 0
        };

        // Calculate investment statistics
        const investmentStats = {
            totalInvestments: investments ? investments.length : 0,
            activeInvestments: investments ? investments.filter(inv => inv.status === 'active').length : 0,
            totalInvested: investments ? investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0) : 0,
            expectedReturns: investments ? investments.filter(inv => inv.status === 'active').reduce((sum, inv) => sum + (parseFloat(inv.amount) * parseFloat(inv.expected_return || 0) / 100), 0) : 0
        };

        // Get recent activity (last 5 transactions)
        const recentActivity = transactions ? transactions.slice(0, 5).map(transaction => ({
            type: transaction.type,
            amount: transaction.amount,
            description: getTransactionDescription(transaction.type),
            date: new Date().toISOString() // In real app, use transaction.created_at
        })) : [];

        // Get quick actions data
        const quickActions = {
            canApplyForLoan: loanStats.pendingLoans === 0, // Can apply if no pending loans
            canMakeInvestment: walletBalance > 100, // Minimum investment amount
            hasActiveLoans: loanStats.activeLoans > 0,
            hasInvestments: investmentStats.totalInvestments > 0
        };

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    name: `${req.user.user_metadata?.first_name || 'User'} ${req.user.user_metadata?.last_name || ''}`.trim()
                },
                wallet: {
                    balance: walletBalance,
                    currency: 'USD'
                },
                loans: loanStats,
                investments: investmentStats,
                recentActivity: recentActivity,
                quickActions: quickActions
            }
        });

    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard data'
        });
    }
});

// Helper function to get transaction descriptions
function getTransactionDescription(type) {
    const descriptions = {
        'deposit': 'Funds deposited',
        'withdrawal': 'Funds withdrawn',
        'loan_payment': 'Loan payment',
        'investment_return': 'Investment return',
        'fee': 'Service fee'
    };
    return descriptions[type] || 'Transaction';
}

module.exports = router;

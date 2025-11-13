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

// @route   GET /api/investments
// @desc    Get user's investments
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, risk_level } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('investments')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status) {
            query = query.eq('status', status);
        }

        if (risk_level) {
            query = query.eq('risk_level', risk_level);
        }

        const { data: investments, error, count } = await query;

        if (error) {
            console.error('Investments fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch investments'
            });
        }

        // Calculate portfolio summary
        const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const activeInvestments = investments.filter(inv => inv.status === 'active').length;

        // Calculate returns (mock calculation)
        const totalReturns = investments.reduce((sum, inv) => {
            const amount = parseFloat(inv.amount);
            const expectedReturn = parseFloat(inv.expected_return || 0);
            return sum + (amount * expectedReturn / 100);
        }, 0);

        res.json({
            success: true,
            data: {
                investments,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / limit)
                },
                summary: {
                    total_invested: totalInvested,
                    active_investments: activeInvestments,
                    total_returns: totalReturns,
                    average_return: investments.length > 0 ? totalReturns / investments.length : 0
                }
            }
        });
    } catch (error) {
        console.error('Get investments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/investments/portfolio
// @desc    Get investment portfolio summary
// @access  Private
router.get('/portfolio', authenticateUser, async (req, res) => {
    try {
        const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('status', 'active');

        if (error) {
            console.error('Portfolio fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch portfolio'
            });
        }

        // Calculate portfolio metrics
        const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

        // Risk distribution
        const riskDistribution = {
            low: investments.filter(inv => inv.risk_level === 'low').length,
            medium: investments.filter(inv => inv.risk_level === 'medium').length,
            high: investments.filter(inv => inv.risk_level === 'high').length
        };

        // Investment types
        const typeDistribution = {};
        investments.forEach(inv => {
            typeDistribution[inv.investment_type] = (typeDistribution[inv.investment_type] || 0) + 1;
        });

        // Calculate performance
        const totalReturns = investments.reduce((sum, inv) => {
            const amount = parseFloat(inv.amount);
            const expectedReturn = parseFloat(inv.expected_return || 0);
            return sum + (amount * expectedReturn / 100);
        }, 0);

        const averageReturn = investments.length > 0 ? totalReturns / totalInvested * 100 : 0;

        // Monthly returns (mock data)
        const monthlyReturns = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            monthlyReturns.push({
                month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                amount: Math.round((totalReturns / 6) * (Math.random() * 0.5 + 0.75) * 100) / 100
            });
        }

        res.json({
            success: true,
            data: {
                total_invested: totalInvested,
                total_returns: totalReturns,
                average_annual_return: Math.round(averageReturn * 100) / 100,
                total_investments: investments.length,
                risk_distribution: riskDistribution,
                type_distribution: typeDistribution,
                monthly_returns: monthlyReturns,
                performance_score: Math.min(100, Math.max(0, Math.round(averageReturn * 10))) // 0-100 score
            }
        });
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/investments/performance
// @desc    Get investment performance analytics
// @access  Private
router.get('/performance', authenticateUser, async (req, res) => {
    try {
        const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Performance fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch performance data'
            });
        }

        // Calculate performance metrics
        const totalEarnings = investments.reduce((sum, inv) => {
            const amount = parseFloat(inv.amount);
            const expectedReturn = parseFloat(inv.expected_return || 0);
            return sum + (amount * expectedReturn / 100);
        }, 0);

        const thisMonthEarnings = totalEarnings * 0.15; // Mock calculation
        const averageReturn = investments.length > 0 ? totalEarnings / investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0) * 100 : 0;
        const onTimePayments = 100; // Mock data

        // Risk distribution for chart
        const riskData = {
            low: {
                count: investments.filter(inv => inv.risk_level === 'low').length,
                percentage: 0,
                color: '#10b981'
            },
            medium: {
                count: investments.filter(inv => inv.risk_level === 'medium').length,
                percentage: 0,
                color: '#f59e0b'
            },
            high: {
                count: investments.filter(inv => inv.risk_level === 'high').length,
                percentage: 0,
                color: '#ef4444'
            }
        };

        const totalInvestments = investments.length;
        Object.keys(riskData).forEach(risk => {
            riskData[risk].percentage = totalInvestments > 0 ? Math.round((riskData[risk].count / totalInvestments) * 100) : 0;
        });

        // Portfolio allocation (mock data for chart)
        const portfolioAllocation = [
            { category: 'Stocks', percentage: 45, amount: totalEarnings * 0.45, color: '#3b82f6' },
            { category: 'Bonds', percentage: 30, amount: totalEarnings * 0.30, color: '#10b981' },
            { category: 'Real Estate', percentage: 15, amount: totalEarnings * 0.15, color: '#f59e0b' },
            { category: 'Cash', percentage: 10, amount: totalEarnings * 0.10, color: '#6b7280' }
        ];

        res.json({
            success: true,
            data: {
                total_earnings: Math.round(totalEarnings * 100) / 100,
                this_month: Math.round(thisMonthEarnings * 100) / 100,
                average_return: Math.round(averageReturn * 100) / 100,
                on_time_payments: onTimePayments,
                risk_distribution: riskData,
                portfolio_allocation: portfolioAllocation
            }
        });
    } catch (error) {
        console.error('Get performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/investments
// @desc    Make a new investment
// @access  Private
router.post('/', authenticateUser, [
    body('investment_type')
        .isIn(['stocks', 'bonds', 'real_estate', 'crypto', 'funds'])
        .withMessage('Please provide a valid investment type'),
    body('amount')
        .isFloat({ min: 100, max: 100000 })
        .withMessage('Investment amount must be between $100 and $100,000'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Description must be between 5 and 200 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { investment_type, amount, description } = req.body;

        // Determine risk level and expected return based on investment type
        let riskLevel = 'medium';
        let expectedReturn = 8.0; // Default 8%

        switch (investment_type) {
            case 'stocks':
                riskLevel = 'high';
                expectedReturn = 12.0;
                break;
            case 'bonds':
                riskLevel = 'low';
                expectedReturn = 5.0;
                break;
            case 'real_estate':
                riskLevel = 'medium';
                expectedReturn = 8.0;
                break;
            case 'crypto':
                riskLevel = 'high';
                expectedReturn = 25.0;
                break;
            case 'funds':
                riskLevel = 'medium';
                expectedReturn = 7.0;
                break;
        }

        const { data: investment, error } = await supabase
            .from('investments')
            .insert({
                user_id: req.user.id,
                investment_type,
                amount: parseFloat(amount),
                expected_return: expectedReturn,
                risk_level: riskLevel,
                status: 'active',
                description: description || `${investment_type.charAt(0).toUpperCase() + investment_type.slice(1)} investment`
            })
            .select('*')
            .single();

        if (error) {
            console.error('Investment creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create investment'
            });
        }

        // Create transaction record
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: req.user.id,
                type: 'investment_return', // This should be 'investment' but using existing enum
                amount: parseFloat(amount),
                description: `Investment in ${investment_type}`,
                reference_id: investment.id
            })
            .select('*')
            .single();

        if (transactionError) {
            console.error('Transaction creation error:', transactionError);
            // Don't fail the investment if transaction fails
        }

        res.status(201).json({
            success: true,
            message: 'Investment created successfully',
            data: investment
        });
    } catch (error) {
        console.error('Create investment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/investments/types
// @desc    Get available investment types
// @access  Public
router.get('/types', async (req, res) => {
    try {
        const investmentTypes = [
            {
                type: 'stocks',
                name: 'Stocks',
                risk_level: 'high',
                expected_return: 12.0,
                min_amount: 500,
                description: 'Individual company stocks with high growth potential'
            },
            {
                type: 'bonds',
                name: 'Bonds',
                risk_level: 'low',
                expected_return: 5.0,
                min_amount: 1000,
                description: 'Government and corporate bonds for stable income'
            },
            {
                type: 'real_estate',
                name: 'Real Estate',
                risk_level: 'medium',
                expected_return: 8.0,
                min_amount: 5000,
                description: 'Property investments for steady appreciation'
            },
            {
                type: 'crypto',
                name: 'Cryptocurrency',
                risk_level: 'high',
                expected_return: 25.0,
                min_amount: 100,
                description: 'Digital currencies with high volatility and potential'
            },
            {
                type: 'funds',
                name: 'Mutual Funds',
                risk_level: 'medium',
                expected_return: 7.0,
                min_amount: 250,
                description: 'Diversified investment funds managed by professionals'
            }
        ];

        res.json({
            success: true,
            data: investmentTypes
        });
    } catch (error) {
        console.error('Get investment types error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

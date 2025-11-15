const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Investment Service Class
class InvestmentService {
    constructor() {
        this.INVESTMENT_TYPES = {
            'peer_lending': {
                name: 'Peer-to-Peer Lending',
                minAmount: 100,
                maxAmount: 50000,
                expectedReturn: { min: 8, max: 15 },
                riskLevel: 'medium',
                term: { min: 3, max: 36 }
            },
            'fixed_deposit': {
                name: 'Fixed Deposit',
                minAmount: 500,
                maxAmount: 100000,
                expectedReturn: { min: 5, max: 8 },
                riskLevel: 'low',
                term: { min: 6, max: 60 }
            },
            'equity_fund': {
                name: 'Equity Fund',
                minAmount: 200,
                maxAmount: 75000,
                expectedReturn: { min: 10, max: 20 },
                riskLevel: 'high',
                term: { min: 12, max: 120 }
            }
        };
    }

    calculateExpectedReturns(amount, type, term) {
        const investmentType = this.INVESTMENT_TYPES[type];
        if (!investmentType) throw new Error('Invalid investment type');

        const annualRate = (investmentType.expectedReturn.min + investmentType.expectedReturn.max) / 2;
        const monthlyRate = annualRate / 100 / 12;
        
        const totalReturn = amount * Math.pow(1 + monthlyRate, term);
        const profit = totalReturn - amount;
        
        return {
            principal: amount,
            expectedReturn: totalReturn,
            profit: profit,
            annualRate: annualRate,
            monthlyReturn: profit / term
        };
    }

    async processInvestment(userId, investmentData) {
        const { amount, type, term } = investmentData;
        
        // Calculate returns
        const returns = this.calculateExpectedReturns(amount, type, term);
        
        // Create investment record
        const { data: investment, error } = await supabase
            .from('investments')
            .insert({
                user_id: userId,
                investment_type: type,
                amount: amount,
                term_months: term,
                expected_return: returns.expectedReturn,
                expected_profit: returns.profit,
                annual_rate: returns.annualRate,
                status: 'active',
                start_date: new Date().toISOString(),
                maturity_date: new Date(Date.now() + term * 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Deduct from wallet
        await supabase.rpc('update_wallet_balance', {
            p_user_id: userId,
            p_amount: -amount,
            p_transaction_type: 'debit'
        });

        // Create transaction record
        await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'investment',
                amount: -amount,
                description: `Investment in ${this.INVESTMENT_TYPES[type].name}`,
                status: 'completed',
                reference: `INV-${investment.id}`,
                created_at: new Date().toISOString()
            });

        return investment;
    }
}

const investmentService = new InvestmentService();

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

// @route   GET /api/investments/types
// @desc    Get available investment types
// @access  Public
router.get('/types', (req, res) => {
    res.json({
        success: true,
        data: investmentService.INVESTMENT_TYPES
    });
});

// @route   POST /api/investments/calculate
// @desc    Calculate investment returns
// @access  Public
router.post('/calculate', [
    body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least $100'),
    body('type').isIn(['peer_lending', 'fixed_deposit', 'equity_fund']).withMessage('Invalid investment type'),
    body('term').isInt({ min: 1, max: 120 }).withMessage('Term must be between 1 and 120 months'),
    handleValidationErrors
], (req, res) => {
    try {
        const { amount, type, term } = req.body;
        
        const returns = investmentService.calculateExpectedReturns(amount, type, term);
        
        res.json({
            success: true,
            data: returns
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/investments/invest
// @desc    Create new investment
// @access  Private
router.post('/invest', authenticateUser, [
    body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least $100'),
    body('type').isIn(['peer_lending', 'fixed_deposit', 'equity_fund']).withMessage('Invalid investment type'),
    body('term').isInt({ min: 1, max: 120 }).withMessage('Term must be between 1 and 120 months'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, type, term } = req.body;
        const userId = req.user.id;
        
        // Check wallet balance
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', userId)
            .single();
            
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }
        
        // Validate investment type limits
        const investmentType = investmentService.INVESTMENT_TYPES[type];
        if (amount < investmentType.minAmount || amount > investmentType.maxAmount) {
            return res.status(400).json({
                success: false,
                message: `Amount must be between $${investmentType.minAmount} and $${investmentType.maxAmount} for ${investmentType.name}`
            });
        }
        
        if (term < investmentType.term.min || term > investmentType.term.max) {
            return res.status(400).json({
                success: false,
                message: `Term must be between ${investmentType.term.min} and ${investmentType.term.max} months for ${investmentType.name}`
            });
        }
        
        const investment = await investmentService.processInvestment(userId, { amount, type, term });
        
        res.json({
            success: true,
            message: 'Investment created successfully',
            data: investment
        });
    } catch (error) {
        console.error('Investment creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create investment'
        });
    }
});

// @route   GET /api/investments/my-investments
// @desc    Get user's investments
// @access  Private
router.get('/my-investments', authenticateUser, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('investments')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data: investments, error } = await query;
        
        if (error) throw error;
        
        // Calculate current values and progress
        const enrichedInvestments = investments.map(investment => {
            const startDate = new Date(investment.start_date);
            const maturityDate = new Date(investment.maturity_date);
            const now = new Date();
            
            const totalDays = (maturityDate - startDate) / (1000 * 60 * 60 * 24);
            const elapsedDays = Math.max(0, (now - startDate) / (1000 * 60 * 60 * 24));
            const progress = Math.min(100, (elapsedDays / totalDays) * 100);
            
            const currentValue = investment.amount + (investment.expected_profit * (progress / 100));
            
            return {
                ...investment,
                progress: Math.round(progress),
                current_value: Math.round(currentValue * 100) / 100,
                days_remaining: Math.max(0, Math.ceil(totalDays - elapsedDays))
            };
        });
        
        res.json({
            success: true,
            data: enrichedInvestments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: investments.length
            }
        });
    } catch (error) {
        console.error('Get investments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch investments'
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
            .eq('user_id', req.user.id);
            
        if (error) throw error;
        
        const portfolio = {
            totalInvested: 0,
            currentValue: 0,
            totalReturns: 0,
            activeInvestments: 0,
            maturedInvestments: 0,
            byType: {},
            monthlyProjectedReturn: 0
        };
        
        investments.forEach(investment => {
            const startDate = new Date(investment.start_date);
            const maturityDate = new Date(investment.maturity_date);
            const now = new Date();
            
            const totalDays = (maturityDate - startDate) / (1000 * 60 * 60 * 24);
            const elapsedDays = Math.max(0, (now - startDate) / (1000 * 60 * 60 * 24));
            const progress = Math.min(100, (elapsedDays / totalDays) * 100);
            
            const currentValue = investment.amount + (investment.expected_profit * (progress / 100));
            
            portfolio.totalInvested += investment.amount;
            portfolio.currentValue += currentValue;
            
            if (investment.status === 'active') {
                portfolio.activeInvestments++;
                portfolio.monthlyProjectedReturn += investment.expected_profit / investment.term_months;
            } else if (investment.status === 'matured') {
                portfolio.maturedInvestments++;
                portfolio.totalReturns += investment.actual_return || investment.expected_return;
            }
            
            // Group by type
            if (!portfolio.byType[investment.investment_type]) {
                portfolio.byType[investment.investment_type] = {
                    count: 0,
                    totalAmount: 0,
                    currentValue: 0
                };
            }
            
            portfolio.byType[investment.investment_type].count++;
            portfolio.byType[investment.investment_type].totalAmount += investment.amount;
            portfolio.byType[investment.investment_type].currentValue += currentValue;
        });
        
        portfolio.totalReturns = portfolio.currentValue - portfolio.totalInvested;
        portfolio.returnPercentage = portfolio.totalInvested > 0 
            ? ((portfolio.totalReturns / portfolio.totalInvested) * 100).toFixed(2)
            : 0;
        
        res.json({
            success: true,
            data: portfolio
        });
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch portfolio'
        });
    }
});

// @route   PUT /api/investments/:id/withdraw
// @desc    Withdraw investment (early withdrawal with penalty)
// @access  Private
router.put('/:id/withdraw', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: investment, error } = await supabase
            .from('investments')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .eq('status', 'active')
            .single();
            
        if (error || !investment) {
            return res.status(404).json({
                success: false,
                message: 'Investment not found or already withdrawn'
            });
        }
        
        // Calculate early withdrawal penalty (10% of principal)
        const penalty = investment.amount * 0.1;
        const withdrawalAmount = investment.amount - penalty;
        
        // Update investment status
        await supabase
            .from('investments')
            .update({
                status: 'withdrawn',
                withdrawn_at: new Date().toISOString(),
                withdrawal_penalty: penalty,
                actual_return: withdrawalAmount
            })
            .eq('id', id);
        
        // Credit wallet
        await supabase.rpc('update_wallet_balance', {
            p_user_id: req.user.id,
            p_amount: withdrawalAmount,
            p_transaction_type: 'credit'
        });
        
        // Create transaction
        await supabase
            .from('transactions')
            .insert({
                user_id: req.user.id,
                type: 'investment_withdrawal',
                amount: withdrawalAmount,
                description: `Early withdrawal from ${investment.investment_type} (penalty: $${penalty.toFixed(2)})`,
                status: 'completed',
                reference: `WITHDRAW-${id}`,
                created_at: new Date().toISOString()
            });
        
        res.json({
            success: true,
            message: 'Investment withdrawn successfully',
            data: {
                withdrawalAmount: withdrawalAmount,
                penalty: penalty,
                originalAmount: investment.amount
            }
        });
    } catch (error) {
        console.error('Investment withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to withdraw investment'
        });
    }
});

module.exports = router;

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

/**
 * @route   POST /api/investments/create
 * @desc    Create P2P loan investment with lender fees
 * @access  Private
 */
router.post('/create', [
    authenticateUser,
    body('loan_id').notEmpty().withMessage('Loan ID is required'),
    body('amount').isFloat({ min: 10 }).withMessage('Investment amount must be at least $10'),
    body('agreed_to_fees').isBoolean().withMessage('Fee agreement is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { loan_id, amount, agreed_to_fees } = req.body;

        // Validate fee agreement
        if (!agreed_to_fees) {
            return res.status(400).json({
                success: false,
                message: 'You must agree to lender fees to proceed'
            });
        }

        // Get loan details
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loan_id)
            .eq('status', 'pending')
            .single();

        if (loanError || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found or not available for investment'
            });
        }

        // Check if user has sufficient balance
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', req.user.id)
            .single();

        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        // Calculate lender fees
        const SERVICE_FEE_PERCENT = 10;
        const INSURANCE_FEE_PERCENT = 3;
        const COLLECTION_FEE_PERCENT = 5;

        // Upfront fees
        const serviceFee = amount * (SERVICE_FEE_PERCENT / 100);
        const insuranceFee = amount * (INSURANCE_FEE_PERCENT / 100);
        const totalUpfrontFees = serviceFee + insuranceFee;
        const netInvestment = amount - totalUpfrontFees;

        // Monthly return calculations
        const investmentProportion = netInvestment / loan.amount;
        const grossMonthlyReturn = loan.total_monthly_payment * investmentProportion;
        const collectionFeeMonthly = grossMonthlyReturn * (COLLECTION_FEE_PERCENT / 100);
        const netMonthlyReturn = grossMonthlyReturn - collectionFeeMonthly;

        // Total calculations
        const totalGrossReturns = grossMonthlyReturn * loan.term;
        const totalCollectionFees = collectionFeeMonthly * loan.term;
        const totalNetReturns = netMonthlyReturn * loan.term;
        const totalFees = totalUpfrontFees + totalCollectionFees;

        // Create investment record
        const { data: investment, error: investmentError } = await supabase
            .from('loan_investments')
            .insert({
                loan_id: loan_id,
                investor_id: req.user.id,
                investment_amount: amount,
                service_fee: serviceFee,
                insurance_fee: insuranceFee,
                total_upfront_fees: totalUpfrontFees,
                net_investment: netInvestment,
                collection_fee_percent: COLLECTION_FEE_PERCENT,
                collection_fee_monthly: collectionFeeMonthly,
                gross_monthly_return: grossMonthlyReturn,
                net_monthly_return: netMonthlyReturn,
                total_gross_returns: totalGrossReturns,
                total_collection_fees: totalCollectionFees,
                total_net_returns: totalNetReturns,
                total_fees: totalFees,
                investment_proportion: investmentProportion,
                status: 'active',
                agreed_to_fees: agreed_to_fees,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (investmentError) {
            console.error('Investment creation error:', investmentError);
            throw investmentError;
        }

        // Deduct from investor's wallet
        const { error: walletError } = await supabase
            .from('wallets')
            .update({ 
                balance: wallet.balance - amount,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', req.user.id);

        if (walletError) throw walletError;

        // Create transaction and agreement records
        await supabase.from('transactions').insert({
            user_id: req.user.id,
            type: 'investment',
            amount: -amount,
            description: `P2P Loan Investment - Loan #${loan_id}`,
            status: 'completed',
            reference: `INV-${investment.id}`,
            created_at: new Date().toISOString()
        });

        res.status(201).json({
            success: true,
            message: 'Investment created successfully. You will receive 5% of any late fees collected.',
            data: {
                investment: investment,
                fee_breakdown: {
                    investment_amount: amount,
                    upfront_fees: { service_fee: serviceFee, insurance_fee: insuranceFee, total: totalUpfrontFees },
                    net_investment: netInvestment,
                    monthly_returns: { gross_return: grossMonthlyReturn, collection_fee: collectionFeeMonthly, net_return: netMonthlyReturn },
                    total_fees: totalFees
                }
            }
        });
    } catch (error) {
        console.error('Investment creation error:', error);
        res.status(500).json({ success: false, message: 'Failed to create investment', error: error.message });
    }
});

module.exports = router;

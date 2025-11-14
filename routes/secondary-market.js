/**
 * Secondary Market Routes
 * Handles investment products, portfolio management, and investment marketplace
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// Investment Service Class (embedded for secondary market)
class SecondaryMarketService {
    constructor() {
        this.INVESTMENT_PRODUCTS = {
            'peer_lending': {
                name: 'Peer-to-Peer Lending',
                category: 'Alternative Finance',
                description: 'Invest in loans and earn from borrower repayments',
                minAmount: 100,
                maxAmount: 50000,
                expectedReturn: { min: 8, max: 15 },
                riskLevel: 'medium',
                term: { min: 3, max: 36 },
                liquidity: 'Medium',
                icon: '🤝'
            },
            'fixed_deposit': {
                name: 'Fixed Deposit',
                category: 'Traditional Investment',
                description: 'Guaranteed returns with capital protection',
                minAmount: 500,
                maxAmount: 100000,
                expectedReturn: { min: 5, max: 8 },
                riskLevel: 'low',
                term: { min: 6, max: 60 },
                liquidity: 'Low',
                icon: '🏦'
            },
            'equity_fund': {
                name: 'Equity Fund',
                category: 'Growth Investment',
                description: 'Diversified equity portfolio for long-term growth',
                minAmount: 200,
                maxAmount: 75000,
                expectedReturn: { min: 10, max: 20 },
                riskLevel: 'high',
                term: { min: 12, max: 120 },
                liquidity: 'High',
                icon: '📈'
            },
            'money_market': {
                name: 'Money Market Fund',
                category: 'Short-term Investment',
                description: 'Short-term, liquid investments with stable returns',
                minAmount: 50,
                maxAmount: 25000,
                expectedReturn: { min: 3, max: 6 },
                riskLevel: 'very_low',
                term: { min: 1, max: 12 },
                liquidity: 'Very High',
                icon: '💰'
            },
            'bond_fund': {
                name: 'Bond Fund',
                category: 'Fixed Income',
                description: 'Government and corporate bonds for steady income',
                minAmount: 1000,
                maxAmount: 200000,
                expectedReturn: { min: 6, max: 12 },
                riskLevel: 'low',
                term: { min: 12, max: 240 },
                liquidity: 'Medium',
                icon: '📋'
            }
        };
    }

    calculateExpectedReturns(amount, type, term) {
        const product = this.INVESTMENT_PRODUCTS[type];
        if (!product) throw new Error('Invalid investment type');

        const annualRate = (product.expectedReturn.min + product.expectedReturn.max) / 2;
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
}

const secondaryMarketService = new SecondaryMarketService();

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

// @route   GET /api/secondary-market
// @desc    Get secondary market overview (investment marketplace)
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Get investment statistics
        const { data: investmentStats } = await supabase
            .from('investments')
            .select('amount, status, annual_rate, created_at, investment_type');

        const stats = {
            totalInvestments: investmentStats?.length || 0,
            totalAmountInvested: investmentStats?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0,
            averageReturn: 0,
            activeInvestments: investmentStats?.filter(inv => inv.status === 'active').length || 0,
            maturedInvestments: investmentStats?.filter(inv => inv.status === 'matured').length || 0
        };

        if (investmentStats && investmentStats.length > 0) {
            stats.averageReturn = investmentStats.reduce((sum, inv) => sum + (inv.annual_rate || 0), 0) / investmentStats.length;
        }

        // Get top performing products
        const topProducts = Object.entries(secondaryMarketService.INVESTMENT_PRODUCTS)
            .map(([key, product]) => ({
                id: key,
                name: product.name,
                category: product.category,
                expectedReturn: `${product.expectedReturn.min}% - ${product.expectedReturn.max}%`,
                riskLevel: product.riskLevel,
                minAmount: product.minAmount,
                icon: product.icon
            }))
            .sort((a, b) => b.expectedReturn.max - a.expectedReturn.max)
            .slice(0, 3);

        res.json({
            success: true,
            data: {
                marketType: 'Secondary Market',
                description: 'Diversified investment platform for wealth building and passive income',
                stats: stats,
                topProducts: topProducts,
                benefits: [
                    'Diversified investment portfolio',
                    'Professional fund management',
                    'Flexible investment amounts',
                    'Regular income distributions',
                    'Capital appreciation potential'
                ],
                riskLevels: {
                    'very_low': { name: 'Very Low Risk', color: '#10b981', description: 'Capital protected with guaranteed returns' },
                    'low': { name: 'Low Risk', color: '#3b82f6', description: 'Stable returns with minimal volatility' },
                    'medium': { name: 'Medium Risk', color: '#f59e0b', description: 'Balanced risk-return profile' },
                    'high': { name: 'High Risk', color: '#ef4444', description: 'Higher returns with increased volatility' }
                }
            }
        });
    } catch (error) {
        console.error('Secondary market overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch secondary market data'
        });
    }
});

// @route   GET /api/secondary-market/products
// @desc    Get detailed investment products
// @access  Public
router.get('/products', (req, res) => {
    const products = Object.entries(secondaryMarketService.INVESTMENT_PRODUCTS).map(([key, product]) => ({
        type: key,
        ...product,
        features: [
            `${product.expectedReturn.min}% - ${product.expectedReturn.max}% annual returns`,
            `${product.liquidity} liquidity`,
            `Minimum investment: $${product.minAmount}`,
            `Investment term: ${product.term.min} - ${product.term.max} months`,
            `Risk level: ${product.riskLevel.replace('_', ' ')}`
        ],
        suitableFor: key === 'money_market' ? ['Emergency funds', 'Short-term goals', 'Conservative investors'] :
                    key === 'fixed_deposit' ? ['Capital preservation', 'Guaranteed returns', 'Risk-averse investors'] :
                    key === 'peer_lending' ? ['Diversification', 'Alternative investments', 'Medium-term goals'] :
                    key === 'equity_fund' ? ['Long-term growth', 'Wealth building', 'Aggressive investors'] :
                    key === 'bond_fund' ? ['Steady income', 'Portfolio balance', 'Conservative growth'] : []
    }));

    res.json({
        success: true,
        data: products
    });
});

// @route   POST /api/secondary-market/calculate
// @desc    Calculate investment returns and projections
// @access  Public
router.post('/calculate', [
    body('amount').isFloat({ min: 50 }).withMessage('Amount must be at least $50'),
    body('type').isIn(['peer_lending', 'fixed_deposit', 'equity_fund', 'money_market', 'bond_fund']).withMessage('Invalid investment type'),
    body('term').isInt({ min: 1, max: 240 }).withMessage('Term must be between 1 and 240 months'),
    handleValidationErrors
], (req, res) => {
    try {
        const { amount, type, term } = req.body;
        
        const returns = secondaryMarketService.calculateExpectedReturns(amount, type, term);
        const product = secondaryMarketService.INVESTMENT_PRODUCTS[type];
        
        // Calculate additional metrics
        const monthlyContribution = 0; // For lump sum investment
        const inflationRate = 3.5; // Assumed inflation rate
        const realReturn = returns.annualRate - inflationRate;
        
        // Calculate year-by-year projections
        const yearlyProjections = [];
        for (let year = 1; year <= Math.ceil(term / 12); year++) {
            const monthsInYear = Math.min(12, term - (year - 1) * 12);
            const yearEndValue = amount * Math.pow(1 + returns.annualRate / 100 / 12, year * 12);
            
            yearlyProjections.push({
                year: year,
                endValue: Math.round(yearEndValue * 100) / 100,
                totalReturn: Math.round((yearEndValue - amount) * 100) / 100,
                returnPercentage: Math.round(((yearEndValue - amount) / amount * 100) * 100) / 100
            });
        }
        
        res.json({
            success: true,
            data: {
                investmentDetails: {
                    amount: amount,
                    term: term,
                    investmentType: type,
                    productName: product.name,
                    riskLevel: product.riskLevel
                },
                returns: {
                    expectedReturn: Math.round(returns.expectedReturn * 100) / 100,
                    totalProfit: Math.round(returns.profit * 100) / 100,
                    annualRate: returns.annualRate,
                    monthlyReturn: Math.round(returns.monthlyReturn * 100) / 100,
                    realReturn: realReturn
                },
                projections: {
                    yearly: yearlyProjections,
                    breakeven: {
                        months: Math.ceil(amount / returns.monthlyReturn),
                        description: 'Time to recover initial investment through returns'
                    }
                },
                riskAnalysis: {
                    volatility: product.riskLevel === 'high' ? 'High' : 
                              product.riskLevel === 'medium' ? 'Medium' : 'Low',
                    capitalProtection: product.riskLevel === 'very_low' || product.riskLevel === 'low',
                    liquidity: product.liquidity,
                    diversification: type === 'equity_fund' || type === 'bond_fund' ? 'High' : 'Medium'
                }
            }
        });
    } catch (error) {
        console.error('Investment calculation error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/secondary-market/marketplace
// @desc    Get investment marketplace opportunities
// @access  Public
router.get('/marketplace', async (req, res) => {
    try {
        const { category, riskLevel, minReturn, maxReturn } = req.query;
        
        let products = Object.entries(secondaryMarketService.INVESTMENT_PRODUCTS);
        
        // Apply filters
        if (category) {
            products = products.filter(([key, product]) => 
                product.category.toLowerCase().includes(category.toLowerCase())
            );
        }
        
        if (riskLevel) {
            products = products.filter(([key, product]) => product.riskLevel === riskLevel);
        }
        
        if (minReturn) {
            products = products.filter(([key, product]) => product.expectedReturn.min >= parseFloat(minReturn));
        }
        
        if (maxReturn) {
            products = products.filter(([key, product]) => product.expectedReturn.max <= parseFloat(maxReturn));
        }
        
        // Enrich with market data
        const marketplaceProducts = products.map(([key, product]) => {
            const currentPerformance = product.expectedReturn.min + Math.random() * (product.expectedReturn.max - product.expectedReturn.min);
            const availableCapacity = Math.floor(Math.random() * 1000000) + 100000; // Mock available capacity
            
            return {
                id: key,
                ...product,
                currentPerformance: Math.round(currentPerformance * 100) / 100,
                availableCapacity: availableCapacity,
                totalInvestors: Math.floor(Math.random() * 5000) + 100,
                fundSize: availableCapacity * (1 + Math.random() * 2),
                inceptionDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3).toISOString().split('T')[0],
                fundManager: {
                    name: 'ZimCrowd Asset Management',
                    experience: '10+ years',
                    rating: 4.5 + Math.random() * 0.5
                }
            };
        });
        
        res.json({
            success: true,
            data: {
                products: marketplaceProducts,
                marketSummary: {
                    totalProducts: marketplaceProducts.length,
                    averageReturn: marketplaceProducts.reduce((sum, p) => sum + p.currentPerformance, 0) / marketplaceProducts.length,
                    totalCapacity: marketplaceProducts.reduce((sum, p) => sum + p.availableCapacity, 0),
                    riskDistribution: {
                        'very_low': marketplaceProducts.filter(p => p.riskLevel === 'very_low').length,
                        'low': marketplaceProducts.filter(p => p.riskLevel === 'low').length,
                        'medium': marketplaceProducts.filter(p => p.riskLevel === 'medium').length,
                        'high': marketplaceProducts.filter(p => p.riskLevel === 'high').length
                    }
                },
                filters: {
                    categories: [...new Set(Object.values(secondaryMarketService.INVESTMENT_PRODUCTS).map(p => p.category))],
                    riskLevels: ['very_low', 'low', 'medium', 'high'],
                    returnRanges: [
                        { label: '3% - 6%', min: 3, max: 6 },
                        { label: '6% - 10%', min: 6, max: 10 },
                        { label: '10% - 15%', min: 10, max: 15 },
                        { label: '15%+', min: 15, max: 25 }
                    ]
                }
            }
        });
    } catch (error) {
        console.error('Investment marketplace error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch investment marketplace data'
        });
    }
});

// @route   POST /api/secondary-market/invest
// @desc    Create new investment in secondary market
// @access  Private
router.post('/invest', authenticateUser, [
    body('amount').isFloat({ min: 50 }).withMessage('Amount must be at least $50'),
    body('type').isIn(['peer_lending', 'fixed_deposit', 'equity_fund', 'money_market', 'bond_fund']).withMessage('Invalid investment type'),
    body('term').isInt({ min: 1, max: 240 }).withMessage('Term must be between 1 and 240 months'),
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
                message: 'Insufficient wallet balance for this investment'
            });
        }
        
        // Validate investment limits
        const product = secondaryMarketService.INVESTMENT_PRODUCTS[type];
        if (amount < product.minAmount || amount > product.maxAmount) {
            return res.status(400).json({
                success: false,
                message: `Investment amount must be between $${product.minAmount} and $${product.maxAmount} for ${product.name}`
            });
        }
        
        if (term < product.term.min || term > product.term.max) {
            return res.status(400).json({
                success: false,
                message: `Investment term must be between ${product.term.min} and ${product.term.max} months for ${product.name}`
            });
        }
        
        // Calculate returns
        const returns = secondaryMarketService.calculateExpectedReturns(amount, type, term);
        
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
                maturity_date: new Date(Date.now() + term * 30 * 24 * 60 * 60 * 1000).toISOString(),
                market_type: 'secondary'
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
                description: `Investment in ${product.name}`,
                status: 'completed',
                reference: `INV-${investment.id}`,
                created_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: 'Investment created successfully in secondary market',
            data: {
                investmentId: investment.id,
                investmentDetails: {
                    amount: investment.amount,
                    type: investment.investment_type,
                    productName: product.name,
                    expectedReturn: investment.expected_return,
                    annualRate: investment.annual_rate,
                    maturityDate: investment.maturity_date
                },
                nextSteps: [
                    'Your investment is now active',
                    'Track performance in your portfolio',
                    'Receive regular updates on returns',
                    'Funds will mature automatically on maturity date'
                ]
            }
        });
    } catch (error) {
        console.error('Secondary market investment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create investment'
        });
    }
});

// @route   GET /api/secondary-market/portfolio
// @desc    Get user's investment portfolio in secondary market
// @access  Private
router.get('/portfolio', authenticateUser, async (req, res) => {
    try {
        const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('market_type', 'secondary');
            
        if (error) throw error;
        
        const portfolio = {
            totalInvested: 0,
            currentValue: 0,
            totalReturns: 0,
            activeInvestments: 0,
            maturedInvestments: 0,
            byType: {},
            byRiskLevel: {},
            monthlyProjectedReturn: 0,
            performance: {
                totalReturn: 0,
                annualizedReturn: 0,
                bestPerformer: null,
                worstPerformer: null
            }
        };
        
        if (investments && investments.length > 0) {
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
                const product = secondaryMarketService.INVESTMENT_PRODUCTS[investment.investment_type];
                if (!portfolio.byType[investment.investment_type]) {
                    portfolio.byType[investment.investment_type] = {
                        name: product?.name || investment.investment_type,
                        count: 0,
                        totalAmount: 0,
                        currentValue: 0
                    };
                }
                
                portfolio.byType[investment.investment_type].count++;
                portfolio.byType[investment.investment_type].totalAmount += investment.amount;
                portfolio.byType[investment.investment_type].currentValue += currentValue;
                
                // Group by risk level
                const riskLevel = product?.riskLevel || 'medium';
                if (!portfolio.byRiskLevel[riskLevel]) {
                    portfolio.byRiskLevel[riskLevel] = {
                        count: 0,
                        totalAmount: 0,
                        currentValue: 0
                    };
                }
                
                portfolio.byRiskLevel[riskLevel].count++;
                portfolio.byRiskLevel[riskLevel].totalAmount += investment.amount;
                portfolio.byRiskLevel[riskLevel].currentValue += currentValue;
            });
            
            portfolio.totalReturns = portfolio.currentValue - portfolio.totalInvested;
            portfolio.performance.totalReturn = ((portfolio.totalReturns / portfolio.totalInvested) * 100).toFixed(2);
            
            // Calculate annualized return (simplified)
            const avgHoldingPeriod = investments.reduce((sum, inv) => {
                const startDate = new Date(inv.start_date);
                const now = new Date();
                const monthsHeld = (now - startDate) / (1000 * 60 * 60 * 24 * 30);
                return sum + monthsHeld;
            }, 0) / investments.length;
            
            portfolio.performance.annualizedReturn = ((portfolio.totalReturns / portfolio.totalInvested) * (12 / avgHoldingPeriod) * 100).toFixed(2);
        }
        
        res.json({
            success: true,
            data: {
                portfolio: portfolio,
                investments: investments || [],
                diversificationScore: Object.keys(portfolio.byType).length * 20, // Simple diversification metric
                riskScore: portfolio.byRiskLevel.high ? 'High' : 
                          portfolio.byRiskLevel.medium ? 'Medium' : 'Low'
            }
        });
    } catch (error) {
        console.error('Get secondary market portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch investment portfolio'
        });
    }
});

module.exports = router;

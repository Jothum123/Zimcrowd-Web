/**
 * Primary Market Routes
 * Handles loan products, applications, and loan marketplace
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');
const ZimScoreService = require('../services/ZimScoreService');
const FeeCalculatorService = require('../services/fee-calculator.service');
const PaymentScheduleService = require('../services/payment-schedule.service');

const router = express.Router();
const zimScoreService = new ZimScoreService();
const feeCalculator = new FeeCalculatorService();
const paymentSchedule = new PaymentScheduleService();

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

// @route   GET /api/primary-market
// @desc    Get primary market overview (loan marketplace)
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Get loan statistics
        const { data: loanStats } = await supabase
            .from('loans')
            .select('amount, status, interest_rate, created_at');

        const stats = {
            totalLoansIssued: loanStats?.length || 0,
            totalAmountLent: loanStats?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0,
            averageInterestRate: 0,
            activeLoans: loanStats?.filter(loan => loan.status === 'active').length || 0,
            completedLoans: loanStats?.filter(loan => loan.status === 'completed').length || 0
        };

        if (loanStats && loanStats.length > 0) {
            stats.averageInterestRate = loanStats.reduce((sum, loan) => sum + (loan.interest_rate || 0), 0) / loanStats.length;
        }

        // Get loan products
        const loanProducts = [
            {
                id: 'personal',
                name: 'Personal Loans',
                description: 'Quick personal financing for your immediate needs',
                minAmount: 500,
                maxAmount: 50000,
                interestRate: '8.5% - 24.9%',
                term: '3 - 60 months',
                features: ['Quick approval', 'Flexible terms', 'No collateral required'],
                icon: '👤'
            },
            {
                id: 'business',
                name: 'Business Loans',
                description: 'Fuel your business growth with competitive rates',
                minAmount: 1000,
                maxAmount: 100000,
                interestRate: '7.5% - 22.9%',
                term: '6 - 84 months',
                features: ['Business-friendly terms', 'Higher limits', 'Revenue-based assessment'],
                icon: '🏢'
            },
            {
                id: 'emergency',
                name: 'Emergency Loans',
                description: 'Fast cash for urgent situations',
                minAmount: 100,
                maxAmount: 10000,
                interestRate: '12.0% - 29.9%',
                term: '1 - 12 months',
                features: ['Same-day approval', 'Minimal documentation', 'Quick disbursement'],
                icon: '🚨'
            }
        ];

        res.json({
            success: true,
            data: {
                marketType: 'Primary Market',
                description: 'Direct lending platform connecting borrowers with lenders',
                stats: stats,
                products: loanProducts,
                benefits: [
                    'Direct access to competitive loan rates',
                    'ZimScore-based personalized offers',
                    'Transparent fee structure',
                    'Quick approval process',
                    'Flexible repayment terms'
                ]
            }
        });
    } catch (error) {
        console.error('Primary market overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch primary market data'
        });
    }
});

// @route   GET /api/primary-market/products
// @desc    Get detailed loan products
// @access  Public
router.get('/products', (req, res) => {
    const products = [
        {
            type: 'personal',
            name: 'Personal Loan',
            category: 'Consumer Finance',
            description: 'Perfect for personal expenses, debt consolidation, or major purchases',
            minAmount: 500,
            maxAmount: 50000,
            minTerm: 3,
            maxTerm: 60,
            interestRateRange: { min: 8.5, max: 24.9 },
            processingFee: '2.5%',
            features: [
                'No collateral required',
                'Quick 24-hour approval',
                'Flexible repayment terms',
                'Early repayment allowed',
                'ZimScore-based rates'
            ],
            eligibility: [
                'Age 18-65 years',
                'Regular income source',
                'Valid identification',
                'Bank account required'
            ],
            documents: [
                'National ID or Passport',
                'Proof of income (3 months)',
                'Bank statements (3 months)',
                'Utility bill (address proof)'
            ]
        },
        {
            type: 'business',
            name: 'Business Loan',
            category: 'SME Finance',
            description: 'Grow your business with working capital, equipment financing, or expansion loans',
            minAmount: 1000,
            maxAmount: 100000,
            minTerm: 6,
            maxTerm: 84,
            interestRateRange: { min: 7.5, max: 22.9 },
            processingFee: '2.0%',
            features: [
                'Revenue-based assessment',
                'Higher loan limits',
                'Business-friendly terms',
                'Equipment financing available',
                'Working capital solutions'
            ],
            eligibility: [
                'Business registration (6+ months)',
                'Regular business income',
                'Business bank account',
                'Valid business license'
            ],
            documents: [
                'Business registration certificate',
                'Business bank statements (6 months)',
                'Financial statements',
                'Business plan (for large amounts)',
                'Tax clearance certificate'
            ]
        },
        {
            type: 'emergency',
            name: 'Emergency Loan',
            category: 'Quick Cash',
            description: 'Immediate financial assistance for urgent situations and emergencies',
            minAmount: 100,
            maxAmount: 10000,
            minTerm: 1,
            maxTerm: 12,
            interestRateRange: { min: 12.0, max: 29.9 },
            processingFee: '3.0%',
            features: [
                'Same-day approval',
                'Instant disbursement',
                'Minimal documentation',
                'Emergency support 24/7',
                'Quick online application'
            ],
            eligibility: [
                'Age 18+ years',
                'Any income source',
                'Valid phone number',
                'Emergency verification'
            ],
            documents: [
                'National ID',
                'Proof of emergency (optional)',
                'Contact information',
                'Basic income proof'
            ]
        }
    ];

    res.json({
        success: true,
        data: products
    });
});

// @route   POST /api/primary-market/calculate
// @desc    Calculate loan terms and monthly payments
// @access  Public
router.post('/calculate', [
    body('amount').isFloat({ min: 100, max: 100000 }).withMessage('Amount must be between $100 and $100,000'),
    body('term').isInt({ min: 1, max: 84 }).withMessage('Term must be between 1 and 84 months'),
    body('loanType').isIn(['personal', 'business', 'emergency']).withMessage('Invalid loan type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, term, loanType } = req.body;
        
        // Base interest rates by loan type
        let baseRate;
        switch (loanType) {
            case 'personal': baseRate = 15.9; break;
            case 'business': baseRate = 12.9; break;
            case 'emergency': baseRate = 19.9; break;
            default: baseRate = 15.9;
        }
        
        // Calculate fees
        const fees = feeCalculator.calculateLoanFees(amount, term, loanType);
        
        // Calculate payment schedule
        const schedule = paymentSchedule.generateSchedule(amount, baseRate, term, fees);
        
        // Calculate additional metrics
        const totalCost = schedule.totalPayment;
        const totalInterest = schedule.totalInterest;
        const monthlyPayment = schedule.monthlyPayment;
        const effectiveAPR = ((totalCost / amount - 1) / (term / 12)) * 100;
        
        res.json({
            success: true,
            data: {
                loanDetails: {
                    amount: amount,
                    term: term,
                    loanType: loanType,
                    interestRate: baseRate
                },
                payments: {
                    monthlyPayment: monthlyPayment,
                    totalPayment: totalCost,
                    totalInterest: totalInterest,
                    effectiveAPR: Math.round(effectiveAPR * 100) / 100
                },
                fees: fees,
                breakdown: {
                    principal: amount,
                    interest: totalInterest,
                    fees: Object.values(fees).reduce((sum, fee) => sum + fee, 0),
                    total: totalCost
                },
                schedule: schedule.payments.slice(0, 3) // First 3 payments preview
            }
        });
    } catch (error) {
        console.error('Loan calculation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate loan terms'
        });
    }
});

// @route   GET /api/primary-market/marketplace
// @desc    Get loan marketplace listings (available loans to fund)
// @access  Public
router.get('/marketplace', async (req, res) => {
    try {
        const { page = 1, limit = 20, loanType, minAmount, maxAmount, riskLevel } = req.query;
        const offset = (page - 1) * limit;

        // Get approved loans looking for funding (mock data for now)
        let query = supabase
            .from('loans')
            .select(`
                id,
                amount,
                loan_type,
                interest_rate,
                term,
                zimscore,
                purpose,
                created_at,
                profiles!inner(first_name, city)
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (loanType) {
            query = query.eq('loan_type', loanType);
        }

        if (minAmount) {
            query = query.gte('amount', minAmount);
        }

        if (maxAmount) {
            query = query.lte('amount', maxAmount);
        }

        const { data: loans, error } = await query;

        if (error) throw error;

        // Enrich loan data with risk levels and funding progress
        const enrichedLoans = (loans || []).map(loan => {
            const riskLevel = loan.zimscore >= 70 ? 'Low' : 
                            loan.zimscore >= 60 ? 'Medium' : 
                            loan.zimscore >= 50 ? 'High' : 'Very High';
            
            const fundingProgress = Math.floor(Math.random() * 100); // Mock funding progress
            
            return {
                ...loan,
                borrower: {
                    name: `${loan.profiles.first_name} ${loan.profiles.first_name.charAt(0)}.`,
                    location: loan.profiles.city,
                    zimScore: loan.zimscore
                },
                riskLevel: riskLevel,
                fundingProgress: fundingProgress,
                remainingAmount: loan.amount * (1 - fundingProgress / 100),
                expectedReturn: loan.interest_rate,
                termMonths: loan.term
            };
        });

        res.json({
            success: true,
            data: {
                loans: enrichedLoans,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: enrichedLoans.length
                },
                filters: {
                    loanTypes: ['personal', 'business', 'emergency'],
                    riskLevels: ['Low', 'Medium', 'High', 'Very High'],
                    amountRanges: [
                        { label: '$100 - $1,000', min: 100, max: 1000 },
                        { label: '$1,000 - $5,000', min: 1000, max: 5000 },
                        { label: '$5,000 - $20,000', min: 5000, max: 20000 },
                        { label: '$20,000+', min: 20000, max: 100000 }
                    ]
                }
            }
        });
    } catch (error) {
        console.error('Marketplace error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch marketplace data'
        });
    }
});

// @route   POST /api/primary-market/apply
// @desc    Apply for a loan in primary market
// @access  Private
router.post('/apply', authenticateUser, [
    body('amount').isFloat({ min: 100, max: 100000 }).withMessage('Amount must be between $100 and $100,000'),
    body('term').isInt({ min: 1, max: 84 }).withMessage('Term must be between 1 and 84 months'),
    body('loanType').isIn(['personal', 'business', 'emergency']).withMessage('Invalid loan type'),
    body('purpose').isLength({ min: 10, max: 500 }).withMessage('Purpose must be between 10 and 500 characters'),
    body('monthlyIncome').isFloat({ min: 0 }).withMessage('Monthly income must be a positive number'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, term, loanType, purpose, monthlyIncome, employmentDetails } = req.body;
        const userId = req.user.id;
        
        // Check for existing pending applications
        const { data: pendingLoans } = await supabase
            .from('loans')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['pending', 'under_review']);
            
        if (pendingLoans && pendingLoans.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending loan application. Please wait for it to be processed.'
            });
        }
        
        // Calculate ZimScore for interest rate determination
        const zimScoreResult = await zimScoreService.calculateScore(userId, {
            monthlyIncome,
            requestedAmount: amount,
            employmentDetails
        });
        
        // Determine interest rate based on ZimScore
        let interestRate = 15.9; // Base rate
        if (zimScoreResult.score >= 750) interestRate = 8.5;
        else if (zimScoreResult.score >= 700) interestRate = 12.0;
        else if (zimScoreResult.score >= 650) interestRate = 15.9;
        else if (zimScoreResult.score >= 600) interestRate = 19.9;
        else interestRate = 24.9;
        
        // Calculate fees and payment schedule
        const fees = feeCalculator.calculateLoanFees(amount, term, loanType);
        const schedule = paymentSchedule.generateSchedule(amount, interestRate, term, fees);
        
        // Create loan application
        const { data: loan, error } = await supabase
            .from('loans')
            .insert({
                user_id: userId,
                loan_type: loanType,
                amount: amount,
                term: term,
                interest_rate: interestRate,
                monthly_payment: schedule.monthlyPayment,
                total_payment: schedule.totalPayment,
                purpose: purpose,
                monthly_income: monthlyIncome,
                employment_details: employmentDetails,
                zimscore: zimScoreResult.score,
                zimscore_factors: zimScoreResult.factors,
                fees: fees,
                status: 'pending',
                applied_at: new Date().toISOString(),
                market_type: 'primary'
            })
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Loan application submitted successfully to primary market',
            data: {
                applicationId: loan.id,
                status: loan.status,
                loanDetails: {
                    amount: loan.amount,
                    interestRate: loan.interest_rate,
                    monthlyPayment: loan.monthly_payment,
                    term: loan.term
                },
                zimScore: zimScoreResult.score,
                nextSteps: [
                    'Your application is being reviewed',
                    'You will receive updates via notifications',
                    'Approval typically takes 24-48 hours',
                    'Funds will be disbursed to your wallet upon approval'
                ]
            }
        });
    } catch (error) {
        console.error('Primary market loan application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit loan application'
        });
    }
});

// @route   GET /api/primary-market/my-applications
// @desc    Get user's loan applications in primary market
// @access  Private
router.get('/my-applications', authenticateUser, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('loans')
            .select(`
                *,
                loan_installments(
                    id,
                    installment_number,
                    due_date,
                    total_amount,
                    status,
                    paid_at
                )
            `)
            .eq('user_id', req.user.id)
            .eq('market_type', 'primary')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data: applications, error } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: {
                applications: applications || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: applications?.length || 0
                }
            }
        });
    } catch (error) {
        console.error('Get primary market applications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loan applications'
        });
    }
});

module.exports = router;

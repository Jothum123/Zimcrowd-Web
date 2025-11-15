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

console.log('🔄 Loading enhanced loans routes...');

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

// @route   GET /api/loans/types
// @desc    Get available loan types and terms
// @access  Public
router.get('/types', (req, res) => {
    const loanTypes = [
        {
            type: 'personal',
            name: 'Personal Loan',
            description: 'For personal expenses, emergencies, or debt consolidation',
            minAmount: 500,
            maxAmount: 50000,
            minTerm: 3,
            maxTerm: 60,
            interestRateRange: { min: 8.5, max: 24.9 },
            features: ['Quick approval', 'Flexible terms', 'No collateral required']
        },
        {
            type: 'business',
            name: 'Business Loan',
            description: 'For business expansion, equipment, or working capital',
            minAmount: 1000,
            maxAmount: 100000,
            minTerm: 6,
            maxTerm: 84,
            interestRateRange: { min: 7.5, max: 22.9 },
            features: ['Business-friendly terms', 'Higher limits', 'Revenue-based assessment']
        },
        {
            type: 'emergency',
            name: 'Emergency Loan',
            description: 'Fast cash for urgent situations',
            minAmount: 100,
            maxAmount: 10000,
            minTerm: 1,
            maxTerm: 12,
            interestRateRange: { min: 12.0, max: 29.9 },
            features: ['Same-day approval', 'Minimal documentation', 'Quick disbursement']
        }
    ];

    res.json({
        success: true,
        data: loanTypes
    });
});

// @route   POST /api/loans/calculate
// @desc    Calculate loan terms and payments
// @access  Public
router.post('/calculate', [
    body('amount').isFloat({ min: 100, max: 100000 }).withMessage('Amount must be between $100 and $100,000'),
    body('term').isInt({ min: 1, max: 84 }).withMessage('Term must be between 1 and 84 months'),
    body('loanType').isIn(['personal', 'business', 'emergency']).withMessage('Invalid loan type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, term, loanType } = req.body;
        
        // Calculate interest rate based on loan type and amount
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
        
        res.json({
            success: true,
            data: {
                loanAmount: amount,
                term: term,
                interestRate: baseRate,
                monthlyPayment: schedule.monthlyPayment,
                totalPayment: schedule.totalPayment,
                totalInterest: schedule.totalInterest,
                fees: fees,
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

// @route   POST /api/loans/apply
// @desc    Submit loan application
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
        
        // Check if user has pending applications
        const { data: pendingLoans } = await supabase
            .from('loans')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['pending', 'under_review']);
            
        if (pendingLoans && pendingLoans.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending loan application'
            });
        }
        
        // Calculate ZimScore
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
        
        // Calculate fees and schedule
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
                applied_at: new Date().toISOString()
            })
            .select()
            .single();
            
        if (error) throw error;
        
        // Create payment schedule records
        for (const payment of schedule.payments) {
            await supabase
                .from('loan_installments')
                .insert({
                    loan_id: loan.id,
                    installment_number: payment.number,
                    due_date: payment.dueDate,
                    principal_amount: payment.principal,
                    interest_amount: payment.interest,
                    total_amount: payment.total,
                    status: 'pending'
                });
        }
        
        res.json({
            success: true,
            message: 'Loan application submitted successfully',
            data: {
                loanId: loan.id,
                status: loan.status,
                amount: loan.amount,
                interestRate: loan.interest_rate,
                monthlyPayment: loan.monthly_payment,
                zimScore: zimScoreResult.score
            }
        });
    } catch (error) {
        console.error('Loan application error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit loan application'
        });
    }
});

// @route   GET /api/loans/stats
// @desc    Get user's loan statistics
// @access  Private
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const { data: loans, error } = await supabase
            .from('loans')
            .select('*')
            .eq('user_id', req.user.id);
            
        if (error) throw error;
        
        const activeLoans = loans?.filter(loan => loan.status === 'active') || [];
        const completedLoans = loans?.filter(loan => loan.status === 'completed') || [];
        const pendingLoans = loans?.filter(loan => loan.status === 'pending') || [];
        
        // Calculate totals
        const totalLoanAmount = activeLoans.reduce((sum, loan) => sum + (parseFloat(loan.amount) || 0), 0);
        const averageTerm = activeLoans.length > 0
            ? activeLoans.reduce((sum, loan) => sum + (parseInt(loan.term) || 0), 0) / activeLoans.length
            : 0;
        const averageInterest = activeLoans.length > 0
            ? activeLoans.reduce((sum, loan) => sum + (parseFloat(loan.interest_rate) || 0), 0) / activeLoans.length
            : 0;
        
        res.json({
            success: true,
            data: {
                totalLoanAmount: totalLoanAmount.toFixed(2),
                averageTerm: Math.round(averageTerm),
                averageInterest: averageInterest.toFixed(1),
                activeLoansCount: activeLoans.length,
                completedLoansCount: completedLoans.length,
                pendingLoansCount: pendingLoans.length,
                totalLoansCount: loans?.length || 0
            }
        });
    } catch (error) {
        console.error('Get loan stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loan statistics'
        });
    }
});

// @route   GET /api/loans/my-loans
// @desc    Get user's loans
// @access  Private
router.get('/my-loans', authenticateUser, async (req, res) => {
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
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data: loans, error } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: loans || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: loans?.length || 0
            }
        });
    } catch (error) {
        console.error('Get loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loans'
        });
    }
});

// @route   GET /api/loans/:id
// @desc    Get specific loan details
// @access  Private
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: loan, error } = await supabase
            .from('loans')
            .select(`
                *,
                loan_installments(*)
            `)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();
            
        if (error || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }
        
        res.json({
            success: true,
            data: loan
        });
    } catch (error) {
        console.error('Get loan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loan details'
        });
    }
});

// @route   PUT /api/loans/:id/cancel
// @desc    Cancel pending loan application
// @access  Private
router.put('/:id/cancel', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: loan, error } = await supabase
            .from('loans')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', req.user.id)
            .eq('status', 'pending')
            .select()
            .single();
            
        if (error || !loan) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel this loan application'
            });
        }
        
        res.json({
            success: true,
            message: 'Loan application cancelled successfully',
            data: loan
        });
    } catch (error) {
        console.error('Cancel loan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel loan application'
        });
    }
});

module.exports = router;

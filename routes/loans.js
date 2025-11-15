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

console.log('🔄 Loading enhanced loans routes with fee integration...');

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

/**
 * @route   POST /api/loans/request
 * @desc    Create new loan request with fee calculations
 * @access  Private
 */
router.post('/request', [
    authenticateUser,
    body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least $100'),
    body('term').isInt({ min: 1, max: 60 }).withMessage('Term must be between 1 and 60 months'),
    body('rate').isFloat({ min: 1, max: 50 }).withMessage('Interest rate must be between 1% and 50%'),
    body('purpose').notEmpty().withMessage('Purpose is required'),
    body('description').optional(),
    body('e_signature').notEmpty().withMessage('Electronic signature is required'),
    body('agreed_to_fees').isBoolean().withMessage('Fee agreement is required'),
    body('agreed_to_terms').isBoolean().withMessage('Terms agreement is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, term, rate, purpose, description, e_signature, agreed_to_fees, agreed_to_terms } = req.body;

        // Validate agreements
        if (!agreed_to_fees || !agreed_to_terms) {
            return res.status(400).json({
                success: false,
                message: 'You must agree to all fees and terms to proceed'
            });
        }

        // Validate e-signature
        if (!e_signature || e_signature.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Valid electronic signature required'
            });
        }

        // Calculate all fees
        const SERVICE_FEE_PERCENT = 10;
        const INSURANCE_FEE_PERCENT = 3;
        const TENURE_FEE_PERCENT = 1;
        const COLLECTION_FEE_PERCENT = 5;

        // Upfront fees
        const serviceFee = amount * (SERVICE_FEE_PERCENT / 100);
        const insuranceFee = amount * (INSURANCE_FEE_PERCENT / 100);
        const totalUpfrontFees = serviceFee + insuranceFee;
        const netAmount = amount - totalUpfrontFees;

        // Monthly payment calculation
        const monthlyRate = rate / 100 / 12;
        const baseMonthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);
        
        // Monthly fees
        const tenureFeeMonthly = amount * (TENURE_FEE_PERCENT / 100);
        const collectionFeeMonthly = baseMonthlyPayment * (COLLECTION_FEE_PERCENT / 100);
        const totalMonthlyPayment = baseMonthlyPayment + tenureFeeMonthly + collectionFeeMonthly;

        // Total calculations
        const totalTenureFees = tenureFeeMonthly * term;
        const totalCollectionFees = collectionFeeMonthly * term;
        const totalPlatformFees = totalUpfrontFees + totalTenureFees + totalCollectionFees;
        const totalRepayment = totalMonthlyPayment * term;
        const totalInterest = (baseMonthlyPayment * term) - amount;

        // Get user's ZimScore
        const zimScore = await zimScoreService.calculateZimScore(req.user.id);

        // Create loan record
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .insert({
                user_id: req.user.id,
                amount: amount,
                term: term,
                interest_rate: rate,
                purpose: purpose,
                description: description || null,
                status: 'pending',
                zimscore: zimScore.score,
                risk_rating: zimScore.score >= 700 ? 'low' : zimScore.score >= 600 ? 'medium' : 'high',
                // Fee details
                service_fee: serviceFee,
                insurance_fee: insuranceFee,
                total_upfront_fees: totalUpfrontFees,
                net_amount: netAmount,
                tenure_fee_monthly: tenureFeeMonthly,
                collection_fee_monthly: collectionFeeMonthly,
                total_monthly_payment: totalMonthlyPayment,
                base_monthly_payment: baseMonthlyPayment,
                total_platform_fees: totalPlatformFees,
                total_repayment: totalRepayment,
                total_interest: totalInterest,
                // Agreement details
                e_signature: e_signature,
                agreed_to_fees: agreed_to_fees,
                agreed_to_terms: agreed_to_terms,
                signature_date: new Date().toISOString(),
                signature_ip: req.ip,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (loanError) {
            console.error('Loan creation error:', loanError);
            throw loanError;
        }

        // Create loan agreement record
        const { error: agreementError } = await supabase
            .from('loan_agreements')
            .insert({
                loan_id: loan.id,
                user_id: req.user.id,
                agreement_type: 'borrower',
                e_signature: e_signature,
                signature_date: new Date().toISOString(),
                signature_ip: req.ip,
                agreed_to_fees: agreed_to_fees,
                agreed_to_terms: agreed_to_terms,
                agreement_version: '1.0',
                created_at: new Date().toISOString()
            });

        if (agreementError) {
            console.error('Agreement creation error:', agreementError);
        }

        res.status(201).json({
            success: true,
            message: 'Loan request submitted successfully',
            data: {
                loan: loan,
                fee_breakdown: {
                    requested_amount: amount,
                    upfront_fees: {
                        service_fee: serviceFee,
                        insurance_fee: insuranceFee,
                        total: totalUpfrontFees
                    },
                    net_amount: netAmount,
                    monthly_fees: {
                        tenure_fee: tenureFeeMonthly,
                        collection_fee: collectionFeeMonthly
                    },
                    payments: {
                        base_monthly: baseMonthlyPayment,
                        total_monthly: totalMonthlyPayment,
                        total_repayment: totalRepayment,
                        total_interest: totalInterest
                    },
                    total_platform_fees: totalPlatformFees
                }
            }
        });
    } catch (error) {
        console.error('Loan request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit loan request',
            error: error.message
        });
    }
});

module.exports = router;

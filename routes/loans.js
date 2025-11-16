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
// @desc    Submit loan application with DTNI validation
// @access  Private
router.post('/apply', authenticateUser, [
    body('amount').isFloat({ min: 50, max: 100000 }).withMessage('Amount must be between $50 and $100,000'),
    body('termDays').isInt({ min: 30, max: 720 }).withMessage('Term must be between 30 and 720 days'),
    body('interestRate').isFloat({ min: 0, max: 10 }).withMessage('Interest rate must be between 0% and 10%'),
    body('purpose').isLength({ min: 5, max: 500 }).withMessage('Purpose must be between 5 and 500 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, termDays, interestRate, purpose } = req.body;
        const userId = req.user.id;
        
        console.log(`💰 Loan application: $${amount}, ${termDays} days, ${interestRate}% for user ${userId}`);
        
        // Check if user has pending applications
        const { data: pendingLoans } = await supabase
            .from('loans')
            .select('id')
            .eq('user_id', userId)
            .in('status', ['pending', 'under_review']);
            
        if (pendingLoans && pendingLoans.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending loan application',
                code: 'PENDING_APPLICATION_EXISTS'
            });
        }
        
        // DTNI Validation using our new system
        const dtniValidation = await zimScoreService.validateLoanAgainstDTNI(
            userId, 
            amount, 
            interestRate, 
            termDays
        );
        
        if (!dtniValidation.approved) {
            return res.status(400).json({
                success: false,
                message: dtniValidation.message,
                code: dtniValidation.reason,
                dtni: dtniValidation.dtni,
                suggestion: dtniValidation.suggestion,
                requiresBankStatement: dtniValidation.requiresBankStatement,
                minTenure: dtniValidation.minTenure,
                maxTenure: dtniValidation.maxTenure,
                requiredTenure: dtniValidation.requiredTenure,
                coldStartActive: dtniValidation.coldStartActive
            });
        }
        
        // Calculate monthly installment using reducing balance
        const termMonths = termDays / 30;
        const monthlyInstallment = zimScoreService.calculateMonthlyInstallment(
            amount, 
            interestRate / 100, 
            termMonths
        );
        
        // Create loan application
        const { data: loan, error } = await supabase
            .from('loans')
            .insert({
                user_id: userId,
                amount: amount,
                term_days: termDays,
                interest_rate: interestRate,
                monthly_installment: monthlyInstallment,
                total_amount: monthlyInstallment * termMonths,
                purpose: purpose,
                status: 'pending',
                applied_at: new Date().toISOString(),
                dtni_validation: dtniValidation.dtni
            })
            .select()
            .single();
            
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Loan application submitted successfully',
            data: {
                loanId: loan.id,
                status: loan.status,
                amount: loan.amount,
                termDays: loan.term_days,
                interestRate: loan.interest_rate,
                monthlyInstallment: monthlyInstallment,
                totalAmount: loan.total_amount,
                dtni: dtniValidation.dtni,
                approvalMessage: `Loan approved! Monthly payment: $${monthlyInstallment.toFixed(2)}`
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

// @route   POST /api/loans/validate
// @desc    Validate loan application without submitting
// @access  Private
router.post('/validate', authenticateUser, [
    body('amount').isFloat({ min: 50, max: 100000 }).withMessage('Amount must be between $50 and $100,000'),
    body('termDays').isInt({ min: 30, max: 720 }).withMessage('Term must be between 30 and 720 days'),
    body('interestRate').isFloat({ min: 0, max: 10 }).withMessage('Interest rate must be between 0% and 10%'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, termDays, interestRate } = req.body;
        const userId = req.user.id;
        
        console.log(`🔍 Validating loan: $${amount}, ${termDays} days, ${interestRate}% for user ${userId}`);
        
        // DTNI Validation
        const dtniValidation = await zimScoreService.validateLoanAgainstDTNI(
            userId, 
            amount, 
            interestRate, 
            termDays
        );
        
        // Calculate monthly installment
        const termMonths = termDays / 30;
        const monthlyInstallment = zimScoreService.calculateMonthlyInstallment(
            amount, 
            interestRate / 100, 
            termMonths
        );
        
        res.json({
            success: true,
            approved: dtniValidation.approved,
            message: dtniValidation.message,
            data: {
                amount,
                termDays,
                termMonths: termMonths.toFixed(1),
                interestRate,
                monthlyInstallment: monthlyInstallment.toFixed(2),
                totalAmount: (monthlyInstallment * termMonths).toFixed(2),
                dtni: dtniValidation.dtni,
                suggestion: dtniValidation.suggestion,
                requiresBankStatement: dtniValidation.requiresBankStatement,
                code: dtniValidation.reason
            }
        });
    } catch (error) {
        console.error('Loan validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate loan application'
        });
    }
});

// @route   POST /api/loans/calculate-max
// @desc    Calculate maximum loan amount user can afford
// @access  Private
router.post('/calculate-max', authenticateUser, [
    body('termDays').isInt({ min: 30, max: 720 }).withMessage('Term must be between 30 and 720 days'),
    body('interestRate').isFloat({ min: 0, max: 10 }).withMessage('Interest rate must be between 0% and 10%'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { termDays, interestRate } = req.body;
        const userId = req.user.id;
        
        // Get user's employment details
        const { data: employmentDetails } = await supabase
            .from('employment_details')
            .select('monthly_income, employment_type')
            .eq('user_id', userId)
            .single();

        if (!employmentDetails || !employmentDetails.monthly_income) {
            return res.status(400).json({
                success: false,
                message: 'Please update your employment details first',
                requiresBankStatement: true
            });
        }

        // Get existing loans
        const { data: activeLoans } = await supabase
            .from('loans')
            .select('amount, interest_rate, term_days')
            .eq('user_id', userId)
            .in('status', ['active', 'approved']);

        // Calculate existing installments
        let existingInstallment = 0;
        if (activeLoans && activeLoans.length > 0) {
            activeLoans.forEach(loan => {
                const termMonths = (loan.term_days || 30) / 30;
                const annualRate = (loan.interest_rate || 0) / 100;
                const monthlyInstallment = zimScoreService.calculateMonthlyInstallment(
                    loan.amount, 
                    annualRate, 
                    termMonths
                );
                existingInstallment += monthlyInstallment;
            });
        }

        // Calculate available installment capacity
        const netSalary = employmentDetails.monthly_income;
        const maxTotalInstallment = netSalary * 0.40;
        const availableInstallment = Math.max(0, maxTotalInstallment - existingInstallment);

        // Calculate max loan amount
        const termMonths = termDays / 30;
        const maxLoanAmount = zimScoreService.calculateMaxLoanAmount(
            availableInstallment,
            interestRate / 100,
            termMonths
        );

        // Apply employment caps
        const isCivilServant = employmentDetails.employment_type === 'government';
        const employmentCap = isCivilServant ? 300 : 100;
        const finalMaxAmount = Math.min(maxLoanAmount, employmentCap);

        res.json({
            success: true,
            data: {
                netSalary,
                maxTotalInstallment: maxTotalInstallment.toFixed(2),
                existingInstallment: existingInstallment.toFixed(2),
                availableInstallment: availableInstallment.toFixed(2),
                installmentUtilization: ((existingInstallment / maxTotalInstallment) * 100).toFixed(1) + '%',
                maxLoanAmount: maxLoanAmount.toFixed(2),
                employmentCap,
                finalMaxAmount: finalMaxAmount.toFixed(2),
                employmentType: employmentDetails.employment_type,
                termDays,
                interestRate,
                monthlyInstallment: availableInstallment.toFixed(2)
            }
        });
    } catch (error) {
        console.error('Max loan calculation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate maximum loan amount'
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
        const INSURANCE_FEE_PERCENT = 5;
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

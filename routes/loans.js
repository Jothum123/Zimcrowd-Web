const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');
const { ZimScoreService } = require('../services/zimscore.service');
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

// @route   POST /api/loans/request
// @desc    Submit a loan request with DTNI validation and employment-based payment schedule
// @access  Private
router.post('/request', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, purpose, tenure_days, employment_type } = req.body;

        console.log(`💰 Loan request from user ${userId}: $${amount}, ${tenure_days} days`);

        // 1. Get user profile and ZimScore
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        // 2. Get ZimScore
        const { data: zimScore, error: zimScoreError } = await supabase
            .from('user_zimscores')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (zimScoreError || !zimScore) {
            return res.status(400).json({
                success: false,
                message: 'ZimScore not found. Please complete KYC first.'
            });
        }

        // 3. Get active loans for DTNI calculation
        const { data: activeLoans, error: loansError } = await supabase
            .from('loans')
            .select('amount, monthly_payment')
            .eq('borrower_id', userId)
            .in('status', ['active', 'pending']);

        const existingMonthlyPayments = activeLoans?.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0) || 0;

        // 4. Calculate DTNI and validate loan limits
        const employmentTypeActual = employment_type || profile.employment_type || 'informal';
        const monthlyIncome = profile.monthly_income || 0;

        if (monthlyIncome === 0) {
            return res.status(400).json({
                success: false,
                message: 'Monthly income not set. Please update your profile.'
            });
        }

        // DTNI Calculation
        const maxDTNI = employmentTypeActual === 'government' ? 0.40 : 0.33;
        const maxInstallment = monthlyIncome * maxDTNI;
        const availableInstallment = maxInstallment - existingMonthlyPayments;
        const currentDTNI = (existingMonthlyPayments / monthlyIncome);

        console.log(`📊 DTNI Check: Income=$${monthlyIncome}, Existing=$${existingMonthlyPayments}, Max Installment=$${maxInstallment}, Available=$${availableInstallment}, DTNI=${(currentDTNI * 100).toFixed(1)}%`);

        // Calculate max loan using Reducing Balance Method
        // Formula: P = (M × [(1 + r)^n - 1]) / [r × (1 + r)^n]
        // Where: P = Principal (loan amount), M = Monthly payment, r = monthly interest rate, n = number of months
        
        const annualInterestRate = 0.05; // 5% annual
        const monthlyInterestRate = annualInterestRate / 12; // 0.4167% monthly
        const termMonths = Math.ceil(tenure_days / 30);
        
        // Calculate maximum loan amount from available installment using reducing balance
        let maxLoanFromDTNI;
        if (monthlyInterestRate > 0 && termMonths > 0) {
            // Reducing balance formula
            const powerTerm = Math.pow(1 + monthlyInterestRate, termMonths);
            maxLoanFromDTNI = (availableInstallment * (powerTerm - 1)) / (monthlyInterestRate * powerTerm);
        } else {
            // Fallback for zero interest
            maxLoanFromDTNI = availableInstallment * termMonths;
        }

        // Apply employment cap
        const employmentCap = employmentTypeActual === 'government' ? 300 : 100;
        
        // Apply cold start limit if applicable
        const coldStartLimit = zimScore.cold_start_limit || employmentCap;
        
        // Final max loan is the minimum of: DTNI-based loan, employment cap, and cold start limit
        let finalMaxLoan;
        if (zimScore.is_cold_start) {
            finalMaxLoan = Math.min(maxLoanFromDTNI, employmentCap, coldStartLimit);
        } else {
            finalMaxLoan = Math.min(maxLoanFromDTNI, employmentCap);
        }

        console.log(`💵 Loan limits: DTNI-based=$${maxLoanFromDTNI.toFixed(2)}, Employment Cap=$${employmentCap}, Cold Start Limit=$${coldStartLimit}, Final Max=$${finalMaxLoan.toFixed(2)}`);

        // 5. Validate requested amount
        if (amount > finalMaxLoan) {
            return res.status(400).json({
                success: false,
                message: `Loan amount exceeds your limit of $${finalMaxLoan.toFixed(2)}`,
                data: {
                    requested: amount,
                    maximum: finalMaxLoan,
                    dtni: (currentDTNI * 100).toFixed(1) + '%',
                    reason: zimScore.is_cold_start ? 'cold_start_limit' : 'dtni_limit'
                }
            });
        }

        // 6. Validate tenure
        const maxTenure = zimScore.loan_tenure_days || 90;
        if (tenure_days > maxTenure) {
            return res.status(400).json({
                success: false,
                message: `Tenure exceeds maximum of ${maxTenure} days`,
                data: {
                    requested: tenure_days,
                    maximum: maxTenure
                }
            });
        }

        // 7. Calculate fees and total
        const platformFee = amount * 0.05; // 5%
        const interest = amount * interestRate;
        const totalRepayment = amount + platformFee + interest;
        const monthlyPayment = totalRepayment / termMonths;

        // 8. Generate payment schedule
        const today = new Date();
        const paymentSchedule = [];

        if (employmentTypeActual === 'government') {
            // Government: Payment window system
            const dayOfMonth = today.getDate();
            const isFirstHalf = dayOfMonth <= 14;

            let firstPaymentDate;
            if (isFirstHalf) {
                // SAME_MONTH: End of current month
                firstPaymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            } else {
                // NEXT_MONTH: End of next month
                firstPaymentDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
            }

            for (let i = 0; i < termMonths; i++) {
                const paymentDate = new Date(firstPaymentDate);
                paymentDate.setMonth(paymentDate.getMonth() + i);
                // Set to last day of month
                paymentDate.setDate(0);
                paymentDate.setMonth(paymentDate.getMonth() + 1);

                paymentSchedule.push({
                    payment_number: i + 1,
                    due_date: paymentDate.toISOString(),
                    amount: monthlyPayment,
                    grace_days: 35
                });
            }
        } else {
            // Private/Business/Informal: 35-day grace
            const firstPaymentDate = new Date(today);
            firstPaymentDate.setDate(firstPaymentDate.getDate() + 35);

            for (let i = 0; i < termMonths; i++) {
                const paymentDate = new Date(firstPaymentDate);
                paymentDate.setMonth(paymentDate.getMonth() + i);

                paymentSchedule.push({
                    payment_number: i + 1,
                    due_date: paymentDate.toISOString(),
                    amount: monthlyPayment,
                    grace_days: 0 // Built into 35-day period
                });
            }
        }

        // 9. Create loan record
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .insert({
                borrower_id: userId,
                amount: amount,
                purpose: purpose,
                tenure_days: tenure_days,
                interest_rate: interestRate,
                platform_fee: platformFee,
                total_repayment: totalRepayment,
                monthly_payment: monthlyPayment,
                employment_type: employmentTypeActual,
                zimscore_at_request: zimScore.score,
                dtni_at_request: currentDTNI,
                payment_schedule: paymentSchedule,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (loanError) {
            console.error('❌ Error creating loan:', loanError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create loan request',
                error: loanError.message
            });
        }

        console.log(`✅ Loan request created: ID=${loan.id}`);

        res.json({
            success: true,
            message: 'Loan request submitted successfully',
            data: {
                loan_id: loan.id,
                amount: amount,
                total_repayment: totalRepayment,
                monthly_payment: monthlyPayment,
                tenure_days: tenure_days,
                payment_schedule: paymentSchedule,
                status: 'pending',
                dtni: (currentDTNI * 100).toFixed(1) + '%',
                zimscore: zimScore.score
            }
        });

    } catch (error) {
        console.error('❌ Error processing loan request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process loan request',
            error: error.message
        });
    }
});

// @route   POST /api/loans/test-validate
// @desc    Test loan validation without authentication (DEMO ONLY)
// @access  Public
router.post('/test-validate', [
    body('amount').isFloat({ min: 50, max: 100000 }).withMessage('Amount must be between $50 and $100,000'),
    body('termDays').isInt({ min: 30, max: 720 }).withMessage('Term must be between 30 and 720 days'),
    body('interestRate').isFloat({ min: 0, max: 10 }).withMessage('Interest rate must be between 0% and 10%'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, termDays, interestRate } = req.body;
        
        console.log(`🧪 TEST: Validating loan: $${amount}, ${termDays} days, ${interestRate}%`);
        
        // Mock user ID for testing
        const mockUserId = 'test-user-123';
        
        // Create mock employment data for testing - can be overridden via query params
        const employmentType = req.query.employment_type || 'government';
        const monthlyIncome = parseInt(req.query.monthly_income) || 600;
        
        const mockEmploymentData = {
            monthly_income: monthlyIncome,
            employment_type: employmentType
        };
        
        console.log(`🧪 TEST SCENARIO: ${employmentType} employee with $${monthlyIncome}/month income`);
        
        // Create a comprehensive mock for the ZimScore service
        const originalValidateMethod = zimScoreService.validateLoanAgainstDTNI;
        
        // Override the validateLoanAgainstDTNI method for testing
        zimScoreService.validateLoanAgainstDTNI = async function(userId, requestedAmount, interestRate, termDays) {
            console.log(`🧪 MOCK DTNI: Validating $${requestedAmount} for ${termDays} days at ${interestRate}%`);
            
            // Mock employment and ZimScore data
            const mockEmployment = mockEmploymentData;
            const mockZimScore = {
                cold_start_active: true,
                max_loan_amount: 300,
                score_based_limit: 800,
                employment_type: mockEmployment.employment_type
            };
            
            // Calculate DTNI manually for test
            const netSalary = mockEmployment.monthly_income;
            const maxInstallment = netSalary * 0.40;
            const existingInstallments = 0; // No existing loans for test
            const availableInstallment = maxInstallment - existingInstallments;
            
            // Calculate monthly installment for this loan
            const termMonths = termDays / 30;
            const monthlyInstallment = this.calculateMonthlyInstallment(
                requestedAmount, 
                interestRate / 100, 
                termMonths
            );
            
            // Check if loan is affordable
            const totalInstallment = existingInstallments + monthlyInstallment;
            const installmentUtilization = (totalInstallment / maxInstallment) * 100;
            
            // Employment caps
            const employmentCap = mockEmployment.employment_type === 'government' ? 300 : 100;
            
            // Tenure validation
            let tenureValid = true;
            let tenureMessage = '';
            
            if (mockZimScore.cold_start_active && termDays !== 90) {
                tenureValid = false;
                tenureMessage = 'Cold start loans are fixed at 3 months (90 days)';
            } else if (!mockZimScore.cold_start_active) {
                const maxTenure = mockEmployment.employment_type === 'government' ? 720 : 360;
                if (termDays > maxTenure) {
                    tenureValid = false;
                    tenureMessage = `Maximum loan tenure for ${mockEmployment.employment_type} employees is ${maxTenure / 30} months`;
                }
            }
            
            // Calculate max affordable loan based on available installment capacity
            const maxAffordableLoan = Math.floor(availableInstallment * termMonths * 0.85); // Conservative estimate
            
            // Determine approval conditions
            const dtniApproved = monthlyInstallment <= availableInstallment;
            const employmentCapApproved = requestedAmount <= employmentCap;
            const capacityApproved = requestedAmount <= maxAffordableLoan;
            const approved = dtniApproved && employmentCapApproved && tenureValid;
            
            let message = '';
            if (!tenureValid) {
                message = tenureMessage;
            } else if (!dtniApproved) {
                message = `Monthly payment $${monthlyInstallment.toFixed(2)} exceeds your capacity of $${availableInstallment.toFixed(2)}`;
            } else if (!employmentCapApproved) {
                message = `Amount $${requestedAmount} exceeds ${mockEmployment.employment_type} employment limit of $${employmentCap}`;
            } else {
                message = 'Loan application approved based on DTNI and ZimScore';
            }
            
            return {
                approved,
                message,
                dtni: {
                    netSalary,
                    maxInstallment: maxInstallment.toFixed(2),
                    availableInstallment: availableInstallment.toFixed(2),
                    existingInstallment: existingInstallments.toFixed(2),
                    newLoanInstallment: monthlyInstallment.toFixed(2),
                    totalInstallment: totalInstallment.toFixed(2),
                    installmentUtilization: `${installmentUtilization.toFixed(1)}%`,
                    remainingCapacity: (availableInstallment - monthlyInstallment).toFixed(2)
                },
                validation: {
                    dtniApproved,
                    employmentCapApproved,
                    tenureValid,
                    employmentCap,
                    requestedAmount,
                    maxAffordableLoan
                },
                employmentType: mockEmployment.employment_type,
                coldStartActive: mockZimScore.cold_start_active
            };
        };
        
        // DTNI Validation
        const dtniValidation = await zimScoreService.validateLoanAgainstDTNI(
            mockUserId, 
            amount, 
            interestRate, 
            termDays
        );
        
        // Restore original method
        zimScoreService.validateLoanAgainstDTNI = originalValidateMethod;
        
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
            testMode: true,
            mockData: {
                userId: mockUserId,
                employment: mockEmploymentData
            },
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
        console.error('Test loan validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate loan application',
            testMode: true,
            error: error.message
        });
    }
});

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

        // Calculate monthly repayment for the final max loan amount
        const monthlyRepayment = zimScoreService.calculateMonthlyInstallment(
            finalMaxAmount, 
            interestRate / 100, 
            termMonths
        );
        
        // Calculate total repayment and interest
        const totalRepayment = monthlyRepayment * termMonths;
        const totalInterest = totalRepayment - finalMaxAmount;
        const effectiveRate = ((totalRepayment / finalMaxAmount) - 1) * 100;

        res.json({
            success: true,
            data: {
                // DTNI Analysis
                dtniAnalysis: {
                    netSalary,
                    dtniPercentage: '40%',
                    maxInstallmentCapacity: maxTotalInstallment.toFixed(2),
                    existingInstallment: existingInstallment.toFixed(2),
                    availableCapacity: availableInstallment.toFixed(2),
                    installmentUtilization: ((existingInstallment / maxTotalInstallment) * 100).toFixed(1) + '%'
                },
                
                // Loan Calculation
                loanCalculation: {
                    maxLoanFromDTNI: maxLoanAmount.toFixed(2),
                    employmentCap,
                    finalMaxLoanAmount: finalMaxAmount.toFixed(2),
                    limitation: maxLoanAmount > employmentCap ? 
                        `Limited by ${employmentDetails.employment_type} employment cap` : 
                        'Limited by DTNI installment capacity'
                },
                
                // Repayment Details
                repaymentDetails: {
                    monthlyRepayment: monthlyRepayment.toFixed(2),
                    termDays,
                    termMonths: termMonths.toFixed(1),
                    interestRate: interestRate + '%',
                    totalRepayment: totalRepayment.toFixed(2),
                    totalInterest: totalInterest.toFixed(2),
                    effectiveRate: effectiveRate.toFixed(2) + '%'
                },
                
                // Summary
                summary: {
                    employmentType: employmentDetails.employment_type,
                    calculationMethod: 'DTNI-based with reducing balance interest',
                    formula: `Net Salary ($${netSalary}) × 40% = $${maxTotalInstallment.toFixed(2)} max installment`,
                    result: `Maximum loan: $${finalMaxAmount.toFixed(2)} → Monthly payment: $${monthlyRepayment.toFixed(2)}`
                }
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

// @route   GET /api/loans
// @desc    Get user's loans (root route for dashboard)
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
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

// @route   GET /api/loans/my-loans
// @desc    Get user's loans (alias for compatibility)
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

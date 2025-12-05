/**
 * Production Salary Verification API Server
 * Complete Express.js implementation with live data integration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { supabase } = require('./supabase/client');
const { 
    authenticateUser, 
    salaryReverificationLimit,
    loanApplicationLimit,
    validateSalaryInput,
    auditSalaryOperation,
    salaryVerificationErrorHandler
} = require('./auth-middleware-salary');
const { 
    validateSalaryForLoanApproval,
    calculateDTNILimit,
    requireValidSalaryForLoan
} = require('./loan-approval-salary-validation');
const profileRoutes = require('./profile-update-salary-verification');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Rate limiting
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later.'
    }
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Salary Verification API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// =====================================================
// SALARY VERIFICATION ENDPOINTS
// =====================================================

/**
 * GET /api/salary-verification/status
 * Get current salary verification status for authenticated user
 */
app.get('/api/salary-verification/status', 
    authenticateUser,
    auditSalaryOperation('SALARY_STATUS_CHECK'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            
            const { data: profile, error } = await supabase
                .from('profiles')
                .select(`
                    verified_net_salary,
                    salary_verified_at,
                    ocr_bank_salary,
                    ocr_payslip_salary,
                    employer_type,
                    monthly_income,
                    ec_number
                `)
                .eq('id', userId)
                .single();
                
            if (error) {
                return res.status(404).json({
                    success: false,
                    message: 'Profile not found',
                    error: 'PROFILE_NOT_FOUND'
                });
            }
            
            // Calculate freshness
            const salaryAge = profile.salary_verified_at ? 
                Math.floor((Date.now() - new Date(profile.salary_verified_at)) / (1000 * 60 * 60 * 24)) : 
                null;
                
            const isFresh = salaryAge !== null && salaryAge <= 90;
            
            res.json({
                success: true,
                data: {
                    verified_net_salary: profile.verified_net_salary,
                    salary_verified_at: profile.salary_verified_at,
                    salary_age_days: salaryAge,
                    is_fresh: isFresh,
                    needs_reverification: !isFresh,
                    employer_type: profile.employer_type,
                    has_ec_number: !!profile.ec_number,
                    ocr_data: {
                        bank_salary: profile.ocr_bank_salary,
                        payslip_salary: profile.ocr_payslip_salary
                    },
                    validation_status: isFresh ? 'VALID' : 'EXPIRED'
                }
            });
            
        } catch (error) {
            console.error('Salary status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get salary status',
                error: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/salary-verification/validate
 * Validate salary for loan approval
 */
app.post('/api/salary-verification/validate',
    authenticateUser,
    validateSalaryInput,
    auditSalaryOperation('SALARY_VALIDATION'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            
            // Use database function for validation
            const { data, error } = await supabase
                .rpc('validate_salary_for_loan', { p_user_id: userId });
                
            if (error) {
                console.error('Salary validation RPC error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Salary validation failed',
                    error: 'VALIDATION_ERROR'
                });
            }
            
            const result = data[0]; // RPC returns array
            
            if (!result.is_valid) {
                return res.status(400).json({
                    success: false,
                    message: result.error_message,
                    error: result.error_code,
                    requires_action: result.requires_action,
                    salary_data: result.salary_data
                });
            }
            
            res.json({
                success: true,
                message: 'Salary validation passed',
                data: {
                    is_valid: result.is_valid,
                    salary_data: result.salary_data
                }
            });
            
        } catch (error) {
            console.error('Salary validation error:', error);
            res.status(500).json({
                success: false,
                message: 'Salary validation failed',
                error: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/salary-verification/calculate-dtni
 * Calculate DTNI limit using verified salary
 */
app.post('/api/salary-verification/calculate-dtni',
    authenticateUser,
    validateSalaryInput,
    auditSalaryOperation('DTNI_CALCULATION'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { existing_debt = 0 } = req.body;
            
            // Use database function for DTNI calculation
            const { data, error } = await supabase
                .rpc('calculate_dtni_from_verified_salary', { 
                    p_user_id: userId, 
                    p_existing_debt: existing_debt 
                });
                
            if (error) {
                console.error('DTNI calculation RPC error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'DTNI calculation failed',
                    error: 'CALCULATION_ERROR'
                });
            }
            
            const result = data[0]; // RPC returns array
            
            res.json({
                success: true,
                message: 'DTNI calculation completed',
                data: {
                    max_installment: result.max_installment,
                    available_installment: result.available_installment,
                    dtni_limit: result.dtni_limit,
                    dtni_method: result.dtni_method,
                    calculation_details: result.calculation_details
                }
            });
            
        } catch (error) {
            console.error('DTNI calculation error:', error);
            res.status(500).json({
                success: false,
                message: 'DTNI calculation failed',
                error: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/salary-verification/reverify
 * Re-verify salary (rate limited)
 */
app.post('/api/salary-verification/reverify',
    authenticateUser,
    salaryReverificationLimit,
    validateSalaryInput,
    auditSalaryOperation('SALARY_REVERIFICATION'),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { net_salary, payslip_file_id } = req.body;
            
            if (!net_salary || net_salary <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid net salary is required',
                    error: 'INVALID_SALARY'
                });
            }
            
            // Update salary verification
            const { data: profile, error } = await supabase
                .from('profiles')
                .update({
                    verified_net_salary: net_salary,
                    salary_verified_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();
                
            if (error) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update salary verification',
                    error: 'UPDATE_ERROR'
                });
            }
            
            // Clear stale salary flags
            await supabase
                .from('profile_flags')
                .update({ 
                    status: 'RESOLVED', 
                    resolved_at: new Date().toISOString() 
                })
                .eq('user_id', userId)
                .eq('flag_type', 'stale_salary')
                .eq('status', 'ACTIVE');
            
            res.json({
                success: true,
                message: 'Salary re-verification completed successfully',
                data: {
                    verified_net_salary: profile.verified_net_salary,
                    salary_verified_at: profile.salary_verified_at,
                    is_fresh: true
                }
            });
            
        } catch (error) {
            console.error('Salary re-verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Salary re-verification failed',
                error: 'INTERNAL_ERROR'
            });
        }
    }
);

// =====================================================
// LOAN APPLICATION ENDPOINTS
// =====================================================

/**
 * POST /api/loan/apply
 * Apply for loan with salary validation
 */
app.post('/api/loan/apply',
    authenticateUser,
    loanApplicationLimit,
    requireValidSalaryForLoan,
    auditSalaryOperation('LOAN_APPLICATION'),
    async (req, res) => {
        try {
            const { loan_amount, loan_term, purpose } = req.body;
            const validatedSalary = req.validatedSalary;
            const dtniCalculation = req.dtniCalculation;
            
            console.log(`🔍 Loan application: User ${req.user.id}, Amount $${loan_amount}`);
            
            // Validate loan amount against DTNI limit
            if (loan_amount > dtniCalculation.dtniBasedLimit) {
                return res.status(400).json({
                    success: false,
                    message: `Loan amount $${loan_amount} exceeds your affordable limit of $${dtniCalculation.dtniBasedLimit.toFixed(2)}`,
                    error: 'LOAN_AMOUNT_EXCEEDS_DTNI',
                    dtni_calculation: {
                        max_installment: dtniCalculation.maxInstallment,
                        available_installment: dtniCalculation.availableInstallment,
                        max_loan_amount: dtniCalculation.dtniBasedLimit,
                        method: dtniCalculation.dtniMethod
                    }
                });
            }
            
            // Create loan application record
            const { data: loanApplication, error } = await supabase
                .from('loan_applications')
                .insert({
                    user_id: req.user.id,
                    loan_amount,
                    loan_term,
                    purpose,
                    verified_salary: validatedSalary.salaryData.verified_net_salary,
                    dtni_calculation: dtniCalculation,
                    salary_verified_at: validatedSalary.salaryData.salary_verified_at,
                    validation_warnings: validatedSalary.validationWarnings || [],
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
                
            if (error) {
                console.error('Loan application creation error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create loan application',
                    error: 'APPLICATION_ERROR'
                });
            }
            
            res.json({
                success: true,
                message: 'Loan application submitted successfully',
                data: {
                    application_id: loanApplication.id,
                    loan_amount,
                    status: 'pending',
                    verified_salary: validatedSalary.salaryData.verified_net_salary,
                    dtni_calculation: dtniCalculation,
                    validation_warnings: validatedSalary.validationWarnings
                }
            });
            
        } catch (error) {
            console.error('Loan application error:', error);
            res.status(500).json({
                success: false,
                message: 'Loan application failed',
                error: 'INTERNAL_ERROR'
            });
        }
    }
);

// =====================================================
// PROFILE ENDPOINTS (from existing routes)
// =====================================================
app.use('/api/user/profile', profileRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================
app.use(salaryVerificationErrorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        error: 'NOT_FOUND'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Salary Verification API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💰 Salary status: http://localhost:${PORT}/api/salary-verification/status`);
    console.log(`✅ Production endpoints ready for live data`);
});

module.exports = app;

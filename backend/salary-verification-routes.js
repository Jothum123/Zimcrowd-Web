/**
 * Salary Verification API Routes Registration
 * Integrates salary verification endpoints with main Express application
 */

const express = require('express');
const profileRoutes = require('./profile-update-salary-verification');
const { requireValidSalaryForLoan } = require('./loan-approval-salary-validation');

/**
 * Register salary verification routes with Express app
 * @param {Express} app - Express application instance
 */
function registerSalaryVerificationRoutes(app) {
    // Register profile update routes
    app.use('/api/user/profile', profileRoutes);
    
    console.log('✅ Salary verification profile routes registered');
    
    // Example loan application endpoint with salary validation middleware
    app.post('/api/loan/apply', 
        // Authentication middleware (assumes user is authenticated and req.user is available)
        requireValidSalaryForLoan, // Salary validation middleware
        async (req, res) => {
            try {
                const { loan_amount, loan_term, purpose } = req.body;
                const validatedSalary = req.validatedSalary;
                const dtniCalculation = req.dtniCalculation;
                
                console.log(`💰 Loan application with validated salary: $${validatedSalary.salaryData.verified_net_salary}`);
                
                // Check if requested loan amount exceeds DTNI limit
                if (loan_amount > dtniCalculation.dtniBasedLimit) {
                    return res.status(400).json({
                        success: false,
                        message: `Loan amount $${loan_amount} exceeds your affordable limit of $${dtniCalculation.dtniBasedLimit.toFixed(2)}`,
                        error: 'LOAN_AMOUNT_EXCEEDS_DTNI',
                        dtniCalculation: {
                            maxInstallment: dtniCalculation.maxInstallment,
                            availableInstallment: dtniCalculation.availableInstallment,
                            maxLoanAmount: dtniCalculation.dtniBasedLimit,
                            method: dtniCalculation.dtniMethod
                        }
                    });
                }
                
                // Process loan application (this would integrate with your existing loan system)
                const loanApplication = {
                    user_id: req.user.id,
                    loan_amount,
                    loan_term,
                    purpose,
                    verified_salary: validatedSalary.salaryData.verified_net_salary,
                    dtni_calculation: dtniCalculation,
                    salary_verified_at: validatedSalary.salaryData.salary_verified_at,
                    validation_warnings: validatedSalary.validationWarnings || []
                };
                
                // TODO: Save loan application to database
                // const result = await saveLoanApplication(loanApplication);
                
                res.json({
                    success: true,
                    message: 'Loan application submitted successfully',
                    data: {
                        application_id: 'TEMP_' + Date.now(), // Replace with actual ID
                        verified_salary: validatedSalary.salaryData.verified_net_salary,
                        dtni_calculation: dtniCalculation,
                        validation_warnings: validatedSalary.validationWarnings
                    }
                });
                
            } catch (error) {
                console.error('❌ Loan application error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Loan application failed',
                    error: error.message
                });
            }
        }
    );
    
    // Salary re-verification endpoint for stale salaries
    app.post('/api/user/reverify-salary', async (req, res) => {
        try {
            const { net_salary, payslip_file_id } = req.body;
            const userId = req.user.id;
            
            if (!net_salary || net_salary <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid net salary is required'
                });
            }
            
            // Update salary verification with new timestamp
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
                    error: error.message
                });
            }
            
            // Clear any existing stale salary flags
            await supabase
                .from('profile_flags')
                .update({ status: 'RESOLVED', resolved_at: new Date().toISOString() })
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
            console.error('❌ Salary re-verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Salary re-verification failed',
                error: error.message
            });
        }
    });
    
    // Get salary verification status
    app.get('/api/user/salary-status', async (req, res) => {
        try {
            const userId = req.user.id;
            
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    verified_net_salary,
                    salary_verified_at,
                    ocr_bank_salary,
                    ocr_payslip_salary,
                    employer_type,
                    monthly_income
                `)
                .eq('id', userId)
                .single();
                
            if (error) {
                return res.status(404).json({
                    success: false,
                    message: 'Profile not found'
                });
            }
            
            // Calculate freshness
            const salaryAge = data.salary_verified_at ? 
                Math.floor((Date.now() - new Date(data.salary_verified_at)) / (1000 * 60 * 60 * 24)) : 
                null;
                
            const isFresh = salaryAge !== null && salaryAge <= 90;
            
            res.json({
                success: true,
                data: {
                    verified_net_salary: data.verified_net_salary,
                    salary_verified_at: data.salary_verified_at,
                    salary_age_days: salaryAge,
                    is_fresh: isFresh,
                    needs_reverification: !isFresh,
                    employer_type: data.employer_type,
                    ocr_data: {
                        bank_salary: data.ocr_bank_salary,
                        payslip_salary: data.ocr_payslip_salary
                    }
                }
            });
            
        } catch (error) {
            console.error('❌ Salary status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get salary status',
                error: error.message
            });
        }
    });
    
    console.log('✅ Salary verification loan routes registered');
}

/**
 * Example: How to integrate with main app
 * 
 * In your main server.js or app.js:
 * 
 * const { registerSalaryVerificationRoutes } = require('./salary-verification-routes');
 * 
 * // Register routes after authentication middleware
 * registerSalaryVerificationRoutes(app);
 */

module.exports = {
    registerSalaryVerificationRoutes
};

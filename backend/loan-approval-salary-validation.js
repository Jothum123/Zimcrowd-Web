/**
 * Loan Approval Salary Validation System
 * Re-validates salary using database-stored verified values instead of frontend input
 */

const { supabase } = require('../supabase/client');

/**
 * Validates salary freshness and authenticity for loan approval
 * @param {string} userId - User ID to validate
 * @returns {Object} Validation result with salary data
 */
async function validateSalaryForLoanApproval(userId) {
    try {
        console.log(`🔍 Validating salary for loan approval - User: ${userId}`);

        // Fetch salary verification data from database (never trust frontend input)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
                verified_net_salary,
                salary_verified_at,
                ocr_bank_salary,
                ocr_payslip_salary,
                monthly_income,
                employer_type,
                employment_status
            `)
            .eq('id', userId)
            .single();

        if (profileError) {
            console.error(`❌ Profile fetch error for user ${userId}:`, profileError);
            return {
                valid: false,
                error: 'PROFILE_NOT_FOUND',
                message: 'User profile not found'
            };
        }

        // Check if salary verification exists
        if (!profile.verified_net_salary || !profile.salary_verified_at) {
            return {
                valid: false,
                error: 'SALARY_NOT_VERIFIED',
                message: 'Salary verification required before loan approval',
                requiresAction: 'UPLOAD_PAYSLIP',
                data: profile
            };
        }

        // Calculate salary age in days
        const salaryVerifiedDate = new Date(profile.salary_verified_at);
        const currentDate = new Date();
        const salaryAgeDays = Math.floor((currentDate - salaryVerifiedDate) / (1000 * 60 * 60 * 24));

        console.log(`📅 Salary verification age: ${salaryAgeDays} days for user ${userId}`);

        // 90-day freshness validation
        if (salaryAgeDays > 90) {
            return {
                valid: false,
                error: 'SALARY_STALE',
                message: `Salary verification is ${salaryAgeDays} days old. Re-verification required (90-day limit)`,
                requiresAction: 'REVERIFY_SALARY',
                salaryAgeDays,
                data: profile
            };
        }

        // Government employee specific validation
        if (profile.employer_type === 'government') {
            // Minimum $120 salary requirement for government employees
            if (profile.verified_net_salary < 120) {
                return {
                    valid: false,
                    error: 'GOVERNMENT_SALARY_TOO_LOW',
                    message: 'Government employees must have minimum $120 net salary for loan approval',
                    requiresAction: 'UPDATE_SALARY',
                    data: profile
                };
            }

            // Check for EC number requirement
            if (!profile.ec_number) {
                return {
                    valid: false,
                    error: 'MISSING_EC_NUMBER',
                    message: 'EC number required for government employee loan approval',
                    requiresAction: 'UPDATE_EC_NUMBER',
                    data: profile
                };
            }
        }

        // Cross-validation check between OCR and manual input
        const validationWarnings = [];
        
        if (profile.ocr_payslip_salary && profile.verified_net_salary) {
            const difference = Math.abs(profile.verified_net_salary - profile.ocr_payslip_salary);
            const percentageDifference = (difference / profile.ocr_payslip_salary) * 100;
            
            if (percentageDifference > 10) {
                validationWarnings.push({
                    type: 'PAYSLEEP_DISCREPANCY',
                    message: `Manual input differs from payslip OCR by ${percentageDifference.toFixed(1)}%`,
                    severity: 'HIGH'
                });
            }
        }

        if (profile.ocr_bank_salary && profile.verified_net_salary) {
            const difference = Math.abs(profile.verified_net_salary - profile.ocr_bank_salary);
            const percentageDifference = (difference / profile.ocr_bank_salary) * 100;
            
            if (percentageDifference > 20) {
                validationWarnings.push({
                    type: 'BANK_STATEMENT_DISCREPANCY',
                    message: `Manual input differs from bank statement OCR by ${percentageDifference.toFixed(1)}%`,
                    severity: 'MEDIUM'
                });
            }
        }

        // Return successful validation with salary data for DTNI calculation
        return {
            valid: true,
            message: 'Salary validation passed',
            salaryAgeDays,
            validationWarnings,
            salaryData: {
                verified_net_salary: profile.verified_net_salary,
                employer_type: profile.employer_type,
                employment_status: profile.employment_status,
                ocr_bank_salary: profile.ocr_bank_salary,
                ocr_payslip_salary: profile.ocr_payslip_salary,
                salary_verified_at: profile.salary_verified_at
            }
        };

    } catch (error) {
        console.error(`❌ Salary validation error for user ${userId}:`, error);
        return {
            valid: false,
            error: 'VALIDATION_ERROR',
            message: 'Salary validation failed due to system error',
            systemError: error.message
        };
    }
}

/**
 * Calculates DTNI limit using verified salary from database
 * @param {Object} salaryData - Salary validation result
 * @param {number} existingDebt - Existing monthly debt payments
 * @returns {Object} DTNI calculation result
 */
function calculateDTNILimit(salaryData, existingDebt = 0) {
    const { verified_net_salary, employer_type } = salaryData.salaryData;
    
    let maxInstallment, availableInstallment, dtniMethod;
    
    if (employer_type === 'government') {
        // Government employees: net salary - $70 mandatory buffer
        maxInstallment = verified_net_salary - 70;
        availableInstallment = maxInstallment - existingDebt;
        dtniMethod = 'GOVERNMENT_BUFFER';
        console.log(`🏛️ Government DTNI: $${verified_net_salary} - $70 buffer = $${maxInstallment} available`);
    } else {
        // Other employees: 33% DTNI
        const dtniPercent = 0.33;
        maxInstallment = verified_net_salary * dtniPercent;
        availableInstallment = maxInstallment - existingDebt;
        dtniMethod = 'PERCENTAGE_33';
        console.log(`💼 Other DTNI: $${verified_net_salary} × 33% = $${maxInstallment} available`);
    }
    
    // Reducing balance formula calculation
    let dtniBasedLimit = 0;
    if (availableInstallment > 0) {
        const annualRate = 0.05;
        const monthlyRate = annualRate / 12;
        const termMonths = 3; // Default 3 months
        
        const powerTerm = Math.pow(1 + monthlyRate, termMonths);
        dtniBasedLimit = (availableInstallment * (powerTerm - 1)) / (monthlyRate * powerTerm);
    }
    
    return {
        maxInstallment,
        availableInstallment,
        dtniBasedLimit,
        dtniMethod,
        existingDebt
    };
}

/**
 * Middleware for Express routes to validate salary before loan processing
 */
function requireValidSalaryForLoan(req, res, next) {
    const userId = req.user?.id || req.body?.user_id;
    
    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'User ID required for salary validation'
        });
    }
    
    validateSalaryForLoanApproval(userId)
        .then(validationResult => {
            if (!validationResult.valid) {
                return res.status(400).json({
                    success: false,
                    message: validationResult.message,
                    error: validationResult.error,
                    requiresAction: validationResult.requiresAction,
                    salaryAgeDays: validationResult.salaryAgeDays
                });
            }
            
            // Attach validated salary data to request for downstream use
            req.validatedSalary = validationResult;
            req.dtniCalculation = calculateDTNILimit(validationResult, req.body.existing_debt || 0);
            
            next();
        })
        .catch(error => {
            console.error('❌ Salary validation middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Salary validation failed',
                error: 'VALIDATION_ERROR'
            });
        });
}

module.exports = {
    validateSalaryForLoanApproval,
    calculateDTNILimit,
    requireValidSalaryForLoan
};

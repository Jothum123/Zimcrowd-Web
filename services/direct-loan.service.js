const { supabase, isSupabaseAvailable } = require('./supabase-client');

/**
 * Direct Loan Service
 * Manages "ZimCrowd Direct" guaranteed instant funding
 * Alternative to P2P marketplace - funded by ZimCrowd Capital
 * 
 * KEY DIFFERENCE FROM P2P:
 * - NO COLD START - Users get full DTNI-based limit immediately
 * - Fixed fee based on ZimScore (not user-selected interest)
 * - Instant disbursement (no waiting for lenders)
 */
class DirectLoanService {
    constructor() {
        this.OFFER_EXPIRY_HOURS = 24;
        this.DEFAULT_LOAN_DURATION_DAYS = 30;
        
        // NO COLD START in Direct Lending for Government
        // Private and Informal have cold start caps
        this.COLD_START_ENABLED = true;
        
        // USER-SELECTABLE INTEREST RATE (0-10% per month)
        this.MIN_MONTHLY_INTEREST_RATE = 0.00;  // 0% per month minimum
        this.MAX_MONTHLY_INTEREST_RATE = 0.10;  // 10% per month maximum
        this.DEFAULT_MONTHLY_INTEREST_RATE = 0.05; // 5% default
        
        // DTNI Configuration by employment type
        // Max Loan: Govt $3000, Private $1000, Informal $500
        // Max Tenure: Govt 24 months, Private 12 months, Informal 6 months
        this.DTNI_CONFIG = {
            government: { 
                ratio: 0.40, 
                maxTenureMonths: 24, 
                maxLoan: 3000, 
                coldStartCap: null,
                coldStartActive: false
            },
            private: { 
                ratio: 0.33, 
                maxTenureMonths: 12, 
                maxLoan: 1000, 
                coldStartCap: 300,
                coldStartActive: true
            },
            business: { 
                ratio: 0.30, 
                maxTenureMonths: 12, 
                maxLoan: 1000, 
                coldStartCap: 200,
                coldStartActive: true
            },
            informal: { 
                ratio: 0.25, 
                maxTenureMonths: 6, 
                maxLoan: 500, 
                coldStartCap: 100,
                coldStartActive: true
            }
        };
        
        // Maximum loan ceiling by employment type
        this.MAX_LOAN_CEILING = 3000; // Government max
        this.MIN_LOAN_AMOUNT = 25;
        
        // Required documents by employment type
        this.REQUIRED_DOCUMENTS_BY_TYPE = {
            // Government & Private employees - same requirements
            government: [
                { type: 'national_id', name: 'National ID (Front & Back)', required: true },
                { type: 'selfie', name: 'Selfie Photo', required: true },
                { type: 'payslip', name: 'Payslip', required: true },
                { type: 'bank_statement', name: 'Bank Statement', required: true },
                { type: 'proof_of_residence', name: 'Proof of Residence', required: true },
                { type: 'employment_contract', name: 'Employment Contract / Confirmation Letter', required: true }
            ],
            private: [
                { type: 'national_id', name: 'National ID (Front & Back)', required: true },
                { type: 'selfie', name: 'Selfie Photo', required: true },
                { type: 'payslip', name: 'Payslip', required: true },
                { type: 'bank_statement', name: 'Bank Statement', required: true },
                { type: 'proof_of_residence', name: 'Proof of Residence', required: true },
                { type: 'employment_contract', name: 'Employment Contract / Confirmation Letter', required: true }
            ],
            // Informal employees - different requirements (no payslip, no employment contract)
            informal: [
                { type: 'national_id', name: 'National ID (Front & Back)', required: true },
                { type: 'selfie', name: 'Selfie Photo', required: true },
                { type: 'proof_of_residence', name: 'Proof of Residence', required: true },
                { type: 'bank_statement', name: 'Bank Statement (Proof of Address + Income)', required: true },
                { type: 'ecocash_statement', name: 'EcoCash/Mobile Money Statement (Proof of Income)', required: true },
                { type: 'payslip', name: 'Payslip', required: false },
                { type: 'employment_contract', name: 'Employment Contract', required: false }
            ],
            // Business owners
            business: [
                { type: 'national_id', name: 'National ID (Front & Back)', required: true },
                { type: 'selfie', name: 'Selfie Photo', required: true },
                { type: 'bank_statement', name: 'Bank Statement', required: true },
                { type: 'proof_of_residence', name: 'Proof of Residence', required: true },
                { type: 'business_registration', name: 'Business Registration Certificate', required: true },
                { type: 'payslip', name: 'Payslip', required: false },
                { type: 'employment_contract', name: 'Employment Contract', required: false }
            ]
        };
        
        // Default required documents (for backwards compatibility)
        this.REQUIRED_DOCUMENTS = this.REQUIRED_DOCUMENTS_BY_TYPE.private;
        
        // ELIGIBILITY RULES
        this.ELIGIBILITY_RULES = {
            // Rule 1: No loans in arrears from P2P marketplace
            NO_ARREARS: {
                code: 'NO_ARREARS',
                message: 'You have a loan in arrears from the P2P marketplace. Please clear your arrears before applying for Direct Lending.',
                action: 'CLEAR_ARREARS'
            },
            // Rule 2: Account must not be suspended
            NOT_SUSPENDED: {
                code: 'NOT_SUSPENDED',
                message: 'Your account is suspended. Please request to lift the ban before using the platform.',
                action: 'REQUEST_UNBAN'
            },
            // Rule 3: Account must not be banned
            NOT_BANNED: {
                code: 'NOT_BANNED',
                message: 'Your account has been banned. Please contact support to resolve this issue.',
                action: 'CONTACT_SUPPORT'
            }
        };
    }

    /**
     * Get required documents based on employment type
     * @param {string} employmentType - Employment type (government, private, informal, business)
     * @returns {Array} Required documents list
     */
    getRequiredDocuments(employmentType) {
        const type = employmentType?.toLowerCase() || 'private';
        return this.REQUIRED_DOCUMENTS_BY_TYPE[type] || this.REQUIRED_DOCUMENTS_BY_TYPE.private;
    }

    /**
     * Get loan limits based on employment type
     * @param {string} employmentType - Employment type
     * @param {boolean} isColdStart - Whether user is in cold start period
     * @returns {Object} Loan limits configuration
     */
    getLoanLimits(employmentType, isColdStart = true) {
        const type = employmentType?.toLowerCase() || 'private';
        const config = this.DTNI_CONFIG[type] || this.DTNI_CONFIG.private;
        
        let maxLoan;
        let coldStartActive;
        
        if (type === 'government') {
            // Government: NO cold start - full DTNI-based limit
            maxLoan = config.maxLoan;
            coldStartActive = false;
        } else if (isColdStart && config.coldStartCap) {
            // Other types: Apply cold start cap
            maxLoan = config.coldStartCap;
            coldStartActive = true;
        } else {
            // After cold start: Full limit
            maxLoan = config.maxLoan;
            coldStartActive = false;
        }
        
        return {
            minLoan: this.MIN_LOAN_AMOUNT,
            maxLoan: maxLoan,
            maxLoanAfterColdStart: config.maxLoan,
            coldStartCap: config.coldStartCap,
            coldStartActive: coldStartActive,
            dtniRatio: config.ratio,
            maxTenureMonths: config.maxTenureMonths,
            employmentType: type
        };
    }

    /**
     * Check if employment fields are required
     * @param {string} employmentType - Employment type
     * @returns {boolean} Whether employment fields are required
     */
    areEmploymentFieldsRequired(employmentType) {
        const type = employmentType?.toLowerCase() || 'private';
        // Informal employees do NOT need employment fields
        return type !== 'informal';
    }

    /**
     * Check if user is eligible for Direct Lending
     * RULES:
     * 1. No loans in arrears from P2P marketplace
     * 2. Account must not be suspended
     * 3. Account must not be banned
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Eligibility status
     */
    async checkUserEligibility(userId) {
        try {
            console.log(`🔍 Checking Direct Lending eligibility for user ${userId}`);
            
            const violations = [];
            
            // Check 1: Is user suspended or banned?
            const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('status, suspension_reason, suspension_date, ban_reason, ban_date')
                .eq('user_id', userId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error checking user profile:', profileError);
            }

            if (userProfile) {
                // Check for suspension
                if (userProfile.status === 'suspended') {
                    violations.push({
                        rule: this.ELIGIBILITY_RULES.NOT_SUSPENDED,
                        details: {
                            reason: userProfile.suspension_reason,
                            date: userProfile.suspension_date
                        }
                    });
                }
                
                // Check for ban
                if (userProfile.status === 'banned') {
                    violations.push({
                        rule: this.ELIGIBILITY_RULES.NOT_BANNED,
                        details: {
                            reason: userProfile.ban_reason,
                            date: userProfile.ban_date
                        }
                    });
                }
            }

            // Check 2: Does user have loans in arrears from P2P marketplace?
            const { data: arrearsLoans, error: loansError } = await supabase
                .from('loans')
                .select('loan_id, amount, status, due_date, days_overdue')
                .eq('borrower_id', userId)
                .in('status', ['late', 'defaulted', 'in_arrears', 'overdue']);

            if (loansError && loansError.code !== 'PGRST116') {
                console.error('Error checking loans:', loansError);
            }

            if (arrearsLoans && arrearsLoans.length > 0) {
                const totalArrears = arrearsLoans.reduce((sum, loan) => sum + parseFloat(loan.amount || 0), 0);
                violations.push({
                    rule: this.ELIGIBILITY_RULES.NO_ARREARS,
                    details: {
                        loansInArrears: arrearsLoans.length,
                        totalAmount: totalArrears,
                        loans: arrearsLoans.map(l => ({
                            loanId: l.loan_id,
                            amount: l.amount,
                            status: l.status,
                            daysOverdue: l.days_overdue
                        }))
                    }
                });
            }

            // Also check direct loans in arrears
            const { data: directArrearsLoans, error: directLoansError } = await supabase
                .from('direct_loans')
                .select('direct_loan_id, principal_amount, status, due_date, days_late')
                .eq('borrower_user_id', userId)
                .in('status', ['late', 'defaulted']);

            if (directLoansError && directLoansError.code !== 'PGRST116') {
                console.error('Error checking direct loans:', directLoansError);
            }

            if (directArrearsLoans && directArrearsLoans.length > 0) {
                const totalDirectArrears = directArrearsLoans.reduce((sum, loan) => sum + parseFloat(loan.principal_amount || 0), 0);
                violations.push({
                    rule: {
                        code: 'NO_DIRECT_ARREARS',
                        message: 'You have a Direct Loan in arrears. Please clear your arrears before applying for a new loan.',
                        action: 'CLEAR_DIRECT_ARREARS'
                    },
                    details: {
                        loansInArrears: directArrearsLoans.length,
                        totalAmount: totalDirectArrears,
                        loans: directArrearsLoans.map(l => ({
                            loanId: l.direct_loan_id,
                            amount: l.principal_amount,
                            status: l.status,
                            daysLate: l.days_late
                        }))
                    }
                });
            }

            const isEligible = violations.length === 0;

            console.log(`🔍 Eligibility Check Result:`);
            console.log(`   Eligible: ${isEligible}`);
            if (!isEligible) {
                console.log(`   Violations: ${violations.map(v => v.rule.code).join(', ')}`);
            }

            return {
                success: true,
                eligible: isEligible,
                violations: violations,
                message: isEligible 
                    ? 'You are eligible for Direct Lending.'
                    : violations[0].rule.message
            };
        } catch (error) {
            console.error('Error checking eligibility:', error);
            return {
                success: false,
                eligible: false,
                error: error.message
            };
        }
    }

    /**
     * Request to lift suspension/ban
     * @param {string} userId - User ID
     * @param {string} reason - Reason for request
     * @returns {Promise<Object>} Request result
     */
    async requestUnban(userId, reason) {
        try {
            console.log(`📝 User ${userId} requesting to lift ban/suspension`);
            
            // Create unban request
            const { data, error } = await supabase
                .from('unban_requests')
                .insert({
                    user_id: userId,
                    reason: reason,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                requestId: data.id,
                message: 'Your request has been submitted. Our team will review it within 24-48 hours.'
            };
        } catch (error) {
            console.error('Error submitting unban request:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check KYC documents from Document Center
     * Fetches document status and provides actionable guidance
     * Status badges: VERIFIED, PENDING, REJECTED, MISSING
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Document verification status with actions
     */
    async checkRequiredDocuments(userId) {
        try {
            console.log(`📋 Checking KYC documents from Document Center - User ${userId}`);
            
            // Fetch documents from user_documents table (Document Center)
            const { data: documents, error } = await supabase
                .from('user_documents')
                .select(`
                    id,
                    document_type,
                    file_name,
                    file_url,
                    status,
                    verification_notes,
                    uploaded_at,
                    verified_at,
                    rejected_at,
                    rejection_reason
                `)
                .eq('user_id', userId);

            if (error) throw error;

            const uploadedDocs = documents || [];
            
            // Document status tracking
            const documentChecklist = [];
            const missingDocuments = [];
            const pendingDocuments = [];
            const rejectedDocuments = [];
            const verifiedDocuments = [];
            
            // Check each required document
            for (const reqDoc of this.REQUIRED_DOCUMENTS) {
                // Find document by type (handle variations)
                const uploaded = uploadedDocs.find(d => 
                    d.document_type === reqDoc.type || 
                    d.document_type === reqDoc.type.replace('_', '-') ||
                    d.document_type === reqDoc.type.replace('-', '_') ||
                    d.document_type.toLowerCase() === reqDoc.type.toLowerCase()
                );
                
                let docStatus = {
                    type: reqDoc.type,
                    name: reqDoc.name,
                    required: reqDoc.required,
                    uploaded: false,
                    status: 'MISSING',
                    statusBadge: '🔴 MISSING',
                    action: null,
                    actionUrl: null,
                    details: null
                };
                
                if (!uploaded) {
                    // Document not uploaded
                    docStatus.status = 'MISSING';
                    docStatus.statusBadge = '🔴 MISSING';
                    docStatus.action = `Upload your ${reqDoc.name}`;
                    docStatus.actionUrl = `/document-center?upload=${reqDoc.type}`;
                    missingDocuments.push(docStatus);
                } else {
                    docStatus.uploaded = true;
                    docStatus.fileUrl = uploaded.file_url;
                    docStatus.uploadedAt = uploaded.uploaded_at;
                    
                    switch (uploaded.status?.toLowerCase()) {
                        case 'verified':
                        case 'approved':
                            docStatus.status = 'VERIFIED';
                            docStatus.statusBadge = '✅ VERIFIED';
                            docStatus.verifiedAt = uploaded.verified_at;
                            verifiedDocuments.push(docStatus);
                            break;
                            
                        case 'pending':
                        case 'processing':
                        case 'under_review':
                            docStatus.status = 'PENDING';
                            docStatus.statusBadge = '🟡 PENDING';
                            docStatus.action = 'Verification in progress. Please wait.';
                            docStatus.details = uploaded.verification_notes;
                            pendingDocuments.push(docStatus);
                            break;
                            
                        case 'rejected':
                        case 'failed':
                            docStatus.status = 'REJECTED';
                            docStatus.statusBadge = '🔴 REJECTED';
                            docStatus.action = `Re-upload your ${reqDoc.name}`;
                            docStatus.actionUrl = `/document-center?reupload=${reqDoc.type}`;
                            docStatus.rejectionReason = uploaded.rejection_reason;
                            docStatus.rejectedAt = uploaded.rejected_at;
                            rejectedDocuments.push(docStatus);
                            break;
                            
                        default:
                            docStatus.status = 'PENDING';
                            docStatus.statusBadge = '🟡 PENDING';
                            docStatus.action = 'Verification in progress.';
                            pendingDocuments.push(docStatus);
                    }
                }
                
                documentChecklist.push(docStatus);
            }

            // Calculate overall status
            const totalRequired = this.REQUIRED_DOCUMENTS.length;
            const totalVerified = verifiedDocuments.length;
            const totalPending = pendingDocuments.length;
            const totalMissing = missingDocuments.length;
            const totalRejected = rejectedDocuments.length;
            
            const allVerified = totalVerified === totalRequired;
            const allUploaded = totalMissing === 0 && totalRejected === 0;
            const canApply = allVerified; // Must have all documents verified
            
            // Build action message
            let message = '';
            let primaryAction = null;
            
            if (allVerified) {
                message = '✅ All documents verified. You can apply for Direct Lending.';
            } else if (totalMissing > 0) {
                message = `🔴 Missing ${totalMissing} document(s): ${missingDocuments.map(d => d.name).join(', ')}`;
                primaryAction = {
                    type: 'UPLOAD',
                    label: 'Upload Missing Documents',
                    url: '/document-center',
                    documents: missingDocuments.map(d => d.type)
                };
            } else if (totalRejected > 0) {
                message = `🔴 ${totalRejected} document(s) rejected: ${rejectedDocuments.map(d => d.name).join(', ')}. Please re-upload.`;
                primaryAction = {
                    type: 'REUPLOAD',
                    label: 'Re-upload Rejected Documents',
                    url: '/document-center',
                    documents: rejectedDocuments.map(d => d.type)
                };
            } else if (totalPending > 0) {
                message = `🟡 ${totalPending} document(s) pending verification: ${pendingDocuments.map(d => d.name).join(', ')}. Please wait.`;
                primaryAction = {
                    type: 'WAIT',
                    label: 'Verification in Progress',
                    estimatedTime: '24-48 hours'
                };
            }

            console.log(`📋 Document Check Result:`);
            console.log(`   Total Required: ${totalRequired}`);
            console.log(`   Verified: ${totalVerified}`);
            console.log(`   Pending: ${totalPending}`);
            console.log(`   Missing: ${totalMissing}`);
            console.log(`   Rejected: ${totalRejected}`);
            console.log(`   Can Apply: ${canApply}`);

            return {
                success: true,
                eligible: canApply,
                
                // Summary
                summary: {
                    totalRequired,
                    totalVerified,
                    totalPending,
                    totalMissing,
                    totalRejected,
                    completionPercent: Math.round((totalVerified / totalRequired) * 100)
                },
                
                // Document checklist with status badges
                documents: documentChecklist,
                
                // Categorized lists
                verifiedDocuments,
                pendingDocuments,
                missingDocuments,
                rejectedDocuments,
                
                // Status flags
                allVerified,
                allUploaded,
                canApply,
                
                // Action guidance
                message,
                primaryAction,
                
                // Quick actions for frontend
                actions: {
                    uploadUrl: '/document-center',
                    kycUrl: '/post-registration',
                    supportUrl: '/support'
                }
            };
        } catch (error) {
            console.error('Error checking documents:', error);
            return {
                success: false,
                eligible: false,
                error: error.message,
                message: 'Failed to check document status. Please try again.'
            };
        }
    }

    /**
     * Calculate interest for Direct Loan
     * FIXED RATE: 8% per month (96% per annum) for ALL users
     * @param {number} principal - Loan principal amount
     * @param {number} termMonths - Loan term in months
     * @returns {Object} Interest calculation details
     */
    calculateInterest(principal, termMonths) {
        // Simple interest: Principal × Rate × Time
        const monthlyInterest = principal * this.MONTHLY_INTEREST_RATE;
        const totalInterest = monthlyInterest * termMonths;
        const totalRepayment = principal + totalInterest;
        const monthlyPayment = totalRepayment / termMonths;
        
        return {
            principal: principal,
            monthlyInterestRate: this.MONTHLY_INTEREST_RATE * 100, // 8%
            annualInterestRate: this.ANNUAL_INTEREST_RATE * 100,   // 96%
            termMonths: termMonths,
            monthlyInterest: Math.round(monthlyInterest * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            totalRepayment: Math.round(totalRepayment * 100) / 100,
            monthlyPayment: Math.round(monthlyPayment * 100) / 100
        };
    }

    /**
     * Calculate fixed finance fee (for short-term loans < 1 month)
     * FIXED RATE: 8% of principal
     * @param {number} amount - Loan amount
     * @returns {number} Fixed fee (8%)
     */
    calculateFixedFee(amount) {
        // 8% fixed fee for all users (same as 1 month interest)
        return Math.round(amount * this.MONTHLY_INTEREST_RATE * 100) / 100;
    }

    /**
     * Calculate APR for disclosure
     * @param {number} principal - Loan principal
     * @param {number} fee - Fixed fee
     * @param {number} days - Loan duration in days
     * @returns {number} APR percentage
     */
    calculateAPR(principal, fee, days) {
        const costPercentage = (fee / principal) * 100;
        const apr = costPercentage * (365 / days);
        return Math.round(apr * 100) / 100; // Round to 2 decimals
    }

    /**
     * Calculate maximum loan amount for Direct Lending
     * NOT TIED TO ZIMSCORE - Based on DTNI from payslip/bank statement only
     * @param {string} userId - User ID
     * @param {number} termDays - Loan term in days
     * @returns {Promise<Object>} Max loan details
     */
    async calculateMaxLoanAmount(userId, termDays = 90) {
        try {
            // RULE CHECK: Is user eligible? (no arrears, not suspended/banned)
            const eligibilityCheck = await this.checkUserEligibility(userId);
            if (!eligibilityCheck.eligible) {
                return {
                    success: false,
                    error: eligibilityCheck.message,
                    violations: eligibilityCheck.violations,
                    action: eligibilityCheck.violations[0]?.rule?.action
                };
            }

            // First check if user has all required documents
            const docCheck = await this.checkRequiredDocuments(userId);
            if (!docCheck.eligible) {
                return { 
                    success: false, 
                    error: 'Missing required documents',
                    missingDocuments: docCheck.missingDocuments,
                    message: docCheck.message
                };
            }

            // Get user's employment details (from payslip/profile)
            const { data: employment, error: empError } = await supabase
                .from('employment_details')
                .select('monthly_income, employment_type, existing_monthly_payments')
                .eq('user_id', userId)
                .single();

            if (empError || !employment) {
                return { success: false, error: 'Employment details not found. Please complete your profile.' };
            }

            const netSalary = parseFloat(employment.monthly_income) || 0;
            if (netSalary <= 0) {
                return { success: false, error: 'Monthly income not set. Please update your employment details.' };
            }

            const employmentType = (employment.employment_type || 'private').toLowerCase();
            const existingDebt = parseFloat(employment.existing_monthly_payments) || 0;

            // Get DTNI config for employment type
            const dtniConfig = this.DTNI_CONFIG[employmentType] || this.DTNI_CONFIG.private;
            
            // Calculate DTNI-based limit
            const maxInstallment = netSalary * dtniConfig.ratio;
            const availableInstallment = Math.max(0, maxInstallment - existingDebt);
            
            // Calculate max loan based on what user can afford to repay
            // Using 8% monthly interest rate
            const termMonths = Math.ceil(termDays / 30);
            const monthlyInterestRate = this.MONTHLY_INTEREST_RATE;
            
            // Max loan = Available Installment × Term / (1 + Interest Rate × Term)
            // This ensures monthly payment doesn't exceed available installment
            const totalInterestMultiplier = 1 + (monthlyInterestRate * termMonths);
            let dtniBasedLimit = (availableInstallment * termMonths) / totalInterestMultiplier;
            
            // Round down and cap at ceiling
            dtniBasedLimit = Math.floor(dtniBasedLimit);
            const finalMaxLoan = Math.min(dtniBasedLimit, this.MAX_LOAN_CEILING);

            console.log(`💰 Direct Loan Max Calculation (NOT TIED TO ZIMSCORE):`);
            console.log(`   Employment: ${employmentType} (${dtniConfig.ratio * 100}% DTNI)`);
            console.log(`   Net Salary: $${netSalary}`);
            console.log(`   Max Installment: $${maxInstallment.toFixed(2)}`);
            console.log(`   Existing Debt: $${existingDebt}`);
            console.log(`   Available: $${availableInstallment.toFixed(2)}`);
            console.log(`   DTNI-based Limit: $${dtniBasedLimit}`);
            console.log(`   Final Max: $${finalMaxLoan}`);

            return {
                success: true,
                maxLoanAmount: finalMaxLoan,
                dtniBasedLimit: dtniBasedLimit,
                employmentType: employmentType,
                netSalary: netSalary,
                dtniRatio: dtniConfig.ratio,
                maxInstallment: maxInstallment,
                availableInstallment: availableInstallment,
                maxTenureMonths: dtniConfig.maxTenureMonths,
                documentsVerified: true,
                message: `Your maximum Direct Loan amount is $${finalMaxLoan} based on your income.`
            };
        } catch (error) {
            console.error('Error calculating max loan:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a guaranteed loan offer for user
     * NOT TIED TO ZIMSCORE - Anyone with required documents can apply
     * @param {string} userId - User ID
     * @param {number} amount - Requested amount (optional, uses max if not provided)
     * @param {number} durationDays - Loan duration (default: 30)
     * @returns {Promise<Object>} Offer details
     */
    async createOffer(userId, amount = null, durationDays = this.DEFAULT_LOAN_DURATION_DAYS) {
        try {
            console.log(`💰 Creating direct loan offer for user ${userId} (NOT TIED TO ZIMSCORE)`);

            // Calculate max loan amount (checks documents and DTNI)
            const maxLoanResult = await this.calculateMaxLoanAmount(userId, durationDays);
            
            if (!maxLoanResult.success) {
                return {
                    success: false,
                    error: maxLoanResult.error,
                    missingDocuments: maxLoanResult.missingDocuments,
                    message: maxLoanResult.message
                };
            }

            // Use max loan amount if no amount specified
            const offerAmount = amount || maxLoanResult.maxLoanAmount;

            // Validate amount doesn't exceed max
            if (offerAmount > maxLoanResult.maxLoanAmount) {
                return {
                    success: false,
                    error: `Amount exceeds maximum loan limit of $${maxLoanResult.maxLoanAmount}`,
                    maxLoanAmount: maxLoanResult.maxLoanAmount
                };
            }

            // Validate minimum amount
            if (offerAmount < 50) {
                return {
                    success: false,
                    error: 'Minimum loan amount is $50'
                };
            }

            // Calculate interest - FIXED 8% per month (96% per annum)
            const termMonths = Math.ceil(durationDays / 30);
            const interestCalc = this.calculateInterest(offerAmount, termMonths);
            
            // For short-term loans (< 30 days), use fixed fee
            const isShortTerm = durationDays <= 30;
            const totalInterest = isShortTerm ? this.calculateFixedFee(offerAmount) : interestCalc.totalInterest;
            const totalRepayment = offerAmount + totalInterest;

            // Create offer using database function
            const { data: offerId, error: offerError } = await supabase.rpc('create_direct_loan_offer', {
                p_borrower_user_id: userId,
                p_amount: offerAmount,
                p_fee: totalInterest,
                p_duration_days: durationDays
            });

            if (offerError) throw offerError;

            // Calculate expiry time
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + this.OFFER_EXPIRY_HOURS);

            console.log(`✅ Direct loan offer: $${offerAmount} @ 8%/month × ${termMonths} months = $${totalInterest} interest`);
            console.log(`   Total Repayment: $${totalRepayment} | APR: 96%`);

            return {
                success: true,
                offer: {
                    offerId,
                    principalAmount: offerAmount,
                    interestAmount: totalInterest,
                    totalRepayment: totalRepayment,
                    monthlyInterestRate: 8, // 8% per month
                    annualInterestRate: 96, // 96% per annum
                    termMonths: termMonths,
                    durationDays: durationDays,
                    monthlyPayment: isShortTerm ? totalRepayment : interestCalc.monthlyPayment,
                    expiresAt: expiresAt.toISOString(),
                    maxLoanAmount: maxLoanResult.maxLoanAmount,
                    coldStartActive: false, // NO COLD START in Direct Lending
                    employmentType: maxLoanResult.employmentType,
                    dtniRatio: maxLoanResult.dtniRatio
                }
            };
        } catch (error) {
            console.error('❌ Error creating direct loan offer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get pending offer for user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Pending offer or null
     */
    async getPendingOffer(userId) {
        try {
            const { data, error } = await supabase
                .from('v_pending_direct_offers')
                .select('*')
                .eq('borrower_user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error

            return data;
        } catch (error) {
            console.error('❌ Error getting pending offer:', error);
            return null;
        }
    }

    /**
     * Accept direct loan offer with e-signature
     * @param {string} offerId - Offer ID
     * @param {string} signatureName - Full legal name
     * @param {string} ipAddress - User's IP address
     * @returns {Promise<Object>} Accepted loan details
     */
    async acceptOffer(offerId, signatureName, ipAddress) {
        try {
            console.log(`✍️ User accepting direct loan offer ${offerId}`);

            // Validate signature name
            if (!signatureName || signatureName.trim().length < 3) {
                throw new Error('Valid full name required for e-signature');
            }

            // Accept offer using database function
            const { data: directLoanId, error } = await supabase.rpc('accept_direct_loan_offer', {
                p_offer_id: offerId,
                p_signature_name: signatureName.trim(),
                p_signature_ip: ipAddress
            });

            if (error) throw error;

            console.log(`✅ Offer accepted. Direct loan created: ${directLoanId}`);

            // Get loan details
            const { data: loan, error: loanError } = await supabase
                .from('direct_loans')
                .select('*')
                .eq('direct_loan_id', directLoanId)
                .single();

            if (loanError) throw loanError;

            return {
                success: true,
                directLoanId,
                loan: {
                    principalAmount: loan.principal_amount,
                    fixedFinanceFee: loan.fixed_finance_fee,
                    totalRepayment: loan.total_repayment_amount,
                    apr: loan.apr,
                    dueDate: loan.due_date,
                    status: loan.status
                }
            };
        } catch (error) {
            console.error('❌ Error accepting offer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Disburse direct loan to borrower's Wallet 1
     * @param {string} directLoanId - Direct loan ID
     * @returns {Promise<Object>} Disbursement result
     */
    async disburseLoan(directLoanId) {
        try {
            console.log(`💸 Disbursing direct loan ${directLoanId}`);

            // Disburse using database function
            const { data, error } = await supabase.rpc('disburse_direct_loan', {
                p_direct_loan_id: directLoanId
            });

            if (error) throw error;

            console.log(`✅ Direct loan disbursed successfully`);

            return {
                success: true,
                message: 'Funds disbursed to your Cash Balance (Wallet 1)'
            };
        } catch (error) {
            console.error('❌ Error disbursing loan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Record repayment for direct loan
     * @param {string} directLoanId - Direct loan ID
     * @param {number} amount - Repayment amount
     * @param {string} paymentMethod - Payment method
     * @param {string} transactionRef - Transaction reference
     * @returns {Promise<Object>} Result
     */
    async recordRepayment(directLoanId, amount, paymentMethod, transactionRef) {
        try {
            console.log(`💰 Recording repayment of $${amount} for direct loan ${directLoanId}`);

            // Get loan details
            const { data: loan, error: loanError } = await supabase
                .from('direct_loans')
                .select('*')
                .eq('direct_loan_id', directLoanId)
                .single();

            if (loanError) throw loanError;

            // Record repayment
            const { data: repayment, error: repaymentError } = await supabase
                .from('direct_loan_repayments')
                .insert({
                    direct_loan_id: directLoanId,
                    amount: amount,
                    payment_method: paymentMethod,
                    transaction_reference: transactionRef,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .select()
                .single();

            if (repaymentError) throw repaymentError;

            // Update loan amount paid
            const newAmountPaid = parseFloat(loan.amount_paid) + parseFloat(amount);
            const isFullyPaid = newAmountPaid >= parseFloat(loan.total_repayment_amount);

            const { error: updateError } = await supabase
                .from('direct_loans')
                .update({
                    amount_paid: newAmountPaid,
                    status: isFullyPaid ? 'repaid' : loan.status,
                    repaid_at: isFullyPaid ? new Date().toISOString() : null
                })
                .eq('direct_loan_id', directLoanId);

            if (updateError) throw updateError;

            console.log(`✅ Repayment recorded. ${isFullyPaid ? 'Loan fully repaid!' : 'Partial payment received'}`);

            return {
                success: true,
                amountPaid: newAmountPaid,
                remainingBalance: parseFloat(loan.total_repayment_amount) - newAmountPaid,
                fullyPaid: isFullyPaid
            };
        } catch (error) {
            console.error('❌ Error recording repayment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get direct loan details
     * @param {string} directLoanId - Direct loan ID
     * @returns {Promise<Object>} Loan details
     */
    async getLoanDetails(directLoanId) {
        try {
            const { data, error } = await supabase
                .from('direct_loans')
                .select(`
                    *,
                    borrower:borrower_user_id(full_name, phone_number),
                    repayments:direct_loan_repayments(*)
                `)
                .eq('direct_loan_id', directLoanId)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('❌ Error getting loan details:', error);
            return null;
        }
    }

    /**
     * Get user's direct loan history
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Loan history
     */
    async getUserLoans(userId) {
        try {
            const { data, error } = await supabase
                .from('direct_loans')
                .select('*')
                .eq('borrower_user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('❌ Error getting user loans:', error);
            return [];
        }
    }

    /**
     * Expire old pending offers (cron job)
     * @returns {Promise<number>} Number of expired offers
     */
    async expireOldOffers() {
        try {
            console.log('🔄 Expiring old direct loan offers...');

            const { data, error } = await supabase
                .from('direct_loan_offers')
                .update({ status: 'expired' })
                .eq('status', 'pending')
                .lt('expires_at', new Date().toISOString())
                .select('offer_id');

            if (error) throw error;

            const count = data?.length || 0;
            console.log(`✅ Expired ${count} old offers`);

            return count;
        } catch (error) {
            console.error('❌ Error expiring offers:', error);
            return 0;
        }
    }

    /**
     * Check and mark late loans (cron job)
     * @returns {Promise<number>} Number of loans marked late
     */
    async checkLateLoans() {
        try {
            console.log('🔄 Checking for late direct loans...');

            const { error } = await supabase.rpc('check_direct_loan_late_status');

            if (error) throw error;

            console.log(`✅ Late loan check completed`);

            return true;
        } catch (error) {
            console.error('❌ Error checking late loans:', error);
            return false;
        }
    }
}

module.exports = new DirectLoanService();

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
        
        // NO COLD START in Direct Lending
        // Users get full DTNI-based limit immediately
        this.COLD_START_ENABLED = false;
        
        // SINGLE FIXED INTEREST RATE FOR ALL USERS
        // 8% per month = 96% per annum
        this.MONTHLY_INTEREST_RATE = 0.08;  // 8% per month
        this.ANNUAL_INTEREST_RATE = 0.96;   // 96% per annum (8% × 12)
        
        // DTNI Configuration (same for all employment types in Direct)
        this.DTNI_CONFIG = {
            government: { ratio: 0.40, maxTenureMonths: 24 },
            private: { ratio: 0.33, maxTenureMonths: 12 },
            business: { ratio: 0.33, maxTenureMonths: 12 },
            informal: { ratio: 0.33, maxTenureMonths: 12 }
        };
        
        // Maximum loan ceiling
        this.MAX_LOAN_CEILING = 3000;
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
     * Calculate maximum loan amount for Direct Lending (NO COLD START)
     * Uses DTNI calculation without any cold start caps
     * @param {string} userId - User ID
     * @param {number} termDays - Loan term in days
     * @returns {Promise<Object>} Max loan details
     */
    async calculateMaxLoanAmount(userId, termDays = 90) {
        try {
            // Get user's employment details
            const { data: employment, error: empError } = await supabase
                .from('employment_details')
                .select('monthly_income, employment_type, existing_monthly_payments')
                .eq('user_id', userId)
                .single();

            if (empError || !employment) {
                return { success: false, error: 'Employment details not found' };
            }

            // Get user's ZimScore
            const { data: zimScore, error: scoreError } = await supabase
                .from('user_zimscores')
                .select('score_value, score_based_limit')
                .eq('user_id', userId)
                .single();

            const netSalary = parseFloat(employment.monthly_income) || 0;
            const employmentType = (employment.employment_type || 'private').toLowerCase();
            const existingDebt = parseFloat(employment.existing_monthly_payments) || 0;

            // Get DTNI config for employment type
            const dtniConfig = this.DTNI_CONFIG[employmentType] || this.DTNI_CONFIG.private;
            
            // Calculate DTNI-based limit (NO COLD START CAP)
            const maxInstallment = netSalary * dtniConfig.ratio;
            const availableInstallment = Math.max(0, maxInstallment - existingDebt);
            
            // Calculate max loan using reducing balance method
            const annualRate = 0.05; // 5% annual
            const monthlyRate = annualRate / 12;
            const termMonths = Math.ceil(termDays / 30);
            
            let dtniBasedLimit;
            if (monthlyRate > 0 && termMonths > 0) {
                const powerTerm = Math.pow(1 + monthlyRate, termMonths);
                dtniBasedLimit = (availableInstallment * (powerTerm - 1)) / (monthlyRate * powerTerm);
            } else {
                dtniBasedLimit = availableInstallment * termMonths;
            }

            // Get ZimScore-based limit
            const scoreBasedLimit = zimScore?.score_based_limit || this.getScoreBasedLimit(zimScore?.score_value || 30);
            
            // Final max = min(DTNI, ZimScore limit, Ceiling)
            // NO COLD START CAP APPLIED
            const finalMaxLoan = Math.min(
                Math.floor(dtniBasedLimit),
                scoreBasedLimit,
                this.MAX_LOAN_CEILING
            );

            console.log(`💰 Direct Loan Max Calculation (NO COLD START):`);
            console.log(`   Employment: ${employmentType} (${dtniConfig.ratio * 100}% DTNI)`);
            console.log(`   Net Salary: $${netSalary}`);
            console.log(`   DTNI-based: $${Math.floor(dtniBasedLimit)}`);
            console.log(`   Score-based: $${scoreBasedLimit}`);
            console.log(`   Final Max: $${finalMaxLoan}`);

            return {
                success: true,
                maxLoanAmount: finalMaxLoan,
                dtniBasedLimit: Math.floor(dtniBasedLimit),
                scoreBasedLimit: scoreBasedLimit,
                employmentType: employmentType,
                dtniRatio: dtniConfig.ratio,
                maxTenureMonths: dtniConfig.maxTenureMonths,
                coldStartActive: false, // ALWAYS false for Direct Lending
                message: `Your maximum Direct Loan amount is $${finalMaxLoan} based on your income and ZimScore.`
            };
        } catch (error) {
            console.error('Error calculating max loan:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get score-based loan limit
     * @param {number} scoreValue - ZimScore (30-85)
     * @returns {number} Max loan amount
     */
    getScoreBasedLimit(scoreValue) {
        if (scoreValue >= 80) return 3000;
        if (scoreValue >= 70) return 2000;
        if (scoreValue >= 60) return 1500;
        if (scoreValue >= 50) return 1000;
        if (scoreValue >= 40) return 500;
        return 100;
    }

    /**
     * Create a guaranteed loan offer for user
     * NO COLD START - Users get full DTNI-based limit immediately
     * @param {string} userId - User ID
     * @param {number} amount - Requested amount (optional, uses max if not provided)
     * @param {number} durationDays - Loan duration (default: 30)
     * @returns {Promise<Object>} Offer details
     */
    async createOffer(userId, amount = null, durationDays = this.DEFAULT_LOAN_DURATION_DAYS) {
        try {
            console.log(`💰 Creating direct loan offer for user ${userId} (NO COLD START)`);

            // Calculate max loan amount (NO COLD START)
            const maxLoanResult = await this.calculateMaxLoanAmount(userId, durationDays);
            
            if (!maxLoanResult.success) {
                throw new Error(maxLoanResult.error || 'Could not calculate max loan amount');
            }

            // Get user's ZimScore
            const { data: zimScore, error: scoreError } = await supabase
                .from('user_zimscores')
                .select('score_value')
                .eq('user_id', userId)
                .single();

            if (scoreError || !zimScore) {
                throw new Error('User does not have a ZimScore yet. Complete KYC first.');
            }

            // Use max loan amount if no amount specified
            const offerAmount = amount || maxLoanResult.maxLoanAmount;

            // Validate amount doesn't exceed max
            if (offerAmount > maxLoanResult.maxLoanAmount) {
                throw new Error(`Amount exceeds maximum loan limit of $${maxLoanResult.maxLoanAmount}`);
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
                    zimScore: zimScore.score_value,
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

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Direct Loan Service
 * Manages "ZimCrowd Direct" guaranteed instant funding
 * Alternative to P2P marketplace - funded by ZimCrowd Capital
 */
class DirectLoanService {
    constructor() {
        this.OFFER_EXPIRY_HOURS = 24;
        this.DEFAULT_LOAN_DURATION_DAYS = 30;
        
        // Fee structure based on ZimScore
        this.FEE_TIERS = [
            { minScore: 90, feePercentage: 5 },   // Excellent: 5%
            { minScore: 80, feePercentage: 6 },   // Great: 6%
            { minScore: 70, feePercentage: 7 },   // Good: 7%
            { minScore: 60, feePercentage: 8 },   // Fair: 8%
            { minScore: 50, feePercentage: 9 },   // Building: 9%
            { minScore: 40, feePercentage: 10 },  // Early: 10%
            { minScore: 0, feePercentage: 12 }    // New: 12%
        ];
    }

    /**
     * Calculate fixed finance fee based on amount and ZimScore
     * @param {number} amount - Loan amount
     * @param {number} zimScore - User's ZimScore
     * @returns {number} Fixed fee
     */
    calculateFixedFee(amount, zimScore) {
        // Find appropriate fee tier
        const tier = this.FEE_TIERS.find(t => zimScore >= t.minScore);
        const feePercentage = tier ? tier.feePercentage : 12;
        
        return (amount * feePercentage) / 100;
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
     * Create a guaranteed loan offer for user
     * @param {string} userId - User ID
     * @param {number} amount - Requested amount (optional, uses max if not provided)
     * @param {number} durationDays - Loan duration (default: 30)
     * @returns {Promise<Object>} Offer details
     */
    async createOffer(userId, amount = null, durationDays = this.DEFAULT_LOAN_DURATION_DAYS) {
        try {
            console.log(`💰 Creating direct loan offer for user ${userId}`);

            // Get user's ZimScore and max loan amount
            const { data: zimScore, error: scoreError } = await supabase
                .from('user_zimscores')
                .select('score_value, max_loan_amount')
                .eq('user_id', userId)
                .single();

            if (scoreError) throw scoreError;

            if (!zimScore) {
                throw new Error('User does not have a ZimScore yet');
            }

            // Use max loan amount if no amount specified
            const offerAmount = amount || zimScore.max_loan_amount;

            // Validate amount doesn't exceed max
            if (offerAmount > zimScore.max_loan_amount) {
                throw new Error(`Amount exceeds maximum loan limit of $${zimScore.max_loan_amount}`);
            }

            // Calculate fee and totals
            const fixedFee = this.calculateFixedFee(offerAmount, zimScore.score_value);
            const totalRepayment = offerAmount + fixedFee;
            const apr = this.calculateAPR(offerAmount, fixedFee, durationDays);

            // Create offer using database function
            const { data: offerId, error: offerError } = await supabase.rpc('create_direct_loan_offer', {
                p_borrower_user_id: userId,
                p_amount: offerAmount,
                p_fee: fixedFee,
                p_duration_days: durationDays
            });

            if (offerError) throw offerError;

            // Calculate expiry time
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + this.OFFER_EXPIRY_HOURS);

            console.log(`✅ Direct loan offer created: $${offerAmount} + $${fixedFee} fee (${apr}% APR)`);

            return {
                success: true,
                offer: {
                    offerId,
                    principalAmount: offerAmount,
                    fixedFinanceFee: fixedFee,
                    totalRepayment: totalRepayment,
                    apr: apr,
                    durationDays: durationDays,
                    expiresAt: expiresAt.toISOString(),
                    zimScore: zimScore.score_value
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

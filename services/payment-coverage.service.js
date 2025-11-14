const { createClient } = require('@supabase/supabase-js');
const creditLedgerService = require('./credit-ledger.service');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Payment Coverage Service
 * Manages the Payment Coverage Offer system for late loan installments
 * 
 * When a borrower misses a payment:
 * 1. System creates a coverage offer for the lender
 * 2. Lender can accept credits instead of waiting for cash
 * 3. Credits go to lender's Wallet 2 (non-withdrawable)
 * 4. Installment marked as "covered_by_platform"
 * 5. Credits stay in ecosystem (can fund new loans)
 */
class PaymentCoverageService {
    constructor() {
        this.OFFER_EXPIRY_DAYS = 180; // 6 months
        this.COVERAGE_PERCENTAGE_BASE = 80; // Start at 80%
        this.COVERAGE_DECAY_RATE = 2; // Decrease 2% per day late
        this.MIN_COVERAGE_PERCENTAGE = 50; // Minimum 50%
    }

    /**
     * Calculate coverage percentage based on days late
     * Formula: 80% - (2% × days_late), minimum 50%
     * @param {number} daysLate - Number of days late
     * @returns {number} Coverage percentage
     */
    calculateCoveragePercentage(daysLate) {
        const percentage = this.COVERAGE_PERCENTAGE_BASE - (this.COVERAGE_DECAY_RATE * daysLate);
        return Math.max(percentage, this.MIN_COVERAGE_PERCENTAGE);
    }

    /**
     * Create payment coverage offer for late installment
     * @param {string} repaymentId - Repayment schedule ID
     * @param {string} loanId - Loan ID
     * @param {string} lenderUserId - Lender user ID
     * @param {string} borrowerUserId - Borrower user ID
     * @param {number} amountDue - Original amount due
     * @param {number} daysLate - Number of days late
     * @returns {Promise<Object>} Created offer
     */
    async createOffer(repaymentId, loanId, lenderUserId, borrowerUserId, amountDue, daysLate) {
        try {
            console.log(`🎯 Creating payment coverage offer for repayment ${repaymentId}`);

            // Check if offer already exists
            const { data: existingOffer } = await supabase
                .from('payment_coverage_offers')
                .select('offer_id')
                .eq('repayment_id', repaymentId)
                .eq('status', 'pending')
                .single();

            if (existingOffer) {
                console.log('⚠️ Offer already exists for this repayment');
                return {
                    success: false,
                    error: 'Offer already exists'
                };
            }

            // Calculate coverage percentage and amount
            const coveragePercentage = this.calculateCoveragePercentage(daysLate);
            const offerAmountCredits = (amountDue * coveragePercentage) / 100;

            // Calculate expiry date
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + this.OFFER_EXPIRY_DAYS);

            // Create offer
            const { data: offer, error } = await supabase
                .from('payment_coverage_offers')
                .insert({
                    repayment_id: repaymentId,
                    loan_id: loanId,
                    lender_user_id: lenderUserId,
                    borrower_user_id: borrowerUserId,
                    original_amount_due: amountDue,
                    offer_amount_credits: offerAmountCredits,
                    coverage_percentage: coveragePercentage,
                    days_late: daysLate,
                    expires_at: expiresAt.toISOString(),
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Payment coverage offer created: ${offerAmountCredits} credits (${coveragePercentage}%)`);

            return {
                success: true,
                offer: {
                    offerId: offer.offer_id,
                    amountDue,
                    offerAmountCredits,
                    coveragePercentage,
                    daysLate,
                    expiresAt: offer.expires_at
                }
            };
        } catch (error) {
            console.error('❌ Error creating payment coverage offer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Accept payment coverage offer
     * @param {string} offerId - Offer ID
     * @param {string} lenderUserId - Lender user ID (for verification)
     * @returns {Promise<Object>} Result
     */
    async acceptOffer(offerId, lenderUserId) {
        try {
            console.log(`✅ Lender ${lenderUserId} accepting offer ${offerId}`);

            // Get offer details
            const { data: offer, error: offerError } = await supabase
                .from('payment_coverage_offers')
                .select('*')
                .eq('offer_id', offerId)
                .eq('lender_user_id', lenderUserId)
                .single();

            if (offerError) throw offerError;

            if (!offer) {
                throw new Error('Offer not found or not authorized');
            }

            if (offer.status !== 'pending') {
                throw new Error(`Offer already ${offer.status}`);
            }

            if (new Date(offer.expires_at) < new Date()) {
                throw new Error('Offer has expired');
            }

            // Start transaction
            // 1. Add credits to lender's Wallet 2
            const creditResult = await creditLedgerService.addCredits(
                lenderUserId,
                offer.offer_amount_credits,
                creditLedgerService.CREDIT_TYPES.PAYMENT_COVERAGE,
                offer.repayment_id,
                `Payment coverage for late installment (${offer.coverage_percentage}%)`
            );

            if (!creditResult.success) {
                throw new Error('Failed to add credits to lender');
            }

            // 2. Update offer status
            const { error: updateOfferError } = await supabase
                .from('payment_coverage_offers')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString()
                })
                .eq('offer_id', offerId);

            if (updateOfferError) throw updateOfferError;

            // 3. Update repayment schedule status
            const { error: updateRepaymentError } = await supabase
                .from('loan_repayment_schedule')
                .update({
                    status: 'covered_by_platform',
                    paid_amount: offer.offer_amount_credits,
                    paid_at: new Date().toISOString()
                })
                .eq('repayment_id', offer.repayment_id);

            if (updateRepaymentError) throw updateRepaymentError;

            console.log(`✅ Offer accepted successfully. Lender received ${offer.offer_amount_credits} credits`);

            return {
                success: true,
                creditsReceived: offer.offer_amount_credits,
                coveragePercentage: offer.coverage_percentage,
                newCreditBalance: creditResult.newBalance
            };
        } catch (error) {
            console.error('❌ Error accepting payment coverage offer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Decline payment coverage offer
     * @param {string} offerId - Offer ID
     * @param {string} lenderUserId - Lender user ID (for verification)
     * @returns {Promise<Object>} Result
     */
    async declineOffer(offerId, lenderUserId) {
        try {
            console.log(`❌ Lender ${lenderUserId} declining offer ${offerId}`);

            // Verify offer belongs to lender
            const { data: offer, error: offerError } = await supabase
                .from('payment_coverage_offers')
                .select('offer_id, status')
                .eq('offer_id', offerId)
                .eq('lender_user_id', lenderUserId)
                .single();

            if (offerError) throw offerError;

            if (!offer) {
                throw new Error('Offer not found or not authorized');
            }

            if (offer.status !== 'pending') {
                throw new Error(`Offer already ${offer.status}`);
            }

            // Update offer status
            const { error: updateError } = await supabase
                .from('payment_coverage_offers')
                .update({
                    status: 'declined'
                })
                .eq('offer_id', offerId);

            if (updateError) throw updateError;

            console.log(`✅ Offer declined successfully`);

            return {
                success: true,
                message: 'Offer declined. You will wait for borrower payment.'
            };
        } catch (error) {
            console.error('❌ Error declining payment coverage offer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get pending offers for lender
     * @param {string} lenderUserId - Lender user ID
     * @returns {Promise<Array>} Pending offers
     */
    async getPendingOffers(lenderUserId) {
        try {
            const { data, error } = await supabase
                .from('v_pending_coverage_offers')
                .select('*')
                .eq('lender_user_id', lenderUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('❌ Error getting pending offers:', error);
            return [];
        }
    }

    /**
     * Get offer details
     * @param {string} offerId - Offer ID
     * @returns {Promise<Object>} Offer details
     */
    async getOfferDetails(offerId) {
        try {
            const { data, error } = await supabase
                .from('payment_coverage_offers')
                .select(`
                    *,
                    lender:lender_user_id(full_name, phone_number),
                    borrower:borrower_user_id(full_name, phone_number),
                    repayment:loan_repayment_schedule(
                        installment_number,
                        due_date,
                        amount_due
                    )
                `)
                .eq('offer_id', offerId)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('❌ Error getting offer details:', error);
            return null;
        }
    }

    /**
     * Expire old pending offers
     * @returns {Promise<number>} Number of expired offers
     */
    async expireOldOffers() {
        try {
            console.log('🔄 Expiring old payment coverage offers...');

            const { data, error } = await supabase
                .from('payment_coverage_offers')
                .update({ status: 'expired' })
                .eq('status', 'pending')
                .lt('expires_at', new Date().toISOString())
                .select('offer_id');

            if (error) throw error;

            const count = data?.length || 0;
            console.log(`✅ Expired ${count} old offers`);

            return count;
        } catch (error) {
            console.error('❌ Error expiring old offers:', error);
            return 0;
        }
    }

    /**
     * Check and create offers for late payments
     * @returns {Promise<number>} Number of offers created
     */
    async checkAndCreateOffersForLatePayments() {
        try {
            console.log('🔄 Checking for late payments to create coverage offers...');

            // Get all late payments without pending offers
            const { data: latePayments, error } = await supabase
                .from('loan_repayment_schedule')
                .select(`
                    repayment_id,
                    loan_id,
                    amount_due,
                    due_date,
                    days_late,
                    loan:zimscore_loans(
                        lender_user_id,
                        borrower_user_id
                    )
                `)
                .eq('status', 'late');

            if (error) throw error;

            let offersCreated = 0;

            for (const payment of latePayments) {
                // Check if offer already exists
                const { data: existingOffer } = await supabase
                    .from('payment_coverage_offers')
                    .select('offer_id')
                    .eq('repayment_id', payment.repayment_id)
                    .eq('status', 'pending')
                    .single();

                if (!existingOffer) {
                    const result = await this.createOffer(
                        payment.repayment_id,
                        payment.loan_id,
                        payment.loan.lender_user_id,
                        payment.loan.borrower_user_id,
                        payment.amount_due,
                        payment.days_late
                    );

                    if (result.success) {
                        offersCreated++;
                    }
                }
            }

            console.log(`✅ Created ${offersCreated} new payment coverage offers`);

            return offersCreated;
        } catch (error) {
            console.error('❌ Error checking late payments:', error);
            return 0;
        }
    }
}

module.exports = new PaymentCoverageService();

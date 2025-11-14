const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Referral Credit Service
 * Manages credit balances, usage, and transactions
 */
class ReferralCreditService {
    
    constructor() {
        // Usage priority order
        this.USAGE_PRIORITY = [
            'late_fees',
            'processing_fees',
            'platform_services',
            'other_fees'
        ];
        
        // Maximum credit usage per transaction
        this.MAX_CREDIT_PER_TRANSACTION = 200.00;
        
        // Minimum payment threshold
        this.MIN_PAYMENT_THRESHOLD = 5.00;
    }
    
    /**
     * Get user's available credits
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Available credits
     */
    async getAvailableCredits(userId) {
        try {
            const { data: credits, error } = await supabase
                .from('referral_credits')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .gt('remaining_amount', 0)
                .gte('expiry_date', new Date().toISOString())
                .order('expiry_date', { ascending: true }); // Use oldest first
            
            if (error) throw error;
            
            const totalAvailable = credits?.reduce((sum, c) => sum + parseFloat(c.remaining_amount), 0) || 0;
            
            return {
                success: true,
                totalAvailable,
                credits: credits || []
            };
        } catch (error) {
            console.error('❌ Error getting available credits:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Apply credits to a transaction
     * @param {string} userId - User ID
     * @param {number} transactionAmount - Transaction amount
     * @param {string} transactionType - Type of transaction
     * @param {string} transactionId - Transaction ID
     * @returns {Promise<Object>} Credit application result
     */
    async applyCredits(userId, transactionAmount, transactionType, transactionId) {
        try {
            // Validate minimum threshold
            if (transactionAmount < this.MIN_PAYMENT_THRESHOLD) {
                return {
                    success: false,
                    error: `Minimum transaction amount is $${this.MIN_PAYMENT_THRESHOLD}`
                };
            }
            
            // Get available credits
            const { credits, totalAvailable } = await this.getAvailableCredits(userId);
            
            if (totalAvailable === 0) {
                return {
                    success: true,
                    creditsApplied: 0,
                    remainingAmount: transactionAmount,
                    message: 'No credits available'
                };
            }
            
            // Calculate applicable amount (max per transaction limit)
            const maxApplicable = Math.min(transactionAmount, this.MAX_CREDIT_PER_TRANSACTION, totalAvailable);
            
            let remainingToApply = maxApplicable;
            const appliedCredits = [];
            
            // Apply credits in order (oldest first)
            for (const credit of credits) {
                if (remainingToApply <= 0) break;
                
                const creditRemaining = parseFloat(credit.remaining_amount);
                const amountToUse = Math.min(remainingToApply, creditRemaining);
                
                // Update credit
                const newUsedAmount = parseFloat(credit.used_amount) + amountToUse;
                const newRemainingAmount = creditRemaining - amountToUse;
                const newStatus = newRemainingAmount <= 0 ? 'used' : 'active';
                
                await supabase
                    .from('referral_credits')
                    .update({
                        used_amount: newUsedAmount,
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', credit.id);
                
                // Log transaction
                await supabase
                    .from('credit_transactions')
                    .insert({
                        user_id: userId,
                        credit_id: credit.id,
                        transaction_type: 'used',
                        amount: amountToUse,
                        applied_to_type: transactionType,
                        applied_to_id: transactionId,
                        description: `Credit applied to ${transactionType}`
                    });
                
                appliedCredits.push({
                    creditId: credit.id,
                    amountUsed: amountToUse,
                    creditType: credit.credit_type
                });
                
                remainingToApply -= amountToUse;
            }
            
            const totalApplied = maxApplicable - remainingToApply;
            const remainingAmount = transactionAmount - totalApplied;
            
            console.log(`💳 Credits applied: $${totalApplied} to ${transactionType} for user ${userId}`);
            
            return {
                success: true,
                creditsApplied: totalApplied,
                remainingAmount,
                appliedCredits,
                message: `$${totalApplied.toFixed(2)} in credits applied`
            };
        } catch (error) {
            console.error('❌ Error applying credits:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get credit transaction history
     * @param {string} userId - User ID
     * @param {number} limit - Number of transactions to retrieve
     * @returns {Promise<Object>} Transaction history
     */
    async getTransactionHistory(userId, limit = 50) {
        try {
            const { data: transactions, error } = await supabase
                .from('credit_transactions')
                .select(`
                    *,
                    referral_credits (
                        credit_type,
                        credit_amount
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            
            return {
                success: true,
                transactions: transactions || []
            };
        } catch (error) {
            console.error('❌ Error getting transaction history:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Auto-expire credits
     * Run this as a daily cron job
     * @returns {Promise<Object>} Expiration result
     */
    async autoExpireCredits() {
        try {
            const now = new Date().toISOString();
            
            // Get expired credits
            const { data: expiredCredits } = await supabase
                .from('referral_credits')
                .select('*')
                .eq('status', 'active')
                .lt('expiry_date', now);
            
            if (!expiredCredits || expiredCredits.length === 0) {
                return {
                    success: true,
                    expiredCount: 0,
                    message: 'No credits to expire'
                };
            }
            
            // Update expired credits
            const { error } = await supabase
                .from('referral_credits')
                .update({
                    status: 'expired',
                    is_expired: true,
                    expired_at: now,
                    updated_at: now
                })
                .eq('status', 'active')
                .lt('expiry_date', now);
            
            if (error) throw error;
            
            // Log expiration transactions
            for (const credit of expiredCredits) {
                await supabase
                    .from('credit_transactions')
                    .insert({
                        user_id: credit.user_id,
                        credit_id: credit.id,
                        transaction_type: 'expired',
                        amount: parseFloat(credit.remaining_amount),
                        description: 'Credit expired'
                    });
            }
            
            console.log(`⏰ Expired ${expiredCredits.length} credits`);
            
            return {
                success: true,
                expiredCount: expiredCredits.length,
                expiredCredits
            };
        } catch (error) {
            console.error('❌ Error expiring credits:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Send expiration warnings
     * @param {number} daysBeforeExpiry - Days before expiry to warn
     * @returns {Promise<Object>} Warning result
     */
    async sendExpirationWarnings(daysBeforeExpiry = 7) {
        try {
            const warningDate = new Date();
            warningDate.setDate(warningDate.getDate() + daysBeforeExpiry);
            
            const { data: expiringCredits } = await supabase
                .from('referral_credits')
                .select(`
                    *,
                    users (
                        id,
                        email,
                        first_name
                    )
                `)
                .eq('status', 'active')
                .gt('remaining_amount', 0)
                .lte('expiry_date', warningDate.toISOString())
                .gte('expiry_date', new Date().toISOString());
            
            if (!expiringCredits || expiringCredits.length === 0) {
                return {
                    success: true,
                    warningsSent: 0,
                    message: 'No credits expiring soon'
                };
            }
            
            // Group by user
            const userCredits = {};
            for (const credit of expiringCredits) {
                if (!userCredits[credit.user_id]) {
                    userCredits[credit.user_id] = {
                        user: credit.users,
                        credits: [],
                        totalExpiring: 0
                    };
                }
                userCredits[credit.user_id].credits.push(credit);
                userCredits[credit.user_id].totalExpiring += parseFloat(credit.remaining_amount);
            }
            
            // Send notifications (implement notification service)
            const notifications = [];
            for (const userId in userCredits) {
                const userData = userCredits[userId];
                notifications.push({
                    userId,
                    email: userData.user.email,
                    firstName: userData.user.first_name,
                    totalExpiring: userData.totalExpiring,
                    expiryDate: userData.credits[0].expiry_date,
                    daysRemaining: daysBeforeExpiry
                });
            }
            
            console.log(`📧 ${notifications.length} expiration warnings to send`);
            
            return {
                success: true,
                warningsSent: notifications.length,
                notifications
            };
        } catch (error) {
            console.error('❌ Error sending expiration warnings:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get credit balance summary
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Balance summary
     */
    async getBalanceSummary(userId) {
        try {
            const { data: credits } = await supabase
                .from('referral_credits')
                .select('*')
                .eq('user_id', userId);
            
            const summary = {
                totalEarned: 0,
                totalUsed: 0,
                totalAvailable: 0,
                totalExpired: 0,
                activeCredits: 0,
                expiringSoon: 0, // Within 30 days
                byType: {}
            };
            
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            for (const credit of credits || []) {
                const amount = parseFloat(credit.credit_amount);
                const used = parseFloat(credit.used_amount);
                const remaining = parseFloat(credit.remaining_amount);
                
                summary.totalEarned += amount;
                summary.totalUsed += used;
                
                if (credit.status === 'active') {
                    summary.totalAvailable += remaining;
                    summary.activeCredits++;
                    
                    if (new Date(credit.expiry_date) <= thirtyDaysFromNow) {
                        summary.expiringSoon += remaining;
                    }
                } else if (credit.status === 'expired') {
                    summary.totalExpired += remaining;
                }
                
                // By type
                if (!summary.byType[credit.credit_type]) {
                    summary.byType[credit.credit_type] = {
                        earned: 0,
                        used: 0,
                        available: 0
                    };
                }
                summary.byType[credit.credit_type].earned += amount;
                summary.byType[credit.credit_type].used += used;
                if (credit.status === 'active') {
                    summary.byType[credit.credit_type].available += remaining;
                }
            }
            
            return {
                success: true,
                summary
            };
        } catch (error) {
            console.error('❌ Error getting balance summary:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Refund credit (if transaction is cancelled)
     * @param {string} transactionId - Credit transaction ID
     * @returns {Promise<Object>} Refund result
     */
    async refundCredit(transactionId) {
        try {
            // Get transaction
            const { data: transaction } = await supabase
                .from('credit_transactions')
                .select('*')
                .eq('id', transactionId)
                .eq('transaction_type', 'used')
                .single();
            
            if (!transaction) {
                return {
                    success: false,
                    error: 'Transaction not found or already refunded'
                };
            }
            
            // Get credit
            const { data: credit } = await supabase
                .from('referral_credits')
                .select('*')
                .eq('id', transaction.credit_id)
                .single();
            
            if (!credit) {
                return {
                    success: false,
                    error: 'Credit not found'
                };
            }
            
            // Refund amount
            const refundAmount = parseFloat(transaction.amount);
            const newUsedAmount = parseFloat(credit.used_amount) - refundAmount;
            const newStatus = credit.is_expired ? 'expired' : 'active';
            
            // Update credit
            await supabase
                .from('referral_credits')
                .update({
                    used_amount: newUsedAmount,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', credit.id);
            
            // Log refund transaction
            await supabase
                .from('credit_transactions')
                .insert({
                    user_id: transaction.user_id,
                    credit_id: credit.id,
                    transaction_type: 'refunded',
                    amount: refundAmount,
                    description: `Refund for transaction ${transactionId}`
                });
            
            console.log(`↩️ Credit refunded: $${refundAmount} to user ${transaction.user_id}`);
            
            return {
                success: true,
                refundAmount,
                message: 'Credit refunded successfully'
            };
        } catch (error) {
            console.error('❌ Error refunding credit:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ReferralCreditService;

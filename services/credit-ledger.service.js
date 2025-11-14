const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Credit Ledger Service
 * Manages Wallet 2: Non-withdrawable in-app currency (ZimCrowd Credits)
 * 
 * Credits can be:
 * - Earned (signup bonus, referrals, payment coverage acceptance)
 * - Spent (platform fees, funding loans)
 * - NOT withdrawn (stays in the ecosystem)
 */
class CreditLedgerService {
    constructor() {
        this.CREDIT_TYPES = {
            SIGNUP_BONUS: 'SIGNUP_BONUS',
            REFERRAL_BONUS: 'REFERRAL_BONUS',
            PAYMENT_COVERAGE: 'PAYMENT_COVERAGE',
            FEE_PAYMENT: 'FEE_PAYMENT',
            LOAN_FUNDING: 'LOAN_FUNDING',
            ADMIN_ADJUSTMENT: 'ADMIN_ADJUSTMENT'
        };
    }

    /**
     * Add credits to user's Wallet 2
     * @param {string} userId - User ID
     * @param {number} amount - Amount to add (positive)
     * @param {string} type - Credit type
     * @param {string} referenceId - Optional reference (loan_id, offer_id, etc.)
     * @param {string} notes - Optional notes
     * @returns {Promise<Object>} Updated balance and transaction
     */
    async addCredits(userId, amount, type, referenceId = null, notes = null) {
        try {
            console.log(`💳 Adding ${amount} credits to user ${userId} (${type})`);

            // Validate amount
            if (amount <= 0) {
                throw new Error('Amount must be positive');
            }

            // Validate type
            if (!Object.values(this.CREDIT_TYPES).includes(type)) {
                throw new Error(`Invalid credit type: ${type}`);
            }

            // Call database function to add credits
            const { data, error } = await supabase.rpc('add_credits', {
                p_user_id: userId,
                p_amount: amount,
                p_type: type,
                p_reference_id: referenceId,
                p_notes: notes
            });

            if (error) throw error;

            console.log(`✅ Credits added successfully. New balance: ${data}`);

            return {
                success: true,
                newBalance: data,
                amount,
                type
            };
        } catch (error) {
            console.error('❌ Error adding credits:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deduct credits from user's Wallet 2
     * @param {string} userId - User ID
     * @param {number} amount - Amount to deduct (positive)
     * @param {string} type - Credit type
     * @param {string} referenceId - Optional reference
     * @param {string} notes - Optional notes
     * @returns {Promise<Object>} Updated balance and transaction
     */
    async deductCredits(userId, amount, type, referenceId = null, notes = null) {
        try {
            console.log(`💳 Deducting ${amount} credits from user ${userId} (${type})`);

            // Validate amount
            if (amount <= 0) {
                throw new Error('Amount must be positive');
            }

            // Validate type
            if (!Object.values(this.CREDIT_TYPES).includes(type)) {
                throw new Error(`Invalid credit type: ${type}`);
            }

            // Call database function to deduct credits
            const { data, error } = await supabase.rpc('deduct_credits', {
                p_user_id: userId,
                p_amount: amount,
                p_type: type,
                p_reference_id: referenceId,
                p_notes: notes
            });

            if (error) throw error;

            console.log(`✅ Credits deducted successfully. New balance: ${data}`);

            return {
                success: true,
                newBalance: data,
                amount,
                type
            };
        } catch (error) {
            console.error('❌ Error deducting credits:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user's credit balance
     * @param {string} userId - User ID
     * @returns {Promise<number>} Credit balance
     */
    async getBalance(userId) {
        try {
            const { data, error } = await supabase
                .from('zimscore_users')
                .select('non_withdrawable_credit')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            return data.non_withdrawable_credit || 0;
        } catch (error) {
            console.error('❌ Error getting credit balance:', error);
            return 0;
        }
    }

    /**
     * Get credit transaction history
     * @param {string} userId - User ID
     * @param {number} limit - Number of records to fetch
     * @returns {Promise<Array>} Transaction history
     */
    async getHistory(userId, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('credit_ledger')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('❌ Error getting credit history:', error);
            return [];
        }
    }

    /**
     * Award signup bonus to new user
     * @param {string} userId - User ID
     * @param {number} bonusAmount - Bonus amount (default: 25)
     * @returns {Promise<Object>} Result
     */
    async awardSignupBonus(userId, bonusAmount = 25.00) {
        try {
            console.log(`🎁 Awarding signup bonus of ${bonusAmount} to user ${userId}`);

            // Check if user already received signup bonus
            const { data: existingBonus } = await supabase
                .from('credit_ledger')
                .select('ledger_id')
                .eq('user_id', userId)
                .eq('type', this.CREDIT_TYPES.SIGNUP_BONUS)
                .single();

            if (existingBonus) {
                console.log('⚠️ User already received signup bonus');
                return {
                    success: false,
                    error: 'Signup bonus already awarded'
                };
            }

            // Award bonus
            const result = await this.addCredits(
                userId,
                bonusAmount,
                this.CREDIT_TYPES.SIGNUP_BONUS,
                null,
                'Welcome bonus for new user'
            );

            if (result.success) {
                console.log(`✅ Signup bonus awarded: ${bonusAmount} credits`);
            }

            return result;
        } catch (error) {
            console.error('❌ Error awarding signup bonus:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Award referral bonus
     * @param {string} referrerId - User who referred
     * @param {string} referredUserId - User who was referred
     * @param {number} bonusAmount - Bonus amount (default: 10)
     * @returns {Promise<Object>} Result
     */
    async awardReferralBonus(referrerId, referredUserId, bonusAmount = 10.00) {
        try {
            console.log(`🎁 Awarding referral bonus of ${bonusAmount} to user ${referrerId}`);

            const result = await this.addCredits(
                referrerId,
                bonusAmount,
                this.CREDIT_TYPES.REFERRAL_BONUS,
                referredUserId,
                `Referral bonus for referring user ${referredUserId}`
            );

            if (result.success) {
                console.log(`✅ Referral bonus awarded: ${bonusAmount} credits`);
            }

            return result;
        } catch (error) {
            console.error('❌ Error awarding referral bonus:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if user has sufficient credits
     * @param {string} userId - User ID
     * @param {number} requiredAmount - Required amount
     * @returns {Promise<boolean>} True if sufficient
     */
    async hasSufficientCredits(userId, requiredAmount) {
        try {
            const balance = await this.getBalance(userId);
            return balance >= requiredAmount;
        } catch (error) {
            console.error('❌ Error checking credit balance:', error);
            return false;
        }
    }

    /**
     * Get credit statistics for user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Statistics
     */
    async getStatistics(userId) {
        try {
            const { data, error } = await supabase
                .from('credit_ledger')
                .select('amount, type')
                .eq('user_id', userId);

            if (error) throw error;

            const stats = {
                totalEarned: 0,
                totalSpent: 0,
                byType: {}
            };

            data.forEach(transaction => {
                if (transaction.amount > 0) {
                    stats.totalEarned += parseFloat(transaction.amount);
                } else {
                    stats.totalSpent += Math.abs(parseFloat(transaction.amount));
                }

                if (!stats.byType[transaction.type]) {
                    stats.byType[transaction.type] = 0;
                }
                stats.byType[transaction.type] += parseFloat(transaction.amount);
            });

            const currentBalance = await this.getBalance(userId);
            stats.currentBalance = currentBalance;
            stats.netEarnings = stats.totalEarned - stats.totalSpent;

            return stats;
        } catch (error) {
            console.error('❌ Error getting credit statistics:', error);
            return null;
        }
    }
}

module.exports = new CreditLedgerService();

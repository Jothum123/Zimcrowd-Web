/**
 * Referral Hooks Service
 * 
 * Integration hooks to automatically trigger referral credits
 * when users complete qualifying activities.
 * 
 * USAGE: Import and call these hooks from your existing services:
 * 
 * // In loan.service.js when loan is disbursed:
 * await ReferralHooks.onFirstLoanReceived(userId);
 * 
 * // In loan.service.js when loan is fully repaid:
 * await ReferralHooks.onFirstLoanRepaid(userId);
 * 
 * // In investment.service.js when user funds a loan:
 * await ReferralHooks.onFirstLoanFunded(userId);
 * 
 * // In investment.service.js when user makes investment:
 * await ReferralHooks.onFirstInvestment(userId);
 */

const { supabase } = require('./supabase-client');
const ReferralAutomationService = require('./referral-automation.service');

class ReferralHooksService {
    
    constructor() {
        this.automation = new ReferralAutomationService();
    }
    
    /**
     * Check if this is user's first time completing an activity
     */
    async isFirstActivity(userId, activityType) {
        try {
            const { data: existing } = await supabase
                .from('user_milestones')
                .select('id')
                .eq('user_id', userId)
                .eq('milestone_type', activityType)
                .single();
            
            return !existing;
        } catch (error) {
            // If table doesn't exist or error, assume it's first
            return true;
        }
    }
    
    /**
     * Record milestone completion
     */
    async recordMilestone(userId, activityType) {
        try {
            await supabase
                .from('user_milestones')
                .insert({
                    user_id: userId,
                    milestone_type: activityType,
                    completed_at: new Date().toISOString()
                });
        } catch (error) {
            console.error('Error recording milestone:', error);
        }
    }
    
    /**
     * Hook: Called when user receives their first loan
     * Triggers: Advocate earns credit, Friend earns credit (in loan currency)
     * @param {string} userId - User ID
     * @param {string} currency - Loan currency (USD or ZWG)
     */
    async onFirstLoanReceived(userId, currency = 'USD') {
        try {
            console.log(`🎯 Hook: First loan received for user ${userId} in ${currency}`);
            
            // Check if this is actually their first loan
            const isFirst = await this.isFirstActivity(userId, 'first_loan');
            if (!isFirst) {
                console.log('ℹ️ Not first loan, skipping referral credit');
                return { success: true, skipped: true };
            }
            
            // Record milestone
            await this.recordMilestone(userId, 'first_loan');
            
            // Process referral credit in the loan's currency
            const result = await this.automation.processQualifyingActivity(userId, 'first_loan', currency);
            
            console.log(`✅ First loan hook completed for ${userId}`);
            return result;
        } catch (error) {
            console.error('❌ Error in onFirstLoanReceived hook:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Hook: Called when user repays their first loan
     * Triggers: Advocate earns credit (in loan currency)
     * @param {string} userId - User ID
     * @param {string} currency - Loan currency (USD or ZWG)
     */
    async onFirstLoanRepaid(userId, currency = 'USD') {
        try {
            console.log(`🎯 Hook: First loan repaid for user ${userId} in ${currency}`);
            
            const isFirst = await this.isFirstActivity(userId, 'loan_repaid');
            if (!isFirst) {
                console.log('ℹ️ Not first loan repayment, skipping referral credit');
                return { success: true, skipped: true };
            }
            
            await this.recordMilestone(userId, 'loan_repaid');
            
            const result = await this.automation.processQualifyingActivity(userId, 'loan_repaid', currency);
            
            console.log(`✅ First loan repaid hook completed for ${userId}`);
            return result;
        } catch (error) {
            console.error('❌ Error in onFirstLoanRepaid hook:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Hook: Called when user funds their first loan (as lender)
     * Triggers: Advocate earns credit, Friend earns credit (in loan currency)
     * @param {string} userId - User ID
     * @param {string} currency - Loan currency (USD or ZWG)
     */
    async onFirstLoanFunded(userId, currency = 'USD') {
        try {
            console.log(`🎯 Hook: First loan funded for user ${userId} in ${currency}`);
            
            const isFirst = await this.isFirstActivity(userId, 'first_funding');
            if (!isFirst) {
                console.log('ℹ️ Not first funding, skipping referral credit');
                return { success: true, skipped: true };
            }
            
            await this.recordMilestone(userId, 'first_funding');
            
            const result = await this.automation.processQualifyingActivity(userId, 'first_funding', currency);
            
            console.log(`✅ First funding hook completed for ${userId}`);
            return result;
        } catch (error) {
            console.error('❌ Error in onFirstLoanFunded hook:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Hook: Called when user makes their first investment
     * Triggers: Advocate earns credit, Friend earns credit (in investment currency)
     * @param {string} userId - User ID
     * @param {string} currency - Investment currency (USD or ZWG)
     */
    async onFirstInvestment(userId, currency = 'USD') {
        try {
            console.log(`🎯 Hook: First investment for user ${userId} in ${currency}`);
            
            const isFirst = await this.isFirstActivity(userId, 'first_investment');
            if (!isFirst) {
                console.log('ℹ️ Not first investment, skipping referral credit');
                return { success: true, skipped: true };
            }
            
            await this.recordMilestone(userId, 'first_investment');
            
            const result = await this.automation.processQualifyingActivity(userId, 'first_investment', currency);
            
            console.log(`✅ First investment hook completed for ${userId}`);
            return result;
        } catch (error) {
            console.error('❌ Error in onFirstInvestment hook:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Hook: Called when new user signs up with referral code
     * Records the referral relationship
     */
    async onUserSignup(userId, referralCode) {
        try {
            if (!referralCode) {
                return { success: true, skipped: true, message: 'No referral code' };
            }
            
            console.log(`🎯 Hook: User signup with referral code ${referralCode}`);
            
            const result = await this.automation.processReferralSignup(userId, referralCode);
            
            console.log(`✅ Signup hook completed for ${userId}`);
            return result;
        } catch (error) {
            console.error('❌ Error in onUserSignup hook:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
const referralHooks = new ReferralHooksService();

module.exports = {
    ReferralHooksService,
    referralHooks,
    // Convenience exports for direct use (with currency support)
    onFirstLoanReceived: (userId, currency = 'USD') => referralHooks.onFirstLoanReceived(userId, currency),
    onFirstLoanRepaid: (userId, currency = 'USD') => referralHooks.onFirstLoanRepaid(userId, currency),
    onFirstLoanFunded: (userId, currency = 'USD') => referralHooks.onFirstLoanFunded(userId, currency),
    onFirstInvestment: (userId, currency = 'USD') => referralHooks.onFirstInvestment(userId, currency),
    onUserSignup: (userId, referralCode) => referralHooks.onUserSignup(userId, referralCode)
};

/**
 * ZimScore Service
 * Core logic for calculating and updating ZimScore
 * Score Range: 30-85 (internal) | 1.0-5.0 stars (public)
 */

const { supabase } = require('../utils/supabase-auth');

class ZimScoreService {
    constructor() {
        // Score configuration
        this.MIN_SCORE = 30;
        this.MAX_SCORE = 85;
        this.DEFAULT_SCORE = 30;
        
        // Score factor weights
        this.WEIGHTS = {
            // Cold Start factors (from financial statements)
            INITIAL_INCOME_HIGH: 15,      // Monthly income > $500
            INITIAL_INCOME_MEDIUM: 10,    // Monthly income $200-$500
            INITIAL_INCOME_LOW: 5,        // Monthly income < $200
            INITIAL_BALANCE_HIGH: 10,     // Avg balance > $200
            INITIAL_BALANCE_MEDIUM: 6,    // Avg balance $50-$200
            INITIAL_BALANCE_LOW: 2,       // Avg balance < $50
            NO_NSF_EVENTS: 5,             // No insufficient funds
            FEW_NSF_EVENTS: -3,           // 1-3 NSF events
            MANY_NSF_EVENTS: -8,          // 4+ NSF events
            
            // Trust Loop factors (from loan repayment behavior)
            LOAN_REPAID_ON_TIME: 3,       // Each loan repaid on time
            LOAN_REPAID_EARLY: 5,         // Loan repaid before due date
            LOAN_REPAID_LATE_1_7_DAYS: -2,   // Late by 1-7 days
            LOAN_REPAID_LATE_8_30_DAYS: -5,  // Late by 8-30 days
            LOAN_REPAID_LATE_30_PLUS: -10,   // Late by 30+ days
            LOAN_DEFAULTED: -15,          // Loan defaulted
            ACTIVE_LOAN_BONUS: 2,         // Has active loan (trust building)
            MULTIPLE_LOANS_BONUS: 5       // Successfully completed 3+ loans
        };
    }

    /**
     * Calculate initial "Cold Start" ZimScore from financial documents
     * @param {string} userId - User ID
     * @param {Object} financialData - Parsed financial statement data
     * @returns {Promise<Object>} Calculated score
     */
    async calculateColdStartScore(userId, financialData) {
        console.log(`🎯 Calculating Cold Start ZimScore for user ${userId}...`);
        
        try {
            let score = this.DEFAULT_SCORE;
            const factors = {};

            // Factor 1: Monthly Income
            const income = financialData.avgMonthlyIncome || 0;
            if (income > 500) {
                score += this.WEIGHTS.INITIAL_INCOME_HIGH;
                factors.initial_income = this.WEIGHTS.INITIAL_INCOME_HIGH;
            } else if (income >= 200) {
                score += this.WEIGHTS.INITIAL_INCOME_MEDIUM;
                factors.initial_income = this.WEIGHTS.INITIAL_INCOME_MEDIUM;
            } else if (income > 0) {
                score += this.WEIGHTS.INITIAL_INCOME_LOW;
                factors.initial_income = this.WEIGHTS.INITIAL_INCOME_LOW;
            }

            // Factor 2: Average Balance
            const balance = financialData.avgEndingBalance || 0;
            if (balance > 200) {
                score += this.WEIGHTS.INITIAL_BALANCE_HIGH;
                factors.initial_balance = this.WEIGHTS.INITIAL_BALANCE_HIGH;
            } else if (balance >= 50) {
                score += this.WEIGHTS.INITIAL_BALANCE_MEDIUM;
                factors.initial_balance = this.WEIGHTS.INITIAL_BALANCE_MEDIUM;
            } else if (balance > 0) {
                score += this.WEIGHTS.INITIAL_BALANCE_LOW;
                factors.initial_balance = this.WEIGHTS.INITIAL_BALANCE_LOW;
            }

            // Factor 3: NSF Events (Non-Sufficient Funds)
            const nsfEvents = financialData.nsfEvents || 0;
            if (nsfEvents === 0) {
                score += this.WEIGHTS.NO_NSF_EVENTS;
                factors.nsf_events = this.WEIGHTS.NO_NSF_EVENTS;
            } else if (nsfEvents <= 3) {
                score += this.WEIGHTS.FEW_NSF_EVENTS;
                factors.nsf_events = this.WEIGHTS.FEW_NSF_EVENTS;
            } else {
                score += this.WEIGHTS.MANY_NSF_EVENTS;
                factors.nsf_events = this.WEIGHTS.MANY_NSF_EVENTS;
            }

            // Clamp score to valid range
            score = Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, score));

            // Calculate star rating and max loan amount
            const starRating = this.calculateStarRating(score);
            const maxLoanAmount = this.calculateMaxLoanAmount(score);

            console.log(`✅ Cold Start Score: ${score}/85 (${starRating}⭐) - Max Loan: $${maxLoanAmount}`);

            // Save to database
            await this.saveZimScore(userId, {
                scoreValue: score,
                starRating,
                maxLoanAmount,
                factors,
                calculationMethod: 'cold_start'
            });

            // Record in history
            await this.recordScoreHistory(userId, {
                oldScoreValue: null,
                newScoreValue: score,
                oldStarRating: null,
                newStarRating: starRating,
                oldMaxLoanAmount: null,
                newMaxLoanAmount: maxLoanAmount,
                changeReason: 'initial_calculation',
                changeDetails: { financialData, factors }
            });

            return {
                success: true,
                scoreValue: score,
                starRating,
                maxLoanAmount,
                factors
            };
        } catch (error) {
            console.error('❌ Cold Start calculation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update ZimScore based on Trust Loop (loan repayment behavior)
     * @param {string} userId - User ID
     * @param {Object} loanEvent - Loan event data
     * @returns {Promise<Object>} Updated score
     */
    async updateScoreFromTrustLoop(userId, loanEvent) {
        console.log(`🔄 Updating ZimScore for user ${userId} from Trust Loop...`);
        
        try {
            // Get current score
            const { data: currentScore, error: scoreError } = await supabase
                .from('user_zimscores')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (scoreError || !currentScore) {
                console.error('No existing score found for user');
                return {
                    success: false,
                    error: 'User must complete Cold Start first'
                };
            }

            let scoreChange = 0;
            const factors = currentScore.score_factors || {};
            let changeReason = '';

            // Determine score change based on loan event
            switch (loanEvent.type) {
                case 'LOAN_REPAID_ON_TIME':
                    scoreChange = this.WEIGHTS.LOAN_REPAID_ON_TIME;
                    factors.loans_repaid_on_time = (factors.loans_repaid_on_time || 0) + scoreChange;
                    changeReason = 'loan_repaid_on_time';
                    break;

                case 'LOAN_REPAID_EARLY':
                    scoreChange = this.WEIGHTS.LOAN_REPAID_EARLY;
                    factors.loans_repaid_early = (factors.loans_repaid_early || 0) + scoreChange;
                    changeReason = 'loan_repaid_early';
                    break;

                case 'LOAN_REPAID_LATE':
                    const daysLate = loanEvent.daysLate || 0;
                    if (daysLate <= 7) {
                        scoreChange = this.WEIGHTS.LOAN_REPAID_LATE_1_7_DAYS;
                    } else if (daysLate <= 30) {
                        scoreChange = this.WEIGHTS.LOAN_REPAID_LATE_8_30_DAYS;
                    } else {
                        scoreChange = this.WEIGHTS.LOAN_REPAID_LATE_30_PLUS;
                    }
                    factors.late_payments = (factors.late_payments || 0) + scoreChange;
                    changeReason = `loan_repaid_late_${daysLate}_days`;
                    break;

                case 'LOAN_DEFAULTED':
                    scoreChange = this.WEIGHTS.LOAN_DEFAULTED;
                    factors.defaults = (factors.defaults || 0) + scoreChange;
                    changeReason = 'loan_defaulted';
                    break;

                case 'LOAN_FUNDED':
                    // Small bonus for getting a loan (trust building)
                    scoreChange = this.WEIGHTS.ACTIVE_LOAN_BONUS;
                    factors.active_loans = (factors.active_loans || 0) + scoreChange;
                    changeReason = 'loan_funded';
                    break;
            }

            // Check for multiple loans bonus
            const { data: loanStats } = await supabase
                .rpc('get_user_loan_stats', { p_user_id: userId });

            if (loanStats && loanStats[0].repaid_on_time >= 3) {
                const multipleLoanBonus = this.WEIGHTS.MULTIPLE_LOANS_BONUS;
                if (!factors.multiple_loans_bonus) {
                    scoreChange += multipleLoanBonus;
                    factors.multiple_loans_bonus = multipleLoanBonus;
                }
            }

            // Calculate new score
            const newScore = Math.max(
                this.MIN_SCORE,
                Math.min(this.MAX_SCORE, currentScore.score_value + scoreChange)
            );

            const newStarRating = this.calculateStarRating(newScore);
            const newMaxLoanAmount = this.calculateMaxLoanAmount(newScore);

            console.log(`✅ Score updated: ${currentScore.score_value} -> ${newScore} (${scoreChange >= 0 ? '+' : ''}${scoreChange})`);

            // Update in database
            await this.saveZimScore(userId, {
                scoreValue: newScore,
                starRating: newStarRating,
                maxLoanAmount: newMaxLoanAmount,
                factors,
                calculationMethod: 'trust_loop'
            });

            // Record in history
            await this.recordScoreHistory(userId, {
                oldScoreValue: currentScore.score_value,
                newScoreValue: newScore,
                oldStarRating: currentScore.star_rating,
                newStarRating: newStarRating,
                oldMaxLoanAmount: currentScore.max_loan_amount,
                newMaxLoanAmount: newMaxLoanAmount,
                changeReason,
                changeDetails: loanEvent,
                relatedLoanId: loanEvent.loanId
            });

            return {
                success: true,
                oldScore: currentScore.score_value,
                newScore,
                scoreChange,
                starRating: newStarRating,
                maxLoanAmount: newMaxLoanAmount
            };
        } catch (error) {
            console.error('❌ Trust Loop update error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate star rating from internal score
     * @param {number} scoreValue - Internal score (30-85)
     * @returns {number} Star rating (1.0-5.0)
     */
    calculateStarRating(scoreValue) {
        // Linear mapping: 30 -> 1.0, 85 -> 5.0
        let starRating = 1.0 + ((scoreValue - 30) / 55) * 4.0;
        
        // Round to nearest 0.5
        starRating = Math.round(starRating * 2) / 2;
        
        // Clamp to valid range
        return Math.max(1.0, Math.min(5.0, starRating));
    }

    /**
     * Calculate maximum loan amount based on score
     * @param {number} scoreValue - Internal score (30-85)
     * @returns {number} Max loan amount in USD
     */
    calculateMaxLoanAmount(scoreValue) {
        // Tiered system
        if (scoreValue >= 75) return 1000.00;  // Excellent: $1000
        if (scoreValue >= 65) return 500.00;   // Good: $500
        if (scoreValue >= 55) return 250.00;   // Fair: $250
        if (scoreValue >= 45) return 100.00;   // Low: $100
        return 50.00;                          // Minimum: $50
    }

    /**
     * Save ZimScore to database
     * @private
     */
    async saveZimScore(userId, scoreData) {
        const { error } = await supabase
            .from('user_zimscores')
            .upsert({
                user_id: userId,
                score_value: scoreData.scoreValue,
                star_rating: scoreData.starRating,
                max_loan_amount: scoreData.maxLoanAmount,
                score_factors: scoreData.factors,
                calculation_method: scoreData.calculationMethod,
                last_calculated: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            });

        if (error) {
            console.error('Error saving ZimScore:', error);
            throw error;
        }
    }

    /**
     * Record score change in history
     * @private
     */
    async recordScoreHistory(userId, historyData) {
        const { error } = await supabase
            .from('zimscore_history')
            .insert({
                user_id: userId,
                old_score_value: historyData.oldScoreValue,
                new_score_value: historyData.newScoreValue,
                old_star_rating: historyData.oldStarRating,
                new_star_rating: historyData.newStarRating,
                old_max_loan_amount: historyData.oldMaxLoanAmount,
                new_max_loan_amount: historyData.newMaxLoanAmount,
                change_reason: historyData.changeReason,
                change_details: historyData.changeDetails,
                related_loan_id: historyData.relatedLoanId
            });

        if (error) {
            console.error('Error recording score history:', error);
            // Don't throw - history is not critical
        }
    }

    /**
     * Get user's current ZimScore
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Current score
     */
    async getUserScore(userId) {
        const { data, error } = await supabase
            .from('user_zimscores')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            data
        };
    }

    /**
     * Get user's score history
     * @param {string} userId - User ID
     * @param {number} limit - Number of records to return
     * @returns {Promise<Object>} Score history
     */
    async getUserScoreHistory(userId, limit = 10) {
        const { data, error } = await supabase
            .from('zimscore_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: true,
            data
        };
    }
}

// Singleton instance
let zimScoreServiceInstance = null;

function getZimScoreService() {
    if (!zimScoreServiceInstance) {
        zimScoreServiceInstance = new ZimScoreService();
    }
    return zimScoreServiceInstance;
}

module.exports = {
    ZimScoreService,
    getZimScoreService
};

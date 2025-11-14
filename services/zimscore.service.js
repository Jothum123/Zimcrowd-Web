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
        this.MAX_SCORE = 99;  // Updated from 85 to match spec
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

            // Factor 1: Cash Flow Ratio (Primary Factor - SPEC REQUIREMENT)
            // This replaces simple income check with income/expense ratio
            const cashFlowRatio = financialData.cashFlowRatio || 0;
            if (cashFlowRatio >= 1.2) {
                score += 20; // Strong positive cash flow
                factors.cash_flow_ratio = 20;
            } else if (cashFlowRatio >= 1.0) {
                score += 15; // Healthy cash flow
                factors.cash_flow_ratio = 15;
            } else if (cashFlowRatio >= 0.8) {
                score += 10; // Moderate cash flow
                factors.cash_flow_ratio = 10;
            } else if (cashFlowRatio >= 0.6) {
                score += 5; // Minimal positive cash flow
                factors.cash_flow_ratio = 5;
            } else if (cashFlowRatio > 0) {
                score += 0; // Negative cash flow - no points
                factors.cash_flow_ratio = 0;
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

            // Factor 3: Balance Consistency (SPEC REQUIREMENT)
            const balanceConsistency = financialData.balanceConsistencyScore || 0;
            if (balanceConsistency >= 7) {
                score += 5; // High consistency
                factors.balance_consistency = 5;
            } else if (balanceConsistency >= 4) {
                score += 3; // Moderate consistency
                factors.balance_consistency = 3;
            } else if (balanceConsistency > 0) {
                score += 1; // Low consistency
                factors.balance_consistency = 1;
            }

            // Factor 4: NSF Events (Non-Sufficient Funds)
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

            // Calculate star rating, max loan amount, and reputation level
            const starRating = this.calculateStarRating(score);
            const maxLoanAmount = this.calculateMaxLoanAmount(score);
            const riskLevel = this.getRiskLevel(score);

            console.log(`✅ Cold Start Score: ${score}/99 (${starRating}⭐) - Reputation: ${riskLevel} - Max Loan: $${maxLoanAmount}`);

            // Save to database
            await this.saveZimScore(userId, {
                scoreValue: score,
                starRating,
                maxLoanAmount,
                riskLevel,
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
                riskLevel,
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

            // Calculate on-time payment rate and apply tiered bonuses
            const paymentStats = await this.calculateOnTimePaymentRate(userId);
            if (paymentStats.hasLoanHistory) {
                const rate = paymentStats.onTimeRate;
                let rateBonus = 0;
                
                if (rate >= 95) rateBonus = 25;
                else if (rate >= 90) rateBonus = 20;
                else if (rate >= 80) rateBonus = 15;
                else if (rate >= 70) rateBonus = 10;
                else if (rate >= 60) rateBonus = 5;
                else rateBonus = -10; // Penalty for <60%
                
                // Only apply if not already applied
                if (!factors.on_time_rate_bonus) {
                    scoreChange += rateBonus;
                    factors.on_time_rate_bonus = rateBonus;
                    factors.on_time_rate = rate;
                }
            } else {
                // No loan history penalty
                if (!factors.no_loan_history_penalty) {
                    scoreChange -= 10;
                    factors.no_loan_history_penalty = -10;
                }
            }

            // Progressive borrowing bonus
            const progressiveBonus = await this.calculateProgressiveBorrowingBonus(userId);
            if (progressiveBonus > 0 && !factors.progressive_borrowing_bonus) {
                scoreChange += progressiveBonus;
                factors.progressive_borrowing_bonus = progressiveBonus;
            }

            // Platform tenure bonus
            const tenureBonus = await this.calculatePlatformTenureBonus(userId);
            if (tenureBonus > 0 && !factors.platform_tenure_bonus) {
                scoreChange += tenureBonus;
                factors.platform_tenure_bonus = tenureBonus;
            }

            // Check for multiple loans bonus (3+ loans)
            if (paymentStats.totalLoans >= 3) {
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
            const newRiskLevel = this.getRiskLevel(newScore);

            console.log(`✅ Score updated: ${currentScore.score_value} -> ${newScore} (${scoreChange >= 0 ? '+' : ''}${scoreChange}) - Reputation: ${newRiskLevel}`);

            // Update in database
            await this.saveZimScore(userId, {
                scoreValue: newScore,
                starRating: newStarRating,
                maxLoanAmount: newMaxLoanAmount,
                riskLevel: newRiskLevel,
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
                maxLoanAmount: newMaxLoanAmount,
                riskLevel: newRiskLevel
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
     * @param {number} scoreValue - Internal score (30-99)
     * @returns {number} Star rating (1.0-5.0)
     */
    calculateStarRating(scoreValue) {
        // Linear mapping: 30 -> 1.0, 99 -> 5.0
        let starRating = 1.0 + ((scoreValue - 30) / 69) * 4.0;
        
        // Round to nearest 0.5
        starRating = Math.round(starRating * 2) / 2;
        
        // Clamp to valid range
        return Math.max(1.0, Math.min(5.0, starRating));
    }

    /**
     * Calculate maximum loan amount based on score
     * Reputation-based system: Everyone starts at $50, builds up through on-time repayments
     * @param {number} scoreValue - Internal score (30-99)
     * @returns {number} Max loan amount in USD
     */
    calculateMaxLoanAmount(scoreValue) {
        // Reputation-based tier system
        if (scoreValue >= 90) return 1000.00;  // Excellent reputation
        if (scoreValue >= 80) return 800.00;   // Great reputation
        if (scoreValue >= 70) return 600.00;   // Good reputation
        if (scoreValue >= 60) return 400.00;   // Fair reputation
        if (scoreValue >= 50) return 300.00;   // Building reputation
        if (scoreValue >= 40) return 200.00;   // Early reputation
        if (scoreValue >= 35) return 100.00;   // Starting reputation
        return 50.00;                          // Cold start - everyone starts here
    }

    /**
     * Get reputation level classification based on score
     * @param {number} scoreValue - Internal score (30-99)
     * @returns {string} Reputation level
     */
    getRiskLevel(scoreValue) {
        if (scoreValue >= 90) return 'Excellent';
        if (scoreValue >= 80) return 'Great';
        if (scoreValue >= 70) return 'Good';
        if (scoreValue >= 60) return 'Fair';
        if (scoreValue >= 50) return 'Building';
        if (scoreValue >= 40) return 'Early';
        return 'New';
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
                risk_level: scoreData.riskLevel,
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
     * Calculate on-time payment rate for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Payment statistics
     */
    async calculateOnTimePaymentRate(userId) {
        try {
            const { data: loans, error } = await supabase
                .from('zimscore_loans')
                .select('status, is_on_time, due_date, repaid_at')
                .eq('borrower_user_id', userId)
                .in('status', ['repaid']);

            if (error) throw error;

            if (!loans || loans.length === 0) {
                return {
                    totalLoans: 0,
                    onTimeLoans: 0,
                    lateLoans: 0,
                    onTimeRate: 0,
                    hasLoanHistory: false
                };
            }

            const onTimeLoans = loans.filter(l => l.is_on_time).length;
            const lateLoans = loans.length - onTimeLoans;
            const onTimeRate = (onTimeLoans / loans.length) * 100;

            return {
                totalLoans: loans.length,
                onTimeLoans,
                lateLoans,
                onTimeRate: Math.round(onTimeRate * 100) / 100,
                hasLoanHistory: true
            };
        } catch (error) {
            console.error('Error calculating on-time rate:', error);
            return {
                totalLoans: 0,
                onTimeLoans: 0,
                lateLoans: 0,
                onTimeRate: 0,
                hasLoanHistory: false
            };
        }
    }

    /**
     * Calculate progressive borrowing bonus based on max loan repaid
     * @param {string} userId - User ID
     * @returns {Promise<number>} Bonus points
     */
    async calculateProgressiveBorrowingBonus(userId) {
        try {
            const { data: loans, error } = await supabase
                .from('zimscore_loans')
                .select('amount_requested')
                .eq('borrower_user_id', userId)
                .eq('status', 'repaid')
                .order('amount_requested', { ascending: false })
                .limit(1);

            if (error || !loans || loans.length === 0) {
                return 0;
            }

            const maxLoanRepaid = loans[0].amount_requested;

            // Progressive borrowing rewards (spec)
            if (maxLoanRepaid >= 800) return 10;
            if (maxLoanRepaid >= 600) return 8;
            if (maxLoanRepaid >= 400) return 6;
            if (maxLoanRepaid >= 200) return 4;
            if (maxLoanRepaid >= 100) return 2;
            return 0;
        } catch (error) {
            console.error('Error calculating progressive borrowing bonus:', error);
            return 0;
        }
    }

    /**
     * Calculate platform tenure bonus
     * @param {string} userId - User ID
     * @returns {Promise<number>} Bonus points
     */
    async calculatePlatformTenureBonus(userId) {
        try {
            const { data: user, error } = await supabase
                .from('zimscore_users')
                .select('created_at')
                .eq('user_id', userId)
                .single();

            if (error || !user) {
                return 0;
            }

            const createdDate = new Date(user.created_at);
            const now = new Date();
            const monthsActive = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24 * 30));

            // Platform tenure rewards (spec)
            if (monthsActive >= 24) return 4;
            if (monthsActive >= 12) return 3;
            if (monthsActive >= 6) return 2;
            if (monthsActive >= 3) return 1;
            return 0;
        } catch (error) {
            console.error('Error calculating platform tenure bonus:', error);
            return 0;
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

/**
 * ZimScore Service
 * Core logic for calculating and updating ZimScore
 * Score Range: 30-85 (internal) | 1.0-5.0 stars (public)
 */

const { supabase } = require('../utils/supabase-auth');

class ZimScoreService {
    constructor() {
        // Score configuration (SPEC: 30-85 range)
        this.MIN_SCORE = 30;
        this.MAX_SCORE = 85;  // Specification requirement
        this.DEFAULT_SCORE = 30;
        
        // Employment Type Bonuses (Component 2: 0-10 points)
        this.EMPLOYMENT_BONUS = {
            government: 10,    // Guaranteed salary, easy deduction at source
            private: 6,        // Formal employment with payroll
            business: 3,       // Self-employed but established
            informal: 0        // Irregular income
        };
        
        // Score factor weights
        this.WEIGHTS = {
            // Cold Start factors (from financial statements)
            INITIAL_INCOME_HIGH: 15,      // Monthly income > $500
            INITIAL_INCOME_MEDIUM: 10,    // Monthly income $200-$500
            INITIAL_INCOME_LOW: 5,        // Monthly income < $200
            INITIAL_BALANCE_HIGH: 10,     // Avg balance > $200
            INITIAL_BALANCE_MEDIUM: 6,    // Avg balance $50-$200
            INITIAL_BALANCE_LOW: 2,       // Avg balance < $50
            NO_NSF_EVENTS: 10,            // No insufficient funds (SPEC: 10 points)
            FEW_NSF_EVENTS: -3,           // 1-3 NSF events
            MANY_NSF_EVENTS: -8,          // 4+ NSF events
            
            // Trust Loop factors (from loan repayment behavior)
            LOAN_REPAID_ON_TIME: 3,       // Each loan repaid on time
            LOAN_REPAID_EARLY: 5,         // Loan repaid before due date
            LOAN_REPAID_LATE: -5,         // Late payment penalty (SPEC: -5 per, max -20)
            LOAN_DEFAULTED: -15,          // Loan defaulted
            ACTIVE_LOAN_BONUS: 2,         // Has active loan (trust building)
            MULTIPLE_LOANS_BONUS: 5       // Successfully completed 3+ loans
        };
    }

    /**
     * Calculate ZimScore for a user
     * @param {string} userId - User ID
     * @param {Object} data - User financial data
     * @returns {Promise<Object>} Calculated score
     */
    async calculateScore(userId, data = {}) {
        try {
            let score = this.DEFAULT_SCORE;
            const factors = {};

            // Basic income assessment
            const monthlyIncome = data.monthlyIncome || 0;
            if (monthlyIncome > 500) {
                score += this.WEIGHTS.INITIAL_INCOME_HIGH;
                factors.income_level = this.WEIGHTS.INITIAL_INCOME_HIGH;
            } else if (monthlyIncome > 200) {
                score += this.WEIGHTS.INITIAL_INCOME_MEDIUM;
                factors.income_level = this.WEIGHTS.INITIAL_INCOME_MEDIUM;
            } else if (monthlyIncome > 0) {
                score += this.WEIGHTS.INITIAL_INCOME_LOW;
                factors.income_level = this.WEIGHTS.INITIAL_INCOME_LOW;
            }

            // Employment type bonus
            const employmentType = data.employmentDetails?.type || 'informal';
            const employmentBonus = this.EMPLOYMENT_BONUS[employmentType] || 0;
            score += employmentBonus;
            factors.employment_bonus = employmentBonus;

            // Clamp score to valid range
            score = Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, score));

            // Calculate derived values
            const starRating = this.calculateStarRating(score);
            const maxLoanAmount = this.calculateMaxLoanAmount(score);
            const riskLevel = this.getRiskLevel(score);

            return {
                success: true,
                score: score,
                starRating: starRating,
                maxLoanAmount: maxLoanAmount,
                riskLevel: riskLevel,
                factors: factors
            };
        } catch (error) {
            console.error('ZimScore calculation error:', error);
            return {
                success: false,
                error: error.message,
                score: this.DEFAULT_SCORE
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
        // SPECIFICATION-COMPLIANT TIER SYSTEM (30-85 range)
        if (scoreValue >= 80) return 1000.00;  // Very Low Risk (80-85)
        if (scoreValue >= 70) return 800.00;   // Low Risk (70-79)
        if (scoreValue >= 60) return 600.00;   // Medium Risk (60-69)
        if (scoreValue >= 50) return 400.00;   // High Risk (50-59)
        if (scoreValue >= 40) return 300.00;   // Very High Risk (40-49)
        return 100.00;                         // Building Credit (30-39)
    }

    /**
     * Get risk level classification based on score
     * @param {number} scoreValue - Internal score (30-85)
     * @returns {string} Risk level
     */
    getRiskLevel(scoreValue) {
        // SPECIFICATION-COMPLIANT RISK LEVELS (30-85 range)
        if (scoreValue >= 80) return 'Very Low Risk';    // 80-85
        if (scoreValue >= 70) return 'Low Risk';         // 70-79
        if (scoreValue >= 60) return 'Medium Risk';      // 60-69
        if (scoreValue >= 50) return 'High Risk';        // 50-59
        if (scoreValue >= 40) return 'Very High Risk';   // 40-49
        return 'Building Credit';                        // 30-39
    }

    /**
     * Get user's current ZimScore
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Current score
     */
    async getUserScore(userId) {
        try {
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
        } catch (error) {
            console.error('Get user score error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ZimScoreService;
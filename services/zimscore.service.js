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

        // Cold Start Limits (DTNI-based)
        this.COLD_START_LIMITS = {
            government: {
                max: 300,      // Civil servants can get up to $300
                dtniMax: 0.40  // Max 40% DTNI for civil servants
            },
            other: {
                max: 100,      // Other employment types up to $100
                dtniMax: 0.33  // Max 33% DTNI for others
            }
        };

        // DTNI (Debt-to-Net-Income) Thresholds
        this.DTNI_THRESHOLDS = {
            excellent: 0.20,   // ≤20% DTNI: Full limit
            good: 0.30,        // ≤30% DTNI: 80% of limit
            fair: 0.40,        // ≤40% DTNI: 60% of limit (civil servants only)
            poor: 0.50         // >40% DTNI: Denied
        };

        // Loan Tenure Limits
        this.LOAN_TENURE = {
            coldStart: 90,              // Cold start: FIXED 3 months (90 days)
            minDays: 30,                // Minimum after cold start: 1 month
            maxDaysGovernment: 720,     // Government max: 24 months
            maxDaysOthers: 360,         // Private/Business/Informal max: 12 months
            minMonths: 1,
            maxMonthsGovernment: 24,
            maxMonthsOthers: 12
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
     * Calculate initial "Cold Start" ZimScore from financial documents
     * @param {string} userId - User ID
     * @param {Object} financialData - Parsed financial statement data (from OCR)
     * @param {string} employmentType - Employment type (government, private, business, informal)
     * @returns {Promise<Object>} Calculated score
     */
    async calculateColdStartScore(userId, financialData, employmentType = null) {
        console.log(`🎯 Calculating Cold Start ZimScore for user ${userId}...`);
        
        try {
            let score = this.DEFAULT_SCORE;
            const factors = {
                component1_banking: 0,
                component2_employment: 0,
                component3_performance: 0
            };

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

            // Factor 5: Account Tenor (0-5 points) - SPEC REQUIREMENT
            const accountAgeMonths = financialData.accountAgeMonths || 0;
            if (accountAgeMonths >= 12) {
                score += 5;
                factors.account_tenor = 5;
            } else if (accountAgeMonths >= 6) {
                score += 3;
                factors.account_tenor = 3;
            } else if (accountAgeMonths >= 3) {
                score += 1;
                factors.account_tenor = 1;
            }

            // Factor 6: Additional Accounts Bonus (0-10 points) - SPEC REQUIREMENT
            const additionalAccounts = financialData.additionalAccountsCount || 0;
            const accountBonus = Math.min(additionalAccounts * 2, 10);
            if (accountBonus > 0) {
                score += accountBonus;
                factors.additional_accounts = accountBonus;
            }

            // Component 1: Banking Data (capped at 30-60 range)
            const component1Score = Math.max(this.MIN_SCORE, Math.min(60, score));
            factors.component1_banking = component1Score;

            // Component 2: Employment Bonus (0-10 points)
            let employmentBonus = 0;
            if (employmentType && this.EMPLOYMENT_BONUS[employmentType]) {
                employmentBonus = this.EMPLOYMENT_BONUS[employmentType];
                score = component1Score + employmentBonus;
                factors.component2_employment = employmentBonus;
                factors.employment_type = employmentType;
                console.log(`💼 Employment Bonus (${employmentType}): +${employmentBonus} points`);
            } else {
                score = component1Score;
            }

            // Component 3: Performance (0 for new users)
            factors.component3_performance = 0;

            // Final score (Component 1 + Component 2 + Component 3)
            score = Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, score));

            // Calculate star rating and reputation level
            const starRating = this.calculateStarRating(score);
            const riskLevel = this.getRiskLevel(score);

            // Calculate DTNI-based cold start limit
            const coldStartResult = await this.calculateColdStartLimit(
                userId, 
                employmentType, 
                financialData
            );

            const maxLoanAmount = coldStartResult.coldStartLimit;
            const scoreBasedLimit = this.calculateMaxLoanAmount(score); // Unlocked after first repayment
            const installmentUtilization = coldStartResult.installmentUtilization || 0;
            const dtniStatus = coldStartResult.status;

            console.log(`✅ Cold Start Score: ${score}/85 (${starRating}⭐) - Risk Level: ${riskLevel}`);
            console.log(`💰 Cold Start Limit: $${maxLoanAmount} (Installment Utilization: ${(installmentUtilization * 100).toFixed(1)}% - ${dtniStatus})`);
            console.log(`📊 Score-based Limit: $${scoreBasedLimit} (unlocks after first repayment)`);

            // Save to database
            await this.saveZimScore(userId, {
                scoreValue: score,
                starRating,
                maxLoanAmount, // DTNI-based cold start
                scoreBasedLimit, // Actual limit based on score
                riskLevel,
                factors,
                calculationMethod: 'cold_start',
                employmentType,
                dtniRatio: installmentUtilization,
                dtniStatus,
                coldStartActive: true
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
                maxLoanAmount, // DTNI-based cold start
                scoreBasedLimit, // Unlocked after first repayment
                riskLevel,
                factors,
                coldStartActive: true,
                employmentType,
                dtni: {
                    netSalary: coldStartResult.netSalary,
                    maxInstallment: coldStartResult.maxInstallment,
                    existingInstallment: coldStartResult.existingInstallment,
                    availableInstallment: coldStartResult.availableInstallment,
                    installmentUtilization: installmentUtilization,
                    status: dtniStatus
                }
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
                    // SPEC: -5 points per late payment (max -20 total)
                    scoreChange = this.WEIGHTS.LOAN_REPAID_LATE;
                    const currentLatePenalty = factors.late_payments || 0;
                    // Cap total late payment penalty at -20
                    if (currentLatePenalty > -20) {
                        factors.late_payments = Math.max(currentLatePenalty + scoreChange, -20);
                    }
                    const daysLate = loanEvent.daysLate || 0;
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

            // Remove cold start override after first repayment
            const coldStartRemoved = currentScore.cold_start_active && loanEvent.type === 'LOAN_REPAID_ON_TIME';
            if (coldStartRemoved) {
                console.log(`🎉 Cold Start Removed! Limit unlocked: $100 → $${newMaxLoanAmount}`);
            }

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
     * Calculate cold start limit based on DTNI (Debt-to-Net-Income)
     * Formula: Net Salary × 40% = Maximum Monthly Installment
     * Then calculate maximum loan amount from that installment
     * 
     * @param {string} userId - User ID
     * @param {string} employmentType - Employment type (government, private, business, informal)
     * @param {Object} financialData - Financial data from bank statement
     * @returns {Promise<Object>} Cold start limit details
     */
    async calculateColdStartLimit(userId, employmentType, financialData) {
        try {
            // Get user's employment details for monthly income
            const { data: employmentDetails } = await supabase
                .from('employment_details')
                .select('monthly_income')
                .eq('user_id', userId)
                .single();

            const netSalary = employmentDetails?.monthly_income || 0;

            if (netSalary === 0) {
                return {
                    coldStartLimit: 0,
                    maxInstallment: 0,
                    netSalary: 0,
                    status: 'No income data',
                    isCivilServant: employmentType === 'government'
                };
            }

            // Get user's existing debt (active loans)
            const { data: activeLoans } = await supabase
                .from('loans')
                .select('amount, interest_rate, term_days')
                .eq('user_id', userId)
                .in('status', ['active', 'approved'])
                .order('created_at', { ascending: false });

            // Calculate total existing monthly installment
            let existingMonthlyInstallment = 0;
            if (activeLoans && activeLoans.length > 0) {
                activeLoans.forEach(loan => {
                    // Calculate monthly installment for this loan
                    const totalAmount = loan.amount * (1 + loan.interest_rate / 100);
                    const termMonths = (loan.term_days || 30) / 30;
                    const monthlyInstallment = totalAmount / termMonths;
                    existingMonthlyInstallment += monthlyInstallment;
                });
            }

            // DTNI Calculation: Net Salary × 40% = Maximum Total Monthly Installment
            const maxTotalInstallment = netSalary * 0.40;

            // Available installment capacity = Max Total - Existing
            const availableInstallment = Math.max(0, maxTotalInstallment - existingMonthlyInstallment);

            // Calculate maximum loan amount from available installment using reducing balance method
            // For cold start, use fixed 3 months and 5% interest
            const assumedInterestRate = 0.05; // 5% annual
            const assumedTermMonths = 3; // Cold start: 3 months
            
            // Use the new reducing balance method
            let coldStartLimit = this.calculateMaxLoanAmount(
                availableInstallment,
                assumedInterestRate,
                assumedTermMonths
            );

            // Apply employment-based caps
            const isCivilServant = employmentType === 'government';
            const maxCap = isCivilServant ? 
                this.COLD_START_LIMITS.government.max : 
                this.COLD_START_LIMITS.other.max;

            // Cap the cold start limit
            coldStartLimit = Math.min(coldStartLimit, maxCap);

            // Round to nearest dollar
            coldStartLimit = Math.round(coldStartLimit);

            // Determine status based on utilization
            const installmentUtilization = existingMonthlyInstallment / maxTotalInstallment;
            let status = '';
            
            if (installmentUtilization === 0) {
                status = 'Excellent - No existing debt';
            } else if (installmentUtilization <= 0.20) {
                status = 'Excellent - Low debt';
            } else if (installmentUtilization <= 0.50) {
                status = 'Good';
            } else if (installmentUtilization <= 0.80) {
                status = 'Fair';
            } else if (installmentUtilization < 1.0) {
                status = 'Limited';
            } else {
                status = 'Denied - At maximum capacity';
                coldStartLimit = 0;
            }

            console.log(`📊 DTNI Calculation:`);
            console.log(`   Net Salary: $${netSalary}`);
            console.log(`   Max Total Installment (40%): $${maxTotalInstallment.toFixed(2)}`);
            console.log(`   Existing Monthly Installment: $${existingMonthlyInstallment.toFixed(2)}`);
            console.log(`   Available Installment: $${availableInstallment.toFixed(2)}`);
            console.log(`   Installment Utilization: ${(installmentUtilization * 100).toFixed(1)}%`);
            console.log(`   Employment: ${employmentType} (${isCivilServant ? 'Civil Servant' : 'Other'})`);
            console.log(`   Max Cap: $${maxCap}`);
            console.log(`   Cold Start Limit: $${coldStartLimit} (${status})`);

            return {
                coldStartLimit,
                maxInstallment: maxTotalInstallment,
                existingInstallment: existingMonthlyInstallment,
                availableInstallment,
                installmentUtilization,
                netSalary,
                status,
                maxCap,
                isCivilServant
            };
        } catch (error) {
            console.error('Error calculating cold start limit:', error);
            // Fallback to minimum safe limit
            return {
                coldStartLimit: 0,
                maxInstallment: 0,
                existingInstallment: 0,
                availableInstallment: 0,
                installmentUtilization: 0,
                netSalary: 0,
                status: 'Error - calculation failed',
                maxCap: employmentType === 'government' ? 300 : 100,
                isCivilServant: employmentType === 'government'
            };
        }
    }

    /**
     * Calculate maximum loan amount using reducing balance method
     * Formula: P = PMT * [(1+r)^n - 1] / [r(1+r)^n]
     * 
     * @param {number} maxMonthlyInstallment - Maximum monthly payment user can afford
     * @param {number} annualInterestRate - Annual interest rate (e.g., 0.05 for 5%)
     * @param {number} termMonths - Loan term in months
     * @returns {number} Maximum loan principal amount
     */
    calculateMaxLoanAmount(maxMonthlyInstallment, annualInterestRate, termMonths) {
        if (maxMonthlyInstallment <= 0 || termMonths <= 0) {
            return 0;
        }

        const monthlyRate = annualInterestRate / 12;
        
        if (monthlyRate === 0) {
            // No interest case
            return maxMonthlyInstallment * termMonths;
        }

        // Reducing balance formula: P = PMT * [(1+r)^n - 1] / [r(1+r)^n]
        const factor = Math.pow(1 + monthlyRate, termMonths);
        const maxLoanAmount = maxMonthlyInstallment * (factor - 1) / (monthlyRate * factor);
        
        return Math.floor(maxLoanAmount); // Round down to whole dollar
    }

    /**
     * Calculate monthly installment using reducing balance method
     * Formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
     * 
     * @param {number} principal - Loan principal amount
     * @param {number} annualInterestRate - Annual interest rate (e.g., 0.05 for 5%)
     * @param {number} termMonths - Loan term in months
     * @returns {number} Monthly installment amount
     */
    calculateMonthlyInstallment(principal, annualInterestRate, termMonths) {
        if (principal <= 0 || termMonths <= 0) {
            return 0;
        }

        const monthlyRate = annualInterestRate / 12;
        
        if (monthlyRate === 0) {
            // No interest case
            return principal / termMonths;
        }

        // Reducing balance formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
        const factor = Math.pow(1 + monthlyRate, termMonths);
        const monthlyInstallment = principal * (monthlyRate * factor) / (factor - 1);
        
        return monthlyInstallment;
    }

    /**
     * Validate loan application against DTNI limits
     * Checks if user can afford the requested loan amount
     * 
     * @param {string} userId - User ID
     * @param {number} requestedAmount - Requested loan amount
     * @param {number} interestRate - Interest rate (0-10%)
     * @param {number} termDays - Loan term in days
     * @returns {Promise<Object>} Validation result
     */
    async validateLoanAgainstDTNI(userId, requestedAmount, interestRate, termDays) {
        try {
            // Get user's ZimScore and employment details first
            const { data: zimScore } = await supabase
                .from('user_zimscores')
                .select('cold_start_active, max_loan_amount, score_based_limit')
                .eq('user_id', userId)
                .single();

            const { data: employmentDetails } = await supabase
                .from('employment_details')
                .select('monthly_income, employment_type')
                .eq('user_id', userId)
                .single();

            if (!employmentDetails || !employmentDetails.monthly_income) {
                return {
                    approved: false,
                    reason: 'NO_INCOME_DATA',
                    message: 'Please update your employment details with current monthly income',
                    requiresBankStatement: true
                };
            }

            const employmentType = employmentDetails.employment_type;
            const coldStartActive = zimScore?.cold_start_active !== false; // Default to true if not found
            const isGovernment = employmentType === 'government';

            // Validate loan tenure based on cold start status
            if (coldStartActive) {
                // COLD START: FIXED 3 months (90 days)
                if (termDays !== this.LOAN_TENURE.coldStart) {
                    return {
                        approved: false,
                        reason: 'COLD_START_TENURE_FIXED',
                        message: `Cold start loans are fixed at 3 months (90 days). After your first successful repayment, you can choose flexible tenures.`,
                        requiredTenure: this.LOAN_TENURE.coldStart,
                        coldStartActive: true
                    };
                }
            } else {
                // AFTER COLD START: Variable tenure based on employment
                const maxTenure = isGovernment ? this.LOAN_TENURE.maxDaysGovernment : this.LOAN_TENURE.maxDaysOthers;
                const maxMonths = isGovernment ? this.LOAN_TENURE.maxMonthsGovernment : this.LOAN_TENURE.maxMonthsOthers;

                if (termDays < this.LOAN_TENURE.minDays) {
                    return {
                        approved: false,
                        reason: 'TENURE_TOO_SHORT',
                        message: `Minimum loan tenure is ${this.LOAN_TENURE.minMonths} month (${this.LOAN_TENURE.minDays} days)`,
                        minTenure: this.LOAN_TENURE.minDays,
                        maxTenure: maxTenure,
                        employmentType
                    };
                }

                if (termDays > maxTenure) {
                    return {
                        approved: false,
                        reason: 'TENURE_TOO_LONG',
                        message: `Maximum loan tenure for ${employmentType} employees is ${maxMonths} months (${maxTenure} days)`,
                        minTenure: this.LOAN_TENURE.minDays,
                        maxTenure: maxTenure,
                        employmentType,
                        suggestion: isGovernment ? null : 'Government employees can borrow for up to 24 months'
                    };
                }
            }

            const netSalary = employmentDetails.monthly_income;

            // Get user's existing active loans
            const { data: activeLoans } = await supabase
                .from('loans')
                .select('amount, interest_rate, term_days')
                .eq('user_id', userId)
                .in('status', ['active', 'approved'])
                .order('created_at', { ascending: false });

            // Calculate existing monthly installments using reducing balance method
            let existingMonthlyInstallment = 0;
            if (activeLoans && activeLoans.length > 0) {
                activeLoans.forEach(loan => {
                    const termMonths = (loan.term_days || 30) / 30;
                    const annualRate = (loan.interest_rate || 0) / 100;
                    const monthlyInstallment = this.calculateMonthlyInstallment(
                        loan.amount, 
                        annualRate, 
                        termMonths
                    );
                    existingMonthlyInstallment += monthlyInstallment;
                });
            }

            // Calculate new loan monthly installment using reducing balance method
            const newLoanTermMonths = termDays / 30;
            const annualRate = interestRate / 100;
            const newLoanInstallment = this.calculateMonthlyInstallment(
                requestedAmount, 
                annualRate, 
                newLoanTermMonths
            );

            // Calculate total installment if loan is approved
            const totalInstallment = existingMonthlyInstallment + newLoanInstallment;

            // DTNI Check: Net Salary × 40% = Maximum Total Installment
            const maxTotalInstallment = netSalary * 0.40;
            const installmentUtilization = totalInstallment / maxTotalInstallment;

            // Check if within DTNI limit
            if (installmentUtilization > 1.0) {
                // Over limit - calculate max affordable loan using reducing balance method
                const maxAffordableInstallment = maxTotalInstallment - existingMonthlyInstallment;
                const maxAffordableLoan = this.calculateMaxLoanAmount(
                    maxAffordableInstallment, 
                    annualRate, 
                    newLoanTermMonths
                );

                return {
                    approved: false,
                    reason: 'EXCEEDS_DTNI_LIMIT',
                    message: 'Requested loan exceeds your 40% installment capacity',
                    dtni: {
                        netSalary,
                        maxInstallment: maxTotalInstallment,
                        existingInstallment: existingMonthlyInstallment,
                        newLoanInstallment,
                        totalInstallment,
                        installmentUtilization: (installmentUtilization * 100).toFixed(1) + '%',
                        maxAffordableLoan: Math.floor(maxAffordableLoan)
                    },
                    suggestion: `Maximum you can borrow: $${Math.floor(maxAffordableLoan)}`,
                    requiresBankStatement: installmentUtilization > 1.2 // If way over, require new statement
                };
            }

            // Check ZimScore limit (reuse zimScore from earlier or fetch fresh data)
            if (zimScore) {
                const effectiveLimit = zimScore.cold_start_active ? 
                    zimScore.max_loan_amount : 
                    zimScore.score_based_limit;

                if (requestedAmount > effectiveLimit) {
                    return {
                        approved: false,
                        reason: 'EXCEEDS_ZIMSCORE_LIMIT',
                        message: `Requested amount exceeds your ZimScore limit of $${effectiveLimit}`,
                        dtni: {
                            netSalary,
                            maxInstallment: maxTotalInstallment,
                            existingInstallment: existingMonthlyInstallment,
                            newLoanInstallment,
                            totalInstallment,
                            installmentUtilization: (installmentUtilization * 100).toFixed(1) + '%'
                        },
                        suggestion: `Maximum you can borrow: $${effectiveLimit}`,
                        requiresBankStatement: false
                    };
                }
            }

            // Approved!
            return {
                approved: true,
                message: 'Loan application approved based on DTNI and ZimScore',
                dtni: {
                    netSalary,
                    maxInstallment: maxTotalInstallment,
                    existingInstallment: existingMonthlyInstallment,
                    newLoanInstallment,
                    totalInstallment,
                    installmentUtilization: (installmentUtilization * 100).toFixed(1) + '%',
                    remainingCapacity: maxTotalInstallment - totalInstallment
                },
                employmentType
            };

        } catch (error) {
            console.error('Error validating loan against DTNI:', error);
            return {
                approved: false,
                reason: 'VALIDATION_ERROR',
                message: 'Unable to validate loan application. Please try again.',
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
        // Linear mapping: 30 -> 1.0, 85 -> 5.0 (SPEC REQUIREMENT)
        let starRating = 1.0 + ((scoreValue - 30) / 55) * 4.0;
        
        // Round to nearest 0.5
        starRating = Math.round(starRating * 2) / 2;
        
        // Clamp to valid range
        return Math.max(1.0, Math.min(5.0, starRating));
    }

    /**
     * Calculate maximum loan amount based on score
     * SPEC: 30-85 range with 6-tier system
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
     * SPEC: 30-85 range with standardized risk level names
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
                score_based_limit: scoreData.scoreBasedLimit || scoreData.maxLoanAmount,
                risk_level: scoreData.riskLevel,
                score_factors: scoreData.factors,
                calculation_method: scoreData.calculationMethod,
                employment_type: scoreData.employmentType,
                dtni_ratio: scoreData.dtniRatio,
                dtni_status: scoreData.dtniStatus,
                cold_start_active: scoreData.coldStartActive !== undefined ? scoreData.coldStartActive : true,
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
     * Extract financial data from OCR bank statement results
     * @param {Object} ocrData - OCR extracted data from bank statement
     * @returns {Object} Financial data for ZimScore calculation
     */
    extractFinancialDataFromOCR(ocrData) {
        const financialData = {
            cashFlowRatio: 0,
            avgEndingBalance: 0,
            balanceConsistencyScore: 0,
            nsfEvents: 0,
            accountAgeMonths: 0,
            additionalAccountsCount: 0
        };

        // Extract from bank statement OCR
        if (ocrData.openingBalance !== undefined && ocrData.closingBalance !== undefined) {
            financialData.avgEndingBalance = (ocrData.openingBalance + ocrData.closingBalance) / 2;
        }

        // Calculate cash flow ratio
        if (ocrData.totalCredits && ocrData.totalDebits && ocrData.totalDebits > 0) {
            financialData.cashFlowRatio = ocrData.totalCredits / ocrData.totalDebits;
        }

        // Detect NSF events from text
        if (ocrData.fullText) {
            const nsfMatches = ocrData.fullText.match(/NSF|INSUFFICIENT\s+FUNDS|OVERDRAFT|RETURNED\s+ITEM/gi);
            financialData.nsfEvents = nsfMatches ? nsfMatches.length : 0;
        }

        // Calculate account age from statement period
        if (ocrData.statementPeriod) {
            // Try to extract dates from period string
            const dateMatch = ocrData.statementPeriod.match(/(\d{1,2})[-\/](\w{3})[-\/](\d{4})/);
            if (dateMatch) {
                const year = parseInt(dateMatch[3]);
                const currentYear = new Date().getFullYear();
                financialData.accountAgeMonths = Math.max(1, (currentYear - year) * 12);
            }
        }

        // Balance consistency (simplified - can be enhanced)
        if (ocrData.openingBalance && ocrData.closingBalance) {
            const variation = Math.abs(ocrData.closingBalance - ocrData.openingBalance) / ocrData.openingBalance;
            if (variation < 0.1) financialData.balanceConsistencyScore = 9;
            else if (variation < 0.3) financialData.balanceConsistencyScore = 7;
            else if (variation < 0.5) financialData.balanceConsistencyScore = 5;
            else financialData.balanceConsistencyScore = 3;
        }

        console.log('📊 Extracted Financial Data from OCR:', financialData);
        return financialData;
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

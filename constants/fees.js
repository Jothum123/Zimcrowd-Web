/**
 * ZimCrowd Platform Fee Structure
 * Centralized fee constants and calculations
 * All rates are percentages (e.g., 0.10 = 10%)
 */

// ============================================
// BORROWER FEES
// ============================================

const BORROWER_FEES = {
    // Upfront Fees (deducted before disbursement)
    PROCESSING_FEE: {
        rate: 0.025, // 2.5%
        max: 50.00,
        description: 'Loan processing fee',
        type: 'upfront',
        appliesTo: ['p2p', 'direct']
    },
    
    PLATFORM_FEE: {
        rate: 0.05, // 5%
        max: 100.00,
        description: 'Platform service fee',
        type: 'upfront',
        appliesTo: ['p2p', 'direct']
    },
    
    INSURANCE_FEE: {
        rate: 0.025, // 2.5%
        max: 50.00,
        description: 'Loan insurance coverage',
        type: 'upfront',
        appliesTo: ['p2p', 'direct']
    },

    // Fixed Upfront Fees
    DOCUMENT_VERIFICATION_FEE: {
        amount: 2.00,
        description: 'Document verification cost',
        type: 'upfront_fixed',
        appliesTo: ['p2p', 'direct']
    },

    CREDIT_SCORE_CHECK_FEE: {
        amount: 5.00,
        description: 'Credit score check cost',
        type: 'upfront_fixed',
        appliesTo: ['p2p', 'direct']
    },
    
    // Ongoing Monthly Fees (added to monthly payment)
    COLLECTION_FEE: {
        rate: 0.05, // 5% of monthly payment
        max: 50.00,
        description: 'Payment collection costs',
        type: 'monthly',
        appliesTo: ['p2p', 'direct']
    },
    
    // Late Payment Fees
    LATE_FEE: {
        rate: 0.10, // 10%
        max: 200.00,
        platformShare: 0.05, // 5% to platform
        lenderShare: 0.05, // 5% to lender
        minimumAmount: 50.00,
        gracePeriodHours: 24,
        description: 'Late payment penalty',
        type: 'penalty',
        appliesTo: ['p2p', 'direct']
    },

    // Early Settlement
    EARLY_SETTLEMENT_FEE: {
        rate: 0.005, // 0.5%
        max: 10.00,
        description: 'Early repayment fee',
        type: 'penalty',
        appliesTo: ['p2p', 'direct']
    }
};

// ============================================
// LENDER FEES - PRIMARY MARKET
// ============================================

const LENDER_PRIMARY_FEES = {
    // Upfront Fees (charged at investment)
    PLATFORM_FEE: {
        rate: 0.05, // 5%
        max: 100.00,
        description: 'Platform fee on lended amount',
        type: 'upfront',
        required: true
    },

    PROCESSING_FEE: {
        rate: 0.02, // 2%
        max: 40.00,
        description: 'Processing fee',
        type: 'upfront',
        required: true
    },

    INVESTMENT_FEE: {
        rate: 0.005, // 0.5%
        max: 15.00,
        description: 'Investment facilitation fee',
        type: 'upfront',
        required: true
    },

    DUE_DILIGENCE_FEE: {
        amount: 3.00,
        description: 'Due diligence cost',
        type: 'upfront_fixed',
        required: true
    },
    
    INSURANCE_FEE: {
        rate: 0.05, // 5%
        max: 100.00,
        description: 'Investment protection (optional)',
        type: 'upfront',
        required: false,
        optional: true
    },

    // Monthly Fees
    PORTFOLIO_MANAGEMENT_FEE: {
        rate: 0.025, // 2.5% monthly
        max: 50.00,
        description: 'Monthly portfolio management',
        type: 'monthly',
        required: true
    }
};

// ============================================
// LENDER FEES - SECONDARY MARKET
// ============================================

const LENDER_SECONDARY_FEES = {
    DEAL_FEE: {
        rate: 0.015, // 1.5%
        max: 100.00,
        description: 'Secondary market purchase fee',
        type: 'upfront'
    }
};

// ============================================
// PLATFORM FEES
// ============================================

const PLATFORM_FEES = {
    WITHDRAWAL_FEE: {
        bank: {
            rate: 0.01, // 1%
            max: 25.00,
            description: 'Bank withdrawal fee'
        },
        mobile: {
            rate: 0.01, // 1%
            max: 25.00,
            description: 'Mobile wallet withdrawal fee'
        },
        type: 'transaction'
    },
    
    RECOVERY_FEE: {
        rate: 0.10, // 10% of recovered amounts
        max: 200.00,
        description: 'Default recovery fee',
        type: 'contingency'
    },
    
    REFERRAL_CREDIT: {
        // Per qualifying activity rewards - Multi-currency support
        // Credits issued in same currency as user's activity
        rewards: {
            USD: {
                // Advocate (Referrer) earns when Friend completes:
                advocate: {
                    friend_first_loan: 5.00,      // Friend receives first loan
                    friend_loan_repaid: 5.00,     // Friend pays back first loan
                    friend_first_funding: 5.00,   // Friend funds first loan
                    friend_first_investment: 5.00 // Friend makes first investment
                },
                // Friend (Referee) earns when they complete:
                friend: {
                    first_loan: 5.00,             // Receives first loan
                    first_funding: 5.00,          // Funds first loan
                    first_investment: 5.00        // Makes first investment
                }
            },
            ZWG: {
                // ZWG equivalent rewards (using approximate rate)
                // Advocate (Referrer) earns when Friend completes:
                advocate: {
                    friend_first_loan: 135.00,      // ~$5 USD equivalent
                    friend_loan_repaid: 135.00,     
                    friend_first_funding: 135.00,   
                    friend_first_investment: 135.00 
                },
                // Friend (Referee) earns when they complete:
                friend: {
                    first_loan: 135.00,             
                    first_funding: 135.00,          
                    first_investment: 135.00        
                }
            }
        },
        monthlyLimit: {
            USD: 1000.00,    // $1,000 max per month for advocates
            ZWG: 27000.00    // ZWG 27,000 max per month (~$1,000 equivalent)
        },
        expirationDays: 90,
        description: 'Referral program credits - $5 USD or ZWG 135 per qualifying activity',
        type: 'credit'
    },
    
    // ZimCrowd Direct Lending Configuration
    DIRECT_LENDING: {
        // Interest Rates (Fixed Monthly)
        interestRates: {
            USD: 0.08,  // 8% per month
            ZWG: 0.10   // 10% per month
        },
        
        // Loan Limits
        limits: {
            USD: { min: 25, max: 3000 },
            ZWG: { min: 675, max: 40000 }
        },
        
        // Employment Type Configuration
        // NO COLD START in Direct Lending - uses DTNI for affordability
        employmentTypes: {
            government: {
                maxLoan: { USD: 3000, ZWG: 40000 },
                maxTenureMonths: 24,
                dtniRatio: 0.40         // 40% of net income
            },
            private: {
                maxLoan: { USD: 1000, ZWG: 27000 },
                maxTenureMonths: 12,
                dtniRatio: 0.33         // 33% of net income
            },
            business: {
                maxLoan: { USD: 1000, ZWG: 27000 },
                maxTenureMonths: 12,
                dtniRatio: 0.30         // 30% of net income
            },
            informal: {
                maxLoan: { USD: 500, ZWG: 13500 },
                maxTenureMonths: 6,
                dtniRatio: 0.25         // 25% of net income
            }
        },
        
        // Late Fees (100% to ZimCrowd)
        lateFee: {
            rate: 0.10,             // 10% of payment
            minimum: { USD: 50, ZWG: 1350 },
            gracePeriodHours: 24,
            zimcrowdShare: 1.0      // 100% to ZimCrowd
        },
        
        // Loan Terms
        shortTermDays: [7, 14, 30],
        mediumTermMonths: [3, 6],
        longTermMonths: [9, 12, 18, 24],  // Government only
        
        // Offer Expiry
        offerExpiryHours: 24,
        
        description: 'ZimCrowd Direct - Instant funding from ZimCrowd Capital'
    }
};

// ============================================
// FEE CALCULATION HELPERS
// ============================================

const FEE_HELPERS = {
    /**
     * Calculate borrower upfront fees
     * @param {number} loanAmount - Requested loan amount
     * @returns {Object} Fee breakdown
     */
    calculateBorrowerUpfrontFees(loanAmount) {
        // Percentage Fees
        const processingFee = Math.min(loanAmount * BORROWER_FEES.PROCESSING_FEE.rate, BORROWER_FEES.PROCESSING_FEE.max);
        const platformFee = Math.min(loanAmount * BORROWER_FEES.PLATFORM_FEE.rate, BORROWER_FEES.PLATFORM_FEE.max);
        const insuranceFee = Math.min(loanAmount * BORROWER_FEES.INSURANCE_FEE.rate, BORROWER_FEES.INSURANCE_FEE.max);
        
        // Fixed Fees
        const docFee = BORROWER_FEES.DOCUMENT_VERIFICATION_FEE.amount;
        const creditCheckFee = BORROWER_FEES.CREDIT_SCORE_CHECK_FEE.amount;
        
        const totalUpfront = processingFee + platformFee + insuranceFee + docFee + creditCheckFee;
        const netAmountReceived = loanAmount - totalUpfront;
        
        return {
            processingFee: Math.round(processingFee * 100) / 100,
            platformFee: Math.round(platformFee * 100) / 100,
            insuranceFee: Math.round(insuranceFee * 100) / 100,
            documentVerificationFee: docFee,
            creditScoreCheckFee: creditCheckFee,
            totalUpfront: Math.round(totalUpfront * 100) / 100,
            netAmountReceived: Math.round(netAmountReceived * 100) / 100,
            netPercentage: Math.round((netAmountReceived / loanAmount) * 100) / 100
        };
    },
    
    /**
     * Calculate borrower monthly fees
     * @param {number} loanAmount - Original loan amount
     * @param {number} monthlyPayment - Payment before fees
     * @returns {Object} Monthly fee breakdown
     */
    calculateBorrowerMonthlyFees(loanAmount, monthlyPayment) {
        // Collection fee is on the installment amount
        const collectionFee = Math.min(monthlyPayment * BORROWER_FEES.COLLECTION_FEE.rate, BORROWER_FEES.COLLECTION_FEE.max);
        const totalMonthlyPayment = monthlyPayment + collectionFee;
        
        return {
            collectionFee: Math.round(collectionFee * 100) / 100,
            tenureFee: 0, // Removed in new structure
            totalMonthlyFees: Math.round(collectionFee * 100) / 100,
            totalMonthlyPayment: Math.round(totalMonthlyPayment * 100) / 100
        };
    },
    
    /**
     * Calculate late fee
     * @param {number} paymentAmount - Original payment amount
     * @returns {Object} Late fee breakdown
     */
    calculateLateFee(paymentAmount) {
        const calculatedFee = paymentAmount * BORROWER_FEES.LATE_FEE.rate;
        const lateFee = Math.min(Math.max(calculatedFee, BORROWER_FEES.LATE_FEE.minimumAmount), BORROWER_FEES.LATE_FEE.max);
        const platformShare = lateFee * 0.5;
        const lenderShare = lateFee * 0.5;
        
        return {
            totalLateFee: Math.round(lateFee * 100) / 100,
            platformShare: Math.round(platformShare * 100) / 100,
            lenderShare: Math.round(lenderShare * 100) / 100,
            totalDue: Math.round((paymentAmount + lateFee) * 100) / 100
        };
    },
    
    /**
     * Calculate lender primary market fees
     * @param {number} investmentAmount - Investment amount
     * @param {boolean} includeInsurance - Whether to include optional insurance (default: false)
     * @returns {Object} Fee breakdown
     */
    calculateLenderPrimaryUpfrontFees(investmentAmount, includeInsurance = false) {
        // Percentage Fees
        const platformFee = Math.min(investmentAmount * LENDER_PRIMARY_FEES.PLATFORM_FEE.rate, LENDER_PRIMARY_FEES.PLATFORM_FEE.max);
        const processingFee = Math.min(investmentAmount * LENDER_PRIMARY_FEES.PROCESSING_FEE.rate, LENDER_PRIMARY_FEES.PROCESSING_FEE.max);
        const investmentFee = Math.min(investmentAmount * LENDER_PRIMARY_FEES.INVESTMENT_FEE.rate, LENDER_PRIMARY_FEES.INVESTMENT_FEE.max);
        
        // Fixed Fees
        const dueDiligenceFee = LENDER_PRIMARY_FEES.DUE_DILIGENCE_FEE.amount;
        
        // Optional Insurance
        const insuranceFee = includeInsurance 
            ? Math.min(investmentAmount * LENDER_PRIMARY_FEES.INSURANCE_FEE.rate, LENDER_PRIMARY_FEES.INSURANCE_FEE.max)
            : 0;
            
        const totalUpfront = platformFee + processingFee + investmentFee + dueDiligenceFee + insuranceFee;
        const totalInvestment = investmentAmount + totalUpfront;
        
        return {
            platformFee: Math.round(platformFee * 100) / 100,
            processingFee: Math.round(processingFee * 100) / 100,
            investmentFee: Math.round(investmentFee * 100) / 100,
            dueDiligenceFee: dueDiligenceFee,
            insuranceFee: Math.round(insuranceFee * 100) / 100,
            insuranceOptedIn: includeInsurance,
            totalUpfront: Math.round(totalUpfront * 100) / 100,
            totalInvestment: Math.round(totalInvestment * 100) / 100
        };
    },
    
    /**
     * Calculate lender returns (with monthly management fee)
     * @param {number} monthlyYield - Gross monthly yield
     * @param {number} investmentAmount - Original investment amount (for mgmt fee base)
     * @returns {Object} Return breakdown
     */
    calculateLenderReturns(monthlyYield, investmentAmount) {
        // Portfolio Management Fee
        const mgmtFee = Math.min(investmentAmount * LENDER_PRIMARY_FEES.PORTFOLIO_MANAGEMENT_FEE.rate, LENDER_PRIMARY_FEES.PORTFOLIO_MANAGEMENT_FEE.max);
        const netReturn = monthlyYield - mgmtFee;
        
        return {
            grossYield: Math.round(monthlyYield * 100) / 100,
            managementFee: Math.round(mgmtFee * 100) / 100,
            totalFees: Math.round(mgmtFee * 100) / 100,
            netReturn: Math.round(netReturn * 100) / 100
        };
    },
    
    /**
     * Calculate secondary market deal fee
     * @param {number} purchaseAmount - Purchase amount
     * @returns {Object} Fee breakdown
     */
    calculateSecondaryMarketFee(purchaseAmount) {
        const dealFee = Math.min(purchaseAmount * LENDER_SECONDARY_FEES.DEAL_FEE.rate, LENDER_SECONDARY_FEES.DEAL_FEE.max);
        const totalCost = purchaseAmount + dealFee;
        
        return {
            dealFee: Math.round(dealFee * 100) / 100,
            totalCost: Math.round(totalCost * 100) / 100
        };
    },
    
    /**
     * Calculate recovery fee
     * @param {number} recoveredAmount - Amount recovered
     * @returns {Object} Fee breakdown
     */
    calculateRecoveryFee(recoveredAmount) {
        const recoveryFee = Math.min(recoveredAmount * PLATFORM_FEES.RECOVERY_FEE.rate, PLATFORM_FEES.RECOVERY_FEE.max);
        const netToLender = recoveredAmount - recoveryFee;
        
        return {
            recoveryFee: Math.round(recoveryFee * 100) / 100,
            netToLender: Math.round(netToLender * 100) / 100
        };
    },
    
    /**
     * Calculate withdrawal fee
     * @param {number} withdrawalAmount - Amount to withdraw
     * @param {string} method - 'bank' or 'mobile'
     * @returns {Object} Fee breakdown
     */
    calculateWithdrawalFee(withdrawalAmount, method = 'bank') {
        const feeConfig = method === 'mobile' 
            ? PLATFORM_FEES.WITHDRAWAL_FEE.mobile 
            : PLATFORM_FEES.WITHDRAWAL_FEE.bank;
        
        const withdrawalFee = Math.min(withdrawalAmount * feeConfig.rate, feeConfig.max);
        const netAmount = withdrawalAmount - withdrawalFee;
        
        return {
            withdrawalAmount: Math.round(withdrawalAmount * 100) / 100,
            withdrawalFee: Math.round(withdrawalFee * 100) / 100,
            feeRate: feeConfig.rate * 100,
            method: method,
            netAmount: Math.round(netAmount * 100) / 100
        };
    }
};

// ============================================
// VALIDATION HELPERS
// ============================================

const FEE_VALIDATION = {
    /**
     * Validate loan amount meets minimum after fees
     * @param {number} loanAmount - Requested loan amount
     * @param {number} minimumNet - Minimum net amount required
     * @returns {Object} Validation result
     */
    validateMinimumNetAmount(loanAmount, minimumNet = 50) {
        const fees = FEE_HELPERS.calculateBorrowerUpfrontFees(loanAmount);
        const isValid = fees.netAmountReceived >= minimumNet;
        
        return {
            isValid,
            netAmount: fees.netAmountReceived,
            minimumRequired: minimumNet,
            message: isValid 
                ? 'Loan amount meets minimum requirements' 
                : `Net amount ($${fees.netAmountReceived}) is below minimum ($${minimumNet})`
        };
    },
    
    /**
     * Calculate minimum loan amount needed for desired net
     * @param {number} desiredNet - Desired net amount
     * @returns {number} Minimum loan amount to request
     */
    calculateMinimumLoanForNet(desiredNet) {
        // Net = Loan × 0.87, so Loan = Net ÷ 0.87
        const minimumLoan = desiredNet / 0.87;
        return Math.ceil(minimumLoan);
    }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    BORROWER_FEES,
    LENDER_PRIMARY_FEES,
    LENDER_SECONDARY_FEES,
    PLATFORM_FEES,
    FEE_HELPERS,
    FEE_VALIDATION
};

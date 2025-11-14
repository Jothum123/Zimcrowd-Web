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
    SERVICE_FEE: {
        rate: 0.10, // 10%
        description: 'Loan processing, verification, and platform services',
        type: 'upfront',
        appliesTo: ['p2p', 'direct']
    },
    
    INSURANCE_FEE: {
        rate: 0.03, // 3%
        description: 'Loan insurance coverage',
        type: 'upfront',
        appliesTo: ['p2p', 'direct']
    },
    
    // Ongoing Monthly Fees (added to monthly payment)
    TENURE_FEE: {
        rate: 0.01, // 1% of loan amount
        description: 'Platform maintenance and support services',
        type: 'monthly',
        appliesTo: ['p2p', 'direct']
    },
    
    COLLECTION_FEE: {
        rate: 0.05, // 5% of monthly payment
        description: 'Payment collection costs',
        type: 'monthly',
        appliesTo: ['p2p', 'direct']
    },
    
    // Late Payment Fees
    LATE_FEE: {
        rate: 0.10, // 10% total
        platformShare: 0.05, // 5% to platform
        lenderShare: 0.05, // 5% to lender
        minimumAmount: 50.00, // $50 minimum
        gracePeriodHours: 24,
        description: 'Late payment penalty',
        type: 'penalty',
        appliesTo: ['p2p', 'direct']
    }
};

// ============================================
// LENDER FEES - PRIMARY MARKET
// ============================================

const LENDER_PRIMARY_FEES = {
    // Upfront Fees (charged at investment)
    SERVICE_FEE: {
        rate: 0.10, // 10%
        description: 'Platform service fee',
        type: 'upfront'
    },
    
    INSURANCE_FEE: {
        rate: 0.03, // 3%
        description: 'Investment protection',
        type: 'upfront'
    },
    
    // Ongoing Monthly Fees (deducted from returns)
    COLLECTION_FEE: {
        rate: 0.015, // 1.5% of monthly yield
        description: 'Monthly collection fee',
        type: 'monthly'
    },
    
    TENURE_FEE: {
        rate: 0.01, // 1% of investment amount
        description: 'Monthly platform maintenance',
        type: 'monthly'
    }
};

// ============================================
// LENDER FEES - SECONDARY MARKET
// ============================================

const LENDER_SECONDARY_FEES = {
    DEAL_FEE: {
        rate: 0.10, // 10%
        description: 'One-time secondary market purchase fee',
        type: 'upfront'
    }
    // No ongoing fees on secondary market purchases
};

// ============================================
// PLATFORM FEES
// ============================================

const PLATFORM_FEES = {
    RECOVERY_FEE: {
        rate: 0.30, // 30% of recovered amounts
        description: 'Collection agency recovery fee',
        type: 'contingency'
    },
    
    REFERRAL_CREDIT: {
        referrerAmount: 25.00, // $25
        refereeAmount: 25.00, // $25
        expirationDays: 90,
        description: 'Referral program credits',
        type: 'credit'
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
        const serviceFee = loanAmount * BORROWER_FEES.SERVICE_FEE.rate;
        const insuranceFee = loanAmount * BORROWER_FEES.INSURANCE_FEE.rate;
        const totalUpfront = serviceFee + insuranceFee;
        const netAmountReceived = loanAmount - totalUpfront;
        
        return {
            serviceFee: Math.round(serviceFee * 100) / 100,
            insuranceFee: Math.round(insuranceFee * 100) / 100,
            totalUpfront: Math.round(totalUpfront * 100) / 100,
            netAmountReceived: Math.round(netAmountReceived * 100) / 100,
            netPercentage: 0.87 // 87% of requested amount
        };
    },
    
    /**
     * Calculate borrower monthly fees
     * @param {number} loanAmount - Original loan amount
     * @param {number} monthlyPayment - Payment before fees
     * @returns {Object} Monthly fee breakdown
     */
    calculateBorrowerMonthlyFees(loanAmount, monthlyPayment) {
        const tenureFee = loanAmount * BORROWER_FEES.TENURE_FEE.rate;
        const paymentBeforeCollection = monthlyPayment + tenureFee;
        const collectionFee = paymentBeforeCollection * BORROWER_FEES.COLLECTION_FEE.rate;
        const totalMonthlyPayment = paymentBeforeCollection + collectionFee;
        
        return {
            tenureFee: Math.round(tenureFee * 100) / 100,
            collectionFee: Math.round(collectionFee * 100) / 100,
            totalMonthlyFees: Math.round((tenureFee + collectionFee) * 100) / 100,
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
        const lateFee = Math.max(calculatedFee, BORROWER_FEES.LATE_FEE.minimumAmount);
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
     * @returns {Object} Fee breakdown
     */
    calculateLenderPrimaryUpfrontFees(investmentAmount) {
        const serviceFee = investmentAmount * LENDER_PRIMARY_FEES.SERVICE_FEE.rate;
        const insuranceFee = investmentAmount * LENDER_PRIMARY_FEES.INSURANCE_FEE.rate;
        const totalUpfront = serviceFee + insuranceFee;
        const totalInvestment = investmentAmount + totalUpfront;
        
        return {
            serviceFee: Math.round(serviceFee * 100) / 100,
            insuranceFee: Math.round(insuranceFee * 100) / 100,
            totalUpfront: Math.round(totalUpfront * 100) / 100,
            totalInvestment: Math.round(totalInvestment * 100) / 100
        };
    },
    
    /**
     * Calculate lender monthly fees
     * @param {number} investmentAmount - Original investment
     * @param {number} monthlyYield - Gross monthly yield
     * @returns {Object} Monthly fee breakdown
     */
    calculateLenderMonthlyFees(investmentAmount, monthlyYield) {
        const collectionFee = monthlyYield * LENDER_PRIMARY_FEES.COLLECTION_FEE.rate;
        const tenureFee = investmentAmount * LENDER_PRIMARY_FEES.TENURE_FEE.rate;
        const totalMonthlyFees = collectionFee + tenureFee;
        const netMonthlyReturn = monthlyYield - totalMonthlyFees;
        
        return {
            collectionFee: Math.round(collectionFee * 100) / 100,
            tenureFee: Math.round(tenureFee * 100) / 100,
            totalMonthlyFees: Math.round(totalMonthlyFees * 100) / 100,
            netMonthlyReturn: Math.round(netMonthlyReturn * 100) / 100
        };
    },
    
    /**
     * Calculate secondary market deal fee
     * @param {number} purchaseAmount - Purchase amount
     * @returns {Object} Fee breakdown
     */
    calculateSecondaryMarketFee(purchaseAmount) {
        const dealFee = purchaseAmount * LENDER_SECONDARY_FEES.DEAL_FEE.rate;
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
        const recoveryFee = recoveredAmount * PLATFORM_FEES.RECOVERY_FEE.rate;
        const netToLender = recoveredAmount - recoveryFee;
        
        return {
            recoveryFee: Math.round(recoveryFee * 100) / 100,
            netToLender: Math.round(netToLender * 100) / 100
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

const { 
    BORROWER_FEES, 
    LENDER_PRIMARY_FEES, 
    LENDER_SECONDARY_FEES,
    PLATFORM_FEES,
    FEE_HELPERS 
} = require('../constants/fees');

/**
 * Fee Calculator Service
 * Comprehensive fee calculation for all loan types
 */
class FeeCalculatorService {
    
    /**
     * Calculate complete borrower loan fees and repayment schedule
     * @param {Object} params - Loan parameters
     * @param {number} params.loanAmount - Requested loan amount
     * @param {number} params.interestRate - Monthly interest rate (e.g., 5 for 5%)
     * @param {number} params.termMonths - Loan term in months
     * @param {string} params.currency - Currency code (default: 'USD')
     * @returns {Object} Complete fee breakdown and repayment schedule
     */
    static calculateBorrowerLoanFees({ loanAmount, interestRate, termMonths, currency = 'USD' }) {
        // Validate inputs
        this.validateLoanParameters(loanAmount, interestRate, termMonths);
        
        // Calculate upfront fees
        const upfrontFees = FEE_HELPERS.calculateBorrowerUpfrontFees(loanAmount);
        
        // Calculate monthly interest
        const monthlyInterest = loanAmount * (interestRate / 100);
        
        // Calculate principal payment per month
        const monthlyPrincipal = loanAmount / termMonths;
        
        // Calculate base monthly payment (before fees)
        const baseMonthlyPayment = monthlyPrincipal + monthlyInterest;
        
        // Calculate monthly fees
        const monthlyFees = FEE_HELPERS.calculateBorrowerMonthlyFees(loanAmount, baseMonthlyPayment);
        
        // Generate repayment schedule
        const repaymentSchedule = this.generateRepaymentSchedule({
            loanAmount,
            monthlyInterest,
            monthlyPrincipal,
            monthlyFees: monthlyFees.totalMonthlyFees,
            termMonths
        });
        
        // Calculate totals
        const totalInterestPaid = monthlyInterest * termMonths;
        const totalTenureFees = monthlyFees.tenureFee * termMonths;
        const totalCollectionFees = monthlyFees.collectionFee * termMonths;
        const totalMonthlyFees = totalTenureFees + totalCollectionFees;
        const totalRepayment = loanAmount + totalInterestPaid + upfrontFees.totalUpfront + totalMonthlyFees;
        
        // Calculate True Annual Effective Rate (TAER)
        const taer = this.calculateTAER(
            totalRepayment,
            upfrontFees.netAmountReceived,
            termMonths
        );
        
        return {
            // Loan Details
            requestedAmount: loanAmount,
            interestRate,
            termMonths,
            currency,
            
            // Upfront Fees
            upfrontFees: {
                serviceFee: upfrontFees.serviceFee,
                insuranceFee: upfrontFees.insuranceFee,
                total: upfrontFees.totalUpfront
            },
            
            // Net Amount
            netAmountReceived: upfrontFees.netAmountReceived,
            netPercentage: '87%',
            
            // Monthly Breakdown
            monthlyBreakdown: {
                principal: Math.round(monthlyPrincipal * 100) / 100,
                interest: Math.round(monthlyInterest * 100) / 100,
                tenureFee: monthlyFees.tenureFee,
                collectionFee: monthlyFees.collectionFee,
                totalPayment: monthlyFees.totalMonthlyPayment
            },
            
            // Total Costs
            totalCosts: {
                totalInterest: Math.round(totalInterestPaid * 100) / 100,
                totalUpfrontFees: upfrontFees.totalUpfront,
                totalMonthlyFees: Math.round(totalMonthlyFees * 100) / 100,
                totalRepayment: Math.round(totalRepayment * 100) / 100
            },
            
            // Effective Rate
            trueAnnualEffectiveRate: taer,
            
            // Repayment Schedule
            repaymentSchedule
        };
    }
    
    /**
     * Calculate lender primary market investment fees
     * NEW STRUCTURE: 10% platform fee + 5% optional insurance, NO monthly fees
     * @param {Object} params - Investment parameters
     * @param {number} params.investmentAmount - Investment amount
     * @param {number} params.estimatedMonthlyYield - Expected monthly yield
     * @param {number} params.termMonths - Investment term
     * @param {boolean} params.includeInsurance - Whether to include optional insurance (default: false)
     * @returns {Object} Complete fee breakdown
     */
    static calculateLenderPrimaryMarketFees({ investmentAmount, estimatedMonthlyYield, termMonths = 12, includeInsurance = false }) {
        // Calculate upfront fees (platform fee required, insurance optional)
        const upfrontFees = FEE_HELPERS.calculateLenderPrimaryUpfrontFees(investmentAmount, includeInsurance);
        
        // No monthly fees - lenders receive full yield
        const monthlyReturns = FEE_HELPERS.calculateLenderReturns(estimatedMonthlyYield);
        
        // Calculate totals
        const totalGrossYield = estimatedMonthlyYield * termMonths;
        const totalNetReturn = monthlyReturns.netReturn * termMonths;
        
        // Calculate ROI based on total investment (including fees)
        const roi = ((totalNetReturn / upfrontFees.totalInvestment) * 100).toFixed(2);
        
        // Calculate payback period
        const paybackPeriod = upfrontFees.totalInvestment / monthlyReturns.netReturn;
        
        return {
            // Investment Details
            investmentAmount,
            estimatedMonthlyYield,
            termMonths,
            
            // Upfront Fees (NEW STRUCTURE)
            upfrontFees: {
                platformFee: upfrontFees.platformFee,
                insuranceFee: upfrontFees.insuranceFee,
                insuranceOptedIn: includeInsurance,
                total: upfrontFees.totalUpfront
            },
            
            // Total Investment
            totalInvestment: upfrontFees.totalInvestment,
            
            // Monthly Returns (NO FEES DEDUCTED)
            monthlyReturns: {
                grossYield: estimatedMonthlyYield,
                fees: 0,  // No monthly fees
                netReturn: monthlyReturns.netReturn
            },
            
            // Total Returns
            totalReturns: {
                grossYield: Math.round(totalGrossYield * 100) / 100,
                totalFees: upfrontFees.totalUpfront, // Only upfront fees
                netReturn: Math.round(totalNetReturn * 100) / 100
            },
            
            // Performance Metrics
            roi: parseFloat(roi),
            paybackPeriod: Math.round(paybackPeriod * 10) / 10,
            annualizedReturn: parseFloat(roi),
            
            // Fee Structure Info
            feeStructure: {
                platformFeeRate: LENDER_PRIMARY_FEES.PLATFORM_FEE.rate * 100,
                insuranceFeeRate: LENDER_PRIMARY_FEES.INSURANCE_FEE.rate * 100,
                insuranceOptional: true,
                monthlyFees: false
            }
        };
    }
    
    /**
     * Calculate secondary market purchase fees
     * @param {Object} params - Purchase parameters
     * @param {number} params.purchaseAmount - Purchase amount
     * @param {number} params.remainingYield - Remaining monthly yield
     * @param {number} params.remainingMonths - Remaining months
     * @returns {Object} Fee breakdown
     */
    static calculateSecondaryMarketFees({ purchaseAmount, remainingYield, remainingMonths }) {
        const dealFee = FEE_HELPERS.calculateSecondaryMarketFee(purchaseAmount);
        
        // Calculate expected returns (no ongoing fees on secondary)
        const totalExpectedYield = remainingYield * remainingMonths;
        const netProfit = totalExpectedYield - dealFee.dealFee;
        const roi = ((netProfit / dealFee.totalCost) * 100).toFixed(2);
        
        return {
            purchaseAmount,
            dealFee: dealFee.dealFee,
            totalCost: dealFee.totalCost,
            
            expectedReturns: {
                monthlyYield: remainingYield,
                remainingMonths,
                totalYield: Math.round(totalExpectedYield * 100) / 100,
                netProfit: Math.round(netProfit * 100) / 100
            },
            
            roi: parseFloat(roi),
            noOngoingFees: true
        };
    }
    
    /**
     * Generate detailed repayment schedule
     * @param {Object} params - Schedule parameters
     * @returns {Array} Repayment schedule
     */
    static generateRepaymentSchedule({ loanAmount, monthlyInterest, monthlyPrincipal, monthlyFees, termMonths }) {
        const schedule = [];
        let remainingBalance = loanAmount;
        
        for (let month = 1; month <= termMonths; month++) {
            const principalPayment = monthlyPrincipal;
            const interestPayment = monthlyInterest;
            const totalPayment = principalPayment + interestPayment + monthlyFees;
            
            remainingBalance -= principalPayment;
            
            schedule.push({
                month,
                principalPayment: Math.round(principalPayment * 100) / 100,
                interestPayment: Math.round(interestPayment * 100) / 100,
                fees: Math.round(monthlyFees * 100) / 100,
                totalPayment: Math.round(totalPayment * 100) / 100,
                remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100)
            });
        }
        
        return schedule;
    }
    
    /**
     * Calculate True Annual Effective Rate (TAER)
     * @param {number} totalPaid - Total amount paid
     * @param {number} netReceived - Net amount received
     * @param {number} termMonths - Loan term in months
     * @returns {number} TAER percentage
     */
    static calculateTAER(totalPaid, netReceived, termMonths) {
        const totalCost = totalPaid - netReceived;
        const costPercentage = (totalCost / netReceived) * 100;
        const annualizedRate = (costPercentage / termMonths) * 12;
        return Math.round(annualizedRate * 100) / 100;
    }
    
    /**
     * Validate loan parameters
     * @param {number} loanAmount - Loan amount
     * @param {number} interestRate - Interest rate
     * @param {number} termMonths - Term in months
     * @throws {Error} If parameters are invalid
     */
    static validateLoanParameters(loanAmount, interestRate, termMonths) {
        if (!loanAmount || loanAmount <= 0) {
            throw new Error('Loan amount must be greater than 0');
        }
        
        if (!interestRate || interestRate < 0 || interestRate > 100) {
            throw new Error('Interest rate must be between 0 and 100');
        }
        
        if (!termMonths || termMonths <= 0 || termMonths > 60) {
            throw new Error('Term must be between 1 and 60 months');
        }
        
        // Warn if interest rate is unusually high
        if (interestRate > 20) {
            console.warn(`⚠️ Warning: Interest rate ${interestRate}% is unusually high`);
        }
    }
    
    /**
     * Calculate late fee
     * @param {number} paymentAmount - Original payment amount
     * @param {number} daysLate - Days late
     * @returns {Object} Late fee breakdown
     */
    static calculateLateFee(paymentAmount, daysLate) {
        if (daysLate <= 0) {
            return {
                applicable: false,
                lateFee: 0,
                totalDue: paymentAmount
            };
        }
        
        const lateFeeCalc = FEE_HELPERS.calculateLateFee(paymentAmount);
        
        return {
            applicable: true,
            daysLate,
            originalPayment: paymentAmount,
            lateFee: lateFeeCalc.totalLateFee,
            platformShare: lateFeeCalc.platformShare,
            lenderShare: lateFeeCalc.lenderShare,
            totalDue: lateFeeCalc.totalDue
        };
    }
    
    /**
     * Calculate withdrawal fee
     * Bank: 3% | Mobile Wallet: 5%
     * @param {number} amount - Withdrawal amount
     * @param {string} method - 'bank' or 'mobile'
     * @param {string} currency - Currency code
     * @returns {Object} Withdrawal fee breakdown
     */
    static calculateWithdrawalFee(amount, method = 'bank', currency = 'USD') {
        const feeCalc = FEE_HELPERS.calculateWithdrawalFee(amount, method);
        
        return {
            withdrawalAmount: amount,
            method: method,
            currency: currency,
            feeRate: feeCalc.feeRate,
            feeRateDescription: method === 'mobile' ? '5% mobile wallet fee' : '3% bank transfer fee',
            withdrawalFee: feeCalc.withdrawalFee,
            netAmount: feeCalc.netAmount
        };
    }
    
    /**
     * Get complete fee structure summary
     * @returns {Object} All fee rates and descriptions
     */
    static getFeeStructure() {
        return {
            borrowerFees: {
                upfront: {
                    serviceFee: { rate: BORROWER_FEES.SERVICE_FEE.rate * 100, description: BORROWER_FEES.SERVICE_FEE.description },
                    insuranceFee: { rate: BORROWER_FEES.INSURANCE_FEE.rate * 100, description: BORROWER_FEES.INSURANCE_FEE.description }
                },
                monthly: {
                    tenureFee: { rate: BORROWER_FEES.TENURE_FEE.rate * 100, description: BORROWER_FEES.TENURE_FEE.description },
                    collectionFee: { rate: BORROWER_FEES.COLLECTION_FEE.rate * 100, description: BORROWER_FEES.COLLECTION_FEE.description }
                },
                penalty: {
                    lateFee: { 
                        rate: BORROWER_FEES.LATE_FEE.rate * 100, 
                        minimum: BORROWER_FEES.LATE_FEE.minimumAmount,
                        gracePeriodHours: BORROWER_FEES.LATE_FEE.gracePeriodHours,
                        description: BORROWER_FEES.LATE_FEE.description 
                    }
                }
            },
            lenderFees: {
                upfront: {
                    platformFee: { rate: LENDER_PRIMARY_FEES.PLATFORM_FEE.rate * 100, required: true, description: LENDER_PRIMARY_FEES.PLATFORM_FEE.description },
                    insuranceFee: { rate: LENDER_PRIMARY_FEES.INSURANCE_FEE.rate * 100, required: false, optional: true, description: LENDER_PRIMARY_FEES.INSURANCE_FEE.description }
                },
                monthly: null, // No monthly fees for lenders
                secondaryMarket: {
                    dealFee: { rate: LENDER_SECONDARY_FEES.DEAL_FEE.rate * 100, description: LENDER_SECONDARY_FEES.DEAL_FEE.description }
                }
            },
            withdrawalFees: {
                bank: { rate: PLATFORM_FEES.WITHDRAWAL_FEE.bank.rate * 100, description: PLATFORM_FEES.WITHDRAWAL_FEE.bank.description },
                mobile: { rate: PLATFORM_FEES.WITHDRAWAL_FEE.mobile.rate * 100, description: PLATFORM_FEES.WITHDRAWAL_FEE.mobile.description }
            },
            otherFees: {
                recoveryFee: { rate: PLATFORM_FEES.RECOVERY_FEE.rate * 100, description: PLATFORM_FEES.RECOVERY_FEE.description }
            }
        };
    }
}

module.exports = FeeCalculatorService;

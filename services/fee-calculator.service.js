const { 
    BORROWER_FEES, 
    LENDER_PRIMARY_FEES, 
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
     * @param {Object} params - Investment parameters
     * @param {number} params.investmentAmount - Investment amount
     * @param {number} params.estimatedMonthlyYield - Expected monthly yield
     * @param {number} params.termMonths - Investment term
     * @returns {Object} Complete fee breakdown
     */
    static calculateLenderPrimaryMarketFees({ investmentAmount, estimatedMonthlyYield, termMonths = 12 }) {
        // Calculate upfront fees
        const upfrontFees = FEE_HELPERS.calculateLenderPrimaryUpfrontFees(investmentAmount);
        
        // Calculate monthly fees
        const monthlyFees = FEE_HELPERS.calculateLenderMonthlyFees(investmentAmount, estimatedMonthlyYield);
        
        // Calculate totals
        const totalGrossYield = estimatedMonthlyYield * termMonths;
        const totalMonthlyFees = monthlyFees.totalMonthlyFees * termMonths;
        const totalNetReturn = monthlyFees.netMonthlyReturn * termMonths;
        
        // Calculate ROI
        const roi = ((totalNetReturn / upfrontFees.totalInvestment) * 100).toFixed(2);
        
        // Calculate payback period
        const paybackPeriod = upfrontFees.totalInvestment / monthlyFees.netMonthlyReturn;
        
        return {
            // Investment Details
            investmentAmount,
            estimatedMonthlyYield,
            termMonths,
            
            // Upfront Fees
            upfrontFees: {
                serviceFee: upfrontFees.serviceFee,
                insuranceFee: upfrontFees.insuranceFee,
                total: upfrontFees.totalUpfront
            },
            
            // Total Investment
            totalInvestment: upfrontFees.totalInvestment,
            
            // Monthly Returns
            monthlyReturns: {
                grossYield: estimatedMonthlyYield,
                collectionFee: monthlyFees.collectionFee,
                tenureFee: monthlyFees.tenureFee,
                totalFees: monthlyFees.totalMonthlyFees,
                netReturn: monthlyFees.netMonthlyReturn
            },
            
            // Total Returns
            totalReturns: {
                grossYield: Math.round(totalGrossYield * 100) / 100,
                totalFees: Math.round(totalMonthlyFees * 100) / 100,
                netReturn: Math.round(totalNetReturn * 100) / 100
            },
            
            // Performance Metrics
            roi: parseFloat(roi),
            paybackPeriod: Math.round(paybackPeriod * 10) / 10,
            annualizedReturn: parseFloat(roi) // Same as ROI for 12-month term
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
}

module.exports = FeeCalculatorService;

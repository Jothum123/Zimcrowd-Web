const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('../middleware/auth');
const { 
    BORROWER_FEES, 
    LENDER_PRIMARY_FEES, 
    LENDER_SECONDARY_FEES,
    PLATFORM_FEES,
    FEE_HELPERS 
} = require('../constants/fees');
const FeeCalculatorService = require('../services/fee-calculator.service');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * Calculate Borrower Fees
 * POST /api/fees/calculate-borrower
 * Uses centralized fee constants
 */
router.post('/calculate-borrower', authenticateUser, async (req, res) => {
    try {
        const { amount, term, interest_rate, currency = 'USD' } = req.body;

        if (!amount || !term || !interest_rate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: amount, term, interest_rate'
            });
        }

        // Use FeeCalculatorService for comprehensive calculation
        const feeCalculation = FeeCalculatorService.calculateBorrowerLoanFees({
            loanAmount: amount,
            interestRate: interest_rate,
            termMonths: term,
            currency: currency
        });

        res.json({
            success: true,
            data: {
                requested_amount: feeCalculation.requestedAmount,
                currency: feeCalculation.currency,
                upfront_fees: {
                    service_fee: feeCalculation.upfrontFees.serviceFee,
                    insurance_fee: feeCalculation.upfrontFees.insuranceFee,
                    total: feeCalculation.upfrontFees.total
                },
                net_amount: feeCalculation.netAmountReceived,
                net_percentage: feeCalculation.netPercentage,
                monthly_breakdown: feeCalculation.monthlyBreakdown,
                total_costs: feeCalculation.totalCosts,
                true_annual_effective_rate: feeCalculation.trueAnnualEffectiveRate,
                repayment_schedule: feeCalculation.repaymentSchedule
            }
        });
    } catch (error) {
        console.error('Calculate borrower fees error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate fees'
        });
    }
});

/**
 * Calculate Lender Fees
 * POST /api/fees/calculate-lender
 * NEW STRUCTURE: 10% platform fee + 5% optional insurance, NO monthly fees
 */
router.post('/calculate-lender', authenticateUser, async (req, res) => {
    try {
        const { investment_amount, estimated_monthly_yield, term = 12, include_insurance = false } = req.body;

        if (!investment_amount || !estimated_monthly_yield) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: investment_amount, estimated_monthly_yield'
            });
        }

        // Use FeeCalculatorService for comprehensive calculation
        const feeCalculation = FeeCalculatorService.calculateLenderPrimaryMarketFees({
            investmentAmount: investment_amount,
            estimatedMonthlyYield: estimated_monthly_yield,
            termMonths: term,
            includeInsurance: include_insurance
        });

        res.json({
            success: true,
            data: {
                investment_amount: feeCalculation.investmentAmount,
                upfront_fees: {
                    platform_fee: feeCalculation.upfrontFees.platformFee,
                    insurance_fee: feeCalculation.upfrontFees.insuranceFee,
                    insurance_opted_in: feeCalculation.upfrontFees.insuranceOptedIn,
                    total: feeCalculation.upfrontFees.total
                },
                total_investment: feeCalculation.totalInvestment,
                monthly_returns: {
                    gross_yield: feeCalculation.monthlyReturns.grossYield,
                    fees: feeCalculation.monthlyReturns.fees,
                    net_return: feeCalculation.monthlyReturns.netReturn
                },
                total_returns: feeCalculation.totalReturns,
                performance: {
                    roi: feeCalculation.roi,
                    payback_period: feeCalculation.paybackPeriod,
                    annualized_return: feeCalculation.annualizedReturn
                },
                fee_structure: feeCalculation.feeStructure
            }
        });
    } catch (error) {
        console.error('Calculate lender fees error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate fees'
        });
    }
});

/**
 * Calculate Late Fee
 * POST /api/fees/calculate-late-fee
 * Uses centralized fee constants
 */
router.post('/calculate-late-fee', authenticateUser, async (req, res) => {
    try {
        const { payment_amount, days_late = 1 } = req.body;

        if (!payment_amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment_amount'
            });
        }

        const feeCalculation = FeeCalculatorService.calculateLateFee(payment_amount, days_late);

        res.json({
            success: true,
            data: {
                payment_amount: payment_amount,
                days_late: days_late,
                applicable: feeCalculation.applicable,
                late_fee: feeCalculation.lateFee,
                platform_share: feeCalculation.platformShare,
                lender_share: feeCalculation.lenderShare,
                total_due: feeCalculation.totalDue,
                fee_rate: BORROWER_FEES.LATE_FEE.rate * 100,
                minimum_fee: BORROWER_FEES.LATE_FEE.minimumAmount,
                grace_period_hours: BORROWER_FEES.LATE_FEE.gracePeriodHours
            }
        });
    } catch (error) {
        console.error('Calculate late fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate late fee'
        });
    }
});

/**
 * Calculate Secondary Market Deal Fee
 * POST /api/fees/calculate-deal-fee
 * 5% deal fee
 */
router.post('/calculate-deal-fee', authenticateUser, async (req, res) => {
    try {
        const { purchase_amount } = req.body;

        if (!purchase_amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing purchase_amount'
            });
        }

        const feeCalculation = FEE_HELPERS.calculateSecondaryMarketFee(purchase_amount);

        res.json({
            success: true,
            data: {
                purchase_amount: purchase_amount,
                deal_fee: feeCalculation.dealFee,
                deal_fee_percent: LENDER_SECONDARY_FEES.DEAL_FEE.rate * 100,
                total_cost: feeCalculation.totalCost,
                description: LENDER_SECONDARY_FEES.DEAL_FEE.description
            }
        });
    } catch (error) {
        console.error('Calculate deal fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate deal fee'
        });
    }
});

/**
 * Calculate Recovery Fee
 * POST /api/fees/calculate-recovery-fee
 * 30% recovery fee
 */
router.post('/calculate-recovery-fee', authenticateUser, async (req, res) => {
    try {
        const { collected_amount, lender_investment, total_loan_amount } = req.body;

        if (!collected_amount || !lender_investment || !total_loan_amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: collected_amount, lender_investment, total_loan_amount'
            });
        }

        const recoveryFeeCalc = FEE_HELPERS.calculateRecoveryFee(collected_amount);

        // Calculate lender's share
        const lenderProportion = lender_investment / total_loan_amount;
        const lenderShareGross = collected_amount * lenderProportion;
        const lenderRecoveryFee = lenderShareGross * PLATFORM_FEES.RECOVERY_FEE.rate;
        const lenderNetRecovery = lenderShareGross - lenderRecoveryFee;

        // Calculate loss
        const lenderLoss = lender_investment - lenderNetRecovery;
        const lossPercentage = (lenderLoss / lender_investment) * 100;

        res.json({
            success: true,
            data: {
                collected_amount: collected_amount,
                recovery_fee: recoveryFeeCalc.recoveryFee,
                recovery_fee_percent: PLATFORM_FEES.RECOVERY_FEE.rate * 100,
                net_distribution: recoveryFeeCalc.netToLender,
                lender_details: {
                    investment: lender_investment,
                    proportion: Math.round(lenderProportion * 10000) / 10000,
                    share_gross: Math.round(lenderShareGross * 100) / 100,
                    recovery_fee: Math.round(lenderRecoveryFee * 100) / 100,
                    net_recovery: Math.round(lenderNetRecovery * 100) / 100,
                    loss: Math.round(lenderLoss * 100) / 100,
                    loss_percentage: Math.round(lossPercentage * 100) / 100
                }
            }
        });
    } catch (error) {
        console.error('Calculate recovery fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate recovery fee'
        });
    }
});

/**
 * Calculate Withdrawal Fee
 * POST /api/fees/calculate-withdrawal-fee
 * Bank: 3% | Mobile: 5%
 */
router.post('/calculate-withdrawal-fee', authenticateUser, async (req, res) => {
    try {
        const { amount, method = 'bank', currency = 'USD' } = req.body;

        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing amount'
            });
        }

        if (!['bank', 'mobile'].includes(method)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid method. Must be "bank" or "mobile"'
            });
        }

        const feeCalculation = FeeCalculatorService.calculateWithdrawalFee(amount, method, currency);

        res.json({
            success: true,
            data: feeCalculation
        });
    } catch (error) {
        console.error('Calculate withdrawal fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate withdrawal fee'
        });
    }
});

/**
 * Get Fee Structure
 * GET /api/fees/structure
 * Returns complete fee structure from centralized constants
 */
router.get('/structure', async (req, res) => {
    try {
        const feeStructure = FeeCalculatorService.getFeeStructure();
        
        res.json({
            success: true,
            data: feeStructure,
            summary: {
                borrower: {
                    upfront_total: '13% (10% service + 3% insurance)',
                    net_received: '87% of loan amount',
                    monthly_fees: 'Tenure (1%) + Collection (5%)',
                    late_fee: '10% ($50 minimum)'
                },
                lender: {
                    platform_fee: '10% (required)',
                    insurance_fee: '5% (optional)',
                    monthly_fees: 'None - receive full yield',
                    secondary_market: '5% deal fee'
                },
                withdrawal: {
                    bank: '3%',
                    mobile_wallet: '5%'
                },
                recovery: '30% of recovered amount'
            }
        });
    } catch (error) {
        console.error('Get fee structure error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get fee structure'
        });
    }
});

module.exports = router;

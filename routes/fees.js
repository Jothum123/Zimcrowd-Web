const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Calculate Borrower Fees
 * POST /api/fees/calculate-borrower
 */
router.post('/calculate-borrower', authenticateUser, async (req, res) => {
    try {
        const { amount, term, interest_rate } = req.body;

        if (!amount || !term || !interest_rate) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        // Borrower fee structure
        const SERVICE_FEE_PERCENT = 10; // 10%
        const INSURANCE_FEE_PERCENT = 5; // 5%
        const TENURE_FEE_PERCENT = 1; // 1% monthly
        const COLLECTION_FEE_PERCENT = 5; // 5% of payment

        // Upfront fees
        const serviceFee = amount * (SERVICE_FEE_PERCENT / 100);
        const insuranceFee = amount * (INSURANCE_FEE_PERCENT / 100);
        const totalUpfrontFees = serviceFee + insuranceFee;
        const netAmount = amount - totalUpfrontFees;

        // Monthly payment calculation (PMT formula)
        const monthlyRate = interest_rate / 100 / 12;
        const baseMonthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, term)) / (Math.pow(1 + monthlyRate, term) - 1);

        // Monthly fees
        const tenureFeeMonthly = amount * (TENURE_FEE_PERCENT / 100);
        const collectionFeeMonthly = baseMonthlyPayment * (COLLECTION_FEE_PERCENT / 100);
        const totalMonthlyPayment = baseMonthlyPayment + tenureFeeMonthly + collectionFeeMonthly;

        // Total calculations
        const totalTenureFees = tenureFeeMonthly * term;
        const totalCollectionFees = collectionFeeMonthly * term;
        const totalPlatformFees = totalUpfrontFees + totalTenureFees + totalCollectionFees;
        const totalRepayment = totalMonthlyPayment * term;
        const totalInterest = (baseMonthlyPayment * term) - amount;

        res.json({
            success: true,
            data: {
                requested_amount: amount,
                upfront_fees: {
                    service_fee: serviceFee,
                    insurance_fee: insuranceFee,
                    total: totalUpfrontFees
                },
                net_amount: netAmount,
                monthly_fees: {
                    tenure_fee: tenureFeeMonthly,
                    collection_fee: collectionFeeMonthly,
                    total: tenureFeeMonthly + collectionFeeMonthly
                },
                payments: {
                    base_monthly_payment: baseMonthlyPayment,
                    total_monthly_payment: totalMonthlyPayment,
                    total_interest: totalInterest,
                    total_repayment: totalRepayment
                },
                total_fees: {
                    tenure_fees: totalTenureFees,
                    collection_fees: totalCollectionFees,
                    total_platform_fees: totalPlatformFees
                }
            }
        });
    } catch (error) {
        console.error('Calculate borrower fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate fees'
        });
    }
});

/**
 * Calculate Lender Fees
 * POST /api/fees/calculate-lender
 */
router.post('/calculate-lender', authenticateUser, async (req, res) => {
    try {
        const { investment_amount, loan_amount, monthly_payment, term } = req.body;

        if (!investment_amount || !loan_amount || !monthly_payment || !term) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        // Lender fee structure
        const SERVICE_FEE_PERCENT = 10; // 10%
        const INSURANCE_FEE_PERCENT = 5; // 5%
        const COLLECTION_FEE_PERCENT = 5; // 5% of returns

        // Upfront fees
        const serviceFee = investment_amount * (SERVICE_FEE_PERCENT / 100);
        const insuranceFee = investment_amount * (INSURANCE_FEE_PERCENT / 100);
        const totalUpfrontFees = serviceFee + insuranceFee;
        const netInvestment = investment_amount - totalUpfrontFees;

        // Monthly returns calculation
        const investmentProportion = investment_amount / loan_amount;
        const grossMonthlyReturn = monthly_payment * investmentProportion;
        const collectionFeeMonthly = grossMonthlyReturn * (COLLECTION_FEE_PERCENT / 100);
        const netMonthlyReturn = grossMonthlyReturn - collectionFeeMonthly;

        // Total calculations
        const totalGrossReturns = grossMonthlyReturn * term;
        const totalCollectionFees = collectionFeeMonthly * term;
        const totalNetReturns = netMonthlyReturn * term;
        const totalFees = totalUpfrontFees + totalCollectionFees;

        res.json({
            success: true,
            data: {
                investment_amount: investment_amount,
                upfront_fees: {
                    service_fee: serviceFee,
                    insurance_fee: insuranceFee,
                    total: totalUpfrontFees
                },
                net_investment: netInvestment,
                monthly_returns: {
                    gross_return: grossMonthlyReturn,
                    collection_fee: collectionFeeMonthly,
                    net_return: netMonthlyReturn
                },
                total_returns: {
                    gross_returns: totalGrossReturns,
                    collection_fees: totalCollectionFees,
                    net_returns: totalNetReturns,
                    total_fees: totalFees
                },
                investment_proportion: investmentProportion
            }
        });
    } catch (error) {
        console.error('Calculate lender fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate fees'
        });
    }
});

/**
 * Calculate Late Fee
 * POST /api/fees/calculate-late-fee
 */
router.post('/calculate-late-fee', authenticateUser, async (req, res) => {
    try {
        const { remaining_balance } = req.body;

        if (!remaining_balance) {
            return res.status(400).json({
                success: false,
                message: 'Missing remaining balance'
            });
        }

        const LATE_FEE_PERCENT = 10; // 10%
        const LATE_FEE_MINIMUM = 50; // $50
        const PLATFORM_SHARE_PERCENT = 95; // 95%
        const LENDER_SHARE_PERCENT = 5; // 5%

        const calculatedFee = remaining_balance * (LATE_FEE_PERCENT / 100);
        const lateFee = Math.max(calculatedFee, LATE_FEE_MINIMUM);
        const platformShare = lateFee * (PLATFORM_SHARE_PERCENT / 100);
        const lenderShare = lateFee * (LENDER_SHARE_PERCENT / 100);

        res.json({
            success: true,
            data: {
                remaining_balance: remaining_balance,
                late_fee: lateFee,
                platform_share: platformShare,
                lender_share: lenderShare,
                lender_share_percent: LENDER_SHARE_PERCENT
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
 */
router.post('/calculate-deal-fee', authenticateUser, async (req, res) => {
    try {
        const { sale_price } = req.body;

        if (!sale_price) {
            return res.status(400).json({
                success: false,
                message: 'Missing sale price'
            });
        }

        const DEAL_FEE_PERCENT = 2; // 2%
        const dealFee = sale_price * (DEAL_FEE_PERCENT / 100);
        const netProceeds = sale_price - dealFee;

        res.json({
            success: true,
            data: {
                sale_price: sale_price,
                deal_fee: dealFee,
                deal_fee_percent: DEAL_FEE_PERCENT,
                net_proceeds: netProceeds
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
 */
router.post('/calculate-recovery-fee', authenticateUser, async (req, res) => {
    try {
        const { collected_amount, lender_investment, total_loan_amount } = req.body;

        if (!collected_amount || !lender_investment || !total_loan_amount) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters'
            });
        }

        const RECOVERY_FEE_PERCENT = 30; // 30%

        // Calculate recovery fee
        const recoveryFee = collected_amount * (RECOVERY_FEE_PERCENT / 100);
        const netDistribution = collected_amount - recoveryFee;

        // Calculate lender's share
        const lenderProportion = lender_investment / total_loan_amount;
        const lenderShareGross = collected_amount * lenderProportion;
        const lenderRecoveryFee = lenderShareGross * (RECOVERY_FEE_PERCENT / 100);
        const lenderNetRecovery = lenderShareGross - lenderRecoveryFee;

        // Calculate loss
        const lenderLoss = lender_investment - lenderNetRecovery;
        const lossPercentage = (lenderLoss / lender_investment) * 100;

        res.json({
            success: true,
            data: {
                collected_amount: collected_amount,
                recovery_fee: recoveryFee,
                recovery_fee_percent: RECOVERY_FEE_PERCENT,
                net_distribution: netDistribution,
                lender_details: {
                    investment: lender_investment,
                    proportion: lenderProportion,
                    share_gross: lenderShareGross,
                    recovery_fee: lenderRecoveryFee,
                    net_recovery: lenderNetRecovery,
                    loss: lenderLoss,
                    loss_percentage: lossPercentage
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
 * Get Fee Structure
 * GET /api/fees/structure
 */
router.get('/structure', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                borrower_fees: {
                    upfront: {
                        service_fee: { percent: 10, description: 'Deducted before disbursement' },
                        insurance_fee: { percent: 5, description: 'Deducted before disbursement - Provides 90% automatic payout protection when loan becomes late' }
                    },
                    monthly: {
                        tenure_fee: { percent: 1, description: 'Percentage of loan amount, added to monthly payment' },
                        collection_fee: { percent: 5, description: 'Percentage of monthly payment' }
                    },
                    penalty: {
                        late_fee: { percent: 10, minimum: 50, description: 'Charged when 1+ days late, percentage of remaining balance' }
                    }
                },
                lender_fees: {
                    upfront: {
                        service_fee: { percent: 10, description: 'Deducted before investment' },
                        insurance_fee: { percent: 5, description: 'Deducted before investment - Provides 90% automatic payout protection when loan becomes late' }
                    },
                    ongoing: {
                        collection_fee: { percent: 5, description: 'Deducted from monthly returns, continues with investment' }
                    },
                    secondary_market: {
                        deal_fee: { percent: 2, description: 'Deducted from sale price' }
                    }
                },
                lender_benefits: {
                    late_fee_share: { percent: 5, description: 'Share of late fees collected from borrower' }
                },
                default_fees: {
                    recovery_fee: { percent: 30, description: 'Deducted from recovered amount, paid to recovery companies, charged to lenders' }
                }
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

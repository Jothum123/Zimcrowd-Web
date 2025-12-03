/**
 * Test Fee Calculations
 * Run: node test-fee-calculations.js
 */

require('dotenv').config();

const FeeCalculatorService = require('./services/fee-calculator.service');
const { FEE_HELPERS, BORROWER_FEES, LENDER_PRIMARY_FEES, LENDER_SECONDARY_FEES, PLATFORM_FEES } = require('./constants/fees');

console.log('\n========================================');
console.log('💰 Testing Fee Calculations');
console.log('========================================\n');

// ============================================
// TEST 1: BORROWER FEES
// ============================================
console.log('📋 TEST 1: BORROWER FEES');
console.log('========================\n');

const borrowerCalc = FeeCalculatorService.calculateBorrowerLoanFees({
    loanAmount: 1000,
    interestRate: 5,
    termMonths: 12,
    currency: 'USD'
});

console.log('Loan: $1,000 @ 5% for 12 months');
console.log('\nUpfront Fees:');
console.log(`  Service Fee (10%): $${borrowerCalc.upfrontFees.serviceFee}`);
console.log(`  Insurance Fee (3%): $${borrowerCalc.upfrontFees.insuranceFee}`);
console.log(`  Total Upfront: $${borrowerCalc.upfrontFees.total}`);
console.log(`  Net Received: $${borrowerCalc.netAmountReceived} (${borrowerCalc.netPercentage})`);

console.log('\nMonthly Breakdown:');
console.log(`  Principal: $${borrowerCalc.monthlyBreakdown.principal}`);
console.log(`  Interest: $${borrowerCalc.monthlyBreakdown.interest}`);
console.log(`  Tenure Fee (1%): $${borrowerCalc.monthlyBreakdown.tenureFee}`);
console.log(`  Collection Fee (5%): $${borrowerCalc.monthlyBreakdown.collectionFee}`);
console.log(`  Total Payment: $${borrowerCalc.monthlyBreakdown.totalPayment}`);

console.log('\nTotal Costs:');
console.log(`  Total Interest: $${borrowerCalc.totalCosts.totalInterest}`);
console.log(`  Total Upfront Fees: $${borrowerCalc.totalCosts.totalUpfrontFees}`);
console.log(`  Total Monthly Fees: $${borrowerCalc.totalCosts.totalMonthlyFees}`);
console.log(`  Total Repayment: $${borrowerCalc.totalCosts.totalRepayment}`);
console.log(`  TAER: ${borrowerCalc.trueAnnualEffectiveRate}%`);

// ============================================
// TEST 2: LENDER FEES (NEW STRUCTURE)
// ============================================
console.log('\n\n📋 TEST 2: LENDER FEES (NEW STRUCTURE)');
console.log('======================================\n');

// Without insurance
const lenderCalcNoIns = FeeCalculatorService.calculateLenderPrimaryMarketFees({
    investmentAmount: 1000,
    estimatedMonthlyYield: 55,
    termMonths: 12,
    includeInsurance: false
});

console.log('Investment: $1,000 @ $55/month yield (WITHOUT insurance)');
console.log('\nUpfront Fees:');
console.log(`  Platform Fee (10%): $${lenderCalcNoIns.upfrontFees.platformFee}`);
console.log(`  Insurance Fee (5%): $${lenderCalcNoIns.upfrontFees.insuranceFee} (opted out)`);
console.log(`  Total Upfront: $${lenderCalcNoIns.upfrontFees.total}`);
console.log(`  Total Investment: $${lenderCalcNoIns.totalInvestment}`);

console.log('\nMonthly Returns (NO FEES):');
console.log(`  Gross Yield: $${lenderCalcNoIns.monthlyReturns.grossYield}`);
console.log(`  Fees: $${lenderCalcNoIns.monthlyReturns.fees}`);
console.log(`  Net Return: $${lenderCalcNoIns.monthlyReturns.netReturn}`);

console.log('\nPerformance:');
console.log(`  ROI: ${lenderCalcNoIns.roi}%`);
console.log(`  Payback Period: ${lenderCalcNoIns.paybackPeriod} months`);

// With insurance
const lenderCalcWithIns = FeeCalculatorService.calculateLenderPrimaryMarketFees({
    investmentAmount: 1000,
    estimatedMonthlyYield: 55,
    termMonths: 12,
    includeInsurance: true
});

console.log('\n\nInvestment: $1,000 @ $55/month yield (WITH insurance)');
console.log('\nUpfront Fees:');
console.log(`  Platform Fee (10%): $${lenderCalcWithIns.upfrontFees.platformFee}`);
console.log(`  Insurance Fee (5%): $${lenderCalcWithIns.upfrontFees.insuranceFee} (opted in)`);
console.log(`  Total Upfront: $${lenderCalcWithIns.upfrontFees.total}`);
console.log(`  Total Investment: $${lenderCalcWithIns.totalInvestment}`);

// ============================================
// TEST 3: WITHDRAWAL FEES
// ============================================
console.log('\n\n📋 TEST 3: WITHDRAWAL FEES');
console.log('==========================\n');

const bankWithdrawal = FeeCalculatorService.calculateWithdrawalFee(100, 'bank', 'USD');
console.log('Bank Withdrawal: $100');
console.log(`  Fee Rate: ${bankWithdrawal.feeRate}%`);
console.log(`  Fee: $${bankWithdrawal.withdrawalFee}`);
console.log(`  Net Amount: $${bankWithdrawal.netAmount}`);

const mobileWithdrawal = FeeCalculatorService.calculateWithdrawalFee(100, 'mobile', 'USD');
console.log('\nMobile Wallet Withdrawal: $100');
console.log(`  Fee Rate: ${mobileWithdrawal.feeRate}%`);
console.log(`  Fee: $${mobileWithdrawal.withdrawalFee}`);
console.log(`  Net Amount: $${mobileWithdrawal.netAmount}`);

// ============================================
// TEST 4: LATE FEES
// ============================================
console.log('\n\n📋 TEST 4: LATE FEES');
console.log('====================\n');

const lateFee = FeeCalculatorService.calculateLateFee(150, 5);
console.log('Late Payment: $150 (5 days late)');
console.log(`  Applicable: ${lateFee.applicable}`);
console.log(`  Late Fee: $${lateFee.lateFee}`);
console.log(`  Platform Share: $${lateFee.platformShare}`);
console.log(`  Lender Share: $${lateFee.lenderShare}`);
console.log(`  Total Due: $${lateFee.totalDue}`);

// ============================================
// TEST 5: SECONDARY MARKET DEAL FEE
// ============================================
console.log('\n\n📋 TEST 5: SECONDARY MARKET DEAL FEE');
console.log('=====================================\n');

const dealFee = FEE_HELPERS.calculateSecondaryMarketFee(500);
console.log('Secondary Market Purchase: $500');
console.log(`  Deal Fee (5%): $${dealFee.dealFee}`);
console.log(`  Total Cost: $${dealFee.totalCost}`);

// ============================================
// TEST 6: RECOVERY FEE
// ============================================
console.log('\n\n📋 TEST 6: RECOVERY FEE');
console.log('=======================\n');

const recoveryFee = FEE_HELPERS.calculateRecoveryFee(700);
console.log('Recovered Amount: $700');
console.log(`  Recovery Fee (30%): $${recoveryFee.recoveryFee}`);
console.log(`  Net to Lender: $${recoveryFee.netToLender}`);

// ============================================
// FEE STRUCTURE SUMMARY
// ============================================
console.log('\n\n📋 FEE STRUCTURE SUMMARY');
console.log('========================\n');

const feeStructure = FeeCalculatorService.getFeeStructure();

console.log('BORROWER FEES:');
console.log(`  Service Fee: ${feeStructure.borrowerFees.upfront.serviceFee.rate}%`);
console.log(`  Insurance Fee: ${feeStructure.borrowerFees.upfront.insuranceFee.rate}%`);
console.log(`  Tenure Fee: ${feeStructure.borrowerFees.monthly.tenureFee.rate}% monthly`);
console.log(`  Collection Fee: ${feeStructure.borrowerFees.monthly.collectionFee.rate}%`);
console.log(`  Late Fee: ${feeStructure.borrowerFees.penalty.lateFee.rate}% ($${feeStructure.borrowerFees.penalty.lateFee.minimum} min)`);

console.log('\nLENDER FEES:');
console.log(`  Platform Fee: ${feeStructure.lenderFees.upfront.platformFee.rate}% (required)`);
console.log(`  Insurance Fee: ${feeStructure.lenderFees.upfront.insuranceFee.rate}% (optional)`);
console.log(`  Monthly Fees: ${feeStructure.lenderFees.monthly === null ? 'None' : 'Yes'}`);
console.log(`  Deal Fee: ${feeStructure.lenderFees.secondaryMarket.dealFee.rate}%`);

console.log('\nWITHDRAWAL FEES:');
console.log(`  Bank: ${feeStructure.withdrawalFees.bank.rate}%`);
console.log(`  Mobile: ${feeStructure.withdrawalFees.mobile.rate}%`);

console.log('\nOTHER FEES:');
console.log(`  Recovery Fee: ${feeStructure.otherFees.recoveryFee.rate}%`);

console.log('\n========================================');
console.log('✅ All Fee Calculations Complete!');
console.log('========================================\n');

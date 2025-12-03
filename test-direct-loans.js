/**
 * Test ZimCrowd Direct Lending System
 * Run: node test-direct-loans.js
 */

require('dotenv').config();

const { PLATFORM_FEES } = require('./constants/fees');

console.log('\n========================================');
console.log('🏦 Testing ZimCrowd Direct Lending');
console.log('========================================\n');

const config = PLATFORM_FEES.DIRECT_LENDING;

// ============================================
// TEST 1: INTEREST RATES
// ============================================
console.log('📋 TEST 1: INTEREST RATES (Fixed)');
console.log('==================================\n');

console.log('Currency | Monthly Rate | Annual Rate');
console.log('---------|--------------|------------');
console.log(`USD      | ${config.interestRates.USD * 100}%          | ${config.interestRates.USD * 100 * 12}%`);
console.log(`ZWG      | ${config.interestRates.ZWG * 100}%         | ${config.interestRates.ZWG * 100 * 12}%`);

// ============================================
// TEST 2: LOAN LIMITS
// ============================================
console.log('\n\n📋 TEST 2: LOAN LIMITS');
console.log('======================\n');

console.log('Currency | Minimum | Maximum');
console.log('---------|---------|--------');
console.log(`USD      | $${config.limits.USD.min}    | $${config.limits.USD.max.toLocaleString()}`);
console.log(`ZWG      | ZWG ${config.limits.ZWG.min} | ZWG ${config.limits.ZWG.max.toLocaleString()}`);

// ============================================
// TEST 3: EMPLOYMENT TYPE LIMITS
// ============================================
console.log('\n\n📋 TEST 3: EMPLOYMENT TYPE LIMITS');
console.log('==================================\n');

console.log('NO COLD START - Uses DTNI (Debt-to-Net-Income) for affordability\n');
console.log('Employment  | DTNI Ratio | Max Loan (USD) | Max Loan (ZWG) | Max Tenure');
console.log('------------|------------|----------------|----------------|------------');
for (const [type, cfg] of Object.entries(config.employmentTypes)) {
    console.log(`${type.padEnd(11)} | ${(cfg.dtniRatio * 100)}%        | $${cfg.maxLoan.USD.toLocaleString().padEnd(13)} | ZWG ${cfg.maxLoan.ZWG.toLocaleString().padEnd(10)} | ${cfg.maxTenureMonths} months`);
}

// ============================================
// TEST 4: LATE FEES
// ============================================
console.log('\n\n📋 TEST 4: LATE FEES (100% to ZimCrowd)');
console.log('=======================================\n');

console.log(`Late Fee Rate: ${config.lateFee.rate * 100}% of payment`);
console.log(`Minimum (USD): $${config.lateFee.minimum.USD}`);
console.log(`Minimum (ZWG): ZWG ${config.lateFee.minimum.ZWG}`);
console.log(`Grace Period: ${config.lateFee.gracePeriodHours} hours`);
console.log(`ZimCrowd Share: ${config.lateFee.zimcrowdShare * 100}%`);

// ============================================
// TEST 5: INTEREST CALCULATION EXAMPLES
// ============================================
console.log('\n\n📋 TEST 5: INTEREST CALCULATION EXAMPLES');
console.log('=========================================\n');

function calculateInterest(principal, termMonths, currency) {
    const rate = currency === 'ZWG' ? 0.10 : 0.08;
    const monthlyInterest = principal * rate;
    const totalInterest = monthlyInterest * termMonths;
    const totalRepayment = principal + totalInterest;
    const monthlyPayment = totalRepayment / termMonths;
    return { monthlyInterest, totalInterest, totalRepayment, monthlyPayment };
}

console.log('USD LOANS (8% monthly):');
console.log('------------------------');
const usdExamples = [
    { principal: 100, term: 1 },
    { principal: 500, term: 3 },
    { principal: 1000, term: 6 },
    { principal: 3000, term: 12 }
];

console.log('Principal | Term     | Total Interest | Total Repayment | Monthly Payment');
console.log('----------|----------|----------------|-----------------|----------------');
for (const ex of usdExamples) {
    const calc = calculateInterest(ex.principal, ex.term, 'USD');
    console.log(`$${ex.principal.toLocaleString().padEnd(8)} | ${ex.term} month(s) | $${calc.totalInterest.toFixed(2).padEnd(13)} | $${calc.totalRepayment.toFixed(2).padEnd(14)} | $${calc.monthlyPayment.toFixed(2)}`);
}

console.log('\n\nZWG LOANS (10% monthly):');
console.log('-------------------------');
const zwgExamples = [
    { principal: 2700, term: 1 },
    { principal: 13500, term: 3 },
    { principal: 27000, term: 6 },
    { principal: 40000, term: 12 }
];

console.log('Principal     | Term     | Total Interest | Total Repayment | Monthly Payment');
console.log('--------------|----------|----------------|-----------------|----------------');
for (const ex of zwgExamples) {
    const calc = calculateInterest(ex.principal, ex.term, 'ZWG');
    console.log(`ZWG ${ex.principal.toLocaleString().padEnd(8)} | ${ex.term} month(s) | ZWG ${calc.totalInterest.toFixed(2).padEnd(10)} | ZWG ${calc.totalRepayment.toFixed(2).padEnd(11)} | ZWG ${calc.monthlyPayment.toFixed(2)}`);
}

// ============================================
// TEST 6: ELIGIBILITY RULES
// ============================================
console.log('\n\n📋 TEST 6: ELIGIBILITY RULES');
console.log('============================\n');

console.log('✅ APPROVED if:');
console.log('   - All required documents are VERIFIED');
console.log('   - Account is NOT suspended');
console.log('   - Account is NOT banned');
console.log('   - No P2P loans in arrears');
console.log('   - No Direct loans in arrears');

console.log('\n❌ REJECTED if:');
console.log('   - Missing or unverified documents');
console.log('   - Account suspended');
console.log('   - Account banned');
console.log('   - Has P2P loan in arrears');
console.log('   - Has Direct loan in arrears');

// ============================================
// TEST 7: REQUIRED DOCUMENTS
// ============================================
console.log('\n\n📋 TEST 7: REQUIRED DOCUMENTS');
console.log('==============================\n');

console.log('GOVERNMENT & PRIVATE EMPLOYEES:');
console.log('  ✅ National ID (Front & Back)');
console.log('  ✅ Selfie Photo');
console.log('  ✅ Payslip');
console.log('  ✅ Bank Statement');
console.log('  ✅ Proof of Residence');
console.log('  ✅ Employment Contract');

console.log('\nINFORMAL EMPLOYEES:');
console.log('  ✅ National ID (Front & Back)');
console.log('  ✅ Selfie Photo');
console.log('  ✅ Proof of Residence');
console.log('  ✅ Bank Statement');
console.log('  ✅ Mobile Money Statement (EcoCash/OneMoney/Omari/InnBucks)');
console.log('  ❌ Payslip (NOT required)');
console.log('  ❌ Employment Contract (NOT required)');

console.log('\nBUSINESS OWNERS:');
console.log('  ✅ National ID (Front & Back)');
console.log('  ✅ Selfie Photo');
console.log('  ✅ Bank Statement');
console.log('  ✅ Proof of Residence');
console.log('  ✅ Business Registration Certificate');

// ============================================
// SUMMARY
// ============================================
console.log('\n\n📋 ZIMCROWD DIRECT LENDING SUMMARY');
console.log('===================================\n');

console.log('PRODUCT: ZimCrowd Direct');
console.log('FUNDING: ZimCrowd Capital (NOT P2P)');
console.log('SPEED: Instant (minutes)');
console.log('APPROVAL: Document-based (NOT ZimScore)');

console.log('\nINTEREST RATES:');
console.log('  USD: 8% per month (96% per annum)');
console.log('  ZWG: 10% per month (120% per annum)');

console.log('\nLOAN LIMITS:');
console.log('  USD: $25 - $3,000');
console.log('  ZWG: ZWG 675 - ZWG 40,000');

console.log('\nLATE FEES:');
console.log('  Rate: 10% of payment (min $50 USD / ZWG 1,350)');
console.log('  Grace Period: 24 hours');
console.log('  Distribution: 100% to ZimCrowd');

console.log('\nAPI ENDPOINTS:');
console.log('  GET  /api/direct-loans/eligibility');
console.log('  GET  /api/direct-loans/documents');
console.log('  GET  /api/direct-loans/calculate?amount=1000&termMonths=3&currency=USD');
console.log('  POST /api/direct-loans/create-offer');
console.log('  POST /api/direct-loans/accept-offer');
console.log('  GET  /api/direct-loans/my-loans');

console.log('\n========================================');
console.log('✅ ZimCrowd Direct Lending Test Complete!');
console.log('========================================\n');

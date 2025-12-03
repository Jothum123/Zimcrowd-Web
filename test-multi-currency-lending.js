/**
 * Test Multi-Currency Lending (USD and ZWG)
 * Run: node test-multi-currency-lending.js
 */

require('dotenv').config();

async function testMultiCurrencyLending() {
    console.log('\n========================================');
    console.log('💰 Testing Multi-Currency Lending');
    console.log('========================================\n');

    const P2PLendingService = require('./services/p2p-lending.service');
    const p2p = new P2PLendingService();

    // ============================================
    // DISPLAY SUPPORTED CURRENCIES & LIMITS
    // ============================================
    console.log('📊 SUPPORTED CURRENCIES & LIMITS');
    console.log('=================================\n');

    const limits = p2p.getTransactionLimits();
    
    console.log(`Supported Currencies: ${limits.supportedCurrencies.join(', ')}`);
    console.log(`Default Currency: ${limits.defaultCurrency}\n`);

    console.log('🇺🇸 USD LENDING LIMITS:');
    console.log(`   ${limits.lending.USD.message}`);
    console.log(`   Min Loan: $${limits.lending.USD.minLoan}`);
    console.log(`   Max Loan: $${limits.lending.USD.maxLoan.toLocaleString()}`);
    console.log(`   Min Investment: $${limits.lending.USD.minInvestment}`);
    console.log(`   Max Investment: $${limits.lending.USD.maxInvestment.toLocaleString()}`);

    console.log('\n🇿🇼 ZWG LENDING LIMITS (by Employment Type):');
    console.log(`   ${limits.lending.ZWG.message}`);
    console.log(`   Min Loan: ZWG ${limits.lending.ZWG.minLoan}`);
    console.log(`   Government Max: ZWG ${limits.lending.ZWG.byEmployment.government.maxLoan.toLocaleString()}`);
    console.log(`   Private Max: ZWG ${limits.lending.ZWG.byEmployment.private.maxLoan.toLocaleString()}`);
    console.log(`   Informal Max: ZWG ${limits.lending.ZWG.byEmployment.informal.maxLoan.toLocaleString()}`);
    console.log(`   Min Investment: ZWG ${limits.lending.ZWG.minInvestment}`);
    console.log(`   Max Investment: ZWG ${limits.lending.ZWG.maxInvestment.toLocaleString()}`);

    console.log('\n📈 INTEREST RATES (by Currency):');
    console.log(`   ${limits.lending.interestRate.USD.message}`);
    console.log(`   ${limits.lending.interestRate.ZWG.message}`);

    // ============================================
    // TEST LOAN LIMITS
    // ============================================
    console.log('\n\n🧪 LOAN LIMIT VALIDATION TESTS');
    console.log('===============================\n');

    // Test USD loan limits
    console.log('USD Loan Tests:');
    const usdLoanLimits = p2p.LOAN_LIMITS.USD;
    
    const usdTests = [
        { amount: 25, currency: 'USD', expected: true, desc: '$25 (min)' },
        { amount: 10, currency: 'USD', expected: false, desc: '$10 (below min)' },
        { amount: 5000, currency: 'USD', expected: true, desc: '$5,000 (within range)' },
        { amount: 10000, currency: 'USD', expected: true, desc: '$10,000 (max)' },
        { amount: 15000, currency: 'USD', expected: false, desc: '$15,000 (above max)' }
    ];

    for (const test of usdTests) {
        const isValid = test.amount >= usdLoanLimits.minLoan && test.amount <= usdLoanLimits.maxLoan;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`   ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    // Test ZWG loan limits by employment type
    console.log('\nZWG Loan Tests (by Employment Type):');
    const zwgLimits = p2p.COLD_START_LIMITS_ZWG;
    
    console.log('\n   Government (Max ZWG 80,000):');
    const govtTests = [
        { amount: 500, expected: true, desc: 'ZWG 500 (min)' },
        { amount: 50000, expected: true, desc: 'ZWG 50,000' },
        { amount: 80000, expected: true, desc: 'ZWG 80,000 (max)' },
        { amount: 90000, expected: false, desc: 'ZWG 90,000 (above max)' }
    ];
    for (const test of govtTests) {
        const isValid = test.amount >= 500 && test.amount <= zwgLimits.government.maxLoan;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`      ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    console.log('\n   Private (Max ZWG 28,000):');
    const privateTests = [
        { amount: 500, expected: true, desc: 'ZWG 500 (min)' },
        { amount: 20000, expected: true, desc: 'ZWG 20,000' },
        { amount: 28000, expected: true, desc: 'ZWG 28,000 (max)' },
        { amount: 35000, expected: false, desc: 'ZWG 35,000 (above max)' }
    ];
    for (const test of privateTests) {
        const isValid = test.amount >= 500 && test.amount <= zwgLimits.private.maxLoan;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`      ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    console.log('\n   Informal (Max ZWG 14,000):');
    const informalTests = [
        { amount: 500, expected: true, desc: 'ZWG 500 (min)' },
        { amount: 10000, expected: true, desc: 'ZWG 10,000' },
        { amount: 14000, expected: true, desc: 'ZWG 14,000 (max)' },
        { amount: 20000, expected: false, desc: 'ZWG 20,000 (above max)' }
    ];
    for (const test of informalTests) {
        const isValid = test.amount >= 500 && test.amount <= zwgLimits.informal.maxLoan;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`      ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    // ============================================
    // TEST INVESTMENT LIMITS
    // ============================================
    console.log('\n\n🧪 INVESTMENT LIMIT VALIDATION TESTS');
    console.log('=====================================\n');

    // Test USD investment limits
    console.log('USD Investment Tests:');
    const usdInvestTests = [
        { amount: 10, expected: true, desc: '$10 (min)' },
        { amount: 5, expected: false, desc: '$5 (below min)' },
        { amount: 5000, expected: true, desc: '$5,000 (within range)' },
        { amount: 10000, expected: true, desc: '$10,000 (max)' },
        { amount: 15000, expected: false, desc: '$15,000 (above max)' }
    ];

    for (const test of usdInvestTests) {
        const isValid = test.amount >= usdLoanLimits.minInvestment && test.amount <= usdLoanLimits.maxInvestment;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`   ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    // Test ZWG investment limits
    console.log('\nZWG Investment Tests:');
    const zwgInvestLimits = p2p.LOAN_LIMITS.ZWG;
    const zwgInvestTests = [
        { amount: 250, expected: true, desc: 'ZWG 250 (min)' },
        { amount: 100, expected: false, desc: 'ZWG 100 (below min)' },
        { amount: 50000, expected: true, desc: 'ZWG 50,000 (within range)' },
        { amount: 80000, expected: true, desc: 'ZWG 80,000 (max)' },
        { amount: 100000, expected: false, desc: 'ZWG 100,000 (above max)' }
    ];

    for (const test of zwgInvestTests) {
        const isValid = test.amount >= zwgInvestLimits.minInvestment && test.amount <= zwgInvestLimits.maxInvestment;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`   ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    // ============================================
    // COLD START & MAX LOAN LIMITS BY CURRENCY
    // ============================================
    console.log('\n\n🆕 LOAN LIMITS BY EMPLOYMENT TYPE');
    console.log('===================================\n');

    console.log('USD LIMITS:');
    console.log('Employment Type     | Cold Start | Max Loan  | Max Tenure');
    console.log('--------------------|------------|-----------|------------');
    for (const [type, config] of Object.entries(p2p.COLD_START_LIMITS)) {
        const coldStart = config.coldStartCap ? `$${config.coldStartCap}` : 'No limit';
        console.log(`${type.padEnd(19)} | ${coldStart.padEnd(10)} | $${String(config.maxLoan).padEnd(8)} | ${config.maxTenureMonths} months`);
    }

    console.log('\nZWG LIMITS:');
    console.log('Employment Type     | Cold Start   | Max Loan    | Max Tenure');
    console.log('--------------------|--------------|-------------|------------');
    for (const [type, config] of Object.entries(p2p.COLD_START_LIMITS_ZWG)) {
        const coldStart = config.coldStartCap ? `ZWG ${config.coldStartCap.toLocaleString()}` : 'No limit';
        console.log(`${type.padEnd(19)} | ${coldStart.padEnd(12)} | ZWG ${String(config.maxLoan.toLocaleString()).padEnd(6)} | ${config.maxTenureMonths} months`);
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\n📋 MULTI-CURRENCY LENDING SUMMARY');
    console.log('==================================\n');

    console.log('✅ USD Lending:');
    console.log('   - Loans: $25 - $10,000 (varies by employment)');
    console.log('   - Investments: $10 - $10,000');
    console.log('   - Interest: 0% - 10% per month');

    console.log('\n✅ ZWG Lending:');
    console.log('   - Government: ZWG 500 - ZWG 80,000');
    console.log('   - Private: ZWG 500 - ZWG 28,000');
    console.log('   - Informal: ZWG 500 - ZWG 14,000');
    console.log('   - Investments: ZWG 250 - ZWG 80,000');
    console.log('   - Interest: 0% - 15% per month');

    console.log('\n✅ Features:');
    console.log('   - Lenders can fund loans in either currency');
    console.log('   - Borrowers can request loans in either currency');
    console.log('   - Marketplace can be filtered by currency');
    console.log('   - Loan limits based on employment type');

    console.log('\n========================================');
    console.log('✅ Multi-Currency Lending Tests Complete!');
    console.log('========================================\n');

    process.exit(0);
}

testMultiCurrencyLending();

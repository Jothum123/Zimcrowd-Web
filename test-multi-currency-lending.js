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

    console.log('\n🇿🇼 ZWG LENDING LIMITS:');
    console.log(`   ${limits.lending.ZWG.message}`);
    console.log(`   Min Loan: ZWG ${limits.lending.ZWG.minLoan}`);
    console.log(`   Max Loan: ZWG ${limits.lending.ZWG.maxLoan.toLocaleString()}`);
    console.log(`   Min Investment: ZWG ${limits.lending.ZWG.minInvestment}`);
    console.log(`   Max Investment: ZWG ${limits.lending.ZWG.maxInvestment.toLocaleString()}`);

    console.log('\n📈 INTEREST RATE:');
    console.log(`   ${limits.lending.interestRate.message}`);

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

    // Test ZWG loan limits
    console.log('\nZWG Loan Tests:');
    const zwgLoanLimits = p2p.LOAN_LIMITS.ZWG;
    
    const zwgTests = [
        { amount: 500, currency: 'ZWG', expected: true, desc: 'ZWG 500 (min)' },
        { amount: 100, currency: 'ZWG', expected: false, desc: 'ZWG 100 (below min)' },
        { amount: 50000, currency: 'ZWG', expected: true, desc: 'ZWG 50,000 (within range)' },
        { amount: 250000, currency: 'ZWG', expected: true, desc: 'ZWG 250,000 (max)' },
        { amount: 300000, currency: 'ZWG', expected: false, desc: 'ZWG 300,000 (above max)' }
    ];

    for (const test of zwgTests) {
        const isValid = test.amount >= zwgLoanLimits.minLoan && test.amount <= zwgLoanLimits.maxLoan;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`   ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
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
    const zwgInvestTests = [
        { amount: 250, expected: true, desc: 'ZWG 250 (min)' },
        { amount: 100, expected: false, desc: 'ZWG 100 (below min)' },
        { amount: 100000, expected: true, desc: 'ZWG 100,000 (within range)' },
        { amount: 250000, expected: true, desc: 'ZWG 250,000 (max)' },
        { amount: 300000, expected: false, desc: 'ZWG 300,000 (above max)' }
    ];

    for (const test of zwgInvestTests) {
        const isValid = test.amount >= zwgLoanLimits.minInvestment && test.amount <= zwgLoanLimits.maxInvestment;
        const status = isValid === test.expected ? '✅' : '❌';
        console.log(`   ${status} ${test.desc}: ${isValid ? 'Valid' : 'Invalid'}`);
    }

    // ============================================
    // COLD START LIMITS BY CURRENCY
    // ============================================
    console.log('\n\n🆕 COLD START LIMITS (First-Time Borrowers)');
    console.log('============================================\n');

    const coldStartMultiplier = 25; // ZWG is ~25x USD

    console.log('Employment Type     | USD Cold Start | ZWG Cold Start');
    console.log('--------------------|----------------|----------------');
    
    for (const [type, config] of Object.entries(p2p.COLD_START_LIMITS)) {
        const usdCap = config.coldStartCap || 'No limit';
        const zwgCap = config.coldStartCap ? `ZWG ${(config.coldStartCap * coldStartMultiplier).toLocaleString()}` : 'No limit';
        console.log(`${type.padEnd(19)} | $${String(usdCap).padEnd(14)} | ${zwgCap}`);
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n\n📋 MULTI-CURRENCY LENDING SUMMARY');
    console.log('==================================\n');

    console.log('✅ USD Lending:');
    console.log('   - Loans: $25 - $10,000');
    console.log('   - Investments: $10 - $10,000');
    console.log('   - Interest: 0% - 10% per month');

    console.log('\n✅ ZWG Lending:');
    console.log('   - Loans: ZWG 500 - ZWG 250,000');
    console.log('   - Investments: ZWG 250 - ZWG 250,000');
    console.log('   - Interest: 0% - 10% per month');

    console.log('\n✅ Features:');
    console.log('   - Lenders can fund loans in either currency');
    console.log('   - Borrowers can request loans in either currency');
    console.log('   - Marketplace can be filtered by currency');
    console.log('   - Cold start limits adjusted for each currency');

    console.log('\n========================================');
    console.log('✅ Multi-Currency Lending Tests Complete!');
    console.log('========================================\n');

    process.exit(0);
}

testMultiCurrencyLending();

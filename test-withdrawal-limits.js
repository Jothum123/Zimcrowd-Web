/**
 * Test Withdrawal Limits (USD and ZWG)
 * Run: node test-withdrawal-limits.js
 */

require('dotenv').config();

async function testWithdrawalLimits() {
    console.log('\n========================================');
    console.log('💸 Testing Withdrawal Limits');
    console.log('========================================\n');

    const P2PLendingService = require('./services/p2p-lending.service');
    const p2p = new P2PLendingService();

    const testUserId = '50df5931-ddee-431a-8e45-d47885c1a14f';

    // ============================================
    // USD WITHDRAWAL TESTS
    // ============================================
    console.log('🇺🇸 USD WITHDRAWAL LIMITS');
    console.log('   Min: $20 | Max: $1,000/day\n');

    const usdTests = [
        { amount: 20, expected: true, desc: '$20 (minimum)' },
        { amount: 10, expected: false, desc: '$10 (below minimum)' },
        { amount: 500, expected: true, desc: '$500 (within limit)' },
        { amount: 1000, expected: true, desc: '$1,000 (at max)' },
        { amount: 1500, expected: false, desc: '$1,500 (exceeds daily max)' }
    ];

    for (const test of usdTests) {
        const result = await p2p.validateWithdrawalAmount(test.amount, testUserId, 'USD');
        const status = result.valid === test.expected ? '✅' : '❌';
        console.log(`   ${status} ${test.desc}: ${result.message}`);
    }

    // ============================================
    // ZWG WITHDRAWAL TESTS
    // ============================================
    console.log('\n🇿🇼 ZWG WITHDRAWAL LIMITS');
    console.log('   Min: ZWG 500 | Max: ZWG 3,000/day\n');

    const zwgTests = [
        { amount: 500, expected: true, desc: 'ZWG 500 (minimum)' },
        { amount: 100, expected: false, desc: 'ZWG 100 (below minimum)' },
        { amount: 2000, expected: true, desc: 'ZWG 2,000 (within limit)' },
        { amount: 3000, expected: true, desc: 'ZWG 3,000 (at max)' },
        { amount: 5000, expected: false, desc: 'ZWG 5,000 (exceeds daily max)' }
    ];

    for (const test of zwgTests) {
        const result = await p2p.validateWithdrawalAmount(test.amount, testUserId, 'ZWG');
        const status = result.valid === test.expected ? '✅' : '❌';
        console.log(`   ${status} ${test.desc}: ${result.message}`);
    }

    // ============================================
    // TRANSACTION LIMITS SUMMARY
    // ============================================
    console.log('\n📊 TRANSACTION LIMITS SUMMARY');
    console.log('==============================\n');

    const limits = p2p.getTransactionLimits();
    
    console.log('💵 USD Withdrawals:');
    console.log(`   ${limits.withdrawal.USD.message}`);
    
    console.log('\n💰 ZWG Withdrawals:');
    console.log(`   ${limits.withdrawal.ZWG.message}`);
    
    console.log('\n⏱️  Processing Time:');
    console.log(`   ${limits.withdrawal.processingTime}`);
    
    console.log('\n📝 Note:');
    console.log(`   ${limits.withdrawal.note}`);

    console.log('\n========================================');
    console.log('✅ Withdrawal Limits Test Complete!');
    console.log('========================================\n');

    process.exit(0);
}

testWithdrawalLimits();

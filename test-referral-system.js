/**
 * Test Referral System
 * Run: node test-referral-system.js
 */

require('dotenv').config();

const { PLATFORM_FEES } = require('./constants/fees');

console.log('\n========================================');
console.log('🎁 Testing Referral System');
console.log('========================================\n');

// ============================================
// TEST 1: REWARD STRUCTURE
// ============================================
console.log('📋 TEST 1: REWARD STRUCTURE');
console.log('============================\n');

const rewards = PLATFORM_FEES.REFERRAL_CREDIT.rewards;

console.log('ADVOCATE (Referrer) earns $5 when Friend:');
console.log(`  ✅ Receives first loan: $${rewards.advocate.friend_first_loan}`);
console.log(`  ✅ Pays back first loan: $${rewards.advocate.friend_loan_repaid}`);
console.log(`  ✅ Funds first loan: $${rewards.advocate.friend_first_funding}`);
console.log(`  ✅ Makes first investment: $${rewards.advocate.friend_first_investment}`);

console.log('\nFRIEND (Referee) earns $5 when they:');
console.log(`  ✅ Receive first loan: $${rewards.friend.first_loan}`);
console.log(`  ✅ Fund first loan: $${rewards.friend.first_funding}`);
console.log(`  ✅ Make first investment: $${rewards.friend.first_investment}`);

// ============================================
// TEST 2: LIMITS
// ============================================
console.log('\n\n📋 TEST 2: LIMITS');
console.log('==================\n');

console.log(`Monthly Limit (Advocates): $${PLATFORM_FEES.REFERRAL_CREDIT.monthlyLimit}`);
console.log(`Credit Expiration: ${PLATFORM_FEES.REFERRAL_CREDIT.expirationDays} days`);

// ============================================
// TEST 3: POTENTIAL EARNINGS
// ============================================
console.log('\n\n📋 TEST 3: POTENTIAL EARNINGS');
console.log('==============================\n');

const advocatePerReferral = 
    rewards.advocate.friend_first_loan +
    rewards.advocate.friend_loan_repaid +
    rewards.advocate.friend_first_funding +
    rewards.advocate.friend_first_investment;

const friendTotal = 
    rewards.friend.first_loan +
    rewards.friend.first_funding +
    rewards.friend.first_investment;

console.log(`Max Advocate earnings per referral: $${advocatePerReferral}`);
console.log(`Max Friend earnings: $${friendTotal}`);
console.log(`Combined max per referral: $${advocatePerReferral + friendTotal}`);

// How many referrals to hit monthly limit
const referralsToHitLimit = Math.ceil(PLATFORM_FEES.REFERRAL_CREDIT.monthlyLimit / advocatePerReferral);
console.log(`\nReferrals needed to hit monthly limit: ${referralsToHitLimit}`);

// ============================================
// TEST 4: EXAMPLE SCENARIOS
// ============================================
console.log('\n\n📋 TEST 4: EXAMPLE SCENARIOS');
console.log('=============================\n');

console.log('Scenario 1: Friend takes and repays a loan');
console.log('  Advocate earns: $5 (first loan) + $5 (repaid) = $10');
console.log('  Friend earns: $5 (first loan)');

console.log('\nScenario 2: Friend funds a loan and invests');
console.log('  Advocate earns: $5 (funding) + $5 (investment) = $10');
console.log('  Friend earns: $5 (funding) + $5 (investment) = $10');

console.log('\nScenario 3: Friend completes ALL activities');
console.log(`  Advocate earns: $${advocatePerReferral}`);
console.log(`  Friend earns: $${friendTotal}`);

// ============================================
// TEST 5: CREDIT USAGE
// ============================================
console.log('\n\n📋 TEST 5: CREDIT USAGE');
console.log('========================\n');

console.log('Credits can be used for:');
console.log('  ✅ Loan payments');
console.log('  ✅ Funding loans (as investor)');
console.log('  ✅ Platform fees');
console.log('  ❌ Cash withdrawal (no cash value)');

// ============================================
// SUMMARY
// ============================================
console.log('\n\n📋 REFERRAL PROGRAM SUMMARY');
console.log('============================\n');

console.log('REWARD STRUCTURE:');
console.log('  - $5 per qualifying activity');
console.log('  - Both Advocate and Friend earn');
console.log(`  - Max $${advocatePerReferral} per referral (Advocate)`);
console.log(`  - Max $${friendTotal} per referral (Friend)`);

console.log('\nLIMITS:');
console.log(`  - Monthly limit: $${PLATFORM_FEES.REFERRAL_CREDIT.monthlyLimit}`);
console.log(`  - Credit expiration: ${PLATFORM_FEES.REFERRAL_CREDIT.expirationDays} days`);
console.log('  - Unlimited referrals allowed');

console.log('\nQUALIFYING ACTIVITIES:');
console.log('  - First loan received');
console.log('  - First loan repaid');
console.log('  - First loan funded');
console.log('  - First investment made');

console.log('\n========================================');
console.log('✅ Referral System Test Complete!');
console.log('========================================\n');

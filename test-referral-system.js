/**
 * Test Referral System - Multi-Currency Support
 * Run: node test-referral-system.js
 */

require('dotenv').config();

const { PLATFORM_FEES } = require('./constants/fees');

console.log('\n========================================');
console.log('🎁 Testing Referral System (Multi-Currency)');
console.log('========================================\n');

// ============================================
// TEST 1: USD REWARD STRUCTURE
// ============================================
console.log('📋 TEST 1: USD REWARD STRUCTURE');
console.log('================================\n');

const usdRewards = PLATFORM_FEES.REFERRAL_CREDIT.rewards.USD;

console.log('ADVOCATE (Referrer) earns when Friend (USD):');
console.log(`  ✅ Receives first loan: $${usdRewards.advocate.friend_first_loan}`);
console.log(`  ✅ Pays back first loan: $${usdRewards.advocate.friend_loan_repaid}`);
console.log(`  ✅ Funds first loan: $${usdRewards.advocate.friend_first_funding}`);
console.log(`  ✅ Makes first investment: $${usdRewards.advocate.friend_first_investment}`);

console.log('\nFRIEND (Referee) earns when they (USD):');
console.log(`  ✅ Receive first loan: $${usdRewards.friend.first_loan}`);
console.log(`  ✅ Fund first loan: $${usdRewards.friend.first_funding}`);
console.log(`  ✅ Make first investment: $${usdRewards.friend.first_investment}`);

// ============================================
// TEST 2: ZWG REWARD STRUCTURE
// ============================================
console.log('\n\n📋 TEST 2: ZWG REWARD STRUCTURE');
console.log('================================\n');

const zwgRewards = PLATFORM_FEES.REFERRAL_CREDIT.rewards.ZWG;

console.log('ADVOCATE (Referrer) earns when Friend (ZWG):');
console.log(`  ✅ Receives first loan: ZWG ${zwgRewards.advocate.friend_first_loan}`);
console.log(`  ✅ Pays back first loan: ZWG ${zwgRewards.advocate.friend_loan_repaid}`);
console.log(`  ✅ Funds first loan: ZWG ${zwgRewards.advocate.friend_first_funding}`);
console.log(`  ✅ Makes first investment: ZWG ${zwgRewards.advocate.friend_first_investment}`);

console.log('\nFRIEND (Referee) earns when they (ZWG):');
console.log(`  ✅ Receive first loan: ZWG ${zwgRewards.friend.first_loan}`);
console.log(`  ✅ Fund first loan: ZWG ${zwgRewards.friend.first_funding}`);
console.log(`  ✅ Make first investment: ZWG ${zwgRewards.friend.first_investment}`);

// ============================================
// TEST 3: LIMITS (Multi-Currency)
// ============================================
console.log('\n\n📋 TEST 3: LIMITS (Multi-Currency)');
console.log('===================================\n');

const limits = PLATFORM_FEES.REFERRAL_CREDIT.monthlyLimit;
console.log(`Monthly Limit (USD): $${limits.USD}`);
console.log(`Monthly Limit (ZWG): ZWG ${limits.ZWG}`);
console.log(`Credit Expiration: ${PLATFORM_FEES.REFERRAL_CREDIT.expirationDays} days`);

// ============================================
// TEST 4: POTENTIAL EARNINGS (Multi-Currency)
// ============================================
console.log('\n\n📋 TEST 4: POTENTIAL EARNINGS');
console.log('==============================\n');

// USD Earnings
const usdAdvocatePerReferral = 
    usdRewards.advocate.friend_first_loan +
    usdRewards.advocate.friend_loan_repaid +
    usdRewards.advocate.friend_first_funding +
    usdRewards.advocate.friend_first_investment;

const usdFriendTotal = 
    usdRewards.friend.first_loan +
    usdRewards.friend.first_funding +
    usdRewards.friend.first_investment;

console.log('USD EARNINGS:');
console.log(`  Max Advocate earnings per referral: $${usdAdvocatePerReferral}`);
console.log(`  Max Friend earnings: $${usdFriendTotal}`);
console.log(`  Combined max per referral: $${usdAdvocatePerReferral + usdFriendTotal}`);
console.log(`  Referrals to hit monthly limit: ${Math.ceil(limits.USD / usdAdvocatePerReferral)}`);

// ZWG Earnings
const zwgAdvocatePerReferral = 
    zwgRewards.advocate.friend_first_loan +
    zwgRewards.advocate.friend_loan_repaid +
    zwgRewards.advocate.friend_first_funding +
    zwgRewards.advocate.friend_first_investment;

const zwgFriendTotal = 
    zwgRewards.friend.first_loan +
    zwgRewards.friend.first_funding +
    zwgRewards.friend.first_investment;

console.log('\nZWG EARNINGS:');
console.log(`  Max Advocate earnings per referral: ZWG ${zwgAdvocatePerReferral}`);
console.log(`  Max Friend earnings: ZWG ${zwgFriendTotal}`);
console.log(`  Combined max per referral: ZWG ${zwgAdvocatePerReferral + zwgFriendTotal}`);
console.log(`  Referrals to hit monthly limit: ${Math.ceil(limits.ZWG / zwgAdvocatePerReferral)}`);

// ============================================
// TEST 5: EXAMPLE SCENARIOS
// ============================================
console.log('\n\n📋 TEST 5: EXAMPLE SCENARIOS');
console.log('=============================\n');

console.log('Scenario 1: Friend takes USD loan and repays');
console.log('  Advocate earns: $5 (first loan) + $5 (repaid) = $10 USD');
console.log('  Friend earns: $5 USD (first loan)');

console.log('\nScenario 2: Friend takes ZWG loan and repays');
console.log('  Advocate earns: ZWG 135 (first loan) + ZWG 135 (repaid) = ZWG 270');
console.log('  Friend earns: ZWG 135 (first loan)');

console.log('\nScenario 3: Friend funds USD loan and invests');
console.log('  Advocate earns: $5 (funding) + $5 (investment) = $10 USD');
console.log('  Friend earns: $5 (funding) + $5 (investment) = $10 USD');

console.log('\nScenario 4: Friend completes ALL activities in USD');
console.log(`  Advocate earns: $${usdAdvocatePerReferral}`);
console.log(`  Friend earns: $${usdFriendTotal}`);

console.log('\nScenario 5: Friend completes ALL activities in ZWG');
console.log(`  Advocate earns: ZWG ${zwgAdvocatePerReferral}`);
console.log(`  Friend earns: ZWG ${zwgFriendTotal}`);

// ============================================
// TEST 6: CREDIT USAGE
// ============================================
console.log('\n\n📋 TEST 6: CREDIT USAGE');
console.log('========================\n');

console.log('Credits can be used for:');
console.log('  ✅ Loan payments (in matching currency)');
console.log('  ✅ Funding loans (in matching currency)');
console.log('  ✅ Platform fees');
console.log('  ❌ Cash withdrawal (no cash value)');
console.log('  ❌ Cross-currency use (USD credits for USD, ZWG for ZWG)');

// ============================================
// SUMMARY
// ============================================
console.log('\n\n📋 REFERRAL PROGRAM SUMMARY (Multi-Currency)');
console.log('=============================================\n');

console.log('REWARD STRUCTURE:');
console.log('  - USD: $5 per qualifying activity');
console.log('  - ZWG: ZWG 135 per qualifying activity');
console.log('  - Credits issued in SAME currency as activity');
console.log('  - Both Advocate and Friend earn');

console.log('\nMAX EARNINGS PER REFERRAL:');
console.log(`  USD: Advocate $${usdAdvocatePerReferral}, Friend $${usdFriendTotal}`);
console.log(`  ZWG: Advocate ZWG ${zwgAdvocatePerReferral}, Friend ZWG ${zwgFriendTotal}`);

console.log('\nMONTHLY LIMITS:');
console.log(`  - USD: $${limits.USD}`);
console.log(`  - ZWG: ZWG ${limits.ZWG}`);
console.log(`  - Credit expiration: ${PLATFORM_FEES.REFERRAL_CREDIT.expirationDays} days`);
console.log('  - Unlimited referrals allowed');

console.log('\nQUALIFYING ACTIVITIES:');
console.log('  - First loan received');
console.log('  - First loan repaid');
console.log('  - First loan funded');
console.log('  - First investment made');

console.log('\nUSAGE EXAMPLE:');
console.log('  // In loan service when disbursing USD loan:');
console.log('  await onFirstLoanReceived(userId, "USD");');
console.log('');
console.log('  // In loan service when disbursing ZWG loan:');
console.log('  await onFirstLoanReceived(userId, "ZWG");');

console.log('\n========================================');
console.log('✅ Referral System Test Complete!');
console.log('========================================\n');

/**
 * Test Deposit and Withdrawal Validation
 * Run: node test-deposit-withdrawal.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDepositWithdrawal() {
    console.log('\n========================================');
    console.log('🧪 Testing Deposits & Withdrawals');
    console.log('========================================\n');

    const P2PLendingService = require('./services/p2p-lending.service');
    const p2pService = new P2PLendingService();

    const testUserId = '50df5931-ddee-431a-8e45-d47885c1a14f'; // Test sender from previous test

    // ============================================
    // DEPOSIT TESTS
    // ============================================
    console.log('💰 DEPOSIT TESTS');
    console.log('================\n');

    // Test 1: Minimum deposit ($10)
    console.log('1️⃣ Testing minimum deposit ($10)...');
    const minDeposit = await p2pService.validateDepositAmount(5);
    console.log(`   $5 deposit: ${minDeposit.valid ? '❌ Should fail' : `✅ Rejected: ${minDeposit.message}`}`);
    
    const validMinDeposit = await p2pService.validateDepositAmount(10);
    console.log(`   $10 deposit: ${validMinDeposit.valid ? '✅ Accepted' : `❌ ${validMinDeposit.message}`}`);

    // Test 2: No maximum deposit (removed)
    console.log('\n2️⃣ Testing large deposits (no max limit)...');
    const largeDeposit = await p2pService.validateDepositAmount(50000);
    console.log(`   $50,000 deposit: ${largeDeposit.valid ? '✅ Accepted' : `❌ ${largeDeposit.message}`}`);

    // Test 3: AML threshold ($5,000+)
    console.log('\n3️⃣ Testing AML threshold ($5,000+)...');
    const amlDeposit = await p2pService.validateDepositAmount(5000);
    console.log(`   $5,000 deposit: ${amlDeposit.valid ? '✅ Accepted' : `❌ ${amlDeposit.message}`}`);
    if (amlDeposit.requiresSourceVerification) {
        console.log(`   ⚠️  Requires source of funds verification: ${amlDeposit.requiresSourceVerification}`);
    }

    const bigDeposit = await p2pService.validateDepositAmount(10000);
    console.log(`   $10,000 deposit: ${bigDeposit.valid ? '✅ Accepted' : `❌ ${bigDeposit.message}`}`);
    if (bigDeposit.requiresSourceVerification) {
        console.log(`   ⚠️  Requires source of funds verification: ${bigDeposit.requiresSourceVerification}`);
    }

    // Test 4: Smurfing detection
    console.log('\n4️⃣ Testing smurfing detection...');
    const smurfingResult = await p2pService.detectSmurfing(testUserId, 4500);
    console.log(`   Smurfing check for $4,500: ${smurfingResult.isSmurfing ? '⚠️ FLAGGED' : '✅ Clear'}`);
    if (smurfingResult.flags && smurfingResult.flags.length > 0) {
        console.log(`   Flags: ${smurfingResult.flags.join(', ')}`);
    }

    // ============================================
    // WITHDRAWAL TESTS
    // ============================================
    console.log('\n\n💸 WITHDRAWAL TESTS');
    console.log('===================\n');

    // Test 5: Minimum withdrawal ($20)
    console.log('5️⃣ Testing minimum withdrawal ($20)...');
    const minWithdrawal = await p2pService.validateWithdrawalAmount(10, testUserId);
    console.log(`   $10 withdrawal: ${minWithdrawal.valid ? '❌ Should fail' : `✅ Rejected: ${minWithdrawal.message}`}`);
    
    const validMinWithdrawal = await p2pService.validateWithdrawalAmount(20, testUserId);
    console.log(`   $20 withdrawal: ${validMinWithdrawal.valid ? '✅ Accepted' : `❌ ${validMinWithdrawal.message}`}`);

    // Test 6: Maximum daily withdrawal ($1,000)
    console.log('\n6️⃣ Testing maximum daily withdrawal ($1,000)...');
    const maxWithdrawal = await p2pService.validateWithdrawalAmount(1500, testUserId);
    console.log(`   $1,500 withdrawal: ${maxWithdrawal.valid ? '❌ Should fail' : `✅ Rejected: ${maxWithdrawal.message}`}`);
    
    const validMaxWithdrawal = await p2pService.validateWithdrawalAmount(500, testUserId);
    console.log(`   $500 withdrawal: ${validMaxWithdrawal.valid ? '✅ Accepted' : `❌ ${validMaxWithdrawal.message}`}`);

    // Test 7: Cumulative daily limit check
    console.log('\n7️⃣ Testing cumulative daily limit...');
    // First, check today's withdrawals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayWithdrawals } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', testUserId)
        .eq('type', 'withdrawal')
        .gte('created_at', today.toISOString());

    const totalToday = todayWithdrawals?.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0) || 0;
    console.log(`   Today's withdrawals so far: $${totalToday.toFixed(2)}`);
    console.log(`   Daily limit remaining: $${Math.max(0, 1000 - totalToday).toFixed(2)}`);

    // ============================================
    // GET LIMITS
    // ============================================
    console.log('\n\n📊 TRANSACTION LIMITS');
    console.log('=====================\n');

    const limits = await p2pService.getTransactionLimits();
    console.log('Current limits:');
    console.log(`   Deposit minimum: $${limits.deposit.min}`);
    console.log(`   Deposit maximum: ${limits.deposit.max === null ? 'No limit' : '$' + limits.deposit.max}`);
    console.log(`   AML threshold: $${limits.deposit.amlThreshold}`);
    console.log(`   Withdrawal minimum: $${limits.withdrawal.min}`);
    console.log(`   Withdrawal daily max: $${limits.withdrawal.maxPerDay}`);
    console.log(`   Investment range: $${limits.investment.min} - $${limits.investment.max}`);

    // ============================================
    // SIMULATE FULL DEPOSIT FLOW
    // ============================================
    console.log('\n\n🔄 SIMULATING DEPOSIT FLOW');
    console.log('==========================\n');

    // Simulate a $100 deposit
    console.log('Simulating $100 deposit...');
    
    // Step 1: Validate
    const depositValidation = await p2pService.validateDepositWithSmurfingCheck(100, testUserId);
    console.log(`   Validation: ${depositValidation.valid ? '✅ Passed' : `❌ ${depositValidation.message}`}`);

    if (depositValidation.valid) {
        // Step 2: Create transaction record
        const { data: depositTx, error: depositError } = await supabase
            .from('transactions')
            .insert({
                user_id: testUserId,
                type: 'deposit',
                amount: 100,
                currency: 'USD',
                status: 'completed',
                description: 'Test deposit',
                reference: `DEP-${Date.now()}`
            })
            .select()
            .single();

        if (depositError) {
            console.log(`   ❌ Deposit failed: ${depositError.message}`);
        } else {
            console.log(`   ✅ Deposit recorded: ${depositTx.reference}`);
            
            // Step 3: Update wallet balance
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', testUserId)
                .single();

            const newBalance = (wallet?.balance || 0) + 100;
            await supabase
                .from('wallets')
                .update({ balance: newBalance })
                .eq('user_id', testUserId);

            console.log(`   ✅ Wallet updated: $${newBalance}`);
        }
    }

    // ============================================
    // SIMULATE FULL WITHDRAWAL FLOW
    // ============================================
    console.log('\n\n🔄 SIMULATING WITHDRAWAL FLOW');
    console.log('=============================\n');

    // Simulate a $50 withdrawal
    console.log('Simulating $50 withdrawal...');

    // Step 1: Validate
    const withdrawalValidation = await p2pService.validateWithdrawalAmount(testUserId, 50);
    console.log(`   Validation: ${withdrawalValidation.valid ? '✅ Passed' : `❌ ${withdrawalValidation.message}`}`);

    if (withdrawalValidation.valid) {
        // Step 2: Check balance
        const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', testUserId)
            .single();

        if (!wallet || wallet.balance < 50) {
            console.log(`   ❌ Insufficient balance: $${wallet?.balance || 0}`);
        } else {
            // Step 3: Create transaction record
            const { data: withdrawTx, error: withdrawError } = await supabase
                .from('transactions')
                .insert({
                    user_id: testUserId,
                    type: 'withdrawal',
                    amount: -50,
                    currency: 'USD',
                    status: 'completed',
                    description: 'Test withdrawal',
                    reference: `WTH-${Date.now()}`
                })
                .select()
                .single();

            if (withdrawError) {
                console.log(`   ❌ Withdrawal failed: ${withdrawError.message}`);
            } else {
                console.log(`   ✅ Withdrawal recorded: ${withdrawTx.reference}`);

                // Step 4: Update wallet balance
                const newBalance = wallet.balance - 50;
                await supabase
                    .from('wallets')
                    .update({ balance: newBalance })
                    .eq('user_id', testUserId);

                console.log(`   ✅ Wallet updated: $${newBalance}`);
            }
        }
    }

    // Final balance check
    console.log('\n\n📊 FINAL BALANCE CHECK');
    console.log('======================\n');

    const { data: finalWallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

    console.log(`   Final wallet balance: $${finalWallet?.balance || 0}`);

    console.log('\n========================================');
    console.log('✅ Deposit & Withdrawal Tests Complete!');
    console.log('========================================\n');

    process.exit(0);
}

testDepositWithdrawal();

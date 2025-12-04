/**
 * Test Internal Wallet Transfers
 * Run: node test-internal-transfers.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = 'http://localhost:3001';

async function testInternalTransfers() {
    console.log('\n========================================');
    console.log('🧪 Testing Internal Wallet Transfers');
    console.log('========================================\n');

    try {
        // Step 1: Get two test users from the database
        console.log('📋 Step 1: Finding test users...');
        const { data: users, error: usersError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, email, phone')
            .limit(2);

        if (usersError || !users || users.length < 2) {
            console.log('❌ Need at least 2 users in database to test transfers');
            console.log('   Creating mock test scenario instead...\n');
            
            // Test the service directly
            const P2PLendingService = require('./services/p2p-lending.service');
            const p2pService = new P2PLendingService();
            
            // Test validation
            console.log('📋 Testing transfer validation logic...');
            
            // Test minimum amount
            console.log('\n1️⃣ Testing minimum transfer amount ($5)...');
            const minResult = await p2pService.internalTransfer(
                'test-sender-id',
                'test-recipient@email.com',
                3, // Below minimum
                'Test note'
            );
            console.log('   Result:', minResult.success ? '✅ Passed' : `❌ ${minResult.message}`);
            
            // Test self-transfer prevention
            console.log('\n2️⃣ Testing self-transfer prevention...');
            const selfResult = await p2pService.internalTransfer(
                'same-user-id',
                'same-user-id',
                100,
                'Self transfer'
            );
            console.log('   Result:', selfResult.success ? '❌ Should have failed' : `✅ Blocked: ${selfResult.message}`);
            
            console.log('\n✅ Validation tests completed!');
            return;
        }

        const sender = users[0];
        const recipient = users[1];

        console.log(`   Sender: ${sender.full_name || sender.email} (${sender.user_id.substring(0, 8)}...)`);
        console.log(`   Recipient: ${recipient.full_name || recipient.email} (${recipient.user_id.substring(0, 8)}...)\n`);

        // Step 2: Check sender's wallet balance
        console.log('💰 Step 2: Checking sender wallet balance...');
        const { data: senderWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', sender.user_id)
            .single();

        const senderBalance = senderWallet?.balance || 0;
        console.log(`   Sender balance: $${senderBalance}\n`);

        if (senderBalance < 10) {
            console.log('⚠️  Sender has insufficient balance for transfer test');
            console.log('   Adding test funds to sender wallet...\n');
            
            // Add test funds
            await supabase
                .from('wallets')
                .upsert({
                    user_id: sender.user_id,
                    balance: 100,
                    currency: 'USD'
                });
            console.log('   ✅ Added $100 test funds to sender\n');
        }

        // Step 3: Test validate recipient endpoint
        console.log('🔍 Step 3: Testing recipient validation...');
        
        // Get auth token for sender (we'll simulate this)
        const { data: authData } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: sender.email
        });

        // For testing, we'll call the service directly
        const P2PLendingService = require('./services/p2p-lending.service');
        const p2pService = new P2PLendingService();

        // Test by email
        console.log(`   Testing lookup by email: ${recipient.email}`);
        const validateResult = await testRecipientLookup(recipient.email);
        console.log(`   Result: ${validateResult ? '✅ Found' : '❌ Not found'}\n`);

        // Step 4: Test transfer
        console.log('💸 Step 4: Testing internal transfer...');
        const transferAmount = 10;
        console.log(`   Transferring $${transferAmount} from ${sender.email} to ${recipient.email}`);

        const transferResult = await p2pService.internalTransfer(
            sender.user_id,
            recipient.email,
            transferAmount,
            'Test transfer from automated test'
        );

        if (transferResult.success) {
            console.log('   ✅ Transfer successful!');
            console.log(`   Transaction ID: ${transferResult.transactionId}`);
            console.log(`   New sender balance: $${transferResult.newBalance}`);
        } else {
            console.log(`   ❌ Transfer failed: ${transferResult.message}`);
        }

        // Step 5: Verify balances
        console.log('\n📊 Step 5: Verifying final balances...');
        
        const { data: finalSenderWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', sender.user_id)
            .single();

        const { data: finalRecipientWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', recipient.user_id)
            .single();

        console.log(`   Sender final balance: $${finalSenderWallet?.balance || 0}`);
        console.log(`   Recipient final balance: $${finalRecipientWallet?.balance || 0}`);

        // Step 6: Check transfer history
        console.log('\n📜 Step 6: Checking transfer history...');
        const historyResult = await p2pService.getTransferHistory(sender.user_id, { limit: 5 });
        
        if (historyResult.success && historyResult.transfers.length > 0) {
            console.log(`   Found ${historyResult.transfers.length} transfers:`);
            historyResult.transfers.forEach((t, i) => {
                console.log(`   ${i + 1}. $${t.amount} - ${t.type} - ${new Date(t.created_at).toLocaleString()}`);
            });
        } else {
            console.log('   No transfer history found');
        }

        console.log('\n========================================');
        console.log('✅ Internal Transfer Tests Complete!');
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error(error.stack);
    }
}

async function testRecipientLookup(identifier) {
    try {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        
        let query = supabase.from('user_profiles').select('user_id, full_name, email');
        
        if (isEmail) {
            query = query.eq('email', identifier.toLowerCase());
        } else {
            query = query.eq('user_id', identifier);
        }

        const { data, error } = await query.single();
        return !error && data;
    } catch (e) {
        return false;
    }
}

// Run tests
testInternalTransfers();

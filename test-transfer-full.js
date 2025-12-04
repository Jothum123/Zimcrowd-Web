/**
 * Full Internal Transfer Test with Test Users
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runFullTest() {
    console.log('\n🧪 Full Internal Transfer Test');
    console.log('================================\n');

    try {
        // Create two test users
        const testUser1 = {
            email: 'sender@test.zimcrowd.com',
            password: 'TestPass123!'
        };
        const testUser2 = {
            email: 'recipient@test.zimcrowd.com', 
            password: 'TestPass123!'
        };

        console.log('1️⃣ Creating test users...');
        
        // Create sender
        let { data: sender, error: senderError } = await supabase.auth.admin.createUser({
            email: testUser1.email,
            password: testUser1.password,
            email_confirm: true
        });
        
        if (senderError && senderError.message.includes('already been registered')) {
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            sender = { user: existingUsers.users.find(u => u.email === testUser1.email) };
        } else if (senderError) {
            throw senderError;
        }
        
        // Create recipient
        let { data: recipient, error: recipientError } = await supabase.auth.admin.createUser({
            email: testUser2.email,
            password: testUser2.password,
            email_confirm: true
        });
        
        if (recipientError && recipientError.message.includes('already been registered')) {
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            recipient = { user: existingUsers.users.find(u => u.email === testUser2.email) };
        } else if (recipientError) {
            throw recipientError;
        }

        const senderId = sender.user.id;
        const recipientId = recipient.user.id;

        console.log(`   ✅ Sender: ${testUser1.email} (${senderId.substring(0, 8)}...)`);
        console.log(`   ✅ Recipient: ${testUser2.email} (${recipientId.substring(0, 8)}...)\n`);

        // Create user profiles
        console.log('2️⃣ Creating user profiles...');
        
        await supabase.from('user_profiles').upsert({
            user_id: senderId,
            email: testUser1.email,
            full_name: 'Test Sender',
            phone: '+263771111111'
        });
        
        await supabase.from('user_profiles').upsert({
            user_id: recipientId,
            email: testUser2.email,
            full_name: 'Test Recipient',
            phone: '+263772222222'
        });
        
        console.log('   ✅ Profiles created\n');

        // Create wallets with initial balance
        console.log('3️⃣ Setting up wallets...');
        
        await supabase.from('wallets').upsert({
            user_id: senderId,
            balance: 500,
            currency: 'USD'
        });
        
        await supabase.from('wallets').upsert({
            user_id: recipientId,
            balance: 100,
            currency: 'USD'
        });
        
        console.log('   ✅ Sender wallet: $500');
        console.log('   ✅ Recipient wallet: $100\n');

        // Test the transfer service
        console.log('4️⃣ Testing internal transfer...');
        
        const P2PLendingService = require('./services/p2p-lending.service');
        const p2pService = new P2PLendingService();

        // Transfer $50 by email
        console.log(`   Transferring $50 from sender to ${testUser2.email}...`);
        
        const result = await p2pService.internalTransfer(
            senderId,
            testUser2.email,
            50,
            'Test transfer - $50'
        );

        if (result.success) {
            console.log('   ✅ Transfer successful!');
            console.log(`   Transaction ID: ${result.transactionId}`);
            console.log(`   Sender new balance: $${result.newBalance}\n`);
        } else {
            console.log(`   ❌ Transfer failed: ${result.message}\n`);
        }

        // Verify balances
        console.log('5️⃣ Verifying final balances...');
        
        const { data: senderWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', senderId)
            .single();
            
        const { data: recipientWallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('user_id', recipientId)
            .single();

        console.log(`   Sender balance: $${senderWallet?.balance} (expected: $450)`);
        console.log(`   Recipient balance: $${recipientWallet?.balance} (expected: $150)\n`);

        const senderCorrect = senderWallet?.balance === 450;
        const recipientCorrect = recipientWallet?.balance === 150;

        if (senderCorrect && recipientCorrect) {
            console.log('   ✅ Balances verified correctly!\n');
        } else {
            console.log('   ⚠️ Balance mismatch detected\n');
        }

        // Test transfer by phone
        console.log('6️⃣ Testing transfer by phone number...');
        
        const phoneResult = await p2pService.internalTransfer(
            senderId,
            '+263772222222',
            25,
            'Test transfer by phone'
        );

        if (phoneResult.success) {
            console.log('   ✅ Phone transfer successful!');
            console.log(`   New sender balance: $${phoneResult.newBalance}\n`);
        } else {
            console.log(`   ❌ Phone transfer failed: ${phoneResult.message}\n`);
        }

        // Test transfer history
        console.log('7️⃣ Checking transfer history...');
        
        const history = await p2pService.getTransferHistory(senderId, { limit: 10 });
        
        if (history.success) {
            console.log(`   Found ${history.transfers.length} transfers:`);
            history.transfers.forEach((t, i) => {
                const type = t.type === 'transfer_out' ? '📤 Sent' : '📥 Received';
                console.log(`   ${i + 1}. ${type} $${t.amount} - ${t.note || 'No note'}`);
            });
        }

        // Check activity logs
        console.log('\n8️⃣ Checking activity logs...');
        
        const { data: activities } = await supabase
            .from('user_activities')
            .select('*')
            .eq('user_id', senderId)
            .order('created_at', { ascending: false })
            .limit(5);

        if (activities && activities.length > 0) {
            console.log(`   Found ${activities.length} activities:`);
            activities.forEach((a, i) => {
                console.log(`   ${i + 1}. ${a.activity_type} - ${a.description}`);
            });
        } else {
            console.log('   No activities found (table may not exist)');
        }

        console.log('\n================================');
        console.log('✅ All tests completed!');
        console.log('================================\n');

        // Cleanup option
        console.log('🧹 To cleanup test users, run:');
        console.log(`   Sender ID: ${senderId}`);
        console.log(`   Recipient ID: ${recipientId}\n`);

    } catch (error) {
        console.error('❌ Test error:', error.message);
        console.error(error.stack);
    }

    process.exit(0);
}

runFullTest();

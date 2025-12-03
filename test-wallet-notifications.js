/**
 * Test Wallet Activity Notifications (Toast/Push)
 * Run: node test-wallet-notifications.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testWalletNotifications() {
    console.log('\n========================================');
    console.log('🔔 Testing Wallet Activity Notifications');
    console.log('========================================\n');

    const NotificationService = require('./services/notification.service');
    const notificationService = new NotificationService();

    // Use a real user from the database
    const testUserId = '50df5931-ddee-431a-8e45-d47885c1a14f'; // Test sender

    // ============================================
    // TEST 1: Deposit Received Notification
    // ============================================
    console.log('1️⃣ Testing Deposit Received Notification...');
    
    const depositResult = await notificationService.sendNotification(
        testUserId,
        'deposit_received',
        {
            amount: 100,
            reference: 'DEP-123456',
            newBalance: 500,
            currency: 'USD'
        },
        ['in_app'] // Only in-app for testing
    );
    
    console.log(`   In-app: ${depositResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);
    if (depositResult.results?.in_app?.notificationId) {
        console.log(`   Notification ID: ${depositResult.results.in_app.notificationId}`);
    }

    // ============================================
    // TEST 2: Withdrawal Completed Notification
    // ============================================
    console.log('\n2️⃣ Testing Withdrawal Completed Notification...');
    
    const withdrawalResult = await notificationService.sendNotification(
        testUserId,
        'withdrawal_completed',
        {
            amount: 50,
            reference: 'WTH-789012',
            newBalance: 450
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${withdrawalResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 3: Transfer Sent Notification
    // ============================================
    console.log('\n3️⃣ Testing Transfer Sent Notification...');
    
    const transferSentResult = await notificationService.sendNotification(
        testUserId,
        'transfer_sent',
        {
            amount: 25,
            recipientName: 'John Doe',
            reference: 'TRF-345678',
            newBalance: 425
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${transferSentResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 4: Transfer Received Notification
    // ============================================
    console.log('\n4️⃣ Testing Transfer Received Notification...');
    
    const transferReceivedResult = await notificationService.sendNotification(
        testUserId,
        'transfer_received',
        {
            amount: 75,
            senderName: 'Jane Smith',
            note: 'Thanks for lunch!',
            newBalance: 500
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${transferReceivedResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 5: Deposit Flagged (AML) Notification
    // ============================================
    console.log('\n5️⃣ Testing Deposit Flagged (AML) Notification...');
    
    const amlResult = await notificationService.sendNotification(
        testUserId,
        'deposit_flagged',
        {
            amount: 5000,
            reference: 'DEP-AML-001'
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${amlResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 6: Withdrawal Failed Notification
    // ============================================
    console.log('\n6️⃣ Testing Withdrawal Failed Notification...');
    
    const failedResult = await notificationService.sendNotification(
        testUserId,
        'withdrawal_failed',
        {
            amount: 200,
            reason: 'Insufficient funds in wallet'
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${failedResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 7: Withdrawal Initiated (2-3 days processing)
    // ============================================
    console.log('\n7️⃣ Testing Withdrawal Initiated Notification...');
    
    const initiatedResult = await notificationService.sendNotification(
        testUserId,
        'withdrawal_initiated',
        {
            amount: 500,
            currency: '$',
            destination: 'EcoCash (+263 77* *** **89)',
            reference: 'WTH-2024120301'
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${initiatedResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 8: ZWG Withdrawal Notification
    // ============================================
    console.log('\n8️⃣ Testing ZWG Withdrawal Notification...');
    
    const zwgResult = await notificationService.sendNotification(
        testUserId,
        'withdrawal_completed',
        {
            amount: 2500,
            currency: 'ZWG ',
            reference: 'WTH-ZWG-001'
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${zwgResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 9: Wallet Credited Notification
    // ============================================
    console.log('\n9️⃣ Testing Wallet Credited Notification...');
    
    const creditedResult = await notificationService.sendNotification(
        testUserId,
        'wallet_credited',
        {
            amount: 50,
            description: 'Referral bonus',
            newBalance: 550
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${creditedResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // TEST 10: Wallet Debited Notification
    // ============================================
    console.log('\n🔟 Testing Wallet Debited Notification...');
    
    const debitedResult = await notificationService.sendNotification(
        testUserId,
        'wallet_debited',
        {
            amount: 100,
            description: 'Loan repayment',
            newBalance: 450
        },
        ['in_app']
    );
    
    console.log(`   In-app: ${debitedResult.results?.in_app?.success ? '✅ Sent' : '❌ Failed'}`);

    // ============================================
    // VERIFY: Check notifications in database
    // ============================================
    console.log('\n📋 Verifying notifications in database...');
    
    const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, type, title, message, is_read, created_at')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.log(`   ❌ Error fetching notifications: ${error.message}`);
    } else if (notifications && notifications.length > 0) {
        console.log(`   ✅ Found ${notifications.length} notifications:\n`);
        notifications.forEach((n, i) => {
            console.log(`   ${i + 1}. ${n.title}`);
            console.log(`      Type: ${n.type}`);
            console.log(`      Message: ${n.message.substring(0, 60)}...`);
            console.log(`      Read: ${n.is_read ? 'Yes' : 'No'}`);
            console.log('');
        });
    } else {
        console.log('   ⚠️ No notifications found in database');
        console.log('   Note: The notifications table may not exist or have different structure');
    }

    // ============================================
    // TEST: Notification Title & Message Generation
    // ============================================
    console.log('\n📝 Testing notification content generation...\n');
    
    const testTypes = [
        { type: 'deposit_received', data: { amount: 100, reference: 'DEP-001', newBalance: 500 } },
        { type: 'withdrawal_completed', data: { amount: 50, reference: 'WTH-001' } },
        { type: 'transfer_sent', data: { amount: 25, recipientName: 'John', reference: 'TRF-001', newBalance: 475 } },
        { type: 'transfer_received', data: { amount: 30, senderName: 'Jane', note: 'Coffee money', newBalance: 505 } },
        { type: 'deposit_flagged', data: { amount: 5000 } }
    ];

    testTypes.forEach(({ type, data }) => {
        const title = notificationService.getNotificationTitle(type, data);
        const message = notificationService.getNotificationMessage(type, data);
        console.log(`   ${title}`);
        console.log(`   └─ ${message}\n`);
    });

    console.log('========================================');
    console.log('✅ Wallet Notification Tests Complete!');
    console.log('========================================\n');

    process.exit(0);
}

testWalletNotifications();

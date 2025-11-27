// Check payment status and wallet balance
require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = '50a60ab6-d8bd-412a-a52c-f656d40b26e3'; // Your user ID

async function checkPaymentStatus() {
    console.log('🔍 Checking recent payments and wallet status...\n');

    // 1. Check recent payment transactions
    console.log('📋 Recent Payment Transactions:');
    const { data: payments, error: paymentError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (paymentError) {
        console.error('❌ Error fetching payments:', paymentError);
    } else if (payments.length === 0) {
        console.log('⚠️  No payment transactions found');
    } else {
        payments.forEach((payment, index) => {
            console.log(`\n${index + 1}. Payment ${payment.reference}`);
            console.log(`   Amount: $${payment.amount} ${payment.currency}`);
            console.log(`   Status: ${payment.status}`);
            console.log(`   Method: ${payment.payment_method}`);
            console.log(`   Wallet Credited: ${payment.wallet_credited || false}`);
            console.log(`   Created: ${new Date(payment.created_at).toLocaleString()}`);
            console.log(`   Paid At: ${payment.paid_at ? new Date(payment.paid_at).toLocaleString() : 'Not paid'}`);
        });
    }

    // 2. Check wallet balance
    console.log('\n\n💰 Wallet Status:');
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (walletError) {
        if (walletError.code === 'PGRST116') {
            console.log('⚠️  No wallet found - needs to be created');
        } else {
            console.error('❌ Error fetching wallet:', walletError);
        }
    } else {
        console.log(`   Balance: $${wallet.balance} ${wallet.currency}`);
        console.log(`   Updated: ${new Date(wallet.updated_at).toLocaleString()}`);
    }

    // 3. Check wallet transactions
    console.log('\n\n📊 Recent Wallet Transactions:');
    const { data: transactions, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (txError) {
        console.error('❌ Error fetching wallet transactions:', txError);
    } else if (transactions.length === 0) {
        console.log('⚠️  No wallet transactions found');
    } else {
        transactions.forEach((tx, index) => {
            console.log(`\n${index + 1}. ${tx.type.toUpperCase()}`);
            console.log(`   Amount: $${tx.amount}`);
            console.log(`   Balance: $${tx.balance_before} → $${tx.balance_after}`);
            console.log(`   Reference: ${tx.reference}`);
            console.log(`   Status: ${tx.status}`);
            console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
        });
    }

    // 4. Check if tables exist
    console.log('\n\n🔧 Checking table structure...');
    
    const tables = ['payment_transactions', 'wallets', 'wallet_transactions'];
    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
        
        if (error) {
            console.log(`❌ ${table}: ${error.message}`);
        } else {
            console.log(`✅ ${table}: OK (columns: ${Object.keys(data[0] || {}).length})`);
        }
    }
}

checkPaymentStatus().catch(console.error);

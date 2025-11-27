// Create wallet tables via Supabase
require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createWalletTables() {
    console.log('🔧 Creating wallet tables...\n');

    const userId = '50a60ab6-d8bd-412a-a52c-f656d40b26e3';

    // Since we can't run raw SQL via client, let's create records directly
    
    // 1. Create wallet for user
    console.log('1️⃣ Creating wallet...');
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .upsert({
            user_id: userId,
            balance: 0.00,
            currency: 'USD',
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id'
        })
        .select()
        .single();

    if (walletError) {
        console.error('❌ Error creating wallet:', walletError);
        console.log('\n⚠️  The wallets table might not exist.');
        console.log('📋 Please run this SQL in Supabase dashboard:\n');
        console.log(fs.readFileSync('database/create-wallet-tables.sql', 'utf8'));
        return;
    }

    console.log('✅ Wallet created:', wallet);

    // 2. Verify wallet_transactions table exists
    console.log('\n2️⃣ Checking wallet_transactions table...');
    const { data: txTest, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .limit(1);

    if (txError) {
        console.error('❌ wallet_transactions table missing:', txError.message);
        console.log('\n⚠️  Please run the SQL script in Supabase dashboard');
        return;
    }

    console.log('✅ wallet_transactions table exists');

    // 3. Check payment_transactions for wallet_credited column
    console.log('\n3️⃣ Checking payment_transactions columns...');
    const { data: paymentTest } = await supabase
        .from('payment_transactions')
        .select('*')
        .limit(1);

    if (paymentTest && paymentTest[0]) {
        const hasWalletCredited = 'wallet_credited' in paymentTest[0];
        console.log(`   wallet_credited column: ${hasWalletCredited ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (!hasWalletCredited) {
            console.log('\n⚠️  Need to add wallet_credited column via SQL');
        }
    }

    console.log('\n✅ Setup complete!');
}

createWalletTables().catch(console.error);

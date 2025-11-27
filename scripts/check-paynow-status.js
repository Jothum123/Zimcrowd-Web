// Check PayNow status for pending payments
require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');
const PayNowService = require('../services/paynow.service');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const paynowService = new PayNowService();

async function checkPendingPayments() {
    console.log('🔍 Checking PayNow status for pending payments...\n');

    // Get pending payments
    const { data: payments, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('status', 'pending')
        .not('poll_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    if (payments.length === 0) {
        console.log('✅ No pending payments with poll URLs');
        return;
    }

    console.log(`Found ${payments.length} pending payment(s)\n`);

    for (const payment of payments) {
        console.log(`\n📋 Checking: ${payment.reference}`);
        console.log(`   Amount: $${payment.amount} ${payment.currency}`);
        console.log(`   Created: ${new Date(payment.created_at).toLocaleString()}`);
        console.log(`   Poll URL: ${payment.poll_url ? 'Available' : 'Missing'}`);

        if (!payment.poll_url) {
            console.log('   ⚠️  No poll URL - cannot check status');
            continue;
        }

        try {
            const statusResponse = await paynowService.checkPaymentStatus(
                payment.poll_url,
                payment.reference
            );

            console.log(`   Status Response:`, statusResponse);

            if (statusResponse.success && statusResponse.paid) {
                console.log('   ✅ PAYMENT CONFIRMED! Crediting wallet...');
                
                // Credit wallet
                const { data: wallet } = await supabase
                    .from('wallets')
                    .select('balance')
                    .eq('user_id', payment.user_id)
                    .single();

                const currentBalance = wallet?.balance || 0;
                const newBalance = currentBalance + payment.amount;

                await supabase
                    .from('wallets')
                    .update({
                        balance: newBalance,
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', payment.user_id);

                // Record transaction
                await supabase
                    .from('wallet_transactions')
                    .insert({
                        user_id: payment.user_id,
                        type: 'deposit',
                        amount: payment.amount,
                        currency: payment.currency,
                        balance_before: currentBalance,
                        balance_after: newBalance,
                        reference: payment.reference,
                        description: payment.description || 'Wallet Top-up',
                        payment_method: payment.payment_method,
                        status: 'completed'
                    });

                // Update payment
                await supabase
                    .from('payment_transactions')
                    .update({
                        status: 'paid',
                        paid_at: new Date().toISOString(),
                        wallet_credited: true,
                        paynow_reference: statusResponse.paynowReference
                    })
                    .eq('reference', payment.reference);

                console.log(`   💰 Wallet credited: $${currentBalance} → $${newBalance}`);
            } else {
                console.log(`   ⏳ Still pending or failed: ${statusResponse.status || 'unknown'}`);
            }
        } catch (error) {
            console.error(`   ❌ Error checking status:`, error.message);
        }
    }

    console.log('\n\n✅ Check complete!');
}

checkPendingPayments().catch(console.error);

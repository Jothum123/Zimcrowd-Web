// Test payment transaction insertion
require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPaymentInsert() {
    console.log('🧪 Testing payment transaction insertion...\n');

    const testData = {
        reference: `TEST_${Date.now()}`,
        user_id: '50a60ab6-d8bd-412a-a52c-f656d40b26e3', // Your user ID
        loan_id: null,
        amount: 1.00,
        currency: 'USD',
        payment_method: 'ecocash',
        mobile_number: '+263781144068',
        status: 'pending',
        description: 'Test wallet deposit'
    };

    console.log('📝 Test data:', testData);
    console.log('\n🔄 Inserting...\n');

    const { data, error } = await supabase
        .from('payment_transactions')
        .insert(testData)
        .select()
        .single();

    if (error) {
        console.error('❌ Insert failed:', error);
        console.log('\n📋 Error details:');
        console.log('  Code:', error.code);
        console.log('  Message:', error.message);
        console.log('  Details:', error.details);
        console.log('  Hint:', error.hint);
    } else {
        console.log('✅ Insert successful!');
        console.log('📄 Created record:', data);
        
        // Clean up test record
        console.log('\n🧹 Cleaning up test record...');
        await supabase
            .from('payment_transactions')
            .delete()
            .eq('id', data.id);
        console.log('✅ Test record deleted');
    }
}

testPaymentInsert().catch(console.error);

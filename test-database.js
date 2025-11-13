// Test database connection and basic queries
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function testDatabase() {
    console.log('🧪 Testing ZimCrowd Database Connection...\n');

    try {
        // Test 1: Check profiles table
        console.log('1. Testing profiles table...');
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

        if (profilesError) throw profilesError;
        console.log('✅ Profiles table accessible');

        // Test 2: Check loans table
        console.log('2. Testing loans table...');
        const { data: loans, error: loansError } = await supabase
            .from('loans')
            .select('count')
            .limit(1);

        if (loansError) throw loansError;
        console.log('✅ Loans table accessible');

        // Test 3: Check investments table
        console.log('3. Testing investments table...');
        const { data: investments, error: investmentsError } = await supabase
            .from('investments')
            .select('count')
            .limit(1);

        if (investmentsError) throw investmentsError;
        console.log('✅ Investments table accessible');

        // Test 4: Check transactions table
        console.log('4. Testing transactions table...');
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('count')
            .limit(1);

        if (transactionsError) throw transactionsError;
        console.log('✅ Transactions table accessible');

        console.log('\n🎉 All database tables are working!');
        console.log('🚀 Ready for user registration and data operations.');

    } catch (error) {
        console.log('❌ Database test failed:', error.message);
        console.log('💡 Make sure all schema steps completed successfully.');
    }
}

testDatabase();

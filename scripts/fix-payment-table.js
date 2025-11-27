// Fix payment_transactions table via Supabase API
require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPaymentTable() {
    console.log('🔧 Fixing payment_transactions table...\n');

    // SQL to add missing columns
    const sql = `
        -- Add missing columns if they don't exist
        ALTER TABLE payment_transactions 
        ADD COLUMN IF NOT EXISTS loan_id UUID,
        ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS poll_url TEXT,
        ADD COLUMN IF NOT EXISTS paynow_reference VARCHAR(255),
        ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;

        -- Create indexes if they don't exist
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_loan_id ON payment_transactions(loan_id);
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
    `;

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
            console.error('❌ Error:', error.message);
            
            // Try alternative method - direct column addition
            console.log('\n🔄 Trying alternative method...\n');
            await addColumnsDirectly();
        } else {
            console.log('✅ Payment table fixed successfully!');
            await verifyTable();
        }
    } catch (err) {
        console.error('❌ Script error:', err.message);
        console.log('\n🔄 Trying direct column addition...\n');
        await addColumnsDirectly();
    }
}

async function addColumnsDirectly() {
    console.log('Adding columns using direct queries...\n');

    // Check current columns
    const { data: columns, error: colError } = await supabase
        .from('payment_transactions')
        .select('*')
        .limit(1);

    if (colError) {
        console.error('❌ Cannot access payment_transactions table:', colError.message);
        console.log('\n⚠️  The table might not exist. Creating it...\n');
        await createTable();
        return;
    }

    console.log('✅ Table exists. Current columns:', Object.keys(columns[0] || {}));
    console.log('\n📋 Required columns: loan_id, mobile_number, poll_url, paynow_reference, paid_at');
    console.log('\n⚠️  Note: Cannot add columns via Supabase client. Please run SQL manually or use Supabase dashboard.');
}

async function createTable() {
    console.log('Creating payment_transactions table...\n');
    console.log('⚠️  Cannot create table via client. Please run this SQL in Supabase dashboard:\n');
    console.log(`
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    loan_id UUID,
    reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    mobile_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    poll_url TEXT,
    paynow_reference VARCHAR(255),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
    `);
}

async function verifyTable() {
    console.log('\n🔍 Verifying table structure...\n');
    
    const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Verification error:', error.message);
    } else {
        console.log('✅ Table columns:', Object.keys(data[0] || {}));
    }
}

// Run the script
fixPaymentTable().catch(console.error);

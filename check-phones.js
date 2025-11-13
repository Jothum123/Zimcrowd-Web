require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkPhones() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('profiles')
        .select('phone, first_name, last_name')
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Phones in profiles table:');
        data.forEach(p => console.log(`  ${p.phone} - ${p.first_name} ${p.last_name}`));
    }
}

checkPhones();

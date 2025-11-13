require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkPhoneDetails() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', '+263712345678')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Profile details for +263712345678:');
        data.forEach(p => console.log(p));
    }
}

checkPhoneDetails();

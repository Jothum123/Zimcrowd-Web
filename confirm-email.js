const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function confirmUserEmail(email) {
    try {
        console.log(`🔧 Manually confirming email for: ${email}`);
        
        // Find the user
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Error listing users:', listError);
            return;
        }
        
        const user = users.users.find(u => u.email === email);
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        // Update user to confirm email
        const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true
        });
        
        if (error) {
            console.error('❌ Error confirming email:', error);
        } else {
            console.log('✅ Email confirmed successfully!');
            console.log('🎉 You can now login with your credentials');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Usage: node confirm-email.js email@example.com
const email = process.argv[2];

if (!email) {
    console.log('❌ Please provide an email address');
    console.log('Usage: node confirm-email.js jothum@zimcrowd.com');
    process.exit(1);
}

confirmUserEmail(email);

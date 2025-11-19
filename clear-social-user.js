const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearSocialUser(email) {
    try {
        console.log(`🔍 Looking for user with email: ${email}`);
        
        // Find user by email
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Error listing users:', listError);
            return;
        }
        
        const user = users.users.find(u => u.email === email);
        
        if (!user) {
            console.log('❌ User not found with that email');
            return;
        }
        
        console.log(`✅ Found user: ${user.id} (${user.email})`);
        console.log(`📋 Provider: ${user.app_metadata?.provider || 'unknown'}`);
        
        // Delete from profiles table first
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);
            
        if (profileError) {
            console.error('⚠️ Error deleting profile:', profileError);
        } else {
            console.log('✅ Profile deleted from database');
        }
        
        // Delete user from auth
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
            console.error('❌ Error deleting user:', deleteError);
        } else {
            console.log('✅ User deleted from Supabase Auth');
            console.log('🎉 Social login completely removed! You can now retry.');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Usage: node clear-social-user.js your-email@example.com
const email = process.argv[2];

if (!email) {
    console.log('❌ Please provide an email address');
    console.log('Usage: node clear-social-user.js your-email@example.com');
    process.exit(1);
}

clearSocialUser(email);

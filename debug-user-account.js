const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugUserAccount(email) {
    try {
        console.log(`🔍 Debugging account for: ${email}`);
        console.log('=' .repeat(50));
        
        // 1. Check Supabase Auth users
        console.log('📋 Checking Supabase Auth users...');
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Error listing users:', listError);
            return;
        }
        
        const user = users.users.find(u => u.email === email);
        
        if (user) {
            console.log('✅ Found user in Supabase Auth:');
            console.log(`   ID: ${user.id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Phone: ${user.phone || 'Not set'}`);
            console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
            console.log(`   Phone Confirmed: ${user.phone_confirmed_at ? 'Yes' : 'No'}`);
            console.log(`   Provider: ${user.app_metadata?.provider || 'email'}`);
            console.log(`   Created: ${user.created_at}`);
            console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`);
            
            // 2. Check profiles table
            console.log('\n📋 Checking profiles table...');
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
                
            if (profileError) {
                console.log('❌ No profile found in profiles table:', profileError.message);
            } else {
                console.log('✅ Found profile:');
                console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
                console.log(`   Email: ${profile.email}`);
                console.log(`   Phone: ${profile.phone || 'Not set'}`);
                console.log(`   Provider: ${profile.auth_provider || 'Not set'}`);
                console.log(`   Email Verified: ${profile.email_verified || false}`);
                console.log(`   Phone Verified: ${profile.phone_verified || false}`);
            }
            
            // 3. Test login
            console.log('\n🔐 Testing login...');
            try {
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: 'Kairo@2025t' // Using the password from the screenshot
                });
                
                if (loginError) {
                    console.log('❌ Login failed:', loginError.message);
                    console.log('   Error code:', loginError.status);
                    
                    // Check if it's an unconfirmed email issue
                    if (loginError.message.includes('Email not confirmed')) {
                        console.log('💡 Solution: Email needs to be confirmed');
                        
                        // Try to resend confirmation
                        const { error: resendError } = await supabase.auth.resend({
                            type: 'signup',
                            email: email
                        });
                        
                        if (resendError) {
                            console.log('❌ Failed to resend confirmation:', resendError.message);
                        } else {
                            console.log('✅ Confirmation email resent');
                        }
                    }
                } else {
                    console.log('✅ Login successful!');
                    console.log(`   User ID: ${loginData.user.id}`);
                    console.log(`   Access Token: ${loginData.session.access_token.substring(0, 20)}...`);
                }
            } catch (testError) {
                console.log('❌ Login test error:', testError.message);
            }
            
        } else {
            console.log('❌ User not found in Supabase Auth');
            
            // Check if there's a profile without auth user
            console.log('\n📋 Checking profiles table for orphaned records...');
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email);
                
            if (profilesError) {
                console.log('❌ Error checking profiles:', profilesError.message);
            } else if (profiles.length > 0) {
                console.log('⚠️ Found profile(s) without auth user:');
                profiles.forEach(profile => {
                    console.log(`   ID: ${profile.id}`);
                    console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
                    console.log(`   Email: ${profile.email}`);
                });
            } else {
                console.log('❌ No profiles found either');
            }
        }
        
        console.log('\n' + '=' .repeat(50));
        console.log('🎯 Diagnosis complete!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Usage: node debug-user-account.js email@example.com
const email = process.argv[2];

if (!email) {
    console.log('❌ Please provide an email address');
    console.log('Usage: node debug-user-account.js jothum@zimcrowd.com');
    process.exit(1);
}

debugUserAccount(email);

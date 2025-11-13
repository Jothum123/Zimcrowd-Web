// Create test user using Supabase Admin API
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUser() {
    try {
        console.log('🚀 Creating test user with Supabase Admin API...');

        // Create user in auth system
        console.log('📝 Creating auth user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: 'test-dashboard@example.com',
            password: 'TestPass123',
            email_confirm: true, // Skip email confirmation for testing
            user_metadata: {
                first_name: 'Test',
                last_name: 'User',
                phone: '+263771234567'
            }
        });

        if (authError) {
            // If user already exists, try to get their info
            if (authError.message.includes('already registered')) {
                console.log('ℹ️ User already exists, fetching user data...');
                const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

                if (listError) {
                    console.error('❌ Error listing users:', listError);
                    return;
                }

                const existingUser = existingUsers.users.find(u => u.email === 'test-dashboard@example.com');
                if (existingUser) {
                    console.log('✅ Found existing user:', existingUser.id);
                    await populateUserData(existingUser);
                    return;
                }
            }

            console.error('❌ Auth user creation error:', authError);
            return;
        }

        console.log('✅ Auth user created:', authData.user.id);
        await populateUserData(authData.user);

    } catch (error) {
        console.error('❌ Error creating test user:', error);
    }
}

async function populateUserData(user) {
    const userId = user.id;

    try {
        // Update profile
        console.log('📝 Populating profile data...');
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                first_name: 'Test',
                last_name: 'User',
                email: 'test-dashboard@example.com',
                phone: '+263771234567',
                onboarding_completed: true,
                profile_completed: true
            });

        if (profileError) {
            console.error('❌ Profile creation error:', profileError);
        } else {
            console.log('✅ Profile created/updated');
        }

        // Add wallet transactions
        console.log('💰 Adding wallet transactions...');
        const { error: walletError } = await supabase
            .from('transactions')
            .upsert([
                {
                    id: `txn-${userId}-1`, // Add unique ID
                    user_id: userId,
                    type: 'deposit',
                    amount: 1000.00,
                    description: 'Initial deposit',
                    balance_after: 1000.00,
                    created_at: new Date().toISOString()
                },
                {
                    id: `txn-${userId}-2`, // Add unique ID
                    user_id: userId,
                    type: 'deposit',
                    amount: 500.00,
                    description: 'Additional funds',
                    balance_after: 1500.00,
                    created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
                }
            ], { onConflict: 'id' });

        if (walletError) {
            console.error('❌ Wallet creation error:', walletError);
        } else {
            console.log('✅ Wallet transactions added');
        }

        // Add sample loan
        console.log('🏦 Adding sample loan...');
        const { error: loanError } = await supabase
            .from('loans')
            .upsert({
                id: `loan-${userId}-1`, // Add unique ID
                user_id: userId,
                loan_type: 'personal',
                amount: 5000.00,
                interest_rate: 12.5,
                duration_months: 12,
                status: 'active',
                purpose: 'Testing loan',
                monthly_payment: 450.00,
                total_payment: 5400.00
            }, { onConflict: 'id' });

        if (loanError) {
            console.error('❌ Loan creation error:', loanError);
        } else {
            console.log('✅ Sample loan added');
        }

        // Add sample investment
        console.log('📈 Adding sample investment...');
        const { error: investmentError } = await supabase
            .from('investments')
            .upsert({
                id: `inv-${userId}-1`, // Add unique ID
                user_id: userId,
                investment_type: 'stocks',
                amount: 2000.00,
                expected_return: 8.5,
                risk_level: 'medium',
                status: 'active',
                description: 'Test investment portfolio'
            }, { onConflict: 'id' });

        if (investmentError) {
            console.error('❌ Investment creation error:', investmentError);
        } else {
            console.log('✅ Sample investment added');
        }

        console.log('\n🎉 Test user setup complete!');
        console.log(`📧 Email: test-dashboard@example.com`);
        console.log(`📱 Phone: +263771234567`);
        console.log(`🔑 Password: TestPass123`);
        console.log(`🆔 User ID: ${userId}`);

    } catch (error) {
        console.error('❌ Error populating user data:', error);
    }
}

createTestUser();

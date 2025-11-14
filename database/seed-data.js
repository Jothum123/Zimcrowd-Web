/**
 * Database Seeding Script
 * Populates database with initial data matching mock data structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use service key for admin operations
);

async function seedDatabase() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Step 1: Create test user profile
        console.log('1️⃣  Creating test user profile...');
        const testUserId = 'test-user-' + Date.now();
        
        const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .insert({
                id: testUserId,
                email: 'jchitewe@gmail.com',
                phone: '+263771234567',
                first_name: 'John',
                last_name: 'Chitewe',
                country: 'Zimbabwe',
                city: 'Harare',
                email_verified: true,
                phone_verified: true,
                kyc_status: 'verified',
                kyc_level: 2
            })
            .select()
            .single();

        if (userError) {
            console.error('❌ Error creating user:', userError);
            throw userError;
        }
        console.log('✅ User created:', userData.email);

        // Step 2: Create wallet
        console.log('\n2️⃣  Creating wallet...');
        const { data: walletData, error: walletError } = await supabase
            .from('wallets')
            .insert({
                user_id: testUserId,
                balance: 15750.50,
                currency: 'USD',
                available_balance: 14250.50,
                pending_balance: 1500.00,
                total_invested: 25000.00,
                total_borrowed: 10000.00,
                total_earned: 3250.75
            })
            .select()
            .single();

        if (walletError) {
            console.error('❌ Error creating wallet:', walletError);
            throw walletError;
        }
        console.log('✅ Wallet created with balance:', walletData.balance);

        // Step 3: Create loans
        console.log('\n3️⃣  Creating loans...');
        const loans = [
            {
                borrower_id: testUserId,
                amount: 5000.00,
                currency: 'USD',
                interest_rate: 12.5,
                term_months: 12,
                purpose: 'Business Expansion',
                status: 'active',
                funded_amount: 5000.00,
                repaid_amount: 1250.00,
                remaining_amount: 3750.00,
                next_payment_date: '2025-12-15',
                next_payment_amount: 458.33,
                risk_rating: 'B+',
                collateral_type: 'Business Assets',
                monthly_payment: 458.33,
                payments_made: 3,
                payments_remaining: 9,
                funded_at: '2024-11-05T14:30:00Z'
            },
            {
                borrower_id: testUserId,
                amount: 3000.00,
                currency: 'USD',
                interest_rate: 10.0,
                term_months: 6,
                purpose: 'Equipment Purchase',
                status: 'active',
                funded_amount: 3000.00,
                repaid_amount: 1500.00,
                remaining_amount: 1500.00,
                next_payment_date: '2025-12-20',
                next_payment_amount: 516.67,
                risk_rating: 'A',
                collateral_type: 'Equipment',
                monthly_payment: 516.67,
                payments_made: 3,
                payments_remaining: 3,
                funded_at: '2024-10-18T16:45:00Z'
            },
            {
                borrower_id: testUserId,
                amount: 2000.00,
                currency: 'USD',
                interest_rate: 15.0,
                term_months: 3,
                purpose: 'Working Capital',
                status: 'pending',
                funded_amount: 1200.00,
                repaid_amount: 0,
                remaining_amount: 2000.00,
                next_payment_date: null,
                next_payment_amount: 0,
                risk_rating: 'C',
                collateral_type: 'None',
                monthly_payment: 703.33,
                payments_made: 0,
                payments_remaining: 3,
                funding_progress: 60
            }
        ];

        const { data: loansData, error: loansError } = await supabase
            .from('loans')
            .insert(loans)
            .select();

        if (loansError) {
            console.error('❌ Error creating loans:', loansError);
            throw loansError;
        }
        console.log(`✅ Created ${loansData.length} loans`);

        // Step 4: Create external borrowers for investments
        console.log('\n4️⃣  Creating external borrowers...');
        const externalBorrowers = [
            {
                id: 'borrower-sarah-' + Date.now(),
                email: 'sarah.moyo@example.com',
                phone: '+263772345678',
                first_name: 'Sarah',
                last_name: 'Moyo',
                country: 'Zimbabwe',
                city: 'Bulawayo',
                kyc_status: 'verified',
                kyc_level: 2
            },
            {
                id: 'borrower-david-' + Date.now(),
                email: 'david.ncube@example.com',
                phone: '+263773456789',
                first_name: 'David',
                last_name: 'Ncube',
                country: 'Zimbabwe',
                city: 'Harare',
                kyc_status: 'verified',
                kyc_level: 2
            },
            {
                id: 'borrower-grace-' + Date.now(),
                email: 'grace.mwangi@example.com',
                phone: '+263774567890',
                first_name: 'Grace',
                last_name: 'Mwangi',
                country: 'Zimbabwe',
                city: 'Mutare',
                kyc_status: 'verified',
                kyc_level: 1
            }
        ];

        const { data: borrowersData, error: borrowersError } = await supabase
            .from('user_profiles')
            .insert(externalBorrowers)
            .select();

        if (borrowersError) {
            console.error('❌ Error creating borrowers:', borrowersError);
            throw borrowersError;
        }
        console.log(`✅ Created ${borrowersData.length} external borrowers`);

        // Step 5: Create external loans for investments
        console.log('\n5️⃣  Creating external loans...');
        const externalLoans = [
            {
                borrower_id: borrowersData[0].id,
                amount: 1000.00,
                currency: 'USD',
                interest_rate: 12.0,
                term_months: 12,
                purpose: 'Agriculture',
                status: 'active',
                funded_amount: 1000.00,
                repaid_amount: 400.00,
                remaining_amount: 600.00,
                next_payment_date: '2025-01-01',
                next_payment_amount: 93.33,
                risk_rating: 'B',
                collateral_type: 'Farm Equipment',
                monthly_payment: 93.33,
                payments_made: 4,
                payments_remaining: 8,
                funded_at: '2024-09-01T10:00:00Z'
            },
            {
                borrower_id: borrowersData[1].id,
                amount: 2500.00,
                currency: 'USD',
                interest_rate: 10.5,
                term_months: 6,
                purpose: 'Real Estate',
                status: 'active',
                funded_amount: 2500.00,
                repaid_amount: 1840.00,
                remaining_amount: 660.00,
                next_payment_date: '2024-12-15',
                next_payment_amount: 460.42,
                risk_rating: 'A',
                collateral_type: 'Property',
                monthly_payment: 460.42,
                payments_made: 4,
                payments_remaining: 2,
                funded_at: '2024-08-15T14:30:00Z'
            },
            {
                borrower_id: borrowersData[2].id,
                amount: 500.00,
                currency: 'USD',
                interest_rate: 14.0,
                term_months: 3,
                purpose: 'Education',
                status: 'completed',
                funded_amount: 500.00,
                repaid_amount: 570.00,
                remaining_amount: 0,
                next_payment_date: null,
                next_payment_amount: 0,
                risk_rating: 'B+',
                collateral_type: 'None',
                monthly_payment: 190.00,
                payments_made: 3,
                payments_remaining: 0,
                funded_at: '2024-06-01T09:00:00Z',
                completed_at: '2024-09-01T09:00:00Z'
            }
        ];

        const { data: externalLoansData, error: externalLoansError } = await supabase
            .from('loans')
            .insert(externalLoans)
            .select();

        if (externalLoansError) {
            console.error('❌ Error creating external loans:', externalLoansError);
            throw externalLoansError;
        }
        console.log(`✅ Created ${externalLoansData.length} external loans`);

        // Step 6: Create investments
        console.log('\n6️⃣  Creating investments...');
        const investments = [
            {
                investor_id: testUserId,
                loan_id: externalLoansData[0].id,
                amount: 1000.00,
                currency: 'USD',
                interest_rate: 12.0,
                status: 'active',
                earned_interest: 120.00,
                expected_return: 1120.00,
                term_months: 12,
                payments_received: 4,
                next_payment_date: '2025-01-01',
                next_payment_amount: 93.33,
                invested_at: '2024-09-01T10:00:00Z',
                maturity_date: '2025-09-01T10:00:00Z'
            },
            {
                investor_id: testUserId,
                loan_id: externalLoansData[1].id,
                amount: 2500.00,
                currency: 'USD',
                interest_rate: 10.5,
                status: 'active',
                earned_interest: 175.00,
                expected_return: 2762.50,
                term_months: 6,
                payments_received: 4,
                next_payment_date: '2024-12-15',
                next_payment_amount: 460.42,
                invested_at: '2024-08-15T14:30:00Z',
                maturity_date: '2025-02-15T14:30:00Z'
            },
            {
                investor_id: testUserId,
                loan_id: externalLoansData[2].id,
                amount: 500.00,
                currency: 'USD',
                interest_rate: 14.0,
                status: 'completed',
                earned_interest: 70.00,
                expected_return: 570.00,
                term_months: 3,
                payments_received: 3,
                next_payment_date: null,
                next_payment_amount: 0,
                invested_at: '2024-06-01T09:00:00Z',
                maturity_date: '2024-09-01T09:00:00Z',
                completed_at: '2024-09-01T09:00:00Z'
            }
        ];

        const { data: investmentsData, error: investmentsError } = await supabase
            .from('investments')
            .insert(investments)
            .select();

        if (investmentsError) {
            console.error('❌ Error creating investments:', investmentsError);
            throw investmentsError;
        }
        console.log(`✅ Created ${investmentsData.length} investments`);

        // Step 7: Create transactions
        console.log('\n7️⃣  Creating transactions...');
        const transactions = [
            {
                user_id: testUserId,
                type: 'investment',
                amount: 1000.00,
                currency: 'USD',
                status: 'completed',
                description: 'Investment in Loan #' + externalLoansData[0].id,
                reference: 'INV-20241113-001',
                balance_after: 14250.50,
                created_at: '2024-11-13T14:30:00Z',
                completed_at: '2024-11-13T14:30:00Z'
            },
            {
                user_id: testUserId,
                type: 'repayment',
                amount: 458.33,
                currency: 'USD',
                status: 'completed',
                description: 'Loan repayment for Loan #' + loansData[0].id,
                reference: 'REP-20241115-001',
                balance_after: 13792.17,
                created_at: '2024-11-15T10:00:00Z',
                completed_at: '2024-11-15T10:00:00Z'
            },
            {
                user_id: testUserId,
                type: 'deposit',
                amount: 5000.00,
                currency: 'USD',
                status: 'completed',
                description: 'Wallet deposit via Bank Transfer',
                reference: 'DEP-20241110-001',
                balance_after: 19250.50,
                payment_method: 'bank_transfer',
                created_at: '2024-11-10T16:45:00Z',
                completed_at: '2024-11-10T16:45:00Z'
            },
            {
                user_id: testUserId,
                type: 'interest',
                amount: 93.33,
                currency: 'USD',
                status: 'completed',
                description: 'Interest payment from Investment #' + investmentsData[0].id,
                reference: 'INT-20241101-001',
                balance_after: 14343.83,
                created_at: '2024-11-01T09:00:00Z',
                completed_at: '2024-11-01T09:00:00Z'
            },
            {
                user_id: testUserId,
                type: 'withdrawal',
                amount: 2000.00,
                currency: 'USD',
                status: 'pending',
                description: 'Withdrawal to Bank Account',
                reference: 'WTH-20241114-001',
                balance_after: 12250.50,
                payment_method: 'bank_transfer',
                created_at: '2024-11-14T11:20:00Z'
            }
        ];

        const { data: transactionsData, error: transactionsError } = await supabase
            .from('transactions')
            .insert(transactions)
            .select();

        if (transactionsError) {
            console.error('❌ Error creating transactions:', transactionsError);
            throw transactionsError;
        }
        console.log(`✅ Created ${transactionsData.length} transactions`);

        // Step 8: Create notifications
        console.log('\n8️⃣  Creating notifications...');
        const notifications = [
            {
                user_id: testUserId,
                type: 'payment_due',
                title: 'Payment Due Soon',
                message: 'Your loan payment of $458.33 is due on December 15, 2025',
                read: false,
                action_url: '/dashboard#loans',
                priority: 'high',
                created_at: '2024-11-14T08:00:00Z'
            },
            {
                user_id: testUserId,
                type: 'investment_return',
                title: 'Interest Payment Received',
                message: 'You received $93.33 interest from your investment',
                read: false,
                action_url: '/dashboard#investments',
                priority: 'medium',
                created_at: '2024-11-01T09:05:00Z'
            },
            {
                user_id: testUserId,
                type: 'loan_funded',
                title: 'Loan Fully Funded',
                message: 'Your loan request for $3,000 has been fully funded',
                read: true,
                action_url: '/dashboard#loans',
                priority: 'high',
                created_at: '2024-10-18T16:50:00Z',
                read_at: '2024-10-18T17:00:00Z'
            }
        ];

        const { data: notificationsData, error: notificationsError } = await supabase
            .from('notifications')
            .insert(notifications)
            .select();

        if (notificationsError) {
            console.error('❌ Error creating notifications:', notificationsError);
            throw notificationsError;
        }
        console.log(`✅ Created ${notificationsData.length} notifications`);

        // Step 9: Create user statistics
        console.log('\n9️⃣  Creating user statistics...');
        const { data: statsData, error: statsError } = await supabase
            .from('user_statistics')
            .insert({
                user_id: testUserId,
                total_loans: 3,
                active_loans: 2,
                pending_loans: 1,
                completed_loans: 0,
                total_investments: 3,
                active_investments: 2,
                completed_investments: 1,
                total_borrowed: 10000.00,
                total_invested: 4000.00,
                total_earned: 365.00,
                total_repaid: 2750.00,
                average_return_rate: 12.17,
                portfolio_performance: 8.5,
                credit_score: 720,
                success_rate: 95.5
            })
            .select()
            .single();

        if (statsError) {
            console.error('❌ Error creating statistics:', statsError);
            throw statsError;
        }
        console.log('✅ User statistics created');

        console.log('\n✅ ✅ ✅ Database seeding completed successfully! ✅ ✅ ✅\n');
        console.log('📊 Summary:');
        console.log(`   - 1 test user created (${userData.email})`);
        console.log(`   - 1 wallet created`);
        console.log(`   - ${loansData.length} loans created`);
        console.log(`   - ${borrowersData.length} external borrowers created`);
        console.log(`   - ${externalLoansData.length} external loans created`);
        console.log(`   - ${investmentsData.length} investments created`);
        console.log(`   - ${transactionsData.length} transactions created`);
        console.log(`   - ${notificationsData.length} notifications created`);
        console.log(`   - 1 user statistics record created`);
        console.log('\n🎉 Your database is ready for production!\n');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    }
}

// Run the seeding
seedDatabase();

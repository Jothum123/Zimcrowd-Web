/**
 * Seed Market Data Script
 * Run this script to populate the database with primary market loans and sample investments
 * 
 * Usage: node scripts/seed-market-data.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Borrower profiles data
const borrowers = [
    { email: 'sarah.moyo@example.com', name: 'Sarah Moyo', occupation: 'Small Business Owner', location: 'Harare', zimScore: 82, verified: true },
    { email: 'tendai.ndlovu@example.com', name: 'Tendai Ndlovu', occupation: 'IT Professional', location: 'Bulawayo', zimScore: 75, verified: true },
    { email: 'grace.chikwanha@example.com', name: 'Grace Chikwanha', occupation: 'Teacher', location: 'Mutare', zimScore: 84, verified: true },
    { email: 'peter.mlambo@example.com', name: 'Peter Mlambo', occupation: 'Farmer', location: 'Masvingo', zimScore: 65, verified: true },
    { email: 'nyasha.chirwa@example.com', name: 'Nyasha Chirwa', occupation: 'Nurse', location: 'Gweru', zimScore: 85, verified: true },
    { email: 'tatenda.mugabe@example.com', name: 'Tatenda Mugabe', occupation: 'Software Developer', location: 'Harare', zimScore: 78, verified: true },
    { email: 'rumbidzai.ncube@example.com', name: 'Rumbidzai Ncube', occupation: 'Accountant', location: 'Harare', zimScore: 72, verified: true },
    { email: 'farai.dube@example.com', name: 'Farai Dube', occupation: 'Mechanic', location: 'Chitungwiza', zimScore: 55, verified: false },
    { email: 'chipo.mutasa@example.com', name: 'Chipo Mutasa', occupation: 'Market Vendor', location: 'Harare', zimScore: 45, verified: false },
    { email: 'blessing.moyo@example.com', name: 'Blessing Moyo', occupation: 'Student', location: 'Harare', zimScore: 38, verified: false },
    { email: 'tapiwa.zhou@example.com', name: 'Tapiwa Zhou', occupation: 'Entrepreneur', location: 'Victoria Falls', zimScore: 80, verified: true },
    { email: 'rudo.mapfumo@example.com', name: 'Rudo Mapfumo', occupation: 'Healthcare Worker', location: 'Kwekwe', zimScore: 76, verified: true }
];

// Primary market loans data
const loans = [
    { borrowerEmail: 'sarah.moyo@example.com', title: 'Business Expansion Loan', purpose: 'Business', description: 'Expanding my retail shop with new inventory and equipment', amount: 800, currency: 'USD', interestRate: 12.5, termMonths: 12, riskLevel: 'Low', fundedAmount: 520, fundingProgress: 65, lendersCount: 8 },
    { borrowerEmail: 'tendai.ndlovu@example.com', title: 'Tech Equipment Purchase', purpose: 'Business', description: 'Purchasing new computers and software for freelance work', amount: 1200, currency: 'USD', interestRate: 10.0, termMonths: 18, riskLevel: 'Low', fundedAmount: 840, fundingProgress: 70, lendersCount: 12 },
    { borrowerEmail: 'grace.chikwanha@example.com', title: 'Education Funding', purpose: 'Education', description: 'Masters degree tuition fees for career advancement', amount: 2500, currency: 'USD', interestRate: 8.5, termMonths: 24, riskLevel: 'Very Low', fundedAmount: 2000, fundingProgress: 80, lendersCount: 25 },
    { borrowerEmail: 'peter.mlambo@example.com', title: 'Agricultural Investment', purpose: 'Agriculture', description: 'Seeds, fertilizers and irrigation equipment for farming season', amount: 1500, currency: 'USD', interestRate: 15.0, termMonths: 12, riskLevel: 'Medium', fundedAmount: 450, fundingProgress: 30, lendersCount: 6 },
    { borrowerEmail: 'nyasha.chirwa@example.com', title: 'Medical Equipment', purpose: 'Medical', description: 'Purchasing medical supplies for private practice', amount: 3000, currency: 'USD', interestRate: 9.0, termMonths: 24, riskLevel: 'Very Low', fundedAmount: 2700, fundingProgress: 90, lendersCount: 35 },
    { borrowerEmail: 'tatenda.mugabe@example.com', title: 'Startup Capital', purpose: 'Business', description: 'Initial capital for tech startup development', amount: 5000, currency: 'USD', interestRate: 11.0, termMonths: 36, riskLevel: 'Low', fundedAmount: 1500, fundingProgress: 30, lendersCount: 15 },
    { borrowerEmail: 'rumbidzai.ncube@example.com', title: 'Home Improvement', purpose: 'Home', description: 'Renovating kitchen and bathroom facilities', amount: 15000, currency: 'ZWG', interestRate: 18.0, termMonths: 12, riskLevel: 'Low', fundedAmount: 9000, fundingProgress: 60, lendersCount: 10 },
    { borrowerEmail: 'farai.dube@example.com', title: 'Workshop Equipment', purpose: 'Business', description: 'New tools and equipment for auto repair workshop', amount: 25000, currency: 'ZWG', interestRate: 22.0, termMonths: 18, riskLevel: 'High', fundedAmount: 5000, fundingProgress: 20, lendersCount: 4 },
    { borrowerEmail: 'tapiwa.zhou@example.com', title: 'Tourism Business', purpose: 'Business', description: 'Tour guide equipment and marketing for Victoria Falls tours', amount: 35000, currency: 'ZWG', interestRate: 16.0, termMonths: 24, riskLevel: 'Low', fundedAmount: 28000, fundingProgress: 80, lendersCount: 18 },
    { borrowerEmail: 'rudo.mapfumo@example.com', title: 'Emergency Medical', purpose: 'Medical', description: 'Urgent medical treatment and recovery expenses', amount: 8000, currency: 'ZWG', interestRate: 20.0, termMonths: 6, riskLevel: 'Medium', fundedAmount: 6400, fundingProgress: 80, lendersCount: 12 },
    { borrowerEmail: 'sarah.moyo@example.com', title: 'Inventory Restocking', purpose: 'Business', description: 'Restocking popular items for holiday season', amount: 600, currency: 'USD', interestRate: 14.0, termMonths: 6, riskLevel: 'Low', fundedAmount: 300, fundingProgress: 50, lendersCount: 5 },
    { borrowerEmail: 'grace.chikwanha@example.com', title: 'School Supplies', purpose: 'Education', description: 'Educational materials and teaching resources', amount: 400, currency: 'USD', interestRate: 10.0, termMonths: 6, riskLevel: 'Very Low', fundedAmount: 360, fundingProgress: 90, lendersCount: 8 }
];

async function createTables() {
    console.log('📋 Creating tables if they don\'t exist...');
    
    // Create primary_market_loans table
    const { error: loansTableError } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS primary_market_loans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                borrower_id UUID REFERENCES auth.users(id),
                title VARCHAR(255) NOT NULL,
                purpose VARCHAR(100) NOT NULL,
                purpose_description TEXT,
                amount DECIMAL(12,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                interest_rate DECIMAL(5,2) NOT NULL,
                term_months INTEGER NOT NULL,
                risk_level VARCHAR(20) NOT NULL,
                funded_amount DECIMAL(12,2) DEFAULT 0,
                funding_progress DECIMAL(5,2) DEFAULT 0,
                lenders_count INTEGER DEFAULT 0,
                min_investment DECIMAL(10,2) DEFAULT 25,
                status VARCHAR(20) DEFAULT 'funding',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                funding_deadline TIMESTAMP WITH TIME ZONE,
                funded_at TIMESTAMP WITH TIME ZONE
            );
        `
    });
    
    if (loansTableError) {
        console.log('⚠️ Could not create table via RPC, trying direct insert...');
    }
    
    // Create investments table
    const { error: investmentsTableError } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS investments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                investor_id UUID REFERENCES auth.users(id) NOT NULL,
                loan_id UUID REFERENCES primary_market_loans(id),
                borrower_id UUID REFERENCES auth.users(id),
                amount DECIMAL(12,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                ownership_percent DECIMAL(5,2),
                interest_rate DECIMAL(5,2),
                expected_return DECIMAL(12,2),
                actual_return DECIMAL(12,2) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                invested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                maturity_date TIMESTAMP WITH TIME ZONE,
                next_payment_date TIMESTAMP WITH TIME ZONE,
                payments_received INTEGER DEFAULT 0,
                total_payments INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `
    });
    
    console.log('✅ Tables ready');
}

async function seedBorrowers() {
    console.log('👥 Seeding borrower profiles...');
    
    for (const borrower of borrowers) {
        // Check if profile exists
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', borrower.email)
            .single();
        
        if (existingProfile) {
            // Update existing profile
            await supabase
                .from('profiles')
                .update({
                    full_name: borrower.name,
                    occupation: borrower.occupation,
                    location: borrower.location,
                    zim_score: borrower.zimScore,
                    verified: borrower.verified
                })
                .eq('id', existingProfile.id);
            console.log(`  ✅ Updated: ${borrower.name}`);
        } else {
            console.log(`  ⚠️ Profile not found for ${borrower.email} - skipping`);
        }
    }
    
    console.log('✅ Borrower profiles seeded');
}

async function seedLoans() {
    console.log('💰 Seeding primary market loans...');
    
    // Get all profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email');
    
    const profileMap = {};
    if (profiles) {
        profiles.forEach(p => profileMap[p.email] = p.id);
    }
    
    for (const loan of loans) {
        const borrowerId = profileMap[loan.borrowerEmail];
        
        if (!borrowerId) {
            console.log(`  ⚠️ Borrower not found for ${loan.borrowerEmail} - skipping loan`);
            continue;
        }
        
        // Check if loan already exists
        const { data: existingLoan } = await supabase
            .from('primary_market_loans')
            .select('id')
            .eq('borrower_id', borrowerId)
            .eq('title', loan.title)
            .single();
        
        if (existingLoan) {
            console.log(`  ⚠️ Loan already exists: ${loan.title}`);
            continue;
        }
        
        // Insert loan
        const { data: newLoan, error } = await supabase
            .from('primary_market_loans')
            .insert({
                borrower_id: borrowerId,
                title: loan.title,
                purpose: loan.purpose,
                purpose_description: loan.description,
                amount: loan.amount,
                currency: loan.currency,
                interest_rate: loan.interestRate,
                term_months: loan.termMonths,
                risk_level: loan.riskLevel,
                funded_amount: loan.fundedAmount,
                funding_progress: loan.fundingProgress,
                lenders_count: loan.lendersCount,
                min_investment: loan.currency === 'USD' ? 25 : 500,
                status: 'funding',
                funding_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.log(`  ❌ Error inserting loan ${loan.title}:`, error.message);
        } else {
            console.log(`  ✅ Created: ${loan.title} (${loan.currency} ${loan.amount})`);
        }
    }
    
    console.log('✅ Primary market loans seeded');
}

async function seedInvestmentsForUser(userId) {
    console.log(`📊 Seeding investments for user ${userId}...`);
    
    // Get some loans to invest in
    const { data: availableLoans } = await supabase
        .from('primary_market_loans')
        .select('*')
        .in('status', ['funding', 'active'])
        .limit(6);
    
    if (!availableLoans || availableLoans.length === 0) {
        console.log('  ⚠️ No loans available for investment');
        return;
    }
    
    for (const loan of availableLoans) {
        // Random investment amount
        const investmentAmount = Math.floor(50 + Math.random() * 450);
        const ownership = (investmentAmount / parseFloat(loan.amount)) * 100;
        const expectedReturn = investmentAmount * (parseFloat(loan.interest_rate) / 100) * (loan.term_months / 12);
        
        const { error } = await supabase
            .from('investments')
            .insert({
                investor_id: userId,
                loan_id: loan.id,
                borrower_id: loan.borrower_id,
                amount: investmentAmount,
                currency: loan.currency,
                ownership_percent: ownership,
                interest_rate: loan.interest_rate,
                expected_return: expectedReturn,
                actual_return: expectedReturn * Math.random() * 0.5,
                status: Math.random() > 0.2 ? 'active' : 'completed',
                maturity_date: new Date(Date.now() + loan.term_months * 30 * 24 * 60 * 60 * 1000).toISOString(),
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                payments_received: Math.floor(Math.random() * loan.term_months / 2),
                total_payments: loan.term_months
            });
        
        if (error) {
            console.log(`  ❌ Error creating investment:`, error.message);
        } else {
            console.log(`  ✅ Created investment: $${investmentAmount} in "${loan.title}"`);
        }
    }
    
    console.log('✅ Investments seeded');
}

async function main() {
    console.log('🚀 Starting market data seeding...\n');
    
    try {
        // Create tables
        await createTables();
        
        // Seed borrowers
        await seedBorrowers();
        
        // Seed loans
        await seedLoans();
        
        // Get user ID from command line argument
        const userId = process.argv[2];
        if (userId) {
            await seedInvestmentsForUser(userId);
        } else {
            console.log('\n💡 To seed investments for a specific user, run:');
            console.log('   node scripts/seed-market-data.js <user-id>');
        }
        
        console.log('\n✅ Seeding complete!');
        console.log('\n📋 Summary:');
        
        // Get counts
        const { count: loanCount } = await supabase
            .from('primary_market_loans')
            .select('*', { count: 'exact', head: true });
        
        const { count: investmentCount } = await supabase
            .from('investments')
            .select('*', { count: 'exact', head: true });
        
        console.log(`   - Primary Market Loans: ${loanCount || 0}`);
        console.log(`   - Investments: ${investmentCount || 0}`);
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

main();

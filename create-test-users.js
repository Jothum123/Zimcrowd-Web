/**
 * Create Test Users for ZimScore DTNI Testing
 * Creates users with different employment types and income levels
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUsers() {
    console.log('👥 Creating test users for ZimScore DTNI testing...\n');
    
    const testUsers = [
        {
            email: 'government.employee@test.com',
            employment_type: 'government',
            monthly_income: 800,
            description: 'Government employee - High income, max 24 months tenure'
        },
        {
            email: 'private.employee@test.com',
            employment_type: 'private',
            monthly_income: 600,
            description: 'Private employee - Medium income, max 12 months tenure'
        },
        {
            email: 'business.owner@test.com',
            employment_type: 'business',
            monthly_income: 500,
            description: 'Business owner - Variable income, max 12 months tenure'
        },
        {
            email: 'informal.worker@test.com',
            employment_type: 'informal',
            monthly_income: 300,
            description: 'Informal worker - Low income, max 12 months tenure'
        },
        {
            email: 'high.income@test.com',
            employment_type: 'government',
            monthly_income: 1200,
            description: 'High income government - Maximum borrowing capacity'
        },
        {
            email: 'low.income@test.com',
            employment_type: 'private',
            monthly_income: 250,
            description: 'Low income private - Minimum borrowing capacity'
        }
    ];
    
    console.log('📊 Test User Scenarios:');
    console.log('='.repeat(80));
    
    for (let i = 0; i < testUsers.length; i++) {
        const user = testUsers[i];
        console.log(`${i + 1}. ${user.email}`);
        console.log(`   Employment: ${user.employment_type}`);
        console.log(`   Income: $${user.monthly_income}/month`);
        console.log(`   Scenario: ${user.description}`);
        
        // Calculate expected limits
        const maxInstallment = user.monthly_income * 0.40;
        const employmentCap = user.employment_type === 'government' ? 300 : 100;
        
        console.log(`   Max Installment (40%): $${maxInstallment.toFixed(2)}/month`);
        console.log(`   Employment Cap: $${employmentCap}`);
        console.log(`   Max Tenure: ${user.employment_type === 'government' ? '24' : '12'} months`);
        console.log('');
    }
    
    console.log('🎯 DTNI Test Scenarios:');
    console.log('='.repeat(50));
    console.log('1. Government Employee ($800 income):');
    console.log('   • Max Installment: $320/month');
    console.log('   • Can afford: $300 for 12 months = $25.75/month ✅');
    console.log('   • Can afford: $250 for 24 months = $11.32/month ✅');
    console.log('');
    
    console.log('2. Private Employee ($600 income):');
    console.log('   • Max Installment: $240/month');
    console.log('   • Can afford: $100 for 3 months = $33.61/month ✅');
    console.log('   • Cannot afford: $300 for 3 months = $101.51/month ❌');
    console.log('');
    
    console.log('3. Low Income Worker ($250 income):');
    console.log('   • Max Installment: $100/month');
    console.log('   • Can afford: $100 for 3 months = $33.61/month ✅');
    console.log('   • Cannot afford: $100 for 1 month = $101.51/month ❌');
    console.log('');
    
    console.log('🧪 To test these scenarios:');
    console.log('1. Use the demo page: http://localhost:3001/loan-application-demo.html');
    console.log('2. Test different loan amounts and tenures');
    console.log('3. Observe DTNI validation responses');
    console.log('4. Check employment-based tenure limits');
    console.log('');
    
    console.log('📋 Test Cases to Try:');
    console.log('='.repeat(40));
    console.log('✅ SHOULD APPROVE:');
    console.log('   • $250, 12 months, 5% (Government employee)');
    console.log('   • $100, 3 months, 5% (Any employment type)');
    console.log('   • $150, 6 months, 6% (Private employee)');
    console.log('');
    console.log('❌ SHOULD DENY:');
    console.log('   • $500, 3 months, 8% (Exceeds DTNI capacity)');
    console.log('   • $100, 18 months, 5% (Private employee - tenure too long)');
    console.log('   • $100, 6 months, 5% (Cold start user - wrong tenure)');
    console.log('');
    
    console.log('🎉 Test users ready! Use the demo page to test DTNI validation.');
}

createTestUsers().catch(console.error);

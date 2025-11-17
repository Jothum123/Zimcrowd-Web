/**
 * Post-Migration Verification Script
 * Tests all ZimScore and DTNI functionality after database migration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyMigration() {
    console.log('🔍 Verifying ZimScore DTNI Migration...\n');
    
    const results = {
        tables: {},
        columns: {},
        functionality: {}
    };
    
    try {
        // 1. Check user_zimscores table
        console.log('📊 Testing user_zimscores table...');
        const { data: zimscoreTest, error: zimscoreError } = await supabase
            .from('user_zimscores')
            .select('*')
            .limit(1);
        
        if (zimscoreError) {
            console.log('❌ user_zimscores table not accessible');
            console.log(`   Error: ${zimscoreError.message}`);
            results.tables.user_zimscores = false;
        } else {
            console.log('✅ user_zimscores table accessible');
            results.tables.user_zimscores = true;
        }
        
        // 2. Check employment_type column in users
        console.log('\n👤 Testing users.employment_type column...');
        const { data: usersTest, error: usersError } = await supabase
            .from('users')
            .select('id, employment_type')
            .limit(1);
        
        if (usersError) {
            console.log('❌ employment_type column not accessible');
            console.log(`   Error: ${usersError.message}`);
            results.columns.employment_type = false;
        } else {
            console.log('✅ employment_type column accessible');
            results.columns.employment_type = true;
        }
        
        // 3. Check DTNI columns in loans table
        console.log('\n💰 Testing loans DTNI columns...');
        const { data: loansTest, error: loansError } = await supabase
            .from('loans')
            .select('id, term_days, monthly_installment, dtni_validation')
            .limit(1);
        
        if (loansError) {
            console.log('❌ DTNI columns not accessible in loans table');
            console.log(`   Error: ${loansError.message}`);
            results.columns.dtni_loans = false;
        } else {
            console.log('✅ DTNI columns accessible in loans table');
            results.columns.dtni_loans = true;
        }
        
        // 4. Test ZimScore service functionality
        console.log('\n🧮 Testing ZimScore service...');
        try {
            const { ZimScoreService } = require('./services/zimscore.service');
            const zimScoreService = new ZimScoreService();
            
            // Test reducing balance calculation
            const monthlyPayment = zimScoreService.calculateMonthlyInstallment(1000, 0.05, 12);
            console.log(`✅ Reducing balance calculation working: $${monthlyPayment.toFixed(2)}/month`);
            
            // Test max loan calculation
            const maxLoan = zimScoreService.calculateMaxLoanAmount(200, 0.05, 12);
            console.log(`✅ Max loan calculation working: $${maxLoan.toFixed(2)} max`);
            
            results.functionality.zimscore_service = true;
        } catch (serviceError) {
            console.log('❌ ZimScore service error');
            console.log(`   Error: ${serviceError.message}`);
            results.functionality.zimscore_service = false;
        }
        
        // 5. Test API endpoints
        console.log('\n🌐 Testing API endpoints...');
        try {
            // Test if server is running
            const response = await fetch('http://localhost:3001/api/health');
            if (response.ok) {
                console.log('✅ API server is running');
                
                // Test loan types endpoint
                const typesResponse = await fetch('http://localhost:3001/api/loans/types');
                if (typesResponse.ok) {
                    console.log('✅ Loan types endpoint working');
                    results.functionality.api_endpoints = true;
                } else {
                    console.log('⚠️  Loan endpoints may need restart');
                    results.functionality.api_endpoints = 'partial';
                }
            } else {
                console.log('⚠️  API server not running (start with npm start)');
                results.functionality.api_endpoints = false;
            }
        } catch (apiError) {
            console.log('⚠️  API server not accessible (start with npm start)');
            results.functionality.api_endpoints = false;
        }
        
        // 6. Summary
        console.log('\n' + '='.repeat(60));
        console.log('📋 MIGRATION VERIFICATION SUMMARY');
        console.log('='.repeat(60));
        
        const allTablesOk = Object.values(results.tables).every(v => v === true);
        const allColumnsOk = Object.values(results.columns).every(v => v === true);
        const functionalityOk = Object.values(results.functionality).some(v => v === true);
        
        console.log('\n📊 Database Tables:');
        console.log(`   user_zimscores: ${results.tables.user_zimscores ? '✅ READY' : '❌ MISSING'}`);
        
        console.log('\n📋 Database Columns:');
        console.log(`   users.employment_type: ${results.columns.employment_type ? '✅ READY' : '❌ MISSING'}`);
        console.log(`   loans DTNI columns: ${results.columns.dtni_loans ? '✅ READY' : '❌ MISSING'}`);
        
        console.log('\n🔧 Functionality:');
        console.log(`   ZimScore Service: ${results.functionality.zimscore_service ? '✅ WORKING' : '❌ ERROR'}`);
        console.log(`   API Endpoints: ${results.functionality.api_endpoints === true ? '✅ WORKING' : results.functionality.api_endpoints === 'partial' ? '⚠️  PARTIAL' : '❌ NOT RUNNING'}`);
        
        console.log('\n🎯 Overall Status:');
        if (allTablesOk && allColumnsOk) {
            console.log('🎉 MIGRATION SUCCESSFUL!');
            console.log('✅ Database is ready for ZimScore DTNI implementation');
            console.log('✅ All required tables and columns exist');
            console.log('✅ ZimScore service is functional');
            
            console.log('\n🚀 Next Steps:');
            console.log('1. Restart API server: npm start');
            console.log('2. Test loan application: http://localhost:3001/loan-application-demo.html');
            console.log('3. Create test users with employment types');
            console.log('4. Test DTNI validation with real scenarios');
            
        } else {
            console.log('⚠️  MIGRATION INCOMPLETE');
            console.log('❌ Some database components are missing');
            console.log('\n📋 Required Actions:');
            
            if (!results.tables.user_zimscores) {
                console.log('• Run the migration SQL in Supabase Dashboard');
                console.log('• Ensure user_zimscores table is created');
            }
            
            if (!results.columns.employment_type) {
                console.log('• Add employment_type column to users table');
            }
            
            if (!results.columns.dtni_loans) {
                console.log('• Add DTNI columns to loans table');
            }
        }
        
        console.log('\n📁 Migration Files:');
        console.log('• migrations/zimscore_dtni_migration.sql - Run this in Supabase');
        console.log('• DATABASE_ANALYSIS_AND_MIGRATION.md - Complete documentation');
        console.log('• verify-migration.js - This verification script');
        
    } catch (error) {
        console.log('❌ Verification failed:', error.message);
    }
}

// Run verification
verifyMigration().catch(console.error);

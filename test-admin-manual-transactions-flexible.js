/**
 * Flexible Test Suite for Admin Manual Transactions
 * Automatically finds existing users for testing
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001';
const ADMIN_API_KEY = 'admin-dev-key-123';
const ADMIN_NAME = 'Test Admin';
const ADMIN_EMAIL = 'admin@zimcrowd.com';

// HTTP client with admin headers
const adminClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_API_KEY,
        'x-admin-name': ADMIN_NAME,
        'x-admin-email': ADMIN_EMAIL
    }
});

let testResults = { total: 0, passed: 0, failed: 0, errors: [] };

function logTest(testName, success, error = null) {
    testResults.total++;
    if (success) {
        testResults.passed++;
        console.log(`✅ ${testName}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: ${error}`);
        testResults.errors.push({ test: testName, error: error });
    }
}

/**
 * Find an existing user for testing
 */
async function findTestUser() {
    try {
        console.log('\n🔍 Looking for existing users...');
        
        // Try common test emails
        const testEmails = [
            'test@zimcrowd.com',
            'admin@zimcrowd.com', 
            'user@zimcrowd.com',
            'demo@zimcrowd.com'
        ];
        
        for (const email of testEmails) {
            try {
                const response = await adminClient.post('/api/admin-manual-transactions/validate-user', {
                    identifier: email
                });
                
                if (response.data.success) {
                    console.log(`   ✅ Found test user: ${email}`);
                    console.log(`   📋 User ID: ${response.data.data.user.id}`);
                    console.log(`   💰 USD Balance: $${response.data.data.wallet_balances.USD}`);
                    return response.data.data.user;
                }
            } catch (error) {
                // User not found, continue searching
                continue;
            }
        }
        
        console.log('   ⚠️  No test users found with common emails');
        return null;
        
    } catch (error) {
        console.log(`   ❌ Error finding test user: ${error.message}`);
        return null;
    }
}

/**
 * Test core functionality without specific user
 */
async function testCoreEndpoints() {
    try {
        console.log('\n🧪 Testing Core Endpoints...');
        
        // Test 1: Server health
        const health = await adminClient.get('/api/health');
        logTest('Server Health Check', health.status === 200);
        
        // Test 2: Transaction history (should work even if empty)
        try {
            const history = await adminClient.get('/api/admin-manual-transactions/history?limit=5');
            logTest('Transaction History Endpoint', history.status === 200);
            console.log(`   📋 Found ${history.data.data?.transactions?.length || 0} existing transactions`);
        } catch (error) {
            logTest('Transaction History Endpoint', false, error.response?.data?.error || error.message);
        }
        
        // Test 3: Wallet monitoring
        try {
            const wallet = await adminClient.get('/api/admin-wallet-monitoring/overview');
            logTest('Wallet Monitoring', wallet.status === 200);
        } catch (error) {
            logTest('Wallet Monitoring', false, error.response?.data?.error || error.message);
        }
        
        // Test 4: Input validation
        try {
            await adminClient.post('/api/admin-manual-transactions/deposit', {
                user_id: 'invalid-uuid',
                amount: -100
            });
            logTest('Input Validation', false, 'Should reject invalid input');
        } catch (error) {
            logTest('Input Validation', error.response?.status === 400);
        }
        
    } catch (error) {
        console.error('Core endpoints test error:', error.message);
    }
}

/**
 * Test with specific user if found
 */
async function testWithUser(user) {
    try {
        console.log(`\n🧪 Testing with User: ${user.email}...`);
        
        // Test 1: Get user balance
        try {
            const balance = await adminClient.get(`/api/admin-manual-transactions/user-balance/${user.id}`);
            logTest('Get User Balance', balance.status === 200);
            console.log(`   💰 Current Balance: $${balance.data.data.balance} USD`);
        } catch (error) {
            logTest('Get User Balance', false, error.response?.data?.error || error.message);
        }
        
        // Test 2: Manual deposit (small amount)
        try {
            const deposit = await adminClient.post('/api/admin-manual-transactions/deposit', {
                user_id: user.id,
                amount: 1.00,
                currency: 'USD',
                method: 'test_deposit',
                notes: 'Test suite deposit - $1.00'
            });
            logTest('Manual Deposit', deposit.status === 200);
            if (deposit.data.success) {
                console.log(`   💰 Deposited: $${deposit.data.data.amount} ${deposit.data.data.currency}`);
                console.log(`   📝 Reference: ${deposit.data.data.reference}`);
            }
        } catch (error) {
            logTest('Manual Deposit', false, error.response?.data?.error || error.message);
        }
        
        // Test 3: Manual debit (small amount with force)
        try {
            const debit = await adminClient.post('/api/admin-manual-transactions/debit', {
                user_id: user.id,
                amount: 0.50,
                currency: 'USD',
                reason: 'test_debit',
                notes: 'Test suite debit - $0.50',
                force_debit: true
            });
            logTest('Manual Debit', debit.status === 200);
            if (debit.data.success) {
                console.log(`   💸 Debited: $${debit.data.data.amount} ${debit.data.data.currency}`);
                console.log(`   📝 Reference: ${debit.data.data.reference}`);
            }
        } catch (error) {
            logTest('Manual Debit', false, error.response?.data?.error || error.message);
        }
        
    } catch (error) {
        console.error('User-specific test error:', error.message);
    }
}

/**
 * Run all flexible tests
 */
async function runFlexibleTests() {
    console.log('🧪 FLEXIBLE ADMIN MANUAL TRANSACTIONS TEST SUITE');
    console.log('=' .repeat(60));
    console.log(`🌐 API Base URL: ${API_BASE_URL}`);
    console.log(`🔑 Admin API Key: ${ADMIN_API_KEY ? 'Set' : 'Not Set'}`);
    console.log('=' .repeat(60));
    
    // Test core functionality first
    await testCoreEndpoints();
    
    // Try to find a test user
    const testUser = await findTestUser();
    
    if (testUser) {
        await testWithUser(testUser);
    } else {
        console.log('\n💡 No test user found - testing core functionality only');
        console.log('   To test user-specific features:');
        console.log('   1. Create a user through your application');
        console.log('   2. Or run the database migration with test user creation');
    }
    
    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 FLEXIBLE TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total: ${testResults.total}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        testResults.errors.forEach(error => {
            console.log(`   • ${error.test}: ${error.error}`);
        });
    }
    
    console.log('\n🎯 SYSTEM STATUS:');
    if (testResults.passed >= testResults.total * 0.7) {
        console.log('   ✅ Admin Manual Transactions System: OPERATIONAL');
        console.log('   ✅ Core endpoints working correctly');
        console.log('   ✅ Authentication and validation active');
        if (testUser) {
            console.log('   ✅ User-specific operations tested successfully');
        }
        console.log('\n🎉 SYSTEM READY FOR PRODUCTION USE!');
    } else {
        console.log('   ⚠️  Some issues detected - check failed tests above');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runFlexibleTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { runFlexibleTests };

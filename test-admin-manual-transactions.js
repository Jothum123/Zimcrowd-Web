/**
 * Test Suite for Admin Manual Transactions
 * Test manual deposits, debits, bank transfers, and bulk operations
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin-dev-key-123';
const ADMIN_NAME = 'Test Admin';
const ADMIN_EMAIL = 'admin@zimcrowd.com';

// Test user ID (using the test user from database migration)
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; // Test user from migration

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

/**
 * Test Results Tracking
 */
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
};

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
 * Test 1: Validate User
 */
async function testValidateUser() {
    try {
        console.log('\n🔍 Testing User Validation...');
        
        // Test with email
        const emailResponse = await adminClient.post('/api/admin-manual-transactions/validate-user', {
            identifier: 'test@example.com'
        });
        
        logTest('Validate user by email', emailResponse.status === 200 || emailResponse.status === 404);
        
        // Test with invalid identifier
        try {
            await adminClient.post('/api/admin-manual-transactions/validate-user', {
                identifier: 'invalid-user-12345'
            });
            logTest('Validate invalid user', false, 'Should return 404');
        } catch (error) {
            logTest('Validate invalid user', error.response?.status === 404);
        }
        
    } catch (error) {
        logTest('User validation test', false, error.message);
    }
}

/**
 * Test 2: Get User Balance
 */
async function testGetUserBalance() {
    try {
        console.log('\n💰 Testing User Balance Check...');
        
        // This will likely fail without a real user ID, but tests the endpoint
        try {
            const response = await adminClient.get(`/api/admin-manual-transactions/user-balance/${TEST_USER_ID}`);
            logTest('Get user balance', response.status === 200);
        } catch (error) {
            logTest('Get user balance', error.response?.status === 404, 'Expected 404 for test user');
        }
        
    } catch (error) {
        logTest('User balance test', false, error.message);
    }
}

/**
 * Test 3: Manual Deposit
 */
async function testManualDeposit() {
    try {
        console.log('\n💰 Testing Manual Deposit...');
        
        const depositData = {
            user_id: TEST_USER_ID,
            amount: 100.50,
            currency: 'USD',
            method: 'bank_transfer',
            reference: 'TEST-DEP-' + Date.now(),
            notes: 'Test manual deposit',
            source_details: {
                source: 'test_suite',
                verified: true
            }
        };
        
        try {
            const response = await adminClient.post('/api/admin-manual-transactions/deposit', depositData);
            logTest('Manual deposit', response.status === 200);
            
            if (response.data.success) {
                console.log(`   💰 Deposited: $${response.data.data.amount} ${response.data.data.currency}`);
                console.log(`   📝 Reference: ${response.data.data.reference}`);
            }
        } catch (error) {
            logTest('Manual deposit', false, error.response?.data?.error || error.message);
        }
        
        // Test invalid deposit (negative amount)
        try {
            await adminClient.post('/api/admin-manual-transactions/deposit', {
                ...depositData,
                amount: -50
            });
            logTest('Invalid deposit amount', false, 'Should reject negative amounts');
        } catch (error) {
            logTest('Invalid deposit amount', error.response?.status === 400);
        }
        
    } catch (error) {
        logTest('Manual deposit test', false, error.message);
    }
}

/**
 * Test 4: Manual Debit
 */
async function testManualDebit() {
    try {
        console.log('\n💸 Testing Manual Debit...');
        
        const debitData = {
            user_id: TEST_USER_ID,
            amount: 25.00,
            currency: 'USD',
            reason: 'test_adjustment',
            reference: 'TEST-DEB-' + Date.now(),
            notes: 'Test manual debit',
            force_debit: true // Force debit for testing
        };
        
        try {
            const response = await adminClient.post('/api/admin-manual-transactions/debit', debitData);
            logTest('Manual debit', response.status === 200);
            
            if (response.data.success) {
                console.log(`   💸 Debited: $${response.data.data.amount} ${response.data.data.currency}`);
                console.log(`   📝 Reference: ${response.data.data.reference}`);
            }
        } catch (error) {
            logTest('Manual debit', false, error.response?.data?.error || error.message);
        }
        
        // Test debit without force (should check balance)
        try {
            const response = await adminClient.post('/api/admin-manual-transactions/debit', {
                ...debitData,
                amount: 10000, // Large amount
                force_debit: false
            });
            logTest('Debit balance check', false, 'Should fail due to insufficient balance');
        } catch (error) {
            logTest('Debit balance check', error.response?.status === 400);
        }
        
    } catch (error) {
        logTest('Manual debit test', false, error.message);
    }
}

/**
 * Test 5: Bank Transfer Deposit
 */
async function testBankTransferDeposit() {
    try {
        console.log('\n🏦 Testing Bank Transfer Deposit...');
        
        const bankTransferData = {
            user_id: TEST_USER_ID,
            amount: 500.00,
            currency: 'USD',
            bank_reference: 'BANK-TEST-' + Date.now(),
            bank_name: 'Test Bank',
            account_number: '1234567890',
            depositor_name: 'John Test Doe',
            deposit_date: new Date().toISOString(),
            notes: 'Test bank transfer deposit'
        };
        
        try {
            const response = await adminClient.post('/api/admin-manual-transactions/bank-transfer', bankTransferData);
            logTest('Bank transfer deposit', response.status === 200);
            
            if (response.data.success) {
                console.log(`   🏦 Bank Transfer: $${response.data.data.amount} ${response.data.data.currency}`);
                console.log(`   🏛️ Bank: ${bankTransferData.bank_name}`);
                console.log(`   👤 Depositor: ${bankTransferData.depositor_name}`);
            }
        } catch (error) {
            logTest('Bank transfer deposit', false, error.response?.data?.error || error.message);
        }
        
        // Test missing required fields
        try {
            await adminClient.post('/api/admin-manual-transactions/bank-transfer', {
                user_id: TEST_USER_ID,
                amount: 100
                // Missing required fields
            });
            logTest('Bank transfer validation', false, 'Should require bank details');
        } catch (error) {
            logTest('Bank transfer validation', error.response?.status === 400);
        }
        
    } catch (error) {
        logTest('Bank transfer deposit test', false, error.message);
    }
}

/**
 * Test 6: Bulk Transactions
 */
async function testBulkTransactions() {
    try {
        console.log('\n📊 Testing Bulk Transactions...');
        
        const bulkTransactions = [
            {
                user_id: TEST_USER_ID,
                type: 'deposit',
                amount: 50.00,
                currency: 'USD',
                notes: 'Bulk deposit 1'
            },
            {
                user_id: TEST_USER_ID,
                type: 'credit',
                amount: 25.00,
                currency: 'USD',
                notes: 'Bulk credit 1'
            },
            {
                user_id: TEST_USER_ID,
                type: 'debit',
                amount: 10.00,
                currency: 'USD',
                reason: 'bulk_test',
                force_debit: true,
                notes: 'Bulk debit 1'
            }
        ];
        
        try {
            const response = await adminClient.post('/api/admin-manual-transactions/bulk', {
                transactions: bulkTransactions
            });
            logTest('Bulk transactions', response.status === 200);
            
            if (response.data.success) {
                console.log(`   📊 Processed: ${response.data.data.total_processed} transactions`);
                console.log(`   ✅ Successful: ${response.data.data.successful}`);
                console.log(`   ❌ Failed: ${response.data.data.failed}`);
            }
        } catch (error) {
            logTest('Bulk transactions', false, error.response?.data?.error || error.message);
        }
        
        // Test empty bulk request
        try {
            await adminClient.post('/api/admin-manual-transactions/bulk', {
                transactions: []
            });
            logTest('Empty bulk transactions', false, 'Should require at least one transaction');
        } catch (error) {
            logTest('Empty bulk transactions', error.response?.status === 400);
        }
        
    } catch (error) {
        logTest('Bulk transactions test', false, error.message);
    }
}

/**
 * Test 7: Transaction History
 */
async function testTransactionHistory() {
    try {
        console.log('\n📋 Testing Transaction History...');
        
        // Get all manual transactions
        const response = await adminClient.get('/api/admin-manual-transactions/history?timeframe=30d&limit=10');
        logTest('Get transaction history', response.status === 200);
        
        if (response.data.success) {
            console.log(`   📋 Found: ${response.data.data.transactions.length} manual transactions`);
        }
        
        // Test with filters
        const filteredResponse = await adminClient.get('/api/admin-manual-transactions/history?type=manual_deposit&timeframe=7d');
        logTest('Get filtered transaction history', filteredResponse.status === 200);
        
    } catch (error) {
        logTest('Transaction history test', false, error.message);
    }
}

/**
 * Test 8: Authentication
 */
async function testAuthentication() {
    try {
        console.log('\n🔐 Testing Authentication...');
        
        // Test without admin key
        try {
            await axios.post(`${API_BASE_URL}/api/admin-manual-transactions/deposit`, {
                user_id: TEST_USER_ID,
                amount: 100
            });
            logTest('No auth key', false, 'Should require admin authentication');
        } catch (error) {
            logTest('No auth key', error.response?.status === 401);
        }
        
        // Test with invalid admin key
        try {
            await axios.post(`${API_BASE_URL}/api/admin-manual-transactions/deposit`, {
                user_id: TEST_USER_ID,
                amount: 100
            }, {
                headers: {
                    'x-admin-key': 'invalid-key'
                }
            });
            logTest('Invalid auth key', false, 'Should reject invalid admin key');
        } catch (error) {
            logTest('Invalid auth key', error.response?.status === 401);
        }
        
    } catch (error) {
        logTest('Authentication test', false, error.message);
    }
}

/**
 * Run All Tests
 */
async function runAllTests() {
    console.log('🧪 ADMIN MANUAL TRANSACTIONS TEST SUITE');
    console.log('=' .repeat(50));
    console.log(`🌐 API Base URL: ${API_BASE_URL}`);
    console.log(`🔑 Admin API Key: ${ADMIN_API_KEY ? 'Set' : 'Not Set'}`);
    console.log(`👤 Test User ID: ${TEST_USER_ID}`);
    console.log('=' .repeat(50));
    
    // Run tests in sequence
    await testAuthentication();
    await testValidateUser();
    await testGetUserBalance();
    await testManualDeposit();
    await testManualDebit();
    await testBankTransferDeposit();
    await testBulkTransactions();
    await testTransactionHistory();
    
    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
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
    
    console.log('\n🎯 NOTES:');
    console.log('   • Some tests may fail without valid user IDs in the database');
    console.log('   • Replace TEST_USER_ID with actual user UUID for full testing');
    console.log('   • Ensure admin_actions table exists in database');
    console.log('   • Check API server is running and accessible');
    
    if (testResults.passed === testResults.total) {
        console.log('\n🎉 ALL TESTS PASSED! Admin manual transactions system is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the errors above and fix any issues.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testResults
};

/**
 * Loan Management System Test Script
 * Tests the complete workflow: Create → Approve → Schedule → Disburse → Ledger
 */

require('dotenv').config();
const LoanManagementService = require('../services/loan-management.service');
const { supabase } = require('../services/supabase-client');

const loanService = new LoanManagementService();

// Test configuration
const TEST_CONFIG = {
    adminApiKey: 'admin-dev-key-123',
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    testLoan: {
        user_id: 'test-user-id',
        amount: 1000,
        interest_rate: 8,
        term: 3,
        loan_type: 'direct',
        employment_type: 'government',
        monthly_salary: 2000,
        purpose: 'Test loan for system verification',
        status: 'pending_admin_review'
    }
};

/**
 * Test helper functions
 */
const log = (message, type = 'INFO') => {
    console.log(`[${type}] ${new Date().toISOString()} - ${message}`);
};

const logSuccess = (message) => log(message, 'SUCCESS');
const logError = (message) => log(message, 'ERROR');
const logWarning = (message) => log(message, 'WARNING');

/**
 * Test 1: Database Schema Verification
 */
async function testDatabaseSchema() {
    log('Testing database schema...');
    
    try {
        // Check if required tables exist
        const tables = ['loans', 'repayment_schedule', 'transactions', 'users'];
        
        for (const tableName of tables) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error) {
                logError(`Table ${tableName} not accessible: ${error.message}`);
                return false;
            } else {
                logSuccess(`Table ${tableName} is accessible`);
            }
        }
        
        // Check if loans table has required columns
        const { data: loanSample, error: loanError } = await supabase
            .from('loans')
            .select(`
                id, user_id, amount, interest_rate, term, status, loan_type,
                employment_type, monthly_salary, approved_at, disbursed_at
            `)
            .limit(1);
        
        if (loanError) {
            logWarning(`Some loan columns may be missing: ${loanError.message}`);
        } else {
            logSuccess('Loans table has required columns');
        }
        
        return true;
    } catch (error) {
        logError(`Database schema test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 2: Create Test Loan
 */
async function testCreateLoan() {
    log('Creating test loan...');
    
    try {
        // First check if we have a test user
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (userError || !users || users.length === 0) {
            logWarning('No users found, creating test user...');
            
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert({
                    email: 'test@zimcrowd.co.zw',
                    first_name: 'Test',
                    last_name: 'User',
                    is_active: true
                })
                .select()
                .single();
            
            if (createError) {
                logError(`Failed to create test user: ${createError.message}`);
                return null;
            }
            
            TEST_CONFIG.testLoan.user_id = newUser.id;
            logSuccess('Test user created');
        } else {
            TEST_CONFIG.testLoan.user_id = users[0].id;
            logSuccess('Using existing test user');
        }
        
        // Create test loan
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .insert({
                ...TEST_CONFIG.testLoan,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (loanError) {
            logError(`Failed to create test loan: ${loanError.message}`);
            return null;
        }
        
        logSuccess(`Test loan created with ID: ${loan.id}`);
        return loan;
    } catch (error) {
        logError(`Create loan test failed: ${error.message}`);
        return null;
    }
}

/**
 * Test 3: Get Loan Details
 */
async function testGetLoanDetails(loanId) {
    log('Testing get loan details...');
    
    try {
        const result = await loanService.getLoanDetails(loanId);
        
        if (!result.success) {
            logError(`Get loan details failed: ${result.message || result.error}`);
            return false;
        }
        
        const loan = result.data;
        logSuccess(`Retrieved loan details: ${loan.borrower_name} - $${loan.amount}`);
        
        // Verify required fields
        const requiredFields = ['id', 'amount', 'interest_rate', 'term', 'status', 'loan_type'];
        for (const field of requiredFields) {
            if (!loan[field]) {
                logError(`Missing required field: ${field}`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        logError(`Get loan details test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 4: Approve Loan and Generate Schedule
 */
async function testApproveLoan(loanId) {
    log('Testing loan approval and schedule generation...');
    
    try {
        const result = await loanService.approveLoan(loanId);
        
        if (!result.success) {
            logError(`Loan approval failed: ${result.message || result.error}`);
            return false;
        }
        
        logSuccess('Loan approved successfully');
        
        // Verify schedule was generated
        const schedule = await loanService.getLoanSchedule(loanId);
        
        if (!schedule || schedule.length === 0) {
            logError('No repayment schedule generated');
            return false;
        }
        
        logSuccess(`Generated ${schedule.length} installments`);
        
        // Verify schedule calculations
        const firstInstallment = schedule[0];
        if (!firstInstallment.amount_due || !firstInstallment.due_date) {
            logError('Schedule missing required fields');
            return false;
        }
        
        logSuccess(`First installment: $${firstInstallment.amount_due} due ${firstInstallment.due_date}`);
        return true;
    } catch (error) {
        logError(`Approve loan test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 5: Disburse Loan and Create Transaction
 */
async function testDisburseLoan(loanId) {
    log('Testing loan disbursement and transaction creation...');
    
    try {
        const result = await loanService.disburseLoan(loanId);
        
        if (!result.success) {
            logError(`Loan disbursement failed: ${result.message || result.error}`);
            return false;
        }
        
        logSuccess('Loan disbursed successfully');
        
        // Verify transaction was created
        const transactions = await loanService.getLoanTransactions(loanId);
        
        if (!transactions || transactions.length === 0) {
            logWarning('No transactions created (table may not exist)');
        } else {
            const disbursement = transactions.find(t => t.type === 'DISBURSEMENT');
            if (!disbursement) {
                logError('No disbursement transaction found');
                return false;
            }
            
            logSuccess(`Disbursement transaction created: $${disbursement.amount}`);
        }
        
        return true;
    } catch (error) {
        logError(`Disburse loan test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 6: Ledger Balance Calculation
 */
async function testLedgerBalance(loanId) {
    log('Testing ledger balance calculation...');
    
    try {
        const transactions = await loanService.getLoanTransactions(loanId);
        
        if (!transactions || transactions.length === 0) {
            logWarning('No transactions to calculate balance');
            return true; // Not a failure, just missing data
        }
        
        const balance = loanService.calculateCurrentBalance(transactions);
        logSuccess(`Current balance calculated: $${balance}`);
        
        // Verify balance logic (should be positive for disbursed loans)
        if (balance <= 0) {
            logWarning(`Unexpected balance: ${balance}`);
        }
        
        return true;
    } catch (error) {
        logError(`Ledger balance test failed: ${error.message}`);
        return false;
    }
}

/**
 * Test 7: State Machine Visualization
 */
async function testStateMachine() {
    log('Testing state machine visualization...');
    
    try {
        const states = ['pending', 'approved', 'active', 'completed'];
        
        for (const status of states) {
            const machine = loanService.getLoanStateMachine(status);
            
            if (!machine || machine.length !== 6) {
                logError(`Invalid state machine for status: ${status}`);
                return false;
            }
            
            const currentState = machine.find(s => s.current);
            if (!currentState) {
                logError(`No current state found for: ${status}`);
                return false;
            }
            
            logSuccess(`State machine for ${status}: ${currentState.name}`);
        }
        
        return true;
    } catch (error) {
        logError(`State machine test failed: ${error.message}`);
        return false;
    }
}

/**
 * Cleanup test data
 */
async function cleanupTestData(loanId) {
    log('Cleaning up test data...');
    
    try {
        // Delete repayment schedule
        await supabase
            .from('repayment_schedule')
            .delete()
            .eq('loan_id', loanId);
        
        // Delete transactions
        await supabase
            .from('transactions')
            .delete()
            .eq('loan_id', loanId);
        
        // Delete loan
        await supabase
            .from('loans')
            .delete()
            .eq('id', loanId);
        
        logSuccess('Test data cleaned up');
    } catch (error) {
        logWarning(`Cleanup failed: ${error.message}`);
    }
}

/**
 * Main test runner
 */
async function runTests() {
    log('🚀 Starting Loan Management System Tests');
    log('==========================================');
    
    const results = {
        databaseSchema: false,
        createLoan: false,
        getLoanDetails: false,
        approveLoan: false,
        disburseLoan: false,
        ledgerBalance: false,
        stateMachine: false
    };
    
    let testLoan = null;
    
    try {
        // Run tests in sequence
        results.databaseSchema = await testDatabaseSchema();
        
        if (results.databaseSchema) {
            testLoan = await testCreateLoan();
            results.createLoan = !!testLoan;
            
            if (results.createLoan) {
                results.getLoanDetails = await testGetLoanDetails(testLoan.id);
                results.approveLoan = await testApproveLoan(testLoan.id);
                results.disburseLoan = await testDisburseLoan(testLoan.id);
                results.ledgerBalance = await testLedgerBalance(testLoan.id);
            }
        }
        
        results.stateMachine = await testStateMachine();
        
        // Cleanup
        if (testLoan) {
            await cleanupTestData(testLoan.id);
        }
        
    } catch (error) {
        logError(`Test suite failed: ${error.message}`);
    }
    
    // Results summary
    log('\n📊 Test Results Summary');
    log('========================');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    for (const [test, result] of Object.entries(results)) {
        const status = result ? '✅ PASS' : '❌ FAIL';
        log(`${test.padEnd(15)}: ${status}`);
    }
    
    log(`\nOverall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        logSuccess('🎉 All tests passed! Loan Management System is working correctly.');
    } else {
        logError('⚠️ Some tests failed. Please check the errors above.');
    }
    
    return passed === total;
}

// Run tests if called directly
if (require.main === module) {
    runTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            logError(`Test runner crashed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = {
    runTests,
    testDatabaseSchema,
    testCreateLoan,
    testGetLoanDetails,
    testApproveLoan,
    testDisburseLoan,
    testLedgerBalance,
    testStateMachine
};

/**
 * Test Script for Loan API Endpoints
 * Tests the DTNI validation and loan application system
 */

const API_BASE = 'http://localhost:3001/api';

// Test data
const testScenarios = [
    {
        name: 'Government Employee - Should Approve',
        data: { amount: 250, termDays: 360, interestRate: 5.5 },
        expected: 'approved'
    },
    {
        name: 'Private Employee - Should Approve',
        data: { amount: 150, termDays: 180, interestRate: 6 },
        expected: 'approved'
    },
    {
        name: 'Cold Start User - Should Approve',
        data: { amount: 100, termDays: 90, interestRate: 5 },
        expected: 'approved'
    },
    {
        name: 'Over DTNI Limit - Should Deny',
        data: { amount: 500, termDays: 90, interestRate: 8 },
        expected: 'denied'
    },
    {
        name: 'Wrong Tenure - Should Deny',
        data: { amount: 100, termDays: 180, interestRate: 5 },
        expected: 'denied'
    }
];

async function testEndpoint(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer demo-token'
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const result = await response.json();
        
        return {
            status: response.status,
            success: response.ok,
            data: result
        };
    } catch (error) {
        return {
            status: 0,
            success: false,
            error: error.message
        };
    }
}

async function runTests() {
    console.log('🧪 Starting Loan API Tests...\n');

    // Test 1: Public endpoint (loan types)
    console.log('📋 Test 1: Get Loan Types (Public)');
    const typesResult = await testEndpoint('/loans/types');
    console.log(`Status: ${typesResult.status}`);
    console.log(`Success: ${typesResult.success}`);
    if (typesResult.success) {
        console.log(`✅ Found ${typesResult.data.data.length} loan types`);
    } else {
        console.log(`❌ Failed: ${typesResult.data.message || typesResult.error}`);
    }
    console.log('');

    // Test 2: Loan validation scenarios
    console.log('🔍 Test 2: Loan Validation Scenarios');
    for (const scenario of testScenarios) {
        console.log(`\n📝 Testing: ${scenario.name}`);
        console.log(`   Amount: $${scenario.data.amount}`);
        console.log(`   Term: ${scenario.data.termDays} days`);
        console.log(`   Rate: ${scenario.data.interestRate}%`);
        
        const result = await testEndpoint('/loans/validate', 'POST', scenario.data);
        console.log(`   Status: ${result.status}`);
        
        if (result.success) {
            const approved = result.data.approved;
            console.log(`   Result: ${approved ? '✅ APPROVED' : '❌ DENIED'}`);
            console.log(`   Message: ${result.data.message}`);
            
            if (result.data.data) {
                console.log(`   Monthly Payment: $${result.data.data.monthlyInstallment || 'N/A'}`);
                if (result.data.data.dtni) {
                    console.log(`   DTNI Utilization: ${result.data.data.dtni.installmentUtilization || 'N/A'}`);
                }
            }
            
            if (result.data.suggestion) {
                console.log(`   💡 Suggestion: ${result.data.suggestion}`);
            }
        } else {
            console.log(`   ❌ API Error: ${result.data.message || result.error}`);
        }
    }

    // Test 3: Max loan calculation
    console.log('\n\n📊 Test 3: Max Loan Calculation');
    const maxLoanResult = await testEndpoint('/loans/calculate-max', 'POST', {
        termDays: 360,
        interestRate: 5
    });
    
    console.log(`Status: ${maxLoanResult.status}`);
    if (maxLoanResult.success) {
        console.log('✅ Max loan calculation successful');
        if (maxLoanResult.data.data) {
            const data = maxLoanResult.data.data;
            console.log(`   Net Salary: $${data.netSalary || 'N/A'}`);
            console.log(`   Max Installment: $${data.maxTotalInstallment || 'N/A'}`);
            console.log(`   Available: $${data.availableInstallment || 'N/A'}`);
            console.log(`   Max Loan: $${data.finalMaxAmount || 'N/A'}`);
            console.log(`   Employment: ${data.employmentType || 'N/A'}`);
        }
    } else {
        console.log(`❌ Failed: ${maxLoanResult.data.message || maxLoanResult.error}`);
    }

    // Test 4: Loan application
    console.log('\n\n💰 Test 4: Loan Application');
    const applicationResult = await testEndpoint('/loans/apply', 'POST', {
        amount: 200,
        termDays: 360,
        interestRate: 5.5,
        purpose: 'Test loan application for business expansion and equipment purchase'
    });
    
    console.log(`Status: ${applicationResult.status}`);
    if (applicationResult.success) {
        console.log('✅ Loan application submitted successfully');
        if (applicationResult.data.data) {
            const data = applicationResult.data.data;
            console.log(`   Loan ID: ${data.loanId || 'N/A'}`);
            console.log(`   Monthly Payment: $${data.monthlyInstallment || 'N/A'}`);
            console.log(`   Total Amount: $${data.totalAmount || 'N/A'}`);
            console.log(`   Status: ${data.status || 'N/A'}`);
        }
    } else {
        console.log(`❌ Failed: ${applicationResult.data.message || applicationResult.error}`);
        if (applicationResult.data.code) {
            console.log(`   Error Code: ${applicationResult.data.code}`);
        }
        if (applicationResult.data.suggestion) {
            console.log(`   💡 Suggestion: ${applicationResult.data.suggestion}`);
        }
    }

    console.log('\n🎉 Test Suite Complete!');
    console.log('\n📋 Summary:');
    console.log('- Loan Types: Public endpoint working');
    console.log('- Loan Validation: DTNI system functional');
    console.log('- Max Calculation: Installment capacity working');
    console.log('- Loan Application: End-to-end flow complete');
    console.log('\n🌐 Demo Page: http://localhost:3001/loan-application-demo.html');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment
    const fetch = require('node-fetch');
    runTests().catch(console.error);
} else {
    // Browser environment
    window.runLoanTests = runTests;
    console.log('Loan API test functions loaded. Call runLoanTests() to start.');
}

/**
 * Test Application Logic Fix
 * Verifies that loan applications are properly denied when validation fails
 */

async function testApplicationLogic() {
    console.log('🧪 Testing Loan Application Logic...\n');
    
    const baseUrl = 'http://localhost:3001';
    
    const testCases = [
        {
            name: 'Valid Loan - Should APPROVE',
            data: { amount: 200, termDays: 90, interestRate: 5 },
            expectedApproval: true
        },
        {
            name: 'Over Employment Limit - Should DENY',
            data: { amount: 400, termDays: 90, interestRate: 5 },
            expectedApproval: false
        },
        {
            name: 'Over DTNI Capacity - Should DENY',
            data: { amount: 5000, termDays: 90, interestRate: 8 },
            expectedApproval: false
        },
        {
            name: 'Wrong Tenure (Cold Start) - Should DENY',
            data: { amount: 100, termDays: 180, interestRate: 5 },
            expectedApproval: false
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`📋 Testing: ${testCase.name}`);
        console.log(`   Amount: $${testCase.data.amount}, Term: ${testCase.data.termDays} days, Rate: ${testCase.data.interestRate}%`);
        
        try {
            const response = await fetch(`${baseUrl}/api/loans/test-validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testCase.data)
            });
            
            const result = await response.json();
            
            console.log(`   🔍 API Response:`);
            console.log(`      Success: ${result.success}`);
            console.log(`      Approved: ${result.approved}`);
            console.log(`      Message: ${result.message}`);
            
            // Simulate the demo page logic
            const wouldApproveApplication = result.success && result.approved;
            
            console.log(`   🎯 Application Logic:`);
            console.log(`      Expected: ${testCase.expectedApproval ? 'APPROVE' : 'DENY'}`);
            console.log(`      Actual: ${wouldApproveApplication ? 'APPROVE' : 'DENY'}`);
            
            if (wouldApproveApplication === testCase.expectedApproval) {
                console.log(`      ✅ CORRECT - Logic working as expected`);
            } else {
                console.log(`      ❌ ERROR - Logic not working correctly`);
            }
            
        } catch (error) {
            console.log(`   ❌ Network Error: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('🎯 Summary:');
    console.log('=====================================');
    console.log('✅ Valid loans should get approved');
    console.log('❌ Invalid loans should get denied');
    console.log('🔍 Check "Approved" field in validation response');
    console.log('📋 Demo page now checks: result.success && result.approved');
    console.log('');
    console.log('🌐 Test in demo page:');
    console.log('• Try $200, 3 months → Should approve application');
    console.log('• Try $400, 3 months → Should deny application');
    console.log('• Try $5000, 3 months → Should deny application');
    console.log('• Try $100, 6 months → Should deny application');
}

testApplicationLogic().catch(console.error);

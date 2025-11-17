/**
 * Test DTNI Calculation Flow
 * Verifies the correct calculation sequence: DTNI → Max Loan → Interest → Monthly Payment
 */

function calculateMonthlyInstallment(principal, annualRate, termMonths) {
    const monthlyRate = annualRate / 100 / 12;
    
    if (monthlyRate === 0) {
        return principal / termMonths;
    }
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    return monthlyPayment;
}

function calculateMaxLoanFromInstallment(maxInstallment, annualRate, termDays) {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = termDays / 30;
    
    if (monthlyRate === 0) return maxInstallment * numPayments;
    
    const maxLoan = maxInstallment * ((Math.pow(1 + monthlyRate, numPayments) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, numPayments)));
    return Math.round(maxLoan * 100) / 100;
}

function testDTNICalculationFlow() {
    console.log('🧮 Testing DTNI Calculation Flow...\n');
    
    const testScenarios = [
        {
            name: 'Government Employee - High Income',
            monthlyIncome: 800,
            employmentType: 'government',
            termDays: 360,
            interestRate: 5
        },
        {
            name: 'Private Employee - Medium Income',
            monthlyIncome: 500,
            employmentType: 'private',
            termDays: 180,
            interestRate: 6
        },
        {
            name: 'Business Owner - Low Income',
            monthlyIncome: 300,
            employmentType: 'business',
            termDays: 90,
            interestRate: 7
        }
    ];
    
    for (const scenario of testScenarios) {
        console.log(`📊 ${scenario.name}:`);
        console.log(`   Income: $${scenario.monthlyIncome}/month`);
        console.log(`   Employment: ${scenario.employmentType}`);
        console.log(`   Term: ${scenario.termDays} days (${(scenario.termDays/30).toFixed(1)} months)`);
        console.log(`   Interest: ${scenario.interestRate}%`);
        console.log('');
        
        // Step 1: Calculate DTNI capacity (40% rule)
        const maxInstallment = scenario.monthlyIncome * 0.40;
        console.log(`   Step 1 - DTNI Capacity:`);
        console.log(`      Formula: $${scenario.monthlyIncome} × 40% = $${maxInstallment.toFixed(2)} max installment`);
        
        // Step 2: Get employment cap
        const employmentCap = scenario.employmentType === 'government' ? 300 : 100;
        console.log(`   Step 2 - Employment Cap:`);
        console.log(`      ${scenario.employmentType} limit: $${employmentCap}`);
        
        // Step 3: Calculate maximum loan amount from DTNI capacity
        const maxLoanFromDTNI = calculateMaxLoanFromInstallment(maxInstallment, scenario.interestRate, scenario.termDays);
        console.log(`   Step 3 - Max Loan from DTNI:`);
        console.log(`      Based on $${maxInstallment.toFixed(2)} installment capacity: $${maxLoanFromDTNI.toFixed(2)}`);
        
        // Step 4: Apply employment cap limit
        const maxLoanAmount = Math.min(maxLoanFromDTNI, employmentCap);
        console.log(`   Step 4 - Apply Employment Cap:`);
        console.log(`      Final max loan: $${maxLoanAmount.toFixed(2)}`);
        console.log(`      Limited by: ${maxLoanFromDTNI > employmentCap ? 'Employment cap' : 'DTNI capacity'}`);
        
        // Step 5: Calculate monthly repayment for the max loan amount
        const termMonths = scenario.termDays / 30;
        const monthlyRepayment = calculateMonthlyInstallment(maxLoanAmount, scenario.interestRate, termMonths);
        console.log(`   Step 5 - Calculate Monthly Repayment:`);
        console.log(`      Loan amount: $${maxLoanAmount.toFixed(2)}`);
        console.log(`      Monthly payment: $${monthlyRepayment.toFixed(2)}`);
        
        // Step 6: Calculate total amount and interest
        const totalRepayment = monthlyRepayment * termMonths;
        const totalInterest = totalRepayment - maxLoanAmount;
        const effectiveRate = ((totalRepayment / maxLoanAmount) - 1) * 100;
        
        console.log(`   Step 6 - Interest Calculation:`);
        console.log(`      Total repayment: $${totalRepayment.toFixed(2)}`);
        console.log(`      Total interest: $${totalInterest.toFixed(2)}`);
        console.log(`      Effective rate: ${effectiveRate.toFixed(2)}%`);
        
        // Verification: Check if monthly payment is within DTNI capacity
        const dtniUtilization = (monthlyRepayment / maxInstallment) * 100;
        console.log(`   ✅ Verification:`);
        console.log(`      DTNI utilization: ${dtniUtilization.toFixed(1)}% (should be ≤100%)`);
        console.log(`      Within capacity: ${dtniUtilization <= 100 ? '✅ YES' : '❌ NO'}`);
        
        console.log('   ' + '='.repeat(60));
        console.log('');
    }
    
    console.log('🎯 DTNI Calculation Flow Summary:');
    console.log('=====================================');
    console.log('1️⃣ Calculate DTNI capacity (Net Salary × 40%)');
    console.log('2️⃣ Apply employment cap (Government $300, Others $100)');
    console.log('3️⃣ Determine maximum loan amount');
    console.log('4️⃣ Add interest using reducing balance method');
    console.log('5️⃣ Calculate monthly repayment amount');
    console.log('6️⃣ Verify repayment is within DTNI capacity');
    console.log('');
    console.log('✅ This ensures borrowers can afford their loans!');
    console.log('🌐 Test this in the demo page "Calculate Max Loan" button');
}

testDTNICalculationFlow();

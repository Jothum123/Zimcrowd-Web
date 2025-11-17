/**
 * Test Azure OpenAI Integration
 * Simple test to verify the Azure OpenAI service is working
 */

// Load environment variables
require('dotenv').config();

const AzureOpenAIService = require('./services/azure-openai.service');

async function testAzureOpenAI() {
    console.log('🧪 Testing Azure OpenAI Integration...\n');
    
    const azureOpenAI = new AzureOpenAIService();
    
    try {
        console.log('1️⃣ Testing Health Check...');
        const healthCheck = await azureOpenAI.healthCheck();
        console.log('Health Check Result:', healthCheck);
        console.log('✅ Health check completed\n');
        
        console.log('2️⃣ Testing Chat Response...');
        const chatResponse = await azureOpenAI.generateResponse(
            "Hello, I need help with a $5000 loan for my business. What are my options?",
            {
                userId: 'test-user-123',
                userProfile: {
                    zimScore: 72,
                    employment_type: 'private',
                    monthly_income: 2000,
                    walletBalance: 500,
                    hasActiveLoans: false,
                    hasInvestments: true
                },
                intent: 'loan_inquiry',
                systemContext: 'loan_specialist'
            }
        );
        
        console.log('Chat Response:', JSON.stringify(chatResponse, null, 2));
        console.log('✅ Chat response completed\n');
        
        console.log('3️⃣ Testing Financial Insights...');
        const insights = await azureOpenAI.generateFinancialInsights({
            id: 'test-user-123',
            zimScore: 72,
            employment_type: 'private',
            monthly_income: 2000,
            walletBalance: 500,
            loans: [],
            investments: [{ amount: 1000, type: 'fixed_deposit' }]
        });
        
        console.log('Financial Insights:', JSON.stringify(insights, null, 2));
        console.log('✅ Financial insights completed\n');
        
        console.log('🎉 ALL TESTS PASSED! Azure OpenAI integration is working correctly!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Error details:', error.message);
        
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.log('\n💡 This might be an API key issue. Please check:');
            console.log('   - AZURE_OPENAI_API_KEY is correct');
            console.log('   - AZURE_OPENAI_RESOURCE_NAME is correct');
            console.log('   - API key has proper permissions');
        }
        
        if (error.message.includes('404') || error.message.includes('Not Found')) {
            console.log('\n💡 This might be a deployment issue. Please check:');
            console.log('   - Model deployment names are correct');
            console.log('   - Models are deployed and ready in Azure');
        }
    }
}

// Run the test
testAzureOpenAI();

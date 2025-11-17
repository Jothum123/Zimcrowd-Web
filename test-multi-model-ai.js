/**
 * Test Multi-Model AI System
 * Tests the new OpenRouter multi-model rotation system
 */

require('dotenv').config();

const MasterAIService = require('./services/master-ai.service');

async function testMultiModelAI() {
    console.log('🧪 Testing Multi-Model AI System...\n');
    
    const masterAI = new MasterAIService();
    
    console.log('\n📊 Configuration Status:');
    console.log('- Primary AI Enabled:', masterAI.primaryAI.enabled);
    console.log('- Provider:', masterAI.primaryAI.provider);
    console.log('- Models Available:', masterAI.primaryAI.models.length);
    console.log('- Rotation Enabled:', masterAI.primaryAI.rotationEnabled);
    console.log('- Available Models:', masterAI.primaryAI.models);
    
    if (!masterAI.primaryAI.enabled) {
        console.log('\n⚠️ Primary AI is disabled. Please check your configuration:');
        console.log('- Set PRIMARY_AI_ENABLED=true');
        console.log('- Add your OpenRouter API key to PRIMARY_AI_API_KEY');
        console.log('- Verify PRIMARY_AI_PROVIDER=openrouter');
        return;
    }
    
    // Test multiple requests to see model rotation
    const testMessages = [
        "Hello! Can you help me with a $5000 loan?",
        "What investment options do you recommend for Zimbabwe?",
        "How can I improve my ZimScore?",
        "Tell me about loan interest rates"
    ];
    
    console.log('\n🔄 Testing Model Rotation:');
    
    for (let i = 0; i < testMessages.length; i++) {
        try {
            console.log(`\n${i + 1}. Testing message: "${testMessages[i]}"`);
            
            const response = await masterAI.processMessage(
                'test-user-123',
                testMessages[i],
                { source: 'test' }
            );
            
            if (response.success !== false) {
                console.log(`✅ Response received from: ${response.aiProvider}`);
                console.log(`📝 Model used: ${response.model || 'Unknown'}`);
                console.log(`💬 Response: ${response.response.substring(0, 100)}...`);
                console.log(`🎯 Intent: ${response.intent || 'Unknown'}`);
                console.log(`🔄 Fallback used: ${response.fallbackUsed ? 'Yes' : 'No'}`);
            } else {
                console.log(`❌ Request failed: ${response.error}`);
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 Final Statistics:');
    console.log('- Total Requests:', masterAI.stats.totalRequests);
    console.log('- Primary AI Used:', masterAI.stats.primaryAIUsed);
    console.log('- Kairo Fallback Used:', masterAI.stats.kairoFallbackUsed);
    
    const successRate = masterAI.stats.totalRequests > 0 
        ? ((masterAI.stats.primaryAIUsed / masterAI.stats.totalRequests) * 100).toFixed(1)
        : 0;
    console.log('- Primary AI Success Rate:', `${successRate}%`);
    
    console.log('\n🎉 Multi-Model AI Test Complete!');
}

// Run the test
testMultiModelAI().catch(console.error);

/**
 * OpenAI API Key Test Script
 * Tests if your OpenAI API key is working correctly
 */

require('dotenv').config();
const OpenAI = require('openai');

async function testOpenAI() {
    console.log('🧪 Testing OpenAI API Key...\n');
    
    // Check if API key is configured
    const apiKey = process.env.PRIMARY_AI_API_KEY || process.env.OPENAI_API_KEY;
    const provider = process.env.PRIMARY_AI_PROVIDER || 'openai';
    const model = process.env.PRIMARY_AI_MODEL || 'gpt-4o-mini';
    
    if (!apiKey || apiKey.includes('your_actual')) {
        console.log('❌ Primary AI API Key not configured!');
        console.log('📝 Please update your .env file with your actual API key');
        console.log(`   Provider: ${provider}`);
        console.log(`   Model: ${model}`);
        return false;
    }
    
    console.log('✅ API Key found:', apiKey.substring(0, 20) + '...');
    console.log('🔧 Provider:', provider);
    console.log('🤖 Model:', model);
    
    try {
        // Initialize AI client based on provider
        let aiClient;
        if (provider === 'openrouter') {
            aiClient = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://openrouter.ai/api/v1'
            });
        } else {
            aiClient = new OpenAI({
                apiKey: apiKey
            });
        }
        
        console.log('🔄 Testing API connection...');
        
        // Test with a simple request
        const response = await aiClient.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant. Respond with exactly: 'OpenAI API is working correctly!'"
                },
                {
                    role: "user",
                    content: "Test message"
                }
            ],
            max_tokens: 50,
            temperature: 0
        });
        
        const aiResponse = response.choices?.[0]?.message?.content || 'No response received';
        console.log('🤖 AI Response:', aiResponse);
        
        // Check usage information
        console.log('\n📊 API Call Details:');
        console.log('   Model:', response.model || 'Unknown');
        console.log('   Tokens Used:', response.usage?.total_tokens || 'Unknown');
        console.log('   Input Tokens:', response.usage?.prompt_tokens || 'Unknown');
        console.log('   Output Tokens:', response.usage?.completion_tokens || 'Unknown');
        
        // Calculate cost (approximate) - only if usage data is available
        if (response.usage?.prompt_tokens && response.usage?.completion_tokens) {
            const inputCost = (response.usage.prompt_tokens / 1000000) * 0.15;
            const outputCost = (response.usage.completion_tokens / 1000000) * 0.60;
            const totalCost = inputCost + outputCost;
            
            console.log('\n💰 Cost Analysis:');
            console.log('   Input Cost: $' + inputCost.toFixed(6));
            console.log('   Output Cost: $' + outputCost.toFixed(6));
            console.log('   Total Cost: $' + totalCost.toFixed(6));
        } else {
            console.log('\n💰 Cost Analysis: Usage data not available');
        }
        
        console.log(`🎉 SUCCESS! ${provider.toUpperCase()} API is working perfectly!`);
        console.log(`✅ Your Master AI system is ready to use ${provider} as primary AI`);
        
        return true;
        
    } catch (error) {
        console.log('\n❌ OpenAI API Test Failed!');
        console.log('Error:', error.message);
        
        if (error.message.includes('401')) {
            console.log('\n🔑 Authentication Error:');
            console.log('   - Check if your API key is correct');
            console.log('   - Make sure you have credits in your OpenAI account');
            console.log('   - Verify the key starts with "sk-proj-"');
        } else if (error.message.includes('429')) {
            console.log('\n⏰ Rate Limit Error:');
            console.log('   - You\'ve exceeded your rate limit');
            console.log('   - Wait a moment and try again');
            console.log('   - Consider upgrading your OpenAI plan');
        } else if (error.message.includes('quota')) {
            console.log('\n💳 Quota/Billing Error:');
            console.log('   - Add credits to your OpenAI account');
            console.log('   - Check your billing settings');
            console.log('   - Minimum $5 credit required');
        } else {
            console.log('\n🔧 Other Error:');
            console.log('   - Check your internet connection');
            console.log('   - Verify OpenAI service status');
            console.log('   - Try again in a few minutes');
        }
        
        return false;
    }
}

// Test Kairo AI fallback
async function testKairoFallback() {
    console.log('\n🔄 Testing Kairo AI Fallback...');
    
    try {
        const GeminiKairoAIService = require('./services/gemini-kairo-ai.service');
        const kairoAI = new GeminiKairoAIService();
        
        // Test user profile (mock data)
        const mockUserProfile = {
            profile: { first_name: 'Test' },
            zimScore: 65,
            walletBalance: 1000,
            hasActiveLoans: false,
            hasInvestments: true
        };
        
        // Test intent analysis
        const intent = await kairoAI.analyzeIntent("I want to apply for a loan");
        console.log('✅ Intent Analysis:', intent);
        
        // Test response generation
        const response = await kairoAI.generateResponse(intent, "I want to apply for a loan", mockUserProfile, {});
        console.log('✅ Kairo Response Preview:', response.substring(0, 100) + '...');
        
        console.log('🎉 Kairo AI Fallback is working perfectly!');
        return true;
        
    } catch (error) {
        console.log('❌ Kairo AI Fallback Error:', error.message);
        return false;
    }
}

// Test Master AI System
async function testMasterAI() {
    console.log('\n🤖 Testing Master AI System...');
    
    try {
        const MasterAIService = require('./services/master-ai.service');
        const masterAI = new MasterAIService();
        
        // Get system status
        const status = masterAI.getSystemStatus();
        console.log('📊 System Status:');
        console.log('   Primary AI Enabled:', status.primaryAI.enabled);
        console.log('   Primary AI Provider:', status.primaryAI.provider);
        console.log('   Fallback Provider:', status.fallbackAI.provider);
        
        console.log('✅ Master AI System initialized successfully!');
        return true;
        
    } catch (error) {
        console.log('❌ Master AI System Error:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 ZimCrowd AI System Test Suite\n');
    console.log('=' .repeat(50));
    
    const openaiWorking = await testOpenAI();
    console.log('\n' + '=' .repeat(50));
    
    const kairoWorking = await testKairoFallback();
    console.log('\n' + '=' .repeat(50));
    
    const masterWorking = await testMasterAI();
    console.log('\n' + '=' .repeat(50));
    
    console.log('\n📋 TEST SUMMARY:');
    console.log('   OpenAI API:', openaiWorking ? '✅ Working' : '❌ Failed');
    console.log('   Kairo AI Fallback:', kairoWorking ? '✅ Working' : '❌ Failed');
    console.log('   Master AI System:', masterWorking ? '✅ Working' : '❌ Failed');
    
    if (openaiWorking && kairoWorking && masterWorking) {
        console.log('\n🎉 ALL SYSTEMS GO! Your AI is ready for production!');
        console.log('🚀 ZimCrowd now has the most intelligent financial AI in Zimbabwe!');
    } else if (kairoWorking && masterWorking) {
        console.log('\n⚠️  OpenAI not working, but Kairo AI fallback is ready!');
        console.log('💡 Fix OpenAI issues to unlock advanced AI capabilities');
    } else {
        console.log('\n❌ Some systems need attention before production deployment');
    }
    
    console.log('\n' + '=' .repeat(50));
}

// Run the tests
runAllTests().catch(console.error);

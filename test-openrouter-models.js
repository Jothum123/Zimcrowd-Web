/**
 * OpenRouter Free Models Test Script
 * Tests all configured free tier models
 */

require('dotenv').config();
const axios = require('axios');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test configuration
const OPENROUTER_API_KEY = process.env.PRIMARY_AI_API_KEY || process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// All 7 models to test
const FREE_MODELS = [
    process.env.PRIMARY_AI_MODEL || 'google/gemini-2.5-flash',
    process.env.PRIMARY_AI_MODEL_2 || 'z-ai/glm-4.5-air:free',
    process.env.PRIMARY_AI_MODEL_3 || 'qwen/qwen2.5-vl-32b-instruct:free',
    process.env.PRIMARY_AI_MODEL_4 || 'meta-llama/llama-3.3-70b-instruct:free',
    process.env.PRIMARY_AI_MODEL_5 || 'google/gemini-2.5-pro',
    process.env.PRIMARY_AI_MODEL_6 || 'minimax/minimax-m2',
    process.env.PRIMARY_AI_MODEL_7 || 'google/gemini-2.5-flash-lite-preview-09-2025'
];

// Test prompts
const TEST_PROMPTS = [
    {
        name: 'Simple Greeting',
        prompt: 'Hello! Can you introduce yourself briefly?',
        expectedKeywords: ['hello', 'hi', 'assist', 'help']
    },
    {
        name: 'Financial Question',
        prompt: 'What is a ZimScore and why is it important for loans?',
        expectedKeywords: ['score', 'credit', 'loan', 'financial']
    },
    {
        name: 'Math Calculation',
        prompt: 'If I borrow $1000 at 10% annual interest for 1 year, how much interest will I pay?',
        expectedKeywords: ['100', 'interest', 'dollar']
    }
];

/**
 * Test a single model with a prompt
 */
async function testModel(model, prompt, promptName) {
    try {
        console.log(`${colors.cyan}Testing: ${model}${colors.reset}`);
        console.log(`${colors.yellow}Prompt: ${promptName}${colors.reset}`);
        
        const startTime = Date.now();
        
        const response = await axios.post(
            `${OPENROUTER_BASE_URL}/chat/completions`,
            {
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful financial assistant for ZimCrowd platform.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://zimcrowd.com',
                    'X-Title': 'ZimCrowd Kairo AI Test',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const aiResponse = response.data.choices[0].message.content;
            const usage = response.data.usage || {};

            console.log(`${colors.green}✓ SUCCESS${colors.reset}`);
            console.log(`Response: ${aiResponse.substring(0, 150)}...`);
            console.log(`Duration: ${duration}ms`);
            console.log(`Tokens: ${usage.total_tokens || 'N/A'}`);
            console.log('---');

            return {
                success: true,
                model,
                promptName,
                response: aiResponse,
                duration,
                usage
            };
        } else {
            throw new Error('No response from model');
        }

    } catch (error) {
        console.log(`${colors.red}✗ FAILED${colors.reset}`);
        console.log(`Error: ${error.message}`);
        
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Data: ${JSON.stringify(error.response.data)}`);
        }
        console.log('---');

        return {
            success: false,
            model,
            promptName,
            error: error.message
        };
    }
}

/**
 * Test all models with all prompts
 */
async function testAllModels() {
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   OpenRouter Free Models Test Suite${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

    // Check API key
    if (!OPENROUTER_API_KEY) {
        console.log(`${colors.red}ERROR: OpenRouter API key not found!${colors.reset}`);
        console.log('Please set PRIMARY_AI_API_KEY or OPENROUTER_API_KEY in .env file\n');
        return;
    }

    console.log(`${colors.green}API Key: ${OPENROUTER_API_KEY.substring(0, 20)}...${colors.reset}`);
    console.log(`${colors.green}Models to test: ${FREE_MODELS.length}${colors.reset}`);
    console.log(`${colors.green}Test prompts: ${TEST_PROMPTS.length}${colors.reset}\n`);

    const results = [];

    // Test each model with the first prompt only (to save time)
    for (const model of FREE_MODELS) {
        console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.blue}Model: ${model}${colors.reset}`);
        console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

        // Test with first prompt
        const result = await testModel(model, TEST_PROMPTS[0].prompt, TEST_PROMPTS[0].name);
        results.push(result);

        // Wait 1 second between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Test Summary${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`${colors.green}✓ Successful: ${successful.length}/${results.length}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${failed.length}/${results.length}${colors.reset}\n`);

    if (successful.length > 0) {
        console.log(`${colors.green}Working Models:${colors.reset}`);
        successful.forEach(r => {
            console.log(`  ${colors.green}✓${colors.reset} ${r.model} (${r.duration}ms)`);
        });
        console.log('');
    }

    if (failed.length > 0) {
        console.log(`${colors.red}Failed Models:${colors.reset}`);
        failed.forEach(r => {
            console.log(`  ${colors.red}✗${colors.reset} ${r.model} - ${r.error}`);
        });
        console.log('');
    }

    // Average response time
    if (successful.length > 0) {
        const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
        console.log(`${colors.cyan}Average Response Time: ${avgDuration.toFixed(0)}ms${colors.reset}\n`);
    }

    // Recommendations
    console.log(`${colors.yellow}Recommendations:${colors.reset}`);
    if (successful.length > 0) {
        const fastest = successful.reduce((min, r) => r.duration < min.duration ? r : min);
        console.log(`  • Fastest model: ${fastest.model} (${fastest.duration}ms)`);
        console.log(`  • Use model rotation for better availability`);
        console.log(`  • ${successful.length} models available for fallback\n`);
    } else {
        console.log(`  ${colors.red}• No models working - check API key and internet connection${colors.reset}\n`);
    }

    return results;
}

/**
 * Test specific financial scenarios
 */
async function testFinancialScenarios() {
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   Financial Scenario Tests${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

    const scenarios = [
        {
            name: 'Loan Recommendation',
            prompt: 'A user with ZimScore 65, monthly income $500, wants a $2000 loan for 12 months. Should they get approved?'
        },
        {
            name: 'Investment Advice',
            prompt: 'What investment options would you recommend for someone with $1000 to invest and medium risk tolerance?'
        },
        {
            name: 'ZimScore Improvement',
            prompt: 'How can someone improve their ZimScore from 50 to 70?'
        }
    ];

    // Use the fastest working model (z-ai/glm-4.5-air:free)
    const modelToUse = FREE_MODELS[1]; // z-ai/glm-4.5-air:free
    
    for (const scenario of scenarios) {
        console.log(`\n${colors.cyan}Scenario: ${scenario.name}${colors.reset}`);
        const result = await testModel(modelToUse, scenario.prompt, scenario.name);
        
        if (result.success) {
            console.log(`${colors.green}Response:${colors.reset}`);
            console.log(result.response);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

/**
 * Main test runner
 */
async function runTests() {
    try {
        // Run basic model tests
        const results = await testAllModels();

        // If any models work, run financial scenario tests
        const workingModels = results.filter(r => r.success);
        if (workingModels.length > 0) {
            const runScenarios = process.argv.includes('--scenarios');
            
            if (runScenarios) {
                await testFinancialScenarios();
            } else {
                console.log(`${colors.yellow}Tip: Run with --scenarios flag to test financial scenarios${colors.reset}\n`);
            }
        }

        console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.green}Test Complete!${colors.reset}`);
        console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

    } catch (error) {
        console.error(`${colors.red}Test suite error:${colors.reset}`, error.message);
        process.exit(1);
    }
}

// Run tests
runTests();

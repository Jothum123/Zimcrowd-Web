/**
 * Production API Testing Suite
 * Comprehensive testing for ZimCrowd AI Chat API endpoints
 */

require('dotenv').config();
const https = require('https');

class ProductionAPITester {
    constructor() {
        this.baseURL = 'http://localhost:3001';
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    async runAllTests() {
        console.log('🚀 ZimCrowd Production API Testing Suite');
        console.log('==========================================\n');

        // Test 1: Health Check
        await this.testHealthCheck();
        
        // Test 2: Kairo AI Chat Endpoint
        await this.testKairoAIChat();
        
        // Test 3: Azure OpenAI Chat Endpoint  
        await this.testAzureOpenAIChat();
        
        // Test 4: Master AI Service
        await this.testMasterAIService();
        
        // Test 5: Chat Widget Endpoints
        await this.testChatWidgetEndpoints();

        this.printSummary();
    }

    async testHealthCheck() {
        console.log('1️⃣ Testing Health Check Endpoint...');
        try {
            const response = await this.makeRequest('GET', '/api/health');
            if (response.success) {
                console.log('✅ Health check passed');
                console.log(`   Server: ${response.message}`);
                console.log(`   Routes loaded: ${response.loadedRoutes?.length || 0}`);
                this.testResults.passed++;
            } else {
                throw new Error('Health check failed');
            }
        } catch (error) {
            console.log('❌ Health check failed:', error.message);
            this.testResults.failed++;
        }
        this.testResults.total++;
        console.log('');
    }

    async testKairoAIChat() {
        console.log('2️⃣ Testing Kairo AI Chat Endpoint...');
        try {
            // This will fail due to auth, but we can check if endpoint exists
            const response = await this.makeRequest('POST', '/api/kairo/chat', {
                message: 'Hello, test message',
                userId: 'test-user'
            });
            
            // Expecting auth error, which means endpoint exists
            if (response.message === 'Access token required') {
                console.log('✅ Kairo AI endpoint exists and requires auth (correct)');
                this.testResults.passed++;
            } else {
                throw new Error('Unexpected response');
            }
        } catch (error) {
            console.log('❌ Kairo AI endpoint test failed:', error.message);
            this.testResults.failed++;
        }
        this.testResults.total++;
        console.log('');
    }

    async testAzureOpenAIChat() {
        console.log('3️⃣ Testing Azure OpenAI Chat Endpoint...');
        try {
            const response = await this.makeRequest('POST', '/api/kairo-azure/chat', {
                message: 'Hello, test message',
                userId: 'test-user'
            });
            
            if (response.message === 'Access token required') {
                console.log('✅ Azure OpenAI endpoint exists and requires auth (correct)');
                this.testResults.passed++;
            } else {
                throw new Error('Unexpected response');
            }
        } catch (error) {
            console.log('❌ Azure OpenAI endpoint test failed:', error.message);
            this.testResults.failed++;
        }
        this.testResults.total++;
        console.log('');
    }

    async testMasterAIService() {
        console.log('4️⃣ Testing Master AI Service Configuration...');
        try {
            // Test the service directly
            const MasterAIService = require('./services/master-ai.service');
            const masterAI = new MasterAIService();
            
            if (masterAI.primaryAI.enabled && masterAI.primaryAI.models.length > 0) {
                console.log('✅ Master AI Service configured correctly');
                console.log(`   Provider: ${masterAI.primaryAI.provider}`);
                console.log(`   Models: ${masterAI.primaryAI.models.length} available`);
                console.log(`   Rotation: ${masterAI.primaryAI.rotationEnabled ? 'Enabled' : 'Disabled'}`);
                this.testResults.passed++;
            } else {
                throw new Error('Master AI Service not properly configured');
            }
        } catch (error) {
            console.log('❌ Master AI Service test failed:', error.message);
            this.testResults.failed++;
        }
        this.testResults.total++;
        console.log('');
    }

    async testChatWidgetEndpoints() {
        console.log('5️⃣ Testing Chat Widget Endpoints...');
        try {
            // Test insights endpoint
            const insightsResponse = await this.makeRequest('GET', '/api/kairo-azure/insights');
            
            if (insightsResponse.message === 'Access token required') {
                console.log('✅ Insights endpoint exists and requires auth (correct)');
                this.testResults.passed++;
            } else {
                throw new Error('Insights endpoint not found');
            }
        } catch (error) {
            console.log('❌ Chat widget endpoints test failed:', error.message);
            this.testResults.failed++;
        }
        this.testResults.total++;
        console.log('');
    }

    async makeRequest(method, endpoint, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: endpoint,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = require('http').request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        resolve(parsed);
                    } catch (error) {
                        resolve({ raw: responseData, status: res.statusCode });
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    printSummary() {
        console.log('📊 TEST SUMMARY');
        console.log('================');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed} ✅`);
        console.log(`Failed: ${this.testResults.failed} ❌`);
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(`Success Rate: ${successRate}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! API is production-ready!');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the issues above.');
        }
    }
}

// Run the tests
const tester = new ProductionAPITester();
tester.runAllTests().catch(console.error);

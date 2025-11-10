// ZimCrowd Backend Test Script
// Run this to test all API endpoints

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';
let resetToken = '';

// Test data
const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: `test${Date.now()}@example.com`,
    password: 'TestPass123!'
};

const testLogin = {
    emailOrPhone: testUser.email,
    password: testUser.password
};

// Helper function to make requests
const makeRequest = async (method, endpoint, data = null, token = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        console.log(`✅ ${method} ${endpoint}: ${response.status}`);
        return response.data;
    } catch (error) {
        console.log(`❌ ${method} ${endpoint}: ${error.response?.status || 'ERROR'}`);
        if (error.response?.data) {
            console.log('   Response:', error.response.data);
        }
        return null;
    }
};

// Test suite
const runTests = async () => {
    console.log('🚀 Starting ZimCrowd Backend Tests...\n');

    // 1. Health Check
    console.log('1. Health Check');
    await makeRequest('GET', '/health');

    // 2. Test Endpoints
    console.log('\n2. Test Endpoints');
    await makeRequest('GET', '/test');

    // 3. User Registration
    console.log('\n3. User Registration');
    const registerResult = await makeRequest('POST', '/auth/register', testUser);
    if (registerResult?.userId) {
        userId = registerResult.userId;
        console.log(`   User ID: ${userId}`);
    }

    // 4. User Login (should fail before email verification)
    console.log('\n4. User Login (before verification)');
    await makeRequest('POST', '/auth/login', testLogin);

    // 5. Forgot Password
    console.log('\n5. Forgot Password');
    await makeRequest('POST', '/auth/forgot-password', {
        emailOrPhone: testUser.email
    });

    // 6. Verify OTP (simulated - you'll need to check console for actual OTP)
    console.log('\n6. OTP Verification (check console for OTP code)');
    console.log('   Note: Get OTP from MongoDB or email logs');
    console.log('   Example: await makeRequest("POST", "/auth/verify-otp", {');
    console.log('       identifier: testUser.email,');
    console.log('       otp: "123456", // Replace with actual OTP');
    console.log('       type: "signup"');
    console.log('   });');

    // 7. Login after verification (would work if OTP was verified)
    console.log('\n7. User Login (after verification - would work)');
    console.log('   const loginResult = await makeRequest("POST", "/auth/login", testLogin);');
    console.log('   if (loginResult?.token) {');
    console.log('       authToken = loginResult.token;');
    console.log('   }');

    console.log('\n🎉 Test suite completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Check MongoDB for OTP codes');
    console.log('2. Verify emails were sent');
    console.log('3. Test OTP verification manually');
    console.log('4. Test password reset flow');
};

// Run tests
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };

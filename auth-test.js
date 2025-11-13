// Simple Authentication Test
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testRegistrationAndLogin() {
    console.log('🧪 Testing User Registration and Login\n');

    try {
        // Test user registration
        console.log('📝 Registering test user...');
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
            firstName: 'Test',
            lastName: 'User',
            email: `test${Date.now()}@example.com`,
            password: 'TestPass123!',
            phone: '+263712345678'
        });

        console.log('✅ Registration successful:', registerResponse.data);

        // For now, we'll assume the user needs to verify email
        // In a real test, you'd verify the email first
        console.log('\n⚠️ Note: In production, user would need to verify email before login');

        // Test login (this might fail without email verification)
        console.log('\n🔐 Attempting login...');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: registerResponse.data.user?.email || `test${Date.now()}@example.com`,
                password: 'TestPass123!'
            });

            console.log('✅ Login successful!');
            console.log('🔑 JWT Token:', loginResponse.data.token ? 'Received' : 'Not received');

            // Test authenticated endpoint
            if (loginResponse.data.token) {
                console.log('\n👤 Testing authenticated endpoint...');
                const profileResponse = await axios.get(`${BASE_URL}/profile`, {
                    headers: { Authorization: `Bearer ${loginResponse.data.token}` }
                });
                console.log('✅ Profile access successful:', profileResponse.data);
            }

        } catch (loginError) {
            console.log('❌ Login failed (expected without email verification):', loginError.response?.data?.message || loginError.message);
        }

    } catch (error) {
        console.log('❌ Registration failed:', error.response?.data?.message || error.message);
    }
}

testRegistrationAndLogin();

// Test Email OTP Signup Flow
const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:5003';

async function testEmailSignup() {
    console.log('🧪 Testing Email OTP Signup Flow...\n');

    // Test data
    const testData = {
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        password: 'Test1234',
        country: 'Zimbabwe',
        city: 'Harare'
    };

    try {
        console.log('📧 Step 1: Registering email and sending OTP...');
        console.log('Test Data:', testData);

        // Step 1: Register and send OTP
        const registerResponse = await fetch(`${API_URL}/api/email-auth/register-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const registerResult = await registerResponse.json();

        if (!registerResult.success) {
            console.error('❌ Registration failed:', registerResult.message);
            return;
        }

        console.log('✅ Registration successful!');
        console.log('📧 OTP sent to:', registerResult.email);
        console.log('🔑 Temp Token:', registerResult.tempToken ? 'Received' : 'Missing');

        // For testing, we'll need to check the database or use a known OTP
        // In production, you'd receive the email and extract the OTP
        console.log('\n📋 Note: Check your email for the OTP code, or check the database for testing');
        console.log('🔍 Query: SELECT * FROM email_verifications WHERE email = $1 ORDER BY created_at DESC LIMIT 1');

        console.log('\n🎯 Next Steps:');
        console.log('1. Check your email for the OTP code');
        console.log('2. Use the tempToken and OTP to call /api/email-auth/verify-email-signup');
        console.log('3. Complete the signup process');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testEmailSignup().catch(console.error);

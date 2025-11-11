require('dotenv').config();

async function testVerifyResetOtp() {
    console.log('🧪 Testing verify-reset-otp route...\n');

    const testPhone = '+263771234567';
    const testOTP = '123456';

    const response = await fetch('http://localhost:5003/api/phone-auth/verify-reset-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            phone: testPhone,
            otp: testOTP
        })
    });

    const data = await response.json();

    console.log('📤 Response:');
    console.log(`  Status: ${response.status}`);
    console.log(`  Success: ${data.success ? '✅' : '❌'}`);
    console.log(`  Message: ${data.message}`);
    console.log(`  Route found: ${response.status !== 404 ? '✅' : '❌'}`);
}

testVerifyResetOtp();

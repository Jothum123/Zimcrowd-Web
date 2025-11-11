require('dotenv').config();

const { isValidPhoneNumber } = require('./utils/twilio-service');

async function testResetPassword() {
    console.log('🧪 Testing Password Reset Flow...\n');

    // Test phone number
    const testPhone = '+263771234567';
    const testOTP = '123456'; // Replace with actual OTP from SMS
    const testPassword = 'NewPassword123';

    console.log('📋 Test Parameters:');
    console.log(`  Phone: ${testPhone}`);
    console.log(`  OTP: ${testOTP}`);
    console.log(`  New Password: ${testPassword}\n`);

    // Validate phone
    const phoneValidation = isValidPhoneNumber(testPhone);
    console.log('📱 Phone Validation:');
    console.log(`  Valid: ${phoneValidation.isValid ? '✅' : '❌'}`);
    console.log(`  Formatted: ${phoneValidation.formatted}\n`);

    // Test API call
    const API_URL = 'http://localhost:5003';
    
    try {
        console.log('🔄 Calling reset-password-phone endpoint...');
        const response = await fetch(`${API_URL}/api/phone-auth/reset-password-phone`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: testPhone,
                otp: testOTP,
                newPassword: testPassword
            })
        });

        const data = await response.json();
        
        console.log('\n📤 Response:');
        console.log(`  Status: ${response.status}`);
        console.log(`  Success: ${data.success ? '✅' : '❌'}`);
        console.log(`  Message: ${data.message}`);
        
        if (!data.success && data.errors) {
            console.log('\n❌ Validation Errors:');
            data.errors.forEach(err => {
                console.log(`  - ${err.msg} (${err.param})`);
            });
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testResetPassword();

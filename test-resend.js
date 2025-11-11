// Test Resend Integration
require('dotenv').config();
const { sendOTPEmail, testEmailConnection } = require('./utils/email-service');

async function testResendIntegration() {
    console.log('🔍 Testing Resend Integration...\n');

    // Check environment variables
    console.log('📋 Environment Configuration:');
    console.log(`RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'SET' : 'NOT SET'}`);
    console.log(`RESEND_EMAIL_FROM: ${process.env.RESEND_EMAIL_FROM || 'NOT SET'}`);
    console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET'}\n`);

    // Test Resend connection
    console.log('🔗 Testing Resend Connection...');
    const connectionTest = await testEmailConnection();
    console.log(`Connection Test: ${connectionTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Message: ${connectionTest.message}`);
    if (!connectionTest.success) {
        console.log(`Error: ${connectionTest.error}\n`);
    } else {
        console.log('');
    }

    // Test sending OTP email (uncomment and add real email to test)
    if (connectionTest.success) {
        console.log('📧 To test sending email:');
        console.log('1. Uncomment the test code below');
        console.log('2. Replace test@example.com with your real email');
        console.log('3. Run: node test-resend.js');

        console.log('📧 Testing OTP Email Send...');
        // CHANGE THIS TO YOUR REAL EMAIL ADDRESS FOR TESTING
        const testEmail = 'moffat@zimcrowd.com'; // Replace with your email
        const testOTP = '123456';

        const emailResult = await sendOTPEmail(testEmail, testOTP);
        console.log(`Email Send: ${emailResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Message: ${emailResult.message}`);
        if (!emailResult.success) {
            console.log(`Error: ${emailResult.error}`);
        } else {
            console.log(`Message ID: ${emailResult.messageId}`);
            console.log(`✅ Check ${testEmail} for the OTP email!`);
        }
    }

    console.log('\n🎯 Next Steps:');
    if (!process.env.RESEND_API_KEY) {
        console.log('1. Get API key from: https://resend.com/api-keys');
        console.log('2. Set RESEND_API_KEY in your .env file');
        console.log('3. Set FROM_EMAIL to your verified domain email');
        console.log('4. Restart server: npm run dev');
    }
    console.log('5. Test with real email address');
}

// Run the test
testResendIntegration().catch(error => {
    console.error('❌ Test failed:', error);
});

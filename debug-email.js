// Email Debugging Test Script
require('dotenv').config();
const { sendOTPEmail, testEmailConnection } = require('./utils/email-service');

async function testEmailSystem() {
    console.log('🔍 Testing Email OTP System...\n');

    // Check environment variables
    console.log('📋 Environment Configuration:');
    console.log(`EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || 'NOT SET'}`);
    console.log(`GMAIL_USER: ${process.env.GMAIL_USER ? 'SET' : 'NOT SET'}`);
    console.log(`GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? 'SET' : 'NOT SET'}`);
    console.log(`FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET'}\n`);

    // Test email connection
    console.log('🔗 Testing Email Connection...');
    const connectionTest = await testEmailConnection();
    console.log(`Connection Test: ${connectionTest.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Message: ${connectionTest.message}`);
    if (!connectionTest.success) {
        console.log(`Error: ${connectionTest.error}\n`);
    } else {
        console.log('');
    }

    // Test sending OTP email
    if (connectionTest.success) {
        console.log('📧 Testing OTP Email Send...');
        const testEmail = 'test@example.com'; // Change this to your actual email for testing
        const testOTP = '123456';

        const emailResult = await sendOTPEmail(testEmail, testOTP);
        console.log(`Email Send: ${emailResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`Message: ${emailResult.message}`);
        if (!emailResult.success) {
            console.log(`Error: ${emailResult.error}`);
        } else {
            console.log(`Message ID: ${emailResult.messageId}`);
        }
    }

    console.log('\n🎯 Next Steps:');
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.log('1. Set GMAIL_USER to your Gmail address');
        console.log('2. Set GMAIL_APP_PASSWORD to your Gmail app password');
        console.log('   - Go to Google Account > Security > 2-Step Verification > App passwords');
        console.log('   - Generate password for "Mail"');
        console.log('3. Restart server: npm run dev');
    }
    console.log('4. Test again with your real email address in this script');
}

// Run the test
testEmailSystem().catch(error => {
    console.error('❌ Test failed:', error);
});

// Test SendGrid functionality
require('dotenv').config();
const { testSendGridConnection, sendOTPEmailSendGrid } = require('./utils/email-service.js');

async function testSendGrid() {
    console.log('🔍 Testing SendGrid Email Service...\n');

    // Test connection
    console.log('📧 Testing SendGrid connection...');
    try {
        const connectionResult = await testSendGridConnection();
        console.log('✅ SendGrid Connection:', connectionResult.success ? 'Connected' : 'Failed');
        if (!connectionResult.success) {
            console.log('❌ Error:', connectionResult.message);
            return;
        }
    } catch (error) {
        console.log('❌ Connection Test Error:', error.message);
        return;
    }

    // Test OTP email sending (commented out to avoid actual sending)
    console.log('📤 Testing OTP email send... (commented out)');
    console.log('   Uncomment the code below to test actual email sending:');
    console.log('   const result = await sendOTPEmailSendGrid("your-email@example.com", "123456");');
    console.log('   console.log("Email Result:", result);');

    /*
    // Uncomment to test actual email sending
    try {
        const emailResult = await sendOTPEmailSendGrid('your-email@example.com', '123456');
        console.log('✅ OTP Email:', emailResult.success ? 'Sent' : 'Failed');
        if (!emailResult.success) {
            console.log('❌ Error:', emailResult.message);
        }
    } catch (error) {
        console.log('❌ Email Send Error:', error.message);
    }
    */

    console.log('\n🎉 SendGrid test completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Add SendGrid credentials to your .env file');
    console.log('2. Uncomment the email test code above');
    console.log('3. Run this script again to test email sending');
}

testSendGrid();

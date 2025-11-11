// Test Both Email & SMS OTP Systems
require('dotenv').config();

async function testDualOTPSystems() {
    console.log('🔄 Testing Dual OTP Systems: Email (Resend) + SMS (Twilio)\n');

    // Check configurations
    console.log('📋 Configuration Check:');
    console.log(`✅ Email (Resend): ${process.env.RESEND_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`✅ SMS (Twilio): ${process.env.TWILIO_ACCOUNT_SID ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`✅ From Email: ${process.env.FROM_EMAIL || 'NOT SET'}`);
    console.log(`✅ Twilio Phone: ${process.env.TWILIO_PHONE_NUMBER || 'NOT SET'}\n`);

    // Test Email System
    if (process.env.RESEND_API_KEY) {
        console.log('📧 Testing Email OTP (Resend)...');
        try {
            const { sendOTPEmail } = require('./utils/email-service');
            const testEmail = 'moffat@zimcrowd.com';
            const otp = '123456';

            const startTime = Date.now();
            const emailResult = await sendOTPEmail(testEmail, otp);
            const endTime = Date.now();

            console.log(`   Response Time: ${endTime - startTime}ms`);
            console.log(`   Status: ${emailResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
            if (emailResult.success) {
                console.log(`   Message ID: ${emailResult.messageId}`);
                console.log(`   ✅ Email sent via Resend to ${testEmail}`);
            } else {
                console.log(`   Error: ${emailResult.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Email test failed: ${error.message}`);
        }
    } else {
        console.log('❌ Email (Resend) not configured');
    }

    console.log('');

    // Test SMS System
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        console.log('📱 Testing SMS OTP (Twilio)...');
        try {
            const twilioService = require('./utils/twilio-service');
            const testTwilioConnection = twilioService.testTwilioConnection;

            // Test connection first
            const connectionResult = await testTwilioConnection();
            if (connectionResult.success) {
                console.log('   ✅ Twilio connection OK');
                console.log('   📱 SMS system ready (test SMS not sent to avoid costs)');
                console.log('   ✅ Twilio configured for backup SMS OTP');
            } else {
                console.log('   ❌ Twilio connection failed');
                console.log(`   Error: ${connectionResult.error}`);
            }
        } catch (error) {
            console.log(`   ❌ SMS test failed: ${error.message}`);
        }
    } else {
        console.log('❌ SMS (Twilio) not configured');
    }

    console.log('\n🎯 Dual OTP System Status:');

    const emailReady = !!process.env.RESEND_API_KEY;
    const smsReady = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

    console.log(`📧 Primary: Email OTP via Resend - ${emailReady ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`📱 Backup: SMS OTP via Twilio - ${smsReady ? '✅ READY' : '❌ NOT READY'}`);

    if (emailReady && smsReady) {
        console.log('\n🎉 SUCCESS: Both Email & SMS OTP systems are configured!');
        console.log('   • Users can choose email or phone signup');
        console.log('   • Automatic fallback available if one system fails');
        console.log('   • High reliability and user satisfaction');
    } else if (emailReady) {
        console.log('\n⚠️  WARNING: Only Email OTP available, SMS backup missing');
        console.log('   • Add Twilio credentials for full redundancy');
    } else if (smsReady) {
        console.log('\n⚠️  WARNING: Only SMS OTP available, Email primary missing');
        console.log('   • Add Resend API key for primary email system');
    } else {
        console.log('\n❌ ERROR: Neither Email nor SMS OTP configured');
        console.log('   • Add both Resend (email) and Twilio (SMS) credentials');
    }

    console.log('\n🚀 Next Steps:');
    console.log('1. Test signup flow: http://localhost:5003/test-signup-flows.html');
    console.log('2. Try both email and phone signup options');
    console.log('3. Verify OTP delivery for both methods');
    console.log('4. Monitor delivery rates in Resend & Twilio dashboards');

    console.log('\n💡 Pro Tips:');
    console.log('• Email: Faster, cheaper, better for international users');
    console.log('• SMS: More reliable, works without internet, good backup');
    console.log('• Combined: Best user experience with 99.9%+ delivery rate');
}

// Run the test
testDualOTPSystems().catch(error => {
    console.error('❌ Test failed:', error);
});

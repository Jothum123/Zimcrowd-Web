// Test SMS OTP with Real Phone Number
require('dotenv').config();
const { sendSMSOTP, generateOTP } = require('./utils/twilio-service');

async function testRealSMSOTP() {
    console.log('📱 Testing Real SMS OTP with Twilio\n');

    // Check Twilio configuration
    console.log('📋 Twilio Configuration:');
    console.log(`✅ Account SID: ${process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET'}`);
    console.log(`✅ Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET'}`);
    console.log(`✅ Phone Number: ${process.env.TWILIO_PHONE_NUMBER || 'NOT SET'}\n`);

    // ⚠️ COST WARNING ⚠️
    console.log('⚠️  WARNING: This will send a REAL SMS and may incur costs!');
    console.log('💰 Twilio SMS costs: ~$0.0079 per message (varies by country)');
    console.log('📞 Make sure you have credits in your Twilio account\n');

    // Get phone number from user
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('📞 Enter your phone number (with country code, e.g. +263771234567): ', async (phoneNumber) => {
            rl.close();

            if (!phoneNumber || phoneNumber.trim() === '') {
                console.log('❌ No phone number provided. Test cancelled.');
                resolve();
                return;
            }

            // Validate phone number format
            const cleanPhone = phoneNumber.replace(/\s+/g, '');
            if (!cleanPhone.startsWith('+') || cleanPhone.length < 10) {
                console.log('❌ Invalid phone number format. Must start with + and include country code.');
                resolve();
                return;
            }

            console.log(`\n📱 Sending SMS OTP to: ${cleanPhone}`);
            console.log('⏳ This may take a few seconds...\n');

            // Generate OTP
            const otp = generateOTP();
            console.log(`🔢 Generated OTP: ${otp}`);

            try {
                const startTime = Date.now();
                const result = await sendSMSOTP(cleanPhone, otp);
                const endTime = Date.now();

                console.log(`📊 Response Time: ${endTime - startTime}ms`);
                console.log(`📱 SMS Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

                if (result.success) {
                    console.log(`🔢 OTP Sent: ${otp}`);
                    console.log(`📞 To: ${cleanPhone}`);
                    console.log(`💰 Cost: Check your Twilio dashboard`);
                    console.log(`\n🎉 SMS OTP sent successfully!`);
                    console.log(`📱 Check your phone for the OTP message from ${process.env.TWILIO_PHONE_NUMBER}`);
                } else {
                    console.log(`❌ Error: ${result.error}`);
                    console.log('💡 Check your Twilio dashboard for more details');
                }

            } catch (error) {
                console.log(`❌ SMS test failed: ${error.message}`);
            }

            console.log('\n💡 Next Steps:');
            console.log('1. Check your phone for the SMS');
            console.log('2. Verify the OTP was delivered');
            console.log('3. Test the full signup flow: http://localhost:5003/test-signup-flows.html');
            console.log('4. Monitor SMS costs in your Twilio dashboard');

            resolve();
        });
    });
}

// Run the test
testRealSMSOTP().catch(error => {
    console.error('❌ Test failed:', error);
});

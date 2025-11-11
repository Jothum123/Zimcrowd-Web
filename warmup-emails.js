// Email Domain Warm-up Script
// Run this gradually to improve email deliverability
require('dotenv').config();
const { sendOTPEmail } = require('./utils/email-service');

async function warmupDomain() {
    console.log('🔥 Starting Email Domain Warm-up Process\n');

    const testEmails = [
        'moffat@zimcrowd.com', // Your main test email
        // Add more test emails here gradually
    ];

    console.log(`📧 Sending warm-up emails to ${testEmails.length} recipients`);
    console.log('⏰ Spacing emails 30 seconds apart to avoid spam filters\n');

    for (let i = 0; i < testEmails.length; i++) {
        const email = testEmails[i];
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        console.log(`📤 Sending email ${i + 1}/${testEmails.length} to: ${email}`);

        const startTime = Date.now();
        const result = await sendOTPEmail(email, otp);
        const endTime = Date.now();

        if (result.success) {
            console.log(`✅ Sent in ${endTime - startTime}ms - Message ID: ${result.messageId}`);
        } else {
            console.log(`❌ Failed: ${result.error}`);
        }

        // Wait 30 seconds between emails (don't spam)
        if (i < testEmails.length - 1) {
            console.log('⏳ Waiting 30 seconds...\n');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }

    console.log('\n🎉 Warm-up complete!');
    console.log('💡 Continue this process gradually over several days');
    console.log('📊 Monitor delivery in: https://resend.com/emails');
    console.log('⚡ Emails should get faster as domain reputation builds');
}

// Uncomment to run warm-up (use sparingly)
// warmupDomain().catch(console.error);

console.log('🔥 Email Warm-up Script Ready');
console.log('💡 Uncomment the warmupDomain() call to start warming up your domain');
console.log('⚠️  Use gradually - don\'t send too many emails at once');

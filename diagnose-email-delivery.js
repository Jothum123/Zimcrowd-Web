// Email Delivery Performance Diagnostic
require('dotenv').config();
const { sendOTPEmail, testEmailConnection } = require('./utils/email-service');

async function diagnoseEmailDelivery() {
    console.log('🔍 Email Delivery Performance Diagnostic\n');

    // Check environment variables
    console.log('📋 Configuration Check:');
    console.log(`✅ RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'SET' : 'MISSING'}`);
    console.log(`✅ FROM_EMAIL: ${process.env.FROM_EMAIL || 'NOT SET'}`);

    // Test connection
    console.log('\n🔗 Testing Resend Connection...');
    const connectionTest = await testEmailConnection();
    console.log(`Connection: ${connectionTest.success ? '✅ OK' : '❌ FAILED'}`);

    if (!connectionTest.success) {
        console.log('\n❌ CONNECTION ISSUES:');
        console.log('• Check your RESEND_API_KEY');
        console.log('• Verify API key has send permissions');
        console.log('• Check Resend dashboard for account status');
        return;
    }

    // Performance test
    console.log('\n⚡ Performance Test:');
    const testEmail = 'moffat@zimcrowd.com';
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();

    const startTime = Date.now();
    console.log(`Sending test OTP to: ${testEmail}`);

    const result = await sendOTPEmail(testEmail, testOTP);
    const endTime = Date.now();
    const apiTime = endTime - startTime;

    console.log(`API Response Time: ${apiTime}ms`);
    console.log(`Send Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);

    if (result.success) {
        console.log(`Message ID: ${result.messageId}`);
        console.log('\n📊 Delivery Expectations:');
        console.log('• API Response: < 500ms (yours: ' + apiTime + 'ms)');
        console.log('• Email Delivery: 3-30 seconds (depends on recipient)');
        console.log('• Gmail: Usually instant');
        console.log('• Outlook/Hotmail: 5-15 seconds');
        console.log('• Other providers: 10-30 seconds');
    }

    console.log('\n🔧 Potential Delay Causes:');

    // Domain verification check
    console.log('\n1. 📧 Domain Verification:');
    console.log('   • Go to: https://resend.com/domains');
    console.log('   • Verify zimcrowd.com is verified');
    console.log('   • Check SPF/DKIM/DMARC records');

    // Email reputation
    console.log('\n2. 🏆 Email Reputation:');
    console.log('   • New domains take time to build reputation');
    console.log('   • First emails may be slower');
    console.log('   • Warm up domain by sending gradually');

    // Geographic factors
    console.log('\n3. 🌍 Geographic Routing:');
    console.log('   • Resend routes globally');
    console.log('   • International emails slower');
    console.log('   • Check recipient location');

    // Spam filters
    console.log('\n4. 🛡️ Spam Filters:');
    console.log('   • Check spam/junk folders');
    console.log('   • Add team@zimcrowd.com to contacts');
    console.log('   • Avoid triggering spam words');

    // Optimizations applied
    console.log('\n✅ Optimizations Applied:');
    console.log('   • High priority headers added');
    console.log('   • Email tagging enabled');
    console.log('   • Clean HTML design');
    console.log('   • Short subject lines');

    console.log('\n📈 Performance Monitoring:');
    console.log('   • Check Resend dashboard: https://resend.com/emails');
    console.log('   • Monitor delivery rates');
    console.log('   • Track bounce/complaint rates');

    console.log('\n🎯 Expected Delivery Times:');
    console.log('   Fast (3-10s): Gmail, Outlook, Yahoo');
    console.log('   Medium (10-30s): Other providers');
    console.log('   Slow (1-5min): New domains, cold emails');

    console.log('\n💡 If still slow:');
    console.log('   1. Verify domain DNS settings');
    console.log('   2. Send test emails gradually');
    console.log('   3. Check recipient email provider');
    console.log('   4. Contact Resend support if needed');
}

// Run diagnostic
diagnoseEmailDelivery().catch(error => {
    console.error('❌ Diagnostic failed:', error);
});

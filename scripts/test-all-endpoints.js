/**
 * Comprehensive API Endpoint Testing Script
 * Tests all dashboard tabs and their backend integrations
 */

require('dotenv').config({ path: '.env.production' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_BASE = 'https://zimcrowd-api.onrender.com';
const userId = '50a60ab6-d8bd-412a-a52c-f656d40b26e3';

// Get auth token (simulate login)
async function getAuthToken() {
    // For testing, we'll create a test token
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
        console.error('Error getting user:', error);
        return null;
    }
    
    // Create a session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createUser({
        email: 'test@zimcrowd.com',
        password: 'test123',
        email_confirm: true
    });
    
    return sessionData?.session?.access_token || null;
}

async function testEndpoint(name, method, endpoint, token = null, body = null) {
    console.log(`\n🧪 Testing: ${name}`);
    console.log(`   ${method} ${endpoint}`);
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();
        
        if (response.ok) {
            console.log(`   ✅ SUCCESS (${response.status})`);
            console.log(`   Data:`, JSON.stringify(data).substring(0, 100) + '...');
            return { success: true, data };
        } else {
            console.log(`   ❌ FAILED (${response.status})`);
            console.log(`   Error:`, data.error || data.message);
            return { success: false, error: data };
        }
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('🚀 Starting Comprehensive API Testing...\n');
    console.log('=' .repeat(60));
    
    const results = {
        overview: {},
        loans: {},
        wallet: {},
        investments: {},
        transactions: {},
        referrals: {},
        analytics: {},
        settings: {},
        notifications: {},
        auth: {}
    };
    
    // Get auth token
    console.log('\n📋 AUTHENTICATION');
    console.log('=' .repeat(60));
    
    // Test phone auth
    results.auth.sendOTP = await testEndpoint(
        'Send OTP',
        'POST',
        '/api/auth/phone/send-otp',
        null,
        { phoneNumber: '+263781144068' }
    );
    
    // For other tests, we'll use a mock token or Supabase token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // You'll need to get a real token
    
    // OVERVIEW TAB
    console.log('\n\n📋 OVERVIEW TAB');
    console.log('=' .repeat(60));
    
    results.overview.profile = await testEndpoint(
        'User Profile',
        'GET',
        '/api/user/profile',
        token
    );
    
    results.overview.walletBalance = await testEndpoint(
        'Wallet Balance',
        'GET',
        '/api/user/wallet/balance',
        token
    );
    
    results.overview.loans = await testEndpoint(
        'User Loans Summary',
        'GET',
        '/api/loans/user',
        token
    );
    
    results.overview.investments = await testEndpoint(
        'User Investments',
        'GET',
        '/api/investments/user',
        token
    );
    
    // LOANS TAB
    console.log('\n\n📋 LOANS TAB');
    console.log('=' .repeat(60));
    
    results.loans.all = await testEndpoint(
        'All User Loans',
        'GET',
        '/api/loans/user',
        token
    );
    
    results.loans.available = await testEndpoint(
        'Available Loans',
        'GET',
        '/api/loans/available',
        token
    );
    
    // WALLET TAB
    console.log('\n\n📋 WALLET TAB');
    console.log('=' .repeat(60));
    
    results.wallet.balance = await testEndpoint(
        'Wallet Balance',
        'GET',
        '/api/user/wallet/balance',
        token
    );
    
    results.wallet.transactions = await testEndpoint(
        'Wallet Transactions',
        'GET',
        '/api/user/wallet/transactions',
        token
    );
    
    // INVESTMENTS TAB
    console.log('\n\n📋 INVESTMENTS TAB');
    console.log('=' .repeat(60));
    
    results.investments.user = await testEndpoint(
        'User Investments',
        'GET',
        '/api/investments/user',
        token
    );
    
    results.investments.available = await testEndpoint(
        'Available Investments',
        'GET',
        '/api/investments/available',
        token
    );
    
    // TRANSACTIONS TAB
    console.log('\n\n📋 TRANSACTIONS TAB');
    console.log('=' .repeat(60));
    
    results.transactions.all = await testEndpoint(
        'All Transactions',
        'GET',
        '/api/transactions',
        token
    );
    
    // REFERRALS TAB
    console.log('\n\n📋 REFERRALS TAB');
    console.log('=' .repeat(60));
    
    results.referrals.stats = await testEndpoint(
        'Referral Stats',
        'GET',
        '/api/user/referrals',
        token
    );
    
    results.referrals.earnings = await testEndpoint(
        'Referral Earnings',
        'GET',
        '/api/user/referrals/earnings',
        token
    );
    
    // ANALYTICS TAB
    console.log('\n\n📋 ANALYTICS TAB');
    console.log('=' .repeat(60));
    
    results.analytics.overview = await testEndpoint(
        'Analytics Overview',
        'GET',
        '/api/user/analytics/overview',
        token
    );
    
    // SETTINGS TAB
    console.log('\n\n📋 SETTINGS TAB');
    console.log('=' .repeat(60));
    
    results.settings.general = await testEndpoint(
        'User Settings',
        'GET',
        '/api/user/settings',
        token
    );
    
    results.settings.notifications = await testEndpoint(
        'Notification Preferences',
        'GET',
        '/api/user/notification-preferences',
        token
    );
    
    results.settings.security = await testEndpoint(
        'Security Settings',
        'GET',
        '/api/user/security-settings',
        token
    );
    
    results.settings.sessions = await testEndpoint(
        'Active Sessions',
        'GET',
        '/api/user/sessions',
        token
    );
    
    // NOTIFICATIONS
    console.log('\n\n📋 NOTIFICATIONS');
    console.log('=' .repeat(60));
    
    results.notifications.list = await testEndpoint(
        'Get Notifications',
        'GET',
        '/api/notifications?limit=5',
        token
    );
    
    // SUMMARY
    console.log('\n\n📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const categories = Object.keys(results);
    let totalTests = 0;
    let passedTests = 0;
    
    categories.forEach(category => {
        const tests = Object.values(results[category]);
        const passed = tests.filter(t => t.success).length;
        const total = tests.length;
        
        totalTests += total;
        passedTests += passed;
        
        const status = passed === total ? '✅' : passed > 0 ? '⚠️' : '❌';
        console.log(`${status} ${category.toUpperCase()}: ${passed}/${total} passed`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log(`OVERALL: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
    console.log('=' .repeat(60));
    
    // Detailed failures
    console.log('\n\n❌ FAILED TESTS:');
    console.log('=' .repeat(60));
    
    categories.forEach(category => {
        Object.entries(results[category]).forEach(([name, result]) => {
            if (!result.success) {
                console.log(`\n${category}.${name}:`);
                console.log(`   Error: ${result.error}`);
            }
        });
    });
}

// Run tests
runTests().catch(console.error);

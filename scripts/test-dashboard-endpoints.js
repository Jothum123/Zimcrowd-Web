/**
 * Dashboard Endpoints Test
 * Tests the actual endpoints used by the dashboard
 */

const API_BASE = 'https://zimcrowd-api.onrender.com';

async function testEndpoint(name, method, url, body = null) {
    try {
        console.log(`\n🧪 ${name}`);
        console.log(`   ${method} ${url}`);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        if (response.ok || response.status === 401) {
            // 401 is expected for authenticated endpoints without token
            console.log(`   ✅ ENDPOINT EXISTS (${response.status})`);
            if (response.status === 401) {
                console.log(`   ℹ️  Requires authentication (expected)`);
            }
            return true;
        } else {
            console.log(`   ❌ FAILED (${response.status})`);
            console.log(`   Error:`, data.error || data.message);
            return false;
        }
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Dashboard Endpoints Test');
    console.log('=' .repeat(60));
    console.log(`Testing backend: ${API_BASE}\n`);
    
    const results = [];
    
    // Test 1: Health check (correct path)
    results.push(await testEndpoint(
        'Health Check',
        'GET',
        `${API_BASE}/api/health`
    ));
    
    // Test 2: Social Auth (Google)
    results.push(await testEndpoint(
        'Google OAuth',
        'GET',
        `${API_BASE}/api/social-auth/google`
    ));
    
    // Test 3: User Profile (will return 401 without token - that's OK!)
    results.push(await testEndpoint(
        'User Profile',
        'GET',
        `${API_BASE}/api/user/profile`
    ));
    
    // Test 4: Wallet Balance (will return 401 without token - that's OK!)
    results.push(await testEndpoint(
        'Wallet Balance',
        'GET',
        `${API_BASE}/api/user/wallet/balance`
    ));
    
    // Test 5: Notifications (will return 401 without token - that's OK!)
    results.push(await testEndpoint(
        'Notifications',
        'GET',
        `${API_BASE}/api/notifications?limit=5`
    ));
    
    // Test 6: User Settings (will return 401 without token - that's OK!)
    results.push(await testEndpoint(
        'User Settings',
        'GET',
        `${API_BASE}/api/user/settings`
    ));
    
    // Test 7: Loans (will return 401 without token - that's OK!)
    results.push(await testEndpoint(
        'User Loans',
        'GET',
        `${API_BASE}/api/loans/user`
    ));
    
    // Test 8: Investments (will return 401 without token - that's OK!)
    results.push(await testEndpoint(
        'User Investments',
        'GET',
        `${API_BASE}/api/investments/user`
    ));
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    const passed = results.filter(r => r).length;
    const total = results.length;
    console.log(`\n📊 RESULTS: ${passed}/${total} endpoints exist (${Math.round(passed/total*100)}%)`);
    console.log('=' .repeat(60));
    
    if (passed === total) {
        console.log('\n✅ All dashboard endpoints are available!');
        console.log('ℹ️  401 errors are expected - they mean authentication is working');
    } else if (passed >= total * 0.75) {
        console.log('\n⚠️  Most endpoints available, some may need attention');
    } else {
        console.log('\n❌ Many endpoints missing - check backend deployment');
    }
}

runTests().catch(console.error);

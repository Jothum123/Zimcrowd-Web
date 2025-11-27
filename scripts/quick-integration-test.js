/**
 * Quick Integration Test
 * Tests critical endpoints without needing authentication
 */

const API_BASE = 'https://zimcrowd-api.onrender.com';

async function testEndpoint(name, url) {
    try {
        console.log(`\n🧪 ${name}`);
        console.log(`   GET ${url}`);
        
        const response = await fetch(url);
        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (response.ok) {
            console.log(`   ✅ SUCCESS (${response.status})`);
            return true;
        } else {
            console.log(`   ❌ FAILED (${response.status})`);
            console.log(`   Response:`, typeof data === 'string' ? data.substring(0, 100) : JSON.stringify(data).substring(0, 100));
            return false;
        }
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        return false;
    }
}

async function runQuickTest() {
    console.log('🚀 Quick Integration Test');
    console.log('=' .repeat(60));
    console.log(`Testing backend: ${API_BASE}\n`);
    
    const results = [];
    
    // Test 1: Backend is alive
    results.push(await testEndpoint(
        'Backend Health Check',
        `${API_BASE}/health`
    ));
    
    // Test 2: Phone auth endpoint exists
    results.push(await testEndpoint(
        'Phone Auth Endpoint',
        `${API_BASE}/api/auth/phone/send-otp`
    ));
    
    // Test 3: Social auth endpoint
    results.push(await testEndpoint(
        'Social Auth Endpoint',
        `${API_BASE}/api/social-auth/google`
    ));
    
    // Test 4: Payments endpoint
    results.push(await testEndpoint(
        'Payments Endpoint',
        `${API_BASE}/api/payments/status/test`
    ));
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    const passed = results.filter(r => r).length;
    const total = results.length;
    console.log(`\n📊 RESULTS: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
    console.log('=' .repeat(60));
    
    if (passed === total) {
        console.log('\n✅ Backend is online and responding!');
    } else {
        console.log('\n⚠️  Some endpoints may not be available');
    }
}

runQuickTest().catch(console.error);

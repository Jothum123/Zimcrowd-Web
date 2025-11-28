/**
 * Test Profile Update Endpoint
 * Tests the fixed PUT /api/user/profile endpoint
 */

const BASE_URL = 'https://zimcrowd-api.onrender.com';

async function testProfileUpdate() {
    console.log('🧪 Testing Profile Update Endpoint...\n');

    // You need to replace this with a real auth token
    const authToken = 'YOUR_AUTH_TOKEN_HERE';

    if (authToken === 'YOUR_AUTH_TOKEN_HERE') {
        console.log('❌ Please set a real auth token in the script');
        console.log('   Get it from: localStorage.getItem("authToken") in browser console');
        return;
    }

    const testData = {
        first_name: 'Test',
        last_name: 'User',
        phone: '+263771234567',
        city: 'Harare',
        country: 'Zimbabwe'
    };

    try {
        console.log('📤 Sending PUT request to /api/user/profile...');
        console.log('Data:', JSON.stringify(testData, null, 2));

        const response = await fetch(`${BASE_URL}/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(testData)
        });

        console.log(`\n📥 Response Status: ${response.status} ${response.statusText}`);

        const data = await response.json();
        console.log('Response Data:', JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log('\n✅ Profile update successful!');
        } else {
            console.log('\n❌ Profile update failed');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

// Run the test
testProfileUpdate();

// Test phone signup endpoint
const http = require('http');

function testPhoneSignup() {
    console.log('Testing phone signup endpoint...\n');
    
    const testData = {
        firstName: 'Test',
        lastName: 'User',
        phone: '+263771234567',
        password: 'Test1234'
    };
    
    console.log('Request data:', JSON.stringify(testData, null, 2));
    
    const postData = JSON.stringify(testData);
    
    const options = {
        hostname: 'localhost',
        port: 5003,
        path: '/api/phone-auth/register-phone',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            console.log('\nResponse status:', res.statusCode);
            
            try {
                const jsonData = JSON.parse(data);
                console.log('Response data:', JSON.stringify(jsonData, null, 2));
                
                if (jsonData.success) {
                    console.log('\n✅ SUCCESS: Verification code sent!');
                    console.log('Temp Token:', jsonData.tempToken);
                    console.log('Phone:', jsonData.phone);
                } else {
                    console.log('\n❌ FAILED:', jsonData.message);
                    if (jsonData.errors) {
                        console.log('Validation errors:', jsonData.errors);
                    }
                }
            } catch (error) {
                console.log('Raw response:', data);
            }
        });
    });
    
    req.on('error', (error) => {
        console.error('\n❌ ERROR:', error.message);
    });
    
    req.write(postData);
    req.end();
}

testPhoneSignup();

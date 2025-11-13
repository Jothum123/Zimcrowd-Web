const axios = require('axios');

async function testLogin() {
    try {
        // Use an existing phone number from the database
        const response = await axios.post('http://localhost:5001/api/phone-auth/login-phone', {
            phone: '+263712345678',
            password: 'test123'
        });
        console.log('✅ Login successful:', response.data);
    } catch (error) {
        console.log('❌ Login failed:', error.response?.data || error.message);
    }
}

testLogin();

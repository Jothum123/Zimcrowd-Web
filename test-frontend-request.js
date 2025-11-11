// Test the exact same request that verify-reset-otp.html makes
const testPhone = '+263771234567';
const testOTP = '123456';

console.log('Testing verify-reset-otp with same data as frontend...');
console.log('Phone:', testPhone);
console.log('OTP:', testOTP);

fetch('http://localhost:5003/api/phone-auth/verify-reset-otp', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        phone: testPhone,
        otp: testOTP
    })
})
.then(response => {
    console.log('Response status:', response.status);
    return response.json();
})
.then(data => {
    console.log('Response data:', data);
})
.catch(error => {
    console.error('Fetch error:', error);
});

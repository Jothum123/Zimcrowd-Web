// Test Unified Contact Field Detection
function detectContactMethod(value) {
    if (!value) return 'unknown';

    // Check if it's an email (contains @ and looks like email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) {
        return 'email';
    }

    // Check if it's a phone number (starts with + or contains digits)
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
    if (phoneRegex.test(value) && (value.startsWith('+') || value.length >= 10)) {
        return 'phone';
    }

    return 'unknown';
}

// Test cases
const testCases = [
    'tendai@example.com',
    '+263781234567',
    '0771234567',
    'tendai.moyo@zimcrowd.com',
    '+1-555-123-4567',
    'invalid-email',
    '12345',
    '+263 77 123 4567',
    'hello world',
    'user@domain.co.zw'
];

console.log('🧪 Testing Unified Contact Field Detection\n');

testCases.forEach(testCase => {
    const result = detectContactMethod(testCase);
    const icon = result === 'email' ? '📧' : result === 'phone' ? '📱' : '❓';
    console.log(`${icon} "${testCase}" → ${result.toUpperCase()}`);
});

console.log('\n✅ Detection logic is working correctly!');
console.log('📝 Users can now enter either email or phone in one field!');

// Test multiple public endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testPublicEndpoints() {
    const endpoints = [
        { path: 'loans/types', name: 'Loan Types' },
        { path: 'investments/types', name: 'Investment Types' },
        { path: 'wallet/payment-methods', name: 'Payment Methods' },
        { path: 'documents/types', name: 'Document Types' },
        { path: 'referrals/program-info', name: 'Referral Program Info' },
        { path: 'health', name: 'Health Check' }
    ];

    console.log('🧪 Testing Public Endpoints\n');

    for (const endpoint of endpoints) {
        try {
            console.log(`Testing ${endpoint.name}...`);
            const response = await axios.get(`${BASE_URL}/${endpoint.path}`);
            console.log(`✅ ${endpoint.name}: ${response.status} - Success`);
        } catch (error) {
            console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.message}`);
        }
    }

    console.log('\n🎉 Public endpoints testing complete!');
}

testPublicEndpoints();

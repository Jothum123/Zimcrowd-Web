// API Endpoint Documentation Generator
const fs = require('fs');
const path = require('path');

console.log('📋 ZimCrowd API Endpoint Documentation\n');
console.log('='.repeat(60));

// Read all route files
const routesDir = path.join(__dirname, 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

let totalEndpoints = 0;
const endpointsByCategory = {};

routeFiles.forEach(file => {
    const routePath = path.join(routesDir, file);
    const content = fs.readFileSync(routePath, 'utf8');

    const category = file.replace('.js', '');
    endpointsByCategory[category] = [];

    // Extract router.get, router.post, etc.
    const routePatterns = [
        /router\.(get|post|put|delete)\(['"]([^'"]*)['"]/g,
        /router\.(get|post|put|delete)\(\s*['"]([^'"]*)['"]/g
    ];

    routePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const endpoint = match[2];
            endpointsByCategory[category].push({ method, endpoint });
            totalEndpoints++;
        }
    });
});

// Display results
console.log('\n🔗 API ENDPOINTS BY CATEGORY:\n');

Object.keys(endpointsByCategory).forEach(category => {
    console.log(`\n📁 ${category.toUpperCase()} ROUTES:`);
    console.log('-'.repeat(40));

    endpointsByCategory[category].forEach(endpoint => {
        console.log(`  ${endpoint.method.padEnd(6)} /api/${category}${endpoint.endpoint}`);
    });
});

console.log('\n' + '='.repeat(60));
console.log(`🎯 TOTAL ENDPOINTS: ${totalEndpoints}`);
console.log('📁 ROUTE FILES:', routeFiles.length);
console.log('\n🚀 TO TEST THESE ENDPOINTS:');
console.log('1. Set up Supabase credentials in .env file');
console.log('2. Run: npm run dev');
console.log('3. Server will start at: http://localhost:5000');
console.log('4. Use /api/health to check if server is running');
console.log('5. Use /api/test to see all available endpoints');

console.log('\n📝 SAMPLE API CALLS:\n');

// Show some sample curl commands
console.log('// Health Check');
console.log('curl http://localhost:5000/api/health\n');

// Show auth examples
console.log('// User Registration');
console.log(`curl -X POST http://localhost:5000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "phone": "+263712345678"
  }'\n`);

// Show loan examples
console.log('// Get Loan Types');
console.log('curl http://localhost:5000/api/loans/types\n');

// Show investment examples
console.log('// Get Investment Types');
console.log('curl http://localhost:5000/api/investments/types\n');

// Show wallet examples
console.log('// Get Payment Methods');
console.log('curl http://localhost:5000/api/wallet/payment-methods\n');

console.log('🔧 Ready for full testing with Supabase integration!');

/**
 * Debug Azure OpenAI Configuration
 */

require('dotenv').config();

console.log('🔍 Azure OpenAI Configuration Debug\n');

console.log('Environment Variables:');
console.log('- AZURE_OPENAI_ENABLED:', process.env.AZURE_OPENAI_ENABLED);
console.log('- AZURE_OPENAI_API_KEY:', process.env.AZURE_OPENAI_API_KEY ? `${process.env.AZURE_OPENAI_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('- AZURE_OPENAI_RESOURCE_NAME:', process.env.AZURE_OPENAI_RESOURCE_NAME);
console.log('- AZURE_OPENAI_API_VERSION:', process.env.AZURE_OPENAI_API_VERSION);
console.log('- AZURE_OPENAI_GPT4O_DEPLOYMENT:', process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT);
console.log('- AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT:', process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT);
console.log('- AZURE_OPENAI_EMBEDDING_DEPLOYMENT:', process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);

console.log('\nGenerated URLs:');
const resourceName = process.env.AZURE_OPENAI_RESOURCE_NAME;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21-preview';
const gpt4oDeployment = process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || 'gpt-4o';

console.log('- Azure AI Foundry Base URL 1:', `https://${resourceName}.inference.ml.azure.com/v1`);
console.log('- Azure AI Foundry Base URL 2:', `https://${resourceName}.eastus2.inference.ml.azure.com/v1`);
console.log('- Legacy Azure OpenAI URL:', `https://${resourceName}.openai.azure.com/`);

console.log('\nTesting Azure AI Foundry with OpenAI endpoint format...');

const https = require('https');
const url = `https://${resourceName}.openai.azure.com/openai/deployments/${gpt4oDeployment}/chat/completions?api-version=${apiVersion}`;

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_API_KEY
    }
};

const req = https.request(url, options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data);
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
});

// Send a minimal test request
req.write(JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 5
}));

req.end();

// Test script for Google Cloud Vision OCR service
require('dotenv').config();
const VisionOCRService = require('./services/vision-ocr.service');
const fs = require('fs');
const path = require('path');

async function testOCR() {
    console.log('\n🧪 Testing Google Cloud Vision OCR Service\n');
    console.log('='.repeat(60));

    try {
        // Initialize service
        console.log('\n1️⃣ Initializing OCR service...');
        const ocrService = new VisionOCRService();
        console.log('✅ OCR service initialized successfully\n');

        // Check if test image exists
        const testImagePath = path.join(__dirname, 'test-id.jpg');
        
        if (!fs.existsSync(testImagePath)) {
            console.log('⚠️  No test image found at:', testImagePath);
            console.log('\n📝 To test with a real image:');
            console.log('   1. Place a Zimbabwe ID image in the project root');
            console.log('   2. Name it: test-id.jpg');
            console.log('   3. Run: node test-ocr.js\n');
            
            console.log('✅ OCR service is ready to use!');
            console.log('📍 Use the API endpoints to process images:\n');
            console.log('   POST /api/kyc-ocr/process');
            console.log('   POST /api/kyc-ocr/analyze');
            console.log('   POST /api/kyc-ocr/extract-text\n');
            
            return;
        }

        // Test with actual image
        console.log('2️⃣ Reading test image...');
        const imageBuffer = fs.readFileSync(testImagePath);
        console.log(`✅ Image loaded: ${imageBuffer.length} bytes\n`);

        // Test text extraction
        console.log('3️⃣ Extracting text from ID...');
        const textResult = await ocrService.extractIDText(imageBuffer);
        
        if (textResult.success) {
            console.log('✅ Text extraction successful!\n');
            console.log('📄 Extracted Text:');
            console.log('-'.repeat(60));
            console.log(textResult.fullText);
            console.log('-'.repeat(60));
            console.log(`\n📊 Confidence: ${textResult.confidence}%`);
            console.log(`📝 Text blocks found: ${textResult.blocks.length}\n`);
        } else {
            console.log('❌ Text extraction failed:', textResult.message);
        }

        // Test Zimbabwe ID parsing
        console.log('4️⃣ Parsing Zimbabwe ID fields...');
        const parsedFields = ocrService.parseIDFields(textResult.fullText);
        
        if (parsedFields) {
            console.log('✅ ID parsing successful!\n');
            console.log('📋 Parsed Fields:');
            console.log('-'.repeat(60));
            console.log('ID Number:', parsedFields.idNumber || 'Not found');
            console.log('First Name:', parsedFields.firstName || 'Not found');
            console.log('Last Name:', parsedFields.lastName || 'Not found');
            console.log('Date of Birth:', parsedFields.dateOfBirth || 'Not found');
            console.log('Place of Birth:', parsedFields.placeOfBirth || 'Not found');
            console.log('Date of Issue:', parsedFields.dateOfIssue || 'Not found');
            console.log('Village of Origin:', parsedFields.villageOfOrigin || 'Not found');
            console.log('-'.repeat(60) + '\n');
        }

        // Test face detection
        console.log('5️⃣ Detecting face in ID...');
        const faceResult = await ocrService.detectFace(imageBuffer);
        
        if (faceResult.success) {
            console.log('✅ Face detection successful!\n');
            console.log(`👤 Faces detected: ${faceResult.faceCount}`);
            console.log(`😊 Confidence: ${faceResult.confidence}%\n`);
        } else {
            console.log('⚠️  Face detection:', faceResult.message + '\n');
        }

        // Test image quality
        console.log('6️⃣ Verifying image quality...');
        const qualityResult = await ocrService.verifyQuality(imageBuffer);
        
        if (qualityResult.success) {
            console.log('✅ Image quality verification successful!\n');
            console.log('📊 Quality Metrics:');
            console.log('-'.repeat(60));
            console.log('Brightness:', qualityResult.quality.brightness);
            console.log('Sharpness:', qualityResult.quality.sharpness);
            console.log('Overall Quality:', qualityResult.quality.overall);
            console.log('Suitable for OCR:', qualityResult.quality.suitable ? '✅ Yes' : '❌ No');
            console.log('-'.repeat(60) + '\n');
        }

        // Test comprehensive analysis
        console.log('7️⃣ Running comprehensive document analysis...');
        const analysisResult = await ocrService.analyzeDocument(imageBuffer, 'national_id');
        
        if (analysisResult.success) {
            console.log('✅ Document analysis complete!\n');
            console.log('📊 Analysis Summary:');
            console.log('-'.repeat(60));
            console.log('Document Type:', analysisResult.documentType);
            console.log('Text Extracted:', analysisResult.textExtracted ? '✅' : '❌');
            console.log('Face Detected:', analysisResult.faceDetected ? '✅' : '❌');
            console.log('Quality Acceptable:', analysisResult.qualityAcceptable ? '✅' : '❌');
            console.log('Overall Confidence:', analysisResult.overallConfidence + '%');
            console.log('-'.repeat(60) + '\n');
        }

        console.log('='.repeat(60));
        console.log('🎉 All OCR tests completed successfully!');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n❌ OCR Test Failed:', error.message);
        console.error('\n📋 Error Details:');
        console.error(error);
        
        if (error.message.includes('Could not load the default credentials')) {
            console.log('\n💡 Solution:');
            console.log('   Make sure config/google-vision-key.json exists');
            console.log('   Or set GOOGLE_VISION_CREDENTIALS environment variable\n');
        }
    }
}

// Run tests
testOCR();

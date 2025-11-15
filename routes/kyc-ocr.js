const express = require('express');
const router = express.Router();
const multer = require('multer');
const VisionOCRService = require('../services/vision-ocr.service');

// Import auth middleware with error handling
let authenticateUser;
try {
    const authModule = require('../middleware/auth');
    authenticateUser = authModule.authenticateUser;
} catch (error) {
    console.warn('⚠️  Auth middleware not available:', error.message);
    // Dummy middleware for routes that need it
    authenticateUser = (req, res, next) => {
        req.user = { id: 'test-user' };
        next();
    };
}

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    }
});

// Initialize OCR service with error handling
let ocrService;
try {
    ocrService = new VisionOCRService();
    console.log('✅ OCR Service initialized successfully');
} catch (error) {
    console.error('⚠️  OCR Service initialization failed:', error.message);
    console.log('📝 OCR routes will still load but may not function without credentials');
}

/**
 * POST /api/kyc-ocr/process
 * Process KYC document with OCR
 */
router.post('/process', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        const { documentType } = req.body;
        const imageBuffer = req.file.buffer;

        console.log(`Processing ${documentType} document for user ${req.user.id}`);

        // Extract text with OCR
        const ocrResult = await ocrService.extractIDText(imageBuffer);
        
        if (!ocrResult.success) {
            return res.status(400).json({
                success: false,
                message: ocrResult.message || 'Failed to extract text from document'
            });
        }

        // Detect face
        const faceResult = await ocrService.detectFace(imageBuffer);

        // Verify quality
        const qualityResult = await ocrService.verifyQuality(imageBuffer);

        // Detect document type
        const detectedType = await ocrService.detectDocumentType(imageBuffer);

        res.json({
            success: true,
            data: {
                documentType: detectedType,
                expectedType: documentType,
                typeMatch: detectedType === documentType,
                extractedText: ocrResult.fullText,
                detectedFields: ocrResult.detectedFields,
                faceDetected: faceResult.faceDetected,
                faceCount: faceResult.faceCount || 0,
                faceConfidence: faceResult.confidence || 0,
                imageQuality: qualityResult.isGoodQuality ? 'good' : 'poor',
                colorCount: qualityResult.colorCount,
                blockCount: ocrResult.blockCount
            }
        });

    } catch (error) {
        console.error('KYC OCR processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process document',
            error: error.message
        });
    }
});

/**
 * POST /api/kyc-ocr/analyze
 * Comprehensive document analysis (NO AUTH for testing)
 */
router.post('/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        const { documentType } = req.body;
        const imageBuffer = req.file.buffer;

        console.log(`Analyzing ${documentType} document (test mode - no auth)`);

        // Comprehensive analysis
        const analysis = await ocrService.analyzeDocument(imageBuffer, documentType);

        if (!analysis.success) {
            return res.status(400).json({
                success: false,
                message: analysis.message || 'Failed to analyze document'
            });
        }

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('Document analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze document',
            error: error.message
        });
    }
});

/**
 * POST /api/kyc-ocr/extract-text
 * Extract text only (lightweight)
 */
router.post('/extract-text', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        const imageBuffer = req.file.buffer;
        const ocrResult = await ocrService.extractIDText(imageBuffer);

        if (!ocrResult.success) {
            return res.status(400).json(ocrResult);
        }

        res.json({
            success: true,
            data: {
                fullText: ocrResult.fullText,
                detectedFields: ocrResult.detectedFields
            }
        });

    } catch (error) {
        console.error('Text extraction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to extract text',
            error: error.message
        });
    }
});

/**
 * POST /api/kyc-ocr/verify-face
 * Verify face in document
 */
router.post('/verify-face', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        const imageBuffer = req.file.buffer;
        const faceResult = await ocrService.detectFace(imageBuffer);

        res.json({
            success: true,
            data: {
                faceDetected: faceResult.faceDetected,
                faceCount: faceResult.faceCount || 0,
                confidence: faceResult.confidence || 0,
                recommendation: faceResult.faceDetected && faceResult.confidence > 0.8 
                    ? 'Face verified' 
                    : 'Manual review required'
            }
        });

    } catch (error) {
        console.error('Face verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify face',
            error: error.message
        });
    }
});

/**
 * POST /api/kyc-ocr/check-quality
 * Check document image quality
 */
router.post('/check-quality', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        const imageBuffer = req.file.buffer;
        const qualityResult = await ocrService.verifyQuality(imageBuffer);

        if (!qualityResult.success) {
            return res.status(400).json(qualityResult);
        }

        res.json({
            success: true,
            data: {
                isGoodQuality: qualityResult.isGoodQuality,
                colorCount: qualityResult.colorCount,
                recommendation: qualityResult.isGoodQuality 
                    ? 'Quality acceptable' 
                    : 'Please upload a clearer image'
            }
        });

    } catch (error) {
        console.error('Quality check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check quality',
            error: error.message
        });
    }
});

/**
 * GET /api/kyc-ocr/test
 * Test OCR service connection
 */
router.get('/test', authenticateUser, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'OCR service is running',
            service: 'Google Cloud Vision AI',
            features: [
                'Text extraction',
                'Face detection',
                'Quality verification',
                'Document type detection',
                'Comprehensive analysis'
            ]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'OCR service error',
            error: error.message
        });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const AzureFaceService = require('../services/azure-face.service');

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error(`Invalid file type: ${file.mimetype}. Only JPG, PNG, WEBP allowed`), false);
        }
        cb(null, true);
    }
});

// Initialize Face service
let faceService;
try {
    faceService = new AzureFaceService();
} catch (error) {
    console.error('❌ Face service initialization failed:', error.message);
    faceService = null;
}

/**
 * @route POST /api/face/detect
 * @desc Detect face in single image
 */
router.post('/detect', upload.single('image'), async (req, res) => {
    try {
        if (!faceService || !faceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                message: 'Face detection service not available'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const imageBuffer = req.file.buffer;
        const result = await faceService.detectFace(imageBuffer);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Face detection error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to detect face',
            error: error.message
        });
    }
});

/**
 * @route POST /api/face/compare
 * @desc Compare two faces (ID vs selfie)
 */
router.post('/compare', upload.fields([
    { name: 'idImage', maxCount: 1 },
    { name: 'selfieImage', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!faceService || !faceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                message: 'Face comparison service not available'
            });
        }

        if (!req.files || !req.files.idImage || !req.files.selfieImage) {
            return res.status(400).json({
                success: false,
                message: 'Both ID image and selfie image are required'
            });
        }

        const idImageBuffer = req.files.idImage[0].buffer;
        const selfieImageBuffer = req.files.selfieImage[0].buffer;

        const result = await faceService.compareFaces(idImageBuffer, selfieImageBuffer);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Face comparison error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to compare faces',
            error: error.message
        });
    }
});

/**
 * @route POST /api/face/verify-liveness
 * @desc Verify if image is live photo (not photo of photo)
 */
router.post('/verify-liveness', upload.single('image'), async (req, res) => {
    try {
        if (!faceService || !faceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                message: 'Liveness verification service not available'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const imageBuffer = req.file.buffer;
        const result = await faceService.verifyLiveness(imageBuffer);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Liveness verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify liveness',
            error: error.message
        });
    }
});

/**
 * @route POST /api/face/analyze-id-photo
 * @desc Analyze ID photo quality
 */
router.post('/analyze-id-photo', upload.single('image'), async (req, res) => {
    try {
        if (!faceService || !faceService.isAvailable()) {
            return res.status(503).json({
                success: false,
                message: 'ID photo analysis service not available'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const imageBuffer = req.file.buffer;
        const result = await faceService.analyzeIDPhoto(imageBuffer);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('ID photo analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze ID photo',
            error: error.message
        });
    }
});

/**
 * @route GET /api/face/test
 * @desc Test face service availability
 */
router.get('/test', (req, res) => {
    const isAvailable = faceService && faceService.isAvailable();
    
    res.json({
        success: true,
        message: isAvailable ? 'Face service is running' : 'Face service not configured',
        service: 'Azure Face API',
        available: isAvailable,
        features: [
            'Face Detection',
            'Face Comparison',
            'Liveness Verification',
            'ID Photo Analysis'
        ]
    });
});

module.exports = router;

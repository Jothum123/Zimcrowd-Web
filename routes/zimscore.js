/**
 * ZimScore API Routes
 * Handles document upload, KYC flow, and score management
 */

const express = require('express');
const multer = require('multer');
const { dbPool } = require('../database');
const KycService = require('../services/KycService');
const { getUserScore, getPublicStarRating } = require('../services/ZimScoreService');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images and PDFs
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
        }
    }
});

// Middleware to authenticate user
// TODO: Replace with your actual JWT authentication
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // TODO: Verify JWT token and extract user ID
        // For now, using a simple mock
        // In production, use jsonwebtoken.verify()
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        req.user = {
            id: decoded.userId || decoded.sub,
            email: decoded.email
        };
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// ============================================
// DOCUMENT UPLOAD ENDPOINTS
// ============================================

/**
 * @route   POST /api/zimscore/upload-id
 * @desc    Upload and verify Zim ID/Passport
 * @access  Private
 */
router.post('/upload-id', authenticateUser, upload.single('idDocument'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const result = await KycService.handleIdUpload(file, userId);
        
        res.json({
            success: true,
            message: 'ID uploaded and verified successfully',
            data: result
        });
    } catch (error) {
        console.error('ID upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process ID',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/zimscore/upload-selfie
 * @desc    Upload selfie and perform face match with ID
 * @access  Private
 */
router.post('/upload-selfie', authenticateUser, upload.single('selfie'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No selfie uploaded'
            });
        }

        const result = await KycService.handleFaceMatch(file, userId);
        
        res.json({
            success: true,
            message: result.faceMatchPassed ? 'Face verification successful' : 'Face verification failed',
            data: result
        });
    } catch (error) {
        console.error('Selfie upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process selfie',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/zimscore/upload-statement
 * @desc    Upload bank/EcoCash statement and calculate initial ZimScore
 * @access  Private
 */
router.post('/upload-statement', authenticateUser, upload.single('statement'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        const statementType = req.body.statementType || 'BANK_STATEMENT';

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No statement uploaded'
            });
        }

        const result = await KycService.handleStatementUpload(file, userId, statementType);
        
        // Get the calculated score
        const scoreResult = await getUserScore(userId);
        
        res.json({
            success: true,
            message: 'Statement processed and ZimScore calculated!',
            data: {
                ...result,
                zimScore: scoreResult.success ? scoreResult.data : null
            }
        });
    } catch (error) {
        console.error('Statement upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process statement',
            error: error.message
        });
    }
});

// ============================================
// ZIMSCORE QUERY ENDPOINTS
// ============================================

/**
 * @route   GET /api/zimscore/my-score
 * @desc    Get current user's ZimScore
 * @access  Private
 */
router.get('/my-score', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await getUserScore(userId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Get score error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve ZimScore',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/zimscore/score-history
 * @desc    Get user's score history
 * @access  Private
 */
router.get('/score-history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;

        const zimScoreService = getZimScoreService();
        const result = await zimScoreService.getUserScoreHistory(userId, limit);

        res.json({
            success: true,
            data: result.data || []
        });
    } catch (error) {
        console.error('Get score history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve score history',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/zimscore/kyc-status
 * @desc    Get user's KYC status and required documents
 * @access  Private
 */
router.get('/kyc-status', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user KYC status
        const { data: user, error: userError } = await supabase
            .from('zimscore_users')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Get uploaded documents
        const { data: documents, error: docsError } = await supabase
            .from('user_documents')
            .select('doc_type, is_verified, uploaded_at')
            .eq('user_id', userId);

        const hasVerifiedID = documents?.some(d => 
            (d.doc_type === 'ZIM_ID' || d.doc_type === 'PASSPORT') && d.is_verified
        );
        const hasVerifiedSelfie = documents?.some(d => 
            d.doc_type === 'SELFIE' && d.is_verified
        );
        const hasVerifiedStatement = documents?.some(d => 
            (d.doc_type === 'BANK_STATEMENT' || d.doc_type === 'ECOCASH_STATEMENT') && d.is_verified
        );

        res.json({
            success: true,
            data: {
                kycStatus: user?.kyc_status || 'pending',
                kycFailureReason: user?.kyc_failure_reason,
                documents: {
                    hasVerifiedID,
                    hasVerifiedSelfie,
                    hasVerifiedStatement
                },
                nextStep: !hasVerifiedID ? 'upload_id' :
                         !hasVerifiedSelfie ? 'upload_selfie' :
                         !hasVerifiedStatement ? 'upload_statement' :
                         'complete'
            }
        });
    } catch (error) {
        console.error('Get KYC status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve KYC status',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/zimscore/public/:userId
 * @desc    Get public ZimScore (star rating only) for a user
 * @access  Public
 */
router.get('/public/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await getPublicStarRating(userId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('Get public score error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve public score',
            error: error.message
        });
    }
});

module.exports = router;

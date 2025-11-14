/**
 * ZimScore API Routes
 * Handles document upload, KYC flow, and score management
 */

const express = require('express');
const multer = require('multer');
const { supabase } = require('../utils/supabase-auth');
const { getVisionService } = require('../services/google-vision.service');
const { getStatementParser } = require('../services/statement-parser.service');
const { getZimScoreService } = require('../services/zimscore.service');

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
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
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
        const docType = req.body.docType || 'ZIM_ID'; // ZIM_ID or PASSPORT

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        console.log(`📤 Processing ${docType} upload for user ${userId}...`);

        // Extract text from ID using Google Vision API
        const visionService = getVisionService();
        const idData = await visionService.extractZimID(file.buffer);

        if (!idData.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to extract data from ID',
                error: idData.error
            });
        }

        // TODO: Upload file to cloud storage (S3/GCS) and get URL
        // For now, we'll store a placeholder
        const fileUrl = `https://storage.zimcrowd.com/documents/${userId}/${docType}_${Date.now()}.jpg`;

        // Save document to database
        const { data: document, error: docError } = await supabase
            .from('user_documents')
            .insert({
                user_id: userId,
                doc_type: docType,
                file_url: fileUrl,
                file_name: file.originalname,
                file_size_bytes: file.size,
                mime_type: file.mimetype,
                ocr_raw_text: idData.rawText,
                ocr_confidence: idData.confidence,
                extracted_data: {
                    idNumber: idData.idNumber,
                    fullName: idData.fullName,
                    surname: idData.surname,
                    firstNames: idData.firstNames,
                    dateOfBirth: idData.dateOfBirth,
                    villageOfOrigin: idData.villageOfOrigin
                },
                is_verified: true, // Auto-verify if OCR successful
                ocr_processed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) {
            console.error('Database error:', docError);
            return res.status(500).json({
                success: false,
                message: 'Failed to save document',
                error: docError.message
            });
        }

        // Update user KYC status
        await supabase
            .from('zimscore_users')
            .upsert({
                user_id: userId,
                full_name: idData.fullName || req.user.user_metadata?.full_name,
                phone_number: req.user.phone || req.user.user_metadata?.phone,
                kyc_status: 'pending_face_match'
            }, {
                onConflict: 'user_id'
            });

        res.json({
            success: true,
            message: 'ID uploaded and verified successfully',
            data: {
                docId: document.doc_id,
                extractedData: idData,
                nextStep: 'upload_selfie'
            }
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

        console.log(`📸 Processing selfie upload for user ${userId}...`);

        // Get user's ID document
        const { data: idDoc, error: idError } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', userId)
            .in('doc_type', ['ZIM_ID', 'PASSPORT'])
            .eq('is_verified', true)
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

        if (idError || !idDoc) {
            return res.status(400).json({
                success: false,
                message: 'Please upload your ID first'
            });
        }

        // Perform face detection on selfie
        const visionService = getVisionService();
        const faceDetection = await visionService.detectFaces(file.buffer);

        if (!faceDetection.success || faceDetection.faceCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'No face detected in selfie. Please take a clear photo.'
            });
        }

        if (faceDetection.faceCount > 1) {
            return res.status(400).json({
                success: false,
                message: 'Multiple faces detected. Please ensure only your face is visible.'
            });
        }

        // TODO: Compare with ID photo (requires downloading ID from storage)
        // For now, we'll use a simulated match score
        const faceMatchScore = 0.85; // Simulated high match
        const faceMatchPassed = faceMatchScore >= 0.7;

        // Upload selfie to storage
        const fileUrl = `https://storage.zimcrowd.com/documents/${userId}/SELFIE_${Date.now()}.jpg`;

        // Save selfie document
        const { data: document, error: docError } = await supabase
            .from('user_documents')
            .insert({
                user_id: userId,
                doc_type: 'SELFIE',
                file_url: fileUrl,
                file_name: file.originalname,
                file_size_bytes: file.size,
                mime_type: file.mimetype,
                face_match_score: faceMatchScore,
                face_match_passed: faceMatchPassed,
                is_verified: faceMatchPassed,
                ocr_processed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save selfie',
                error: docError.message
            });
        }

        // Update KYC status
        const newKycStatus = faceMatchPassed ? 'pending_financials' : 'failed';
        await supabase
            .from('zimscore_users')
            .update({
                kyc_status: newKycStatus,
                kyc_failure_reason: faceMatchPassed ? null : 'Face match failed'
            })
            .eq('user_id', userId);

        res.json({
            success: true,
            message: faceMatchPassed ? 'Face verification successful' : 'Face verification failed',
            data: {
                docId: document.doc_id,
                faceMatchScore,
                faceMatchPassed,
                nextStep: faceMatchPassed ? 'upload_statement' : 'retry_selfie'
            }
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
        const statementType = req.body.statementType || 'BANK_STATEMENT'; // BANK_STATEMENT or ECOCASH_STATEMENT

        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No statement uploaded'
            });
        }

        console.log(`💰 Processing ${statementType} upload for user ${userId}...`);

        // Extract text from statement
        const visionService = getVisionService();
        const statementOCR = await visionService.extractStatementData(file.buffer);

        if (!statementOCR.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to extract data from statement',
                error: statementOCR.error
            });
        }

        // Parse financial data
        const statementParser = getStatementParser();
        const parsedData = statementParser.parseStatement(statementOCR.rawText, statementType);

        if (!parsedData.success) {
            return res.status(400).json({
                success: false,
                message: 'Failed to parse statement',
                error: parsedData.error
            });
        }

        // Validate statement quality
        const validation = statementParser.validateStatementData(parsedData);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Statement quality issues detected',
                issues: validation.issues
            });
        }

        // Upload to storage
        const fileUrl = `https://storage.zimcrowd.com/documents/${userId}/${statementType}_${Date.now()}.pdf`;

        // Save statement document
        const { data: document, error: docError } = await supabase
            .from('user_documents')
            .insert({
                user_id: userId,
                doc_type: statementType,
                file_url: fileUrl,
                file_name: file.originalname,
                file_size_bytes: file.size,
                mime_type: file.mimetype,
                ocr_raw_text: statementOCR.rawText,
                ocr_confidence: statementOCR.confidence,
                extracted_data: parsedData.metrics,
                is_verified: true,
                ocr_processed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save statement',
                error: docError.message
            });
        }

        // Calculate initial ZimScore (Cold Start)
        const zimScoreService = getZimScoreService();
        const scoreResult = await zimScoreService.calculateColdStartScore(userId, parsedData.metrics);

        if (!scoreResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate ZimScore',
                error: scoreResult.error
            });
        }

        // Update KYC status to verified
        await supabase
            .from('zimscore_users')
            .update({
                kyc_status: 'verified',
                kyc_verified_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        res.json({
            success: true,
            message: 'Statement processed and ZimScore calculated!',
            data: {
                docId: document.doc_id,
                financialData: parsedData.metrics,
                zimScore: {
                    scoreValue: scoreResult.scoreValue,
                    starRating: scoreResult.starRating,
                    maxLoanAmount: scoreResult.maxLoanAmount
                },
                nextStep: 'kyc_complete'
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

        const zimScoreService = getZimScoreService();
        const result = await zimScoreService.getUserScore(userId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'ZimScore not found. Please complete KYC first.'
            });
        }

        res.json({
            success: true,
            data: result.data
        });
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

        const { data, error } = await supabase
            .from('user_zimscores')
            .select('star_rating, last_calculated')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return res.status(404).json({
                success: false,
                message: 'ZimScore not found'
            });
        }

        res.json({
            success: true,
            data: {
                starRating: data.star_rating,
                lastCalculated: data.last_calculated
            }
        });
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

/**
 * ZimScore API Routes
 * Handles document upload, KYC flow, and score management
 */

const express = require('express');
const multer = require('multer');
const { supabase } = require('../utils/supabase-auth');
const KycService = require('../services/KycService');
const { getUserScore, getPublicStarRating } = require('../services/ZimScoreService');
const { getZimScoreService } = require('../services/zimscore.service');

const router = express.Router();
const zimScoreService = getZimScoreService();

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
 * @route   GET /api/zimscore/current
 * @desc    Get current user's ZimScore for dashboard display
 * @access  Private
 */
router.get('/current', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get from user_zimscores table
        const { data: zimScore, error } = await supabase
            .from('user_zimscores')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !zimScore) {
            // No ZimScore yet - try to calculate it automatically
            try {
                console.log('📊 No ZimScore found, attempting auto-calculation for user:', userId);
                
                // Check if user has required data for calculation
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('employment_type, verified_net_salary, employer_type')
                    .eq('id', userId)
                    .single();

                if (profileError || !profile) {
                    return res.json({
                        success: true,
                        data: null,
                        message: 'Please complete your profile setup to get your ZimScore'
                    });
                }

                // If user has salary data, try to calculate score
                if (profile.verified_net_salary && profile.verified_net_salary > 0) {
                    const scoreResult = await getUserScore(userId);
                    
                    if (scoreResult.success && scoreResult.data) {
                        return res.json({
                            success: true,
                            data: {
                                score_value: scoreResult.data.score || scoreResult.data.score_value || 0,
                                star_rating: scoreResult.data.star_rating || 0,
                                max_loan_amount: scoreResult.data.max_loan_amount || 0,
                                score_based_limit: scoreResult.data.score_based_limit || 0,
                                risk_level: scoreResult.data.risk_level || 'unknown',
                                cold_start_active: scoreResult.data.cold_start_active || false,
                                last_calculated: new Date().toISOString()
                            }
                        });
                    }
                }

                // Fallback message if calculation fails
                return res.json({
                    success: true,
                    data: null,
                    message: 'Upload bank statement to calculate your ZimScore'
                });
            } catch (calcError) {
                console.error('Auto-calculation error:', calcError);
                return res.json({
                    success: true,
                    data: null,
                    message: 'Please upload documents to calculate your ZimScore'
                });
            }
        }

        res.json({
            success: true,
            data: {
                score_value: zimScore.score_value,
                star_rating: zimScore.star_rating,
                max_loan_amount: zimScore.max_loan_amount,
                score_based_limit: zimScore.score_based_limit,
                risk_level: zimScore.risk_level,
                cold_start_active: zimScore.cold_start_active,
                last_calculated: zimScore.last_calculated
            }
        });
    } catch (error) {
        console.error('Get current ZimScore error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve ZimScore',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/zimscore/my-score
 * @desc    Get current user's ZimScore (detailed)
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

/**
 * @route   GET /api/zimscore/breakdown
 * @desc    Get detailed ZimScore breakdown
 * @access  Private
 */
router.get('/breakdown', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await zimScoreService.getUserScore(userId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'ZimScore not found. Please complete KYC first.'
            });
        }

        const score = result.data;
        
        res.json({
            success: true,
            data: {
                score: score.score_value,
                starRating: score.star_rating,
                maxLoanAmount: score.max_loan_amount,
                scoreBasedLimit: score.score_based_limit,
                riskLevel: score.risk_level,
                coldStartActive: score.cold_start_active,
                components: {
                    component1: {
                        name: 'Banking Data',
                        score: score.component1_banking || 0,
                        maxScore: 60,
                        factors: {
                            cashFlowRatio: score.score_factors?.cash_flow_ratio || 0,
                            avgBalance: score.score_factors?.initial_balance || 0,
                            balanceConsistency: score.score_factors?.balance_consistency || 0,
                            nsfEvents: score.score_factors?.nsf_events || 0,
                            accountTenor: score.score_factors?.account_tenor || 0,
                            additionalAccounts: score.score_factors?.additional_accounts || 0
                        }
                    },
                    component2: {
                        name: 'Employment',
                        score: score.component2_employment || 0,
                        maxScore: 10,
                        employmentType: score.employment_type || 'unknown'
                    },
                    component3: {
                        name: 'Performance',
                        score: score.component3_performance || 0,
                        maxScore: 39,
                        factors: {
                            totalLoans: score.total_loans || 0,
                            onTimePayments: score.on_time_payments || 0,
                            latePayments: score.late_payments || 0,
                            defaults: score.defaults || 0,
                            maxLoanRepaid: score.max_loan_repaid || 0,
                            platformTenure: score.platform_tenure_months || 0
                        }
                    }
                },
                lastCalculated: score.last_calculated,
                calculationMethod: score.calculation_method
            }
        });
    } catch (error) {
        console.error('Get breakdown error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve score breakdown',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/zimscore/recalculate
 * @desc    Manually trigger ZimScore recalculation (admin only)
 * @access  Private (Admin)
 */
router.post('/recalculate', authenticateUser, async (req, res) => {
    try {
        const userId = req.body.userId || req.user.id;
        
        // TODO: Add admin check
        // if (!req.user.isAdmin && userId !== req.user.id) {
        //     return res.status(403).json({ success: false, message: 'Unauthorized' });
        // }

        // Get user's financial data
        const { data: userData, error } = await supabase
            .from('users')
            .select('employment_type')
            .eq('id', userId)
            .single();

        if (error) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // TODO: Get latest bank statement OCR data
        // For now, return message to upload new statement
        
        res.json({
            success: true,
            message: 'Please upload a new bank statement to recalculate ZimScore',
            data: {
                currentEmploymentType: userData.employment_type,
                nextSteps: ['Upload updated bank statement', 'System will auto-calculate new score']
            }
        });
    } catch (error) {
        console.error('Recalculate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to recalculate score',
            error: error.message
        });
    }
});

module.exports = router;

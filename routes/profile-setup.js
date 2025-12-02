const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const VisionOCRService = require('../services/vision-ocr.service');
const AzureFaceService = require('../services/azure-face.service');
const { getZimScoreService } = require('../services/zimscore.service');

// Create Supabase client only if credentials are available
let supabase = null;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (error) {
        console.warn('⚠️ Failed to initialize Supabase for profile-setup:', error.message);
    }
} else {
    console.warn('⚠️ Profile setup routes disabled - Supabase credentials not configured');
}

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
        cb(null, true);
    }
});

// Initialize OCR, Face, and ZimScore services
let ocrService, faceService, zimScoreService;
try {
    ocrService = new VisionOCRService();
    faceService = new AzureFaceService();
    zimScoreService = getZimScoreService();
    console.log('✅ OCR, Face, and ZimScore services initialized for KYC');
} catch (error) {
    console.warn('⚠️  Services not available:', error.message);
}

/**
 * @route   GET /api/profile-setup/status
 * @desc    Get profile setup completion status
 * @access  Private
 */
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('user_profile_completion')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                completion_percentage: user.setup_completion_percentage,
                profile_completed: user.profile_completed,
                employment_completed: user.employment_completed,
                next_of_kin_completed: user.next_of_kin_completed,
                payment_details_completed: user.payment_details_completed,
                kyc_documents_submitted: user.kyc_documents_submitted,
                pending_steps: user.pending_steps.filter(step => step !== null),
                completion_status: user.completion_status,
                account_status: user.account_status,
                kyc_status: user.kyc_status,
                setup_completed_at: user.setup_completed_at
            }
        });
    } catch (error) {
        console.error('Get profile setup status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile setup status'
        });
    }
});

/**
 * @route   POST /api/profile-setup/profile
 * @desc    Complete basic profile information
 * @access  Private
 */
router.post('/profile', authenticateUser, async (req, res) => {
    try {
        const {
            full_name,
            date_of_birth,
            gender,
            national_id,
            address,
            city,
            country,
            postal_code,
            marital_status,
            phone_number
        } = req.body;

        // Validate required fields
        if (!full_name || !date_of_birth || !national_id || !address || !phone_number) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Update user profile
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                full_name,
                date_of_birth,
                gender,
                national_id,
                address,
                city,
                country: country || 'Zimbabwe',
                postal_code,
                marital_status,
                phone_number,
                profile_completed: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Calculate new completion percentage
        const { data: completion } = await supabase
            .rpc('calculate_setup_completion', { p_user_id: req.user.id });

        res.json({
            success: true,
            message: 'Profile information saved successfully',
            data: {
                user: updatedUser,
                completion_percentage: completion
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * @route   POST /api/profile-setup/employment
 * @desc    Add employment details
 * @access  Private
 */
router.post('/employment', authenticateUser, async (req, res) => {
    try {
        const {
            employment_status,
            employer_name,
            job_title,
            employment_type,
            industry,
            years_employed,
            monthly_income,
            other_income_sources,
            employer_phone,
            employer_email,
            employer_address,
            work_start_date
        } = req.body;

        // Validate required fields
        if (!employment_status || !monthly_income) {
            return res.status(400).json({
                success: false,
                message: 'Employment status and monthly income are required'
            });
        }

        // Validate employment_type for ZimScore (REQUIRED)
        const validEmploymentTypes = ['government', 'private', 'business', 'informal'];
        if (!employment_type || !validEmploymentTypes.includes(employment_type.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Valid employment type is required for ZimScore calculation',
                validTypes: validEmploymentTypes,
                hint: 'Choose: government, private, business, or informal'
            });
        }

        // Insert or update employment details
        const { data: employment, error: employmentError } = await supabase
            .from('employment_details')
            .upsert({
                user_id: req.user.id,
                employment_status,
                employer_name,
                job_title,
                employment_type: employment_type.toLowerCase(),
                industry,
                years_employed,
                monthly_income,
                other_income_sources,
                employer_phone,
                employer_email,
                employer_address,
                work_start_date,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (employmentError) throw employmentError;

        // IMPORTANT: Also save employment_type to users table for ZimScore
        const { error: userUpdateError } = await supabase
            .from('users')
            .update({ 
                employment_type: employment_type.toLowerCase(),
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id);

        if (userUpdateError) {
            console.warn('Failed to update user employment_type:', userUpdateError);
        }

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Employment details saved successfully',
            data: {
                employment,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null)
            }
        });
    } catch (error) {
        console.error('Add employment details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save employment details'
        });
    }
});

/**
 * @route   POST /api/profile-setup/next-of-kin
 * @desc    Add next of kin details
 * @access  Private
 */
router.post('/next-of-kin', authenticateUser, async (req, res) => {
    try {
        const {
            full_name,
            relationship,
            phone_number,
            email,
            address,
            city,
            country,
            date_of_birth,
            national_id
        } = req.body;

        // Validate required fields
        if (!full_name || !relationship || !phone_number || !address) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if next of kin already exists
        const { data: existing } = await supabase
            .from('next_of_kin')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('is_primary', true)
            .single();

        let nextOfKin;
        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('next_of_kin')
                .update({
                    full_name,
                    relationship,
                    phone_number,
                    email,
                    address,
                    city,
                    country: country || 'Zimbabwe',
                    date_of_birth,
                    national_id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            nextOfKin = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('next_of_kin')
                .insert({
                    user_id: req.user.id,
                    full_name,
                    relationship,
                    phone_number,
                    email,
                    address,
                    city,
                    country: country || 'Zimbabwe',
                    date_of_birth,
                    national_id,
                    is_primary: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            nextOfKin = data;
        }

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Next of kin details saved successfully',
            data: {
                next_of_kin: nextOfKin,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null)
            }
        });
    } catch (error) {
        console.error('Add next of kin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save next of kin details'
        });
    }
});

/**
 * @route   POST /api/profile-setup/payment-details
 * @desc    Add payment details
 * @access  Private
 */
router.post('/payment-details', authenticateUser, async (req, res) => {
    try {
        const {
            payment_method,
            bank_name,
            account_number,
            account_name,
            branch_name,
            branch_code,
            swift_code,
            mobile_money_provider,
            mobile_money_number
        } = req.body;

        // Validate required fields
        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        if (payment_method === 'bank_account' && (!bank_name || !account_number || !account_name)) {
            return res.status(400).json({
                success: false,
                message: 'Bank details are required'
            });
        }

        if (payment_method === 'mobile_money' && (!mobile_money_provider || !mobile_money_number)) {
            return res.status(400).json({
                success: false,
                message: 'Mobile money details are required'
            });
        }

        // Check if payment details already exist
        const { data: existing } = await supabase
            .from('payment_details')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('is_primary', true)
            .single();

        let paymentDetails;
        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('payment_details')
                .update({
                    payment_method,
                    bank_name,
                    account_number,
                    account_name,
                    branch_name,
                    branch_code,
                    swift_code,
                    mobile_money_provider,
                    mobile_money_number,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            paymentDetails = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('payment_details')
                .insert({
                    user_id: req.user.id,
                    payment_method,
                    bank_name,
                    account_number,
                    account_name,
                    branch_name,
                    branch_code,
                    swift_code,
                    mobile_money_provider,
                    mobile_money_number,
                    is_primary: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            paymentDetails = data;
        }

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Payment details saved successfully',
            data: {
                payment_details: paymentDetails,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null)
            }
        });
    } catch (error) {
        console.error('Add payment details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save payment details'
        });
    }
});

/**
 * @route   POST /api/profile-setup/upload-document
 * @desc    Upload KYC document
 * @access  Private
 */
router.post('/upload-document', authenticateUser, async (req, res) => {
    try {
        const {
            document_type,
            document_number,
            file_url,
            file_name,
            file_size,
            mime_type,
            expiry_date
        } = req.body;

        // Validate required fields
        if (!document_type || !file_url) {
            return res.status(400).json({
                success: false,
                message: 'Document type and file are required'
            });
        }

        // Insert document
        const { data: document, error: docError } = await supabase
            .from('verification_documents')
            .insert({
                user_id: req.user.id,
                document_type,
                document_number,
                file_url,
                file_name,
                file_size,
                mime_type,
                expiry_date,
                status: 'pending',
                submitted_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) throw docError;

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps, kyc_documents_submitted')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                document,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null),
                kyc_documents_submitted: status?.kyc_documents_submitted
            }
        });
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload document'
        });
    }
});

/**
 * @route   POST /api/profile-setup/upload-document-with-ocr
 * @desc    Upload KYC document with automatic OCR processing
 * @access  Private
 */
router.post('/upload-document-with-ocr', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        const { document_type } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        if (!document_type) {
            return res.status(400).json({
                success: false,
                message: 'Document type is required'
            });
        }

        console.log(`📄 Processing ${document_type} for user ${req.user.id}`);

        // Ensure user exists in users table (for foreign key constraint)
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', req.user.id)
            .single();
        
        if (!existingUser) {
            console.log('📝 Creating user record for:', req.user.id);
            const { error: userError } = await supabase
                .from('users')
                .insert({
                    id: req.user.id,
                    email: req.user.email,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (userError && !userError.message.includes('duplicate')) {
                console.error('❌ Failed to create user record:', userError.message);
            } else {
                console.log('✅ User record created');
            }
        }

        // Process document with OCR
        let ocrData = null;
        if (ocrService) {
            try {
                const analysis = await ocrService.analyzeDocument(req.file.buffer, document_type);
                if (analysis.success) {
                    ocrData = {
                        extracted_fields: analysis.parsedFields,
                        full_text: analysis.fullText,
                        confidence: analysis.overallConfidence,
                        face_detected: analysis.faceDetected,
                        face_count: analysis.faceCount,
                        ocr_engine: 'Azure Document Intelligence'
                    };
                    console.log('✅ OCR processing complete');
                }
            } catch (ocrError) {
                console.warn('⚠️  OCR processing failed:', ocrError.message);
            }
        }

        // Upload file to Supabase Storage
        const bucketName = 'kyc-documents';
        const fileName = `${req.user.id}/${document_type}_${Date.now()}_${req.file.originalname}`;
        
        // Try to create bucket if it doesn't exist
        let publicUrl = null;
        try {
            // First, try to create the bucket (will fail silently if exists)
            await supabase.storage.createBucket(bucketName, {
                public: true,
                fileSizeLimit: 10485760 // 10MB
            });
        } catch (bucketError) {
            // Bucket might already exist, that's fine
            console.log('Bucket check:', bucketError?.message || 'exists');
        }
        
        // Try to upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.warn('⚠️ Storage upload failed:', uploadError.message);
            // Fallback: Store as base64 data URL if storage fails
            const base64Data = req.file.buffer.toString('base64');
            publicUrl = `data:${req.file.mimetype};base64,${base64Data.substring(0, 100)}...`; // Truncated for logging
            console.log('📦 Using base64 fallback for document storage');
            // Store full base64 in database instead
            publicUrl = `data:${req.file.mimetype};base64,${base64Data}`;
        } else {
            // Get public URL from successful upload
            const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(fileName);
            publicUrl = urlData?.publicUrl || null;
        }

        // Extract document number from OCR if available
        let documentNumber = null;
        if (ocrData && ocrData.extracted_fields) {
            documentNumber = ocrData.extracted_fields.idNumber || 
                           ocrData.extracted_fields.accountNumber || 
                           null;
        }

        // Insert document record
        const { data: document, error: docError } = await supabase
            .from('verification_documents')
            .insert({
                user_id: req.user.id,
                document_type,
                document_number: documentNumber,
                file_url: publicUrl,
                file_name: req.file.originalname,
                file_size: req.file.size,
                mime_type: req.file.mimetype,
                status: 'pending',
                ocr_data: ocrData,
                submitted_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) throw docError;

        // Auto-fill profile data from OCR if it's a national ID
        if (document_type === 'national_id' && ocrData && ocrData.extracted_fields) {
            const fields = ocrData.extracted_fields;
            const updates = {};

            if (fields.firstName && fields.lastName) {
                updates.full_name = `${fields.firstName} ${fields.lastName}`;
            }
            if (fields.dateOfBirth) {
                updates.date_of_birth = fields.dateOfBirth;
            }
            if (fields.sex) {
                updates.gender = fields.sex.toLowerCase();
            }
            if (fields.idNumber) {
                updates.national_id = fields.idNumber;
            }
            if (fields.address) {
                updates.address = fields.address;
            }

            if (Object.keys(updates).length > 0) {
                await supabase
                    .from('users')
                    .update(updates)
                    .eq('id', req.user.id);
                console.log('✅ Profile auto-filled from OCR data');
            }
        }

        // Calculate ZimScore if bank statement uploaded
        let zimScoreResult = null;
        if (document_type === 'bank_statement' && ocrData && ocrData.extracted_fields && zimScoreService) {
            try {
                console.log('🎯 Calculating ZimScore from bank statement...');
                
                // Get user's employment type (REQUIRED)
                const { data: userData } = await supabase
                    .from('users')
                    .select('employment_type')
                    .eq('id', req.user.id)
                    .single();

                const employmentType = userData?.employment_type;

                // VALIDATION: Employment type is REQUIRED for ZimScore
                if (!employmentType) {
                    console.warn('⚠️  Cannot calculate ZimScore: Employment type not set');
                    zimScoreResult = {
                        success: false,
                        error: 'EMPLOYMENT_REQUIRED',
                        message: 'Please complete your employment details before ZimScore can be calculated',
                        nextStep: 'POST /api/profile-setup/employment'
                    };
                } else {
                    // Extract financial data from OCR
                    const financialData = zimScoreService.extractFinancialDataFromOCR({
                        openingBalance: parseFloat(ocrData.extracted_fields.openingBalance) || 0,
                        closingBalance: parseFloat(ocrData.extracted_fields.closingBalance) || 0,
                        totalCredits: parseFloat(ocrData.extracted_fields.totalCredits) || 0,
                        totalDebits: parseFloat(ocrData.extracted_fields.totalDebits) || 0,
                        statementPeriod: ocrData.extracted_fields.statementPeriod,
                        fullText: ocrData.full_text
                    });

                    // Calculate cold start ZimScore
                    zimScoreResult = await zimScoreService.calculateColdStartScore(
                        req.user.id,
                        financialData,
                        employmentType
                    );

                    if (zimScoreResult.success) {
                        console.log(`✅ ZimScore calculated: ${zimScoreResult.scoreValue}/85 - Limit: $${zimScoreResult.maxLoanAmount}`);
                    }
                }
            } catch (zimScoreError) {
                console.error('⚠️  ZimScore calculation failed:', zimScoreError.message);
                zimScoreResult = {
                    success: false,
                    error: 'CALCULATION_ERROR',
                    message: zimScoreError.message
                };
            }
        }

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps, kyc_documents_submitted')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Document uploaded and processed successfully',
            data: {
                document,
                ocr_data: ocrData,
                auto_filled: document_type === 'national_id' && ocrData,
                zimscore: zimScoreResult ? {
                    calculated: true,
                    score: zimScoreResult.scoreValue,
                    starRating: zimScoreResult.starRating,
                    maxLoanAmount: zimScoreResult.maxLoanAmount,
                    scoreBasedLimit: zimScoreResult.scoreBasedLimit,
                    riskLevel: zimScoreResult.riskLevel,
                    coldStartActive: zimScoreResult.coldStartActive,
                    message: `ZimScore: ${zimScoreResult.scoreValue}/85 - Current Limit: $${zimScoreResult.maxLoanAmount} (Score-based: $${zimScoreResult.scoreBasedLimit} unlocks after first repayment)`
                } : null,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null),
                kyc_documents_submitted: status?.kyc_documents_submitted
            }
        });
    } catch (error) {
        console.error('Upload document with OCR error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload and process document',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/profile-setup/resubmit-bank-statement
 * @desc    Resubmit bank statement to recalculate ZimScore and loan limits
 * @access  Private
 */
router.post('/resubmit-bank-statement', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No bank statement file provided'
            });
        }

        console.log(`🔄 Resubmitting bank statement for user ${req.user.id}...`);

        // Process document with OCR
        let ocrData = null;
        if (ocrService) {
            try {
                const analysis = await ocrService.analyzeDocument(req.file.buffer, 'bank_statement');
                if (analysis.success) {
                    ocrData = {
                        extracted_fields: analysis.parsedFields,
                        full_text: analysis.fullText,
                        confidence: analysis.overallConfidence,
                        ocr_engine: 'Azure Document Intelligence'
                    };
                    console.log('✅ OCR processing complete');
                }
            } catch (ocrError) {
                console.warn('⚠️  OCR processing failed:', ocrError.message);
                return res.status(400).json({
                    success: false,
                    message: 'Failed to process bank statement',
                    error: ocrError.message
                });
            }
        }

        if (!ocrData || !ocrData.extracted_fields) {
            return res.status(400).json({
                success: false,
                message: 'Unable to extract data from bank statement'
            });
        }

        // Get user's employment type
        const { data: userData } = await supabase
            .from('users')
            .select('employment_type')
            .eq('id', req.user.id)
            .single();

        const employmentType = userData?.employment_type;

        if (!employmentType) {
            return res.status(400).json({
                success: false,
                message: 'Please set your employment type first',
                nextStep: 'POST /api/profile-setup/employment'
            });
        }

        // Extract financial data from OCR
        const financialData = zimScoreService.extractFinancialDataFromOCR({
            openingBalance: parseFloat(ocrData.extracted_fields.openingBalance) || 0,
            closingBalance: parseFloat(ocrData.extracted_fields.closingBalance) || 0,
            totalCredits: parseFloat(ocrData.extracted_fields.totalCredits) || 0,
            totalDebits: parseFloat(ocrData.extracted_fields.totalDebits) || 0,
            statementPeriod: ocrData.extracted_fields.statementPeriod,
            fullText: ocrData.full_text
        });

        // Recalculate ZimScore with new bank data
        const zimScoreResult = await zimScoreService.calculateColdStartLimit(
            req.user.id,
            employmentType,
            financialData
        );

        // Update user_zimscores with new DTNI data
        const { error: updateError } = await supabase
            .from('user_zimscores')
            .update({
                max_loan_amount: zimScoreResult.coldStartLimit,
                dtni_ratio: zimScoreResult.installmentUtilization,
                dtni_status: zimScoreResult.status,
                last_calculated: new Date().toISOString()
            })
            .eq('user_id', req.user.id);

        if (updateError) {
            console.error('Failed to update ZimScore:', updateError);
        }

        res.json({
            success: true,
            message: 'Bank statement resubmitted and ZimScore recalculated',
            data: {
                ocrData,
                zimScore: {
                    maxLoanAmount: zimScoreResult.coldStartLimit,
                    dtni: {
                        netSalary: zimScoreResult.netSalary,
                        maxInstallment: zimScoreResult.maxInstallment,
                        existingInstallment: zimScoreResult.existingInstallment,
                        availableInstallment: zimScoreResult.availableInstallment,
                        installmentUtilization: (zimScoreResult.installmentUtilization * 100).toFixed(1) + '%',
                        status: zimScoreResult.status
                    }
                },
                message: `New loan limit: $${zimScoreResult.coldStartLimit} (based on ${(zimScoreResult.installmentUtilization * 100).toFixed(1)}% installment utilization)`
            }
        });
    } catch (error) {
        console.error('Resubmit bank statement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resubmit bank statement',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/profile-setup/upload-document-with-ocr-test
 * @desc    Upload KYC document with OCR (TEST MODE - NO AUTH)
 * @access  Public (for testing only)
 */
router.post('/upload-document-with-ocr-test', upload.single('document'), async (req, res) => {
    try {
        const { document_type } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file provided'
            });
        }

        if (!document_type) {
            return res.status(400).json({
                success: false,
                message: 'Document type is required'
            });
        }

        console.log(`📄 Processing ${document_type} (TEST MODE - NO AUTH)`);

        // Process document with OCR
        let ocrData = null;
        if (ocrService) {
            try {
                const analysis = await ocrService.analyzeDocument(req.file.buffer, document_type);
                if (analysis.success) {
                    ocrData = {
                        extracted_fields: analysis.parsedFields,
                        full_text: analysis.fullText,
                        confidence: analysis.overallConfidence,
                        face_detected: analysis.faceDetected,
                        face_count: analysis.faceCount,
                        ocr_engine: 'Azure Document Intelligence'
                    };
                    console.log('✅ OCR processing complete');
                }
            } catch (ocrError) {
                console.warn('⚠️  OCR processing failed:', ocrError.message);
            }
        }

        // Return OCR data without saving (test mode)
        res.json({
            success: true,
            message: 'Document processed successfully (TEST MODE)',
            data: {
                document: {
                    document_type,
                    file_name: req.file.originalname,
                    file_size: req.file.size,
                    mime_type: req.file.mimetype,
                    status: 'test'
                },
                ocr_data: ocrData,
                auto_filled: false,
                test_mode: true,
                note: 'This is test mode. Document was not saved. Use /upload-document-with-ocr with authentication for production.'
            }
        });
    } catch (error) {
        console.error('Upload document test error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process document',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/profile-setup/complete-setup
 * @desc    Complete profile setup and trigger full OCR verification
 * @access  Private
 */
router.post('/complete-setup', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('');
        console.log('🚀 Starting Complete Setup Verification for user:', userId);
        console.log('================================================');

        // Step 1: Check all required documents are uploaded
        const { data: documents, error: docError } = await supabase
            .from('verification_documents')
            .select('*')
            .eq('user_id', userId);

        if (docError) throw docError;

        const requiredDocs = ['national_id', 'id_back', 'selfie', 'bank_statement'];
        const uploadedTypes = documents.map(d => d.document_type);
        const missingDocs = requiredDocs.filter(type => !uploadedTypes.includes(type));

        if (missingDocs.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Missing required documents',
                missingDocuments: missingDocs,
                hint: 'Please upload: ' + missingDocs.join(', ')
            });
        }

        console.log('✅ All required documents uploaded');

        // Step 2: Check profile completion
        const { data: profile, error: profileError } = await supabase
            .from('user_profile_completion')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        if (!profile.profile_completed || !profile.employment_completed) {
            return res.status(400).json({
                success: false,
                message: 'Profile not complete',
                pending_steps: profile.pending_steps.filter(s => s !== null)
            });
        }

        console.log('✅ Profile information complete');

        // Step 3: Get documents for verification
        const idFront = documents.find(d => d.document_type === 'national_id');
        const idBack = documents.find(d => d.document_type === 'id_back');
        const selfie = documents.find(d => d.document_type === 'selfie');
        const bankStatement = documents.find(d => d.document_type === 'bank_statement');
        const payslip = documents.find(d => d.document_type === 'payslip');

        // Step 4: Run OCR verification on all documents
        const verificationResults = {
            idFront: { verified: false, ocrData: null },
            idBack: { verified: false, ocrData: null },
            selfie: { verified: false, faceDetected: false },
            bankStatement: { verified: false, ocrData: null },
            payslip: { verified: false, ocrData: null },
            faceMatch: { matched: false, confidence: 0 }
        };

        // 4a. Verify ID Front (if not already processed)
        if (idFront && !idFront.ocr_data && ocrService) {
            console.log('🔍 Processing ID Front...');
            try {
                const idBuffer = await fetchDocumentBuffer(idFront.file_url);
                if (idBuffer) {
                    const result = await ocrService.analyzeDocument(idBuffer, 'national_id');
                    if (result.success) {
                        verificationResults.idFront = {
                            verified: true,
                            ocrData: result.extractedFields || result.parsedFields,
                            confidence: result.confidence,
                            ocrEngine: result.ocrEngine
                        };
                        // Update document with OCR data
                        await supabase
                            .from('verification_documents')
                            .update({ 
                                ocr_data: result,
                                status: 'processing'
                            })
                            .eq('id', idFront.id);
                        console.log('✅ ID Front processed');
                    }
                }
            } catch (err) {
                console.error('❌ ID Front processing failed:', err.message);
            }
        } else if (idFront?.ocr_data) {
            verificationResults.idFront = { verified: true, ocrData: idFront.ocr_data };
            console.log('✅ ID Front already processed');
        }

        // 4b. Verify ID Back
        if (idBack && !idBack.ocr_data && ocrService) {
            console.log('🔍 Processing ID Back...');
            try {
                const idBackBuffer = await fetchDocumentBuffer(idBack.file_url);
                if (idBackBuffer) {
                    const result = await ocrService.analyzeDocument(idBackBuffer, 'id_back');
                    if (result.success) {
                        verificationResults.idBack = {
                            verified: true,
                            ocrData: result.extractedFields || result.parsedFields,
                            confidence: result.confidence
                        };
                        await supabase
                            .from('verification_documents')
                            .update({ 
                                ocr_data: result,
                                status: 'processing'
                            })
                            .eq('id', idBack.id);
                        console.log('✅ ID Back processed');
                    }
                }
            } catch (err) {
                console.error('❌ ID Back processing failed:', err.message);
            }
        } else if (idBack?.ocr_data) {
            verificationResults.idBack = { verified: true, ocrData: idBack.ocr_data };
            console.log('✅ ID Back already processed');
        }

        // 4c. Verify Selfie (Auto-approve valid images, admin review on failure)
        if (selfie && ocrService) {
            console.log('🔍 Processing Selfie...');
            try {
                const selfieBuffer = await fetchDocumentBuffer(selfie.file_url);
                if (selfieBuffer) {
                    const faceResult = await ocrService.detectFace(selfieBuffer);
                    
                    // Determine status:
                    // - faceDetected=true + requiresManualReview=false → 'verified' (auto-approved)
                    // - faceDetected=true + requiresManualReview=true → 'pending_review' (admin needed)
                    // - faceDetected=false → 'pending_review' (admin needed)
                    let selfieStatus = 'pending_review';
                    if (faceResult.faceDetected && !faceResult.requiresManualReview) {
                        selfieStatus = 'verified'; // Auto-approved!
                    }
                    
                    verificationResults.selfie = {
                        verified: faceResult.faceDetected && !faceResult.requiresManualReview,
                        faceDetected: faceResult.faceDetected,
                        faceCount: faceResult.faceCount,
                        confidence: faceResult.confidence,
                        provider: faceResult.provider,
                        requiresManualReview: faceResult.requiresManualReview || false
                    };
                    
                    await supabase
                        .from('verification_documents')
                        .update({ 
                            ocr_data: { faceDetection: faceResult },
                            status: selfieStatus
                        })
                        .eq('id', selfie.id);
                    
                    if (selfieStatus === 'verified') {
                        console.log('✅ Selfie AUTO-APPROVED');
                    } else {
                        console.log('⏳ Selfie requires admin review');
                    }
                }
            } catch (err) {
                console.error('❌ Selfie processing failed:', err.message);
                // On error, queue for admin review
                verificationResults.selfie = {
                    verified: false,
                    faceDetected: false,
                    confidence: 0,
                    provider: 'Error',
                    requiresManualReview: true,
                    error: err.message
                };
                await supabase
                    .from('verification_documents')
                    .update({ 
                        ocr_data: { error: err.message, requiresManualReview: true },
                        status: 'pending_review'
                    })
                    .eq('id', selfie.id);
                console.log('⏳ Selfie queued for admin review due to error');
            }
        }

        // 4d. Verify Bank Statement
        if (bankStatement && !bankStatement.ocr_data && ocrService) {
            console.log('🔍 Processing Bank Statement...');
            try {
                const bankBuffer = await fetchDocumentBuffer(bankStatement.file_url);
                if (bankBuffer) {
                    const result = await ocrService.extractBankStatementData(bankBuffer);
                    if (result.success) {
                        verificationResults.bankStatement = {
                            verified: true,
                            ocrData: result.extractedFields,
                            confidence: result.confidence
                        };
                        await supabase
                            .from('verification_documents')
                            .update({ 
                                ocr_data: result,
                                status: 'processing'
                            })
                            .eq('id', bankStatement.id);
                        console.log('✅ Bank Statement processed');
                    }
                }
            } catch (err) {
                console.error('❌ Bank Statement processing failed:', err.message);
            }
        } else if (bankStatement?.ocr_data) {
            verificationResults.bankStatement = { verified: true, ocrData: bankStatement.ocr_data };
            console.log('✅ Bank Statement already processed');
        }

        // 4e. Verify Payslip (if uploaded)
        if (payslip && !payslip.ocr_data && ocrService) {
            console.log('🔍 Processing Payslip...');
            try {
                const payslipBuffer = await fetchDocumentBuffer(payslip.file_url);
                if (payslipBuffer) {
                    const result = await ocrService.extractPayslipData(payslipBuffer);
                    if (result.success) {
                        verificationResults.payslip = {
                            verified: true,
                            ocrData: result.extractedFields,
                            confidence: result.confidence
                        };
                        await supabase
                            .from('verification_documents')
                            .update({ 
                                ocr_data: result,
                                status: 'processing'
                            })
                            .eq('id', payslip.id);
                        console.log('✅ Payslip processed');
                    }
                }
            } catch (err) {
                console.error('❌ Payslip processing failed:', err.message);
            }
        } else if (payslip?.ocr_data) {
            verificationResults.payslip = { verified: true, ocrData: payslip.ocr_data };
            console.log('✅ Payslip already processed');
        }

        // Step 5: Face Comparison (ID photo vs Selfie)
        if (verificationResults.idFront.verified && verificationResults.selfie.faceDetected && faceService) {
            console.log('🔍 Comparing faces (ID vs Selfie)...');
            try {
                const idBuffer = await fetchDocumentBuffer(idFront.file_url);
                const selfieBuffer = await fetchDocumentBuffer(selfie.file_url);
                
                if (idBuffer && selfieBuffer && faceService.isAvailable()) {
                    const compareResult = await faceService.compareFaces(idBuffer, selfieBuffer);
                    verificationResults.faceMatch = {
                        matched: compareResult.isMatch || compareResult.confidence > 0.7,
                        confidence: compareResult.confidence || 0,
                        provider: 'Azure Face API'
                    };
                    console.log(verificationResults.faceMatch.matched ? 
                        `✅ Face match: ${(verificationResults.faceMatch.confidence * 100).toFixed(1)}%` : 
                        '❌ Face mismatch');
                }
            } catch (err) {
                console.error('❌ Face comparison failed:', err.message);
            }
        }

        // Step 6: Calculate ZimScore if bank statement verified
        let zimScoreResult = null;
        if (verificationResults.bankStatement.verified && zimScoreService) {
            console.log('🎯 Calculating ZimScore...');
            try {
                const { data: userData } = await supabase
                    .from('users')
                    .select('employment_type')
                    .eq('id', userId)
                    .single();

                if (userData?.employment_type) {
                    const bankData = verificationResults.bankStatement.ocrData?.extractedFields || 
                                    verificationResults.bankStatement.ocrData?.extracted_fields || 
                                    verificationResults.bankStatement.ocrData;
                    
                    const financialData = zimScoreService.extractFinancialDataFromOCR({
                        openingBalance: parseFloat(bankData?.openingBalance) || 0,
                        closingBalance: parseFloat(bankData?.closingBalance) || 0,
                        totalCredits: parseFloat(bankData?.totalCredits) || 0,
                        totalDebits: parseFloat(bankData?.totalDebits) || 0,
                        statementPeriod: bankData?.statementPeriod
                    });

                    zimScoreResult = await zimScoreService.calculateColdStartScore(
                        userId,
                        financialData,
                        userData.employment_type
                    );
                    console.log(`✅ ZimScore: ${zimScoreResult.scoreValue}/85 - Limit: $${zimScoreResult.maxLoanAmount}`);
                }
            } catch (err) {
                console.error('❌ ZimScore calculation failed:', err.message);
            }
        }

        // Step 7: Determine overall verification status
        const allVerified = verificationResults.idFront.verified && 
                          verificationResults.selfie.faceDetected;
        
        const kycStatus = allVerified ? 'pending_review' : 'incomplete';
        const setupCompleted = allVerified;

        // Step 8: Update user status
        await supabase
            .from('users')
            .update({
                kyc_status: kycStatus,
                setup_completed: setupCompleted,
                setup_completed_at: setupCompleted ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        console.log('');
        console.log('================================================');
        console.log(`🏁 Setup Complete - Status: ${kycStatus}`);
        console.log('');

        res.json({
            success: true,
            message: setupCompleted ? 
                'Profile setup complete! Your documents are being reviewed.' : 
                'Some verifications failed. Please check and resubmit.',
            data: {
                setupCompleted,
                kycStatus,
                verificationResults: {
                    idFront: {
                        verified: verificationResults.idFront.verified,
                        confidence: verificationResults.idFront.confidence
                    },
                    idBack: {
                        verified: verificationResults.idBack.verified
                    },
                    selfie: {
                        faceDetected: verificationResults.selfie.faceDetected,
                        confidence: verificationResults.selfie.confidence
                    },
                    bankStatement: {
                        verified: verificationResults.bankStatement.verified
                    },
                    payslip: {
                        verified: verificationResults.payslip?.verified || false
                    },
                    faceMatch: verificationResults.faceMatch
                },
                zimScore: zimScoreResult ? {
                    score: zimScoreResult.scoreValue,
                    maxLoanAmount: zimScoreResult.maxLoanAmount,
                    starRating: zimScoreResult.starRating,
                    riskLevel: zimScoreResult.riskLevel
                } : null,
                nextSteps: !setupCompleted ? [
                    !verificationResults.idFront.verified && 'Reupload clear National ID (front)',
                    !verificationResults.selfie.faceDetected && 'Reupload clear selfie with visible face',
                    !verificationResults.faceMatch.matched && 'Ensure selfie matches ID photo'
                ].filter(Boolean) : ['Wait for admin review (usually within 24 hours)']
            }
        });

    } catch (error) {
        console.error('Complete setup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete setup',
            error: error.message
        });
    }
});

/**
 * Helper function to fetch document buffer from URL or base64 data
 */
async function fetchDocumentBuffer(url) {
    try {
        if (!url) return null;
        
        // Handle base64 data URLs
        if (url.startsWith('data:')) {
            const matches = url.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches[2]) {
                console.log('📦 Decoding base64 document data');
                return Buffer.from(matches[2], 'base64');
            }
            return null;
        }
        
        // Handle regular URLs
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url);
        if (!response.ok) {
            console.warn('⚠️ Failed to fetch document from URL:', response.status);
            return null;
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error) {
        console.error('Failed to fetch document:', error.message);
        return null;
    }
}

/**
 * @route   GET /api/profile-setup/documents
 * @desc    Get user's uploaded documents
 * @access  Private
 */
router.get('/documents', authenticateUser, async (req, res) => {
    try {
        const { data: documents, error } = await supabase
            .from('verification_documents')
            .select('*')
            .eq('user_id', req.user.id)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: documents || []
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get documents'
        });
    }
});

/**
 * @route   GET /api/profile-setup/admin/kyc-queue
 * @desc    Get KYC review queue (Admin only)
 * @access  Private/Admin
 */
router.get('/admin/kyc-queue', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { data: queue, error } = await supabase
            .from('admin_kyc_review_queue')
            .select('*');

        if (error) throw error;

        res.json({
            success: true,
            data: queue || []
        });
    } catch (error) {
        console.error('Get KYC queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get KYC review queue'
        });
    }
});

/**
 * @route   POST /api/profile-setup/admin/review-kyc/:user_id
 * @desc    Review and approve/reject KYC (Admin only)
 * @access  Private/Admin
 */
router.post('/admin/review-kyc/:user_id', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { user_id } = req.params;
        const { action, rejection_reason, document_reviews } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

        if (action === 'reject' && !rejection_reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        // Update document statuses
        if (document_reviews && Array.isArray(document_reviews)) {
            for (const review of document_reviews) {
                await supabase
                    .from('verification_documents')
                    .update({
                        status: review.status,
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: req.user.id,
                        rejection_reason: review.rejection_reason || null
                    })
                    .eq('id', review.document_id);
            }
        }

        // Update user KYC status
        const newKycStatus = action === 'approve' ? 'verified' : 'rejected';
        const newAccountStatus = action === 'approve' ? 'active' : 'pending_verification';

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                kyc_status: newKycStatus,
                account_status: newAccountStatus,
                kyc_verified_at: action === 'approve' ? new Date().toISOString() : null,
                status_reason: action === 'reject' ? rejection_reason : null,
                status_changed_at: new Date().toISOString(),
                status_changed_by: req.user.id
            })
            .eq('id', user_id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Record status change
        await supabase
            .from('account_status_history')
            .insert({
                user_id: user_id,
                previous_status: 'pending_verification',
                new_status: newAccountStatus,
                reason: action === 'approve' ? 'KYC approved' : `KYC rejected: ${rejection_reason}`,
                changed_by: req.user.id,
                changed_by_role: 'admin',
                created_at: new Date().toISOString()
            });

        // Send notification to user
        await supabase
            .from('notifications')
            .insert({
                user_id: user_id,
                type: action === 'approve' ? 'kyc_approved' : 'kyc_rejected',
                title: action === 'approve' ? 'KYC Approved!' : 'KYC Rejected',
                message: action === 'approve' 
                    ? 'Your KYC verification has been approved. Your account is now active!'
                    : `Your KYC verification was rejected. Reason: ${rejection_reason}. Please resubmit correct documents.`,
                priority: 'high',
                created_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: `KYC ${action}d successfully`,
            data: updatedUser
        });
    } catch (error) {
        console.error('Review KYC error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review KYC'
        });
    }
});

module.exports = router;

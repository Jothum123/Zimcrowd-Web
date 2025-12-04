const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and PDFs
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'), false);
        }
    }
});

// Middleware to verify JWT token and get user
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token with Supabase (handles Google OAuth tokens correctly)
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

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Document types configuration
const DOCUMENT_TYPES = {
    national_id: {
        name: 'National ID',
        max_files: 2,
        required: true,
        allowed_types: ['image/jpeg', 'image/png', 'application/pdf']
    },
    payslip: {
        name: 'Payslip',
        max_files: 3,
        required: false,
        allowed_types: ['image/jpeg', 'image/png', 'application/pdf']
    },
    employment_contract: {
        name: 'Employment Contract',
        max_files: 1,
        required: false,
        allowed_types: ['image/jpeg', 'image/png', 'application/pdf']
    },
    bank_statement: {
        name: 'Bank Statement',
        max_files: 2,
        required: true,
        allowed_types: ['image/jpeg', 'image/png', 'application/pdf']
    },
    proof_of_address: {
        name: 'Proof of Address',
        max_files: 1,
        required: true,
        allowed_types: ['image/jpeg', 'image/png', 'application/pdf']
    },
    additional_docs: {
        name: 'Additional Documents',
        max_files: 5,
        required: false,
        allowed_types: ['image/jpeg', 'image/png', 'application/pdf']
    }
};

// @route   GET /api/documents
// @desc    Get user's uploaded documents from Supabase Storage
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Query documents from user_documents table
        const { data: documents, error } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching documents:', error);
            throw error;
        }
        
        const userDocuments = documents || [];
        
        // Generate signed URLs for each document
        const documentsWithUrls = await Promise.all(
            userDocuments.map(async (doc) => {
                let signedUrl = null;
                // Only generate signed URL if file_path exists
                if (doc.file_path) {
                    try {
                        const { data: urlData } = await supabase.storage
                            .from('user-documents')
                            .createSignedUrl(doc.file_path, 3600); // 1 hour expiry
                        signedUrl = urlData?.signedUrl;
                    } catch (e) {
                        console.error('Error generating signed URL for doc:', doc.id, e);
                    }
                }
                
                return {
                    id: doc.id,
                    type: doc.document_type || doc.doc_type,
                    filename: doc.file_name || doc.original_filename,
                    status: doc.status || 'pending',
                    uploaded_at: doc.created_at,
                    verified_at: doc.verified_at,
                    rejection_reason: doc.rejection_reason,
                    url: signedUrl
                };
            })
        );

        // Group by type and add status info
        const documentsByType = {};
        Object.keys(DOCUMENT_TYPES).forEach(type => {
            const docs = documentsWithUrls.filter(doc => doc.type === type);
            documentsByType[type] = {
                name: DOCUMENT_TYPES[type].name,
                required: DOCUMENT_TYPES[type].required,
                max_files: DOCUMENT_TYPES[type].max_files,
                uploaded_count: docs.length,
                documents: docs,
                status: docs.length > 0 ? (docs.every(doc => doc.status === 'approved') ? 'verified' :
                         docs.some(doc => doc.status === 'pending') ? 'pending' : 
                         docs.some(doc => doc.status === 'rejected') ? 'rejected' : 'pending') : 'not_uploaded'
            };
        });

        res.json({
            success: true,
            data: {
                documents: documentsByType,
                summary: {
                    total_uploaded: documentsWithUrls.length,
                    verified: documentsWithUrls.filter(doc => doc.status === 'approved').length,
                    pending: documentsWithUrls.filter(doc => doc.status === 'pending').length,
                    rejected: documentsWithUrls.filter(doc => doc.status === 'rejected').length
                }
            }
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch documents',
            error: error.message
        });
    }
});

// @route   POST /api/documents/upload
// @desc    Upload a document
// @access  Private
router.post('/upload', authenticateUser, upload.single('document'), [
    body('document_type')
        .isIn(Object.keys(DOCUMENT_TYPES))
        .withMessage('Please provide a valid document type'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description must be less than 200 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { document_type, description } = req.body;
        const file = req.file;

        // Validate file type for this document type
        const allowedTypes = DOCUMENT_TYPES[document_type].allowed_types;
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: `File type not allowed for ${DOCUMENT_TYPES[document_type].name}. Allowed types: ${allowedTypes.join(', ')}`
            });
        }

        // Check if user has reached the maximum number of files for this type
        const maxFiles = DOCUMENT_TYPES[document_type].max_files;
        const { data: existingDocs, error: countError } = await supabase
            .from('user_documents')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('document_type', document_type);
        
        if (!countError && existingDocs && existingDocs.length >= maxFiles) {
            return res.status(400).json({
                success: false,
                message: `Maximum ${maxFiles} files allowed for ${DOCUMENT_TYPES[document_type].name}`
            });
        }

        // Upload file to Supabase Storage (user-documents bucket)
        const fileName = `${req.user.id}/${document_type}/${Date.now()}_${file.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-documents')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error('File upload error:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file to storage'
            });
        }

        // Save document metadata to user_documents table
        const { data: documentRecord, error: dbError } = await supabase
            .from('user_documents')
            .insert({
                user_id: req.user.id,
                document_type: document_type,
                file_path: fileName,
                file_name: file.originalname,
                mime_type: file.mimetype,
                file_size: file.size,
                status: 'pending',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database insert error:', dbError);
            // Try to delete the uploaded file if DB insert fails
            await supabase.storage.from('user-documents').remove([fileName]);
            return res.status(500).json({
                success: false,
                message: 'Failed to save document record'
            });
        }

        // Generate signed URL for the uploaded document
        const { data: signedUrlData } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(fileName, 3600);

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                id: documentRecord.id,
                type: document_type,
                filename: file.originalname,
                status: 'pending',
                uploaded_at: documentRecord.created_at,
                url: signedUrlData?.signedUrl
            }
        });
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/documents/:id/download
// @desc    Download a document
// @access  Private
router.get('/:id/download', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch document metadata from database
        const { data: document, error: fetchError } = await supabase
            .from('user_documents')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError || !document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Get signed URL from Supabase Storage
        const { data: urlData, error } = await supabase.storage
            .from('user-documents')
            .createSignedUrl(document.file_path, 300); // 5 minutes expiry

        if (error) {
            console.error('Download URL error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate download link'
            });
        }

        res.json({
            success: true,
            data: {
                download_url: urlData.signedUrl,
                filename: document.file_name,
                expires_in: 300
            }
        });
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch document to verify ownership and get file path
        const { data: document, error: fetchError } = await supabase
            .from('user_documents')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.user.id)
            .single();

        if (fetchError || !document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Only allow deletion of pending documents
        if (document.status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete approved documents'
            });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('user-documents')
            .remove([document.file_path]);

        if (storageError) {
            console.error('Storage delete error:', storageError);
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('user_documents')
            .delete()
            .eq('id', id);

        if (dbError) {
            console.error('Database delete error:', dbError);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete document record'
            });
        }

        res.json({
            success: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/documents/types
// @desc    Get available document types
// @access  Public
router.get('/types', async (req, res) => {
    try {
        res.json({
            success: true,
            data: DOCUMENT_TYPES
        });
    } catch (error) {
        console.error('Get document types error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/documents/store
// @desc    Store document in Document Center with AI verification
// @access  Private
router.post('/store', authenticateUser, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const { document_type, store_in_center } = req.body;
        const file = req.file;
        const userId = req.user.id;

        console.log(`📄 Storing ${document_type} for user ${userId}`);

        // Generate unique file path
        const timestamp = Date.now();
        const fileExt = file.originalname.split('.').pop();
        const storagePath = `${userId}/${document_type}/${timestamp}.${fileExt}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-documents')
            .upload(storagePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('❌ Storage upload failed:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload document',
                error: uploadError.message
            });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('user-documents')
            .getPublicUrl(storagePath);

        const documentUrl = urlData?.publicUrl || storagePath;

        // Get user profile for verification
        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Initialize Document AI for verification
        let verificationResult = null;
        let initialStatus = 'pending';
        let metadata = {
            originalFileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedAt: new Date().toISOString()
        };

        // Try Document AI verification if available
        try {
            const { DocumentCenterService } = require('../services/document-center.service');
            const docService = new DocumentCenterService();
            
            if (docService.docAI && docService.docAI.isAvailable && docService.docAI.isAvailable()) {
                const analysisResult = await docService.docAI.analyzeDocument(file.buffer, document_type);
                
                if (analysisResult.success) {
                    verificationResult = docService.docAI.verifyDocumentAgainstProfile(
                        analysisResult.extractedFields,
                        userProfile,
                        document_type
                    );

                    metadata.extractedFields = analysisResult.extractedFields;
                    metadata.ocrConfidence = analysisResult.confidence;
                    metadata.detectedType = analysisResult.detectedType;
                    metadata.verificationResult = verificationResult;

                    // Auto-verify if high confidence match
                    if (verificationResult.verified && verificationResult.confidence >= 80) {
                        initialStatus = 'verified';
                        console.log(`✅ Auto-verified ${document_type} with ${verificationResult.confidence}% confidence`);
                    } else if (verificationResult.recommendation === 'reject') {
                        initialStatus = 'rejected';
                        metadata.rejectionReason = verificationResult.rejectionReason;
                        console.log(`❌ Auto-rejected ${document_type}: ${verificationResult.rejectionReason}`);
                    }
                }
            }
        } catch (aiError) {
            console.warn('⚠️ Document AI verification skipped:', aiError.message);
            metadata.aiError = aiError.message;
        }

        // Check if document already exists for this type
        const { data: existingDoc } = await supabase
            .from('user_documents')
            .select('id')
            .eq('user_id', userId)
            .eq('document_type', document_type)
            .single();

        let documentRecord;

        if (existingDoc) {
            // Update existing document
            const { data, error } = await supabase
                .from('user_documents')
                .update({
                    document_url: documentUrl,
                    file_name: file.originalname,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    status: initialStatus,
                    rejection_reason: metadata.rejectionReason || null,
                    metadata: metadata,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingDoc.id)
                .select()
                .single();

            if (error) {
                console.error('❌ Document update error:', error);
                // Continue even if DB update fails - document is uploaded
            }
            documentRecord = data || { id: existingDoc.id };
            console.log(`📝 Updated existing ${document_type} document`);
        } else {
            // Insert new document
            const { data, error } = await supabase
                .from('user_documents')
                .insert({
                    user_id: userId,
                    document_type: document_type,
                    document_url: documentUrl,
                    file_name: file.originalname,
                    file_size: file.size,
                    mime_type: file.mimetype,
                    status: initialStatus,
                    rejection_reason: metadata.rejectionReason || null,
                    metadata: metadata
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Document insert error:', error);
                // Continue even if DB insert fails - document is uploaded
            }
            documentRecord = data || { id: `temp_${timestamp}` };
            console.log(`📝 Created new ${document_type} document`);
        }

        // Get status badge
        const statusBadges = {
            'verified': { icon: '✅', color: '#38e77b', label: 'Verified' },
            'pending': { icon: '🟡', color: '#f59e0b', label: 'Pending Review' },
            'rejected': { icon: '🔴', color: '#ef4444', label: 'Rejected' },
            'expired': { icon: '⚠️', color: '#f97316', label: 'Expired' }
        };

        res.status(201).json({
            success: true,
            message: `Document stored with status: ${initialStatus}`,
            documentId: documentRecord?.id,
            documentType: document_type,
            status: initialStatus,
            statusBadge: statusBadges[initialStatus] || statusBadges['pending'],
            url: documentUrl,
            verification: verificationResult,
            rejectionReason: metadata.rejectionReason || null
        });

    } catch (error) {
        console.error('❌ Store document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to store document',
            error: error.message
        });
    }
});

// @route   GET /api/documents/center
// @desc    Get all documents from Document Center with status badges
// @access  Private
router.get('/center', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all documents for user
        const { data: documents, error } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Get documents error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to retrieve documents'
            });
        }

        // Required documents for Direct Lending
        const requiredDocs = [
            { type: 'national_id', name: 'National ID', required: true },
            { type: 'selfie', name: 'Selfie Photo', required: true },
            { type: 'payslip', name: 'Payslip', required: true },
            { type: 'bank_statement', name: 'Bank Statement', required: true },
            { type: 'proof_of_address', name: 'Proof of Residence', required: true },
            { type: 'employment_contract', name: 'Employment Contract', required: true }
        ];

        // Status badges
        const statusBadges = {
            'verified': { icon: '✅', color: '#38e77b', label: 'Verified' },
            'pending': { icon: '🟡', color: '#f59e0b', label: 'Pending Review' },
            'rejected': { icon: '🔴', color: '#ef4444', label: 'Rejected' },
            'expired': { icon: '⚠️', color: '#f97316', label: 'Expired' },
            'missing': { icon: '❌', color: '#6b7280', label: 'Not Uploaded' }
        };

        // Build document map
        const documentMap = {};
        
        // Initialize all required documents as MISSING
        for (const reqDoc of requiredDocs) {
            documentMap[reqDoc.type] = {
                type: reqDoc.type,
                name: reqDoc.name,
                required: reqDoc.required,
                status: 'missing',
                statusBadge: statusBadges['missing'],
                document: null
            };
        }

        // Update with actual documents
        for (const doc of documents || []) {
            const docType = doc.document_type;
            if (documentMap[docType]) {
                documentMap[docType] = {
                    ...documentMap[docType],
                    status: doc.status,
                    statusBadge: statusBadges[doc.status] || statusBadges['missing'],
                    document: {
                        id: doc.id,
                        url: doc.document_url,
                        fileName: doc.file_name,
                        uploadedAt: doc.created_at,
                        verifiedAt: doc.verified_at,
                        rejectionReason: doc.rejection_reason,
                        metadata: doc.metadata
                    }
                };
            }
        }

        // Calculate stats
        let stats = {
            total: 0,
            verified: 0,
            pending: 0,
            rejected: 0,
            missing: 0
        };

        for (const doc of Object.values(documentMap)) {
            if (doc.required) {
                stats.total++;
                switch (doc.status) {
                    case 'verified': stats.verified++; break;
                    case 'pending': stats.pending++; break;
                    case 'rejected': stats.rejected++; break;
                    default: stats.missing++;
                }
            }
        }

        stats.completionPercentage = stats.total > 0 
            ? Math.round((stats.verified / stats.total) * 100) 
            : 0;

        res.json({
            success: true,
            documents: documentMap,
            stats: stats,
            allVerified: stats.verified === stats.total,
            readyForDirectLending: stats.verified === stats.total
        });

    } catch (error) {
        console.error('❌ Get document center error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

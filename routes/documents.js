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

        // Verify JWT token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Get user from Supabase auth
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
// @desc    Get user's uploaded documents
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
    try {
        // For now, return mock data since we don't have a documents table
        // In production, this would query a documents table
        const mockDocuments = [
            {
                id: 1,
                type: 'national_id',
                filename: 'national_id_front.jpg',
                status: 'verified',
                uploaded_at: '2025-01-15T10:30:00Z',
                verified_at: '2025-01-15T14:20:00Z',
                url: 'https://example.com/documents/national_id_front.jpg'
            },
            {
                id: 2,
                type: 'bank_statement',
                filename: 'bank_statement_jan.pdf',
                status: 'verified',
                uploaded_at: '2025-01-16T09:15:00Z',
                verified_at: '2025-01-16T11:45:00Z',
                url: 'https://example.com/documents/bank_statement_jan.pdf'
            },
            {
                id: 3,
                type: 'proof_of_address',
                filename: 'utility_bill.jpg',
                status: 'verified',
                uploaded_at: '2025-01-16T16:20:00Z',
                verified_at: '2025-01-17T10:10:00Z',
                url: 'https://example.com/documents/utility_bill.jpg'
            }
        ];

        // Group by type and add status info
        const documentsByType = {};
        Object.keys(DOCUMENT_TYPES).forEach(type => {
            const docs = mockDocuments.filter(doc => doc.type === type);
            documentsByType[type] = {
                name: DOCUMENT_TYPES[type].name,
                required: DOCUMENT_TYPES[type].required,
                max_files: DOCUMENT_TYPES[type].max_files,
                uploaded_count: docs.length,
                documents: docs,
                status: docs.length > 0 ? (docs.every(doc => doc.status === 'verified') ? 'verified' :
                         docs.some(doc => doc.status === 'pending') ? 'pending' : 'rejected') : 'not_uploaded'
            };
        });

        res.json({
            success: true,
            data: {
                documents: documentsByType,
                summary: {
                    total_uploaded: mockDocuments.length,
                    verified: mockDocuments.filter(doc => doc.status === 'verified').length,
                    pending: mockDocuments.filter(doc => doc.status === 'pending').length,
                    rejected: mockDocuments.filter(doc => doc.status === 'rejected').length
                }
            }
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
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
        // In production, this would query the database
        const maxFiles = DOCUMENT_TYPES[document_type].max_files;
        // For now, assume they can upload (mock check)

        // Upload file to Supabase Storage
        const fileName = `${req.user.id}/${document_type}/${Date.now()}_${file.originalname}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (uploadError) {
            console.error('File upload error:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload file'
            });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);

        // In production, save document metadata to database
        // For now, return mock response
        const documentRecord = {
            id: Date.now(), // Mock ID
            user_id: req.user.id,
            type: document_type,
            filename: file.originalname,
            storage_path: fileName,
            url: urlData.publicUrl,
            status: 'pending',
            uploaded_at: new Date().toISOString(),
            description: description || null
        };

        res.status(201).json({
            success: true,
            message: 'Document uploaded successfully',
            data: documentRecord
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

        // In production, this would fetch document metadata from database
        // For now, return mock response
        const mockDocument = {
            id: parseInt(id),
            user_id: req.user.id,
            storage_path: `user_${req.user.id}/document_${id}.pdf`,
            filename: `document_${id}.pdf`
        };

        // Get signed URL from Supabase Storage
        const { data: urlData, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(mockDocument.storage_path, 60); // 60 seconds expiry

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
                filename: mockDocument.filename,
                expires_in: 60
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

        // In production, this would:
        // 1. Check if document belongs to user
        // 2. Check if document can be deleted (not verified)
        // 3. Delete from storage
        // 4. Delete from database

        // For now, return mock response
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

module.exports = router;

/**
 * Document Center Service
 * Manages user KYC documents with status tracking
 * Stores documents in Supabase Storage and tracks in user_documents table
 */

const { supabase } = require('../utils/supabase-auth');
const GoogleDocAIService = require('./google-docai.service');

// Document status constants
const DOCUMENT_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
    MISSING: 'missing'
};

// Document types for Direct Lending
const DOCUMENT_TYPES = {
    NATIONAL_ID: 'national_id',
    SELFIE: 'selfie',
    PAYSLIP: 'payslip',
    BANK_STATEMENT: 'bank_statement',
    PROOF_OF_RESIDENCE: 'proof_of_address',
    EMPLOYMENT_CONTRACT: 'employment_contract'
};

// Required documents for Direct Lending
const REQUIRED_DOCUMENTS = [
    { type: DOCUMENT_TYPES.NATIONAL_ID, name: 'National ID', required: true },
    { type: DOCUMENT_TYPES.SELFIE, name: 'Selfie Photo', required: true },
    { type: DOCUMENT_TYPES.PAYSLIP, name: 'Payslip', required: true },
    { type: DOCUMENT_TYPES.BANK_STATEMENT, name: 'Bank Statement', required: true },
    { type: DOCUMENT_TYPES.PROOF_OF_RESIDENCE, name: 'Proof of Residence', required: true },
    { type: DOCUMENT_TYPES.EMPLOYMENT_CONTRACT, name: 'Employment Contract', required: true }
];

class DocumentCenterService {
    constructor() {
        this.docAI = new GoogleDocAIService();
        this.storageBucket = 'user-documents';
    }

    /**
     * Upload and store a document in the Document Center
     * @param {string} userId - User's ID
     * @param {string} documentType - Type of document
     * @param {Buffer} fileBuffer - File content
     * @param {string} fileName - Original file name
     * @param {string} mimeType - File MIME type
     * @param {Object} userProfile - User's profile for verification
     * @returns {Object} Upload result with document ID and status
     */
    async uploadDocument(userId, documentType, fileBuffer, fileName, mimeType, userProfile = null) {
        try {
            console.log(`📄 Uploading ${documentType} for user ${userId}`);

            // Generate unique file path
            const timestamp = Date.now();
            const fileExt = fileName.split('.').pop();
            const storagePath = `${userId}/${documentType}/${timestamp}.${fileExt}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(this.storageBucket)
                .upload(storagePath, fileBuffer, {
                    contentType: mimeType,
                    upsert: true
                });

            if (uploadError) {
                console.error('❌ Storage upload failed:', uploadError);
                return {
                    success: false,
                    message: 'Failed to upload document',
                    error: uploadError.message
                };
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(this.storageBucket)
                .getPublicUrl(storagePath);

            const documentUrl = urlData?.publicUrl || storagePath;

            // Run Document AI verification if profile provided
            let verificationResult = null;
            let initialStatus = DOCUMENT_STATUS.PENDING;
            let metadata = {};

            if (this.docAI.isAvailable() && userProfile) {
                try {
                    const analysisResult = await this.docAI.analyzeDocument(fileBuffer, documentType);
                    
                    if (analysisResult.success) {
                        verificationResult = this.docAI.verifyDocumentAgainstProfile(
                            analysisResult.extractedFields,
                            userProfile,
                            documentType
                        );

                        metadata = {
                            extractedFields: analysisResult.extractedFields,
                            ocrConfidence: analysisResult.confidence,
                            detectedType: analysisResult.detectedType,
                            verificationResult: verificationResult
                        };

                        // Auto-verify if high confidence match
                        if (verificationResult.verified && verificationResult.confidence >= 80) {
                            initialStatus = DOCUMENT_STATUS.VERIFIED;
                            console.log(`✅ Auto-verified ${documentType} with ${verificationResult.confidence}% confidence`);
                        } else if (verificationResult.recommendation === 'reject') {
                            initialStatus = DOCUMENT_STATUS.REJECTED;
                            console.log(`❌ Auto-rejected ${documentType}: ${verificationResult.rejectionReason}`);
                        }
                    }
                } catch (aiError) {
                    console.warn('⚠️ Document AI verification failed:', aiError.message);
                    metadata.aiError = aiError.message;
                }
            }

            // Check if document already exists for this type
            const { data: existingDoc } = await supabase
                .from('user_documents')
                .select('id')
                .eq('user_id', userId)
                .eq('document_type', documentType)
                .single();

            let documentRecord;

            if (existingDoc) {
                // Update existing document
                const { data, error } = await supabase
                    .from('user_documents')
                    .update({
                        document_url: documentUrl,
                        file_name: fileName,
                        file_size: fileBuffer.length,
                        mime_type: mimeType,
                        status: initialStatus,
                        rejection_reason: verificationResult?.rejectionReason || null,
                        metadata: metadata,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingDoc.id)
                    .select()
                    .single();

                if (error) throw error;
                documentRecord = data;
                console.log(`📝 Updated existing ${documentType} document`);
            } else {
                // Insert new document
                const { data, error } = await supabase
                    .from('user_documents')
                    .insert({
                        user_id: userId,
                        document_type: documentType,
                        document_url: documentUrl,
                        file_name: fileName,
                        file_size: fileBuffer.length,
                        mime_type: mimeType,
                        status: initialStatus,
                        rejection_reason: verificationResult?.rejectionReason || null,
                        metadata: metadata
                    })
                    .select()
                    .single();

                if (error) throw error;
                documentRecord = data;
                console.log(`📝 Created new ${documentType} document`);
            }

            return {
                success: true,
                documentId: documentRecord.id,
                documentType: documentType,
                status: initialStatus,
                statusBadge: this.getStatusBadge(initialStatus),
                url: documentUrl,
                verification: verificationResult,
                message: this.getStatusMessage(initialStatus, verificationResult)
            };

        } catch (error) {
            console.error('❌ Document upload error:', error);
            return {
                success: false,
                message: 'Failed to store document',
                error: error.message
            };
        }
    }

    /**
     * Get all documents for a user with status badges
     * @param {string} userId - User's ID
     * @returns {Object} Documents grouped by type with status
     */
    async getUserDocuments(userId) {
        try {
            const { data: documents, error } = await supabase
                .from('user_documents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Create document map with status
            const documentMap = {};
            
            // Initialize all required documents as MISSING
            for (const reqDoc of REQUIRED_DOCUMENTS) {
                documentMap[reqDoc.type] = {
                    type: reqDoc.type,
                    name: reqDoc.name,
                    required: reqDoc.required,
                    status: DOCUMENT_STATUS.MISSING,
                    statusBadge: this.getStatusBadge(DOCUMENT_STATUS.MISSING),
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
                        statusBadge: this.getStatusBadge(doc.status),
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

            // Calculate completion stats
            const stats = this.calculateDocumentStats(documentMap);

            return {
                success: true,
                documents: documentMap,
                stats: stats,
                allVerified: stats.verified === stats.total,
                readyForDirectLending: stats.verified === stats.total
            };

        } catch (error) {
            console.error('❌ Get documents error:', error);
            return {
                success: false,
                message: 'Failed to retrieve documents',
                error: error.message
            };
        }
    }

    /**
     * Check document status for Direct Lending eligibility
     * @param {string} userId - User's ID
     * @returns {Object} Eligibility status with document details
     */
    async checkDirectLendingDocuments(userId) {
        const result = await this.getUserDocuments(userId);
        
        if (!result.success) {
            return result;
        }

        const documents = result.documents;
        const issues = [];
        const actions = [];

        for (const [type, doc] of Object.entries(documents)) {
            if (doc.required) {
                switch (doc.status) {
                    case DOCUMENT_STATUS.MISSING:
                        issues.push({
                            type: type,
                            name: doc.name,
                            status: 'MISSING',
                            message: `${doc.name} has not been uploaded`
                        });
                        actions.push({
                            action: 'UPLOAD',
                            documentType: type,
                            message: `Please upload your ${doc.name}`
                        });
                        break;

                    case DOCUMENT_STATUS.PENDING:
                        issues.push({
                            type: type,
                            name: doc.name,
                            status: 'PENDING',
                            message: `${doc.name} is under review`
                        });
                        actions.push({
                            action: 'WAIT',
                            documentType: type,
                            message: `Your ${doc.name} is being verified (24-48 hours)`
                        });
                        break;

                    case DOCUMENT_STATUS.REJECTED:
                        issues.push({
                            type: type,
                            name: doc.name,
                            status: 'REJECTED',
                            message: `${doc.name} was rejected: ${doc.document?.rejectionReason || 'Unknown reason'}`
                        });
                        actions.push({
                            action: 'RE_UPLOAD',
                            documentType: type,
                            message: `Please re-upload your ${doc.name}`
                        });
                        break;

                    case DOCUMENT_STATUS.EXPIRED:
                        issues.push({
                            type: type,
                            name: doc.name,
                            status: 'EXPIRED',
                            message: `${doc.name} has expired`
                        });
                        actions.push({
                            action: 'RE_UPLOAD',
                            documentType: type,
                            message: `Please upload a current ${doc.name}`
                        });
                        break;
                }
            }
        }

        return {
            success: true,
            eligible: issues.length === 0,
            documents: documents,
            stats: result.stats,
            issues: issues,
            actions: actions,
            message: issues.length === 0 
                ? 'All documents verified. You are eligible for Direct Lending.'
                : `${issues.length} document(s) require attention before you can apply for Direct Lending.`
        };
    }

    /**
     * Store documents from post-registration
     * @param {string} userId - User's ID
     * @param {Object} documents - Object containing document files
     * @param {Object} userProfile - User's profile data
     * @returns {Object} Results for each document
     */
    async storePostRegistrationDocuments(userId, documents, userProfile) {
        const results = {
            success: true,
            documents: {},
            summary: {
                total: 0,
                uploaded: 0,
                verified: 0,
                pending: 0,
                rejected: 0,
                failed: 0
            }
        };

        const documentMappings = [
            { key: 'idFront', type: DOCUMENT_TYPES.NATIONAL_ID, name: 'National ID (Front)' },
            { key: 'idBack', type: DOCUMENT_TYPES.NATIONAL_ID, name: 'National ID (Back)' },
            { key: 'selfie', type: DOCUMENT_TYPES.SELFIE, name: 'Selfie Photo' },
            { key: 'payslip', type: DOCUMENT_TYPES.PAYSLIP, name: 'Payslip' },
            { key: 'bankStatement', type: DOCUMENT_TYPES.BANK_STATEMENT, name: 'Bank Statement' },
            { key: 'proofOfResidence', type: DOCUMENT_TYPES.PROOF_OF_RESIDENCE, name: 'Proof of Residence' },
            { key: 'employmentContract', type: DOCUMENT_TYPES.EMPLOYMENT_CONTRACT, name: 'Employment Contract' }
        ];

        for (const mapping of documentMappings) {
            const doc = documents[mapping.key];
            
            if (doc && doc.buffer) {
                results.summary.total++;

                const uploadResult = await this.uploadDocument(
                    userId,
                    mapping.type,
                    doc.buffer,
                    doc.fileName || `${mapping.key}.${doc.mimeType?.split('/')[1] || 'jpg'}`,
                    doc.mimeType || 'image/jpeg',
                    userProfile
                );

                results.documents[mapping.key] = {
                    name: mapping.name,
                    type: mapping.type,
                    ...uploadResult
                };

                if (uploadResult.success) {
                    results.summary.uploaded++;
                    
                    switch (uploadResult.status) {
                        case DOCUMENT_STATUS.VERIFIED:
                            results.summary.verified++;
                            break;
                        case DOCUMENT_STATUS.PENDING:
                            results.summary.pending++;
                            break;
                        case DOCUMENT_STATUS.REJECTED:
                            results.summary.rejected++;
                            break;
                    }
                } else {
                    results.summary.failed++;
                    results.success = false;
                }
            }
        }

        console.log(`📊 Post-registration documents stored: ${results.summary.uploaded}/${results.summary.total}`);
        console.log(`   ✅ Verified: ${results.summary.verified}`);
        console.log(`   🟡 Pending: ${results.summary.pending}`);
        console.log(`   🔴 Rejected: ${results.summary.rejected}`);

        return results;
    }

    /**
     * Update document status (admin function)
     * @param {string} documentId - Document ID
     * @param {string} status - New status
     * @param {string} verifiedBy - Admin user ID
     * @param {string} rejectionReason - Reason if rejected
     */
    async updateDocumentStatus(documentId, status, verifiedBy = null, rejectionReason = null) {
        try {
            const updateData = {
                status: status,
                updated_at: new Date().toISOString()
            };

            if (status === DOCUMENT_STATUS.VERIFIED) {
                updateData.verified_by = verifiedBy;
                updateData.verified_at = new Date().toISOString();
                updateData.rejection_reason = null;
            } else if (status === DOCUMENT_STATUS.REJECTED) {
                updateData.rejection_reason = rejectionReason;
                updateData.verified_at = null;
            }

            const { data, error } = await supabase
                .from('user_documents')
                .update(updateData)
                .eq('id', documentId)
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                document: data,
                statusBadge: this.getStatusBadge(status)
            };

        } catch (error) {
            console.error('❌ Update status error:', error);
            return {
                success: false,
                message: 'Failed to update document status',
                error: error.message
            };
        }
    }

    /**
     * Get status badge for display
     */
    getStatusBadge(status) {
        const badges = {
            [DOCUMENT_STATUS.VERIFIED]: { icon: '✅', color: '#38e77b', label: 'Verified' },
            [DOCUMENT_STATUS.PENDING]: { icon: '🟡', color: '#f59e0b', label: 'Pending Review' },
            [DOCUMENT_STATUS.REJECTED]: { icon: '🔴', color: '#ef4444', label: 'Rejected' },
            [DOCUMENT_STATUS.EXPIRED]: { icon: '⚠️', color: '#f97316', label: 'Expired' },
            [DOCUMENT_STATUS.MISSING]: { icon: '❌', color: '#6b7280', label: 'Not Uploaded' }
        };

        return badges[status] || badges[DOCUMENT_STATUS.MISSING];
    }

    /**
     * Get status message
     */
    getStatusMessage(status, verificationResult = null) {
        switch (status) {
            case DOCUMENT_STATUS.VERIFIED:
                return 'Document verified successfully';
            case DOCUMENT_STATUS.PENDING:
                return 'Document uploaded and pending review (24-48 hours)';
            case DOCUMENT_STATUS.REJECTED:
                return verificationResult?.rejectionReason || 'Document was rejected. Please re-upload.';
            case DOCUMENT_STATUS.EXPIRED:
                return 'Document has expired. Please upload a current version.';
            default:
                return 'Document not uploaded';
        }
    }

    /**
     * Calculate document statistics
     */
    calculateDocumentStats(documentMap) {
        const stats = {
            total: 0,
            verified: 0,
            pending: 0,
            rejected: 0,
            missing: 0,
            expired: 0
        };

        for (const doc of Object.values(documentMap)) {
            if (doc.required) {
                stats.total++;
                switch (doc.status) {
                    case DOCUMENT_STATUS.VERIFIED:
                        stats.verified++;
                        break;
                    case DOCUMENT_STATUS.PENDING:
                        stats.pending++;
                        break;
                    case DOCUMENT_STATUS.REJECTED:
                        stats.rejected++;
                        break;
                    case DOCUMENT_STATUS.EXPIRED:
                        stats.expired++;
                        break;
                    default:
                        stats.missing++;
                }
            }
        }

        stats.completionPercentage = stats.total > 0 
            ? Math.round((stats.verified / stats.total) * 100) 
            : 0;

        return stats;
    }
}

module.exports = {
    DocumentCenterService,
    DOCUMENT_STATUS,
    DOCUMENT_TYPES,
    REQUIRED_DOCUMENTS
};

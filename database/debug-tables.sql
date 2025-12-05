-- Test just the table creation first

-- User Documents Table
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'kyc_id', 'kyc_passport', 'bank_statement', 'payslip', 'proof_of_address', 'tax_return'
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path to stored file (S3/cloud storage)
    file_size BIGINT NOT NULL, -- File size in bytes
    file_type VARCHAR(100) NOT NULL, -- MIME type (image/jpeg, application/pdf, etc.)
    upload_status VARCHAR(20) DEFAULT 'uploaded', -- 'uploading', 'uploaded', 'failed'
    verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired'
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_date TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES profiles(id), -- Admin who verified
    rejection_reason TEXT,
    expiry_date DATE, -- For documents with expiry (ID cards, etc.)
    is_primary BOOLEAN DEFAULT FALSE, -- For documents that can have multiple versions
    metadata JSONB, -- Additional document metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Approval History Table
CREATE TABLE IF NOT EXISTS document_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES user_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Document owner
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Admin who performed action
    action VARCHAR(20) NOT NULL, -- 'uploaded', 'approved', 'rejected', 'expired', 'updated'
    previous_status VARCHAR(20), -- Status before this action
    new_status VARCHAR(20), -- Status after this action
    notes TEXT, -- Admin notes or rejection reason
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Types Table
CREATE TABLE IF NOT EXISTS document_types (
    type_key VARCHAR(50) PRIMARY KEY, -- 'kyc_id', 'kyc_passport', etc.
    display_name VARCHAR(100) NOT NULL, -- 'National ID Card', 'Passport', etc.
    description TEXT, -- Description of the document
    is_required BOOLEAN DEFAULT false, -- Whether this document is mandatory
    expiry_required BOOLEAN DEFAULT false, -- Whether this document must have an expiry date
    verification_priority INTEGER DEFAULT 1, -- Priority for verification (1=highest)
    is_active BOOLEAN DEFAULT true, -- Whether this document type is currently used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_document_type ON user_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_user_documents_verification_status ON user_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_document_id ON document_approval_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_user_id ON document_approval_history(user_id);

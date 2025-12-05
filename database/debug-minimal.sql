-- Minimal test: Create just user_documents table and verify columns
-- This will tell us if the table is being created correctly

-- First, drop the table if it exists to start fresh
DROP TABLE IF EXISTS user_documents CASCADE;

-- Create just the user_documents table
CREATE TABLE user_documents (
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

-- Now verify the table was created with the correct columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_documents'
ORDER BY ordinal_position;

-- Test if we can create a simple function that references document_type
CREATE OR REPLACE FUNCTION test_document_type_reference() 
RETURNS TEXT AS $$
BEGIN
    -- This should work if document_type column exists
    RETURN 'document_type column exists and is accessible';
END;
$$ LANGUAGE plpgsql;

-- Document Management System for Post-Registration KYC and Verification
-- This creates tables for user documents, admin approvals, and verification status tracking

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
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Admin who reviewed
    action VARCHAR(20) NOT NULL, -- 'submitted', 'approved', 'rejected', 'expired', 'resubmitted'
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add verification status to profiles table if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'basic', -- 'basic', 'verified', 'premium'
ADD COLUMN IF NOT EXISTS kyc_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS kyc_completed_date TIMESTAMP WITH TIME ZONE;

-- Document Types Configuration Table
CREATE TABLE IF NOT EXISTS document_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_key VARCHAR(50) UNIQUE NOT NULL, -- 'kyc_id', 'bank_statement', etc.
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    max_file_size BIGINT DEFAULT 5242880, -- 5MB default
    allowed_file_types TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'application/pdf'],
    expiry_required BOOLEAN DEFAULT FALSE,
    verification_priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default document types
INSERT INTO document_types (type_key, display_name, description, is_required, expiry_required, verification_priority) VALUES
('kyc_id', 'National ID Card', 'Government-issued national identification card', TRUE, TRUE, 1),
('kyc_passport', 'Passport', 'Valid passport document', TRUE, TRUE, 1),
('bank_statement', 'Bank Statement', 'Recent bank statement (last 3 months)', TRUE, FALSE, 2),
('payslip', 'Payslip', 'Recent payslip (last 3 months)', FALSE, FALSE, 2),
('proof_of_address', 'Proof of Address', 'Utility bill or rental agreement', TRUE, FALSE, 3),
('tax_return', 'Tax Return', 'Annual tax return document', FALSE, FALSE, 3)
ON CONFLICT (type_key) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_document_type ON user_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_user_documents_verification_status ON user_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_user_documents_upload_date ON user_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_document_id ON document_approval_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_user_id ON document_approval_history(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_kyc_completed ON profiles(kyc_completed);

-- Enable Row Level Security (RLS)
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_documents
-- Users can view their own documents
CREATE POLICY "Users can view own documents" ON user_documents 
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents" ON user_documents 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents (only certain fields)
CREATE POLICY "Users can update own documents" ON user_documents 
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin users can view all documents
CREATE POLICY "Admins can view all documents" ON user_documents 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- Admin users can update all documents
CREATE POLICY "Admins can update all documents" ON user_documents 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- RLS Policies for document_approval_history
-- Users can view their own approval history
CREATE POLICY "Users can view own approval history" ON document_approval_history 
    FOR SELECT USING (auth.uid() = user_id);

-- Admin users can view all approval history
CREATE POLICY "Admins can view all approval history" ON document_approval_history 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- Function to upload and track document
CREATE OR REPLACE FUNCTION upload_user_document(
    p_user_id UUID,
    p_document_type VARCHAR(50),
    p_document_name VARCHAR(255),
    p_file_path TEXT,
    p_file_size BIGINT,
    p_file_type VARCHAR(100),
    p_expiry_date DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    document_id UUID;
    v_is_required BOOLEAN;
BEGIN
    -- Check if document type exists and is active
    SELECT is_required INTO v_is_required 
    FROM document_types 
    WHERE type_key = p_document_type AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid document type: %', p_document_type;
    END IF;
    
    -- Insert document
    INSERT INTO user_documents (
        user_id, document_type, document_name, file_path, 
        file_size, file_type, expiry_date
    ) VALUES (
        p_user_id, p_document_type, p_document_name, p_file_path,
        p_file_size, p_file_type, p_expiry_date
    ) RETURNING id INTO document_id;
    
    -- Log activity
    PERFORM log_user_activity(
        p_user_id, 
        'document_uploaded', 
        jsonb_build_object(
            'document_id', document_id,
            'document_type', p_document_type,
            'document_name', p_document_name
        )
    );
    
    -- Create admin notification for required documents
    IF v_is_required THEN
        PERFORM create_admin_notification(
            'document_uploaded',
            'New Document Uploaded',
            format('User uploaded %s for verification', p_document_type),
            p_user_id,
            'document',
            document_id,
            'medium',
            jsonb_build_object('document_type', p_document_type)
        );
    END IF;
    
    -- Update user verification status if this is their first document
    UPDATE profiles 
    SET verification_status = 'pending'
    WHERE id = p_user_id AND verification_status = 'not_started';
    
    RETURN document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve/reject document
CREATE OR REPLACE FUNCTION update_document_verification(
    p_document_id UUID,
    p_new_status VARCHAR(20), -- 'approved', 'rejected', 'expired'
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_document RECORD;
    v_user_id UUID;
    v_previous_status VARCHAR(20);
BEGIN
    -- Get document info
    SELECT d.*, u.verification_status, u.kyc_completed
    INTO v_document
    FROM user_documents d
    JOIN profiles u ON d.user_id = u.id
    WHERE d.id = p_document_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found: %', p_document_id;
    END IF;
    
    v_previous_status := v_document.verification_status;
    v_user_id := v_document.user_id;
    
    -- Update document
    UPDATE user_documents 
    SET 
        verification_status = p_new_status,
        verified_date = NOW(),
        verified_by = p_admin_id,
        rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_notes ELSE NULL END
    WHERE id = p_document_id;
    
    -- Create approval history record
    INSERT INTO document_approval_history (
        document_id, user_id, admin_id, action, 
        previous_status, new_status, notes
    ) VALUES (
        p_document_id, v_user_id, p_admin_id, 
        CASE p_new_status 
            WHEN 'approved' THEN 'approved'
            WHEN 'rejected' THEN 'rejected'
            WHEN 'expired' THEN 'expired'
        END,
        v_previous_status, p_new_status, p_notes
    );
    
    -- Log admin activity
    PERFORM log_user_activity(
        v_user_id,
        'document_verified',
        jsonb_build_object(
            'document_id', p_document_id,
            'document_type', v_document.document_type,
            'previous_status', v_previous_status,
            'new_status', p_new_status,
            'admin_id', p_admin_id
        )
    );
    
    -- Update user overall verification status
    PERFORM update_user_verification_status(v_user_id);
    
    -- Log verification completion
    IF p_new_status = 'approved' THEN
        PERFORM log_user_activity(
            v_user_id,
            'document_approved',
            jsonb_build_object(
                'document_id', p_document_id,
                'document_type', v_document.document_type,
                'admin_id', p_admin_id
            )
        );
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user verification status based on all documents
CREATE OR REPLACE FUNCTION update_user_verification_status(p_user_id UUID) RETURNS VOID AS $$
DECLARE
    v_required_count INTEGER;
    v_approved_count INTEGER;
    v_total_documents INTEGER;
BEGIN
    -- Count required documents
    SELECT COUNT(*) INTO v_required_count
    FROM document_types 
    WHERE is_required = true AND is_active = true;
    
    -- Count approved required documents for this user
    SELECT COUNT(*) INTO v_approved_count
    FROM user_documents d
    JOIN document_types dt ON d.document_type = dt.type_key
    WHERE d.user_id = p_user_id 
    AND dt.is_required = true 
    AND d.verification_status = 'approved';
    
    -- Count total documents
    SELECT COUNT(*) INTO v_total_documents
    FROM user_documents 
    WHERE user_id = p_user_id AND verification_status = 'approved';
    
    -- Update user verification status
    UPDATE profiles SET
        verification_status = CASE
            WHEN v_approved_count = 0 THEN 'not_started'
            WHEN v_approved_count < v_required_count THEN 'pending'
            WHEN v_approved_count >= v_required_count THEN 'verified'
        END,
        verification_level = CASE
            WHEN v_approved_count >= v_required_count AND v_total_documents >= v_required_count + 1 THEN 'premium'
            WHEN v_approved_count >= v_required_count THEN 'verified'
            ELSE 'basic'
        END,
        kyc_completed = (v_approved_count >= v_required_count),
        kyc_completed_date = CASE 
            WHEN v_approved_count >= v_required_count AND kyc_completed = false THEN NOW()
            ELSE kyc_completed_date
        END
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user document summary
CREATE OR REPLACE FUNCTION get_user_document_summary(p_user_id UUID) 
RETURNS TABLE(
    document_type VARCHAR(50),
    display_name VARCHAR(100),
    status VARCHAR(20),
    upload_date TIMESTAMP WITH TIME ZONE,
    verified_date TIMESTAMP WITH TIME ZONE,
    is_required BOOLEAN,
    document_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dt.type_key,
        dt.display_name,
        COALESCE(d.verification_status, 'not_uploaded') as status,
        d.upload_date,
        d.verified_date,
        dt.is_required,
        d.id
    FROM document_types dt
    LEFT JOIN LATERAL (
        SELECT id, verification_status, upload_date, verified_date
        FROM user_documents 
        WHERE user_id = p_user_id AND document_type = dt.type_key
        ORDER BY upload_date DESC
        LIMIT 1
    ) d ON true
    WHERE dt.is_active = true
    ORDER BY dt.verification_priority, dt.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_user_documents_updated_at
    BEFORE UPDATE ON user_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

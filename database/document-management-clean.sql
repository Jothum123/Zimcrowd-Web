-- Document Management System - Clean Version
-- Fixed execution order and removed conflicts

-- ============================================
-- STEP 1: CREATE ALL TABLES FIRST
-- ============================================

-- Document Types Table (must be first - referenced by others)
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

-- Verification Documents Table (for legacy post-registration compatibility)
CREATE TABLE IF NOT EXISTS verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    ocr_data JSONB,
    verification_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_document_type ON user_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_user_documents_verification_status ON user_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_user_documents_upload_date ON user_documents(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_document_id ON document_approval_history(document_id);
CREATE INDEX IF NOT EXISTS idx_document_approval_history_user_id ON document_approval_history(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_user_id ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_documents_document_type ON verification_documents(document_type);

-- ============================================
-- STEP 3: INSERT DEFAULT DATA
-- ============================================

INSERT INTO document_types (type_key, display_name, description, is_required, expiry_required, verification_priority) VALUES
('kyc_id', 'National ID Card', 'Government-issued national identification card', TRUE, TRUE, 1),
('kyc_passport', 'Passport', 'Valid passport document', TRUE, TRUE, 1),
('bank_statement', 'Bank Statement', 'Recent bank statement (last 3 months)', TRUE, FALSE, 2),
('payslip', 'Payslip', 'Recent payslip (last 3 months)', FALSE, FALSE, 2),
('proof_of_address', 'Proof of Address', 'Utility bill or rental agreement', TRUE, FALSE, 3),
('tax_return', 'Tax Return', 'Annual tax return document', FALSE, FALSE, 3)
ON CONFLICT (type_key) DO NOTHING;

-- ============================================
-- STEP 4: ENABLE RLS
-- ============================================

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE FUNCTIONS
-- ============================================

-- Helper function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to upload user document
CREATE OR REPLACE FUNCTION upload_user_document(
    p_user_id UUID,
    p_document_type VARCHAR(50),
    p_document_name VARCHAR(255),
    p_file_path TEXT,
    p_file_size BIGINT,
    p_file_type VARCHAR(100)
) RETURNS UUID AS $$
DECLARE
    document_id UUID;
    v_type_exists BOOLEAN;
BEGIN
    -- Check if document type exists and is active
    SELECT EXISTS (
        SELECT 1 FROM document_types 
        WHERE type_key = p_document_type AND is_active = true
    ) INTO v_type_exists;
    
    IF NOT v_type_exists THEN
        RAISE EXCEPTION 'Invalid document type: %', p_document_type;
    END IF;
    
    -- Insert document record
    INSERT INTO user_documents (
        user_id, document_type, document_name, file_path, 
        file_size, file_type, upload_status, verification_status
    ) VALUES (
        p_user_id, p_document_type, p_document_name, p_file_path,
        p_file_size, p_file_type, 'uploaded', 'pending'
    ) RETURNING id INTO document_id;
    
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
    
    RETURN TRUE;
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
        dt.type_key as document_type,
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

-- ============================================
-- STEP 6: CREATE TRIGGERS
-- ============================================

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_user_documents_updated_at
    BEFORE UPDATE ON user_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================

-- RLS Policies for user_documents
CREATE POLICY "Users can view own documents" ON user_documents 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON user_documents 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON user_documents 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents" ON user_documents 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- RLS Policies for document_approval_history
CREATE POLICY "Users can view own approval history" ON document_approval_history 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all approval history" ON document_approval_history 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

-- RLS Policies for verification_documents
CREATE POLICY "Users can view own verification documents" ON verification_documents 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification documents" ON verification_documents 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification documents" ON verification_documents 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au 
            WHERE au.user_id = auth.uid() AND au.is_active = true
        )
    );

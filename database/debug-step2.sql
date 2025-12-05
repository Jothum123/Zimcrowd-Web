-- Step 2: Test just the first function
-- Run this after tables are created successfully

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
    
    -- Log activity
    PERFORM log_user_activity(
        p_user_id,
        'document_uploaded',
        format('User uploaded %s for verification', p_document_type),
        jsonb_build_object('document_type', p_document_type)
    );
    
    RETURN document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

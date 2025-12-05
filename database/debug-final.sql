-- Final test: Handle duplicate trigger and test complete system
-- This should work now that we've verified all components individually

-- Drop trigger if it exists (handle duplicate)
DROP TRIGGER IF EXISTS update_user_documents_updated_at ON user_documents;

-- Recreate trigger
CREATE TRIGGER update_user_documents_updated_at
    BEFORE UPDATE ON user_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Test create_verification_document function (for legacy compatibility)
CREATE OR REPLACE FUNCTION create_verification_document(
    p_user_id UUID,
    p_document_type VARCHAR(50),
    p_file_path TEXT,
    p_file_name VARCHAR(255),
    p_file_size BIGINT,
    p_file_type VARCHAR(100),
    p_ocr_data JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    document_id UUID;
BEGIN
    INSERT INTO verification_documents (
        user_id, document_type, file_path, file_name, 
        file_size, file_type, ocr_data
    ) VALUES (
        p_user_id, p_document_type, p_file_path, p_file_name,
        p_file_size, p_file_type, p_ocr_data
    ) RETURNING id INTO document_id;
    
    RETURN document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the complete system by calling one of the functions
-- This should work without "column document_type does not exist" error
SELECT get_user_document_summary('00000000-0000-0000-0000-000000000000'::UUID) LIMIT 1;

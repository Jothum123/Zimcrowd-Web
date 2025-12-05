-- Step 4: Test get_user_document_summary function
-- This is the function I previously fixed by adding column alias

-- Drop any cached version first
DROP FUNCTION IF EXISTS get_user_document_summary(UUID);

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

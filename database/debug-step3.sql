-- Step 3: Test update_document_verification function
-- This function references v_document.document_type which might be causing the error

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
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

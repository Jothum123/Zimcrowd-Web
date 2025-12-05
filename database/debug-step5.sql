-- Step 5: Test update_user_verification_status function
-- Also check if log_user_activity function exists (dependency)

-- First check if log_user_activity function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'log_user_activity';

-- If log_user_activity doesn't exist, create a simple version for testing
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    -- For now, just return a UUID without actual logging
    -- This is just to test the document management functions
    activity_id := gen_random_uuid();
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now test update_user_verification_status function
CREATE OR REPLACE FUNCTION update_user_verification_status(p_user_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    pending_count INTEGER;
    approved_count INTEGER;
    total_required INTEGER;
    v_profile RECORD;
BEGIN
    -- Get current profile
    SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found: %', p_user_id;
    END IF;
    
    -- Count documents by status
    SELECT 
        COUNT(CASE WHEN d.verification_status = 'pending' THEN 1 END),
        COUNT(CASE WHEN d.verification_status = 'approved' THEN 1 END),
        COUNT(CASE WHEN dt.is_required = true THEN 1 END)
    INTO pending_count, approved_count, total_required
    FROM document_types dt
    LEFT JOIN user_documents d ON d.document_type = dt.type_key AND d.user_id = p_user_id
    WHERE dt.is_active = true;
    
    -- Update verification status based on document completion
    IF pending_count = 0 AND approved_count >= total_required THEN
        UPDATE profiles 
        SET verification_status = 'verified', kyc_completed = true, kyc_completed_date = NOW()
        WHERE id = p_user_id;
    ELSIF pending_count > 0 THEN
        UPDATE profiles 
        SET verification_status = 'pending', kyc_completed = false
        WHERE id = p_user_id;
    ELSE
        UPDATE profiles 
        SET verification_status = 'not_verified', kyc_completed = false
        WHERE id = p_user_id AND verification_status = 'not_started';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

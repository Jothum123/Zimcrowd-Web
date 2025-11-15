-- PROFILE COMPLETION & ACCOUNT SETUP SCHEMA
-- Complete user profile setup with automatic status transitions

-- =====================================================
-- 1. EXTEND USERS TABLE FOR PROFILE COMPLETION
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS next_of_kin_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_details_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_documents_submitted BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_completion_percentage INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP;

-- Profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Zimbabwe';
ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50);

-- =====================================================
-- 2. CREATE EMPLOYMENT_DETAILS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS employment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employment_status VARCHAR(50) NOT NULL,
    employer_name VARCHAR(255),
    job_title VARCHAR(255),
    employment_type VARCHAR(50),
    industry VARCHAR(100),
    years_employed DECIMAL(4, 1),
    monthly_income DECIMAL(15, 2),
    other_income_sources TEXT,
    employer_phone VARCHAR(20),
    employer_email VARCHAR(255),
    employer_address TEXT,
    work_start_date DATE,
    employment_letter_url TEXT,
    payslip_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_employment_user ON employment_details(user_id);

-- Employment Status Options:
-- 'employed_full_time', 'employed_part_time', 'self_employed', 
-- 'unemployed', 'retired', 'student'

-- =====================================================
-- 3. CREATE NEXT_OF_KIN TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS next_of_kin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Zimbabwe',
    date_of_birth DATE,
    national_id VARCHAR(50),
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_next_of_kin_user ON next_of_kin(user_id);
CREATE INDEX IF NOT EXISTS idx_next_of_kin_primary ON next_of_kin(user_id, is_primary);

-- =====================================================
-- 4. CREATE PAYMENT_DETAILS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_method VARCHAR(50) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    account_name VARCHAR(255),
    branch_name VARCHAR(255),
    branch_code VARCHAR(50),
    swift_code VARCHAR(50),
    mobile_money_provider VARCHAR(100),
    mobile_money_number VARCHAR(20),
    is_primary BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_details_user ON payment_details(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_details_primary ON payment_details(user_id, is_primary);

-- Payment Method Options:
-- 'bank_account', 'mobile_money', 'ecocash', 'onemoney', 'telecash'

-- =====================================================
-- 5. CREATE PROFILE_COMPLETION_TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS profile_completion_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    step_category VARCHAR(50) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, step_name)
);

CREATE INDEX IF NOT EXISTS idx_profile_tracking_user ON profile_completion_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tracking_completed ON profile_completion_tracking(user_id, is_completed);

-- Step Categories:
-- 'profile', 'employment', 'next_of_kin', 'payment', 'kyc_documents'

-- =====================================================
-- 6. CREATE FUNCTION TO CALCULATE SETUP COMPLETION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_setup_completion(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total_steps INTEGER := 5;
    v_completed_steps INTEGER := 0;
    v_percentage INTEGER;
BEGIN
    -- Check profile completion
    IF (SELECT profile_completed FROM users WHERE id = p_user_id) THEN
        v_completed_steps := v_completed_steps + 1;
    END IF;
    
    -- Check employment completion
    IF (SELECT employment_completed FROM users WHERE id = p_user_id) THEN
        v_completed_steps := v_completed_steps + 1;
    END IF;
    
    -- Check next of kin completion
    IF (SELECT next_of_kin_completed FROM users WHERE id = p_user_id) THEN
        v_completed_steps := v_completed_steps + 1;
    END IF;
    
    -- Check payment details completion
    IF (SELECT payment_details_completed FROM users WHERE id = p_user_id) THEN
        v_completed_steps := v_completed_steps + 1;
    END IF;
    
    -- Check KYC documents submission
    IF (SELECT kyc_documents_submitted FROM users WHERE id = p_user_id) THEN
        v_completed_steps := v_completed_steps + 1;
    END IF;
    
    -- Calculate percentage
    v_percentage := (v_completed_steps * 100) / v_total_steps;
    
    -- Update user record
    UPDATE users 
    SET setup_completion_percentage = v_percentage,
        setup_completed_at = CASE 
            WHEN v_percentage = 100 THEN NOW() 
            ELSE NULL 
        END
    WHERE id = p_user_id;
    
    RETURN v_percentage;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE FUNCTION TO AUTO-TRANSITION ACCOUNT STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION auto_transition_account_status()
RETURNS TRIGGER AS $$
DECLARE
    v_completion_percentage INTEGER;
    v_all_details_complete BOOLEAN;
BEGIN
    -- Calculate current completion percentage
    v_completion_percentage := calculate_setup_completion(NEW.id);
    
    -- Check if all details are completed
    SELECT 
        profile_completed AND 
        employment_completed AND 
        next_of_kin_completed AND 
        payment_details_completed AND
        kyc_documents_submitted
    INTO v_all_details_complete
    FROM users
    WHERE id = NEW.id;
    
    -- Auto-transition to pending_verification when all details complete
    IF v_all_details_complete AND NEW.account_status = 'pending_verification' AND NEW.kyc_status = 'not_submitted' THEN
        UPDATE users
        SET 
            kyc_status = 'submitted',
            account_status = 'pending_verification',
            status_reason = 'Profile completed. KYC documents awaiting admin review.',
            status_changed_at = NOW()
        WHERE id = NEW.id;
        
        -- Create notification
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            priority,
            created_at
        ) VALUES (
            NEW.id,
            'profile_completed',
            'Profile Setup Complete!',
            'Your profile is now complete. Your KYC documents are being reviewed by our team. You will be notified once approved.',
            'high',
            NOW()
        );
        
        -- Record status change
        INSERT INTO account_status_history (
            user_id,
            previous_status,
            new_status,
            reason,
            changed_by_role,
            created_at
        ) VALUES (
            NEW.id,
            'pending_verification',
            'pending_verification',
            'Profile setup completed. KYC submitted for review.',
            'system',
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-transition
DROP TRIGGER IF EXISTS trigger_auto_transition_status ON users;
CREATE TRIGGER trigger_auto_transition_status
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN (
        NEW.profile_completed = true OR
        NEW.employment_completed = true OR
        NEW.next_of_kin_completed = true OR
        NEW.payment_details_completed = true OR
        NEW.kyc_documents_submitted = true
    )
    EXECUTE FUNCTION auto_transition_account_status();

-- =====================================================
-- 8. CREATE FUNCTION TO UPDATE COMPLETION FLAGS
-- =====================================================

-- Trigger for employment details
CREATE OR REPLACE FUNCTION mark_employment_completed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        employment_completed = true,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Track completion
    INSERT INTO profile_completion_tracking (
        user_id,
        step_name,
        step_category,
        is_completed,
        completed_at
    ) VALUES (
        NEW.user_id,
        'employment_details',
        'employment',
        true,
        NOW()
    )
    ON CONFLICT (user_id, step_name) 
    DO UPDATE SET 
        is_completed = true,
        completed_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employment_completed ON employment_details;
CREATE TRIGGER trigger_employment_completed
    AFTER INSERT OR UPDATE ON employment_details
    FOR EACH ROW
    EXECUTE FUNCTION mark_employment_completed();

-- Trigger for next of kin
CREATE OR REPLACE FUNCTION mark_next_of_kin_completed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        next_of_kin_completed = true,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Track completion
    INSERT INTO profile_completion_tracking (
        user_id,
        step_name,
        step_category,
        is_completed,
        completed_at
    ) VALUES (
        NEW.user_id,
        'next_of_kin',
        'next_of_kin',
        true,
        NOW()
    )
    ON CONFLICT (user_id, step_name) 
    DO UPDATE SET 
        is_completed = true,
        completed_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_next_of_kin_completed ON next_of_kin;
CREATE TRIGGER trigger_next_of_kin_completed
    AFTER INSERT OR UPDATE ON next_of_kin
    FOR EACH ROW
    EXECUTE FUNCTION mark_next_of_kin_completed();

-- Trigger for payment details
CREATE OR REPLACE FUNCTION mark_payment_completed()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET 
        payment_details_completed = true,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    -- Track completion
    INSERT INTO profile_completion_tracking (
        user_id,
        step_name,
        step_category,
        is_completed,
        completed_at
    ) VALUES (
        NEW.user_id,
        'payment_details',
        'payment',
        true,
        NOW()
    )
    ON CONFLICT (user_id, step_name) 
    DO UPDATE SET 
        is_completed = true,
        completed_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_completed ON payment_details;
CREATE TRIGGER trigger_payment_completed
    AFTER INSERT OR UPDATE ON payment_details
    FOR EACH ROW
    EXECUTE FUNCTION mark_payment_completed();

-- Trigger for KYC documents
CREATE OR REPLACE FUNCTION mark_kyc_documents_submitted()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user has submitted required documents
    IF (SELECT COUNT(*) FROM verification_documents 
        WHERE user_id = NEW.user_id AND status != 'rejected') >= 2 THEN
        
        UPDATE users
        SET 
            kyc_documents_submitted = true,
            updated_at = NOW()
        WHERE id = NEW.user_id;
        
        -- Track completion
        INSERT INTO profile_completion_tracking (
            user_id,
            step_name,
            step_category,
            is_completed,
            completed_at
        ) VALUES (
            NEW.user_id,
            'kyc_documents',
            'kyc_documents',
            true,
            NOW()
        )
        ON CONFLICT (user_id, step_name) 
        DO UPDATE SET 
            is_completed = true,
            completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_kyc_documents_submitted ON verification_documents;
CREATE TRIGGER trigger_kyc_documents_submitted
    AFTER INSERT OR UPDATE ON verification_documents
    FOR EACH ROW
    EXECUTE FUNCTION mark_kyc_documents_submitted();

-- =====================================================
-- 9. CREATE VIEW FOR PROFILE COMPLETION STATUS
-- =====================================================

CREATE OR REPLACE VIEW user_profile_completion AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.account_status,
    u.kyc_status,
    u.profile_completed,
    u.employment_completed,
    u.next_of_kin_completed,
    u.payment_details_completed,
    u.kyc_documents_submitted,
    u.setup_completion_percentage,
    u.setup_completed_at,
    CASE 
        WHEN u.setup_completion_percentage = 100 THEN 'Complete'
        WHEN u.setup_completion_percentage >= 80 THEN 'Almost Complete'
        WHEN u.setup_completion_percentage >= 50 THEN 'In Progress'
        ELSE 'Just Started'
    END as completion_status,
    ARRAY[
        CASE WHEN NOT u.profile_completed THEN 'Complete Profile' END,
        CASE WHEN NOT u.employment_completed THEN 'Add Employment Details' END,
        CASE WHEN NOT u.next_of_kin_completed THEN 'Add Next of Kin' END,
        CASE WHEN NOT u.payment_details_completed THEN 'Add Payment Details' END,
        CASE WHEN NOT u.kyc_documents_submitted THEN 'Upload KYC Documents' END
    ]::TEXT[] as pending_steps
FROM users u;

-- =====================================================
-- 10. CREATE VIEW FOR ADMIN KYC REVIEW QUEUE
-- =====================================================

CREATE OR REPLACE VIEW admin_kyc_review_queue AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.phone_number,
    u.account_status,
    u.kyc_status,
    u.setup_completion_percentage,
    u.created_at as registered_at,
    COUNT(vd.id) as documents_count,
    MAX(vd.submitted_at) as last_document_submitted,
    ARRAY_AGG(DISTINCT vd.document_type) as document_types,
    CASE 
        WHEN u.kyc_status = 'submitted' THEN 1
        WHEN u.kyc_status = 'under_review' THEN 2
        ELSE 3
    END as priority_order
FROM users u
LEFT JOIN verification_documents vd ON u.id = vd.user_id
WHERE u.kyc_documents_submitted = true
  AND u.kyc_status IN ('submitted', 'under_review')
GROUP BY u.id, u.email, u.full_name, u.phone_number, u.account_status, u.kyc_status, u.setup_completion_percentage, u.created_at
ORDER BY priority_order, last_document_submitted DESC;

-- =====================================================
-- 11. COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE employment_details IS 'Stores user employment information for credit assessment';
COMMENT ON TABLE next_of_kin IS 'Stores emergency contact and next of kin information';
COMMENT ON TABLE payment_details IS 'Stores user payment methods for disbursements and repayments';
COMMENT ON TABLE profile_completion_tracking IS 'Tracks individual profile setup steps';

COMMENT ON COLUMN users.setup_completion_percentage IS 'Percentage of profile setup completed (0-100)';
COMMENT ON COLUMN users.profile_completed IS 'Basic profile information completed';
COMMENT ON COLUMN users.employment_completed IS 'Employment details added';
COMMENT ON COLUMN users.next_of_kin_completed IS 'Next of kin information added';
COMMENT ON COLUMN users.payment_details_completed IS 'Payment details added';
COMMENT ON COLUMN users.kyc_documents_submitted IS 'KYC documents uploaded';

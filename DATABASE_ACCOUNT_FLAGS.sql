-- ACCOUNT FLAGGING SYSTEM
-- Database schema for account status management

-- =====================================================
-- 1. UPDATE USERS TABLE - ADD ACCOUNT STATUS FIELDS
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'pending_verification';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_flags JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'not_submitted';
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity_at);

-- =====================================================
-- 2. CREATE ACCOUNT_STATUS_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS account_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    changed_by_role VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_user ON account_status_history(user_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON account_status_history(created_at DESC);

-- =====================================================
-- 3. CREATE ACCOUNT_FLAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS account_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flag_type VARCHAR(50) NOT NULL,
    flag_category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    flagged_by UUID REFERENCES users(id),
    flagged_by_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flags_user ON account_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_flags_type ON account_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_flags_active ON account_flags(is_active);
CREATE INDEX IF NOT EXISTS idx_flags_severity ON account_flags(severity);

-- =====================================================
-- 4. ACCOUNT STATUS ENUM VALUES
-- =====================================================

-- Account Status Options:
-- 'pending_verification' - New account, awaiting KYC verification
-- 'active' - Fully verified and active account
-- 'arrears' - Account with overdue payments
-- 'suspended' - Temporarily suspended account
-- 'restricted' - Limited functionality
-- 'closed' - Permanently closed account
-- 'under_review' - Account under investigation

-- KYC Status Options:
-- 'not_submitted' - No KYC documents submitted
-- 'submitted' - Documents submitted, awaiting review
-- 'under_review' - Documents being reviewed
-- 'verified' - KYC approved
-- 'rejected' - KYC rejected
-- 'expired' - KYC verification expired

-- Flag Types:
-- 'payment_default' - Failed to make payments
-- 'suspicious_activity' - Unusual account activity
-- 'fraud_alert' - Potential fraud detected
-- 'kyc_incomplete' - KYC not completed
-- 'multiple_accounts' - Multiple accounts detected
-- 'high_risk' - High risk assessment
-- 'manual_review' - Requires manual review

-- Flag Severity:
-- 'low' - Minor issue
-- 'medium' - Moderate concern
-- 'high' - Serious issue
-- 'critical' - Immediate action required

-- =====================================================
-- 5. CREATE ARREARS TRACKING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS arrears_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    installment_id UUID,
    amount_overdue DECIMAL(15, 2) NOT NULL,
    days_overdue INTEGER NOT NULL,
    original_due_date DATE NOT NULL,
    last_payment_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    recovery_status VARCHAR(50) DEFAULT 'pending',
    recovery_started_at TIMESTAMP,
    resolved_at TIMESTAMP,
    resolution_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arrears_user ON arrears_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_arrears_loan ON arrears_tracking(loan_id);
CREATE INDEX IF NOT EXISTS idx_arrears_status ON arrears_tracking(status);
CREATE INDEX IF NOT EXISTS idx_arrears_days ON arrears_tracking(days_overdue DESC);

-- =====================================================
-- 6. CREATE ACCOUNT_RESTRICTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS account_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restriction_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    applied_by UUID REFERENCES users(id),
    applied_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    removed_at TIMESTAMP,
    removed_by UUID REFERENCES users(id),
    removal_reason TEXT,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_restrictions_user ON account_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_active ON account_restrictions(is_active);
CREATE INDEX IF NOT EXISTS idx_restrictions_type ON account_restrictions(restriction_type);

-- Restriction Types:
-- 'no_new_loans' - Cannot request new loans
-- 'no_investments' - Cannot make new investments
-- 'no_withdrawals' - Cannot withdraw funds
-- 'no_secondary_market' - Cannot use secondary market
-- 'reduced_limits' - Reduced transaction limits
-- 'kyc_required' - Must complete KYC to proceed

-- =====================================================
-- 7. CREATE VERIFICATION_DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_number VARCHAR(100),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    expiry_date DATE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_type ON verification_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_documents(status);

-- Document Types:
-- 'national_id' - National ID card
-- 'passport' - Passport
-- 'drivers_license' - Driver's license
-- 'proof_of_address' - Utility bill, bank statement
-- 'bank_statement' - Bank statement
-- 'payslip' - Salary slip
-- 'employment_contract' - Employment contract
-- 'selfie' - Selfie with ID

-- =====================================================
-- 8. CREATE FUNCTIONS FOR AUTOMATIC STATUS UPDATES
-- =====================================================

-- Function to automatically flag accounts in arrears
CREATE OR REPLACE FUNCTION check_and_flag_arrears()
RETURNS TRIGGER AS $$
BEGIN
    -- If loan installment is overdue by 1+ days
    IF NEW.status = 'overdue' AND NEW.due_date < CURRENT_DATE THEN
        -- Update user account status to arrears
        UPDATE users 
        SET 
            account_status = 'arrears',
            status_reason = 'Overdue payment detected',
            status_changed_at = NOW()
        WHERE id = (SELECT user_id FROM loans WHERE id = NEW.loan_id);
        
        -- Create arrears tracking record
        INSERT INTO arrears_tracking (
            user_id,
            loan_id,
            installment_id,
            amount_overdue,
            days_overdue,
            original_due_date
        )
        SELECT 
            l.user_id,
            NEW.loan_id,
            NEW.id,
            NEW.total_amount,
            CURRENT_DATE - NEW.due_date,
            NEW.due_date
        FROM loans l
        WHERE l.id = NEW.loan_id
        ON CONFLICT DO NOTHING;
        
        -- Create account flag
        INSERT INTO account_flags (
            user_id,
            flag_type,
            flag_category,
            severity,
            reason,
            flagged_by_system
        )
        SELECT 
            l.user_id,
            'payment_default',
            'arrears',
            CASE 
                WHEN CURRENT_DATE - NEW.due_date > 30 THEN 'critical'
                WHEN CURRENT_DATE - NEW.due_date > 14 THEN 'high'
                WHEN CURRENT_DATE - NEW.due_date > 7 THEN 'medium'
                ELSE 'low'
            END,
            'Payment overdue by ' || (CURRENT_DATE - NEW.due_date) || ' days',
            true
        FROM loans l
        WHERE l.id = NEW.loan_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for arrears checking
DROP TRIGGER IF EXISTS trigger_check_arrears ON loan_installments;
CREATE TRIGGER trigger_check_arrears
    AFTER UPDATE ON loan_installments
    FOR EACH ROW
    WHEN (NEW.status = 'overdue')
    EXECUTE FUNCTION check_and_flag_arrears();

-- Function to update last activity
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users 
    SET last_activity_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity tracking
DROP TRIGGER IF EXISTS trigger_activity_transactions ON transactions;
CREATE TRIGGER trigger_activity_transactions
    AFTER INSERT ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity();

DROP TRIGGER IF EXISTS trigger_activity_loans ON loans;
CREATE TRIGGER trigger_activity_loans
    AFTER INSERT ON loans
    FOR EACH ROW
    EXECUTE FUNCTION update_last_activity();

-- =====================================================
-- 9. CREATE VIEWS FOR REPORTING
-- =====================================================

-- View for account status summary
CREATE OR REPLACE VIEW account_status_summary AS
SELECT 
    account_status,
    COUNT(*) as user_count,
    COUNT(CASE WHEN kyc_status = 'verified' THEN 1 END) as verified_count,
    COUNT(CASE WHEN account_flags::text != '[]' THEN 1 END) as flagged_count
FROM users
GROUP BY account_status;

-- View for arrears summary
CREATE OR REPLACE VIEW arrears_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    COUNT(a.id) as total_arrears,
    SUM(a.amount_overdue) as total_amount_overdue,
    MAX(a.days_overdue) as max_days_overdue,
    MIN(a.original_due_date) as earliest_due_date
FROM users u
JOIN arrears_tracking a ON u.id = a.user_id
WHERE a.status = 'active'
GROUP BY u.id, u.email, u.full_name;

-- View for active flags
CREATE OR REPLACE VIEW active_flags_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.account_status,
    COUNT(f.id) as total_flags,
    COUNT(CASE WHEN f.severity = 'critical' THEN 1 END) as critical_flags,
    COUNT(CASE WHEN f.severity = 'high' THEN 1 END) as high_flags,
    array_agg(DISTINCT f.flag_type) as flag_types
FROM users u
JOIN account_flags f ON u.id = f.user_id
WHERE f.is_active = true
GROUP BY u.id, u.email, u.account_status;

-- =====================================================
-- 10. INSERT DEFAULT DATA
-- =====================================================

-- Update existing users to have proper status
UPDATE users 
SET 
    account_status = CASE 
        WHEN kyc_verified_at IS NOT NULL THEN 'active'
        ELSE 'pending_verification'
    END,
    kyc_status = CASE 
        WHEN kyc_verified_at IS NOT NULL THEN 'verified'
        ELSE 'not_submitted'
    END
WHERE account_status IS NULL;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE account_status_history IS 'Tracks all changes to user account status';
COMMENT ON TABLE account_flags IS 'Stores flags and alerts for user accounts';
COMMENT ON TABLE arrears_tracking IS 'Tracks overdue payments and arrears';
COMMENT ON TABLE account_restrictions IS 'Manages restrictions applied to accounts';
COMMENT ON TABLE verification_documents IS 'Stores KYC and verification documents';

COMMENT ON COLUMN users.account_status IS 'Current status of the account (active, arrears, suspended, etc.)';
COMMENT ON COLUMN users.account_flags IS 'JSON array of active flags on the account';
COMMENT ON COLUMN users.kyc_status IS 'KYC verification status';
COMMENT ON COLUMN users.last_activity_at IS 'Timestamp of last user activity';

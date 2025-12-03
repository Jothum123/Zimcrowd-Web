-- User Management Schema
-- Tables for user activities, AML tracking, and unban requests

-- ============================================
-- USER ACTIVITIES TABLE
-- Logs all user activities for compliance and audit
-- ============================================
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_type ON user_activities(user_id, activity_type);

-- Activity types:
-- deposit, withdrawal, loan_funding, loan_request, loan_repayment, loan_disbursement
-- transfer, aml_flag, aml_cleared, document_upload, kyc_verification
-- account_suspended, account_unsuspended, account_banned, account_unbanned

COMMENT ON TABLE user_activities IS 'Audit trail for all user activities including deposits, withdrawals, loans, and AML flags';

-- ============================================
-- UNBAN REQUESTS TABLE
-- Users can request to be unbanned/unsuspended
-- ============================================
CREATE TABLE IF NOT EXISTS unban_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    supporting_documents JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unban_requests_user_id ON unban_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_unban_requests_status ON unban_requests(status);
CREATE INDEX IF NOT EXISTS idx_unban_requests_created_at ON unban_requests(created_at DESC);

COMMENT ON TABLE unban_requests IS 'Requests from users to lift account suspension or ban';

-- ============================================
-- ADD COLUMNS TO USER_PROFILES FOR SUSPENSION/BAN TRACKING
-- ============================================
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'suspended', 'banned', 'flagged', 'pending_verification'));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspension_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspension_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS suspended_by UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unsuspended_by UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unsuspended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ban_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS banned_by UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unbanned_by UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS unbanned_at TIMESTAMP WITH TIME ZONE;

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- ============================================
-- AML DOCUMENTS TABLE (if not exists)
-- Track AML-specific documents
-- ============================================
-- Note: Uses existing user_documents table with document_type = 'proof_of_income' or 'source_of_funds'

-- Add AML document types to user_documents if needed
DO $$
BEGIN
    -- Check if constraint exists and modify if needed
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_documents_document_type_check') THEN
        ALTER TABLE user_documents DROP CONSTRAINT user_documents_document_type_check;
    END IF;
    
    -- Add new constraint with AML document types
    ALTER TABLE user_documents ADD CONSTRAINT user_documents_document_type_check 
        CHECK (document_type IN (
            'national_id', 'national_id_front', 'national_id_back',
            'passport', 'drivers_license',
            'selfie', 'proof_of_residence', 'bank_statement',
            'payslip', 'employment_contract',
            'proof_of_income', 'source_of_funds',
            'mobile_money_statement', 'business_registration',
            'other'
        ));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not update document_type constraint: %', SQLERRM;
END $$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE unban_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activities
CREATE POLICY "Users can view own activities" ON user_activities
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own unban requests
CREATE POLICY "Users can view own unban requests" ON unban_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create unban requests
CREATE POLICY "Users can create unban requests" ON unban_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to activities" ON user_activities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to unban requests" ON unban_requests
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to auto-unsuspend users after suspension period
CREATE OR REPLACE FUNCTION auto_unsuspend_users()
RETURNS void AS $$
BEGIN
    UPDATE user_profiles
    SET 
        status = 'active',
        suspension_reason = NULL,
        suspension_date = NULL,
        suspension_end_date = NULL,
        unsuspended_at = NOW()
    WHERE 
        status = 'suspended' 
        AND suspension_end_date IS NOT NULL 
        AND suspension_end_date <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(50),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_activity_id UUID;
BEGIN
    INSERT INTO user_activities (user_id, activity_type, metadata)
    VALUES (p_user_id, p_activity_type, p_metadata)
    RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SAMPLE DATA COMMENTS
-- ============================================
/*
Activity Types:
- deposit: User deposited funds
- withdrawal: User withdrew funds
- loan_funding: Lender funded a loan
- loan_request: Borrower requested a loan
- loan_repayment: Loan repayment made
- loan_disbursement: Loan funds disbursed
- transfer: Internal transfer
- aml_flag: AML compliance flag triggered
- aml_cleared: AML flag cleared by admin
- document_upload: Document uploaded
- kyc_verification: KYC verification completed
- account_suspended: Account suspended
- account_unsuspended: Account unsuspended
- account_banned: Account banned
- account_unbanned: Account unbanned

Metadata examples:
{
    "amount": 5000,
    "reason": "HIGH_VALUE_DEPOSIT",
    "threshold": 5000,
    "action": "ADDITIONAL_DOCUMENTS_REQUIRED"
}
*/

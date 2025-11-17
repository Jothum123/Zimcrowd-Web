-- Admin Actions Audit Trail Schema
-- Track all admin manual transactions and actions

-- Create admin_actions table for audit trail
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id VARCHAR(255) NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_user_id UUID REFERENCES users(id),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at ON admin_actions(created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_date ON admin_actions(admin_id, created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access admin actions
CREATE POLICY "Service role can access admin actions" ON admin_actions
    FOR ALL USING (auth.role() = 'service_role');

-- Policy: Authenticated users cannot access admin actions directly
CREATE POLICY "Users cannot access admin actions" ON admin_actions
    FOR ALL USING (false);

-- Add comments for documentation
COMMENT ON TABLE admin_actions IS 'Audit trail for all admin actions including manual transactions';
COMMENT ON COLUMN admin_actions.admin_id IS 'ID of the admin who performed the action';
COMMENT ON COLUMN admin_actions.admin_name IS 'Name of the admin for easy identification';
COMMENT ON COLUMN admin_actions.action IS 'Type of action performed (manual_deposit, manual_debit, etc.)';
COMMENT ON COLUMN admin_actions.target_user_id IS 'User affected by the action (if applicable)';
COMMENT ON COLUMN admin_actions.details IS 'JSON object containing action-specific details';

-- Sample admin actions that will be tracked:
-- manual_deposit: Manual deposit to user account
-- manual_debit: Manual debit from user account
-- bank_transfer_deposit: Bank transfer deposit processing
-- bulk_manual_transactions: Bulk transaction processing
-- user_balance_check: Admin checking user balance
-- user_validation: Admin validating user details
-- withdrawal_approval: Admin approving withdrawal
-- withdrawal_rejection: Admin rejecting withdrawal
-- account_suspension: Admin suspending user account
-- account_reactivation: Admin reactivating user account

-- Example details JSON structure for different actions:
/*
manual_deposit:
{
  "amount": 500.00,
  "currency": "USD",
  "reference": "MANUAL-DEP-1234567890",
  "notes": "Bank transfer deposit verification",
  "source_details": {
    "bank_name": "FBC Bank",
    "depositor_name": "John Doe"
  }
}

manual_debit:
{
  "amount": 50.00,
  "currency": "USD",
  "reference": "MANUAL-DEB-1234567890",
  "reason": "Service fee adjustment",
  "notes": "Correcting duplicate payment",
  "force_debit": false
}

bank_transfer_deposit:
{
  "amount": 1000.00,
  "currency": "USD",
  "reference": "BANK-1234567890",
  "bank_details": {
    "bank_name": "CBZ Bank",
    "account_number": "1234567890",
    "depositor_name": "Jane Smith",
    "deposit_date": "2024-11-17T10:30:00Z"
  }
}

bulk_manual_transactions:
{
  "total_transactions": 25,
  "successful": 23,
  "failed": 2,
  "processed_at": "2024-11-17T10:30:00Z"
}
*/

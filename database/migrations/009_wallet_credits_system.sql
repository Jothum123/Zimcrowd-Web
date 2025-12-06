-- Wallet Credits System Migration
-- Creates comprehensive credit management for discounts, referrals, and early repayment bonuses

BEGIN;

-- Create wallet_credits table
CREATE TABLE IF NOT EXISTS wallet_credits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_type TEXT NOT NULL CHECK (credit_type IN ('tier_discount', 'referral', 'early_repayment_bonus')),
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    source_reference TEXT, -- Reference to loan_id, referral_code, etc.
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'expired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    available_at TIMESTAMP, -- When credits become available for withdrawal
    expires_at TIMESTAMP, -- Credit expiration date
    withdrawn_at TIMESTAMP,
    withdrawal_method TEXT, -- 'bank_transfer', 'platform_credit', etc.
    notes TEXT,
    metadata JSONB -- Additional data for specific credit types
);

-- Create credit_transactions table for tracking credit usage
CREATE TABLE IF NOT EXISTS credit_transactions (
    id SERIAL PRIMARY KEY,
    credit_id INTEGER NOT NULL REFERENCES wallet_credits(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'withdrawn', 'expired', 'used')),
    amount DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_id TEXT,
    notes TEXT
);

-- Create credit_withdrawal_requests table
CREATE TABLE IF NOT EXISTS credit_withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('bank_transfer', 'mobile_money', 'platform_credit')),
    withdrawal_details JSONB NOT NULL, -- Bank account info, mobile number, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    processed_by INTEGER REFERENCES users(id),
    notes TEXT,
    tracking_reference TEXT UNIQUE
);

-- Create indexes for performance
CREATE INDEX idx_wallet_credits_user_id ON wallet_credits(user_id);
CREATE INDEX idx_wallet_credits_type_status ON wallet_credits(credit_type, status);
CREATE INDEX idx_wallet_credits_available_at ON wallet_credits(available_at);
CREATE INDEX idx_credit_transactions_credit_id ON credit_transactions(credit_id);
CREATE INDEX idx_credit_withdrawal_requests_user_id ON credit_withdrawal_requests(user_id);
CREATE INDEX idx_credit_withdrawal_requests_status ON credit_withdrawal_requests(status);

-- Create credit configuration table
CREATE TABLE IF NOT EXISTS credit_config (
    id SERIAL PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default credit configuration
INSERT INTO credit_config (config_key, config_value, description) VALUES
('tier_discount_percentage', '10', 'Percentage of lender fees converted to credits'),
('referral_bonus_amount', '5.00', 'Fixed amount awarded for successful referrals'),
('early_repayment_bonus_percentage', '50', 'Percentage of saved interest awarded as credits'),
('credit_expiry_days', '365', 'Days until credits expire'),
('minimum_withdrawal_amount', '10.00', 'Minimum amount that can be withdrawn'),
('withdrawal_processing_days', '3', 'Days to process withdrawal requests')
ON CONFLICT (config_key) DO NOTHING;

-- Create view for user credit summary
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    COALESCE(SUM(CASE WHEN wc.status = 'available' THEN wc.amount ELSE 0 END), 0) as available_balance,
    COALESCE(SUM(CASE WHEN wc.status = 'pending' THEN wc.amount ELSE 0 END), 0) as pending_balance,
    COALESCE(SUM(CASE WHEN wc.status = 'withdrawn' THEN wc.amount ELSE 0 END), 0) as withdrawn_total,
    COALESCE(SUM(CASE WHEN wc.status = 'expired' THEN wc.amount ELSE 0 END), 0) as expired_total,
    COALESCE(SUM(wc.amount), 0) as total_earned,
    COUNT(CASE WHEN wc.status = 'available' THEN 1 END) as available_credits_count,
    COUNT(CASE WHEN wc.status = 'pending' THEN 1 END) as pending_credits_count
FROM users u
LEFT JOIN wallet_credits wc ON u.id = wc.user_id
GROUP BY u.id, u.username, u.email;

-- Create function to calculate early repayment bonus credits
CREATE OR REPLACE FUNCTION calculate_early_repayment_bonus(
    p_loan_id INTEGER,
    p_early_payment_amount DECIMAL,
    p_remaining_principal DECIMAL,
    p_remaining_interest DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    v_bonus_percentage DECIMAL;
    v_saved_interest DECIMAL;
    v_bonus_amount DECIMAL;
BEGIN
    -- Get bonus percentage from config
    SELECT CAST(config_value AS DECIMAL) 
    INTO v_bonus_percentage
    FROM credit_config 
    WHERE config_key = 'early_repayment_bonus_percentage' AND is_active = true;
    
    -- Calculate saved interest (interest that would have been paid)
    v_saved_interest := p_remaining_interest;
    
    -- Calculate bonus amount (50% of saved interest)
    v_bonus_amount := v_saved_interest * (v_bonus_percentage / 100);
    
    RETURN v_bonus_amount;
END;
$$ LANGUAGE plpgsql;

-- Create function to award tier discount credits to lenders
CREATE OR REPLACE FUNCTION award_tier_discount_credits(
    p_user_id INTEGER,
    p_loan_id INTEGER,
    p_loan_amount DECIMAL,
    p_tier_multiplier DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_discount_percentage DECIMAL;
    v_standard_fees DECIMAL;
    v_discount_amount DECIMAL;
    v_credit_amount DECIMAL;
BEGIN
    -- Get discount percentage from config
    SELECT CAST(config_value AS DECIMAL) 
    INTO v_discount_percentage
    FROM credit_config 
    WHERE config_key = 'tier_discount_percentage' AND is_active = true;
    
    -- Calculate standard lender fees (2% processing + 5% platform = 7%)
    v_standard_fees := p_loan_amount * 0.07;
    
    -- Calculate discount amount based on tier
    v_discount_amount := v_standard_fees * (1 - p_tier_multiplier);
    
    -- Convert to credits (percentage of discount)
    v_credit_amount := v_discount_amount * (v_discount_percentage / 100);
    
    -- Insert credit record
    INSERT INTO wallet_credits (
        user_id, 
        credit_type, 
        amount, 
        source_reference, 
        status,
        available_at,
        notes
    ) VALUES (
        p_user_id,
        'tier_discount',
        v_credit_amount,
        'loan_' || p_loan_id,
        'pending',
        CURRENT_TIMESTAMP + INTERVAL '1 day', -- Available next day
        'Tier discount credit for loan ' || p_loan_id
    );
    
    -- Create transaction record
    INSERT INTO credit_transactions (
        credit_id,
        transaction_type,
        amount,
        balance_after,
        reference_id
    ) VALUES (
        currval('wallet_credits_id_seq'),
        'earned',
        v_credit_amount,
        v_credit_amount,
        'loan_' || p_loan_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to award referral credits
CREATE OR REPLACE FUNCTION award_referral_credits(
    p_referrer_id INTEGER,
    p_referral_id INTEGER,
    p_loan_amount DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_bonus_amount DECIMAL;
BEGIN
    -- Get referral bonus amount from config
    SELECT CAST(config_value AS DECIMAL) 
    INTO v_bonus_amount
    FROM credit_config 
    WHERE config_key = 'referral_bonus_amount' AND is_active = true;
    
    -- Insert credit record for referrer
    INSERT INTO wallet_credits (
        user_id, 
        credit_type, 
        amount, 
        source_reference, 
        status,
        available_at,
        notes
    ) VALUES (
        p_referrer_id,
        'referral',
        v_bonus_amount,
        'referral_' || p_referral_id,
        'available',
        CURRENT_TIMESTAMP,
        'Referral bonus for user ' || p_referral_id
    );
    
    -- Create transaction record
    INSERT INTO credit_transactions (
        credit_id,
        transaction_type,
        amount,
        balance_after,
        reference_id
    ) VALUES (
        currval('wallet_credits_id_seq'),
        'earned',
        v_bonus_amount,
        v_bonus_amount,
        'referral_' || p_referral_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to process credit withdrawal
CREATE OR REPLACE FUNCTION process_credit_withdrawal(
    p_request_id INTEGER,
    p_processed_by INTEGER,
    p_status TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_request RECORD;
    v_total_available DECIMAL;
    v_credit_ids INTEGER[];
BEGIN
    -- Get withdrawal request details
    SELECT * INTO v_request
    FROM credit_withdrawal_requests 
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check user has sufficient available credits
    SELECT COALESCE(SUM(amount), 0) INTO v_total_available
    FROM wallet_credits 
    WHERE user_id = v_request.user_id AND status = 'available';
    
    IF v_total_available < v_request.total_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Get credit IDs to withdraw (oldest first)
    SELECT array_agg(id) INTO v_credit_ids
    FROM wallet_credits 
    WHERE user_id = v_request.user_id AND status = 'available'
    ORDER BY created_at
    LIMIT (SELECT COUNT(*) FROM wallet_credits WHERE user_id = v_request.user_id AND status = 'available');
    
    -- Update credits to withdrawn status
    UPDATE wallet_credits 
    SET status = 'withdrawn', 
        withdrawn_at = CURRENT_TIMESTAMP,
        withdrawal_method = v_request.withdrawal_method
    WHERE id = ANY(v_credit_ids);
    
    -- Update withdrawal request
    UPDATE credit_withdrawal_requests 
    SET status = p_status,
        processed_at = CURRENT_TIMESTAMP,
        processed_by = p_processed_by,
        notes = p_notes
    WHERE id = p_request_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE wallet_credits IS 'Stores all user credits including tier discounts, referrals, and early repayment bonuses';
COMMENT ON TABLE credit_transactions IS 'Tracks all credit movements and status changes';
COMMENT ON TABLE credit_withdrawal_requests IS 'Manages user withdrawal requests for available credits';
COMMENT ON TABLE credit_config IS 'Configuration parameters for the credit system';

COMMIT;

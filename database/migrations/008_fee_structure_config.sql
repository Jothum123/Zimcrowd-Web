-- Fee Structure Configuration Migration
-- Extends loan_config to support comprehensive fee management for borrowers and lenders

BEGIN;

-- Update loan_config parameter_name constraint to include fee parameters
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_parameter_name_check;
ALTER TABLE loan_config ADD CONSTRAINT loan_config_parameter_name_check 
    CHECK (parameter_name IN (
        'min_loan_amount', 'max_loan_amount', 'interest_rate', 'cold_start_cap', 'dtni_max', 
        'max_tenure_months', 'cold_start_active', 'min_tenure_months', 'interest_calculation_method',
        -- Borrower Fees
        'processing_fee_borrower', 'processing_fee_borrower_type', 'processing_fee_borrower_max',
        'platform_fee_borrower', 'platform_fee_borrower_type', 'platform_fee_borrower_max',
        'late_payment_fee_borrower', 'late_payment_fee_borrower_type', 'late_payment_fee_borrower_max',
        'early_repayment_fee_borrower', 'early_repayment_fee_borrower_type', 'early_repayment_fee_borrower_max',
        'disbursement_fee_borrower', 'disbursement_fee_borrower_type', 'disbursement_fee_borrower_max',
        'insurance_fee_borrower', 'insurance_fee_borrower_type', 'insurance_fee_borrower_max',
        -- Lender Fees
        'processing_fee_lender', 'processing_fee_lender_type', 'processing_fee_lender_max',
        'platform_fee_lender', 'platform_fee_lender_type', 'platform_fee_lender_max',
        'withdrawal_fee_lender', 'withdrawal_fee_lender_type', 'withdrawal_fee_lender_max',
        'investment_fee_lender', 'investment_fee_lender_type', 'investment_fee_lender_max',
        'default_recovery_fee_lender', 'default_recovery_fee_lender_type', 'default_recovery_fee_lender_max',
        -- Fee Types: 1.00 = percentage, 2.00 = fixed_amount
        'fee_calculation_method'
    ));

-- Insert default fee configuration values
INSERT INTO loan_config (config_type, target_key, parameter_name, parameter_value) VALUES
-- Global Fee Configuration
('global', 'all', 'fee_calculation_method', 1.00), -- 1.00 = percentage, 2.00 = fixed_amount

-- Borrower Fee Defaults
('global', 'all', 'processing_fee_borrower', 2.50), -- 2.5% processing fee
('global', 'all', 'processing_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'processing_fee_borrower_max', 50.00), -- max $50 processing fee

('global', 'all', 'platform_fee_borrower', 1.00), -- 1% platform fee
('global', 'all', 'platform_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'platform_fee_borrower_max', 25.00), -- max $25 platform fee

('global', 'all', 'late_payment_fee_borrower', 5.00), -- 5% late payment fee
('global', 'all', 'late_payment_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'late_payment_fee_borrower_max', 100.00), -- max $100 late fee

('global', 'all', 'early_repayment_fee_borrower', 1.00), -- 1% early repayment fee
('global', 'all', 'early_repayment_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'early_repayment_fee_borrower_max', 20.00), -- max $20 early repayment fee

('global', 'all', 'disbursement_fee_borrower', 0.00), -- 0% disbursement fee
('global', 'all', 'disbursement_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'disbursement_fee_borrower_max', 0.00), -- max $0 disbursement fee

('global', 'all', 'insurance_fee_borrower', 0.50), -- 0.5% insurance fee
('global', 'all', 'insurance_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'insurance_fee_borrower_max', 15.00), -- max $15 insurance fee

-- Lender Fee Defaults
('global', 'all', 'processing_fee_lender', 1.00), -- 1% processing fee
('global', 'all', 'processing_fee_lender_type', 1.00), -- percentage
('global', 'all', 'processing_fee_lender_max', 30.00), -- max $30 processing fee

('global', 'all', 'platform_fee_lender', 0.50), -- 0.5% platform fee
('global', 'all', 'platform_fee_lender_type', 1.00), -- percentage
('global', 'all', 'platform_fee_lender_max', 20.00), -- max $20 platform fee

('global', 'all', 'withdrawal_fee_lender', 1.00), -- 1% withdrawal fee
('global', 'all', 'withdrawal_fee_lender_type', 1.00), -- percentage
('global', 'all', 'withdrawal_fee_lender_max', 25.00), -- max $25 withdrawal fee

('global', 'all', 'investment_fee_lender', 0.50), -- 0.5% investment fee
('global', 'all', 'investment_fee_lender_type', 1.00), -- percentage
('global', 'all', 'investment_fee_lender_max', 15.00), -- max $15 investment fee

('global', 'all', 'default_recovery_fee_lender', 10.00), -- 10% default recovery fee
('global', 'all', 'default_recovery_fee_lender_type', 1.00), -- percentage
('global', 'all', 'default_recovery_fee_lender_max', 200.00) -- max $200 recovery fee
ON CONFLICT (config_type, target_key, parameter_name) DO NOTHING;

-- Create fee configuration summary view for admin dashboard
CREATE OR REPLACE VIEW fee_config_summary AS
SELECT 
    parameter_name,
    parameter_value,
    config_type,
    target_key,
    is_active,
    created_at,
    updated_at,
    CASE 
        WHEN parameter_name LIKE '%_borrower' THEN 'Borrower Fee'
        WHEN parameter_name LIKE '%_lender' THEN 'Lender Fee'
        WHEN parameter_name LIKE '%fee%' THEN 'General Fee'
        ELSE 'Other Configuration'
    END as fee_category,
    CASE 
        WHEN parameter_name LIKE '%_type' THEN 
            CASE parameter_value 
                WHEN 1.00 THEN 'Percentage'
                WHEN 2.00 THEN 'Fixed Amount'
                ELSE 'Unknown'
            END
        WHEN parameter_name LIKE '%_max' THEN 'Maximum Amount'
        WHEN parameter_name LIKE '%fee%' AND parameter_name NOT LIKE '%_type' AND parameter_name NOT LIKE '%_max' THEN 'Fee Rate'
        ELSE 'Configuration Value'
    END as parameter_type
FROM loan_config 
WHERE parameter_name LIKE '%fee%' OR parameter_name = 'fee_calculation_method'
ORDER BY fee_category, parameter_name;

-- Create fee calculation function for testing fee impacts
CREATE OR REPLACE FUNCTION calculate_loan_fees(
    p_loan_amount DECIMAL,
    p_loan_type TEXT DEFAULT 'direct',
    p_user_role TEXT DEFAULT 'borrower'
)
RETURNS TABLE (
    fee_name TEXT,
    fee_type TEXT,
    fee_value DECIMAL,
    fee_amount DECIMAL,
    is_percentage BOOLEAN
) AS $$
DECLARE
    v_fee_rate DECIMAL;
    v_fee_type DECIMAL;
    v_fee_max DECIMAL;
    v_calculated_fee DECIMAL;
BEGIN
    -- Processing Fee
    IF p_user_role = 'borrower' THEN
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'processing_fee_borrower_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'processing_fee_borrower_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'processing_fee_borrower' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := v_fee_rate;
        END IF;
        
        RETURN QUERY SELECT 'Processing Fee', 'Borrower Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00);
    END IF;
    
    -- Add more fee calculations as needed
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create fee configuration history view for audit
CREATE OR REPLACE VIEW fee_config_history AS
SELECT 
    lcal.id,
    lcal.admin_id,
    u.email as admin_email,
    lcal.action_type,
    lcal.parameter_name,
    lcal.old_value,
    lcal.new_value,
    lcal.config_type,
    lcal.target_key,
    lcal.reason,
    lcal.timestamp,
    CASE 
        WHEN lcal.parameter_name LIKE '%_borrower' THEN 'Borrower Fee'
        WHEN lcal.parameter_name LIKE '%_lender' THEN 'Lender Fee'
        WHEN lcal.parameter_name LIKE '%fee%' THEN 'General Fee'
        ELSE 'Other Configuration'
    END as fee_category,
    CASE 
        WHEN lcal.action_type IN ('CREATE', 'UPDATE') THEN 
            CASE 
                WHEN lcal.old_value IS NULL THEN 'Added'
                WHEN lcal.new_value > lcal.old_value THEN 'Increased'
                WHEN lcal.new_value < lcal.old_value THEN 'Decreased'
                ELSE 'Modified'
            END
        ELSE lcal.action_type
    END as change_summary
FROM loan_config_audit_log lcal
LEFT JOIN users u ON lcal.admin_id = u.id
WHERE lcal.parameter_name LIKE '%fee%' OR lcal.parameter_name = 'fee_calculation_method'
ORDER BY lcal.timestamp DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Fee structure configuration migration completed successfully!';
    RAISE NOTICE 'Added: Comprehensive fee parameters for borrowers and lenders';
    RAISE NOTICE 'Features: Fee categorization, calculation functions, audit views';
    RAISE NOTICE 'Tables: Extended loan_config with fee parameters';
    RAISE NOTICE 'Views: fee_config_summary, fee_config_history';
    RAISE NOTICE 'Functions: calculate_loan_fees() for fee impact testing';
END $$;

COMMIT;

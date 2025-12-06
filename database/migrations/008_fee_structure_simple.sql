-- Simplified Fee Structure Configuration Migration
-- Fixed version without complex constraints and emojis

BEGIN;

-- Drop existing constraints if they exist
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_parameter_value_check;
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_type_value_check;
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_fee_value_check;
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_max_value_check;
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_threshold_value_check;
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_parameter_name_check;

-- Add simple constraint for type parameters
ALTER TABLE loan_config ADD CONSTRAINT loan_config_type_value_check 
    CHECK (parameter_name NOT LIKE '%_type' OR parameter_value IN (1.00, 2.00));

-- Add simple constraint for max parameters
ALTER TABLE loan_config ADD CONSTRAINT loan_config_max_value_check 
    CHECK (parameter_name NOT LIKE '%_max' OR parameter_value >= 0);

-- Add simple constraint for threshold parameters
ALTER TABLE loan_config ADD CONSTRAINT loan_config_threshold_value_check 
    CHECK (parameter_name NOT LIKE '%_threshold' OR parameter_value >= 0);

-- Add parameter name constraint with essential parameters only
ALTER TABLE loan_config ADD CONSTRAINT loan_config_parameter_name_check 
    CHECK (parameter_name IN (
        'min_loan_amount', 'max_loan_amount', 'interest_rate', 'cold_start_cap', 'dtni_max', 
        'max_tenure_months', 'cold_start_active', 'min_tenure_months', 'interest_calculation_method',
        'processing_fee_borrower', 'processing_fee_borrower_type', 'processing_fee_borrower_max',
        'platform_fee_borrower', 'platform_fee_borrower_type', 'platform_fee_borrower_max',
        'maximum_fee_threshold'
    ));

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Fee structure migration completed successfully';
END $$;

-- Update Loan Config Parameter Check Constraint
-- Adds interest_calculation_method to the existing CHECK constraint

-- Drop the existing check constraint
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_parameter_name_check;

-- Recreate the check constraint with all parameters including interest_calculation_method
ALTER TABLE loan_config 
ADD CONSTRAINT loan_config_parameter_name_check 
CHECK (parameter_name IN ('min_loan_amount', 'max_loan_amount', 'interest_rate', 'cold_start_cap', 'dtni_max', 'max_tenure_months', 'cold_start_active', 'min_tenure_months', 'interest_calculation_method'));

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Loan config parameter check constraint updated successfully!';
    RAISE NOTICE 'Added: interest_calculation_method to parameter_name constraint';
    RAISE NOTICE 'Now supports: 9 configurable parameters including interest calculation methods';
END $$;

-- Interest Calculation Method Migration
-- Adds interest calculation method support to loans table and creates helper functions

-- Add interest calculation method column to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS interest_calculation_method TEXT DEFAULT 'reducing_balance' 
CHECK (interest_calculation_method IN ('reducing_balance', 'flat_rate'));

-- Create function to get effective interest calculation method for a loan
CREATE OR REPLACE FUNCTION get_effective_interest_method(
    p_loan_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_loan_method TEXT;
    v_user_id UUID;
    v_loan_type TEXT;
    v_employment_type TEXT;
    v_effective_method TEXT;
BEGIN
    -- First check if loan has specific method set
    SELECT interest_calculation_method, user_id 
    INTO v_loan_method, v_user_id
    FROM loans 
    WHERE id = p_loan_id;
    
    IF v_loan_method IS NOT NULL THEN
        RETURN v_loan_method;
    END IF;
    
    -- Get user's loan type and employment type for config lookup
    -- Assuming loan_type is stored in loans or can be derived
    SELECT 'direct' -- Default to direct if not specified
    INTO v_loan_type;
    
    SELECT employment_type
    INTO v_employment_type
    FROM user_profiles 
    WHERE user_id = v_user_id;
    
    -- Get effective method from config hierarchy
    SELECT parameter_value::TEXT
    INTO v_effective_method
    FROM get_effective_loan_config(p_loan_id, v_loan_type, v_employment_type)
    WHERE parameter_name = 'interest_calculation_method'
    LIMIT 1;
    
    -- Convert numeric values back to text
    IF v_effective_method = '1' THEN
        RETURN 'reducing_balance';
    ELSIF v_effective_method = '2' THEN
        RETURN 'flat_rate';
    ELSE
        RETURN 'reducing_balance'; -- Default fallback
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate EMI using flat rate method
CREATE OR REPLACE FUNCTION calculate_flat_rate_emi(
    p_principal DECIMAL,
    p_annual_rate DECIMAL,
    p_term_months INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    v_total_interest DECIMAL;
    v_total_amount DECIMAL;
    v_monthly_emi DECIMAL;
BEGIN
    -- Flat rate: Total interest = Principal × Rate × Time (in years)
    v_total_interest := p_principal * (p_annual_rate / 100) * (p_term_months / 12.0);
    v_total_amount := p_principal + v_total_interest;
    v_monthly_emi := v_total_amount / p_term_months;
    
    RETURN ROUND(v_monthly_emi, 2);
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate EMI using reducing balance method
CREATE OR REPLACE FUNCTION calculate_reducing_balance_emi(
    p_principal DECIMAL,
    p_annual_rate DECIMAL,
    p_term_months INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
    v_monthly_rate DECIMAL;
    v_power_term DECIMAL;
    v_monthly_emi DECIMAL;
BEGIN
    -- Reducing balance: EMI = P * r * (1+r)^n / [(1+r)^n - 1]
    v_monthly_rate := (p_annual_rate / 100) / 12.0;
    v_power_term := POWER(1 + v_monthly_rate, p_term_months);
    v_monthly_emi := (p_principal * v_monthly_rate * v_power_term) / (v_power_term - 1);
    
    RETURN ROUND(v_monthly_emi, 2);
END;
$$ LANGUAGE plpgsql;

-- Create unified EMI calculation function
CREATE OR REPLACE FUNCTION calculate_emi(
    p_principal DECIMAL,
    p_annual_rate DECIMAL,
    p_term_months INTEGER,
    p_calculation_method TEXT DEFAULT 'reducing_balance'
)
RETURNS DECIMAL AS $$
BEGIN
    IF p_calculation_method = 'flat_rate' THEN
        RETURN calculate_flat_rate_emi(p_principal, p_annual_rate, p_term_months);
    ELSE
        RETURN calculate_reducing_balance_emi(p_principal, p_annual_rate, p_term_months);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Interest calculation method migration completed successfully!';
    RAISE NOTICE 'Added: loans.interest_calculation_method column';
    RAISE NOTICE 'Functions: get_effective_interest_method(), calculate_emi()';
    RAISE NOTICE 'Supports: reducing_balance (default) and flat_rate methods';
END $$;

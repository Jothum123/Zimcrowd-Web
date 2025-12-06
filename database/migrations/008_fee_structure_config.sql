-- Enhanced Fee Structure Configuration Migration
-- Extends loan_config to support comprehensive fee management for borrowers and lenders
-- Includes validation, tiered pricing, and complete fee calculation logic

BEGIN;

-- Add validation constraints to loan_config table for fee values
DO $$
BEGIN
    ALTER TABLE loan_config ADD CONSTRAINT loan_config_parameter_value_check 
        CHECK (
            -- Allow reasonable fee percentages (0-100%)
            (parameter_name LIKE '%_type' AND parameter_value IN (1.00, 2.00)) OR
            (parameter_name LIKE '%fee%' AND parameter_name NOT LIKE '%_type' AND parameter_name NOT LIKE '%_max' AND parameter_value >= 0 AND parameter_value <= 100) OR
            (parameter_name LIKE '%_max' AND parameter_value >= 0) OR
            (parameter_name NOT LIKE '%fee%' AND parameter_name NOT LIKE '%_type' AND parameter_name NOT LIKE '%_max')
        );
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Constraint already exists, ignore
END $$;

-- Update loan_config parameter_name constraint to include enhanced fee parameters
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_parameter_name_check;
ALTER TABLE loan_config ADD CONSTRAINT loan_config_parameter_name_check 
    CHECK (parameter_name IN (
        'min_loan_amount', 'max_loan_amount', 'interest_rate', 'cold_start_cap', 'dtni_max', 
        'max_tenure_months', 'cold_start_active', 'min_tenure_months', 'interest_calculation_method',
        -- Borrower Fees
        'processing_fee_borrower', 'processing_fee_borrower_type', 'processing_fee_borrower_max',
        'platform_fee_borrower', 'platform_fee_borrower_type', 'platform_fee_borrower_max',
        'collection_fee_borrower', 'collection_fee_borrower_type', 'collection_fee_borrower_max',
        'late_payment_fee_borrower', 'late_payment_fee_borrower_type', 'late_payment_fee_borrower_max',
        'early_repayment_fee_borrower', 'early_repayment_fee_borrower_type', 'early_repayment_fee_borrower_max',
        'disbursement_fee_borrower', 'disbursement_fee_borrower_type', 'disbursement_fee_borrower_max',
        'insurance_fee_borrower', 'insurance_fee_borrower_type', 'insurance_fee_borrower_max',
        'document_verification_fee_borrower', 'document_verification_fee_borrower_type', 'document_verification_fee_borrower_max',
        'credit_score_check_fee_borrower', 'credit_score_check_fee_borrower_type', 'credit_score_check_fee_borrower_max',
        'early_settlement_fee_borrower', 'early_settlement_fee_borrower_type', 'early_settlement_fee_borrower_max',
        -- Lender Fees
        'processing_fee_lender', 'processing_fee_lender_type', 'processing_fee_lender_max',
        'platform_fee_lender', 'platform_fee_lender_type', 'platform_fee_lender_max',
        'portfolio_management_fee_lender', 'portfolio_management_fee_lender_type', 'portfolio_management_fee_lender_max',
        'due_diligence_fee_lender', 'due_diligence_fee_lender_type', 'due_diligence_fee_lender_max',
        'insurance_fee_lender', 'insurance_fee_lender_type', 'insurance_fee_lender_max',
        'withdrawal_fee_lender', 'withdrawal_fee_lender_type', 'withdrawal_fee_lender_max',
        'investment_fee_lender', 'investment_fee_lender_type', 'investment_fee_lender_max',
        'default_recovery_fee_lender', 'default_recovery_fee_lender_type', 'default_recovery_fee_lender_max',
        'secondary_market_fee_lender', 'secondary_market_fee_lender_type', 'secondary_market_fee_lender_max',
        -- Tiered Pricing Support
        'tier_1_min_amount', 'tier_1_max_amount', 'tier_1_fee_multiplier',
        'tier_2_min_amount', 'tier_2_max_amount', 'tier_2_fee_multiplier',
        'tier_3_min_amount', 'tier_3_max_amount', 'tier_3_fee_multiplier',
        'tier_4_min_amount', 'tier_4_max_amount', 'tier_4_fee_multiplier',
        -- Fee Types: 1.00 = percentage, 2.00 = fixed_amount
        'fee_calculation_method',
        'fee_effective_date',
        'minimum_fee_threshold',
        'maximum_fee_threshold'
    ));

-- Insert enhanced fee configuration values
INSERT INTO loan_config (config_type, target_key, parameter_name, parameter_value) VALUES
-- Global Fee Configuration
('global', 'all', 'fee_calculation_method', 1.00), -- 1.00 = percentage, 2.00 = fixed_amount
('global', 'all', 'minimum_fee_threshold', 1.00), -- Minimum fee amount $1
('global', 'all', 'maximum_fee_threshold', 500.00), -- Maximum fee amount $500

-- Tiered Pricing Configuration
('global', 'all', 'tier_1_min_amount', 0), -- Tier 1: $0-$1,000
('global', 'all', 'tier_1_max_amount', 1000),
('global', 'all', 'tier_1_fee_multiplier', 1.0), -- Standard rates

('global', 'all', 'tier_2_min_amount', 1001), -- Tier 2: $1,001-$5,000
('global', 'all', 'tier_2_max_amount', 5000),
('global', 'all', 'tier_2_fee_multiplier', 0.9), -- 10% discount

('global', 'all', 'tier_3_min_amount', 5001), -- Tier 3: $5,001-$10,000
('global', 'all', 'tier_3_max_amount', 10000),
('global', 'all', 'tier_3_fee_multiplier', 0.8), -- 20% discount

('global', 'all', 'tier_4_min_amount', 10001), -- Tier 4: $10,001+
('global', 'all', 'tier_4_max_amount', 999999),
('global', 'all', 'tier_4_fee_multiplier', 0.7), -- 30% discount

-- Enhanced Borrower Fee Defaults
('global', 'all', 'processing_fee_borrower', 2.50), -- 2.5% processing fee (once-off)
('global', 'all', 'processing_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'processing_fee_borrower_max', 50.00), -- max $50 processing fee

('global', 'all', 'platform_fee_borrower', 5.00), -- 5% platform fee (once-off)
('global', 'all', 'platform_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'platform_fee_borrower_max', 100.00), -- max $100 platform fee

('global', 'all', 'collection_fee_borrower', 5.00), -- 5% collection fee (monthly on installments)
('global', 'all', 'collection_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'collection_fee_borrower_max', 50.00), -- max $50 collection fee per installment

('global', 'all', 'late_payment_fee_borrower', 5.00), -- 5% late payment fee
('global', 'all', 'late_payment_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'late_payment_fee_borrower_max', 100.00), -- max $100 late fee

('global', 'all', 'early_repayment_fee_borrower', 1.00), -- 1% early repayment fee
('global', 'all', 'early_repayment_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'early_repayment_fee_borrower_max', 20.00), -- max $20 early repayment fee

('global', 'all', 'disbursement_fee_borrower', 0.00), -- 0% disbursement fee
('global', 'all', 'disbursement_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'disbursement_fee_borrower_max', 0.00), -- max $0 disbursement fee

('global', 'all', 'insurance_fee_borrower', 2.50), -- 2.5% insurance fee (once-off)
('global', 'all', 'insurance_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'insurance_fee_borrower_max', 50.00), -- max $50 insurance fee

-- New Borrower Fees
('global', 'all', 'document_verification_fee_borrower', 2.00), -- $2 document verification
('global', 'all', 'document_verification_fee_borrower_type', 2.00), -- fixed amount
('global', 'all', 'document_verification_fee_borrower_max', 2.00), -- fixed $2

('global', 'all', 'credit_score_check_fee_borrower', 5.00), -- $5 credit check
('global', 'all', 'credit_score_check_fee_borrower_type', 2.00), -- fixed amount
('global', 'all', 'credit_score_check_fee_borrower_max', 5.00), -- fixed $5

('global', 'all', 'early_settlement_fee_borrower', 0.50), -- 0.5% early settlement
('global', 'all', 'early_settlement_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'early_settlement_fee_borrower_max', 10.00), -- max $10 settlement fee

-- Enhanced Lender Fee Defaults
('global', 'all', 'processing_fee_lender', 2.50), -- 2.5% processing fee (once-off)
('global', 'all', 'processing_fee_lender_type', 1.00), -- percentage
('global', 'all', 'processing_fee_lender_max', 50.00), -- max $50 processing fee

('global', 'all', 'platform_fee_lender', 5.00), -- 5% platform fee (once-off)
('global', 'all', 'platform_fee_lender_type', 1.00), -- percentage
('global', 'all', 'platform_fee_lender_max', 100.00), -- max $100 platform fee

('global', 'all', 'portfolio_management_fee_lender', 2.50), -- 2.5% portfolio management fee (monthly)
('global', 'all', 'portfolio_management_fee_lender_type', 1.00), -- percentage
('global', 'all', 'portfolio_management_fee_lender_max', 50.00), -- max $50 portfolio management fee per month

('global', 'all', 'due_diligence_fee_lender', 3.00), -- $3 due diligence fee (once-off)
('global', 'all', 'due_diligence_fee_lender_type', 2.00), -- fixed amount
('global', 'all', 'due_diligence_fee_lender_max', 3.00), -- fixed $3

('global', 'all', 'insurance_fee_lender', 5.00), -- 5% insurance fee (optional, once-off)
('global', 'all', 'insurance_fee_lender_type', 1.00), -- percentage
('global', 'all', 'insurance_fee_lender_max', 100.00), -- max $100 insurance fee

('global', 'all', 'withdrawal_fee_lender', 1.00), -- 1% withdrawal fee
('global', 'all', 'withdrawal_fee_lender_type', 1.00), -- percentage
('global', 'all', 'withdrawal_fee_lender_max', 25.00), -- max $25 withdrawal fee

('global', 'all', 'investment_fee_lender', 0.50), -- 0.5% investment fee
('global', 'all', 'investment_fee_lender_type', 1.00), -- percentage
('global', 'all', 'investment_fee_lender_max', 15.00), -- max $15 investment fee

('global', 'all', 'default_recovery_fee_lender', 10.00), -- 10% default recovery fee
('global', 'all', 'default_recovery_fee_lender_type', 1.00), -- percentage
('global', 'all', 'default_recovery_fee_lender_max', 200.00), -- max $200 default recovery fee

-- Additional Lender Fees
('global', 'all', 'secondary_market_fee_lender', 1.50), -- 1.5% secondary market
('global', 'all', 'secondary_market_fee_lender_type', 1.00), -- percentage
('global', 'all', 'secondary_market_fee_lender_max', 100.00), -- max $100 market fee
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

-- Create enhanced fee calculation function with tiered pricing support
CREATE OR REPLACE FUNCTION calculate_loan_fees(
    p_loan_amount DECIMAL,
    p_loan_type TEXT DEFAULT 'direct',
    p_user_role TEXT DEFAULT 'borrower',
    p_tenure_months INTEGER DEFAULT 3
)
RETURNS TABLE (
    fee_name TEXT,
    fee_type TEXT,
    fee_value DECIMAL,
    fee_amount DECIMAL,
    is_percentage BOOLEAN,
    fee_tier TEXT,
    fee_frequency TEXT -- 'once-off' or 'monthly'
) AS $$
DECLARE
    v_fee_rate DECIMAL;
    v_fee_type DECIMAL;
    v_fee_max DECIMAL;
    v_calculated_fee DECIMAL;
    v_tier_multiplier DECIMAL;
    v_tier_name TEXT;
    v_min_threshold DECIMAL;
    v_max_threshold DECIMAL;
BEGIN
    -- Get tier multiplier based on loan amount
    v_tier_multiplier := 1.0;
    v_tier_name := 'Tier 1 (Standard)';
    
    SELECT tier_multiplier, 
           CASE 
               WHEN p_loan_amount BETWEEN tier_1_min_amount AND tier_1_max_amount THEN 'Tier 1 (Standard)'
               WHEN p_loan_amount BETWEEN tier_2_min_amount AND tier_2_max_amount THEN 'Tier 2 (10% Discount)'
               WHEN p_loan_amount BETWEEN tier_3_min_amount AND tier_3_max_amount THEN 'Tier 3 (20% Discount)'
               WHEN p_loan_amount >= tier_4_min_amount THEN 'Tier 4 (30% Discount)'
               ELSE 'Tier 1 (Standard)'
           END
    INTO v_tier_multiplier, v_tier_name
    FROM (
        SELECT 
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_1_fee_multiplier' AND is_active = true LIMIT 1) as tier_multiplier,
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_1_min_amount' AND is_active = true LIMIT 1) as tier_1_min_amount,
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_1_max_amount' AND is_active = true LIMIT 1) as tier_1_max_amount,
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_2_min_amount' AND is_active = true LIMIT 1) as tier_2_min_amount,
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_2_max_amount' AND is_active = true LIMIT 1) as tier_2_max_amount,
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_3_min_amount' AND is_active = true LIMIT 1) as tier_3_min_amount,
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_3_max_amount' AND is_active = true LIMIT 1) as tier_3_max_amount,
            (SELECT parameter_value FROM loan_config WHERE parameter_name = 'tier_4_min_amount' AND is_active = true LIMIT 1) as tier_4_min_amount
    ) tier_config;
    
    -- Get fee thresholds
    SELECT parameter_value, parameter_value 
    INTO v_min_threshold, v_max_threshold
    FROM loan_config 
    WHERE parameter_name IN ('minimum_fee_threshold', 'maximum_fee_threshold') 
    AND is_active = true 
    ORDER BY parameter_name;
    
    -- BORROWER FEES
    IF p_user_role = 'borrower' THEN
        -- Processing Fee (Once-off)
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
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100 * v_tier_multiplier), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate * v_tier_multiplier, v_fee_max);
        END IF;
        
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Processing Fee', 'Borrower Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Platform Fee (Once-off)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'platform_fee_borrower_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'platform_fee_borrower_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'platform_fee_borrower' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100 * v_tier_multiplier), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate * v_tier_multiplier, v_fee_max);
        END IF;
        
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Platform Fee', 'Borrower Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Insurance Fee (Once-off)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'insurance_fee_borrower_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'insurance_fee_borrower_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'insurance_fee_borrower' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100 * v_tier_multiplier), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate * v_tier_multiplier, v_fee_max);
        END IF;
        
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Insurance Fee', 'Borrower Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Collection Fee (Monthly - calculated on estimated monthly installment)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'collection_fee_borrower_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'collection_fee_borrower_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'collection_fee_borrower' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        -- Calculate estimated monthly installment (principal + estimated interest)
        DECLARE
            v_estimated_monthly_installment DECIMAL;
            v_estimated_interest_rate DECIMAL := 5.0; -- Default 5% monthly for calculation
        BEGIN
            v_estimated_monthly_installment := (p_loan_amount / p_tenure_months) + (p_loan_amount * v_estimated_interest_rate / 100);
            
            IF v_fee_type = 1.00 THEN -- Percentage
                v_calculated_fee := LEAST((v_estimated_monthly_installment * v_fee_rate / 100), v_fee_max);
            ELSE -- Fixed Amount
                v_calculated_fee := LEAST(v_fee_rate, v_fee_max);
            END IF;
            
            -- No tier multiplier for collection fees (applied monthly)
            v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
            RETURN QUERY SELECT 'Collection Fee', 'Borrower Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'monthly';
        END;
        
        -- Document Verification Fee (Fixed)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'document_verification_fee_borrower_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'document_verification_fee_borrower_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'document_verification_fee_borrower' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        v_calculated_fee := v_fee_rate; -- Fixed amount, no tier multiplier
        RETURN QUERY SELECT 'Document Verification Fee', 'Borrower Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Credit Score Check Fee (Fixed)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'credit_score_check_fee_borrower_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'credit_score_check_fee_borrower_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'credit_score_check_fee_borrower' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        v_calculated_fee := v_fee_rate; -- Fixed amount, no tier multiplier
        RETURN QUERY SELECT 'Credit Score Check Fee', 'Borrower Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
    END IF;
    
    -- LENDER FEES
    IF p_user_role = 'lender' THEN
        -- Processing Fee (Once-off)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'processing_fee_lender_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'processing_fee_lender_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'processing_fee_lender' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100 * v_tier_multiplier), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate * v_tier_multiplier, v_fee_max);
        END IF;
        
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Processing Fee', 'Lender Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Platform Fee (Once-off)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'platform_fee_lender_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'platform_fee_lender_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'platform_fee_lender' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100 * v_tier_multiplier), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate * v_tier_multiplier, v_fee_max);
        END IF;
        
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Platform Fee', 'Lender Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Investment Fee (Once-off)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'investment_fee_lender_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'investment_fee_lender_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'investment_fee_lender' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100 * v_tier_multiplier), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate * v_tier_multiplier, v_fee_max);
        END IF;
        
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Investment Fee', 'Lender Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Portfolio Management Fee (Monthly - calculated on investment amount)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'portfolio_management_fee_lender_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'portfolio_management_fee_lender_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'portfolio_management_fee_lender' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate, v_fee_max);
        END IF;
        
        -- No tier multiplier for portfolio management fees (applied monthly)
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Portfolio Management Fee', 'Lender Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'monthly';
        
        -- Insurance Fee (Optional, Once-off)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'insurance_fee_lender_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'insurance_fee_lender_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'insurance_fee_lender' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        IF v_fee_type = 1.00 THEN -- Percentage
            v_calculated_fee := LEAST((p_loan_amount * v_fee_rate / 100 * v_tier_multiplier), v_fee_max);
        ELSE -- Fixed Amount
            v_calculated_fee := LEAST(v_fee_rate * v_tier_multiplier, v_fee_max);
        END IF;
        
        v_calculated_fee := GREATEST(v_calculated_fee, v_min_threshold);
        RETURN QUERY SELECT 'Insurance Fee (Optional)', 'Lender Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
        
        -- Due Diligence Fee (Fixed)
        SELECT lc.parameter_value, lc_type.parameter_value, lc_max.parameter_value
        INTO v_fee_rate, v_fee_type, v_fee_max
        FROM loan_config lc
        LEFT JOIN loan_config lc_type ON lc_type.parameter_name = 'due_diligence_fee_lender_type' 
            AND lc_type.config_type = lc.config_type AND lc_type.target_key = lc.target_key
        LEFT JOIN loan_config lc_max ON lc_max.parameter_name = 'due_diligence_fee_lender_max' 
            AND lc_max.config_type = lc.config_type AND lc_max.target_key = lc.target_key
        WHERE lc.parameter_name = 'due_diligence_fee_lender' 
        AND lc.is_active = true 
        AND lc.config_type = 'global' 
        LIMIT 1;
        
        v_calculated_fee := v_fee_rate; -- Fixed amount, no tier multiplier
        RETURN QUERY SELECT 'Due Diligence Fee', 'Lender Fee', v_fee_rate, v_calculated_fee, (v_fee_type = 1.00), v_tier_name, 'once-off';
    END IF;
    
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

-- Add performance index for fee lookups
CREATE INDEX IF NOT EXISTS idx_loan_config_fee_lookup 
ON loan_config(parameter_name, is_active, config_type, target_key);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced fee structure configuration migration completed successfully!';
    RAISE NOTICE 'Added: Comprehensive fee parameters for borrowers and lenders';
    RAISE NOTICE 'Features: Fee validation, tiered pricing, calculation functions, audit views';
    RAISE NOTICE 'Tables: Extended loan_config with fee parameters and validation';
    RAISE NOTICE 'Views: fee_config_summary, fee_config_history';
    RAISE NOTICE 'Functions: calculate_loan_fees() with tier multipliers and thresholds';
    RAISE NOTICE 'Indexes: Performance index for fee parameter lookups';
    RAISE NOTICE 'Validation: Fee percentage caps (0-100%) and non-negative values';
    RAISE NOTICE 'Tiered Pricing: 4 discount tiers based on loan amounts';
    RAISE NOTICE 'New Fees: Document verification, credit score, portfolio management, secondary market, due diligence';
END $$;

COMMIT;

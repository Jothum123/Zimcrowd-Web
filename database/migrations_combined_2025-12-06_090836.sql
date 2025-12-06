-- Combined Database Migrations for Production
-- Generated on: 2025-12-06T07:08:36.086Z
-- This file contains all pending migrations in order


-- =====================================================
-- Migration: 008_fee_structure_config.sql
-- =====================================================

-- Enhanced Fee Structure Configuration Migration
-- Extends loan_config to support comprehensive fee management for borrowers and lenders
-- Includes validation, tiered pricing, and complete fee calculation logic

BEGIN;

-- Add validation constraints to loan_config table for fee values
ALTER TABLE loan_config DROP CONSTRAINT IF EXISTS loan_config_parameter_value_check;
ALTER TABLE loan_config ADD CONSTRAINT loan_config_parameter_value_check 
    CHECK (
        -- Allow reasonable fee percentages (0-100%)
        (parameter_name LIKE '%_type' AND parameter_value IN (1.00, 2.00)) OR
        (parameter_name LIKE '%fee%' AND parameter_name NOT LIKE '%_type' AND parameter_name NOT LIKE '%_max' AND parameter_name NOT LIKE '%_threshold' AND parameter_value >= 0 AND parameter_value <= 100) OR
        (parameter_name LIKE '%_max' AND parameter_value >= 0) OR
        (parameter_name LIKE '%_threshold' AND parameter_value >= 0) OR
        (parameter_name NOT LIKE '%fee%' AND parameter_name NOT LIKE '%_type' AND parameter_name NOT LIKE '%_max' AND parameter_name NOT LIKE '%_threshold')
    );

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

('global', 'all', 'late_payment_fee_borrower', 10.00), -- 10% late payment fee
('global', 'all', 'late_payment_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'late_payment_fee_borrower_max', 200.00), -- max $200 late fee

('global', 'all', 'early_repayment_fee_borrower', 0.00), -- 0% early repayment fee (removed)
('global', 'all', 'early_repayment_fee_borrower_type', 1.00), -- percentage
('global', 'all', 'early_repayment_fee_borrower_max', 0.00), -- max $0 early repayment fee

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
('global', 'all', 'processing_fee_lender', 2.00), -- 2% processing fee (once-off)
('global', 'all', 'processing_fee_lender_type', 1.00), -- percentage
('global', 'all', 'processing_fee_lender_max', 40.00), -- max $40 processing fee

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
('global', 'all', 'secondary_market_fee_lender_max', 100.00); -- max $100 market fee

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
    -- Get tier multiplier based on loan amount and user role
    v_tier_multiplier := 1.0;
    v_tier_name := 'No Tier Discount - Early Repayment Bonus Available';
    
    -- Only apply tier discounts for lenders, not borrowers
    IF p_user_role = 'lender' THEN
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
    END IF;
    
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
    RAISE NOTICE 'Enhanced fee structure configuration migration completed successfully!';
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


-- =====================================================
-- Migration: 009_wallet_credits_system.sql
-- =====================================================

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
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'withdrawn', 'expired', 'used')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    available_at TIMESTAMP, -- When credits become available for use
    expires_at TIMESTAMP, -- Credit expiration date
    withdrawn_at TIMESTAMP,
    withdrawal_method TEXT, -- 'bank_transfer', 'mobile_money', 'platform_credit'
    is_withdrawable BOOLEAN DEFAULT true, -- Whether credits can be withdrawn as cash
    usable_for TEXT[] DEFAULT ARRAY['future_loans', 'platform_fees', 'lending'], -- What credits can be used for
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

-- Create function to award early repayment bonus credits (non-withdrawable)
CREATE OR REPLACE FUNCTION award_early_repayment_credits(
    p_user_id INTEGER,
    p_loan_id INTEGER,
    p_early_payment_amount DECIMAL,
    p_remaining_principal DECIMAL,
    p_remaining_interest DECIMAL
) RETURNS VOID AS $$
DECLARE
    v_bonus_amount DECIMAL;
BEGIN
    -- Calculate bonus amount
    SELECT calculate_early_repayment_bonus(p_loan_id, p_early_payment_amount, p_remaining_principal, p_remaining_interest)
    INTO v_bonus_amount;
    
    IF v_bonus_amount > 0 THEN
        -- Insert non-withdrawable platform credit record
        INSERT INTO wallet_credits (
            user_id, 
            credit_type, 
            amount, 
            source_reference, 
            status,
            available_at,
            is_withdrawable,
            usable_for,
            notes
        ) VALUES (
            p_user_id,
            'early_repayment_bonus',
            v_bonus_amount,
            'loan_' || p_loan_id,
            'available',
            CURRENT_TIMESTAMP,
            false, -- Non-withdrawable
            ARRAY['future_loans', 'platform_fees', 'lending'], -- Can be used for these purposes
            'Non-withdrawable platform credit for early repayment on loan ' || p_loan_id
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
            'loan_' || p_loan_id
        );
    END IF;
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
    
    -- Insert credit record (non-withdrawable initially, only usable for lending)
    INSERT INTO wallet_credits (
        user_id, 
        credit_type, 
        amount, 
        source_reference, 
        status,
        available_at,
        is_withdrawable,
        usable_for,
        notes
    ) VALUES (
        p_user_id,
        'tier_discount',
        v_credit_amount,
        'loan_' || p_loan_id,
        'pending',
        CURRENT_TIMESTAMP + INTERVAL '1 day', -- Available next day
        false, -- Non-withdrawable initially
        ARRAY['lending'], -- Can be used to fund loans
        'Tier discount credit for loan ' || p_loan_id || ' - non-withdrawable, becomes withdrawable after funding new loans'
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

-- Create function to apply platform credits to transactions
CREATE OR REPLACE FUNCTION apply_platform_credits(
    p_user_id INTEGER,
    p_amount DECIMAL,
    p_usage_type TEXT DEFAULT 'future_loans' -- 'future_loans', 'platform_fees', 'lending'
) RETURNS DECIMAL AS $$
DECLARE
    v_available_platform_credits DECIMAL;
    v_credit_ids INTEGER[];
    v_amount_to_apply DECIMAL;
    v_remaining_amount DECIMAL;
    v_credit_record RECORD;
BEGIN
    -- Validate usage type
    IF p_usage_type NOT IN ('future_loans', 'platform_fees', 'lending') THEN
        RAISE EXCEPTION 'Invalid usage type: %', p_usage_type;
    END IF;
    
    -- Get available platform credits that can be used for this purpose
    SELECT COALESCE(SUM(amount), 0) INTO v_available_platform_credits
    FROM wallet_credits 
    WHERE user_id = p_user_id 
    AND status = 'available' 
    AND is_withdrawable = false
    AND p_usage_type = ANY(usable_for);
    
    -- Determine amount to apply (cannot exceed available credits or requested amount)
    v_amount_to_apply := LEAST(p_amount, v_available_platform_credits);
    
    IF v_amount_to_apply <= 0 THEN
        RETURN 0;
    END IF;
    
    -- Get credit IDs to use (oldest first)
    SELECT array_agg(id) INTO v_credit_ids
    FROM wallet_credits 
    WHERE user_id = p_user_id 
    AND status = 'available' 
    AND is_withdrawable = false
    AND p_usage_type = ANY(usable_for)
    ORDER BY created_at;
    
    v_remaining_amount := v_amount_to_apply;
    
    -- Apply credits to each credit record
    FOREACH v_credit_record.id IN ARRAY v_credit_ids
    LOOP
        DECLARE
            v_credit_amount DECIMAL;
            v_amount_to_use DECIMAL;
        BEGIN
            -- Get credit amount
            SELECT amount INTO v_credit_amount
            FROM wallet_credits 
            WHERE id = v_credit_record.id;
            
            -- Determine amount to use from this credit
            v_amount_to_use := LEAST(v_remaining_amount, v_credit_amount);
            
            -- Update or mark credit as used
            IF v_amount_to_use >= v_credit_amount THEN
                -- Mark entire credit as used
                UPDATE wallet_credits 
                SET status = 'used',
                    notes = notes || ' | Used for ' || p_usage_type
                WHERE id = v_credit_record.id;
                
                -- Create transaction record
                INSERT INTO credit_transactions (
                    credit_id,
                    transaction_type,
                    amount,
                    balance_after,
                    reference_id,
                    notes
                ) VALUES (
                    v_credit_record.id,
                    'used',
                    v_credit_amount,
                    0,
                    p_usage_type || '_' || CURRENT_TIMESTAMP,
                    'Credit fully used for ' || p_usage_type
                );
            ELSE
                -- Partially use credit (create new record for remaining amount)
                UPDATE wallet_credits 
                SET amount = amount - v_amount_to_use,
                    notes = notes || ' | Partially used for ' || p_usage_type
                WHERE id = v_credit_record.id;
                
                -- Create new credit record for used portion
                INSERT INTO wallet_credits (
                    user_id,
                    credit_type,
                    amount,
                    source_reference,
                    status,
                    created_at,
                    available_at,
                    is_withdrawable,
                    usable_for,
                    notes
                ) VALUES (
                    p_user_id,
                    'early_repayment_bonus',
                    v_amount_to_use,
                    (SELECT source_reference FROM wallet_credits WHERE id = v_credit_record.id),
                    'used',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP,
                    false,
                    ARRAY[p_usage_type],
                    'Used portion of platform credit for ' || p_usage_type
                ) RETURNING id INTO v_credit_record.id;
                
                -- Create transaction record for original credit
                INSERT INTO credit_transactions (
                    credit_id,
                    transaction_type,
                    amount,
                    balance_after,
                    reference_id,
                    notes
                ) VALUES (
                    (SELECT id FROM wallet_credits WHERE id = v_credit_record.id AND status = 'available' LIMIT 1),
                    'used',
                    v_amount_to_use,
                    (SELECT amount FROM wallet_credits WHERE id = v_credit_record.id AND status = 'available' LIMIT 1),
                    p_usage_type || '_' || CURRENT_TIMESTAMP,
                    'Credit partially used for ' || p_usage_type
                );
                
                -- Create transaction record for used portion
                INSERT INTO credit_transactions (
                    credit_id,
                    transaction_type,
                    amount,
                    balance_after,
                    reference_id,
                    notes
                ) VALUES (
                    v_credit_record.id,
                    'used',
                    v_amount_to_use,
                    0,
                    p_usage_type || '_' || CURRENT_TIMESTAMP,
                    'Used portion of platform credit for ' || p_usage_type
                );
            END IF;
            
            v_remaining_amount := v_remaining_amount - v_amount_to_use;
            
            -- Exit if we've applied the full amount
            IF v_remaining_amount <= 0 THEN
                EXIT;
            END IF;
        END;
    END LOOP;
    
    RETURN v_amount_to_apply;
END;
$$ LANGUAGE plpgsql;

-- Create function to get platform credit balance for specific usage
CREATE OR REPLACE FUNCTION get_platform_credit_balance(
    p_user_id INTEGER,
    p_usage_type TEXT DEFAULT NULL
) RETURNS DECIMAL AS $$
BEGIN
    IF p_usage_type IS NOT NULL THEN
        -- Get balance for specific usage type
        RETURN (
            SELECT COALESCE(SUM(amount), 0)
            FROM wallet_credits 
            WHERE user_id = p_user_id 
            AND status = 'available' 
            AND is_withdrawable = false
            AND p_usage_type = ANY(usable_for)
        );
    ELSE
        -- Get total platform credit balance
        RETURN (
            SELECT COALESCE(SUM(amount), 0)
            FROM wallet_credits 
            WHERE user_id = p_user_id 
            AND status = 'available' 
            AND is_withdrawable = false
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to convert tier discount credits to withdrawable status
CREATE OR REPLACE FUNCTION convert_tier_credits_to_withdrawable(
    p_user_id INTEGER,
    p_funded_loan_id INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    v_converted_amount DECIMAL := 0;
    v_credit_record RECORD;
BEGIN
    -- Get available tier discount credits that are not yet withdrawable
    FOR v_credit_record IN 
        SELECT id, amount, source_reference
        FROM wallet_credits 
        WHERE user_id = p_user_id 
        AND credit_type = 'tier_discount'
        AND status = 'available'
        AND is_withdrawable = false
        ORDER BY created_at
    LOOP
        -- Convert credit to withdrawable status
        UPDATE wallet_credits 
        SET is_withdrawable = true,
            usable_for = ARRAY['lending'], -- Keep lending usage
            notes = notes || ' | Converted to withdrawable after funding loan ' || p_funded_loan_id
        WHERE id = v_credit_record.id;
        
        -- Create conversion transaction record
        INSERT INTO credit_transactions (
            credit_id,
            transaction_type,
            amount,
            balance_after,
            reference_id,
            notes
        ) VALUES (
            v_credit_record.id,
            'earned', -- Using 'earned' to track conversion
            v_credit_record.amount,
            v_credit_record.amount,
            'conversion_loan_' || p_funded_loan_id,
            'Tier discount credit converted to withdrawable after funding loan ' || p_funded_loan_id
        );
        
        v_converted_amount := v_converted_amount + v_credit_record.amount;
    END LOOP;
    
    RETURN v_converted_amount;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON TABLE wallet_credits IS 'Stores all user credits including tier discounts, referrals, and early repayment bonuses';
COMMENT ON TABLE credit_transactions IS 'Tracks all credit movements and status changes';
COMMENT ON TABLE credit_withdrawal_requests IS 'Manages user withdrawal requests for available credits';
COMMENT ON TABLE credit_config IS 'Configuration parameters for the credit system';
COMMENT ON FUNCTION apply_platform_credits IS 'Applies platform credits to transactions (loans, fees, lending)';
COMMENT ON FUNCTION get_platform_credit_balance IS 'Gets available platform credit balance for specific usage types';
COMMENT ON FUNCTION convert_tier_credits_to_withdrawable IS 'Converts tier discount credits to withdrawable status after loan funding';

COMMIT;


-- =====================================================
-- Migration: 010_schema_fixes.sql
-- =====================================================

-- Schema Fixes Migration
-- Fixes column name mismatches between migrations and codebase

BEGIN;

-- Fix 1: Rename loans.user_id to borrower_id (code consistently uses borrower_id)
DO $$
BEGIN
    -- Check if column exists and is named user_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        AND column_name = 'user_id'
    ) THEN
        -- Rename user_id to borrower_id
        ALTER TABLE loans RENAME COLUMN user_id TO borrower_id;
        RAISE NOTICE 'Renamed loans.user_id to borrower_id';
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        AND column_name = 'borrower_id'
    ) THEN
        -- If neither exists, add borrower_id column
        ALTER TABLE loans ADD COLUMN borrower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added loans.borrower_id column';
    ELSE
        RAISE NOTICE 'loans.borrower_id already exists';
    END IF;
END $$;

-- Fix 2: Add missing user_id column to transactions table and backfill data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'user_id'
    ) THEN
        -- Add nullable column first
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added transactions.user_id column';
        
        -- Backfill existing transactions with user_id from loans table
        -- Note: This must run AFTER Fix 1 (user_id -> borrower_id rename)
        UPDATE transactions 
        SET user_id = l.borrower_id 
        FROM loans l 
        WHERE transactions.loan_id = l.id 
        AND transactions.user_id IS NULL;
        
        RAISE NOTICE 'Backfilled transactions.user_id from loans.borrower_id for loan-related transactions';
        
        -- Note: Keep user_id nullable for transactions without loan_id (wallet deposits, fees, etc.)
        -- These may need manual review and separate handling
        RAISE NOTICE 'transactions.user_id remains nullable for non-loan transactions';
    ELSE
        RAISE NOTICE 'transactions.user_id already exists';
    END IF;
END $$;

-- Fix 3: Add missing currency column to transactions table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'USD';
        RAISE NOTICE 'Added transactions.currency column';
    ELSE
        RAISE NOTICE 'transactions.currency already exists';
    END IF;
END $$;

-- Fix 4: Fix user_documents table column name mismatch
DO $$
BEGIN
    -- Check if user_documents table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'user_documents'
    ) THEN
        -- Check if upload_date exists and uploaded_at doesn't
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_documents' 
            AND column_name = 'upload_date'
        ) AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_documents' 
            AND column_name = 'uploaded_at'
        ) THEN
            -- Rename upload_date to uploaded_at
            ALTER TABLE user_documents RENAME COLUMN upload_date TO uploaded_at;
            RAISE NOTICE 'Renamed user_documents.upload_date to uploaded_at';
        ELSIF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_documents' 
            AND column_name = 'uploaded_at'
        ) THEN
            -- Add uploaded_at column if neither exists
            ALTER TABLE user_documents ADD COLUMN uploaded_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added user_documents.uploaded_at column';
        ELSE
            RAISE NOTICE 'user_documents.uploaded_at already exists';
        END IF;
    ELSE
        RAISE NOTICE 'user_documents table does not exist';
    END IF;
END $$;

-- Update indexes to reflect the new column names
DROP INDEX IF EXISTS idx_loans_user_id;
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);

-- Add new indexes for the added columns
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

-- Update foreign key constraints if needed
DO $$
BEGIN
    -- Drop old foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'loans_user_id_fkey'
        AND table_name = 'loans'
    ) THEN
        ALTER TABLE loans DROP CONSTRAINT loans_user_id_fkey;
        RAISE NOTICE 'Dropped old loans_user_id_fkey constraint';
    END IF;
    
    -- Add new foreign key constraint for borrower_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'loans_borrower_id_fkey'
        AND table_name = 'loans'
    ) THEN
        ALTER TABLE loans ADD CONSTRAINT loans_borrower_id_fkey 
            FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added loans_borrower_id_fkey constraint';
    END IF;
END $$;

-- Update any views that might reference the old column names
DROP VIEW IF EXISTS loan_summary;
CREATE OR REPLACE VIEW loan_summary AS
SELECT 
    l.id,
    l.borrower_id,
    u.first_name,
    u.last_name,
    u.email,
    l.amount,
    l.interest_rate,
    l.term,
    l.status,
    l.loan_type,
    l.purpose,
    l.description,
    l.currency,
    l.created_at,
    l.updated_at,
    COUNT(rs.id) as total_installments,
    COUNT(CASE WHEN rs.status = 'PAID' THEN 1 END) as paid_installments,
    SUM(CASE WHEN rs.status = 'PAID' THEN rs.paid_amount ELSE 0 END) as total_paid
FROM loans l
LEFT JOIN users u ON l.borrower_id = u.id
LEFT JOIN repayment_schedule rs ON l.id = rs.loan_id
GROUP BY l.id, u.first_name, u.last_name, u.email;

-- Update any RLS policies if they exist
DO $$
BEGIN
    -- Drop old policies if they exist (with exception handling)
    BEGIN
        DROP POLICY IF EXISTS "Users can view own loans" ON loans;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop loans policy (may not exist): %', SQLERRM;
    END;
    
    BEGIN
        DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop transactions policy (may not exist): %', SQLERRM;
    END;
    
    -- Create new policies with correct column names (with exception handling)
    BEGIN
        IF EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE tablename = 'loans'
        ) THEN
            CREATE POLICY "Users can view own loans" ON loans
                FOR SELECT USING (auth.uid() = borrower_id);
            RAISE NOTICE 'Updated loans RLS policy for borrower_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create loans RLS policy: %', SQLERRM;
    END;
    
    BEGIN
        IF EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE tablename = 'transactions'
        ) THEN
            CREATE POLICY "Users can view own transactions" ON transactions
                FOR SELECT USING (auth.uid() = user_id);
            RAISE NOTICE 'Updated transactions RLS policy for user_id';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create transactions RLS policy: %', SQLERRM;
    END;
END $$;

COMMIT;

-- Add comments for documentation
COMMENT ON COLUMN loans.borrower_id IS 'Foreign key to users table - the borrower who requested the loan';
COMMENT ON COLUMN transactions.user_id IS 'Foreign key to users table - the user who initiated the transaction';
COMMENT ON COLUMN transactions.currency IS 'Currency code for the transaction amount (e.g., USD, ZWL)';
COMMENT ON COLUMN user_documents.uploaded_at IS 'Timestamp when the document was uploaded by the user';

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Schema fixes migration completed successfully';
    RAISE NOTICE 'Fixed: loans.user_id -> borrower_id';
    RAISE NOTICE 'Added: transactions.user_id, transactions.currency';
    RAISE NOTICE 'Fixed: user_documents.upload_date -> uploaded_at';
    RAISE NOTICE 'Updated: indexes, foreign keys, views, and RLS policies';
END $$;


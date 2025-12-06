-- Loan Configuration Admin Management Migration
-- Creates tables and views for admin control of loan limits and interest rates

-- Create loan configuration table for storing admin-adjustable parameters
CREATE TABLE IF NOT EXISTS loan_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_type TEXT NOT NULL CHECK (config_type IN ('global', 'loan_type', 'employment_type', 'user_override')),
    target_key TEXT NOT NULL, -- 'all' for global, loan type ('p2p', 'direct'), employment type, or user_id
    parameter_name TEXT NOT NULL CHECK (parameter_name IN ('min_loan_amount', 'max_loan_amount', 'interest_rate', 'cold_start_cap', 'dtni_max', 'max_tenure_months', 'cold_start_active', 'min_tenure_months', 'interest_calculation_method')),
    parameter_value DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique combinations
    UNIQUE(config_type, target_key, parameter_name)
);

-- Create loan configuration audit log for tracking all changes
CREATE TABLE IF NOT EXISTS loan_config_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES loan_config(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES users(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE')),
    old_value DECIMAL(10,2),
    new_value DECIMAL(10,2) NOT NULL,
    parameter_name TEXT NOT NULL,
    config_type TEXT NOT NULL,
    target_key TEXT NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Insert default global configuration values
INSERT INTO loan_config (config_type, target_key, parameter_name, parameter_value) VALUES
('global', 'all', 'interest_rate', 8.00),
('global', 'all', 'min_loan_amount', 25.00),
('global', 'all', 'cold_start_active', 1.00), -- Boolean as decimal
('global', 'all', 'min_tenure_months', 1.00),
('global', 'all', 'max_tenure_months', 24.00),
('global', 'all', 'interest_calculation_method', 1.00) -- 1.00 = reducing_balance, 2.00 = flat_rate
ON CONFLICT (config_type, target_key, parameter_name) DO NOTHING;

-- Insert default loan type configurations
INSERT INTO loan_config (config_type, target_key, parameter_name, parameter_value) VALUES
-- Direct Lending Configuration
('loan_type', 'direct', 'interest_rate', 8.00),
('loan_type', 'direct', 'max_loan_amount', 3000.00),
('loan_type', 'direct', 'min_loan_amount', 25.00),
('loan_type', 'direct', 'dtni_max', 0.40),
('loan_type', 'direct', 'max_tenure_months', 24.00),
('loan_type', 'direct', 'cold_start_active', 1.00),
('loan_type', 'direct', 'interest_calculation_method', 1.00), -- reducing_balance
-- P2P Lending Configuration
('loan_type', 'p2p', 'interest_rate', 12.00),
('loan_type', 'p2p', 'max_loan_amount', 2000.00),
('loan_type', 'p2p', 'min_loan_amount', 50.00),
('loan_type', 'p2p', 'dtni_max', 0.35),
('loan_type', 'p2p', 'max_tenure_months', 18.00),
('loan_type', 'p2p', 'cold_start_active', 1.00),
('loan_type', 'p2p', 'interest_calculation_method', 2.00) -- flat_rate
ON CONFLICT (config_type, target_key, parameter_name) DO NOTHING;

-- Insert default employment type configurations
INSERT INTO loan_config (config_type, target_key, parameter_name, parameter_value) VALUES
('employment_type', 'government', 'max_loan_amount', 3000.00),
('employment_type', 'government', 'cold_start_cap', 0.00), -- No cap for government
('employment_type', 'government', 'dtni_max', 0.40),
('employment_type', 'government', 'max_tenure_months', 24.00),
('employment_type', 'private', 'max_loan_amount', 1000.00),
('employment_type', 'private', 'cold_start_cap', 300.00),
('employment_type', 'private', 'dtni_max', 0.33),
('employment_type', 'private', 'max_tenure_months', 12.00),
('employment_type', 'informal', 'max_loan_amount', 500.00),
('employment_type', 'informal', 'cold_start_cap', 100.00),
('employment_type', 'informal', 'dtni_max', 0.25),
('employment_type', 'informal', 'max_tenure_months', 6.00),
('employment_type', 'business', 'max_loan_amount', 1000.00),
('employment_type', 'business', 'cold_start_cap', 200.00),
('employment_type', 'business', 'dtni_max', 0.30),
('employment_type', 'business', 'max_tenure_months', 12.00)
ON CONFLICT (config_type, target_key, parameter_name) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_loan_config_type ON loan_config(config_type);
CREATE INDEX IF NOT EXISTS idx_loan_config_target ON loan_config(target_key);
CREATE INDEX IF NOT EXISTS idx_loan_config_parameter ON loan_config(parameter_name);
CREATE INDEX IF NOT EXISTS idx_loan_config_active ON loan_config(is_active);
CREATE INDEX IF NOT EXISTS idx_loan_config_audit_admin ON loan_config_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_loan_config_audit_timestamp ON loan_config_audit_log(timestamp);

-- Row Level Security
ALTER TABLE loan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_config_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loan_config
CREATE POLICY "Admins can manage loan config" ON loan_config
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view loan config audit" ON loan_config_audit_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- View for current loan configuration (hierarchical: global -> employment -> user)
CREATE OR REPLACE VIEW current_loan_config AS
WITH ranked_configs AS (
    SELECT 
        config_type,
        target_key,
        parameter_name,
        parameter_value,
        is_active,
        -- Priority: user_override (3) > employment_type (2) > global (1)
        CASE 
            WHEN config_type = 'user_override' THEN 3
            WHEN config_type = 'employment_type' THEN 2
            WHEN config_type = 'global' THEN 1
        END as priority,
        created_at,
        updated_at
    FROM loan_config 
    WHERE is_active = true
),
latest_configs AS (
    SELECT 
        parameter_name,
        parameter_value,
        config_type,
        target_key,
        priority,
        created_at,
        updated_at,
        ROW_NUMBER() OVER (
            PARTITION BY parameter_name, target_key 
            ORDER BY priority DESC, updated_at DESC
        ) as rn
    FROM ranked_configs
)
SELECT 
    parameter_name,
    parameter_value,
    config_type,
    target_key,
    priority,
    created_at,
    updated_at
FROM latest_configs 
WHERE rn = 1;

-- Function to get effective loan configuration for a user
CREATE OR REPLACE FUNCTION get_effective_loan_config(
    p_user_id UUID,
    p_loan_type TEXT DEFAULT NULL,
    p_employment_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    parameter_name TEXT,
    parameter_value DECIMAL(10,2),
    source_type TEXT,
    source_key TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_config AS (
        SELECT parameter_name, parameter_value, config_type, target_key, 4 as priority
        FROM loan_config 
        WHERE config_type = 'user_override' 
        AND target_key = p_user_id::TEXT 
        AND is_active = true
    ),
    employment_config AS (
        SELECT parameter_name, parameter_value, config_type, target_key, 3 as priority
        FROM loan_config 
        WHERE config_type = 'employment_type' 
        AND target_key = COALESCE(p_employment_type, 'informal')
        AND is_active = true
    ),
    loan_type_config AS (
        SELECT parameter_name, parameter_value, config_type, target_key, 2 as priority
        FROM loan_config 
        WHERE config_type = 'loan_type' 
        AND target_key = COALESCE(p_loan_type, 'direct')
        AND is_active = true
    ),
    global_config AS (
        SELECT parameter_name, parameter_value, config_type, target_key, 1 as priority
        FROM loan_config 
        WHERE config_type = 'global' 
        AND target_key = 'all'
        AND is_active = true
    ),
    all_configs AS (
        SELECT * FROM user_config
        UNION ALL
        SELECT * FROM employment_config
        UNION ALL
        SELECT * FROM loan_type_config
        UNION ALL
        SELECT * FROM global_config
    ),
    ranked AS (
        SELECT 
            parameter_name,
            parameter_value,
            config_type,
            target_key,
            ROW_NUMBER() OVER (
                PARTITION BY parameter_name 
                ORDER BY priority DESC, updated_at DESC
            ) as rn
        FROM all_configs
    )
    SELECT 
        parameter_name,
        parameter_value,
        config_type as source_type,
        target_key as source_key
    FROM ranked 
    WHERE rn = 1;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Loan configuration admin system created successfully!';
    RAISE NOTICE 'Tables: loan_config, loan_config_audit_log';
    RAISE NOTICE 'Views: current_loan_config';
    RAISE NOTICE 'Functions: get_effective_loan_config()';
END $$;

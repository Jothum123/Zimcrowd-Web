-- ============================================
-- Loan Installments Schema
-- With 35-day grace period for first payment
-- ============================================

CREATE TABLE IF NOT EXISTS loan_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL,
    installment_number INT NOT NULL,
    
    -- Payment Details
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    
    -- Payment Window (Government employee salary cycle)
    payment_group TEXT CHECK (payment_group IN ('SAME_MONTH', 'NEXT_MONTH')),
    
    -- Grace Period (35 days for first payment, 24 hours for others)
    is_first_payment BOOLEAN DEFAULT FALSE,
    grace_period_days INT DEFAULT 0,        -- 35 for first payment
    grace_period_hours INT DEFAULT 24,      -- 24 for subsequent payments
    grace_period_end TIMESTAMP NOT NULL,    -- Calculated grace period end
    
    -- Payment Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'defaulted')),
    paid_at TIMESTAMP,
    paid_amount DECIMAL(10,2),
    
    -- Late Payment Tracking
    days_late INT DEFAULT 0,
    late_since TIMESTAMP,
    late_fee_applied BOOLEAN DEFAULT FALSE,
    late_fee_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(loan_id, installment_number)
);

-- ============================================
-- INDEXES
-- ============================================

-- For late payment detection
CREATE INDEX IF NOT EXISTS idx_installments_late_detection 
ON loan_installments(status, grace_period_end) 
WHERE status = 'pending';

-- For due date queries
CREATE INDEX IF NOT EXISTS idx_installments_due_date 
ON loan_installments(due_date, status);

-- For loan lookup
CREATE INDEX IF NOT EXISTS idx_installments_loan 
ON loan_installments(loan_id);

-- For first payment queries
CREATE INDEX IF NOT EXISTS idx_installments_first_payment 
ON loan_installments(is_first_payment) 
WHERE is_first_payment = TRUE;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate grace period end for an installment
CREATE OR REPLACE FUNCTION calculate_grace_period_end(
    p_due_date DATE,
    p_is_first_payment BOOLEAN
)
RETURNS TIMESTAMP AS $$
DECLARE
    v_grace_end TIMESTAMP;
BEGIN
    IF p_is_first_payment THEN
        -- First payment: 35 days grace
        v_grace_end := p_due_date::TIMESTAMP + INTERVAL '35 days';
    ELSE
        -- Subsequent payments: 24 hours grace
        v_grace_end := p_due_date::TIMESTAMP + INTERVAL '24 hours';
    END IF;
    
    RETURN v_grace_end;
END;
$$ LANGUAGE plpgsql;

-- Get all late installments
CREATE OR REPLACE FUNCTION get_late_installments()
RETURNS TABLE (
    id UUID,
    loan_id UUID,
    installment_number INT,
    due_date DATE,
    amount_due DECIMAL(10,2),
    grace_period_end TIMESTAMP,
    days_late INT,
    is_first_payment BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.loan_id,
        i.installment_number,
        i.due_date,
        i.amount_due,
        i.grace_period_end,
        EXTRACT(DAY FROM (NOW() - i.grace_period_end))::INT as days_late,
        i.is_first_payment
    FROM loan_installments i
    WHERE i.status = 'pending'
    AND i.grace_period_end < NOW()
    ORDER BY i.grace_period_end ASC;
END;
$$ LANGUAGE plpgsql;

-- Get upcoming payments for reminders
CREATE OR REPLACE FUNCTION get_upcoming_payments(p_days_ahead INT DEFAULT 3)
RETURNS TABLE (
    id UUID,
    loan_id UUID,
    installment_number INT,
    due_date DATE,
    amount_due DECIMAL(10,2),
    grace_period_end TIMESTAMP,
    days_until_due INT,
    is_first_payment BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.loan_id,
        i.installment_number,
        i.due_date,
        i.amount_due,
        i.grace_period_end,
        (i.due_date - CURRENT_DATE)::INT as days_until_due,
        i.is_first_payment
    FROM loan_installments i
    WHERE i.status = 'pending'
    AND i.due_date >= CURRENT_DATE
    AND i.due_date <= CURRENT_DATE + p_days_ahead
    ORDER BY i.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Mark installment as late
CREATE OR REPLACE FUNCTION mark_installment_late(
    p_installment_id UUID,
    p_days_late INT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE loan_installments
    SET 
        status = 'late',
        days_late = p_days_late,
        late_since = NOW(),
        updated_at = NOW()
    WHERE id = p_installment_id
    AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EXAMPLE DATA
-- ============================================

-- Example: Create payment schedule for a loan
COMMENT ON TABLE loan_installments IS 'Loan payment schedule with 35-day grace for first payment';

-- Example usage:
/*
-- Loan created on November 14, 2025
-- Term: 12 months
-- Monthly payment: $150

INSERT INTO loan_installments (
    loan_id,
    installment_number,
    due_date,
    amount_due,
    is_first_payment,
    grace_period_days,
    grace_period_hours,
    grace_period_end
) VALUES
-- First payment: 35-day grace
(
    'loan-uuid',
    1,
    '2025-12-14',
    150.00,
    TRUE,
    35,
    0,
    calculate_grace_period_end('2025-12-14', TRUE)  -- Grace until Jan 18, 2026
),
-- Second payment: 24-hour grace
(
    'loan-uuid',
    2,
    '2026-01-14',
    150.00,
    FALSE,
    0,
    24,
    calculate_grace_period_end('2026-01-14', FALSE)  -- Grace until Jan 15, 2026 00:00
);

-- Check late payments
SELECT * FROM get_late_installments();

-- Check upcoming payments (next 3 days)
SELECT * FROM get_upcoming_payments(3);
*/

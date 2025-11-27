-- Add missing loan_id column to payment_transactions table

ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS loan_id UUID;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_loan_id 
ON payment_transactions(loan_id);

-- Success message
SELECT 'loan_id column added successfully' AS message;

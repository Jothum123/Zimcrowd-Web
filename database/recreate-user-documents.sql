-- ============================================================================
-- RECREATE user_documents TABLE
-- ============================================================================
-- Use this if the table exists with wrong structure
-- WARNING: This will delete all existing documents data
-- ============================================================================

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS public.user_documents CASCADE;

-- Recreate with correct structure
CREATE TABLE public.user_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Document Information
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('national_id', 'passport', 'drivers_license', 'proof_of_address', 'bank_statement', 'payslip', 'tax_certificate', 'business_registration', 'other')),
    document_number VARCHAR(100),
    document_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Verification Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- Document Validity
    issue_date DATE,
    expiry_date DATE,
    is_expired BOOLEAN GENERATED ALWAYS AS (expiry_date < CURRENT_DATE) STORED,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX idx_user_documents_status ON public.user_documents(status);
CREATE INDEX idx_user_documents_type ON public.user_documents(document_type);

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own documents" ON public.user_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.user_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.user_documents
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_documents_updated_at 
    BEFORE UPDATE ON public.user_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ user_documents table recreated successfully';
    RAISE NOTICE '========================================';
END $$;

-- Show table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_documents'
ORDER BY ordinal_position;

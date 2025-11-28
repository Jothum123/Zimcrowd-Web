-- ============================================================================
-- MIGRATE user_documents TABLE TO MATCH UNIFIED SCHEMA
-- ============================================================================
-- The table exists but has different column names
-- This script adds missing columns and creates aliases/views if needed
-- ============================================================================

-- Add missing columns to existing user_documents table
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATING user_documents TABLE';
    RAISE NOTICE '========================================';
    
    -- Add document_type (maps to existing doc_type)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'document_type'
    ) THEN
        -- Copy data from doc_type to document_type
        ALTER TABLE public.user_documents ADD COLUMN document_type VARCHAR(50);
        UPDATE public.user_documents SET document_type = doc_type;
        ALTER TABLE public.user_documents ALTER COLUMN document_type SET NOT NULL;
        RAISE NOTICE '✅ Added document_type column';
    END IF;
    
    -- Add document_number (new column)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'document_number'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN document_number VARCHAR(100);
        RAISE NOTICE '✅ Added document_number column';
    END IF;
    
    -- Add document_url (maps to existing file_url)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'document_url'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN document_url TEXT;
        UPDATE public.user_documents SET document_url = file_url;
        ALTER TABLE public.user_documents ALTER COLUMN document_url SET NOT NULL;
        RAISE NOTICE '✅ Added document_url column';
    END IF;
    
    -- Add verified_by (new column)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'verified_by'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN verified_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added verified_by column';
    END IF;
    
    -- Add rejection_reason (maps to existing verification_notes)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN rejection_reason TEXT;
        UPDATE public.user_documents SET rejection_reason = verification_notes WHERE is_verified = false;
        RAISE NOTICE '✅ Added rejection_reason column';
    END IF;
    
    -- Add issue_date (new column)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'issue_date'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN issue_date DATE;
        RAISE NOTICE '✅ Added issue_date column';
    END IF;
    
    -- Add expiry_date (new column)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'expiry_date'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN expiry_date DATE;
        RAISE NOTICE '✅ Added expiry_date column';
    END IF;
    
    -- Add is_expired (regular column, will be updated by trigger)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'is_expired'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN is_expired BOOLEAN DEFAULT FALSE;
        -- Update existing rows
        UPDATE public.user_documents SET is_expired = (expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE);
        RAISE NOTICE '✅ Added is_expired column';
    END IF;
    
    -- Add metadata (new column)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Added metadata column';
    END IF;
    
    -- Add notes (new column)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN notes TEXT;
        RAISE NOTICE '✅ Added notes column';
    END IF;
    
    -- Add created_at (maps to existing uploaded_at)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE public.user_documents SET created_at = uploaded_at;
        RAISE NOTICE '✅ Added created_at column';
    END IF;
    
    -- Add updated_at (new column)
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'user_documents' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.user_documents ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ MIGRATION COMPLETE';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- CREATE MISSING INDEXES
-- ============================================================================

-- Index on user_id (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);

-- Index on status (already exists)
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON public.user_documents(status);

-- Index on document_type (new)
CREATE INDEX IF NOT EXISTS idx_user_documents_document_type ON public.user_documents(document_type);

-- Index on doc_type (existing column)
CREATE INDEX IF NOT EXISTS idx_user_documents_doc_type ON public.user_documents(doc_type);

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update is_expired status
CREATE OR REPLACE FUNCTION update_is_expired_column()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiry_date IS NOT NULL THEN
        NEW.is_expired = (NEW.expiry_date < CURRENT_DATE);
    ELSE
        NEW.is_expired = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if exist and recreate
DROP TRIGGER IF EXISTS update_user_documents_updated_at ON public.user_documents;
DROP TRIGGER IF EXISTS update_user_documents_is_expired ON public.user_documents;

-- Trigger for updated_at
CREATE TRIGGER update_user_documents_updated_at 
    BEFORE UPDATE ON public.user_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for is_expired (runs on INSERT and UPDATE)
CREATE TRIGGER update_user_documents_is_expired 
    BEFORE INSERT OR UPDATE ON public.user_documents
    FOR EACH ROW EXECUTE FUNCTION update_is_expired_column();

-- ============================================================================
-- ENABLE RLS (if not already enabled)
-- ============================================================================

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.user_documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.user_documents;

-- Create policies
CREATE POLICY "Users can view own documents" ON public.user_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.user_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.user_documents
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_documents';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total columns in user_documents: %', col_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Expected new columns:';
    RAISE NOTICE '- document_type (maps to doc_type)';
    RAISE NOTICE '- document_number';
    RAISE NOTICE '- document_url (maps to file_url)';
    RAISE NOTICE '- verified_by';
    RAISE NOTICE '- rejection_reason';
    RAISE NOTICE '- issue_date';
    RAISE NOTICE '- expiry_date';
    RAISE NOTICE '- is_expired (computed)';
    RAISE NOTICE '- metadata';
    RAISE NOTICE '- notes';
    RAISE NOTICE '- created_at (maps to uploaded_at)';
    RAISE NOTICE '- updated_at';
    RAISE NOTICE '';
    RAISE NOTICE 'Existing columns preserved:';
    RAISE NOTICE '- doc_type, file_url, uploaded_at, etc.';
    RAISE NOTICE '========================================';
END $$;

-- Show final table structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_documents'
ORDER BY ordinal_position;

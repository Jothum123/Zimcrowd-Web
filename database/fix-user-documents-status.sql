-- ============================================================================
-- FIX: Add missing status column to user_documents table
-- ============================================================================
-- Run this if you get error: column "status" does not exist
-- ============================================================================

-- Check if user_documents table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_documents') THEN
        RAISE NOTICE '✅ user_documents table exists, checking for status column...';
        
        -- Check if status column exists
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_documents' 
            AND column_name = 'status'
        ) THEN
            RAISE NOTICE '⚠️  status column missing, adding it now...';
            
            -- Add status column
            ALTER TABLE public.user_documents 
            ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
            CHECK (status IN ('pending', 'verified', 'rejected', 'expired'));
            
            RAISE NOTICE '✅ status column added successfully';
        ELSE
            RAISE NOTICE '✅ status column already exists';
        END IF;
        
        -- Ensure index exists
        IF NOT EXISTS (
            SELECT FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND tablename = 'user_documents' 
            AND indexname = 'idx_user_documents_status'
        ) THEN
            CREATE INDEX idx_user_documents_status ON public.user_documents(status);
            RAISE NOTICE '✅ Created index on status column';
        ELSE
            RAISE NOTICE '✅ Index on status column already exists';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ user_documents table does not exist';
        RAISE NOTICE '💡 Run unified-settings-schema.sql to create all tables';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

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

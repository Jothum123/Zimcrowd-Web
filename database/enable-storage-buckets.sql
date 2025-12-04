-- Enable Storage Buckets for User Profiles and Settings
-- Run this in Supabase SQL Editor

-- ============================================
-- KYC DOCUMENTS TABLE (for tracking uploaded documents)
-- ============================================
CREATE TABLE IF NOT EXISTS public.kyc_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'id_front', 'id_back', 'selfie', 'proof_of_address', 'bank_statement'
    file_path TEXT NOT NULL,
    file_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    rejection_reason TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents(status);

-- RLS for KYC documents
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can view own KYC documents" ON public.kyc_documents
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can insert own KYC documents" ON public.kyc_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pending KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can delete own pending KYC documents" ON public.kyc_documents
    FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Service role full access to KYC documents" ON public.kyc_documents;
CREATE POLICY "Service role full access to KYC documents" ON public.kyc_documents
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- BUCKET 1: AVATARS (Profile Pictures)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,  -- Public bucket for profile pictures
    5242880,  -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ============================================
-- BUCKET 2: KYC DOCUMENTS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'kyc-documents',
    'kyc-documents',
    false,  -- Private bucket for sensitive documents
    10485760,  -- 10MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ============================================
-- BUCKET 3: USER DOCUMENTS (General)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-documents',
    'user-documents',
    false,  -- Private bucket
    20971520,  -- 20MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 20971520;

-- ============================================
-- BUCKET 4: LOAN ATTACHMENTS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'loan-attachments',
    'loan-attachments',
    false,  -- Private bucket
    15728640,  -- 15MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640;

-- ============================================
-- STORAGE POLICIES FOR AVATARS (Public Read, Owner Write)
-- ============================================

-- Allow public read access to avatars
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to update their own avatar
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow users to delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- STORAGE POLICIES FOR KYC DOCUMENTS (Private, Owner Only)
-- ============================================

-- Users can view their own KYC documents
DROP POLICY IF EXISTS "Users can view own KYC docs" ON storage.objects;
CREATE POLICY "Users can view own KYC docs" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'kyc-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can upload their own KYC documents
DROP POLICY IF EXISTS "Users can upload own KYC docs" ON storage.objects;
CREATE POLICY "Users can upload own KYC docs" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'kyc-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own KYC documents
DROP POLICY IF EXISTS "Users can update own KYC docs" ON storage.objects;
CREATE POLICY "Users can update own KYC docs" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'kyc-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own KYC documents
DROP POLICY IF EXISTS "Users can delete own KYC docs" ON storage.objects;
CREATE POLICY "Users can delete own KYC docs" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'kyc-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- STORAGE POLICIES FOR USER DOCUMENTS (Private, Owner Only)
-- ============================================

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'user-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'user-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
CREATE POLICY "Users can update own documents" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'user-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'user-documents' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- STORAGE POLICIES FOR LOAN ATTACHMENTS (Private, Owner Only)
-- ============================================

DROP POLICY IF EXISTS "Users can view own loan attachments" ON storage.objects;
CREATE POLICY "Users can view own loan attachments" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'loan-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can upload loan attachments" ON storage.objects;
CREATE POLICY "Users can upload loan attachments" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'loan-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can update own loan attachments" ON storage.objects;
CREATE POLICY "Users can update own loan attachments" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'loan-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

DROP POLICY IF EXISTS "Users can delete own loan attachments" ON storage.objects;
CREATE POLICY "Users can delete own loan attachments" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'loan-attachments' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================
-- SERVICE ROLE ACCESS (Full access for backend)
-- ============================================

DROP POLICY IF EXISTS "Service role has full access" ON storage.objects;
CREATE POLICY "Service role has full access" ON storage.objects
    FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
    id as bucket_name,
    public,
    file_size_limit / 1048576 as max_size_mb,
    allowed_mime_types
FROM storage.buckets
WHERE id IN ('avatars', 'kyc-documents', 'user-documents', 'loan-attachments');

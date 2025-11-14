-- ============================================
-- ZIMSCORE MODULE DATABASE SCHEMA
-- ============================================
-- Proprietary reputation scoring system for ZimCrowd
-- Score Range: 30-85 (internal) | 1.0-5.0 stars (public)
-- Technology: Google Vision API (OCR + Face Detection)
-- ============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.loan_repayments CASCADE;
DROP TABLE IF EXISTS public.zimscore_history CASCADE;
DROP TABLE IF EXISTS public.user_zimscores CASCADE;
DROP TABLE IF EXISTS public.user_documents CASCADE;
DROP TABLE IF EXISTS public.zimscore_users CASCADE;

-- ============================================
-- 1. ZIMSCORE USERS TABLE
-- ============================================
-- Stores user information for ZimScore module
CREATE TABLE IF NOT EXISTS public.zimscore_users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    email TEXT,
    
    -- KYC Status Flow:
    -- pending -> pending_face_match -> pending_financials -> verified | failed
    kyc_status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (kyc_status IN ('pending', 'pending_face_match', 'pending_financials', 'verified', 'failed')),
    
    kyc_failure_reason TEXT,
    kyc_verified_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. USER DOCUMENTS TABLE
-- ============================================
-- Stores uploaded documents and OCR results
CREATE TABLE IF NOT EXISTS public.user_documents (
    doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.zimscore_users(user_id) ON DELETE CASCADE,
    
    -- Document Types
    doc_type TEXT NOT NULL 
        CHECK (doc_type IN ('ZIM_ID', 'PASSPORT', 'BANK_STATEMENT', 'ECOCASH_STATEMENT', 'SELFIE')),
    
    -- File Storage
    file_url TEXT NOT NULL, -- URL to file in cloud storage (S3/GCS)
    file_name TEXT,
    file_size_bytes BIGINT,
    mime_type TEXT,
    
    -- OCR Results
    ocr_raw_text TEXT, -- Raw text from Google Vision API
    ocr_confidence REAL, -- Confidence score from Vision API (0-1)
    ocr_processed_at TIMESTAMPTZ,
    
    -- Extracted Data (JSON for flexibility)
    extracted_data JSONB, -- Structured data extracted from OCR
    -- Example for ID: {"name": "John Doe", "id_number": "12-345678A12", "dob": "1990-01-01"}
    -- Example for Statement: {"avg_monthly_income": 500.00, "avg_ending_balance": 200.00, "nsf_events": 0}
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT FALSE,
    verification_notes TEXT,
    
    -- Face Match (for SELFIE documents)
    face_match_score REAL, -- Similarity score (0-1) between selfie and ID photo
    face_match_passed BOOLEAN,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================
-- 3. USER ZIMSCORES TABLE
-- ============================================
-- Stores the current ZimScore for each user
CREATE TABLE IF NOT EXISTS public.user_zimscores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.zimscore_users(user_id) ON DELETE CASCADE,
    
    -- Internal Score (30-85)
    score_value INT NOT NULL DEFAULT 30 
        CHECK (score_value >= 30 AND score_value <= 85),
    
    -- Public Star Rating (1.0-5.0 in 0.5 increments)
    star_rating REAL NOT NULL DEFAULT 1.0 
        CHECK (star_rating >= 1.0 AND star_rating <= 5.0),
    
    -- Credit Limit
    max_loan_amount DECIMAL(10, 2) NOT NULL DEFAULT 50.00 
        CHECK (max_loan_amount >= 0),
    
    -- Score Factors (for transparency and debugging)
    score_factors JSONB, -- Breakdown of what contributed to the score
    -- Example: {
    --   "initial_income": 10,
    --   "initial_balance": 5,
    --   "loans_repaid_on_time": 3,
    --   "total_loans": 2,
    --   "late_payments": -2
    -- }
    
    -- Calculation Metadata
    last_calculated TIMESTAMPTZ DEFAULT NOW(),
    calculation_method TEXT, -- 'cold_start' or 'trust_loop'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ZIMSCORE HISTORY TABLE
-- ============================================
-- Tracks all score changes over time
CREATE TABLE IF NOT EXISTS public.zimscore_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.zimscore_users(user_id) ON DELETE CASCADE,
    
    -- Score Values
    old_score_value INT,
    new_score_value INT NOT NULL,
    old_star_rating REAL,
    new_star_rating REAL NOT NULL,
    old_max_loan_amount DECIMAL(10, 2),
    new_max_loan_amount DECIMAL(10, 2) NOT NULL,
    
    -- Change Reason
    change_reason TEXT NOT NULL, -- 'initial_calculation', 'loan_repaid_on_time', 'loan_late', 'loan_defaulted', etc.
    change_details JSONB, -- Additional context
    
    -- Related Entity
    related_loan_id UUID, -- If triggered by a loan event
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. LOANS TABLE (Enhanced for ZimScore)
-- ============================================
-- Tracks loans for the Trust Loop
CREATE TABLE IF NOT EXISTS public.zimscore_loans (
    loan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_user_id UUID NOT NULL REFERENCES public.zimscore_users(user_id) ON DELETE CASCADE,
    lender_user_id UUID REFERENCES public.zimscore_users(user_id),
    
    -- Loan Details
    amount_requested DECIMAL(10, 2) NOT NULL CHECK (amount_requested > 0),
    amount_funded DECIMAL(10, 2) DEFAULT 0.00,
    interest_rate DECIMAL(5, 2) NOT NULL, -- Annual percentage rate
    term_days INT NOT NULL CHECK (term_days > 0),
    
    -- Status Flow: pending -> funded -> repaid | late | defaulted
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'funded', 'repaid', 'late', 'defaulted', 'cancelled')),
    
    -- Important Dates
    funded_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    repaid_at TIMESTAMPTZ,
    
    -- Repayment Tracking
    days_late INT DEFAULT 0,
    is_on_time BOOLEAN, -- Set when repaid
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. LOAN REPAYMENTS TABLE
-- ============================================
-- Tracks individual repayment transactions
CREATE TABLE IF NOT EXISTS public.loan_repayments (
    repayment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES public.zimscore_loans(loan_id) ON DELETE CASCADE,
    
    -- Payment Details
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT, -- 'paynow', 'ecocash', 'bank_transfer'
    payment_reference TEXT, -- External payment reference
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'failed')),
    
    -- Paynow Integration
    paynow_poll_url TEXT,
    paynow_status TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User Documents
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_doc_type ON public.user_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_user_documents_is_verified ON public.user_documents(is_verified);

-- ZimScores
CREATE INDEX IF NOT EXISTS idx_user_zimscores_user_id ON public.user_zimscores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_score_value ON public.user_zimscores(score_value);
CREATE INDEX IF NOT EXISTS idx_user_zimscores_star_rating ON public.user_zimscores(star_rating);

-- ZimScore History
CREATE INDEX IF NOT EXISTS idx_zimscore_history_user_id ON public.zimscore_history(user_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_history_created_at ON public.zimscore_history(created_at DESC);

-- Loans
CREATE INDEX IF NOT EXISTS idx_zimscore_loans_borrower_id ON public.zimscore_loans(borrower_user_id);
CREATE INDEX IF NOT EXISTS idx_zimscore_loans_status ON public.zimscore_loans(status);
CREATE INDEX IF NOT EXISTS idx_zimscore_loans_due_date ON public.zimscore_loans(due_date);

-- Repayments
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON public.loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_status ON public.loan_repayments(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_zimscore_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_zimscore_users_updated_at 
    BEFORE UPDATE ON public.zimscore_users
    FOR EACH ROW EXECUTE FUNCTION update_zimscore_updated_at();

CREATE TRIGGER update_user_zimscores_updated_at 
    BEFORE UPDATE ON public.user_zimscores
    FOR EACH ROW EXECUTE FUNCTION update_zimscore_updated_at();

CREATE TRIGGER update_zimscore_loans_updated_at 
    BEFORE UPDATE ON public.zimscore_loans
    FOR EACH ROW EXECUTE FUNCTION update_zimscore_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.zimscore_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_zimscores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zimscore_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zimscore_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view own profile" ON public.zimscore_users
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can view own documents" ON public.user_documents
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can view own zimscore" ON public.user_zimscores
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can view own score history" ON public.zimscore_history
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can view own loans" ON public.zimscore_loans
    FOR SELECT USING (borrower_user_id = auth.uid()::uuid OR lender_user_id = auth.uid()::uuid);

-- Public can view borrower's star rating (for trust)
CREATE POLICY "Public can view star ratings" ON public.user_zimscores
    FOR SELECT USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function: Map internal score (30-85) to star rating (1.0-5.0)
CREATE OR REPLACE FUNCTION calculate_star_rating(score_value INT)
RETURNS REAL AS $$
DECLARE
    star_rating REAL;
BEGIN
    -- Linear mapping: 30 -> 1.0, 85 -> 5.0
    -- Formula: star_rating = 1.0 + ((score_value - 30) / (85 - 30)) * 4.0
    star_rating := 1.0 + ((score_value - 30)::REAL / 55.0) * 4.0;
    
    -- Round to nearest 0.5
    star_rating := ROUND(star_rating * 2) / 2.0;
    
    -- Clamp to valid range
    IF star_rating < 1.0 THEN
        star_rating := 1.0;
    ELSIF star_rating > 5.0 THEN
        star_rating := 5.0;
    END IF;
    
    RETURN star_rating;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate max loan amount based on score
CREATE OR REPLACE FUNCTION calculate_max_loan_amount(score_value INT)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    max_amount DECIMAL(10, 2);
BEGIN
    -- Tiered system based on score
    IF score_value >= 75 THEN
        max_amount := 1000.00; -- $1000 for excellent scores
    ELSIF score_value >= 65 THEN
        max_amount := 500.00;  -- $500 for good scores
    ELSIF score_value >= 55 THEN
        max_amount := 250.00;  -- $250 for fair scores
    ELSIF score_value >= 45 THEN
        max_amount := 100.00;  -- $100 for low scores
    ELSE
        max_amount := 50.00;   -- $50 minimum
    END IF;
    
    RETURN max_amount;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get user's loan repayment statistics
CREATE OR REPLACE FUNCTION get_user_loan_stats(p_user_id UUID)
RETURNS TABLE (
    total_loans INT,
    repaid_on_time INT,
    repaid_late INT,
    defaulted INT,
    active_loans INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INT AS total_loans,
        COUNT(*) FILTER (WHERE status = 'repaid' AND is_on_time = TRUE)::INT AS repaid_on_time,
        COUNT(*) FILTER (WHERE status = 'repaid' AND is_on_time = FALSE)::INT AS repaid_late,
        COUNT(*) FILTER (WHERE status = 'defaulted')::INT AS defaulted,
        COUNT(*) FILTER (WHERE status = 'funded')::INT AS active_loans
    FROM public.zimscore_loans
    WHERE borrower_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: User ZimScore Summary
CREATE OR REPLACE VIEW public.user_zimscore_summary AS
SELECT 
    u.user_id,
    u.full_name,
    u.phone_number,
    u.kyc_status,
    z.score_value,
    z.star_rating,
    z.max_loan_amount,
    z.last_calculated,
    (SELECT COUNT(*) FROM public.zimscore_loans WHERE borrower_user_id = u.user_id AND status = 'repaid' AND is_on_time = TRUE) AS loans_repaid_on_time,
    (SELECT COUNT(*) FROM public.zimscore_loans WHERE borrower_user_id = u.user_id AND status = 'defaulted') AS loans_defaulted
FROM public.zimscore_users u
LEFT JOIN public.user_zimscores z ON u.user_id = z.user_id;

-- View: Pending KYC Users
CREATE OR REPLACE VIEW public.pending_kyc_users AS
SELECT 
    u.*,
    (SELECT COUNT(*) FROM public.user_documents WHERE user_id = u.user_id AND doc_type = 'ZIM_ID' AND is_verified = TRUE) AS has_verified_id,
    (SELECT COUNT(*) FROM public.user_documents WHERE user_id = u.user_id AND doc_type = 'SELFIE' AND face_match_passed = TRUE) AS has_verified_selfie,
    (SELECT COUNT(*) FROM public.user_documents WHERE user_id = u.user_id AND doc_type IN ('BANK_STATEMENT', 'ECOCASH_STATEMENT') AND is_verified = TRUE) AS has_verified_statement
FROM public.zimscore_users u
WHERE u.kyc_status != 'verified';

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.zimscore_users IS 'Users in the ZimScore system with KYC status';
COMMENT ON TABLE public.user_documents IS 'Uploaded documents with OCR results from Google Vision API';
COMMENT ON TABLE public.user_zimscores IS 'Current ZimScore for each user (30-85 internal, 1.0-5.0 public)';
COMMENT ON TABLE public.zimscore_history IS 'Historical record of all ZimScore changes';
COMMENT ON TABLE public.zimscore_loans IS 'Loans used for Trust Loop score calculations';
COMMENT ON TABLE public.loan_repayments IS 'Individual repayment transactions';

COMMENT ON COLUMN public.user_zimscores.score_value IS 'Internal granular score (30-85)';
COMMENT ON COLUMN public.user_zimscores.star_rating IS 'Public-facing star rating (1.0-5.0)';
COMMENT ON COLUMN public.user_zimscores.max_loan_amount IS 'Maximum loan amount user can request';
COMMENT ON COLUMN public.user_documents.ocr_raw_text IS 'Raw text extracted by Google Vision API OCR';
COMMENT ON COLUMN public.user_documents.face_match_score IS 'Face similarity score from Google Vision API';

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
-- Version: 1.0.0
-- Last Updated: November 2024
-- Technology: PostgreSQL 15+ with Supabase
-- ============================================

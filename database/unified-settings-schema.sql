-- ============================================================================
-- UNIFIED SETTINGS & USER DATA SCHEMA
-- ============================================================================
-- This schema consolidates all user settings, preferences, and statistics
-- Run this to create all missing tables for the settings functionality
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USER STATISTICS TABLE
-- ============================================================================
-- Stores aggregated user performance metrics and statistics

CREATE TABLE IF NOT EXISTS public.user_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Investment Statistics
    total_invested DECIMAL(15, 2) DEFAULT 0 CHECK (total_invested >= 0),
    total_returns DECIMAL(15, 2) DEFAULT 0,
    active_investments INTEGER DEFAULT 0 CHECK (active_investments >= 0),
    completed_investments INTEGER DEFAULT 0 CHECK (completed_investments >= 0),
    pending_investments INTEGER DEFAULT 0 CHECK (pending_investments >= 0),
    
    -- Loan Statistics (for borrowers)
    total_borrowed DECIMAL(15, 2) DEFAULT 0 CHECK (total_borrowed >= 0),
    total_repaid DECIMAL(15, 2) DEFAULT 0 CHECK (total_repaid >= 0),
    active_loans INTEGER DEFAULT 0 CHECK (active_loans >= 0),
    completed_loans INTEGER DEFAULT 0 CHECK (completed_loans >= 0),
    defaulted_loans INTEGER DEFAULT 0 CHECK (defaulted_loans >= 0),
    
    -- Performance Metrics
    average_roi DECIMAL(5, 2) DEFAULT 0,
    on_time_payment_rate DECIMAL(5, 2) DEFAULT 100 CHECK (on_time_payment_rate >= 0 AND on_time_payment_rate <= 100),
    default_rate DECIMAL(5, 2) DEFAULT 0 CHECK (default_rate >= 0 AND default_rate <= 100),
    portfolio_growth DECIMAL(5, 2) DEFAULT 0,
    
    -- Activity Tracking
    last_investment_date TIMESTAMP WITH TIME ZONE,
    last_loan_date TIMESTAMP WITH TIME ZONE,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    total_transactions INTEGER DEFAULT 0 CHECK (total_transactions >= 0),
    
    -- Wallet Statistics
    current_balance DECIMAL(15, 2) DEFAULT 0 CHECK (current_balance >= 0),
    total_deposits DECIMAL(15, 2) DEFAULT 0 CHECK (total_deposits >= 0),
    total_withdrawals DECIMAL(15, 2) DEFAULT 0 CHECK (total_withdrawals >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON public.user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_updated_at ON public.user_statistics(updated_at);

-- ============================================================================
-- 2. USER SETTINGS TABLE
-- ============================================================================
-- Stores general user preferences and settings

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Display Preferences
    theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en' CHECK (language IN ('en', 'sn', 'nd')),
    currency VARCHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'ZWL', 'ZAR')),
    timezone VARCHAR(50) DEFAULT 'Africa/Harare',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
    number_format VARCHAR(20) DEFAULT '1,234.56' CHECK (number_format IN ('1,234.56', '1.234,56', '1 234.56')),
    
    -- Privacy Settings
    profile_visibility VARCHAR(20) DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'friends')),
    show_portfolio BOOLEAN DEFAULT FALSE,
    show_activity BOOLEAN DEFAULT FALSE,
    allow_messages BOOLEAN DEFAULT TRUE,
    allow_cookies BOOLEAN DEFAULT TRUE,
    share_data BOOLEAN DEFAULT FALSE,
    third_party_analytics BOOLEAN DEFAULT FALSE,
    
    -- Communication Preferences
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- ============================================================================
-- 3. NOTIFICATION PREFERENCES TABLE
-- ============================================================================
-- Stores user notification preferences across all channels

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email Notifications
    email_loan_approved BOOLEAN DEFAULT TRUE,
    email_loan_rejected BOOLEAN DEFAULT TRUE,
    email_payment_received BOOLEAN DEFAULT TRUE,
    email_payment_due BOOLEAN DEFAULT TRUE,
    email_investment_update BOOLEAN DEFAULT TRUE,
    email_weekly_summary BOOLEAN DEFAULT TRUE,
    email_monthly_report BOOLEAN DEFAULT TRUE,
    email_marketing BOOLEAN DEFAULT FALSE,
    email_security_alerts BOOLEAN DEFAULT TRUE,
    
    -- Push Notifications
    push_loan_updates BOOLEAN DEFAULT TRUE,
    push_investment_updates BOOLEAN DEFAULT TRUE,
    push_payment_reminders BOOLEAN DEFAULT TRUE,
    push_security_alerts BOOLEAN DEFAULT TRUE,
    push_promotional BOOLEAN DEFAULT FALSE,
    
    -- SMS Notifications
    sms_payment_received BOOLEAN DEFAULT FALSE,
    sms_payment_due BOOLEAN DEFAULT TRUE,
    sms_security_alerts BOOLEAN DEFAULT TRUE,
    sms_loan_approved BOOLEAN DEFAULT TRUE,
    
    -- In-App Notifications
    inapp_all BOOLEAN DEFAULT TRUE,
    inapp_sound BOOLEAN DEFAULT TRUE,
    inapp_vibration BOOLEAN DEFAULT TRUE,
    
    -- Notification Frequency
    digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (digest_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- ============================================================================
-- 4. INVESTMENT PREFERENCES TABLE
-- ============================================================================
-- Stores user investment preferences and auto-invest settings

CREATE TABLE IF NOT EXISTS public.investment_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Risk Profile
    risk_tolerance VARCHAR(20) DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    investment_goal VARCHAR(50) DEFAULT 'growth' CHECK (investment_goal IN ('income', 'growth', 'balanced', 'preservation')),
    
    -- Investment Limits
    min_investment DECIMAL(15, 2) DEFAULT 100 CHECK (min_investment >= 0),
    max_investment DECIMAL(15, 2) DEFAULT 10000 CHECK (max_investment >= min_investment),
    max_per_loan DECIMAL(15, 2) DEFAULT 1000 CHECK (max_per_loan >= 0),
    
    -- Loan Preferences
    preferred_loan_types TEXT[] DEFAULT ARRAY['personal', 'business'],
    min_interest_rate DECIMAL(5, 2) DEFAULT 5.0 CHECK (min_interest_rate >= 0),
    max_interest_rate DECIMAL(5, 2) DEFAULT 15.0 CHECK (max_interest_rate >= min_interest_rate),
    preferred_loan_terms INTEGER[] DEFAULT ARRAY[3, 6, 12],
    min_zimscore INTEGER DEFAULT 50 CHECK (min_zimscore >= 30 AND min_zimscore <= 85),
    
    -- Auto-Invest Settings
    auto_invest_enabled BOOLEAN DEFAULT FALSE,
    auto_invest_amount DECIMAL(15, 2) DEFAULT 0 CHECK (auto_invest_amount >= 0),
    auto_invest_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (auto_invest_frequency IN ('daily', 'weekly', 'monthly')),
    diversification_enabled BOOLEAN DEFAULT TRUE,
    max_loans_per_borrower INTEGER DEFAULT 1 CHECK (max_loans_per_borrower >= 1),
    
    -- Geographic Preferences
    preferred_regions TEXT[] DEFAULT ARRAY['Harare', 'Bulawayo'],
    exclude_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investment_preferences_user_id ON public.investment_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_preferences_auto_invest ON public.investment_preferences(auto_invest_enabled) WHERE auto_invest_enabled = TRUE;

-- ============================================================================
-- 5. USER DOCUMENTS TABLE
-- ============================================================================
-- Stores user document metadata and verification status

CREATE TABLE IF NOT EXISTS public.user_documents (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_status ON public.user_documents(status);
CREATE INDEX IF NOT EXISTS idx_user_documents_type ON public.user_documents(document_type);

-- ============================================================================
-- 6. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON public.user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_investment_preferences_updated_at BEFORE UPDATE ON public.investment_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at BEFORE UPDATE ON public.user_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. FUNCTION TO INITIALIZE USER SETTINGS
-- ============================================================================
-- Automatically creates default settings when a new user signs up

CREATE OR REPLACE FUNCTION initialize_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user statistics record
    INSERT INTO public.user_statistics (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create user settings record
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create notification preferences record
    INSERT INTO public.notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create investment preferences record
    INSERT INTO public.investment_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize settings for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_settings();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- User Statistics Policies
CREATE POLICY "Users can view own statistics" ON public.user_statistics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own statistics" ON public.user_statistics
    FOR UPDATE USING (auth.uid() = user_id);

-- User Settings Policies
CREATE POLICY "Users can view own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Notification Preferences Policies
CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Investment Preferences Policies
CREATE POLICY "Users can view own investment preferences" ON public.investment_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own investment preferences" ON public.investment_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- User Documents Policies
CREATE POLICY "Users can view own documents" ON public.user_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.user_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.user_documents
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_statistics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.investment_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_documents TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 10. VERIFICATION QUERY
-- ============================================================================
-- Run this to verify all tables were created successfully

DO $$
BEGIN
    RAISE NOTICE 'Checking created tables...';
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_statistics') THEN
        RAISE NOTICE '✅ user_statistics table exists';
    ELSE
        RAISE NOTICE '❌ user_statistics table missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        RAISE NOTICE '✅ user_settings table exists';
    ELSE
        RAISE NOTICE '❌ user_settings table missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences') THEN
        RAISE NOTICE '✅ notification_preferences table exists';
    ELSE
        RAISE NOTICE '❌ notification_preferences table missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_preferences') THEN
        RAISE NOTICE '✅ investment_preferences table exists';
    ELSE
        RAISE NOTICE '❌ investment_preferences table missing';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_documents') THEN
        RAISE NOTICE '✅ user_documents table exists';
    ELSE
        RAISE NOTICE '❌ user_documents table missing';
    END IF;
END $$;

-- ============================================================================
-- SCHEMA CREATION COMPLETE
-- ============================================================================
-- All tables, indexes, triggers, and policies have been created
-- New users will automatically get default settings initialized
-- ============================================================================

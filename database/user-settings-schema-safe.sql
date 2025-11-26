-- User Settings and Preferences Schema (Safe Version)
-- This version creates tables without triggers to avoid conflicts

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Display Settings
    theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'Africa/Harare',
    date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    number_format VARCHAR(20) DEFAULT 'en-US',
    
    -- Investment Preferences
    auto_invest_enabled BOOLEAN DEFAULT false,
    auto_invest_amount DECIMAL(15, 2),
    risk_preference VARCHAR(20) DEFAULT 'moderate' CHECK (risk_preference IN ('conservative', 'moderate', 'aggressive')),
    preferred_loan_types TEXT[] DEFAULT ARRAY['personal', 'business'],
    min_interest_rate DECIMAL(5, 2) DEFAULT 5.0,
    max_loan_term INTEGER DEFAULT 12,
    
    -- Privacy Settings
    portfolio_public BOOLEAN DEFAULT false,
    show_profile_picture BOOLEAN DEFAULT true,
    show_investment_stats BOOLEAN DEFAULT false,
    data_sharing_enabled BOOLEAN DEFAULT false,
    
    -- Notification Settings (basic)
    notifications_email BOOLEAN DEFAULT true,
    notifications_sms BOOLEAN DEFAULT false,
    notifications_push BOOLEAN DEFAULT true,
    
    -- Account Settings
    two_factor_enabled BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =====================================================
-- 2. USER NOTIFICATION PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Channel Preferences
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Notification Types
    investment_updates BOOLEAN DEFAULT true,
    loan_updates BOOLEAN DEFAULT true,
    payment_reminders BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    security_alerts BOOLEAN DEFAULT true,
    newsletter BOOLEAN DEFAULT false,
    
    -- Frequency Settings
    digest_frequency VARCHAR(20) DEFAULT 'daily' CHECK (digest_frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON user_notification_preferences(user_id);

-- =====================================================
-- 3. USER SECURITY SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Two-Factor Authentication
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_method VARCHAR(20) CHECK (two_factor_method IN ('sms', 'email', 'authenticator', NULL)),
    two_factor_secret TEXT,
    backup_codes TEXT[],
    
    -- Security Preferences
    login_alerts BOOLEAN DEFAULT true,
    session_timeout INTEGER DEFAULT 30, -- minutes
    require_password_change BOOLEAN DEFAULT false,
    password_last_changed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Device Management
    trusted_devices JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON user_security_settings(user_id);

-- =====================================================
-- 4. USER SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Session Info
    session_token TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    device_name VARCHAR(100),
    browser VARCHAR(50),
    os VARCHAR(50),
    location VARCHAR(100),
    
    -- Session Status
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(session_token)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);

-- =====================================================
-- 5. USER DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Document Info
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('national_id', 'passport', 'drivers_license', 'proof_of_residence', 'bank_statement', 'other')),
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    
    -- Verification Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    
    -- Metadata
    expiry_date DATE,
    document_number VARCHAR(100),
    
    -- Timestamps
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON user_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON user_documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON user_documents(user_id, document_type);

-- =====================================================
-- DONE - Tables created without triggers
-- =====================================================
-- Note: Triggers and RLS policies are omitted to avoid conflicts
-- You can add them later if needed

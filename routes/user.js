const express = require('express');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile data
// @access  Private
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user profile from profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }

        // Get user data from auth.users
        const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
        
        if (userError) throw userError;

        // Combine profile and user data
        const profileData = {
            id: userId,
            email: user.email,
            phone: user.phone,
            full_name: profile?.full_name || user.user_metadata?.full_name || '',
            first_name: profile?.first_name || user.user_metadata?.first_name || '',
            last_name: profile?.last_name || user.user_metadata?.last_name || '',
            profile_picture_url: profile?.profile_picture_url || user.user_metadata?.avatar_url || '',
            date_of_birth: profile?.date_of_birth || '',
            gender: profile?.gender || '',
            address: profile?.address || '',
            city: profile?.city || '',
            country: profile?.country || 'Zimbabwe',
            postal_code: profile?.postal_code || '',
            national_id: profile?.national_id || '',
            kyc_status: profile?.kyc_status || 'pending',
            account_status: profile?.account_status || 'active',
            created_at: profile?.created_at || user.created_at,
            updated_at: profile?.updated_at || user.updated_at
        };

        res.json({
            success: true,
            data: profileData
        });
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load profile data',
            error: error.message
        });
    }
});

// @route   GET /api/user/notification-settings
// @desc    Get user notification settings
// @access  Private
router.get('/notification-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get notification preferences
        let { data: preferences, error } = await supabase
            .from('user_notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default preferences if they don't exist
            const defaultPreferences = {
                user_id: userId,
                email_enabled: true,
                sms_enabled: false,
                push_enabled: true,
                in_app_enabled: true,
                investment_updates: true,
                loan_updates: true,
                payment_reminders: true,
                marketing_emails: false,
                security_alerts: true,
                newsletter: false
            };

            const { data: newPreferences, error: createError } = await supabase
                .from('user_notification_preferences')
                .insert(defaultPreferences)
                .select()
                .single();

            if (createError) throw createError;
            preferences = newPreferences;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('❌ Error loading notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load notification settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/security
// @desc    Get user security settings
// @access  Private
router.get('/security', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get security settings
        let { data: security, error } = await supabase
            .from('user_security_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default security settings
            const defaultSecurity = {
                user_id: userId,
                two_factor_enabled: false,
                two_factor_method: null,
                login_alerts: true,
                session_timeout: 30,
                password_last_changed: new Date().toISOString()
            };

            const { data: newSecurity, error: createError } = await supabase
                .from('user_security_settings')
                .insert(defaultSecurity)
                .select()
                .single();

            if (createError) throw createError;
            security = newSecurity;
        } else if (error) {
            throw error;
        }

        // Get recent login sessions
        const { data: sessions, error: sessionsError } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        res.json({
            success: true,
            data: {
                ...security,
                recent_sessions: sessions || []
            }
        });
    } catch (error) {
        console.error('❌ Error loading security settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load security settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/display-settings
// @desc    Get user display/UI settings
// @access  Private
router.get('/display-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get display settings from user_settings table
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('theme, language, currency, timezone, date_format, number_format')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default display settings
            const defaultSettings = {
                user_id: userId,
                theme: 'dark',
                language: 'en',
                currency: 'USD',
                timezone: 'Africa/Harare',
                date_format: 'DD/MM/YYYY',
                number_format: 'en-US'
            };

            const { data: newSettings, error: createError } = await supabase
                .from('user_settings')
                .insert(defaultSettings)
                .select('theme, language, currency, timezone, date_format, number_format')
                .single();

            if (createError) throw createError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: settings || {
                theme: 'dark',
                language: 'en',
                currency: 'USD',
                timezone: 'Africa/Harare',
                date_format: 'DD/MM/YYYY',
                number_format: 'en-US'
            }
        });
    } catch (error) {
        console.error('❌ Error loading display settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load display settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/investment-preferences
// @desc    Get user investment preferences
// @access  Private
router.get('/investment-preferences', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get investment preferences from user_settings
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('auto_invest_enabled, auto_invest_amount, risk_preference, preferred_loan_types, min_interest_rate, max_loan_term')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default investment preferences
            const defaultPreferences = {
                user_id: userId,
                auto_invest_enabled: false,
                auto_invest_amount: null,
                risk_preference: 'moderate',
                preferred_loan_types: ['personal', 'business'],
                min_interest_rate: 5.0,
                max_loan_term: 12
            };

            const { data: newSettings, error: createError } = await supabase
                .from('user_settings')
                .insert(defaultPreferences)
                .select('auto_invest_enabled, auto_invest_amount, risk_preference, preferred_loan_types, min_interest_rate, max_loan_term')
                .single();

            if (createError) throw createError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: settings || {
                auto_invest_enabled: false,
                auto_invest_amount: null,
                risk_preference: 'moderate',
                preferred_loan_types: ['personal', 'business'],
                min_interest_rate: 5.0,
                max_loan_term: 12
            }
        });
    } catch (error) {
        console.error('❌ Error loading investment preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load investment preferences',
            error: error.message
        });
    }
});

// @route   GET /api/user/privacy-settings
// @desc    Get user privacy settings
// @access  Private
router.get('/privacy-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get privacy settings from user_settings
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('portfolio_public, show_profile_picture, show_investment_stats, data_sharing_enabled')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default privacy settings
            const defaultPrivacy = {
                user_id: userId,
                portfolio_public: false,
                show_profile_picture: true,
                show_investment_stats: false,
                data_sharing_enabled: false
            };

            const { data: newSettings, error: createError } = await supabase
                .from('user_settings')
                .insert(defaultPrivacy)
                .select('portfolio_public, show_profile_picture, show_investment_stats, data_sharing_enabled')
                .single();

            if (createError) throw createError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: settings || {
                portfolio_public: false,
                show_profile_picture: true,
                show_investment_stats: false,
                data_sharing_enabled: false
            }
        });
    } catch (error) {
        console.error('❌ Error loading privacy settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load privacy settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/documents
// @desc    Get user uploaded documents
// @access  Private
router.get('/documents', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user documents
        const { data: documents, error } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', userId)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: documents || []
        });
    } catch (error) {
        console.error('❌ Error loading documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load documents',
            error: error.message
        });
    }
});

// @route   GET /api/user/notifications/recent
// @desc    Get recent notifications for header dropdown
// @access  Private
router.get('/notifications/recent', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;
        
        // Get recent notifications
        const { data: notifications, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Count unread notifications
        const { count: unreadCount, error: countError } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (countError) throw countError;

        res.json({
            success: true,
            data: {
                notifications: notifications || [],
                unread_count: unreadCount || 0
            }
        });
    } catch (error) {
        console.error('❌ Error loading recent notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load recent notifications',
            error: error.message
        });
    }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Update profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: profile
        });
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// @route   PUT /api/user/notification-settings
// @desc    Update notification settings
// @access  Private
router.put('/notification-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Update or insert notification preferences
        const { data, error } = await supabase
            .from('user_notification_preferences')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            data
        });
    } catch (error) {
        console.error('❌ Error updating notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification settings',
            error: error.message
        });
    }
});

module.exports = router;

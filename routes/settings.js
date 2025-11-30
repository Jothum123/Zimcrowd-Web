/**
 * Settings Routes - Production Ready
 * Handles all user settings: Profile, Security, Notifications, Display, Investment, Privacy, Documents
 */

const express = require('express');
const { supabase } = require('../utils/supabase-auth');
const router = express.Router();

// Middleware to verify JWT token
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// ============================================
// GET ALL SETTINGS
// ============================================

// @route   GET /api/settings
// @desc    Get all user settings
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get or create user settings
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Settings don't exist, create default settings
            const defaultSettings = {
                user_id: userId,
                // Notifications
                notifications_email: true,
                notifications_sms: false,
                notifications_push: true,
                loan_updates: true,
                investment_updates: true,
                payment_alerts: true,
                security_alerts: true,
                marketing_emails: false,
                weekly_reports: true,
                monthly_statements: true,
                // Display
                language: 'en',
                currency: 'USD',
                theme: 'dark',
                date_format: 'DD/MM/YYYY',
                time_format: '24h',
                compact_mode: false,
                show_animations: true,
                // Investment
                auto_invest_enabled: false,
                auto_invest_amount: null,
                risk_preference: 'moderate',
                min_return_rate: 8.0,
                max_loan_amount: 1000,
                diversification_level: 'balanced',
                investment_goals: [],
                preferred_sectors: [],
                // Privacy
                portfolio_public: false,
                show_investments: false,
                show_loans: false,
                allow_messages: true,
                data_sharing: false,
                analytics_tracking: true,
                third_party_sharing: false,
                // Security
                two_factor_enabled: false,
                login_notifications: true,
                session_timeout: 30
            };
            
            const { data: newSettings, error: createError } = await supabase
                .from('user_settings')
                .insert(defaultSettings)
                .select()
                .single();
            
            if (createError) throw createError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings',
            error: error.message
        });
    }
});

// ============================================
// PROFILE SETTINGS
// ============================================

// @route   GET /api/settings/profile
// @desc    Get user profile data
// @access  Private
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get profile from profiles table
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        // Calculate completion percentage
        const completionPercentage = calculateProfileCompletion(profile || {});
        
        res.json({
            success: true,
            data: {
                firstName: profile?.first_name || '',
                lastName: profile?.last_name || '',
                email: req.user.email || profile?.email || '',
                phone: profile?.phone || '',
                dateOfBirth: profile?.date_of_birth || '',
                gender: profile?.gender || '',
                country: profile?.country || 'Zimbabwe',
                streetAddress: profile?.street_address || '',
                city: profile?.city || '',
                suburb: profile?.suburb || '',
                postalCode: profile?.postal_code || '',
                bio: profile?.bio || '',
                profilePicture: profile?.avatar_url || null,
                completionPercentage,
                kycStatus: profile?.kyc_status || 'pending',
                zimScore: profile?.zim_score || null
            }
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: error.message
        });
    }
});

// @route   PUT /api/settings/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            first_name, last_name, phone, date_of_birth, gender,
            country, street_address, city, suburb, postal_code, bio
        } = req.body;
        
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                first_name,
                last_name,
                phone,
                date_of_birth,
                gender,
                country,
                street_address,
                city,
                suburb,
                postal_code,
                bio,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// Helper function to calculate profile completion
function calculateProfileCompletion(profile) {
    const fields = [
        'first_name', 'last_name', 'phone', 'date_of_birth', 'gender',
        'country', 'street_address', 'city', 'avatar_url'
    ];
    const completed = fields.filter(f => profile[f] && profile[f].toString().trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
}

// @route   PUT /api/settings
// @desc    Update user settings
// @access  Private
router.put('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;
        
        // Remove user_id from updates if present
        delete updates.user_id;
        
        // Add updated_at timestamp
        updates.updated_at = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('user_settings')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update settings',
            error: error.message
        });
    }
});

// ============================================
// NOTIFICATION SETTINGS
// ============================================

// @route   GET /api/settings/notifications
// @desc    Get notification preferences
// @access  Private
router.get('/notifications', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('user_settings')
            .select(`
                notifications_email, notifications_sms, notifications_push,
                loan_updates, investment_updates, payment_alerts,
                security_alerts, marketing_emails, weekly_reports, monthly_statements
            `)
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        res.json({
            success: true,
            data: {
                emailNotifications: data?.notifications_email ?? true,
                pushNotifications: data?.notifications_push ?? true,
                smsNotifications: data?.notifications_sms ?? false,
                loanUpdates: data?.loan_updates ?? true,
                investmentUpdates: data?.investment_updates ?? true,
                paymentAlerts: data?.payment_alerts ?? true,
                securityAlerts: data?.security_alerts ?? true,
                marketingEmails: data?.marketing_emails ?? false,
                weeklyReports: data?.weekly_reports ?? true,
                monthlyStatements: data?.monthly_statements ?? true
            }
        });
    } catch (error) {
        console.error('Error fetching notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification settings',
            error: error.message
        });
    }
});

// @route   PUT /api/settings/notifications
// @desc    Update notification preferences
// @access  Private
router.put('/notifications', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { notifications_email, notifications_sms, notifications_push } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                notifications_email,
                notifications_sms,
                notifications_push,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Notification preferences updated'
        });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification settings',
            error: error.message
        });
    }
});

// ============================================
// DISPLAY SETTINGS
// ============================================

// @route   GET /api/settings/display
// @desc    Get display preferences
// @access  Private
router.get('/display', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('user_settings')
            .select('language, currency, theme, date_format, time_format, compact_mode, show_animations')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        res.json({
            success: true,
            data: {
                theme: data?.theme || 'dark',
                language: data?.language || 'en',
                currency: data?.currency || 'USD',
                dateFormat: data?.date_format || 'DD/MM/YYYY',
                timeFormat: data?.time_format || '24h',
                compactMode: data?.compact_mode ?? false,
                showAnimations: data?.show_animations ?? true
            }
        });
    } catch (error) {
        console.error('Error fetching display settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch display settings',
            error: error.message
        });
    }
});

// @route   PUT /api/settings/display
// @desc    Update display preferences
// @access  Private
router.put('/display', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { language, currency, theme, date_format, time_format, compact_mode, show_animations } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                language,
                currency,
                theme,
                date_format,
                time_format,
                compact_mode,
                show_animations,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Display preferences updated'
        });
    } catch (error) {
        console.error('Error updating display settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update display settings',
            error: error.message
        });
    }
});

// ============================================
// INVESTMENT PREFERENCES
// ============================================

// @route   GET /api/settings/investment-preferences
// @desc    Get investment preferences
// @access  Private
router.get('/investment-preferences', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('user_settings')
            .select(`
                auto_invest_enabled, auto_invest_amount, risk_preference,
                min_return_rate, max_loan_amount, diversification_level,
                investment_goals, preferred_sectors
            `)
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        res.json({
            success: true,
            data: {
                riskTolerance: data?.risk_preference || 'moderate',
                autoInvest: data?.auto_invest_enabled ?? false,
                autoInvestAmount: data?.auto_invest_amount || 0,
                minReturnRate: data?.min_return_rate || 8.0,
                maxLoanAmount: data?.max_loan_amount || 1000,
                diversificationLevel: data?.diversification_level || 'balanced',
                investmentGoals: data?.investment_goals || [],
                preferredSectors: data?.preferred_sectors || []
            }
        });
    } catch (error) {
        console.error('Error fetching investment preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch investment preferences',
            error: error.message
        });
    }
});

// @route   PUT /api/settings/investment-preferences
// @desc    Update investment preferences
// @access  Private
router.put('/investment-preferences', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            risk_tolerance, auto_invest, auto_invest_amount, 
            min_return_rate, max_loan_amount, diversification_level,
            investment_goals, preferred_sectors
        } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                risk_preference: risk_tolerance,
                auto_invest_enabled: auto_invest,
                auto_invest_amount,
                min_return_rate,
                max_loan_amount,
                diversification_level,
                investment_goals,
                preferred_sectors,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Investment preferences updated'
        });
    } catch (error) {
        console.error('Error updating investment preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update investment preferences',
            error: error.message
        });
    }
});

// Legacy route for backward compatibility
router.put('/investment', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { auto_invest_enabled, auto_invest_amount, risk_preference } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                auto_invest_enabled,
                auto_invest_amount,
                risk_preference,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Investment preferences updated'
        });
    } catch (error) {
        console.error('Error updating investment settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update investment settings',
            error: error.message
        });
    }
});

// ============================================
// PRIVACY SETTINGS
// ============================================

// @route   GET /api/settings/privacy
// @desc    Get privacy preferences
// @access  Private
router.get('/privacy', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('user_settings')
            .select(`
                portfolio_public, show_investments, show_loans,
                allow_messages, data_sharing, analytics_tracking, third_party_sharing
            `)
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        res.json({
            success: true,
            data: {
                profileVisibility: data?.portfolio_public ? 'public' : 'private',
                showInvestments: data?.show_investments ?? false,
                showLoans: data?.show_loans ?? false,
                allowMessages: data?.allow_messages ?? true,
                dataSharing: data?.data_sharing ?? false,
                analyticsTracking: data?.analytics_tracking ?? true,
                thirdPartySharing: data?.third_party_sharing ?? false
            }
        });
    } catch (error) {
        console.error('Error fetching privacy settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch privacy settings',
            error: error.message
        });
    }
});

// @route   PUT /api/settings/privacy
// @desc    Update privacy preferences
// @access  Private
router.put('/privacy', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            profile_visibility, show_investments, show_loans,
            allow_messages, data_sharing, analytics_tracking, third_party_sharing
        } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                portfolio_public: profile_visibility === 'public',
                show_investments,
                show_loans,
                allow_messages,
                data_sharing,
                analytics_tracking,
                third_party_sharing,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Privacy preferences updated'
        });
    } catch (error) {
        console.error('Error updating privacy settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update privacy settings',
            error: error.message
        });
    }
});

// ============================================
// SECURITY SETTINGS
// ============================================

// @route   GET /api/settings/security
// @desc    Get security settings
// @access  Private
router.get('/security', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('user_settings')
            .select('two_factor_enabled, login_notifications, session_timeout')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        // Get login history
        const { data: loginHistory } = await supabase
            .from('login_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        // Get active sessions
        const { data: sessions } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);
        
        res.json({
            success: true,
            data: {
                twoFactorEnabled: data?.two_factor_enabled ?? false,
                loginNotifications: data?.login_notifications ?? true,
                sessionTimeout: data?.session_timeout || 30,
                loginHistory: loginHistory || [],
                activeSessions: sessions || [],
                lastPasswordChange: null // Would come from auth provider
            }
        });
    } catch (error) {
        console.error('Error fetching security settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch security settings',
            error: error.message
        });
    }
});

// @route   PUT /api/settings/security
// @desc    Update security settings
// @access  Private
router.put('/security', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { two_factor_enabled, login_notifications, session_timeout } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                two_factor_enabled,
                login_notifications,
                session_timeout,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data,
            message: 'Security settings updated'
        });
    } catch (error) {
        console.error('Error updating security settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update security settings',
            error: error.message
        });
    }
});

// @route   POST /api/settings/security/change-password
// @desc    Change user password
// @access  Private
router.post('/security/change-password', authenticateUser, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters'
            });
        }
        
        // Update password via Supabase Auth
        const { error } = await supabase.auth.updateUser({
            password: new_password
        });
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
});

// @route   POST /api/settings/security/revoke-session
// @desc    Revoke a specific session
// @access  Private
router.post('/security/revoke-session', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id } = req.body;
        
        const { error } = await supabase
            .from('user_sessions')
            .update({ is_active: false, revoked_at: new Date().toISOString() })
            .eq('id', session_id)
            .eq('user_id', userId);
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Session revoked successfully'
        });
    } catch (error) {
        console.error('Error revoking session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke session',
            error: error.message
        });
    }
});

// @route   POST /api/settings/security/revoke-all-sessions
// @desc    Revoke all sessions except current
// @access  Private
router.post('/security/revoke-all-sessions', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_session_id } = req.body;
        
        let query = supabase
            .from('user_sessions')
            .update({ is_active: false, revoked_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('is_active', true);
        
        // Exclude current session if provided
        if (current_session_id) {
            query = query.neq('id', current_session_id);
        }
        
        const { error } = await query;
        
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'All other sessions revoked successfully'
        });
    } catch (error) {
        console.error('Error revoking sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to revoke sessions',
            error: error.message
        });
    }
});

// ============================================
// TWO-FACTOR AUTHENTICATION (2FA)
// ============================================

// Generate TOTP secret for 2FA
function generateTOTPSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
}

// Generate TOTP code from secret
function generateTOTP(secret, timeStep = 30) {
    const crypto = require('crypto');
    const time = Math.floor(Date.now() / 1000 / timeStep);
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));
    
    // Decode base32 secret
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const char of secret.toUpperCase()) {
        const val = base32Chars.indexOf(char);
        if (val === -1) continue;
        bits += val.toString(2).padStart(5, '0');
    }
    const keyBuffer = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
    
    const hmac = crypto.createHmac('sha1', keyBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24 |
                  (hash[offset + 1] & 0xff) << 16 |
                  (hash[offset + 2] & 0xff) << 8 |
                  (hash[offset + 3] & 0xff)) % 1000000;
    
    return code.toString().padStart(6, '0');
}

// Verify TOTP code
function verifyTOTP(secret, code, window = 1) {
    for (let i = -window; i <= window; i++) {
        const timeStep = 30;
        const time = Math.floor(Date.now() / 1000 / timeStep) + i;
        
        const crypto = require('crypto');
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(time));
        
        const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        for (const char of secret.toUpperCase()) {
            const val = base32Chars.indexOf(char);
            if (val === -1) continue;
            bits += val.toString(2).padStart(5, '0');
        }
        const keyBuffer = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
        
        const hmac = crypto.createHmac('sha1', keyBuffer);
        hmac.update(timeBuffer);
        const hash = hmac.digest();
        
        const offset = hash[hash.length - 1] & 0xf;
        const generatedCode = ((hash[offset] & 0x7f) << 24 |
                      (hash[offset + 1] & 0xff) << 16 |
                      (hash[offset + 2] & 0xff) << 8 |
                      (hash[offset + 3] & 0xff)) % 1000000;
        
        if (generatedCode.toString().padStart(6, '0') === code) {
            return true;
        }
    }
    return false;
}

// @route   POST /api/settings/security/2fa/setup
// @desc    Generate 2FA secret and QR code URL
// @access  Private
router.post('/security/2fa/setup', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const userEmail = req.user.email;
        
        // Generate new secret
        const secret = generateTOTPSecret();
        
        // Store secret temporarily (not enabled yet)
        const { error } = await supabase
            .from('user_settings')
            .update({
                totp_secret_temp: secret,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (error) throw error;
        
        // Generate otpauth URL for QR code
        const issuer = 'ZimCrowd';
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
        
        // Generate QR code as data URL using a simple SVG-based approach
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
        
        res.json({
            success: true,
            data: {
                secret,
                otpauthUrl,
                qrCodeUrl,
                manualEntryKey: secret.match(/.{1,4}/g).join(' ')
            }
        });
    } catch (error) {
        console.error('Error setting up 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to setup 2FA',
            error: error.message
        });
    }
});

// @route   POST /api/settings/security/2fa/verify
// @desc    Verify 2FA code and enable 2FA
// @access  Private
router.post('/security/2fa/verify', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.body;
        
        if (!code || code.length !== 6) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 6-digit code'
            });
        }
        
        // Get temporary secret
        const { data: settings, error: fetchError } = await supabase
            .from('user_settings')
            .select('totp_secret_temp')
            .eq('user_id', userId)
            .single();
        
        if (fetchError || !settings?.totp_secret_temp) {
            return res.status(400).json({
                success: false,
                message: 'Please setup 2FA first'
            });
        }
        
        // Verify the code
        const isValid = verifyTOTP(settings.totp_secret_temp, code);
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code. Please try again.'
            });
        }
        
        // Enable 2FA and move secret to permanent storage
        const { error: updateError } = await supabase
            .from('user_settings')
            .update({
                two_factor_enabled: true,
                totp_secret: settings.totp_secret_temp,
                totp_secret_temp: null,
                two_factor_enabled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
        res.json({
            success: true,
            message: '2FA enabled successfully! Your account is now more secure.'
        });
    } catch (error) {
        console.error('Error verifying 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify 2FA code',
            error: error.message
        });
    }
});

// @route   POST /api/settings/security/2fa/disable
// @desc    Disable 2FA
// @access  Private
router.post('/security/2fa/disable', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { code } = req.body;
        
        // Get current secret
        const { data: settings, error: fetchError } = await supabase
            .from('user_settings')
            .select('totp_secret')
            .eq('user_id', userId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Verify the code before disabling
        if (settings?.totp_secret && code) {
            const isValid = verifyTOTP(settings.totp_secret, code);
            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification code'
                });
            }
        }
        
        // Disable 2FA
        const { error: updateError } = await supabase
            .from('user_settings')
            .update({
                two_factor_enabled: false,
                totp_secret: null,
                totp_secret_temp: null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
        res.json({
            success: true,
            message: '2FA disabled successfully'
        });
    } catch (error) {
        console.error('Error disabling 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to disable 2FA',
            error: error.message
        });
    }
});

// @route   GET /api/settings/security/auth-provider
// @desc    Check if user signed up with password or OAuth
// @access  Private
router.get('/security/auth-provider', authenticateUser, async (req, res) => {
    try {
        const user = req.user;
        
        // Check auth provider from user metadata
        const provider = user.app_metadata?.provider || 'email';
        const hasPassword = provider === 'email';
        
        res.json({
            success: true,
            data: {
                provider,
                hasPassword,
                canChangePassword: hasPassword,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Error checking auth provider:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check auth provider',
            error: error.message
        });
    }
});

module.exports = router;

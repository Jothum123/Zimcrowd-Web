const express = require('express');
const { supabase } = require('../utils/supabase-auth');
const bcrypt = require('bcryptjs');
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

// @route   POST /api/security/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateUser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Update password using Supabase Auth
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        // Log the password change
        await supabase
            .from('login_activity')
            .insert({
                user_id: req.user.id,
                activity_type: 'password_change',
                ip_address: req.ip,
                device: req.headers['user-agent'],
                location: 'Unknown' // You can integrate IP geolocation service
            });
        
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

// @route   POST /api/security/enable-2fa
// @desc    Enable two-factor authentication
// @access  Private
router.post('/enable-2fa', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Update user settings to enable 2FA
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                two_factor_enabled: true,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        // Log the 2FA enablement
        await supabase
            .from('login_activity')
            .insert({
                user_id: userId,
                activity_type: '2fa_enabled',
                ip_address: req.ip,
                device: req.headers['user-agent']
            });
        
        res.json({
            success: true,
            message: 'Two-factor authentication enabled',
            data
        });
    } catch (error) {
        console.error('Error enabling 2FA:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enable 2FA',
            error: error.message
        });
    }
});

// @route   POST /api/security/disable-2fa
// @desc    Disable two-factor authentication
// @access  Private
router.post('/disable-2fa', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Update user settings to disable 2FA
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                two_factor_enabled: false,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        // Log the 2FA disablement
        await supabase
            .from('login_activity')
            .insert({
                user_id: userId,
                activity_type: '2fa_disabled',
                ip_address: req.ip,
                device: req.headers['user-agent']
            });
        
        res.json({
            success: true,
            message: 'Two-factor authentication disabled',
            data
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

// @route   GET /api/security/login-activity
// @desc    Get user's login activity history
// @access  Private
router.get('/login-activity', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        
        const { data, error } = await supabase
            .from('login_activity')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: data || []
        });
    } catch (error) {
        console.error('Error fetching login activity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch login activity',
            error: error.message
        });
    }
});

// @route   POST /api/security/log-login
// @desc    Log a login attempt
// @access  Private
router.post('/log-login', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { device, location } = req.body;
        
        const { data, error} = await supabase
            .from('login_activity')
            .insert({
                user_id: userId,
                activity_type: 'login',
                ip_address: req.ip,
                device: device || req.headers['user-agent'],
                location: location || 'Unknown'
            })
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error logging login:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log login',
            error: error.message
        });
    }
});

module.exports = router;

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

// @route   GET /api/settings
// @desc    Get user settings
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
                notifications_email: true,
                notifications_sms: false,
                notifications_push: true,
                language: 'en',
                currency: 'USD',
                theme: 'dark',
                auto_invest_enabled: false,
                auto_invest_amount: null,
                risk_preference: 'moderate',
                portfolio_public: false,
                two_factor_enabled: false
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

// @route   GET /api/settings/notifications
// @desc    Get notification preferences
// @access  Private
router.get('/notifications', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const { data, error } = await supabase
            .from('user_settings')
            .select('notifications_email, notifications_sms, notifications_push')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        
        res.json({
            success: true,
            data
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

// @route   PUT /api/settings/display
// @desc    Update display preferences
// @access  Private
router.put('/display', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { language, currency, theme } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                language,
                currency,
                theme,
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

// @route   PUT /api/settings/investment
// @desc    Update investment preferences
// @access  Private
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

// @route   PUT /api/settings/privacy
// @desc    Update privacy preferences
// @access  Private
router.put('/privacy', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { portfolio_public } = req.body;
        
        const { data, error } = await supabase
            .from('user_settings')
            .update({
                portfolio_public,
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

module.exports = router;

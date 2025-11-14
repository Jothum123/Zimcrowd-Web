const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');
const NotificationService = require('../services/notification.service');

const router = express.Router();
const notificationService = new NotificationService();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// @route   GET /api/notifications
// @desc    Get user's notifications
// @access  Private
router.get('/', authenticateUser, async (req, res) => {
    try {
        const { page = 1, limit = 20, unread_only = false } = req.query;
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
            
        if (unread_only === 'true') {
            query = query.eq('is_read', false);
        }
        
        const { data: notifications, error } = await query;
        
        if (error) throw error;
        
        // Get unread count
        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', req.user.id)
            .eq('is_read', false);
        
        res.json({
            success: true,
            data: notifications || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: notifications?.length || 0
            },
            unreadCount: unreadCount || 0
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: notification, error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();
            
        if (error || !notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Notification marked as read',
            data: notification
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', req.user.id)
            .eq('is_read', false);
            
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('user_id', req.user.id);
            
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification'
        });
    }
});

// @route   GET /api/notifications/preferences
// @desc    Get user's notification preferences
// @access  Private
router.get('/preferences', authenticateUser, async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('notification_preferences')
            .eq('id', req.user.id)
            .single();
            
        if (error) throw error;
        
        const defaultPreferences = {
            email: true,
            sms: true,
            push: true,
            loan_updates: true,
            investment_updates: true,
            payment_reminders: true,
            marketing: false
        };
        
        const preferences = profile?.notification_preferences || defaultPreferences;
        
        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Get notification preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification preferences'
        });
    }
});

// @route   PUT /api/notifications/preferences
// @desc    Update user's notification preferences
// @access  Private
router.put('/preferences', authenticateUser, [
    body('email').optional().isBoolean().withMessage('Email preference must be boolean'),
    body('sms').optional().isBoolean().withMessage('SMS preference must be boolean'),
    body('push').optional().isBoolean().withMessage('Push preference must be boolean'),
    body('loan_updates').optional().isBoolean().withMessage('Loan updates preference must be boolean'),
    body('investment_updates').optional().isBoolean().withMessage('Investment updates preference must be boolean'),
    body('payment_reminders').optional().isBoolean().withMessage('Payment reminders preference must be boolean'),
    body('marketing').optional().isBoolean().withMessage('Marketing preference must be boolean'),
    handleValidationErrors
], async (req, res) => {
    try {
        const preferences = req.body;
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                notification_preferences: preferences,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select('notification_preferences')
            .single();
            
        if (error) throw error;
        
        res.json({
            success: true,
            message: 'Notification preferences updated successfully',
            data: profile.notification_preferences
        });
    } catch (error) {
        console.error('Update notification preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification preferences'
        });
    }
});

// @route   POST /api/notifications/send
// @desc    Send notification (admin only)
// @access  Admin
router.post('/send', authenticateUser, [
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('type').notEmpty().withMessage('Notification type is required'),
    body('data').isObject().withMessage('Notification data must be an object'),
    body('channels').isArray().withMessage('Channels must be an array'),
    handleValidationErrors
], async (req, res) => {
    try {
        // Check if user is admin (you can implement this check)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();
            
        if (profile?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const { userId, type, data, channels } = req.body;
        
        const result = await notificationService.sendNotification(userId, type, data, channels);
        
        res.json({
            success: result.success,
            message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
            data: result.results
        });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notification'
        });
    }
});

// @route   POST /api/notifications/schedule
// @desc    Schedule notification for future delivery
// @access  Private
router.post('/schedule', authenticateUser, [
    body('type').notEmpty().withMessage('Notification type is required'),
    body('data').isObject().withMessage('Notification data must be an object'),
    body('channels').isArray().withMessage('Channels must be an array'),
    body('scheduledFor').isISO8601().withMessage('Valid scheduled date required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { type, data, channels, scheduledFor } = req.body;
        
        const result = await notificationService.scheduleNotification(
            req.user.id,
            type,
            data,
            channels,
            scheduledFor
        );
        
        res.json({
            success: result.success,
            message: result.success ? 'Notification scheduled successfully' : 'Failed to schedule notification',
            data: { scheduledId: result.scheduledId }
        });
    } catch (error) {
        console.error('Schedule notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to schedule notification'
        });
    }
});

// @route   GET /api/notifications/templates
// @desc    Get available notification templates
// @access  Admin
router.get('/templates', authenticateUser, async (req, res) => {
    try {
        // Check admin access
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();
            
        if (profile?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const templates = {
            email: Object.keys(notificationService.emailTemplates),
            sms: Object.keys(notificationService.smsTemplates)
        };
        
        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch templates'
        });
    }
});

module.exports = router;

// Activity Tracking API Routes - Connects User Dashboard to Admin Dashboard
const express = require('express');
const { supabase } = require('../utils/supabase-auth');

const router = express.Router();

// Middleware to verify JWT token and get user
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Middleware to verify admin user
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Admin token required'
            });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin token'
            });
        }

        // Check if user is admin
        const { data: adminCheck, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (adminError || !adminCheck) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        req.admin = adminCheck;
        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Admin authentication failed'
        });
    }
};

// @route   POST /api/activity/log
// @desc    Log user activity from user dashboard
// @access  Private (User)
const logUserActivity = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            activity_type,
            activity_data = {},
            ip_address,
            user_agent,
            session_id,
            status = 'active',
            metadata = {}
        } = req.body;

        if (!activity_type) {
            return res.status(400).json({
                success: false,
                message: 'Activity type is required'
            });
        }

        // Get client IP if not provided
        const clientIP = ip_address || req.ip || req.connection.remoteAddress;

        // Log activity using database function
        const { data: activityId, error: logError } = await supabase
            .rpc('log_user_activity', {
                p_user_id: userId,
                p_activity_type: activity_type,
                p_activity_data: activity_data,
                p_ip_address: clientIP,
                p_user_agent: user_agent || req.get('User-Agent'),
                p_session_id: session_id,
                p_status: status,
                p_metadata: metadata
            });

        if (logError) {
            console.error('Activity logging error:', logError);
            return res.status(500).json({
                success: false,
                message: 'Failed to log activity',
                error: logError.message
            });
        }

        // Create admin notification for important activities
        if (['loan_application', 'large_investment', 'suspicious_activity', 'account_change'].includes(activity_type)) {
            await createActivityNotification(activity_type, userId, activity_data);
        }

        console.log(`✅ Activity logged: ${activity_type} by user ${userId}`);

        res.json({
            success: true,
            data: {
                activity_id: activityId,
                message: 'Activity logged successfully'
            }
        });

    } catch (error) {
        console.error('Log activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to log activity',
            error: error.message
        });
    }
};

// @route   GET /api/activity/recent
// @desc    Get recent user activities for admin dashboard
// @access  Private (Admin)
const getRecentActivities = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            activity_type,
            user_id,
            date_from,
            date_to
        } = req.query;

        let query = supabase
            .from('user_activity_logs')
            .select(`
                *,
                profiles: user_id (
                    full_name,
                    email,
                    phone_number
                )
            `, { count: 'exact' });

        // Apply filters
        if (activity_type) {
            query = query.eq('activity_type', activity_type);
        }
        if (user_id) {
            query = query.eq('user_id', user_id);
        }
        if (date_from) {
            query = query.gte('created_at', date_from);
        }
        if (date_to) {
            query = query.lte('created_at', date_to);
        }

        // Apply pagination and ordering
        const offset = (page - 1) * limit;
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: activities, error, count } = await query;

        if (error) {
            console.error('Get activities error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch activities',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: {
                activities: activities || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get recent activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities',
            error: error.message
        });
    }
};

// @route   GET /api/activity/dashboard-events
// @desc    Get real-time dashboard events for admin monitoring
// @access  Private (Admin)
const getDashboardEvents = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 100,
            event_type,
            category,
            since
        } = req.query;

        let query = supabase
            .from('dashboard_events')
            .select(`
                *,
                profiles: user_id (
                    full_name,
                    email
                )
            `, { count: 'exact' });

        // Apply filters
        if (event_type) {
            query = query.eq('event_type', event_type);
        }
        if (category) {
            query = query.eq('event_category', category);
        }
        if (since) {
            query = query.gte('created_at', since);
        }

        // Only get admin-relevant events
        query = query.eq('admin_relevant', true);

        // Apply pagination and ordering
        const offset = (page - 1) * limit;
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: events, error, count } = await query;

        if (error) {
            console.error('Get dashboard events error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard events',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: {
                events: events || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get dashboard events error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard events',
            error: error.message
        });
    }
};

// @route   GET /api/activity/notifications
// @desc    Get admin notifications
// @access  Private (Admin)
const getAdminNotifications = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            is_read,
            priority,
            notification_type
        } = req.query;

        let query = supabase
            .from('admin_notifications')
            .select(`
                *,
                profiles: related_user_id (
                    full_name,
                    email
                )
            `, { count: 'exact' });

        // Apply filters
        if (is_read !== undefined) {
            query = query.eq('is_read', is_read === 'true');
        }
        if (priority) {
            query = query.eq('priority', priority);
        }
        if (notification_type) {
            query = query.eq('notification_type', notification_type);
        }

        // Apply pagination and ordering
        const offset = (page - 1) * limit;
        query = query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: notifications, error, count } = await query;

        if (error) {
            console.error('Get notifications error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch notifications',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: {
                notifications: notifications || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get admin notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// @route   PUT /api/activity/notifications/:id/read
// @desc    Mark notification as read
// @access  Private (Admin)
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('admin_notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', id)
            .single();

        if (error) {
            console.error('Mark notification read error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark notification as read',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: {
                notification: data,
                message: 'Notification marked as read'
            }
        });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

// @route   GET /api/activity/stats
// @desc    Get activity statistics for admin dashboard
// @access  Private (Admin)
const getActivityStats = async (req, res) => {
    try {
        const {
            period = '24h' // '1h', '24h', '7d', '30d'
        } = req.query;

        // Calculate date range
        const now = new Date();
        let fromDate = new Date();

        switch (period) {
            case '1h':
                fromDate.setHours(now.getHours() - 1);
                break;
            case '24h':
                fromDate.setDate(now.getDate() - 1);
                break;
            case '7d':
                fromDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                fromDate.setDate(now.getDate() - 30);
                break;
        }

        // Get activity stats
        const [
            { data: totalActivities, error: activitiesError },
            { data: uniqueUsers, error: usersError },
            { data: unreadNotifications, error: notificationsError },
            { data: activityByType, error: typeError }
        ] = await Promise.all([
            // Total activities in period
            supabase
                .from('user_activity_logs')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', fromDate.toISOString()),

            // Unique active users
            supabase
                .from('user_activity_logs')
                .select('user_id', { count: 'exact', head: true })
                .gte('created_at', fromDate.toISOString()),

            // Unread notifications
            supabase
                .from('admin_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false),

            // Activities by type
            supabase
                .from('user_activity_logs')
                .select('activity_type')
                .gte('created_at', fromDate.toISOString())
        ]);

        if (activitiesError || usersError || notificationsError || typeError) {
            console.error('Get activity stats error:', { activitiesError, usersError, notificationsError, typeError });
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch activity statistics'
            });
        }

        // Count activities by type
        const activityCounts = {};
        if (activityByType) {
            activityByType.forEach(activity => {
                activityCounts[activity.activity_type] = (activityCounts[activity.activity_type] || 0) + 1;
            });
        }

        res.json({
            success: true,
            data: {
                total_activities: totalActivities || 0,
                unique_active_users: uniqueUsers || 0,
                unread_notifications: unreadNotifications || 0,
                activity_by_type: activityCounts,
                period: period,
                from_date: fromDate.toISOString(),
                to_date: now.toISOString()
            }
        });

    } catch (error) {
        console.error('Get activity stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity statistics',
            error: error.message
        });
    }
};

// @route   POST /api/activity/session
// @desc    Update or create user session
// @access  Private (User)
const updateSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            session_id,
            ip_address,
            user_agent
        } = req.body;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        const clientIP = ip_address || req.ip || req.connection.remoteAddress;

        const { error } = await supabase
            .rpc('update_session_activity', {
                p_session_id: session_id,
                p_user_id: userId,
                p_ip_address: clientIP,
                p_user_agent: user_agent || req.get('User-Agent')
            });

        if (error) {
            console.error('Update session error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update session',
                error: error.message
            });
        }

        res.json({
            success: true,
            data: {
                message: 'Session updated successfully'
            }
        });

    } catch (error) {
        console.error('Update session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update session',
            error: error.message
        });
    }
};

// Helper function to create activity notifications
async function createActivityNotification(activityType, userId, activityData) {
    try {
        let notificationType, title, message, priority = 'medium';

        switch (activityType) {
            case 'loan_application':
                notificationType = 'new_loan_application';
                title = 'New Loan Application';
                message = `A user has submitted a new loan application`;
                priority = 'high';
                break;
            case 'large_investment':
                notificationType = 'large_investment';
                title = 'Large Investment Made';
                message = `A significant investment has been made by a user`;
                priority = 'high';
                break;
            case 'suspicious_activity':
                notificationType = 'suspicious_activity';
                title = 'Suspicious Activity Detected';
                message = `Suspicious activity has been detected on a user account`;
                priority = 'critical';
                break;
            case 'account_change':
                notificationType = 'account_change';
                title = 'Account Change Detected';
                message = `Important changes have been made to a user account`;
                priority = 'medium';
                break;
            default:
                return; // Don't create notification for other activities
        }

        await supabase.rpc('create_admin_notification', {
            p_notification_type: notificationType,
            p_title: title,
            p_message: message,
            p_related_user_id: userId,
            p_related_entity_type: 'user_activity',
            p_priority: priority,
            p_metadata: activityData
        });

    } catch (error) {
        console.error('Create activity notification error:', error);
    }
}

// Register routes
router.post('/log', authenticateUser, logUserActivity);
router.get('/recent', authenticateAdmin, getRecentActivities);
router.get('/dashboard-events', authenticateAdmin, getDashboardEvents);
router.get('/notifications', authenticateAdmin, getAdminNotifications);
router.put('/notifications/:id/read', authenticateAdmin, markNotificationRead);
router.get('/stats', authenticateAdmin, getActivityStats);
router.post('/session', authenticateUser, updateSession);

module.exports = router;

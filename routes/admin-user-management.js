/**
 * Admin User Management Routes
 * Handles user suspension, banning, unflagging, AML management, and activity logging
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');

// Middleware to verify admin access
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }

        // Check if user is admin
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id, role, permissions')
            .eq('user_id', user.id)
            .single();

        if (!adminUser) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        req.user = user;
        req.admin = adminUser;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
};

// Log admin action
const logAdminAction = async (adminId, adminName, action, targetUserId, details, req) => {
    try {
        await supabase.from('admin_actions').insert({
            admin_id: adminId,
            admin_name: adminName,
            action: action,
            target_user_id: targetUserId,
            details: details,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
};

// ============================================
// USER SUSPENSION & BANNING ENDPOINTS
// ============================================

/**
 * @route   POST /api/admin/users/:userId/suspend
 * @desc    Suspend a user account
 * @access  Admin
 */
router.post('/users/:userId/suspend',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('reason').trim().notEmpty().withMessage('Suspension reason required'),
    body('duration_days').optional().isInt({ min: 1, max: 365 }).withMessage('Duration must be 1-365 days'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { userId } = req.params;
            const { reason, duration_days, notes } = req.body;

            // Calculate suspension end date if duration provided
            let suspensionEndDate = null;
            if (duration_days) {
                suspensionEndDate = new Date();
                suspensionEndDate.setDate(suspensionEndDate.getDate() + duration_days);
            }

            // Update user profile status
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'suspended',
                    suspension_reason: reason,
                    suspension_date: new Date().toISOString(),
                    suspension_end_date: suspensionEndDate?.toISOString() || null,
                    suspended_by: req.admin.id,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Log admin action
            await logAdminAction(req.admin.id, req.user.email, 'account_suspension', userId, {
                reason,
                duration_days,
                suspension_end_date: suspensionEndDate,
                notes
            }, req);

            // Log user activity
            await supabase.from('user_activities').insert({
                user_id: userId,
                activity_type: 'account_suspended',
                metadata: { reason, suspended_by: req.admin.id, duration_days }
            });

            console.log(`🚫 User ${userId} suspended by admin ${req.user.email}`);

            res.json({
                success: true,
                message: 'User account suspended successfully',
                data: {
                    userId,
                    status: 'suspended',
                    reason,
                    suspensionDate: new Date().toISOString(),
                    suspensionEndDate: suspensionEndDate?.toISOString()
                }
            });
        } catch (error) {
            console.error('Suspend user error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to suspend user' });
        }
    }
);

/**
 * @route   POST /api/admin/users/:userId/unsuspend
 * @desc    Unsuspend/Unflag a user account
 * @access  Admin
 */
router.post('/users/:userId/unsuspend',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('reason').optional().trim(),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason, notes } = req.body;

            // Update user profile status
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'active',
                    suspension_reason: null,
                    suspension_date: null,
                    suspension_end_date: null,
                    unsuspended_by: req.admin.id,
                    unsuspended_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Log admin action
            await logAdminAction(req.admin.id, req.user.email, 'account_unsuspension', userId, {
                reason: reason || 'Admin lifted suspension',
                notes
            }, req);

            // Log user activity
            await supabase.from('user_activities').insert({
                user_id: userId,
                activity_type: 'account_unsuspended',
                metadata: { reason, unsuspended_by: req.admin.id }
            });

            console.log(`✅ User ${userId} unsuspended by admin ${req.user.email}`);

            res.json({
                success: true,
                message: 'User account unsuspended successfully',
                data: { userId, status: 'active' }
            });
        } catch (error) {
            console.error('Unsuspend user error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to unsuspend user' });
        }
    }
);

/**
 * @route   POST /api/admin/users/:userId/ban
 * @desc    Ban a user account permanently
 * @access  Admin
 */
router.post('/users/:userId/ban',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('reason').trim().notEmpty().withMessage('Ban reason required'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason, notes } = req.body;

            // Update user profile status
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'banned',
                    ban_reason: reason,
                    ban_date: new Date().toISOString(),
                    banned_by: req.admin.id,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Log admin action
            await logAdminAction(req.admin.id, req.user.email, 'account_ban', userId, {
                reason,
                notes,
                permanent: true
            }, req);

            // Log user activity
            await supabase.from('user_activities').insert({
                user_id: userId,
                activity_type: 'account_banned',
                metadata: { reason, banned_by: req.admin.id }
            });

            console.log(`⛔ User ${userId} BANNED by admin ${req.user.email}`);

            res.json({
                success: true,
                message: 'User account banned permanently',
                data: { userId, status: 'banned', reason }
            });
        } catch (error) {
            console.error('Ban user error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to ban user' });
        }
    }
);

/**
 * @route   POST /api/admin/users/:userId/unban
 * @desc    Unban a user account
 * @access  Admin
 */
router.post('/users/:userId/unban',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('reason').trim().notEmpty().withMessage('Unban reason required'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason, notes } = req.body;

            // Update user profile status
            const { data, error } = await supabase
                .from('user_profiles')
                .update({
                    status: 'active',
                    ban_reason: null,
                    ban_date: null,
                    unbanned_by: req.admin.id,
                    unbanned_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (error) throw error;

            // Log admin action
            await logAdminAction(req.admin.id, req.user.email, 'account_unban', userId, {
                reason,
                notes
            }, req);

            // Log user activity
            await supabase.from('user_activities').insert({
                user_id: userId,
                activity_type: 'account_unbanned',
                metadata: { reason, unbanned_by: req.admin.id }
            });

            console.log(`✅ User ${userId} UNBANNED by admin ${req.user.email}`);

            res.json({
                success: true,
                message: 'User account unbanned successfully',
                data: { userId, status: 'active' }
            });
        } catch (error) {
            console.error('Unban user error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to unban user' });
        }
    }
);

// ============================================
// AML MANAGEMENT ENDPOINTS
// ============================================

/**
 * @route   GET /api/admin/aml/flags
 * @desc    Get all AML flagged users
 * @access  Admin
 */
router.get('/aml/flags', authenticateAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('user_activities')
            .select(`
                *,
                user_profiles!inner(full_name, email, phone)
            `)
            .eq('activity_type', 'aml_flag')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: {
                flags: data || [],
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
            }
        });
    } catch (error) {
        console.error('Get AML flags error:', error);
        res.status(500).json({ success: false, message: 'Failed to get AML flags' });
    }
});

/**
 * @route   GET /api/admin/aml/user/:userId
 * @desc    Get AML status for a specific user
 * @access  Admin
 */
router.get('/aml/user/:userId',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    async (req, res) => {
        try {
            const { userId } = req.params;

            // Get AML flags
            const { data: amlFlags } = await supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .eq('activity_type', 'aml_flag')
                .order('created_at', { ascending: false });

            // Get AML documents
            const { data: amlDocs } = await supabase
                .from('user_documents')
                .select('*')
                .eq('user_id', userId)
                .in('document_type', ['proof_of_income', 'source_of_funds']);

            const hasProofOfIncome = amlDocs?.some(d => d.document_type === 'proof_of_income' && d.status === 'verified');
            const hasSourceOfFunds = amlDocs?.some(d => d.document_type === 'source_of_funds' && d.status === 'verified');

            res.json({
                success: true,
                data: {
                    userId,
                    amlFlags: amlFlags || [],
                    totalFlags: amlFlags?.length || 0,
                    documentsStatus: {
                        proofOfIncome: hasProofOfIncome ? 'verified' : 'pending',
                        sourceOfFunds: hasSourceOfFunds ? 'verified' : 'pending'
                    },
                    amlCleared: hasProofOfIncome && hasSourceOfFunds,
                    documents: amlDocs || []
                }
            });
        } catch (error) {
            console.error('Get user AML status error:', error);
            res.status(500).json({ success: false, message: 'Failed to get AML status' });
        }
    }
);

/**
 * @route   POST /api/admin/aml/user/:userId/clear
 * @desc    Manually clear AML flag for a user
 * @access  Admin
 */
router.post('/aml/user/:userId/clear',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('reason').trim().notEmpty().withMessage('Clearance reason required'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { reason, notes } = req.body;

            // Log AML clearance
            await supabase.from('user_activities').insert({
                user_id: userId,
                activity_type: 'aml_cleared',
                metadata: {
                    cleared_by: req.admin.id,
                    reason,
                    notes,
                    cleared_at: new Date().toISOString()
                }
            });

            // Log admin action
            await logAdminAction(req.admin.id, req.user.email, 'aml_clearance', userId, {
                reason,
                notes
            }, req);

            console.log(`✅ AML cleared for user ${userId} by admin ${req.user.email}`);

            res.json({
                success: true,
                message: 'AML flag cleared successfully',
                data: { userId, amlCleared: true }
            });
        } catch (error) {
            console.error('Clear AML error:', error);
            res.status(500).json({ success: false, message: 'Failed to clear AML flag' });
        }
    }
);

// ============================================
// USER ACTIVITY ENDPOINTS
// ============================================

/**
 * @route   GET /api/admin/users/:userId/activities
 * @desc    Get user activity history
 * @access  Admin
 */
router.get('/users/:userId/activities',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    async (req, res) => {
        try {
            const { userId } = req.params;
            const { type, startDate, endDate, page = 1, limit = 50 } = req.query;
            const offset = (page - 1) * limit;

            let query = supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (type) query = query.eq('activity_type', type);
            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate);

            const { data, error, count } = await query;

            if (error) throw error;

            res.json({
                success: true,
                data: {
                    activities: data || [],
                    pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
                }
            });
        } catch (error) {
            console.error('Get user activities error:', error);
            res.status(500).json({ success: false, message: 'Failed to get activities' });
        }
    }
);

/**
 * @route   GET /api/admin/activities
 * @desc    Get all platform activities (with filters)
 * @access  Admin
 */
router.get('/activities', authenticateAdmin, async (req, res) => {
    try {
        const { type, userId, startDate, endDate, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('user_activities')
            .select('*, user_profiles(full_name, email)')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) query = query.eq('activity_type', type);
        if (userId) query = query.eq('user_id', userId);
        if (startDate) query = query.gte('created_at', startDate);
        if (endDate) query = query.lte('created_at', endDate);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: {
                activities: data || [],
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
            }
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ success: false, message: 'Failed to get activities' });
    }
});

// ============================================
// FLAGGED USERS LIST
// ============================================

/**
 * @route   GET /api/admin/users/flagged
 * @desc    Get all flagged/suspended/banned users
 * @access  Admin
 */
router.get('/users/flagged', authenticateAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('user_profiles')
            .select('*')
            .in('status', status ? [status] : ['suspended', 'banned', 'flagged'])
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: {
                users: data || [],
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
            }
        });
    } catch (error) {
        console.error('Get flagged users error:', error);
        res.status(500).json({ success: false, message: 'Failed to get flagged users' });
    }
});

/**
 * @route   GET /api/admin/users/:userId/status
 * @desc    Get user account status details
 * @access  Admin
 */
router.get('/users/:userId/status',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    async (req, res) => {
        try {
            const { userId } = req.params;

            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            // Get recent activities
            const { data: recentActivities } = await supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            // Get loan status
            const { data: activeLoans } = await supabase
                .from('loans')
                .select('*')
                .eq('borrower_id', userId)
                .in('status', ['active', 'late', 'defaulted']);

            const { data: directLoans } = await supabase
                .from('direct_loans')
                .select('*')
                .eq('borrower_user_id', userId)
                .in('status', ['active', 'late', 'defaulted']);

            res.json({
                success: true,
                data: {
                    profile,
                    accountStatus: {
                        status: profile?.status || 'unknown',
                        isSuspended: profile?.status === 'suspended',
                        isBanned: profile?.status === 'banned',
                        suspensionReason: profile?.suspension_reason,
                        suspensionDate: profile?.suspension_date,
                        banReason: profile?.ban_reason,
                        banDate: profile?.ban_date
                    },
                    loanStatus: {
                        hasActiveLoans: (activeLoans?.length || 0) + (directLoans?.length || 0) > 0,
                        p2pLoans: activeLoans || [],
                        directLoans: directLoans || [],
                        hasArrears: activeLoans?.some(l => ['late', 'defaulted'].includes(l.status)) ||
                                   directLoans?.some(l => ['late', 'defaulted'].includes(l.status))
                    },
                    recentActivities: recentActivities || []
                }
            });
        } catch (error) {
            console.error('Get user status error:', error);
            res.status(500).json({ success: false, message: 'Failed to get user status' });
        }
    }
);

// ============================================
// UNBAN REQUESTS
// ============================================

/**
 * @route   GET /api/admin/unban-requests
 * @desc    Get all pending unban requests
 * @access  Admin
 */
router.get('/unban-requests', authenticateAdmin, async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { data, error, count } = await supabase
            .from('unban_requests')
            .select('*, user_profiles(full_name, email, phone)')
            .eq('status', status)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            data: {
                requests: data || [],
                pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
            }
        });
    } catch (error) {
        console.error('Get unban requests error:', error);
        res.status(500).json({ success: false, message: 'Failed to get unban requests' });
    }
});

/**
 * @route   POST /api/admin/unban-requests/:requestId/approve
 * @desc    Approve an unban request
 * @access  Admin
 */
router.post('/unban-requests/:requestId/approve',
    authenticateAdmin,
    param('requestId').isUUID().withMessage('Valid request ID required'),
    async (req, res) => {
        try {
            const { requestId } = req.params;
            const { notes } = req.body;

            // Get the request
            const { data: request, error: requestError } = await supabase
                .from('unban_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (requestError || !request) {
                return res.status(404).json({ success: false, message: 'Request not found' });
            }

            // Update request status
            await supabase
                .from('unban_requests')
                .update({
                    status: 'approved',
                    reviewed_by: req.admin.id,
                    reviewed_at: new Date().toISOString(),
                    admin_notes: notes
                })
                .eq('id', requestId);

            // Unban/unsuspend the user
            await supabase
                .from('user_profiles')
                .update({
                    status: 'active',
                    suspension_reason: null,
                    suspension_date: null,
                    ban_reason: null,
                    ban_date: null,
                    unbanned_by: req.admin.id,
                    unbanned_at: new Date().toISOString()
                })
                .eq('user_id', request.user_id);

            // Log admin action
            await logAdminAction(req.admin.id, req.user.email, 'unban_request_approved', request.user_id, {
                requestId,
                notes
            }, req);

            console.log(`✅ Unban request ${requestId} approved by admin ${req.user.email}`);

            res.json({
                success: true,
                message: 'Unban request approved',
                data: { requestId, userId: request.user_id, status: 'approved' }
            });
        } catch (error) {
            console.error('Approve unban request error:', error);
            res.status(500).json({ success: false, message: 'Failed to approve request' });
        }
    }
);

/**
 * @route   POST /api/admin/unban-requests/:requestId/reject
 * @desc    Reject an unban request
 * @access  Admin
 */
router.post('/unban-requests/:requestId/reject',
    authenticateAdmin,
    param('requestId').isUUID().withMessage('Valid request ID required'),
    body('reason').trim().notEmpty().withMessage('Rejection reason required'),
    async (req, res) => {
        try {
            const { requestId } = req.params;
            const { reason } = req.body;

            // Get the request
            const { data: request, error: requestError } = await supabase
                .from('unban_requests')
                .select('*')
                .eq('id', requestId)
                .single();

            if (requestError || !request) {
                return res.status(404).json({ success: false, message: 'Request not found' });
            }

            // Update request status
            await supabase
                .from('unban_requests')
                .update({
                    status: 'rejected',
                    reviewed_by: req.admin.id,
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: reason
                })
                .eq('id', requestId);

            // Log admin action
            await logAdminAction(req.admin.id, req.user.email, 'unban_request_rejected', request.user_id, {
                requestId,
                reason
            }, req);

            console.log(`❌ Unban request ${requestId} rejected by admin ${req.user.email}`);

            res.json({
                success: true,
                message: 'Unban request rejected',
                data: { requestId, userId: request.user_id, status: 'rejected' }
            });
        } catch (error) {
            console.error('Reject unban request error:', error);
            res.status(500).json({ success: false, message: 'Failed to reject request' });
        }
    }
);

module.exports = router;

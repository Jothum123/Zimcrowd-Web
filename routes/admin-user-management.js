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
                .eq('user_id', userId)
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

/**
 * @route   POST /api/admin/users/:userId/downgrade-zimscore
 * @desc    Downgrade user ZimScore for terms violations or other evidence
 * @access  Admin
 */
router.post('/users/:userId/downgrade-zimscore',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('newScore').isInt({ min: 0, max: 100 }).withMessage('New score must be between 0 and 100'),
    body('reason').trim().notEmpty().withMessage('Downgrade reason required'),
    body('evidence').optional().trim().isString().withMessage('Evidence must be a string'),
    body('notes').optional().trim().isString().withMessage('Notes must be a string'),
    async (req, res) => {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { userId } = req.params;
            const { newScore, reason, evidence, notes } = req.body;

            // Get current user profile and ZimScore
            const { data: currentProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('zimscore, zimscore_last_updated, first_name, last_name, email')
                .eq('user_id', userId)
                .single();

            if (profileError || !currentProfile) {
                return res.status(404).json({
                    success: false,
                    message: 'User profile not found'
                });
            }

            const oldScore = currentProfile.zimscore || 0;

            // Validate that new score is actually a downgrade
            if (newScore >= oldScore) {
                return res.status(400).json({
                    success: false,
                    message: 'New score must be lower than current score'
                });
            }

            // Update user ZimScore
            const { data: updatedProfile, error: updateError } = await supabase
                .from('user_profiles')
                .update({
                    zimscore: newScore,
                    zimscore_last_updated: new Date().toISOString(),
                    zimscore_downgrade_reason: reason,
                    zimscore_downgraded_by: req.admin.id,
                    zimscore_downgraded_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) {
                console.error('ZimScore update error:', updateError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update ZimScore'
                });
            }

            // Log the ZimScore downgrade action
            await logAdminAction(
                req.admin.id,
                req.user.email || 'Admin',
                'ZIMSCORE_DOWNGRADE',
                userId,
                {
                    oldScore: oldScore,
                    newScore: newScore,
                    reason: reason,
                    evidence: evidence || 'None provided',
                    notes: notes || 'None provided',
                    userName: `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim() || currentProfile.email
                },
                req
            );

            // Create audit record for ZimScore changes
            const { error: auditError } = await supabase
                .from('zimscore_audit_log')
                .insert({
                    user_id: userId,
                    admin_id: req.admin.id,
                    action_type: 'MANUAL_DOWNGRADE',
                    old_score: oldScore,
                    new_score: newScore,
                    reason: reason,
                    evidence: evidence || null,
                    notes: notes || null,
                    timestamp: new Date().toISOString(),
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.get('User-Agent')
                });

            if (auditError) {
                console.error('ZimScore audit log error:', auditError);
                // Continue even if audit fails - main action succeeded
            }

            // Send notification to user about ZimScore downgrade
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        type: 'zimscore_downgrade',
                        title: 'ZimScore Updated',
                        message: `Your ZimScore has been updated from ${oldScore} to ${newScore}. Reason: ${reason}`,
                        data: {
                            oldScore: oldScore,
                            newScore: newScore,
                            reason: reason
                        },
                        created_at: new Date().toISOString(),
                        read: false
                    });
            } catch (notificationError) {
                console.error('Notification error:', notificationError);
                // Continue even if notification fails
            }

            res.json({
                success: true,
                message: 'ZimScore downgraded successfully',
                data: {
                    userId: userId,
                    oldScore: oldScore,
                    newScore: newScore,
                    downgradedAt: new Date().toISOString(),
                    reason: reason
                }
            });

        } catch (error) {
            console.error('ZimScore downgrade error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to downgrade ZimScore'
            });
        }
    }
);

/**
 * @route   GET /api/admin/users/:userId/zimscore-history
 * @desc    Get ZimScore change history for a user
 * @access  Admin
 */
router.get('/users/:userId/zimscore-history',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    async (req, res) => {
        try {
            const { userId } = req.params;

            // Get ZimScore audit log
            const { data: auditLog, error: auditError } = await supabase
                .from('zimscore_audit_log')
                .select(`
                    *,
                    admin_users (
                        email,
                        role
                    )
                `)
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .limit(50);

            if (auditError) {
                console.error('Audit log error:', auditError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch ZimScore history'
                });
            }

            // Get current user profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('zimscore, zimscore_last_updated, first_name, last_name, email')
                .eq('user_id', userId)
                .single();

            if (profileError) {
                return res.status(404).json({
                    success: false,
                    message: 'User profile not found'
                });
            }

            res.json({
                success: true,
                data: {
                    currentScore: profile.zimscore || 0,
                    lastUpdated: profile.zimscore_last_updated,
                    userInfo: {
                        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
                        email: profile.email
                    },
                    history: auditLog || []
                }
            });

        } catch (error) {
            console.error('ZimScore history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch ZimScore history'
            });
        }
    }
);

/**
 * @route   POST /api/admin/users/:userId/increase-zimscore
 * @desc    Increase user ZimScore based on qualifying behaviors when system fails to recognize
 * @access  Admin
 */
router.post('/users/:userId/increase-zimscore',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    body('newScore').isInt({ min: 0, max: 100 }).withMessage('New score must be between 0 and 100'),
    body('behaviorType').isIn(['on_time_repayment', 'early_repayment', 'multiple_loans_completed', 'active_loan_bonus', 'other_positive_behavior']).withMessage('Valid behavior type required'),
    body('evidence').trim().notEmpty().withMessage('Evidence (loan IDs, transaction references) required'),
    body('reason').trim().notEmpty().withMessage('Increase reason required'),
    body('notes').optional().trim().isString().withMessage('Notes must be a string'),
    async (req, res) => {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { userId } = req.params;
            const { newScore, behaviorType, evidence, reason, notes } = req.body;

            // Get current user profile and ZimScore
            const { data: currentProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('zimscore, zimscore_last_updated, first_name, last_name, email')
                .eq('user_id', userId)
                .single();

            if (profileError || !currentProfile) {
                return res.status(404).json({
                    success: false,
                    message: 'User profile not found'
                });
            }

            const oldScore = currentProfile.zimscore || 0;

            // Validate that new score is actually an increase
            if (newScore <= oldScore) {
                return res.status(400).json({
                    success: false,
                    message: 'New score must be higher than current score'
                });
            }

            // Verify qualifying behavior exists based on evidence
            const behaviorVerification = await verifyQualifyingBehavior(userId, behaviorType, evidence);
            
            if (!behaviorVerification.verified) {
                return res.status(400).json({
                    success: false,
                    message: `Behavior verification failed: ${behaviorVerification.reason}`
                });
            }

            // Calculate maximum allowed increase based on behavior type
            const maxIncrease = getMaxIncreaseForBehavior(behaviorType);
            const requestedIncrease = newScore - oldScore;
            
            if (requestedIncrease > maxIncrease) {
                return res.status(400).json({
                    success: false,
                    message: `Increase too large for behavior type. Maximum increase for ${behaviorType} is ${maxIncrease} points`
                });
            }

            // Update user ZimScore
            const { data: updatedProfile, error: updateError } = await supabase
                .from('user_profiles')
                .update({
                    zimscore: newScore,
                    zimscore_last_updated: new Date().toISOString(),
                    zimscore_increase_reason: reason,
                    zimscore_increased_by: req.admin.id,
                    zimscore_increased_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .select()
                .single();

            if (updateError) {
                console.error('ZimScore update error:', updateError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update ZimScore'
                });
            }

            // Log the ZimScore increase action
            await logAdminAction(
                req.admin.id,
                req.user.email || 'Admin',
                'ZIMSCORE_INCREASE',
                userId,
                {
                    oldScore: oldScore,
                    newScore: newScore,
                    behaviorType: behaviorType,
                    evidence: evidence,
                    reason: reason,
                    notes: notes || 'None provided',
                    userName: `${currentProfile.first_name || ''} ${currentProfile.last_name || ''}`.trim() || currentProfile.email,
                    verificationDetails: behaviorVerification.details
                },
                req
            );

            // Create audit record for ZimScore changes
            const { error: auditError } = await supabase
                .from('zimscore_audit_log')
                .insert({
                    user_id: userId,
                    admin_id: req.admin.id,
                    action_type: 'MANUAL_INCREASE',
                    old_score: oldScore,
                    new_score: newScore,
                    reason: reason,
                    evidence: evidence,
                    notes: notes || null,
                    timestamp: new Date().toISOString(),
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.get('User-Agent')
                });

            if (auditError) {
                console.error('ZimScore audit log error:', auditError);
                // Continue even if audit fails - main action succeeded
            }

            // Send notification to user about ZimScore increase
            try {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userId,
                        type: 'zimscore_increase',
                        title: 'ZimScore Increased',
                        message: `Your ZimScore has been increased from ${oldScore} to ${newScore} based on your positive repayment behavior.`,
                        data: {
                            oldScore: oldScore,
                            newScore: newScore,
                            reason: reason,
                            behaviorType: behaviorType
                        },
                        created_at: new Date().toISOString(),
                        read: false
                    });
            } catch (notificationError) {
                console.error('Notification error:', notificationError);
                // Continue even if notification fails
            }

            res.json({
                success: true,
                message: 'ZimScore increased successfully',
                data: {
                    userId: userId,
                    oldScore: oldScore,
                    newScore: newScore,
                    increasedAt: new Date().toISOString(),
                    behaviorType: behaviorType,
                    reason: reason,
                    verificationDetails: behaviorVerification.details
                }
            });

        } catch (error) {
            console.error('ZimScore increase error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to increase ZimScore'
            });
        }
    }
);

/**
 * Verify that qualifying behavior exists based on evidence
 * @param {string} userId - User ID
 * @param {string} behaviorType - Type of behavior to verify
 * @param {string} evidence - Evidence (loan IDs, transaction references)
 * @returns {Promise<Object>} Verification result
 */
async function verifyQualifyingBehavior(userId, behaviorType, evidence) {
    try {
        switch (behaviorType) {
            case 'on_time_repayment':
                return await verifyOnTimeRepayment(userId, evidence);
            case 'early_repayment':
                return await verifyEarlyRepayment(userId, evidence);
            case 'multiple_loans_completed':
                return await verifyMultipleLoansCompleted(userId, evidence);
            case 'active_loan_bonus':
                return await verifyActiveLoanBonus(userId, evidence);
            case 'other_positive_behavior':
                return await verifyOtherPositiveBehavior(userId, evidence);
            default:
                return { verified: false, reason: 'Unknown behavior type' };
        }
    } catch (error) {
        console.error('Behavior verification error:', error);
        return { verified: false, reason: 'Verification system error' };
    }
}

/**
 * Verify on-time repayment behavior
 */
async function verifyOnTimeRepayment(userId, evidence) {
    try {
        // Parse evidence (should contain loan IDs or transaction IDs)
        const loanIds = evidence.split(',').map(id => id.trim()).filter(id => id);
        
        if (loanIds.length === 0) {
            return { verified: false, reason: 'No loan IDs provided in evidence' };
        }

        // Check if loans belong to user and have on-time repayments
        const { data: repayments, error } = await supabase
            .from('repayment_schedule')
            .select(`
                *,
                loans!inner(user_id, status)
            `)
            .in('loan_id', loanIds)
            .eq('loans.user_id', userId)
            .eq('status', 'PAID')
            .filter('paid_at', 'lte', 'due_date'); // Paid on or before due date

        if (error) {
            return { verified: false, reason: 'Failed to verify repayment history' };
        }

        if (repayments.length === 0) {
            return { verified: false, reason: 'No qualifying on-time repayments found' };
        }

        return {
            verified: true,
            details: {
                qualifyingRepayments: repayments.length,
                repaymentIds: repayments.map(r => r.id)
            }
        };
    } catch (error) {
        return { verified: false, reason: 'Verification error: ' + error.message };
    }
}

/**
 * Verify early repayment behavior
 */
async function verifyEarlyRepayment(userId, evidence) {
    try {
        const loanIds = evidence.split(',').map(id => id.trim()).filter(id => id);
        
        if (loanIds.length === 0) {
            return { verified: false, reason: 'No loan IDs provided in evidence' };
        }

        // Check for early repayments (paid before due date)
        const { data: repayments, error } = await supabase
            .from('repayment_schedule')
            .select(`
                *,
                loans!inner(user_id, status)
            `)
            .in('loan_id', loanIds)
            .eq('loans.user_id', userId)
            .eq('status', 'PAID')
            .filter('paid_at', 'lt', 'due_date'); // Paid before due date

        if (error) {
            return { verified: false, reason: 'Failed to verify early repayment history' };
        }

        if (repayments.length === 0) {
            return { verified: false, reason: 'No qualifying early repayments found' };
        }

        return {
            verified: true,
            details: {
                qualifyingEarlyRepayments: repayments.length,
                repaymentIds: repayments.map(r => r.id)
            }
        };
    } catch (error) {
        return { verified: false, reason: 'Verification error: ' + error.message };
    }
}

/**
 * Verify multiple loans completed behavior
 */
async function verifyMultipleLoansCompleted(userId, evidence) {
    try {
        // Check if user has completed 3+ loans
        const { data: completedLoans, error } = await supabase
            .from('loans')
            .select('id, status, completed_at')
            .eq('user_id', userId)
            .eq('status', 'completed');

        if (error) {
            return { verified: false, reason: 'Failed to verify loan completion history' };
        }

        if (completedLoans.length < 3) {
            return { verified: false, reason: 'User has completed fewer than 3 loans' };
        }

        return {
            verified: true,
            details: {
                completedLoansCount: completedLoans.length,
                loanIds: completedLoans.map(l => l.id)
            }
        };
    } catch (error) {
        return { verified: false, reason: 'Verification error: ' + error.message };
    }
}

/**
 * Verify active loan bonus behavior
 */
async function verifyActiveLoanBonus(userId, evidence) {
    try {
        // Check if user has active loan in good standing
        const { data: activeLoans, error } = await supabase
            .from('loans')
            .select('id, status, created_at')
            .eq('user_id', userId)
            .eq('status', 'active');

        if (error) {
            return { verified: false, reason: 'Failed to verify active loan status' };
        }

        if (activeLoans.length === 0) {
            return { verified: false, reason: 'No active loans found' };
        }

        return {
            verified: true,
            details: {
                activeLoansCount: activeLoans.length,
                loanIds: activeLoans.map(l => l.id)
            }
        };
    } catch (error) {
        return { verified: false, reason: 'Verification error: ' + error.message };
    }
}

/**
 * Verify other positive behavior (custom verification)
 */
async function verifyOtherPositiveBehavior(userId, evidence) {
    try {
        // For other behaviors, require detailed evidence description
        if (evidence.length < 50) {
            return { verified: false, reason: 'Evidence description too detailed for other behaviors' };
        }

        return {
            verified: true,
            details: {
                evidenceType: 'custom',
                description: evidence
            }
        };
    } catch (error) {
        return { verified: false, reason: 'Verification error: ' + error.message };
    }
}

/**
 * Get maximum allowed increase for each behavior type
 */
function getMaxIncreaseForBehavior(behaviorType) {
    const maxIncreases = {
        'on_time_repayment': 3,      // +3 per on-time repayment
        'early_repayment': 5,        // +5 per early repayment
        'multiple_loans_completed': 5, // +5 for completing 3+ loans
        'active_loan_bonus': 3,      // +3 for having active loan
        'other_positive_behavior': 10 // +10 for other positive behaviors (admin discretion)
    };
    
    return maxIncreases[behaviorType] || 0;
}

/**
 * @route   POST /api/admin/loan-config
 * @desc    Create or update loan configuration parameters (limits, interest rates, etc.)
 * @access  Admin
 */
router.post('/loan-config',
    authenticateAdmin,
    body('configType').isIn(['global', 'loan_type', 'employment_type', 'user_override']).withMessage('Valid config type required'),
    body('targetKey').trim().notEmpty().withMessage('Target key required'),
    body('parameterName').isIn(['min_loan_amount', 'max_loan_amount', 'interest_rate', 'cold_start_cap', 'dtni_max', 'max_tenure_months', 'cold_start_active', 'min_tenure_months', 'interest_calculation_method']).withMessage('Valid parameter name required'),
    body('parameterValue').isDecimal().withMessage('Parameter value must be a number'),
    body('reason').trim().notEmpty().withMessage('Reason for change required'),
    body('notes').optional().trim().isString().withMessage('Notes must be a string'),
    async (req, res) => {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { configType, targetKey, parameterName, parameterValue, reason, notes } = req.body;

            // Validate parameter value based on parameter name
            const validation = validateParameterValue(parameterName, parseFloat(parameterValue));
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            // Check if config already exists
            const { data: existingConfig, error: fetchError } = await supabase
                .from('loan_config')
                .select('*')
                .eq('config_type', configType)
                .eq('target_key', targetKey)
                .eq('parameter_name', parameterName)
                .single();

            let result;
            let actionType;

            if (existingConfig) {
                // Update existing config
                const oldValue = existingConfig.parameter_value;
                
                const { data: updatedConfig, error: updateError } = await supabase
                    .from('loan_config')
                    .update({
                        parameter_value: parseFloat(parameterValue),
                        is_active: true,
                        updated_by: req.admin.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingConfig.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('Config update error:', updateError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to update configuration'
                    });
                }

                result = updatedConfig;
                actionType = 'UPDATE';

                // Log the change
                await logConfigChange(
                    existingConfig.id,
                    req.admin.id,
                    actionType,
                    oldValue,
                    parseFloat(parameterValue),
                    parameterName,
                    configType,
                    targetKey,
                    reason,
                    req
                );

            } else {
                // Create new config
                const { data: newConfig, error: createError } = await supabase
                    .from('loan_config')
                    .insert({
                        config_type: configType,
                        target_key: targetKey,
                        parameter_name: parameterName,
                        parameter_value: parseFloat(parameterValue),
                        is_active: true,
                        created_by: req.admin.id,
                        updated_by: req.admin.id
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Config creation error:', createError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create configuration'
                    });
                }

                result = newConfig;
                actionType = 'CREATE';

                // Log the change
                await logConfigChange(
                    result.id,
                    req.admin.id,
                    actionType,
                    null,
                    parseFloat(parameterValue),
                    parameterName,
                    configType,
                    targetKey,
                    reason,
                    req
                );
            }

            // Log admin action
            await logAdminAction(
                req.admin.id,
                req.user.email || 'Admin',
                'LOAN_CONFIG_' + actionType,
                result.id,
                {
                    configType: configType,
                    targetKey: targetKey,
                    parameterName: parameterName,
                    parameterValue: parseFloat(parameterValue),
                    reason: reason,
                    notes: notes || 'None provided'
                },
                req
            );

            res.json({
                success: true,
                message: `Configuration ${actionType.toLowerCase()}d successfully`,
                data: {
                    config: result,
                    action: actionType,
                    changedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Loan config error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to manage loan configuration'
            });
        }
    }
);

/**
 * @route   GET /api/admin/loan-config
 * @desc    Get all loan configurations with hierarchical overrides
 * @access  Admin
 */
router.get('/loan-config',
    authenticateAdmin,
    query('configType').optional().isIn(['global', 'loan_type', 'employment_type', 'user_override']).withMessage('Valid config type required'),
    query('targetKey').optional().trim().isString().withMessage('Target key must be string'),
    async (req, res) => {
        try {
            const { configType, targetKey } = req.query;

            let query = supabase
                .from('loan_config')
                .select(`
                    *,
                    creator:created_by(email),
                    updater:updated_by(email)
                `)
                .eq('is_active', true);

            if (configType) {
                query = query.eq('config_type', configType);
            }

            if (targetKey) {
                query = query.eq('target_key', targetKey);
            }

            const { data: configs, error } = await query.order('config_type', { ascending: true });

            if (error) {
                console.error('Config fetch error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch configurations'
                });
            }

            // Group configurations by hierarchy
            const groupedConfigs = {
                global: configs.filter(c => c.config_type === 'global'),
                loan_type: configs.filter(c => c.config_type === 'loan_type'),
                employment_type: configs.filter(c => c.config_type === 'employment_type'),
                user_override: configs.filter(c => c.config_type === 'user_override')
            };

            res.json({
                success: true,
                data: {
                    configurations: groupedConfigs,
                    total: configs.length,
                    summary: {
                        global: groupedConfigs.global.length,
                        loan_type: groupedConfigs.loan_type.length,
                        employment_type: groupedConfigs.employment_type.length,
                        user_override: groupedConfigs.user_override.length
                    }
                }
            });

        } catch (error) {
            console.error('Loan config fetch error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch loan configurations'
            });
        }
    }
);

/**
 * @route   GET /api/admin/loan-config/effective/:userId
 * @desc    Get effective loan configuration for a specific user (with hierarchy applied)
 * @access  Admin
 */
router.get('/loan-config/effective/:userId',
    authenticateAdmin,
    param('userId').isUUID().withMessage('Valid user ID required'),
    async (req, res) => {
        try {
            const { userId } = req.params;

            // Get user's employment type and loan type context
            const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('employment_type')
                .eq('user_id', userId)
                .single();

            // Get loan type from query parameter or default to 'direct'
            const loanType = req.query.loanType || 'direct';

            if (profileError) {
                return res.status(404).json({
                    success: false,
                    message: 'User profile not found'
                });
            }

            // Get effective configuration using the database function
            const { data: effectiveConfig, error: configError } = await supabase
                .rpc('get_effective_loan_config', {
                    p_user_id: userId,
                    p_loan_type: loanType,
                    p_employment_type: userProfile.employment_type || 'informal'
                });

            if (configError) {
                console.error('Effective config error:', configError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch effective configuration'
                });
            }

            // Format the configuration for easier consumption
            const formattedConfig = {};
            effectiveConfig.forEach(config => {
                formattedConfig[config.parameter_name] = {
                    value: config.parameter_value,
                    source: config.source_type,
                    sourceKey: config.source_key
                };
            });

            res.json({
                success: true,
                data: {
                    userId: userId,
                    loanType: loanType,
                    employmentType: userProfile.employment_type || 'informal',
                    effectiveConfig: formattedConfig,
                    calculatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Effective config error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch effective loan configuration'
            });
        }
    }
);

/**
 * @route   POST /api/admin/loan-config/:configId/deactivate
 * @desc    Deactivate a loan configuration (removes it from effective calculations)
 * @access  Admin
 */
router.post('/loan-config/:configId/deactivate',
    authenticateAdmin,
    param('configId').isUUID().withMessage('Valid config ID required'),
    body('reason').trim().notEmpty().withMessage('Reason required'),
    async (req, res) => {
        try {
            const { configId } = req.params;
            const { reason } = req.body;

            // Get current config
            const { data: currentConfig, error: fetchError } = await supabase
                .from('loan_config')
                .select('*')
                .eq('id', configId)
                .single();

            if (fetchError || !currentConfig) {
                return res.status(404).json({
                    success: false,
                    message: 'Configuration not found'
                });
            }

            // Deactivate config
            const { data: updatedConfig, error: updateError } = await supabase
                .from('loan_config')
                .update({
                    is_active: false,
                    updated_by: req.admin.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', configId)
                .select()
                .single();

            if (updateError) {
                console.error('Config deactivation error:', updateError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to deactivate configuration'
                });
            }

            // Log the change
            await logConfigChange(
                configId,
                req.admin.id,
                'DEACTIVATE',
                currentConfig.parameter_value,
                currentConfig.parameter_value,
                currentConfig.parameter_name,
                currentConfig.config_type,
                currentConfig.target_key,
                reason,
                req
            );

            // Log admin action
            await logAdminAction(
                req.admin.id,
                req.user.email || 'Admin',
                'LOAN_CONFIG_DEACTIVATE',
                configId,
                {
                    configType: currentConfig.config_type,
                    targetKey: currentConfig.target_key,
                    parameterName: currentConfig.parameter_name,
                    parameterValue: currentConfig.parameter_value,
                    reason: reason
                },
                req
            );

            res.json({
                success: true,
                message: 'Configuration deactivated successfully',
                data: {
                    config: updatedConfig,
                    deactivatedAt: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Config deactivation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to deactivate configuration'
            });
        }
    }
);

/**
 * @route   GET /api/admin/loan-config/audit
 * @desc    Get audit log for loan configuration changes
 * @access  Admin
 */
router.get('/loan-config/audit',
    authenticateAdmin,
    query('configType').optional().isIn(['global', 'loan_type', 'employment_type', 'user_override']).withMessage('Valid config type required'),
    query('parameterName').optional().trim().isString().withMessage('Parameter name must be string'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    async (req, res) => {
        try {
            const { configType, parameterName, limit = 50 } = req.query;

            let query = supabase
                .from('loan_config_audit_log')
                .select(`
                    *,
                    admin:admin_id(email, first_name, last_name)
                `);

            if (configType) {
                query = query.eq('config_type', configType);
            }

            if (parameterName) {
                query = query.eq('parameter_name', parameterName);
            }

            const { data: auditLog, error } = await query
                .order('timestamp', { ascending: false })
                .limit(parseInt(limit));

            if (error) {
                console.error('Audit log fetch error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch audit log'
                });
            }

            res.json({
                success: true,
                data: {
                    auditLog: auditLog || [],
                    total: auditLog ? auditLog.length : 0,
                    filters: {
                        configType: configType || 'all',
                        parameterName: parameterName || 'all',
                        limit: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            console.error('Audit log error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch audit log'
            });
        }
    }
);

/**
 * Validate parameter value based on parameter name
 */
function validateParameterValue(parameterName, value) {
    const validations = {
        'min_loan_amount': { min: 1, max: 10000, error: 'Minimum loan amount must be between $1 and $10,000' },
        'max_loan_amount': { min: 25, max: 50000, error: 'Maximum loan amount must be between $25 and $50,000' },
        'interest_rate': { min: 0, max: 50, error: 'Interest rate must be between 0% and 50%' },
        'cold_start_cap': { min: 0, max: 5000, error: 'Cold start cap must be between $0 and $5,000' },
        'dtni_max': { min: 0.01, max: 1, error: 'Maximum DTNI must be between 1% and 100%' },
        'max_tenure_months': { min: 1, max: 60, error: 'Maximum tenure must be between 1 and 60 months' },
        'cold_start_active': { min: 0, max: 1, error: 'Cold start active must be 0 (false) or 1 (true)' },
        'min_tenure_months': { min: 1, max: 12, error: 'Minimum tenure must be between 1 and 12 months' },
        'interest_calculation_method': { allowed: [1, 2], error: 'Interest calculation method must be 1 (reducing_balance) or 2 (flat_rate)' }
    };

    const validation = validations[parameterName];
    if (!validation) {
        return { valid: false, error: 'Unknown parameter name' };
    }

    // Handle validation based on type
    if (validation.allowed) {
        if (!validation.allowed.includes(value)) {
            return { valid: false, error: validation.error };
        }
    } else {
        if (value < validation.min || value > validation.max) {
            return { valid: false, error: validation.error };
        }
    }

    // Additional validation for logical constraints
    if (parameterName === 'min_loan_amount' && value > 1000) {
        return { valid: false, error: 'Minimum loan amount should not exceed $1,000' };
    }

    if (parameterName === 'max_tenure_months' && value < 3) {
        return { valid: false, error: 'Maximum tenure should be at least 3 months' };
    }

    return { valid: true };
}

/**
 * Log configuration change to audit table
 */
async function logConfigChange(configId, adminId, actionType, oldValue, newValue, parameterName, configType, targetKey, reason, req) {
    try {
        await supabase
            .from('loan_config_audit_log')
            .insert({
                config_id: configId,
                admin_id: adminId,
                action_type: actionType,
                old_value: oldValue,
                new_value: newValue,
                parameter_name: parameterName,
                config_type: configType,
                target_key: targetKey,
                reason: reason,
                ip_address: req.ip || req.connection.remoteAddress,
                user_agent: req.get('User-Agent')
            });
    } catch (error) {
        console.error('Config audit log error:', error);
        // Continue even if audit fails
    }
}

module.exports = router;

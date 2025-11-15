const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * @route   GET /api/account-status/current
 * @desc    Get current user's account status
 * @access  Private
 */
router.get('/current', authenticateUser, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select(`
                id,
                email,
                full_name,
                account_status,
                account_flags,
                status_reason,
                status_changed_at,
                last_activity_at,
                kyc_status,
                kyc_verified_at
            `)
            .eq('id', req.user.id)
            .single();

        if (error) throw error;

        // Get active flags
        const { data: flags } = await supabase
            .from('account_flags')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        // Get active restrictions
        const { data: restrictions } = await supabase
            .from('account_restrictions')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('is_active', true);

        // Get arrears if any
        const { data: arrears } = await supabase
            .from('arrears_tracking')
            .select('*')
            .eq('user_id', req.user.id)
            .eq('status', 'active');

        res.json({
            success: true,
            data: {
                user: user,
                flags: flags || [],
                restrictions: restrictions || [],
                arrears: arrears || [],
                can_borrow: user.account_status === 'active' && (!restrictions || restrictions.length === 0),
                can_invest: user.account_status === 'active' && user.kyc_status === 'verified',
                requires_action: user.account_status !== 'active' || (flags && flags.length > 0)
            }
        });
    } catch (error) {
        console.error('Get account status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get account status'
        });
    }
});

/**
 * @route   POST /api/account-status/update
 * @desc    Update account status (Admin only)
 * @access  Private/Admin
 */
router.post('/update', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { user_id, new_status, reason } = req.body;

        if (!user_id || !new_status) {
            return res.status(400).json({
                success: false,
                message: 'User ID and new status are required'
            });
        }

        // Valid statuses
        const validStatuses = ['pending_verification', 'active', 'arrears', 'suspended', 'restricted', 'closed', 'under_review'];
        if (!validStatuses.includes(new_status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        // Get current status
        const { data: currentUser } = await supabase
            .from('users')
            .select('account_status')
            .eq('id', user_id)
            .single();

        // Update user status
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                account_status: new_status,
                status_reason: reason || null,
                status_changed_at: new Date().toISOString(),
                status_changed_by: req.user.id
            })
            .eq('id', user_id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Record status change in history
        await supabase
            .from('account_status_history')
            .insert({
                user_id: user_id,
                previous_status: currentUser?.account_status,
                new_status: new_status,
                reason: reason,
                changed_by: req.user.id,
                changed_by_role: 'admin',
                ip_address: req.ip,
                created_at: new Date().toISOString()
            });

        // Create notification for user
        await supabase
            .from('notifications')
            .insert({
                user_id: user_id,
                type: 'account_status_change',
                title: 'Account Status Updated',
                message: `Your account status has been changed to: ${new_status}${reason ? '. Reason: ' + reason : ''}`,
                priority: 'high',
                created_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: 'Account status updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update account status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update account status'
        });
    }
});

/**
 * @route   POST /api/account-status/flag
 * @desc    Flag an account (Admin or System)
 * @access  Private/Admin
 */
router.post('/flag', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { user_id, flag_type, flag_category, severity, reason, details } = req.body;

        if (!user_id || !flag_type || !severity || !reason) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Create flag
        const { data: flag, error: flagError } = await supabase
            .from('account_flags')
            .insert({
                user_id: user_id,
                flag_type: flag_type,
                flag_category: flag_category || 'general',
                severity: severity,
                reason: reason,
                details: details || {},
                flagged_by: req.user.id,
                flagged_by_system: false,
                is_active: true,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (flagError) throw flagError;

        // Update user's account_flags array
        const { data: user } = await supabase
            .from('users')
            .select('account_flags')
            .eq('id', user_id)
            .single();

        const currentFlags = user?.account_flags || [];
        await supabase
            .from('users')
            .update({
                account_flags: [...currentFlags, flag_type]
            })
            .eq('id', user_id);

        // Create notification
        await supabase
            .from('notifications')
            .insert({
                user_id: user_id,
                type: 'account_flag',
                title: 'Account Flag Added',
                message: `Your account has been flagged: ${reason}`,
                priority: severity === 'critical' || severity === 'high' ? 'high' : 'medium',
                created_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: 'Account flagged successfully',
            data: flag
        });
    } catch (error) {
        console.error('Flag account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to flag account'
        });
    }
});

/**
 * @route   POST /api/account-status/resolve-flag/:flag_id
 * @desc    Resolve an account flag
 * @access  Private/Admin
 */
router.post('/resolve-flag/:flag_id', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { flag_id } = req.params;
        const { resolution_notes } = req.body;

        const { data: flag, error } = await supabase
            .from('account_flags')
            .update({
                is_active: false,
                resolved_at: new Date().toISOString(),
                resolved_by: req.user.id,
                resolution_notes: resolution_notes || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', flag_id)
            .select()
            .single();

        if (error) throw error;

        // Update user's account_flags array
        const { data: user } = await supabase
            .from('users')
            .select('account_flags')
            .eq('id', flag.user_id)
            .single();

        const updatedFlags = (user?.account_flags || []).filter(f => f !== flag.flag_type);
        await supabase
            .from('users')
            .update({ account_flags: updatedFlags })
            .eq('id', flag.user_id);

        res.json({
            success: true,
            message: 'Flag resolved successfully',
            data: flag
        });
    } catch (error) {
        console.error('Resolve flag error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve flag'
        });
    }
});

/**
 * @route   GET /api/account-status/arrears
 * @desc    Get accounts in arrears (Admin only)
 * @access  Private/Admin
 */
router.get('/arrears', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { data: arrears, error } = await supabase
            .from('arrears_summary')
            .select('*')
            .order('max_days_overdue', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: arrears || []
        });
    } catch (error) {
        console.error('Get arrears error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get arrears data'
        });
    }
});

/**
 * @route   GET /api/account-status/statistics
 * @desc    Get account status statistics (Admin only)
 * @access  Private/Admin
 */
router.get('/statistics', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        // Get status summary
        const { data: statusSummary } = await supabase
            .from('account_status_summary')
            .select('*');

        // Get total users
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Get users by KYC status
        const { data: kycStats } = await supabase
            .from('users')
            .select('kyc_status')
            .then(({ data }) => {
                const stats = {};
                data?.forEach(u => {
                    stats[u.kyc_status] = (stats[u.kyc_status] || 0) + 1;
                });
                return { data: stats };
            });

        // Get active flags count
        const { count: activeFlagsCount } = await supabase
            .from('account_flags')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Get arrears count
        const { count: arrearsCount } = await supabase
            .from('arrears_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        res.json({
            success: true,
            data: {
                total_users: totalUsers,
                status_breakdown: statusSummary,
                kyc_breakdown: kycStats,
                active_flags: activeFlagsCount,
                accounts_in_arrears: arrearsCount
            }
        });
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get statistics'
        });
    }
});

/**
 * @route   POST /api/account-status/restrict
 * @desc    Add restriction to account
 * @access  Private/Admin
 */
router.post('/restrict', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { user_id, restriction_type, description, expires_at } = req.body;

        if (!user_id || !restriction_type || !description) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const { data: restriction, error } = await supabase
            .from('account_restrictions')
            .insert({
                user_id: user_id,
                restriction_type: restriction_type,
                description: description,
                is_active: true,
                applied_by: req.user.id,
                applied_at: new Date().toISOString(),
                expires_at: expires_at || null
            })
            .select()
            .single();

        if (error) throw error;

        // Create notification
        await supabase
            .from('notifications')
            .insert({
                user_id: user_id,
                type: 'account_restriction',
                title: 'Account Restriction Applied',
                message: `A restriction has been applied to your account: ${description}`,
                priority: 'high',
                created_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: 'Restriction applied successfully',
            data: restriction
        });
    } catch (error) {
        console.error('Apply restriction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply restriction'
        });
    }
});

/**
 * @route   POST /api/account-status/remove-restriction/:restriction_id
 * @desc    Remove restriction from account
 * @access  Private/Admin
 */
router.post('/remove-restriction/:restriction_id', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { restriction_id } = req.params;
        const { removal_reason } = req.body;

        const { data: restriction, error } = await supabase
            .from('account_restrictions')
            .update({
                is_active: false,
                removed_at: new Date().toISOString(),
                removed_by: req.user.id,
                removal_reason: removal_reason || null
            })
            .eq('id', restriction_id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Restriction removed successfully',
            data: restriction
        });
    } catch (error) {
        console.error('Remove restriction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove restriction'
        });
    }
});

module.exports = router;

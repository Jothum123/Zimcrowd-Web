/**
 * Admin Role Management Routes
 * Manage admin users, roles, and permissions
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const AdminRoleManagementService = require('../services/admin-role-management.service');
const {
    authenticateAdmin,
    requirePermission,
    requireSuperAdmin,
    requireSystemAdmin
} = require('../middleware/admin-auth.middleware');

const adminRoleService = new AdminRoleManagementService();

/**
 * Handle validation errors
 */
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

// @route   GET /api/admin-role-management/profile
// @desc    Get current admin profile
// @access  Admin
router.get('/profile', authenticateAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                admin: req.admin,
                session_info: {
                    authenticated_at: new Date().toISOString(),
                    ip_address: req.ip,
                    user_agent: req.get('User-Agent')
                }
            }
        });
        
        // Log profile access
        await req.logAdminAction('profile_access', {
            ip_address: req.ip
        });
        
    } catch (error) {
        console.error('❌ Get admin profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get admin profile',
            error: error.message
        });
    }
});

// @route   GET /api/admin-role-management/roles
// @desc    Get all admin roles
// @access  System Admin
router.get('/roles', authenticateAdmin, requireSystemAdmin, async (req, res) => {
    try {
        const result = await adminRoleService.getAdminRoles();
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to get admin roles',
                error: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Get admin roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get admin roles',
            error: error.message
        });
    }
});

// @route   GET /api/admin-role-management/users
// @desc    Get all admin users
// @access  System Admin
router.get('/users', authenticateAdmin, requireSystemAdmin, async (req, res) => {
    try {
        const filters = {
            role: req.query.role,
            active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };
        
        const result = await adminRoleService.getAdminUsers(filters);
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                filters: filters
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to get admin users',
                error: result.error
            });
        }
        
        // Log admin users access
        await req.logAdminAction('admin_users_viewed', {
            filters: filters
        });
        
    } catch (error) {
        console.error('❌ Get admin users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get admin users',
            error: error.message
        });
    }
});

// @route   POST /api/admin-role-management/users
// @desc    Create new admin user
// @access  Super Admin
router.post('/users', authenticateAdmin, requireSuperAdmin, [
    body('email').isEmail().withMessage('Valid email required'),
    body('name').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('role_name').isIn([
        'super_admin', 'admin', 'finance_manager', 
        'customer_support', 'analyst', 'moderator'
    ]).withMessage('Valid role required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email, name, role_name } = req.body;
        
        const result = await adminRoleService.createAdminUser({
            email,
            name,
            role_name
        }, req.admin);
        
        if (result.success) {
            res.status(201).json({
                success: true,
                message: 'Admin user created successfully',
                data: result.data
            });
            
            // Log admin user creation
            await req.logAdminAction('admin_user_created', {
                created_user: {
                    email: result.data.email,
                    name: result.data.name,
                    role: result.data.role
                }
            });
            
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to create admin user',
                error: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Create admin user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create admin user',
            error: error.message
        });
    }
});

// @route   PUT /api/admin-role-management/users/:id
// @desc    Update admin user
// @access  Super Admin
router.put('/users/:id', authenticateAdmin, requireSuperAdmin, [
    body('name').optional().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('role_name').optional().isIn([
        'super_admin', 'admin', 'finance_manager', 
        'customer_support', 'analyst', 'moderator'
    ]).withMessage('Valid role required'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role_name, is_active } = req.body;
        
        // Prevent self-deactivation
        if (id === req.admin.id && is_active === false) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }
        
        const result = await adminRoleService.updateAdminUser(id, {
            name,
            role_name,
            is_active
        }, req.admin);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Admin user updated successfully',
                data: result.data
            });
            
            // Log admin user update
            await req.logAdminAction('admin_user_updated', {
                updated_user_id: id,
                changes: { name, role_name, is_active }
            });
            
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to update admin user',
                error: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Update admin user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update admin user',
            error: error.message
        });
    }
});

// @route   POST /api/admin-role-management/users/:id/regenerate-key
// @desc    Regenerate API key for admin user
// @access  Super Admin
router.post('/users/:id/regenerate-key', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await adminRoleService.regenerateApiKey(id);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'API key regenerated successfully',
                data: result.data
            });
            
            // Log API key regeneration
            await req.logAdminAction('api_key_regenerated', {
                target_admin_id: id
            });
            
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to regenerate API key',
                error: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Regenerate API key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to regenerate API key',
            error: error.message
        });
    }
});

// @route   GET /api/admin-role-management/permissions
// @desc    Get all available permissions
// @access  System Admin
router.get('/permissions', authenticateAdmin, requireSystemAdmin, async (req, res) => {
    try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        const { data: permissions, error } = await supabase
            .from('admin_permissions')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true })
            .order('permission_name', { ascending: true });
        
        if (error) throw error;
        
        // Group permissions by category
        const groupedPermissions = permissions.reduce((acc, permission) => {
            if (!acc[permission.category]) {
                acc[permission.category] = [];
            }
            acc[permission.category].push(permission);
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: {
                permissions: permissions,
                grouped: groupedPermissions
            }
        });
        
    } catch (error) {
        console.error('❌ Get permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get permissions',
            error: error.message
        });
    }
});

// @route   GET /api/admin-role-management/activity
// @desc    Get admin activity log
// @access  System Admin
router.get('/activity', authenticateAdmin, requireSystemAdmin, async (req, res) => {
    try {
        const filters = {
            admin_id: req.query.admin_id,
            timeframe: req.query.timeframe || '7d',
            limit: parseInt(req.query.limit) || 50
        };
        
        const result = await adminRoleService.getAdminActivity(filters);
        
        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                filters: filters
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to get admin activity',
                error: result.error
            });
        }
        
    } catch (error) {
        console.error('❌ Get admin activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get admin activity',
            error: error.message
        });
    }
});

// @route   POST /api/admin-role-management/check-permission
// @desc    Check if current admin has specific permission
// @access  Admin
router.post('/check-permission', authenticateAdmin, [
    body('permission').isString().withMessage('Permission name required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { permission } = req.body;
        
        const hasPermission = adminRoleService.hasPermission(req.admin, permission);
        
        res.json({
            success: true,
            data: {
                permission: permission,
                has_permission: hasPermission,
                admin_role: req.admin.role,
                admin_permissions: req.admin.permissions
            }
        });
        
    } catch (error) {
        console.error('❌ Check permission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check permission',
            error: error.message
        });
    }
});

module.exports = router;

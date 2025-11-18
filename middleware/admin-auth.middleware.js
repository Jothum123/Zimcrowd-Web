/**
 * Enhanced Admin Authentication Middleware
 * Role-based access control with granular permissions
 */

const AdminRoleManagementService = require('../services/admin-role-management.service');

const adminRoleService = new AdminRoleManagementService();

/**
 * Basic admin authentication middleware
 * Verifies admin credentials and attaches admin info to request
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-admin-key'];
        const sessionToken = req.headers['x-session-token'];
        
        if (!apiKey && !sessionToken) {
            return res.status(401).json({
                success: false,
                message: 'Admin authentication required',
                error: 'Missing API key or session token'
            });
        }
        
        // Authenticate admin
        const authResult = await adminRoleService.authenticateAdmin(apiKey, sessionToken);
        
        if (!authResult.success) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials',
                error: authResult.error
            });
        }
        
        // Attach admin info to request
        req.admin = authResult.admin;
        
        // Log admin action for audit trail
        req.logAdminAction = async (action, details = {}) => {
            try {
                const { createClient } = require('@supabase/supabase-js');
                const supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                
                await supabase
                    .from('admin_actions')
                    .insert({
                        admin_id: req.admin.id,
                        admin_name: req.admin.name,
                        action: action,
                        details: details,
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent')
                    });
            } catch (error) {
                console.error('❌ Error logging admin action:', error);
            }
        };
        
        next();
        
    } catch (error) {
        console.error('❌ Admin authentication middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication error',
            error: error.message
        });
    }
};

/**
 * Permission-based authorization middleware
 * Checks if admin has required permission(s)
 * @param {string|string[]} requiredPermissions - Permission(s) required
 * @param {boolean} requireAll - If true, admin must have ALL permissions (default: false)
 */
const requirePermission = (requiredPermissions, requireAll = false) => {
    return (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin authentication required'
                });
            }
            
            const permissions = Array.isArray(requiredPermissions) 
                ? requiredPermissions 
                : [requiredPermissions];
            
            let hasAccess = false;
            
            if (requireAll) {
                // Admin must have ALL permissions
                hasAccess = permissions.every(permission => 
                    adminRoleService.hasPermission(req.admin, permission)
                );
            } else {
                // Admin must have ANY of the permissions
                hasAccess = adminRoleService.hasAnyPermission(req.admin, permissions);
            }
            
            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions',
                    error: `Required permission(s): ${permissions.join(', ')}`,
                    admin_role: req.admin.role,
                    admin_permissions: req.admin.permissions
                });
            }
            
            next();
            
        } catch (error) {
            console.error('❌ Permission middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization error',
                error: error.message
            });
        }
    };
};

/**
 * Role-based authorization middleware
 * Checks if admin has required role(s)
 * @param {string|string[]} requiredRoles - Role(s) required
 */
const requireRole = (requiredRoles) => {
    return (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Admin authentication required'
                });
            }
            
            const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
            
            if (!roles.includes(req.admin.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient role privileges',
                    error: `Required role(s): ${roles.join(', ')}`,
                    admin_role: req.admin.role
                });
            }
            
            next();
            
        } catch (error) {
            console.error('❌ Role middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Authorization error',
                error: error.message
            });
        }
    };
};

/**
 * Super admin only middleware
 * Only allows super_admin role
 */
const requireSuperAdmin = requireRole('super_admin');

/**
 * Financial operations middleware
 * Requires financial permissions
 */
const requireFinancialAccess = requirePermission([
    'finance.view',
    'finance.deposits',
    'finance.withdrawals',
    'wallet.view'
]);

/**
 * User management middleware
 * Requires user management permissions
 */
const requireUserManagement = requirePermission([
    'users.view',
    'users.edit'
]);

/**
 * System administration middleware
 * Requires system admin permissions
 */
const requireSystemAdmin = requirePermission([
    'system.settings',
    'system.admin_users'
]);

/**
 * Read-only access middleware
 * Allows view permissions only
 */
const requireReadAccess = requirePermission([
    'dashboard.view',
    'users.view',
    'finance.view',
    'wallet.view',
    'transactions.view'
]);

module.exports = {
    authenticateAdmin,
    requirePermission,
    requireRole,
    requireSuperAdmin,
    requireFinancialAccess,
    requireUserManagement,
    requireSystemAdmin,
    requireReadAccess
};

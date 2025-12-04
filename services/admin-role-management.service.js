/**
 * Admin Role Management Service
 * Handle role-based access control for admin dashboard
 */

const { supabase, isSupabaseAvailable } = require('./supabase-client');
const crypto = require('crypto');

class AdminRoleManagementService {
    
    /**
     * Authenticate admin user by API key or session token
     * @param {string} apiKey - Admin API key
     * @param {string} sessionToken - Session token (optional)
     * @returns {Promise<Object>} Admin user with permissions
     */
    async authenticateAdmin(apiKey, sessionToken = null) {
        try {
            let adminUser = null;
            
            // Temporary development bypass - check for production API key
            if (apiKey === 'zimcrowd-admin-f0ed42f52b092b49ecf3eaa070aee9bc') {
                return {
                    success: true,
                    admin: {
                        id: 'dev-admin-1',
                        full_name: 'Development Admin',
                        email: 'admin@zimcrowd.com',
                        role: 'super_admin',
                        is_active: true,
                        permissions: [
                            'dashboard.view', 'users.view', 'users.manage', 'kyc.review', 'kyc.approve',
                            'account.view', 'account.manage', 'loans.view', 'loans.manage', 'loans.approve',
                            'investments.view', 'investments.manage', 'wallet.monitor', 'wallet.manage',
                            'transactions.manual', 'transactions.view', 'admin.manage', 'admin.view',
                            'audit.view', 'reports.view', 'system.manage'
                        ],
                        admin_roles: {
                            role_name: 'super_admin',
                            display_name: 'Super Administrator',
                            permissions: []
                        }
                    }
                };
            }
            
            // Try API key authentication first
            if (apiKey) {
                const { data: apiKeyUser, error: apiKeyError } = await supabase
                    .from('admin_users')
                    .select(`
                        *,
                        admin_roles!inner(
                            role_name,
                            display_name,
                            permissions,
                            admin_role_permissions(
                                admin_permissions(
                                    permission_name,
                                    display_name,
                                    category
                                )
                            )
                        )
                    `)
                    .eq('api_key', apiKey)
                    .eq('is_active', true)
                    .single();
                
                if (!apiKeyError && apiKeyUser) {
                    adminUser = apiKeyUser;
                }
            }
            
            // Try session token authentication if API key failed
            if (!adminUser && sessionToken) {
                const { data: sessionUser, error: sessionError } = await supabase
                    .from('admin_sessions')
                    .select(`
                        *,
                        admin_users!inner(
                            *,
                            admin_roles!inner(
                                role_name,
                                display_name,
                                permissions,
                                admin_role_permissions(
                                    admin_permissions(
                                        permission_name,
                                        display_name,
                                        category
                                    )
                                )
                            )
                        )
                    `)
                    .eq('session_token', sessionToken)
                    .eq('is_active', true)
                    .gt('expires_at', new Date().toISOString())
                    .single();
                
                if (!sessionError && sessionUser) {
                    adminUser = sessionUser.admin_users;
                    
                    // Update last login
                    await supabase
                        .from('admin_users')
                        .update({ last_login_at: new Date().toISOString() })
                        .eq('id', adminUser.id);
                }
            }
            
            if (!adminUser) {
                return {
                    success: false,
                    error: 'Invalid credentials or inactive admin user'
                };
            }
            
            // Build permissions array
            const permissions = this.buildPermissionsArray(adminUser.admin_roles);
            
            return {
                success: true,
                admin: {
                    id: adminUser.id,
                    email: adminUser.admin_email,
                    name: adminUser.admin_name,
                    role: adminUser.admin_roles.role_name,
                    role_display: adminUser.admin_roles.display_name,
                    permissions: permissions,
                    last_login: adminUser.last_login_at
                }
            };
            
        } catch (error) {
            console.error('❌ Admin authentication error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check if admin has specific permission
     * @param {Object} admin - Admin user object
     * @param {string} permission - Permission to check
     * @returns {boolean} Has permission
     */
    hasPermission(admin, permission) {
        if (!admin || !admin.permissions) return false;
        
        // Super admin has all permissions
        if (admin.role === 'super_admin') return true;
        
        // Check if permission exists in admin's permissions array
        return admin.permissions.includes(permission);
    }
    
    /**
     * Check if admin has any of the specified permissions
     * @param {Object} admin - Admin user object
     * @param {string[]} permissions - Array of permissions to check
     * @returns {boolean} Has any permission
     */
    hasAnyPermission(admin, permissions) {
        if (!admin || !permissions || !Array.isArray(permissions)) return false;
        
        return permissions.some(permission => this.hasPermission(admin, permission));
    }
    
    /**
     * Get all admin roles
     * @returns {Promise<Object>} Admin roles
     */
    async getAdminRoles() {
        try {
            const { data: roles, error } = await supabase
                .from('admin_roles')
                .select(`
                    *,
                    admin_role_permissions(
                        admin_permissions(
                            permission_name,
                            display_name,
                            category
                        )
                    )
                `)
                .eq('is_active', true)
                .order('role_name');
            
            if (error) throw error;
            
            // Format roles with permissions
            const formattedRoles = roles.map(role => ({
                id: role.id,
                role_name: role.role_name,
                display_name: role.display_name,
                description: role.description,
                permissions: this.buildPermissionsArray(role),
                created_at: role.created_at
            }));
            
            return {
                success: true,
                data: formattedRoles
            };
            
        } catch (error) {
            console.error('❌ Error getting admin roles:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get all admin users
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Admin users
     */
    async getAdminUsers(filters = {}) {
        try {
            const { role, active, page = 1, limit = 20 } = filters;
            
            let query = supabase
                .from('admin_users')
                .select(`
                    *,
                    admin_roles(
                        role_name,
                        display_name
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (role) {
                query = query.eq('admin_roles.role_name', role);
            }
            
            if (active !== undefined) {
                query = query.eq('is_active', active);
            }
            
            const offset = (page - 1) * limit;
            query = query.range(offset, offset + limit - 1);
            
            const { data: adminUsers, error } = await query;
            
            if (error) throw error;
            
            // Remove sensitive data
            const sanitizedUsers = adminUsers.map(user => ({
                id: user.id,
                email: user.admin_email,
                name: user.admin_name,
                role: user.admin_roles?.role_name,
                role_display: user.admin_roles?.display_name,
                is_active: user.is_active,
                last_login_at: user.last_login_at,
                created_at: user.created_at
            }));
            
            return {
                success: true,
                data: sanitizedUsers
            };
            
        } catch (error) {
            console.error('❌ Error getting admin users:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Create new admin user
     * @param {Object} adminData - Admin user data
     * @param {Object} createdBy - Admin who is creating this user
     * @returns {Promise<Object>} Created admin user
     */
    async createAdminUser(adminData, createdBy) {
        try {
            const { email, name, role_name } = adminData;
            
            // Get role ID
            const { data: role, error: roleError } = await supabase
                .from('admin_roles')
                .select('id')
                .eq('role_name', role_name)
                .eq('is_active', true)
                .single();
            
            if (roleError || !role) {
                throw new Error('Invalid role specified');
            }
            
            // Generate API key
            const apiKey = 'admin-' + crypto.randomBytes(16).toString('hex');
            
            // Create admin user
            const { data: newAdmin, error: createError } = await supabase
                .from('admin_users')
                .insert({
                    admin_email: email,
                    admin_name: name,
                    role_id: role.id,
                    api_key: apiKey,
                    created_by: createdBy.id,
                    is_active: true
                })
                .select(`
                    *,
                    admin_roles(
                        role_name,
                        display_name
                    )
                `)
                .single();
            
            if (createError) throw createError;
            
            return {
                success: true,
                data: {
                    id: newAdmin.id,
                    email: newAdmin.admin_email,
                    name: newAdmin.admin_name,
                    role: newAdmin.admin_roles.role_name,
                    role_display: newAdmin.admin_roles.display_name,
                    api_key: apiKey, // Only returned on creation
                    is_active: newAdmin.is_active,
                    created_at: newAdmin.created_at
                }
            };
            
        } catch (error) {
            console.error('❌ Error creating admin user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Update admin user
     * @param {string} adminId - Admin user ID
     * @param {Object} updateData - Data to update
     * @param {Object} updatedBy - Admin performing the update
     * @returns {Promise<Object>} Updated admin user
     */
    async updateAdminUser(adminId, updateData, updatedBy) {
        try {
            const { name, role_name, is_active } = updateData;
            const updates = {};
            
            if (name) updates.admin_name = name;
            if (is_active !== undefined) updates.is_active = is_active;
            
            // Handle role change
            if (role_name) {
                const { data: role, error: roleError } = await supabase
                    .from('admin_roles')
                    .select('id')
                    .eq('role_name', role_name)
                    .eq('is_active', true)
                    .single();
                
                if (roleError || !role) {
                    throw new Error('Invalid role specified');
                }
                
                updates.role_id = role.id;
            }
            
            updates.updated_at = new Date().toISOString();
            
            const { data: updatedAdmin, error } = await supabase
                .from('admin_users')
                .update(updates)
                .eq('id', adminId)
                .select(`
                    *,
                    admin_roles(
                        role_name,
                        display_name
                    )
                `)
                .single();
            
            if (error) throw error;
            
            return {
                success: true,
                data: {
                    id: updatedAdmin.id,
                    email: updatedAdmin.admin_email,
                    name: updatedAdmin.admin_name,
                    role: updatedAdmin.admin_roles.role_name,
                    role_display: updatedAdmin.admin_roles.display_name,
                    is_active: updatedAdmin.is_active,
                    updated_at: updatedAdmin.updated_at
                }
            };
            
        } catch (error) {
            console.error('❌ Error updating admin user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Generate new API key for admin user
     * @param {string} adminId - Admin user ID
     * @returns {Promise<Object>} New API key
     */
    async regenerateApiKey(adminId) {
        try {
            const newApiKey = 'admin-' + crypto.randomBytes(16).toString('hex');
            
            const { error } = await supabase
                .from('admin_users')
                .update({ 
                    api_key: newApiKey,
                    updated_at: new Date().toISOString()
                })
                .eq('id', adminId);
            
            if (error) throw error;
            
            return {
                success: true,
                data: {
                    api_key: newApiKey
                }
            };
            
        } catch (error) {
            console.error('❌ Error regenerating API key:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Build permissions array from role data
     * @param {Object} role - Role object with permissions
     * @returns {string[]} Array of permission names
     */
    buildPermissionsArray(role) {
        if (!role || !role.admin_role_permissions) return [];
        
        return role.admin_role_permissions.map(rp => 
            rp.admin_permissions.permission_name
        );
    }
    
    /**
     * Get admin activity log
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Admin activity
     */
    async getAdminActivity(filters = {}) {
        try {
            const { admin_id, timeframe = '7d', limit = 50 } = filters;
            
            // Calculate date range
            const now = new Date();
            const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
            const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
            
            let query = supabase
                .from('admin_actions')
                .select('*')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (admin_id) {
                query = query.eq('admin_id', admin_id);
            }
            
            const { data: activities, error } = await query;
            
            if (error) throw error;
            
            return {
                success: true,
                data: activities || []
            };
            
        } catch (error) {
            console.error('❌ Error getting admin activity:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = AdminRoleManagementService;

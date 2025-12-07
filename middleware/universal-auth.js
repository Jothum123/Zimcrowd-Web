const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabase-auth');

/**
 * Universal authentication middleware that supports both:
 * 1. Supabase OAuth tokens (from Google/Facebook login)
 * 2. Backend JWT tokens (from email/phone login)
 */
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const token = authHeader.replace('Bearer ', '');
        
        // Try Supabase authentication first (for OAuth tokens)
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            
            if (user && !error) {
                // Supabase token is valid - get user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                req.user = {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    profile: profile || {},
                    authType: 'supabase'
                };
                
                console.log(`✅ Supabase auth successful for user: ${user.id}`);
                return next();
            }
        } catch (supabaseError) {
            // Supabase auth failed, try backend JWT
            console.log('⚠️ Supabase auth failed, trying backend JWT...');
        }

        // Try backend JWT authentication
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            
            // Get user data from database
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', decoded.userId || decoded.sub || decoded.id)
                .single();
            
            req.user = {
                id: decoded.userId || decoded.sub || decoded.id,
                email: decoded.email,
                phone: decoded.phone,
                profile: profile || {},
                authType: 'jwt'
            };
            
            console.log(`✅ Backend JWT auth successful for user: ${req.user.id}`);
            return next();
        } catch (jwtError) {
            console.error('❌ Backend JWT verification failed:', jwtError.message);
            throw jwtError;
        }

    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work both authenticated and unauthenticated
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided - continue without user
            req.user = null;
            return next();
        }

        // Token provided - try to authenticate
        await authenticateUser(req, res, next);
    } catch (error) {
        // Authentication failed but that's ok for optional auth
        req.user = null;
        next();
    }
};

/**
 * Admin authentication - requires user to be authenticated and have admin role
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        // First authenticate the user
        await authenticateUser(req, res, async () => {
            // Then check if user is admin
            const { data: adminRole } = await supabase
                .from('admin_roles')
                .select('*')
                .eq('user_id', req.user.id)
                .eq('is_active', true)
                .single();
            
            if (!adminRole) {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            }
            
            req.user.adminRole = adminRole;
            next();
        });
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(403).json({
            success: false,
            message: 'Admin authentication failed'
        });
    }
};

module.exports = {
    authenticateUser,
    optionalAuth,
    authenticateAdmin
};

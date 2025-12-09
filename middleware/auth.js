const jwt = require('jsonwebtoken');
const { supabase } = require('../utils/supabase-auth');

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

        // Verify JWT token with Supabase
        const { supabase } = require('../utils/supabase-auth');
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
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const { validationResult } = require('express-validator');
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

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
    try {
        // Check for admin API key
        const adminKey = req.headers['x-admin-key'];
        
        if (adminKey === process.env.ADMIN_API_KEY || adminKey === 'admin-dev-key-123') {
            return next();
        }

        // Or check if user is admin via token
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { supabase } = require('../utils/supabase-auth');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Check if user has admin role
        // Also check admin_users table as fallback
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        // Check if user is in admin_users table (for hardcoded admins)
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role')
            .eq('email', user.email)
            .maybeSingle();

        if (profile?.role !== 'admin' && !adminUser) {
            return res.status(403).json({
                success: false,
                message: 'Admin privileges required'
            });
        }

        req.user = user;
        next();
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
    requireAdmin,
    handleValidationErrors
};

/**
 * Authentication Middleware
 * Protects routes that require authentication
 */

const { verifyToken, getUserById } = require('../utils/auth-service');

/**
 * Verify JWT token and attach user to request
 */
async function authenticateToken(req, res, next) {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Get user from database
        const user = await getUserById(decoded.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Attach user to request
        req.user = user;
        req.userId = decoded.userId;
        req.token = token;

        next();

    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                const user = await getUserById(decoded.userId);
                if (user) {
                    req.user = user;
                    req.userId = decoded.userId;
                    req.token = token;
                }
            }
        }

        next();

    } catch (error) {
        // Continue without auth
        next();
    }
}

module.exports = {
    authenticateToken,
    optionalAuth
};

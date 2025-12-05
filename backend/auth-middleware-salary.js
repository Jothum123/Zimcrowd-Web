/**
 * Authentication and Security Middleware for Salary Verification
 * Provides JWT validation, rate limiting, and security measures
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { supabase } = require('../supabase/client');

/**
 * JWT Authentication Middleware
 * Extracts user ID from JWT token and attaches to request object
 */
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required',
            error: 'TOKEN_MISSING'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token',
                error: 'TOKEN_INVALID'
            });
        }

        // Attach user info to request object
        req.user = {
            id: decoded.userId || decoded.sub,
            email: decoded.email,
            role: decoded.role || 'user'
        };

        console.log(`✅ Authenticated user: ${req.user.id}`);
        next();
    });
};

/**
 * Enhanced authentication with Supabase token validation
 * Supports both JWT and Supabase tokens
 */
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization header required',
                error: 'AUTH_HEADER_MISSING'
            });
        }

        // Try Supabase authentication first
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            try {
                const { data: { user }, error } = await supabase.auth.getUser(token);
                
                if (error || !user) {
                    console.log('Supabase auth failed, trying JWT fallback');
                } else {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        role: 'authenticated'
                    };
                    console.log(`✅ Supabase authenticated user: ${req.user.id}`);
                    return next();
                }
            } catch (supabaseError) {
                console.log('Supabase auth error, trying JWT fallback');
            }
        }

        // Fallback to JWT authentication
        authenticateJWT(req, res, next);
        
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: 'AUTH_ERROR'
        });
    }
};

/**
 * Rate limiting for salary re-verification
 * Prevents abuse of salary verification system
 */
const salaryReverificationLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3, // Limit each IP to 3 salary re-verifications per day
    message: {
        success: false,
        message: 'Too many salary re-verification attempts. Please try again tomorrow.',
        error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use user ID instead of IP for more accurate limiting
        return req.user?.id || req.ip;
    }
});

/**
 * Rate limiting for loan applications
 * Prevents spam applications
 */
const loanApplicationLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each user to 5 loan applications per hour
    message: {
        success: false,
        message: 'Too many loan applications. Please try again later.',
        error: 'RATE_LIMIT_EXCEEDED'
    },
    keyGenerator: (req) => req.user?.id || req.ip
});

/**
 * Database transaction wrapper for atomic operations
 * Ensures data consistency across multiple table updates
 */
const withDatabaseTransaction = async (callback) => {
    const { data, error } = await supabase.rpc('execute_transaction', {
        operations: callback // This would need to be implemented in your database
    });
    
    if (error) {
        throw new Error(`Transaction failed: ${error.message}`);
    }
    
    return data;
};

/**
 * Input validation middleware for salary data
 */
const validateSalaryInput = (req, res, next) => {
    const { verified_net_salary, net_salary } = req.body;
    const salary = verified_net_salary || net_salary;
    
    if (salary !== undefined) {
        // Validate salary is a positive number
        if (typeof salary !== 'number' || isNaN(salary) || salary <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Salary must be a positive number',
                error: 'INVALID_SALARY'
            });
        }
        
        // Validate salary is within reasonable bounds ($50 - $100,000)
        if (salary < 50 || salary > 100000) {
            return res.status(400).json({
                success: false,
                message: 'Salary must be between $50 and $100,000',
                error: 'SALARY_OUT_OF_RANGE'
            });
        }
        
        // Sanitize salary to 2 decimal places
        req.body.sanitized_salary = Math.round(salary * 100) / 100;
    }
    
    next();
};

/**
 * Security headers middleware
 */
const addSecurityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
};

/**
 * Audit logging middleware for salary operations
 */
const auditSalaryOperation = (operation) => {
    return (req, res, next) => {
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log salary operations for audit trail
            if (req.user && res.statusCode < 400) {
                console.log(`AUDIT: ${operation} - User: ${req.user.id} - IP: ${req.ip} - Timestamp: ${new Date().toISOString()}`);
                
                // Store audit log in database (optional)
                supabase
                    .from('audit_logs')
                    .insert({
                        user_id: req.user.id,
                        operation: operation,
                        endpoint: req.path,
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        timestamp: new Date().toISOString(),
                        status_code: res.statusCode
                    })
                    .then(({ error }) => {
                        if (error) {
                            console.error('Audit log error:', error);
                        }
                    });
            }
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Error handling middleware for salary verification routes
 */
const salaryVerificationErrorHandler = (err, req, res, next) => {
    console.error(`Salary verification error for user ${req.user?.id}:`, err);
    
    // Don't expose internal errors to client
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        success: false,
        message: 'Salary verification operation failed',
        error: isDevelopment ? err.message : 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    authenticateUser,
    authenticateJWT,
    salaryReverificationLimit,
    loanApplicationLimit,
    validateSalaryInput,
    addSecurityHeaders,
    auditSalaryOperation,
    salaryVerificationErrorHandler,
    withDatabaseTransaction
};

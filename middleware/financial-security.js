/**
 * Financial Security Middleware
 * Advanced security measures for financial operations
 */

const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const crypto = require('crypto');

console.log('🔒 Loading financial security middleware...');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
    return rateLimit({
        windowMs: windowMs,
        max: max,
        message: {
            success: false,
            message: message,
            retry_after: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req) => {
            return req.user?.id || req.ip;
        }
    });
};

// Financial operation rate limiters
const financialRateLimiters = {
    // Deposit attempts: 10 per hour
    deposit: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        10,
        'Too many deposit attempts. Please try again later.'
    ),

    // Withdrawal attempts: 5 per hour
    withdrawal: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        5,
        'Too many withdrawal attempts. Please try again later.'
    ),

    // Transfer attempts: 20 per hour
    transfer: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        20,
        'Too many transfer attempts. Please try again later.'
    ),

    // Referral code applications: 3 per day
    referral: createRateLimiter(
        24 * 60 * 60 * 1000, // 24 hours
        3,
        'Too many referral code attempts. Please try again tomorrow.'
    ),

    // Transaction status checks: 100 per hour
    statusCheck: createRateLimiter(
        60 * 60 * 1000, // 1 hour
        100,
        'Too many status check requests. Please try again later.'
    )
};

// Financial validation schemas
const financialValidators = {
    deposit: [
        body('amount')
            .isFloat({ min: 1, max: 50000 })
            .withMessage('Deposit amount must be between $1 and $50,000')
            .custom((value) => {
                // Check for suspicious round numbers
                if (value >= 10000 && value % 1000 === 0) {
                    throw new Error('Large round number deposits require additional verification');
                }
                return true;
            }),
        body('currency')
            .isIn(['USD', 'ZWL'])
            .withMessage('Currency must be USD or ZWL'),
        body('paymentMethod')
            .isIn(['ecocash', 'onemoney', 'telecash', 'zipit'])
            .withMessage('Invalid payment method'),
        body('reference')
            .optional()
            .isLength({ min: 3, max: 50 })
            .matches(/^[a-zA-Z0-9\-_]+$/)
            .withMessage('Invalid reference format')
    ],

    withdrawal: [
        body('amount')
            .isFloat({ min: 1, max: 10000 })
            .withMessage('Withdrawal amount must be between $1 and $10,000'),
        body('currency')
            .isIn(['USD', 'ZWL'])
            .withMessage('Currency must be USD or ZWL'),
        body('method')
            .isIn(['bank_transfer', 'mobile_money', 'cash_pickup'])
            .withMessage('Invalid withdrawal method'),
        body('destination')
            .notEmpty()
            .isLength({ min: 5, max: 200 })
            .withMessage('Destination details required (5-200 characters)'),
        body('destination')
            .custom((value, { req }) => {
                // Validate destination format based on method
                const method = req.body.method;
                if (method === 'bank_transfer') {
                    if (!/^\d{10,20}$/.test(value.replace(/\s/g, ''))) {
                        throw new Error('Invalid bank account number format');
                    }
                } else if (method === 'mobile_money') {
                    if (!/^(\+263|0)[7-9]\d{8}$/.test(value.replace(/\s/g, ''))) {
                        throw new Error('Invalid mobile money number format');
                    }
                }
                return true;
            })
    ],

    transfer: [
        body('toUserId')
            .isUUID()
            .withMessage('Valid recipient user ID required'),
        body('amount')
            .isFloat({ min: 0.01, max: 5000 })
            .withMessage('Transfer amount must be between $0.01 and $5,000'),
        body('currency')
            .isIn(['USD', 'ZWL'])
            .withMessage('Currency must be USD or ZWL'),
        body('description')
            .isLength({ min: 3, max: 100 })
            .withMessage('Description required (3-100 characters)')
    ]
};

// Security checks middleware
const securityChecks = {
    // Check for suspicious activity patterns
    async checkSuspiciousActivity(req, res, next) {
        try {
            const userId = req.user.id;
            const now = new Date();
            const oneHourAgo = new Date(now - 60 * 60 * 1000);

            // Check for rapid successive transactions
            const { data: recentTransactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', oneHourAgo.toISOString());

            if (error) throw error;

            if (recentTransactions.length >= 10) {
                return res.status(429).json({
                    success: false,
                    message: 'Suspicious activity detected. Account temporarily restricted.',
                    code: 'SUSPICIOUS_ACTIVITY'
                });
            }

            // Check for unusual amounts
            const { amount } = req.body;
            if (amount && amount >= 10000) {
                // Log high-value transaction attempt
                await supabase
                    .from('security_alerts')
                    .insert({
                        user_id: userId,
                        alert_type: 'high_value_transaction',
                        severity: 'medium',
                        data: {
                            amount: amount,
                            endpoint: req.path,
                            ip_address: req.ip,
                            user_agent: req.get('User-Agent')
                        },
                        created_at: now.toISOString()
                    });
            }

            next();
        } catch (error) {
            console.error('Security check error:', error);
            next(); // Continue on security check errors
        }
    },

    // Verify user identity for high-value operations
    async verifyIdentity(req, res, next) {
        try {
            const userId = req.user.id;
            const { amount } = req.body;

            // Require identity verification for amounts over $1000
            if (amount && amount >= 1000) {
                const { data: user, error } = await supabase
                    .from('users')
                    .select('identity_verified, kyc_status')
                    .eq('id', userId)
                    .single();

                if (error) throw error;

                if (!user.identity_verified || user.kyc_status !== 'approved') {
                    return res.status(403).json({
                        success: false,
                        message: 'Identity verification required for high-value transactions',
                        code: 'IDENTITY_VERIFICATION_REQUIRED',
                        required_actions: ['complete_kyc', 'verify_identity']
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Identity verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Identity verification failed',
                error: error.message
            });
        }
    },

    // Check account status and limits
    async checkAccountLimits(req, res, next) {
        try {
            const userId = req.user.id;
            const { amount, currency } = req.body;

            // Get user account status
            const { data: user, error } = await supabase
                .from('users')
                .select('account_status, account_tier, daily_limits, monthly_limits')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // Check account status
            if (user.account_status === 'suspended') {
                return res.status(403).json({
                    success: false,
                    message: 'Account is suspended. Contact support.',
                    code: 'ACCOUNT_SUSPENDED'
                });
            }

            if (user.account_status === 'restricted') {
                return res.status(403).json({
                    success: false,
                    message: 'Account has restrictions. Limited operations allowed.',
                    code: 'ACCOUNT_RESTRICTED'
                });
            }

            // Check daily limits
            if (amount && user.daily_limits) {
                const today = new Date().toISOString().split('T')[0];
                const { data: todayTransactions, error: dailyError } = await supabase
                    .from('transactions')
                    .select('amount')
                    .eq('user_id', userId)
                    .eq('currency', currency)
                    .gte('created_at', `${today}T00:00:00.000Z`)
                    .eq('status', 'completed');

                if (dailyError) throw dailyError;

                const todayTotal = todayTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
                const dailyLimit = user.daily_limits[currency] || 5000;

                if (todayTotal + amount > dailyLimit) {
                    return res.status(403).json({
                        success: false,
                        message: 'Daily transaction limit exceeded',
                        code: 'DAILY_LIMIT_EXCEEDED',
                        limits: {
                            daily_limit: dailyLimit,
                            used_today: todayTotal,
                            available_today: dailyLimit - todayTotal
                        }
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Account limits check error:', error);
            res.status(500).json({
                success: false,
                message: 'Account limits check failed',
                error: error.message
            });
        }
    },

    // Validate transaction signatures
    validateTransactionSignature(req, res, next) {
        try {
            const signature = req.headers['x-transaction-signature'];
            const timestamp = req.headers['x-timestamp'];
            const nonce = req.headers['x-nonce'];

            if (!signature || !timestamp || !nonce) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing security headers',
                    code: 'MISSING_SECURITY_HEADERS'
                });
            }

            // Check timestamp (must be within 5 minutes)
            const now = Date.now();
            const requestTime = parseInt(timestamp);
            if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
                return res.status(400).json({
                    success: false,
                    message: 'Request timestamp expired',
                    code: 'TIMESTAMP_EXPIRED'
                });
            }

            // Validate signature
            const payload = JSON.stringify(req.body) + timestamp + nonce;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.TRANSACTION_SECRET || 'default-secret')
                .update(payload)
                .digest('hex');

            if (signature !== expectedSignature) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction signature',
                    code: 'INVALID_SIGNATURE'
                });
            }

            next();
        } catch (error) {
            console.error('Signature validation error:', error);
            res.status(400).json({
                success: false,
                message: 'Signature validation failed',
                error: error.message
            });
        }
    },

    // Log financial operations
    async logFinancialOperation(req, res, next) {
        try {
            const userId = req.user?.id;
            const operation = {
                user_id: userId,
                operation_type: req.path.split('/').pop(),
                endpoint: req.path,
                method: req.method,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                request_data: {
                    amount: req.body.amount,
                    currency: req.body.currency,
                    type: req.body.type
                },
                timestamp: new Date().toISOString()
            };

            // Store in audit log
            await supabase
                .from('financial_audit_log')
                .insert(operation);

            next();
        } catch (error) {
            console.error('Audit logging error:', error);
            next(); // Continue on logging errors
        }
    }
};

// Fraud detection middleware
const fraudDetection = {
    // Check for velocity fraud (too many transactions too quickly)
    async checkVelocityFraud(req, res, next) {
        try {
            const userId = req.user.id;
            const { amount } = req.body;
            const now = new Date();
            const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

            // Check transactions in last 5 minutes
            const { data: recentTransactions, error } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .gte('created_at', fiveMinutesAgo.toISOString());

            if (error) throw error;

            const recentTotal = recentTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
            
            // Flag if more than $1000 in 5 minutes
            if (recentTotal + amount > 1000) {
                await supabase
                    .from('fraud_alerts')
                    .insert({
                        user_id: userId,
                        alert_type: 'velocity_fraud',
                        severity: 'high',
                        data: {
                            recent_total: recentTotal,
                            current_amount: amount,
                            time_window: '5_minutes'
                        },
                        created_at: now.toISOString()
                    });

                return res.status(429).json({
                    success: false,
                    message: 'Transaction velocity limit exceeded. Please wait before making another transaction.',
                    code: 'VELOCITY_LIMIT_EXCEEDED'
                });
            }

            next();
        } catch (error) {
            console.error('Velocity fraud check error:', error);
            next(); // Continue on fraud check errors
        }
    },

    // Check for pattern fraud (unusual patterns)
    async checkPatternFraud(req, res, next) {
        try {
            const userId = req.user.id;
            const { amount, currency } = req.body;

            // Get user's transaction history
            const { data: history, error } = await supabase
                .from('transactions')
                .select('amount, currency, created_at')
                .eq('user_id', userId)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (history.length >= 3) {
                // Check for unusual amount patterns
                const amounts = history.map(tx => parseFloat(tx.amount));
                const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
                
                // Flag if current amount is 10x average
                if (amount > avgAmount * 10) {
                    await supabase
                        .from('fraud_alerts')
                        .insert({
                            user_id: userId,
                            alert_type: 'pattern_fraud',
                            severity: 'medium',
                            data: {
                                current_amount: amount,
                                average_amount: avgAmount,
                                multiplier: amount / avgAmount
                            },
                            created_at: new Date().toISOString()
                        });

                    // Don't block, just log for review
                }
            }

            next();
        } catch (error) {
            console.error('Pattern fraud check error:', error);
            next(); // Continue on fraud check errors
        }
    }
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            })),
            code: 'VALIDATION_ERROR'
        });
    }
    next();
};

module.exports = {
    rateLimiters: financialRateLimiters,
    validators: financialValidators,
    securityChecks,
    fraudDetection,
    handleValidationErrors
};

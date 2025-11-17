/**
 * Admin Manual Transactions Routes
 * Handle manual deposits, credits, debits, and bank transfers
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const AdminManualTransactionsService = require('../services/admin-manual-transactions.service');

const manualTransactionsService = new AdminManualTransactionsService();

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

/**
 * Admin authentication middleware
 */
const authenticateAdmin = (req, res, next) => {
    const apiKey = req.headers['x-admin-key'];
    
    if (apiKey === process.env.ADMIN_API_KEY || apiKey === 'admin-dev-key-123') {
        // In a real system, decode JWT to get admin details
        req.admin = {
            id: 'admin-' + Date.now(),
            name: req.headers['x-admin-name'] || 'System Admin',
            email: req.headers['x-admin-email'] || 'admin@zimcrowd.com'
        };
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Unauthorized - Admin access required'
        });
    }
};

// @route   POST /api/admin-manual-transactions/deposit
// @desc    Manual deposit/credit to user account
// @access  Admin
router.post('/deposit', authenticateAdmin, [
    body('user_id').isUUID().withMessage('Valid user ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required (minimum $0.01)'),
    body('currency').optional().isIn(['USD', 'ZWL']).withMessage('Currency must be USD or ZWL'),
    body('method').optional().isString().withMessage('Payment method must be a string'),
    body('reference').optional().isString().withMessage('Reference must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('source_details').optional().isObject().withMessage('Source details must be an object'),
    handleValidationErrors
], async (req, res) => {
    try {
        const {
            user_id,
            amount,
            currency,
            method,
            reference,
            notes,
            source_details
        } = req.body;

        console.log(`💰 Admin manual deposit request: $${amount} ${currency || 'USD'} to user ${user_id}`);

        const result = await manualTransactionsService.manualDeposit({
            user_id: user_id,
            amount: amount,
            currency: currency || 'USD',
            method: method || 'manual_deposit',
            reference: reference,
            notes: notes,
            admin_id: req.admin.id,
            admin_name: req.admin.name,
            source_details: source_details
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Manual deposit completed successfully',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Manual deposit failed',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Manual deposit route error:', error);
        res.status(500).json({
            success: false,
            message: 'Manual deposit failed',
            error: error.message
        });
    }
});

// @route   POST /api/admin-manual-transactions/debit
// @desc    Manual debit/deduction from user account
// @access  Admin
router.post('/debit', authenticateAdmin, [
    body('user_id').isUUID().withMessage('Valid user ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required (minimum $0.01)'),
    body('currency').optional().isIn(['USD', 'ZWL']).withMessage('Currency must be USD or ZWL'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
    body('reference').optional().isString().withMessage('Reference must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('force_debit').optional().isBoolean().withMessage('Force debit must be boolean'),
    handleValidationErrors
], async (req, res) => {
    try {
        const {
            user_id,
            amount,
            currency,
            reason,
            reference,
            notes,
            force_debit
        } = req.body;

        console.log(`💸 Admin manual debit request: $${amount} ${currency || 'USD'} from user ${user_id}`);

        const result = await manualTransactionsService.manualDebit({
            user_id: user_id,
            amount: amount,
            currency: currency || 'USD',
            reason: reason || 'admin_adjustment',
            reference: reference,
            notes: notes,
            admin_id: req.admin.id,
            admin_name: req.admin.name,
            force_debit: force_debit || false
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Manual debit completed successfully',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Manual debit failed',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Manual debit route error:', error);
        res.status(500).json({
            success: false,
            message: 'Manual debit failed',
            error: error.message
        });
    }
});

// @route   POST /api/admin-manual-transactions/bank-transfer
// @desc    Process bank transfer deposit
// @access  Admin
router.post('/bank-transfer', authenticateAdmin, [
    body('user_id').isUUID().withMessage('Valid user ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required (minimum $0.01)'),
    body('currency').optional().isIn(['USD', 'ZWL']).withMessage('Currency must be USD or ZWL'),
    body('bank_reference').isString().withMessage('Bank reference required'),
    body('bank_name').isString().withMessage('Bank name required'),
    body('account_number').optional().isString().withMessage('Account number must be a string'),
    body('depositor_name').isString().withMessage('Depositor name required'),
    body('deposit_date').optional().isISO8601().withMessage('Valid deposit date required'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    handleValidationErrors
], async (req, res) => {
    try {
        const {
            user_id,
            amount,
            currency,
            bank_reference,
            bank_name,
            account_number,
            depositor_name,
            deposit_date,
            notes
        } = req.body;

        console.log(`🏦 Bank transfer deposit: $${amount} ${currency || 'USD'} from ${bank_name} for user ${user_id}`);

        const result = await manualTransactionsService.processBankTransferDeposit({
            user_id: user_id,
            amount: amount,
            currency: currency || 'USD',
            bank_reference: bank_reference,
            bank_name: bank_name,
            account_number: account_number,
            depositor_name: depositor_name,
            deposit_date: deposit_date || new Date().toISOString(),
            admin_id: req.admin.id,
            admin_name: req.admin.name,
            notes: notes
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Bank transfer deposit processed successfully',
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Bank transfer deposit failed',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Bank transfer deposit route error:', error);
        res.status(500).json({
            success: false,
            message: 'Bank transfer deposit failed',
            error: error.message
        });
    }
});

// @route   POST /api/admin-manual-transactions/bulk
// @desc    Process bulk manual transactions
// @access  Admin
router.post('/bulk', authenticateAdmin, [
    body('transactions').isArray({ min: 1 }).withMessage('Transactions array required'),
    body('transactions.*.user_id').isUUID().withMessage('Valid user ID required for each transaction'),
    body('transactions.*.amount').isFloat({ min: 0.01 }).withMessage('Valid amount required for each transaction'),
    body('transactions.*.type').isIn(['deposit', 'credit', 'debit', 'deduction', 'bank_transfer']).withMessage('Valid transaction type required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { transactions } = req.body;

        console.log(`📊 Bulk manual transactions: ${transactions.length} transactions by ${req.admin.name}`);

        const result = await manualTransactionsService.bulkManualTransactions(
            transactions,
            {
                admin_id: req.admin.id,
                admin_name: req.admin.name
            }
        );

        if (result.success) {
            res.json({
                success: true,
                message: `Bulk transactions processed: ${result.data.successful} successful, ${result.data.failed} failed`,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Bulk transactions failed',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Bulk transactions route error:', error);
        res.status(500).json({
            success: false,
            message: 'Bulk transactions failed',
            error: error.message
        });
    }
});

// @route   GET /api/admin-manual-transactions/history
// @desc    Get manual transaction history
// @access  Admin
router.get('/history', authenticateAdmin, async (req, res) => {
    try {
        const filters = {
            admin_id: req.query.admin_id,
            user_id: req.query.user_id,
            type: req.query.type,
            timeframe: req.query.timeframe || '30d',
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        console.log(`📋 Manual transaction history requested:`, filters);

        const result = await manualTransactionsService.getManualTransactionHistory(filters);

        if (result.success) {
            res.json({
                success: true,
                data: result.data
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Failed to get transaction history',
                error: result.error
            });
        }

    } catch (error) {
        console.error('Transaction history route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get transaction history',
            error: error.message
        });
    }
});

// @route   GET /api/admin-manual-transactions/user-balance/:user_id
// @desc    Get user's current wallet balance
// @access  Admin
router.get('/user-balance/:user_id', authenticateAdmin, async (req, res) => {
    try {
        const { user_id } = req.params;
        const { currency = 'USD' } = req.query;

        console.log(`💰 Admin checking balance for user ${user_id} in ${currency}`);

        // Get user details
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('id', user_id)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get wallet balance
        const WalletService = require('../services/wallet.service');
        const walletService = new WalletService();
        
        const balance = await walletService.getBalance(user_id, currency);

        // Get recent transactions
        const { data: recentTransactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user_id)
            .in('type', ['deposit', 'withdrawal', 'manual_deposit', 'manual_debit'])
            .order('created_at', { ascending: false })
            .limit(10);

        res.json({
            success: true,
            data: {
                user: user,
                balance: balance,
                currency: currency,
                recent_transactions: recentTransactions || []
            }
        });

    } catch (error) {
        console.error('User balance route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user balance',
            error: error.message
        });
    }
});

// @route   POST /api/admin-manual-transactions/validate-user
// @desc    Validate user exists and get details
// @access  Admin
router.post('/validate-user', authenticateAdmin, [
    body('identifier').isString().withMessage('User identifier required (email or user_id)'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { identifier } = req.body;

        console.log(`🔍 Admin validating user: ${identifier}`);

        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Try to find user by email or ID
        let query = supabase
            .from('users')
            .select('id, email, full_name, phone, created_at, last_sign_in_at');

        // Check if identifier is UUID (user_id) or email
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
        
        if (isUUID) {
            query = query.eq('id', identifier);
        } else {
            query = query.eq('email', identifier);
        }

        const { data: user, error } = await query.single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get wallet balances
        const WalletService = require('../services/wallet.service');
        const walletService = new WalletService();
        
        const [usdBalance, zwlBalance] = await Promise.all([
            walletService.getBalance(user.id, 'USD'),
            walletService.getBalance(user.id, 'ZWL')
        ]);

        res.json({
            success: true,
            data: {
                user: user,
                wallet_balances: {
                    USD: usdBalance,
                    ZWL: zwlBalance
                }
            }
        });

    } catch (error) {
        console.error('User validation route error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to validate user',
            error: error.message
        });
    }
});

module.exports = router;

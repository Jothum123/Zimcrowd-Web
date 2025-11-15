const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');

const router = express.Router();

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

        // Verify JWT token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Get user from Supabase auth
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

// @route   GET /api/wallet/balance
// @desc    Get user's wallet balance
// @access  Private
router.get('/balance', authenticateUser, async (req, res) => {
    try {
        // Calculate balance from transactions
        // Deposits increase balance, withdrawals decrease balance
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Balance calculation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate balance'
            });
        }

        let balance = 0;
        transactions.forEach(transaction => {
            if (transaction.type === 'deposit') {
                balance += parseFloat(transaction.amount);
            } else if (transaction.type === 'withdrawal') {
                balance -= parseFloat(transaction.amount);
            }
        });

        // Get recent wallet transactions
        const { data: recentTransactions, error: recentError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .in('type', ['deposit', 'withdrawal'])
            .order('created_at', { ascending: false })
            .limit(5);

        res.json({
            success: true,
            data: {
                balance: Math.round(balance * 100) / 100,
                currency: 'USD',
                recent_transactions: recentTransactions || []
            }
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/wallet/transactions
// @desc    Get wallet transaction history
// @access  Private
router.get('/transactions', authenticateUser, async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('transactions')
            .select('*', { count: 'exact' })
            .eq('user_id', req.user.id)
            .in('type', ['deposit', 'withdrawal'])
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type && ['deposit', 'withdrawal'].includes(type)) {
            query = query.eq('type', type);
        }

        const { data: transactions, error, count } = await query;

        if (error) {
            console.error('Wallet transactions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch wallet transactions'
            });
        }

        res.json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get wallet transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/wallet/deposit
// @desc    Deposit money into wallet
// @access  Private
router.post('/deposit', authenticateUser, [
    body('amount')
        .isFloat({ min: 10, max: 10000 })
        .withMessage('Deposit amount must be between $10 and $10,000'),
    body('payment_method')
        .isIn(['bank_transfer', 'credit_card', 'debit_card', 'mobile_money'])
        .withMessage('Please provide a valid payment method'),
    body('reference')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Reference must be less than 100 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, payment_method, reference } = req.body;

        // In a real implementation, this would integrate with a payment gateway
        // For now, we'll simulate the deposit

        // Create deposit transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert({
                user_id: req.user.id,
                type: 'deposit',
                amount: parseFloat(amount),
                description: `Deposit via ${payment_method}${reference ? ` (${reference})` : ''}`
            })
            .select('*')
            .single();

        if (error) {
            console.error('Deposit transaction error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to process deposit'
            });
        }

        // In production, you would:
        // 1. Call payment gateway API
        // 2. Handle payment confirmation
        // 3. Only create transaction after successful payment

        res.status(201).json({
            success: true,
            message: 'Deposit request submitted successfully',
            data: {
                transaction,
                status: 'pending', // Would be 'completed' after payment confirmation
                estimated_completion: '2-5 business days'
            }
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/wallet/withdraw
// @desc    Withdraw money from wallet
// @access  Private
router.post('/withdraw', authenticateUser, [
    body('amount')
        .isFloat({ min: 20, max: 5000 })
        .withMessage('Withdrawal amount must be between $20 and $5,000'),
    body('payment_method')
        .isIn(['bank_transfer', 'mobile_money'])
        .withMessage('Please provide a valid withdrawal method'),
    body('account_details')
        .isObject()
        .withMessage('Account details are required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, payment_method, account_details } = req.body;

        // Check current balance
        const balanceResponse = await fetch(`${req.protocol}://${req.get('host')}/api/wallet/balance`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });

        const balanceData = await balanceResponse.json();

        if (!balanceData.success || balanceData.data.balance < parseFloat(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance'
            });
        }

        // Create withdrawal transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .insert({
                user_id: req.user.id,
                type: 'withdrawal',
                amount: parseFloat(amount),
                description: `Withdrawal to ${payment_method} - ${account_details.account_number || account_details.phone_number}`
            })
            .select('*')
            .single();

        if (error) {
            console.error('Withdrawal transaction error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to process withdrawal'
            });
        }

        // In production, you would:
        // 1. Verify account details
        // 2. Process withdrawal through payment system
        // 3. Update transaction status after completion

        res.status(201).json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            data: {
                transaction,
                status: 'pending',
                estimated_completion: '1-3 business days',
                fees: 5.00 // Example fee
            }
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/wallet/transfer
// @desc    Transfer funds to another user
// @access  Private
router.post('/transfer', authenticateUser, [
    body('recipient_id')
        .notEmpty()
        .withMessage('Recipient ID is required'),
    body('amount')
        .isFloat({ min: 5, max: 5000 })
        .withMessage('Transfer amount must be between $5 and $5,000'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Description must be less than 200 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { recipient_id, amount, description } = req.body;

        // Prevent self-transfer
        if (recipient_id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot transfer to yourself'
            });
        }

        // Verify recipient exists
        const { data: recipient, error: recipientError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', recipient_id)
            .single();

        if (recipientError || !recipient) {
            return res.status(404).json({
                success: false,
                message: 'Recipient not found'
            });
        }

        // Check sender balance
        const { data: senderTransactions } = await supabase
            .from('transactions')
            .select('type, amount')
            .eq('user_id', req.user.id);

        let senderBalance = 0;
        senderTransactions?.forEach(tx => {
            if (tx.type === 'deposit') senderBalance += parseFloat(tx.amount);
            else if (tx.type === 'withdrawal') senderBalance -= parseFloat(tx.amount);
        });

        if (senderBalance < parseFloat(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance'
            });
        }

        // Create withdrawal transaction for sender
        const { data: senderTx, error: senderError } = await supabase
            .from('transactions')
            .insert({
                user_id: req.user.id,
                type: 'withdrawal',
                amount: parseFloat(amount),
                description: `Transfer to ${recipient.first_name} ${recipient.last_name}${description ? ` - ${description}` : ''}`,
                transaction_type: 'transfer_out',
                related_user_id: recipient_id
            })
            .select('*')
            .single();

        if (senderError) {
            console.error('Sender transaction error:', senderError);
            return res.status(500).json({
                success: false,
                message: 'Failed to process transfer'
            });
        }

        // Create deposit transaction for recipient
        const { data: recipientTx, error: recipientTxError } = await supabase
            .from('transactions')
            .insert({
                user_id: recipient_id,
                type: 'deposit',
                amount: parseFloat(amount),
                description: `Transfer from user${description ? ` - ${description}` : ''}`,
                transaction_type: 'transfer_in',
                related_user_id: req.user.id
            })
            .select('*')
            .single();

        if (recipientTxError) {
            console.error('Recipient transaction error:', recipientTxError);
            // Rollback sender transaction
            await supabase
                .from('transactions')
                .delete()
                .eq('id', senderTx.id);

            return res.status(500).json({
                success: false,
                message: 'Failed to complete transfer'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Transfer completed successfully',
            data: {
                sender_transaction: senderTx,
                recipient_transaction: recipientTx,
                recipient: {
                    name: `${recipient.first_name} ${recipient.last_name}`,
                    email: recipient.email
                }
            }
        });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/wallet/stats
// @desc    Get wallet statistics
// @access  Private
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', req.user.id);

        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let totalTransfersIn = 0;
        let totalTransfersOut = 0;

        transactions?.forEach(tx => {
            const amount = parseFloat(tx.amount);
            if (tx.type === 'deposit') {
                if (tx.transaction_type === 'transfer_in') {
                    totalTransfersIn += amount;
                } else {
                    totalDeposits += amount;
                }
            } else if (tx.type === 'withdrawal') {
                if (tx.transaction_type === 'transfer_out') {
                    totalTransfersOut += amount;
                } else {
                    totalWithdrawals += amount;
                }
            }
        });

        const currentBalance = totalDeposits + totalTransfersIn - totalWithdrawals - totalTransfersOut;

        res.json({
            success: true,
            data: {
                current_balance: Math.round(currentBalance * 100) / 100,
                total_deposits: Math.round(totalDeposits * 100) / 100,
                total_withdrawals: Math.round(totalWithdrawals * 100) / 100,
                total_transfers_in: Math.round(totalTransfersIn * 100) / 100,
                total_transfers_out: Math.round(totalTransfersOut * 100) / 100,
                transaction_count: transactions?.length || 0
            }
        });
    } catch (error) {
        console.error('Wallet stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/wallet/payment-methods
// @desc    Get available payment methods
// @access  Public
router.get('/payment-methods', async (req, res) => {
    try {
        const paymentMethods = [
            {
                id: 'bank_transfer',
                name: 'Bank Transfer',
                type: 'deposit',
                min_amount: 50,
                max_amount: 10000,
                processing_time: '1-2 business days',
                fees: 0
            },
            {
                id: 'credit_card',
                name: 'Credit Card',
                type: 'deposit',
                min_amount: 10,
                max_amount: 1000,
                processing_time: 'Instant',
                fees: '2.9%'
            },
            {
                id: 'debit_card',
                name: 'Debit Card',
                type: 'deposit',
                min_amount: 10,
                max_amount: 500,
                processing_time: 'Instant',
                fees: '1.5%'
            },
            {
                id: 'mobile_money',
                name: 'Mobile Money (EcoCash)',
                type: 'both',
                min_amount: 5,
                max_amount: 200,
                processing_time: 'Instant',
                fees: 2
            }
        ];

        res.json({
            success: true,
            data: paymentMethods
        });
    } catch (error) {
        console.error('Get payment methods error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

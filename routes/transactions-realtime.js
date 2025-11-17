/**
 * Real-Time Transaction Endpoints
 * Live transaction monitoring and management
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const { supabase } = require('../utils/supabase-auth');
const WalletService = require('../services/wallet.service');
const NotificationService = require('../services/notification.service');

const walletService = new WalletService();
const notificationService = new NotificationService();

console.log('🔄 Loading real-time transaction routes...');

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

// @route   GET /api/transactions-realtime/dashboard
// @desc    Get real-time transaction dashboard data
// @access  Private
router.get('/dashboard', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const timeframe = req.query.timeframe || '24h'; // 24h, 7d, 30d, 90d

        let timeFilter;
        switch (timeframe) {
            case '24h':
                timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                break;
            case '7d':
                timeFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case '30d':
                timeFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case '90d':
                timeFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
                break;
            default:
                timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        }

        // Get wallet balances
        const walletInfo = await walletService.getWalletInfo(userId);

        // Get recent transactions
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', timeFilter)
            .order('created_at', { ascending: false })
            .limit(50);

        if (transactionsError) throw transactionsError;

        // Get pending transactions
        const { data: pendingTransactions, error: pendingError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['pending', 'pending_approval', 'initiated'])
            .order('created_at', { ascending: false });

        if (pendingError) throw pendingError;

        // Calculate statistics
        const stats = this.calculateTransactionStats(transactions);

        // Get wallet transaction history
        const walletHistory = await walletService.getTransactionHistory(userId, null, 20);

        res.json({
            success: true,
            data: {
                timeframe: timeframe,
                wallet_balances: walletInfo.wallets || [],
                statistics: stats,
                recent_transactions: transactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: parseFloat(tx.amount),
                    currency: tx.currency,
                    status: tx.status,
                    payment_method: tx.payment_method,
                    reference: tx.reference,
                    created_at: tx.created_at,
                    completed_at: tx.completed_at,
                    metadata: tx.metadata
                })),
                pending_transactions: pendingTransactions.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: parseFloat(tx.amount),
                    currency: tx.currency,
                    status: tx.status,
                    reference: tx.reference,
                    created_at: tx.created_at,
                    estimated_completion: this.getEstimatedCompletion(tx)
                })),
                wallet_history: walletHistory.transactions || [],
                last_updated: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard',
            error: error.message
        });
    }
});

// @route   GET /api/transactions-realtime/live/:transactionId
// @desc    Get live transaction status with real-time updates
// @access  Private
router.get('/live/:transactionId', authenticateUser, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;

        // Get transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('user_id', userId)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Get real-time status updates
        const statusUpdates = await this.getTransactionStatusUpdates(transactionId);
        
        // Calculate progress percentage
        const progress = this.calculateTransactionProgress(transaction);

        // Get estimated completion time
        const estimatedCompletion = this.getEstimatedCompletion(transaction);

        // Check for any issues or delays
        const issues = await this.checkTransactionIssues(transaction);

        res.json({
            success: true,
            data: {
                transaction: {
                    id: transaction.id,
                    type: transaction.type,
                    amount: parseFloat(transaction.amount),
                    currency: transaction.currency,
                    status: transaction.status,
                    payment_method: transaction.payment_method,
                    reference: transaction.reference,
                    created_at: transaction.created_at,
                    completed_at: transaction.completed_at,
                    metadata: transaction.metadata
                },
                live_status: {
                    current_status: transaction.status,
                    progress_percentage: progress,
                    estimated_completion: estimatedCompletion,
                    status_updates: statusUpdates,
                    issues: issues,
                    last_checked: new Date().toISOString()
                },
                next_steps: this.getNextSteps(transaction)
            }
        });

    } catch (error) {
        console.error('Live transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get live transaction data',
            error: error.message
        });
    }
});

// @route   POST /api/transactions-realtime/cancel/:transactionId
// @desc    Cancel pending transaction
// @access  Private
router.post('/cancel/:transactionId', authenticateUser, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;

        // Get transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('user_id', userId)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Check if transaction can be cancelled
        const cancellableStatuses = ['pending', 'initiated', 'pending_approval'];
        if (!cancellableStatuses.includes(transaction.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel transaction with status: ${transaction.status}`
            });
        }

        // Cancel transaction
        const { error: cancelError } = await supabase
            .from('transactions')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                metadata: {
                    ...transaction.metadata,
                    cancelled_by: userId,
                    cancellation_reason: 'user_requested'
                }
            })
            .eq('id', transactionId);

        if (cancelError) throw cancelError;

        // Release held funds if applicable
        if (transaction.type === 'withdrawal') {
            try {
                await walletService.releaseFunds(userId, transactionId);
            } catch (releaseError) {
                console.error('Error releasing funds:', releaseError);
            }
        }

        // Send notification
        await notificationService.sendNotification(userId, {
            type: 'transaction_cancelled',
            title: 'Transaction Cancelled',
            message: `Your ${transaction.type} of $${transaction.amount} ${transaction.currency} has been cancelled.`,
            data: {
                transaction_id: transactionId,
                amount: transaction.amount,
                currency: transaction.currency,
                type: transaction.type
            }
        });

        res.json({
            success: true,
            message: 'Transaction cancelled successfully',
            data: {
                transaction_id: transactionId,
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Cancel transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel transaction',
            error: error.message
        });
    }
});

// @route   POST /api/transactions-realtime/retry/:transactionId
// @desc    Retry failed transaction
// @access  Private
router.post('/retry/:transactionId', authenticateUser, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;

        // Get transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('user_id', userId)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Check if transaction can be retried
        if (transaction.status !== 'failed') {
            return res.status(400).json({
                success: false,
                message: 'Only failed transactions can be retried'
            });
        }

        // Check retry limit
        const retryCount = transaction.metadata?.retry_count || 0;
        if (retryCount >= 3) {
            return res.status(400).json({
                success: false,
                message: 'Maximum retry attempts reached'
            });
        }

        // Create new transaction (retry)
        const { data: newTransaction, error: newTransactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                status: 'pending',
                payment_method: transaction.payment_method,
                reference: `${transaction.reference}-R${retryCount + 1}`,
                metadata: {
                    ...transaction.metadata,
                    original_transaction_id: transactionId,
                    retry_count: retryCount + 1,
                    retry_initiated_at: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (newTransactionError) throw newTransactionError;

        // Update original transaction
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                metadata: {
                    ...transaction.metadata,
                    retry_transaction_id: newTransaction.id,
                    retry_initiated_at: new Date().toISOString()
                }
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        // Send notification
        await notificationService.sendNotification(userId, {
            type: 'transaction_retry',
            title: 'Transaction Retry Initiated',
            message: `Your ${transaction.type} of $${transaction.amount} ${transaction.currency} is being retried.`,
            data: {
                original_transaction_id: transactionId,
                new_transaction_id: newTransaction.id,
                retry_count: retryCount + 1
            }
        });

        res.json({
            success: true,
            message: 'Transaction retry initiated',
            data: {
                original_transaction_id: transactionId,
                new_transaction_id: newTransaction.id,
                retry_count: retryCount + 1,
                new_reference: newTransaction.reference
            }
        });

    } catch (error) {
        console.error('Retry transaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retry transaction',
            error: error.message
        });
    }
});

// @route   GET /api/transactions-realtime/admin/monitor
// @desc    Admin real-time transaction monitoring
// @access  Admin
router.get('/admin/monitor', requireAdmin, async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '1h';
        const status = req.query.status || 'all';
        const limit = parseInt(req.query.limit) || 100;

        let timeFilter;
        switch (timeframe) {
            case '1h':
                timeFilter = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                break;
            case '6h':
                timeFilter = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
                break;
            case '24h':
                timeFilter = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                break;
            default:
                timeFilter = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        }

        let query = supabase
            .from('transactions')
            .select(`
                *,
                user:users(email, phone)
            `)
            .gte('created_at', timeFilter)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: transactions, error } = await query;

        if (error) throw error;

        // Get system statistics
        const { data: stats, error: statsError } = await supabase
            .rpc('get_transaction_stats', {
                time_filter: timeFilter
            });

        if (statsError) throw statsError;

        // Get alerts and issues
        const alerts = await this.getSystemAlerts();

        res.json({
            success: true,
            data: {
                timeframe: timeframe,
                total_transactions: transactions.length,
                transactions: transactions.map(tx => ({
                    id: tx.id,
                    user_email: tx.user?.email,
                    type: tx.type,
                    amount: parseFloat(tx.amount),
                    currency: tx.currency,
                    status: tx.status,
                    payment_method: tx.payment_method,
                    reference: tx.reference,
                    created_at: tx.created_at,
                    completed_at: tx.completed_at,
                    processing_time: this.calculateProcessingTime(tx),
                    issues: this.identifyTransactionIssues(tx)
                })),
                statistics: stats?.[0] || {},
                alerts: alerts,
                last_updated: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Admin monitor error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load monitoring data',
            error: error.message
        });
    }
});

// @route   POST /api/transactions-realtime/admin/intervene/:transactionId
// @desc    Admin intervention for stuck transactions
// @access  Admin
router.post('/admin/intervene/:transactionId', requireAdmin, [
    body('action').isIn(['approve', 'reject', 'manual_complete', 'investigate']).withMessage('Invalid action'),
    body('notes').notEmpty().withMessage('Notes are required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { action, notes } = req.body;
        const adminId = req.user.id;

        // Get transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        let newStatus;
        let actionDescription;

        switch (action) {
            case 'approve':
                newStatus = 'approved';
                actionDescription = 'manually approved';
                break;
            case 'reject':
                newStatus = 'rejected';
                actionDescription = 'manually rejected';
                break;
            case 'manual_complete':
                newStatus = 'completed';
                actionDescription = 'manually completed';
                break;
            case 'investigate':
                newStatus = 'under_investigation';
                actionDescription = 'marked for investigation';
                break;
            default:
                throw new Error('Invalid action');
        }

        // Update transaction
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: newStatus,
                admin_intervention: true,
                admin_notes: notes,
                intervened_by: adminId,
                intervened_at: new Date().toISOString(),
                metadata: {
                    ...transaction.metadata,
                    admin_action: action,
                    intervention_reason: notes
                }
            })
            .eq('id', transactionId);

        if (updateError) throw updateError;

        // Process based on action
        if (action === 'approve' && transaction.type === 'withdrawal') {
            await walletService.processWithdrawal(transaction);
        } else if (action === 'reject' && transaction.type === 'withdrawal') {
            await walletService.releaseFunds(transaction.user_id, transactionId);
        } else if (action === 'manual_complete' && transaction.type === 'deposit') {
            await walletService.creditWallet(
                transaction.user_id,
                transaction.amount,
                transaction.currency,
                `Manual deposit completion - ${transaction.reference}`
            );
        }

        // Send notification to user
        await notificationService.sendNotification(transaction.user_id, {
            type: 'admin_intervention',
            title: 'Transaction Update',
            message: `Your transaction has been ${actionDescription} by our support team. ${notes}`,
            data: {
                transaction_id: transactionId,
                action: action,
                notes: notes
            }
        });

        // Log admin action
        await supabase
            .from('admin_actions')
            .insert({
                admin_id: adminId,
                action_type: 'transaction_intervention',
                target_id: transactionId,
                action_data: {
                    action: action,
                    notes: notes,
                    original_status: transaction.status,
                    new_status: newStatus
                },
                created_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: `Transaction ${actionDescription} successfully`,
            data: {
                transaction_id: transactionId,
                action: action,
                new_status: newStatus,
                notes: notes,
                intervened_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Admin intervention error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process intervention',
            error: error.message
        });
    }
});

// Helper methods
router.calculateTransactionStats = function(transactions) {
    const stats = {
        total_count: transactions.length,
        total_volume: 0,
        by_status: {},
        by_type: {},
        by_currency: {},
        success_rate: 0
    };

    transactions.forEach(tx => {
        stats.total_volume += parseFloat(tx.amount);
        
        stats.by_status[tx.status] = (stats.by_status[tx.status] || 0) + 1;
        stats.by_type[tx.type] = (stats.by_type[tx.type] || 0) + 1;
        stats.by_currency[tx.currency] = (stats.by_currency[tx.currency] || 0) + 1;
    });

    const completedCount = stats.by_status['completed'] || 0;
    stats.success_rate = transactions.length > 0 ? (completedCount / transactions.length) * 100 : 0;

    return stats;
};

router.getEstimatedCompletion = function(transaction) {
    const now = new Date();
    const created = new Date(transaction.created_at);
    const elapsed = now - created;

    // Estimated completion times by type and method
    const estimations = {
        deposit: {
            ecocash: 5 * 60 * 1000, // 5 minutes
            onemoney: 10 * 60 * 1000, // 10 minutes
            telecash: 15 * 60 * 1000, // 15 minutes
            zipit: 30 * 60 * 1000 // 30 minutes
        },
        withdrawal: {
            bank_transfer: 24 * 60 * 60 * 1000, // 24 hours
            mobile_money: 2 * 60 * 60 * 1000, // 2 hours
            cash_pickup: 4 * 60 * 60 * 1000 // 4 hours
        }
    };

    const typeEstimations = estimations[transaction.type];
    if (!typeEstimations) return null;

    const methodEstimation = typeEstimations[transaction.payment_method];
    if (!methodEstimation) return null;

    const estimatedCompletion = new Date(created.getTime() + methodEstimation);
    
    return {
        estimated_at: estimatedCompletion.toISOString(),
        remaining_ms: Math.max(0, estimatedCompletion - now),
        is_overdue: now > estimatedCompletion
    };
};

router.calculateTransactionProgress = function(transaction) {
    const statusProgress = {
        pending: 10,
        initiated: 25,
        pending_approval: 50,
        approved: 75,
        completed: 100,
        failed: 0,
        cancelled: 0,
        rejected: 0
    };

    return statusProgress[transaction.status] || 0;
};

router.getTransactionStatusUpdates = async function(transactionId) {
    try {
        const { data, error } = await supabase
            .from('transaction_status_updates')
            .select('*')
            .eq('transaction_id', transactionId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Get status updates error:', error);
        return [];
    }
};

router.checkTransactionIssues = async function(transaction) {
    const issues = [];
    const now = new Date();
    const created = new Date(transaction.created_at);
    const elapsed = now - created;

    // Check for timeout issues
    const timeoutThresholds = {
        deposit: 60 * 60 * 1000, // 1 hour
        withdrawal: 48 * 60 * 60 * 1000 // 48 hours
    };

    const threshold = timeoutThresholds[transaction.type];
    if (threshold && elapsed > threshold && !['completed', 'failed', 'cancelled'].includes(transaction.status)) {
        issues.push({
            type: 'timeout',
            severity: 'high',
            message: 'Transaction is taking longer than expected',
            suggested_action: 'Contact support or retry transaction'
        });
    }

    // Check for payment method issues
    if (transaction.status === 'failed' && transaction.error_message) {
        issues.push({
            type: 'payment_error',
            severity: 'medium',
            message: transaction.error_message,
            suggested_action: 'Try a different payment method'
        });
    }

    return issues;
};

router.getNextSteps = function(transaction) {
    const steps = [];

    switch (transaction.status) {
        case 'pending':
            steps.push('Waiting for payment confirmation');
            break;
        case 'initiated':
            if (transaction.payment_url) {
                steps.push('Complete payment using the provided link');
            }
            break;
        case 'pending_approval':
            steps.push('Transaction is being reviewed by our team');
            break;
        case 'approved':
            steps.push('Transaction approved, processing payment');
            break;
        case 'failed':
            steps.push('Transaction failed, you can retry or contact support');
            break;
        default:
            steps.push('No further action required');
    }

    return steps;
};

router.getSystemAlerts = async function() {
    // This would typically check for system-wide issues
    const alerts = [];

    try {
        // Check for high failure rates
        const { data: recentFailures, error } = await supabase
            .from('transactions')
            .select('id')
            .eq('status', 'failed')
            .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

        if (!error && recentFailures && recentFailures.length > 10) {
            alerts.push({
                type: 'high_failure_rate',
                severity: 'high',
                message: `${recentFailures.length} failed transactions in the last hour`,
                action_required: true
            });
        }

        // Check for stuck transactions
        const { data: stuckTransactions, error: stuckError } = await supabase
            .from('transactions')
            .select('id')
            .in('status', ['pending', 'initiated'])
            .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

        if (!stuckError && stuckTransactions && stuckTransactions.length > 5) {
            alerts.push({
                type: 'stuck_transactions',
                severity: 'medium',
                message: `${stuckTransactions.length} transactions stuck for over 2 hours`,
                action_required: true
            });
        }

    } catch (error) {
        console.error('System alerts error:', error);
    }

    return alerts;
};

router.identifyTransactionIssues = function(transaction) {
    const issues = [];
    const now = new Date();
    const created = new Date(transaction.created_at);
    const elapsed = now - created;

    // Check processing time
    if (elapsed > 60 * 60 * 1000 && transaction.status === 'pending') { // 1 hour
        issues.push('slow_processing');
    }

    if (transaction.metadata?.retry_count > 0) {
        issues.push('retry_attempted');
    }

    if (transaction.admin_intervention) {
        issues.push('admin_intervention');
    }

    return issues;
};

router.calculateProcessingTime = function(transaction) {
    if (!transaction.completed_at) return null;
    
    const created = new Date(transaction.created_at);
    const completed = new Date(transaction.completed_at);
    
    return completed - created; // milliseconds
};

module.exports = router;

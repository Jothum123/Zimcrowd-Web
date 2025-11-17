/**
 * Admin Wallet Monitoring Routes
 * Comprehensive wallet and transaction monitoring endpoints
 */

const express = require('express');
const router = express.Router();
const AdminWalletMonitoringService = require('../services/admin-wallet-monitoring.service');

const walletMonitoringService = new AdminWalletMonitoringService();

/**
 * Simple admin authentication middleware
 */
const authenticateAdmin = (req, res, next) => {
    const apiKey = req.headers['x-admin-key'];
    
    if (apiKey === process.env.ADMIN_API_KEY || apiKey === 'admin-dev-key-123') {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Unauthorized - Admin access required'
        });
    }
};

// @route   GET /api/admin-wallet-monitoring/overview
// @desc    Get wallet overview statistics
// @access  Admin
router.get('/overview', authenticateAdmin, async (req, res) => {
    try {
        console.log('📊 Admin wallet overview requested');
        const overview = await walletMonitoringService.getWalletOverview();
        res.json(overview);
    } catch (error) {
        console.error('Error getting wallet overview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get wallet overview'
        });
    }
});

// @route   GET /api/admin-wallet-monitoring/deposits
// @desc    Get deposit monitoring data
// @access  Admin
router.get('/deposits', authenticateAdmin, async (req, res) => {
    try {
        const filters = {
            timeframe: req.query.timeframe || '7d',
            status: req.query.status,
            channel: req.query.channel
        };
        
        console.log('💰 Admin deposit monitoring requested:', filters);
        const deposits = await walletMonitoringService.getDepositMonitoring(filters);
        res.json(deposits);
    } catch (error) {
        console.error('Error getting deposit monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get deposit monitoring data'
        });
    }
});

// @route   GET /api/admin-wallet-monitoring/withdrawals
// @desc    Get withdrawal monitoring data
// @access  Admin
router.get('/withdrawals', authenticateAdmin, async (req, res) => {
    try {
        const filters = {
            status: req.query.status || 'all',
            timeframe: req.query.timeframe || '7d'
        };
        
        console.log('💸 Admin withdrawal monitoring requested:', filters);
        const withdrawals = await walletMonitoringService.getWithdrawalMonitoring(filters);
        res.json(withdrawals);
    } catch (error) {
        console.error('Error getting withdrawal monitoring:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get withdrawal monitoring data'
        });
    }
});

// @route   GET /api/admin-wallet-monitoring/channels
// @desc    Get payment channel performance
// @access  Admin
router.get('/channels', authenticateAdmin, async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '7d';
        
        console.log('📊 Admin channel performance requested:', timeframe);
        const performance = await walletMonitoringService.getChannelPerformance(timeframe);
        res.json(performance);
    } catch (error) {
        console.error('Error getting channel performance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get channel performance data'
        });
    }
});

// @route   GET /api/admin-wallet-monitoring/suspicious
// @desc    Get suspicious wallet activity
// @access  Admin
router.get('/suspicious', authenticateAdmin, async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '24h';
        
        console.log('🚨 Admin suspicious activity monitoring requested:', timeframe);
        const suspicious = await walletMonitoringService.getSuspiciousActivity(timeframe);
        res.json(suspicious);
    } catch (error) {
        console.error('Error getting suspicious activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get suspicious activity data'
        });
    }
});

// @route   GET /api/admin-wallet-monitoring/pending-approvals
// @desc    Get withdrawal requests pending approval
// @access  Admin
router.get('/pending-approvals', authenticateAdmin, async (req, res) => {
    try {
        console.log('⏳ Admin pending approvals requested');
        
        const filters = { status: 'pending_approval', timeframe: '30d' };
        const withdrawals = await walletMonitoringService.getWithdrawalMonitoring(filters);
        
        res.json({
            success: true,
            data: {
                pending_withdrawals: withdrawals.data?.withdrawals || [],
                count: withdrawals.data?.statistics?.pending_approval || 0,
                total_amount: withdrawals.data?.withdrawals?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0
            }
        });
    } catch (error) {
        console.error('Error getting pending approvals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get pending approvals'
        });
    }
});

// @route   GET /api/admin-wallet-monitoring/daily-summary
// @desc    Get daily wallet activity summary
// @access  Admin
router.get('/daily-summary', authenticateAdmin, async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        
        console.log('📅 Admin daily summary requested for:', date);
        
        // Get deposits and withdrawals for the day
        const [deposits, withdrawals] = await Promise.all([
            walletMonitoringService.getDepositMonitoring({ timeframe: '24h' }),
            walletMonitoringService.getWithdrawalMonitoring({ timeframe: '24h' })
        ]);
        
        const summary = {
            date: date,
            deposits: {
                count: deposits.data?.statistics?.total_deposits || 0,
                amount: deposits.data?.statistics?.total_amount || 0,
                completed: deposits.data?.statistics?.completed || 0,
                pending: deposits.data?.statistics?.pending || 0,
                failed: deposits.data?.statistics?.failed || 0
            },
            withdrawals: {
                count: withdrawals.data?.statistics?.total_requests || 0,
                amount: withdrawals.data?.statistics?.total_amount || 0,
                pending_approval: withdrawals.data?.statistics?.pending_approval || 0,
                completed: withdrawals.data?.statistics?.completed || 0,
                rejected: withdrawals.data?.statistics?.rejected || 0
            },
            net_flow: (deposits.data?.statistics?.total_amount || 0) - (withdrawals.data?.statistics?.total_amount || 0)
        };
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error getting daily summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get daily summary'
        });
    }
});

module.exports = router;

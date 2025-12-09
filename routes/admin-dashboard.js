const express = require('express');
const router = express.Router();
const AdminDashboardService = require('../services/admin-dashboard.service');
const LoanManagementService = require('../services/loan-management.service');
const { requireAdmin } = require('../middleware/auth');

const dashboardService = new AdminDashboardService();
const loanService = new LoanManagementService();

/**
 * Admin authentication middleware
 * Uses the centralized auth middleware that supports both API Key and Bearer Token
 */
const authenticateAdmin = requireAdmin;

/**
 * GET /api/admin-dashboard/overview
 * Get comprehensive dashboard overview
 */
router.get('/overview', authenticateAdmin, async (req, res) => {
    try {
        const overview = await dashboardService.getDashboardOverview();
        res.json(overview);
    } catch (error) {
        console.error('Error getting dashboard overview:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get dashboard overview'
        });
    }
});

/**
 * GET /api/admin-dashboard/users
 * Get users list with filters
 */
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            status: req.query.status,
            search: req.query.search,
            role: req.query.role
        };
        
        const users = await dashboardService.getUsers(filters);
        res.json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get users'
        });
    }
});

/**
 * GET /api/admin-dashboard/loans
 * Get loans list with filters
 */
router.get('/loans', authenticateAdmin, async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20,
            status: req.query.status || 'all',
            loan_type: req.query.loan_type || 'all'
        };
        
        const loans = await dashboardService.getLoans(filters);
        res.json(loans);
    } catch (error) {
        console.error('Error getting loans:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loans'
        });
    }
});

/**
 * GET /api/admin-dashboard/loans/:id
 * Get detailed loan information
 */
router.get('/loans/:id', authenticateAdmin, async (req, res) => {
    try {
        const loanId = req.params.id;
        const loan = await loanService.getLoanDetails(loanId);
        
        if (!loan.success) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }
        
        res.json(loan);
    } catch (error) {
        console.error('Error getting loan details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loan details'
        });
    }
});

/**
 * GET /api/admin-dashboard/loans/:id/schedule
 * Get repayment schedule for a loan
 */
router.get('/loans/:id/schedule', authenticateAdmin, async (req, res) => {
    try {
        const loanId = req.params.id;
        const schedule = await loanService.getLoanSchedule(loanId);
        
        res.json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('Error getting loan schedule:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loan schedule'
        });
    }
});

/**
 * GET /api/admin-dashboard/loans/:id/transactions
 * Get transaction ledger for a loan
 */
router.get('/loans/:id/transactions', authenticateAdmin, async (req, res) => {
    try {
        const loanId = req.params.id;
        const transactions = await loanService.getLoanTransactions(loanId);
        
        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('Error getting loan transactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loan transactions'
        });
    }
});

/**
 * POST /api/admin-dashboard/loans/:id/approve
 * Approve a loan and generate repayment schedule
 */
router.post('/loans/:id/approve', authenticateAdmin, async (req, res) => {
    try {
        const loanId = req.params.id;
        const result = await loanService.approveLoan(loanId);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Failed to approve loan'
            });
        }
        
        res.json({
            success: true,
            message: 'Loan approved successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Error approving loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to approve loan'
        });
    }
});

/**
 * POST /api/admin-dashboard/loans/:id/reject
 * Reject a loan
 */
router.post('/loans/:id/reject', authenticateAdmin, async (req, res) => {
    try {
        const loanId = req.params.id;
        const { reason } = req.body;
        
        const result = await loanService.rejectLoan(loanId, reason);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Failed to reject loan'
            });
        }
        
        res.json({
            success: true,
            message: 'Loan rejected successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Error rejecting loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reject loan'
        });
    }
});

/**
 * POST /api/admin-dashboard/loans/:id/disburse
 * Disburse funds for an approved loan
 */
router.post('/loans/:id/disburse', authenticateAdmin, async (req, res) => {
    try {
        const loanId = req.params.id;
        const result = await loanService.disburseLoan(loanId);
        
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Failed to disburse loan'
            });
        }
        
        res.json({
            success: true,
            message: 'Loan disbursed successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Error disbursing loan:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disburse loan'
        });
    }
});

/**
 * GET /api/admin-dashboard/stats/users
 * Get user statistics
 */
router.get('/stats/users', authenticateAdmin, async (req, res) => {
    try {
        const stats = await dashboardService.getUserStatistics();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting user stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user statistics'
        });
    }
});

/**
 * GET /api/admin-dashboard/stats/loans
 * Get loan statistics
 */
router.get('/stats/loans', authenticateAdmin, async (req, res) => {
    try {
        const stats = await dashboardService.getLoanStatistics();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting loan stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get loan statistics'
        });
    }
});

/**
 * GET /api/admin-dashboard/stats/payments
 * Get payment statistics
 */
router.get('/stats/payments', authenticateAdmin, async (req, res) => {
    try {
        const stats = await dashboardService.getPaymentStatistics();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting payment stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get payment statistics'
        });
    }
});

/**
 * GET /api/admin-dashboard/activity/recent
 * Get recent activity
 */
router.get('/activity/recent', authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const activities = await dashboardService.getRecentActivity(limit);
        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Error getting recent activity:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get recent activity'
        });
    }
});

/**
 * GET /api/admin-dashboard/investments/analytics
 * Get investment analytics
 */
router.get('/investments/analytics', authenticateAdmin, async (req, res) => {
    try {
        const analytics = await dashboardService.getInvestmentAnalytics();
        res.json(analytics);
    } catch (error) {
        console.error('Error getting investment analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get investment analytics'
        });
    }
});

/**
 * POST /api/admin-dashboard/reports/generate
 * Generate platform report
 */
router.post('/reports/generate', authenticateAdmin, async (req, res) => {
    try {
        const { reportType, startDate, endDate, format } = req.body;
        const report = await dashboardService.generateReport({
            reportType,
            startDate,
            endDate,
            format
        });
        res.json(report);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report'
        });
    }
});

/**
 * GET /api/admin-dashboard/reports/generate
 * Generate platform report (GET method for quick access)
 */
router.get('/reports/generate', authenticateAdmin, async (req, res) => {
    try {
        const { reportType, startDate, endDate, format } = req.query;
        const report = await dashboardService.generateReport({
            reportType,
            startDate,
            endDate,
            format
        });
        res.json(report);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report'
        });
    }
});

/**
 * GET /api/admin-dashboard/export/:dataType
 * Export data to CSV/JSON
 */
router.get('/export/:dataType', authenticateAdmin, async (req, res) => {
    try {
        const { dataType } = req.params;
        const filters = req.query;
        const exportData = await dashboardService.exportData(dataType, filters);
        
        if (exportData.success) {
            // Set appropriate headers for download
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${dataType}-export-${Date.now()}.json"`);
        }
        
        res.json(exportData);
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export data'
        });
    }
});

/**
 * GET /api/admin-dashboard/ai/monitoring
 * Get AI system monitoring metrics
 */
router.get('/ai/monitoring', authenticateAdmin, async (req, res) => {
    try {
        const metrics = await dashboardService.getAIMonitoringMetrics();
        res.json(metrics);
    } catch (error) {
        console.error('Error getting AI monitoring metrics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get AI monitoring metrics'
        });
    }
});

module.exports = router;

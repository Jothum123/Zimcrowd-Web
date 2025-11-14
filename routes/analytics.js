const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');
const AnalyticsService = require('../services/analytics.service');

const router = express.Router();
const analyticsService = new AnalyticsService();

// Middleware to check admin access
const authenticateAdmin = async (req, res, next) => {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (profile?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        next();
    } catch (error) {
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

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private
router.get('/dashboard', authenticateUser, async (req, res) => {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        const isAdmin = profile?.role === 'admin';
        const analytics = await analyticsService.getDashboardAnalytics(req.user.id, isAdmin);

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard analytics'
        });
    }
});

// @route   GET /api/analytics/real-time
// @desc    Get real-time metrics
// @access  Admin
router.get('/real-time', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const metrics = await analyticsService.getRealTimeMetrics();

        res.json({
            success: true,
            data: metrics
        });
    } catch (error) {
        console.error('Real-time metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch real-time metrics'
        });
    }
});

// @route   POST /api/analytics/reports/financial
// @desc    Generate financial report
// @access  Admin
router.post('/reports/financial', authenticateUser, authenticateAdmin, [
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
    body('reportType').optional().isIn(['profit_loss', 'cash_flow', 'balance_sheet', 'comprehensive']).withMessage('Invalid report type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { startDate, endDate, reportType = 'comprehensive' } = req.body;

        const report = await analyticsService.generateFinancialReport(startDate, endDate, reportType);

        res.json({
            success: true,
            message: 'Financial report generated successfully',
            data: report
        });
    } catch (error) {
        console.error('Financial report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate financial report'
        });
    }
});

// @route   GET /api/analytics/reports/risk
// @desc    Generate risk analysis report
// @access  Admin
router.get('/reports/risk', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const riskAnalysis = await analyticsService.generateRiskAnalysisReport();

        res.json({
            success: true,
            data: riskAnalysis
        });
    } catch (error) {
        console.error('Risk analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate risk analysis report'
        });
    }
});

// @route   POST /api/analytics/reports/compliance
// @desc    Generate compliance report
// @access  Admin
router.post('/reports/compliance', authenticateUser, authenticateAdmin, [
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        const complianceReport = await analyticsService.generateComplianceReport(startDate, endDate);

        res.json({
            success: true,
            data: complianceReport
        });
    } catch (error) {
        console.error('Compliance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate compliance report'
        });
    }
});

// @route   GET /api/analytics/user/:userId
// @desc    Get user-specific analytics
// @access  Admin or Own User
router.get('/user/:userId', authenticateUser, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Check if user is admin or requesting own data
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();

        if (profile?.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const analytics = await analyticsService.getUserDashboardAnalytics(userId);

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('User analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user analytics'
        });
    }
});

// @route   GET /api/analytics/loans/performance
// @desc    Get loan performance analytics
// @access  Admin
router.get('/loans/performance', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        // Calculate date range based on timeframe
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeframe) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }

        // Get loan performance data
        const { data: loans } = await supabase
            .from('loans')
            .select(`
                id,
                amount,
                status,
                interest_rate,
                zimscore,
                created_at,
                approved_at,
                loan_installments(status, due_date, paid_at)
            `)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        // Calculate performance metrics
        const performance = {
            totalLoans: loans?.length || 0,
            approvedLoans: loans?.filter(l => l.status === 'approved').length || 0,
            rejectedLoans: loans?.filter(l => l.status === 'rejected').length || 0,
            activeLoans: loans?.filter(l => l.status === 'active').length || 0,
            completedLoans: loans?.filter(l => l.status === 'completed').length || 0,
            defaultedLoans: loans?.filter(l => l.status === 'defaulted').length || 0,
            totalValue: loans?.reduce((sum, l) => sum + (l.amount || 0), 0) || 0,
            averageAmount: 0,
            averageInterestRate: 0,
            averageZimScore: 0,
            approvalRate: 0,
            defaultRate: 0,
            onTimePaymentRate: 0
        };

        if (performance.totalLoans > 0) {
            performance.averageAmount = performance.totalValue / performance.totalLoans;
            performance.averageInterestRate = loans.reduce((sum, l) => sum + (l.interest_rate || 0), 0) / performance.totalLoans;
            performance.averageZimScore = loans.reduce((sum, l) => sum + (l.zimscore || 0), 0) / performance.totalLoans;
            performance.approvalRate = (performance.approvedLoans / performance.totalLoans) * 100;
        }

        if (performance.activeLoans > 0) {
            performance.defaultRate = (performance.defaultedLoans / performance.activeLoans) * 100;
        }

        // Calculate on-time payment rate
        const allInstallments = loans?.flatMap(l => l.loan_installments || []) || [];
        const paidInstallments = allInstallments.filter(i => i.status === 'paid');
        const onTimePayments = paidInstallments.filter(i => 
            i.paid_at && i.due_date && new Date(i.paid_at) <= new Date(i.due_date)
        );
        
        if (paidInstallments.length > 0) {
            performance.onTimePaymentRate = (onTimePayments.length / paidInstallments.length) * 100;
        }

        res.json({
            success: true,
            data: {
                timeframe,
                period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
                performance
            }
        });
    } catch (error) {
        console.error('Loan performance analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch loan performance analytics'
        });
    }
});

// @route   GET /api/analytics/investments/performance
// @desc    Get investment performance analytics
// @access  Admin
router.get('/investments/performance', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeframe) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 30);
        }

        // Get investment data
        const { data: investments } = await supabase
            .from('investments')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        // Calculate performance metrics
        const performance = {
            totalInvestments: investments?.length || 0,
            activeInvestments: investments?.filter(i => i.status === 'active').length || 0,
            maturedInvestments: investments?.filter(i => i.status === 'matured').length || 0,
            withdrawnInvestments: investments?.filter(i => i.status === 'withdrawn').length || 0,
            totalValue: investments?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0,
            totalExpectedReturns: investments?.reduce((sum, i) => sum + (i.expected_return || 0), 0) || 0,
            averageAmount: 0,
            averageReturn: 0,
            byType: {}
        };

        if (performance.totalInvestments > 0) {
            performance.averageAmount = performance.totalValue / performance.totalInvestments;
            performance.averageReturn = ((performance.totalExpectedReturns - performance.totalValue) / performance.totalValue) * 100;
        }

        // Group by investment type
        const types = ['peer_lending', 'fixed_deposit', 'equity_fund'];
        types.forEach(type => {
            const typeInvestments = investments?.filter(i => i.investment_type === type) || [];
            performance.byType[type] = {
                count: typeInvestments.length,
                totalValue: typeInvestments.reduce((sum, i) => sum + (i.amount || 0), 0),
                averageReturn: typeInvestments.length > 0 
                    ? typeInvestments.reduce((sum, i) => sum + (i.annual_rate || 0), 0) / typeInvestments.length 
                    : 0
            };
        });

        res.json({
            success: true,
            data: {
                timeframe,
                period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
                performance
            }
        });
    } catch (error) {
        console.error('Investment performance analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch investment performance analytics'
        });
    }
});

// @route   GET /api/analytics/reports/history
// @desc    Get generated reports history
// @access  Admin
router.get('/reports/history', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('generated_reports')
            .select('id, type, period_start, period_end, generated_at, created_at')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (type) {
            query = query.eq('type', type);
        }

        const { data: reports, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            data: reports || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: reports?.length || 0
            }
        });
    } catch (error) {
        console.error('Reports history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports history'
        });
    }
});

// @route   GET /api/analytics/reports/:id
// @desc    Get specific report details
// @access  Admin
router.get('/reports/:id', authenticateUser, authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data: report, error } = await supabase
            .from('generated_reports')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !report) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report'
        });
    }
});

module.exports = router;

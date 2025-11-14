/**
 * Advanced Analytics Service
 * Comprehensive business intelligence and reporting system
 */

const { supabase } = require('../utils/supabase-auth');

class AnalyticsService {
    constructor() {
        this.REPORT_TYPES = {
            FINANCIAL: 'financial',
            USER_ACTIVITY: 'user_activity',
            LOAN_PERFORMANCE: 'loan_performance',
            INVESTMENT_PERFORMANCE: 'investment_performance',
            RISK_ANALYSIS: 'risk_analysis',
            COMPLIANCE: 'compliance'
        };
    }

    /**
     * Generate comprehensive dashboard analytics
     */
    async getDashboardAnalytics(userId, isAdmin = false) {
        try {
            if (isAdmin) {
                return await this.getAdminDashboardAnalytics();
            } else {
                return await this.getUserDashboardAnalytics(userId);
            }
        } catch (error) {
            console.error('Dashboard analytics error:', error);
            throw error;
        }
    }

    /**
     * Admin Dashboard Analytics
     */
    async getAdminDashboardAnalytics() {
        const analytics = {
            overview: {},
            trends: {},
            performance: {},
            risks: {}
        };

        // Platform Overview
        const [
            totalUsers,
            totalLoans,
            totalInvestments,
            totalTransactions
        ] = await Promise.all([
            this.getTotalUsers(),
            this.getTotalLoans(),
            this.getTotalInvestments(),
            this.getTotalTransactions()
        ]);

        analytics.overview = {
            totalUsers: totalUsers.count,
            newUsersThisMonth: totalUsers.newThisMonth,
            totalLoans: totalLoans.count,
            totalLoanValue: totalLoans.totalValue,
            totalInvestments: totalInvestments.count,
            totalInvestmentValue: totalInvestments.totalValue,
            totalTransactions: totalTransactions.count,
            totalTransactionValue: totalTransactions.totalValue,
            platformRevenue: await this.calculatePlatformRevenue(),
            averageZimScore: await this.getAverageZimScore()
        };

        // Growth Trends (last 12 months)
        analytics.trends = {
            userGrowth: await this.getUserGrowthTrend(),
            loanGrowth: await this.getLoanGrowthTrend(),
            investmentGrowth: await this.getInvestmentGrowthTrend(),
            revenueGrowth: await this.getRevenueGrowthTrend()
        };

        // Performance Metrics
        analytics.performance = {
            loanApprovalRate: await this.getLoanApprovalRate(),
            loanDefaultRate: await this.getLoanDefaultRate(),
            averageLoanAmount: await this.getAverageLoanAmount(),
            averageInvestmentReturn: await this.getAverageInvestmentReturn(),
            userRetentionRate: await this.getUserRetentionRate(),
            referralConversionRate: await this.getReferralConversionRate()
        };

        // Risk Analysis
        analytics.risks = {
            highRiskLoans: await this.getHighRiskLoans(),
            overduePayments: await this.getOverduePayments(),
            zimScoreDistribution: await this.getZimScoreDistribution(),
            portfolioRisk: await this.getPortfolioRiskAnalysis()
        };

        return analytics;
    }

    /**
     * User Dashboard Analytics
     */
    async getUserDashboardAnalytics(userId) {
        const analytics = {
            financial: {},
            performance: {},
            trends: {},
            goals: {}
        };

        // Financial Summary
        const [wallet, loans, investments, transactions] = await Promise.all([
            this.getUserWallet(userId),
            this.getUserLoans(userId),
            this.getUserInvestments(userId),
            this.getUserTransactions(userId)
        ]);

        analytics.financial = {
            walletBalance: wallet.balance,
            totalBorrowed: loans.totalBorrowed,
            totalInvested: investments.totalInvested,
            totalReturns: investments.totalReturns,
            netWorth: wallet.balance + investments.currentValue - loans.outstandingBalance,
            monthlyIncome: await this.getUserMonthlyIncome(userId),
            monthlyExpenses: await this.getUserMonthlyExpenses(userId)
        };

        // Performance Metrics
        analytics.performance = {
            zimScore: await this.getUserZimScore(userId),
            paymentHistory: await this.getUserPaymentHistory(userId),
            investmentPerformance: await this.getUserInvestmentPerformance(userId),
            creditUtilization: await this.getUserCreditUtilization(userId)
        };

        // Trends (last 6 months)
        analytics.trends = {
            zimScoreTrend: await this.getUserZimScoreTrend(userId),
            investmentGrowth: await this.getUserInvestmentGrowth(userId),
            spendingPattern: await this.getUserSpendingPattern(userId)
        };

        // Financial Goals
        analytics.goals = await this.getUserFinancialGoals(userId);

        return analytics;
    }

    /**
     * Generate Financial Reports
     */
    async generateFinancialReport(startDate, endDate, reportType = 'comprehensive') {
        const report = {
            period: { startDate, endDate },
            type: reportType,
            generated: new Date().toISOString(),
            data: {}
        };

        switch (reportType) {
            case 'profit_loss':
                report.data = await this.generateProfitLossReport(startDate, endDate);
                break;
            case 'cash_flow':
                report.data = await this.generateCashFlowReport(startDate, endDate);
                break;
            case 'balance_sheet':
                report.data = await this.generateBalanceSheetReport(startDate, endDate);
                break;
            case 'loan_portfolio':
                report.data = await this.generateLoanPortfolioReport(startDate, endDate);
                break;
            case 'investment_portfolio':
                report.data = await this.generateInvestmentPortfolioReport(startDate, endDate);
                break;
            default:
                report.data = await this.generateComprehensiveReport(startDate, endDate);
        }

        // Save report to database
        await this.saveReport(report);

        return report;
    }

    /**
     * Risk Analysis Report
     */
    async generateRiskAnalysisReport() {
        const riskAnalysis = {
            creditRisk: await this.analyzeCreditRisk(),
            marketRisk: await this.analyzeMarketRisk(),
            operationalRisk: await this.analyzeOperationalRisk(),
            liquidityRisk: await this.analyzeLiquidityRisk(),
            concentrationRisk: await this.analyzeConcentrationRisk(),
            recommendations: []
        };

        // Generate risk recommendations
        riskAnalysis.recommendations = await this.generateRiskRecommendations(riskAnalysis);

        return riskAnalysis;
    }

    /**
     * Compliance Report
     */
    async generateComplianceReport(startDate, endDate) {
        const compliance = {
            kycCompliance: await this.getKYCComplianceStats(startDate, endDate),
            amlCompliance: await this.getAMLComplianceStats(startDate, endDate),
            dataProtection: await this.getDataProtectionStats(startDate, endDate),
            financialRegulation: await this.getFinancialRegulationStats(startDate, endDate),
            auditTrail: await this.getAuditTrailStats(startDate, endDate)
        };

        return compliance;
    }

    // Helper Methods for Data Retrieval

    async getTotalUsers() {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { count: newThisMonth } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().setDate(1)).toISOString());

        return { count: count || 0, newThisMonth: newThisMonth || 0 };
    }

    async getTotalLoans() {
        const { data, error } = await supabase
            .from('loans')
            .select('amount');

        if (error) throw error;

        const count = data?.length || 0;
        const totalValue = data?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0;

        return { count, totalValue };
    }

    async getTotalInvestments() {
        const { data, error } = await supabase
            .from('investments')
            .select('amount');

        if (error) throw error;

        const count = data?.length || 0;
        const totalValue = data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

        return { count, totalValue };
    }

    async getTotalTransactions() {
        const { data, error } = await supabase
            .from('transactions')
            .select('amount');

        if (error) throw error;

        const count = data?.length || 0;
        const totalValue = data?.reduce((sum, txn) => sum + Math.abs(txn.amount || 0), 0) || 0;

        return { count, totalValue };
    }

    async calculatePlatformRevenue() {
        // Calculate revenue from fees, interest, etc.
        const { data: feeTransactions } = await supabase
            .from('transactions')
            .select('amount')
            .in('type', ['platform_fee', 'loan_origination_fee', 'late_fee', 'investment_fee']);

        return feeTransactions?.reduce((sum, txn) => sum + (txn.amount || 0), 0) || 0;
    }

    async getAverageZimScore() {
        const { data } = await supabase
            .from('user_zimscores')
            .select('score_value');

        if (!data || data.length === 0) return 0;

        const average = data.reduce((sum, score) => sum + (score.score_value || 0), 0) / data.length;
        return Math.round(average);
    }

    async getUserGrowthTrend() {
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const { count } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', startOfMonth.toISOString())
                .lt('created_at', endOfMonth.toISOString());

            months.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                users: count || 0
            });
        }
        return months;
    }

    async getLoanApprovalRate() {
        const { data: allLoans } = await supabase
            .from('loans')
            .select('status');

        if (!allLoans || allLoans.length === 0) return 0;

        const approvedLoans = allLoans.filter(loan => loan.status === 'approved').length;
        return ((approvedLoans / allLoans.length) * 100).toFixed(2);
    }

    async getLoanDefaultRate() {
        const { data: activeLoans } = await supabase
            .from('loans')
            .select('status')
            .in('status', ['active', 'defaulted']);

        if (!activeLoans || activeLoans.length === 0) return 0;

        const defaultedLoans = activeLoans.filter(loan => loan.status === 'defaulted').length;
        return ((defaultedLoans / activeLoans.length) * 100).toFixed(2);
    }

    async getHighRiskLoans() {
        const { data: loans } = await supabase
            .from('loans')
            .select('id, amount, zimscore, status, user_id, profiles!inner(first_name, last_name)')
            .lt('zimscore', 600)
            .eq('status', 'active')
            .order('zimscore', { ascending: true })
            .limit(10);

        return loans || [];
    }

    async getOverduePayments() {
        const { data: overduePayments } = await supabase
            .from('loan_installments')
            .select(`
                *,
                loans!inner(user_id, amount, profiles!inner(first_name, last_name, email))
            `)
            .eq('status', 'pending')
            .lt('due_date', new Date().toISOString())
            .order('due_date', { ascending: true });

        return overduePayments || [];
    }

    async getZimScoreDistribution() {
        const { data: scores } = await supabase
            .from('user_zimscores')
            .select('score_value');

        const distribution = {
            'Building Credit (30-39)': 0,
            'Very High Risk (40-49)': 0,
            'High Risk (50-59)': 0,
            'Medium Risk (60-69)': 0,
            'Low Risk (70-79)': 0,
            'Very Low Risk (80-85)': 0
        };

        scores?.forEach(score => {
            const value = score.score_value;
            if (value >= 80) distribution['Very Low Risk (80-85)']++;
            else if (value >= 70) distribution['Low Risk (70-79)']++;
            else if (value >= 60) distribution['Medium Risk (60-69)']++;
            else if (value >= 50) distribution['High Risk (50-59)']++;
            else if (value >= 40) distribution['Very High Risk (40-49)']++;
            else distribution['Building Credit (30-39)']++;
        });

        return distribution;
    }

    async saveReport(report) {
        const { error } = await supabase
            .from('generated_reports')
            .insert({
                type: report.type,
                period_start: report.period.startDate,
                period_end: report.period.endDate,
                data: report.data,
                generated_at: report.generated,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Save report error:', error);
        }
    }

    /**
     * Real-time Analytics Dashboard
     */
    async getRealTimeMetrics() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const metrics = {
            today: {
                newUsers: await this.getNewUsersCount(today),
                newLoans: await this.getNewLoansCount(today),
                newInvestments: await this.getNewInvestmentsCount(today),
                transactions: await this.getTransactionsCount(today),
                revenue: await this.getRevenueAmount(today)
            },
            thisWeek: {
                newUsers: await this.getNewUsersCount(thisWeek),
                newLoans: await this.getNewLoansCount(thisWeek),
                newInvestments: await this.getNewInvestmentsCount(thisWeek),
                transactions: await this.getTransactionsCount(thisWeek),
                revenue: await this.getRevenueAmount(thisWeek)
            },
            thisMonth: {
                newUsers: await this.getNewUsersCount(thisMonth),
                newLoans: await this.getNewLoansCount(thisMonth),
                newInvestments: await this.getNewInvestmentsCount(thisMonth),
                transactions: await this.getTransactionsCount(thisMonth),
                revenue: await this.getRevenueAmount(thisMonth)
            }
        };

        return metrics;
    }

    async getNewUsersCount(since) {
        const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', since.toISOString());

        return count || 0;
    }

    async getNewLoansCount(since) {
        const { count } = await supabase
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', since.toISOString());

        return count || 0;
    }

    async getNewInvestmentsCount(since) {
        const { count } = await supabase
            .from('investments')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', since.toISOString());

        return count || 0;
    }

    async getTransactionsCount(since) {
        const { count } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', since.toISOString());

        return count || 0;
    }

    async getRevenueAmount(since) {
        const { data } = await supabase
            .from('transactions')
            .select('amount')
            .in('type', ['platform_fee', 'loan_origination_fee', 'late_fee', 'investment_fee'])
            .gte('created_at', since.toISOString());

        return data?.reduce((sum, txn) => sum + (txn.amount || 0), 0) || 0;
    }
}

module.exports = AnalyticsService;

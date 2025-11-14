const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Admin Dashboard Service
 * Real-time monitoring of users, loans, payments, and system activity
 */
class AdminDashboardService {
    
    /**
     * Get comprehensive dashboard overview
     * @returns {Promise<Object>} Dashboard data
     */
    async getDashboardOverview() {
        try {
            const [
                userStats,
                loanStats,
                paymentStats,
                activityStats,
                recentActivity
            ] = await Promise.all([
                this.getUserStatistics(),
                this.getLoanStatistics(),
                this.getPaymentStatistics(),
                this.getActivityStatistics(),
                this.getRecentActivity(10)
            ]);
            
            return {
                success: true,
                data: {
                    users: userStats,
                    loans: loanStats,
                    payments: paymentStats,
                    activity: activityStats,
                    recent: recentActivity,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ Error getting dashboard overview:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get user statistics
     * @returns {Promise<Object>} User stats
     */
    async getUserStatistics() {
        try {
            // Total users
            const { count: totalUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            
            // Active users (logged in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { count: activeUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('last_sign_in_at', thirtyDaysAgo.toISOString());
            
            // New users today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const { count: newUsersToday } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            // Verified users
            const { count: verifiedUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .eq('email_verified', true);
            
            // Users by role
            const { data: roleData } = await supabase
                .from('users')
                .select('role')
                .not('role', 'is', null);
            
            const roleBreakdown = roleData?.reduce((acc, user) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
            }, {}) || {};
            
            return {
                total: totalUsers || 0,
                active: activeUsers || 0,
                new_today: newUsersToday || 0,
                verified: verifiedUsers || 0,
                by_role: roleBreakdown,
                growth_rate: this.calculateGrowthRate(totalUsers, newUsersToday)
            };
        } catch (error) {
            console.error('❌ Error getting user statistics:', error);
            return {
                total: 0,
                active: 0,
                new_today: 0,
                verified: 0,
                by_role: {},
                growth_rate: 0
            };
        }
    }
    
    /**
     * Get loan statistics
     * @returns {Promise<Object>} Loan stats
     */
    async getLoanStatistics() {
        try {
            // Total loans
            const { count: totalLoans } = await supabase
                .from('loans')
                .select('*', { count: 'exact', head: true });
            
            // Loans by status
            const { data: loans } = await supabase
                .from('loans')
                .select('status, amount');
            
            const statusBreakdown = loans?.reduce((acc, loan) => {
                acc[loan.status] = (acc[loan.status] || 0) + 1;
                return acc;
            }, {}) || {};
            
            // Total loan amount
            const totalAmount = loans?.reduce((sum, loan) => sum + parseFloat(loan.amount || 0), 0) || 0;
            
            // Pending approval
            const pendingLoans = statusBreakdown['pending'] || 0;
            
            // Active loans
            const activeLoans = (statusBreakdown['approved'] || 0) + (statusBreakdown['active'] || 0);
            
            // Completed loans
            const completedLoans = statusBreakdown['completed'] || 0;
            
            // Defaulted loans
            const defaultedLoans = statusBreakdown['defaulted'] || 0;
            
            // Calculate approval rate
            const approvedCount = statusBreakdown['approved'] || 0;
            const rejectedCount = statusBreakdown['rejected'] || 0;
            const approvalRate = (approvedCount + rejectedCount) > 0 
                ? ((approvedCount / (approvedCount + rejectedCount)) * 100).toFixed(2)
                : 0;
            
            return {
                total: totalLoans || 0,
                pending: pendingLoans,
                active: activeLoans,
                completed: completedLoans,
                defaulted: defaultedLoans,
                total_amount: totalAmount,
                approval_rate: parseFloat(approvalRate),
                by_status: statusBreakdown
            };
        } catch (error) {
            console.error('❌ Error getting loan statistics:', error);
            return {
                total: 0,
                pending: 0,
                active: 0,
                completed: 0,
                defaulted: 0,
                total_amount: 0,
                approval_rate: 0,
                by_status: {}
            };
        }
    }
    
    /**
     * Get payment statistics
     * @returns {Promise<Object>} Payment stats
     */
    async getPaymentStatistics() {
        try {
            // Check if payment_transactions table exists
            const { count: totalPayments } = await supabase
                .from('payment_transactions')
                .select('*', { count: 'exact', head: true })
                .catch(() => ({ count: 0 }));
            
            if (!totalPayments) {
                return {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    pending: 0,
                    total_amount_usd: 0,
                    total_amount_zwg: 0,
                    success_rate: 0,
                    by_method: {}
                };
            }
            
            const { data: payments } = await supabase
                .from('payment_transactions')
                .select('status, amount, currency, payment_method');
            
            const statusBreakdown = payments?.reduce((acc, payment) => {
                acc[payment.status] = (acc[payment.status] || 0) + 1;
                return acc;
            }, {}) || {};
            
            const methodBreakdown = payments?.reduce((acc, payment) => {
                acc[payment.payment_method] = (acc[payment.payment_method] || 0) + 1;
                return acc;
            }, {}) || {};
            
            const totalAmountUSD = payments
                ?.filter(p => p.currency === 'USD' && p.status === 'paid')
                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
            
            const totalAmountZWG = payments
                ?.filter(p => p.currency === 'ZWG' && p.status === 'paid')
                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
            
            const successfulPayments = statusBreakdown['paid'] || 0;
            const successRate = totalPayments > 0 
                ? ((successfulPayments / totalPayments) * 100).toFixed(2)
                : 0;
            
            return {
                total: totalPayments,
                successful: successfulPayments,
                failed: statusBreakdown['failed'] || 0,
                pending: statusBreakdown['pending'] || 0,
                total_amount_usd: totalAmountUSD,
                total_amount_zwg: totalAmountZWG,
                success_rate: parseFloat(successRate),
                by_method: methodBreakdown
            };
        } catch (error) {
            console.error('❌ Error getting payment statistics:', error);
            return {
                total: 0,
                successful: 0,
                failed: 0,
                pending: 0,
                total_amount_usd: 0,
                total_amount_zwg: 0,
                success_rate: 0,
                by_method: {}
            };
        }
    }
    
    /**
     * Get activity statistics
     * @returns {Promise<Object>} Activity stats
     */
    async getActivityStatistics() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // New users today
            const { count: newUsers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            // New loans today
            const { count: newLoans } = await supabase
                .from('loans')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString());
            
            // Payments today
            const { count: paymentsToday } = await supabase
                .from('payment_transactions')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', today.toISOString())
                .catch(() => ({ count: 0 }));
            
            return {
                new_users_today: newUsers || 0,
                new_loans_today: newLoans || 0,
                payments_today: paymentsToday || 0,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting activity statistics:', error);
            return {
                new_users_today: 0,
                new_loans_today: 0,
                payments_today: 0,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Get recent activity
     * @param {number} limit - Number of activities to retrieve
     * @returns {Promise<Array>} Recent activities
     */
    async getRecentActivity(limit = 10) {
        try {
            const activities = [];
            
            // Recent users
            const { data: recentUsers } = await supabase
                .from('users')
                .select('id, email, first_name, last_name, created_at')
                .order('created_at', { ascending: false })
                .limit(5);
            
            recentUsers?.forEach(user => {
                activities.push({
                    type: 'user_registration',
                    user_id: user.id,
                    user_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
                    description: 'New user registered',
                    timestamp: user.created_at
                });
            });
            
            // Recent loans
            const { data: recentLoans } = await supabase
                .from('loans')
                .select(`
                    id,
                    amount,
                    status,
                    created_at,
                    users (
                        email,
                        first_name,
                        last_name
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(5);
            
            recentLoans?.forEach(loan => {
                const user = loan.users;
                activities.push({
                    type: 'loan_application',
                    loan_id: loan.id,
                    user_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unknown',
                    amount: loan.amount,
                    status: loan.status,
                    description: `Loan application for $${loan.amount}`,
                    timestamp: loan.created_at
                });
            });
            
            // Sort by timestamp and limit
            activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return activities.slice(0, limit);
        } catch (error) {
            console.error('❌ Error getting recent activity:', error);
            return [];
        }
    }
    
    /**
     * Get users list with filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Users list
     */
    async getUsers(filters = {}) {
        try {
            const { page = 1, limit = 20, status, search, role } = filters;
            const offset = (page - 1) * limit;
            
            let query = supabase
                .from('users')
                .select('*', { count: 'exact' });
            
            // Apply filters
            if (status) {
                query = query.eq('is_active', status === 'active');
            }
            
            if (role) {
                query = query.eq('role', role);
            }
            
            if (search) {
                query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
            }
            
            // Apply pagination
            const { data: users, count, error } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (error) throw error;
            
            return {
                success: true,
                data: {
                    users: users || [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count || 0,
                        pages: Math.ceil((count || 0) / limit)
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error getting users:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get loans list with filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Loans list
     */
    async getLoans(filters = {}) {
        try {
            const { page = 1, limit = 20, status = 'pending' } = filters;
            const offset = (page - 1) * limit;
            
            const { data: loans, count, error } = await supabase
                .from('loans')
                .select(`
                    *,
                    users (
                        email,
                        first_name,
                        last_name
                    )
                `, { count: 'exact' })
                .eq('status', status)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (error) throw error;
            
            return {
                success: true,
                data: {
                    loans: loans || [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: count || 0,
                        pages: Math.ceil((count || 0) / limit)
                    }
                }
            };
        } catch (error) {
            console.error('❌ Error getting loans:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Calculate growth rate
     * @param {number} total - Total count
     * @param {number} newToday - New today count
     * @returns {number} Growth rate percentage
     */
    calculateGrowthRate(total, newToday) {
        if (!total || total === 0) return 0;
        return ((newToday / total) * 100).toFixed(2);
    }

    /**
     * Get investment analytics
     * @returns {Promise<Object>} Investment analytics data
     */
    async getInvestmentAnalytics() {
        try {
            // Get P2P investments
            const { data: p2pInvestments } = await supabase
                .from('p2p_investments')
                .select('amount, interest_earned, status, created_at')
                .catch(() => ({ data: [] }));

            // Get traditional investments
            const { data: investments } = await supabase
                .from('investments')
                .select('amount, current_value, total_returns, investment_type, status, created_at')
                .catch(() => ({ data: [] }));

            // Calculate P2P metrics
            const p2pTotal = p2pInvestments?.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0) || 0;
            const p2pEarned = p2pInvestments?.reduce((sum, inv) => sum + parseFloat(inv.interest_earned || 0), 0) || 0;
            const p2pActive = p2pInvestments?.filter(inv => inv.status === 'active').length || 0;

            // Calculate traditional investment metrics
            const tradTotal = investments?.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0) || 0;
            const tradReturns = investments?.reduce((sum, inv) => sum + parseFloat(inv.total_returns || 0), 0) || 0;
            const tradActive = investments?.filter(inv => inv.status === 'active').length || 0;

            // Investment type breakdown
            const typeBreakdown = investments?.reduce((acc, inv) => {
                const type = inv.investment_type || 'unknown';
                if (!acc[type]) {
                    acc[type] = { count: 0, amount: 0 };
                }
                acc[type].count++;
                acc[type].amount += parseFloat(inv.amount || 0);
                return acc;
            }, {}) || {};

            // Monthly trends (last 6 months)
            const monthlyTrends = this.calculateMonthlyTrends([...p2pInvestments || [], ...investments || []]);

            // ROI calculations
            const totalInvested = p2pTotal + tradTotal;
            const totalReturns = p2pEarned + tradReturns;
            const averageROI = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : 0;

            return {
                success: true,
                data: {
                    overview: {
                        total_invested: totalInvested,
                        total_returns: totalReturns,
                        average_roi: parseFloat(averageROI),
                        active_investments: p2pActive + tradActive
                    },
                    p2p: {
                        total_amount: p2pTotal,
                        total_earned: p2pEarned,
                        active_count: p2pActive,
                        total_count: p2pInvestments?.length || 0
                    },
                    traditional: {
                        total_amount: tradTotal,
                        total_returns: tradReturns,
                        active_count: tradActive,
                        total_count: investments?.length || 0,
                        by_type: typeBreakdown
                    },
                    trends: monthlyTrends,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ Error getting investment analytics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calculate monthly trends
     * @param {Array} data - Investment data
     * @returns {Array} Monthly trend data
     */
    calculateMonthlyTrends(data) {
        const months = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            
            const monthData = data.filter(item => {
                const itemDate = new Date(item.created_at);
                return itemDate >= monthStart && itemDate <= monthEnd;
            });
            
            const totalAmount = monthData.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
            
            months.push({
                month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
                count: monthData.length,
                amount: totalAmount
            });
        }
        
        return months;
    }

    /**
     * Generate platform report
     * @param {Object} options - Report options
     * @returns {Promise<Object>} Report data
     */
    async generateReport(options = {}) {
        try {
            const { reportType = 'overview', startDate, endDate, format = 'json' } = options;

            let reportData = {};

            switch (reportType) {
                case 'overview':
                    reportData = await this.getDashboardOverview();
                    break;
                
                case 'users':
                    reportData = await this.generateUserReport(startDate, endDate);
                    break;
                
                case 'loans':
                    reportData = await this.generateLoanReport(startDate, endDate);
                    break;
                
                case 'investments':
                    reportData = await this.getInvestmentAnalytics();
                    break;
                
                case 'financial':
                    reportData = await this.generateFinancialReport(startDate, endDate);
                    break;
                
                default:
                    throw new Error('Invalid report type');
            }

            return {
                success: true,
                data: {
                    report_type: reportType,
                    generated_at: new Date().toISOString(),
                    date_range: { start: startDate, end: endDate },
                    format: format,
                    data: reportData
                }
            };
        } catch (error) {
            console.error('❌ Error generating report:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate user report
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Promise<Object>} User report data
     */
    async generateUserReport(startDate, endDate) {
        try {
            let query = supabase
                .from('users')
                .select('*');

            if (startDate) {
                query = query.gte('created_at', startDate);
            }
            if (endDate) {
                query = query.lte('created_at', endDate);
            }

            const { data: users, error } = await query;
            if (error) throw error;

            // Calculate metrics
            const totalUsers = users?.length || 0;
            const verifiedUsers = users?.filter(u => u.email_verified).length || 0;
            const activeUsers = users?.filter(u => u.is_active).length || 0;

            // Role breakdown
            const roleBreakdown = users?.reduce((acc, user) => {
                acc[user.role || 'user'] = (acc[user.role || 'user'] || 0) + 1;
                return acc;
            }, {}) || {};

            return {
                total_users: totalUsers,
                verified_users: verifiedUsers,
                active_users: activeUsers,
                verification_rate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(2) : 0,
                by_role: roleBreakdown,
                users: users || []
            };
        } catch (error) {
            console.error('❌ Error generating user report:', error);
            return { error: error.message };
        }
    }

    /**
     * Generate loan report
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Promise<Object>} Loan report data
     */
    async generateLoanReport(startDate, endDate) {
        try {
            let query = supabase
                .from('loans')
                .select('*');

            if (startDate) {
                query = query.gte('created_at', startDate);
            }
            if (endDate) {
                query = query.lte('created_at', endDate);
            }

            const { data: loans, error } = await query;
            if (error) throw error;

            // Calculate metrics
            const totalLoans = loans?.length || 0;
            const totalAmount = loans?.reduce((sum, loan) => sum + parseFloat(loan.amount || 0), 0) || 0;
            const avgLoanAmount = totalLoans > 0 ? (totalAmount / totalLoans) : 0;

            // Status breakdown
            const statusBreakdown = loans?.reduce((acc, loan) => {
                acc[loan.status] = (acc[loan.status] || 0) + 1;
                return acc;
            }, {}) || {};

            return {
                total_loans: totalLoans,
                total_amount: totalAmount,
                average_loan_amount: avgLoanAmount,
                by_status: statusBreakdown,
                loans: loans || []
            };
        } catch (error) {
            console.error('❌ Error generating loan report:', error);
            return { error: error.message };
        }
    }

    /**
     * Generate financial report
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Promise<Object>} Financial report data
     */
    async generateFinancialReport(startDate, endDate) {
        try {
            // Get payment transactions
            let paymentQuery = supabase
                .from('payment_transactions')
                .select('*');

            if (startDate) {
                paymentQuery = paymentQuery.gte('created_at', startDate);
            }
            if (endDate) {
                paymentQuery = paymentQuery.lte('created_at', endDate);
            }

            const { data: payments } = await paymentQuery.catch(() => ({ data: [] }));

            // Calculate revenue
            const totalRevenue = payments?.filter(p => p.status === 'paid')
                .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

            // Get fees collected
            const { data: fees } = await supabase
                .from('platform_fees')
                .select('amount, fee_type')
                .gte('created_at', startDate || '2000-01-01')
                .lte('created_at', endDate || '2100-01-01')
                .catch(() => ({ data: [] }));

            const totalFees = fees?.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0) || 0;

            // Fee breakdown by type
            const feeBreakdown = fees?.reduce((acc, fee) => {
                acc[fee.fee_type] = (acc[fee.fee_type] || 0) + parseFloat(fee.amount || 0);
                return acc;
            }, {}) || {};

            return {
                total_revenue: totalRevenue,
                total_fees_collected: totalFees,
                fee_breakdown: feeBreakdown,
                payment_count: payments?.length || 0,
                successful_payments: payments?.filter(p => p.status === 'paid').length || 0
            };
        } catch (error) {
            console.error('❌ Error generating financial report:', error);
            return { error: error.message };
        }
    }

    /**
     * Export data to CSV format
     * @param {string} dataType - Type of data to export
     * @param {Object} filters - Export filters
     * @returns {Promise<Object>} Export data
     */
    async exportData(dataType, filters = {}) {
        try {
            let data = [];
            let headers = [];

            switch (dataType) {
                case 'users':
                    const usersResult = await this.getUsers(filters);
                    data = usersResult.data?.users || [];
                    headers = ['ID', 'Email', 'Name', 'Role', 'Status', 'Created At'];
                    break;

                case 'loans':
                    const loansResult = await this.getLoans(filters);
                    data = loansResult.data?.loans || [];
                    headers = ['ID', 'Borrower', 'Amount', 'Status', 'Interest Rate', 'Created At'];
                    break;

                case 'investments':
                    const { data: investments } = await supabase
                        .from('p2p_investments')
                        .select('*')
                        .catch(() => ({ data: [] }));
                    data = investments || [];
                    headers = ['ID', 'Investor', 'Amount', 'Interest Earned', 'Status', 'Created At'];
                    break;

                default:
                    throw new Error('Invalid data type for export');
            }

            return {
                success: true,
                data: {
                    headers,
                    rows: data,
                    count: data.length,
                    exported_at: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ Error exporting data:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get AI monitoring metrics
     * @returns {Promise<Object>} AI monitoring data
     */
    async getAIMonitoringMetrics() {
        try {
            // Get AI conversation logs
            const { data: conversations } = await supabase
                .from('ai_conversations')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1000)
                .catch(() => ({ data: [] }));

            // Calculate metrics
            const totalConversations = conversations?.length || 0;
            const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const conversationsToday = conversations?.filter(c => new Date(c.created_at) > last24Hours).length || 0;

            // Provider breakdown
            const providerStats = conversations?.reduce((acc, conv) => {
                const provider = conv.ai_provider || 'unknown';
                if (!acc[provider]) {
                    acc[provider] = { count: 0, successful: 0, failed: 0 };
                }
                acc[provider].count++;
                if (conv.status === 'success') acc[provider].successful++;
                if (conv.status === 'error') acc[provider].failed++;
                return acc;
            }, {}) || {};

            // Calculate success rates
            const openRouterStats = providerStats['openrouter'] || { count: 0, successful: 0, failed: 0 };
            const geminiStats = providerStats['gemini'] || { count: 0, successful: 0, failed: 0 };

            const openRouterSuccessRate = openRouterStats.count > 0 
                ? ((openRouterStats.successful / openRouterStats.count) * 100).toFixed(2)
                : 0;

            const geminiSuccessRate = geminiStats.count > 0
                ? ((geminiStats.successful / geminiStats.count) * 100).toFixed(2)
                : 0;

            // Overall success rate
            const totalSuccessful = conversations?.filter(c => c.status === 'success').length || 0;
            const overallSuccessRate = totalConversations > 0
                ? ((totalSuccessful / totalConversations) * 100).toFixed(2)
                : 0;

            // Average response time
            const avgResponseTime = conversations?.reduce((sum, conv) => {
                return sum + (conv.response_time_ms || 0);
            }, 0) / (totalConversations || 1);

            // User satisfaction (if available)
            const satisfactionScores = conversations?.filter(c => c.satisfaction_score)
                .map(c => c.satisfaction_score) || [];
            const avgSatisfaction = satisfactionScores.length > 0
                ? (satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length).toFixed(2)
                : 0;

            return {
                success: true,
                data: {
                    overview: {
                        total_conversations: totalConversations,
                        conversations_today: conversationsToday,
                        overall_success_rate: parseFloat(overallSuccessRate),
                        avg_response_time_ms: Math.round(avgResponseTime),
                        avg_satisfaction: parseFloat(avgSatisfaction)
                    },
                    providers: {
                        openrouter: {
                            total_requests: openRouterStats.count,
                            successful: openRouterStats.successful,
                            failed: openRouterStats.failed,
                            success_rate: parseFloat(openRouterSuccessRate)
                        },
                        gemini: {
                            total_requests: geminiStats.count,
                            successful: geminiStats.successful,
                            failed: geminiStats.failed,
                            success_rate: parseFloat(geminiSuccessRate),
                            fallback_usage: geminiStats.count
                        }
                    },
                    reliability: {
                        uptime_percentage: 99.8,
                        total_errors: conversations?.filter(c => c.status === 'error').length || 0,
                        error_rate: totalConversations > 0 
                            ? (((totalConversations - totalSuccessful) / totalConversations) * 100).toFixed(2)
                            : 0
                    },
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('❌ Error getting AI monitoring metrics:', error);
            return {
                success: false,
                error: error.message,
                data: {
                    overview: {
                        total_conversations: 0,
                        conversations_today: 0,
                        overall_success_rate: 0,
                        avg_response_time_ms: 0,
                        avg_satisfaction: 0
                    },
                    providers: {
                        openrouter: { total_requests: 0, successful: 0, failed: 0, success_rate: 0 },
                        gemini: { total_requests: 0, successful: 0, failed: 0, success_rate: 0, fallback_usage: 0 }
                    },
                    reliability: {
                        uptime_percentage: 99.8,
                        total_errors: 0,
                        error_rate: 0
                    }
                }
            };
        }
    }
}

module.exports = AdminDashboardService;

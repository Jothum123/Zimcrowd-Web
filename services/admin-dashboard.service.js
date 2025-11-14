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
}

module.exports = AdminDashboardService;

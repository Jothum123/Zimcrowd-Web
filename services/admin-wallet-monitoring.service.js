/**
 * Admin Wallet Monitoring Service
 * Comprehensive wallet and transaction monitoring for admin dashboard
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AdminWalletMonitoringService {
    
    /**
     * Get wallet overview statistics
     */
    async getWalletOverview() {
        try {
            // Total wallet balances across all users
            const { data: transactions } = await supabase
                .from('transactions')
                .select('user_id, type, amount, currency, status')
                .in('type', ['deposit', 'withdrawal'])
                .eq('status', 'completed');

            // Calculate total balances by currency
            const balancesByCurrency = {};
            const userBalances = {};

            transactions?.forEach(tx => {
                const amount = parseFloat(tx.amount);
                const currency = tx.currency;
                
                // Initialize currency tracking
                if (!balancesByCurrency[currency]) {
                    balancesByCurrency[currency] = { total: 0, deposits: 0, withdrawals: 0 };
                }
                if (!userBalances[tx.user_id]) {
                    userBalances[tx.user_id] = {};
                }
                if (!userBalances[tx.user_id][currency]) {
                    userBalances[tx.user_id][currency] = 0;
                }

                // Update balances
                if (tx.type === 'deposit') {
                    balancesByCurrency[currency].total += amount;
                    balancesByCurrency[currency].deposits += amount;
                    userBalances[tx.user_id][currency] += amount;
                } else if (tx.type === 'withdrawal') {
                    balancesByCurrency[currency].total -= amount;
                    balancesByCurrency[currency].withdrawals += amount;
                    userBalances[tx.user_id][currency] -= amount;
                }
            });

            // Count users with balances
            const usersWithBalances = Object.keys(userBalances).filter(userId => {
                return Object.values(userBalances[userId]).some(balance => balance > 0);
            }).length;

            // Get low balance alerts (users with balance < $10)
            const lowBalanceUsers = Object.entries(userBalances).filter(([userId, balances]) => {
                return Object.values(balances).some(balance => balance > 0 && balance < 10);
            }).length;

            return {
                success: true,
                data: {
                    total_balances: balancesByCurrency,
                    users_with_balances: usersWithBalances,
                    low_balance_alerts: lowBalanceUsers,
                    total_users_tracked: Object.keys(userBalances).length
                }
            };
        } catch (error) {
            console.error('❌ Error getting wallet overview:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get deposit monitoring data
     */
    async getDepositMonitoring(filters = {}) {
        try {
            const { timeframe = '7d', status, channel } = filters;
            
            // Calculate date range
            const now = new Date();
            const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
            const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

            let query = supabase
                .from('transactions')
                .select('*')
                .eq('type', 'deposit')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            if (channel) {
                query = query.eq('payment_method', channel);
            }

            const { data: deposits, error } = await query;

            if (error) throw error;

            // Calculate statistics
            const stats = {
                total_deposits: deposits?.length || 0,
                total_amount: deposits?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0,
                pending: deposits?.filter(d => d.status === 'pending').length || 0,
                completed: deposits?.filter(d => d.status === 'completed').length || 0,
                failed: deposits?.filter(d => d.status === 'failed').length || 0,
                by_channel: {},
                by_currency: {}
            };

            // Group by channel and currency
            deposits?.forEach(deposit => {
                const channel = deposit.payment_method || 'unknown';
                const currency = deposit.currency || 'USD';
                const amount = parseFloat(deposit.amount);

                // By channel
                if (!stats.by_channel[channel]) {
                    stats.by_channel[channel] = { count: 0, amount: 0 };
                }
                stats.by_channel[channel].count++;
                stats.by_channel[channel].amount += amount;

                // By currency
                if (!stats.by_currency[currency]) {
                    stats.by_currency[currency] = { count: 0, amount: 0 };
                }
                stats.by_currency[currency].count++;
                stats.by_currency[currency].amount += amount;
            });

            return {
                success: true,
                data: {
                    deposits: deposits?.slice(0, 50) || [], // Limit to 50 recent
                    statistics: stats,
                    timeframe: timeframe
                }
            };
        } catch (error) {
            console.error('❌ Error getting deposit monitoring:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get withdrawal request monitoring
     */
    async getWithdrawalMonitoring(filters = {}) {
        try {
            const { status = 'all', timeframe = '7d' } = filters;
            
            // Calculate date range
            const now = new Date();
            const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
            const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

            let query = supabase
                .from('transactions')
                .select(`
                    *,
                    users!inner(id, email, full_name)
                `)
                .eq('type', 'withdrawal')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (status !== 'all') {
                query = query.eq('status', status);
            }

            const { data: withdrawals, error } = await query;

            if (error) throw error;

            // Calculate statistics
            const stats = {
                total_requests: withdrawals?.length || 0,
                total_amount: withdrawals?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0,
                pending_approval: withdrawals?.filter(w => w.status === 'pending_approval').length || 0,
                approved: withdrawals?.filter(w => w.status === 'approved').length || 0,
                processing: withdrawals?.filter(w => w.status === 'processing').length || 0,
                completed: withdrawals?.filter(w => w.status === 'completed').length || 0,
                rejected: withdrawals?.filter(w => w.status === 'rejected').length || 0,
                failed: withdrawals?.filter(w => w.status === 'failed').length || 0,
                by_method: {},
                by_currency: {}
            };

            // Group by method and currency
            withdrawals?.forEach(withdrawal => {
                const method = withdrawal.payment_method || 'unknown';
                const currency = withdrawal.currency || 'USD';
                const amount = parseFloat(withdrawal.amount);

                // By method
                if (!stats.by_method[method]) {
                    stats.by_method[method] = { count: 0, amount: 0 };
                }
                stats.by_method[method].count++;
                stats.by_method[method].amount += amount;

                // By currency
                if (!stats.by_currency[currency]) {
                    stats.by_currency[currency] = { count: 0, amount: 0 };
                }
                stats.by_currency[currency].count++;
                stats.by_currency[currency].amount += amount;
            });

            return {
                success: true,
                data: {
                    withdrawals: withdrawals?.slice(0, 50) || [], // Limit to 50 recent
                    statistics: stats,
                    timeframe: timeframe
                }
            };
        } catch (error) {
            console.error('❌ Error getting withdrawal monitoring:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get payment channel performance
     */
    async getChannelPerformance(timeframe = '7d') {
        try {
            // Calculate date range
            const now = new Date();
            const daysBack = timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;
            const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('payment_method, status, amount, currency, created_at')
                .in('type', ['deposit', 'express_checkout'])
                .gte('created_at', startDate.toISOString());

            if (error) throw error;

            const channelStats = {};

            transactions?.forEach(tx => {
                const channel = tx.payment_method || 'unknown';
                const amount = parseFloat(tx.amount);
                const isSuccess = tx.status === 'completed';

                if (!channelStats[channel]) {
                    channelStats[channel] = {
                        total_attempts: 0,
                        successful: 0,
                        failed: 0,
                        total_amount: 0,
                        success_rate: 0,
                        avg_amount: 0
                    };
                }

                channelStats[channel].total_attempts++;
                channelStats[channel].total_amount += amount;

                if (isSuccess) {
                    channelStats[channel].successful++;
                } else {
                    channelStats[channel].failed++;
                }
            });

            // Calculate rates and averages
            Object.keys(channelStats).forEach(channel => {
                const stats = channelStats[channel];
                stats.success_rate = stats.total_attempts > 0 
                    ? (stats.successful / stats.total_attempts * 100).toFixed(2)
                    : 0;
                stats.avg_amount = stats.total_attempts > 0
                    ? (stats.total_amount / stats.total_attempts).toFixed(2)
                    : 0;
            });

            return {
                success: true,
                data: {
                    channels: channelStats,
                    timeframe: timeframe,
                    total_transactions: transactions?.length || 0
                }
            };
        } catch (error) {
            console.error('❌ Error getting channel performance:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get users with suspicious wallet activity
     */
    async getSuspiciousActivity(timeframe = '24h') {
        try {
            // Calculate date range
            const now = new Date();
            const hoursBack = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720; // 30d
            const startDate = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));

            const { data: transactions, error } = await supabase
                .from('transactions')
                .select(`
                    *,
                    users!inner(id, email, full_name)
                `)
                .in('type', ['deposit', 'withdrawal'])
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Analyze for suspicious patterns
            const userActivity = {};
            const suspiciousUsers = [];

            transactions?.forEach(tx => {
                const userId = tx.user_id;
                const amount = parseFloat(tx.amount);

                if (!userActivity[userId]) {
                    userActivity[userId] = {
                        user: tx.users,
                        deposits: [],
                        withdrawals: [],
                        total_deposits: 0,
                        total_withdrawals: 0,
                        transaction_count: 0
                    };
                }

                userActivity[userId].transaction_count++;

                if (tx.type === 'deposit') {
                    userActivity[userId].deposits.push(tx);
                    userActivity[userId].total_deposits += amount;
                } else {
                    userActivity[userId].withdrawals.push(tx);
                    userActivity[userId].total_withdrawals += amount;
                }
            });

            // Identify suspicious patterns
            Object.values(userActivity).forEach(activity => {
                const flags = [];

                // High frequency (>10 transactions in timeframe)
                if (activity.transaction_count > 10) {
                    flags.push('high_frequency');
                }

                // Large amounts (>$1000 in single transaction)
                const hasLargeTransaction = [...activity.deposits, ...activity.withdrawals]
                    .some(tx => parseFloat(tx.amount) > 1000);
                if (hasLargeTransaction) {
                    flags.push('large_amount');
                }

                // Rapid deposit-withdrawal pattern
                if (activity.deposits.length > 3 && activity.withdrawals.length > 3) {
                    flags.push('rapid_cycle');
                }

                // Round number pattern (multiple transactions with round amounts)
                const roundAmounts = [...activity.deposits, ...activity.withdrawals]
                    .filter(tx => parseFloat(tx.amount) % 100 === 0).length;
                if (roundAmounts > 3) {
                    flags.push('round_amounts');
                }

                if (flags.length > 0) {
                    suspiciousUsers.push({
                        ...activity,
                        flags: flags,
                        risk_score: flags.length * 25 // Simple risk scoring
                    });
                }
            });

            // Sort by risk score
            suspiciousUsers.sort((a, b) => b.risk_score - a.risk_score);

            return {
                success: true,
                data: {
                    suspicious_users: suspiciousUsers.slice(0, 20), // Top 20
                    total_flagged: suspiciousUsers.length,
                    timeframe: timeframe
                }
            };
        } catch (error) {
            console.error('❌ Error getting suspicious activity:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = AdminWalletMonitoringService;

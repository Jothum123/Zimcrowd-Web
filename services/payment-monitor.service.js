const { createClient } = require('@supabase/supabase-js');
const { PaymentStatusType, PaymentErrorType } = require('../types/payment-types');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Payment Monitoring Service
 * Real-time monitoring, analytics, and alerting
 */
class PaymentMonitorService {
    
    constructor() {
        this.DASHBOARD_UPDATE_INTERVAL = 30000; // 30 seconds
        this.ALERT_THRESHOLDS = {
            failureRate: 0.05,          // 5% failure rate
            noPaymentMinutes: 30,       // 30 minutes without payment
            highErrorRate: 0.10         // 10% error rate
        };
    }
    
    /**
     * Get real-time dashboard metrics
     * @param {number} timeRangeHours - Time range in hours (default 24)
     * @returns {Promise<Object>} Dashboard metrics
     */
    async getDashboardMetrics(timeRangeHours = 24) {
        try {
            const startTime = new Date();
            startTime.setHours(startTime.getHours() - timeRangeHours);
            
            const [
                totalPayments,
                successRate,
                averageAmount,
                currencySplit,
                methodSplit,
                errorRate,
                recentPayments
            ] = await Promise.all([
                this.getTotalPayments(startTime),
                this.getSuccessRate(startTime),
                this.getAverageAmount(startTime),
                this.getCurrencySplit(startTime),
                this.getMethodSplit(startTime),
                this.getErrorRate(startTime),
                this.getRecentPayments(10)
            ]);
            
            return {
                success: true,
                metrics: {
                    totalPayments,
                    successRate,
                    averageAmount,
                    currencySplit,
                    methodSplit,
                    errorRate,
                    recentPayments,
                    timeRange: timeRangeHours,
                    timestamp: new Date()
                }
            };
        } catch (error) {
            console.error('❌ Error getting dashboard metrics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get total payments in time range
     * @param {Date} startTime - Start time
     * @returns {Promise<number>} Total payments
     */
    async getTotalPayments(startTime) {
        const { count, error } = await supabase
            .from('payment_transactions')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', startTime.toISOString());
        
        if (error) throw error;
        return count || 0;
    }
    
    /**
     * Get success rate
     * @param {Date} startTime - Start time
     * @returns {Promise<number>} Success rate percentage
     */
    async getSuccessRate(startTime) {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('status')
            .gte('created_at', startTime.toISOString());
        
        if (error) throw error;
        
        if (!data || data.length === 0) return 0;
        
        const successfulPayments = data.filter(p => p.status === 'paid').length;
        return ((successfulPayments / data.length) * 100).toFixed(2);
    }
    
    /**
     * Get average payment amount
     * @param {Date} startTime - Start time
     * @returns {Promise<Object>} Average amounts by currency
     */
    async getAverageAmount(startTime) {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('amount, currency')
            .eq('status', 'paid')
            .gte('created_at', startTime.toISOString());
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return { USD: 0, ZWG: 0 };
        }
        
        const usdPayments = data.filter(p => p.currency === 'USD');
        const zwgPayments = data.filter(p => p.currency === 'ZWG');
        
        const avgUSD = usdPayments.length > 0
            ? (usdPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / usdPayments.length).toFixed(2)
            : 0;
        
        const avgZWG = zwgPayments.length > 0
            ? (zwgPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0) / zwgPayments.length).toFixed(2)
            : 0;
        
        return { USD: parseFloat(avgUSD), ZWG: parseFloat(avgZWG) };
    }
    
    /**
     * Get currency split
     * @param {Date} startTime - Start time
     * @returns {Promise<Object>} Payments by currency
     */
    async getCurrencySplit(startTime) {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('currency, amount')
            .eq('status', 'paid')
            .gte('created_at', startTime.toISOString());
        
        if (error) throw error;
        
        const split = {
            USD: { count: 0, total: 0 },
            ZWG: { count: 0, total: 0 }
        };
        
        data?.forEach(payment => {
            split[payment.currency].count++;
            split[payment.currency].total += parseFloat(payment.amount);
        });
        
        return split;
    }
    
    /**
     * Get payment method split
     * @param {Date} startTime - Start time
     * @returns {Promise<Object>} Payments by method
     */
    async getMethodSplit(startTime) {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('payment_method')
            .gte('created_at', startTime.toISOString());
        
        if (error) throw error;
        
        const split = {
            web: 0,
            ecocash: 0,
            onemoney: 0
        };
        
        data?.forEach(payment => {
            split[payment.payment_method]++;
        });
        
        return split;
    }
    
    /**
     * Get error rate
     * @param {Date} startTime - Start time
     * @returns {Promise<number>} Error rate percentage
     */
    async getErrorRate(startTime) {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('status')
            .gte('created_at', startTime.toISOString());
        
        if (error) throw error;
        
        if (!data || data.length === 0) return 0;
        
        const failedPayments = data.filter(p => p.status === 'failed').length;
        return ((failedPayments / data.length) * 100).toFixed(2);
    }
    
    /**
     * Get recent payments
     * @param {number} limit - Number of payments to retrieve
     * @returns {Promise<Array>} Recent payments
     */
    async getRecentPayments(limit = 10) {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select(`
                id,
                reference,
                amount,
                currency,
                status,
                payment_method,
                created_at,
                users (
                    email,
                    first_name,
                    last_name
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data || [];
    }
    
    /**
     * Get payment alerts
     * @returns {Promise<Object>} Active alerts
     */
    async getPaymentAlerts() {
        try {
            const alerts = [];
            
            // Check for high failure rate
            const failureRate = await this.getFailureRate(60); // Last hour
            if (failureRate > this.ALERT_THRESHOLDS.failureRate) {
                alerts.push({
                    type: 'warning',
                    severity: 'high',
                    message: `High payment failure rate: ${(failureRate * 100).toFixed(1)}%`,
                    timestamp: new Date()
                });
            }
            
            // Check for payment service downtime
            const lastPayment = await this.getLastSuccessfulPayment();
            if (lastPayment) {
                const timeSinceLast = Date.now() - new Date(lastPayment.created_at).getTime();
                const minutesSinceLast = Math.floor(timeSinceLast / (1000 * 60));
                
                if (minutesSinceLast > this.ALERT_THRESHOLDS.noPaymentMinutes) {
                    alerts.push({
                        type: 'error',
                        severity: 'critical',
                        message: `No successful payments in ${minutesSinceLast} minutes`,
                        timestamp: new Date()
                    });
                }
            }
            
            // Check for high error rate
            const errorRate = await this.getErrorRate(new Date(Date.now() - 60 * 60 * 1000));
            if (parseFloat(errorRate) > this.ALERT_THRESHOLDS.highErrorRate * 100) {
                alerts.push({
                    type: 'warning',
                    severity: 'medium',
                    message: `High error rate: ${errorRate}%`,
                    timestamp: new Date()
                });
            }
            
            return {
                success: true,
                alerts,
                count: alerts.length
            };
        } catch (error) {
            console.error('❌ Error getting payment alerts:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get failure rate
     * @param {number} minutes - Time window in minutes
     * @returns {Promise<number>} Failure rate (0-1)
     */
    async getFailureRate(minutes) {
        const startTime = new Date();
        startTime.setMinutes(startTime.getMinutes() - minutes);
        
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('status')
            .gte('created_at', startTime.toISOString());
        
        if (error) throw error;
        
        if (!data || data.length === 0) return 0;
        
        const failedCount = data.filter(p => p.status === 'failed').length;
        return failedCount / data.length;
    }
    
    /**
     * Get last successful payment
     * @returns {Promise<Object|null>} Last successful payment
     */
    async getLastSuccessfulPayment() {
        const { data, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('status', 'paid')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error) return null;
        return data;
    }
    
    /**
     * Get payment statistics for date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} Payment statistics
     */
    async getPaymentStatistics(startDate, endDate) {
        try {
            const { data, error } = await supabase
                .rpc('get_payment_statistics', {
                    p_start_date: startDate.toISOString().split('T')[0],
                    p_end_date: endDate.toISOString().split('T')[0]
                });
            
            if (error) throw error;
            
            return {
                success: true,
                statistics: data[0] || {}
            };
        } catch (error) {
            console.error('❌ Error getting payment statistics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get user payment summary
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User payment summary
     */
    async getUserPaymentSummary(userId) {
        try {
            const { data, error } = await supabase
                .from('v_user_payment_summary')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error) throw error;
            
            return {
                success: true,
                summary: data || {}
            };
        } catch (error) {
            console.error('❌ Error getting user payment summary:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Expire old pending payments
     * Run as daily cron job
     * @returns {Promise<Object>} Expiration result
     */
    async expireOldPayments() {
        try {
            const { error } = await supabase.rpc('expire_old_payments');
            
            if (error) throw error;
            
            console.log('✅ Old pending payments expired');
            
            return {
                success: true,
                message: 'Old payments expired successfully'
            };
        } catch (error) {
            console.error('❌ Error expiring old payments:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Update payment analytics
     * Run hourly
     * @returns {Promise<Object>} Update result
     */
    async updateAnalytics() {
        try {
            const { error } = await supabase.rpc('update_payment_analytics');
            
            if (error) throw error;
            
            console.log('✅ Payment analytics updated');
            
            return {
                success: true,
                message: 'Analytics updated successfully'
            };
        } catch (error) {
            console.error('❌ Error updating analytics:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = PaymentMonitorService;

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Payment Schedule Service
 * Manages loan payment schedules with special first payment grace period
 */
class PaymentScheduleService {
    
    constructor() {
        // Grace periods
        this.FIRST_PAYMENT_GRACE_DAYS = 35;  // 35 days for first payment
        this.STANDARD_GRACE_HOURS = 24;      // 24 hours for subsequent payments
    }
    
    /**
     * Create payment schedule for a loan
     * First payment gets 35-day grace period
     * @param {Object} params - Schedule parameters
     * @param {string} params.loanId - Loan ID
     * @param {Date} params.loanStartDate - Loan start/disbursement date
     * @param {number} params.loanAmount - Total loan amount
     * @param {number} params.termMonths - Loan term in months
     * @param {number} params.monthlyPayment - Monthly payment amount
     * @returns {Promise<Object>} Created schedule
     */
    async createPaymentSchedule({ loanId, loanStartDate, loanAmount, termMonths, monthlyPayment }) {
        try {
            console.log(`📅 Creating payment schedule for loan ${loanId}`);
            
            const installments = [];
            const startDate = new Date(loanStartDate);
            
            for (let month = 1; month <= termMonths; month++) {
                // Calculate due date (same day each month)
                const dueDate = new Date(startDate);
                dueDate.setMonth(dueDate.getMonth() + month);
                
                // First payment gets 35-day grace period
                let gracePeriodEnd;
                if (month === 1) {
                    gracePeriodEnd = new Date(dueDate);
                    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.FIRST_PAYMENT_GRACE_DAYS);
                } else {
                    gracePeriodEnd = new Date(dueDate);
                    gracePeriodEnd.setHours(gracePeriodEnd.getHours() + this.STANDARD_GRACE_HOURS);
                }
                
                installments.push({
                    loan_id: loanId,
                    installment_number: month,
                    due_date: dueDate.toISOString().split('T')[0], // Date only
                    amount_due: monthlyPayment,
                    grace_period_end: gracePeriodEnd.toISOString(),
                    is_first_payment: month === 1,
                    grace_period_days: month === 1 ? this.FIRST_PAYMENT_GRACE_DAYS : 0,
                    grace_period_hours: month === 1 ? 0 : this.STANDARD_GRACE_HOURS,
                    status: 'pending'
                });
            }
            
            // Insert installments into database
            const { data, error } = await supabase
                .from('loan_installments')
                .insert(installments)
                .select();
            
            if (error) throw error;
            
            console.log(`✅ Created ${installments.length} installments`);
            console.log(`   First payment: ${installments[0].due_date} (35-day grace until ${installments[0].grace_period_end})`);
            console.log(`   Subsequent payments: 24-hour grace period`);
            
            return {
                success: true,
                installments: data,
                summary: {
                    totalInstallments: installments.length,
                    firstPaymentDue: installments[0].due_date,
                    firstPaymentGraceEnd: installments[0].grace_period_end,
                    lastPaymentDue: installments[installments.length - 1].due_date
                }
            };
        } catch (error) {
            console.error('❌ Error creating payment schedule:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check if a payment is late
     * @param {Object} installment - Installment record
     * @returns {Object} Late status
     */
    isPaymentLate(installment) {
        const now = new Date();
        const gracePeriodEnd = new Date(installment.grace_period_end);
        const paidAt = installment.paid_at ? new Date(installment.paid_at) : null;
        
        // If not paid and past grace period = LATE
        if (!paidAt && now > gracePeriodEnd) {
            const daysLate = Math.floor((now - gracePeriodEnd) / (1000 * 60 * 60 * 24));
            return {
                isLate: true,
                daysLate,
                gracePeriodExpired: true,
                gracePeriodEnd: gracePeriodEnd.toISOString()
            };
        }
        
        // If paid after grace period = WAS LATE
        if (paidAt && paidAt > gracePeriodEnd) {
            const daysLate = Math.floor((paidAt - gracePeriodEnd) / (1000 * 60 * 60 * 24));
            return {
                isLate: true,
                daysLate,
                gracePeriodExpired: true,
                paidLate: true,
                gracePeriodEnd: gracePeriodEnd.toISOString()
            };
        }
        
        return {
            isLate: false,
            daysLate: 0,
            gracePeriodExpired: false,
            gracePeriodEnd: gracePeriodEnd.toISOString()
        };
    }
    
    /**
     * Get all late installments
     * @returns {Promise<Array>} Late installments
     */
    async getLateInstallments() {
        try {
            const now = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('loan_installments')
                .select('*')
                .eq('status', 'pending')
                .lt('grace_period_end', now);
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('❌ Error getting late installments:', error);
            return [];
        }
    }
    
    /**
     * Mark installment as late and calculate late fee
     * @param {string} installmentId - Installment ID
     * @param {number} daysLate - Days late
     * @returns {Promise<Object>} Update result
     */
    async markAsLate(installmentId, daysLate) {
        try {
            const { data, error } = await supabase
                .from('loan_installments')
                .update({
                    status: 'late',
                    days_late: daysLate,
                    late_since: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', installmentId)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log(`⚠️ Installment ${installmentId} marked as late (${daysLate} days)`);
            
            return {
                success: true,
                installment: data
            };
        } catch (error) {
            console.error('❌ Error marking installment as late:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get upcoming payments (for reminders)
     * @param {number} daysAhead - Days ahead to look
     * @returns {Promise<Array>} Upcoming installments
     */
    async getUpcomingPayments(daysAhead = 3) {
        try {
            const today = new Date();
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + daysAhead);
            
            const { data, error } = await supabase
                .from('loan_installments')
                .select(`
                    *,
                    loans:loan_id (
                        borrower_user_id,
                        amount
                    )
                `)
                .eq('status', 'pending')
                .gte('due_date', today.toISOString().split('T')[0])
                .lte('due_date', futureDate.toISOString().split('T')[0]);
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('❌ Error getting upcoming payments:', error);
            return [];
        }
    }
    
    /**
     * Calculate first payment date with 35-day grace
     * @param {Date} loanStartDate - Loan start date
     * @returns {Object} First payment details
     */
    calculateFirstPaymentDate(loanStartDate) {
        const startDate = new Date(loanStartDate);
        
        // First payment due 1 month after start
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        
        // Grace period ends 35 days after due date
        const gracePeriodEnd = new Date(dueDate);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.FIRST_PAYMENT_GRACE_DAYS);
        
        // Total days from start to grace end
        const totalDays = Math.floor((gracePeriodEnd - startDate) / (1000 * 60 * 60 * 24));
        
        return {
            loanStartDate: startDate.toISOString().split('T')[0],
            firstPaymentDue: dueDate.toISOString().split('T')[0],
            gracePeriodEnd: gracePeriodEnd.toISOString().split('T')[0],
            gracePeriodDays: this.FIRST_PAYMENT_GRACE_DAYS,
            totalDaysFromStart: totalDays
        };
    }
}

module.exports = PaymentScheduleService;

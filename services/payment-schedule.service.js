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
        
        // Payment window cutoff (government employee salary cycle)
        this.PAYMENT_WINDOW_CUTOFF = 14;     // Day 14 is the cutoff
        
        // Employment types
        this.EMPLOYMENT_TYPES = {
            GOVERNMENT: 'government',        // Uses payment window system
            PRIVATE: 'private',              // Uses simple 35-day grace
            BUSINESS: 'business',            // Uses simple 35-day grace
            INFORMAL: 'informal'             // Uses simple 35-day grace
        };
    }
    
    /**
     * Calculate first payment date for GOVERNMENT employees
     * Uses salary cycle logic:
     * - Apply Days 1-14: First payment end of SAME month
     * - Apply Days 15-31: First payment end of NEXT month
     * @param {Date} applicationDate - Loan application date
     * @returns {Object} First payment details
     */
    calculateGovernmentFirstPayment(applicationDate) {
        const appDate = new Date(applicationDate);
        const dayOfMonth = appDate.getDate();
        
        let firstPaymentDue;
        let paymentGroup;
        
        if (dayOfMonth >= 1 && dayOfMonth <= this.PAYMENT_WINDOW_CUTOFF) {
            // SAME_MONTH group: Pay at end of same month
            paymentGroup = 'SAME_MONTH';
            firstPaymentDue = new Date(appDate.getFullYear(), appDate.getMonth() + 1, 0);
        } else {
            // NEXT_MONTH group: Pay at end of next month
            paymentGroup = 'NEXT_MONTH';
            firstPaymentDue = new Date(appDate.getFullYear(), appDate.getMonth() + 2, 0);
        }
        
        // Calculate grace period end (35 days after due date)
        const gracePeriodEnd = new Date(firstPaymentDue);
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.FIRST_PAYMENT_GRACE_DAYS);
        
        // Calculate days from application to first payment
        const daysUntilDue = Math.floor((firstPaymentDue - appDate) / (1000 * 60 * 60 * 24));
        
        return {
            employmentType: 'government',
            applicationDate: appDate.toISOString().split('T')[0],
            applicationDay: dayOfMonth,
            paymentGroup,
            firstPaymentDue: firstPaymentDue.toISOString().split('T')[0],
            gracePeriodEnd: gracePeriodEnd.toISOString().split('T')[0],
            daysUntilDue,
            gracePeriodDays: this.FIRST_PAYMENT_GRACE_DAYS
        };
    }
    
    /**
     * Calculate first payment date for PRIVATE/BUSINESS/INFORMAL employees
     * Simple 35-day grace from loan date
     * @param {Date} applicationDate - Loan application date
     * @returns {Object} First payment details
     */
    calculatePrivateFirstPayment(applicationDate) {
        const appDate = new Date(applicationDate);
        
        // First payment due 35 days after loan
        const firstPaymentDue = new Date(appDate);
        firstPaymentDue.setDate(firstPaymentDue.getDate() + this.FIRST_PAYMENT_GRACE_DAYS);
        
        // No additional grace period (payment due = grace period end)
        const gracePeriodEnd = new Date(firstPaymentDue);
        
        return {
            employmentType: 'private',
            applicationDate: appDate.toISOString().split('T')[0],
            paymentGroup: null,
            firstPaymentDue: firstPaymentDue.toISOString().split('T')[0],
            gracePeriodEnd: gracePeriodEnd.toISOString().split('T')[0],
            daysUntilDue: this.FIRST_PAYMENT_GRACE_DAYS,
            gracePeriodDays: this.FIRST_PAYMENT_GRACE_DAYS
        };
    }
    
    /**
     * Calculate first payment date based on employment type
     * @param {Date} applicationDate - Loan application date
     * @param {string} employmentType - 'government', 'private', 'business', 'informal'
     * @returns {Object} First payment details
     */
    calculateFirstPaymentDate(applicationDate, employmentType = 'private') {
        if (employmentType === this.EMPLOYMENT_TYPES.GOVERNMENT) {
            return this.calculateGovernmentFirstPayment(applicationDate);
        } else {
            return this.calculatePrivateFirstPayment(applicationDate);
        }
    }
    
    /**
     * Create payment schedule for a loan
     * Uses employment-specific logic for first payment
     * @param {Object} params - Schedule parameters
     * @param {string} params.loanId - Loan ID
     * @param {Date} params.applicationDate - Loan application date
     * @param {string} params.employmentType - 'government', 'private', 'business', 'informal'
     * @param {number} params.loanAmount - Total loan amount
     * @param {number} params.termMonths - Loan term in months
     * @param {number} params.monthlyPayment - Monthly payment amount
     * @returns {Promise<Object>} Created schedule
     */
    async createPaymentSchedule({ loanId, applicationDate, employmentType = 'private', loanAmount, termMonths, monthlyPayment }) {
        try {
            console.log(`📅 Creating payment schedule for loan ${loanId}`);
            
            const installments = [];
            const appDate = new Date(applicationDate);
            
            // Calculate first payment date based on employment type
            const firstPayment = this.calculateFirstPaymentDate(appDate, employmentType);
            const firstPaymentDate = new Date(firstPayment.firstPaymentDue);
            
            console.log(`   Employment Type: ${employmentType}`);
            console.log(`   Application: ${firstPayment.applicationDate}`);
            if (firstPayment.paymentGroup) {
                console.log(`   Payment Group: ${firstPayment.paymentGroup}`);
            }
            console.log(`   First Payment: ${firstPayment.firstPaymentDue}`);
            console.log(`   Grace Until: ${firstPayment.gracePeriodEnd}`);
            
            // Create first installment
            const firstGracePeriodEnd = new Date(firstPayment.gracePeriodEnd);
            installments.push({
                loan_id: loanId,
                installment_number: 1,
                due_date: firstPayment.firstPaymentDue,
                amount_due: monthlyPayment,
                grace_period_end: firstGracePeriodEnd.toISOString(),
                is_first_payment: true,
                grace_period_days: this.FIRST_PAYMENT_GRACE_DAYS,
                grace_period_hours: 0,
                payment_group: firstPayment.paymentGroup,
                status: 'pending'
            });
            
            // Create subsequent installments (last day of each month)
            for (let month = 2; month <= termMonths; month++) {
                // Subsequent payments: last day of each month
                const dueDate = new Date(firstPaymentDate.getFullYear(), firstPaymentDate.getMonth() + month, 0);
                
                // 24-hour grace period for subsequent payments
                const gracePeriodEnd = new Date(dueDate);
                gracePeriodEnd.setHours(gracePeriodEnd.getHours() + this.STANDARD_GRACE_HOURS);
                
                installments.push({
                    loan_id: loanId,
                    installment_number: month,
                    due_date: dueDate.toISOString().split('T')[0],
                    amount_due: monthlyPayment,
                    grace_period_end: gracePeriodEnd.toISOString(),
                    is_first_payment: false,
                    grace_period_days: 0,
                    grace_period_hours: this.STANDARD_GRACE_HOURS,
                    payment_group: null,
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

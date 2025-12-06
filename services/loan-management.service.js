const { supabase, isSupabaseAvailable } = require('./supabase-client');

/**
 * Loan Management Service
 * Professional loan lifecycle management with state machine, schedule generation, and ledger tracking
 */
class LoanManagementService {
    
    /**
     * Get detailed loan information with employment data
     * @param {string} loanId - Loan ID
     * @returns {Promise<Object>} Loan details
     */
    async getLoanDetails(loanId) {
        try {
            const { data: loan, error } = await supabase
                .from('loans')
                .select(`
                    *,
                    users (
                        email,
                        first_name,
                        last_name,
                        phone_number
                    )
                `)
                .eq('id', loanId)
                .single();
            
            if (error) throw error;
            
            if (!loan) {
                return {
                    success: false,
                    message: 'Loan not found'
                };
            }
            
            // Format loan details for frontend
            const formattedLoan = {
                ...loan,
                borrower_name: loan.users?.first_name && loan.users?.last_name 
                    ? `${loan.users.first_name} ${loan.users.last_name}` 
                    : 'Unknown',
                borrower_email: loan.users?.email || '',
                borrower_phone: loan.users?.phone_number || ''
            };
            
            return {
                success: true,
                data: formattedLoan
            };
        } catch (error) {
            console.error('❌ Error getting loan details:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get repayment schedule for a loan
     * @param {string} loanId - Loan ID
     * @returns {Promise<Array>} Repayment schedule
     */
    async getLoanSchedule(loanId) {
        try {
            const { data: schedule, error } = await supabase
                .from('repayment_schedule')
                .select('*')
                .eq('loan_id', loanId)
                .order('due_date', { ascending: true });
            
            if (error) {
                console.log('⚠️ Repayment schedule table not found or error:', error.message);
                return [];
            }
            
            return schedule || [];
        } catch (error) {
            console.error('❌ Error getting loan schedule:', error);
            return [];
        }
    }

    /**
     * Get transaction ledger for a loan following ledger principle
     * @param {string} loanId - Loan ID
     * @returns {Promise<Array>} Transaction ledger
     */
    async getLoanTransactions(loanId) {
        try {
            const { data: transactions, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('loan_id', loanId)
                .order('timestamp', { ascending: true });
            
            if (error) {
                console.log('⚠️ Transactions table not found or error:', error.message);
                return [];
            }
            
            return transactions || [];
        } catch (error) {
            console.error('❌ Error getting loan transactions:', error);
            return [];
        }
    }

    /**
     * Approve a loan and generate repayment schedule
     * @param {string} loanId - Loan ID
     * @returns {Promise<Object>} Approval result
     */
    async approveLoan(loanId) {
        try {
            // Get loan details
            const loanDetails = await this.getLoanDetails(loanId);
            if (!loanDetails.success) {
                return {
                    success: false,
                    message: 'Loan not found'
                };
            }
            
            const loan = loanDetails.data;
            
            // Update loan status to approved
            const { error: updateError } = await supabase
                .from('loans')
                .update({ 
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    approved_by: 'admin'
                })
                .eq('id', loanId);
            
            if (updateError) throw updateError;
            
            // Generate repayment schedule using professional reducing balance formula
            const schedule = await this.generateRepaymentSchedule(loan);
            
            return {
                success: true,
                message: 'Loan approved successfully',
                data: {
                    loan: loan,
                    schedule: schedule
                }
            };
        } catch (error) {
            console.error('❌ Error approving loan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Reject a loan with reason
     * @param {string} loanId - Loan ID
     * @param {string} reason - Rejection reason
     * @returns {Promise<Object>} Rejection result
     */
    async rejectLoan(loanId, reason) {
        try {
            const { error } = await supabase
                .from('loans')
                .update({ 
                    status: 'rejected',
                    rejected_at: new Date().toISOString(),
                    rejected_by: 'admin',
                    rejection_reason: reason || 'Rejected by administrator'
                })
                .eq('id', loanId);
            
            if (error) throw error;
            
            return {
                success: true,
                message: 'Loan rejected successfully',
                data: { loanId, reason }
            };
        } catch (error) {
            console.error('❌ Error rejecting loan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Disburse funds for an approved loan (creates initial transaction)
     * @param {string} loanId - Loan ID
     * @returns {Promise<Object>} Disbursement result
     */
    async disburseLoan(loanId) {
        try {
            // Get loan details
            const loanDetails = await this.getLoanDetails(loanId);
            if (!loanDetails.success) {
                return {
                    success: false,
                    message: 'Loan not found'
                };
            }
            
            const loan = loanDetails.data;
            
            if (loan.status !== 'approved') {
                return {
                    success: false,
                    message: 'Loan must be approved before disbursement'
                };
            }
            
            // Create disbursement transaction following ledger principle
            const transactionData = {
                loan_id: loanId,
                type: 'DISBURSEMENT',
                amount: loan.amount,
                timestamp: new Date().toISOString(),
                reference: `DISBURSE-${loanId}-${Date.now()}`,
                created_by: 'admin',
                description: `Loan disbursement to ${loan.borrower_name}`
            };
            
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert(transactionData);
            
            if (transactionError) {
                console.log('⚠️ Transaction table not found or error:', transactionError.message);
                // Continue with loan activation even if transaction fails
            }
            
            // Update loan status to active
            const { error: updateError } = await supabase
                .from('loans')
                .update({ 
                    status: 'active',
                    disbursed_at: new Date().toISOString(),
                    disbursed_by: 'admin'
                })
                .eq('id', loanId);
            
            if (updateError) throw updateError;
            
            return {
                success: true,
                message: 'Loan disbursed successfully',
                data: { 
                    loanId, 
                    amount: loan.amount,
                    disbursed_at: new Date().toISOString(),
                    transaction_created: !transactionError
                }
            };
        } catch (error) {
            console.error('❌ Error disbursing loan:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate repayment schedule for a loan
     * @param {Object} loan - Loan object
     * @returns {Promise<Array>} Generated schedule
     */
    async generateRepaymentSchedule(loan) {
        try {
            const schedule = [];
            const principal = loan.amount;
            const annualRate = loan.interest_rate / 100;
            const termMonths = loan.term;
            
            // Determine interest calculation method
            const calculationMethod = await this.getEffectiveInterestMethod(loan);
            
            let scheduleData;
            
            if (calculationMethod === 'flat_rate') {
                scheduleData = this.generateFlatRateSchedule(principal, annualRate, termMonths, loan.id);
            } else {
                // Default to reducing balance
                scheduleData = this.generateReducingBalanceSchedule(principal, annualRate, termMonths, loan.id);
            }
            
            // Insert schedule into database
            try {
                const { error } = await supabase
                    .from('repayment_schedule')
                    .insert(scheduleData.installments);
                
                if (error) {
                    console.log('⚠️ Repayment schedule table not found or error:', error.message);
                }
            } catch (scheduleError) {
                console.log('⚠️ Schedule insertion failed:', scheduleError.message);
            }
            
            console.log(`✅ Generated ${scheduleData.installments.length} installments for loan ${loan.id} using ${calculationMethod} method`);
            
            return {
                success: true,
                schedule: scheduleData.installments,
                calculationMethod: calculationMethod,
                summary: {
                    totalAmount: scheduleData.totalAmount,
                    totalInterest: scheduleData.totalInterest,
                    monthlyInstallment: scheduleData.monthlyInstallment,
                    effectiveRate: scheduleData.effectiveRate
                }
            };
            
        } catch (error) {
            console.error('Repayment schedule generation error:', error);
            return {
                success: false,
                message: 'Failed to generate repayment schedule'
            };
        }
    }

    /**
     * Get effective interest calculation method for a loan
     * @param {Object} loan - Loan object
     * @returns {Promise<String>} Interest calculation method
     */
    async getEffectiveInterestMethod(loan) {
        try {
            // First check if loan has specific method set
            if (loan.interest_calculation_method) {
                return loan.interest_calculation_method;
            }
            
            // Get effective method from configuration hierarchy
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('employment_type')
                .eq('user_id', loan.user_id)
                .single();
            
            const loanType = loan.loan_type || 'direct'; // Default to direct if not specified
            const employmentType = userProfile?.employment_type || 'informal';
            
            // Get effective configuration using database function
            const { data: effectiveConfig } = await supabase
                .rpc('get_effective_loan_config', {
                    p_user_id: loan.user_id,
                    p_loan_type: loanType,
                    p_employment_type: employmentType
                });
            
            const interestMethodConfig = effectiveConfig?.find(c => c.parameter_name === 'interest_calculation_method');
            
            // Convert numeric values to text
            if (interestMethodConfig?.parameter_value === 1) {
                return 'reducing_balance';
            } else if (interestMethodConfig?.parameter_value === 2) {
                return 'flat_rate';
            }
            
            return 'reducing_balance'; // Default fallback
            
        } catch (error) {
            console.error('Error getting effective interest method:', error);
            return 'reducing_balance'; // Default fallback
        }
    }

    /**
     * Generate repayment schedule using reducing balance method
     * @param {Number} principal - Loan principal
     * @param {Number} annualRate - Annual interest rate (decimal)
     * @param {Number} termMonths - Loan term in months
     * @param {String} loanId - Loan ID
     * @returns {Object} Schedule data
     */
    generateReducingBalanceSchedule(principal, annualRate, termMonths, loanId) {
        const installments = [];
        const monthlyRate = annualRate / 12;
        
        // Calculate monthly installment using reducing balance formula
        // EMI = P * r * (1+r)^n / [(1+r)^n - 1]
        const powerTerm = Math.pow(1 + monthlyRate, termMonths);
        const monthlyInstallment = (principal * monthlyRate * powerTerm) / (powerTerm - 1);
        
        let currentDate = new Date();
        let remainingPrincipal = principal;
        let totalInterestPaid = 0;
        
        for (let i = 1; i <= termMonths; i++) {
            // Calculate interest for this month on remaining principal
            const monthlyInterest = remainingPrincipal * monthlyRate;
            totalInterestPaid += monthlyInterest;
            
            // Principal repayment = EMI - Interest
            const principalRepayment = monthlyInstallment - monthlyInterest;
            
            // Update remaining principal
            remainingPrincipal -= principalRepayment;
            
            // Calculate due date (add 1 month from current date)
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            const installment = {
                loan_id: loanId,
                installment_number: i,
                due_date: dueDate.toISOString(),
                amount_due: Math.round(monthlyInstallment * 100) / 100,
                principal_due: Math.round(principalRepayment * 100) / 100,
                interest_due: Math.round(monthlyInterest * 100) / 100,
                remaining_principal: Math.round(Math.max(0, remainingPrincipal) * 100) / 100,
                status: 'UNPAID',
                created_at: new Date().toISOString()
            };
            
            installments.push(installment);
        }
        
        return {
            installments,
            monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
            totalAmount: Math.round((monthlyInstallment * termMonths) * 100) / 100,
            totalInterest: Math.round(totalInterestPaid * 100) / 100,
            effectiveRate: ((totalInterestPaid / principal) * 100).toFixed(2)
        };
    }

    /**
     * Generate repayment schedule using flat rate method
     * @param {Number} principal - Loan principal
     * @param {Number} annualRate - Annual interest rate (decimal)
     * @param {Number} termMonths - Loan term in months
     * @param {String} loanId - Loan ID
     * @returns {Object} Schedule data
     */
    generateFlatRateSchedule(principal, annualRate, termMonths, loanId) {
        const installments = [];
        
        // Flat rate: Total interest = Principal × Rate × Time (in years)
        const totalInterest = principal * annualRate * (termMonths / 12);
        const totalAmount = principal + totalInterest;
        const monthlyInstallment = totalAmount / termMonths;
        
        let currentDate = new Date();
        let remainingPrincipal = principal;
        
        for (let i = 1; i <= termMonths; i++) {
            // In flat rate, interest is equally distributed across all installments
            const monthlyInterest = totalInterest / termMonths;
            const principalRepayment = principal / termMonths;
            
            // Update remaining principal
            remainingPrincipal -= principalRepayment;
            
            // Calculate due date (add 1 month from current date)
            const dueDate = new Date(currentDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            const installment = {
                loan_id: loanId,
                installment_number: i,
                due_date: dueDate.toISOString(),
                amount_due: Math.round(monthlyInstallment * 100) / 100,
                principal_due: Math.round(principalRepayment * 100) / 100,
                interest_due: Math.round(monthlyInterest * 100) / 100,
                remaining_principal: Math.round(Math.max(0, remainingPrincipal) * 100) / 100,
                status: 'UNPAID',
                created_at: new Date().toISOString()
            };
            
            installments.push(installment);
        }
        
        return {
            installments,
            monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalInterest: Math.round(totalInterest * 100) / 100,
            effectiveRate: ((totalInterest / principal) * 100).toFixed(2)
        };
    }

    /**
     * Get loan state machine status for visualization
     * @param {string} status - Current loan status
     * @returns {Array} State machine configuration
     */
    getLoanStateMachine(status) {
        const states = [
            { name: 'DRAFT', icon: 'file-alt', completed: true, current: false },
            { name: 'APPLIED', icon: 'paper-plane', completed: true, current: false },
            { name: 'APPROVED', icon: 'check-circle', completed: false, current: false },
            { name: 'DISBURSED', icon: 'money-bill-wave', completed: false, current: false },
            { name: 'ACTIVE', icon: 'play-circle', completed: false, current: false },
            { name: 'CLOSED', icon: 'flag-checkered', completed: false, current: false }
        ];

        // Set current state based on loan status
        switch(status?.toLowerCase()) {
            case 'pending':
            case 'pending_admin_review':
                states[1].current = true;
                break;
            case 'approved':
                states[2].current = true;
                break;
            case 'disbursed':
                states[3].current = true;
                break;
            case 'active':
                states[4].current = true;
                break;
            case 'completed':
            case 'closed':
                states[5].current = true;
                break;
            default:
                states[0].current = true;
        }

        // Mark completed states
        const currentIndex = states.findIndex(state => state.current);
        for (let i = 0; i < currentIndex; i++) {
            states[i].completed = true;
        }

        return states;
    }

    /**
     * Calculate current balance using ledger principle (sum of all transactions)
     * @param {Array} transactions - Transaction array
     * @returns {number} Current balance
     */
    calculateCurrentBalance(transactions) {
        return transactions.reduce((balance, transaction) => {
            return balance + (transaction.type === 'DISBURSEMENT' ? transaction.amount : -transaction.amount);
        }, 0);
    }
}

module.exports = LoanManagementService;

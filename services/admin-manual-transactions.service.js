/**
 * Admin Manual Transactions Service
 * Handle manual deposits, credits, debits, and adjustments
 */

const { createClient } = require('@supabase/supabase-js');
const WalletService = require('./wallet.service');
const NotificationService = require('./notification.service');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AdminManualTransactionsService {
    constructor() {
        this.walletService = new WalletService();
        this.notificationService = new NotificationService();
    }

    /**
     * Manual deposit/credit to user account
     * @param {Object} request - Manual deposit request
     * @returns {Promise<Object>} Transaction result
     */
    async manualDeposit(request) {
        try {
            const {
                user_id,
                amount,
                currency = 'USD',
                method = 'bank_transfer',
                reference,
                notes,
                admin_id,
                admin_name,
                source_details
            } = request;

            console.log(`💰 Manual deposit: $${amount} ${currency} to user ${user_id} by admin ${admin_name}`);

            // Validate user exists
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('id', user_id)
                .single();

            if (userError || !user) {
                throw new Error('User not found');
            }

            // Validate amount
            if (!amount || amount <= 0) {
                throw new Error('Invalid amount');
            }

            // Create manual deposit transaction
            const transactionReference = reference || `MANUAL-DEP-${Date.now()}`;
            
            const { data: transaction, error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user_id,
                    type: 'manual_deposit',
                    amount: parseFloat(amount),
                    currency: currency,
                    status: 'completed',
                    payment_method: method,
                    reference: transactionReference,
                    completed_at: new Date().toISOString(),
                    metadata: {
                        source: 'admin_manual',
                        admin_id: admin_id,
                        admin_name: admin_name,
                        notes: notes,
                        source_details: source_details,
                        processed_at: new Date().toISOString(),
                        manual_entry: true,
                        ip_address: 'admin_system',
                        user_agent: 'Admin Dashboard'
                    }
                })
                .select()
                .single();

            if (transactionError) {
                throw new Error(`Transaction creation failed: ${transactionError.message}`);
            }

            // Credit user's wallet
            const walletResult = await this.walletService.creditWallet(
                user_id,
                parseFloat(amount),
                currency,
                `Manual deposit by admin - ${transactionReference}`,
                {
                    admin_id: admin_id,
                    admin_name: admin_name,
                    source: 'manual_deposit'
                }
            );

            if (!walletResult.success) {
                // Rollback transaction if wallet credit fails
                await supabase
                    .from('transactions')
                    .update({ status: 'failed', error_message: walletResult.error })
                    .eq('id', transaction.id);
                
                throw new Error(`Wallet credit failed: ${walletResult.error}`);
            }

            // Log admin action
            await this.logAdminAction({
                admin_id: admin_id,
                admin_name: admin_name,
                action: 'manual_deposit',
                target_user_id: user_id,
                amount: amount,
                currency: currency,
                reference: transactionReference,
                notes: notes
            });

            // Send notification to user
            await this.notificationService.sendNotification(user_id, {
                type: 'manual_deposit_completed',
                title: 'Funds Added to Your Account',
                message: `$${amount} ${currency} has been added to your wallet via ${method}. Reference: ${transactionReference}`,
                data: {
                    transaction_id: transaction.id,
                    amount: amount,
                    currency: currency,
                    method: method,
                    reference: transactionReference,
                    admin_processed: true
                }
            });

            console.log(`✅ Manual deposit completed: $${amount} ${currency} to ${user.email}`);

            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: transactionReference,
                    user: {
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name
                    },
                    amount: amount,
                    currency: currency,
                    method: method,
                    status: 'completed',
                    processed_by: admin_name,
                    processed_at: new Date().toISOString(),
                    new_balance: walletResult.new_balance
                }
            };

        } catch (error) {
            console.error('❌ Manual deposit error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Manual debit/deduction from user account
     * @param {Object} request - Manual debit request
     * @returns {Promise<Object>} Transaction result
     */
    async manualDebit(request) {
        try {
            const {
                user_id,
                amount,
                currency = 'USD',
                reason = 'admin_adjustment',
                reference,
                notes,
                admin_id,
                admin_name,
                force_debit = false
            } = request;

            console.log(`💸 Manual debit: $${amount} ${currency} from user ${user_id} by admin ${admin_name}`);

            // Validate user exists
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('id', user_id)
                .single();

            if (userError || !user) {
                throw new Error('User not found');
            }

            // Validate amount
            if (!amount || amount <= 0) {
                throw new Error('Invalid amount');
            }

            // Check user balance unless force_debit is true
            if (!force_debit) {
                const currentBalance = await this.walletService.getBalance(user_id, currency);
                if (currentBalance < amount) {
                    throw new Error(`Insufficient balance. Current: $${currentBalance}, Required: $${amount}`);
                }
            }

            // Create manual debit transaction
            const transactionReference = reference || `MANUAL-DEB-${Date.now()}`;
            
            const { data: transaction, error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user_id,
                    type: 'manual_debit',
                    amount: parseFloat(amount),
                    currency: currency,
                    status: 'completed',
                    payment_method: 'admin_adjustment',
                    reference: transactionReference,
                    completed_at: new Date().toISOString(),
                    metadata: {
                        source: 'admin_manual',
                        admin_id: admin_id,
                        admin_name: admin_name,
                        reason: reason,
                        notes: notes,
                        force_debit: force_debit,
                        processed_at: new Date().toISOString(),
                        manual_entry: true,
                        ip_address: 'admin_system',
                        user_agent: 'Admin Dashboard'
                    }
                })
                .select()
                .single();

            if (transactionError) {
                throw new Error(`Transaction creation failed: ${transactionError.message}`);
            }

            // Debit user's wallet
            const walletResult = await this.walletService.debitWallet(
                user_id,
                parseFloat(amount),
                currency,
                `Manual debit by admin - ${transactionReference}`,
                {
                    admin_id: admin_id,
                    admin_name: admin_name,
                    source: 'manual_debit',
                    reason: reason
                }
            );

            if (!walletResult.success) {
                // Rollback transaction if wallet debit fails
                await supabase
                    .from('transactions')
                    .update({ status: 'failed', error_message: walletResult.error })
                    .eq('id', transaction.id);
                
                throw new Error(`Wallet debit failed: ${walletResult.error}`);
            }

            // Log admin action
            await this.logAdminAction({
                admin_id: admin_id,
                admin_name: admin_name,
                action: 'manual_debit',
                target_user_id: user_id,
                amount: amount,
                currency: currency,
                reference: transactionReference,
                reason: reason,
                notes: notes,
                force_debit: force_debit
            });

            // Send notification to user
            await this.notificationService.sendNotification(user_id, {
                type: 'manual_debit_processed',
                title: 'Account Adjustment',
                message: `$${amount} ${currency} has been deducted from your wallet. Reason: ${reason}. Reference: ${transactionReference}`,
                data: {
                    transaction_id: transaction.id,
                    amount: amount,
                    currency: currency,
                    reason: reason,
                    reference: transactionReference,
                    admin_processed: true
                }
            });

            console.log(`✅ Manual debit completed: $${amount} ${currency} from ${user.email}`);

            return {
                success: true,
                data: {
                    transaction_id: transaction.id,
                    reference: transactionReference,
                    user: {
                        id: user.id,
                        email: user.email,
                        full_name: user.full_name
                    },
                    amount: amount,
                    currency: currency,
                    reason: reason,
                    status: 'completed',
                    processed_by: admin_name,
                    processed_at: new Date().toISOString(),
                    new_balance: walletResult.new_balance
                }
            };

        } catch (error) {
            console.error('❌ Manual debit error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process bank transfer deposit
     * @param {Object} request - Bank transfer deposit request
     * @returns {Promise<Object>} Transaction result
     */
    async processBankTransferDeposit(request) {
        try {
            const {
                user_id,
                amount,
                currency = 'USD',
                bank_reference,
                bank_name,
                account_number,
                depositor_name,
                deposit_date,
                admin_id,
                admin_name,
                notes
            } = request;

            console.log(`🏦 Bank transfer deposit: $${amount} ${currency} from ${bank_name} for user ${user_id}`);

            // Enhanced bank transfer deposit
            const depositResult = await this.manualDeposit({
                user_id: user_id,
                amount: amount,
                currency: currency,
                method: 'bank_transfer',
                reference: bank_reference || `BANK-${Date.now()}`,
                notes: notes,
                admin_id: admin_id,
                admin_name: admin_name,
                source_details: {
                    bank_name: bank_name,
                    account_number: account_number,
                    depositor_name: depositor_name,
                    deposit_date: deposit_date,
                    verified_by_admin: true
                }
            });

            if (depositResult.success) {
                // Additional bank transfer specific logging
                await this.logAdminAction({
                    admin_id: admin_id,
                    admin_name: admin_name,
                    action: 'bank_transfer_deposit',
                    target_user_id: user_id,
                    amount: amount,
                    currency: currency,
                    reference: depositResult.data.reference,
                    bank_details: {
                        bank_name: bank_name,
                        account_number: account_number,
                        depositor_name: depositor_name,
                        deposit_date: deposit_date
                    },
                    notes: notes
                });
            }

            return depositResult;

        } catch (error) {
            console.error('❌ Bank transfer deposit error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Bulk manual transactions
     * @param {Array} transactions - Array of transaction requests
     * @param {Object} admin - Admin details
     * @returns {Promise<Object>} Bulk transaction results
     */
    async bulkManualTransactions(transactions, admin) {
        try {
            const results = [];
            const { admin_id, admin_name } = admin;

            console.log(`📊 Bulk manual transactions: ${transactions.length} transactions by ${admin_name}`);

            for (const txRequest of transactions) {
                const enhancedRequest = {
                    ...txRequest,
                    admin_id: admin_id,
                    admin_name: admin_name
                };

                let result;
                if (txRequest.type === 'deposit' || txRequest.type === 'credit') {
                    result = await this.manualDeposit(enhancedRequest);
                } else if (txRequest.type === 'debit' || txRequest.type === 'deduction') {
                    result = await this.manualDebit(enhancedRequest);
                } else if (txRequest.type === 'bank_transfer') {
                    result = await this.processBankTransferDeposit(enhancedRequest);
                } else {
                    result = {
                        success: false,
                        error: `Unknown transaction type: ${txRequest.type}`
                    };
                }

                results.push({
                    request: txRequest,
                    result: result
                });

                // Small delay between transactions to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const successful = results.filter(r => r.result.success).length;
            const failed = results.filter(r => !r.result.success).length;

            // Log bulk operation
            await this.logAdminAction({
                admin_id: admin_id,
                admin_name: admin_name,
                action: 'bulk_manual_transactions',
                bulk_details: {
                    total_transactions: transactions.length,
                    successful: successful,
                    failed: failed,
                    processed_at: new Date().toISOString()
                }
            });

            return {
                success: true,
                data: {
                    total_processed: transactions.length,
                    successful: successful,
                    failed: failed,
                    results: results
                }
            };

        } catch (error) {
            console.error('❌ Bulk manual transactions error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get manual transaction history
     * @param {Object} filters - Filter options
     * @returns {Promise<Object>} Transaction history
     */
    async getManualTransactionHistory(filters = {}) {
        try {
            const {
                admin_id,
                user_id,
                type,
                timeframe = '30d',
                page = 1,
                limit = 50
            } = filters;

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
                .in('type', ['manual_deposit', 'manual_debit'])
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: false })
                .range((page - 1) * limit, page * limit - 1);

            if (admin_id) {
                query = query.eq('metadata->>admin_id', admin_id);
            }

            if (user_id) {
                query = query.eq('user_id', user_id);
            }

            if (type) {
                query = query.eq('type', type);
            }

            const { data: transactions, error } = await query;

            if (error) throw error;

            return {
                success: true,
                data: {
                    transactions: transactions || [],
                    pagination: {
                        page: page,
                        limit: limit,
                        total: transactions?.length || 0
                    },
                    timeframe: timeframe
                }
            };

        } catch (error) {
            console.error('❌ Error getting manual transaction history:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Log admin action for audit trail
     * @param {Object} actionData - Action details
     */
    async logAdminAction(actionData) {
        try {
            await supabase
                .from('admin_actions')
                .insert({
                    admin_id: actionData.admin_id,
                    admin_name: actionData.admin_name,
                    action: actionData.action,
                    target_user_id: actionData.target_user_id,
                    details: {
                        amount: actionData.amount,
                        currency: actionData.currency,
                        reference: actionData.reference,
                        reason: actionData.reason,
                        notes: actionData.notes,
                        bank_details: actionData.bank_details,
                        bulk_details: actionData.bulk_details,
                        force_debit: actionData.force_debit,
                        timestamp: new Date().toISOString()
                    }
                });
        } catch (error) {
            console.error('❌ Error logging admin action:', error);
            // Don't throw error as this is just logging
        }
    }
}

module.exports = AdminManualTransactionsService;

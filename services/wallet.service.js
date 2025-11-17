/**
 * Production Wallet Service
 * Comprehensive wallet management for ZimCrowd platform
 */

const { supabase } = require('../utils/supabase-auth');
const NotificationService = require('./notification.service');

class WalletService {
    constructor() {
        this.notificationService = new NotificationService();
        console.log('💰 Wallet Service initialized');
    }

    /**
     * Get user wallet balance
     */
    async getBalance(userId, currency = 'USD') {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('balance, available_balance, held_balance')
                .eq('user_id', userId)
                .eq('currency', currency)
                .single();

            if (error && error.code !== 'PGRST116') { // Not found error
                throw error;
            }

            if (!data) {
                // Create wallet if doesn't exist
                await this.createWallet(userId, currency);
                return 0;
            }

            return parseFloat(data.available_balance || 0);
        } catch (error) {
            console.error('Get balance error:', error);
            throw new Error(`Failed to get wallet balance: ${error.message}`);
        }
    }

    /**
     * Get complete wallet information
     */
    async getWalletInfo(userId) {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;

            // Ensure USD and ZWL wallets exist
            const currencies = ['USD', 'ZWL'];
            const existingCurrencies = data.map(w => w.currency);
            
            for (const currency of currencies) {
                if (!existingCurrencies.includes(currency)) {
                    await this.createWallet(userId, currency);
                }
            }

            // Fetch updated data
            const { data: updatedData, error: updatedError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .order('currency');

            if (updatedError) throw updatedError;

            return {
                success: true,
                wallets: updatedData.map(wallet => ({
                    currency: wallet.currency,
                    balance: parseFloat(wallet.balance || 0),
                    available_balance: parseFloat(wallet.available_balance || 0),
                    held_balance: parseFloat(wallet.held_balance || 0),
                    created_at: wallet.created_at,
                    updated_at: wallet.updated_at
                }))
            };
        } catch (error) {
            console.error('Get wallet info error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create new wallet for user
     */
    async createWallet(userId, currency) {
        try {
            const { data, error } = await supabase
                .from('wallets')
                .insert({
                    user_id: userId,
                    currency: currency,
                    balance: 0,
                    available_balance: 0,
                    held_balance: 0
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`💰 Created ${currency} wallet for user ${userId}`);
            return data;
        } catch (error) {
            console.error('Create wallet error:', error);
            throw new Error(`Failed to create wallet: ${error.message}`);
        }
    }

    /**
     * Credit wallet (add funds)
     */
    async creditWallet(userId, amount, currency, description, transactionId = null) {
        try {
            const creditAmount = parseFloat(amount);
            
            // Get current wallet
            let { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('currency', currency)
                .single();

            if (walletError && walletError.code === 'PGRST116') {
                // Create wallet if doesn't exist
                wallet = await this.createWallet(userId, currency);
            } else if (walletError) {
                throw walletError;
            }

            const newBalance = parseFloat(wallet.balance || 0) + creditAmount;
            const newAvailableBalance = parseFloat(wallet.available_balance || 0) + creditAmount;

            // Update wallet balance
            const { error: updateError } = await supabase
                .from('wallets')
                .update({
                    balance: newBalance,
                    available_balance: newAvailableBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('currency', currency);

            if (updateError) throw updateError;

            // Create wallet transaction record
            const { error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert({
                    user_id: userId,
                    wallet_currency: currency,
                    type: 'credit',
                    amount: creditAmount,
                    balance_before: parseFloat(wallet.balance || 0),
                    balance_after: newBalance,
                    description: description,
                    transaction_id: transactionId,
                    metadata: {
                        source: 'wallet_service',
                        timestamp: new Date().toISOString()
                    }
                });

            if (transactionError) throw transactionError;

            console.log(`💰 Credited $${creditAmount} ${currency} to user ${userId} wallet`);

            return {
                success: true,
                new_balance: newBalance,
                credited_amount: creditAmount,
                currency: currency
            };
        } catch (error) {
            console.error('Credit wallet error:', error);
            throw new Error(`Failed to credit wallet: ${error.message}`);
        }
    }

    /**
     * Debit wallet (remove funds)
     */
    async debitWallet(userId, amount, currency, description, transactionId = null) {
        try {
            const debitAmount = parseFloat(amount);
            
            // Get current wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('currency', currency)
                .single();

            if (walletError) throw walletError;

            const currentBalance = parseFloat(wallet.available_balance || 0);
            
            if (currentBalance < debitAmount) {
                throw new Error('Insufficient wallet balance');
            }

            const newBalance = parseFloat(wallet.balance || 0) - debitAmount;
            const newAvailableBalance = currentBalance - debitAmount;

            // Update wallet balance
            const { error: updateError } = await supabase
                .from('wallets')
                .update({
                    balance: newBalance,
                    available_balance: newAvailableBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('currency', currency);

            if (updateError) throw updateError;

            // Create wallet transaction record
            const { error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert({
                    user_id: userId,
                    wallet_currency: currency,
                    type: 'debit',
                    amount: debitAmount,
                    balance_before: parseFloat(wallet.balance || 0),
                    balance_after: newBalance,
                    description: description,
                    transaction_id: transactionId,
                    metadata: {
                        source: 'wallet_service',
                        timestamp: new Date().toISOString()
                    }
                });

            if (transactionError) throw transactionError;

            console.log(`💸 Debited $${debitAmount} ${currency} from user ${userId} wallet`);

            return {
                success: true,
                new_balance: newBalance,
                debited_amount: debitAmount,
                currency: currency
            };
        } catch (error) {
            console.error('Debit wallet error:', error);
            throw new Error(`Failed to debit wallet: ${error.message}`);
        }
    }

    /**
     * Hold funds (for pending withdrawals)
     */
    async holdFunds(userId, amount, currency, transactionId) {
        try {
            const holdAmount = parseFloat(amount);
            
            // Get current wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('currency', currency)
                .single();

            if (walletError) throw walletError;

            const currentAvailable = parseFloat(wallet.available_balance || 0);
            
            if (currentAvailable < holdAmount) {
                throw new Error('Insufficient available balance');
            }

            const newAvailableBalance = currentAvailable - holdAmount;
            const newHeldBalance = parseFloat(wallet.held_balance || 0) + holdAmount;

            // Update wallet
            const { error: updateError } = await supabase
                .from('wallets')
                .update({
                    available_balance: newAvailableBalance,
                    held_balance: newHeldBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('currency', currency);

            if (updateError) throw updateError;

            // Create hold record
            const { error: holdError } = await supabase
                .from('wallet_holds')
                .insert({
                    user_id: userId,
                    currency: currency,
                    amount: holdAmount,
                    transaction_id: transactionId,
                    status: 'active',
                    created_at: new Date().toISOString()
                });

            if (holdError) throw holdError;

            console.log(`🔒 Held $${holdAmount} ${currency} for user ${userId}`);

            return {
                success: true,
                held_amount: holdAmount,
                available_balance: newAvailableBalance,
                held_balance: newHeldBalance
            };
        } catch (error) {
            console.error('Hold funds error:', error);
            throw new Error(`Failed to hold funds: ${error.message}`);
        }
    }

    /**
     * Release held funds
     */
    async releaseFunds(userId, transactionId) {
        try {
            // Get hold record
            const { data: hold, error: holdError } = await supabase
                .from('wallet_holds')
                .select('*')
                .eq('user_id', userId)
                .eq('transaction_id', transactionId)
                .eq('status', 'active')
                .single();

            if (holdError) throw holdError;

            // Get wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .eq('currency', hold.currency)
                .single();

            if (walletError) throw walletError;

            const newAvailableBalance = parseFloat(wallet.available_balance || 0) + parseFloat(hold.amount);
            const newHeldBalance = parseFloat(wallet.held_balance || 0) - parseFloat(hold.amount);

            // Update wallet
            const { error: updateError } = await supabase
                .from('wallets')
                .update({
                    available_balance: newAvailableBalance,
                    held_balance: newHeldBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('currency', hold.currency);

            if (updateError) throw updateError;

            // Update hold status
            const { error: holdUpdateError } = await supabase
                .from('wallet_holds')
                .update({
                    status: 'released',
                    released_at: new Date().toISOString()
                })
                .eq('id', hold.id);

            if (holdUpdateError) throw holdUpdateError;

            console.log(`🔓 Released $${hold.amount} ${hold.currency} for user ${userId}`);

            return {
                success: true,
                released_amount: parseFloat(hold.amount),
                available_balance: newAvailableBalance
            };
        } catch (error) {
            console.error('Release funds error:', error);
            throw new Error(`Failed to release funds: ${error.message}`);
        }
    }

    /**
     * Process withdrawal (complete the withdrawal)
     */
    async processWithdrawal(transaction) {
        try {
            // Get hold record
            const { data: hold, error: holdError } = await supabase
                .from('wallet_holds')
                .select('*')
                .eq('transaction_id', transaction.id)
                .eq('status', 'active')
                .single();

            if (holdError) throw holdError;

            // Get wallet
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('*')
                .eq('user_id', transaction.user_id)
                .eq('currency', transaction.currency)
                .single();

            if (walletError) throw walletError;

            const newBalance = parseFloat(wallet.balance || 0) - parseFloat(hold.amount);
            const newHeldBalance = parseFloat(wallet.held_balance || 0) - parseFloat(hold.amount);

            // Update wallet (remove from total balance and held balance)
            const { error: updateError } = await supabase
                .from('wallets')
                .update({
                    balance: newBalance,
                    held_balance: newHeldBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', transaction.user_id)
                .eq('currency', transaction.currency);

            if (updateError) throw updateError;

            // Update hold status
            const { error: holdUpdateError } = await supabase
                .from('wallet_holds')
                .update({
                    status: 'processed',
                    processed_at: new Date().toISOString()
                })
                .eq('id', hold.id);

            if (holdUpdateError) throw holdUpdateError;

            // Create wallet transaction record
            const { error: transactionError } = await supabase
                .from('wallet_transactions')
                .insert({
                    user_id: transaction.user_id,
                    wallet_currency: transaction.currency,
                    type: 'debit',
                    amount: parseFloat(hold.amount),
                    balance_before: parseFloat(wallet.balance || 0),
                    balance_after: newBalance,
                    description: `Withdrawal processed - ${transaction.reference}`,
                    transaction_id: transaction.id,
                    metadata: {
                        source: 'withdrawal_processing',
                        timestamp: new Date().toISOString()
                    }
                });

            if (transactionError) throw transactionError;

            // Update main transaction status
            const { error: mainTransactionError } = await supabase
                .from('transactions')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', transaction.id);

            if (mainTransactionError) throw mainTransactionError;

            console.log(`✅ Processed withdrawal: $${hold.amount} ${transaction.currency} for user ${transaction.user_id}`);

            return {
                success: true,
                processed_amount: parseFloat(hold.amount),
                new_balance: newBalance
            };
        } catch (error) {
            console.error('Process withdrawal error:', error);
            throw new Error(`Failed to process withdrawal: ${error.message}`);
        }
    }

    /**
     * Transfer funds between users
     */
    async transferFunds(fromUserId, toUserId, amount, currency, description) {
        try {
            const transferAmount = parseFloat(amount);
            
            // Check sender balance
            const senderBalance = await this.getBalance(fromUserId, currency);
            if (senderBalance < transferAmount) {
                throw new Error('Insufficient balance for transfer');
            }

            // Create transfer transaction
            const { data: transferTransaction, error: transferError } = await supabase
                .from('transactions')
                .insert({
                    user_id: fromUserId,
                    type: 'transfer_out',
                    amount: transferAmount,
                    currency: currency,
                    status: 'completed',
                    reference: `TRF-${Date.now()}`,
                    metadata: {
                        to_user_id: toUserId,
                        description: description,
                        transfer_type: 'internal'
                    }
                })
                .select()
                .single();

            if (transferError) throw transferError;

            // Debit sender
            await this.debitWallet(
                fromUserId, 
                transferAmount, 
                currency, 
                `Transfer to user ${toUserId}: ${description}`,
                transferTransaction.id
            );

            // Credit receiver
            await this.creditWallet(
                toUserId, 
                transferAmount, 
                currency, 
                `Transfer from user ${fromUserId}: ${description}`,
                transferTransaction.id
            );

            // Create corresponding transaction for receiver
            const { error: receiveTransactionError } = await supabase
                .from('transactions')
                .insert({
                    user_id: toUserId,
                    type: 'transfer_in',
                    amount: transferAmount,
                    currency: currency,
                    status: 'completed',
                    reference: transferTransaction.reference,
                    metadata: {
                        from_user_id: fromUserId,
                        description: description,
                        transfer_type: 'internal',
                        original_transaction_id: transferTransaction.id
                    }
                });

            if (receiveTransactionError) throw receiveTransactionError;

            // Send notifications
            await Promise.all([
                this.notificationService.sendNotification(fromUserId, {
                    type: 'transfer_sent',
                    title: 'Transfer Sent',
                    message: `You sent $${transferAmount} ${currency} to another user.`,
                    data: {
                        amount: transferAmount,
                        currency: currency,
                        transaction_id: transferTransaction.id
                    }
                }),
                this.notificationService.sendNotification(toUserId, {
                    type: 'transfer_received',
                    title: 'Transfer Received',
                    message: `You received $${transferAmount} ${currency} from another user.`,
                    data: {
                        amount: transferAmount,
                        currency: currency,
                        transaction_id: transferTransaction.id
                    }
                })
            ]);

            console.log(`💸 Transfer completed: $${transferAmount} ${currency} from ${fromUserId} to ${toUserId}`);

            return {
                success: true,
                transfer_amount: transferAmount,
                currency: currency,
                transaction_id: transferTransaction.id,
                reference: transferTransaction.reference
            };
        } catch (error) {
            console.error('Transfer funds error:', error);
            throw new Error(`Failed to transfer funds: ${error.message}`);
        }
    }

    /**
     * Get wallet transaction history
     */
    async getTransactionHistory(userId, currency = null, limit = 50, offset = 0) {
        try {
            let query = supabase
                .from('wallet_transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit)
                .offset(offset);

            if (currency) {
                query = query.eq('wallet_currency', currency);
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                success: true,
                transactions: data.map(tx => ({
                    id: tx.id,
                    type: tx.type,
                    amount: parseFloat(tx.amount),
                    currency: tx.wallet_currency,
                    balance_before: parseFloat(tx.balance_before),
                    balance_after: parseFloat(tx.balance_after),
                    description: tx.description,
                    created_at: tx.created_at,
                    transaction_id: tx.transaction_id
                }))
            };
        } catch (error) {
            console.error('Get transaction history error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = WalletService;

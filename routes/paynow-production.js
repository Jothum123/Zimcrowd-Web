/**
 * Production PayNow Integration Routes
 * Comprehensive payment processing for ZimCrowd platform
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const { supabase } = require('../utils/supabase-auth');
const PaynowService = require('../services/paynow.service');
const WalletService = require('../services/wallet.service');
const NotificationService = require('../services/notification.service');

const paynowService = new PaynowService();
const walletService = new WalletService();
const notificationService = new NotificationService();

console.log('🔄 Loading production PayNow routes...');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// @route   POST /api/paynow-production/deposit
// @desc    Initiate wallet deposit via PayNow
// @access  Private
router.post('/deposit', authenticateUser, [
    body('amount').isFloat({ min: 1, max: 50000 }).withMessage('Amount must be between $1 and $50,000'),
    body('currency').isIn(['USD', 'ZWL']).withMessage('Currency must be USD or ZWL'),
    body('paymentMethod').isIn(['ecocash', 'onemoney', 'telecash', 'zipit']).withMessage('Invalid payment method'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, currency, paymentMethod, reference } = req.body;
        const userId = req.user.id;

        console.log(`💰 Deposit request: $${amount} ${currency} via ${paymentMethod} for user ${userId}`);

        // Create transaction record
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'deposit',
                amount: parseFloat(amount),
                currency: currency,
                status: 'pending',
                payment_method: paymentMethod,
                reference: reference || `DEP-${Date.now()}`,
                metadata: {
                    source: 'paynow',
                    initiated_at: new Date().toISOString(),
                    user_agent: req.get('User-Agent'),
                    ip_address: req.ip
                }
            })
            .select()
            .single();

        if (transactionError) {
            throw new Error(`Transaction creation failed: ${transactionError.message}`);
        }

        // Initialize PayNow payment
        const paymentResult = await paynowService.initiatePayment({
            amount: amount,
            currency: currency,
            reference: transaction.reference,
            email: req.user.email,
            phone: req.user.phone,
            paymentMethod: paymentMethod,
            returnUrl: `${process.env.FRONTEND_URL}/wallet/deposit/success`,
            resultUrl: `${process.env.PAYNOW_RESULT_URL}`,
            additionalInfo: `ZimCrowd wallet deposit - ${transaction.reference}`
        });

        if (paymentResult.success) {
            // Update transaction with PayNow details
            await supabase
                .from('transactions')
                .update({
                    external_reference: paymentResult.pollUrl,
                    payment_url: paymentResult.redirectUrl,
                    status: 'initiated',
                    metadata: {
                        ...transaction.metadata,
                        paynow_reference: paymentResult.reference,
                        poll_url: paymentResult.pollUrl
                    }
                })
                .eq('id', transaction.id);

            // Send notification
            await notificationService.sendNotification(userId, {
                type: 'payment_initiated',
                title: 'Payment Initiated',
                message: `Your deposit of $${amount} ${currency} has been initiated. Complete payment to add funds to your wallet.`,
                data: {
                    transaction_id: transaction.id,
                    amount: amount,
                    currency: currency
                }
            });

            res.json({
                success: true,
                message: 'Payment initiated successfully',
                data: {
                    transaction_id: transaction.id,
                    reference: transaction.reference,
                    payment_url: paymentResult.redirectUrl,
                    poll_url: paymentResult.pollUrl,
                    amount: amount,
                    currency: currency,
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
                }
            });
        } else {
            // Update transaction status
            await supabase
                .from('transactions')
                .update({ 
                    status: 'failed',
                    error_message: paymentResult.error 
                })
                .eq('id', transaction.id);

            res.status(400).json({
                success: false,
                message: 'Payment initiation failed',
                error: paymentResult.error
            });
        }

    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Deposit initiation failed',
            error: error.message
        });
    }
});

// @route   POST /api/paynow-production/express-checkout
// @desc    Initiate express checkout payment
// @access  Private
router.post('/express-checkout', authenticateUser, [
    body('amount').isFloat({ min: 1, max: 50000 }).withMessage('Amount must be between $1 and $50,000'),
    body('currency').isIn(['USD', 'ZWL']).withMessage('Currency must be USD or ZWL'),
    body('method').isIn(['ecocash', 'onemoney', 'innbucks', 'omari', 'zimswitch', 'vmc']).withMessage('Invalid payment method'),
    body('phone').optional().matches(/^\+263[17]\d{7}$/).withMessage('Invalid Zimbabwe phone number format'),
    body('token').optional().isLength({ min: 10 }).withMessage('Invalid token format'),
    body('merchantTrace').optional().isLength({ max: 32 }).withMessage('Merchant trace too long'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, currency, method, phone, token, merchantTrace, reference } = req.body;
        const userId = req.user.id;

        console.log(`⚡ Express checkout request: ${method} - $${amount} ${currency} for user ${userId}`);

        // Validate method-specific requirements
        const mobileMethods = ['ecocash', 'onemoney', 'innbucks', 'omari'];
        const tokenMethods = ['zimswitch', 'vmc'];

        if (mobileMethods.includes(method) && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number required for mobile money payments'
            });
        }

        if (tokenMethods.includes(method)) {
            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Token required for card payments'
                });
            }
            if (!merchantTrace) {
                return res.status(400).json({
                    success: false,
                    message: 'Merchant trace required for card payments'
                });
            }
        }

        // Create transaction record
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'express_checkout',
                amount: parseFloat(amount),
                currency: currency,
                status: 'pending',
                payment_method: method,
                reference: reference || `EXP-${Date.now()}`,
                metadata: {
                    source: 'express_checkout',
                    method: method,
                    phone: phone,
                    has_token: !!token,
                    initiated_at: new Date().toISOString(),
                    user_agent: req.get('User-Agent'),
                    ip_address: req.ip
                }
            })
            .select()
            .single();

        if (transactionError) {
            throw new Error(`Transaction creation failed: ${transactionError.message}`);
        }

        // Initialize express checkout payment
        const paymentResult = await paynowService.initiateExpressCheckout({
            amount: amount,
            currency: currency,
            method: method,
            reference: transaction.reference,
            email: req.user.email,
            phone: phone,
            token: token,
            merchantTrace: merchantTrace,
            additionalInfo: `ZimCrowd Express Checkout - ${transaction.reference}`
        });

        if (paymentResult.success) {
            // Determine final status based on whether fallback was used
            const finalStatus = paymentResult.fallback ? 'fallback_initiated' : 'initiated';
            const finalReference = paymentResult.fallback ? paymentResult.reference : transaction.reference;

            // Update transaction with PayNow details
            await supabase
                .from('transactions')
                .update({
                    external_reference: paymentResult.pollUrl,
                    status: finalStatus,
                    metadata: {
                        ...transaction.metadata,
                        paynow_reference: paymentResult.reference,
                        poll_url: paymentResult.pollUrl,
                        additional_data: paymentResult.additionalData,
                        fallback_used: paymentResult.fallback || false,
                        original_error: paymentResult.originalError || null,
                        fallback_reference: paymentResult.fallback ? paymentResult.reference : null
                    }
                })
                .eq('id', transaction.id);

            // Send notification based on method and fallback status
            let notificationMessage;
            let notificationType;

            if (paymentResult.fallback) {
                notificationMessage = `Express checkout failed for ${method}. Redirecting to secure payment page. Please complete your payment there.`;
                notificationType = 'express_checkout_fallback';
            } else {
                notificationMessage = `Your ${method} payment of $${amount} ${currency} has been initiated.`;
                notificationType = 'express_checkout_initiated';
                
                if (method === 'innbucks' && paymentResult.additionalData?.authorizationCode) {
                    notificationMessage += ` Authorization Code: ${paymentResult.additionalData.authorizationCode}`;
                } else if (method === 'omari' && paymentResult.additionalData?.otpReference) {
                    notificationMessage += ` OTP Reference: ${paymentResult.additionalData.otpReference}`;
                }
            }

            await notificationService.sendNotification(userId, {
                type: notificationType,
                title: paymentResult.fallback ? 'Redirecting to Payment Page' : 'Express Payment Initiated',
                message: notificationMessage,
                data: {
                    transaction_id: transaction.id,
                    amount: amount,
                    currency: currency,
                    method: method,
                    fallback_used: paymentResult.fallback || false,
                    original_error: paymentResult.originalError || null,
                    additional_data: paymentResult.additionalData
                }
            });

            res.json({
                success: true,
                message: paymentResult.fallback ? 'Express checkout failed, redirecting to payment page' : 'Express checkout initiated successfully',
                data: {
                    transaction_id: transaction.id,
                    reference: finalReference,
                    original_reference: transaction.reference,
                    method: method,
                    poll_url: paymentResult.pollUrl,
                    redirect_url: paymentResult.redirectUrl || null,
                    amount: amount,
                    currency: currency,
                    instructions: paymentResult.instructions,
                    additional_data: paymentResult.additionalData || {},
                    fallback_used: paymentResult.fallback || false,
                    original_error: paymentResult.originalError || null,
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
                }
            });
        } else {
            // Update transaction status
            await supabase
                .from('transactions')
                .update({ 
                    status: 'failed',
                    error_message: paymentResult.error 
                })
                .eq('id', transaction.id);

            res.status(400).json({
                success: false,
                message: 'Express checkout initiation failed',
                error: paymentResult.error
            });
        }

    } catch (error) {
        console.error('Express checkout error:', error);
        res.status(500).json({
            success: false,
            message: 'Express checkout initiation failed',
            error: error.message
        });
    }
});

// @route   POST /api/paynow-production/complete-omari
// @desc    Complete O'mari payment with OTP
// @access  Private
router.post('/complete-omari', authenticateUser, [
    body('reference').notEmpty().withMessage('Payment reference required'),
    body('otp').isLength({ min: 4, max: 8 }).withMessage('Valid OTP required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { reference, otp } = req.body;
        const userId = req.user.id;

        console.log(`🔐 O'mari OTP completion: ${reference} for user ${userId}`);

        // Verify transaction belongs to user
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference', reference)
            .eq('user_id', userId)
            .eq('payment_method', 'omari')
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'O\'mari transaction not found'
            });
        }

        if (transaction.status !== 'initiated') {
            return res.status(400).json({
                success: false,
                message: 'Transaction is not in initiated state'
            });
        }

        // Complete O'mari payment
        const completionResult = await paynowService.completeOmariPayment(reference, otp);

        if (completionResult.success) {
            // Update transaction status
            await supabase
                .from('transactions')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                    external_reference: completionResult.paynowReference,
                    metadata: {
                        ...transaction.metadata,
                        otp_completed_at: new Date().toISOString(),
                        paynow_reference: completionResult.paynowReference
                    }
                })
                .eq('id', transaction.id);

            // Credit user's wallet
            await walletService.creditWallet(
                userId,
                transaction.amount,
                transaction.currency,
                `O'mari payment completed - ${reference}`
            );

            // Send success notification
            await notificationService.sendNotification(userId, {
                type: 'omari_completed',
                title: 'O\'mari Payment Completed',
                message: `Your O'mari payment of $${transaction.amount} ${transaction.currency} has been completed successfully.`,
                data: {
                    transaction_id: transaction.id,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    paynow_reference: completionResult.paynowReference
                }
            });

            res.json({
                success: true,
                message: 'O\'mari payment completed successfully',
                data: {
                    transaction_id: transaction.id,
                    reference: reference,
                    paynow_reference: completionResult.paynowReference,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    completed_at: new Date().toISOString()
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'O\'mari OTP verification failed',
                error: completionResult.error
            });
        }

    } catch (error) {
        console.error('O\'mari completion error:', error);
        res.status(500).json({
            success: false,
            message: 'O\'mari payment completion failed',
            error: error.message
        });
    }
});

// @route   GET /api/paynow-production/payment-methods
// @desc    Get supported express checkout payment methods
// @access  Private
router.get('/payment-methods', authenticateUser, async (req, res) => {
    try {
        const methods = paynowService.getSupportedExpressCheckoutMethods();
        
        res.json({
            success: true,
            data: {
                express_checkout_methods: methods,
                traditional_methods: [
                    {
                        code: 'web',
                        name: 'PayNow Web',
                        description: 'Redirect to PayNow website',
                        requiresPhone: false,
                        requiresToken: false
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Payment methods error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment methods',
            error: error.message
        });
    }
});

// @route   POST /api/paynow-production/tokenize
// @desc    Initiate tokenization for card payments
// @access  Private
router.post('/tokenize', authenticateUser, [
    body('amount').isFloat({ min: 1, max: 50000 }).withMessage('Amount must be between $1 and $50,000'),
    body('currency').isIn(['USD', 'ZWL']).withMessage('Currency must be USD or ZWL'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, currency, reference } = req.body;
        const userId = req.user.id;

        console.log(`🔐 Tokenization request: $${amount} ${currency} for user ${userId}`);

        // Create tokenization transaction
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'tokenization',
                amount: parseFloat(amount),
                currency: currency,
                status: 'pending',
                payment_method: 'web',
                reference: reference || `TOK-${Date.now()}`,
                metadata: {
                    source: 'tokenization',
                    tokenize: true,
                    initiated_at: new Date().toISOString(),
                    user_agent: req.get('User-Agent'),
                    ip_address: req.ip
                }
            })
            .select()
            .single();

        if (transactionError) {
            throw new Error(`Transaction creation failed: ${transactionError.message}`);
        }

        // Initialize PayNow payment with tokenization
        const paymentResult = await paynowService.initiatePayment({
            amount: amount,
            currency: currency,
            reference: transaction.reference,
            email: req.user.email,
            phone: req.user.phone,
            paymentMethod: 'web',
            tokenize: true,
            returnUrl: `${process.env.FRONTEND_URL}/wallet/tokenize/success`,
            resultUrl: `${process.env.PAYNOW_RESULT_URL}`,
            additionalInfo: `ZimCrowd Card Tokenization - ${transaction.reference}`
        });

        if (paymentResult.success) {
            // Update transaction with PayNow details
            await supabase
                .from('transactions')
                .update({
                    external_reference: paymentResult.pollUrl,
                    payment_url: paymentResult.redirectUrl,
                    status: 'initiated',
                    metadata: {
                        ...transaction.metadata,
                        paynow_reference: paymentResult.reference,
                        poll_url: paymentResult.pollUrl,
                        tokenization_enabled: true
                    }
                })
                .eq('id', transaction.id);

            res.json({
                success: true,
                message: 'Tokenization payment initiated successfully',
                data: {
                    transaction_id: transaction.id,
                    reference: transaction.reference,
                    payment_url: paymentResult.redirectUrl,
                    poll_url: paymentResult.pollUrl,
                    amount: amount,
                    currency: currency,
                    instructions: 'Complete payment to tokenize your card for future express checkout',
                    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
                }
            });
        } else {
            await supabase
                .from('transactions')
                .update({ 
                    status: 'failed',
                    error_message: paymentResult.error 
                })
                .eq('id', transaction.id);

            res.status(400).json({
                success: false,
                message: 'Tokenization payment initiation failed',
                error: paymentResult.error
            });
        }

    } catch (error) {
        console.error('Tokenization error:', error);
        res.status(500).json({
            success: false,
            message: 'Tokenization initiation failed',
            error: error.message
        });
    }
});

// @route   POST /api/paynow-production/withdrawal
// @desc    Initiate wallet withdrawal
// @access  Private
router.post('/withdrawal', authenticateUser, [
    body('amount').isFloat({ min: 1, max: 10000 }).withMessage('Amount must be between $1 and $10,000'),
    body('currency').isIn(['USD', 'ZWL']).withMessage('Currency must be USD or ZWL'),
    body('method').isIn(['bank_transfer', 'mobile_money', 'cash_pickup']).withMessage('Invalid withdrawal method'),
    body('destination').notEmpty().withMessage('Destination details required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { amount, currency, method, destination, reason } = req.body;
        const userId = req.user.id;

        console.log(`💸 Withdrawal request: $${amount} ${currency} via ${method} for user ${userId}`);

        // Check wallet balance
        const balance = await walletService.getBalance(userId, currency);
        if (balance < amount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance',
                available_balance: balance,
                requested_amount: amount
            });
        }

        // Check withdrawal limits
        const dailyWithdrawals = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('type', 'withdrawal')
            .eq('currency', currency)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .eq('status', 'completed');

        const dailyTotal = dailyWithdrawals.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
        const dailyLimit = currency === 'USD' ? 2000 : 50000; // Daily limits

        if (dailyTotal + amount > dailyLimit) {
            return res.status(400).json({
                success: false,
                message: 'Daily withdrawal limit exceeded',
                daily_limit: dailyLimit,
                used_today: dailyTotal,
                available_today: dailyLimit - dailyTotal
            });
        }

        // Create withdrawal transaction
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: 'withdrawal',
                amount: parseFloat(amount),
                currency: currency,
                status: 'pending_approval',
                payment_method: method,
                reference: `WTH-${Date.now()}`,
                metadata: {
                    destination: destination,
                    reason: reason,
                    initiated_at: new Date().toISOString(),
                    requires_approval: true,
                    user_agent: req.get('User-Agent'),
                    ip_address: req.ip
                }
            })
            .select()
            .single();

        if (transactionError) {
            throw new Error(`Transaction creation failed: ${transactionError.message}`);
        }

        // Hold the funds in wallet
        await walletService.holdFunds(userId, amount, currency, transaction.id);

        // Send notifications
        await Promise.all([
            // User notification
            notificationService.sendNotification(userId, {
                type: 'withdrawal_initiated',
                title: 'Withdrawal Initiated',
                message: `Your withdrawal request of $${amount} ${currency} is being processed. You'll be notified once approved.`,
                data: {
                    transaction_id: transaction.id,
                    amount: amount,
                    currency: currency
                }
            }),
            // Admin notification
            notificationService.sendAdminNotification({
                type: 'withdrawal_approval_required',
                title: 'Withdrawal Approval Required',
                message: `User ${req.user.email} requested withdrawal of $${amount} ${currency}`,
                data: {
                    transaction_id: transaction.id,
                    user_id: userId,
                    amount: amount,
                    currency: currency,
                    method: method
                }
            })
        ]);

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully',
            data: {
                transaction_id: transaction.id,
                reference: transaction.reference,
                amount: amount,
                currency: currency,
                status: 'pending_approval',
                estimated_processing_time: '1-3 business days'
            }
        });

    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: 'Withdrawal request failed',
            error: error.message
        });
    }
});

// @route   POST /api/paynow-production/webhook
// @desc    PayNow webhook for payment status updates
// @access  Public (with signature verification)
router.post('/webhook', async (req, res) => {
    try {
        console.log('📡 PayNow webhook received:', req.body);

        // Verify webhook signature
        const isValidSignature = paynowService.verifyWebhookSignature(req.body, req.headers);
        if (!isValidSignature) {
            console.error('❌ Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { reference, status, amount, currency, paynowreference } = req.body;

        // Find transaction by reference
        const { data: transaction, error: findError } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference', reference)
            .single();

        if (findError || !transaction) {
            console.error('❌ Transaction not found:', reference);
            return res.status(404).json({ error: 'Transaction not found' });
        }

        let newStatus;
        switch (status.toLowerCase()) {
            case 'paid':
                newStatus = 'completed';
                break;
            case 'cancelled':
            case 'failed':
                newStatus = 'failed';
                break;
            default:
                newStatus = 'pending';
        }

        // Update transaction status
        await supabase
            .from('transactions')
            .update({
                status: newStatus,
                external_reference: paynowreference,
                completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                metadata: {
                    ...transaction.metadata,
                    webhook_received_at: new Date().toISOString(),
                    paynow_status: status
                }
            })
            .eq('id', transaction.id);

        if (newStatus === 'completed' && transaction.type === 'deposit') {
            // Credit user's wallet
            await walletService.creditWallet(
                transaction.user_id,
                transaction.amount,
                transaction.currency,
                `Deposit via PayNow - ${reference}`
            );

            // Send success notification
            await notificationService.sendNotification(transaction.user_id, {
                type: 'deposit_completed',
                title: 'Deposit Successful',
                message: `Your deposit of $${transaction.amount} ${transaction.currency} has been added to your wallet.`,
                data: {
                    transaction_id: transaction.id,
                    amount: transaction.amount,
                    currency: transaction.currency
                }
            });

            console.log(`✅ Deposit completed: $${transaction.amount} ${transaction.currency} for user ${transaction.user_id}`);
        } else if (newStatus === 'failed') {
            // Send failure notification
            await notificationService.sendNotification(transaction.user_id, {
                type: 'payment_failed',
                title: 'Payment Failed',
                message: `Your ${transaction.type} of $${transaction.amount} ${transaction.currency} could not be processed.`,
                data: {
                    transaction_id: transaction.id,
                    amount: transaction.amount,
                    currency: transaction.currency
                }
            });

            // Release held funds if withdrawal
            if (transaction.type === 'withdrawal') {
                await walletService.releaseFunds(transaction.user_id, transaction.id);
            }
        }

        res.json({ success: true, message: 'Webhook processed successfully' });

    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// @route   GET /api/paynow-production/status/:transactionId
// @desc    Check payment status
// @access  Private
router.get('/status/:transactionId', authenticateUser, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;

        // Get transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('user_id', userId)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Check PayNow status if pending
        if (transaction.status === 'pending' || transaction.status === 'initiated') {
            const paynowStatus = await paynowService.checkPaymentStatus(transaction.external_reference);
            
            if (paynowStatus && paynowStatus.status !== transaction.status) {
                // Update status if changed
                await supabase
                    .from('transactions')
                    .update({ 
                        status: paynowStatus.status,
                        metadata: {
                            ...transaction.metadata,
                            last_checked: new Date().toISOString()
                        }
                    })
                    .eq('id', transaction.id);
                
                transaction.status = paynowStatus.status;
            }
        }

        res.json({
            success: true,
            data: {
                id: transaction.id,
                reference: transaction.reference,
                type: transaction.type,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                payment_method: transaction.payment_method,
                created_at: transaction.created_at,
                completed_at: transaction.completed_at,
                payment_url: transaction.payment_url
            }
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Status check failed',
            error: error.message
        });
    }
});

// @route   POST /api/paynow-production/admin/approve-withdrawal
// @desc    Admin approve withdrawal
// @access  Admin
router.post('/admin/approve-withdrawal', requireAdmin, [
    body('transactionId').isUUID().withMessage('Valid transaction ID required'),
    body('approved').isBoolean().withMessage('Approval status required'),
    body('notes').optional().isString(),
    handleValidationErrors
], async (req, res) => {
    try {
        const { transactionId, approved, notes } = req.body;
        const adminId = req.user.id;

        // Get transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('type', 'withdrawal')
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'Withdrawal transaction not found'
            });
        }

        if (transaction.status !== 'pending_approval') {
            return res.status(400).json({
                success: false,
                message: 'Transaction is not pending approval'
            });
        }

        const newStatus = approved ? 'approved' : 'rejected';

        // Update transaction
        await supabase
            .from('transactions')
            .update({
                status: newStatus,
                approved_by: adminId,
                approved_at: new Date().toISOString(),
                admin_notes: notes,
                metadata: {
                    ...transaction.metadata,
                    approval_decision: approved,
                    approved_by: adminId
                }
            })
            .eq('id', transactionId);

        if (approved) {
            // Process withdrawal
            await walletService.processWithdrawal(transaction);
            
            // Send success notification
            await notificationService.sendNotification(transaction.user_id, {
                type: 'withdrawal_approved',
                title: 'Withdrawal Approved',
                message: `Your withdrawal of $${transaction.amount} ${transaction.currency} has been approved and is being processed.`,
                data: {
                    transaction_id: transaction.id,
                    amount: transaction.amount,
                    currency: transaction.currency
                }
            });
        } else {
            // Release held funds
            await walletService.releaseFunds(transaction.user_id, transaction.id);
            
            // Send rejection notification
            await notificationService.sendNotification(transaction.user_id, {
                type: 'withdrawal_rejected',
                title: 'Withdrawal Rejected',
                message: `Your withdrawal request of $${transaction.amount} ${transaction.currency} has been rejected. ${notes || 'Please contact support for details.'}`,
                data: {
                    transaction_id: transaction.id,
                    amount: transaction.amount,
                    currency: transaction.currency,
                    reason: notes
                }
            });
        }

        res.json({
            success: true,
            message: `Withdrawal ${approved ? 'approved' : 'rejected'} successfully`,
            data: {
                transaction_id: transactionId,
                status: newStatus,
                approved: approved,
                notes: notes
            }
        });

    } catch (error) {
        console.error('Withdrawal approval error:', error);
        res.status(500).json({
            success: false,
            message: 'Withdrawal approval failed',
            error: error.message
        });
    }
});

module.exports = router;

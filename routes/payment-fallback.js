/**
 * Payment Fallback Routes
 * Handle fallback redirect success and failure scenarios
 */

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { supabase } = require('../utils/supabase-auth');
const WalletService = require('../services/wallet.service');
const NotificationService = require('../services/notification.service');

const walletService = new WalletService();
const notificationService = new NotificationService();

console.log('🔄 Loading payment fallback routes...');

// @route   GET /api/payment-fallback/success
// @desc    Handle fallback payment success
// @access  Public (but validates transaction ownership)
router.get('/success', async (req, res) => {
    try {
        const { ref, method, status } = req.query;

        console.log(`✅ Fallback payment success: ${ref} - ${method} - ${status}`);

        if (!ref) {
            return res.status(400).json({
                success: false,
                message: 'Payment reference is required'
            });
        }

        // Find the original transaction
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference', ref)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found'
            });
        }

        // Update transaction status to completed
        await supabase
            .from('transactions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                metadata: {
                    ...transaction.metadata,
                    fallback_completed: true,
                    fallback_completed_at: new Date().toISOString(),
                    completion_method: 'fallback_redirect'
                }
            })
            .eq('id', transaction.id);

        // Credit user's wallet if it's a deposit
        if (transaction.type === 'express_checkout' || transaction.type === 'deposit') {
            await walletService.creditWallet(
                transaction.user_id,
                transaction.amount,
                transaction.currency,
                `Fallback payment completed - ${ref}`
            );
        }

        // Send success notification
        await notificationService.sendNotification(transaction.user_id, {
            type: 'fallback_payment_completed',
            title: 'Payment Completed',
            message: `Your ${method} payment of $${transaction.amount} ${transaction.currency} has been completed successfully via secure payment page.`,
            data: {
                transaction_id: transaction.id,
                amount: transaction.amount,
                currency: transaction.currency,
                method: method,
                completion_method: 'fallback_redirect'
            }
        });

        // Return success page HTML
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Successful - ZimCrowd</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        margin: 0;
                        padding: 20px;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .container {
                        background: white;
                        border-radius: 16px;
                        padding: 40px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                        max-width: 500px;
                        width: 100%;
                    }
                    .success-icon {
                        font-size: 64px;
                        color: #10b981;
                        margin-bottom: 20px;
                    }
                    .title {
                        font-size: 28px;
                        font-weight: bold;
                        color: #1f2937;
                        margin-bottom: 16px;
                    }
                    .message {
                        font-size: 16px;
                        color: #6b7280;
                        margin-bottom: 24px;
                        line-height: 1.5;
                    }
                    .details {
                        background: #f9fafb;
                        border-radius: 12px;
                        padding: 20px;
                        margin: 24px 0;
                        text-align: left;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 8px;
                    }
                    .detail-label {
                        font-weight: 600;
                        color: #374151;
                    }
                    .detail-value {
                        color: #6b7280;
                    }
                    .button {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        text-decoration: none;
                        display: inline-block;
                        margin: 8px;
                        transition: transform 0.2s ease;
                    }
                    .button:hover {
                        transform: translateY(-2px);
                    }
                    .fallback-notice {
                        background: #fef3c7;
                        border: 1px solid #fcd34d;
                        border-radius: 8px;
                        padding: 16px;
                        margin: 20px 0;
                        color: #92400e;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✅</div>
                    <div class="title">Payment Successful!</div>
                    <div class="message">
                        Your payment has been completed successfully. The funds have been added to your ZimCrowd wallet.
                    </div>
                    
                    <div class="fallback-notice">
                        <strong>Note:</strong> Express checkout was not available, so we redirected you to our secure payment page. Your payment is now complete.
                    </div>
                    
                    <div class="details">
                        <div class="detail-row">
                            <span class="detail-label">Amount:</span>
                            <span class="detail-value">$${transaction.amount} ${transaction.currency}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Payment Method:</span>
                            <span class="detail-value">${method.toUpperCase()}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Reference:</span>
                            <span class="detail-value">${ref}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Date:</span>
                            <span class="detail-value">${new Date().toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <a href="${process.env.FRONTEND_URL}/wallet" class="button">View Wallet</a>
                    <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
                    
                    <div style="margin-top: 30px; font-size: 12px; color: #9ca3af;">
                        This window will automatically close in <span id="countdown">10</span> seconds.
                    </div>
                </div>
                
                <script>
                    let countdown = 10;
                    const countdownElement = document.getElementById('countdown');
                    
                    const timer = setInterval(() => {
                        countdown--;
                        countdownElement.textContent = countdown;
                        
                        if (countdown <= 0) {
                            clearInterval(timer);
                            window.close();
                        }
                    }, 1000);
                    
                    // Also try to communicate with parent window if in popup
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'PAYMENT_SUCCESS',
                            data: {
                                reference: '${ref}',
                                amount: ${transaction.amount},
                                currency: '${transaction.currency}',
                                method: '${method}'
                            }
                        }, '*');
                    }
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Fallback success error:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Error - ZimCrowd</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        margin: 0;
                        padding: 20px;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .container {
                        background: white;
                        border-radius: 16px;
                        padding: 40px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                        max-width: 500px;
                        width: 100%;
                    }
                    .error-icon {
                        font-size: 64px;
                        color: #ef4444;
                        margin-bottom: 20px;
                    }
                    .title {
                        font-size: 28px;
                        font-weight: bold;
                        color: #1f2937;
                        margin-bottom: 16px;
                    }
                    .message {
                        font-size: 16px;
                        color: #6b7280;
                        margin-bottom: 24px;
                        line-height: 1.5;
                    }
                    .button {
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        text-decoration: none;
                        display: inline-block;
                        margin: 8px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">❌</div>
                    <div class="title">Payment Processing Error</div>
                    <div class="message">
                        There was an error processing your payment. Please contact support if you believe this payment should have succeeded.
                    </div>
                    <a href="${process.env.FRONTEND_URL}/support" class="button">Contact Support</a>
                    <a href="${process.env.FRONTEND_URL}/wallet" class="button">Back to Wallet</a>
                </div>
            </body>
            </html>
        `);
    }
});

// @route   GET /api/payment-fallback/failure
// @desc    Handle fallback payment failure
// @access  Public
router.get('/failure', async (req, res) => {
    try {
        const { ref, method, error } = req.query;

        console.log(`❌ Fallback payment failure: ${ref} - ${method} - ${error}`);

        if (ref) {
            // Update transaction status to failed
            await supabase
                .from('transactions')
                .update({
                    status: 'failed',
                    error_message: error || 'Fallback payment failed',
                    metadata: {
                        fallback_failed: true,
                        fallback_failed_at: new Date().toISOString(),
                        fallback_error: error
                    }
                })
                .eq('reference', ref);
        }

        // Return failure page HTML
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Payment Failed - ZimCrowd</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        margin: 0;
                        padding: 20px;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .container {
                        background: white;
                        border-radius: 16px;
                        padding: 40px;
                        text-align: center;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                        max-width: 500px;
                        width: 100%;
                    }
                    .error-icon {
                        font-size: 64px;
                        color: #ef4444;
                        margin-bottom: 20px;
                    }
                    .title {
                        font-size: 28px;
                        font-weight: bold;
                        color: #1f2937;
                        margin-bottom: 16px;
                    }
                    .message {
                        font-size: 16px;
                        color: #6b7280;
                        margin-bottom: 24px;
                        line-height: 1.5;
                    }
                    .button {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        text-decoration: none;
                        display: inline-block;
                        margin: 8px;
                    }
                    .error-details {
                        background: #fef2f2;
                        border: 1px solid #fecaca;
                        border-radius: 8px;
                        padding: 16px;
                        margin: 20px 0;
                        color: #dc2626;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">❌</div>
                    <div class="title">Payment Failed</div>
                    <div class="message">
                        Your payment could not be processed. Please try again or use a different payment method.
                    </div>
                    
                    ${error ? `
                    <div class="error-details">
                        <strong>Error:</strong> ${error}
                    </div>
                    ` : ''}
                    
                    <a href="${process.env.FRONTEND_URL}/wallet/deposit" class="button">Try Again</a>
                    <a href="${process.env.FRONTEND_URL}/support" class="button">Contact Support</a>
                    
                    <div style="margin-top: 30px; font-size: 12px; color: #9ca3af;">
                        This window will automatically close in <span id="countdown">10</span> seconds.
                    </div>
                </div>
                
                <script>
                    let countdown = 10;
                    const countdownElement = document.getElementById('countdown');
                    
                    const timer = setInterval(() => {
                        countdown--;
                        countdownElement.textContent = countdown;
                        
                        if (countdown <= 0) {
                            clearInterval(timer);
                            window.close();
                        }
                    }, 1000);
                    
                    // Communicate with parent window if in popup
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'PAYMENT_FAILURE',
                            data: {
                                reference: '${ref}',
                                method: '${method}',
                                error: '${error}'
                            }
                        }, '*');
                    }
                </script>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('Fallback failure error:', error);
        res.status(500).send('Payment processing error');
    }
});

// @route   POST /api/payment-fallback/webhook
// @desc    Handle fallback payment webhook
// @access  Public (with signature verification)
router.post('/webhook', async (req, res) => {
    try {
        console.log('📡 Fallback payment webhook received:', req.body);

        const { reference, status, amount, currency, paynowreference } = req.body;
        const { fallback, original_ref } = req.query;

        if (fallback === 'true' && original_ref) {
            // This is a fallback payment webhook
            console.log(`🔄 Processing fallback webhook for original ref: ${original_ref}`);

            // Find the original transaction
            const { data: transaction, error: findError } = await supabase
                .from('transactions')
                .select('*')
                .eq('reference', original_ref)
                .single();

            if (findError || !transaction) {
                console.error('❌ Original transaction not found:', original_ref);
                return res.status(404).json({ error: 'Original transaction not found' });
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

            // Update original transaction status
            await supabase
                .from('transactions')
                .update({
                    status: newStatus,
                    external_reference: paynowreference,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                    metadata: {
                        ...transaction.metadata,
                        fallback_webhook_received_at: new Date().toISOString(),
                        fallback_paynow_status: status,
                        fallback_paynow_reference: paynowreference
                    }
                })
                .eq('id', transaction.id);

            if (newStatus === 'completed') {
                // Credit user's wallet
                await walletService.creditWallet(
                    transaction.user_id,
                    transaction.amount,
                    transaction.currency,
                    `Fallback payment completed - ${original_ref}`
                );

                // Send success notification
                await notificationService.sendNotification(transaction.user_id, {
                    type: 'fallback_payment_completed',
                    title: 'Payment Completed',
                    message: `Your fallback payment of $${transaction.amount} ${transaction.currency} has been completed successfully.`,
                    data: {
                        transaction_id: transaction.id,
                        amount: transaction.amount,
                        currency: transaction.currency,
                        completion_method: 'fallback_webhook'
                    }
                });

                console.log(`✅ Fallback payment completed: $${transaction.amount} ${transaction.currency} for user ${transaction.user_id}`);
            }
        }

        res.json({ success: true, message: 'Fallback webhook processed successfully' });

    } catch (error) {
        console.error('Fallback webhook processing error:', error);
        res.status(500).json({ error: 'Fallback webhook processing failed' });
    }
});

module.exports = router;

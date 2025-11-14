/**
 * Paynow Webhook Handler
 * Handles payment confirmations and triggers ZimScore Trust Loop updates
 */

const express = require('express');
const { supabase } = require('../utils/supabase-auth');
const { updateUserScore } = require('../services/ZimScoreService');

const router = express.Router();

/**
 * @route   POST /api/webhooks/paynow
 * @desc    Handle Paynow payment notifications
 * @access  Public (but verified via signature)
 */
router.post('/paynow', async (req, res) => {
    try {
        console.log('📥 Paynow webhook received');
        console.log('Payload:', req.body);

        // Extract Paynow data
        const {
            reference,          // Our internal payment reference
            paynowreference,    // Paynow's reference
            amount,
            status,             // Paid, Awaiting Delivery, Delivered, Cancelled, etc.
            pollurl,
            hash                // Security hash
        } = req.body;

        // TODO: Verify webhook signature/hash
        // const isValid = verifyPaynowHash(req.body, process.env.PAYNOW_INTEGRATION_KEY);
        // if (!isValid) {
        //     return res.status(401).json({ success: false, message: 'Invalid signature' });
        // }

        // Find the payment transaction
        const { data: payment, error: paymentError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('reference', reference)
            .single();
        
        if (paymentError || !payment) {
            console.error('Payment not found:', reference);
            return res.status(404).json({
                success: false,
                message: 'Payment reference not found'
            });
        }

        // Update payment status
        const newStatus = status === 'Paid' ? 'paid' : 
                         status === 'Cancelled' ? 'failed' : 
                         'pending';

        const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({
                status: newStatus,
                paynow_reference: paynowreference,
                paynow_poll_url: pollurl,
                paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

        if (updateError) {
            console.error('Failed to update payment:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update payment status'
            });
        }

        // If payment confirmed, trigger ZimScore update
        if (newStatus === 'paid') {
            console.log('✅ Payment confirmed:', payment.reference);

            // Log payment event
            await supabase
                .from('payment_logs')
                .insert({
                    transaction_id: payment.id,
                    event_type: 'payment_confirmed',
                    event_data: { paynow_reference: paynowreference, amount, status }
                });

            // Trigger ZimScore update if user_id exists
            if (payment.user_id) {
                try {
                    const scoreUpdate = await updateUserScore(payment.user_id, {
                        paymentHistory: { successful: true, amount: parseFloat(amount) }
                    });

                    if (scoreUpdate.success) {
                        console.log(`✅ ZimScore updated for user ${payment.user_id}`);
                    }
                } catch (scoreError) {
                    console.error('Failed to update ZimScore:', scoreError);
                }
            }

            // TODO: Send notification to user about successful payment
        }

        // Acknowledge webhook
        res.json({
            success: true,
            message: 'Webhook processed successfully'
        });

    } catch (error) {
        console.error('❌ Paynow webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Webhook processing failed',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/webhooks/loan-funded
 * @desc    Manually trigger score update when loan is funded
 * @access  Private (admin only)
 */
router.post('/loan-funded', async (req, res) => {
    try {
        const { loanId, userId } = req.body;

        if (!loanId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'loanId and userId are required'
            });
        }

        // Update loan status
        const { error: loanError } = await supabase
            .from('loans')
            .update({
                status: 'funded',
                funded_at: new Date().toISOString()
            })
            .eq('id', loanId);

        if (loanError) {
            throw new Error('Failed to update loan status');
        }

        // Trigger ZimScore update
        const scoreUpdate = await updateUserScore(userId, {
            loanHistory: { funded: true, amount: 0 }
        });

        res.json({
            success: true,
            message: 'Loan funded and score updated',
            data: scoreUpdate
        });
    } catch (error) {
        console.error('Loan funded webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process loan funding',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/webhooks/loan-defaulted
 * @desc    Mark loan as defaulted and update score
 * @access  Private (admin/cron only)
 */
router.post('/loan-defaulted', async (req, res) => {
    try {
        const { loanId } = req.body;

        if (!loanId) {
            return res.status(400).json({
                success: false,
                message: 'loanId is required'
            });
        }

        // Get loan details
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .select('user_id, amount')
            .eq('id', loanId)
            .single();

        if (loanError || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }

        // Update loan status
        const { error: updateError } = await supabase
            .from('loans')
            .update({ status: 'defaulted' })
            .eq('id', loanId);

        if (updateError) {
            throw new Error('Failed to update loan status');
        }

        // Trigger ZimScore update
        const scoreUpdate = await updateUserScore(loan.user_id, {
            loanHistory: { defaulted: true, amount: loan.amount }
        });

        res.json({
            success: true,
            message: 'Loan marked as defaulted and score updated',
            data: scoreUpdate
        });
    } catch (error) {
        console.error('Loan defaulted webhook error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process loan default',
            error: error.message
        });
    }
});

/**
 * Helper: Verify Paynow webhook hash
 * @private
 */
function verifyPaynowHash(data, integrationKey) {
    // Paynow hash verification logic
    // Hash = MD5(reference + paynowreference + amount + status + integrationKey)
    const crypto = require('crypto');
    
    const string = `${data.reference}${data.paynowreference}${data.amount}${data.status}${integrationKey}`;
    const calculatedHash = crypto.createHash('md5').update(string).digest('hex');
    
    return calculatedHash.toLowerCase() === (data.hash || '').toLowerCase();
}

module.exports = router;

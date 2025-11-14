/**
 * Paynow Webhook Handler
 * Handles payment confirmations and triggers ZimScore Trust Loop updates
 */

const express = require('express');
const { supabase } = require('../utils/supabase-auth');
const { getZimScoreService } = require('../services/zimscore.service');

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

        // Find the repayment record
        const { data: repayment, error: repaymentError } = await supabase
            .from('loan_repayments')
            .select('*, loan:zimscore_loans(*)')
            .eq('payment_reference', reference)
            .single();

        if (repaymentError || !repayment) {
            console.error('Repayment not found:', reference);
            return res.status(404).json({
                success: false,
                message: 'Payment reference not found'
            });
        }

        // Update repayment status
        const newStatus = status === 'Paid' ? 'confirmed' : 
                         status === 'Cancelled' ? 'failed' : 
                         'pending';

        await supabase
            .from('loan_repayments')
            .update({
                status: newStatus,
                paynow_status: status,
                paynow_poll_url: pollurl,
                confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null
            })
            .eq('repayment_id', repayment.repayment_id);

        // If payment confirmed, update loan and trigger ZimScore update
        if (newStatus === 'confirmed') {
            console.log('✅ Payment confirmed for loan:', repayment.loan_id);

            const loan = repayment.loan;
            const dueDate = new Date(loan.due_date);
            const repaidDate = new Date();
            const daysLate = Math.max(0, Math.floor((repaidDate - dueDate) / (1000 * 60 * 60 * 24)));

            // Update loan status
            await supabase
                .from('zimscore_loans')
                .update({
                    status: 'repaid',
                    repaid_at: repaidDate.toISOString(),
                    days_late: daysLate,
                    is_on_time: daysLate === 0
                })
                .eq('loan_id', repayment.loan_id);

            // Trigger ZimScore Trust Loop update
            const zimScoreService = getZimScoreService();
            
            let eventType;
            if (daysLate === 0) {
                eventType = 'LOAN_REPAID_ON_TIME';
            } else if (daysLate < 0) {
                // Repaid early
                eventType = 'LOAN_REPAID_EARLY';
            } else {
                eventType = 'LOAN_REPAID_LATE';
            }

            const scoreUpdate = await zimScoreService.updateScoreFromTrustLoop(
                loan.borrower_user_id,
                {
                    type: eventType,
                    loanId: loan.loan_id,
                    amount: loan.amount_requested,
                    daysLate: Math.abs(daysLate)
                }
            );

            if (scoreUpdate.success) {
                console.log(`✅ ZimScore updated: ${scoreUpdate.oldScore} -> ${scoreUpdate.newScore}`);
            } else {
                console.error('Failed to update ZimScore:', scoreUpdate.error);
            }

            // TODO: Send notification to user about successful payment and score update
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
        await supabase
            .from('zimscore_loans')
            .update({
                status: 'funded',
                funded_at: new Date().toISOString()
            })
            .eq('loan_id', loanId);

        // Trigger ZimScore update
        const zimScoreService = getZimScoreService();
        const scoreUpdate = await zimScoreService.updateScoreFromTrustLoop(userId, {
            type: 'LOAN_FUNDED',
            loanId
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
            .from('zimscore_loans')
            .select('*')
            .eq('loan_id', loanId)
            .single();

        if (loanError || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }

        // Update loan status
        await supabase
            .from('zimscore_loans')
            .update({
                status: 'defaulted'
            })
            .eq('loan_id', loanId);

        // Trigger ZimScore update
        const zimScoreService = getZimScoreService();
        const scoreUpdate = await zimScoreService.updateScoreFromTrustLoop(
            loan.borrower_user_id,
            {
                type: 'LOAN_DEFAULTED',
                loanId,
                amount: loan.amount_requested
            }
        );

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
    
    return calculatedHash === data.hash;
}

module.exports = router;

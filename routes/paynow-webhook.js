/**
 * Paynow Webhook Handler
 * Handles payment confirmations and triggers ZimScore Trust Loop updates
 */

const express = require('express');
const { dbPool } = require('../database');
const { updateZimScoreInDB } = require('../services/ZimScoreService');

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

        // Find the repayment record with loan details
        const repaymentQuery = `
            SELECT 
                lr.*,
                l.borrower_user_id,
                l.due_date,
                l.amount_requested
            FROM loan_repayments lr
            JOIN loans l ON lr.loan_id = l.loan_id
            WHERE lr.payment_reference = $1
        `;
        
        const repaymentResult = await dbPool.query(repaymentQuery, [reference]);
        
        if (repaymentResult.rows.length === 0) {
            console.error('Repayment not found:', reference);
            return res.status(404).json({
                success: false,
                message: 'Payment reference not found'
            });
        }
        
        const repayment = repaymentResult.rows[0];

        // Update repayment status
        const newStatus = status === 'Paid' ? 'confirmed' : 
                         status === 'Cancelled' ? 'failed' : 
                         'pending';

        const updateRepaymentQuery = `
            UPDATE loan_repayments
            SET status = $1,
                paynow_status = $2,
                paynow_poll_url = $3,
                confirmed_at = $4
            WHERE repayment_id = $5
        `;
        
        await dbPool.query(updateRepaymentQuery, [
            newStatus,
            status,
            pollurl,
            newStatus === 'confirmed' ? new Date().toISOString() : null,
            repayment.repayment_id
        ]);

        // If payment confirmed, update loan and trigger ZimScore update
        if (newStatus === 'confirmed') {
            console.log('✅ Payment confirmed for loan:', repayment.loan_id);

            const dueDate = new Date(repayment.due_date);
            const repaidDate = new Date();
            const daysLate = Math.max(0, Math.floor((repaidDate - dueDate) / (1000 * 60 * 60 * 24)));

            // Update loan status
            const updateLoanQuery = `
                UPDATE loans
                SET status = $1,
                    repaid_at = $2
                WHERE loan_id = $3
            `;
            
            await dbPool.query(updateLoanQuery, [
                'repaid',
                repaidDate.toISOString(),
                repayment.loan_id
            ]);

            // Trigger ZimScore Trust Loop update
            // This will recalculate the score based on the new loan status
            const scoreUpdate = await updateZimScoreInDB(repayment.borrower_user_id);

            if (scoreUpdate.success) {
                console.log(`✅ ZimScore updated to: ${scoreUpdate.scoreValue}/85 (${scoreUpdate.starRating}⭐)`);
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
        const updateQuery = `
            UPDATE loans
            SET status = $1,
                funded_at = NOW()
            WHERE loan_id = $2
        `;
        
        await dbPool.query(updateQuery, ['funded', loanId]);

        // Trigger ZimScore update
        const scoreUpdate = await updateZimScoreInDB(userId);

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
        const loanQuery = `
            SELECT borrower_user_id, amount_requested
            FROM loans
            WHERE loan_id = $1
        `;
        
        const loanResult = await dbPool.query(loanQuery, [loanId]);

        if (loanResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }
        
        const loan = loanResult.rows[0];

        // Update loan status
        const updateQuery = `
            UPDATE loans
            SET status = $1
            WHERE loan_id = $2
        `;
        
        await dbPool.query(updateQuery, ['default', loanId]);

        // Trigger ZimScore update
        const scoreUpdate = await updateZimScoreInDB(loan.borrower_user_id);

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

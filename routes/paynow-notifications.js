/**
 * Paynow Custom Button Template Notification Handler
 * Handles notification, success, and cancel callbacks from custom templates
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { supabase } = require('../utils/supabase-auth');

/**
 * Verify hash from Paynow notification
 * @param {Object} postData - POST data from Paynow
 * @param {string} integrationKey - Integration key for the template
 * @returns {boolean} True if hash is valid
 */
function verifyNotificationHash(postData, integrationKey) {
    try {
        const receivedHash = postData.Hash;
        
        if (!receivedHash) {
            console.error('❌ No hash provided in notification');
            return false;
        }

        // Step 1: Concatenate key + value pairs in order (excluding Hash field)
        let hashString = '';
        
        // Get all keys except Hash, in the order they appear
        const keys = Object.keys(postData).filter(key => key !== 'Hash');
        
        keys.forEach(key => {
            const value = postData[key];
            if (value !== undefined && value !== null) {
                hashString += key + value;
            }
        });

        // Step 2: Append integration key
        hashString += integrationKey;

        // Step 3: UTF-8 encode (Node.js handles this automatically)
        // Step 4: SHA512 hash and output as uppercase hex
        const calculatedHash = crypto
            .createHash('sha512')
            .update(hashString, 'utf8')
            .digest('hex')
            .toUpperCase();

        const isValid = calculatedHash === receivedHash.toUpperCase();

        if (!isValid) {
            console.error('❌ Hash validation failed');
            console.error('Received:', receivedHash);
            console.error('Calculated:', calculatedHash);
            console.error('Hash string:', hashString);
        }

        return isValid;
    } catch (error) {
        console.error('❌ Error verifying hash:', error);
        return false;
    }
}

/**
 * POST /api/paynow-notifications/notification
 * Handle notification from Paynow custom button template
 */
router.post('/notification', async (req, res) => {
    try {
        console.log('📥 Paynow notification received:', req.body);

        // Extract standard fields
        const {
            Paynow_Reference,
            Customer_Name,
            Customer_Email,
            Customer_Phone,
            Transaction_Amount,
            Amount_Paid,
            Hash,
            ...customFields
        } = req.body;

        // Get integration key from environment
        const integrationKey = process.env.PAYNOW_TEMPLATE_INTEGRATION_KEY || 
                              process.env.PAYNOW_USD_INTEGRATION_KEY;

        if (!integrationKey) {
            console.error('❌ Integration key not configured');
            return res.status(500).send('CONFIGURATION_ERROR');
        }

        // Verify hash
        const isValidHash = verifyNotificationHash(req.body, integrationKey);
        
        if (!isValidHash) {
            console.error('❌ Invalid hash - possible spoofed request');
            return res.status(400).send('INVALID_HASH');
        }

        console.log('✅ Hash verified successfully');

        // Store notification in database
        const { data: notification, error: insertError } = await supabase
            .from('paynow_notifications')
            .insert({
                paynow_reference: Paynow_Reference,
                customer_name: Customer_Name,
                customer_email: Customer_Email,
                customer_phone: Customer_Phone,
                transaction_amount: parseFloat(Transaction_Amount),
                amount_paid: parseFloat(Amount_Paid),
                custom_fields: customFields,
                notification_data: req.body,
                received_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('❌ Error storing notification:', insertError);
        } else {
            console.log('✅ Notification stored:', notification.id);
        }

        // Process payment based on your business logic
        // Example: Credit wallet, fulfill order, send confirmation email, etc.
        
        // Try to find related transaction by amount and email
        const { data: transaction } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('amount', parseFloat(Transaction_Amount))
            .eq('user_email', Customer_Email)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (transaction) {
            // Update transaction status
            await supabase
                .from('payment_transactions')
                .update({
                    status: 'paid',
                    paynow_reference: Paynow_Reference,
                    paid_at: new Date().toISOString(),
                    payment_details: {
                        customer_name: Customer_Name,
                        customer_phone: Customer_Phone,
                        amount_paid: Amount_Paid,
                        custom_fields: customFields
                    }
                })
                .eq('id', transaction.id);

            // Credit wallet if not already credited
            if (!transaction.wallet_credited && transaction.user_id) {
                const { error: walletError } = await supabase.rpc('credit_wallet', {
                    p_user_id: transaction.user_id,
                    p_amount: parseFloat(Transaction_Amount),
                    p_transaction_ref: Paynow_Reference,
                    p_description: `Payment via Custom Template`
                });

                if (!walletError) {
                    await supabase
                        .from('payment_transactions')
                        .update({ wallet_credited: true })
                        .eq('id', transaction.id);
                    
                    console.log('✅ Wallet credited:', transaction.user_id, Transaction_Amount);
                }
            }
        }

        // Respond to Paynow
        res.status(200).send('OK');

    } catch (error) {
        console.error('❌ Error processing notification:', error);
        res.status(500).send('ERROR');
    }
});

/**
 * GET /api/paynow-notifications/success
 * Handle success redirect from Paynow
 */
router.get('/success', async (req, res) => {
    try {
        console.log('✅ Payment success redirect received');
        
        // Redirect to frontend success page
        const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
        res.redirect(`${frontendUrl}/dashboard.html?payment=success&source=template`);

    } catch (error) {
        console.error('❌ Error handling success redirect:', error);
        res.status(500).send('Error processing success redirect');
    }
});

/**
 * GET /api/paynow-notifications/cancel
 * Handle cancel redirect from Paynow
 */
router.get('/cancel', async (req, res) => {
    try {
        console.log('❌ Payment cancelled by user');
        
        // Redirect to frontend cancel page
        const frontendUrl = process.env.FRONTEND_URL || 'https://zimcrowd.com';
        res.redirect(`${frontendUrl}/dashboard.html?payment=cancelled&source=template`);

    } catch (error) {
        console.error('❌ Error handling cancel redirect:', error);
        res.status(500).send('Error processing cancel redirect');
    }
});

/**
 * GET /api/paynow-notifications/history
 * Get notification history (admin only)
 */
router.get('/history', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const { data: notifications, error } = await supabase
            .from('paynow_notifications')
            .select('*')
            .order('received_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            notifications,
            count: notifications.length
        });

    } catch (error) {
        console.error('Error fetching notification history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notification history'
        });
    }
});

/**
 * POST /api/paynow-notifications/test-hash
 * Test hash generation (development only)
 */
router.post('/test-hash', (req, res) => {
    try {
        const { data, integrationKey } = req.body;

        if (!data || !integrationKey) {
            return res.status(400).json({
                success: false,
                error: 'data and integrationKey are required'
            });
        }

        const isValid = verifyNotificationHash(data, integrationKey);

        // Also generate what the hash should be
        let hashString = '';
        const keys = Object.keys(data).filter(key => key !== 'Hash');
        keys.forEach(key => {
            hashString += key + data[key];
        });
        hashString += integrationKey;

        const calculatedHash = crypto
            .createHash('sha512')
            .update(hashString, 'utf8')
            .digest('hex')
            .toUpperCase();

        res.json({
            success: true,
            isValid,
            receivedHash: data.Hash,
            calculatedHash,
            hashString
        });

    } catch (error) {
        console.error('Error testing hash:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

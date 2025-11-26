/**
 * Notification Webhooks - Production Ready
 * Handles incoming webhooks from external services (email, SMS providers, etc.)
 */

const express = require('express');
const crypto = require('crypto');
const { supabase } = require('../utils/supabase-auth');
const pushNotificationService = require('../services/push-notification.service');

const router = express.Router();

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(JSON.stringify(payload)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * @route   POST /api/webhooks/notifications/resend
 * @desc    Handle Resend email delivery webhooks
 * @access  Public (with signature verification)
 */
router.post('/resend', async (req, res) => {
    try {
        const signature = req.headers['resend-signature'];
        const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
        
        // Verify signature
        if (webhookSecret && signature) {
            const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
            if (!isValid) {
                console.error('❌ Invalid Resend webhook signature');
                return res.status(401).json({ error: 'Invalid signature' });
            }
        }
        
        const { type, data } = req.body;
        
        console.log('📧 Resend webhook received:', type);
        
        // Handle different event types
        switch (type) {
            case 'email.sent':
                await handleEmailSent(data);
                break;
            case 'email.delivered':
                await handleEmailDelivered(data);
                break;
            case 'email.delivery_delayed':
                await handleEmailDelayed(data);
                break;
            case 'email.bounced':
                await handleEmailBounced(data);
                break;
            case 'email.complained':
                await handleEmailComplained(data);
                break;
            case 'email.opened':
                await handleEmailOpened(data);
                break;
            case 'email.clicked':
                await handleEmailClicked(data);
                break;
            default:
                console.log('Unknown event type:', type);
        }
        
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('❌ Resend webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * @route   POST /api/webhooks/notifications/twilio
 * @desc    Handle Twilio SMS delivery webhooks
 * @access  Public (with signature verification)
 */
router.post('/twilio', async (req, res) => {
    try {
        const twilioSignature = req.headers['x-twilio-signature'];
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        
        // Verify Twilio signature
        if (process.env.TWILIO_AUTH_TOKEN && twilioSignature) {
            const twilio = require('twilio');
            const isValid = twilio.validateRequest(
                process.env.TWILIO_AUTH_TOKEN,
                twilioSignature,
                url,
                req.body
            );
            
            if (!isValid) {
                console.error('❌ Invalid Twilio webhook signature');
                return res.status(401).send('Invalid signature');
            }
        }
        
        const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;
        
        console.log('📱 Twilio webhook received:', MessageStatus, 'for', MessageSid);
        
        // Update delivery log
        await updateSMSDeliveryStatus(MessageSid, MessageStatus, ErrorCode, ErrorMessage);
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Twilio webhook error:', error);
        res.status(500).send('Error');
    }
});

/**
 * @route   POST /api/webhooks/notifications/custom
 * @desc    Custom webhook for internal notification triggers
 * @access  Private (API key required)
 */
router.post('/custom', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (apiKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const { event, userId, data } = req.body;
        
        console.log('🔔 Custom notification webhook:', event, 'for user', userId);
        
        // Handle different notification events
        switch (event) {
            case 'loan.approved':
                await createNotification(userId, {
                    type: 'loan_approved',
                    title: '🎉 Loan Approved!',
                    message: `Your loan application for $${data.amount} has been approved.`,
                    category: 'loans',
                    priority: 'high',
                    action_url: '/dashboard#loans',
                    data: data
                });
                
                // Send push notification
                await pushNotificationService.sendNotification(
                    userId,
                    '🎉 Loan Approved!',
                    `Your loan application for $${data.amount} has been approved.`,
                    {
                        notification_type: 'loan_approved',
                        action_url: 'https://zimcrowd.com/dashboard#loans',
                        loanId: data.loanId
                    }
                );
                break;
                
            case 'loan.rejected':
                await createNotification(userId, {
                    type: 'loan_rejected',
                    title: 'Loan Application Update',
                    message: 'Your loan application requires additional review.',
                    category: 'loans',
                    priority: 'normal',
                    action_url: '/dashboard#loans',
                    data: data
                });
                break;
                
            case 'payment.received':
                await createNotification(userId, {
                    type: 'payment_received',
                    title: '💰 Payment Received',
                    message: `Payment of $${data.amount} has been received.`,
                    category: 'payments',
                    priority: 'normal',
                    action_url: '/dashboard#transactions',
                    data: data
                });
                break;
                
            case 'payment.due':
                await createNotification(userId, {
                    type: 'payment_due',
                    title: '⏰ Payment Due Soon',
                    message: `Your payment of $${data.amount} is due on ${data.dueDate}.`,
                    category: 'payments',
                    priority: 'high',
                    action_url: '/dashboard#loans',
                    data: data
                });
                break;
                
            case 'investment.matured':
                await createNotification(userId, {
                    type: 'investment_matured',
                    title: '🎊 Investment Matured',
                    message: `Your investment has matured. Total return: $${data.return}.`,
                    category: 'investments',
                    priority: 'high',
                    action_url: '/dashboard#investments',
                    data: data
                });
                break;
                
            case 'referral.bonus':
                await createNotification(userId, {
                    type: 'referral_bonus',
                    title: '🎁 Referral Bonus Earned',
                    message: `You earned $${data.amount} for referring ${data.referredName}.`,
                    category: 'referrals',
                    priority: 'normal',
                    action_url: '/dashboard#referrals',
                    data: data
                });
                break;
                
            case 'wallet.credited':
                await createNotification(userId, {
                    type: 'wallet_credited',
                    title: '💵 Wallet Credited',
                    message: `$${data.amount} has been added to your wallet.`,
                    category: 'wallet',
                    priority: 'normal',
                    action_url: '/dashboard#wallet',
                    data: data
                });
                break;
                
            case 'security.alert':
                await createNotification(userId, {
                    type: 'security_alert',
                    title: '🔒 Security Alert',
                    message: data.message || 'Unusual activity detected on your account.',
                    category: 'security',
                    priority: 'urgent',
                    action_url: '/dashboard#settings',
                    data: data
                });
                break;
                
            default:
                console.log('Unknown event type:', event);
        }
        
        res.status(200).json({ success: true, message: 'Notification created' });
    } catch (error) {
        console.error('❌ Custom webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Helper functions

async function handleEmailSent(data) {
    const { email_id, to, subject } = data;
    
    await supabase
        .from('notification_delivery_log')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: email_id
        })
        .eq('recipient_address', to[0])
        .eq('subject', subject);
}

async function handleEmailDelivered(data) {
    const { email_id } = data;
    
    await supabase
        .from('notification_delivery_log')
        .update({
            status: 'delivered',
            delivered_at: new Date().toISOString()
        })
        .eq('provider_message_id', email_id);
}

async function handleEmailDelayed(data) {
    const { email_id, error } = data;
    
    await supabase
        .from('notification_delivery_log')
        .update({
            status: 'delayed',
            error_message: error?.message || 'Delivery delayed'
        })
        .eq('provider_message_id', email_id);
}

async function handleEmailBounced(data) {
    const { email_id, bounce } = data;
    
    await supabase
        .from('notification_delivery_log')
        .update({
            status: 'bounced',
            error_message: bounce?.message || 'Email bounced'
        })
        .eq('provider_message_id', email_id);
}

async function handleEmailComplained(data) {
    const { email_id } = data;
    
    await supabase
        .from('notification_delivery_log')
        .update({
            status: 'complained',
            error_message: 'Recipient marked as spam'
        })
        .eq('provider_message_id', email_id);
}

async function handleEmailOpened(data) {
    const { email_id } = data;
    
    await supabase
        .from('notification_delivery_log')
        .update({
            opened_at: new Date().toISOString()
        })
        .eq('provider_message_id', email_id);
}

async function handleEmailClicked(data) {
    const { email_id } = data;
    
    await supabase
        .from('notification_delivery_log')
        .update({
            clicked_at: new Date().toISOString()
        })
        .eq('provider_message_id', email_id);
}

async function updateSMSDeliveryStatus(messageSid, status, errorCode, errorMessage) {
    const statusMap = {
        'queued': 'pending',
        'sending': 'pending',
        'sent': 'sent',
        'delivered': 'delivered',
        'undelivered': 'failed',
        'failed': 'failed'
    };
    
    const updateData = {
        status: statusMap[status] || status,
        provider_message_id: messageSid
    };
    
    if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
    }
    
    if (errorCode || errorMessage) {
        updateData.error_message = `${errorCode}: ${errorMessage}`;
    }
    
    await supabase
        .from('notification_delivery_log')
        .update(updateData)
        .eq('provider_message_id', messageSid);
}

async function createNotification(userId, notificationData) {
    const { data, error } = await supabase
        .from('user_notifications')
        .insert({
            user_id: userId,
            notification_type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            category: notificationData.category,
            priority: notificationData.priority || 'normal',
            action_url: notificationData.action_url,
            data: notificationData.data || {},
            is_read: false
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
    
    console.log('✅ Notification created:', data.id);
    return data;
}

module.exports = router;

/**
 * Push Notification Service - OneSignal Integration
 * Production Ready
 */

const axios = require('axios');
const { supabase } = require('../utils/supabase-auth');

class PushNotificationService {
    constructor() {
        this.enabled = process.env.PUSH_NOTIFICATIONS_ENABLED === 'true';
        this.appId = process.env.ONESIGNAL_APP_ID;
        this.restApiKey = process.env.ONESIGNAL_REST_API_KEY;
        this.apiUrl = 'https://onesignal.com/api/v1';
        
        if (this.enabled) {
            console.log('✅ Push Notification Service initialized');
        } else {
            console.log('⚠️ Push Notification Service disabled');
        }
    }

    /**
     * Send push notification to a single user
     */
    async sendNotification(userId, title, message, data = {}) {
        if (!this.enabled) {
            console.log('Push notifications disabled');
            return { success: false, error: 'Push notifications disabled' };
        }

        try {
            // Get user's OneSignal player ID from database
            const { data: subscription, error: subError } = await supabase
                .from('push_subscriptions')
                .select('player_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();

            if (subError || !subscription) {
                console.log(`No active push subscription for user ${userId}`);
                return { success: false, error: 'User not subscribed to push' };
            }

            const payload = {
                app_id: this.appId,
                include_player_ids: [subscription.player_id],
                headings: { en: title },
                contents: { en: message },
                data: data,
                url: data.action_url || 'https://zimcrowd.com/dashboard',
                web_buttons: [
                    {
                        id: 'view-details',
                        text: 'View Details',
                        icon: 'https://zimcrowd.com/icon.png',
                        url: data.action_url || 'https://zimcrowd.com/dashboard'
                    }
                ],
                // iOS specific
                ios_badgeType: 'Increase',
                ios_badgeCount: 1,
                // Android specific
                android_channel_id: '550e8400-e29b-41d4-a716-446655440000'
            };

            const response = await axios.post(
                `${this.apiUrl}/notifications`,
                payload,
                {
                    headers: {
                        'Authorization': `Basic ${this.restApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Push notification sent:', {
                userId,
                notificationId: response.data.id,
                recipients: response.data.recipients
            });

            // Log to delivery log
            await this.logDelivery(userId, title, message, response.data.id, 'sent');

            return {
                success: true,
                notificationId: response.data.id,
                recipients: response.data.recipients
            };
        } catch (error) {
            console.error('❌ Push notification error:', error.response?.data || error.message);
            
            // Log failed delivery
            await this.logDelivery(userId, title, message, null, 'failed', error.message);
            
            return {
                success: false,
                error: error.response?.data?.errors?.[0] || error.message
            };
        }
    }

    /**
     * Send push notification to multiple users
     */
    async sendToMultipleUsers(userIds, title, message, data = {}) {
        const results = await Promise.allSettled(
            userIds.map(userId => this.sendNotification(userId, title, message, data))
        );

        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        console.log(`📊 Bulk push sent: ${successful} successful, ${failed} failed`);

        return {
            success: true,
            sent: successful,
            failed: failed,
            results: results
        };
    }

    /**
     * Send to all users in a segment
     */
    async sendToSegment(segment, title, message, data = {}) {
        if (!this.enabled) {
            return { success: false, error: 'Push notifications disabled' };
        }

        try {
            const payload = {
                app_id: this.appId,
                included_segments: [segment],
                headings: { en: title },
                contents: { en: message },
                data: data,
                url: data.action_url || 'https://zimcrowd.com/dashboard'
            };

            const response = await axios.post(
                `${this.apiUrl}/notifications`,
                payload,
                {
                    headers: {
                        'Authorization': `Basic ${this.restApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`✅ Segment push sent to "${segment}":`, response.data);

            return {
                success: true,
                notificationId: response.data.id,
                recipients: response.data.recipients
            };
        } catch (error) {
            console.error('❌ Segment push error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send to all active users
     */
    async sendToAll(title, message, data = {}) {
        return this.sendToSegment('Active Users', title, message, data);
    }

    /**
     * Cancel a scheduled notification
     */
    async cancelNotification(notificationId) {
        try {
            await axios.delete(
                `${this.apiUrl}/notifications/${notificationId}?app_id=${this.appId}`,
                {
                    headers: {
                        'Authorization': `Basic ${this.restApiKey}`
                    }
                }
            );

            console.log(`✅ Notification ${notificationId} cancelled`);
            return { success: true };
        } catch (error) {
            console.error('❌ Cancel notification error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get notification delivery stats
     */
    async getNotificationStats(notificationId) {
        try {
            const response = await axios.get(
                `${this.apiUrl}/notifications/${notificationId}?app_id=${this.appId}`,
                {
                    headers: {
                        'Authorization': `Basic ${this.restApiKey}`
                    }
                }
            );

            return {
                success: true,
                stats: {
                    sent: response.data.successful,
                    failed: response.data.failed,
                    errored: response.data.errored,
                    converted: response.data.converted,
                    remaining: response.data.remaining
                }
            };
        } catch (error) {
            console.error('❌ Get stats error:', error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log delivery to database
     */
    async logDelivery(userId, title, message, notificationId, status, errorMessage = null) {
        try {
            await supabase
                .from('notification_delivery_log')
                .insert({
                    user_id: userId,
                    delivery_method: 'push',
                    subject: title,
                    content: message,
                    status: status,
                    provider: 'onesignal',
                    provider_message_id: notificationId,
                    error_message: errorMessage,
                    sent_at: status === 'sent' ? new Date().toISOString() : null
                });
        } catch (error) {
            console.error('Failed to log push delivery:', error);
        }
    }
}

module.exports = new PushNotificationService();

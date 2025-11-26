/**
 * OneSignal Push Notifications - Frontend Integration
 * Production Ready
 */

(function() {
    'use strict';
    
    const OneSignalConfig = {
        appId: '', // Will be set from backend config
        initialized: false,
        
        async init() {
            try {
                // Get OneSignal App ID from backend config
                const appId = await this.getAppId();
                if (!appId) {
                    console.warn('OneSignal App ID not configured');
                    return;
                }
                
                this.appId = appId;
                
                // Load OneSignal SDK
                await this.loadSDK();
                
                // Initialize OneSignal
                await this.initializeOneSignal();
                
                // Setup event listeners
                this.setupEventListeners();
                
                this.initialized = true;
                console.log('✅ OneSignal initialized successfully');
            } catch (error) {
                console.error('❌ OneSignal initialization failed:', error);
            }
        },
        
        async getAppId() {
            try {
                const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
                const response = await fetch(`${apiBase}/api/config/onesignal`);
                
                if (response.ok) {
                    const config = await response.json();
                    return config.appId;
                }
            } catch (error) {
                console.error('Failed to get OneSignal config:', error);
            }
            
            // Fallback: try to get from meta tag
            const metaTag = document.querySelector('meta[name="onesignal-app-id"]');
            return metaTag ? metaTag.content : null;
        },
        
        loadSDK() {
            return new Promise((resolve, reject) => {
                if (window.OneSignal) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
                script.defer = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },
        
        async initializeOneSignal() {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            
            return new Promise((resolve) => {
                window.OneSignalDeferred.push(async (OneSignal) => {
                    await OneSignal.init({
                        appId: this.appId,
                        allowLocalhostAsSecureOrigin: true, // For testing
                        
                        // Notification settings
                        notifyButton: {
                            enable: false // We'll use custom UI
                        },
                        
                        // Welcome notification
                        welcomeNotification: {
                            disable: true // We'll handle this ourselves
                        },
                        
                        // Prompt options
                        promptOptions: {
                            slidedown: {
                                enabled: true,
                                actionMessage: "Stay updated on loans, payments, and investments",
                                acceptButtonText: "Allow Notifications",
                                cancelButtonText: "Not Now",
                                categories: {
                                    tags: [
                                        {
                                            tag: "loans",
                                            label: "Loan Updates"
                                        },
                                        {
                                            tag: "payments",
                                            label: "Payment Reminders"
                                        },
                                        {
                                            tag: "investments",
                                            label: "Investment Updates"
                                        }
                                    ]
                                }
                            }
                        }
                    });
                    
                    resolve();
                });
            });
        },
        
        setupEventListeners() {
            if (!window.OneSignal) return;
            
            window.OneSignalDeferred.push((OneSignal) => {
                // Listen for subscription changes
                OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
                    console.log('Push subscription changed:', event);
                    
                    if (event.current.optedIn) {
                        console.log('✅ User subscribed to push notifications');
                        await this.saveSubscription(event.current.id, event.current.token);
                    } else {
                        console.log('❌ User unsubscribed from push notifications');
                        await this.removeSubscription();
                    }
                });
                
                // Listen for notification clicks
                OneSignal.Notifications.addEventListener('click', (event) => {
                    console.log('Notification clicked:', event);
                    
                    // Handle custom actions
                    if (event.notification.data?.action_url) {
                        window.location.href = event.notification.data.action_url;
                    }
                });
                
                // Listen for notification display
                OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
                    console.log('Notification will display:', event);
                    
                    // You can prevent the notification from showing
                    // event.preventDefault();
                    
                    // Or modify the notification
                    // event.notification.title = "Modified Title";
                });
            });
        },
        
        async saveSubscription(playerId, token) {
            try {
                const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
                const authToken = localStorage.getItem('authToken');
                
                if (!authToken) {
                    console.warn('No auth token, cannot save subscription');
                    return;
                }
                
                const response = await fetch(`${apiBase}/api/notifications/push-subscription`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        playerId: playerId,
                        token: token,
                        platform: 'web',
                        deviceType: this.getDeviceType(),
                        browser: this.getBrowser()
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Push subscription saved to backend');
                } else {
                    console.error('❌ Failed to save push subscription');
                }
            } catch (error) {
                console.error('Error saving push subscription:', error);
            }
        },
        
        async removeSubscription() {
            try {
                const apiBase = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-backend.vercel.app';
                const authToken = localStorage.getItem('authToken');
                
                if (!authToken) return;
                
                await fetch(`${apiBase}/api/notifications/push-subscription`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('✅ Push subscription removed from backend');
            } catch (error) {
                console.error('Error removing push subscription:', error);
            }
        },
        
        async promptUser() {
            if (!window.OneSignal) {
                console.warn('OneSignal not initialized');
                return;
            }
            
            try {
                await window.OneSignal.Slidedown.promptPush();
            } catch (error) {
                console.error('Error showing push prompt:', error);
            }
        },
        
        async isSubscribed() {
            if (!window.OneSignal) return false;
            
            try {
                const subscription = await window.OneSignal.User.PushSubscription.optedIn;
                return subscription;
            } catch (error) {
                return false;
            }
        },
        
        async getPlayerId() {
            if (!window.OneSignal) return null;
            
            try {
                return await window.OneSignal.User.PushSubscription.id;
            } catch (error) {
                return null;
            }
        },
        
        getDeviceType() {
            const ua = navigator.userAgent;
            if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
            if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) return 'mobile';
            return 'desktop';
        },
        
        getBrowser() {
            const ua = navigator.userAgent;
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Chrome')) return 'Chrome';
            if (ua.includes('Safari')) return 'Safari';
            if (ua.includes('Edge')) return 'Edge';
            if (ua.includes('Opera')) return 'Opera';
            return 'Unknown';
        }
    };
    
    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            OneSignalConfig.init();
        });
    } else {
        OneSignalConfig.init();
    }
    
    // Export for global access
    window.OneSignalConfig = OneSignalConfig;
})();

// Custom UI for push notification prompt
function showPushNotificationPrompt() {
    if (!window.OneSignalConfig || !window.OneSignalConfig.initialized) {
        console.warn('OneSignal not initialized');
        return;
    }
    
    // Check if already subscribed
    window.OneSignalConfig.isSubscribed().then(isSubscribed => {
        if (isSubscribed) {
            alert('You are already subscribed to push notifications!');
            return;
        }
        
        // Show custom prompt or use OneSignal's
        window.OneSignalConfig.promptUser();
    });
}

// Add to notification settings page
function togglePushNotifications(enabled) {
    if (!window.OneSignal) return;
    
    if (enabled) {
        window.OneSignalConfig.promptUser();
    } else {
        window.OneSignal.User.PushSubscription.optOut();
    }
}

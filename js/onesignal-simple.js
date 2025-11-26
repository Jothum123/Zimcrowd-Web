/**
 * OneSignal Simple Integration
 * Add this script to dashboard.html
 */

window.OneSignalDeferred = window.OneSignalDeferred || [];

OneSignalDeferred.push(async function(OneSignal) {
    await OneSignal.init({
        appId: "2d7f0657-8aeb-4223-b58d-3fa75d528f42", // Your OneSignal App ID
        allowLocalhostAsSecureOrigin: true,
        
        notifyButton: {
            enable: false // We'll use custom UI
        },
        
        promptOptions: {
            slidedown: {
                enabled: true,
                actionMessage: "Stay updated on loans, payments, and investments",
                acceptButtonText: "Allow Notifications",
                cancelButtonText: "Not Now"
            }
        }
    });
    
    console.log('✅ OneSignal initialized successfully');
    
    // Listen for subscription changes
    OneSignal.User.PushSubscription.addEventListener('change', async function(event) {
        console.log('📱 Push subscription changed:', event);
        
        if (event.current.optedIn) {
            const playerId = event.current.id;
            const token = event.current.token;
            
            console.log('✅ User subscribed to push notifications!');
            console.log('Player ID:', playerId);
            
            // Save subscription to backend
            try {
                const authToken = localStorage.getItem('authToken');
                if (!authToken) {
                    console.warn('No auth token found, cannot save subscription');
                    return;
                }
                
                const response = await fetch('https://zimcrowd-api.onrender.com/api/notifications/push-subscription', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        playerId: playerId,
                        token: token,
                        platform: 'web',
                        deviceType: getDeviceType(),
                        browser: getBrowser()
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Push subscription saved to backend');
                } else {
                    console.error('❌ Failed to save push subscription:', await response.text());
                }
            } catch (error) {
                console.error('Error saving push subscription:', error);
            }
        } else {
            console.log('❌ User unsubscribed from push notifications');
        }
    });
    
    // Listen for notification clicks
    OneSignal.Notifications.addEventListener('click', function(event) {
        console.log('🔔 Notification clicked:', event);
        
        // Handle custom action URL
        if (event.notification.data?.action_url) {
            window.location.href = event.notification.data.action_url;
        }
    });
    
    // Show permission prompt after a delay (optional)
    setTimeout(() => {
        OneSignal.Slidedown.promptPush();
    }, 3000); // Show after 3 seconds
});

// Helper functions
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera mini|windows phone/i.test(ua)) return 'mobile';
    return 'desktop';
}

function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
}

// Global helper to check subscription status
window.checkPushSubscription = async function() {
    if (!window.OneSignal) {
        console.error('OneSignal not loaded');
        return;
    }
    
    const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
    const playerId = await OneSignal.User.PushSubscription.id;
    
    console.log('Subscription Status:', {
        subscribed: isSubscribed,
        playerId: playerId
    });
    
    return { subscribed: isSubscribed, playerId: playerId };
};

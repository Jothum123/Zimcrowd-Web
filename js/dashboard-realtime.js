/**
 * Dashboard Real-time Updates Module
 * WebSocket and polling for live notifications and data updates
 */

const DashboardRealtime = {
    ws: null,
    pollingInterval: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
    
    /**
     * Initialize real-time updates
     */
    init() {
        console.log('🔴 Initializing Real-time Updates...');
        
        // Try WebSocket first, fall back to polling
        this.initWebSocket();
        
        // Start polling as backup
        this.startPolling();
        
        // Listen for visibility changes to pause/resume
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        console.log('✅ Real-time updates initialized');
    },

    /**
     * Initialize WebSocket connection
     */
    initWebSocket() {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) {
                console.warn('⚠️ No auth token, skipping WebSocket');
                return;
            }

            // Supabase Realtime connection
            const wsUrl = `wss://gjtkdrrvnffrmzigdqyp.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqdGtkcnJ2bmZmcm16aWdkcXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2NzU4NzcsImV4cCI6MjA0NzI1MTg3N30.Qo-yzVxOXHDPGRpzVFjjVHyQDqGBqjYPVmxAEqDqEJ0&vsn=1.0.0`;

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ WebSocket connected');
                this.reconnectAttempts = 0;
                this.subscribeToChannels();
            };

            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.warn('⚠️ WebSocket closed');
                this.attemptReconnect();
            };

        } catch (error) {
            console.error('❌ WebSocket initialization error:', error);
        }
    },

    /**
     * Subscribe to Supabase Realtime channels
     */
    subscribeToChannels() {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const userId = this.getUserId();
        if (!userId) return;

        // Subscribe to notifications
        this.ws.send(JSON.stringify({
            topic: `realtime:public:notifications:user_id=eq.${userId}`,
            event: 'phx_join',
            payload: {},
            ref: '1'
        }));

        // Subscribe to transactions
        this.ws.send(JSON.stringify({
            topic: `realtime:public:transactions:user_id=eq.${userId}`,
            event: 'phx_join',
            payload: {},
            ref: '2'
        }));

        console.log('✅ Subscribed to real-time channels');
    },

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(data) {
        try {
            const message = JSON.parse(data);
            
            if (message.event === 'postgres_changes') {
                const payload = message.payload;
                
                if (payload.table === 'notifications') {
                    this.handleNewNotification(payload.record);
                } else if (payload.table === 'transactions') {
                    this.handleNewTransaction(payload.record);
                }
            }
        } catch (error) {
            console.error('❌ Error handling WebSocket message:', error);
        }
    },

    /**
     * Attempt to reconnect WebSocket
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

        setTimeout(() => {
            this.initWebSocket();
        }, this.reconnectDelay * this.reconnectAttempts);
    },

    /**
     * Start polling for updates (fallback)
     */
    startPolling() {
        // Poll every 30 seconds
        this.pollingInterval = setInterval(() => {
            this.pollForUpdates();
        }, 30000);

        console.log('✅ Polling started (30s interval)');
    },

    /**
     * Poll for updates
     */
    async pollForUpdates() {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) return;

            // Check for new notifications
            const notificationsResponse = await fetch('https://zimcrowd-api.onrender.com/api/dashboard/notifications?unread=true', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (notificationsResponse.ok) {
                const data = await notificationsResponse.json();
                if (data.success) {
                    this.updateNotificationCount(data.data.unread_count);
                }
            }

            // Check for wallet balance changes
            const walletResponse = await fetch('https://zimcrowd-api.onrender.com/api/dashboard/wallet', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (walletResponse.ok) {
                const data = await walletResponse.json();
                if (data.success) {
                    this.updateWalletBalance(data.data);
                }
            }

        } catch (error) {
            console.error('❌ Polling error:', error);
        }
    },

    /**
     * Handle new notification
     */
    handleNewNotification(notification) {
        console.log('🔔 New notification:', notification);

        // Update notification count
        const countElement = document.getElementById('notificationCount');
        if (countElement) {
            const currentCount = parseInt(countElement.textContent) || 0;
            countElement.textContent = currentCount + 1;
            countElement.style.display = 'block';
        }

        // Show toast notification
        this.showToast('New Notification', notification.message || 'You have a new notification', 'info');

        // Trigger animation
        this.animateNotificationBell();
    },

    /**
     * Handle new transaction
     */
    handleNewTransaction(transaction) {
        console.log('💳 New transaction:', transaction);

        // Update wallet balance
        this.pollForUpdates();

        // Show toast
        const message = `${transaction.type === 'credit' ? 'Received' : 'Sent'} ${this.formatCurrency(transaction.amount)}`;
        this.showToast('New Transaction', message, transaction.type === 'credit' ? 'success' : 'warning');

        // Reload transactions if on wallet section
        if (window.DashboardLoader) {
            window.DashboardLoader.loadDashboardOverview();
        }
    },

    /**
     * Update notification count
     */
    updateNotificationCount(count) {
        const countElement = document.getElementById('notificationCount');
        if (countElement) {
            countElement.textContent = count;
            countElement.style.display = count > 0 ? 'block' : 'none';
        }
    },

    /**
     * Update wallet balance
     */
    updateWalletBalance(wallet) {
        const balanceElement = document.getElementById('walletBalance');
        if (balanceElement) {
            const newBalance = this.formatCurrency(wallet.balance || 0);
            if (balanceElement.textContent !== newBalance) {
                balanceElement.textContent = newBalance;
                this.animateElement(balanceElement);
            }
        }
    },

    /**
     * Show toast notification
     */
    showToast(title, message, type = 'info') {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#38e77b' : type === 'warning' ? '#fb923c' : '#3b82f6';
        toast.style.cssText = `background:${bgColor};color:#000;padding:16px 20px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.3);min-width:300px;`;
        toast.innerHTML = `<div style="font-weight:600;margin-bottom:4px;">${title}</div><div style="font-size:14px;">${message}</div>`;

        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    },

    /**
     * Animate notification bell
     */
    animateNotificationBell() {
        const bell = document.querySelector('.notification-btn i');
        if (bell) {
            bell.style.animation = 'shake 0.5s';
            setTimeout(() => bell.style.animation = '', 500);
        }
    },

    /**
     * Animate element
     */
    animateElement(element) {
        element.style.animation = 'pulse 0.5s';
        setTimeout(() => element.style.animation = '', 500);
    },

    /**
     * Get user ID from token
     */
    getUserId() {
        const authData = localStorage.getItem('authData');
        if (authData) {
            try {
                const data = JSON.parse(authData);
                return data.user?.id;
            } catch (e) {}
        }
        return null;
    },

    /**
     * Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    },

    /**
     * Pause updates
     */
    pause() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    },

    /**
     * Resume updates
     */
    resume() {
        this.startPolling();
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DashboardRealtime.init();
    });
} else {
    DashboardRealtime.init();
}

window.DashboardRealtime = DashboardRealtime;

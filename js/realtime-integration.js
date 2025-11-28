/**
 * Real-Time Data Integration Module
 * Coordinates all real-time updates across the dashboard
 * Integrates with ProductionDataLoader, DashboardRealtime, and all section loaders
 */

const RealtimeIntegration = {
    // Configuration
    config: {
        enabled: true,
        updateInterval: 30000, // 30 seconds
        criticalUpdateInterval: 15000, // 15 seconds for critical data
        analyticsUpdateInterval: 60000, // 60 seconds for analytics
    },
    
    // State
    state: {
        isInitialized: false,
        isPaused: false,
        lastUpdate: null,
        updateCount: 0,
        errors: []
    },
    
    // Intervals
    intervals: {
        critical: null,
        standard: null,
        analytics: null
    },
    
    /**
     * Initialize real-time integration
     */
    async init() {
        if (this.state.isInitialized) {
            console.log('ℹ️ Real-time integration already initialized');
            return;
        }
        
        console.log('🚀 Initializing Real-Time Data Integration...');
        
        try {
            // Wait for all loaders to be available
            await this.waitForLoaders();
            
            // Start update cycles
            this.startCriticalUpdates();
            this.startStandardUpdates();
            this.startAnalyticsUpdates();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup visibility handler
            this.setupVisibilityHandler();
            
            this.state.isInitialized = true;
            this.state.lastUpdate = new Date();
            
            console.log('✅ Real-Time Data Integration initialized');
            this.showNotification('Real-time updates active', 'success');
            
        } catch (error) {
            console.error('❌ Failed to initialize real-time integration:', error);
            this.state.errors.push(error);
        }
    },
    
    /**
     * Wait for all required loaders to be available
     */
    async waitForLoaders() {
        const maxWait = 10000; // 10 seconds
        const checkInterval = 100;
        let waited = 0;
        
        return new Promise((resolve, reject) => {
            const check = setInterval(() => {
                waited += checkInterval;
                
                if (window.ProductionDataLoader && window.DashboardRealtime) {
                    clearInterval(check);
                    resolve();
                } else if (waited >= maxWait) {
                    clearInterval(check);
                    reject(new Error('Loaders not available after timeout'));
                }
            }, checkInterval);
        });
    },
    
    /**
     * Start critical data updates (wallet, notifications, active status)
     */
    startCriticalUpdates() {
        if (this.intervals.critical) {
            clearInterval(this.intervals.critical);
        }
        
        console.log('🔴 Starting critical updates (15s interval)...');
        
        // Initial update
        this.updateCriticalData();
        
        // Recurring updates
        this.intervals.critical = setInterval(() => {
            if (!this.state.isPaused) {
                this.updateCriticalData();
            }
        }, this.config.criticalUpdateInterval);
    },
    
    /**
     * Start standard data updates (loans, investments, transactions)
     */
    startStandardUpdates() {
        if (this.intervals.standard) {
            clearInterval(this.intervals.standard);
        }
        
        console.log('🟡 Starting standard updates (30s interval)...');
        
        this.intervals.standard = setInterval(() => {
            if (!this.state.isPaused) {
                this.updateStandardData();
            }
        }, this.config.updateInterval);
    },
    
    /**
     * Start analytics updates
     */
    startAnalyticsUpdates() {
        if (this.intervals.analytics) {
            clearInterval(this.intervals.analytics);
        }
        
        console.log('🟢 Starting analytics updates (60s interval)...');
        
        this.intervals.analytics = setInterval(() => {
            if (!this.state.isPaused) {
                this.updateAnalyticsData();
            }
        }, this.config.analyticsUpdateInterval);
    },
    
    /**
     * Update critical data
     */
    async updateCriticalData() {
        try {
            if (window.ProductionDataLoader) {
                await Promise.allSettled([
                    window.ProductionDataLoader.refreshWalletBalance(),
                    window.ProductionDataLoader.refreshNotifications(),
                    window.ProductionDataLoader.refreshActiveLoans()
                ]);
            }
            
            this.state.lastUpdate = new Date();
            this.state.updateCount++;
            this.updateStatusIndicator();
            
        } catch (error) {
            console.error('❌ Critical update error:', error);
            this.state.errors.push(error);
        }
    },
    
    /**
     * Update standard data
     */
    async updateStandardData() {
        try {
            const currentSection = this.getCurrentSection();
            
            // Only update visible sections
            if (currentSection === 'loans' && window.ProductionDataLoader) {
                await window.ProductionDataLoader.loadLoansData();
            } else if (currentSection === 'investments' && window.ProductionDataLoader) {
                await window.ProductionDataLoader.loadInvestmentsData();
            } else if (currentSection === 'transactions' && window.ProductionDataLoader) {
                await window.ProductionDataLoader.loadTransactionsData();
            }
            
            this.state.lastUpdate = new Date();
            this.state.updateCount++;
            
        } catch (error) {
            console.error('❌ Standard update error:', error);
            this.state.errors.push(error);
        }
    },
    
    /**
     * Update analytics data
     */
    async updateAnalyticsData() {
        try {
            const currentSection = this.getCurrentSection();
            
            // Only update if analytics section is visible
            if (currentSection === 'analytics' && window.analyticsLoader) {
                await window.analyticsLoader.loadAllAnalytics();
                window.analyticsLoader.updateCharts();
            }
            
        } catch (error) {
            console.error('❌ Analytics update error:', error);
            this.state.errors.push(error);
        }
    },
    
    /**
     * Get current active section
     */
    getCurrentSection() {
        const sections = ['overview', 'loans', 'investments', 'wallet', 'transactions', 'analytics', 'settings', 'referrals'];
        
        for (const section of sections) {
            const element = document.getElementById(`${section}-section`);
            if (element && !element.classList.contains('hidden')) {
                return section;
            }
        }
        
        return 'overview';
    },
    
    /**
     * Update status indicator
     */
    updateStatusIndicator() {
        const indicator = document.getElementById('realtimeStatus');
        if (indicator) {
            const timeAgo = this.getTimeAgo(this.state.lastUpdate);
            indicator.innerHTML = `
                <i class="fas fa-circle" style="color: #38e77b; font-size: 8px; margin-right: 5px;"></i>
                <span style="color: #94a3b8; font-size: 12px;">Live • Updated ${timeAgo}</span>
            `;
        }
    },
    
    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        if (!date) return 'never';
        
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 10) return 'just now';
        if (seconds < 60) return `${seconds}s ago`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Manual refresh button
        const refreshBtn = document.getElementById('manualRefreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.manualRefresh());
        }
        
        // Pause/Resume button
        const pauseBtn = document.getElementById('pauseRealtimeBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        
        // Section change detection
        document.addEventListener('sectionChanged', (e) => {
            console.log('📍 Section changed to:', e.detail.section);
            this.onSectionChange(e.detail.section);
        });
    },
    
    /**
     * Setup visibility handler
     */
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
                // Refresh immediately when tab becomes visible
                this.manualRefresh();
            }
        });
    },
    
    /**
     * Handle section change
     */
    onSectionChange(section) {
        // Immediately load data for the new section
        if (window.ProductionDataLoader) {
            switch(section) {
                case 'loans':
                    window.ProductionDataLoader.loadLoansData();
                    break;
                case 'investments':
                    window.ProductionDataLoader.loadInvestmentsData();
                    break;
                case 'wallet':
                    window.ProductionDataLoader.loadWalletPage(1);
                    break;
                case 'transactions':
                    window.ProductionDataLoader.loadTransactionsData();
                    break;
                case 'analytics':
                    if (window.analyticsLoader) {
                        window.analyticsLoader.loadAllAnalytics();
                    }
                    break;
                case 'settings':
                    if (window.settingsLoader) {
                        window.settingsLoader.loadAllSettings();
                    }
                    break;
                case 'referrals':
                    window.ProductionDataLoader.loadReferralsData();
                    break;
            }
        }
    },
    
    /**
     * Manual refresh
     */
    async manualRefresh() {
        console.log('🔄 Manual refresh triggered...');
        
        const refreshBtn = document.getElementById('manualRefreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
        }
        
        try {
            await Promise.all([
                this.updateCriticalData(),
                this.updateStandardData(),
                this.updateAnalyticsData()
            ]);
            
            this.showNotification('Data refreshed successfully', 'success');
        } catch (error) {
            console.error('❌ Manual refresh error:', error);
            this.showNotification('Failed to refresh data', 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
            }
        }
    },
    
    /**
     * Toggle pause/resume
     */
    togglePause() {
        if (this.state.isPaused) {
            this.resume();
        } else {
            this.pause();
        }
    },
    
    /**
     * Pause updates
     */
    pause() {
        this.state.isPaused = true;
        console.log('⏸️ Real-time updates paused');
        this.updatePauseButton();
    },
    
    /**
     * Resume updates
     */
    resume() {
        this.state.isPaused = false;
        console.log('▶️ Real-time updates resumed');
        this.updatePauseButton();
    },
    
    /**
     * Update pause button state
     */
    updatePauseButton() {
        const pauseBtn = document.getElementById('pauseRealtimeBtn');
        if (pauseBtn) {
            if (this.state.isPaused) {
                pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
                pauseBtn.classList.add('paused');
            } else {
                pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                pauseBtn.classList.remove('paused');
            }
        }
    },
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const colors = {
            success: '#38e77b',
            error: '#ef4444',
            warning: '#fb923c',
            info: '#3b82f6'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: #000;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    /**
     * Stop all updates
     */
    stop() {
        Object.keys(this.intervals).forEach(key => {
            if (this.intervals[key]) {
                clearInterval(this.intervals[key]);
                this.intervals[key] = null;
            }
        });
        
        this.state.isInitialized = false;
        console.log('🛑 Real-time integration stopped');
    },
    
    /**
     * Get status report
     */
    getStatus() {
        return {
            initialized: this.state.isInitialized,
            paused: this.state.isPaused,
            lastUpdate: this.state.lastUpdate,
            updateCount: this.state.updateCount,
            errors: this.state.errors.length,
            currentSection: this.getCurrentSection()
        };
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for other loaders to initialize first
        setTimeout(() => {
            RealtimeIntegration.init();
        }, 2000);
    });
} else {
    setTimeout(() => {
        RealtimeIntegration.init();
    }, 2000);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    RealtimeIntegration.stop();
});

// Make available globally
window.RealtimeIntegration = RealtimeIntegration;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
    }
`;
document.head.appendChild(style);

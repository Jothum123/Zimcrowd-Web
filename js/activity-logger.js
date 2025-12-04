// Activity Logger - Connects User Dashboard to Admin Dashboard
// Logs all user activities for real-time admin monitoring

class ActivityLogger {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.token = null;
        this.isInitialized = false;
        this.activityQueue = [];
        this.batchSize = 10;
        this.batchTimeout = 5000; // 5 seconds
        this.retryAttempts = 3;
        this.apiBaseUrl = window.API_BASE_URL || 'https://zimcrowd-backend.vercel.app';
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    // Initialize the activity logger
    async init() {
        try {
            console.log('🔄 Initializing Activity Logger...');
            
            // Get user authentication
            this.token = localStorage.getItem('authToken');
            if (!this.token) {
                console.warn('⚠️ No auth token found, activity logging disabled');
                return;
            }

            // Get user info
            const userInfo = await this.getUserInfo();
            if (userInfo) {
                this.userId = userInfo.id;
                this.isInitialized = true;
                
                // Log session start
                await this.logActivity('session_start', {
                    page: window.location.pathname,
                    referrer: document.referrer,
                    user_agent: navigator.userAgent,
                    screen_resolution: `${screen.width}x${screen.height}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                });

                // Update session
                await this.updateSession();

                // Start monitoring
                this.startMonitoring();

                console.log('✅ Activity Logger initialized successfully');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Activity Logger:', error);
        }
    }

    // Get current user information
    async getUserInfo() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.data : null;
            }
        } catch (error) {
            console.error('Error getting user info:', error);
        }
        return null;
    }

    // Log user activity
    async logActivity(activityType, activityData = {}, options = {}) {
        if (!this.isInitialized) {
            console.warn('⚠️ Activity Logger not initialized');
            return null;
        }

        const activity = {
            activity_type: activityType,
            activity_data: {
                ...activityData,
                timestamp: new Date().toISOString(),
                page_url: window.location.href,
                page_title: document.title
            },
            ip_address: options.ipAddress,
            user_agent: navigator.userAgent,
            session_id: this.sessionId,
            status: options.status || 'active',
            metadata: options.metadata || {}
        };

        // Add to queue for batch processing
        this.activityQueue.push(activity);

        // Process immediately for important activities
        if (options.immediate || this.isImportantActivity(activityType)) {
            await this.processActivityQueue();
        } else {
            // Schedule batch processing
            this.scheduleBatchProcess();
        }

        return activity;
    }

    // Check if activity is important and should be processed immediately
    isImportantActivity(activityType) {
        const importantActivities = [
            'login',
            'loan_application',
            'large_investment',
            'account_change',
            'security_alert',
            'suspicious_activity',
            'transaction_completed',
            'kyc_submitted'
        ];
        return importantActivities.includes(activityType);
    }

    // Process activity queue
    async processActivityQueue() {
        if (this.activityQueue.length === 0) return;

        const activities = [...this.activityQueue];
        this.activityQueue = [];

        try {
            const promises = activities.map(activity => this.sendActivityToServer(activity));
            await Promise.all(promises);
            console.log(`✅ Processed ${activities.length} activities`);
        } catch (error) {
            console.error('❌ Error processing activity queue:', error);
            // Re-add failed activities to queue for retry
            this.activityQueue.unshift(...activities);
        }
    }

    // Send individual activity to server
    async sendActivityToServer(activity, retryCount = 0) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/activity/log`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(activity)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.success ? result.data : null;
        } catch (error) {
            console.error(`Error sending activity (${retryCount + 1}/${this.retryAttempts}):`, error);
            
            // Retry logic
            if (retryCount < this.retryAttempts - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.sendActivityToServer(activity, retryCount + 1);
            }
            
            throw error;
        }
    }

    // Schedule batch processing
    scheduleBatchProcess() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        this.batchTimer = setTimeout(() => {
            if (this.activityQueue.length >= this.batchSize) {
                this.processActivityQueue();
            }
        }, this.batchTimeout);
    }

    // Update session activity
    async updateSession() {
        if (!this.isInitialized) return;

        try {
            await fetch(`${this.apiBaseUrl}/api/activity/session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.sessionId,
                    user_agent: navigator.userAgent
                })
            });
        } catch (error) {
            console.error('Error updating session:', error);
        }
    }

    // Start monitoring user interactions
    startMonitoring() {
        // Monitor page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logActivity('page_hidden', {
                    time_on_page: this.getTimeOnPage()
                });
            } else {
                this.logActivity('page_visible', {
                    page: window.location.pathname
                });
            }
        });

        // Monitor page unload
        window.addEventListener('beforeunload', () => {
            this.logActivity('session_end', {
                time_on_page: this.getTimeOnPage(),
                total_activities: this.getTotalActivities()
            }, { immediate: true });
        });

        // Monitor clicks on important elements
        this.monitorClicks();

        // Update session periodically
        setInterval(() => {
            this.updateSession();
        }, 30000); // Every 30 seconds

        // Process any remaining activities periodically
        setInterval(() => {
            if (this.activityQueue.length > 0) {
                this.processActivityQueue();
            }
        }, 10000); // Every 10 seconds
    }

    // Monitor clicks on important elements
    monitorClicks() {
        document.addEventListener('click', (event) => {
            const target = event.target;
            const activityType = this.getActivityTypeFromElement(target);
            
            if (activityType) {
                this.logActivity(activityType, {
                    element: target.tagName.toLowerCase(),
                    element_id: target.id,
                    element_class: target.className,
                    text: target.textContent?.trim().substring(0, 100)
                });
            }
        });
    }

    // Get activity type from clicked element
    getActivityTypeFromElement(element) {
        const tagName = element.tagName.toLowerCase();
        const id = element.id;
        const className = element.className;

        // Button clicks
        if (tagName === 'button') {
            if (id.includes('loan')) return 'loan_button_click';
            if (id.includes('invest')) return 'investment_button_click';
            if (id.includes('transaction')) return 'transaction_button_click';
            if (id.includes('profile')) return 'profile_button_click';
            if (id.includes('kyc')) return 'kyc_button_click';
            return 'button_click';
        }

        // Link clicks
        if (tagName === 'a') {
            if (element.href.includes('loan')) return 'loan_link_click';
            if (element.href.includes('invest')) return 'investment_link_click';
            if (element.href.includes('dashboard')) return 'dashboard_navigation';
            return 'link_click';
        }

        // Form interactions
        if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
            return 'form_interaction';
        }

        // Navigation clicks
        if (element.closest('.nav') || element.closest('.sidebar')) {
            return 'navigation_click';
        }

        return null;
    }

    // Utility methods
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getTimeOnPage() {
        return performance.now() / 1000; // Return in seconds
    }

    getTotalActivities() {
        return this.activityQueue.length;
    }

    // Public methods for specific activity types
    async logLogin(loginMethod = 'email') {
        return this.logActivity('login', {
            login_method: loginMethod,
            timestamp: new Date().toISOString()
        }, { immediate: true });
    }

    async logLoanApplication(loanData) {
        return this.logActivity('loan_application', {
            loan_amount: loanData.amount,
            loan_type: loanData.type,
            loan_purpose: loanData.purpose,
            ...loanData
        }, { immediate: true });
    }

    async logInvestment(investmentData) {
        const isLarge = investmentData.amount > 10000;
        return this.logActivity(
            isLarge ? 'large_investment' : 'investment',
            {
                investment_amount: investmentData.amount,
                investment_type: investmentData.type,
                risk_level: investmentData.riskLevel,
                ...investmentData
            },
            { immediate: isLarge }
        );
    }

    async logTransaction(transactionData) {
        return this.logActivity('transaction_completed', {
            transaction_amount: transactionData.amount,
            transaction_type: transactionData.type,
            transaction_status: transactionData.status,
            ...transactionData
        }, { immediate: true });
    }

    async logProfileUpdate(updateData) {
        return this.logActivity('profile_update', {
            updated_fields: Object.keys(updateData),
            ...updateData
        });
    }

    async logKYCSubmission(kycData) {
        return this.logActivity('kyc_submitted', {
            document_types: kycData.documentTypes,
            verification_method: kycData.method,
            ...kycData
        }, { immediate: true });
    }

    async logSecurityAlert(alertData) {
        return this.logActivity('security_alert', {
            alert_type: alertData.type,
            severity: alertData.severity,
            description: alertData.description,
            ...alertData
        }, { immediate: true });
    }

    async logSuspiciousActivity(activityData) {
        return this.logActivity('suspicious_activity', {
            suspicious_pattern: activityData.pattern,
            risk_score: activityData.riskScore,
            details: activityData.details,
            ...activityData
        }, { immediate: true, status: 'flagged' });
    }

    async logPageView(pageData = {}) {
        return this.logActivity('page_view', {
            page_path: window.location.pathname,
            page_title: document.title,
            referrer: document.referrer,
            ...pageData
        });
    }

    async logFeatureUsage(featureName, featureData = {}) {
        return this.logActivity('feature_usage', {
            feature_name: featureName,
            ...featureData
        });
    }

    async logError(errorData) {
        return this.logActivity('error_occurred', {
            error_message: errorData.message,
            error_stack: errorData.stack,
            error_context: errorData.context,
            ...errorData
        });
    }
}

// Global instance
window.ActivityLogger = new ActivityLogger();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityLogger;
}

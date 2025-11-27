/**
 * Production Data Manager
 * Converts all static/mock data to real backend-powered data
 * Handles: Settings, Analytics, Post-Registration, KYC, Documents
 */

class ProductionDataManager {
    constructor() {
        this.API_BASE = window.API_CONFIG?.BASE_URL || 'https://zimcrowd-api.onrender.com';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('access_token') ||
               JSON.parse(localStorage.getItem('authData') || '{}').access_token;
    }

    /**
     * API Request with caching
     */
    async apiRequest(endpoint, options = {}) {
        const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`📦 Using cached data for ${endpoint}`);
                return cached.data;
            }
        }

        const token = this.getAuthToken();
        if (!token && !options.public) {
            throw new Error('Authentication required');
        }

        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Cache successful responses
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`❌ API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Clear cache for specific endpoint or all
     */
    clearCache(endpoint = null) {
        if (endpoint) {
            for (const key of this.cache.keys()) {
                if (key.startsWith(endpoint)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // ============================================
    // ACCOUNT SETTINGS - PROFILE
    // ============================================
    async loadProfileSettings() {
        try {
            console.log('👤 Loading profile settings...');
            const response = await this.apiRequest('/api/user/profile');
            
            if (response.success && response.data) {
                return {
                    firstName: response.data.first_name || '',
                    lastName: response.data.last_name || '',
                    email: response.data.email || '',
                    phone: response.data.phone || '',
                    dateOfBirth: response.data.date_of_birth || '',
                    gender: response.data.gender || '',
                    country: response.data.country || 'Zimbabwe',
                    streetAddress: response.data.street_address || '',
                    city: response.data.city || '',
                    suburb: response.data.suburb || '',
                    postalCode: response.data.postal_code || '',
                    bio: response.data.bio || '',
                    profilePicture: response.data.profile_picture || '',
                    completionPercentage: response.data.completion_percentage || 0,
                    socialLogins: response.data.social_logins || {}
                };
            }
            throw new Error('Invalid profile response');
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            return null;
        }
    }

    async saveProfileSettings(profileData) {
        try {
            console.log('💾 Saving profile settings...');
            const response = await this.apiRequest('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            this.clearCache('/api/user/profile');
            return response;
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            throw error;
        }
    }

    // ============================================
    // ACCOUNT SETTINGS - NOTIFICATIONS
    // ============================================
    async loadNotificationSettings() {
        try {
            console.log('🔔 Loading notification settings...');
            const response = await this.apiRequest('/api/user/notification-settings');
            
            if (response.success && response.data) {
                return {
                    emailNotifications: response.data.email_notifications ?? true,
                    pushNotifications: response.data.push_notifications ?? true,
                    smsNotifications: response.data.sms_notifications ?? false,
                    loanUpdates: response.data.loan_updates ?? true,
                    investmentUpdates: response.data.investment_updates ?? true,
                    paymentAlerts: response.data.payment_alerts ?? true,
                    securityAlerts: response.data.security_alerts ?? true,
                    marketingEmails: response.data.marketing_emails ?? false,
                    weeklyReports: response.data.weekly_reports ?? true,
                    monthlyStatements: response.data.monthly_statements ?? true
                };
            }
            throw new Error('Invalid notification settings response');
        } catch (error) {
            console.error('❌ Error loading notification settings:', error);
            return null;
        }
    }

    async saveNotificationSettings(settings) {
        try {
            console.log('💾 Saving notification settings...');
            const response = await this.apiRequest('/api/user/notification-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            
            this.clearCache('/api/user/notification-settings');
            return response;
        } catch (error) {
            console.error('❌ Error saving notification settings:', error);
            throw error;
        }
    }

    // ============================================
    // ACCOUNT SETTINGS - DISPLAY
    // ============================================
    async loadDisplaySettings() {
        try {
            console.log('🎨 Loading display settings...');
            const response = await this.apiRequest('/api/user/display-settings');
            
            if (response.success && response.data) {
                return {
                    theme: response.data.theme || 'dark',
                    language: response.data.language || 'en',
                    currency: response.data.currency || 'USD',
                    dateFormat: response.data.date_format || 'MM/DD/YYYY',
                    timeFormat: response.data.time_format || '12h',
                    compactMode: response.data.compact_mode ?? false,
                    showAnimations: response.data.show_animations ?? true
                };
            }
            throw new Error('Invalid display settings response');
        } catch (error) {
            console.error('❌ Error loading display settings:', error);
            return null;
        }
    }

    async saveDisplaySettings(settings) {
        try {
            console.log('💾 Saving display settings...');
            const response = await this.apiRequest('/api/user/display-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            
            this.clearCache('/api/user/display-settings');
            return response;
        } catch (error) {
            console.error('❌ Error saving display settings:', error);
            throw error;
        }
    }

    // ============================================
    // ACCOUNT SETTINGS - INVESTMENT PREFERENCES
    // ============================================
    async loadInvestmentPreferences() {
        try {
            console.log('💰 Loading investment preferences...');
            const response = await this.apiRequest('/api/user/investment-preferences');
            
            if (response.success && response.data) {
                return {
                    riskTolerance: response.data.risk_tolerance || 'moderate',
                    investmentGoals: response.data.investment_goals || [],
                    preferredSectors: response.data.preferred_sectors || [],
                    autoInvest: response.data.auto_invest ?? false,
                    autoInvestAmount: response.data.auto_invest_amount || 0,
                    minReturnRate: response.data.min_return_rate || 5,
                    maxLoanAmount: response.data.max_loan_amount || 10000,
                    diversificationLevel: response.data.diversification_level || 'medium'
                };
            }
            throw new Error('Invalid investment preferences response');
        } catch (error) {
            console.error('❌ Error loading investment preferences:', error);
            return null;
        }
    }

    async saveInvestmentPreferences(preferences) {
        try {
            console.log('💾 Saving investment preferences...');
            const response = await this.apiRequest('/api/user/investment-preferences', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });
            
            this.clearCache('/api/user/investment-preferences');
            return response;
        } catch (error) {
            console.error('❌ Error saving investment preferences:', error);
            throw error;
        }
    }

    // ============================================
    // ACCOUNT SETTINGS - PRIVACY
    // ============================================
    async loadPrivacySettings() {
        try {
            console.log('🔒 Loading privacy settings...');
            const response = await this.apiRequest('/api/user/privacy-settings');
            
            if (response.success && response.data) {
                return {
                    profileVisibility: response.data.profile_visibility || 'private',
                    showInvestments: response.data.show_investments ?? false,
                    showLoans: response.data.show_loans ?? false,
                    allowMessages: response.data.allow_messages ?? true,
                    dataSharing: response.data.data_sharing ?? false,
                    analyticsTracking: response.data.analytics_tracking ?? true,
                    thirdPartySharing: response.data.third_party_sharing ?? false
                };
            }
            throw new Error('Invalid privacy settings response');
        } catch (error) {
            console.error('❌ Error loading privacy settings:', error);
            return null;
        }
    }

    async savePrivacySettings(settings) {
        try {
            console.log('💾 Saving privacy settings...');
            const response = await this.apiRequest('/api/user/privacy-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            
            this.clearCache('/api/user/privacy-settings');
            return response;
        } catch (error) {
            console.error('❌ Error saving privacy settings:', error);
            throw error;
        }
    }

    // ============================================
    // ACCOUNT SETTINGS - DOCUMENTS (KYC)
    // ============================================
    async loadDocuments() {
        try {
            console.log('📄 Loading documents...');
            const response = await this.apiRequest('/api/user/documents');
            
            if (response.success && response.data) {
                return response.data.map(doc => ({
                    id: doc.id,
                    type: doc.document_type,
                    name: doc.document_type.replace('_', ' ').toUpperCase(),
                    url: doc.document_url,
                    status: doc.status,
                    uploadedAt: doc.created_at,
                    verifiedAt: doc.verified_at,
                    rejectionReason: doc.rejection_reason
                }));
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading documents:', error);
            return [];
        }
    }

    async uploadDocument(documentType, file) {
        try {
            console.log('📤 Uploading document...');
            const formData = new FormData();
            formData.append('document', file);
            formData.append('document_type', documentType);

            const token = this.getAuthToken();
            const response = await fetch(`${this.API_BASE}/api/user/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Document upload failed');
            }

            const data = await response.json();
            this.clearCache('/api/user/documents');
            return data;
        } catch (error) {
            console.error('❌ Error uploading document:', error);
            throw error;
        }
    }

    // ============================================
    // ANALYTICS - DASHBOARD
    // ============================================
    async loadAnalyticsDashboard() {
        try {
            console.log('📊 Loading analytics dashboard...');
            const response = await this.apiRequest('/api/analytics/overview');
            
            if (response.success && response.overview) {
                return {
                    loans: response.overview.loans || {},
                    investments: response.overview.investments || {},
                    recentActivity: response.overview.recentActivity || []
                };
            }
            throw new Error('Invalid analytics response');
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            return null;
        }
    }

    async loadPortfolioHistory(days = 30) {
        try {
            console.log('📈 Loading portfolio history...');
            const response = await this.apiRequest(`/api/analytics/portfolio-history?days=${days}`);
            
            if (response.success && response.data) {
                return response.data;
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading portfolio history:', error);
            return [];
        }
    }

    async loadLoanDistribution() {
        try {
            console.log('🏦 Loading loan distribution...');
            const response = await this.apiRequest('/api/analytics/loan-distribution');
            
            if (response.success && response.data) {
                return response.data;
            }
            return {};
        } catch (error) {
            console.error('❌ Error loading loan distribution:', error);
            return {};
        }
    }

    async loadMonthlyActivity(months = 6) {
        try {
            console.log('📅 Loading monthly activity...');
            const response = await this.apiRequest(`/api/analytics/monthly-activity?months=${months}`);
            
            if (response.success && response.data) {
                return response.data;
            }
            return {};
        } catch (error) {
            console.error('❌ Error loading monthly activity:', error);
            return {};
        }
    }

    // ============================================
    // POST-REGISTRATION - KYC VERIFICATION
    // ============================================
    async submitKYCVerification(kycData) {
        try {
            console.log('✅ Submitting KYC verification...');
            const response = await this.apiRequest('/api/user/kyc/submit', {
                method: 'POST',
                body: JSON.stringify(kycData)
            });
            
            return response;
        } catch (error) {
            console.error('❌ Error submitting KYC:', error);
            throw error;
        }
    }

    async getKYCStatus() {
        try {
            console.log('🔍 Checking KYC status...');
            const response = await this.apiRequest('/api/user/kyc/status');
            
            if (response.success) {
                return {
                    status: response.status || 'pending',
                    completedSteps: response.completed_steps || [],
                    requiredDocuments: response.required_documents || [],
                    verificationLevel: response.verification_level || 'none'
                };
            }
            return null;
        } catch (error) {
            console.error('❌ Error getting KYC status:', error);
            return null;
        }
    }

    // ============================================
    // POST-REGISTRATION - PROFILE SETUP
    // ============================================
    async completeProfileSetup(profileData) {
        try {
            console.log('🎯 Completing profile setup...');
            const response = await this.apiRequest('/api/profile-setup/complete', {
                method: 'POST',
                body: JSON.stringify(profileData)
            });
            
            this.clearCache('/api/user/profile');
            return response;
        } catch (error) {
            console.error('❌ Error completing profile setup:', error);
            throw error;
        }
    }

    // ============================================
    // POST-REGISTRATION - PAYMENT METHODS
    // ============================================
    async getAvailablePaymentMethods() {
        try {
            console.log('💳 Loading payment methods...');
            const response = await this.apiRequest('/api/wallet/payment-methods', { public: true });
            
            if (response.success && response.paymentMethods) {
                return response.paymentMethods;
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading payment methods:', error);
            return [];
        }
    }

    async addPaymentMethod(methodData) {
        try {
            console.log('➕ Adding payment method...');
            const response = await this.apiRequest('/api/user/payment-methods', {
                method: 'POST',
                body: JSON.stringify(methodData)
            });
            
            return response;
        } catch (error) {
            console.error('❌ Error adding payment method:', error);
            throw error;
        }
    }

    async getUserPaymentMethods() {
        try {
            console.log('💳 Loading user payment methods...');
            const response = await this.apiRequest('/api/user/payment-methods');
            
            if (response.success && response.methods) {
                return response.methods;
            }
            return [];
        } catch (error) {
            console.error('❌ Error loading user payment methods:', error);
            return [];
        }
    }
}

// Initialize global instance
window.ProductionDataManager = new ProductionDataManager();

console.log('✅ Production Data Manager initialized');

/**
 * Settings Production Loader
 * Replaces all static data with real backend data
 */

class SettingsProductionLoader {
    constructor() {
        this.apiBase = window.API_CONFIG?.baseURL || 'https://zimcrowd-api.onrender.com/api';
        this.currentTab = 'profile';
        this.unsavedChanges = false;
    }

    async init() {
        console.log('⚙️ Initializing Settings Production Loader...');
        
        try {
            // Load all settings data
            await this.loadAllSettings();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup auto-save
            this.setupAutoSave();
            
            console.log('✅ Settings Production Loader ready');
        } catch (error) {
            console.error('❌ Error initializing settings loader:', error);
        }
    }
    
    /**
     * Get auth token (supports both regular and social auth)
     */
    getAuthToken() {
        // Check multiple possible token locations
        const token = localStorage.getItem('authToken') || 
               localStorage.getItem('token') ||
               localStorage.getItem('access_token');
        
        if (token) return token;
        
        // Check authData object
        try {
            const authData = JSON.parse(localStorage.getItem('authData') || '{}');
            if (authData.access_token) return authData.access_token;
        } catch (e) {}
        
        // Check Supabase session for social auth users
        try {
            const supabaseAuth = localStorage.getItem('sb-gjtkdrrvnffrmzigdqyp-auth-token');
            if (supabaseAuth) {
                const session = JSON.parse(supabaseAuth);
                if (session?.access_token) return session.access_token;
            }
        } catch (e) {}
        
        // Check socialAuthData for social login users
        try {
            const socialAuth = JSON.parse(localStorage.getItem('socialAuthData') || '{}');
            if (socialAuth.social_id) {
                return `social:${socialAuth.social_id}`;
            }
        } catch (e) {}
        
        return null;
    }
    
    /**
     * API request helper
     */
    async apiRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                ...options,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    async loadAllSettings() {
        try {
            // Show loading state
            this.showLoadingState();
            
            // Load all settings in parallel from production API
            const results = await Promise.allSettled([
                this.apiRequest('/settings/profile'),
                this.apiRequest('/settings/security'),
                this.apiRequest('/settings/notifications'),
                this.apiRequest('/settings/display'),
                this.apiRequest('/settings/investment-preferences'),
                this.apiRequest('/settings/privacy'),
                this.apiRequest('/documents')
            ]);
            
            // Extract successful results
            const [profile, security, notifications, display, investments, privacy, documents] = results.map(r => 
                r.status === 'fulfilled' ? r.value?.data : null
            );

            // Populate forms
            if (profile) this.populateProfileForm(profile);
            if (security) this.populateSecurityForm(security);
            if (notifications) this.populateNotificationForm(notifications);
            if (display) this.populateDisplayForm(display);
            if (investments) this.populateInvestmentForm(investments);
            if (privacy) this.populatePrivacyForm(privacy);
            if (documents) this.populateDocuments(documents);

            // Hide loading state
            this.hideLoadingState();
            
            console.log('✅ All settings loaded from production API');
        } catch (error) {
            console.error('❌ Error loading settings:', error);
            this.showError('Failed to load settings. Please refresh the page.');
        }
    }
    
    // ============================================
    // SECURITY SETTINGS
    // ============================================
    populateSecurityForm(security) {
        this.setCheckboxValue('twoFactorAuth', security.twoFactorEnabled);
        this.setCheckboxValue('loginNotifications', security.loginNotifications);
        this.setInputValue('sessionTimeout', security.sessionTimeout);
        
        // Update security score
        const securityScore = this.calculateSecurityScore(security);
        const scoreBar = document.getElementById('security-score-bar');
        const scoreText = document.getElementById('security-score-text');
        const statusText = document.getElementById('security-status-text');
        const alertsCount = document.getElementById('security-alerts-count');
        
        if (scoreBar) scoreBar.style.width = `${securityScore}%`;
        if (scoreText) scoreText.textContent = `${securityScore}%`;
        if (statusText) {
            if (securityScore >= 80) statusText.textContent = 'Strong';
            else if (securityScore >= 50) statusText.textContent = 'Moderate';
            else statusText.textContent = 'Weak';
        }
        
        // Calculate recommendations
        const recommendations = [];
        if (!security.twoFactorEnabled) recommendations.push('Enable 2FA');
        if (!security.loginNotifications) recommendations.push('Enable login alerts');
        if (alertsCount) alertsCount.textContent = `${recommendations.length} recommendations`;
        
        // Populate login history
        const historyContainer = document.getElementById('login-history');
        if (historyContainer) {
            if (security.loginHistory && security.loginHistory.length > 0) {
                historyContainer.innerHTML = security.loginHistory.map((entry, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i class="fas ${entry.device?.includes('Mobile') ? 'fa-mobile-alt' : 'fa-desktop'}" style="color: ${index === 0 ? '#10b981' : '#3b82f6'}; font-size: 18px;"></i>
                            <div>
                                <p style="margin: 0; font-weight: 600;">${entry.device || 'Unknown Device'}</p>
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">${entry.browser || 'Unknown Browser'} • ${entry.location || 'Unknown Location'}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            ${index === 0 ? '<p style="margin: 0; color: #10b981; font-size: 12px;">Current Session</p>' : ''}
                            <p style="margin: 0; color: #94a3b8; font-size: 11px;">${this.formatTimeAgo(entry.created_at)}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                historyContainer.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No login history available</p>';
            }
        }
        
        // Populate active sessions
        const sessionsContainer = document.getElementById('active-sessions');
        if (sessionsContainer) {
            if (security.activeSessions && security.activeSessions.length > 0) {
                sessionsContainer.innerHTML = security.activeSessions.map((session, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i class="fas ${session.device?.includes('Mobile') ? 'fa-mobile-alt' : 'fa-desktop'}" style="color: ${index === 0 ? '#10b981' : '#3b82f6'}; font-size: 18px;"></i>
                            <div>
                                <p style="margin: 0; font-weight: 600;">${session.device || 'Unknown Device'}</p>
                                <p style="margin: 0; color: #94a3b8; font-size: 12px;">IP: ${session.ip_address || 'Unknown'}</p>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${index === 0 ? '<span style="color: #10b981; font-size: 12px;">Current</span>' : `<button class="btn-secondary" style="font-size: 12px; padding: 4px 10px;" onclick="settingsLoader.revokeSession('${session.id}')">Revoke</button>`}
                        </div>
                    </div>
                `).join('');
            } else {
                sessionsContainer.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 20px;">No active sessions</p>';
            }
        }
    }
    
    calculateSecurityScore(security) {
        let score = 40; // Base score
        if (security.twoFactorEnabled) score += 30;
        if (security.loginNotifications) score += 15;
        if (security.sessionTimeout && security.sessionTimeout <= 30) score += 15;
        return Math.min(100, score);
    }
    
    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        return date.toLocaleDateString();
    }

    async saveSecuritySettings() {
        try {
            const settings = {
                two_factor_enabled: this.getCheckboxValue('twoFactorAuth'),
                login_notifications: this.getCheckboxValue('loginNotifications'),
                session_timeout: parseInt(this.getInputValue('sessionTimeout')) || 30
            };

            const response = await this.apiRequest('/settings/security', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            
            if (response.success) {
                this.showSuccess('Security settings updated!');
                this.unsavedChanges = false;
            }
        } catch (error) {
            console.error('❌ Error saving security settings:', error);
            this.showError('Failed to save security settings.');
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            const response = await this.apiRequest('/settings/security/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            if (response.success) {
                this.showSuccess('Password changed successfully!');
                return true;
            }
        } catch (error) {
            console.error('❌ Error changing password:', error);
            this.showError('Failed to change password. Please check your current password.');
            return false;
        }
    }

    async revokeSession(sessionId) {
        try {
            const response = await this.apiRequest('/settings/security/revoke-session', {
                method: 'POST',
                body: JSON.stringify({ session_id: sessionId })
            });
            
            if (response.success) {
                this.showSuccess('Session revoked!');
                // Reload security settings to update the list
                const security = await this.apiRequest('/settings/security');
                if (security.data) this.populateSecurityForm(security.data);
            }
        } catch (error) {
            console.error('❌ Error revoking session:', error);
            this.showError('Failed to revoke session.');
        }
    }

    async revokeAllSessions() {
        try {
            const response = await this.apiRequest('/settings/security/revoke-all-sessions', {
                method: 'POST',
                body: JSON.stringify({})
            });
            
            if (response.success) {
                this.showSuccess('All other sessions revoked!');
                // Reload security settings
                const security = await this.apiRequest('/settings/security');
                if (security.data) this.populateSecurityForm(security.data);
            }
        } catch (error) {
            console.error('❌ Error revoking sessions:', error);
            this.showError('Failed to revoke sessions.');
        }
    }

    // ============================================
    // PROFILE SETTINGS
    // ============================================
    populateProfileForm(profile) {
        this.setInputValue('firstName', profile.firstName);
        this.setInputValue('lastName', profile.lastName);
        this.setInputValue('email', profile.email);
        this.setInputValue('phone', profile.phone);
        this.setInputValue('dateOfBirth', profile.dateOfBirth);
        this.setInputValue('profileGender', profile.gender);
        this.setInputValue('country', profile.country);
        this.setInputValue('streetAddress', profile.streetAddress);
        this.setInputValue('city', profile.city);
        this.setInputValue('suburb', profile.suburb);
        this.setInputValue('postalCode', profile.postalCode);
        this.setInputValue('profileBio', profile.bio);
        
        // Update profile picture
        if (profile.profilePicture) {
            const img = document.querySelector('.profile-picture img');
            if (img) img.src = profile.profilePicture;
        } else {
            // Show initials
            const initials = `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`;
            const initialsEl = document.querySelector('.profile-initials');
            if (initialsEl) initialsEl.textContent = initials;
        }
        
        // Update completion percentage
        this.updateCompletionBar(profile.completionPercentage);
    }

    async saveProfileSettings() {
        try {
            // Get date value and convert empty string to null
            const dateValue = this.getInputValue('dateOfBirth');
            
            const profileData = {
                first_name: this.getInputValue('firstName'),
                last_name: this.getInputValue('lastName'),
                email: this.getInputValue('email'),
                phone: this.getInputValue('phone'),
                date_of_birth: dateValue && dateValue.trim() !== '' ? dateValue : null,
                gender: this.getInputValue('profileGender'),
                country: this.getInputValue('country'),
                street_address: this.getInputValue('streetAddress'),
                city: this.getInputValue('city'),
                suburb: this.getInputValue('suburb'),
                postal_code: this.getInputValue('postalCode'),
                bio: this.getInputValue('profileBio')
            };

            const response = await this.apiRequest('/settings/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            if (response.success) {
                this.showSuccess('Profile updated successfully!');
                this.unsavedChanges = false;
            } else {
                throw new Error(response.message || 'Failed to save profile');
            }
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            this.showError('Failed to save profile. Please try again.');
        }
    }

    // ============================================
    // NOTIFICATION SETTINGS
    // ============================================
    populateNotificationForm(settings) {
        this.setCheckboxValue('emailNotifications', settings.emailNotifications);
        this.setCheckboxValue('pushNotifications', settings.pushNotifications);
        this.setCheckboxValue('smsNotifications', settings.smsNotifications);
        this.setCheckboxValue('loanUpdates', settings.loanUpdates);
        this.setCheckboxValue('investmentUpdates', settings.investmentUpdates);
        this.setCheckboxValue('paymentAlerts', settings.paymentAlerts);
        this.setCheckboxValue('securityAlerts', settings.securityAlerts);
        this.setCheckboxValue('marketingEmails', settings.marketingEmails);
        this.setCheckboxValue('weeklyReports', settings.weeklyReports);
        this.setCheckboxValue('monthlyStatements', settings.monthlyStatements);
    }

    async saveNotificationSettings() {
        try {
            const settings = {
                email_notifications: this.getCheckboxValue('emailNotifications'),
                push_notifications: this.getCheckboxValue('pushNotifications'),
                sms_notifications: this.getCheckboxValue('smsNotifications'),
                loan_updates: this.getCheckboxValue('loanUpdates'),
                investment_updates: this.getCheckboxValue('investmentUpdates'),
                payment_alerts: this.getCheckboxValue('paymentAlerts'),
                security_alerts: this.getCheckboxValue('securityAlerts'),
                marketing_emails: this.getCheckboxValue('marketingEmails'),
                weekly_reports: this.getCheckboxValue('weeklyReports'),
                monthly_statements: this.getCheckboxValue('monthlyStatements')
            };

            const response = await this.dataManager.saveNotificationSettings(settings);
            
            if (response.success) {
                this.showSuccess('Notification settings updated!');
                this.unsavedChanges = false;
            }
        } catch (error) {
            console.error('❌ Error saving notification settings:', error);
            this.showError('Failed to save notification settings.');
        }
    }

    // ============================================
    // DISPLAY SETTINGS
    // ============================================
    populateDisplayForm(settings) {
        this.setInputValue('theme', settings.theme);
        this.setInputValue('language', settings.language);
        this.setInputValue('currency', settings.currency);
        this.setInputValue('dateFormat', settings.dateFormat);
        this.setInputValue('timeFormat', settings.timeFormat);
        this.setCheckboxValue('compactMode', settings.compactMode);
        this.setCheckboxValue('showAnimations', settings.showAnimations);
    }

    async saveDisplaySettings() {
        try {
            const settings = {
                theme: this.getInputValue('theme'),
                language: this.getInputValue('language'),
                currency: this.getInputValue('currency'),
                date_format: this.getInputValue('dateFormat'),
                time_format: this.getInputValue('timeFormat'),
                compact_mode: this.getCheckboxValue('compactMode'),
                show_animations: this.getCheckboxValue('showAnimations')
            };

            const response = await this.dataManager.saveDisplaySettings(settings);
            
            if (response.success) {
                this.showSuccess('Display settings updated!');
                this.unsavedChanges = false;
                
                // Apply theme immediately
                if (settings.theme) {
                    document.documentElement.setAttribute('data-theme', settings.theme);
                }
            }
        } catch (error) {
            console.error('❌ Error saving display settings:', error);
            this.showError('Failed to save display settings.');
        }
    }

    // ============================================
    // INVESTMENT PREFERENCES
    // ============================================
    populateInvestmentForm(preferences) {
        // Auto-invest settings
        this.setCheckboxValue('autoInvestEnabled', preferences.autoInvest);
        this.setInputValue('autoInvestAmount', preferences.autoInvestAmount);
        this.setInputValue('maxInvestmentAmount', preferences.maxLoanAmount);
        
        // Risk settings
        this.setInputValue('riskTolerance', preferences.riskTolerance);
        this.setInputValue('minReturnRate', preferences.minReturnRate);
        this.setInputValue('minZimScore', preferences.minZimScore || '50');
        
        console.log('✅ Investment preferences loaded:', preferences);
    }

    async saveInvestmentPreferences() {
        try {
            const preferences = {
                risk_tolerance: this.getInputValue('riskTolerance'),
                auto_invest: this.getCheckboxValue('autoInvestEnabled'),
                auto_invest_amount: parseFloat(this.getInputValue('autoInvestAmount')) || 0,
                max_loan_amount: parseFloat(this.getInputValue('maxInvestmentAmount')) || 0,
                min_return_rate: parseFloat(this.getInputValue('minReturnRate')) || 0,
                min_zimscore: parseInt(this.getInputValue('minZimScore')) || 50
            };

            const response = await this.apiRequest('/settings/investment-preferences', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });
            
            if (response.success) {
                this.showSuccess('Investment preferences updated!');
                this.unsavedChanges = false;
            }
        } catch (error) {
            console.error('❌ Error saving investment preferences:', error);
            this.showError('Failed to save investment preferences.');
        }
    }

    // ============================================
    // PRIVACY SETTINGS
    // ============================================
    populatePrivacyForm(settings) {
        this.setInputValue('portfolioVisibility', settings.profileVisibility);
        this.setCheckboxValue('hideInvestmentAmounts', !settings.showInvestments);
        this.setCheckboxValue('hideReturns', !settings.showLoans);
        this.setCheckboxValue('allowMessages', settings.allowMessages);
        this.setCheckboxValue('dataSharing', settings.dataSharing);
        this.setCheckboxValue('analyticsTracking', settings.analyticsTracking);
        this.setCheckboxValue('thirdPartySharing', settings.thirdPartySharing);
        
        // Calculate privacy score
        const privacyScore = this.calculatePrivacyScore(settings);
        const scoreBar = document.getElementById('privacy-score-bar');
        const scoreText = document.getElementById('privacy-score-text');
        const levelText = document.getElementById('privacy-level-text');
        const hiddenCount = document.getElementById('hidden-data-count');
        
        if (scoreBar) scoreBar.style.width = `${privacyScore}%`;
        if (scoreText) scoreText.textContent = `${privacyScore}%`;
        if (levelText) {
            if (privacyScore >= 80) levelText.textContent = 'High Security';
            else if (privacyScore >= 50) levelText.textContent = 'Moderate';
            else levelText.textContent = 'Low';
        }
        
        // Count hidden categories
        let hidden = 0;
        if (!settings.showInvestments) hidden++;
        if (!settings.showLoans) hidden++;
        if (!settings.dataSharing) hidden++;
        if (!settings.thirdPartySharing) hidden++;
        if (settings.profileVisibility === 'private') hidden++;
        if (hiddenCount) hiddenCount.textContent = `${hidden} categories`;
        
        console.log('✅ Privacy settings loaded:', settings);
    }
    
    calculatePrivacyScore(settings) {
        let score = 50; // Base score
        if (settings.profileVisibility === 'private') score += 20;
        else if (settings.profileVisibility === 'friends') score += 10;
        if (!settings.showInvestments) score += 10;
        if (!settings.showLoans) score += 10;
        if (!settings.dataSharing) score += 5;
        if (!settings.thirdPartySharing) score += 5;
        return Math.min(100, score);
    }

    async savePrivacySettings() {
        try {
            const settings = {
                profile_visibility: this.getInputValue('profileVisibility'),
                show_investments: this.getCheckboxValue('showInvestments'),
                show_loans: this.getCheckboxValue('showLoans'),
                allow_messages: this.getCheckboxValue('allowMessages'),
                data_sharing: this.getCheckboxValue('dataSharing'),
                analytics_tracking: this.getCheckboxValue('analyticsTracking'),
                third_party_sharing: this.getCheckboxValue('thirdPartySharing')
            };

            const response = await this.dataManager.savePrivacySettings(settings);
            
            if (response.success) {
                this.showSuccess('Privacy settings updated!');
                this.unsavedChanges = false;
            }
        } catch (error) {
            console.error('❌ Error saving privacy settings:', error);
            this.showError('Failed to save privacy settings.');
        }
    }

    // ============================================
    // DOCUMENTS (KYC)
    // ============================================
    populateDocuments(documents) {
        // Update document counts - ensure docs is an array
        let docs = [];
        if (Array.isArray(documents)) {
            docs = documents;
        } else if (documents && typeof documents === 'object') {
            docs = documents.documents || documents.data || [];
        }
        const verified = docs.filter(d => d.status === 'verified' || d.is_verified).length;
        const pending = docs.filter(d => d.status === 'pending' || d.status === 'processing').length;
        const rejected = docs.filter(d => d.status === 'rejected').length;
        const total = docs.length;
        
        // Required documents that might be missing
        const requiredDocs = ['ZIM_ID', 'SELFIE', 'BANK_STATEMENT'];
        const uploadedTypes = docs.map(d => d.doc_type || d.document_type);
        const missing = requiredDocs.filter(type => !uploadedTypes.includes(type)).length;
        
        // Update counts in UI
        const verifiedEl = document.getElementById('docs-verified-count');
        const pendingEl = document.getElementById('docs-pending-count');
        const missingEl = document.getElementById('docs-missing-count');
        const totalEl = document.getElementById('docs-total-count');
        
        if (verifiedEl) verifiedEl.textContent = verified;
        if (pendingEl) pendingEl.textContent = pending;
        if (missingEl) missingEl.textContent = missing;
        if (totalEl) totalEl.textContent = total;
        
        // Populate document list if container exists
        const container = document.getElementById('documents-list');
        if (!container) return;

        if (docs.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px; text-align: center;">
                    <i class="fas fa-file-upload" style="font-size: 48px; color: #94a3b8; margin-bottom: 15px;"></i>
                    <p style="color: #94a3b8;">No documents uploaded yet</p>
                    <button onclick="settingsLoader.showUploadModal()" class="btn-primary" style="margin-top: 15px;">
                        Upload Document
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = docs.map(doc => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-file-alt" style="color: ${doc.status === 'verified' || doc.is_verified ? '#10b981' : doc.status === 'pending' ? '#f59e0b' : '#ef4444'}; font-size: 20px;"></i>
                    <div>
                        <h4 style="margin: 0; font-weight: 600;">${doc.doc_type || doc.document_type || 'Document'}</h4>
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">Uploaded: ${new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; background: ${doc.status === 'verified' || doc.is_verified ? 'rgba(16, 185, 129, 0.2)' : doc.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${doc.status === 'verified' || doc.is_verified ? '#10b981' : doc.status === 'pending' ? '#f59e0b' : '#ef4444'};">
                        ${doc.status === 'verified' || doc.is_verified ? 'Verified' : doc.status || 'Pending'}
                    </span>
                    ${doc.file_url ? `<a href="${doc.file_url}" target="_blank" class="btn-secondary" style="font-size: 12px; padding: 4px 10px;"><i class="fas fa-eye"></i></a>` : ''}
                </div>
            </div>
        `).join('');
        
        console.log('✅ Documents loaded:', { verified, pending, missing, total });
    }

    async uploadDocument(documentType, file) {
        try {
            this.showLoadingState('Uploading document...');
            
            const response = await this.dataManager.uploadDocument(documentType, file);
            
            if (response.success) {
                this.showSuccess('Document uploaded successfully!');
                // Reload documents
                const documents = await this.dataManager.loadDocuments();
                this.populateDocuments(documents);
            }
        } catch (error) {
            console.error('❌ Error uploading document:', error);
            this.showError('Failed to upload document. Please try again.');
        } finally {
            this.hideLoadingState();
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================
    setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input) input.value = value || '';
    }

    getInputValue(id) {
        const input = document.getElementById(id);
        return input ? input.value : '';
    }

    setCheckboxValue(id, checked) {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = !!checked;
    }

    getCheckboxValue(id) {
        const checkbox = document.getElementById(id);
        return checkbox ? checkbox.checked : false;
    }

    getCheckedValues(className) {
        const checkboxes = document.querySelectorAll(`.${className}:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    updateCompletionBar(percentage) {
        const bar = document.querySelector('.completion-bar-fill');
        const text = document.querySelector('.completion-percentage');
        
        if (bar) bar.style.width = `${percentage}%`;
        if (text) text.textContent = `${percentage}%`;
    }

    setupEventListeners() {
        // Save buttons
        document.querySelectorAll('[data-save-settings]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const section = e.target.dataset.saveSettings;
                await this.saveSection(section);
            });
        });

        // Track changes
        document.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('change', () => {
                this.unsavedChanges = true;
            });
        });

        // Warn before leaving with unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.unsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    setupAutoSave() {
        // Check if auto-save is disabled
        if (localStorage.getItem('disableAutoSave') === 'true') {
            console.log('⏸️ Auto-save disabled (waiting for backend restart)');
            return;
        }
        
        // Auto-save every 30 seconds if there are changes
        this.autoSaveInterval = setInterval(() => {
            if (this.unsavedChanges) {
                console.log('💾 Auto-saving settings...');
                this.saveSection(this.currentTab);
            }
        }, 30000);
    }

    async saveSection(section) {
        switch(section) {
            case 'profile':
                await this.saveProfileSettings();
                break;
            case 'security':
                await this.saveSecuritySettings();
                break;
            case 'notifications':
                await this.saveNotificationSettings();
                break;
            case 'display':
                await this.saveDisplaySettings();
                break;
            case 'investment':
            case 'investments':
                await this.saveInvestmentPreferences();
                break;
            case 'privacy':
                await this.savePrivacySettings();
                break;
        }
    }

    showLoadingState(message = 'Loading...') {
        const loader = document.getElementById('settings-loader');
        if (loader) {
            loader.textContent = message;
            loader.style.display = 'block';
        }
    }

    hideLoadingState() {
        const loader = document.getElementById('settings-loader');
        if (loader) loader.style.display = 'none';
    }

    showSuccess(message) {
        // Use global showToast from dashboard.html
        if (typeof window.showToast === 'function') {
            window.showToast('success', 'Success', message);
        }
    }

    showError(message) {
        if (typeof window.showToast === 'function') {
            window.showToast('error', 'Error', message);
        }
    }

    showInfo(message) {
        if (typeof window.showToast === 'function') {
            window.showToast('info', 'Info', message);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.settingsLoader = new SettingsProductionLoader();
        window.settingsLoader.init();
    });
} else {
    window.settingsLoader = new SettingsProductionLoader();
    window.settingsLoader.init();
}

/**
 * Settings Data Loader - Production Ready
 * Handles all account settings data loading and saving
 */

const SettingsDataLoader = {
    API_BASE_URL: window.API_BASE_URL || 'https://zimcrowd-api.onrender.com',
    
    /**
     * Initialize settings data loader
     */
    async init() {
        console.log('🔧 Initializing Settings Data Loader...');
        await this.loadAllSettings();
        this.setupEventListeners();
    },

    /**
     * Load all settings data
     */
    async loadAllSettings() {
        try {
            await Promise.all([
                this.loadProfileData(),
                this.loadSecurityData(),
                this.loadNotificationSettings(),
                this.loadDisplaySettings(),
                this.loadInvestmentPreferences(),
                this.loadPrivacySettings(),
                this.loadDocuments()
            ]);
            console.log('✅ All settings loaded successfully');
        } catch (error) {
            console.error('❌ Error loading settings:', error);
        }
    },

    /**
     * API Request Helper
     */
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Load Profile Data
     */
    async loadProfileData() {
        try {
            console.log('👤 Loading profile data...');
            const response = await this.apiRequest('/api/user/profile');
            
            if (response.success && response.data) {
                const profile = response.data;
                
                // Update profile picture and initials
                this.updateProfilePicture(profile.profile_picture, profile.first_name, profile.last_name);
                
                // Update personal information
                this.setInputValue('firstName', profile.first_name);
                this.setInputValue('lastName', profile.last_name);
                this.setInputValue('email', profile.email);
                this.setInputValue('phone', profile.phone);
                this.setInputValue('dateOfBirth', profile.date_of_birth);
                this.setInputValue('country', profile.country);
                this.setInputValue('profileGender', profile.gender);
                
                // Update address information
                this.setInputValue('streetAddress', profile.street_address);
                this.setInputValue('city', profile.city);
                this.setInputValue('suburb', profile.suburb);
                this.setInputValue('postalCode', profile.postal_code);
                this.setInputValue('profileBio', profile.bio);
                
                // Update profile completion
                this.updateProfileCompletion(profile.completion_percentage || 0);
                
                // Update social login status
                this.updateSocialLoginStatus(profile.social_logins || {});
                
                console.log('✅ Profile data loaded');
            }
        } catch (error) {
            console.error('❌ Error loading profile:', error);
        }
    },

    /**
     * Update Profile Picture
     */
    updateProfilePicture(pictureUrl, firstName, lastName) {
        const avatar = document.getElementById('profile-avatar');
        const initials = document.getElementById('profile-initials');
        const navAvatar = document.querySelector('.user-avatar');
        const removeBtn = document.getElementById('remove-icon-btn');
        
        if (pictureUrl) {
            // Show image
            if (avatar) {
                avatar.style.backgroundImage = `url(${pictureUrl})`;
                avatar.style.backgroundSize = 'cover';
                avatar.style.backgroundPosition = 'center';
            }
            if (initials) initials.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'flex';
            
            // Update nav avatar
            if (navAvatar) {
                navAvatar.style.backgroundImage = `url(${pictureUrl})`;
                navAvatar.style.backgroundSize = 'cover';
                navAvatar.style.backgroundPosition = 'center';
                const navInitials = navAvatar.querySelector('span');
                if (navInitials) navInitials.style.display = 'none';
            }
        } else {
            // Show initials
            const initial = this.getInitials(firstName, lastName);
            if (initials) {
                initials.textContent = initial;
                initials.style.display = 'block';
            }
            if (avatar) {
                avatar.style.backgroundImage = 'none';
            }
            if (removeBtn) removeBtn.style.display = 'none';
            
            // Update nav avatar initials
            if (navAvatar) {
                navAvatar.style.backgroundImage = 'none';
                const navInitials = navAvatar.querySelector('span');
                if (navInitials) {
                    navInitials.textContent = initial;
                    navInitials.style.display = 'block';
                }
            }
        }
        
        // Store picture URL globally
        window.currentProfilePicture = pictureUrl;
    },

    /**
     * Get initials from name
     */
    getInitials(firstName, lastName) {
        const first = (firstName || '').charAt(0).toUpperCase();
        const last = (lastName || '').charAt(0).toUpperCase();
        return first + last || 'U';
    },

    /**
     * Update Profile Completion
     */
    updateProfileCompletion(percentage) {
        const bar = document.getElementById('completion-bar');
        const text = document.getElementById('completion-percentage');
        const status = document.getElementById('completion-status');
        
        if (bar) bar.style.width = `${percentage}%`;
        if (text) text.textContent = `${percentage}%`;
        
        if (status) {
            if (percentage < 30) {
                status.textContent = 'Getting Started';
                status.style.background = 'rgba(239, 68, 68, 0.1)';
                status.style.color = '#ef4444';
            } else if (percentage < 70) {
                status.textContent = 'In Progress';
                status.style.background = 'rgba(245, 158, 11, 0.1)';
                status.style.color = '#f59e0b';
            } else if (percentage < 100) {
                status.textContent = 'Almost There';
                status.style.background = 'rgba(59, 130, 246, 0.1)';
                status.style.color = '#3b82f6';
            } else {
                status.textContent = 'Complete';
                status.style.background = 'rgba(56, 231, 123, 0.1)';
                status.style.color = '#38e77b';
            }
        }
    },

    /**
     * Update Social Login Status
     */
    updateSocialLoginStatus(socialLogins) {
        const googleStatus = document.getElementById('googleStatus');
        const facebookStatus = document.getElementById('facebookStatus');
        
        if (googleStatus) {
            if (socialLogins.google) {
                googleStatus.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-check-circle" style="color: #38e77b;"></i>
                        <span style="color: #38e77b;">Connected as ${socialLogins.google.email || 'Google User'}</span>
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Connected on ${new Date(socialLogins.google.connected_at).toLocaleDateString()}</p>
                `;
            } else {
                googleStatus.textContent = 'Not connected';
            }
        }
        
        if (facebookStatus) {
            if (socialLogins.facebook) {
                facebookStatus.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-check-circle" style="color: #3b82f6;"></i>
                        <span style="color: #3b82f6;">Connected as ${socialLogins.facebook.name || 'Facebook User'}</span>
                    </div>
                    <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0;">Connected on ${new Date(socialLogins.facebook.connected_at).toLocaleDateString()}</p>
                `;
            } else {
                facebookStatus.textContent = 'Not connected';
            }
        }
    },

    /**
     * Load Security Data
     */
    async loadSecurityData() {
        try {
            console.log('🔒 Loading security data...');
            const response = await this.apiRequest('/api/user/security');
            
            if (response.success && response.data) {
                const security = response.data;
                
                // Update 2FA status
                const twoFactorAuth = document.getElementById('twoFactorAuth');
                if (twoFactorAuth) {
                    twoFactorAuth.checked = security.two_factor_enabled || false;
                }
                
                // Update login activity
                this.updateLoginActivity(security.recent_logins || []);
                
                // Update security score
                this.updateSecurityScore(security.security_score || 0);
                
                console.log('✅ Security data loaded');
            }
        } catch (error) {
            console.error('❌ Error loading security:', error);
        }
    },

    /**
     * Update Login Activity
     */
    updateLoginActivity(logins) {
        const container = document.querySelector('#security-tab .loan-card:last-child > div');
        if (!container || logins.length === 0) return;
        
        const html = logins.map((login, index) => {
            const isCurrent = index === 0;
            const deviceIcon = login.device_type === 'mobile' ? 'fa-mobile-alt' : 'fa-desktop';
            const iconColor = isCurrent ? '#10b981' : '#3b82f6';
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas ${deviceIcon}" style="color: ${iconColor}; font-size: 18px;"></i>
                        <div>
                            <p style="margin: 0; font-weight: 600;">${login.device_name || 'Unknown Device'}</p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">${login.browser || 'Unknown Browser'} • ${login.location || 'Unknown Location'}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; color: ${isCurrent ? '#10b981' : '#94a3b8'}; font-size: 12px;">${isCurrent ? 'Current Session' : this.formatTimeAgo(login.login_at)}</p>
                        <p style="margin: 0; color: #94a3b8; font-size: 11px;">${new Date(login.login_at).toLocaleString()}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },

    /**
     * Update Security Score
     */
    updateSecurityScore(score) {
        // Update security overview card
        const scoreElement = document.querySelector('#security-tab .loan-card:first-child .strength-bar > div');
        const scoreText = document.querySelector('#security-tab .loan-card:first-child .strength-bar + span');
        
        if (scoreElement) scoreElement.style.width = `${score}%`;
        if (scoreText) scoreText.textContent = `${score}%`;
    },

    /**
     * Load Notification Settings
     */
    async loadNotificationSettings() {
        try {
            console.log('🔔 Loading notification settings...');
            const [settingsResponse, notificationsResponse] = await Promise.all([
                this.apiRequest('/api/user/notification-settings'),
                this.apiRequest('/api/user/notifications/recent')
            ]);
            
            if (settingsResponse.success && settingsResponse.data) {
                const settings = settingsResponse.data;
                
                // Update notification toggles
                Object.keys(settings).forEach(key => {
                    const toggle = document.getElementById(key);
                    if (toggle && toggle.type === 'checkbox') {
                        toggle.checked = settings[key];
                    }
                });
                
                console.log('✅ Notification settings loaded');
            }

            // Update recent notifications
            if (notificationsResponse.success && notificationsResponse.data) {
                this.updateRecentNotifications(notificationsResponse.data);
                console.log('✅ Recent notifications loaded');
            }
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
        }
    },

    /**
     * Load Display Settings
     */
    async loadDisplaySettings() {
        try {
            console.log('🎨 Loading display settings...');
            const response = await this.apiRequest('/api/user/display-settings');
            
            if (response.success && response.data) {
                const settings = response.data;
                
                // Update theme
                if (settings.theme) {
                    const themeRadio = document.querySelector(`input[name="theme"][value="${settings.theme}"]`);
                    if (themeRadio) themeRadio.checked = true;
                }
                
                // Update language
                if (settings.language) {
                    this.setInputValue('language', settings.language);
                }
                
                // Update currency
                if (settings.currency) {
                    this.setInputValue('currency', settings.currency);
                }
                
                console.log('✅ Display settings loaded');
            }
        } catch (error) {
            console.error('❌ Error loading display settings:', error);
        }
    },

    /**
     * Load Investment Preferences
     */
    async loadInvestmentPreferences() {
        try {
            console.log('💰 Loading investment preferences...');
            const response = await this.apiRequest('/api/user/investment-preferences');
            
            if (response.success && response.data) {
                const prefs = response.data;
                
                // Update auto-invest settings
                const autoInvest = document.getElementById('autoInvest');
                if (autoInvest) autoInvest.checked = prefs.auto_invest_enabled || false;
                
                // Update risk preference
                if (prefs.risk_preference) {
                    this.setInputValue('riskPreference', prefs.risk_preference);
                }
                
                // Update investment amount
                if (prefs.default_investment_amount) {
                    this.setInputValue('defaultInvestmentAmount', prefs.default_investment_amount);
                }
                
                console.log('✅ Investment preferences loaded');
            }
        } catch (error) {
            console.error('❌ Error loading investment preferences:', error);
        }
    },

    /**
     * Load Privacy Settings
     */
    async loadPrivacySettings() {
        try {
            console.log('🔐 Loading privacy settings...');
            const response = await this.apiRequest('/api/user/privacy-settings');
            
            if (response.success && response.data) {
                const settings = response.data;
                
                // Update privacy toggles
                Object.keys(settings).forEach(key => {
                    const toggle = document.getElementById(key);
                    if (toggle && toggle.type === 'checkbox') {
                        toggle.checked = settings[key];
                    }
                });
                
                console.log('✅ Privacy settings loaded');
            }
        } catch (error) {
            console.error('❌ Error loading privacy settings:', error);
        }
    },

    /**
     * Load Documents
     */
    async loadDocuments() {
        try {
            console.log('📄 Loading documents...');
            const response = await this.apiRequest('/api/user/documents');
            
            if (response.success && response.data) {
                this.updateDocumentsList(response.data);
                this.updateKYCDocumentBadges(response.data);
                console.log('✅ Documents loaded');
            }
        } catch (error) {
            console.error('❌ Error loading documents:', error);
        }
    },

    /**
     * Update KYC Document Status Badges
     */
    updateKYCDocumentBadges(documents) {
        // Get all document upload areas
        const uploadAreas = document.querySelectorAll('.document-upload-area[data-doc-type]');
        
        uploadAreas.forEach(area => {
            const docType = area.getAttribute('data-doc-type');
            const badge = area.querySelector('.doc-status-badge');
            const icon = area.querySelector('i.fa-id-card, i.fa-file-invoice-dollar, i.fa-file-contract, i.fa-university, i.fa-home');
            const button = area.querySelector('button');
            
            // Find matching document from API
            const doc = documents.find(d => d.document_type === docType);
            
            if (doc && badge) {
                // Show badge
                badge.style.display = 'inline-block';
                
                const statusText = badge.querySelector('.status-text');
                const badgeIcon = badge.querySelector('i');
                
                // Update based on status
                if (doc.status === 'verified') {
                    badge.style.background = 'rgba(56, 231, 123, 0.1)';
                    badge.style.color = '#38e77b';
                    badgeIcon.className = 'fas fa-check-circle';
                    statusText.textContent = 'Verified';
                    if (icon) icon.style.color = '#38e77b';
                    if (button) button.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Update Document';
                } else if (doc.status === 'pending') {
                    badge.style.background = 'rgba(249, 115, 22, 0.1)';
                    badge.style.color = '#f97316';
                    badgeIcon.className = 'fas fa-clock';
                    statusText.textContent = 'Pending Review';
                    if (icon) icon.style.color = '#f97316';
                    if (button) button.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Update Document';
                } else if (doc.status === 'rejected') {
                    badge.style.background = 'rgba(239, 68, 68, 0.1)';
                    badge.style.color = '#ef4444';
                    badgeIcon.className = 'fas fa-times-circle';
                    statusText.textContent = 'Rejected';
                    if (icon) icon.style.color = '#ef4444';
                    if (button) button.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Re-upload Document';
                }
            }
            // If no document found, badge stays hidden (display: none)
        });
    },

    /**
     * Update Documents List
     */
    updateDocumentsList(documents) {
        const container = document.getElementById('documentsContainer');
        const historyContainer = document.getElementById('documentHistoryContainer');
        
        if (!container) return;
        
        if (documents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #64748b;">
                    <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No documents uploaded yet</p>
                </div>
            `;
            
            if (historyContainer) {
                historyContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 15px;"></i>
                        <p>No document history available</p>
                    </div>
                `;
            }
            return;
        }
        
        // Update "My Uploaded Documents" section
        const html = documents.map(doc => {
            const statusColor = doc.status === 'verified' ? '#38e77b' : doc.status === 'pending' ? '#f59e0b' : '#ef4444';
            const statusIcon = doc.status === 'verified' ? 'fa-check-circle' : doc.status === 'pending' ? 'fa-clock' : 'fa-times-circle';
            
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-file-pdf" style="font-size: 24px; color: #ef4444;"></i>
                        <div>
                            <h4 style="margin: 0 0 5px 0;">${doc.document_type || 'Document'}</h4>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${statusIcon}" style="color: ${statusColor};"></i>
                            <span style="color: ${statusColor}; font-size: 14px; text-transform: capitalize;">${doc.status}</span>
                        </div>
                        <button class="btn-secondary" style="padding: 8px 16px; font-size: 12px;" onclick="viewDocument('${doc.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
        
        // Update "Document History" table
        if (historyContainer) {
            const iconMap = {
                'National ID': 'fa-id-card',
                'Payslip': 'fa-file-invoice-dollar',
                'Bank Statement': 'fa-university',
                'Employment Contract': 'fa-file-contract',
                'Proof of Address': 'fa-home',
                'Additional Documents': 'fa-folder-plus'
            };
            
            const tableHtml = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid #334155;">
                                <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 13px;">Document Type</th>
                                <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 13px;">Upload Date</th>
                                <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 13px;">Status</th>
                                <th style="padding: 12px; text-align: left; color: #94a3b8; font-size: 13px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${documents.map(doc => {
                                const statusColor = doc.status === 'verified' ? '#38e77b' : doc.status === 'pending' ? '#f59e0b' : '#ef4444';
                                const icon = iconMap[doc.document_type] || 'fa-file-alt';
                                const iconColor = doc.status === 'verified' ? '#38e77b' : doc.status === 'pending' ? '#f97316' : '#ef4444';
                                
                                return `
                                    <tr style="border-bottom: 1px solid #334155;">
                                        <td style="padding: 16px;">
                                            <i class="fas ${icon}" style="margin-right: 8px; color: ${iconColor};"></i> 
                                            ${doc.document_type || 'Document'}
                                        </td>
                                        <td style="padding: 16px;">${new Date(doc.uploaded_at).toISOString().split('T')[0]}</td>
                                        <td style="padding: 16px;">
                                            <span style="padding: 4px 12px; background: rgba(${statusColor === '#38e77b' ? '56, 231, 123' : statusColor === '#f59e0b' ? '245, 158, 11' : '239, 68, 68'}, 0.1); color: ${statusColor}; border-radius: 12px; font-size: 12px; text-transform: capitalize;">
                                                ${doc.status}
                                            </span>
                                        </td>
                                        <td style="padding: 16px;">
                                            <button class="btn-secondary btn-sm" style="margin-right: 8px;" onclick="viewDocument('${doc.id}')">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                            <button class="btn-secondary btn-sm" onclick="downloadDocument('${doc.id}')">
                                                <i class="fas fa-arrow-down-to-line"></i> Download
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            historyContainer.innerHTML = tableHtml;
        }
    },

    /**
     * Save Profile Information
     */
    async saveProfile() {
        try {
            console.log('💾 Saving profile...');
            
            const profileData = {
                first_name: this.getInputValue('firstName'),
                last_name: this.getInputValue('lastName'),
                email: this.getInputValue('email'),
                phone: this.getInputValue('phone'),
                date_of_birth: this.getInputValue('dateOfBirth'),
                gender: this.getInputValue('profileGender'),
                country: this.getInputValue('country'),
                street_address: this.getInputValue('streetAddress'),
                city: this.getInputValue('city'),
                suburb: this.getInputValue('suburb'),
                postal_code: this.getInputValue('postalCode'),
                bio: this.getInputValue('profileBio')
            };
            
            const response = await this.apiRequest('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            if (response.success) {
                this.showNotification('Profile updated successfully!', 'success');
                // Reload profile data
                await this.loadProfileData();
            } else {
                throw new Error(response.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('❌ Error saving profile:', error);
            this.showNotification('Failed to update profile', 'error');
        }
    },

    /**
     * Save Profile Picture
     */
    async saveProfilePicture(file) {
        try {
            console.log('📸 Uploading profile picture...');
            
            const formData = new FormData();
            formData.append('profile_picture', file);
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${this.API_BASE_URL}/api/user/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Profile picture updated!', 'success');
                this.updateProfilePicture(result.data.profile_picture_url, null, null);
            } else {
                throw new Error(result.message || 'Failed to upload picture');
            }
        } catch (error) {
            console.error('❌ Error uploading picture:', error);
            this.showNotification('Failed to upload picture', 'error');
        }
    },

    /**
     * Remove Profile Picture
     */
    async removeProfilePicture() {
        try {
            console.log('🗑️ Removing profile picture...');
            
            const response = await this.apiRequest('/api/user/profile-picture', {
                method: 'DELETE'
            });
            
            if (response.success) {
                this.showNotification('Profile picture removed', 'success');
                await this.loadProfileData();
            } else {
                throw new Error(response.message || 'Failed to remove picture');
            }
        } catch (error) {
            console.error('❌ Error removing picture:', error);
            this.showNotification('Failed to remove picture', 'error');
        }
    },

    /**
     * Change Password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            console.log('🔑 Changing password...');
            
            const response = await this.apiRequest('/api/user/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            if (response.success) {
                this.showNotification('Password changed successfully!', 'success');
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
            } else {
                throw new Error(response.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('❌ Error changing password:', error);
            this.showNotification(error.message || 'Failed to change password', 'error');
        }
    },

    /**
     * Save Notification Settings
     */
    async saveNotificationSettings(settings) {
        try {
            const response = await this.apiRequest('/api/user/notification-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            
            if (response.success) {
                this.showNotification('Notification settings updated!', 'success');
            }
        } catch (error) {
            console.error('❌ Error saving notification settings:', error);
            this.showNotification('Failed to update settings', 'error');
        }
    },

    /**
     * Helper Methods
     */
    setInputValue(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    },

    getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    },

    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
        return new Date(date).toLocaleDateString();
    },

    showNotification(message, type = 'info') {
        // Use existing notification system or create a simple one
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message); // Replace with better notification UI
    },

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Profile picture upload
        const uploadInput = document.getElementById('profile-upload');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Preview image
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.updateProfilePicture(event.target.result, null, null);
                    };
                    reader.readAsDataURL(file);
                    
                    // Store file for upload
                    window.pendingProfilePicture = file;
                }
            });
        }

        // Notification toggles - auto-save on change
        const notificationToggles = [
            'emailLoanReminders', 'emailInvestmentReturns', 'emailLoanOpportunities',
            'emailSecurityAlerts', 'emailWeeklySummary', 'emailMarketing',
            'pushTransactionAlerts', 'pushAccountActivity', 'pushInvestmentUpdates',
            'pushPaymentReminders', 'smsTransactionAlerts', 'smsSecurityAlerts'
        ];

        notificationToggles.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', () => {
                    this.saveNotificationSettings({
                        [id]: toggle.checked
                    });
                });
            }
        });

        // Display settings - auto-save on change
        const displaySelects = ['displayLanguage', 'displayCurrency', 'displayDateFormat'];
        displaySelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', () => {
                    this.saveDisplaySettings();
                });
            }
        });

        const displayCheckboxes = ['displayAnimations', 'displayCompactView'];
        displayCheckboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.saveDisplaySettings();
                });
            }
        });
    },

    /**
     * Save Display Settings
     */
    async saveDisplaySettings() {
        try {
            const settings = {
                language: this.getInputValue('displayLanguage'),
                currency: this.getInputValue('displayCurrency'),
                date_format: this.getInputValue('displayDateFormat'),
                animations_enabled: document.getElementById('displayAnimations')?.checked || false,
                compact_view: document.getElementById('displayCompactView')?.checked || false
            };

            const response = await this.apiRequest('/api/user/display-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });

            if (response.success) {
                console.log('✅ Display settings saved');
            }
        } catch (error) {
            console.error('❌ Error saving display settings:', error);
        }
    },

    /**
     * Update Recent Notifications
     */
    updateRecentNotifications(notifications) {
        const container = document.getElementById('recentNotificationsContainer');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-bell-slash" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No recent notifications</p>
                </div>
            `;
            return;
        }

        const html = notifications.map(notif => {
            const iconMap = {
                'investment_return': { icon: 'fa-dollar-sign', color: '#10b981' },
                'payment_due': { icon: 'fa-exclamation-triangle', color: '#f59e0b' },
                'new_opportunity': { icon: 'fa-lightbulb', color: '#3b82f6' },
                'security_alert': { icon: 'fa-shield-alt', color: '#ef4444' },
                'loan_approved': { icon: 'fa-check-circle', color: '#38e77b' }
            };

            const iconInfo = iconMap[notif.type] || { icon: 'fa-bell', color: '#94a3b8' };

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas ${iconInfo.icon}" style="color: ${iconInfo.color}; font-size: 16px;"></i>
                        <div>
                            <p style="margin: 0; font-weight: 600;">${notif.title}</p>
                            <p style="margin: 0; color: #94a3b8; font-size: 12px;">${notif.message}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; color: #94a3b8; font-size: 11px;">${this.formatTimeAgo(notif.created_at)}</p>
                        ${!notif.read ? `<button class="btn-secondary" style="font-size: 10px; padding: 4px 8px;" onclick="SettingsDataLoader.markNotificationRead('${notif.id}')">Mark Read</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    },

    /**
     * Mark Notification as Read
     */
    async markNotificationRead(notificationId) {
        try {
            await this.apiRequest(`/api/user/notifications/${notificationId}/read`, {
                method: 'POST'
            });
            // Reload notifications
            await this.loadNotificationSettings();
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SettingsDataLoader.init());
} else {
    SettingsDataLoader.init();
}

// Make available globally
window.SettingsDataLoader = SettingsDataLoader;

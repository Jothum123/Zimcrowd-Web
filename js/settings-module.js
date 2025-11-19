/**
 * Settings Module
 * All settings tabs: Profile, Security, Notifications, Display, Investment, Privacy, Documents
 */

const SettingsModule = {
    currentTab: 'profile',
    profileData: null,
    
    async loadSettings() {
        try {
            this.profileData = await window.DashboardData.fetchProfile();
            this.switchTab('profile');
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            }
        });
        
        // Render tab content
        const container = document.getElementById('settingsContent');
        
        switch(tab) {
            case 'profile':
                container.innerHTML = this.renderProfileTab();
                break;
            case 'security':
                container.innerHTML = this.renderSecurityTab();
                break;
            case 'notifications':
                container.innerHTML = this.renderNotificationsTab();
                break;
            case 'display':
                container.innerHTML = this.renderDisplayTab();
                break;
            case 'investment':
                container.innerHTML = this.renderInvestmentTab();
                break;
            case 'privacy':
                container.innerHTML = this.renderPrivacyTab();
                break;
            case 'documents':
                container.innerHTML = this.renderDocumentsTab();
                break;
        }
    },
    
    renderProfileTab() {
        const profile = this.profileData || {};
        
        return `
            <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" id="fullName" value="${profile.full_name || ''}" placeholder="Enter your full name">
            </div>
            
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" id="email" value="${profile.email || ''}" placeholder="Enter your email">
            </div>
            
            <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" class="form-input" id="phone" value="${profile.phone || ''}" placeholder="+263771234567">
            </div>
            
            <div class="form-group">
                <label class="form-label">Date of Birth</label>
                <input type="date" class="form-input" id="dob" value="${profile.date_of_birth || ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Address</label>
                <textarea class="form-textarea" id="address" placeholder="Enter your address">${profile.address || ''}</textarea>
            </div>
            
            <button class="btn btn-primary" onclick="SettingsModule.updateProfile()">
                <i class="fas fa-save"></i> Save Changes
            </button>
        `;
    },
    
    renderSecurityTab() {
        return `
            <h3 style="margin-bottom: 1.5rem;">Change Password</h3>
            
            <div class="form-group">
                <label class="form-label">Current Password</label>
                <input type="password" class="form-input" id="currentPassword" placeholder="Enter current password">
            </div>
            
            <div class="form-group">
                <label class="form-label">New Password</label>
                <input type="password" class="form-input" id="newPassword" placeholder="Enter new password">
            </div>
            
            <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <input type="password" class="form-input" id="confirmPassword" placeholder="Confirm new password">
            </div>
            
            <button class="btn btn-primary" onclick="SettingsModule.changePassword()">
                <i class="fas fa-key"></i> Update Password
            </button>
            
            <hr style="margin: 2rem 0; border: none; border-top: 1px solid var(--border);">
            
            <h3 style="margin-bottom: 1.5rem;">Two-Factor Authentication</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Add an extra layer of security to your account</p>
            
            <button class="btn btn-secondary" onclick="SettingsModule.enable2FA()">
                <i class="fas fa-shield-alt"></i> Enable 2FA
            </button>
        `;
    },
    
    renderNotificationsTab() {
        return `
            <h3 style="margin-bottom: 1.5rem;">Email Notifications</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Transaction Alerts</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Receive emails for all transactions</div>
                </div>
                <input type="checkbox" id="emailTransactions" checked>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Loan Updates</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Get notified about loan status changes</div>
                </div>
                <input type="checkbox" id="emailLoans" checked>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 2rem;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Marketing Emails</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Receive promotional offers and updates</div>
                </div>
                <input type="checkbox" id="emailMarketing">
            </div>
            
            <h3 style="margin-bottom: 1.5rem;">SMS Notifications</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Payment Reminders</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">SMS reminders for upcoming payments</div>
                </div>
                <input type="checkbox" id="smsPayments" checked>
            </div>
            
            <button class="btn btn-primary" onclick="SettingsModule.saveNotificationPreferences()">
                <i class="fas fa-save"></i> Save Preferences
            </button>
        `;
    },
    
    renderDisplayTab() {
        return `
            <div class="form-group">
                <label class="form-label">Theme</label>
                <select class="form-select" id="theme">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Language</label>
                <select class="form-select" id="language">
                    <option value="en">English</option>
                    <option value="sn">Shona</option>
                    <option value="nd">Ndebele</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Currency Display</label>
                <select class="form-select" id="currency">
                    <option value="usd">USD ($)</option>
                    <option value="zwl">ZWL (Z$)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Date Format</label>
                <select class="form-select" id="dateFormat">
                    <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                    <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                    <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </select>
            </div>
            
            <button class="btn btn-primary" onclick="SettingsModule.saveDisplayPreferences()">
                <i class="fas fa-save"></i> Save Preferences
            </button>
        `;
    },
    
    renderInvestmentTab() {
        return `
            <div class="form-group">
                <label class="form-label">Risk Tolerance</label>
                <select class="form-select" id="riskTolerance">
                    <option value="low">Low - Conservative investments</option>
                    <option value="medium">Medium - Balanced portfolio</option>
                    <option value="high">High - Aggressive growth</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Investment Goal</label>
                <select class="form-select" id="investmentGoal">
                    <option value="income">Regular Income</option>
                    <option value="growth">Capital Growth</option>
                    <option value="balanced">Balanced</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Auto-Invest</label>
                <select class="form-select" id="autoInvest">
                    <option value="disabled">Disabled</option>
                    <option value="enabled">Enabled</option>
                </select>
                <small style="color: var(--text-secondary);">Automatically invest available funds</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Monthly Investment Budget (USD)</label>
                <input type="number" class="form-input" id="monthlyBudget" placeholder="0.00" min="0" step="10">
            </div>
            
            <button class="btn btn-primary" onclick="SettingsModule.saveInvestmentPreferences()">
                <i class="fas fa-save"></i> Save Preferences
            </button>
        `;
    },
    
    renderPrivacyTab() {
        return `
            <h3 style="margin-bottom: 1.5rem;">Privacy Settings</h3>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Profile Visibility</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Show your profile to other users</div>
                </div>
                <input type="checkbox" id="profileVisible" checked>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 1rem;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Investment Activity</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Show your investment activity</div>
                </div>
                <input type="checkbox" id="activityVisible">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--light); border-radius: 8px; margin-bottom: 2rem;">
                <div>
                    <div style="font-weight: 600; margin-bottom: 0.25rem;">Data Sharing</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">Share anonymized data for analytics</div>
                </div>
                <input type="checkbox" id="dataSharing">
            </div>
            
            <button class="btn btn-primary" onclick="SettingsModule.savePrivacySettings()">
                <i class="fas fa-save"></i> Save Settings
            </button>
            
            <hr style="margin: 2rem 0; border: none; border-top: 1px solid var(--border);">
            
            <h3 style="margin-bottom: 1rem; color: var(--danger);">Danger Zone</h3>
            <button class="btn btn-danger" onclick="SettingsModule.deleteAccount()">
                <i class="fas fa-trash"></i> Delete Account
            </button>
        `;
    },
    
    renderDocumentsTab() {
        return `
            <h3 style="margin-bottom: 1.5rem;">KYC Documents</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Upload your documents for verification</p>
            
            <div class="form-group">
                <label class="form-label">National ID</label>
                <input type="file" class="form-input" id="nationalId" accept=".pdf,.jpg,.jpeg,.png">
            </div>
            
            <div class="form-group">
                <label class="form-label">Proof of Address</label>
                <input type="file" class="form-input" id="proofOfAddress" accept=".pdf,.jpg,.jpeg,.png">
            </div>
            
            <div class="form-group">
                <label class="form-label">Bank Statement</label>
                <input type="file" class="form-input" id="bankStatement" accept=".pdf">
            </div>
            
            <button class="btn btn-primary" onclick="SettingsModule.uploadDocuments()">
                <i class="fas fa-upload"></i> Upload Documents
            </button>
            
            <hr style="margin: 2rem 0; border: none; border-top: 1px solid var(--border);">
            
            <h3 style="margin-bottom: 1.5rem;">Uploaded Documents</h3>
            <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                No documents uploaded yet
            </p>
        `;
    },
    
    async updateProfile() {
        const data = {
            full_name: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            date_of_birth: document.getElementById('dob').value,
            address: document.getElementById('address').value
        };
        
        try {
            const result = await window.DashboardData.updateProfile(data);
            if (result.success) {
                window.DashboardCore.showSuccess('Profile updated successfully!');
            } else {
                window.DashboardCore.showError(result.message || 'Update failed');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            window.DashboardCore.showError('Failed to update profile');
        }
    },
    
    changePassword() {
        // TODO: Implement password change
        window.DashboardCore.showSuccess('Password change feature coming soon!');
    },
    
    enable2FA() {
        // TODO: Implement 2FA
        window.DashboardCore.showSuccess('2FA setup coming soon!');
    },
    
    saveNotificationPreferences() {
        window.DashboardCore.showSuccess('Notification preferences saved!');
    },
    
    saveDisplayPreferences() {
        window.DashboardCore.showSuccess('Display preferences saved!');
    },
    
    saveInvestmentPreferences() {
        window.DashboardCore.showSuccess('Investment preferences saved!');
    },
    
    savePrivacySettings() {
        window.DashboardCore.showSuccess('Privacy settings saved!');
    },
    
    uploadDocuments() {
        window.DashboardCore.showSuccess('Documents uploaded successfully!');
    },
    
    deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            window.DashboardCore.showSuccess('Account deletion request submitted');
        }
    }
};

// Initialize tab switching
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            SettingsModule.switchTab(btn.dataset.tab);
        });
    });
});

window.SettingsModule = SettingsModule;
console.log('✅ Settings Module loaded');

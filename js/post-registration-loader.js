/**
 * Post-Registration Production Loader
 * Handles KYC verification, profile setup, and payment method configuration
 * Uses production API endpoints
 */

class PostRegistrationLoader {
    constructor() {
        this.dataManager = window.ProductionDataManager;
        this.currentStep = 1;
        this.totalSteps = 3;
        this.formData = {};
        
        // Production API base URL
        this.apiBase = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api' 
            : 'https://zimcrowd-api.onrender.com/api';
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('token') || 
               localStorage.getItem('access_token');
    }

    async apiRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers
        });
        
        return response.json();
    }

    async init() {
        console.log('🎯 Initializing Post-Registration Loader...');
        
        try {
            // Check if user has already completed registration
            await this.checkRegistrationStatus();
            
            // Load payment methods
            await this.loadPaymentMethods();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Post-Registration Loader ready');
        } catch (error) {
            console.error('❌ Error initializing post-registration:', error);
        }
    }

    async checkRegistrationStatus() {
        try {
            // Use production API to check KYC status
            const response = await this.apiRequest('/kyc/status');
            
            if (response.success && response.data) {
                const kycStatus = response.data;
                
                // Update UI based on status
                this.updateKYCStatus(kycStatus);
                
                // If already verified, redirect to dashboard
                if (kycStatus.status === 'verified' || kycStatus.status === 'approved') {
                    console.log('✅ KYC already verified, redirecting...');
                    this.showSuccess('Profile already verified! Redirecting to dashboard...');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('❌ Error checking registration status:', error);
            // Continue with registration flow even if status check fails
        }
    }

    updateKYCStatus(status) {
        const statusEl = document.getElementById('kyc-status');
        if (statusEl) {
            statusEl.textContent = status.status.toUpperCase();
            statusEl.className = `status-badge ${status.status}`;
        }

        // Update progress
        if (status.completedSteps) {
            status.completedSteps.forEach(step => {
                this.markStepComplete(step);
            });
        }
    }

    // ============================================
    // STEP 1: KYC VERIFICATION
    // ============================================
    async submitKYCVerification() {
        try {
            this.showLoadingState('Submitting KYC verification...');
            
            const kycData = {
                id_type: this.getInputValue('idType'),
                id_number: this.getInputValue('idNumber'),
                id_expiry: this.getInputValue('idExpiry'),
                nationality: this.getInputValue('nationality'),
                occupation: this.getInputValue('occupation'),
                income_range: this.getInputValue('incomeRange'),
                source_of_funds: this.getInputValue('sourceOfFunds'),
                address_proof_type: this.getInputValue('addressProofType')
            };

            // Validate
            if (!this.validateKYCData(kycData)) {
                this.showError('Please fill in all required fields');
                this.hideLoadingState();
                return;
            }

            // Use production API
            const response = await this.apiRequest('/kyc/submit', {
                method: 'POST',
                body: JSON.stringify(kycData)
            });
            
            if (response.success) {
                this.showSuccess('KYC verification submitted successfully!');
                this.formData.kyc = kycData;
                this.nextStep();
            } else {
                throw new Error(response.message || 'KYC submission failed');
            }
            
            this.hideLoadingState();
        } catch (error) {
            console.error('❌ Error submitting KYC:', error);
            this.showError('Failed to submit KYC verification. Please try again.');
            this.hideLoadingState();
        }
    }

    validateKYCData(data) {
        const required = ['id_type', 'id_number', 'nationality', 'occupation'];
        return required.every(field => data[field] && data[field].trim() !== '');
    }

    async uploadKYCDocument(documentType) {
        const fileInput = document.getElementById(`${documentType}-upload`);
        if (!fileInput || !fileInput.files[0]) {
            this.showError('Please select a file to upload');
            return;
        }

        try {
            this.showLoadingState('Uploading document...');
            
            const file = fileInput.files[0];
            
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('document', file);
            formData.append('document_type', documentType);
            
            const token = this.getAuthToken();
            const response = await fetch(`${this.apiBase}/documents/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(`${documentType} uploaded successfully!`);
                this.markDocumentUploaded(documentType);
            } else {
                throw new Error(result.message || 'Upload failed');
            }
            
            this.hideLoadingState();
        } catch (error) {
            console.error('❌ Error uploading document:', error);
            this.showError('Failed to upload document. Please try again.');
            this.hideLoadingState();
        }
    }

    markDocumentUploaded(documentType) {
        const uploadBtn = document.getElementById(`${documentType}-upload-btn`);
        if (uploadBtn) {
            uploadBtn.innerHTML = '<i class="fas fa-check"></i> Uploaded';
            uploadBtn.classList.add('uploaded');
            uploadBtn.disabled = true;
        }
    }

    // ============================================
    // STEP 2: PROFILE SETUP
    // ============================================
    async completeProfileSetup() {
        try {
            this.showLoadingState('Completing profile setup...');
            
            const profileData = {
                first_name: this.getInputValue('setupFirstName'),
                last_name: this.getInputValue('setupLastName'),
                phone: this.getInputValue('setupPhone'),
                date_of_birth: this.getInputValue('setupDOB'),
                gender: this.getInputValue('setupGender'),
                street_address: this.getInputValue('setupAddress'),
                city: this.getInputValue('setupCity'),
                country: this.getInputValue('setupCountry'),
                postal_code: this.getInputValue('setupPostalCode'),
                bio: this.getInputValue('setupBio'),
                // Investment preferences
                risk_tolerance: this.getInputValue('riskTolerance'),
                investment_goals: this.getCheckedValues('investment-goal'),
                preferred_sectors: this.getCheckedValues('preferred-sector')
            };

            // Validate
            if (!this.validateProfileData(profileData)) {
                this.showError('Please fill in all required fields');
                this.hideLoadingState();
                return;
            }

            // Use production API
            const response = await this.apiRequest('/profile/update', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            
            if (response.success) {
                this.showSuccess('Profile setup completed!');
                this.formData.profile = profileData;
                
                // Store profile data locally
                localStorage.setItem('userData', JSON.stringify({
                    ...profileData,
                    monthly_income: this.getInputValue('monthlyIncome') || 0,
                    employment_type: this.getInputValue('employmentType') || 'private'
                }));
                
                this.nextStep();
            } else {
                throw new Error(response.message || 'Profile setup failed');
            }
            
            this.hideLoadingState();
        } catch (error) {
            console.error('❌ Error completing profile setup:', error);
            this.showError('Failed to complete profile setup. Please try again.');
            this.hideLoadingState();
        }
    }

    validateProfileData(data) {
        const required = ['first_name', 'last_name', 'phone', 'country'];
        return required.every(field => data[field] && data[field].trim() !== '');
    }

    // ============================================
    // STEP 3: PAYMENT METHOD
    // ============================================
    async loadPaymentMethods() {
        try {
            // Use production API
            const response = await this.apiRequest('/wallet/payment-methods');
            
            if (response.success && response.data) {
                this.displayPaymentMethods(response.data);
            } else {
                // Fallback to default payment methods
                this.displayPaymentMethods([
                    { id: 'ecocash', name: 'EcoCash', icon: 'fa-mobile-alt', description: 'Mobile money transfer', fees: '1.5%' },
                    { id: 'innbucks', name: 'InnBucks', icon: 'fa-wallet', description: 'InnBucks wallet', fees: '1.5%' },
                    { id: 'onemoney', name: 'OneMoney', icon: 'fa-money-bill-wave', description: 'OneMoney mobile', fees: '1.5%' },
                    { id: 'bank', name: 'Bank Transfer', icon: 'fa-university', description: 'Direct bank transfer', fees: '0%' }
                ]);
            }
        } catch (error) {
            console.error('❌ Error loading payment methods:', error);
            // Fallback to default payment methods
            this.displayPaymentMethods([
                { id: 'ecocash', name: 'EcoCash', icon: 'fa-mobile-alt', description: 'Mobile money transfer', fees: '1.5%' },
                { id: 'innbucks', name: 'InnBucks', icon: 'fa-wallet', description: 'InnBucks wallet', fees: '1.5%' },
                { id: 'onemoney', name: 'OneMoney', icon: 'fa-money-bill-wave', description: 'OneMoney mobile', fees: '1.5%' },
                { id: 'bank', name: 'Bank Transfer', icon: 'fa-university', description: 'Direct bank transfer', fees: '0%' }
            ]);
        }
    }

    displayPaymentMethods(methods) {
        const container = document.getElementById('payment-methods-list');
        if (!container) return;

        container.innerHTML = methods.map(method => `
            <div class="payment-method-card" data-method="${method.id}">
                <div class="method-icon">
                    <i class="fas ${method.icon}"></i>
                </div>
                <div class="method-info">
                    <h3>${method.name}</h3>
                    <p>${method.description}</p>
                    ${method.fees ? `<span class="fees">Fees: ${method.fees}</span>` : ''}
                </div>
                <button class="btn-select" onclick="postRegLoader.selectPaymentMethod('${method.id}')">
                    Select
                </button>
            </div>
        `).join('');
    }

    async selectPaymentMethod(methodId) {
        try {
            this.showLoadingState('Setting up payment method...');
            
            const methodData = {
                method_id: methodId,
                is_primary: true
            };

            // Use production API
            const response = await this.apiRequest('/wallet/payment-methods', {
                method: 'POST',
                body: JSON.stringify(methodData)
            });
            
            if (response.success) {
                this.showSuccess('Payment method added successfully!');
                this.formData.paymentMethod = methodId;
                
                // Store payment method locally
                localStorage.setItem('paymentSetup', 'true');
                localStorage.setItem('primaryPaymentMethod', methodId);
                
                // Complete registration
                await this.completeRegistration();
            } else {
                throw new Error(response.message || 'Failed to add payment method');
            }
            
            this.hideLoadingState();
        } catch (error) {
            console.error('❌ Error selecting payment method:', error);
            this.showError('Failed to add payment method. You can add it later from settings.');
            this.hideLoadingState();
            
            // Allow user to skip this step
            setTimeout(() => this.completeRegistration(), 2000);
        }
    }

    async completeRegistration() {
        try {
            this.showLoadingState('Completing registration...');
            
            // Show success message
            this.showSuccess('Registration completed successfully!');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('❌ Error completing registration:', error);
            this.showError('Registration completed with some issues. Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 3000);
        }
    }

    // ============================================
    // NAVIGATION
    // ============================================
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStepDisplay();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }

    goToStep(step) {
        if (step >= 1 && step <= this.totalSteps) {
            this.currentStep = step;
            this.updateStepDisplay();
        }
    }

    updateStepDisplay() {
        // Hide all steps
        document.querySelectorAll('.registration-step').forEach(step => {
            step.style.display = 'none';
        });

        // Show current step
        const currentStepEl = document.getElementById(`step-${this.currentStep}`);
        if (currentStepEl) {
            currentStepEl.style.display = 'block';
        }

        // Update progress bar
        const progress = (this.currentStep / this.totalSteps) * 100;
        const progressBar = document.querySelector('.progress-bar-fill');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            if (index + 1 < this.currentStep) {
                indicator.classList.add('completed');
                indicator.classList.remove('active');
            } else if (index + 1 === this.currentStep) {
                indicator.classList.add('active');
                indicator.classList.remove('completed');
            } else {
                indicator.classList.remove('active', 'completed');
            }
        });
    }

    markStepComplete(stepNumber) {
        const indicator = document.querySelector(`.step-indicator[data-step="${stepNumber}"]`);
        if (indicator) {
            indicator.classList.add('completed');
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // Next buttons
        document.querySelectorAll('[data-next-step]').forEach(btn => {
            btn.addEventListener('click', () => {
                const step = parseInt(btn.dataset.nextStep);
                if (step === 2) {
                    this.submitKYCVerification();
                } else if (step === 3) {
                    this.completeProfileSetup();
                }
            });
        });

        // Previous buttons
        document.querySelectorAll('[data-prev-step]').forEach(btn => {
            btn.addEventListener('click', () => this.previousStep());
        });

        // Document upload buttons
        document.querySelectorAll('[data-upload-doc]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const docType = e.target.dataset.uploadDoc;
                this.uploadKYCDocument(docType);
            });
        });

        // Skip button
        const skipBtn = document.getElementById('skip-payment-method');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.completeRegistration());
        }
    }

    // ============================================
    // UTILITY METHODS
    // ============================================
    getInputValue(id) {
        const input = document.getElementById(id);
        return input ? input.value : '';
    }

    getCheckedValues(className) {
        const checkboxes = document.querySelectorAll(`.${className}:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    }

    showLoadingState(message = 'Loading...') {
        const loader = document.getElementById('registration-loader');
        if (loader) {
            loader.textContent = message;
            loader.style.display = 'flex';
        }
    }

    hideLoadingState() {
        const loader = document.getElementById('registration-loader');
        if (loader) loader.style.display = 'none';
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.postRegLoader = new PostRegistrationLoader();
        window.postRegLoader.init();
    });
} else {
    window.postRegLoader = new PostRegistrationLoader();
    window.postRegLoader.init();
}

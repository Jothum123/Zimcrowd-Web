// ZimCrowd API Client
// Handles all communication with the backend API

class ZimCrowdAPI {
    constructor() {
        // Dynamic API URL based on environment
        this.baseURL = window.location.hostname === 'localhost'
            ? 'http://localhost:3000/api'
            : 'https://zimcrowd-backend-7tjvgnsc9-jojola.vercel.app/api';

        console.log('ZimCrowdAPI initialized with baseURL:', this.baseURL);
        this.token = localStorage.getItem('authToken');
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    // Authentication methods
    async registerPhone(firstName, lastName, phone, password) {
        return this.request('/phone-auth/register-phone', {
            method: 'POST',
            body: JSON.stringify({ firstName, lastName, phone, password })
        });
    }

    async verifyPhoneSignup(tempToken, otp) {
        return this.request('/phone-auth/verify-phone-signup', {
            method: 'POST',
            body: JSON.stringify({ tempToken, otp })
        });
    }

    async passwordlessVerify(phone, otp) {
        return this.request('/phone-auth/passwordless-verify', {
            method: 'POST',
            body: JSON.stringify({ phone, otp })
        });
    }

    async passwordlessLogin(phone) {
        return this.request('/phone-auth/passwordless-login', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
    }

    // TOTP methods
    async setupTOTP() {
        return this.request('/phone-auth/setup-totp', {
            method: 'POST'
        });
    }

    async verifyTOTPSetup(tempKey, otp) {
        return this.request('/phone-auth/verify-totp-setup', {
            method: 'POST',
            body: JSON.stringify({ tempKey, otp })
        });
    }

    // Smart login - auto-detects authentication method
    async smartLogin(phone, otp, password = null) {
        const body = { phone, otp };
        if (password) body.password = password;

        return this.request('/phone-auth/smart-login', {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    async loginPhone(phone, password) {
        return this.request('/phone-auth/login-phone', {
            method: 'POST',
            body: JSON.stringify({ phone, password })
        });
    }

    // Profile methods
    async getProfile() {
        return this.request('/profile');
    }

    async updateProfile(profileData) {
        return this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async completeOnboarding() {
        return this.request('/profile/complete-onboarding', {
            method: 'PUT'
        });
    }

    async completeProfile() {
        return this.request('/profile/complete-profile', {
            method: 'PUT'
        });
    }

    // Loan methods
    async getLoans(page = 1, limit = 10, status = null) {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        return this.request(`/loans?${params}`);
    }

    async getLoanById(id) {
        return this.request(`/loans/${id}`);
    }

    async applyForLoan(loanData) {
        return this.request('/loans/apply', {
            method: 'POST',
            body: JSON.stringify(loanData)
        });
    }

    async payLoan(loanId, amount) {
        return this.request(`/loans/${loanId}/pay`, {
            method: 'PUT',
            body: JSON.stringify({ amount })
        });
    }

    async getLoanTypes() {
        return this.request('/loans/types');
    }

    // Investment methods
    async getInvestments(page = 1, limit = 10) {
        return this.request(`/investments?page=${page}&limit=${limit}`);
    }

    async getInvestmentPortfolio() {
        return this.request('/investments/portfolio');
    }

    async getInvestmentPerformance() {
        return this.request('/investments/performance');
    }

    async createInvestment(investmentData) {
        return this.request('/investments', {
            method: 'POST',
            body: JSON.stringify(investmentData)
        });
    }

    async getInvestmentTypes() {
        return this.request('/investments/types');
    }

    // Transaction methods
    async getTransactions(page = 1, limit = 10, type = null) {
        const params = new URLSearchParams({ page, limit });
        if (type) params.append('type', type);
        return this.request(`/transactions?${params}`);
    }

    async getTransactionSummary() {
        return this.request('/transactions/summary');
    }

    async getTransactionTypes() {
        return this.request('/transactions/types');
    }

    // Wallet methods
    async getWalletBalance() {
        return this.request('/wallet/balance');
    }

    async getWalletTransactions(page = 1, limit = 10) {
        return this.request(`/wallet/transactions?page=${page}&limit=${limit}`);
    }

    async depositFunds(amount, paymentMethod, reference) {
        return this.request('/wallet/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount, paymentMethod, reference })
        });
    }

    async withdrawFunds(amount, paymentMethod, reference) {
        return this.request('/wallet/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount, paymentMethod, reference })
        });
    }

    async getPaymentMethods() {
        return this.request('/wallet/payment-methods');
    }

    // Dashboard methods
    async getDashboardOverview() {
        return this.request('/dashboard/overview');
    }

    // Document methods
    async getDocuments() {
        return this.request('/documents');
    }

    async uploadDocument(formData) {
        return this.request('/documents/upload', {
            method: 'POST',
            headers: {}, // Let browser set content-type for FormData
            body: formData
        });
    }

    async downloadDocument(documentId) {
        return this.request(`/documents/${documentId}/download`);
    }

    async deleteDocument(documentId) {
        return this.request(`/documents/${documentId}`, {
            method: 'DELETE'
        });
    }

    async getDocumentTypes() {
        return this.request('/documents/types');
    }

    // Referral methods
    async getReferralCode() {
        return this.request('/referrals/code');
    }

    async getReferralStats() {
        return this.request('/referrals/stats');
    }

    async getReferralHistory(page = 1, limit = 10) {
        return this.request(`/referrals/history?page=${page}&limit=${limit}`);
    }

    async trackReferral(referralCode, newUserId) {
        return this.request('/referrals/track', {
            method: 'POST',
            body: JSON.stringify({ referralCode, newUserId })
        });
    }

    async requestPayout(amount) {
        return this.request('/referrals/payout', {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
    }

    async getReferralLeaderboard() {
        return this.request('/referrals/leaderboard');
    }

    async getReferralProgramInfo() {
        return this.request('/referrals/program-info');
    }

    // Admin methods (require admin role)
    async getAdminStats() {
        return this.request('/admin/stats');
    }

    async getAdminUsers(page = 1, limit = 10) {
        return this.request(`/admin/users?page=${page}&limit=${limit}`);
    }

    async getAdminUserById(userId) {
        return this.request(`/admin/users/${userId}`);
    }

    async updateUserStatus(userId, status) {
        return this.request(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }

    async getAdminLoans() {
        return this.request('/admin/loans');
    }

    async approveLoan(loanId, status, notes = null) {
        return this.request(`/admin/loans/${loanId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes })
        });
    }

    async getAdminTransactions(page = 1, limit = 10) {
        return this.request(`/admin/transactions?page=${page}&limit=${limit}`);
    }

    async getAdminReports() {
        return this.request('/admin/reports/overview');
    }

    // Utility methods
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }

    // Test all endpoints (for development)
    async testAllEndpoints() {
        return this.request('/test');
    }
}

// Create global instance
const zimCrowdAPI = new ZimCrowdAPI();

// Export for use in other files
window.ZimCrowdAPI = zimCrowdAPI;

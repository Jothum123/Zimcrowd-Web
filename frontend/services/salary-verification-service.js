/**
 * Salary Verification Service - Frontend API Integration
 * Connects frontend to production salary verification endpoints
 */

class SalaryVerificationService {
    constructor() {
        this.apiBase = this.getApiBase();
        this.authToken = this.getAuthToken();
    }

    /**
     * Get API base URL based on environment
     */
    getApiBase() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return process.env.REACT_APP_API_BASE || 'http://localhost:3000';
        }
        return process.env.REACT_APP_API_BASE || 'https://zimcrowd-api.onrender.com';
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('token') || 
               localStorage.getItem('access_token');
    }

    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const token = this.getAuthToken();

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (response.status === 401) {
                // Token expired - redirect to login
                localStorage.clear();
                window.location.href = 'login.html';
                throw new Error('Authentication expired');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return data;
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            throw error;
        }
    }

    /**
     * Get current salary verification status
     */
    async getSalaryStatus() {
        try {
            const response = await this.makeRequest('/api/salary-verification/status');
            console.log('💰 Salary status:', response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to get salary status:', error);
            throw error;
        }
    }

    /**
     * Validate salary for loan approval
     */
    async validateSalary() {
        try {
            const response = await this.makeRequest('/api/salary-verification/validate', {
                method: 'POST'
            });
            console.log('✅ Salary validation result:', response.data);
            return response.data;
        } catch (error) {
            console.error('Salary validation failed:', error);
            throw error;
        }
    }

    /**
     * Calculate DTNI limit using verified salary
     */
    async calculateDTNI(existingDebt = 0) {
        try {
            const response = await this.makeRequest('/api/salary-verification/calculate-dtni', {
                method: 'POST',
                body: JSON.stringify({ existing_debt: existingDebt })
            });
            console.log('📊 DTNI calculation:', response.data);
            return response.data;
        } catch (error) {
            console.error('DTNI calculation failed:', error);
            throw error;
        }
    }

    /**
     * Re-verify salary (rate limited)
     */
    async reverifySalary(netSalary, payslipFileId = null) {
        try {
            const response = await this.makeRequest('/api/salary-verification/reverify', {
                method: 'POST',
                body: JSON.stringify({ 
                    net_salary: netSalary,
                    payslip_file_id: payslipFileId 
                })
            });
            console.log('🔄 Salary re-verification completed:', response.data);
            return response.data;
        } catch (error) {
            console.error('Salary re-verification failed:', error);
            throw error;
        }
    }

    /**
     * Apply for loan with salary validation
     */
    async applyForLoan(loanAmount, loanTerm, purpose) {
        try {
            const response = await this.makeRequest('/api/loan/apply', {
                method: 'POST',
                body: JSON.stringify({
                    loan_amount: loanAmount,
                    loan_term: loanTerm,
                    purpose: purpose
                })
            });
            console.log('🎯 Loan application submitted:', response.data);
            return response.data;
        } catch (error) {
            console.error('Loan application failed:', error);
            throw error;
        }
    }

    /**
     * Update profile with salary verification data
     */
    async updateProfileWithSalaryVerification(profileData) {
        try {
            const response = await this.makeRequest('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
            console.log('📝 Profile updated with salary verification:', response.data);
            return response.data;
        } catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }

    /**
     * Check API health
     */
    async checkHealth() {
        try {
            const response = await this.makeRequest('/api/health');
            console.log('💚 API Health:', response);
            return response;
        } catch (error) {
            console.error('API health check failed:', error);
            throw error;
        }
    }

    /**
     * Format salary amount for display
     */
    formatSalary(amount) {
        if (!amount || amount === 0) return '$0';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Calculate salary age in days
     */
    calculateSalaryAge(salaryVerifiedAt) {
        if (!salaryVerifiedAt) return null;
        const verifiedDate = new Date(salaryVerifiedAt);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - verifiedDate);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Get salary freshness status with styling
     */
    getSalaryFreshnessStatus(salaryVerifiedAt) {
        const daysOld = this.calculateSalaryAge(salaryVerifiedAt);
        
        if (daysOld === null) {
            return {
                status: 'NOT_VERIFIED',
                message: 'No salary verification',
                color: '#dc3545', // red
                icon: '❌',
                needsReverification: true
            };
        }

        if (daysOld <= 30) {
            return {
                status: 'FRESH',
                message: `Verified ${daysOld} days ago`,
                color: '#28a745', // green
                icon: '✅',
                needsReverification: false
            };
        }

        if (daysOld <= 90) {
            return {
                status: 'OK',
                message: `Verified ${daysOld} days ago`,
                color: '#ffc107', // yellow
                icon: '⚠️',
                needsReverification: false
            };
        }

        return {
            status: 'STALE',
            message: `Verified ${daysOld} days ago - re-verification required`,
            color: '#dc3545', // red
            icon: '❌',
            needsReverification: true
        };
    }

    /**
     * Display validation error with user-friendly message
     */
    displayValidationError(error) {
        const errorMessages = {
            'PROFILE_NOT_FOUND': 'User profile not found. Please complete your profile first.',
            'SALARY_NOT_VERIFIED': 'Salary verification required. Please upload your payslip and enter your net salary.',
            'SALARY_STALE': 'Your salary verification is expired. Please re-verify your salary.',
            'GOVERNMENT_SALARY_TOO_LOW': 'Government employees must have a minimum net salary of $120.',
            'MISSING_EC_NUMBER': 'EC number required for government employees. Please add your EC number.',
            'LOAN_AMOUNT_EXCEEDS_DTNI': 'Loan amount exceeds your affordable limit based on verified salary.',
            'RATE_LIMIT_EXCEEDED': 'Too many attempts. Please try again later.',
            'INVALID_SALARY': 'Please enter a valid salary amount.',
            'AUTHENTICATION_ERROR': 'Please log in again to continue.'
        };

        return errorMessages[error] || error || 'An error occurred. Please try again.';
    }
}

// Create singleton instance
const salaryVerificationService = new SalaryVerificationService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SalaryVerificationService;
} else {
    window.SalaryVerificationService = SalaryVerificationService;
    window.salaryVerificationService = salaryVerificationService;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('💰 Salary Verification Service initialized');
        
        // Check API health on load
        salaryVerificationService.checkHealth()
            .then(() => {
                console.log('✅ Salary Verification API is healthy');
            })
            .catch(error => {
                console.warn('⚠️ Salary Verification API health check failed:', error);
            });
    });
}

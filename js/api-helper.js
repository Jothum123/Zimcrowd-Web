// ZimCrowd API Helper Functions
// Utility functions to help with API calls and URL management

class APIHelper {
    static getApiUrl() {
        return window.API_CONFIG ? window.API_CONFIG.BASE_URL : 'http://localhost:3000';
    }

    static getEndpoint(key) {
        return window.API_CONFIG ? window.API_CONFIG.getEndpoint(key) : null;
    }

    // Helper function to make authenticated requests
    static async makeRequest(url, options = {}) {
        const token = localStorage.getItem('authToken');
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Specific API call helpers
    static async loginWithEmail(email, password) {
        const url = this.getEndpoint('EMAIL_LOGIN');
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    static async loginWithPhone(phone, password) {
        const url = this.getEndpoint('PHONE_LOGIN');
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({ phone, password })
        });
    }

    static async registerWithEmail(firstName, lastName, email, password) {
        const url = this.getEndpoint('EMAIL_REGISTER');
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({ firstName, lastName, email, password })
        });
    }

    static async registerWithPhone(firstName, lastName, phone, password) {
        const url = this.getEndpoint('PHONE_REGISTER');
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({ firstName, lastName, phone, password })
        });
    }

    static async verifyOTP(contact, otp, type = 'email') {
        const url = type === 'email' ? this.getEndpoint('EMAIL_VERIFY') : this.getEndpoint('PHONE_VERIFY');
        const body = type === 'email' 
            ? { email: contact, otp }
            : { phone: contact, otp };
            
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async resendOTP(contact, type = 'email') {
        const url = type === 'email' ? this.getEndpoint('EMAIL_RESEND') : this.getEndpoint('PHONE_RESEND');
        const body = type === 'email' 
            ? { email: contact }
            : { phone: contact };
            
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async requestPasswordReset(contact, type = 'email') {
        const url = type === 'email' ? this.getEndpoint('EMAIL_RESET_REQUEST') : this.getEndpoint('PHONE_RESET_REQUEST');
        const body = type === 'email' 
            ? { email: contact }
            : { phone: contact };
            
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async verifyPasswordResetOTP(contact, otp, type = 'email') {
        const url = type === 'email' ? this.getEndpoint('EMAIL_RESET_VERIFY') : this.getEndpoint('PHONE_RESET_VERIFY');
        const body = type === 'email' 
            ? { email: contact, otp }
            : { phone: contact, otp };
            
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async resetPassword(contact, newPassword, type = 'email') {
        const url = type === 'email' ? this.getEndpoint('EMAIL_RESET_PASSWORD') : this.getEndpoint('PHONE_RESET_PASSWORD');
        const body = type === 'email' 
            ? { email: contact, newPassword }
            : { phone: contact, newPassword };
            
        return this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    // Social auth helpers
    static getGoogleAuthUrl(mode = 'login') {
        return `${this.getEndpoint('GOOGLE_AUTH')}?mode=${mode}`;
    }

    static getFacebookAuthUrl(mode = 'login') {
        return `${this.getEndpoint('FACEBOOK_AUTH')}?mode=${mode}`;
    }

    // Profile helpers
    static async getProfile() {
        return this.makeRequest(this.getEndpoint('PROFILE_GET'));
    }

    static async updateProfile(profileData) {
        return this.makeRequest(this.getEndpoint('PROFILE_UPDATE'), {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Dashboard helpers
    static async getDashboardData() {
        return this.makeRequest(this.getEndpoint('DASHBOARD_DATA'));
    }
}

// Make it globally available
window.APIHelper = APIHelper;

console.log('🔧 API Helper loaded');

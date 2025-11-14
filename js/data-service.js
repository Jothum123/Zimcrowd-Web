/**
 * Data Service - Unified interface for both Mock and Real API data
 * Automatically switches between mock data and real API based on configuration
 */

const DataService = {
    // Configuration
    config: {
        useMockData: false, // Set to true to use mock data, false for real API
        apiBaseUrl: 'https://zimcrowd-backend.vercel.app/api',
        timeout: 10000 // 10 seconds
    },

    // Initialize the service
    init(options = {}) {
        this.config = { ...this.config, ...options };
        console.log('DataService initialized:', this.config.useMockData ? 'Using MOCK data' : 'Using REAL API');
    },

    // Enable mock data mode
    enableMockData() {
        this.config.useMockData = true;
        console.log('✅ Mock data mode enabled');
    },

    // Disable mock data mode (use real API)
    disableMockData() {
        this.config.useMockData = false;
        console.log('✅ Real API mode enabled');
    },

    // Helper to make API calls with timeout
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeout);
            return response;
        } catch (error) {
            clearTimeout(timeout);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout');
            }
            throw error;
        }
    },

    // Get user profile
    async getProfile() {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getProfile());
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch profile, falling back to mock data:', error);
            return window.MockDataService.getProfile();
        }
    },

    // Get wallet balance
    async getWallet() {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getWallet());
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/wallet`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch wallet, falling back to mock data:', error);
            return window.MockDataService.getWallet();
        }
    },

    // Get loans
    async getLoans(page = 1, limit = 10) {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getLoans(page, limit));
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await this.fetchWithTimeout(
                `${this.config.apiBaseUrl}/loans?page=${page}&limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch loans, falling back to mock data:', error);
            return window.MockDataService.getLoans(page, limit);
        }
    },

    // Get investments
    async getInvestments(page = 1, limit = 10) {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getInvestments(page, limit));
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await this.fetchWithTimeout(
                `${this.config.apiBaseUrl}/investments?page=${page}&limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch investments, falling back to mock data:', error);
            return window.MockDataService.getInvestments(page, limit);
        }
    },

    // Get transactions
    async getTransactions(page = 1, limit = 10) {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getTransactions(page, limit));
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await this.fetchWithTimeout(
                `${this.config.apiBaseUrl}/transactions?page=${page}&limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch transactions, falling back to mock data:', error);
            return window.MockDataService.getTransactions(page, limit);
        }
    },

    // Get statistics
    async getStatistics() {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getStatistics());
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await this.fetchWithTimeout(`${this.config.apiBaseUrl}/dashboard/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch statistics, falling back to mock data:', error);
            return window.MockDataService.getStatistics();
        }
    },

    // Get notifications
    async getNotifications(unreadOnly = false) {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getNotifications(unreadOnly));
        }

        try {
            const token = localStorage.getItem('authToken');
            const url = unreadOnly 
                ? `${this.config.apiBaseUrl}/notifications?unread=true`
                : `${this.config.apiBaseUrl}/notifications`;
            
            const response = await this.fetchWithTimeout(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch notifications, falling back to mock data:', error);
            return window.MockDataService.getNotifications(unreadOnly);
        }
    },

    // Get loan opportunities
    async getLoanOpportunities(page = 1, limit = 10) {
        if (this.config.useMockData) {
            return Promise.resolve(window.MockDataService.getLoanOpportunities(page, limit));
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await this.fetchWithTimeout(
                `${this.config.apiBaseUrl}/loans/opportunities?page=${page}&limit=${limit}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch loan opportunities, falling back to mock data:', error);
            return window.MockDataService.getLoanOpportunities(page, limit);
        }
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.DataService = DataService;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataService;
}

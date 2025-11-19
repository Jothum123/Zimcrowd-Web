/**
 * ZimCrowd Dashboard Data Layer
 * Handles all API calls and data management
 */

const DashboardData = {
    // Fetch dashboard stats
    async fetchStats() {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/dashboard/stats`, {
                headers: window.DashboardCore.API_CONFIG.HEADERS
            });
            
            if (!response.ok) throw new Error('Failed to fetch stats');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    },

    // Fetch wallet data
    async fetchWallet() {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/wallet`, {
                headers: window.DashboardCore.API_CONFIG.HEADERS
            });
            
            if (!response.ok) throw new Error('Failed to fetch wallet');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching wallet:', error);
            throw error;
        }
    },

    // Fetch loans
    async fetchLoans(page = 1, limit = 10) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/loans?page=${page}&limit=${limit}`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch loans');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching loans:', error);
            throw error;
        }
    },

    // Fetch investments
    async fetchInvestments(page = 1, limit = 10) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/investments?page=${page}&limit=${limit}`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch investments');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching investments:', error);
            throw error;
        }
    },

    // Fetch transactions
    async fetchTransactions(page = 1, limit = 20) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/transactions?page=${page}&limit=${limit}`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch transactions');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        }
    },

    // Fetch referrals
    async fetchReferrals() {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/referrals`, {
                headers: window.DashboardCore.API_CONFIG.HEADERS
            });
            
            if (!response.ok) throw new Error('Failed to fetch referrals');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching referrals:', error);
            throw error;
        }
    },

    // Fetch referral code
    async fetchReferralCode() {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/referrals/code`, {
                headers: window.DashboardCore.API_CONFIG.HEADERS
            });
            
            if (!response.ok) throw new Error('Failed to fetch referral code');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching referral code:', error);
            throw error;
        }
    },

    // Fetch user profile
    async fetchProfile() {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/profile`, {
                headers: window.DashboardCore.API_CONFIG.HEADERS
            });
            
            if (!response.ok) throw new Error('Failed to fetch profile');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    },

    // Update profile
    async updateProfile(data) {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/profile`, {
                method: 'PUT',
                headers: window.DashboardCore.API_CONFIG.HEADERS,
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error('Failed to update profile');
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    },

    // Request loan
    async requestLoan(loanData) {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/loans/request`, {
                method: 'POST',
                headers: window.DashboardCore.API_CONFIG.HEADERS,
                body: JSON.stringify(loanData)
            });
            
            if (!response.ok) throw new Error('Failed to request loan');
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error requesting loan:', error);
            throw error;
        }
    },

    // Repay loan
    async repayLoan(loanId, amount) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/loans/${loanId}/repay`,
                {
                    method: 'POST',
                    headers: window.DashboardCore.API_CONFIG.HEADERS,
                    body: JSON.stringify({ amount })
                }
            );
            
            if (!response.ok) throw new Error('Failed to repay loan');
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error repaying loan:', error);
            throw error;
        }
    },

    // Deposit funds
    async depositFunds(depositData) {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/wallet/deposit`, {
                method: 'POST',
                headers: window.DashboardCore.API_CONFIG.HEADERS,
                body: JSON.stringify(depositData)
            });
            
            if (!response.ok) throw new Error('Failed to deposit funds');
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error depositing funds:', error);
            throw error;
        }
    },

    // Withdraw funds
    async withdrawFunds(withdrawData) {
        try {
            const response = await fetch(`${window.DashboardCore.API_CONFIG.BASE_URL}/wallet/withdraw`, {
                method: 'POST',
                headers: window.DashboardCore.API_CONFIG.HEADERS,
                body: JSON.stringify(withdrawData)
            });
            
            if (!response.ok) throw new Error('Failed to withdraw funds');
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error withdrawing funds:', error);
            throw error;
        }
    },

    // Sell investment
    async sellInvestment(investmentId, sellData) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/investments/${investmentId}/sell`,
                {
                    method: 'POST',
                    headers: window.DashboardCore.API_CONFIG.HEADERS,
                    body: JSON.stringify(sellData)
                }
            );
            
            if (!response.ok) throw new Error('Failed to sell investment');
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error selling investment:', error);
            throw error;
        }
    },

    // Fetch investment performance
    async fetchInvestmentPerformance() {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/investments/performance`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch performance');
            
            const result = await response.json();
            return result.data;
        } catch (error) {
            console.error('Error fetching performance:', error);
            throw error;
        }
    },

    // Export transactions
    async exportTransactions(format) {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/transactions/export?format=${format}`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to export transactions');
            
            const blob = await response.blob();
            return blob;
        } catch (error) {
            console.error('Error exporting transactions:', error);
            throw error;
        }
    },

    // Analytics API calls
    async getPortfolioAnalytics(timeframe = '30d') {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/analytics/portfolio?timeframe=${timeframe}`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch portfolio analytics');
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching portfolio analytics:', error);
            throw error;
        }
    },

    async getTransactionAnalytics(timeframe = '30d') {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/analytics/transactions?timeframe=${timeframe}`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch transaction analytics');
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching transaction analytics:', error);
            throw error;
        }
    },

    async getFinancialInsights() {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/analytics/insights`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch financial insights');
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching financial insights:', error);
            throw error;
        }
    },

    async getFinancialHealthScore() {
        try {
            const response = await fetch(
                `${window.DashboardCore.API_CONFIG.BASE_URL}/analytics/health-score`,
                { headers: window.DashboardCore.API_CONFIG.HEADERS }
            );
            
            if (!response.ok) throw new Error('Failed to fetch health score');
            
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error('Error fetching health score:', error);
            throw error;
        }
    }
};

// Export
window.DashboardData = DashboardData;

console.log('✅ Dashboard Data layer loaded');

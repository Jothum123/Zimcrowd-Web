/**
 * Dashboard Data Loader
 * Connects the dashboard UI to the backend API
 */

const DashboardLoader = {
    apiBase: 'https://zimcrowd-backend.vercel.app/api',
    
    /**
     * Initialize dashboard and load all data
     */
    async init() {
        console.log('🚀 Initializing Dashboard Loader...');
        
        try {
            // Check authentication
            const token = this.getAuthToken();
            if (!token) {
                console.error('❌ No auth token found');
                window.location.href = '/login.html';
                return;
            }

            // Load dashboard overview data
            await this.loadDashboardOverview();
            
            console.log('✅ Dashboard loaded successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization error:', error);
            this.showError('Failed to load dashboard. Please refresh the page.');
        }
    },

    /**
     * Get authentication token from localStorage
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('token') ||
               localStorage.getItem('access_token');
    },

    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (response.status === 401) {
            console.error('❌ Unauthorized - redirecting to login');
            localStorage.clear();
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    },

    /**
     * Load complete dashboard overview
     */
    async loadDashboardOverview() {
        try {
            console.log('📊 Loading dashboard overview...');
            
            const response = await this.apiRequest('/dashboard/');
            
            if (response.success && response.data) {
                const data = response.data;
                
                // Update profile
                this.updateProfile(data.profile);
                
                // Update wallet
                this.updateWallet(data.wallet);
                
                // Update statistics
                this.updateStatistics(data.stats, data.summary);
                
                // Update recent activity
                this.updateRecentTransactions(data.recent.transactions);
                this.updateRecentLoans(data.recent.loans);
                this.updateRecentInvestments(data.recent.investments);
                
                // Update notifications
                this.updateNotifications(data.recent.notifications);
                
                console.log('✅ Dashboard overview loaded');
            }
        } catch (error) {
            console.error('❌ Error loading dashboard overview:', error);
            // Load individual sections as fallback
            await this.loadFallbackData();
        }
    },

    /**
     * Load data from individual endpoints as fallback
     */
    async loadFallbackData() {
        console.log('⚠️ Using fallback data loading...');
        
        try {
            const [profile, wallet, stats] = await Promise.all([
                this.apiRequest('/profile').catch(() => null),
                this.apiRequest('/dashboard/wallet').catch(() => null),
                this.apiRequest('/dashboard/stats').catch(() => null)
            ]);

            if (profile?.success) this.updateProfile(profile.data);
            if (wallet?.success) this.updateWallet(wallet.data);
            if (stats?.success) this.updateStatistics(stats.data, {});
        } catch (error) {
            console.error('❌ Fallback loading failed:', error);
        }
    },

    /**
     * Update user profile display
     */
    updateProfile(profile) {
        if (!profile) return;
        
        console.log('👤 Updating profile:', profile);
        
        // Update user name
        const userName = document.getElementById('userName');
        if (userName) {
            const displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                              profile.email || 'User';
            userName.textContent = displayName;
        }

        // Update user email
        const userEmail = document.getElementById('userEmail');
        if (userEmail && profile.email) {
            userEmail.textContent = profile.email;
        }

        // Update user avatar
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            const initials = this.getInitials(profile.first_name, profile.last_name, profile.email);
            if (profile.avatar_url) {
                userAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                userAvatar.textContent = initials;
            }
        }

        // Also update nav-avatar if exists
        const navAvatar = document.getElementById('nav-avatar');
        if (navAvatar) {
            const initials = this.getInitials(profile.first_name, profile.last_name, profile.email);
            if (profile.avatar_url) {
                navAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                navAvatar.textContent = initials;
            }
        }
    },

    /**
     * Get user initials
     */
    getInitials(firstName, lastName, email) {
        if (firstName && lastName) {
            return `${firstName[0]}${lastName[0]}`.toUpperCase();
        }
        if (firstName) {
            return firstName[0].toUpperCase();
        }
        if (email) {
            return email[0].toUpperCase();
        }
        return 'U';
    },

    /**
     * Update wallet display
     */
    updateWallet(wallet) {
        if (!wallet) return;
        
        console.log('💰 Updating wallet:', wallet);
        
        // Main wallet balance
        const walletBalance = document.getElementById('walletBalance');
        if (walletBalance) {
            walletBalance.textContent = this.formatCurrency(wallet.balance || 0);
        }

        // Available balance
        const walletAvailableBalance = document.getElementById('walletAvailableBalance');
        if (walletAvailableBalance) {
            walletAvailableBalance.textContent = this.formatCurrency(wallet.available_balance || wallet.balance || 0);
        }

        // Pending balance
        const walletPending = document.getElementById('walletPending');
        if (walletPending) {
            walletPending.textContent = this.formatCurrency(wallet.pending_balance || 0);
        }

        // Total transactions amount
        const walletTotalTransactions = document.getElementById('walletTotalTransactions');
        if (walletTotalTransactions) {
            walletTotalTransactions.textContent = this.formatCurrency(wallet.total_transactions || 0);
        }

        // This month transactions
        const walletThisMonth = document.getElementById('walletThisMonth');
        if (walletThisMonth) {
            walletThisMonth.textContent = this.formatCurrency(wallet.this_month || 0);
        }
    },

    /**
     * Update statistics display
     */
    updateStatistics(stats, summary) {
        if (!stats && !summary) return;
        
        console.log('📈 Updating statistics:', { stats, summary });
        
        // Active loans count
        const activeLoans = document.getElementById('activeLoans');
        if (activeLoans) {
            activeLoans.textContent = summary?.loans_count || stats?.total_loans || 0;
        }

        const activeLoansCount = document.getElementById('activeLoansCount');
        if (activeLoansCount) {
            const count = summary?.loans_count || stats?.total_loans || 0;
            activeLoansCount.textContent = `${count} Active`;
        }

        // Total loan amount
        const totalLoanAmount = document.getElementById('totalLoanAmount');
        if (totalLoanAmount) {
            totalLoanAmount.textContent = this.formatCurrency(stats?.total_loan_amount || 0);
        }

        // Loan amount display
        const loanAmount = document.getElementById('loanAmount');
        if (loanAmount) {
            loanAmount.textContent = `${this.formatCurrency(stats?.total_loan_amount || 0)} total borrowed`;
        }

        // Total investments
        const totalInvestments = document.getElementById('totalInvestments');
        if (totalInvestments) {
            totalInvestments.textContent = summary?.investments_count || stats?.total_investments || 0;
        }

        // Total returns
        const totalReturns = document.getElementById('totalReturns');
        if (totalReturns) {
            totalReturns.textContent = this.formatCurrency(stats?.total_returns || 0);
        }

        // Portfolio value
        const portfolioValue = document.getElementById('portfolioValue');
        if (portfolioValue) {
            portfolioValue.textContent = this.formatCurrency(stats?.portfolio_value || 0);
        }

        // Update tab counts
        const activeLoansTabCount = document.getElementById('activeLoansTabCount');
        if (activeLoansTabCount) {
            activeLoansTabCount.textContent = summary?.loans_count || 0;
        }
    },

    /**
     * Update recent transactions
     */
    updateRecentTransactions(transactions) {
        if (!transactions || transactions.length === 0) return;
        
        console.log('💳 Updating recent transactions:', transactions.length);
        
        const container = document.getElementById('walletRecentTransactions');
        if (!container) return;

        container.innerHTML = transactions.slice(0, 5).map(tx => `
            <div class="loan-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 48px; height: 48px; background: ${this.getTransactionColor(tx.type)}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${this.getTransactionIcon(tx.type)}" style="color: white;"></i>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 5px;">${tx.description || tx.type}</h4>
                            <p style="color: #94a3b8; font-size: 14px;">${this.formatDate(tx.created_at)}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <h4 style="color: ${tx.type === 'credit' ? '#38e77b' : '#dc2626'}; margin-bottom: 5px;">
                            ${tx.type === 'credit' ? '+' : '-'}${this.formatCurrency(tx.amount)}
                        </h4>
                        <span class="status-badge ${tx.status}">${tx.status}</span>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Update recent loans
     */
    updateRecentLoans(loans) {
        if (!loans || loans.length === 0) return;
        
        console.log('📋 Updating recent loans:', loans.length);
        
        // You can update specific loan containers here
        // For now, just log the data
    },

    /**
     * Update recent investments
     */
    updateRecentInvestments(investments) {
        if (!investments || investments.length === 0) return;
        
        console.log('📊 Updating recent investments:', investments.length);
        
        // You can update specific investment containers here
    },

    /**
     * Update notifications
     */
    updateNotifications(notifications) {
        if (!notifications) return;
        
        console.log('🔔 Updating notifications:', notifications.length);
        
        const notificationCount = document.getElementById('notificationCount');
        if (notificationCount) {
            const unreadCount = notifications.filter(n => !n.read).length;
            notificationCount.textContent = unreadCount;
            notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';
        }
    },

    /**
     * Helper: Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount || 0);
    },

    /**
     * Helper: Format date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    },

    /**
     * Helper: Get transaction color
     */
    getTransactionColor(type) {
        const colors = {
            'credit': 'rgba(56, 231, 123, 0.2)',
            'debit': 'rgba(220, 38, 38, 0.2)',
            'deposit': 'rgba(59, 130, 246, 0.2)',
            'withdrawal': 'rgba(251, 146, 60, 0.2)',
            'investment': 'rgba(168, 85, 247, 0.2)',
            'loan': 'rgba(245, 158, 11, 0.2)'
        };
        return colors[type] || 'rgba(100, 100, 100, 0.2)';
    },

    /**
     * Helper: Get transaction icon
     */
    getTransactionIcon(type) {
        const icons = {
            'credit': 'fa-arrow-down',
            'debit': 'fa-arrow-up',
            'deposit': 'fa-plus',
            'withdrawal': 'fa-minus',
            'investment': 'fa-chart-line',
            'loan': 'fa-hand-holding-usd'
        };
        return icons[type] || 'fa-exchange-alt';
    },

    /**
     * Show error message
     */
    showError(message) {
        console.error('❌', message);
        // You can implement a toast notification here
        alert(message);
    }
};

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DashboardLoader.init();
    });
} else {
    DashboardLoader.init();
}

// Export for use in other scripts
window.DashboardLoader = DashboardLoader;

/**
 * Production Data Loader
 * Replaces all static/mock data with real API calls
 * Handles all dashboard sections with proper error handling and loading states
 */

const ProductionDataLoader = {
    apiBase: window.API_CONFIG?.baseURL || 'https://zimcrowd-backend.vercel.app/api',
    
    /**
     * Initialize all dashboard sections with real data
     */
    async init() {
        console.log('🚀 Initializing Production Data Loader...');
        
        try {
            // Load all sections in parallel for better performance
            await Promise.allSettled([
                this.loadOverviewData(),
                this.loadLoansData(),
                this.loadInvestmentsData(),
                this.loadTransactionsData(),
                this.loadReferralsData(),
                this.loadAnalyticsData(),
                this.loadSettingsData()
            ]);
            
            console.log('✅ All production data loaded');
        } catch (error) {
            console.error('❌ Error loading production data:', error);
        }
    },

    /**
     * Get auth token from localStorage or API
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('token') ||
               localStorage.getItem('access_token') ||
               JSON.parse(localStorage.getItem('authData') || '{}').access_token;
    },

    /**
     * Make authenticated API request
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

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `API Error: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    },

    /**
     * Load Dashboard Overview Data
     */
    async loadOverviewData() {
        try {
            console.log('📊 Loading overview data...');
            
            const data = await this.apiRequest('/dashboard/');
            
            if (data.success && data.data) {
                // Update wallet balance
                this.updateWalletUI(data.data.wallet);
                
                // Update statistics
                this.updateStatsUI(data.data.stats);
                
                // Update recent activity
                this.updateRecentActivityUI(data.data.recent);
            }
        } catch (error) {
            console.error('Failed to load overview:', error);
            this.showFallbackData('overview');
        }
    },

    /**
     * Load My Loans Data
     */
    async loadLoansData() {
        try {
            console.log('💰 Loading loans data...');
            
            const response = await this.apiRequest('/loans/my-loans');
            
            if (response.success && response.data) {
                this.updateLoansUI(response.data);
            }
        } catch (error) {
            console.error('Failed to load loans:', error);
            // Try to load from dashboard endpoint as fallback
            try {
                const dashData = await this.apiRequest('/dashboard/');
                if (dashData.success && dashData.data?.loans) {
                    this.updateLoansUI(dashData.data.loans);
                }
            } catch (fallbackError) {
                this.showFallbackData('loans');
            }
        }
    },

    /**
     * Load Investments Data
     */
    async loadInvestmentsData() {
        try {
            console.log('📈 Loading investments data...');
            
            const [myInvestments, opportunities] = await Promise.all([
                this.apiRequest('/investments/my-investments'),
                this.apiRequest('/investments/opportunities')
            ]);
            
            if (myInvestments.success) {
                this.updateMyInvestmentsUI(myInvestments.data);
            }
            
            if (opportunities.success) {
                this.updateInvestmentOpportunitiesUI(opportunities.data);
            }
        } catch (error) {
            console.error('Failed to load investments:', error);
            this.showFallbackData('investments');
        }
    },

    /**
     * Load Transactions Data
     */
    async loadTransactionsData() {
        try {
            console.log('💳 Loading transactions data...');
            
            const response = await this.apiRequest('/transactions?page=1&limit=50');
            
            if (response.success && response.data) {
                this.updateTransactionsUI(response.data);
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.showFallbackData('transactions');
        }
    },

    /**
     * Load Referrals Data
     */
    async loadReferralsData() {
        try {
            console.log('🎁 Loading referrals data...');
            
            const [code, stats, referrals] = await Promise.all([
                this.apiRequest('/referrals/code'),
                this.apiRequest('/referrals/stats'),
                this.apiRequest('/referrals/my-referrals')
            ]);
            
            if (code.success && code.data) {
                // Update referral link display
                const linkElement = document.getElementById('referralLinkDisplay');
                if (linkElement) {
                    linkElement.textContent = code.data.share_url;
                    linkElement.href = code.data.share_url;
                }
                
                // Update QR code
                const qrContainer = document.getElementById('referralQRCode');
                if (qrContainer && code.data.qr_code_url) {
                    qrContainer.innerHTML = `<img src="${code.data.qr_code_url}" alt="Referral QR Code" style="width: 100%; height: 100%; border-radius: 12px;">`;
                }
                
                // Store for copy function
                if (typeof window !== 'undefined') {
                    window.currentReferralLink = code.data.share_url;
                    window.currentReferralCode = code.data.referral_code;
                }
                
                console.log('✅ Referral link updated:', code.data.share_url);
            }
            
            if (stats.success && stats.data) {
                // Update stats if elements exist
                const totalRef = document.getElementById('refTotalReferrals');
                const totalEarn = document.getElementById('refTotalEarnings');
                const activeLoans = document.getElementById('refActiveLoans');
                
                if (totalRef) totalRef.textContent = stats.data.total_referrals || 0;
                if (totalEarn) totalEarn.textContent = `$${parseFloat(stats.data.total_earnings || 0).toLocaleString()}`;
                if (activeLoans) activeLoans.textContent = stats.data.active_loans_from_referrals || 0;
            }
            
            if (referrals.success && referrals.data) {
                // Update referral list if function exists
                if (typeof window.updateReferralHistory === 'function') {
                    window.updateReferralHistory(referrals.data);
                }
            }
        } catch (error) {
            console.error('Failed to load referrals:', error);
            this.showFallbackData('referrals');
        }
    },

    /**
     * Load Analytics Data
     */
    async loadAnalyticsData() {
        try {
            console.log('📊 Loading analytics data...');
            
            const [portfolio, distribution, activity] = await Promise.all([
                this.apiRequest('/analytics/portfolio-history'),
                this.apiRequest('/analytics/loan-distribution'),
                this.apiRequest('/analytics/monthly-activity')
            ]);
            
            if (portfolio.success) {
                this.updatePortfolioChartUI(portfolio.data);
            }
            
            if (distribution.success) {
                this.updateLoanDistributionChartUI(distribution.data);
            }
            
            if (activity.success) {
                this.updateMonthlyActivityChartUI(activity.data);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
            this.showFallbackData('analytics');
        }
    },

    /**
     * Load Settings Data
     */
    async loadSettingsData() {
        try {
            console.log('⚙️ Loading settings data...');
            
            const [profile, settings, documents, loginActivity] = await Promise.all([
                this.apiRequest('/profile'),
                this.apiRequest('/settings'),
                this.apiRequest('/documents'),
                this.apiRequest('/security/login-activity')
            ]);
            
            if (profile.success) {
                this.updateProfileSettingsUI(profile.data);
            }
            
            if (settings.success) {
                this.updateUserSettingsUI(settings.data);
            }
            
            if (documents.success) {
                this.updateDocumentsUI(documents.data);
            }
            
            if (loginActivity.success) {
                this.updateLoginActivityUI(loginActivity.data);
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showFallbackData('settings');
        }
    },

    // ========== UI UPDATE METHODS ==========

    /**
     * Update Wallet UI
     */
    updateWalletUI(walletData) {
        const balanceEl = document.getElementById('wallet-balance');
        const availableEl = document.getElementById('available-balance');
        const pendingEl = document.getElementById('pending-balance');
        
        if (balanceEl) balanceEl.textContent = `$${(walletData.balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (availableEl) availableEl.textContent = `$${(walletData.available_balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (pendingEl) pendingEl.textContent = `$${(walletData.pending_balance || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        
        console.log('✅ Wallet UI updated');
    },

    /**
     * Update Statistics UI
     */
    updateStatsUI(stats) {
        // Total Invested
        const totalInvestedEl = document.getElementById('total-invested');
        if (totalInvestedEl) {
            totalInvestedEl.textContent = `$${(stats.total_invested || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        }
        
        // Active Loans
        const activeLoansEl = document.getElementById('active-loans');
        if (activeLoansEl) {
            activeLoansEl.textContent = stats.active_loans || 0;
        }
        
        // Total Returns
        const totalReturnsEl = document.getElementById('total-returns');
        if (totalReturnsEl) {
            totalReturnsEl.textContent = `$${(stats.total_returns || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        }
        
        // Portfolio Value
        const portfolioValueEl = document.getElementById('portfolio-value');
        if (portfolioValueEl) {
            portfolioValueEl.textContent = `$${(stats.portfolio_value || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        }
        
        console.log('✅ Stats UI updated');
    },

    /**
     * Update Recent Activity UI
     */
    updateRecentActivityUI(recentData) {
        if (recentData.transactions) {
            this.updateRecentTransactionsUI(recentData.transactions);
        }
        
        if (recentData.loans) {
            this.updateRecentLoansUI(recentData.loans);
        }
        
        if (recentData.investments) {
            this.updateRecentInvestmentsUI(recentData.investments);
        }
    },

    /**
     * Update Recent Transactions UI
     */
    updateRecentTransactionsUI(transactions) {
        const container = document.getElementById('recent-transactions-list');
        if (!container || !transactions || transactions.length === 0) return;
        
        container.innerHTML = transactions.map(tx => `
            <div class="transaction-item">
                <div class="transaction-icon ${tx.type}">
                    <i class="fas fa-${this.getTransactionIcon(tx.type)}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${tx.description || tx.type}</h4>
                    <p>${new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div class="transaction-amount ${tx.type}">
                    ${tx.type === 'deposit' || tx.type === 'credit' ? '+' : '-'}$${Math.abs(tx.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </div>
            </div>
        `).join('');
        
        console.log('✅ Recent transactions UI updated');
    },

    /**
     * Update Loans UI
     */
    updateLoansUI(loans) {
        const container = document.getElementById('loans-container');
        if (!container || !loans || loans.length === 0) {
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-hand-holding-usd" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px;"></i>
                        <h3>No Active Loans</h3>
                        <p>You don't have any active loans yet.</p>
                        <button class="btn-primary" onclick="window.location.href='#request-loan'">
                            <i class="fas fa-plus"></i> Request a Loan
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-card">
                <div class="loan-header">
                    <div>
                        <h3>${loan.loan_type || 'Personal Loan'}</h3>
                        <p class="loan-id">#${loan.id.substring(0, 8)}</p>
                    </div>
                    <span class="status-badge ${loan.status}">${loan.status}</span>
                </div>
                <div class="loan-details">
                    <div class="detail-item">
                        <span class="label">Amount</span>
                        <span class="value">$${loan.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Interest Rate</span>
                        <span class="value">${loan.interest_rate}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Term</span>
                        <span class="value">${loan.term_months} months</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Next Payment</span>
                        <span class="value">${loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
                <div class="loan-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${loan.repayment_progress || 0}%"></div>
                    </div>
                    <span class="progress-text">${loan.repayment_progress || 0}% Repaid</span>
                </div>
                <button class="btn-secondary" onclick="viewLoanDetails('${loan.id}')">
                    View Details
                </button>
            </div>
        `).join('');
        
        console.log('✅ Loans UI updated');
    },

    /**
     * Update My Investments UI
     */
    updateMyInvestmentsUI(investments) {
        const container = document.getElementById('my-investments-container');
        if (!container) return;
        
        if (!investments || investments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px;"></i>
                    <h3>No Investments Yet</h3>
                    <p>Start investing to grow your portfolio.</p>
                    <button class="btn-primary" onclick="showSection('investments')">
                        <i class="fas fa-plus"></i> Browse Opportunities
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = investments.map(inv => `
            <div class="investment-card">
                <div class="investment-header">
                    <h4>Loan #${inv.loan_id.substring(0, 8)}</h4>
                    <span class="status-badge ${inv.status}">${inv.status}</span>
                </div>
                <div class="investment-details">
                    <div class="detail-row">
                        <span>Invested Amount:</span>
                        <strong>$${inv.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Expected Return:</span>
                        <strong class="success">${inv.expected_return}%</strong>
                    </div>
                    <div class="detail-row">
                        <span>Current Value:</span>
                        <strong>$${(inv.current_value || inv.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Investment Date:</span>
                        <span>${new Date(inv.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        console.log('✅ My investments UI updated');
    },

    /**
     * Update Investment Opportunities UI
     */
    updateInvestmentOpportunitiesUI(opportunities) {
        const container = document.getElementById('investment-opportunities-container');
        if (!container) return;
        
        if (!opportunities || opportunities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search" style="font-size: 48px; color: #94a3b8; margin-bottom: 16px;"></i>
                    <h3>No Opportunities Available</h3>
                    <p>Check back later for new investment opportunities.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = opportunities.map(opp => `
            <div class="opportunity-card">
                <div class="opportunity-header">
                    <div>
                        <h4>${opp.loan_type}</h4>
                        <p class="borrower-info">
                            <i class="fas fa-user"></i> ${opp.borrower_name || 'Anonymous'}
                        </p>
                    </div>
                    <div class="risk-badge ${opp.risk_level}">
                        ${opp.risk_level} Risk
                    </div>
                </div>
                <div class="opportunity-stats">
                    <div class="stat">
                        <span class="label">Loan Amount</span>
                        <span class="value">$${opp.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="stat">
                        <span class="label">Interest Rate</span>
                        <span class="value success">${opp.interest_rate}%</span>
                    </div>
                    <div class="stat">
                        <span class="label">Term</span>
                        <span class="value">${opp.term_months} months</span>
                    </div>
                </div>
                <div class="funding-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${opp.funding_progress || 0}%"></div>
                    </div>
                    <div class="progress-info">
                        <span>${opp.funding_progress || 0}% Funded</span>
                        <span>$${(opp.funded_amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})} / $${opp.amount.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
                <button class="btn-primary" onclick="investInLoan('${opp.id}')">
                    <i class="fas fa-hand-holding-usd"></i> Invest Now
                </button>
            </div>
        `).join('');
        
        console.log('✅ Investment opportunities UI updated');
    },

    /**
     * Get transaction icon based on type
     */
    getTransactionIcon(type) {
        const icons = {
            'deposit': 'arrow-down',
            'withdrawal': 'arrow-up',
            'investment': 'chart-line',
            'repayment': 'hand-holding-usd',
            'credit': 'plus-circle',
            'debit': 'minus-circle'
        };
        return icons[type] || 'exchange-alt';
    },

    /**
     * Show fallback data when API fails
     */
    showFallbackData(section) {
        console.warn(`⚠️ Showing fallback data for ${section}`);
        // Use localStorage cached data if available
        const cachedData = localStorage.getItem(`cached_${section}`);
        if (cachedData) {
            try {
                const data = JSON.parse(cachedData);
                // Update UI with cached data
                this[`update${section.charAt(0).toUpperCase() + section.slice(1)}UI`](data);
            } catch (error) {
                console.error('Failed to parse cached data:', error);
            }
        }
    },

    /**
     * Cache data to localStorage
     */
    cacheData(section, data) {
        try {
            localStorage.setItem(`cached_${section}`, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to cache data:', error);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ProductionDataLoader.init();
    });
} else {
    ProductionDataLoader.init();
}

// Make available globally
window.ProductionDataLoader = ProductionDataLoader;

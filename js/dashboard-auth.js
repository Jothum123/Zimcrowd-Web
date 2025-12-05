// Dashboard Authentication Module
class DashboardAuth {
    constructor() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        this.authCheckInterval = null;
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        this.setupAuthCheck();
        this.setupEventListeners();
    }

    async checkAuthStatus() {
        try {
            this.token = localStorage.getItem('authToken');
            const userData = localStorage.getItem('userData');
            
            if (!this.token || !userData) {
                this.redirectToLogin();
                return false;
            }

            this.user = JSON.parse(userData);
            this.isAuthenticated = true;
            
            // Validate token with backend
            const response = await fetch('/api/auth/validate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                this.clearAuth();
                this.redirectToLogin();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Auth check failed:', error);
            this.clearAuth();
            this.redirectToLogin();
            return false;
        }
    }

    async checkAuthentication() {
        console.log('🔐 Checking authentication...');
        console.log('🔍 localStorage contents:', {
            authToken: !!localStorage.getItem('authToken'),
            socialAuthData: !!localStorage.getItem('socialAuthData'),
            socialSignupCompleted: localStorage.getItem('socialSignupCompleted'),
            userData: !!localStorage.getItem('userData'),
            isAuthenticated: localStorage.getItem('isAuthenticated')
        });
        
        // Check for social auth data first
        const socialAuthData = JSON.parse(localStorage.getItem('socialAuthData') || '{}');
        const socialSignupCompleted = localStorage.getItem('socialSignupCompleted');
        const isAuthenticated = localStorage.getItem('isAuthenticated');
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        
        // More flexible authentication check (social auth OR regular login)
        if ((socialAuthData.provider && socialSignupCompleted) || 
            (socialAuthData.provider && isAuthenticated === 'true') ||
            (socialAuthData.email && socialAuthData.first_name) ||
            (userData.email && isAuthenticated === 'true')) {
            console.log('✅ Authentication detected:', socialAuthData.provider || userData.email || 'authenticated');
            console.log('📋 Auth data:', socialAuthData.provider ? socialAuthData : userData);
            
            // Use social auth data if available, otherwise use regular login data
            this.user = socialAuthData.provider ? socialAuthData : userData;
            this.isAuthenticated = true;
            
            // Ensure userData is set for consistency
            if (!localStorage.getItem('userData')) {
                localStorage.setItem('userData', JSON.stringify(this.user));
            }
            
            console.log('✅ Social authentication successful:', this.user);
            return true;
        }
        
        if (!this.token) {
            console.log('❌ No auth token found');
            this.redirectToLogin();
            return false;
        }

        try {
            // Verify token with backend (with timeout for social auth)
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            
            const response = await Promise.race([
                window.ZimCrowdAPI?.getProfile?.() || Promise.reject(new Error('API not available')),
                timeoutPromise
            ]);
            
            if (response.success) {
                this.user = response.data;
                this.isAuthenticated = true;
                localStorage.setItem('userData', JSON.stringify(this.user));
                console.log('✅ Backend authentication successful:', this.user);
                return true;
            } else {
                throw new Error('Invalid token');
            }
        } catch (error) {
            console.error('❌ Backend authentication failed:', error);
            
            // For social auth users, don't redirect immediately - try to use social data
            if (socialAuthData.provider) {
                console.log('🔄 Backend failed but social auth available, using social data');
                this.user = socialAuthData;
                this.isAuthenticated = true;
                return true;
            }
            
            this.clearAuth();
            this.redirectToLogin();
            return false;
        }
    }

    async loadDashboardData() {
        if (!this.isAuthenticated) return;

        console.log('📊 Loading dashboard data...');
        
        try {
            // Load user profile data
            await this.updateUserProfile();
            
            // Load dashboard stats
            await this.loadDashboardStats();
            
            // Load wallet balance
            await this.loadWalletBalance();
            
            // Load multi-currency wallet balance
            await this.loadMultiCurrencyWalletBalance();
            
            console.log('✅ Dashboard data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading dashboard data:', error);
        }
    }

    async updateUserProfile() {
        try {
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');
            
            if (userNameEl && this.user) {
                const displayName = this.user.first_name || this.user.fullName || this.user.email || 'User';
                userNameEl.textContent = displayName;
            }
            
            if (userAvatarEl && this.user) {
                const initial = (this.user.first_name || this.user.fullName || this.user.email || 'U')[0].toUpperCase();
                userAvatarEl.textContent = initial;
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
        }
    }

    async loadDashboardStats() {
        try {
            const response = await window.ZimCrowdAPI?.getDashboardOverview?.() || { success: false };
            if (response.success) {
                const stats = response.data;
                
                // Update wallet balance with percentage change
                const walletBalanceEl = document.getElementById('walletBalance');
                const walletChangeEl = document.getElementById('walletChange');
                const walletChangePercentEl = document.getElementById('walletChangePercent');
                
                if (walletBalanceEl) {
                    walletBalanceEl.textContent = `$${(stats.wallet_balance || 0).toFixed(2)}`;
                }
                
                if (walletChangeEl && walletChangePercentEl) {
                    const walletChange = stats.wallet_change_percent || 0;
                    walletChangePercentEl.textContent = `${Math.abs(walletChange).toFixed(1)}%`;
                    
                    if (walletChange >= 0) {
                        walletChangeEl.className = 'stat-change positive';
                        walletChangeEl.querySelector('i').className = 'fas fa-arrow-up';
                    } else {
                        walletChangeEl.className = 'stat-change negative';
                        walletChangeEl.querySelector('i').className = 'fas fa-arrow-down';
                    }
                }
                
                // Update active loans with total amount
                const activeLoansEl = document.getElementById('activeLoans');
                const loanAmountEl = document.getElementById('loanAmount');
                
                if (activeLoansEl) {
                    activeLoansEl.textContent = stats.active_loans || 0;
                }
                
                if (loanAmountEl) {
                    loanAmountEl.textContent = `$${(stats.total_loan_amount || 0).toFixed(2)} total borrowed`;
                }
                
                // Update investment value with returns
                const investmentValueEl = document.getElementById('investmentValue');
                const investmentChangeEl = document.getElementById('investmentChange');
                const investmentReturnEl = document.getElementById('investmentReturn');
                
                if (investmentValueEl) {
                    investmentValueEl.textContent = `$${(stats.investment_value || 0).toFixed(2)}`;
                }
                
                if (investmentChangeEl && investmentReturnEl) {
                    const investmentReturn = stats.investment_return || 0;
                    investmentReturnEl.textContent = `${Math.abs(investmentReturn).toFixed(1)}%`;
                    
                    if (investmentReturn >= 0) {
                        investmentChangeEl.className = 'stat-change positive';
                        investmentChangeEl.querySelector('i').className = 'fas fa-arrow-up';
                    } else {
                        investmentChangeEl.className = 'stat-change negative';
                        investmentChangeEl.querySelector('i').className = 'fas fa-arrow-down';
                    }
                }
                
                // Update ZimScore with monthly change
                const zimScoreEl = document.getElementById('zimScore');
                const zimScoreChangeEl = document.getElementById('zimScoreChange');
                const scoreChangeEl = document.getElementById('scoreChange');
                
                if (zimScoreEl) {
                    zimScoreEl.textContent = stats.zim_score || 0;
                }
                
                if (zimScoreChangeEl && scoreChangeEl) {
                    const scoreChange = stats.zim_score_change || 0;
                    scoreChangeEl.textContent = `${Math.abs(scoreChange).toFixed(1)}%`;
                    
                    if (scoreChange >= 0) {
                        zimScoreChangeEl.className = 'stat-change positive';
                        zimScoreChangeEl.querySelector('i').className = 'fas fa-arrow-up';
                    } else {
                        zimScoreChangeEl.className = 'stat-change negative';
                        zimScoreChangeEl.querySelector('i').className = 'fas fa-arrow-down';
                    }
                }
                
                console.log('✅ Dashboard stats updated successfully');
            }
        } catch (error) {
            console.error('❌ Error loading dashboard stats:', error);
        }
    }

    async loadWalletBalance() {
        try {
            const response = await window.ZimCrowdAPI?.getWalletBalance?.() || { success: false };
            if (response.success) {
                const wallet = response.data;
                
                // Update wallet balance elements
                const walletBalanceEl = document.getElementById('walletBalance');
                const availableBalanceEl = document.getElementById('availableBalance');
                const reservedBalanceEl = document.getElementById('reservedBalance');
                const totalInvestedEl = document.getElementById('totalInvested');
                
                if (walletBalanceEl) {
                    walletBalanceEl.textContent = `$${(wallet.balance || 0).toFixed(2)}`;
                }
                
                if (availableBalanceEl) {
                    availableBalanceEl.textContent = `$${(wallet.available_balance || 0).toFixed(2)}`;
                }
                
                if (reservedBalanceEl) {
                    reservedBalanceEl.textContent = `$${(wallet.reserved_balance || 0).toFixed(2)}`;
                }
                
                if (totalInvestedEl) {
                    totalInvestedEl.textContent = `$${(wallet.total_invested || 0).toFixed(2)}`;
                }
                
                console.log('✅ Wallet balance updated successfully');
            }
        } catch (error) {
            console.error('❌ Error loading wallet balance:', error);
        }
    }

    async loadMultiCurrencyWalletBalance() {
        try {
            console.log('🔄 Loading multi-currency wallet balance...');
            
            // Try the new multi-currency endpoint first
            let response;
            try {
                response = await window.ZimCrowdAPI?.getMultiCurrencyWalletBalance?.() || { success: false };
                console.log('✅ Using multi-currency wallet API');
            } catch (apiError) {
                console.log('⚠️ Multi-currency API not available, using fallback...');
                // Fallback to regular wallet API and simulate multi-currency split
                response = await window.ZimCrowdAPI?.getWalletBalance?.() || { success: false };
                
                if (response.success) {
                    const totalBalance = response.data.balance || 0;
                    const availableBalance = response.data.available_balance || 0;
                    const reservedBalance = response.data.reserved_balance || 0;
                    const transactions = response.data.total_transactions || 0;
                    
                    // Simulate multi-currency split (70% USD, 30% ZWG)
                    response.data = {
                        USD: {
                            total: totalBalance * 0.7,
                            available: availableBalance * 0.7,
                            reserved: reservedBalance * 0.7,
                            transactions: Math.floor(transactions * 0.6)
                        },
                        ZWG: {
                            total: (totalBalance * 0.3) * 27, // Convert to ZWG
                            available: (availableBalance * 0.3) * 27,
                            reserved: (reservedBalance * 0.3) * 27,
                            transactions: Math.floor(transactions * 0.4)
                        }
                    };
                }
            }
            
            if (response.success) {
                // Update global wallet data
                if (typeof window.walletData !== 'undefined') {
                    window.walletData = response.data;
                    
                    // Initialize display with current currency
                    if (typeof window.updateWalletDisplay === 'function') {
                        window.updateWalletDisplay();
                    }
                }
                
                // Update total account value (convert ZWG to USD for display)
                const totalValueEl = document.getElementById('walletTotalBalance') || document.getElementById('walletBalance');
                if (totalValueEl && response.data) {
                    const data = response.data;
                    const total = data.total || (data.USD || 0) + ((data.ZWG || 0) / 27); // Convert ZWG to USD for total
                    totalValueEl.textContent = `$${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    console.log('✅ Total account value updated:', total);
                } else {
                    console.error('❌ Total account value element not found');
                }

                console.log('✅ Multi-currency wallet updated successfully');
            }
        } catch (error) {
            console.error('❌ Error loading multi-currency wallet balance:', error);
        }
    }

    setupAuthCheck() {
        // Check auth status every 5 minutes
        this.authCheckInterval = setInterval(() => {
            this.checkAuthStatus();
        }, 5 * 60 * 1000);
    }

    setupEventListeners() {
        // Listen for storage changes (logout from other tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken' && !e.newValue) {
                this.redirectToLogin();
            }
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isAuthenticated) {
                this.checkAuthStatus();
            }
        });
    }

    redirectToLogin() {
        // Clear any existing auth data
        this.clearAuth();
        
        // Redirect to login page
        window.location.href = '/login.html';
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        
        // Clear all authentication data including social auth
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('socialAuthData');
        
        // Clear auth check interval
        if (this.authCheckInterval) {
            clearInterval(this.authCheckInterval);
            this.authCheckInterval = null;
        }
    }

    async logout() {
        try {
            // Call backend logout endpoint
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            this.redirectToLogin();
        }
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }
}

// Initialize dashboard authentication
const dashboardAuth = new DashboardAuth();

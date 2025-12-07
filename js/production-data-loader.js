/**
 * Production Data Loader
 * Replaces all static/mock data with real API calls
 * Handles all dashboard sections with proper error handling and loading states
 */

const ProductionDataLoader = {
    apiBase: window.API_CONFIG?.baseURL || 'https://zimcrowd-api.onrender.com/api',
    
    // Real-time update configuration
    realtime: {
        enabled: true,
        pollingInterval: null,
        refreshRate: 30000, // 30 seconds
        lastUpdate: null,
        isPolling: false
    },
    
    // Platform fees configuration (from PLATFORM-FEES-UPDATED.md)
    platformFees: {
        borrower: {
            serviceFee: 0.10,      // 10%
            insuranceFee: 0.05,    // 5%
            tenureFee: 0.01,       // 1% per month
            collectionFee: 0.05    // 5% of payment
        },
        lender: {
            serviceFee: 0.10,      // 10% (mandatory)
            insuranceFee: 0.05,    // 5% (OPTIONAL - investor can choose)
            collectionFee: 0.00,   // REMOVED - no ongoing fees
            dealFee: 0.02          // 2% secondary market
        }
    },
    
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
            
            // Start real-time updates
            this.startRealTimeUpdates();
            
            // Setup visibility change handler
            this.setupVisibilityHandler();
            
        } catch (error) {
            console.error('❌ Error loading production data:', error);
        }
    },

    /**
     * Get auth token from localStorage (supports both regular and social auth)
     */
    getAuthToken() {
        // Check multiple possible token locations
        const token = localStorage.getItem('authToken') || 
               localStorage.getItem('token') ||
               localStorage.getItem('access_token');
        
        if (token) return token;
        
        // Check authData object
        try {
            const authData = JSON.parse(localStorage.getItem('authData') || '{}');
            if (authData.access_token) return authData.access_token;
        } catch (e) {}
        
        // Check Supabase session for social auth users
        try {
            const supabaseAuth = localStorage.getItem('sb-gjtkdrrvnffrmzigdqyp-auth-token');
            if (supabaseAuth) {
                const session = JSON.parse(supabaseAuth);
                if (session?.access_token) return session.access_token;
            }
        } catch (e) {}
        
        // Check socialAuthData for social login users
        try {
            const socialAuth = JSON.parse(localStorage.getItem('socialAuthData') || '{}');
            if (socialAuth.social_id) {
                // Social auth user - use their user ID as identifier
                // The backend should accept this for social auth users
                return `social:${socialAuth.social_id}`;
            }
        } catch (e) {}
        
        return null;
    },

    /**
     * Refresh authentication token
     */
    async refreshAuthToken() {
        const refreshToken = localStorage.getItem('refreshToken') || localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
            console.warn('⚠️ No refresh token available');
            return false;
        }

        try {
            console.log('🔄 Refreshing authentication token...');
            const response = await fetch(`${this.apiBase}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.access_token) {
                    // Update all token storage locations
                    localStorage.setItem('authToken', data.access_token);
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('access_token', data.access_token);
                    
                    if (data.refresh_token) {
                        localStorage.setItem('refreshToken', data.refresh_token);
                        localStorage.setItem('refresh_token', data.refresh_token);
                    }
                    
                    console.log('✅ Token refreshed successfully');
                    return true;
                }
            }
            
            console.warn('⚠️ Token refresh failed');
            return false;
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            return false;
        }
    },

    /**
     * Make authenticated API request with automatic token refresh
     */
    async apiRequest(endpoint, options = {}, retryCount = 0) {
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
            
            // Handle 401 Unauthorized - token expired
            if (response.status === 401 && retryCount === 0) {
                console.log('🔐 Token expired, attempting refresh...');
                const refreshed = await this.refreshAuthToken();
                
                if (refreshed) {
                    // Retry the request with new token
                    return await this.apiRequest(endpoint, options, retryCount + 1);
                } else {
                    // Refresh failed - redirect to login
                    console.error('❌ Token refresh failed, redirecting to login...');
                    localStorage.clear();
                    window.location.href = '/login.html?session_expired=true';
                    throw new Error('Session expired');
                }
            }
            
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
                // Update wallet balance with stats for invested amount
                this.updateWalletUI(data.data.wallet, data.data.stats);
                
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
    async loadInvestmentsData(page = 1, limit = 10) {
        try {
            console.log('📈 Loading investments data...');
            
            // Store current page
            window.currentInvestmentPage = page;
            window.investmentPageLimit = limit;
            
            const [portfolio, performance, myInvestments] = await Promise.all([
                this.apiRequest('/investments/portfolio'),
                this.apiRequest('/investments/performance'),
                this.apiRequest(`/investments/my-investments?page=${page}&limit=${limit}`)
            ]);
            
            // Update Portfolio Tab
            if (portfolio.success && portfolio.data) {
                const data = portfolio.data;
                
                // Update portfolio stats
                const totalInvested = document.getElementById('portfolioTotalInvested');
                const avgReturn = document.getElementById('portfolioAvgReturn');
                const activeCount = document.getElementById('portfolioActiveCount');
                const totalReturns = document.getElementById('portfolioTotalReturns');
                
                if (totalInvested) totalInvested.textContent = `$${parseFloat(data.total_invested || 0).toLocaleString()}`;
                if (avgReturn) avgReturn.textContent = `${parseFloat(data.average_return || 0).toFixed(1)}%`;
                if (activeCount) activeCount.textContent = data.active_investments || 0;
                if (totalReturns) totalReturns.textContent = `$${parseFloat(data.total_returns || 0).toLocaleString()}`;
                
                // Update header stats
                const headerInvested = document.getElementById('portfolioHeaderInvested');
                const headerReturns = document.getElementById('portfolioHeaderReturns');
                const headerAvgReturn = document.getElementById('portfolioHeaderAvgReturn');
                
                if (headerInvested) headerInvested.textContent = `$${parseFloat(data.total_invested || 0).toFixed(2)} Total Invested`;
                if (headerReturns) headerReturns.textContent = `$${parseFloat(data.total_returns || 0).toFixed(2)} Total Returns`;
                if (headerAvgReturn) headerAvgReturn.textContent = `${parseFloat(data.average_return || 0).toFixed(1)}% Avg. Return`;
                
                console.log('✅ Portfolio stats updated');
            }
            
            // Update Performance Tab
            if (performance.success && performance.data) {
                const data = performance.data;
                
                // Main stats
                const perfTotalEarnings = document.getElementById('perfTotalEarnings');
                const perfThisMonth = document.getElementById('perfThisMonth');
                const perfAvgReturn = document.getElementById('perfAvgReturn');
                const perfOnTimePayments = document.getElementById('perfOnTimePayments');
                
                if (perfTotalEarnings) perfTotalEarnings.textContent = `+$${parseFloat(data.total_earnings || 0).toLocaleString()}`;
                if (perfThisMonth) perfThisMonth.textContent = `+$${parseFloat(data.earnings_this_month || 0).toLocaleString()}`;
                if (perfAvgReturn) perfAvgReturn.textContent = `${parseFloat(data.average_annual_return || 0).toFixed(1)}%`;
                if (perfOnTimePayments) perfOnTimePayments.textContent = `${parseFloat(data.on_time_payment_rate || 0).toFixed(0)}%`;
                
                // Monthly Performance
                const perfLastMonth = document.getElementById('perfLastMonth');
                const perfThisMonthDetail = document.getElementById('perfThisMonthDetail');
                const perfGrowthRate = document.getElementById('perfGrowthRate');
                
                if (perfLastMonth) perfLastMonth.textContent = `+$${parseFloat(data.earnings_last_month || 0).toFixed(2)}`;
                if (perfThisMonthDetail) perfThisMonthDetail.textContent = `+$${parseFloat(data.earnings_this_month || 0).toFixed(2)}`;
                if (perfGrowthRate) {
                    const growth = parseFloat(data.growth_rate || 0);
                    perfGrowthRate.textContent = `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
                    perfGrowthRate.style.color = growth >= 0 ? '#38e77b' : '#ef4444';
                }
                
                // Best Performing
                const perfHighestReturn = document.getElementById('perfHighestReturn');
                const perfBestInvestment = document.getElementById('perfBestInvestment');
                const perfTotalProfit = document.getElementById('perfTotalProfit');
                
                if (perfHighestReturn) perfHighestReturn.textContent = `${parseFloat(data.highest_return_rate || 0).toFixed(1)}%`;
                if (perfBestInvestment) perfBestInvestment.textContent = `$${parseFloat(data.best_investment_amount || 0).toFixed(2)}`;
                if (perfTotalProfit) perfTotalProfit.textContent = `+$${parseFloat(data.total_profit || 0).toFixed(2)}`;
                
                // Investment Duration
                const perfAvgDuration = document.getElementById('perfAvgDuration');
                const perfActiveCount = document.getElementById('perfActiveCount');
                const perfCompletedCount = document.getElementById('perfCompletedCount');
                
                if (perfAvgDuration) perfAvgDuration.textContent = `${Math.round(data.average_duration_months || 0)} months`;
                if (perfActiveCount) perfActiveCount.textContent = data.active_investments_count || 0;
                if (perfCompletedCount) perfCompletedCount.textContent = data.completed_investments_count || 0;
                
                // Risk Distribution
                const riskData = data.risk_distribution || {};
                this.updateRiskDistribution(riskData);
                
                // Top Performing Investments
                if (data.top_performers && data.top_performers.length > 0) {
                    this.updateTopPerformers(data.top_performers);
                }
                
                console.log('✅ Performance stats updated');
            }
            
            // Update My Investments list
            if (myInvestments.success) {
                const container = document.getElementById('portfolioGrid');
                const investments = myInvestments.data || [];
                const pagination = myInvestments.pagination || {};
                
                if (container) {
                    if (investments.length > 0) {
                        container.innerHTML = investments.map(inv => this.createInvestmentCard(inv)).join('');
                        console.log('✅ Investment cards updated:', investments.length);
                        
                        // Update pagination
                        this.updateInvestmentPagination(pagination);
                    } else {
                        container.innerHTML = `
                            <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; min-height: 400px; padding: 60px 20px;">
                                <div style="text-align: center; max-width: 500px;">
                                    <div style="width: 120px; height: 120px; background: linear-gradient(135deg, rgba(56, 231, 123, 0.2), rgba(59, 130, 246, 0.2)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; box-shadow: 0 10px 40px rgba(56, 231, 123, 0.2);">
                                        <i class="fas fa-chart-line" style="font-size: 48px; color: #38e77b;"></i>
                                    </div>
                                    <h3 style="margin: 0 0 15px 0; font-size: 28px; color: #fff;">No Investments Yet</h3>
                                    <p style="color: #94a3b8; font-size: 18px; margin: 0 0 30px 0; line-height: 1.6;">Start investing in loans to build your portfolio and earn returns</p>
                                    <button onclick="switchSection('overview')" class="btn-primary" style="padding: 14px 32px; font-size: 16px; display: inline-flex; align-items: center; gap: 10px;">
                                        <i class="fas fa-search"></i> Browse Opportunities
                                    </button>
                                </div>
                            </div>
                        `;
                        // Hide pagination if no investments
                        const paginationEl = document.getElementById('portfolioPagination');
                        if (paginationEl) paginationEl.style.display = 'none';
                        console.log('ℹ️ No investments found');
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to load investments:', error);
            this.showFallbackData('investments');
        }
    },
    
    updateRiskDistribution(riskData) {
        const low = riskData.low || { percentage: 0, amount: 0, count: 0 };
        const medium = riskData.medium || { percentage: 0, amount: 0, count: 0 };
        const high = riskData.high || { percentage: 0, amount: 0, count: 0 };
        
        // Update Low Risk
        const riskLowPercent = document.getElementById('riskLowPercent');
        const riskLowBar = document.getElementById('riskLowBar');
        const riskLowAmount = document.getElementById('riskLowAmount');
        const riskLowCount = document.getElementById('riskLowCount');
        
        if (riskLowPercent) riskLowPercent.textContent = `${parseFloat(low.percentage || 0).toFixed(1)}%`;
        if (riskLowBar) riskLowBar.style.width = `${parseFloat(low.percentage || 0)}%`;
        if (riskLowAmount) riskLowAmount.textContent = `$${parseFloat(low.amount || 0).toFixed(2)}`;
        if (riskLowCount) riskLowCount.textContent = `${low.count || 0} investments`;
        
        // Update Medium Risk
        const riskMediumPercent = document.getElementById('riskMediumPercent');
        const riskMediumBar = document.getElementById('riskMediumBar');
        const riskMediumAmount = document.getElementById('riskMediumAmount');
        const riskMediumCount = document.getElementById('riskMediumCount');
        
        if (riskMediumPercent) riskMediumPercent.textContent = `${parseFloat(medium.percentage || 0).toFixed(1)}%`;
        if (riskMediumBar) riskMediumBar.style.width = `${parseFloat(medium.percentage || 0)}%`;
        if (riskMediumAmount) riskMediumAmount.textContent = `$${parseFloat(medium.amount || 0).toFixed(2)}`;
        if (riskMediumCount) riskMediumCount.textContent = `${medium.count || 0} investments`;
        
        // Update High Risk
        const riskHighPercent = document.getElementById('riskHighPercent');
        const riskHighBar = document.getElementById('riskHighBar');
        const riskHighAmount = document.getElementById('riskHighAmount');
        const riskHighCount = document.getElementById('riskHighCount');
        
        if (riskHighPercent) riskHighPercent.textContent = `${parseFloat(high.percentage || 0).toFixed(1)}%`;
        if (riskHighBar) riskHighBar.style.width = `${parseFloat(high.percentage || 0)}%`;
        if (riskHighAmount) riskHighAmount.textContent = `$${parseFloat(high.amount || 0).toFixed(2)}`;
        if (riskHighCount) riskHighCount.textContent = `${high.count || 0} investments`;
        
        // Update Portfolio Summary
        const totalInvested = parseFloat(low.amount || 0) + parseFloat(medium.amount || 0) + parseFloat(high.amount || 0);
        const totalReturns = parseFloat(riskData.total_returns || 0);
        const roi = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(1) : 0;
        
        const riskTotalInvested = document.getElementById('riskTotalInvested');
        const riskTotalReturns = document.getElementById('riskTotalReturns');
        const riskROI = document.getElementById('riskROI');
        
        if (riskTotalInvested) riskTotalInvested.textContent = `$${totalInvested.toFixed(2)}`;
        if (riskTotalReturns) riskTotalReturns.textContent = `+$${totalReturns.toFixed(2)}`;
        if (riskROI) riskROI.textContent = `${roi}%`;
    },
    
    updateTopPerformers(topPerformers) {
        const container = document.getElementById('topPerformingInvestments');
        if (!container) return;
        
        if (topPerformers.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-chart-bar" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <p>No performance data available yet</p>
                </div>
            `;
            return;
        }
        
        const html = topPerformers.map((inv, index) => {
            const returnPercent = parseFloat(inv.return_percentage || 0);
            const returns = parseFloat(inv.returns || 0);
            const principal = parseFloat(inv.principal || 0);
            
            const medals = ['🥇', '🥈', '🥉'];
            const medal = medals[index] || '🏆';
            
            return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #0f172a; border-radius: 12px; margin-bottom: 10px; border-left: 4px solid ${index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : '#cd7f32'};">
                    <div style="display: flex; align-items: center; gap: 15px; flex: 1;">
                        <span style="font-size: 32px;">${medal}</span>
                        <div>
                            <h4 style="margin: 0 0 5px 0;">${inv.borrower_name || 'Anonymous'}</h4>
                            <p style="margin: 0; color: #94a3b8; font-size: 14px;">${inv.purpose || 'Personal Loan'}</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 24px; font-weight: 700; color: #38e77b; margin-bottom: 5px;">
                            ${returnPercent.toFixed(1)}%
                        </div>
                        <div style="color: #94a3b8; font-size: 14px;">
                            +$${returns.toFixed(2)} on $${principal.toFixed(2)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    },
    
    updateInvestmentPagination(pagination) {
        const paginationEl = document.getElementById('portfolioPagination');
        const pageButtonsContainer = document.getElementById('portfolioPageButtons');
        const prevBtn = document.getElementById('portfolioPrevBtn');
        const nextBtn = document.getElementById('portfolioNextBtn');
        
        if (!paginationEl || !pageButtonsContainer) return;
        
        const currentPage = pagination.current_page || 1;
        const totalPages = pagination.total_pages || 1;
        const totalItems = pagination.total || 0;
        
        // Show pagination if there are items
        if (totalItems > 0) {
            paginationEl.style.display = 'flex';
            
            // Generate page buttons
            let buttonsHTML = '';
            const maxButtons = 5;
            let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);
            
            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === currentPage ? 'active' : '';
                buttonsHTML += `
                    <button onclick="loadInvestmentsPage(${i})" 
                            class="page-number-btn ${isActive}" 
                            style="padding: 8px 12px; background: ${i === currentPage ? '#38e77b' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${i === currentPage ? '#38e77b' : '#334155'}; border-radius: 8px; color: ${i === currentPage ? '#000' : '#fff'}; cursor: pointer; font-weight: ${i === currentPage ? '700' : '400'};">
                        ${i}
                    </button>
                `;
            }
            
            buttonsHTML += `
                <span style="color: #94a3b8; font-size: 14px; margin-left: 10px;">
                    Page <span style="font-weight: 600; color: #38e77b;">${currentPage}</span> of ${totalPages} (${totalItems} investments)
                </span>
            `;
            
            pageButtonsContainer.innerHTML = buttonsHTML;
            
            // Enable/disable prev/next buttons
            if (prevBtn) {
                prevBtn.disabled = currentPage === 1;
                prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
                prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
            }
            
            if (nextBtn) {
                nextBtn.disabled = currentPage === totalPages;
                nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
                nextBtn.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
            }
        } else {
            paginationEl.style.display = 'none';
        }
    },
    
    createInvestmentCard(investment) {
        const borrowerInitial = investment.borrower_name ? investment.borrower_name[0].toUpperCase() : 'B';
        const principal = parseFloat(investment.amount || 0);
        const returns = parseFloat(investment.returns || 0);
        const returnPercent = principal > 0 ? ((returns / principal) * 100).toFixed(1) : 0;
        const monthlyReturn = parseFloat(investment.monthly_return || 0);
        const progress = parseFloat(investment.progress || 0);
        const status = investment.status || 'active';
        const investmentId = investment.id || investment.investment_id;
        const loanId = investment.loan_id;
        const riskLevel = investment.risk_level || 'medium';
        const interestRate = parseFloat(investment.interest_rate || 0);
        
        const statusColors = {
            active: { bg: 'rgba(56, 231, 123, 0.1)', color: '#38e77b', text: 'Active' },
            completed: { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', text: 'Completed' },
            defaulted: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', text: 'Defaulted' }
        };
        
        const statusStyle = statusColors[status] || statusColors.active;
        
        // Generate star rating based on risk level
        const riskRatings = {
            low: 4.5,
            medium: 3.5,
            high: 2.5
        };
        const rating = riskRatings[riskLevel] || 3.5;
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            starsHTML += '<i class="fas fa-star-half-alt"></i>';
        }
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += '<i class="far fa-star"></i>';
        }
        
        return `
            <div class="portfolio-card" data-investment-id="${investmentId}">
                <div class="card-header">
                    <div class="borrower-info">
                        <div class="borrower-avatar">${borrowerInitial}</div>
                        <div class="borrower-details">
                            <div class="borrower-name">${investment.borrower_name || 'Anonymous'}</div>
                            <div class="borrower-purpose">${investment.purpose || 'Personal Loan'}</div>
                            <span class="risk-badge ${riskLevel}">
                                ${starsHTML}
                                <span class="rating-text">${rating}/5</span>
                            </span>
                        </div>
                    </div>
                    <span style="padding: 6px 12px; background: ${statusStyle.bg}; color: ${statusStyle.color}; border-radius: 8px; font-size: 12px; font-weight: 600;">
                        ${statusStyle.text}
                    </span>
                </div>
                
                <div class="card-body">
                    <div class="card-metrics">
                        <div class="metric-item">
                            <span class="metric-label">Principal</span>
                            <span class="metric-value">$${principal.toFixed(2)}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Returns</span>
                            <span class="metric-value returns-positive">+$${returns.toFixed(2)} (${returnPercent}%)</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Monthly Return</span>
                            <span class="metric-value">$${monthlyReturn.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <div class="card-progress">
                        <div class="progress-info">
                            <span>Progress</span>
                            <span>${progress.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="btn-secondary" style="flex: 1;" onclick="viewInvestmentDetails('${investmentId}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn-primary" style="flex: 1;" onclick="autoInvestSimilar('${loanId}', '${riskLevel}', ${interestRate})">
                        <i class="fas fa-robot"></i> Auto-Invest Similar
                    </button>
                </div>
            </div>
        `;
    },

    // Transaction pagination state
    transactionsPagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
        transactions: []
    },

    /**
     * Load Transactions Data with pagination
     */
    async loadTransactionsData(page = 1, limit = 10) {
        try {
            console.log(`💳 Loading transactions data (page ${page})...`);
            
            // Show loading state
            const container = document.getElementById('transactionsListContainer');
            if (container && page === 1) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <div class="spinner" style="width: 50px; height: 50px; border: 4px solid rgba(56, 231, 123, 0.1); border-top-color: #38e77b; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                        <p style="color: #94a3b8;">Loading transactions...</p>
                    </div>
                `;
            }
            
            const response = await this.apiRequest(`/transactions?page=${page}&limit=${limit}`);
            
            if (response.success && response.data) {
                // Update pagination state
                this.transactionsPagination.currentPage = response.data.pagination?.page || page;
                this.transactionsPagination.totalPages = response.data.pagination?.pages || 1;
                this.transactionsPagination.totalItems = response.data.pagination?.total || 0;
                this.transactionsPagination.itemsPerPage = limit;
                this.transactionsPagination.transactions = response.data.transactions || [];
                
                this.updateTransactionsUI(response.data);
                this.cacheData('transactions', response.data);
            }
        } catch (error) {
            console.error('Failed to load transactions:', error);
            this.showFallbackData('transactions');
        }
    },

    /**
     * Update Transactions UI with production data
     */
    updateTransactionsUI(data) {
        const container = document.getElementById('transactionsListContainer');
        if (!container) return;
        
        const transactions = data.transactions || [];
        const pagination = data.pagination || {};
        const summary = data.summary || {};
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="width: 80px; height: 80px; background: rgba(148, 163, 184, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fas fa-exchange-alt" style="font-size: 36px; color: #64748b;"></i>
                    </div>
                    <h3 style="color: #e2e8f0; margin-bottom: 10px;">No Transactions Yet</h3>
                    <p style="color: #94a3b8;">Your transaction history will appear here once you start using ZimCrowd.</p>
                </div>
            `;
            // Hide pagination when no transactions
            const paginationEl = document.getElementById('transactionsPagination');
            if (paginationEl) paginationEl.style.display = 'none';
            return;
        }
        
        // Render transaction cards
        container.innerHTML = transactions.map(tx => {
            const isCredit = ['deposit', 'investment_return', 'loan_disbursement', 'credit', 'referral_bonus'].includes(tx.type);
            const amount = parseFloat(tx.amount || 0);
            const icon = this.getTransactionIcon(tx.type);
            const iconColor = isCredit ? '#38e77b' : '#ef4444';
            const iconBg = isCredit ? 'rgba(56, 231, 123, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            const amountColor = isCredit ? '#38e77b' : '#ef4444';
            const amountPrefix = isCredit ? '+' : '-';
            
            // Format date
            const date = new Date(tx.created_at);
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
            
            // Get status badge class
            const statusClass = tx.status === 'completed' ? 'loan-status' : 
                               tx.status === 'pending' ? 'loan-status pending' : 
                               tx.status === 'failed' ? 'loan-status failed' : 'loan-status';
            
            return `
                <div class="loan-card" style="transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.3)';" onmouseout="this.style.transform='none'; this.style.boxShadow='none';">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 50px; height: 50px; background: ${iconBg}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-${icon}" style="color: ${iconColor}; font-size: 18px;"></i>
                            </div>
                            <div>
                                <h4 style="margin-bottom: 5px; text-transform: capitalize;">${this.formatTransactionType(tx.type)}</h4>
                                <p style="color: #94a3b8; font-size: 14px;">${tx.description || tx.reference || 'Transaction'} • ${formattedDate}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 20px; font-weight: 700; color: ${amountColor};">${amountPrefix}$${Math.abs(amount).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                            <span class="${statusClass}" style="font-size: 11px; text-transform: capitalize;">${tx.status || 'Completed'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update pagination UI
        this.updateTransactionsPaginationUI(pagination);
        
        console.log(`✅ Transactions UI updated - ${transactions.length} items, Page ${pagination.page || 1} of ${pagination.pages || 1}`);
    },

    /**
     * Update Transactions Pagination UI
     * Matches the design of investments pagination with page number buttons
     */
    updateTransactionsPaginationUI(pagination) {
        const paginationEl = document.getElementById('transactionsPagination');
        const pageButtonsContainer = document.getElementById('transactionsPageButtons');
        const prevBtn = document.getElementById('transactionsPrevBtn');
        const nextBtn = document.getElementById('transactionsNextBtn');
        
        if (!paginationEl) return;
        
        const currentPage = pagination.page || this.transactionsPagination.currentPage;
        const totalPages = pagination.pages || this.transactionsPagination.totalPages;
        const totalItems = pagination.total || this.transactionsPagination.totalItems;
        
        // Show pagination if there are items
        if (totalItems > 0 && totalPages > 1) {
            paginationEl.style.display = 'flex';
            
            // Generate page buttons (same design as investments)
            if (pageButtonsContainer) {
                let buttonsHTML = '';
                const maxButtons = 5;
                let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                let endPage = Math.min(totalPages, startPage + maxButtons - 1);
                
                if (endPage - startPage < maxButtons - 1) {
                    startPage = Math.max(1, endPage - maxButtons + 1);
                }
                
                for (let i = startPage; i <= endPage; i++) {
                    const isActive = i === currentPage;
                    buttonsHTML += `
                        <button onclick="goToTransactionsPage(${i})" 
                                class="page-number-btn ${isActive ? 'active' : ''}" 
                                style="padding: 8px 12px; background: ${isActive ? '#38e77b' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isActive ? '#38e77b' : '#334155'}; border-radius: 8px; color: ${isActive ? '#000' : '#fff'}; cursor: pointer; font-weight: ${isActive ? '700' : '400'}; transition: all 0.2s;">
                            ${i}
                        </button>
                    `;
                }
                
                buttonsHTML += `
                    <span style="color: #94a3b8; font-size: 14px; margin-left: 10px;">
                        Page <span style="font-weight: 600; color: #38e77b;">${currentPage}</span> of ${totalPages} (${totalItems} transactions)
                    </span>
                `;
                
                pageButtonsContainer.innerHTML = buttonsHTML;
            }
            
            // Enable/disable prev/next buttons
            if (prevBtn) {
                prevBtn.disabled = currentPage <= 1;
                prevBtn.style.opacity = currentPage <= 1 ? '0.5' : '1';
                prevBtn.style.cursor = currentPage <= 1 ? 'not-allowed' : 'pointer';
            }
            
            if (nextBtn) {
                nextBtn.disabled = currentPage >= totalPages;
                nextBtn.style.opacity = currentPage >= totalPages ? '0.5' : '1';
                nextBtn.style.cursor = currentPage >= totalPages ? 'not-allowed' : 'pointer';
            }
        } else if (totalItems > 0) {
            // Show pagination but without page buttons (single page)
            paginationEl.style.display = 'flex';
            if (pageButtonsContainer) {
                pageButtonsContainer.innerHTML = `
                    <span style="color: #94a3b8; font-size: 14px;">
                        Showing all ${totalItems} transactions
                    </span>
                `;
            }
            if (prevBtn) {
                prevBtn.disabled = true;
                prevBtn.style.opacity = '0.5';
                prevBtn.style.cursor = 'not-allowed';
            }
            if (nextBtn) {
                nextBtn.disabled = true;
                nextBtn.style.opacity = '0.5';
                nextBtn.style.cursor = 'not-allowed';
            }
        } else {
            paginationEl.style.display = 'none';
        }
    },

    /**
     * Format transaction type for display
     */
    formatTransactionType(type) {
        const typeMap = {
            'deposit': 'Wallet Deposit',
            'withdrawal': 'Withdrawal',
            'loan_payment': 'Loan Payment',
            'loan_disbursement': 'Loan Disbursement',
            'investment': 'Investment',
            'investment_return': 'Investment Return',
            'transfer': 'Transfer',
            'credit': 'Credit',
            'debit': 'Debit',
            'fee': 'Platform Fee',
            'referral_bonus': 'Referral Bonus',
            'repayment': 'Loan Repayment'
        };
        return typeMap[type] || type.replace(/_/g, ' ');
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
                const shareUrl = code.data.share_url;
                const referralCode = code.data.referral_code;
                const qrUrl = code.data.qr_code_url;
                
                // Update referral link display
                const linkElement = document.getElementById('referralLinkDisplay');
                if (linkElement) {
                    linkElement.textContent = shareUrl;
                    linkElement.href = shareUrl;
                }
                
                // Update QR code
                const qrContainer = document.getElementById('referralQRCode');
                if (qrContainer && qrUrl) {
                    qrContainer.innerHTML = `<img src="${qrUrl}" alt="Referral QR Code" style="width: 100%; height: 100%; border-radius: 12px;">`;
                }
                
                // Setup share buttons
                const whatsappBtn = document.getElementById('shareWhatsApp');
                if (whatsappBtn) {
                    whatsappBtn.onclick = () => {
                        const message = encodeURIComponent(`Join ZimCrowd and get instant loans! Use my referral link: ${shareUrl}`);
                        window.open(`https://wa.me/?text=${message}`, '_blank');
                    };
                }
                
                const facebookBtn = document.getElementById('shareFacebook');
                if (facebookBtn) {
                    facebookBtn.onclick = () => {
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
                    };
                }
                
                const twitterBtn = document.getElementById('shareTwitter');
                if (twitterBtn) {
                    twitterBtn.onclick = () => {
                        const text = encodeURIComponent(`Join ZimCrowd with my referral link!`);
                        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                    };
                }
                
                const emailBtn = document.getElementById('shareEmail');
                if (emailBtn) {
                    emailBtn.onclick = () => {
                        const subject = encodeURIComponent('Join ZimCrowd');
                        const body = encodeURIComponent(`Join ZimCrowd and get instant loans!\n\nUse my referral link: ${shareUrl}`);
                        window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    };
                }
                
                // Store for copy function
                if (typeof window !== 'undefined') {
                    window.currentReferralLink = shareUrl;
                    window.currentReferralCode = referralCode;
                }
                
                console.log('✅ Referral link and share buttons updated:', shareUrl);
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
    updateWalletUI(walletData, stats = null) {
        // Elements
        const accountValueEl = document.getElementById('walletAccountValue');
        const availableEl = document.getElementById('walletAvailableBalance');
        const investedEl = document.getElementById('walletInvestedFunds');
        const reservedEl = document.getElementById('walletReservedFunds');
        const transactionsEl = document.getElementById('walletTotalTransactions');
        
        // Values
        const available = parseFloat(walletData.available_balance || walletData.balance || 0);
        const reserved = parseFloat(walletData.pending_balance || walletData.reserved_amount || 0);
        // Get invested from stats if available, otherwise check walletData, otherwise 0
        const invested = stats ? parseFloat(stats.total_invested || 0) : parseFloat(walletData.invested_amount || 0);
        const totalTransactions = parseFloat(walletData.total_transactions || 0);
        
        const accountValue = available + reserved + invested;
        
        // Update UI
        if (accountValueEl) accountValueEl.textContent = `$${accountValue.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (availableEl) availableEl.textContent = `$${available.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (investedEl) investedEl.textContent = `$${invested.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (reservedEl) reservedEl.textContent = `$${reserved.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        if (transactionsEl) transactionsEl.textContent = `$${totalTransactions.toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        
        console.log('✅ Wallet UI updated with new fields');
    },

    /**
     * Load Wallet Page Data
     */
    async loadWalletPage(page = 1) {
        try {
            console.log(`💰 Loading wallet transactions page ${page}...`);
            
            // Show loading state
            const container = document.getElementById('walletRecentTransactions');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 20px;"></div>
                        <p style="color: #94a3b8;">Loading transactions...</p>
                    </div>
                `;
            }

            const response = await this.apiRequest(`/wallet/transactions?page=${page}&limit=10`);
            
            if (response.success && response.data) {
                this.updateWalletTransactionsList(response.data.transactions);
                this.updateWalletPagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Failed to load wallet transactions:', error);
            // Fallback or error state
            const container = document.getElementById('walletRecentTransactions');
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #ef4444;">
                        <i class="fas fa-exclamation-circle" style="font-size: 32px; margin-bottom: 15px;"></i>
                        <p>Failed to load transactions</p>
                        <button onclick="ProductionDataLoader.loadWalletPage(${page})" class="btn-secondary" style="margin-top: 10px;">Try Again</button>
                    </div>
                `;
            }
        }
    },

    /**
     * Update Wallet Transactions List
     */
    updateWalletTransactionsList(transactions) {
        const container = document.getElementById('walletRecentTransactions');
        if (!container) return;

        if (!transactions || transactions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-receipt" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No transactions found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(tx => {
            const isCredit = tx.type === 'deposit' || tx.type === 'credit' || tx.type === 'loan_disbursement' || tx.type === 'investment_return';
            const icon = isCredit ? 'arrow-down' : 'arrow-up';
            const color = isCredit ? '#38e77b' : '#ef4444';
            const bg = isCredit ? 'rgba(56, 231, 123, 0.1)' : 'rgba(239, 68, 68, 0.1)';
            
            return `
                <div class="loan-card">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="width: 50px; height: 50px; background: ${bg}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fas fa-${icon}" style="color: ${color};"></i>
                            </div>
                            <div>
                                <h4 style="margin-bottom: 5px;">${tx.description || tx.type.replace(/_/g, ' ')}</h4>
                                <p style="color: #94a3b8; font-size: 14px;">${new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 20px; font-weight: 700; color: ${color};">
                                ${isCredit ? '+' : '-'}$${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                            </div>
                            <span class="status-badge ${tx.status}" style="font-size: 12px; padding: 2px 8px; margin-top: 4px; display: inline-block;">${tx.status}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Update Wallet Pagination
     */
    updateWalletPagination(pagination) {
        const container = document.querySelector('[data-pagination="walletTransactions"]');
        if (!container) return;

        if (!pagination || pagination.total_pages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';
        
        const currentPage = pagination.current_page;
        const totalPages = pagination.total_pages;
        
        // Update page numbers
        const pageBtnContainer = container.querySelector('[data-page-buttons]');
        if (pageBtnContainer) {
            let html = '';
            const maxButtons = 5;
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, start + maxButtons - 1);
            
            if (end - start < maxButtons - 1) {
                start = Math.max(1, end - maxButtons + 1);
            }

            for (let i = start; i <= end; i++) {
                html += `
                    <button onclick="ProductionDataLoader.loadWalletPage(${i})" 
                            class="page-number-btn ${i === currentPage ? 'active' : ''}">
                        ${i}
                    </button>
                `;
            }
            
            html += `
                <span style="color: #94a3b8; font-size: 14px; margin-left: 10px;">
                    Page <span style="font-weight: 600; color: #38e77b;">${currentPage}</span> of ${totalPages}
                </span>
            `;
            
            pageBtnContainer.innerHTML = html;
        }

        // Update Prev/Next buttons
        const prevBtn = container.querySelector('[data-prev-btn]');
        const nextBtn = container.querySelector('[data-next-btn]');
        
        if (prevBtn) {
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => ProductionDataLoader.loadWalletPage(currentPage - 1);
            prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        }
        
        if (nextBtn) {
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => ProductionDataLoader.loadWalletPage(currentPage + 1);
            nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        }
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
     * Update Recent Loans UI
     */
    updateRecentLoansUI(loans) {
        const container = document.getElementById('recent-loans-list');
        if (!container || !loans || loans.length === 0) return;
        
        container.innerHTML = loans.slice(0, 5).map(loan => `
            <div class="loan-item">
                <div class="loan-icon">
                    <i class="fas fa-hand-holding-usd"></i>
                </div>
                <div class="loan-details">
                    <h4>${loan.purpose || 'Loan'}</h4>
                    <p>${new Date(loan.created_at).toLocaleDateString()}</p>
                </div>
                <div class="loan-amount">
                    $${parseFloat(loan.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </div>
            </div>
        `).join('');
        
        console.log('✅ Recent loans UI updated');
    },

    /**
     * Update Recent Investments UI
     */
    updateRecentInvestmentsUI(investments) {
        const container = document.getElementById('recent-investments-list');
        if (!container || !investments || investments.length === 0) return;
        
        container.innerHTML = investments.slice(0, 5).map(inv => `
            <div class="investment-item">
                <div class="investment-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="investment-details">
                    <h4>${inv.loan?.purpose || 'Investment'}</h4>
                    <p>${new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div class="investment-amount">
                    $${parseFloat(inv.amount || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </div>
            </div>
        `).join('');
        
        console.log('✅ Recent investments UI updated');
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
    },
    
    // ========== REAL-TIME UPDATE METHODS ==========
    
    /**
     * Start real-time data updates
     */
    startRealTimeUpdates() {
        if (!this.realtime.enabled || this.realtime.isPolling) return;
        
        console.log('🔴 Starting real-time updates (30s interval)...');
        this.realtime.isPolling = true;
        this.realtime.lastUpdate = new Date();
        
        // Poll for updates every 30 seconds
        this.realtime.pollingInterval = setInterval(() => {
            this.refreshCriticalData();
        }, this.realtime.refreshRate);
    },
    
    /**
     * Stop real-time updates
     */
    stopRealTimeUpdates() {
        if (this.realtime.pollingInterval) {
            clearInterval(this.realtime.pollingInterval);
            this.realtime.pollingInterval = null;
            this.realtime.isPolling = false;
            console.log('⏸️ Real-time updates paused');
        }
    },
    
    /**
     * Refresh critical data (wallet, notifications, active loans)
     */
    async refreshCriticalData() {
        try {
            const token = this.getAuthToken();
            if (!token) return;
            
            // Update last refresh time
            this.realtime.lastUpdate = new Date();
            
            // Refresh critical sections in parallel
            await Promise.allSettled([
                this.refreshWalletBalance(),
                this.refreshNotifications(),
                this.refreshActiveLoans(),
                this.refreshInvestmentReturns()
            ]);
            
            // Update last update indicator
            this.updateLastRefreshIndicator();
            
        } catch (error) {
            console.error('❌ Error refreshing critical data:', error);
        }
    },
    
    /**
     * Refresh wallet balance
     */
    async refreshWalletBalance() {
        try {
            const response = await this.apiRequest('/dashboard/wallet');
            if (response.success && response.data) {
                // Get stats for invested amount
                const statsResponse = await this.apiRequest('/dashboard/stats');
                const stats = statsResponse.success ? statsResponse.data : null;
                
                this.updateWalletUI(response.data, stats);
                this.cacheData('wallet', response.data);
            }
        } catch (error) {
            console.error('Failed to refresh wallet:', error);
        }
    },
    
    /**
     * Refresh notifications
     */
    async refreshNotifications() {
        try {
            const response = await this.apiRequest('/dashboard/notifications?unread=true');
            if (response.success && response.data) {
                this.updateNotificationBadge(response.data.unread_count || 0);
            }
        } catch (error) {
            console.error('Failed to refresh notifications:', error);
        }
    },
    
    /**
     * Refresh active loans
     */
    async refreshActiveLoans() {
        try {
            const response = await this.apiRequest('/loans/my-loans?status=active');
            if (response.success && response.data) {
                // Update loan count badge
                const activeCount = response.data.length;
                const badge = document.getElementById('activeLoansCount');
                if (badge) badge.textContent = `${activeCount} Active`;
            }
        } catch (error) {
            console.error('Failed to refresh active loans:', error);
        }
    },
    
    /**
     * Refresh investment returns
     */
    async refreshInvestmentReturns() {
        try {
            const response = await this.apiRequest('/investments/portfolio');
            if (response.success && response.data) {
                // Update portfolio stats
                const totalReturns = document.getElementById('portfolioTotalReturns');
                if (totalReturns) {
                    totalReturns.textContent = `$${parseFloat(response.data.total_returns || 0).toLocaleString()}`;
                }
            }
        } catch (error) {
            console.error('Failed to refresh investment returns:', error);
        }
    },
    
    /**
     * Update notification badge
     */
    updateNotificationBadge(count) {
        const badge = document.getElementById('notificationCount');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
            
            // Animate if count increased
            if (count > 0) {
                badge.style.animation = 'pulse 0.5s';
                setTimeout(() => badge.style.animation = '', 500);
            }
        }
    },
    
    /**
     * Update last refresh indicator
     */
    updateLastRefreshIndicator() {
        const indicator = document.getElementById('lastUpdateTime');
        if (indicator && this.realtime.lastUpdate) {
            const timeAgo = this.getTimeAgo(this.realtime.lastUpdate);
            indicator.textContent = `Updated ${timeAgo}`;
            indicator.style.color = '#38e77b';
        }
    },
    
    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    },
    
    /**
     * Setup visibility change handler
     */
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopRealTimeUpdates();
            } else {
                // Refresh immediately when tab becomes visible
                this.refreshCriticalData();
                this.startRealTimeUpdates();
            }
        });
    },
    
    // ========== PLATFORM FEES CALCULATION METHODS ==========
    
    /**
     * Calculate borrower fees
     */
    calculateBorrowerFees(loanAmount, termMonths, monthlyPayment) {
        const fees = this.platformFees.borrower;
        
        // Upfront fees
        const serviceFee = loanAmount * fees.serviceFee;
        const insuranceFee = loanAmount * fees.insuranceFee;
        const totalUpfront = serviceFee + insuranceFee;
        const netReceived = loanAmount - totalUpfront;
        
        // Ongoing fees
        const tenureFeePerMonth = loanAmount * fees.tenureFee;
        const totalTenureFees = tenureFeePerMonth * termMonths;
        
        const collectionFeePerMonth = monthlyPayment * fees.collectionFee;
        const totalCollectionFees = collectionFeePerMonth * termMonths;
        
        const totalPlatformFees = totalUpfront + totalTenureFees + totalCollectionFees;
        
        return {
            upfront: {
                serviceFee,
                insuranceFee,
                total: totalUpfront
            },
            ongoing: {
                tenureFeePerMonth,
                totalTenureFees,
                collectionFeePerMonth,
                totalCollectionFees
            },
            netReceived,
            totalPlatformFees,
            effectiveFeePercentage: (totalPlatformFees / loanAmount) * 100
        };
    },
    
    /**
     * Calculate lender fees
     * @param {number} investmentAmount - Amount to invest
     * @param {number} returns - Expected returns
     * @param {number} termMonths - Term in months
     * @param {boolean} includeInsurance - Whether investor chose insurance (default: false)
     */
    calculateLenderFees(investmentAmount, returns, termMonths, includeInsurance = false) {
        const fees = this.platformFees.lender;
        
        // Upfront fees
        const serviceFee = investmentAmount * fees.serviceFee;
        const insuranceFee = includeInsurance ? (investmentAmount * fees.insuranceFee) : 0;
        const totalUpfront = serviceFee + insuranceFee;
        const totalPaid = investmentAmount + totalUpfront;
        
        // No ongoing fees - collection fee removed
        const collectionFeeTotal = 0;
        const netReturns = returns; // No deductions
        
        const totalFees = totalUpfront; // Only upfront fees
        const netProfit = netReturns - totalPaid;
        const roi = (netProfit / totalPaid) * 100;
        
        return {
            upfront: {
                serviceFee,
                insuranceFee,
                insuranceOptional: !includeInsurance,
                total: totalUpfront
            },
            ongoing: {
                collectionFee: 0, // REMOVED
                note: 'No ongoing fees for lenders'
            },
            totalPaid,
            grossReturns: returns,
            netReturns,
            totalFees,
            netProfit,
            roi,
            insuranceIncluded: includeInsurance
        };
    },
    
    /**
     * Format currency with fees breakdown
     */
    formatWithFees(amount, fees) {
        return `$${amount.toFixed(2)} (Fees: $${fees.toFixed(2)})`;
    },
    
    /**
     * Get lender fee breakdown text
     */
    getLenderFeeBreakdown(investmentAmount, includeInsurance = false) {
        const serviceFee = investmentAmount * this.platformFees.lender.serviceFee;
        const insuranceFee = includeInsurance ? (investmentAmount * this.platformFees.lender.insuranceFee) : 0;
        const total = serviceFee + insuranceFee;
        
        let breakdown = `Service Fee (10%): $${serviceFee.toFixed(2)}`;
        if (includeInsurance) {
            breakdown += `\nInsurance Fee (5%, Optional): $${insuranceFee.toFixed(2)}`;
        } else {
            breakdown += `\nInsurance Fee: Not selected (Optional)`;
        }
        breakdown += `\nTotal Upfront: $${total.toFixed(2)}`;
        
        return breakdown;
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

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
                const container = document.getElementById('portfolioCardsContainer');
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

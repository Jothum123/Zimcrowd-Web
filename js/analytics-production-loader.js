/**
 * Analytics Production Loader
 * Replaces static analytics data with real backend data
 */

class AnalyticsProductionLoader {
    constructor() {
        this.apiBase = window.API_CONFIG?.baseURL || 'https://zimcrowd-api.onrender.com/api';
        this.charts = {};
        this.currentTimeframe = '30d';
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = true;
        this.refreshRate = 60000; // 60 seconds for analytics
        this.analyticsData = null;
        this.lastUpdate = null;
    }

    async init() {
        console.log('📊 Initializing Analytics Production Loader...');
        
        try {
            // Load all analytics data
            await this.loadAllAnalytics();
            
            // Initialize charts
            this.initializeCharts();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start auto-refresh
            this.startAutoRefresh();
            
            console.log('✅ Analytics Production Loader ready');
        } catch (error) {
            console.error('❌ Error initializing analytics:', error);
            this.showError('Failed to load analytics. Please refresh the page.');
        }
    }

    async loadAllAnalytics() {
        try {
            console.log('📊 Loading analytics data...');
            this.showLoadingState();
            
            // Load all analytics data in parallel from production API
            const results = await Promise.allSettled([
                this.loadOverviewStats(),
                this.loadPortfolioPerformance(),
                this.loadLoanDistribution(),
                this.loadMonthlyActivity(),
                this.loadInvestmentBreakdown(),
                this.loadRevenueAnalytics()
            ]);

            // Extract successful results
            const [overview, portfolio, loans, activity, investments, revenue] = results.map(r => 
                r.status === 'fulfilled' ? r.value : null
            );

            // Store data
            this.analyticsData = {
                overview: overview?.data || {},
                portfolio: portfolio?.data || {},
                loans: loans?.data || {},
                activity: activity?.data || {},
                investments: investments?.data || {},
                revenue: revenue?.data || {},
                lastUpdated: new Date()
            };

            // Update all displays
            this.updateOverviewCards();
            this.updatePortfolioChart();
            this.updateLoanDistributionChart();
            this.updateMonthlyActivityChart();
            this.updateInvestmentBreakdown();
            this.updateRevenueMetrics();
            this.updateLastRefreshTime();
            
            this.hideLoadingState();
            this.lastUpdate = new Date();
            
            console.log('✅ Analytics data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading analytics:', error);
            this.hideLoadingState();
            this.showError('Failed to load analytics data');
        }
    }

    // ========== PRODUCTION API METHODS ==========
    
    /**
     * Load overview statistics
     */
    async loadOverviewStats() {
        return await this.apiRequest('/analytics/overview');
    }
    
    /**
     * Load portfolio performance data
     */
    async loadPortfolioPerformance() {
        const days = this.getTimeframeDays();
        return await this.apiRequest(`/analytics/portfolio-performance?days=${days}`);
    }
    
    /**
     * Load loan distribution data
     */
    async loadLoanDistribution() {
        return await this.apiRequest('/analytics/loan-distribution');
    }
    
    /**
     * Load monthly activity data
     */
    async loadMonthlyActivity() {
        return await this.apiRequest('/analytics/monthly-activity?months=6');
    }
    
    /**
     * Load investment breakdown
     */
    async loadInvestmentBreakdown() {
        return await this.apiRequest('/analytics/investment-breakdown');
    }
    
    /**
     * Load revenue analytics
     */
    async loadRevenueAnalytics() {
        return await this.apiRequest('/analytics/revenue');
    }
    
    /**
     * API request helper
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
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    }
    
    /**
     * Get auth token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || 
               localStorage.getItem('token') || 
               localStorage.getItem('access_token');
    }
    
    /**
     * Get timeframe in days
     */
    getTimeframeDays() {
        const timeframes = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        };
        return timeframes[this.currentTimeframe] || 30;
    }
    
    // ========== UI UPDATE METHODS ==========
    
    updateOverviewCards() {
        if (!this.analyticsData?.overview) return;

        const data = this.analyticsData.overview;

        // Update existing dashboard cards with production data
        this.updateCard('portfolioGrowth', `+${(data.portfolio_growth || 0).toFixed(1)}%`);
        this.updateCard('totalReturns', this.formatCurrency(data.total_returns || 0));
        this.updateCard('avgReturnRate', `${(data.average_roi || 0).toFixed(1)}%`);
        this.updateCard('riskScore', data.risk_score || 'Low');
    }

    updateCard(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 500);
        }
    }

    updateRecentActivity(activities) {
        const container = document.getElementById('recent-activity-list');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <h4>${activity.description || activity.type}</h4>
                    <p>${new Date(activity.created_at).toLocaleString()}</p>
                </div>
                <div class="activity-amount ${activity.amount > 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(Math.abs(activity.amount))}
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'deposit': 'fa-arrow-down',
            'withdrawal': 'fa-arrow-up',
            'loan': 'fa-hand-holding-usd',
            'investment': 'fa-chart-line',
            'payment': 'fa-credit-card',
            'transfer': 'fa-exchange-alt'
        };
        return icons[type] || 'fa-circle';
    }

    initializeCharts() {
        // Portfolio Performance Chart
        this.createPortfolioChart();
        
        // Loan Distribution Chart
        this.createLoanDistributionChart();
        
        // Monthly Activity Chart
        this.createMonthlyActivityChart();
        
        // Investment Breakdown Chart
        this.createInvestmentBreakdownChart();
    }

    createPortfolioChart() {
        const canvas = document.getElementById('portfolioChart');
        if (!canvas || !this.analyticsData?.portfolio) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.portfolio.history || [];

        // Destroy existing chart
        if (this.charts.portfolio) {
            this.charts.portfolio.destroy();
        }

        this.charts.portfolio = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.date).toLocaleDateString()),
                datasets: [{
                    label: 'Portfolio Value',
                    data: data.map(d => d.value),
                    borderColor: '#38e77b',
                    backgroundColor: 'rgba(56, 231, 123, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: (context) => {
                                return `Value: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    createLoanDistributionChart() {
        const canvas = document.getElementById('allocationChart');
        if (!canvas || !this.analyticsData?.loans) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.loans;

        // Destroy existing chart
        if (this.charts.loanDistribution) {
            this.charts.loanDistribution.destroy();
        }

        const statuses = ['Active', 'Completed', 'Defaulted'];
        const values = [
            data.active || 0,
            data.completed || 0,
            data.defaulted || 0
        ];

        this.charts.loanDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#38e77b',
                        '#3b82f6',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    createMonthlyActivityChart() {
        const canvas = document.getElementById('monthly-activity-chart');
        if (!canvas || !this.analyticsData.monthlyActivity) return;

        const ctx = canvas.getContext('2d');
        const data = this.analyticsData.monthlyActivity;

        // Destroy existing chart
        if (this.charts.monthlyActivity) {
            this.charts.monthlyActivity.destroy();
        }

        this.charts.monthlyActivity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.months || [],
                datasets: [
                    {
                        label: 'Income',
                        data: data.income || [],
                        backgroundColor: '#38e77b',
                        borderRadius: 8
                    },
                    {
                        label: 'Expenses',
                        data: data.expenses || [],
                        backgroundColor: '#ef4444',
                        borderRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    createInvestmentBreakdownChart() {
        const canvas = document.getElementById('investment-breakdown-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.charts.investmentBreakdown) {
            this.charts.investmentBreakdown.destroy();
        }

        // Calculate investment breakdown from overview data
        const investments = this.analyticsData.overview?.investments || {};
        
        this.charts.investmentBreakdown = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Active Investments', 'Completed', 'Pending'],
                datasets: [{
                    data: [
                        investments.totalAmount || 0,
                        investments.totalReturns || 0,
                        0
                    ],
                    backgroundColor: [
                        '#38e77b',
                        '#3b82f6',
                        '#f59e0b'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `${context.label}: ${this.formatCurrency(context.parsed)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        if (this.charts.portfolio) this.createPortfolioChart();
        if (this.charts.loanDistribution) this.createLoanDistributionChart();
        if (this.charts.monthlyActivity) this.createMonthlyActivityChart();
        if (this.charts.investmentBreakdown) this.createInvestmentBreakdownChart();
    }
    
    updatePortfolioChart() {
        if (!this.analyticsData?.portfolio) return;
        this.createPortfolioChart();
    }
    
    updateLoanDistributionChart() {
        if (!this.analyticsData?.loans) return;
        this.createLoanDistributionChart();
    }
    
    updateMonthlyActivityChart() {
        if (!this.analyticsData?.activity) return;
        this.createMonthlyActivityChart();
    }
    
    updateInvestmentBreakdown() {
        if (!this.analyticsData?.investments) return;
        
        const container = document.getElementById('investment-breakdown-container');
        if (!container) return;
        
        const data = this.analyticsData.investments;
        const breakdown = data.breakdown || [];
        
        if (breakdown.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No investment data available</p></div>';
            return;
        }
        
        container.innerHTML = breakdown.map(item => `
            <div class="breakdown-item">
                <div class="breakdown-label">${item.category}</div>
                <div class="breakdown-bar">
                    <div class="breakdown-fill" style="width: ${item.percentage}%; background: ${item.color}"></div>
                </div>
                <div class="breakdown-value">${this.formatCurrency(item.amount)} (${item.percentage}%)</div>
            </div>
        `).join('');
    }
    
    updateRevenueMetrics() {
        if (!this.analyticsData?.revenue) return;
        
        const data = this.analyticsData.revenue;
        
        this.updateCard('analytics-total-revenue', this.formatCurrency(data.total_revenue || 0));
        this.updateCard('analytics-borrower-fees', this.formatCurrency(data.borrower_fees || 0));
        this.updateCard('analytics-lender-fees', this.formatCurrency(data.lender_fees || 0));
        this.updateCard('analytics-monthly-revenue', this.formatCurrency(data.monthly_revenue || 0));
    }
    
    updateLastRefreshTime() {
        const element = document.getElementById('analytics-last-update');
        if (element && this.lastUpdate) {
            const timeAgo = this.getTimeAgo(this.lastUpdate);
            element.textContent = `Last updated ${timeAgo}`;
        }
    }
    
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }

    setupEventListeners() {
        // Timeframe selector
        document.querySelectorAll('[data-timeframe]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const timeframe = e.target.dataset.timeframe;
                await this.changeTimeframe(timeframe);
            });
        });

        // Refresh button
        const refreshBtn = document.getElementById('refresh-analytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAllAnalytics());
        }

        // Export button
        const exportBtn = document.getElementById('export-analytics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportAnalytics());
        }
    }

    async changeTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        
        const days = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        }[timeframe] || 30;

        try {
            this.showLoadingState();
            const portfolioHistory = await this.dataManager.loadPortfolioHistory(days);
            this.analyticsData.portfolioHistory = portfolioHistory;
            this.createPortfolioChart();
            this.hideLoadingState();
        } catch (error) {
            console.error('❌ Error changing timeframe:', error);
            this.hideLoadingState();
        }
    }

    exportAnalytics() {
        const data = {
            overview: this.analyticsData.overview,
            exportedAt: new Date().toISOString(),
            timeframe: this.currentTimeframe
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zimcrowd-analytics-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showSuccess('Analytics exported successfully!');
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    showLoadingState() {
        const loader = document.getElementById('analytics-loader');
        if (loader) loader.style.display = 'block';
    }

    hideLoadingState() {
        const loader = document.getElementById('analytics-loader');
        if (loader) loader.style.display = 'none';
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    /**
     * Start auto-refresh for analytics
     */
    startAutoRefresh() {
        if (!this.autoRefreshEnabled || this.autoRefreshInterval) return;
        
        console.log('🔄 Starting analytics auto-refresh (60s interval)...');
        
        this.autoRefreshInterval = setInterval(async () => {
            try {
                // Only refresh if analytics section is visible
                const analyticsSection = document.getElementById('analytics-section');
                if (analyticsSection && !analyticsSection.classList.contains('hidden')) {
                    await this.loadAllAnalytics();
                    this.updateCharts();
                    console.log('✅ Analytics refreshed');
                }
            } catch (error) {
                console.error('❌ Auto-refresh error:', error);
            }
        }, this.refreshRate);
    },
    
    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            console.log('⏸️ Analytics auto-refresh stopped');
        }
    },
    
    /**
     * Calculate platform fees for analytics display
     */
    calculatePlatformRevenue(loans, investments) {
        let totalRevenue = 0;
        
        // Borrower fees (from loans)
        loans.forEach(loan => {
            const amount = parseFloat(loan.amount || 0);
            const termMonths = parseInt(loan.term_months || 3);
            const monthlyPayment = parseFloat(loan.monthly_payment || 0);
            
            // Upfront fees: 15% (10% service + 5% insurance)
            const upfrontFees = amount * 0.15;
            
            // Tenure fees: 1% per month
            const tenureFees = amount * 0.01 * termMonths;
            
            // Collection fees: 5% of monthly payment
            const collectionFees = monthlyPayment * 0.05 * termMonths;
            
            totalRevenue += upfrontFees + tenureFees + collectionFees;
        });
        
        // Lender fees (from investments)
        investments.forEach(inv => {
            const amount = parseFloat(inv.amount || 0);
            const hasInsurance = inv.insurance_opted || false;
            
            // Upfront fees: 10% service + 5% insurance (if opted)
            const serviceFee = amount * 0.10;
            const insuranceFee = hasInsurance ? (amount * 0.05) : 0;
            const upfrontFees = serviceFee + insuranceFee;
            
            // No ongoing fees - collection fee removed
            
            totalRevenue += upfrontFees;
        });
        
        return totalRevenue;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.analyticsLoader = new AnalyticsProductionLoader();
        window.analyticsLoader.init();
    });
} else {
    window.analyticsLoader = new AnalyticsProductionLoader();
    window.analyticsLoader.init();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.analyticsLoader) {
        window.analyticsLoader.stopAutoRefresh();
    }
});

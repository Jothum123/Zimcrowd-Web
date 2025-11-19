/**
 * ZimCrowd Analytics Module
 * Handles analytics dashboard, charts, and financial insights
 */

class AnalyticsModule {
    constructor() {
        this.charts = {};
        this.analyticsData = null;
        this.timeframes = {
            '7d': 7,
            '30d': 30,
            '90d': 90,
            '1y': 365
        };
    }

    async initialize() {
        console.log('📊 Initializing Analytics Module...');
        
        try {
            await this.loadAnalyticsData();
            this.initializeCharts();
            this.setupEventListeners();
            this.updateAnalyticsDisplay();
            
            console.log('✅ Analytics Module initialized');
        } catch (error) {
            console.error('❌ Analytics initialization error:', error);
            this.showError('Failed to load analytics data');
        }
    }

    async loadAnalyticsData() {
        try {
            const [portfolioData, transactionData, insightsData] = await Promise.all([
                DashboardData.getPortfolioAnalytics(),
                DashboardData.getTransactionAnalytics(),
                DashboardData.getFinancialInsights()
            ]);

            this.analyticsData = {
                portfolio: portfolioData,
                transactions: transactionData,
                insights: insightsData,
                lastUpdated: new Date()
            };

        } catch (error) {
            console.error('Error loading analytics data:', error);
            // Use mock data for development
            this.analyticsData = this.getMockAnalyticsData();
        }
    }

    initializeCharts() {
        // Portfolio Performance Chart
        this.createPortfolioChart();
        
        // Income vs Expenses Chart
        this.createIncomeChart();
        
        // Investment Breakdown Chart
        this.createInvestmentBreakdownChart();
        
        // Spending Categories Chart
        this.createSpendingChart();
    }

    createPortfolioChart() {
        const ctx = document.getElementById('portfolioChart');
        if (!ctx) return;

        const data = this.getPortfolioChartData();
        
        this.charts.portfolio = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Portfolio Value',
                    data: data.values,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
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
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createIncomeChart() {
        const ctx = document.getElementById('incomeChart');
        if (!ctx) return;

        const data = this.getIncomeChartData();
        
        this.charts.income = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Income',
                    data: data.income,
                    backgroundColor: '#4ade80',
                    borderRadius: 4
                }, {
                    label: 'Expenses',
                    data: data.expenses,
                    backgroundColor: '#f87171',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    createInvestmentBreakdownChart() {
        const ctx = document.getElementById('investmentBreakdownChart');
        if (!ctx) return;

        const data = this.getInvestmentBreakdownData();
        
        this.charts.investmentBreakdown = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#667eea',
                        '#764ba2',
                        '#f093fb',
                        '#f5576c',
                        '#4facfe',
                        '#00f2fe'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        this.updateInvestmentLegend(data);
    }

    createSpendingChart() {
        const ctx = document.getElementById('spendingChart');
        if (!ctx) return;

        const data = this.getSpendingData();
        
        this.charts.spending = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#ef4444',
                        '#f97316',
                        '#eab308',
                        '#22c55e',
                        '#06b6d4',
                        '#8b5cf6',
                        '#ec4899'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });

        this.updateSpendingList(data);
    }

    updateInvestmentLegend(data) {
        const legendContainer = document.getElementById('investmentLegend');
        if (!legendContainer) return;

        const total = data.values.reduce((sum, value) => sum + value, 0);
        
        let html = '';
        data.labels.forEach((label, index) => {
            const value = data.values[index];
            const percentage = ((value / total) * 100).toFixed(1);
            const color = this.charts.investmentBreakdown.data.datasets[0].backgroundColor[index];
            
            html += `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${color}"></div>
                    <div class="legend-label">${label}</div>
                    <div class="legend-value">$${value.toLocaleString()} (${percentage}%)</div>
                </div>
            `;
        });

        legendContainer.innerHTML = html;
    }

    updateSpendingList(data) {
        const listContainer = document.getElementById('spendingList');
        if (!listContainer) return;

        const total = data.values.reduce((sum, value) => sum + value, 0);
        
        let html = '';
        data.labels.forEach((label, index) => {
            const value = data.values[index];
            const percentage = ((value / total) * 100).toFixed(1);
            const color = this.charts.spending.data.datasets[0].backgroundColor[index];
            
            html += `
                <div class="spending-item">
                    <div class="spending-color" style="background-color: ${color}"></div>
                    <div class="spending-details">
                        <div class="spending-category">${label}</div>
                        <div class="spending-amount">$${value.toLocaleString()} (${percentage}%)</div>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    }

    setupEventListeners() {
        // Portfolio timeframe selector
        const portfolioTimeframe = document.getElementById('portfolioTimeframe');
        if (portfolioTimeframe) {
            portfolioTimeframe.addEventListener('change', (e) => {
                this.updatePortfolioChart(e.target.value);
            });
        }

        // Income timeframe selector
        const incomeTimeframe = document.getElementById('incomeTimeframe');
        if (incomeTimeframe) {
            incomeTimeframe.addEventListener('change', (e) => {
                this.updateIncomeChart(e.target.value);
            });
        }
    }

    updateAnalyticsDisplay() {
        this.updateOverviewStats();
        this.updateFinancialHealthScore();
        this.updateInsights();
    }

    updateOverviewStats() {
        const data = this.analyticsData;
        
        // Update portfolio value
        this.updateElement('totalPortfolioValue', this.formatCurrency(data.portfolio?.totalValue || 0));
        this.updateElement('portfolioChange', this.formatPercentage(data.portfolio?.monthlyChange || 0));
        
        // Update monthly income
        this.updateElement('monthlyIncome', this.formatCurrency(data.transactions?.monthlyIncome || 0));
        this.updateElement('incomeChange', this.formatPercentage(data.transactions?.incomeChange || 0));
        
        // Update transaction stats
        this.updateElement('totalTransactions', data.transactions?.totalCount || 0);
        this.updateElement('transactionVolume', this.formatCurrency(data.transactions?.totalVolume || 0));
        
        // Update credit score
        this.updateElement('creditScore', data.insights?.creditScore || 0);
        this.updateElement('creditChange', '+' + (data.insights?.creditChange || 0));
    }

    updateFinancialHealthScore() {
        const insights = this.analyticsData.insights || {};
        
        // Update health score
        const healthScore = insights.healthScore || 0;
        this.updateElement('healthScore', healthScore);
        
        // Update health score label
        const scoreLabel = this.getHealthScoreLabel(healthScore);
        this.updateElement('healthScoreBadge', '', (el) => {
            el.className = `score-badge ${scoreLabel.class}`;
            el.querySelector('.score-label').textContent = scoreLabel.label;
        });
        
        // Update metrics
        this.updateMetric('debtRatio', insights.debtToIncomeRatio || 0);
        this.updateMetric('savingsRate', insights.savingsRate || 0);
        this.updateMetric('diversification', insights.diversificationScore || 0);
        this.updateMetric('paymentHistory', insights.paymentHistoryScore || 0);
    }

    updateMetric(metricName, value) {
        const fillElement = document.getElementById(metricName + 'Fill');
        const valueElement = document.getElementById(metricName);
        
        if (fillElement) {
            fillElement.style.width = value + '%';
            fillElement.className = `metric-fill ${this.getMetricClass(value)}`;
        }
        
        if (valueElement) {
            valueElement.textContent = value + '%';
        }
    }

    updateInsights() {
        const insightsContainer = document.getElementById('analyticsInsights');
        if (!insightsContainer) return;

        const insights = this.analyticsData.insights?.aiInsights || [];
        
        if (insights.length === 0) {
            insightsContainer.innerHTML = '<p class="no-data">No insights available at the moment.</p>';
            return;
        }

        let html = '';
        insights.forEach(insight => {
            html += `
                <div class="insight-item ${insight.type}">
                    <div class="insight-icon">
                        <i class="fas ${this.getInsightIcon(insight.type)}"></i>
                    </div>
                    <div class="insight-content">
                        <h4 class="insight-title">${insight.title}</h4>
                        <p class="insight-description">${insight.description}</p>
                        ${insight.action ? `<button class="btn btn-sm btn-outline" onclick="AnalyticsModule.handleInsightAction('${insight.action}')">${insight.actionText}</button>` : ''}
                    </div>
                </div>
            `;
        });

        insightsContainer.innerHTML = html;
    }

    // Chart data methods
    getPortfolioChartData(timeframe = '30d') {
        const days = this.timeframes[timeframe];
        const data = this.analyticsData.portfolio?.performanceData || [];
        
        return {
            labels: this.generateDateLabels(days),
            values: this.generatePortfolioValues(days, data)
        };
    }

    getIncomeChartData(timeframe = '30d') {
        const data = this.analyticsData.transactions?.monthlyData || [];
        
        return {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            income: [5000, 5200, 4800, 5500, 5300, 5600],
            expenses: [3200, 3400, 3100, 3600, 3300, 3500]
        };
    }

    getInvestmentBreakdownData() {
        const investments = this.analyticsData.portfolio?.breakdown || [];
        
        return {
            labels: ['Stocks', 'Bonds', 'Real Estate', 'Crypto', 'Commodities'],
            values: [45000, 25000, 15000, 8000, 7000]
        };
    }

    getSpendingData() {
        const spending = this.analyticsData.transactions?.spendingByCategory || [];
        
        return {
            labels: ['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Other'],
            values: [800, 400, 600, 500, 300, 200, 200]
        };
    }

    // Utility methods
    updatePortfolioChart(timeframe) {
        if (!this.charts.portfolio) return;
        
        const data = this.getPortfolioChartData(timeframe);
        this.charts.portfolio.data.labels = data.labels;
        this.charts.portfolio.data.datasets[0].data = data.values;
        this.charts.portfolio.update();
    }

    updateIncomeChart(timeframe) {
        if (!this.charts.income) return;
        
        const data = this.getIncomeChartData(timeframe);
        this.charts.income.data.labels = data.labels;
        this.charts.income.data.datasets[0].data = data.income;
        this.charts.income.data.datasets[1].data = data.expenses;
        this.charts.income.update();
    }

    generateDateLabels(days) {
        const labels = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        }
        
        return labels;
    }

    generatePortfolioValues(days, data) {
        // Generate mock portfolio values for demonstration
        const baseValue = 100000;
        const values = [];
        
        for (let i = 0; i < days; i++) {
            const variation = (Math.random() - 0.5) * 5000;
            const trend = i * 100; // Slight upward trend
            values.push(baseValue + trend + variation);
        }
        
        return values;
    }

    getHealthScoreLabel(score) {
        if (score >= 90) return { label: 'Excellent', class: 'excellent' };
        if (score >= 80) return { label: 'Very Good', class: 'very-good' };
        if (score >= 70) return { label: 'Good', class: 'good' };
        if (score >= 60) return { label: 'Fair', class: 'fair' };
        return { label: 'Poor', class: 'poor' };
    }

    getMetricClass(value) {
        if (value >= 80) return 'excellent';
        if (value >= 60) return 'good';
        if (value >= 40) return 'fair';
        return 'poor';
    }

    getInsightIcon(type) {
        const icons = {
            'opportunity': 'fa-lightbulb',
            'warning': 'fa-exclamation-triangle',
            'achievement': 'fa-trophy',
            'recommendation': 'fa-chart-line'
        };
        return icons[type] || 'fa-info-circle';
    }

    updateElement(id, value, callback = null) {
        const element = document.getElementById(id);
        if (element) {
            if (callback) {
                callback(element);
            } else {
                element.textContent = value;
            }
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatPercentage(value) {
        return (value > 0 ? '+' : '') + value.toFixed(1) + '%';
    }

    getMockAnalyticsData() {
        return {
            portfolio: {
                totalValue: 125000,
                monthlyChange: 8.5,
                performanceData: [],
                breakdown: []
            },
            transactions: {
                monthlyIncome: 5500,
                incomeChange: 12.3,
                totalCount: 156,
                totalVolume: 45000,
                monthlyData: [],
                spendingByCategory: []
            },
            insights: {
                creditScore: 785,
                creditChange: 15,
                healthScore: 85,
                debtToIncomeRatio: 25,
                savingsRate: 20,
                diversificationScore: 75,
                paymentHistoryScore: 95,
                aiInsights: [
                    {
                        type: 'opportunity',
                        title: 'Investment Opportunity',
                        description: 'Consider diversifying your portfolio with international stocks to reduce risk.',
                        action: 'view_investments',
                        actionText: 'View Recommendations'
                    },
                    {
                        type: 'achievement',
                        title: 'Savings Goal Achieved',
                        description: 'Congratulations! You\'ve reached your monthly savings target of $1,000.',
                        action: null,
                        actionText: null
                    }
                ]
            }
        };
    }

    showError(message) {
        console.error('Analytics Error:', message);
        // Show error in UI
        const sections = ['analyticsInsights', 'investmentLegend', 'spendingList'];
        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.innerHTML = `<p class="error-message">Error: ${message}</p>`;
            }
        });
    }

    static handleInsightAction(action) {
        switch (action) {
            case 'view_investments':
                showSection('investments');
                break;
            case 'view_loans':
                showSection('loans');
                break;
            case 'view_budget':
                showSection('transactions');
                break;
            default:
                console.log('Unknown insight action:', action);
        }
    }
}

// Initialize analytics module when dashboard loads
window.AnalyticsModule = new AnalyticsModule();

// Auto-initialize when section becomes active
document.addEventListener('sectionChanged', (event) => {
    if (event.detail.section === 'analytics') {
        window.AnalyticsModule.initialize();
    }
});

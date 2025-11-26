/**
 * Dashboard Charts Module
 * Handles all chart visualizations using Chart.js
 */

const DashboardCharts = {
    charts: {},
    
    /**
     * Initialize all charts
     */
    async init() {
        console.log('📊 Initializing Dashboard Charts...');
        
        try {
            // Wait for Chart.js to be loaded
            if (typeof Chart === 'undefined') {
                console.warn('⚠️ Chart.js not loaded yet, retrying...');
                setTimeout(() => this.init(), 500);
                return;
            }

            // Set default Chart.js options
            Chart.defaults.color = '#94a3b8';
            Chart.defaults.borderColor = '#2a2a2a';
            Chart.defaults.font.family = 'Space Grotesk, sans-serif';

            // Initialize charts
            await this.initPortfolioChart();
            await this.initLoanDistributionChart();
            await this.initMonthlyActivityChart();
            
            console.log('✅ All charts initialized');
        } catch (error) {
            console.error('❌ Error initializing charts:', error);
        }
    },

    /**
     * Portfolio Performance Chart
     */
    async initPortfolioChart() {
        const canvas = document.getElementById('portfolioChart');
        if (!canvas) {
            console.warn('⚠️ Portfolio chart canvas not found');
            return;
        }

        // Get portfolio data
        const data = await this.getPortfolioData();

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if any
        if (this.charts.portfolio) {
            this.charts.portfolio.destroy();
        }

        this.charts.portfolio = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: data.portfolioValues,
                        borderColor: '#38e77b',
                        backgroundColor: 'rgba(56, 231, 123, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Investments',
                        data: data.investmentValues,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Returns',
                        data: data.returnValues,
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += '$' + context.parsed.y.toLocaleString();
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });

        console.log('✅ Portfolio chart created');
    },

    /**
     * Loan Distribution Chart
     */
    async initLoanDistributionChart() {
        const canvas = document.getElementById('loanDistributionChart');
        if (!canvas) {
            console.warn('⚠️ Loan distribution chart canvas not found');
            return;
        }

        const data = await this.getLoanDistributionData();

        const ctx = canvas.getContext('2d');
        
        if (this.charts.loanDistribution) {
            this.charts.loanDistribution.destroy();
        }

        this.charts.loanDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        '#38e77b',
                        '#3b82f6',
                        '#a855f7',
                        '#fb923c',
                        '#f59e0b'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
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

        console.log('✅ Loan distribution chart created');
    },

    /**
     * Monthly Activity Chart
     */
    async initMonthlyActivityChart() {
        const canvas = document.getElementById('monthlyActivityChart');
        if (!canvas) {
            console.warn('⚠️ Monthly activity chart canvas not found');
            return;
        }

        const data = await this.getMonthlyActivityData();

        const ctx = canvas.getContext('2d');
        
        if (this.charts.monthlyActivity) {
            this.charts.monthlyActivity.destroy();
        }

        this.charts.monthlyActivity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'Deposits',
                        data: data.deposits,
                        backgroundColor: 'rgba(56, 231, 123, 0.8)',
                        borderRadius: 6
                    },
                    {
                        label: 'Withdrawals',
                        data: data.withdrawals,
                        backgroundColor: 'rgba(220, 38, 38, 0.8)',
                        borderRadius: 6
                    },
                    {
                        label: 'Investments',
                        data: data.investments,
                        backgroundColor: 'rgba(168, 85, 247, 0.8)',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        console.log('✅ Monthly activity chart created');
    },

    /**
     * Get portfolio data (mock or from API)
     */
    async getPortfolioData() {
        // Try to get real data from API
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (token) {
                const response = await fetch('https://zimcrowd-api.onrender.com/api/analytics/portfolio-history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) return data.data;
                }
            }
        } catch (error) {
            console.warn('Using mock portfolio data');
        }

        // Return mock data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return {
            labels: months,
            portfolioValues: [1000, 1500, 2200, 2800, 3500, 4200],
            investmentValues: [800, 1200, 1800, 2300, 2900, 3500],
            returnValues: [200, 300, 400, 500, 600, 700]
        };
    },

    /**
     * Get loan distribution data
     */
    async getLoanDistributionData() {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (token) {
                const response = await fetch('https://zimcrowd-api.onrender.com/api/dashboard/loans', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data.loans) {
                        // Process loan data by status
                        const statusCounts = {};
                        data.data.loans.forEach(loan => {
                            statusCounts[loan.status] = (statusCounts[loan.status] || 0) + 1;
                        });
                        return {
                            labels: Object.keys(statusCounts),
                            values: Object.values(statusCounts)
                        };
                    }
                }
            }
        } catch (error) {
            console.warn('Using mock loan distribution data');
        }

        // Mock data
        return {
            labels: ['Active', 'Pending', 'Completed', 'Defaulted'],
            values: [5, 2, 8, 1]
        };
    },

    /**
     * Get monthly activity data
     */
    async getMonthlyActivityData() {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (token) {
                const response = await fetch('https://zimcrowd-api.onrender.com/api/analytics/monthly-activity', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) return data.data;
                }
            }
        } catch (error) {
            console.warn('Using mock monthly activity data');
        }

        // Mock data
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return {
            labels: months,
            deposits: [1200, 1500, 1800, 2000, 2200, 2500],
            withdrawals: [800, 900, 1000, 1100, 1200, 1300],
            investments: [400, 600, 800, 900, 1000, 1200]
        };
    },

    /**
     * Update charts with new data
     */
    async updateCharts() {
        console.log('🔄 Updating charts...');
        await this.init();
    }
};

// Initialize charts when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for other scripts to load
        setTimeout(() => DashboardCharts.init(), 1000);
    });
} else {
    setTimeout(() => DashboardCharts.init(), 1000);
}

window.DashboardCharts = DashboardCharts;

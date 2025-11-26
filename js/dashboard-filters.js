/**
 * Dashboard Filters & Search Module
 * Advanced filtering and search for transactions, loans, and investments
 */

const DashboardFilters = {
    filters: {
        transactions: {
            type: 'all',
            status: 'all',
            dateRange: 'all',
            searchQuery: ''
        },
        loans: {
            status: 'all',
            dateRange: 'all',
            searchQuery: ''
        },
        investments: {
            status: 'all',
            dateRange: 'all',
            searchQuery: ''
        }
    },

    /**
     * Initialize filters
     */
    init() {
        console.log('🔍 Initializing Dashboard Filters...');
        
        this.setupTransactionFilters();
        this.setupLoanFilters();
        this.setupInvestmentFilters();
        this.setupSearchHandlers();
        
        console.log('✅ Filters initialized');
    },

    /**
     * Setup transaction filters
     */
    setupTransactionFilters() {
        // Type filter
        const typeFilter = document.getElementById('transactionTypeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filters.transactions.type = e.target.value;
                this.applyTransactionFilters();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('transactionStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.transactions.status = e.target.value;
                this.applyTransactionFilters();
            });
        }

        // Date range filter
        const dateFilter = document.getElementById('transactionDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.transactions.dateRange = e.target.value;
                this.applyTransactionFilters();
            });
        }
    },

    /**
     * Setup loan filters
     */
    setupLoanFilters() {
        // Status filter
        const statusFilter = document.getElementById('loanStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.loans.status = e.target.value;
                this.applyLoanFilters();
            });
        }

        // Date range filter
        const dateFilter = document.getElementById('loanDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.loans.dateRange = e.target.value;
                this.applyLoanFilters();
            });
        }
    },

    /**
     * Setup investment filters
     */
    setupInvestmentFilters() {
        // Status filter
        const statusFilter = document.getElementById('investmentStatusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.investments.status = e.target.value;
                this.applyInvestmentFilters();
            });
        }

        // Date range filter
        const dateFilter = document.getElementById('investmentDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.investments.dateRange = e.target.value;
                this.applyInvestmentFilters();
            });
        }
    },

    /**
     * Setup search handlers
     */
    setupSearchHandlers() {
        // Transaction search
        const transactionSearch = document.getElementById('transactionSearch');
        if (transactionSearch) {
            transactionSearch.addEventListener('input', this.debounce((e) => {
                this.filters.transactions.searchQuery = e.target.value.toLowerCase();
                this.applyTransactionFilters();
            }, 300));
        }

        // Loan search
        const loanSearch = document.getElementById('loanSearch');
        if (loanSearch) {
            loanSearch.addEventListener('input', this.debounce((e) => {
                this.filters.loans.searchQuery = e.target.value.toLowerCase();
                this.applyLoanFilters();
            }, 300));
        }

        // Investment search
        const investmentSearch = document.getElementById('investmentSearch');
        if (investmentSearch) {
            investmentSearch.addEventListener('input', this.debounce((e) => {
                this.filters.investments.searchQuery = e.target.value.toLowerCase();
                this.applyInvestmentFilters();
            }, 300));
        }
    },

    /**
     * Apply transaction filters
     */
    async applyTransactionFilters() {
        console.log('🔍 Applying transaction filters:', this.filters.transactions);
        
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) return;

            // Build query parameters
            const params = new URLSearchParams();
            if (this.filters.transactions.type !== 'all') {
                params.append('type', this.filters.transactions.type);
            }
            if (this.filters.transactions.status !== 'all') {
                params.append('status', this.filters.transactions.status);
            }
            if (this.filters.transactions.searchQuery) {
                params.append('search', this.filters.transactions.searchQuery);
            }

            // Fetch filtered data
            const response = await fetch(`https://zimcrowd-api.onrender.com/api/dashboard/transactions?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateTransactionDisplay(data.data.transactions);
                }
            }
        } catch (error) {
            console.error('❌ Error applying transaction filters:', error);
        }
    },

    /**
     * Apply loan filters
     */
    async applyLoanFilters() {
        console.log('🔍 Applying loan filters:', this.filters.loans);
        
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) return;

            const params = new URLSearchParams();
            if (this.filters.loans.status !== 'all') {
                params.append('status', this.filters.loans.status);
            }
            if (this.filters.loans.searchQuery) {
                params.append('search', this.filters.loans.searchQuery);
            }

            const response = await fetch(`https://zimcrowd-api.onrender.com/api/dashboard/loans?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateLoanDisplay(data.data.loans);
                }
            }
        } catch (error) {
            console.error('❌ Error applying loan filters:', error);
        }
    },

    /**
     * Apply investment filters
     */
    async applyInvestmentFilters() {
        console.log('🔍 Applying investment filters:', this.filters.investments);
        
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('token');
            if (!token) return;

            const params = new URLSearchParams();
            if (this.filters.investments.status !== 'all') {
                params.append('status', this.filters.investments.status);
            }
            if (this.filters.investments.searchQuery) {
                params.append('search', this.filters.investments.searchQuery);
            }

            const response = await fetch(`https://zimcrowd-api.onrender.com/api/dashboard/investments?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.updateInvestmentDisplay(data.data.investments);
                }
            }
        } catch (error) {
            console.error('❌ Error applying investment filters:', error);
        }
    },

    /**
     * Update transaction display
     */
    updateTransactionDisplay(transactions) {
        const container = document.getElementById('walletRecentTransactions');
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>No transactions found matching your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = transactions.map(tx => `
            <div class="loan-card transaction-item" data-type="${tx.type}" data-status="${tx.status}">
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

        console.log(`✅ Updated transaction display: ${transactions.length} items`);
    },

    /**
     * Update loan display
     */
    updateLoanDisplay(loans) {
        // Implementation depends on your loan display structure
        console.log(`✅ Updated loan display: ${loans.length} items`);
    },

    /**
     * Update investment display
     */
    updateInvestmentDisplay(investments) {
        // Implementation depends on your investment display structure
        console.log(`✅ Updated investment display: ${investments.length} items`);
    },

    /**
     * Helper: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Helper: Format currency
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
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
     * Reset all filters
     */
    resetFilters(type) {
        if (type === 'transactions') {
            this.filters.transactions = {
                type: 'all',
                status: 'all',
                dateRange: 'all',
                searchQuery: ''
            };
            this.applyTransactionFilters();
        } else if (type === 'loans') {
            this.filters.loans = {
                status: 'all',
                dateRange: 'all',
                searchQuery: ''
            };
            this.applyLoanFilters();
        } else if (type === 'investments') {
            this.filters.investments = {
                status: 'all',
                dateRange: 'all',
                searchQuery: ''
            };
            this.applyInvestmentFilters();
        }
    }
};

// Initialize filters when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        DashboardFilters.init();
    });
} else {
    DashboardFilters.init();
}

window.DashboardFilters = DashboardFilters;

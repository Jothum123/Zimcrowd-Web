/**
 * Enhanced Primary Market UI
 * Displays mock loans with detailed borrower profiles, ratings, and investment options
 */

class EnhancedPrimaryMarket {
    constructor() {
        this.loans = [];
        this.filteredLoans = [];
        this.currentPage = 1;
        this.loansPerPage = 9;
        this.selectedLoan = null;
        this.init();
    }

    init() {
        // Load mock data
        this.loans = MockMarketData.generatePrimaryMarketLoans(24);
        this.filteredLoans = [...this.loans];
        
        // Render loans
        this.renderLoans();
        this.setupEventListeners();
        this.updateStats();
    }

    setupEventListeners() {
        // Filter buttons
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters')?.addEventListener('click', () => this.clearFilters());
        document.getElementById('clearFiltersEmpty')?.addEventListener('click', () => this.clearFilters());

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage')?.addEventListener('click', () => this.changePage(1));

        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('loan-modal-overlay')) {
                this.closeModal();
            }
        });

        // Close modal on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    applyFilters() {
        const minAmount = parseFloat(document.getElementById('minAmount')?.value) || 0;
        const maxAmount = parseFloat(document.getElementById('maxAmount')?.value) || Infinity;
        const maxRate = parseFloat(document.getElementById('maxRate')?.value) || Infinity;
        const minStars = parseFloat(document.getElementById('minStars')?.value) || 0;

        this.filteredLoans = this.loans.filter(loan => {
            return loan.amount >= minAmount &&
                   loan.amount <= maxAmount &&
                   loan.interestRate <= maxRate &&
                   loan.borrower.rating >= minStars;
        });

        this.currentPage = 1;
        this.renderLoans();
    }

    clearFilters() {
        document.getElementById('minAmount').value = '';
        document.getElementById('maxAmount').value = '';
        document.getElementById('maxRate').value = '';
        document.getElementById('minStars').value = '';
        
        this.filteredLoans = [...this.loans];
        this.currentPage = 1;
        this.renderLoans();
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredLoans.length / this.loansPerPage);
        const newPage = this.currentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderLoans();
            document.getElementById('loan-requests')?.scrollIntoView({ behavior: 'smooth' });
        }
    }

    updateStats() {
        const totalVolume = this.loans.reduce((sum, loan) => sum + loan.amount, 0);
        const avgRate = this.loans.reduce((sum, loan) => sum + loan.interestRate, 0) / this.loans.length;
        
        // Update stats if elements exist
        const statsContainer = document.querySelector('.market-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value">${this.loans.length}</span>
                    <span class="stat-label">Active Listings</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${MockMarketData.formatCurrency(totalVolume)}</span>
                    <span class="stat-label">Total Volume</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${avgRate.toFixed(1)}%</span>
                    <span class="stat-label">Avg Interest Rate</span>
                </div>
            `;
        }
    }

    renderLoans() {
        const container = document.getElementById('loanListings');
        if (!container) return;

        const startIndex = (this.currentPage - 1) * this.loansPerPage;
        const endIndex = startIndex + this.loansPerPage;
        const pageLoans = this.filteredLoans.slice(startIndex, endIndex);
        const totalPages = Math.ceil(this.filteredLoans.length / this.loansPerPage);

        // Show empty state if no loans
        const emptyState = document.getElementById('emptyState');
        if (pageLoans.length === 0) {
            container.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';

        // Render loan cards
        container.innerHTML = pageLoans.map(loan => this.renderLoanCard(loan)).join('');

        // Update pagination
        this.updatePagination(totalPages);

        // Add event listeners to cards
        this.attachCardListeners();
    }

    renderLoanCard(loan) {
        const progressColor = loan.fundedPercent >= 75 ? '#22c55e' : loan.fundedPercent >= 50 ? '#f59e0b' : '#3b82f6';
        
        return `
            <div class="loan-card-enhanced" data-loan-id="${loan.id}">
                <!-- Card Header with Borrower Info -->
                <div class="loan-card-header">
                    <div class="borrower-profile">
                        <div class="borrower-avatar-wrapper">
                            <div class="borrower-avatar" style="background: linear-gradient(135deg, ${loan.purpose.color}, ${loan.purpose.color}dd);">
                                ${loan.borrower.initials}
                            </div>
                            ${loan.borrower.verified ? '<span class="verified-badge" title="Verified Borrower"><i class="fas fa-check-circle"></i></span>' : ''}
                        </div>
                        <div class="borrower-details">
                            <h4 class="borrower-name">${loan.borrower.name}</h4>
                            <p class="borrower-occupation">${loan.borrower.occupation}</p>
                            <div class="borrower-rating">
                                ${MockMarketData.generateStarRating(loan.borrower.rating)}
                                <span class="rating-value">${loan.borrower.rating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="loan-amount-badge">
                        <span class="amount">${MockMarketData.formatCurrency(loan.amount)}</span>
                        <span class="term">${loan.term} months</span>
                    </div>
                </div>

                <!-- Loan Purpose & Description -->
                <div class="loan-card-body">
                    <div class="loan-purpose">
                        <i class="fas ${loan.purpose.icon}" style="color: ${loan.purpose.color};"></i>
                        <span>${loan.title}</span>
                    </div>
                    <p class="loan-description">${loan.description.substring(0, 150)}...</p>

                    <!-- Key Metrics -->
                    <div class="loan-metrics">
                        <div class="metric">
                            <span class="metric-label">Interest Rate</span>
                            <span class="metric-value" style="color: #38e77b;">${loan.interestRate}%</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Risk Level</span>
                            <span class="metric-value" style="color: ${loan.riskLevel.color};">${loan.riskLevel.level}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">ZimScore</span>
                            <span class="metric-value">${loan.borrower.zimScore}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Lenders</span>
                            <span class="metric-value">${loan.lendersCount}</span>
                        </div>
                    </div>

                    <!-- Funding Progress -->
                    <div class="funding-progress">
                        <div class="progress-header">
                            <span class="progress-label">Funding Progress</span>
                            <span class="progress-value">${loan.fundedPercent}% (${MockMarketData.formatCurrency(loan.fundedAmount)})</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${loan.fundedPercent}%; background: ${progressColor};"></div>
                        </div>
                        <div class="progress-footer">
                            <span class="time-left"><i class="fas fa-clock"></i> ${loan.daysLeft} days left</span>
                            <span class="min-investment">Min: ${MockMarketData.formatCurrency(loan.minInvestment)}</span>
                        </div>
                    </div>
                </div>

                <!-- Card Actions -->
                <div class="loan-card-actions">
                    <button class="btn-view-details" onclick="primaryMarket.showLoanDetails('${loan.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    <button class="btn-invest" onclick="primaryMarket.showInvestModal('${loan.id}')">
                        <i class="fas fa-hand-holding-usd"></i> Invest Now
                    </button>
                </div>
            </div>
        `;
    }

    updatePagination(totalPages) {
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    }

    attachCardListeners() {
        // Card click to show details
        document.querySelectorAll('.loan-card-enhanced').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    const loanId = card.dataset.loanId;
                    this.showLoanDetails(loanId);
                }
            });
        });
    }

    showLoanDetails(loanId) {
        const loan = this.loans.find(l => l.id === loanId);
        if (!loan) return;

        this.selectedLoan = loan;

        const modalHTML = `
            <div class="loan-modal-overlay" id="loanDetailModal">
                <div class="loan-modal">
                    <button class="modal-close" onclick="primaryMarket.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>

                    <!-- Modal Header -->
                    <div class="modal-header">
                        <div class="borrower-profile-large">
                            <div class="borrower-avatar-large" style="background: linear-gradient(135deg, ${loan.purpose.color}, ${loan.purpose.color}dd);">
                                ${loan.borrower.initials}
                                ${loan.borrower.verified ? '<span class="verified-badge-large"><i class="fas fa-check-circle"></i></span>' : ''}
                            </div>
                            <div class="borrower-info-large">
                                <h2>${loan.borrower.name}</h2>
                                <p>${loan.borrower.occupation} • ${loan.borrower.location}</p>
                                <div class="rating-large">
                                    ${MockMarketData.generateStarRating(loan.borrower.rating)}
                                    <span>${loan.borrower.rating.toFixed(1)} (${loan.borrower.totalLoans} loans)</span>
                                </div>
                            </div>
                        </div>
                        <div class="loan-amount-large">
                            <span class="amount">${MockMarketData.formatCurrency(loan.amount)}</span>
                            <span class="label">Loan Amount</span>
                        </div>
                    </div>

                    <!-- Modal Tabs -->
                    <div class="modal-tabs">
                        <button class="tab-btn active" onclick="primaryMarket.switchTab('overview')">Overview</button>
                        <button class="tab-btn" onclick="primaryMarket.switchTab('schedule')">Repayment Schedule</button>
                        <button class="tab-btn" onclick="primaryMarket.switchTab('borrower')">Borrower Profile</button>
                        <button class="tab-btn" onclick="primaryMarket.switchTab('documents')">Documents</button>
                    </div>

                    <!-- Tab Content -->
                    <div class="modal-content">
                        <!-- Overview Tab -->
                        <div class="tab-content active" id="tab-overview">
                            <div class="loan-overview-grid">
                                <div class="overview-card">
                                    <i class="fas ${loan.purpose.icon}" style="color: ${loan.purpose.color};"></i>
                                    <h4>${loan.title}</h4>
                                    <p>${loan.description}</p>
                                </div>

                                <div class="overview-stats">
                                    <div class="stat-row">
                                        <span class="stat-label">Interest Rate</span>
                                        <span class="stat-value highlight">${loan.interestRate}% p.a.</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Loan Term</span>
                                        <span class="stat-value">${loan.term} months</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Monthly Payment</span>
                                        <span class="stat-value">${MockMarketData.formatCurrency(loan.monthlyPayment)}</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Total Repayment</span>
                                        <span class="stat-value">${MockMarketData.formatCurrency(loan.totalRepayment)}</span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">Risk Grade</span>
                                        <span class="stat-value" style="color: ${loan.riskLevel.color};">
                                            ${loan.riskLevel.score} (${loan.riskLevel.level})
                                        </span>
                                    </div>
                                    <div class="stat-row">
                                        <span class="stat-label">ZimScore</span>
                                        <span class="stat-value">${loan.borrower.zimScore}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Funding Progress -->
                            <div class="funding-section">
                                <h4>Funding Progress</h4>
                                <div class="funding-progress-large">
                                    <div class="progress-bar-large">
                                        <div class="progress-fill" style="width: ${loan.fundedPercent}%;"></div>
                                    </div>
                                    <div class="progress-stats">
                                        <span>${MockMarketData.formatCurrency(loan.fundedAmount)} raised</span>
                                        <span>${loan.fundedPercent}%</span>
                                        <span>${MockMarketData.formatCurrency(loan.amount - loan.fundedAmount)} remaining</span>
                                    </div>
                                </div>
                                <div class="funding-info">
                                    <div class="info-item">
                                        <i class="fas fa-users"></i>
                                        <span>${loan.lendersCount} lenders</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-clock"></i>
                                        <span>${loan.daysLeft} days remaining</span>
                                    </div>
                                    <div class="info-item">
                                        <i class="fas fa-dollar-sign"></i>
                                        <span>Min investment: ${MockMarketData.formatCurrency(loan.minInvestment)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Repayment Schedule Tab -->
                        <div class="tab-content" id="tab-schedule">
                            <h4>Repayment Schedule</h4>
                            <div class="schedule-table-container">
                                <table class="schedule-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Due Date</th>
                                            <th>Principal</th>
                                            <th>Interest</th>
                                            <th>Total</th>
                                            <th>Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${loan.schedule.map(payment => `
                                            <tr>
                                                <td>${payment.installment}</td>
                                                <td>${MockMarketData.formatDate(payment.dueDate)}</td>
                                                <td>${MockMarketData.formatCurrency(payment.principal)}</td>
                                                <td>${MockMarketData.formatCurrency(payment.interest)}</td>
                                                <td><strong>${MockMarketData.formatCurrency(payment.total)}</strong></td>
                                                <td>${MockMarketData.formatCurrency(payment.balance)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Borrower Profile Tab -->
                        <div class="tab-content" id="tab-borrower">
                            <div class="borrower-profile-detailed">
                                <div class="profile-section">
                                    <h4><i class="fas fa-user"></i> Personal Information</h4>
                                    <div class="profile-grid">
                                        <div class="profile-item">
                                            <span class="label">Full Name</span>
                                            <span class="value">${loan.borrower.name}</span>
                                        </div>
                                        <div class="profile-item">
                                            <span class="label">Occupation</span>
                                            <span class="value">${loan.borrower.occupation}</span>
                                        </div>
                                        <div class="profile-item">
                                            <span class="label">Location</span>
                                            <span class="value">${loan.borrower.location}, Zimbabwe</span>
                                        </div>
                                        <div class="profile-item">
                                            <span class="label">Member Since</span>
                                            <span class="value">${MockMarketData.formatDate(loan.borrower.memberSince)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="profile-section">
                                    <h4><i class="fas fa-chart-line"></i> Credit History</h4>
                                    <div class="credit-stats">
                                        <div class="credit-stat">
                                            <span class="stat-number">${loan.borrower.totalLoans}</span>
                                            <span class="stat-label">Total Loans</span>
                                        </div>
                                        <div class="credit-stat">
                                            <span class="stat-number">${loan.borrower.repaidOnTime}</span>
                                            <span class="stat-label">Repaid On Time</span>
                                        </div>
                                        <div class="credit-stat">
                                            <span class="stat-number">${((loan.borrower.repaidOnTime / loan.borrower.totalLoans) * 100).toFixed(0)}%</span>
                                            <span class="stat-label">Success Rate</span>
                                        </div>
                                        <div class="credit-stat">
                                            <span class="stat-number">${loan.borrower.zimScore}</span>
                                            <span class="stat-label">ZimScore</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="profile-section">
                                    <h4><i class="fas fa-shield-alt"></i> Verification Status</h4>
                                    <div class="verification-status ${loan.borrower.verified ? 'verified' : 'pending'}">
                                        <i class="fas ${loan.borrower.verified ? 'fa-check-circle' : 'fa-clock'}"></i>
                                        <span>${loan.borrower.verified ? 'Fully Verified' : 'Verification Pending'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Documents Tab -->
                        <div class="tab-content" id="tab-documents">
                            <h4>Submitted Documents</h4>
                            <div class="documents-list">
                                ${loan.documents.map(doc => `
                                    <div class="document-item ${doc.status}">
                                        <div class="doc-icon">
                                            <i class="fas ${doc.icon}"></i>
                                        </div>
                                        <div class="doc-info">
                                            <span class="doc-name">${doc.name}</span>
                                            <span class="doc-status">
                                                <i class="fas ${doc.status === 'verified' ? 'fa-check-circle' : 'fa-clock'}"></i>
                                                ${doc.status === 'verified' ? 'Verified' : 'Pending Review'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer - Investment Action -->
                    <div class="modal-footer">
                        <div class="investment-calculator">
                            <label>Investment Amount</label>
                            <div class="amount-input-group">
                                <span class="currency">$</span>
                                <input type="number" id="investmentAmount" min="${loan.minInvestment}" max="${loan.maxInvestment}" 
                                       value="${loan.minInvestment}" onchange="primaryMarket.calculateReturns()">
                            </div>
                            <div class="quick-amounts">
                                <button onclick="primaryMarket.setAmount(${loan.minInvestment})">Min</button>
                                <button onclick="primaryMarket.setAmount(100)">$100</button>
                                <button onclick="primaryMarket.setAmount(250)">$250</button>
                                <button onclick="primaryMarket.setAmount(500)">$500</button>
                                <button onclick="primaryMarket.setAmount(${loan.maxInvestment})">Max</button>
                            </div>
                        </div>
                        <div class="expected-returns">
                            <div class="return-item">
                                <span class="label">Expected Monthly Return</span>
                                <span class="value" id="monthlyReturn">$0.00</span>
                            </div>
                            <div class="return-item">
                                <span class="label">Total Expected Return</span>
                                <span class="value highlight" id="totalReturn">$0.00</span>
                            </div>
                        </div>
                        <button class="btn-invest-large" onclick="primaryMarket.confirmInvestment()">
                            <i class="fas fa-hand-holding-usd"></i> Confirm Investment
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        document.getElementById('loanDetailModal')?.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Calculate initial returns
        this.calculateReturns();
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.modal-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(tabName.toLowerCase().split('-')[0])) {
                btn.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`)?.classList.add('active');
    }

    setAmount(amount) {
        const input = document.getElementById('investmentAmount');
        if (input) {
            input.value = amount;
            this.calculateReturns();
        }
    }

    calculateReturns() {
        if (!this.selectedLoan) return;

        const amount = parseFloat(document.getElementById('investmentAmount')?.value) || 0;
        const monthlyRate = this.selectedLoan.interestRate / 100 / 12;
        const monthlyReturn = amount * monthlyRate;
        const totalReturn = amount + (monthlyReturn * this.selectedLoan.term);

        document.getElementById('monthlyReturn').textContent = MockMarketData.formatCurrency(monthlyReturn);
        document.getElementById('totalReturn').textContent = MockMarketData.formatCurrency(totalReturn);
    }

    showInvestModal(loanId) {
        this.showLoanDetails(loanId);
    }

    confirmInvestment() {
        const amount = parseFloat(document.getElementById('investmentAmount')?.value) || 0;
        
        if (amount < this.selectedLoan.minInvestment) {
            alert(`Minimum investment is ${MockMarketData.formatCurrency(this.selectedLoan.minInvestment)}`);
            return;
        }

        if (amount > this.selectedLoan.maxInvestment) {
            alert(`Maximum investment is ${MockMarketData.formatCurrency(this.selectedLoan.maxInvestment)}`);
            return;
        }

        // Check if user is logged in
        const token = localStorage.getItem('token') || localStorage.getItem('supabase.auth.token');
        if (!token) {
            if (confirm('Please login to make an investment. Would you like to login now?')) {
                window.location.href = 'login.html?redirect=primary-market.html';
            }
            return;
        }

        // Show success message (in production, this would call the API)
        alert(`Investment of ${MockMarketData.formatCurrency(amount)} submitted successfully!\n\nYou will receive confirmation once the investment is processed.`);
        this.closeModal();
    }

    closeModal() {
        document.getElementById('loanDetailModal')?.remove();
        document.body.style.overflow = '';
        this.selectedLoan = null;
    }
}

// Initialize when DOM is ready
let primaryMarket;
document.addEventListener('DOMContentLoaded', () => {
    primaryMarket = new EnhancedPrimaryMarket();
});

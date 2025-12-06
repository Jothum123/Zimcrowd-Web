/**
 * Portfolio Investments Manager
 * Displays user's investment portfolio with sell-to-secondary-market functionality
 */

class PortfolioInvestmentsManager {
    constructor() {
        this.investments = [];
        this.currentPage = 1;
        this.investmentsPerPage = 6;
        this.selectedInvestment = null;
        this.init();
    }

    init() {
        // Load mock portfolio data
        this.investments = MockMarketData.generatePortfolioInvestments(12);
        
        // Render portfolio
        this.renderPortfolio();
        this.updatePortfolioStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('[data-portfolio-tab]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.portfolioTab;
                this.switchPortfolioTab(tab);
            });
        });
    }

    updatePortfolioStats() {
        const activeInvestments = this.investments.filter(inv => inv.status === 'active');
        const totalInvested = this.investments.reduce((sum, inv) => sum + inv.myInvestment, 0);
        const totalEarned = this.investments.reduce((sum, inv) => sum + parseFloat(inv.earnedSoFar), 0);
        const avgReturn = this.investments.length > 0 
            ? this.investments.reduce((sum, inv) => sum + parseFloat(inv.returnRate), 0) / this.investments.length 
            : 0;

        // Update stats elements if they exist
        const statsElements = {
            'portfolioActiveCount': activeInvestments.length,
            'portfolioTotalInvested': MockMarketData.formatCurrency(totalInvested),
            'portfolioTotalEarned': MockMarketData.formatCurrency(totalEarned),
            'portfolioAvgReturn': avgReturn.toFixed(1) + '%'
        };

        Object.entries(statsElements).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }

    renderPortfolio() {
        const container = document.getElementById('portfolioGrid');
        if (!container) return;

        const startIndex = (this.currentPage - 1) * this.investmentsPerPage;
        const endIndex = startIndex + this.investmentsPerPage;
        const pageInvestments = this.investments.slice(startIndex, endIndex);

        if (pageInvestments.length === 0) {
            container.innerHTML = `
                <div class="empty-portfolio" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                    <i class="fas fa-briefcase" style="font-size: 48px; color: #64748b; margin-bottom: 20px;"></i>
                    <h3 style="color: #94a3b8; margin-bottom: 10px;">No Investments Yet</h3>
                    <p style="color: #64748b; margin-bottom: 20px;">Start investing in loans to build your portfolio</p>
                    <a href="primary-market.html" class="btn-primary" style="display: inline-block; padding: 12px 24px; text-decoration: none;">
                        Browse Loans
                    </a>
                </div>
            `;
            return;
        }

        container.innerHTML = pageInvestments.map(inv => this.renderInvestmentCard(inv)).join('');
        this.updatePortfolioPagination();
    }

    renderInvestmentCard(investment) {
        const statusColors = {
            'active': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', icon: 'fa-check-circle' },
            'completed': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', icon: 'fa-flag-checkered' },
            'defaulted': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: 'fa-exclamation-triangle' }
        };
        const status = statusColors[investment.status] || statusColors.active;

        return `
            <div class="portfolio-investment-card" data-investment-id="${investment.id}">
                <!-- Card Header -->
                <div class="investment-card-header">
                    <div class="borrower-mini-profile">
                        <div class="borrower-avatar-mini" style="background: linear-gradient(135deg, ${investment.purpose.color}, ${investment.purpose.color}dd);">
                            ${investment.borrower.initials}
                        </div>
                        <div class="borrower-mini-info">
                            <span class="borrower-name">${investment.borrower.name}</span>
                            <span class="loan-title">${investment.title}</span>
                        </div>
                    </div>
                    <div class="investment-status" style="background: ${status.bg}; color: ${status.color};">
                        <i class="fas ${status.icon}"></i>
                        <span>${investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}</span>
                    </div>
                </div>

                <!-- Investment Details -->
                <div class="investment-card-body">
                    <div class="investment-amounts">
                        <div class="amount-item">
                            <span class="amount-label">My Investment</span>
                            <span class="amount-value">${MockMarketData.formatCurrency(investment.myInvestment)}</span>
                        </div>
                        <div class="amount-item">
                            <span class="amount-label">Ownership</span>
                            <span class="amount-value">${investment.ownershipPercent}%</span>
                        </div>
                    </div>

                    <div class="investment-metrics">
                        <div class="metric-row">
                            <span class="metric-label">Interest Rate</span>
                            <span class="metric-value" style="color: #38e77b;">${investment.interestRate}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Earned So Far</span>
                            <span class="metric-value" style="color: #22c55e;">+${MockMarketData.formatCurrency(investment.earnedSoFar)}</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Return Rate</span>
                            <span class="metric-value">${investment.returnRate}%</span>
                        </div>
                        <div class="metric-row">
                            <span class="metric-label">Remaining</span>
                            <span class="metric-value">${investment.monthsRemaining} months</span>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="loan-progress">
                        <div class="progress-info">
                            <span>Loan Progress</span>
                            <span>${investment.monthsElapsed}/${investment.term} months</span>
                        </div>
                        <div class="progress-bar-mini">
                            <div class="progress-fill-mini" style="width: ${(investment.monthsElapsed / investment.term) * 100}%;"></div>
                        </div>
                    </div>

                    <!-- Next Payment -->
                    ${investment.status === 'active' ? `
                        <div class="next-payment">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Next payment: ${MockMarketData.formatDate(investment.nextPaymentDate)}</span>
                            <span class="payment-amount">${MockMarketData.formatCurrency(investment.nextPaymentAmount)}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Card Actions -->
                <div class="investment-card-actions">
                    <button class="btn-view-investment" onclick="portfolioManager.showInvestmentDetails('${investment.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${investment.canSellOnSecondary ? `
                        <button class="btn-sell-secondary" onclick="portfolioManager.showSellModal('${investment.id}')">
                            <i class="fas fa-exchange-alt"></i> Sell on Secondary
                        </button>
                    ` : `
                        <button class="btn-sell-secondary disabled" disabled title="Cannot sell yet">
                            <i class="fas fa-lock"></i> Locked
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    updatePortfolioPagination() {
        const totalPages = Math.ceil(this.investments.length / this.investmentsPerPage);
        const paginationContainer = document.getElementById('portfolioPagination');
        
        if (paginationContainer && totalPages > 1) {
            paginationContainer.style.display = 'flex';
            
            const prevBtn = document.getElementById('portfolioPrevBtn');
            const nextBtn = document.getElementById('portfolioNextBtn');
            
            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        }
    }

    showInvestmentDetails(investmentId) {
        const investment = this.investments.find(inv => inv.id === investmentId);
        if (!investment) return;

        this.selectedInvestment = investment;

        const modalHTML = `
            <div class="investment-modal-overlay" id="investmentDetailModal">
                <div class="investment-modal">
                    <button class="modal-close" onclick="portfolioManager.closeModal()">
                        <i class="fas fa-times"></i>
                    </button>

                    <!-- Modal Header -->
                    <div class="modal-header">
                        <div class="investment-header-info">
                            <div class="borrower-avatar-large" style="background: linear-gradient(135deg, ${investment.purpose.color}, ${investment.purpose.color}dd);">
                                ${investment.borrower.initials}
                            </div>
                            <div>
                                <h2>${investment.title}</h2>
                                <p>Borrower: ${investment.borrower.name} • ${investment.borrower.occupation}</p>
                                <div class="rating-display">
                                    ${MockMarketData.generateStarRating(investment.borrower.rating)}
                                    <span>${investment.borrower.rating.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Investment Summary -->
                    <div class="modal-content">
                        <div class="investment-summary-grid">
                            <div class="summary-card highlight">
                                <span class="summary-label">My Investment</span>
                                <span class="summary-value">${MockMarketData.formatCurrency(investment.myInvestment)}</span>
                            </div>
                            <div class="summary-card">
                                <span class="summary-label">Ownership Share</span>
                                <span class="summary-value">${investment.ownershipPercent}%</span>
                            </div>
                            <div class="summary-card success">
                                <span class="summary-label">Earned So Far</span>
                                <span class="summary-value">+${MockMarketData.formatCurrency(investment.earnedSoFar)}</span>
                            </div>
                            <div class="summary-card">
                                <span class="summary-label">Expected Total</span>
                                <span class="summary-value">${MockMarketData.formatCurrency(investment.totalExpectedReturn)}</span>
                            </div>
                        </div>

                        <!-- Loan Details -->
                        <div class="loan-details-section">
                            <h4>Loan Details</h4>
                            <div class="details-grid">
                                <div class="detail-item">
                                    <span class="label">Total Loan Amount</span>
                                    <span class="value">${MockMarketData.formatCurrency(investment.totalLoanAmount)}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Interest Rate</span>
                                    <span class="value">${investment.interestRate}% p.a.</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Loan Term</span>
                                    <span class="value">${investment.term} months</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Months Elapsed</span>
                                    <span class="value">${investment.monthsElapsed} months</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Months Remaining</span>
                                    <span class="value">${investment.monthsRemaining} months</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Risk Level</span>
                                    <span class="value" style="color: ${investment.riskLevel.color};">${investment.riskLevel.level}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Payment Schedule Preview -->
                        <div class="payment-schedule-section">
                            <h4>Upcoming Payments</h4>
                            <div class="upcoming-payments">
                                ${this.generateUpcomingPayments(investment)}
                            </div>
                        </div>

                        ${investment.canSellOnSecondary ? `
                            <!-- Secondary Market Value -->
                            <div class="secondary-market-section">
                                <h4>Secondary Market</h4>
                                <div class="secondary-info">
                                    <div class="secondary-value">
                                        <span class="label">Estimated Market Value</span>
                                        <span class="value">${MockMarketData.formatCurrency(investment.secondaryMarketValue)}</span>
                                    </div>
                                    <p class="secondary-note">
                                        <i class="fas fa-info-circle"></i>
                                        You can sell this investment on the secondary market. The value is based on remaining payments and current market conditions.
                                    </p>
                                    <button class="btn-sell-large" onclick="portfolioManager.showSellModal('${investment.id}')">
                                        <i class="fas fa-exchange-alt"></i> List on Secondary Market
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        document.getElementById('investmentDetailModal')?.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';
    }

    generateUpcomingPayments(investment) {
        const payments = [];
        const baseDate = new Date();
        
        for (let i = 0; i < Math.min(3, investment.monthsRemaining); i++) {
            const paymentDate = new Date(baseDate);
            paymentDate.setMonth(paymentDate.getMonth() + i + 1);
            paymentDate.setDate(15);

            const monthlyReturn = (investment.myInvestment * investment.interestRate / 100 / 12);
            const principalPortion = investment.myInvestment / investment.term;

            payments.push(`
                <div class="payment-item">
                    <div class="payment-date">
                        <i class="fas fa-calendar"></i>
                        <span>${MockMarketData.formatDate(paymentDate.toISOString())}</span>
                    </div>
                    <div class="payment-breakdown">
                        <span class="principal">Principal: ${MockMarketData.formatCurrency(principalPortion)}</span>
                        <span class="interest">Interest: ${MockMarketData.formatCurrency(monthlyReturn)}</span>
                    </div>
                    <div class="payment-total">
                        ${MockMarketData.formatCurrency(principalPortion + monthlyReturn)}
                    </div>
                </div>
            `);
        }

        return payments.join('');
    }

    showSellModal(investmentId) {
        const investment = this.investments.find(inv => inv.id === investmentId);
        if (!investment || !investment.canSellOnSecondary) return;

        this.selectedInvestment = investment;

        const modalHTML = `
            <div class="sell-modal-overlay" id="sellModal">
                <div class="sell-modal">
                    <button class="modal-close" onclick="portfolioManager.closeSellModal()">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="sell-modal-header">
                        <i class="fas fa-exchange-alt" style="font-size: 32px; color: #38e77b;"></i>
                        <h2>Sell on Secondary Market</h2>
                        <p>List your investment for other lenders to purchase</p>
                    </div>

                    <div class="sell-modal-content">
                        <!-- Investment Summary -->
                        <div class="sell-investment-summary">
                            <div class="summary-row">
                                <span>Investment</span>
                                <span>${investment.title}</span>
                            </div>
                            <div class="summary-row">
                                <span>Original Investment</span>
                                <span>${MockMarketData.formatCurrency(investment.myInvestment)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Earned So Far</span>
                                <span style="color: #22c55e;">+${MockMarketData.formatCurrency(investment.earnedSoFar)}</span>
                            </div>
                            <div class="summary-row">
                                <span>Remaining Term</span>
                                <span>${investment.monthsRemaining} months</span>
                            </div>
                            <div class="summary-row highlight">
                                <span>Estimated Market Value</span>
                                <span>${MockMarketData.formatCurrency(investment.secondaryMarketValue)}</span>
                            </div>
                        </div>

                        <!-- Pricing Options -->
                        <div class="pricing-section">
                            <h4>Set Your Asking Price</h4>
                            <div class="price-input-group">
                                <span class="currency">$</span>
                                <input type="number" id="askingPrice" value="${investment.secondaryMarketValue}" 
                                       min="${(investment.myInvestment * 0.8).toFixed(2)}" 
                                       max="${(investment.myInvestment * 1.2).toFixed(2)}"
                                       onchange="portfolioManager.updatePriceAnalysis()">
                            </div>
                            <div class="price-suggestions">
                                <button onclick="portfolioManager.setAskingPrice(${(investment.myInvestment * 0.95).toFixed(2)})">
                                    Quick Sale (-5%)
                                </button>
                                <button onclick="portfolioManager.setAskingPrice(${investment.secondaryMarketValue})">
                                    Market Value
                                </button>
                                <button onclick="portfolioManager.setAskingPrice(${(investment.myInvestment * 1.05).toFixed(2)})">
                                    Premium (+5%)
                                </button>
                            </div>
                        </div>

                        <!-- Price Analysis -->
                        <div class="price-analysis" id="priceAnalysis">
                            <div class="analysis-item">
                                <span class="label">Your Profit/Loss</span>
                                <span class="value" id="profitLoss">$0.00</span>
                            </div>
                            <div class="analysis-item">
                                <span class="label">Platform Fee (2%)</span>
                                <span class="value" id="platformFee">$0.00</span>
                            </div>
                            <div class="analysis-item highlight">
                                <span class="label">You'll Receive</span>
                                <span class="value" id="netProceeds">$0.00</span>
                            </div>
                        </div>

                        <!-- Terms -->
                        <div class="sell-terms">
                            <label class="checkbox-label">
                                <input type="checkbox" id="acceptTerms">
                                <span>I understand that once listed, my investment will be available for purchase by other lenders. The sale is final once a buyer is found.</span>
                            </label>
                        </div>
                    </div>

                    <div class="sell-modal-footer">
                        <button class="btn-cancel" onclick="portfolioManager.closeSellModal()">Cancel</button>
                        <button class="btn-confirm-sell" onclick="portfolioManager.confirmSell()">
                            <i class="fas fa-check"></i> List for Sale
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modals
        document.getElementById('investmentDetailModal')?.remove();
        document.getElementById('sellModal')?.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.style.overflow = 'hidden';

        // Calculate initial analysis
        this.updatePriceAnalysis();
    }

    setAskingPrice(price) {
        const input = document.getElementById('askingPrice');
        if (input) {
            input.value = price;
            this.updatePriceAnalysis();
        }
    }

    updatePriceAnalysis() {
        if (!this.selectedInvestment) return;

        const askingPrice = parseFloat(document.getElementById('askingPrice')?.value) || 0;
        const originalInvestment = this.selectedInvestment.myInvestment;
        const earnedSoFar = parseFloat(this.selectedInvestment.earnedSoFar);

        const profitLoss = askingPrice - originalInvestment + earnedSoFar;
        const platformFee = askingPrice * 0.02; // 2% fee
        const netProceeds = askingPrice - platformFee;

        const profitLossEl = document.getElementById('profitLoss');
        if (profitLossEl) {
            profitLossEl.textContent = MockMarketData.formatCurrency(Math.abs(profitLoss));
            profitLossEl.style.color = profitLoss >= 0 ? '#22c55e' : '#ef4444';
            profitLossEl.textContent = (profitLoss >= 0 ? '+' : '-') + MockMarketData.formatCurrency(Math.abs(profitLoss));
        }

        document.getElementById('platformFee').textContent = MockMarketData.formatCurrency(platformFee);
        document.getElementById('netProceeds').textContent = MockMarketData.formatCurrency(netProceeds);
    }

    confirmSell() {
        const acceptTerms = document.getElementById('acceptTerms')?.checked;
        if (!acceptTerms) {
            alert('Please accept the terms to proceed.');
            return;
        }

        const askingPrice = parseFloat(document.getElementById('askingPrice')?.value) || 0;

        // Check if user is logged in
        const token = localStorage.getItem('token') || localStorage.getItem('supabase.auth.token');
        if (!token) {
            if (confirm('Please login to list your investment. Would you like to login now?')) {
                window.location.href = 'login.html?redirect=dashboard.html';
            }
            return;
        }

        // Show success message (in production, this would call the API)
        alert(`Your investment has been listed on the secondary market for ${MockMarketData.formatCurrency(askingPrice)}!\n\nYou will be notified when a buyer is found.`);
        
        this.closeSellModal();
    }

    closeModal() {
        document.getElementById('investmentDetailModal')?.remove();
        document.body.style.overflow = '';
        this.selectedInvestment = null;
    }

    closeSellModal() {
        document.getElementById('sellModal')?.remove();
        document.body.style.overflow = '';
    }

    switchPortfolioTab(tab) {
        // Update tab buttons
        document.querySelectorAll('[data-portfolio-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.portfolioTab === tab);
        });

        // Filter investments based on tab
        if (tab === 'all') {
            this.investments = MockMarketData.generatePortfolioInvestments(12);
        } else if (tab === 'active') {
            this.investments = MockMarketData.generatePortfolioInvestments(12).filter(inv => inv.status === 'active');
        } else if (tab === 'completed') {
            this.investments = MockMarketData.generatePortfolioInvestments(12).filter(inv => inv.status === 'completed');
        }

        this.currentPage = 1;
        this.renderPortfolio();
        this.updatePortfolioStats();
    }
}

// Initialize when DOM is ready
let portfolioManager;
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on dashboard page
    if (document.getElementById('portfolioGrid') || document.getElementById('investments-section')) {
        portfolioManager = new PortfolioInvestmentsManager();
    }
});

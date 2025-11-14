/**
 * P2P Secondary Market Frontend
 * Connects to /api/p2p/secondary endpoints
 */

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://zimcrowd-backend-dinsjcwze-jojola.vercel.app';

class SecondaryMarketApp {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.filters = {};
        this.token = localStorage.getItem('token');
        this.init();
    }

    init() {
        this.loadMarketStats();
        this.loadSecondaryListings();
        this.setupEventListeners();
        this.checkAuthStatus();
        
        if (this.token) {
            this.loadPortfolio();
        }
    }

    checkAuthStatus() {
        const isLoggedIn = !!this.token;
        const authSections = document.querySelectorAll('.auth-required');
        const guestSections = document.querySelectorAll('.guest-only');

        authSections.forEach(section => {
            section.style.display = isLoggedIn ? 'block' : 'none';
        });

        guestSections.forEach(section => {
            section.style.display = isLoggedIn ? 'none' : 'block';
        });
    }

    setupEventListeners() {
        // Filter buttons
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // View portfolio button
        document.getElementById('viewPortfolioBtn')?.addEventListener('click', () => {
            this.showPortfolioModal();
        });

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadSecondaryListings();
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            this.currentPage++;
            this.loadSecondaryListings();
        });
    }

    async loadMarketStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/p2p/secondary/market-stats`);
            const data = await response.json();

            if (data.success) {
                this.displayStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load market stats:', error);
        }
    }

    displayStats(stats) {
        document.getElementById('activeListings').textContent = stats.activeListings || 0;
        document.getElementById('totalVolume').textContent = `$${(stats.totalVolumeTraded || 0).toLocaleString()}`;
        document.getElementById('avgDiscount').textContent = stats.averageDiscount || '0%';
        document.getElementById('totalTransfers').textContent = stats.totalTransfers || 0;
    }

    async loadSecondaryListings() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                ...this.filters
            });

            const response = await fetch(`${API_BASE_URL}/api/p2p/secondary/browse?${params}`);
            const data = await response.json();

            if (data.success) {
                this.displayListings(data.listings);
                this.updatePagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to load listings:', error);
            this.showError('Failed to load secondary market listings');
        }
    }

    displayListings(listings) {
        const container = document.getElementById('secondaryListings');
        const emptyState = document.getElementById('emptyState');
        const loadingState = container.querySelector('.loading-state');
        
        // Hide loading state
        if (loadingState) loadingState.style.display = 'none';
        
        if (!listings || listings.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        emptyState.style.display = 'none';
        container.innerHTML = listings.map(listing => this.createListingCard(listing)).join('');

        // Add click listeners
        container.querySelectorAll('.listing-card').forEach(card => {
            card.addEventListener('click', () => {
                const listingId = card.dataset.listingId;
                this.showListingDetails(listingId);
            });
        });
    }

    createListingCard(listing) {
        const discount = listing.discount_premium || 0;
        const isDiscount = discount < 0;
        const discountClass = isDiscount ? 'discount' : 'premium';
        
        return `
            <div class="listing-card" data-listing-id="${listing.id}">
                <div class="listing-header">
                    <div class="seller-info">
                        <div class="seller-avatar">
                            ${listing.seller_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <h4>${listing.seller_name || 'Anonymous'}</h4>
                            <span class="seller-label">Seller</span>
                        </div>
                    </div>
                    <span class="badge badge-${discountClass}">
                        ${isDiscount ? '' : '+'}${discount.toFixed(2)}%
                    </span>
                </div>

                <div class="listing-body">
                    <div class="price-section">
                        <div class="price-item">
                            <span class="label">Outstanding Balance</span>
                            <span class="value">$${listing.outstanding_balance.toLocaleString()}</span>
                        </div>
                        <div class="price-item">
                            <span class="label">Asking Price</span>
                            <span class="value highlight">$${listing.asking_price.toLocaleString()}</span>
                        </div>
                    </div>

                    <div class="loan-details">
                        <div class="detail-item">
                            <i class="fas fa-percentage"></i>
                            <span>${(listing.loan_percentage * 100).toFixed(2)}% of loan</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${listing.months_remaining || 'N/A'} months left</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-chart-line"></i>
                            <span>${((listing.projected_yield || 0) * 100).toFixed(2)}% yield</span>
                        </div>
                    </div>

                    <div class="performance-info">
                        <div class="info-item">
                            <span class="label">Payment Status</span>
                            <span class="badge badge-${listing.current_payment_status === 'current' ? 'success' : 'warning'}">
                                ${listing.current_payment_status || 'Unknown'}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="label">Days Since Last Payment</span>
                            <span>${listing.days_since_last_payment || 0} days</span>
                        </div>
                    </div>
                </div>

                <div class="listing-footer">
                    <button class="btn btn-primary" onclick="secondaryMarket.makePurchaseOffer('${listing.id}', '${listing.seller_user_id}'); event.stopPropagation();">
                        <i class="fas fa-shopping-cart"></i>
                        Make Offer
                    </button>
                    <button class="btn btn-secondary" onclick="secondaryMarket.showListingDetails('${listing.id}'); event.stopPropagation();">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    updatePagination(pagination) {
        document.getElementById('currentPage').textContent = pagination.page;
        document.getElementById('totalPages').textContent = pagination.totalPages;
        
        document.getElementById('prevPage').disabled = pagination.page === 1;
        document.getElementById('nextPage').disabled = pagination.page === pagination.totalPages;
    }

    applyFilters() {
        this.filters = {
            minDiscount: document.getElementById('minDiscount')?.value || undefined,
            maxPrice: document.getElementById('maxPrice')?.value || undefined
        };

        this.currentPage = 1;
        this.loadSecondaryListings();
    }

    clearFilters() {
        this.filters = {};
        this.currentPage = 1;
        
        document.getElementById('minDiscount').value = '';
        document.getElementById('maxPrice').value = '';
        
        this.loadSecondaryListings();
    }

    async showListingDetails(listingId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/p2p/secondary/listing/${listingId}`);
            const data = await response.json();

            if (data.success) {
                this.displayListingModal(data.listing);
            }
        } catch (error) {
            console.error('Failed to load listing details:', error);
            this.showError('Failed to load listing details');
        }
    }

    displayListingModal(listing) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Loan Investment Details</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="listing-details">
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Outstanding Balance</label>
                                <value>$${listing.outstanding_balance.toLocaleString()}</value>
                            </div>
                            <div class="detail-item">
                                <label>Asking Price</label>
                                <value>$${listing.asking_price.toLocaleString()}</value>
                            </div>
                            <div class="detail-item">
                                <label>Discount/Premium</label>
                                <value class="${listing.discount_premium < 0 ? 'discount' : 'premium'}">
                                    ${listing.discount_premium > 0 ? '+' : ''}${listing.discount_premium.toFixed(2)}%
                                </value>
                            </div>
                            <div class="detail-item">
                                <label>Loan Percentage</label>
                                <value>${(listing.loan_percentage * 100).toFixed(2)}%</value>
                            </div>
                        </div>

                        <h4>Investment Performance</h4>
                        <div class="performance-grid">
                            <div class="perf-item">
                                <label>Principal Amount</label>
                                <value>$${listing.loan_investment_holdings?.principal_amount.toLocaleString() || 0}</value>
                            </div>
                            <div class="perf-item">
                                <label>Payments Received</label>
                                <value>$${listing.loan_investment_holdings?.total_payments_received.toLocaleString() || 0}</value>
                            </div>
                            <div class="perf-item">
                                <label>Interest Earned</label>
                                <value>$${listing.loan_investment_holdings?.interest_earned.toLocaleString() || 0}</value>
                            </div>
                            <div class="perf-item">
                                <label>Current Yield</label>
                                <value>${((listing.loan_investment_holdings?.current_yield || 0) * 100).toFixed(2)}%</value>
                            </div>
                        </div>

                        <h4>Purchase Offers (${listing.secondary_market_offers?.length || 0})</h4>
                        ${this.renderOffers(listing.secondary_market_offers)}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="secondaryMarket.makePurchaseOffer('${listing.id}', '${listing.seller_user_id}')">
                        Make Offer
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    renderOffers(offers) {
        if (!offers || offers.length === 0) {
            return '<p>No offers yet. Be the first to make an offer!</p>';
        }

        return offers.map(offer => `
            <div class="offer-item">
                <span>$${offer.offer_price.toLocaleString()}</span>
                <span class="badge">${offer.status}</span>
                <span>${new Date(offer.created_at).toLocaleDateString()}</span>
            </div>
        `).join('');
    }

    async makePurchaseOffer(listingId, sellerId) {
        if (!this.token) {
            this.showError('Please login to make an offer');
            window.location.href = 'login.html';
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Make Purchase Offer</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="purchaseOfferForm">
                        <div class="form-group">
                            <label>Offer Price ($)</label>
                            <input type="number" id="offerPrice" min="1" step="10" required>
                        </div>
                        <div class="form-group">
                            <label>Offer Type</label>
                            <select id="offerType">
                                <option value="full">Full Purchase</option>
                                <option value="partial">Partial Purchase</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="secondaryMarket.submitPurchaseOffer('${listingId}', '${sellerId}')">
                        Submit Offer
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async submitPurchaseOffer(listingId, sellerId) {
        const offerData = {
            listingId,
            sellerId,
            offerPrice: parseFloat(document.getElementById('offerPrice').value),
            offerType: document.getElementById('offerType').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/p2p/secondary/make-offer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(offerData)
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Purchase offer submitted successfully!');
                document.querySelector('.modal').remove();
                this.loadSecondaryListings();
            } else {
                this.showError(data.message || 'Failed to submit offer');
            }
        } catch (error) {
            console.error('Failed to submit offer:', error);
            this.showError('Failed to submit offer');
        }
    }

    async loadPortfolio() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/p2p/secondary/portfolio`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.displayPortfolio(data.portfolio, data.holdings);
            }
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        }
    }

    showPortfolioModal() {
        if (!this.token) {
            this.showError('Please login to view your portfolio');
            window.location.href = 'login.html';
            return;
        }

        this.loadPortfolio();
    }

    displayPortfolio(portfolio, holdings) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>My Investment Portfolio</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="portfolio-summary">
                        <div class="summary-card">
                            <label>Total Investments</label>
                            <value>${portfolio.total_investments || 0}</value>
                        </div>
                        <div class="summary-card">
                            <label>Total Invested</label>
                            <value>$${(portfolio.total_invested || 0).toLocaleString()}</value>
                        </div>
                        <div class="summary-card">
                            <label>Current Outstanding</label>
                            <value>$${(portfolio.current_outstanding || 0).toLocaleString()}</value>
                        </div>
                        <div class="summary-card">
                            <label>Total Received</label>
                            <value>$${(portfolio.total_received || 0).toLocaleString()}</value>
                        </div>
                        <div class="summary-card">
                            <label>Interest Earned</label>
                            <value>$${(portfolio.total_interest || 0).toLocaleString()}</value>
                        </div>
                        <div class="summary-card">
                            <label>Average Yield</label>
                            <value>${((portfolio.average_yield || 0) * 100).toFixed(2)}%</value>
                        </div>
                    </div>

                    <h3>My Holdings</h3>
                    <div class="holdings-list">
                        ${this.renderHoldings(holdings)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    renderHoldings(holdings) {
        if (!holdings || holdings.length === 0) {
            return '<p>No active holdings</p>';
        }

        return holdings.map(holding => `
            <div class="holding-card">
                <div class="holding-info">
                    <span class="holding-amount">$${holding.current_outstanding_balance.toLocaleString()}</span>
                    <span class="holding-status badge badge-${holding.status}">${holding.status}</span>
                </div>
                <div class="holding-details">
                    <span>Principal: $${holding.principal_amount.toLocaleString()}</span>
                    <span>Received: $${holding.total_payments_received.toLocaleString()}</span>
                    <span>Yield: ${((holding.current_yield || 0) * 100).toFixed(2)}%</span>
                </div>
                ${holding.is_for_sale ? '<span class="badge badge-warning">Listed for Sale</span>' : ''}
            </div>
        `).join('');
    }

    showError(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showSuccess(message) {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize app
let secondaryMarket;
document.addEventListener('DOMContentLoaded', () => {
    secondaryMarket = new SecondaryMarketApp();
});

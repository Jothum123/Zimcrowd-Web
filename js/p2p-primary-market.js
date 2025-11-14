/**
 * P2P Primary Market Frontend
 * Connects to /api/p2p/primary endpoints
 */

const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://zimcrowd-backend-dinsjcwze-jojola.vercel.app';

class PrimaryMarketApp {
    constructor() {
        this.currentPage = 1;
        this.limit = 20;
        this.filters = {};
        this.token = localStorage.getItem('token');
        this.init();
    }

    init() {
        this.loadMarketplaceStats();
        this.loadLoanListings();
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    checkAuthStatus() {
        const isLoggedIn = !!this.token;
        const authButtons = document.querySelectorAll('.auth-required');
        const guestButtons = document.querySelectorAll('.guest-only');

        authButtons.forEach(btn => {
            btn.style.display = isLoggedIn ? 'block' : 'none';
        });

        guestButtons.forEach(btn => {
            btn.style.display = isLoggedIn ? 'none' : 'block';
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

        // Create listing button
        document.getElementById('createListingBtn')?.addEventListener('click', () => {
            this.showCreateListingModal();
        });

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadLoanListings();
            }
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            this.currentPage++;
            this.loadLoanListings();
        });
    }

    async loadMarketplaceStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/p2p/primary/marketplace-stats`);
            const data = await response.json();

            if (data.success) {
                this.displayStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to load marketplace stats:', error);
        }
    }

    displayStats(stats) {
        document.getElementById('activeListings').textContent = stats.activeListings || 0;
        document.getElementById('totalVolume').textContent = `$${(stats.totalFundingVolume || 0).toLocaleString()}`;
        document.getElementById('avgRate').textContent = stats.averageInterestRate || '0%';
        document.getElementById('totalLenders').textContent = stats.totalLenders || 0;
    }

    async loadLoanListings() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.limit,
                ...this.filters
            });

            const response = await fetch(`${API_BASE_URL}/api/p2p/primary/browse?${params}`);
            const data = await response.json();

            if (data.success) {
                this.displayListings(data.listings);
                this.updatePagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to load listings:', error);
            this.showError('Failed to load loan listings');
        }
    }

    displayListings(listings) {
        const container = document.getElementById('loanListings');
        
        if (!listings || listings.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox fa-3x"></i>
                    <h3>No Loan Listings Available</h3>
                    <p>Check back later or adjust your filters</p>
                </div>
            `;
            return;
        }

        container.innerHTML = listings.map(listing => this.createListingCard(listing)).join('');

        // Add click listeners to cards
        container.querySelectorAll('.listing-card').forEach(card => {
            card.addEventListener('click', () => {
                const listingId = card.dataset.listingId;
                this.showListingDetails(listingId);
            });
        });
    }

    createListingCard(listing) {
        const fundingProgress = listing.funding_percentage || 0;
        const isFirstTime = listing.is_first_time_borrower;
        
        return `
            <div class="listing-card" data-listing-id="${listing.id}">
                <div class="listing-header">
                    <div class="borrower-info">
                        <div class="borrower-avatar">
                            ${listing.borrower_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h4>${listing.borrower_name || 'Anonymous'}</h4>
                            <div class="star-rating">
                                ${this.renderStars(listing.borrower_star_rating || 1.0)}
                                <span>${(listing.borrower_star_rating || 1.0).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    ${isFirstTime ? '<span class="badge badge-new">First-Time Borrower</span>' : ''}
                </div>

                <div class="listing-body">
                    <div class="loan-amount">
                        <span class="label">Loan Amount</span>
                        <span class="value">$${listing.amount_requested.toLocaleString()}</span>
                    </div>

                    <div class="loan-details">
                        <div class="detail-item">
                            <i class="fas fa-percentage"></i>
                            <span>${(listing.requested_interest_rate * 100).toFixed(2)}% APR</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <span>${listing.loan_term_months} months</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span>${listing.lender_offers || 0} offers</span>
                        </div>
                    </div>

                    <div class="funding-progress">
                        <div class="progress-header">
                            <span>Funding Progress</span>
                            <span>${fundingProgress.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${fundingProgress}%"></div>
                        </div>
                        <div class="progress-footer">
                            <span>$${listing.amount_funded.toLocaleString()} funded</span>
                            <span>$${listing.funding_goal.toLocaleString()} goal</span>
                        </div>
                    </div>
                </div>

                <div class="listing-footer">
                    <button class="btn btn-primary" onclick="primaryMarket.makeFundingOffer('${listing.id}'); event.stopPropagation();">
                        <i class="fas fa-hand-holding-usd"></i>
                        Make Offer
                    </button>
                    <button class="btn btn-secondary" onclick="primaryMarket.showListingDetails('${listing.id}'); event.stopPropagation();">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    updatePagination(pagination) {
        document.getElementById('currentPage').textContent = pagination.page;
        document.getElementById('totalPages').textContent = pagination.totalPages;
        
        document.getElementById('prevPage').disabled = pagination.page === 1;
        document.getElementById('nextPage').disabled = pagination.page === pagination.totalPages;
    }

    applyFilters() {
        this.filters = {
            minAmount: document.getElementById('minAmount')?.value || undefined,
            maxAmount: document.getElementById('maxAmount')?.value || undefined,
            maxInterestRate: document.getElementById('maxRate')?.value ? 
                parseFloat(document.getElementById('maxRate').value) / 100 : undefined,
            minStarRating: document.getElementById('minStars')?.value || undefined
        };

        this.currentPage = 1;
        this.loadLoanListings();
    }

    clearFilters() {
        this.filters = {};
        this.currentPage = 1;
        
        // Reset form
        document.getElementById('minAmount').value = '';
        document.getElementById('maxAmount').value = '';
        document.getElementById('maxRate').value = '';
        document.getElementById('minStars').value = '';
        
        this.loadLoanListings();
    }

    async showListingDetails(listingId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/p2p/primary/listing/${listingId}`);
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
        // Create and show modal with listing details
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Loan Details</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="listing-details">
                        <h3>${listing.borrower_name || 'Anonymous'}</h3>
                        <div class="star-rating">
                            ${this.renderStars(listing.borrower_star_rating || 1.0)}
                        </div>

                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Loan Amount</label>
                                <value>$${listing.amount_requested.toLocaleString()}</value>
                            </div>
                            <div class="detail-item">
                                <label>Interest Rate</label>
                                <value>${(listing.requested_interest_rate * 100).toFixed(2)}%</value>
                            </div>
                            <div class="detail-item">
                                <label>Term</label>
                                <value>${listing.loan_term_months} months</value>
                            </div>
                            <div class="detail-item">
                                <label>Purpose</label>
                                <value>${listing.loans?.purpose || 'Not specified'}</value>
                            </div>
                        </div>

                        <div class="offers-section">
                            <h4>Current Offers (${listing.lender_funding_offers?.length || 0})</h4>
                            ${this.renderOffers(listing.lender_funding_offers)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="primaryMarket.makeFundingOffer('${listing.id}')">
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
                <span>$${offer.offer_amount.toLocaleString()}</span>
                <span>${(offer.offered_interest_rate * 100).toFixed(2)}%</span>
                <span class="badge">${offer.status}</span>
            </div>
        `).join('');
    }

    async makeFundingOffer(listingId) {
        if (!this.token) {
            this.showError('Please login to make an offer');
            window.location.href = 'login.html';
            return;
        }

        // Show offer modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Make Funding Offer</h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="offerForm">
                        <div class="form-group">
                            <label>Offer Amount ($)</label>
                            <input type="number" id="offerAmount" min="50" step="10" required>
                            <small>Minimum: $50</small>
                        </div>
                        <div class="form-group">
                            <label>Interest Rate (%)</label>
                            <input type="number" id="offerRate" min="0" max="10" step="0.1" required>
                            <small>Range: 0% - 10%</small>
                        </div>
                        <div class="form-group">
                            <label>Offer Type</label>
                            <select id="offerType">
                                <option value="partial">Partial Funding</option>
                                <option value="full">Full Funding</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="primaryMarket.submitOffer('${listingId}')">
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

    async submitOffer(listingId) {
        const offerData = {
            listingId,
            offerAmount: parseFloat(document.getElementById('offerAmount').value),
            offeredInterestRate: parseFloat(document.getElementById('offerRate').value) / 100,
            offerType: document.getElementById('offerType').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/p2p/primary/make-offer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(offerData)
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Offer submitted successfully!');
                document.querySelector('.modal').remove();
                this.loadLoanListings();
            } else {
                this.showError(data.message || 'Failed to submit offer');
            }
        } catch (error) {
            console.error('Failed to submit offer:', error);
            this.showError('Failed to submit offer');
        }
    }

    showError(message) {
        // Show error toast/notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showSuccess(message) {
        // Show success toast/notification
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize app when DOM is ready
let primaryMarket;
document.addEventListener('DOMContentLoaded', () => {
    primaryMarket = new PrimaryMarketApp();
});

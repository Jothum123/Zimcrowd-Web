/**
 * P2P Lending Service
 * Handles Primary and Secondary Market operations for peer-to-peer lending
 */

const { supabase } = require('../utils/supabase-auth');

class P2PLendingService {
    /**
     * PRIMARY MARKET OPERATIONS
     */

    /**
     * Create a loan marketplace listing
     */
    async createLoanListing(userId, loanData) {
        try {
            // Check if user is first-time borrower
            const { data: isFirstTime } = await supabase
                .rpc('is_first_time_borrower', { borrower_id: userId });

            // Enforce cold start limits for first-time borrowers
            let amount = parseFloat(loanData.amount);
            if (isFirstTime && amount > 100) {
                return {
                    success: false,
                    message: 'First-time borrowers are limited to $50-100. Build your reputation with a smaller loan first!',
                    coldStartLimit: 100
                };
            }

            // Validate interest rate (0-10%)
            const interestRate = parseFloat(loanData.requestedInterestRate);
            if (interestRate < 0 || interestRate > 0.10) {
                return {
                    success: false,
                    message: 'Interest rate must be between 0% and 10%'
                };
            }

            // Get borrower ZimScore data
            const { data: zimscoreData } = await supabase
                .rpc('get_borrower_zimscore_data', { borrower_id: userId });

            const borrowerData = zimscoreData?.[0] || {
                internal_score: 30,
                star_rating: 1.0,
                max_loan_amount: 100,
                is_first_time: true
            };

            // Create loan record first
            const { data: loan, error: loanError } = await supabase
                .from('loans')
                .insert({
                    user_id: userId,
                    loan_type: loanData.loanType || 'personal',
                    amount: amount,
                    interest_rate: interestRate,
                    term_months: parseInt(loanData.termMonths),
                    monthly_payment: this.calculateMonthlyPayment(amount, interestRate, parseInt(loanData.termMonths)),
                    status: 'pending',
                    purpose: loanData.purpose
                })
                .select()
                .single();

            if (loanError) throw loanError;

            // Create marketplace listing
            const { data: listing, error: listingError } = await supabase
                .from('loan_marketplace_listings')
                .insert({
                    loan_id: loan.id,
                    borrower_user_id: userId,
                    amount_requested: amount,
                    purpose: loanData.purpose,
                    loan_term_months: parseInt(loanData.termMonths),
                    requested_interest_rate: interestRate,
                    max_interest_rate: loanData.maxInterestRate || interestRate + 0.02,
                    borrower_zimscore_internal: borrowerData.internal_score,
                    borrower_star_rating: borrowerData.star_rating,
                    funding_goal: amount,
                    is_first_time_borrower: borrowerData.is_first_time,
                    funding_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                    status: 'active'
                })
                .select()
                .single();

            if (listingError) throw listingError;

            return {
                success: true,
                listing,
                loan,
                isFirstTimeBorrower: borrowerData.is_first_time,
                coldStartAmount: borrowerData.is_first_time ? 100 : null
            };

        } catch (error) {
            console.error('Create loan listing error:', error);
            return {
                success: false,
                message: error.message || 'Failed to create loan listing'
            };
        }
    }

    /**
     * Browse active loan marketplace listings
     */
    async browseLoanMarketplace(filters = {}) {
        try {
            let query = supabase
                .from('active_loan_marketplace')
                .select('*');

            // Apply filters
            if (filters.minAmount) {
                query = query.gte('amount_requested', filters.minAmount);
            }
            if (filters.maxAmount) {
                query = query.lte('amount_requested', filters.maxAmount);
            }
            if (filters.maxInterestRate) {
                query = query.lte('requested_interest_rate', filters.maxInterestRate);
            }
            if (filters.minStarRating) {
                query = query.gte('borrower_star_rating', filters.minStarRating);
            }

            // Pagination
            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const offset = (page - 1) * limit;

            query = query.range(offset, offset + limit - 1);
            query = query.order('listing_date', { ascending: false });

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                success: true,
                listings: data || [],
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };

        } catch (error) {
            console.error('Browse marketplace error:', error);
            return {
                success: false,
                message: error.message || 'Failed to browse marketplace'
            };
        }
    }

    /**
     * Make a funding offer as a lender
     */
    async makeFundingOffer(lenderId, offerData) {
        try {
            // Validate interest rate (0-10%)
            const offeredRate = parseFloat(offerData.offeredInterestRate);
            if (offeredRate < 0 || offeredRate > 0.10) {
                return {
                    success: false,
                    message: 'Interest rate must be between 0% and 10%'
                };
            }

            // Check if listing exists and is active
            const { data: listing } = await supabase
                .from('loan_marketplace_listings')
                .select('*')
                .eq('id', offerData.listingId)
                .single();

            if (!listing || listing.status !== 'active') {
                return {
                    success: false,
                    message: 'Loan listing is not available'
                };
            }

            // Check if lender has sufficient balance (implement wallet check)
            const offerAmount = parseFloat(offerData.offerAmount);

            // Create funding offer
            const { data: offer, error } = await supabase
                .from('lender_funding_offers')
                .insert({
                    listing_id: offerData.listingId,
                    lender_user_id: lenderId,
                    loan_id: listing.loan_id,
                    offer_amount: offerAmount,
                    offered_interest_rate: offeredRate,
                    funding_percentage: (offerAmount / listing.funding_goal) * 100,
                    offer_type: offerData.offerType || 'partial',
                    auto_fund: offerData.autoFund || false,
                    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                offer,
                message: 'Funding offer submitted successfully'
            };

        } catch (error) {
            console.error('Make funding offer error:', error);
            return {
                success: false,
                message: error.message || 'Failed to make funding offer'
            };
        }
    }

    /**
     * Accept a funding offer (borrower)
     */
    async acceptFundingOffer(borrowerId, offerId) {
        try {
            // Get offer details
            const { data: offer } = await supabase
                .from('lender_funding_offers')
                .select('*, loan_marketplace_listings(*)')
                .eq('id', offerId)
                .single();

            if (!offer || offer.status !== 'pending') {
                return {
                    success: false,
                    message: 'Offer is not available'
                };
            }

            // Verify borrower owns the listing
            if (offer.loan_marketplace_listings.borrower_user_id !== borrowerId) {
                return {
                    success: false,
                    message: 'Unauthorized'
                };
            }

            // Update offer status
            const { error: updateError } = await supabase
                .from('lender_funding_offers')
                .update({
                    status: 'accepted',
                    response_date: new Date(),
                    funded_amount: offer.offer_amount,
                    funding_date: new Date()
                })
                .eq('id', offerId);

            if (updateError) throw updateError;

            // Create loan investment holding for lender
            const { error: holdingError } = await supabase
                .from('loan_investment_holdings')
                .insert({
                    lender_user_id: offer.lender_user_id,
                    loan_id: offer.loan_id,
                    original_funding_offer_id: offerId,
                    principal_amount: offer.offer_amount,
                    current_outstanding_balance: offer.offer_amount,
                    loan_percentage: offer.funding_percentage / 100,
                    status: 'active',
                    acquisition_method: 'primary'
                });

            if (holdingError) throw holdingError;

            // Update listing funding status
            await supabase.rpc('update_loan_funding_status', {
                loan_listing_id: offer.listing_id
            });

            return {
                success: true,
                message: 'Funding offer accepted successfully'
            };

        } catch (error) {
            console.error('Accept funding offer error:', error);
            return {
                success: false,
                message: error.message || 'Failed to accept funding offer'
            };
        }
    }

    /**
     * SECONDARY MARKET OPERATIONS
     */

    /**
     * List a loan investment for sale on secondary market
     */
    async listLoanForSale(lenderId, saleData) {
        try {
            // Get loan holding
            const { data: holding } = await supabase
                .from('loan_investment_holdings')
                .select('*')
                .eq('id', saleData.holdingId)
                .eq('lender_user_id', lenderId)
                .single();

            if (!holding || holding.status !== 'active') {
                return {
                    success: false,
                    message: 'Loan investment not available for sale'
                };
            }

            // Create secondary market listing
            const { data: listing, error } = await supabase
                .from('secondary_market_listings')
                .insert({
                    holding_id: saleData.holdingId,
                    seller_user_id: lenderId,
                    loan_id: holding.loan_id,
                    outstanding_balance: holding.current_outstanding_balance,
                    asking_price: parseFloat(saleData.askingPrice),
                    loan_percentage: holding.loan_percentage,
                    listing_type: saleData.listingType || 'fixed',
                    listing_expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;

            // Mark holding as for sale
            await supabase
                .from('loan_investment_holdings')
                .update({ is_for_sale: true })
                .eq('id', saleData.holdingId);

            return {
                success: true,
                listing,
                message: 'Loan listed for sale successfully'
            };

        } catch (error) {
            console.error('List loan for sale error:', error);
            return {
                success: false,
                message: error.message || 'Failed to list loan for sale'
            };
        }
    }

    /**
     * Browse secondary market listings
     */
    async browseSecondaryMarket(filters = {}) {
        try {
            let query = supabase
                .from('active_secondary_market')
                .select('*');

            // Apply filters
            if (filters.minDiscount) {
                query = query.lte('discount_premium', filters.minDiscount);
            }
            if (filters.maxPrice) {
                query = query.lte('asking_price', filters.maxPrice);
            }

            // Pagination
            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const offset = (page - 1) * limit;

            query = query.range(offset, offset + limit - 1);
            query = query.order('listing_date', { ascending: false });

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                success: true,
                listings: data || [],
                pagination: {
                    page,
                    limit,
                    total: count,
                    totalPages: Math.ceil(count / limit)
                }
            };

        } catch (error) {
            console.error('Browse secondary market error:', error);
            return {
                success: false,
                message: error.message || 'Failed to browse secondary market'
            };
        }
    }

    /**
     * Make a purchase offer on secondary market
     */
    async makePurchaseOffer(buyerId, offerData) {
        try {
            const { data: offer, error } = await supabase
                .from('secondary_market_offers')
                .insert({
                    listing_id: offerData.listingId,
                    buyer_user_id: buyerId,
                    seller_user_id: offerData.sellerId,
                    offer_price: parseFloat(offerData.offerPrice),
                    offer_type: offerData.offerType || 'full',
                    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                offer,
                message: 'Purchase offer submitted successfully'
            };

        } catch (error) {
            console.error('Make purchase offer error:', error);
            return {
                success: false,
                message: error.message || 'Failed to make purchase offer'
            };
        }
    }

    /**
     * Get lender portfolio
     */
    async getLenderPortfolio(lenderId) {
        try {
            const { data, error } = await supabase
                .from('lender_portfolio_summary')
                .select('*')
                .eq('lender_user_id', lenderId)
                .single();

            if (error) throw error;

            return {
                success: true,
                portfolio: data || {
                    total_investments: 0,
                    total_invested: 0,
                    current_outstanding: 0,
                    total_received: 0,
                    total_interest: 0,
                    average_yield: 0
                }
            };

        } catch (error) {
            console.error('Get lender portfolio error:', error);
            return {
                success: false,
                message: error.message || 'Failed to get portfolio'
            };
        }
    }

    /**
     * UTILITY FUNCTIONS
     */

    /**
     * Calculate monthly payment for a loan
     */
    calculateMonthlyPayment(principal, annualRate, months) {
        if (annualRate === 0) return principal / months;
        
        const monthlyRate = annualRate / 12;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                       (Math.pow(1 + monthlyRate, months) - 1);
        
        return Math.round(payment * 100) / 100;
    }
}

module.exports = P2PLendingService;

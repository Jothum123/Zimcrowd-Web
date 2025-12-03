/**
 * P2P Lending Service
 * Handles Primary and Secondary Market operations for peer-to-peer lending
 * 
 * COLD START RULES (Applies to P2P Marketplace ONLY, NOT Direct Lending):
 * - Government: NO cold start - full DTNI-based limit ($25-$3000)
 * - Private: $300 cold start cap for first-time borrowers
 * - Informal: $100 cold start cap for first-time borrowers
 * - Business: $200 cold start cap for first-time borrowers
 * 
 * After first successful repayment, cold start is lifted and full limits apply.
 * 
 * INTEREST RATE: User selectable 0-10% per month
 * (Direct Lending has fixed 8% rate)
 */

const { supabase } = require('../utils/supabase-auth');

class P2PLendingService {
    constructor() {
        // Cold start limits by employment type (same as Direct Lending)
        // USD limits
        this.COLD_START_LIMITS = {
            government: { coldStartCap: null, maxLoan: 3000, maxTenureMonths: 24, coldStartActive: false },
            private: { coldStartCap: 300, maxLoan: 1000, maxTenureMonths: 12, coldStartActive: true },
            informal: { coldStartCap: 100, maxLoan: 500, maxTenureMonths: 6, coldStartActive: true },
            business: { coldStartCap: 200, maxLoan: 1000, maxTenureMonths: 12, coldStartActive: true }
        };
        
        // ZWG limits by employment type
        this.COLD_START_LIMITS_ZWG = {
            government: { coldStartCap: null, maxLoan: 80000, maxTenureMonths: 24, coldStartActive: false },
            private: { coldStartCap: 7500, maxLoan: 28000, maxTenureMonths: 12, coldStartActive: true },
            informal: { coldStartCap: 2500, maxLoan: 14000, maxTenureMonths: 6, coldStartActive: true },
            business: { coldStartCap: 5000, maxLoan: 28000, maxTenureMonths: 12, coldStartActive: true }
        };
        
        // Interest rate range (user selectable by borrower)
        this.MIN_INTEREST_RATE = 0.00;  // 0% per month
        this.MAX_INTEREST_RATE = 0.10;  // 10% per month (USD)
        this.MAX_INTEREST_RATE_ZWG = 0.15;  // 15% per month (ZWG)
        this.MIN_LOAN_AMOUNT = 25;
        
        // Investment/Lending limits (insurable range) - USD
        this.MIN_INVESTMENT_AMOUNT = 10;    // Minimum $10 per investment
        this.MAX_INVESTMENT_AMOUNT = 10000; // Maximum $10,000 per investment
        
        // Investment/Lending limits - ZWG (Zimbabwe Gold)
        this.MIN_INVESTMENT_AMOUNT_ZWG = 250;    // Minimum ZWG 250 per investment
        this.MAX_INVESTMENT_AMOUNT_ZWG = 250000; // Maximum ZWG 250,000 per investment
        
        // Supported currencies for lending
        this.SUPPORTED_CURRENCIES = ['USD', 'ZWG'];
        this.DEFAULT_CURRENCY = 'USD';
        
        // Currency-specific loan limits
        this.LOAN_LIMITS = {
            USD: {
                minLoan: 25,
                maxLoan: 10000,
                minInvestment: 10,
                maxInvestment: 10000,
                symbol: '$'
            },
            ZWG: {
                minLoan: 500,
                maxLoan: 80000,  // Max for government employees
                minInvestment: 250,
                maxInvestment: 80000,
                symbol: 'ZWG ',
                maxInterestRate: 0.15  // 15% per month for ZWG
            }
        };
        
        // Deposit limits - NO MAXIMUM, but $5,000+ requires source verification
        this.MIN_DEPOSIT_AMOUNT = 10;       // Minimum deposit to lender wallet
        this.MAX_DEPOSIT_AMOUNT = null;     // NO maximum deposit limit
        
        // Withdrawal limits - USD
        this.MIN_WITHDRAWAL_AMOUNT = 20;    // Minimum withdrawal $20 USD
        this.MAX_WITHDRAWAL_PER_DAY = 1000; // Maximum $1,000 USD per day
        
        // Withdrawal limits - ZWG (Zimbabwe Gold)
        this.MIN_WITHDRAWAL_AMOUNT_ZWG = 500;   // Minimum withdrawal ZWG 500
        this.MAX_WITHDRAWAL_PER_DAY_ZWG = 3000; // Maximum ZWG 3,000 per day
        
        // Withdrawal processing time (2-3 business days)
        this.WITHDRAWAL_PROCESSING_DAYS = '2-3 business days';
        
        // AML (Anti-Money Laundering) Thresholds
        // Deposits $5,000+ require source of funds verification
        this.AML_THRESHOLD = 5000;          // Trigger AML check at $5,000
        this.AML_CUMULATIVE_THRESHOLD = 10000; // Cumulative deposits in 30 days triggers AML
        this.AML_WINDOW_DAYS = 30;          // Rolling window for cumulative check
        this.SMURFING_DETECTION = {
            rapidDeposits: { count: 3, windowHours: 24 },  // 3+ deposits in 24 hours
            patternThreshold: 4500,         // Suspicious if deposits consistently just under $5,000
            frequencyThreshold: 5           // 5+ deposits in a week triggers review
        };
        
        // Activity Types for logging
        this.ACTIVITY_TYPES = {
            DEPOSIT: 'deposit',
            WITHDRAWAL: 'withdrawal',
            LOAN_FUNDING: 'loan_funding',
            LOAN_REQUEST: 'loan_request',
            LOAN_REPAYMENT: 'loan_repayment',
            LOAN_DISBURSEMENT: 'loan_disbursement',
            TRANSFER: 'transfer',
            AML_FLAG: 'aml_flag',
            SMURFING_FLAG: 'smurfing_flag',
            DOCUMENT_UPLOAD: 'document_upload',
            KYC_VERIFICATION: 'kyc_verification'
        };
    }

    /**
     * PRIMARY MARKET OPERATIONS
     */

    /**
     * Create a loan marketplace listing
     * Supports multi-currency lending (USD and ZWG)
     */
    async createLoanListing(userId, loanData) {
        try {
            // Validate and set currency
            const currency = (loanData.currency || this.DEFAULT_CURRENCY).toUpperCase();
            if (!this.SUPPORTED_CURRENCIES.includes(currency)) {
                return {
                    success: false,
                    message: `Unsupported currency. Supported currencies: ${this.SUPPORTED_CURRENCIES.join(', ')}`
                };
            }

            const currencyLimits = this.LOAN_LIMITS[currency];
            const currencySymbol = currencyLimits.symbol;

            // Get user profile to check employment type
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('employment_type, employment_status')
                .eq('user_id', userId)
                .single();

            const employmentType = userProfile?.employment_type || userProfile?.employment_status || 'private';
            
            // Get employment config based on currency
            const employmentConfig = currency === 'ZWG' 
                ? (this.COLD_START_LIMITS_ZWG[employmentType] || this.COLD_START_LIMITS_ZWG.private)
                : (this.COLD_START_LIMITS[employmentType] || this.COLD_START_LIMITS.private);

            // Check if user is first-time borrower
            const { data: isFirstTime } = await supabase
                .rpc('is_first_time_borrower', { borrower_id: userId });

            // Enforce cold start limits for first-time borrowers based on employment type
            let amount = parseFloat(loanData.amount);
            const termMonths = parseInt(loanData.termMonths);

            // Validate minimum loan amount based on currency
            if (amount < currencyLimits.minLoan) {
                return {
                    success: false,
                    message: `Minimum loan amount is ${currencySymbol}${currencyLimits.minLoan}`,
                    currency: currency
                };
            }

            // Apply cold start cap for first-time private/informal borrowers
            if (isFirstTime && employmentConfig.coldStartActive && employmentConfig.coldStartCap) {
                if (amount > employmentConfig.coldStartCap) {
                    return {
                        success: false,
                        message: `First-time ${employmentType} borrowers are limited to ${currencySymbol}${currencyLimits.minLoan}-${currencySymbol}${employmentConfig.coldStartCap.toLocaleString()}. Build your reputation with a smaller loan first!`,
                        coldStartLimit: employmentConfig.coldStartCap,
                        employmentType: employmentType,
                        currency: currency
                    };
                }
            }

            // Validate max loan amount based on employment type and currency
            if (amount > employmentConfig.maxLoan) {
                return {
                    success: false,
                    message: `Maximum loan amount for ${employmentType} employees is ${currencySymbol}${employmentConfig.maxLoan.toLocaleString()}`,
                    maxLoan: employmentConfig.maxLoan,
                    currency: currency,
                    employmentType: employmentType
                };
            }

            // Validate max tenure based on employment type
            if (termMonths > employmentConfig.maxTenureMonths) {
                return {
                    success: false,
                    message: `Maximum loan tenure for ${employmentType} employees is ${employmentConfig.maxTenureMonths} months`,
                    maxTenure: employmentConfig.maxTenureMonths
                };
            }

            // Validate interest rate based on currency
            // USD: 0-10% | ZWG: 0-15%
            const interestRate = parseFloat(loanData.requestedInterestRate);
            const maxRate = currency === 'ZWG' ? this.MAX_INTEREST_RATE_ZWG : this.MAX_INTEREST_RATE;
            const maxRatePercent = maxRate * 100;
            
            if (interestRate < this.MIN_INTEREST_RATE || interestRate > maxRate) {
                return {
                    success: false,
                    message: `Interest rate for ${currency} loans must be between 0% and ${maxRatePercent}% per month`,
                    currency: currency,
                    maxInterestRate: maxRatePercent
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

            // Create loan record first with currency
            const { data: loan, error: loanError } = await supabase
                .from('loans')
                .insert({
                    user_id: userId,
                    loan_type: loanData.loanType || 'personal',
                    amount: amount,
                    currency: currency,
                    interest_rate: interestRate,
                    term_months: parseInt(loanData.termMonths),
                    monthly_payment: this.calculateMonthlyPayment(amount, interestRate, parseInt(loanData.termMonths)),
                    status: 'pending',
                    purpose: loanData.purpose
                })
                .select()
                .single();

            if (loanError) throw loanError;

            // Create marketplace listing with currency
            const { data: listing, error: listingError } = await supabase
                .from('loan_marketplace_listings')
                .insert({
                    loan_id: loan.id,
                    borrower_user_id: userId,
                    amount_requested: amount,
                    currency: currency,
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
                currency: currency,
                isFirstTimeBorrower: borrowerData.is_first_time,
                coldStartAmount: borrowerData.is_first_time ? adjustedColdStartCap : null
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
     * Supports filtering by currency (USD or ZWG)
     */
    async browseLoanMarketplace(filters = {}) {
        try {
            let query = supabase
                .from('active_loan_marketplace')
                .select('*');

            // Filter by currency (default: show all)
            if (filters.currency) {
                const currency = filters.currency.toUpperCase();
                if (this.SUPPORTED_CURRENCIES.includes(currency)) {
                    query = query.eq('currency', currency);
                }
            }

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
                supportedCurrencies: this.SUPPORTED_CURRENCIES,
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
     * Investment amount must be within insurable range based on currency
     * USD: $10 - $10,000 | ZWG: ZWG 250 - ZWG 250,000
     */
    async makeFundingOffer(lenderId, offerData) {
        try {
            const offerAmount = parseFloat(offerData.offerAmount);

            // Check if listing exists and is active first to get currency
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

            // Get currency from listing (default to USD for backward compatibility)
            const currency = (listing.currency || 'USD').toUpperCase();
            const currencyLimits = this.LOAN_LIMITS[currency] || this.LOAN_LIMITS.USD;
            const currencySymbol = currencyLimits.symbol;

            // Validate investment amount based on currency
            if (offerAmount < currencyLimits.minInvestment) {
                return {
                    success: false,
                    message: `Minimum investment amount is ${currencySymbol}${currencyLimits.minInvestment}`,
                    minAmount: currencyLimits.minInvestment,
                    currency: currency
                };
            }

            if (offerAmount > currencyLimits.maxInvestment) {
                return {
                    success: false,
                    message: `Maximum investment amount is ${currencySymbol}${currencyLimits.maxInvestment.toLocaleString()} (insurable limit)`,
                    maxAmount: currencyLimits.maxInvestment,
                    currency: currency
                };
            }

            // Validate interest rate based on currency (USD: 0-10%, ZWG: 0-15%)
            const offeredRate = parseFloat(offerData.offeredInterestRate);
            const maxRate = currency === 'ZWG' ? this.MAX_INTEREST_RATE_ZWG : this.MAX_INTEREST_RATE;
            const maxRatePercent = maxRate * 100;
            
            if (offeredRate < 0 || offeredRate > maxRate) {
                return {
                    success: false,
                    message: `Interest rate for ${currency} must be between 0% and ${maxRatePercent}%`,
                    currency: currency,
                    maxInterestRate: maxRatePercent
                };
            }

            // Check if lender has sufficient balance in the correct currency wallet
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance, currency')
                .eq('user_id', lenderId)
                .eq('currency', currency)
                .single();

            if (!wallet || wallet.balance < offerAmount) {
                return {
                    success: false,
                    message: `Insufficient ${currency} balance. Available: ${currencySymbol}${(wallet?.balance || 0).toFixed(2)}`,
                    availableBalance: wallet?.balance || 0,
                    currency: currency
                };
            }

            // Create funding offer with currency
            const { data: offer, error } = await supabase
                .from('lender_funding_offers')
                .insert({
                    listing_id: offerData.listingId,
                    lender_user_id: lenderId,
                    loan_id: listing.loan_id,
                    offer_amount: offerAmount,
                    currency: currency,
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
                currency: currency,
                message: `Funding offer of ${currencySymbol}${offerAmount.toLocaleString()} submitted successfully`
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
     * Validate deposit amount for lender wallet
     * NO maximum deposit limit, but $5,000+ requires source verification
     * @param {number} amount - Deposit amount
     * @param {string} userId - User ID for AML check
     * @returns {Object} Validation result with AML flag if applicable
     */
    async validateDepositAmount(amount, userId = null) {
        const depositAmount = parseFloat(amount);

        if (isNaN(depositAmount) || depositAmount <= 0) {
            return { valid: false, message: 'Invalid deposit amount' };
        }

        if (depositAmount < this.MIN_DEPOSIT_AMOUNT) {
            return {
                valid: false,
                message: `Minimum deposit amount is $${this.MIN_DEPOSIT_AMOUNT}`,
                minAmount: this.MIN_DEPOSIT_AMOUNT
            };
        }

        // NO maximum deposit limit - removed the max check

        // AML Check: Deposits $5,000+ require source of funds verification
        let amlFlag = null;
        if (depositAmount >= this.AML_THRESHOLD) {
            amlFlag = {
                triggered: true,
                reason: 'HIGH_VALUE_DEPOSIT',
                threshold: this.AML_THRESHOLD,
                amount: depositAmount,
                requiresDocuments: true,
                requiredDocuments: ['proof_of_income', 'source_of_funds'],
                status: 'pending_verification',
                message: `⚠️ AML Alert: Deposits of $${this.AML_THRESHOLD.toLocaleString()} or more require source of funds verification. Your deposit is flagged until verified.`
            };

            // Log AML flag
            if (userId) {
                await this.logActivity(userId, this.ACTIVITY_TYPES.AML_FLAG, {
                    amount: depositAmount,
                    reason: 'HIGH_VALUE_DEPOSIT',
                    threshold: this.AML_THRESHOLD,
                    action: 'SOURCE_VERIFICATION_REQUIRED',
                    status: 'pending_verification'
                });
            }
        }

        return {
            valid: true,
            amount: depositAmount,
            message: amlFlag ? amlFlag.message : 'Deposit amount is valid',
            amlFlag: amlFlag,
            requiresSourceVerification: amlFlag?.requiresDocuments || false,
            flaggedUntilVerified: depositAmount >= this.AML_THRESHOLD
        };
    }

    /**
     * Validate withdrawal amount
     * USD: Minimum $20, Maximum $1,000 per day
     * ZWG: Minimum ZWG 500, Maximum ZWG 3,000 per day
     * Withdrawals are processed instantly but funds arrive in 2-3 business days
     * @param {number} amount - Withdrawal amount
     * @param {string} userId - User ID to check daily limit
     * @param {string} currency - Currency code ('USD' or 'ZWG')
     * @returns {Promise<Object>} Validation result
     */
    async validateWithdrawalAmount(amount, userId, currency = 'USD') {
        const withdrawalAmount = parseFloat(amount);
        const currencyUpper = (currency || 'USD').toUpperCase();

        // Get limits based on currency
        const minAmount = currencyUpper === 'ZWG' ? this.MIN_WITHDRAWAL_AMOUNT_ZWG : this.MIN_WITHDRAWAL_AMOUNT;
        const maxPerDay = currencyUpper === 'ZWG' ? this.MAX_WITHDRAWAL_PER_DAY_ZWG : this.MAX_WITHDRAWAL_PER_DAY;
        const currencySymbol = currencyUpper === 'ZWG' ? 'ZWG ' : '$';

        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            return { valid: false, message: 'Invalid withdrawal amount' };
        }

        // Check minimum
        if (withdrawalAmount < minAmount) {
            return {
                valid: false,
                message: `Minimum withdrawal amount is ${currencySymbol}${minAmount}`,
                minAmount: minAmount,
                currency: currencyUpper
            };
        }

        // Check if single withdrawal exceeds daily limit
        if (withdrawalAmount > maxPerDay) {
            return {
                valid: false,
                message: `Maximum withdrawal is ${currencySymbol}${maxPerDay} per day`,
                maxAmount: maxPerDay,
                currency: currencyUpper
            };
        }

        // Check cumulative withdrawals today for this currency
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data: todayWithdrawals, error } = await supabase
            .from('user_activities')
            .select('metadata')
            .eq('user_id', userId)
            .eq('activity_type', this.ACTIVITY_TYPES.WITHDRAWAL)
            .gte('created_at', todayStart.toISOString());

        if (error) {
            console.error('Error checking daily withdrawals:', error);
        }

        // Filter by currency and sum
        const totalWithdrawnToday = (todayWithdrawals || [])
            .filter(w => (w.metadata?.currency || 'USD').toUpperCase() === currencyUpper)
            .reduce((sum, w) => sum + parseFloat(w.metadata?.amount || 0), 0);

        const remainingLimit = maxPerDay - totalWithdrawnToday;

        if (withdrawalAmount > remainingLimit) {
            return {
                valid: false,
                message: `Daily withdrawal limit exceeded. You have ${currencySymbol}${remainingLimit.toFixed(2)} remaining today.`,
                dailyLimit: maxPerDay,
                withdrawnToday: totalWithdrawnToday,
                remainingLimit: remainingLimit,
                currency: currencyUpper
            };
        }

        return {
            valid: true,
            amount: withdrawalAmount,
            currency: currencyUpper,
            message: `Withdrawal approved. Funds will arrive in ${this.WITHDRAWAL_PROCESSING_DAYS}.`,
            processingTime: this.WITHDRAWAL_PROCESSING_DAYS,
            dailyLimit: maxPerDay,
            withdrawnToday: totalWithdrawnToday,
            remainingLimit: remainingLimit - withdrawalAmount
        };
    }

    /**
     * Internal wallet transfer between users
     * @param {string} senderId - Sender user ID
     * @param {string} recipientId - Recipient user ID (can be email, phone, or user ID)
     * @param {number} amount - Transfer amount
     * @param {string} note - Optional transfer note
     * @returns {Promise<Object>} Transfer result
     */
    async internalTransfer(senderId, recipientId, amount, note = '') {
        try {
            const transferAmount = parseFloat(amount);

            // Validate amount
            if (isNaN(transferAmount) || transferAmount <= 0) {
                return { success: false, message: 'Invalid transfer amount' };
            }

            // Minimum transfer amount
            const MIN_TRANSFER = 5;
            if (transferAmount < MIN_TRANSFER) {
                return { 
                    success: false, 
                    message: `Minimum transfer amount is $${MIN_TRANSFER}` 
                };
            }

            // Cannot transfer to self
            if (senderId === recipientId) {
                return { success: false, message: 'Cannot transfer to yourself' };
            }

            // Find recipient by ID, email, or phone
            // Check if recipientId is UUID, email, or phone
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientId);
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientId);
            const isPhone = /^\+?[0-9]{10,15}$/.test(recipientId.replace(/\s/g, ''));

            let recipient = null;

            if (isUUID) {
                // Look up by user_id in user_profiles
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('user_id, first_name, last_name, phone_number')
                    .eq('user_id', recipientId)
                    .single();
                if (!error && data) {
                    recipient = { 
                        user_id: data.user_id, 
                        name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
                        phone: data.phone_number
                    };
                }
            } else if (isEmail) {
                // Look up by email in auth.users via admin API
                const { data: users } = await supabase.auth.admin.listUsers();
                const authUser = users?.users?.find(u => u.email?.toLowerCase() === recipientId.toLowerCase());
                if (authUser) {
                    recipient = { 
                        user_id: authUser.id, 
                        email: authUser.email,
                        name: authUser.user_metadata?.full_name || authUser.email.split('@')[0]
                    };
                }
            } else if (isPhone) {
                // Look up by phone in user_profiles
                const cleanPhone = recipientId.replace(/\s/g, '');
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('user_id, first_name, last_name, phone_number')
                    .eq('phone_number', cleanPhone)
                    .single();
                if (!error && data) {
                    recipient = { 
                        user_id: data.user_id, 
                        name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
                        phone: data.phone_number
                    };
                }
            } else {
                return { success: false, message: 'Invalid recipient. Use email, phone, or user ID.' };
            }

            if (!recipient) {
                return { success: false, message: 'Recipient not found' };
            }

            // Check sender's balance
            const { data: senderWallet, error: walletError } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', senderId)
                .single();

            if (walletError || !senderWallet) {
                return { success: false, message: 'Sender wallet not found' };
            }

            if (senderWallet.balance < transferAmount) {
                return { 
                    success: false, 
                    message: `Insufficient balance. Available: $${senderWallet.balance.toFixed(2)}` 
                };
            }

            // Generate transfer reference
            const transferRef = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            // Perform transfer using transaction
            // Debit sender
            const { error: debitError } = await supabase
                .from('wallets')
                .update({ 
                    balance: senderWallet.balance - transferAmount,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', senderId);

            if (debitError) {
                throw new Error('Failed to debit sender wallet');
            }

            // Credit recipient
            const { data: recipientWallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', recipient.user_id)
                .single();

            const { error: creditError } = await supabase
                .from('wallets')
                .update({ 
                    balance: (recipientWallet?.balance || 0) + transferAmount,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', recipient.user_id);

            if (creditError) {
                // Rollback sender debit
                await supabase
                    .from('wallets')
                    .update({ balance: senderWallet.balance })
                    .eq('user_id', senderId);
                throw new Error('Failed to credit recipient wallet');
            }

            // Log sender activity (debit)
            await this.logActivity(senderId, this.ACTIVITY_TYPES.TRANSFER, {
                type: 'sent',
                amount: transferAmount,
                recipientId: recipient.user_id,
                recipientName: recipient.name || recipient.email,
                reference: transferRef,
                note: note
            });

            // Log recipient activity (credit)
            await this.logActivity(recipient.user_id, this.ACTIVITY_TYPES.TRANSFER, {
                type: 'received',
                amount: transferAmount,
                senderId: senderId,
                reference: transferRef,
                note: note
            });

            // Create transaction records
            await supabase.from('transactions').insert([
                {
                    user_id: senderId,
                    type: 'transfer_out',
                    amount: -transferAmount,
                    reference: transferRef,
                    description: `Transfer to ${recipient.name || recipient.email}`,
                    metadata: { recipientId: recipient.user_id, note }
                },
                {
                    user_id: recipient.user_id,
                    type: 'transfer_in',
                    amount: transferAmount,
                    reference: transferRef,
                    description: `Transfer from ${senderId.substring(0, 8)}...`,
                    metadata: { senderId, note }
                }
            ]);

            console.log(`💸 Transfer: $${transferAmount} from ${senderId} to ${recipient.user_id} [${transferRef}]`);

            const newBalance = senderWallet.balance - transferAmount;

            return {
                success: true,
                message: `Successfully transferred $${transferAmount.toFixed(2)} to ${recipient.name || recipient.email}`,
                transactionId: transferRef,
                newBalance: newBalance,
                data: {
                    reference: transferRef,
                    amount: transferAmount,
                    recipient: {
                        id: recipient.user_id,
                        name: recipient.name,
                        email: recipient.email
                    },
                    senderNewBalance: newBalance,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            console.error('Internal transfer error:', error);
            return { success: false, message: error.message || 'Transfer failed' };
        }
    }

    /**
     * Get transfer history for a user
     * @param {string} userId - User ID
     * @param {Object} options - Filter options
     * @returns {Promise<Object>} Transfer history
     */
    async getTransferHistory(userId, options = {}) {
        try {
            const { type, limit = 50, offset = 0 } = options;

            let query = supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .eq('activity_type', this.ACTIVITY_TYPES.TRANSFER)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (type === 'sent') {
                query = query.eq('metadata->>type', 'sent');
            } else if (type === 'received') {
                query = query.eq('metadata->>type', 'received');
            }

            const { data, error } = await query;

            if (error) throw error;

            return {
                success: true,
                transfers: data || [],
                count: data?.length || 0
            };
        } catch (error) {
            console.error('Get transfer history error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Log user activity (deposits, withdrawals, loans, etc.)
     * @param {string} userId - User ID
     * @param {string} activityType - Type of activity
     * @param {Object} metadata - Additional activity data
     * @returns {Promise<Object>} Activity log result
     */
    async logActivity(userId, activityType, metadata = {}) {
        try {
            const { data, error } = await supabase
                .from('user_activities')
                .insert({
                    user_id: userId,
                    activity_type: activityType,
                    metadata: {
                        ...metadata,
                        timestamp: new Date().toISOString(),
                        ip_address: metadata.ipAddress || null
                    },
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('Error logging activity:', error);
                return { success: false, error: error.message };
            }

            console.log(`📝 Activity logged: ${activityType} for user ${userId}`);
            return { success: true, activity: data };
        } catch (error) {
            console.error('Log activity error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user activity history
     * @param {string} userId - User ID
     * @param {Object} filters - Activity filters
     * @returns {Promise<Object>} Activity history
     */
    async getActivityHistory(userId, filters = {}) {
        try {
            let query = supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (filters.activityType) {
                query = query.eq('activity_type', filters.activityType);
            }
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            const limit = filters.limit || 50;
            query = query.limit(limit);

            const { data, error } = await query;

            if (error) throw error;

            return {
                success: true,
                activities: data || [],
                total: data?.length || 0
            };
        } catch (error) {
            console.error('Get activity history error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user has pending AML documents
     * @param {string} userId - User ID
     * @returns {Promise<Object>} AML status
     */
    async checkAMLStatus(userId) {
        try {
            // Check for recent AML flags
            const { data: amlFlags, error } = await supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .eq('activity_type', this.ACTIVITY_TYPES.AML_FLAG)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            // Check if user has submitted required AML documents
            const { data: amlDocs } = await supabase
                .from('user_documents')
                .select('document_type, status')
                .eq('user_id', userId)
                .in('document_type', ['proof_of_income', 'source_of_funds']);

            const hasProofOfIncome = amlDocs?.some(d => d.document_type === 'proof_of_income' && d.status === 'verified');
            const hasSourceOfFunds = amlDocs?.some(d => d.document_type === 'source_of_funds' && d.status === 'verified');

            const pendingAMLFlags = amlFlags?.filter(f => !hasProofOfIncome || !hasSourceOfFunds) || [];

            return {
                success: true,
                hasPendingAML: pendingAMLFlags.length > 0 && (!hasProofOfIncome || !hasSourceOfFunds),
                amlFlags: amlFlags || [],
                documentsStatus: {
                    proofOfIncome: hasProofOfIncome ? 'verified' : 'required',
                    sourceOfFunds: hasSourceOfFunds ? 'verified' : 'required'
                },
                message: pendingAMLFlags.length > 0 && (!hasProofOfIncome || !hasSourceOfFunds)
                    ? '⚠️ You have pending AML verification. Please upload proof of income and source of funds.'
                    : 'AML verification complete.'
            };
        } catch (error) {
            console.error('Check AML status error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * ANTI-SMURFING DETECTION
     * Detects structuring/smurfing attempts to avoid AML thresholds
     * 
     * Detection Methods:
     * 1. Cumulative deposits in 30 days exceeding $10,000
     * 2. Rapid deposits (3+ in 24 hours)
     * 3. Pattern detection (deposits consistently just under $5,000)
     * 4. High frequency (5+ deposits in a week)
     * 
     * @param {string} userId - User ID
     * @param {number} newAmount - New deposit amount
     * @returns {Promise<Object>} Smurfing detection result
     */
    async detectSmurfing(userId, newAmount) {
        try {
            const flags = [];
            const now = new Date();
            
            // Get deposit history
            const thirtyDaysAgo = new Date(now.getTime() - (this.AML_WINDOW_DAYS * 24 * 60 * 60 * 1000));
            const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

            const { data: deposits, error } = await supabase
                .from('user_activities')
                .select('metadata, created_at')
                .eq('user_id', userId)
                .eq('activity_type', this.ACTIVITY_TYPES.DEPOSIT)
                .gte('created_at', thirtyDaysAgo.toISOString())
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching deposit history:', error);
                return { detected: false, flags: [] };
            }

            const depositHistory = deposits || [];
            
            // Extract amounts from metadata
            const getAmount = (d) => parseFloat(d.metadata?.amount || 0);
            
            // CHECK 1: Cumulative deposits in 30 days
            const cumulativeTotal = depositHistory.reduce((sum, d) => sum + getAmount(d), 0) + newAmount;
            if (cumulativeTotal >= this.AML_CUMULATIVE_THRESHOLD) {
                flags.push({
                    type: 'CUMULATIVE_THRESHOLD',
                    severity: 'high',
                    message: `Cumulative deposits in 30 days ($${cumulativeTotal.toLocaleString()}) exceed $${this.AML_CUMULATIVE_THRESHOLD.toLocaleString()}`,
                    details: { cumulativeTotal, threshold: this.AML_CUMULATIVE_THRESHOLD, windowDays: 30 }
                });
            }

            // CHECK 2: Rapid deposits (3+ in 24 hours)
            const last24Hours = depositHistory.filter(d => new Date(d.created_at) >= twentyFourHoursAgo);
            if (last24Hours.length + 1 >= this.SMURFING_DETECTION.rapidDeposits.count) {
                flags.push({
                    type: 'RAPID_DEPOSITS',
                    severity: 'medium',
                    message: `${last24Hours.length + 1} deposits in 24 hours detected (threshold: ${this.SMURFING_DETECTION.rapidDeposits.count})`,
                    details: { depositsIn24Hours: last24Hours.length + 1, threshold: this.SMURFING_DETECTION.rapidDeposits.count }
                });
            }

            // CHECK 3: Pattern detection - deposits just under $5,000
            const suspiciousAmounts = depositHistory.filter(d => {
                const amt = getAmount(d);
                return amt >= this.SMURFING_DETECTION.patternThreshold && amt < this.AML_THRESHOLD;
            });
            // If new amount is also suspicious
            const newAmountSuspicious = newAmount >= this.SMURFING_DETECTION.patternThreshold && newAmount < this.AML_THRESHOLD;
            if (suspiciousAmounts.length >= 2 || (suspiciousAmounts.length >= 1 && newAmountSuspicious)) {
                flags.push({
                    type: 'STRUCTURING_PATTERN',
                    severity: 'high',
                    message: `Multiple deposits just under $${this.AML_THRESHOLD.toLocaleString()} threshold detected - possible structuring`,
                    details: { 
                        suspiciousDeposits: suspiciousAmounts.length + (newAmountSuspicious ? 1 : 0),
                        patternThreshold: this.SMURFING_DETECTION.patternThreshold,
                        amlThreshold: this.AML_THRESHOLD
                    }
                });
            }

            // CHECK 4: High frequency (5+ deposits in a week)
            const lastWeek = depositHistory.filter(d => new Date(d.created_at) >= sevenDaysAgo);
            if (lastWeek.length + 1 >= this.SMURFING_DETECTION.frequencyThreshold) {
                flags.push({
                    type: 'HIGH_FREQUENCY',
                    severity: 'medium',
                    message: `${lastWeek.length + 1} deposits in 7 days (threshold: ${this.SMURFING_DETECTION.frequencyThreshold})`,
                    details: { depositsInWeek: lastWeek.length + 1, threshold: this.SMURFING_DETECTION.frequencyThreshold }
                });
            }

            const detected = flags.length > 0;
            const highSeverity = flags.some(f => f.severity === 'high');

            // Log smurfing flag if detected
            if (detected) {
                await this.logActivity(userId, this.ACTIVITY_TYPES.SMURFING_FLAG, {
                    amount: newAmount,
                    flags: flags,
                    cumulativeTotal: cumulativeTotal,
                    requiresReview: highSeverity,
                    detectedAt: now.toISOString()
                });

                console.log(`🚨 SMURFING DETECTED for user ${userId}: ${flags.map(f => f.type).join(', ')}`);
            }

            return {
                detected,
                flags,
                requiresReview: highSeverity,
                requiresDocuments: highSeverity,
                cumulativeTotal,
                message: detected 
                    ? `⚠️ Suspicious activity detected. ${highSeverity ? 'Additional verification required.' : 'Your account is under review.'}`
                    : 'No suspicious activity detected'
            };
        } catch (error) {
            console.error('Smurfing detection error:', error);
            return { detected: false, flags: [], error: error.message };
        }
    }

    /**
     * Enhanced deposit validation with smurfing detection
     * @param {number} amount - Deposit amount
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Validation result with AML and smurfing checks
     */
    async validateDepositWithSmurfingCheck(amount, userId) {
        // First run basic validation
        const basicValidation = await this.validateDepositAmount(amount, userId);
        if (!basicValidation.valid) {
            return basicValidation;
        }

        // Run smurfing detection
        const smurfingCheck = await this.detectSmurfing(userId, amount);

        // Combine results
        return {
            ...basicValidation,
            smurfingCheck: smurfingCheck,
            requiresAdditionalDocuments: basicValidation.requiresAdditionalDocuments || smurfingCheck.requiresDocuments,
            blocked: smurfingCheck.requiresReview, // Block deposit if high severity smurfing detected
            message: smurfingCheck.detected 
                ? smurfingCheck.message 
                : basicValidation.message
        };
    }

    /**
     * Get investment and transaction limits
     * @returns {Object} Limits configuration
     */
    getTransactionLimits() {
        return {
            // Supported currencies
            supportedCurrencies: this.SUPPORTED_CURRENCIES,
            defaultCurrency: this.DEFAULT_CURRENCY,
            
            // Lending/Investment limits by currency
            lending: {
                USD: {
                    minLoan: this.LOAN_LIMITS.USD.minLoan,
                    maxLoan: this.LOAN_LIMITS.USD.maxLoan,
                    minInvestment: this.LOAN_LIMITS.USD.minInvestment,
                    maxInvestment: this.LOAN_LIMITS.USD.maxInvestment,
                    symbol: '$',
                    byEmployment: this.COLD_START_LIMITS,
                    message: `Loans: $${this.LOAN_LIMITS.USD.minLoan} - $${this.LOAN_LIMITS.USD.maxLoan.toLocaleString()}. Investments: $${this.LOAN_LIMITS.USD.minInvestment} - $${this.LOAN_LIMITS.USD.maxInvestment.toLocaleString()}`
                },
                ZWG: {
                    minLoan: this.LOAN_LIMITS.ZWG.minLoan,
                    maxLoan: this.LOAN_LIMITS.ZWG.maxLoan,
                    minInvestment: this.LOAN_LIMITS.ZWG.minInvestment,
                    maxInvestment: this.LOAN_LIMITS.ZWG.maxInvestment,
                    symbol: 'ZWG ',
                    byEmployment: this.COLD_START_LIMITS_ZWG,
                    maxInterestRate: this.MAX_INTEREST_RATE_ZWG * 100,
                    message: `Max loans by employment: Govt ZWG 80,000 | Private ZWG 28,000 | Informal ZWG 14,000`
                },
                interestRate: {
                    USD: {
                        min: this.MIN_INTEREST_RATE * 100,
                        max: this.MAX_INTEREST_RATE * 100,
                        message: `USD: ${this.MIN_INTEREST_RATE * 100}% - ${this.MAX_INTEREST_RATE * 100}% per month`
                    },
                    ZWG: {
                        min: this.MIN_INTEREST_RATE * 100,
                        max: this.MAX_INTEREST_RATE_ZWG * 100,
                        message: `ZWG: ${this.MIN_INTEREST_RATE * 100}% - ${this.MAX_INTEREST_RATE_ZWG * 100}% per month`
                    }
                }
            },
            
            // Investment limits (insurable range) - Legacy USD support
            investment: {
                min: this.MIN_INVESTMENT_AMOUNT,
                max: this.MAX_INVESTMENT_AMOUNT,
                message: `Investment amounts must be between $${this.MIN_INVESTMENT_AMOUNT} and $${this.MAX_INVESTMENT_AMOUNT} (insurable range)`
            },
            
            // Deposit limits - NO maximum
            deposit: {
                min: this.MIN_DEPOSIT_AMOUNT,
                max: null, // No maximum
                amlThreshold: this.AML_THRESHOLD,
                message: `Minimum deposit: $${this.MIN_DEPOSIT_AMOUNT}. No maximum limit.`,
                amlMessage: `Deposits of $${this.AML_THRESHOLD.toLocaleString()} or more are flagged until source of funds is verified.`
            },
            
            // Withdrawal limits by currency
            withdrawal: {
                USD: {
                    min: this.MIN_WITHDRAWAL_AMOUNT,
                    maxPerDay: this.MAX_WITHDRAWAL_PER_DAY,
                    message: `Minimum: $${this.MIN_WITHDRAWAL_AMOUNT}. Maximum: $${this.MAX_WITHDRAWAL_PER_DAY} per day.`
                },
                ZWG: {
                    min: this.MIN_WITHDRAWAL_AMOUNT_ZWG,
                    maxPerDay: this.MAX_WITHDRAWAL_PER_DAY_ZWG,
                    message: `Minimum: ZWG ${this.MIN_WITHDRAWAL_AMOUNT_ZWG}. Maximum: ZWG ${this.MAX_WITHDRAWAL_PER_DAY_ZWG} per day.`
                },
                processingTime: this.WITHDRAWAL_PROCESSING_DAYS,
                note: 'Withdrawals are processed instantly. Funds arrive in your bank account or mobile wallet within 2-3 business days.'
            },
            
            // AML thresholds
            aml: {
                singleDepositThreshold: this.AML_THRESHOLD,
                cumulativeThreshold: this.AML_CUMULATIVE_THRESHOLD,
                windowDays: this.AML_WINDOW_DAYS,
                smurfingMessage: `Cumulative deposits exceeding $${this.AML_CUMULATIVE_THRESHOLD.toLocaleString()} in ${this.AML_WINDOW_DAYS} days will trigger additional verification.`
            }
        };
    }

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

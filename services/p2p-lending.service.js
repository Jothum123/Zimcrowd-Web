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
        this.COLD_START_LIMITS = {
            government: { coldStartCap: null, maxLoan: 3000, maxTenureMonths: 24, coldStartActive: false },
            private: { coldStartCap: 300, maxLoan: 1000, maxTenureMonths: 12, coldStartActive: true },
            informal: { coldStartCap: 100, maxLoan: 500, maxTenureMonths: 6, coldStartActive: true },
            business: { coldStartCap: 200, maxLoan: 1000, maxTenureMonths: 12, coldStartActive: true }
        };
        
        // Interest rate range (user selectable by borrower)
        this.MIN_INTEREST_RATE = 0.00;  // 0% per month
        this.MAX_INTEREST_RATE = 0.10;  // 10% per month
        this.MIN_LOAN_AMOUNT = 25;
        
        // Investment/Lending limits (insurable range)
        this.MIN_INVESTMENT_AMOUNT = 10;    // Minimum $10 per investment
        this.MAX_INVESTMENT_AMOUNT = 10000; // Maximum $10,000 per investment
        
        // Deposit limits - NO MAXIMUM, but $5,000+ requires source verification
        this.MIN_DEPOSIT_AMOUNT = 10;       // Minimum deposit to lender wallet
        this.MAX_DEPOSIT_AMOUNT = null;     // NO maximum deposit limit
        
        // Withdrawal limits
        this.MIN_WITHDRAWAL_AMOUNT = 20;    // Minimum withdrawal $20
        this.MAX_WITHDRAWAL_PER_DAY = 1000; // Maximum $1,000 per day
        
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
     */
    async createLoanListing(userId, loanData) {
        try {
            // Get user profile to check employment type
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('employment_type, employment_status')
                .eq('user_id', userId)
                .single();

            const employmentType = userProfile?.employment_type || userProfile?.employment_status || 'private';
            const employmentConfig = this.COLD_START_LIMITS[employmentType] || this.COLD_START_LIMITS.private;

            // Check if user is first-time borrower
            const { data: isFirstTime } = await supabase
                .rpc('is_first_time_borrower', { borrower_id: userId });

            // Enforce cold start limits for first-time borrowers based on employment type
            let amount = parseFloat(loanData.amount);
            const termMonths = parseInt(loanData.termMonths);

            // Validate minimum loan amount
            if (amount < this.MIN_LOAN_AMOUNT) {
                return {
                    success: false,
                    message: `Minimum loan amount is $${this.MIN_LOAN_AMOUNT}`
                };
            }

            // Apply cold start cap for first-time private/informal borrowers
            if (isFirstTime && employmentConfig.coldStartActive && employmentConfig.coldStartCap) {
                if (amount > employmentConfig.coldStartCap) {
                    return {
                        success: false,
                        message: `First-time ${employmentType} borrowers are limited to $${this.MIN_LOAN_AMOUNT}-$${employmentConfig.coldStartCap}. Build your reputation with a smaller loan first!`,
                        coldStartLimit: employmentConfig.coldStartCap,
                        employmentType: employmentType
                    };
                }
            }

            // Validate max loan amount based on employment type
            if (amount > employmentConfig.maxLoan) {
                return {
                    success: false,
                    message: `Maximum loan amount for ${employmentType} employees is $${employmentConfig.maxLoan}`,
                    maxLoan: employmentConfig.maxLoan
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

            // Validate interest rate (0-10%)
            const interestRate = parseFloat(loanData.requestedInterestRate);
            if (interestRate < this.MIN_INTEREST_RATE || interestRate > this.MAX_INTEREST_RATE) {
                return {
                    success: false,
                    message: 'Interest rate must be between 0% and 10% per month'
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
     * Investment amount must be within insurable range: $10 - $10,000
     */
    async makeFundingOffer(lenderId, offerData) {
        try {
            const offerAmount = parseFloat(offerData.offerAmount);

            // Validate investment amount (insurable range: $10 - $10,000)
            if (offerAmount < this.MIN_INVESTMENT_AMOUNT) {
                return {
                    success: false,
                    message: `Minimum investment amount is $${this.MIN_INVESTMENT_AMOUNT}`,
                    minAmount: this.MIN_INVESTMENT_AMOUNT
                };
            }

            if (offerAmount > this.MAX_INVESTMENT_AMOUNT) {
                return {
                    success: false,
                    message: `Maximum investment amount is $${this.MAX_INVESTMENT_AMOUNT} (insurable limit)`,
                    maxAmount: this.MAX_INVESTMENT_AMOUNT
                };
            }

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
     * Minimum: $20, Maximum: $1,000 per day
     * @param {number} amount - Withdrawal amount
     * @param {string} userId - User ID to check daily limit
     * @returns {Promise<Object>} Validation result
     */
    async validateWithdrawalAmount(amount, userId) {
        const withdrawalAmount = parseFloat(amount);

        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
            return { valid: false, message: 'Invalid withdrawal amount' };
        }

        // Check minimum
        if (withdrawalAmount < this.MIN_WITHDRAWAL_AMOUNT) {
            return {
                valid: false,
                message: `Minimum withdrawal amount is $${this.MIN_WITHDRAWAL_AMOUNT}`,
                minAmount: this.MIN_WITHDRAWAL_AMOUNT
            };
        }

        // Check if single withdrawal exceeds daily limit
        if (withdrawalAmount > this.MAX_WITHDRAWAL_PER_DAY) {
            return {
                valid: false,
                message: `Maximum withdrawal is $${this.MAX_WITHDRAWAL_PER_DAY} per day`,
                maxAmount: this.MAX_WITHDRAWAL_PER_DAY
            };
        }

        // Check cumulative withdrawals today
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

        const totalWithdrawnToday = (todayWithdrawals || [])
            .reduce((sum, w) => sum + parseFloat(w.metadata?.amount || 0), 0);

        const remainingLimit = this.MAX_WITHDRAWAL_PER_DAY - totalWithdrawnToday;

        if (withdrawalAmount > remainingLimit) {
            return {
                valid: false,
                message: `Daily withdrawal limit exceeded. You have $${remainingLimit.toFixed(2)} remaining today.`,
                dailyLimit: this.MAX_WITHDRAWAL_PER_DAY,
                withdrawnToday: totalWithdrawnToday,
                remainingLimit: remainingLimit
            };
        }

        return {
            valid: true,
            amount: withdrawalAmount,
            message: 'Withdrawal amount is valid',
            dailyLimit: this.MAX_WITHDRAWAL_PER_DAY,
            withdrawnToday: totalWithdrawnToday,
            remainingLimit: remainingLimit - withdrawalAmount
        };
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
            // Investment limits (insurable range)
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
            // Withdrawal limits
            withdrawal: {
                min: this.MIN_WITHDRAWAL_AMOUNT,
                maxPerDay: this.MAX_WITHDRAWAL_PER_DAY,
                message: `Minimum: $${this.MIN_WITHDRAWAL_AMOUNT}. Maximum: $${this.MAX_WITHDRAWAL_PER_DAY} per day.`
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

-- ZimCrowd P2P Lending Markets Schema
-- Primary Market: Borrowers request loans, lenders browse and fund
-- Secondary Market: Lenders sell their loan investments to other lenders
--
-- ZIMSCORE INTEGRATION:
-- - Internal Score: 30-85 (used for risk calculations, not shown to public)
-- - Star Rating: 1.0-5.0 (public display for lenders to see)
-- - Risk Grades: A (75-85), B (65-74), C (55-64), D (45-54), E (30-44)
-- - Interest Rates: Auto-calculated based on internal ZimScore
-- - Lenders see: Star rating, risk grade, recommended rate (NOT internal score)

-- =============================================================================
-- PRIMARY MARKET SCHEMAS (Loan Marketplace)
-- =============================================================================

-- Loan Marketplace Listings (Primary Market)
CREATE TABLE IF NOT EXISTS loan_marketplace_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    borrower_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Loan Request Details
    amount_requested DECIMAL(15,2) NOT NULL CHECK (amount_requested > 0),
    purpose TEXT NOT NULL,
    loan_term_months INTEGER NOT NULL CHECK (loan_term_months > 0),
    requested_interest_rate DECIMAL(5,4), -- Borrower's preferred rate
    max_interest_rate DECIMAL(5,4), -- Maximum rate borrower will accept
    
    -- Borrower Profile for Lenders (using ZimScore system)
    borrower_zimscore_internal INTEGER CHECK (borrower_zimscore_internal >= 30 AND borrower_zimscore_internal <= 85), -- Internal 30-85 score
    borrower_star_rating DECIMAL(2,1) CHECK (borrower_star_rating >= 1.0 AND borrower_star_rating <= 5.0), -- Public 1.0-5.0 stars
    employment_status VARCHAR(50),
    monthly_income DECIMAL(15,2),
    debt_to_income_ratio DECIMAL(5,4),
    loan_history_summary JSONB DEFAULT '{}',
    
    -- Funding Details
    funding_goal DECIMAL(15,2) NOT NULL,
    amount_funded DECIMAL(15,2) DEFAULT 0,
    funding_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN funding_goal > 0 THEN (amount_funded / funding_goal) * 100 ELSE 0 END
    ) STORED,
    min_funding_amount DECIMAL(15,2) DEFAULT 50, -- Minimum lender contribution
    max_funding_amount DECIMAL(15,2), -- Maximum per lender
    
    -- Marketplace Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'funded', 'expired', 'cancelled')),
    listing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    funding_deadline TIMESTAMP WITH TIME ZONE,
    funded_date TIMESTAMP WITH TIME ZONE,
    
    -- Risk Assessment (based on ZimScore)
    risk_grade VARCHAR(5) GENERATED ALWAYS AS (
        CASE 
            WHEN borrower_zimscore_internal >= 75 THEN 'A'
            WHEN borrower_zimscore_internal >= 65 THEN 'B' 
            WHEN borrower_zimscore_internal >= 55 THEN 'C'
            WHEN borrower_zimscore_internal >= 45 THEN 'D'
            ELSE 'E'
        END
    ) STORED, -- Auto-calculated from ZimScore
    default_probability DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN borrower_zimscore_internal >= 75 THEN 0.02 -- 2% default rate for A grade
            WHEN borrower_zimscore_internal >= 65 THEN 0.05 -- 5% default rate for B grade
            WHEN borrower_zimscore_internal >= 55 THEN 0.10 -- 10% default rate for C grade
            WHEN borrower_zimscore_internal >= 45 THEN 0.18 -- 18% default rate for D grade
            ELSE 0.30 -- 30% default rate for E grade
        END
    ) STORED, -- Auto-calculated from ZimScore
    recommended_rate DECIMAL(5,4) GENERATED ALWAYS AS (
        CASE 
            WHEN borrower_zimscore_internal >= 75 THEN 0.12 -- 12% for A grade
            WHEN borrower_zimscore_internal >= 65 THEN 0.15 -- 15% for B grade
            WHEN borrower_zimscore_internal >= 55 THEN 0.18 -- 18% for C grade
            WHEN borrower_zimscore_internal >= 45 THEN 0.22 -- 22% for D grade
            ELSE 0.28 -- 28% for E grade
        END
    ) STORED, -- Auto-calculated from ZimScore
    
    -- Marketplace Features
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    lender_interest_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lender Funding Offers (Primary Market)
CREATE TABLE IF NOT EXISTS lender_funding_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES loan_marketplace_listings(id) ON DELETE CASCADE,
    lender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    
    -- Funding Offer Details
    offer_amount DECIMAL(15,2) NOT NULL CHECK (offer_amount > 0),
    offered_interest_rate DECIMAL(5,4) NOT NULL,
    funding_percentage DECIMAL(5,2), -- What % of total loan this represents
    
    -- Offer Terms
    offer_type VARCHAR(20) DEFAULT 'partial' CHECK (offer_type IN ('partial', 'full', 'conditional')),
    conditions TEXT, -- Any special conditions from lender
    auto_fund BOOLEAN DEFAULT FALSE, -- Auto-fund if rate matches
    
    -- Offer Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'withdrawn')),
    offer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    response_date TIMESTAMP WITH TIME ZONE,
    
    -- Funding Details (when accepted)
    funded_amount DECIMAL(15,2) DEFAULT 0,
    funding_date TIMESTAMP WITH TIME ZONE,
    loan_portion_percentage DECIMAL(5,4), -- Actual % of loan funded by this lender
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(listing_id, lender_user_id) -- One offer per lender per listing
);

-- Loan Funding Rounds (Primary Market)
CREATE TABLE IF NOT EXISTS loan_funding_rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES loan_marketplace_listings(id) ON DELETE CASCADE,
    
    -- Round Details
    round_number INTEGER NOT NULL DEFAULT 1,
    target_amount DECIMAL(15,2) NOT NULL,
    amount_raised DECIMAL(15,2) DEFAULT 0,
    lender_count INTEGER DEFAULT 0,
    
    -- Round Timing
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    actual_close_date TIMESTAMP WITH TIME ZONE,
    
    -- Round Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'successful', 'failed', 'cancelled')),
    success_criteria JSONB DEFAULT '{}', -- Minimum funding requirements
    
    -- Interest Rate
    final_interest_rate DECIMAL(5,4),
    rate_determination_method VARCHAR(20) DEFAULT 'weighted_average' CHECK (rate_determination_method IN ('fixed', 'auction', 'weighted_average')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- SECONDARY MARKET SCHEMAS (Loan Trading)
-- =============================================================================

-- Loan Investment Holdings (What lenders own)
CREATE TABLE IF NOT EXISTS loan_investment_holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    original_funding_offer_id UUID REFERENCES lender_funding_offers(id),
    
    -- Investment Details
    principal_amount DECIMAL(15,2) NOT NULL, -- Original investment
    current_outstanding_balance DECIMAL(15,2) NOT NULL, -- Current balance owed
    loan_percentage DECIMAL(5,4) NOT NULL, -- % of total loan owned
    
    -- Investment Performance
    total_payments_received DECIMAL(15,2) DEFAULT 0,
    interest_earned DECIMAL(15,2) DEFAULT 0,
    principal_repaid DECIMAL(15,2) DEFAULT 0,
    current_yield DECIMAL(5,4),
    total_return DECIMAL(8,4),
    
    -- Investment Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted', 'sold')),
    acquisition_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acquisition_method VARCHAR(20) DEFAULT 'primary' CHECK (acquisition_method IN ('primary', 'secondary')),
    
    -- Secondary Market
    is_for_sale BOOLEAN DEFAULT FALSE,
    sale_price DECIMAL(15,2),
    sale_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(lender_user_id, loan_id)
);

-- Secondary Market Listings (Loan Resale)
CREATE TABLE IF NOT EXISTS secondary_market_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    holding_id UUID NOT NULL REFERENCES loan_investment_holdings(id) ON DELETE CASCADE,
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    
    -- Sale Details
    outstanding_balance DECIMAL(15,2) NOT NULL, -- Current loan balance
    asking_price DECIMAL(15,2) NOT NULL, -- What seller wants
    discount_premium DECIMAL(8,4) GENERATED ALWAYS AS (
        CASE WHEN outstanding_balance > 0 THEN ((asking_price - outstanding_balance) / outstanding_balance) * 100 ELSE 0 END
    ) STORED, -- % discount (-) or premium (+)
    
    -- Loan Performance Data for Buyers
    loan_percentage DECIMAL(5,4) NOT NULL, -- % of total loan being sold
    months_remaining INTEGER,
    current_payment_status VARCHAR(20),
    days_since_last_payment INTEGER,
    total_yield_to_date DECIMAL(5,4),
    projected_yield DECIMAL(5,4),
    
    -- Listing Details
    listing_type VARCHAR(20) DEFAULT 'fixed' CHECK (listing_type IN ('fixed', 'auction', 'negotiable')),
    min_bid_price DECIMAL(15,2), -- For auctions
    reserve_price DECIMAL(15,2), -- For auctions
    auto_accept_price DECIMAL(15,2), -- Instant buy price
    
    -- Timing
    listing_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    listing_expiry TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'expired', 'withdrawn', 'cancelled')),
    
    -- Marketplace Features
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    interest_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secondary Market Purchase Offers
CREATE TABLE IF NOT EXISTS secondary_market_offers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES secondary_market_listings(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Offer Details
    offer_price DECIMAL(15,2) NOT NULL,
    offer_percentage DECIMAL(5,2), -- % of asking price
    offer_type VARCHAR(20) DEFAULT 'full' CHECK (offer_type IN ('full', 'partial')),
    
    -- Offer Terms
    conditions TEXT,
    financing_terms JSONB DEFAULT '{}', -- If buyer needs financing
    
    -- Timing
    offer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    response_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
    response_date TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loan Ownership Transfers (Secondary Market Transactions)
CREATE TABLE IF NOT EXISTS loan_ownership_transfers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    holding_id UUID NOT NULL REFERENCES loan_investment_holdings(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES secondary_market_listings(id),
    offer_id UUID REFERENCES secondary_market_offers(id),
    
    -- Transfer Parties
    seller_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transfer Details
    loan_percentage_transferred DECIMAL(5,4) NOT NULL,
    outstanding_balance_transferred DECIMAL(15,2) NOT NULL,
    sale_price DECIMAL(15,2) NOT NULL,
    transfer_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Transfer Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settlement_date TIMESTAMP WITH TIME ZONE,
    
    -- Documentation
    transfer_agreement_url TEXT,
    legal_documents JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- MARKETPLACE ANALYTICS AND TRACKING
-- =============================================================================

-- Marketplace Statistics
CREATE TABLE IF NOT EXISTS marketplace_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stat_date DATE NOT NULL,
    
    -- Primary Market Stats
    active_listings INTEGER DEFAULT 0,
    new_listings INTEGER DEFAULT 0,
    funded_loans INTEGER DEFAULT 0,
    total_funding_volume DECIMAL(20,2) DEFAULT 0,
    average_funding_time_hours DECIMAL(8,2),
    average_interest_rate DECIMAL(5,4),
    
    -- Secondary Market Stats
    active_secondary_listings INTEGER DEFAULT 0,
    secondary_sales INTEGER DEFAULT 0,
    secondary_volume DECIMAL(20,2) DEFAULT 0,
    average_discount_premium DECIMAL(5,4),
    average_sale_time_days DECIMAL(8,2),
    
    -- Lender Activity
    active_lenders INTEGER DEFAULT 0,
    new_lenders INTEGER DEFAULT 0,
    repeat_lenders INTEGER DEFAULT 0,
    average_investment_size DECIMAL(15,2),
    
    -- Performance Metrics
    default_rate DECIMAL(5,4) DEFAULT 0,
    average_yield DECIMAL(5,4),
    lender_satisfaction_score DECIMAL(3,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stat_date)
);

-- Lender Performance Tracking
CREATE TABLE IF NOT EXISTS lender_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    
    -- Portfolio Summary
    total_investments INTEGER DEFAULT 0,
    total_invested DECIMAL(15,2) DEFAULT 0,
    current_outstanding DECIMAL(15,2) DEFAULT 0,
    total_returns DECIMAL(15,2) DEFAULT 0,
    
    -- Performance Metrics
    portfolio_yield DECIMAL(5,4),
    default_rate DECIMAL(5,4),
    diversification_score DECIMAL(3,2), -- How well diversified
    risk_score DECIMAL(3,2),
    
    -- Activity Metrics
    primary_investments INTEGER DEFAULT 0,
    secondary_purchases INTEGER DEFAULT 0,
    secondary_sales INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lender_user_id, calculation_date)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_loan_marketplace_listings_status ON loan_marketplace_listings(status, listing_date DESC);
CREATE INDEX IF NOT EXISTS idx_loan_marketplace_listings_borrower ON loan_marketplace_listings(borrower_user_id);
CREATE INDEX IF NOT EXISTS idx_loan_marketplace_listings_funding ON loan_marketplace_listings(funding_percentage, status);

CREATE INDEX IF NOT EXISTS idx_lender_funding_offers_listing ON lender_funding_offers(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_lender_funding_offers_lender ON lender_funding_offers(lender_user_id, status);
CREATE INDEX IF NOT EXISTS idx_lender_funding_offers_rate ON lender_funding_offers(offered_interest_rate, status);

CREATE INDEX IF NOT EXISTS idx_loan_investment_holdings_lender ON loan_investment_holdings(lender_user_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_investment_holdings_loan ON loan_investment_holdings(loan_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_investment_holdings_sale ON loan_investment_holdings(is_for_sale, status);

CREATE INDEX IF NOT EXISTS idx_secondary_market_listings_status ON secondary_market_listings(status, listing_date DESC);
CREATE INDEX IF NOT EXISTS idx_secondary_market_listings_seller ON secondary_market_listings(seller_user_id);
CREATE INDEX IF NOT EXISTS idx_secondary_market_listings_price ON secondary_market_listings(discount_premium, status);

CREATE INDEX IF NOT EXISTS idx_secondary_market_offers_listing ON secondary_market_offers(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_secondary_market_offers_buyer ON secondary_market_offers(buyer_user_id, status);

CREATE INDEX IF NOT EXISTS idx_loan_ownership_transfers_loan ON loan_ownership_transfers(loan_id, status);
CREATE INDEX IF NOT EXISTS idx_loan_ownership_transfers_parties ON loan_ownership_transfers(seller_user_id, buyer_user_id);

CREATE INDEX IF NOT EXISTS idx_marketplace_statistics_date ON marketplace_statistics(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_lender_performance_lender_date ON lender_performance(lender_user_id, calculation_date DESC);

-- =============================================================================
-- VIEWS FOR MARKETPLACE OPERATIONS
-- =============================================================================

-- Active Primary Market Listings
CREATE OR REPLACE VIEW active_loan_marketplace AS
SELECT
    lml.id,
    lml.loan_id,
    lml.borrower_user_id,
    up.first_name || ' ' || up.last_name as borrower_name,
    lml.amount_requested,
    lml.loan_term_months,
    lml.requested_interest_rate,
    lml.borrower_star_rating, -- Show public star rating to lenders
    lml.risk_grade, -- Show calculated risk grade
    lml.recommended_rate, -- Show recommended interest rate
    lml.funding_goal,
    lml.amount_funded,
    lml.funding_percentage,
    lml.listing_date,
    lml.funding_deadline,
    COUNT(lfo.id) as lender_offers,
    AVG(lfo.offered_interest_rate) as avg_offered_rate,
    MIN(lfo.offered_interest_rate) as min_offered_rate
FROM loan_marketplace_listings lml
LEFT JOIN user_profiles up ON lml.borrower_user_id = up.user_id
LEFT JOIN lender_funding_offers lfo ON lml.id = lfo.listing_id AND lfo.status = 'pending'
WHERE lml.status = 'active'
GROUP BY lml.id, up.first_name, up.last_name
ORDER BY lml.listing_date DESC;

-- Active Secondary Market Listings
CREATE OR REPLACE VIEW active_secondary_market AS
SELECT
    sml.id,
    sml.loan_id,
    sml.seller_user_id,
    up.first_name || ' ' || up.last_name as seller_name,
    sml.outstanding_balance,
    sml.asking_price,
    sml.discount_premium,
    sml.loan_percentage,
    sml.months_remaining,
    sml.current_payment_status,
    sml.projected_yield,
    sml.listing_date,
    sml.listing_expiry,
    COUNT(smo.id) as buyer_offers,
    MAX(smo.offer_price) as highest_offer
FROM secondary_market_listings sml
LEFT JOIN user_profiles up ON sml.seller_user_id = up.user_id
LEFT JOIN secondary_market_offers smo ON sml.id = smo.listing_id AND smo.status = 'pending'
WHERE sml.status = 'active'
GROUP BY sml.id, up.first_name, up.last_name
ORDER BY sml.listing_date DESC;

-- Lender Portfolio Summary
CREATE OR REPLACE VIEW lender_portfolio_summary AS
SELECT
    lih.lender_user_id,
    COUNT(*) as total_investments,
    SUM(lih.principal_amount) as total_invested,
    SUM(lih.current_outstanding_balance) as current_outstanding,
    SUM(lih.total_payments_received) as total_received,
    SUM(lih.interest_earned) as total_interest,
    AVG(lih.current_yield) as average_yield,
    COUNT(CASE WHEN lih.status = 'active' THEN 1 END) as active_investments,
    COUNT(CASE WHEN lih.status = 'defaulted' THEN 1 END) as defaulted_investments,
    COUNT(CASE WHEN lih.is_for_sale = true THEN 1 END) as for_sale_count
FROM loan_investment_holdings lih
GROUP BY lih.lender_user_id;

-- =============================================================================
-- FUNCTIONS FOR MARKETPLACE OPERATIONS
-- =============================================================================

-- Function to get borrower ZimScore data for marketplace listing
CREATE OR REPLACE FUNCTION get_borrower_zimscore_data(borrower_id UUID)
RETURNS TABLE(
    internal_score INTEGER,
    star_rating DECIMAL(2,1),
    max_loan_amount DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(uz.score_value, 30) as internal_score,
        COALESCE(uz.star_rating, 1.0) as star_rating,
        COALESCE(uz.max_loan_amount, 1000.00) as max_loan_amount
    FROM user_zimscores uz
    WHERE uz.user_id = borrower_id
    UNION ALL
    SELECT 30, 1.0, 1000.00 -- Default values if no ZimScore found
    WHERE NOT EXISTS (SELECT 1 FROM user_zimscores WHERE user_id = borrower_id)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate loan funding status
CREATE OR REPLACE FUNCTION update_loan_funding_status(loan_listing_id UUID)
RETURNS VOID AS $$
DECLARE
    total_funded DECIMAL(15,2);
    funding_goal DECIMAL(15,2);
    funding_pct DECIMAL(5,2);
BEGIN
    -- Calculate total funded amount
    SELECT COALESCE(SUM(lfo.funded_amount), 0), lml.funding_goal
    INTO total_funded, funding_goal
    FROM loan_marketplace_listings lml
    LEFT JOIN lender_funding_offers lfo ON lml.id = lfo.listing_id AND lfo.status = 'accepted'
    WHERE lml.id = loan_listing_id
    GROUP BY lml.funding_goal;
    
    -- Update the listing
    UPDATE loan_marketplace_listings
    SET 
        amount_funded = total_funded,
        status = CASE 
            WHEN total_funded >= funding_goal THEN 'funded'
            WHEN NOW() > funding_deadline THEN 'expired'
            ELSE status
        END,
        funded_date = CASE WHEN total_funded >= funding_goal THEN NOW() ELSE funded_date END
    WHERE id = loan_listing_id;
END;
$$ LANGUAGE plpgsql;

-- Function to transfer loan ownership
CREATE OR REPLACE FUNCTION transfer_loan_ownership(
    transfer_id UUID,
    seller_id UUID,
    buyer_id UUID,
    loan_holding_id UUID,
    sale_price DECIMAL(15,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    transfer_successful BOOLEAN := FALSE;
    holding_record RECORD;
BEGIN
    -- Get the holding details
    SELECT * INTO holding_record
    FROM loan_investment_holdings
    WHERE id = loan_holding_id AND lender_user_id = seller_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Create new holding for buyer
    INSERT INTO loan_investment_holdings (
        lender_user_id,
        loan_id,
        principal_amount,
        current_outstanding_balance,
        loan_percentage,
        status,
        acquisition_method
    ) VALUES (
        buyer_id,
        holding_record.loan_id,
        sale_price, -- New principal amount is the purchase price
        holding_record.current_outstanding_balance,
        holding_record.loan_percentage,
        'active',
        'secondary'
    );
    
    -- Update seller's holding to sold
    UPDATE loan_investment_holdings
    SET 
        status = 'sold',
        sale_price = sale_price,
        sale_date = NOW()
    WHERE id = loan_holding_id;
    
    -- Update transfer record
    UPDATE loan_ownership_transfers
    SET 
        status = 'completed',
        settlement_date = NOW()
    WHERE id = transfer_id;
    
    transfer_successful := TRUE;
    RETURN transfer_successful;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================

-- Sample marketplace listing (only if loans exist and have data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loans') 
       AND EXISTS (SELECT 1 FROM loans WHERE status = 'pending' LIMIT 1) THEN
        
        -- Check what columns actually exist in loans table and insert accordingly
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'term_months') THEN
            INSERT INTO loan_marketplace_listings (
                loan_id, borrower_user_id, amount_requested, purpose, loan_term_months,
                requested_interest_rate, max_interest_rate, funding_goal, funding_deadline, risk_grade
            ) 
            SELECT 
                l.id, 
                l.user_id, 
                l.amount, 
                'Business expansion', 
                l.term_months,
                0.15, 
                0.18, 
                l.amount, 
                NOW() + INTERVAL '30 days', 
                'B'
            FROM loans l 
            WHERE l.status = 'pending' 
            LIMIT 1
            ON CONFLICT DO NOTHING;
        ELSE
            -- Use default values if term_months column doesn't exist
            INSERT INTO loan_marketplace_listings (
                loan_id, borrower_user_id, amount_requested, purpose, loan_term_months,
                requested_interest_rate, max_interest_rate, funding_goal, funding_deadline, risk_grade
            ) 
            SELECT 
                l.id, 
                l.user_id, 
                l.amount, 
                'Business expansion', 
                12, -- Default to 12 months
                0.15, 
                0.18, 
                l.amount, 
                NOW() + INTERVAL '30 days', 
                'B'
            FROM loans l 
            WHERE l.status = 'pending' 
            LIMIT 1
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT
    '🎯 P2P LENDING MARKETS COMPLETED' as status,
    'Primary & Secondary loan markets now fully implemented' as message,
    '• Loan Marketplace • Lender Funding • Secondary Trading • Ownership Transfers' as features,
    'ZimCrowd P2P lending platform ready for launch!' as next_step;

-- ZimCrowd Primary and Secondary Market Schemas
-- Complete trading platform with IPOs, bond issuances, and securities trading

-- =============================================================================
-- PRIMARY MARKET SCHEMAS (New Security Issuances)
-- =============================================================================

-- IPO/Book Building Table (Primary Market - Equity)
CREATE TABLE IF NOT EXISTS ipo_offerings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    company_description TEXT,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    sector VARCHAR(100),
    industry VARCHAR(100),
    total_shares BIGINT NOT NULL,
    shares_offered BIGINT NOT NULL,
    price_per_share DECIMAL(10,2) NOT NULL,
    min_investment DECIMAL(10,2) DEFAULT 50,
    max_investment DECIMAL(15,2),
    issue_date DATE NOT NULL,
    subscription_start DATE NOT NULL,
    subscription_end DATE NOT NULL,
    allotment_date DATE,
    listing_date DATE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'announced', 'open', 'closed', 'allotted', 'listed', 'cancelled')),
    prospectus_url TEXT,
    financials JSONB DEFAULT '{}',
    risk_factors JSONB DEFAULT '[]',
    use_of_proceeds JSONB DEFAULT '{}',
    lead_managers JSONB DEFAULT '[]',
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bond Issuances Table (Primary Market - Debt)
CREATE TABLE IF NOT EXISTS bond_issuances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    issuer_name VARCHAR(200) NOT NULL,
    issuer_type VARCHAR(50) CHECK (issuer_type IN ('government', 'corporate', 'municipal', 'supranational')),
    bond_type VARCHAR(50) CHECK (bond_type IN ('government', 'corporate', 'municipal', 'sovereign', 'high_yield')),
    symbol VARCHAR(10) NOT NULL UNIQUE,
    face_value DECIMAL(15,2) NOT NULL,
    coupon_rate DECIMAL(5,4),
    maturity_years INTEGER NOT NULL,
    issue_size DECIMAL(20,2) NOT NULL,
    issue_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    payment_frequency VARCHAR(20) DEFAULT 'semi-annual' CHECK (payment_frequency IN ('annual', 'semi-annual', 'quarterly', 'monthly')),
    credit_rating VARCHAR(10),
    collateral_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'announced', 'open', 'closed', 'issued', 'cancelled')),
    prospectus_url TEXT,
    covenants JSONB DEFAULT '[]',
    risk_factors JSONB DEFAULT '[]',
    use_of_proceeds JSONB DEFAULT '{}',
    underwriters JSONB DEFAULT '[]',
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security Subscriptions (Primary Market Applications)
CREATE TABLE IF NOT EXISTS security_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    security_type VARCHAR(20) NOT NULL CHECK (security_type IN ('ipo', 'bond')),
    security_id UUID NOT NULL,
    quantity BIGINT NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    application_number VARCHAR(50) UNIQUE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'confirmed', 'allotted', 'refunded', 'cancelled')),
    allotment_quantity BIGINT DEFAULT 0,
    allotment_price DECIMAL(10,2),
    allotment_date DATE,
    demat_account VARCHAR(50),
    bank_details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_security_id CHECK (
        (security_type = 'ipo' AND EXISTS (SELECT 1 FROM ipo_offerings WHERE id = security_id)) OR
        (security_type = 'bond' AND EXISTS (SELECT 1 FROM bond_issuances WHERE id = security_id))
    )
);

-- =============================================================================
-- SECONDARY MARKET SCHEMAS (Trading Platform)
-- =============================================================================

-- Listed Securities Table (Secondary Market)
CREATE TABLE IF NOT EXISTS listed_securities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    security_name VARCHAR(200) NOT NULL,
    security_type VARCHAR(20) NOT NULL CHECK (security_type IN ('equity', 'bond', 'etf', 'mutual_fund')),
    sector VARCHAR(100),
    industry VARCHAR(100),
    total_shares BIGINT,
    outstanding_bonds DECIMAL(20,2),
    face_value DECIMAL(15,2),
    current_price DECIMAL(10,2),
    market_cap DECIMAL(20,2),
    dividend_yield DECIMAL(5,4),
    pe_ratio DECIMAL(8,2),
    pb_ratio DECIMAL(8,2),
    credit_rating VARCHAR(10),
    listing_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    exchange VARCHAR(50) DEFAULT 'ZSE',
    currency VARCHAR(3) DEFAULT 'USD',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Orders Table (Secondary Market Trading)
CREATE TABLE IF NOT EXISTS market_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    security_symbol VARCHAR(10) NOT NULL REFERENCES listed_securities(symbol),
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('buy', 'sell')),
    order_category VARCHAR(20) NOT NULL CHECK (order_category IN ('market', 'limit', 'stop', 'stop_limit')),
    quantity BIGINT NOT NULL,
    price DECIMAL(10,2),
    stop_price DECIMAL(10,2),
    time_in_force VARCHAR(20) DEFAULT 'day' CHECK (time_in_force IN ('day', 'gtc', 'ioc', 'fok')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'filled', 'cancelled', 'expired', 'rejected')),
    filled_quantity BIGINT DEFAULT 0,
    remaining_quantity BIGINT DEFAULT 0,
    average_price DECIMAL(10,2),
    total_value DECIMAL(15,2),
    commission DECIMAL(10,2) DEFAULT 0,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiry_date TIMESTAMP WITH TIME ZONE,
    broker_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade Executions Table (Completed Trades)
CREATE TABLE IF NOT EXISTS trade_executions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    buy_order_id UUID NOT NULL REFERENCES market_orders(id),
    sell_order_id UUID NOT NULL REFERENCES market_orders(id),
    security_symbol VARCHAR(10) NOT NULL REFERENCES listed_securities(symbol),
    quantity BIGINT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    buyer_user_id UUID NOT NULL REFERENCES auth.users(id),
    seller_user_id UUID NOT NULL REFERENCES auth.users(id),
    commission DECIMAL(10,2) DEFAULT 0,
    settlement_date DATE,
    settlement_status VARCHAR(20) DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'settled', 'failed')),
    trade_reference VARCHAR(50) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio Holdings (User's Securities)
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    security_symbol VARCHAR(10) NOT NULL REFERENCES listed_securities(symbol),
    quantity BIGINT NOT NULL CHECK (quantity >= 0),
    average_cost DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2) DEFAULT 0,
    total_dividends DECIMAL(15,2) DEFAULT 0,
    total_return DECIMAL(15,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, security_symbol)
);

-- Market Data (Real-time Price Feeds)
CREATE TABLE IF NOT EXISTS market_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    security_symbol VARCHAR(10) NOT NULL REFERENCES listed_securities(symbol),
    price_date DATE NOT NULL,
    price_time TIME NOT NULL,
    open_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    volume BIGINT,
    vwap DECIMAL(10,2),
    bid_price DECIMAL(10,2),
    ask_price DECIMAL(10,2),
    bid_size BIGINT,
    ask_size BIGINT,
    market_cap DECIMAL(20,2),
    pe_ratio DECIMAL(8,2),
    dividend_yield DECIMAL(5,4),
    data_source VARCHAR(50),
    is_intraday BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(security_symbol, price_date, price_time)
);

-- Dividend Records
CREATE TABLE IF NOT EXISTS dividend_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    security_symbol VARCHAR(10) NOT NULL REFERENCES listed_securities(symbol),
    dividend_type VARCHAR(20) DEFAULT 'cash' CHECK (dividend_type IN ('cash', 'stock', 'special')),
    amount_per_share DECIMAL(8,4) NOT NULL,
    total_dividend DECIMAL(15,2),
    ex_dividend_date DATE NOT NULL,
    record_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    payout_ratio DECIMAL(5,4),
    status VARCHAR(20) DEFAULT 'announced' CHECK (status IN ('announced', 'ex_dividend', 'paid', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- MARKET INFRASTRUCTURE TABLES
-- =============================================================================

-- Trading Sessions
CREATE TABLE IF NOT EXISTS trading_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_date DATE NOT NULL,
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('pre_open', 'opening', 'continuous', 'closing', 'post_close')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    market_status VARCHAR(20) DEFAULT 'open' CHECK (market_status IN ('open', 'closed', 'halted', 'suspended')),
    halt_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_date, session_type)
);

-- Circuit Breakers
CREATE TABLE IF NOT EXISTS circuit_breakers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    security_symbol VARCHAR(10) REFERENCES listed_securities(symbol),
    trigger_level DECIMAL(5,4) NOT NULL, -- e.g., 0.10 for 10%
    trigger_type VARCHAR(20) NOT NULL CHECK (trigger_type IN ('price', 'volume', 'index')),
    halt_duration_minutes INTEGER NOT NULL,
    is_index_wide BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP WITH TIME ZONE,
    resumed_at TIMESTAMP WITH TIME ZONE,
    trigger_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Statistics
CREATE TABLE IF NOT EXISTS market_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stat_date DATE NOT NULL,
    total_volume BIGINT DEFAULT 0,
    total_value DECIMAL(20,2) DEFAULT 0,
    traded_securities INTEGER DEFAULT 0,
    advancers INTEGER DEFAULT 0,
    decliners INTEGER DEFAULT 0,
    unchanged INTEGER DEFAULT 0,
    market_breadth DECIMAL(5,4), -- (advancers - decliners) / (advancers + decliners)
    vix_index DECIMAL(8,4), -- Zimbabwe market volatility index
    market_cap DECIMAL(25,2),
    turnover_ratio DECIMAL(8,4),
    foreign_investor_activity DECIMAL(5,4),
    institutional_activity DECIMAL(5,4),
    retail_activity DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stat_date)
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_ipo_offerings_status ON ipo_offerings(status, subscription_end);
CREATE INDEX IF NOT EXISTS idx_bond_issuances_status ON bond_issuances(status, maturity_date);
CREATE INDEX IF NOT EXISTS idx_security_subscriptions_user ON security_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_security_subscriptions_security ON security_subscriptions(security_type, security_id, status);
CREATE INDEX IF NOT EXISTS idx_listed_securities_symbol ON listed_securities(symbol);
CREATE INDEX IF NOT EXISTS idx_listed_securities_sector ON listed_securities(sector, industry);
CREATE INDEX IF NOT EXISTS idx_market_orders_user ON market_orders(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_orders_symbol ON market_orders(security_symbol, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_executions_symbol ON trade_executions(security_symbol, execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_date ON market_data(security_symbol, price_date DESC, price_time DESC);
CREATE INDEX IF NOT EXISTS idx_dividend_records_symbol ON dividend_records(security_symbol, ex_dividend_date DESC);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_date ON trading_sessions(session_date, session_type);
CREATE INDEX IF NOT EXISTS idx_market_statistics_date ON market_statistics(stat_date DESC);

-- =============================================================================
-- VIEWS FOR MARKET ANALYSIS
-- =============================================================================

-- Real-time portfolio performance
CREATE OR REPLACE VIEW portfolio_performance AS
SELECT
    ph.user_id,
    ph.security_symbol,
    ls.security_name,
    ls.security_type,
    ph.quantity,
    ph.average_cost,
    md.close_price as current_price,
    ph.quantity * md.close_price as current_value,
    ph.unrealized_pnl,
    ROUND(((md.close_price - ph.average_cost) / ph.average_cost) * 100, 2) as return_percentage,
    ph.last_updated
FROM portfolio_holdings ph
JOIN listed_securities ls ON ph.security_symbol = ls.symbol
LEFT JOIN market_data md ON ph.security_symbol = md.security_symbol
    AND md.price_date = CURRENT_DATE
    AND md.price_time = (SELECT MAX(price_time) FROM market_data WHERE security_symbol = ph.security_symbol AND price_date = CURRENT_DATE);

-- Active IPOs and bond issuances
CREATE OR REPLACE VIEW active_primary_offerings AS
SELECT
    'IPO' as offering_type,
    company_name as issuer,
    symbol,
    total_shares as total_units,
    shares_offered as units_offered,
    price_per_share as price_per_unit,
    subscription_end as closing_date,
    status
FROM ipo_offerings
WHERE status IN ('open', 'announced')
UNION ALL
SELECT
    'Bond' as offering_type,
    issuer_name as issuer,
    symbol,
    issue_size / face_value as total_units,
    issue_size as units_offered,
    face_value as price_per_unit,
    NULL as closing_date,
    status
FROM bond_issuances
WHERE status IN ('open', 'announced');

-- Market movers (biggest gainers/losers)
CREATE OR REPLACE VIEW market_movers AS
SELECT
    md.security_symbol,
    ls.security_name,
    md.close_price,
    md_prev.close_price as previous_close,
    ROUND(((md.close_price - md_prev.close_price) / md_prev.close_price) * 100, 2) as price_change_pct,
    md.volume,
    CASE
        WHEN (md.close_price - md_prev.close_price) > 0 THEN 'gainer'
        ELSE 'loser'
    END as direction
FROM market_data md
JOIN market_data md_prev ON md.security_symbol = md_prev.security_symbol
    AND md_prev.price_date = md.price_date - INTERVAL '1 day'
    AND md_prev.price_time = (SELECT MAX(price_time) FROM market_data WHERE security_symbol = md.security_symbol AND price_date = md_prev.price_date)
JOIN listed_securities ls ON md.security_symbol = ls.symbol
WHERE md.price_date = CURRENT_DATE
    AND md.price_time = (SELECT MAX(price_time) FROM market_data WHERE security_symbol = md.security_symbol AND price_date = CURRENT_DATE)
ORDER BY ABS((md.close_price - md_prev.close_price) / md_prev.close_price) DESC;

-- =============================================================================
-- FUNCTIONS FOR MARKET OPERATIONS
-- =============================================================================

-- Function to calculate portfolio total value
CREATE OR REPLACE FUNCTION calculate_portfolio_value(user_uuid UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    total_value DECIMAL(15,2) := 0;
BEGIN
    SELECT COALESCE(SUM(quantity * COALESCE(md.close_price, ph.average_cost)), 0)
    INTO total_value
    FROM portfolio_holdings ph
    LEFT JOIN market_data md ON ph.security_symbol = md.security_symbol
        AND md.price_date = CURRENT_DATE
        AND md.price_time = (SELECT MAX(price_time) FROM market_data WHERE security_symbol = ph.security_symbol AND price_date = CURRENT_DATE)
    WHERE ph.user_id = user_uuid;

    RETURN total_value;
END;
$$ LANGUAGE plpgsql;

-- Function to get current market price
CREATE OR REPLACE FUNCTION get_current_price(security_sym VARCHAR(10))
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_price DECIMAL(10,2);
BEGIN
    SELECT close_price INTO current_price
    FROM market_data
    WHERE security_symbol = security_sym
        AND price_date = CURRENT_DATE
        AND price_time = (SELECT MAX(price_time) FROM market_data WHERE security_symbol = security_sym AND price_date = CURRENT_DATE);

    IF current_price IS NULL THEN
        SELECT current_price INTO current_price
        FROM listed_securities
        WHERE symbol = security_sym;
    END IF;

    RETURN current_price;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================

-- Sample Zimbabwe Stock Exchange listings
INSERT INTO listed_securities (symbol, security_name, security_type, sector, industry, total_shares, current_price, listing_date) VALUES
('ECO', 'Econet Wireless Zimbabwe', 'equity', 'Telecommunications', 'Mobile Services', 1000000000, 45.50, '2010-01-01'),
('INN', 'Innscor Africa Limited', 'equity', 'Consumer Goods', 'Food Production', 500000000, 78.25, '1998-01-01'),
('AXL', 'African Sun Limited', 'equity', 'Consumer Services', 'Hotels & Tourism', 300000000, 12.80, '1997-01-01'),
('DLTA', 'Delta Corporation', 'equity', 'Beverages', 'Breweries', 800000000, 152.00, '1963-01-01'),
('ZIM', 'Zimbabwe Government Bond', 'bond', 'Government', 'Sovereign Debt', NULL, 98.50, '2024-01-01')
ON CONFLICT (symbol) DO NOTHING;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================

SELECT
    '🎯 PRIMARY & SECONDARY MARKET SCHEMAS COMPLETED' as status,
    'ZimCrowd now supports full capital markets operations' as message,
    '• IPO/Book Building • Bond Issuances • Stock Trading • Market Data • Portfolio Management' as features,
    'Ready for securities trading platform launch!' as next_step;

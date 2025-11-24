# Production Data Implementation Plan

## Current Status Analysis

### ✅ Already Implemented (Partial)
1. **Dashboard Overview** - `/api/dashboard/` endpoint exists
2. **Wallet Balance** - `/api/wallet/balance` endpoint exists
3. **Transactions** - `/api/transactions` endpoint exists
4. **Profile** - `/api/profile` endpoint exists

### ❌ Missing/Static Data Sections

#### 1. **My Loans Section**
- **Static Data**: Loan cards with hardcoded values
- **Needed**: 
  - `/api/loans/my-loans` - Get user's loans
  - `/api/loans/:id` - Get loan details
  - `/api/loans/:id/payments` - Get payment history
  - `/api/loans/apply` - Apply for new loan

#### 2. **Investments Section**
- **Static Data**: Investment opportunities, portfolio
- **Needed**:
  - `/api/investments/my-investments` - Get user's investments
  - `/api/investments/opportunities` - Get available opportunities
  - `/api/investments/:id` - Get investment details
  - `/api/investments/create` - Make new investment

#### 3. **Analytics Section**
- **Static Data**: Charts with mock data
- **Needed**:
  - `/api/analytics/portfolio-history` - Portfolio performance over time
  - `/api/analytics/loan-distribution` - Loan type distribution
  - `/api/analytics/monthly-activity` - Monthly transaction activity
  - `/api/analytics/roi` - Return on investment metrics

#### 4. **Referral Program**
- **Static Data**: Referral code, stats
- **Needed**:
  - `/api/referrals/code` - Get user's referral code
  - `/api/referrals/stats` - Get referral statistics
  - `/api/referrals/my-referrals` - Get referred users
  - `/api/referrals/earnings` - Get referral earnings

#### 5. **Settings Sections**
- **Security Tab**: Password change, 2FA, login activity
- **Notifications Tab**: Email/SMS/Push preferences
- **Display Tab**: Language, currency, theme preferences
- **Investment Tab**: Auto-invest settings, risk preferences
- **Privacy Tab**: Data sharing, portfolio visibility
- **Documents Tab**: KYC documents, statements, contracts

### 📊 Database Tables Needed

```sql
-- Loans table
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    loan_type VARCHAR(50),
    amount DECIMAL(12, 2),
    interest_rate DECIMAL(5, 2),
    term_months INTEGER,
    status VARCHAR(20),
    purpose TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP,
    disbursed_at TIMESTAMP
);

-- Investments table
CREATE TABLE investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    loan_id UUID REFERENCES loans(id),
    amount DECIMAL(12, 2),
    expected_return DECIMAL(5, 2),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transactions table (already exists, may need updates)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    type VARCHAR(20),
    amount DECIMAL(12, 2),
    status VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Referrals table
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES profiles(id),
    referred_id UUID REFERENCES profiles(id),
    referral_code VARCHAR(20),
    status VARCHAR(20),
    earnings DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id),
    notifications_email BOOLEAN DEFAULT true,
    notifications_sms BOOLEAN DEFAULT false,
    notifications_push BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'en',
    currency VARCHAR(10) DEFAULT 'USD',
    theme VARCHAR(20) DEFAULT 'dark',
    auto_invest_enabled BOOLEAN DEFAULT false,
    auto_invest_amount DECIMAL(12, 2),
    risk_preference VARCHAR(20) DEFAULT 'moderate',
    portfolio_public BOOLEAN DEFAULT false,
    two_factor_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    type VARCHAR(50),
    file_url TEXT,
    status VARCHAR(20),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Login activity table
CREATE TABLE login_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id),
    ip_address VARCHAR(45),
    device TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Priority

### Phase 1: Core Financial Data (High Priority)
1. ✅ Wallet & Balance
2. ✅ Transactions
3. 🔄 Loans (My Loans section)
4. 🔄 Investments (Portfolio & Opportunities)

### Phase 2: Analytics & Insights (Medium Priority)
1. Portfolio performance charts
2. Loan distribution
3. Monthly activity
4. ROI metrics

### Phase 3: User Management (Medium Priority)
1. Referral system
2. Settings (all tabs)
3. Document management
4. Login activity tracking

### Phase 4: Advanced Features (Low Priority)
1. Real-time notifications
2. WebSocket updates
3. Advanced filtering
4. Export functionality

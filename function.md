# Zimcrowd Mobile App Functions — Complete User Journey


## Overview
The Zimcrowd mobile app is a comprehensive peer-to-peer lending platform that connects borrowers and lenders in Zimbabwe. This document describes the complete user journey from authentication through all app functions, ending with the AI-powered financial assistant (Kairo AI).


## 1. Authentication & Onboarding


### Initial App Launch
- **Splash Screen**: App logo and loading animation
- **Language Selection**: Choose preferred language (English/Shona/Ndebele)
- **Permissions Request**: Location, camera, contacts, notifications


### User Registration
1. **Phone Number Verification**:
   - Enter Zimbabwe phone number (+263)
   - OTP sent via SMS (Twilio/Supabase)
   - OTP verification with 6-digit code


2. **Personal Profile Setup**:
   - Full name, date of birth, gender
   - Residential address and location
   - Employment status and income range
   - Next of kin details for verification


3. **Identity Verification (KYC)**:
   - National ID upload (OCR processing)
   - Facial recognition verification
   - Address confirmation
   - Biometric data capture


4. **Financial Profile**:
   - Monthly income and expenses
   - Existing loans and credit history
   - Bank account details
   - Mobile money wallet information


5. **Employment Verification**:
   - Employer details and contact
   - Payslip upload (optional)
   - Employment contract verification


6. **ZimScore Calculation**:
   - **Three-Component Scoring System**:
     - **Initial Risk Assessment (30-60 points)**: Banking data analysis (cash flow, account health, account age)
     - **Employment Bonus (0-10 points)**: Zimbabwe-specific employment factors (government/private/business/informal)
     - **Performance Adjustment (-20 to +39 points)**: Platform behavior (repayment history, loan progression, tenure)
   - **Final Score Range**: 30-85 points (higher = lower risk)
   - **Tier Assignment**: A (80-85), B (70-79), C (60-69), D (50-59), Building Credit (30-49)
   - **Dynamic Updates**: Score recalculates after payments, new data, platform activity
   - **Loan Limits**: Progressive access based on score ($100-$1,000 for regular users, up to $2,500 for civil servants)
   - **Interest Rate Access**: All users can choose 3-10% rates regardless of score


### Login Process
- **Phone/Email Login**: Enter registered phone or email
- **OTP Verification**: 6-digit code sent via SMS/email
- **Biometric Login**: Fingerprint/Face ID (optional)
- **Remember Device**: Skip OTP for trusted devices


## 2. Main App Interface (Tab Navigation)


### Home Tab — Dashboard Overview
**Primary Functions:**
- **Balance Display**: Available funds and CrowdCredits
- **ZimScore Card**: Current credit score with tier indicator
- **Quick Actions**: Request loan, invest, add funds, view portfolio
- **Recent Activity**: Latest transactions and loan updates
- **Overdue Alerts**: Payment reminders with direct action buttons


**Key Features:**
- **Real-time Updates**: Live balance and status changes
- **Personalized Welcome**: Time-based greetings
- **Action Shortcuts**: One-tap access to common functions
- **Status Indicators**: Visual cues for account health


### Market Tab — Loan Marketplace
**Primary Functions:**
- **Browse Loan Opportunities**: Primary and secondary markets
- **ZimCredit Instant Loans**: Immediate funding options
- **Loan Filtering**: Amount, interest rate, ZimScore, purpose
- **Investment Calculator**: Returns and risk assessment


**Market Types:**
1. **ZimCredit Loans**:
   - Instant approval (up to $500)
   - Higher interest rates (195.5% APR)
   - No credit check required
   - Immediate disbursement


2. **Primary Market**:
   - Borrower loan requests
   - Community funding model
   - Varying interest rates (8-25%)
   - Funding progress tracking


3. **Secondary Market**:
   - Existing performing loans
   - Purchase from current lenders
   - Lower risk investments
   - Fixed returns


**Investment Process:**
1. **Loan Selection**: Review borrower details and terms
2. **Risk Assessment**: ZimScore and loan purpose evaluation
3. **Funding Amount**: Choose investment amount ($100 minimum)
4. **Fee Calculation**: Platform fees (10%) and insurance (3%)
5. **Confirmation**: Review terms and complete investment


### Portfolio Tab — Investment & Loan Management
**Primary Functions:**
- **Loans Owed**: Borrower's outstanding loans
- **Investments Made**: Lender's funded loans
- **Performance Tracking**: Returns and payment status
- **CrowdCredits Protection**: Late payment safeguards


**Portfolio Views:**
1. **Borrower Perspective**:
   - Active loans with payment schedules
   - Next payment due dates
   - Late payment warnings
   - Repayment progress


2. **Lender Perspective**:
   - Funded loan performance
   - Interest earnings
   - Risk indicators
   - Secondary market opportunities


**Advanced Features:**
- **CrowdCredits System**: Protection against late payments
- **Yield Calculations**: Real-time return computations
- **Risk Monitoring**: Portfolio diversification analysis
- **Reporting**: Detailed performance reports


### Payment Tab — Transaction Management
**Primary Functions:**
- **Payment Processing**: Loan payments and fees
- **Payment Methods**: Multiple options and preferences
- **Transaction History**: Complete payment records
- **Receipt Management**: Digital receipts and downloads


**Payment Methods:**
1. **Mobile Money**:
   - EcoCash (primary)
   - OneMoney
   - InnBucks
   - O'mari


2. **Bank Transfers**:
   - Direct bank account payments
   - RTGS/SWIFT transfers


3. **Card Payments**:
   - Visa/Mastercard
   - PayNow integration


**Payment Flow:**
1. **Payment Initiation**: Select loan and amount
2. **Method Selection**: Choose preferred payment method
3. **Processing**: Secure payment gateway integration
4. **Confirmation**: Real-time status updates
5. **Receipt**: Digital receipt generation


### Wallet Tab — Financial Management
**Primary Functions:**
- **Balance Management**: Funds and CrowdCredits tracking
- **Add Funds**: Multiple deposit methods
- **Withdraw Funds**: Transfer to external accounts
- **Transaction History**: Complete financial records


**Wallet Features:**
1. **Dual Balance System**:
   - **Zimcrowd Cash**: Withdrawable funds
   - **CrowdCredits**: Non-cash rewards (expires in 180 days)


2. **Fund Management**:
   - Add money via mobile money/bank/card
   - Withdraw to registered accounts
   - Transfer between users


3. **Payment Methods Management**:
   - Add/remove payment methods
   - Set default preferences
   - Verification status tracking


### Profile Tab — Account Management
**Primary Functions:**
- **Personal Information**: Update profile details
- **ZimScore History**: Credit score tracking over time
- **Document Management**: KYC and verification documents
- **Settings & Preferences**: App customization


**Profile Sections:**
1. **Account Settings**:
   - Personal details update
   - Contact information
   - Notification preferences


2. **Financial Profile**:
   - Income and expense tracking
   - Credit score history
   - Loan application history


3. **Security Settings**:
   - Password management
   - Biometric authentication
   - Login history


4. **Support & Help**:
   - FAQ and help articles
   - Contact support
   - App feedback


## 3. AI-Powered Financial Assistant (Kairo AI)


### AI Chat Interface
**Primary Functions:**
- **Conversational Support**: Natural language financial assistance
- **Personalized Advice**: Context-aware recommendations
- **Real-time Information**: Live account and market data access
- **Educational Content**: Financial literacy and best practices


### AI Capabilities


#### Account & Credit Information
```
User: "What's my ZimScore?"
Kairo: "Your current ZimScore is 785 (Tier A). You've improved 45 points this month through consistent payments. Your credit limit is $2,500."
```


#### Loan Assistance
```
User: "How do I apply for a loan?"
Kairo: "To apply for a loan: 1) Go to Market tab, 2) Tap 'Request Loan', 3) Fill in amount and purpose, 4) Submit for community funding. With your Tier A score, you qualify for rates as low as 8% APR."
```


#### Investment Guidance
```
User: "What loans should I invest in?"
Kairo: "Based on your risk preference, I recommend: 1) Education loan (Low risk, 10.2% yield), 2) Small business loan (Medium risk, 12.8% yield). Your current portfolio is 70% low-risk investments."
```


#### Payment Management
```
User: "When is my next payment due?"
Kairo: "Your next payment of $187.50 for Loan #1234 is due on December 15, 2025. You have sufficient funds in your wallet. Would you like me to set up an auto-payment reminder?"
```


#### Market Intelligence
```
User: "Are there good investment opportunities today?"
Kairo: "Today features: 3 new education loans (8-12% yields), 2 medical loans (10-14% yields), and 1 ZimCredit instant loan. Market activity is high with 85% of loans funded within 24 hours."
```


### AI Features


#### Quick Replies
- Pre-defined common questions for instant responses
- Contextual suggestions based on user activity
- One-tap access to frequent inquiries


#### Smart Context Awareness
- Remembers conversation history
- Adapts responses based on user profile (borrower/lender)
- Provides personalized recommendations


#### Real-time Data Integration
- Live access to account balances and transactions
- Current market rates and opportunities
- Payment due dates and reminders


#### Educational Content
- Financial literacy tips and explanations
- Zimbabwe-specific financial advice
- Investment strategy guidance
- Risk management education


### AI Response Types


#### Informational Responses
- Account status and balances
- Transaction history summaries
- Market statistics and trends


#### Actionable Responses
- Step-by-step instructions for tasks
- Direct links to app functions
- Automated task initiation


#### Advisory Responses
- Investment recommendations
- Risk assessments
- Financial planning advice


#### Support Responses
- Troubleshooting assistance
- Contact information for human support
- Escalation to support team when needed


## 4. Advanced Features & Integrations


### Push Notifications
- **Payment Reminders**: Upcoming due dates
- **Investment Updates**: Portfolio performance changes
- **Loan Status Changes**: Approvals, funding progress
- **Market Opportunities**: New loan listings
- **Security Alerts**: Login attempts, account changes


### Offline Functionality
- **Basic Account Viewing**: Balance and recent transactions
- **Offline Forms**: Loan applications saved for later submission
- **Cached Content**: Previously loaded market data
- **Background Sync**: Automatic updates when connection restored


### Cross-Platform Integration
- **Web Portal Sync**: Seamless transition between mobile and web
- **Device Pairing**: Link multiple devices for unified experience
- **QR Code Actions**: Payment codes, contact sharing, referrals


### Security Features
- **Biometric Authentication**: Fingerprint/Face ID support
- **End-to-End Encryption**: All financial data encrypted
- **Secure Payments**: PCI-compliant payment processing
- **Fraud Detection**: Advanced monitoring and alerts


## 5. User Journey Flows


### Borrower Journey
1. **Onboarding**: Complete KYC and financial profile
2. **Credit Building**: Use app features to improve ZimScore
3. **Loan Application**: Submit loan requests to marketplace
4. **Funding**: Receive community funding
5. **Repayment**: Make regular payments to build credit
6. **Re-borrowing**: Access better rates with improved score


### Lender Journey
1. **Account Setup**: Complete verification and funding
2. **Market Research**: Browse loan opportunities
3. **Investment Selection**: Choose loans based on risk/return
4. **Portfolio Management**: Track investments and returns
5. **Diversification**: Spread investments across multiple loans
6. **Reinvestment**: Use returns to fund more opportunities


### Complete User Experience
- **Seamless Onboarding**: 15-20 minute setup process
- **Intuitive Navigation**: 5-tab interface with clear functions
- **Real-time Updates**: Live data across all features
- **AI Support**: 24/7 intelligent assistance
- **Community Focus**: Peer-to-peer lending model
- **Financial Growth**: Credit building and investment opportunities


## 6. Database Structure


### Core User Tables


#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


#### Profiles Table
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    full_name VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    employment_status VARCHAR(50),
    monthly_income DECIMAL(12,2),
    monthly_expenses DECIMAL(12,2),
    intent VARCHAR(20) CHECK (intent IN ('borrow', 'lend', 'both')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


#### ZimScore Table
```sql
CREATE TABLE zimscore (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    score INTEGER NOT NULL CHECK (score >= 30 AND score <= 85),
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('A', 'B', 'C', 'D')),
    usd_available_balance DECIMAL(12,2) DEFAULT 0.00,
    usd_stake_balance DECIMAL(12,2) DEFAULT 0.00,
    usd_total_balance DECIMAL(12,2) DEFAULT 0.00,
    zwg_available_balance DECIMAL(12,2) DEFAULT 0.00,
    zwg_stake_balance DECIMAL(12,2) DEFAULT 0.00,
    zwg_total_balance DECIMAL(12,2) DEFAULT 0.00,
    crowd_credits_usd DECIMAL(12,2) DEFAULT 0.00,
    crowd_credits_zwg DECIMAL(12,2) DEFAULT 0.00,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


### Loan Management Tables


#### Loans Table
```sql
CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    principal_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    application_date DATE NOT NULL,
    disbursement_date DATE,
    first_payment_date DATE,
    payment_group VARCHAR(20) NOT NULL CHECK (payment_group IN ('SAME_MONTH', 'NEXT_MONTH')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_payments_made INTEGER DEFAULT 0,
    total_amount_paid DECIMAL(12,2) DEFAULT 0.00,
    total_late_fees_paid DECIMAL(12,2) DEFAULT 0.00,
    current_late_fees DECIMAL(12,2) DEFAULT 0.00,
    days_past_due INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


#### Payment Schedule Table
```sql
CREATE TABLE payment_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    amount_due DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'FUTURE'
        CHECK (status IN ('FUTURE', 'PENDING', 'DUE', 'PAID', 'LATE', 'PARTIAL')),
    month_number INTEGER NOT NULL,
    actual_payment_date TIMESTAMP WITH TIME ZONE,
    amount_paid DECIMAL(12,2),
    late_fee_applied DECIMAL(10,2) DEFAULT 0,
    platform_late_fee DECIMAL(10,2) DEFAULT 0,
    lender_late_fee DECIMAL(10,2) DEFAULT 0,
    days_late INTEGER DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'WALLET',
    transaction_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


### Marketplace Tables


#### Marketplace Loans Table
```sql
CREATE TABLE marketplace_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES users(id),
    borrower_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    purpose TEXT NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(12,2) NOT NULL,
    total_repayment DECIMAL(12,2) NOT NULL,
    zim_score INTEGER DEFAULT 600,
    tier VARCHAR(10) NOT NULL CHECK (tier IN ('A', 'B', 'C', 'D')),
    funding_progress DECIMAL(5,2) DEFAULT 0.00,
    funded_amount DECIMAL(12,2) DEFAULT 0.00,
    funders_count INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'seeking_funding',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    collateral_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


#### Marketplace Funding Contributions Table
```sql
CREATE TABLE marketplace_funding_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES marketplace_loans(id) ON DELETE CASCADE,
    funder_id UUID NOT NULL REFERENCES users(id),
    funder_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    funded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'returned', 'defaulted'))
);
```


### Payment & Wallet Tables


#### Wallet Balances Table
```sql
CREATE TABLE wallet_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    available_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    pending_deposits DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    frozen_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


#### Payment Transactions Table
```sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id),
    payment_schedule_id UUID REFERENCES payment_schedule(id),
    user_id UUID NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(50) NOT NULL
        CHECK (transaction_type IN ('PAYMENT', 'LATE_FEE_PLATFORM', 'LATE_FEE_LENDER', 'REFUND', 'WALLET_FUNDING')),
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED')),
    wallet_balance_before DECIMAL(12,2),
    wallet_balance_after DECIMAL(12,2),
    processed_at TIMESTAMP WITH TIME ZONE,
    processor_id VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


#### User Payment Methods Table
```sql
CREATE TABLE user_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mobile_money', 'bank_account')),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('ecocash', 'onemoney', 'telecash', 'bank_transfer')),
    account_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_attempts INTEGER DEFAULT 0,
    last_verification_attempt TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


### Notification & Communication Tables


#### Unified Payment Notifications Table
```sql
CREATE TABLE unified_payment_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    loan_id UUID REFERENCES loans(id),
    payment_schedule_id UUID REFERENCES payment_schedule(id),
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('PUSH', 'SMS', 'EMAIL', 'WHATSAPP', 'IN_APP')),
    message_content TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'SENT'
        CHECK (status IN ('SCHEDULED', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
    user_action_taken VARCHAR(50),
    action_taken_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```


### Key Database Relationships


```
users (1) ──── (1) profiles
    │                    │
    │                    │
    └─── (1) zimscore ───┘
         │
         ├─── (many) loans
         │       │
         │       └─── (many) payment_schedule
         │               │
         │               └─── (many) payment_transactions
         │
         ├─── (many) marketplace_loans (as borrower)
         │       │
         │       └─── (many) marketplace_funding_contributions
         │
         ├─── (many) marketplace_funding_contributions (as funder)
         │
         ├─── (1) wallet_balances
         │
         ├─── (many) user_payment_methods
         │
         └─── (many) unified_payment_notifications
```


### Database Functions & Triggers


#### Key Functions:
- `calculate_first_payment_date()`: Determines payment group and first payment date
- `generate_payment_schedule()`: Creates monthly payment schedule for loans
- `fund_marketplace_loan()`: Handles marketplace loan funding with wallet deduction
- `update_wallet_balance()`: Manages wallet balance updates with concurrency control


#### Key Triggers:
- `update_updated_at_column()`: Auto-updates timestamp fields
- `set_default_payment_method()`: Manages default payment method logic
- `update_marketplace_loans_updated_at()`: Updates marketplace loan timestamps


### Database Views


#### Active Payments Dashboard View:
```sql
CREATE VIEW active_payments_dashboard AS
SELECT
    l.id as loan_id, l.user_id, l.principal_amount, l.payment_group,
    l.status as loan_status, ps.due_date, ps.amount_due,
    ps.status as payment_status, ps.month_number,
    wb.available_balance as wallet_balance,
    (ps.amount_due - COALESCE(wb.available_balance, 0)) as shortfall
FROM loans l
JOIN payment_schedule ps ON l.id = ps.loan_id
LEFT JOIN wallet_balances wb ON l.user_id = wb.user_id
WHERE l.status IN ('ACTIVE', 'GRACE_PERIOD', 'CURRENT', 'LATE')
AND ps.status IN ('PENDING', 'DUE', 'LATE')
ORDER BY ps.due_date ASC;
```


#### User Marketplace Activity View:
```sql
CREATE VIEW user_marketplace_activity AS
SELECT 'borrowed' as activity_type, ml.id as loan_id, ml.amount, ml.purpose, ml.status, ml.created_at as activity_date, NULL as contribution_amount
FROM marketplace_loans ml WHERE ml.borrower_id = auth.uid()
UNION ALL
SELECT 'funded' as activity_type, ml.id as loan_id, ml.amount, ml.purpose, mfc.status, mfc.funded_at as activity_date, mfc.amount as contribution_amount
FROM marketplace_funding_contributions mfc
JOIN marketplace_loans ml ON mfc.loan_id = ml.id
WHERE mfc.funder_id = auth.uid()
ORDER BY activity_date DESC;
```


## 7. Technical Architecture


### Frontend (React Native/Expo)
- **Navigation**: Expo Router with tab-based navigation
- **State Management**: Context providers for user, theme, wallet
- **API Integration**: RESTful API calls with error handling
- **Offline Support**: AsyncStorage for cached data


### Backend Services
- **Authentication**: Supabase Auth with OTP verification
- **Database**: Supabase PostgreSQL for user and transaction data
- **File Storage**: Supabase Storage for documents and images
- **Real-time**: Supabase subscriptions for live updates


### AI Integration
- **Chat Service**: Custom AI service with financial context
- **NLP Processing**: Natural language understanding
- **Data Access**: Secure API access to user financial data
- **Response Generation**: Context-aware reply generation


### Payment Processing
- **PayNow Integration**: Zimbabwe payment gateway
- **Mobile Money APIs**: EcoCash, OneMoney, InnBucks, O'mari
- **Webhook Handling**: Real-time payment status updates
- **Security**: PCI-compliant payment processing


## 7. Performance & Reliability


### App Performance
- **Fast Loading**: Optimized bundle size and lazy loading
- **Smooth Navigation**: 60fps animations and transitions
- **Memory Management**: Efficient component unmounting
- **Battery Optimization**: Background task management


### Data Reliability
- **Offline Queue**: Failed requests automatically retry
- **Data Validation**: Client and server-side validation
- **Error Recovery**: Graceful error handling with user feedback
- **Backup Systems**: Redundant data storage and recovery


### Security Measures
- **Data Encryption**: AES-256 encryption for sensitive data
- **Secure Communication**: HTTPS/TLS 1.3 for all API calls
- **Token Management**: JWT with automatic refresh
- **Audit Logging**: Complete transaction and access logging


## Conclusion


The Zimcrowd app provides a complete financial ecosystem for Zimbabwean users, from initial credit building through active lending and borrowing, all supported by AI-powered assistance. The journey from authentication to AI chat represents a comprehensive financial inclusion solution that empowers users to improve their financial health while participating in community-driven lending.


**Key Success Metrics:**
- User onboarding completion rate
- Loan funding success rate
- Payment on-time percentage
- User engagement with AI assistant
- Cross-platform usage adoption
- Financial literacy improvement through AI interactions
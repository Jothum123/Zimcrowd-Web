# Complete Loan System Implementation Guide

## 📋 Overview

This guide covers the complete implementation of:
1. **P2P Market Loans** - Crowdfunded loans from multiple investors
2. **ZimDirect Loans** - Direct platform loans with flexible credit requirements

**Date:** November 28, 2025  
**Status:** Implementation Required

---

## 🎯 ZimDirect Loan Requirements

### **Who Can Get ZimDirect Loans:**

✅ **Approved:**
- New users (no credit history)
- Users with low ZimScore (300-500)
- Users with good payment history
- Users with no active loans

❌ **Rejected:**
- Users with accounts in arrears (missed payments)
- Users with active defaulted loans
- Users with outstanding overdue payments

### **Credit Scoring Logic:**

```javascript
ZimDirect Eligibility:
- New users: Approved (start at ZimScore 300)
- Low score (300-500): Approved with higher interest
- Medium score (500-650): Approved with standard interest
- High score (650-850): Approved with lower interest
- Account in arrears: REJECTED
- Active defaults: REJECTED
```

---

## 🏗️ Database Schema Required

### **1. P2P Primary Market Table**

```sql
CREATE TABLE IF NOT EXISTS public.p2p_primary_market (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Loan Details
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    funded_amount DECIMAL(15, 2) DEFAULT 0 CHECK (funded_amount >= 0),
    remaining_amount DECIMAL(15, 2) GENERATED ALWAYS AS (amount - funded_amount) STORED,
    funding_percentage DECIMAL(5, 2) GENERATED ALWAYS AS ((funded_amount / amount) * 100) STORED,
    
    -- Terms
    interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate > 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(15, 2) NOT NULL,
    
    -- Investment Limits
    min_investment DECIMAL(15, 2) DEFAULT 100 CHECK (min_investment > 0),
    max_investment DECIMAL(15, 2) CHECK (max_investment >= min_investment),
    
    -- Loan Information
    purpose TEXT NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    risk_score VARCHAR(5) CHECK (risk_score IN ('A', 'B', 'C', 'D', 'E')),
    zimscore INTEGER CHECK (zimscore >= 300 AND zimscore <= 850),
    
    -- Status
    status VARCHAR(20) DEFAULT 'funding' CHECK (status IN ('funding', 'funded', 'cancelled', 'expired')),
    funding_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    time_remaining INTERVAL GENERATED ALWAYS AS (funding_deadline - NOW()) STORED,
    
    -- Investor Count
    investor_count INTEGER DEFAULT 0 CHECK (investor_count >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(loan_id)
);

CREATE INDEX idx_p2p_primary_market_status ON public.p2p_primary_market(status);
CREATE INDEX idx_p2p_primary_market_borrower ON public.p2p_primary_market(borrower_id);
CREATE INDEX idx_p2p_primary_market_funding_deadline ON public.p2p_primary_market(funding_deadline);
```

### **2. P2P Investments Table**

```sql
CREATE TABLE IF NOT EXISTS public.p2p_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_listing_id UUID NOT NULL REFERENCES public.p2p_primary_market(id) ON DELETE CASCADE,
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Investment Details
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    expected_return DECIMAL(15, 2) NOT NULL,
    monthly_return DECIMAL(15, 2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'defaulted', 'sold')),
    
    -- Returns Tracking
    total_received DECIMAL(15, 2) DEFAULT 0,
    outstanding_balance DECIMAL(15, 2),
    
    -- Timestamps
    invested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_p2p_investments_investor ON public.p2p_investments(investor_id);
CREATE INDEX idx_p2p_investments_loan ON public.p2p_investments(loan_id);
CREATE INDEX idx_p2p_investments_status ON public.p2p_investments(status);
```

### **3. ZimDirect Loans Table**

```sql
CREATE TABLE IF NOT EXISTS public.zimdirect_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Loan Details
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    interest_rate DECIMAL(5, 2) NOT NULL CHECK (interest_rate > 0),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    monthly_payment DECIMAL(15, 2) NOT NULL,
    
    -- Credit Assessment
    zimscore_at_application INTEGER CHECK (zimscore_at_application >= 300 AND zimscore_at_application <= 850),
    credit_tier VARCHAR(20) CHECK (credit_tier IN ('new_user', 'low_score', 'medium_score', 'high_score')),
    risk_assessment JSONB DEFAULT '{}',
    
    -- Eligibility Checks
    is_new_user BOOLEAN DEFAULT FALSE,
    has_arrears BOOLEAN DEFAULT FALSE,
    has_defaults BOOLEAN DEFAULT FALSE,
    payment_history_score DECIMAL(5, 2) DEFAULT 0,
    
    -- Approval
    auto_approved BOOLEAN DEFAULT FALSE,
    approval_reason TEXT,
    rejection_reason TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed', 'active', 'completed', 'defaulted')),
    
    -- Disbursement
    disbursed_at TIMESTAMP WITH TIME ZONE,
    disbursement_method VARCHAR(50),
    
    -- Timestamps
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(loan_id)
);

CREATE INDEX idx_zimdirect_loans_borrower ON public.zimdirect_loans(borrower_id);
CREATE INDEX idx_zimdirect_loans_status ON public.zimdirect_loans(status);
CREATE INDEX idx_zimdirect_loans_credit_tier ON public.zimdirect_loans(credit_tier);
```

### **4. Payment History Table**

```sql
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Payment Details
    payment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(15, 2) NOT NULL,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late', 'missed', 'partial')),
    days_overdue INTEGER DEFAULT 0 CHECK (days_overdue >= 0),
    
    -- Payment Information
    paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    transaction_id UUID,
    
    -- Late Fees
    late_fee DECIMAL(15, 2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_history_borrower ON public.payment_history(borrower_id);
CREATE INDEX idx_payment_history_loan ON public.payment_history(loan_id);
CREATE INDEX idx_payment_history_status ON public.payment_history(status);
CREATE INDEX idx_payment_history_due_date ON public.payment_history(due_date);
```

---

## 🔧 Backend API Endpoints

### **1. P2P Primary Market Endpoints**

```javascript
// File: backend/routes/p2p-primary-market.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// GET /api/p2p-primary-market/available-loans
router.get('/available-loans', authenticate, async (req, res) => {
    try {
        const { page = 1, limit = 6, risk_score, min_rate, max_rate } = req.query;
        const offset = (page - 1) * limit;
        
        let query = supabase
            .from('p2p_primary_market')
            .select(`
                *,
                borrower:user_profiles!borrower_id(first_name, last_name, zimscore)
            `, { count: 'exact' })
            .eq('status', 'funding')
            .lt('funded_amount', 'amount')
            .gt('funding_deadline', new Date().toISOString());
        
        // Apply filters
        if (risk_score) query = query.eq('risk_score', risk_score);
        if (min_rate) query = query.gte('interest_rate', min_rate);
        if (max_rate) query = query.lte('interest_rate', max_rate);
        
        const { data: loans, error, count } = await query
            .range(offset, offset + limit - 1)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json({
            success: true,
            data: {
                loans: loans.map(loan => ({
                    ...loan,
                    borrower_name: `${loan.borrower.first_name} ${loan.borrower.last_name}`,
                    time_remaining: calculateTimeRemaining(loan.funding_deadline)
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    total_pages: Math.ceil(count / limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/p2p-primary-market/invest
router.post('/invest', authenticate, async (req, res) => {
    try {
        const { market_listing_id, amount } = req.body;
        const investor_id = req.user.id;
        
        // Validate investment amount
        const { data: listing } = await supabase
            .from('p2p_primary_market')
            .select('*')
            .eq('id', market_listing_id)
            .single();
        
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found' });
        }
        
        if (amount < listing.min_investment) {
            return res.status(400).json({ 
                success: false, 
                error: `Minimum investment is $${listing.min_investment}` 
            });
        }
        
        if (listing.max_investment && amount > listing.max_investment) {
            return res.status(400).json({ 
                success: false, 
                error: `Maximum investment is $${listing.max_investment}` 
            });
        }
        
        const remaining = listing.amount - listing.funded_amount;
        if (amount > remaining) {
            return res.status(400).json({ 
                success: false, 
                error: `Only $${remaining} remaining to fund` 
            });
        }
        
        // Create investment
        const { data: investment, error } = await supabase
            .from('p2p_investments')
            .insert({
                market_listing_id,
                loan_id: listing.loan_id,
                investor_id,
                amount,
                expected_return: calculateExpectedReturn(amount, listing.interest_rate, listing.term_months),
                monthly_return: calculateMonthlyReturn(amount, listing.interest_rate, listing.term_months),
                outstanding_balance: amount
            })
            .select()
            .single();
        
        if (error) throw error;
        
        // Update listing funded amount
        await supabase
            .from('p2p_primary_market')
            .update({
                funded_amount: listing.funded_amount + amount,
                investor_count: listing.investor_count + 1,
                status: (listing.funded_amount + amount >= listing.amount) ? 'funded' : 'funding'
            })
            .eq('id', market_listing_id);
        
        res.json({ success: true, data: investment });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
```

### **2. ZimDirect Loans Endpoints**

```javascript
// File: backend/routes/zimdirect-loans.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// POST /api/zimdirect-loans/apply
router.post('/apply', authenticate, async (req, res) => {
    try {
        const { amount, term_months, purpose, loan_type } = req.body;
        const borrower_id = req.user.id;
        
        // Check eligibility
        const eligibility = await checkZimDirectEligibility(borrower_id);
        
        if (!eligibility.eligible) {
            return res.status(400).json({
                success: false,
                error: eligibility.reason,
                details: eligibility
            });
        }
        
        // Calculate interest rate based on credit tier
        const interest_rate = calculateInterestRate(eligibility.credit_tier, eligibility.zimscore);
        const monthly_payment = calculateMonthlyPayment(amount, interest_rate, term_months);
        
        // Create loan
        const { data: loan, error: loanError } = await supabase
            .from('loans')
            .insert({
                user_id: borrower_id,
                loan_type,
                amount,
                interest_rate,
                term_months,
                monthly_payment,
                purpose,
                status: eligibility.auto_approve ? 'approved' : 'pending'
            })
            .select()
            .single();
        
        if (loanError) throw loanError;
        
        // Create ZimDirect loan record
        const { data: zimDirectLoan, error: zdError } = await supabase
            .from('zimdirect_loans')
            .insert({
                loan_id: loan.id,
                borrower_id,
                amount,
                interest_rate,
                term_months,
                monthly_payment,
                zimscore_at_application: eligibility.zimscore,
                credit_tier: eligibility.credit_tier,
                is_new_user: eligibility.is_new_user,
                has_arrears: eligibility.has_arrears,
                has_defaults: eligibility.has_defaults,
                payment_history_score: eligibility.payment_history_score,
                auto_approved: eligibility.auto_approve,
                approval_reason: eligibility.auto_approve ? 'Auto-approved based on credit profile' : null,
                status: eligibility.auto_approve ? 'approved' : 'pending',
                risk_assessment: eligibility.risk_assessment
            })
            .select()
            .single();
        
        if (zdError) throw zdError;
        
        res.json({
            success: true,
            data: {
                loan,
                zimdirect_loan: zimDirectLoan,
                eligibility
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Function to check ZimDirect eligibility
async function checkZimDirectEligibility(user_id) {
    // Get user profile
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('zimscore')
        .eq('user_id', user_id)
        .single();
    
    const zimscore = profile?.zimscore || 300; // Default for new users
    
    // Check for arrears (overdue payments)
    const { data: arrears } = await supabase
        .from('payment_history')
        .select('id')
        .eq('borrower_id', user_id)
        .in('status', ['late', 'missed'])
        .gt('days_overdue', 0);
    
    const has_arrears = arrears && arrears.length > 0;
    
    // REJECT if account in arrears
    if (has_arrears) {
        return {
            eligible: false,
            reason: 'Account has overdue payments. Please clear arrears before applying.',
            has_arrears: true,
            zimscore
        };
    }
    
    // Check for active defaults
    const { data: defaults } = await supabase
        .from('loans')
        .select('id')
        .eq('user_id', user_id)
        .eq('status', 'defaulted');
    
    const has_defaults = defaults && defaults.length > 0;
    
    // REJECT if has defaults
    if (has_defaults) {
        return {
            eligible: false,
            reason: 'Account has defaulted loans. Please contact support.',
            has_defaults: true,
            zimscore
        };
    }
    
    // Check if new user (no loan history)
    const { data: loanHistory, count } = await supabase
        .from('loans')
        .select('id', { count: 'exact' })
        .eq('user_id', user_id);
    
    const is_new_user = count === 0;
    
    // Calculate payment history score
    const { data: payments } = await supabase
        .from('payment_history')
        .select('status')
        .eq('borrower_id', user_id);
    
    let payment_history_score = 100;
    if (payments && payments.length > 0) {
        const on_time = payments.filter(p => p.status === 'paid').length;
        payment_history_score = (on_time / payments.length) * 100;
    }
    
    // Determine credit tier
    let credit_tier;
    if (is_new_user) {
        credit_tier = 'new_user';
    } else if (zimscore < 500) {
        credit_tier = 'low_score';
    } else if (zimscore < 650) {
        credit_tier = 'medium_score';
    } else {
        credit_tier = 'high_score';
    }
    
    // Auto-approve logic
    const auto_approve = !has_arrears && !has_defaults && payment_history_score >= 80;
    
    return {
        eligible: true,
        zimscore,
        credit_tier,
        is_new_user,
        has_arrears: false,
        has_defaults: false,
        payment_history_score,
        auto_approve,
        risk_assessment: {
            zimscore,
            payment_history_score,
            total_loans: count,
            credit_tier
        }
    };
}

// Function to calculate interest rate based on credit tier
function calculateInterestRate(credit_tier, zimscore) {
    const rates = {
        'new_user': 12.0,      // 12% for new users
        'low_score': 15.0,     // 15% for low score (300-500)
        'medium_score': 10.0,  // 10% for medium score (500-650)
        'high_score': 8.0      // 8% for high score (650-850)
    };
    
    return rates[credit_tier] || 12.0;
}

// Function to calculate monthly payment
function calculateMonthlyPayment(principal, annual_rate, months) {
    const monthly_rate = annual_rate / 100 / 12;
    const payment = principal * (monthly_rate * Math.pow(1 + monthly_rate, months)) / 
                   (Math.pow(1 + monthly_rate, months) - 1);
    return Math.round(payment * 100) / 100;
}

module.exports = router;
```

---

## 📱 Frontend Implementation

### **1. P2P Market Loan Request**

```javascript
// File: js/p2p-market-loader.js

class P2PMarketLoader {
    constructor() {
        this.apiBase = window.API_CONFIG?.baseURL || 'https://zimcrowd-api.onrender.com/api';
    }
    
    async loadAvailableLoans(page = 1, filters = {}) {
        try {
            const params = new URLSearchParams({
                page,
                limit: 6,
                ...filters
            });
            
            const response = await this.apiRequest(`/p2p-primary-market/available-loans?${params}`);
            
            if (response.success) {
                this.displayLoans(response.data.loans);
                this.updatePagination(response.data.pagination);
            }
        } catch (error) {
            console.error('Error loading P2P loans:', error);
            this.showError('Failed to load available loans');
        }
    }
    
    async investInLoan(marketListingId, amount) {
        try {
            const response = await this.apiRequest('/p2p-primary-market/invest', {
                method: 'POST',
                body: JSON.stringify({
                    market_listing_id: marketListingId,
                    amount: parseFloat(amount)
                })
            });
            
            if (response.success) {
                this.showSuccess(`Successfully invested $${amount}!`);
                this.loadAvailableLoans(); // Refresh list
                return response.data;
            }
        } catch (error) {
            console.error('Error investing:', error);
            this.showError(error.message || 'Failed to invest');
        }
    }
    
    displayLoans(loans) {
        const container = document.getElementById('p2p-loans-container');
        if (!container) return;
        
        container.innerHTML = loans.map(loan => `
            <div class="loan-card">
                <div class="loan-header">
                    <h4>${loan.loan_type} Loan</h4>
                    <span class="risk-badge risk-${loan.risk_score}">${loan.risk_score}</span>
                </div>
                <div class="loan-details">
                    <div class="detail-row">
                        <span>Amount:</span>
                        <strong>$${loan.amount.toLocaleString()}</strong>
                    </div>
                    <div class="detail-row">
                        <span>Funded:</span>
                        <strong>${loan.funding_percentage.toFixed(1)}%</strong>
                    </div>
                    <div class="detail-row">
                        <span>Interest Rate:</span>
                        <strong>${loan.interest_rate}%</strong>
                    </div>
                    <div class="detail-row">
                        <span>Term:</span>
                        <strong>${loan.term_months} months</strong>
                    </div>
                    <div class="detail-row">
                        <span>Time Remaining:</span>
                        <strong>${loan.time_remaining}</strong>
                    </div>
                </div>
                <div class="funding-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${loan.funding_percentage}%"></div>
                    </div>
                    <p>$${loan.funded_amount.toLocaleString()} of $${loan.amount.toLocaleString()}</p>
                </div>
                <button class="btn-primary" onclick="p2pMarket.showInvestModal('${loan.id}')">
                    Invest Now
                </button>
            </div>
        `).join('');
    }
    
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        return await response.json();
    }
}

// Initialize
window.p2pMarket = new P2PMarketLoader();
```

### **2. ZimDirect Loan Application**

```javascript
// File: js/zimdirect-loan-loader.js

class ZimDirectLoanLoader {
    constructor() {
        this.apiBase = window.API_CONFIG?.baseURL || 'https://zimcrowd-api.onrender.com/api';
    }
    
    async applyForLoan(loanData) {
        try {
            // Show loading
            this.showLoading();
            
            const response = await this.apiRequest('/zimdirect-loans/apply', {
                method: 'POST',
                body: JSON.stringify(loanData)
            });
            
            this.hideLoading();
            
            if (response.success) {
                const { loan, zimdirect_loan, eligibility } = response.data;
                
                // Show success with eligibility details
                this.showApplicationSuccess(loan, zimdirect_loan, eligibility);
                
                return response.data;
            } else {
                // Show rejection reason
                this.showApplicationRejection(response.error, response.details);
            }
        } catch (error) {
            this.hideLoading();
            console.error('Error applying for ZimDirect loan:', error);
            this.showError(error.message || 'Failed to submit application');
        }
    }
    
    showApplicationSuccess(loan, zimDirectLoan, eligibility) {
        const message = eligibility.auto_approve 
            ? `🎉 Congratulations! Your loan has been auto-approved!`
            : `✅ Application submitted successfully! We'll review and respond within 24 hours.`;
        
        const details = `
            <div class="success-details">
                <h3>${message}</h3>
                <div class="loan-summary">
                    <p><strong>Amount:</strong> $${loan.amount.toLocaleString()}</p>
                    <p><strong>Interest Rate:</strong> ${loan.interest_rate}%</p>
                    <p><strong>Monthly Payment:</strong> $${loan.monthly_payment.toLocaleString()}</p>
                    <p><strong>Term:</strong> ${loan.term_months} months</p>
                    <p><strong>Credit Tier:</strong> ${this.formatCreditTier(eligibility.credit_tier)}</p>
                    <p><strong>ZimScore:</strong> ${eligibility.zimscore}</p>
                </div>
                ${eligibility.auto_approve ? `
                    <p class="approval-note">
                        Your loan will be disbursed within 1-2 business days.
                    </p>
                ` : ''}
            </div>
        `;
        
        this.showModal('Application Successful', details);
    }
    
    showApplicationRejection(reason, details) {
        const message = `
            <div class="rejection-details">
                <h3>❌ Application Not Approved</h3>
                <p class="rejection-reason">${reason}</p>
                ${details?.has_arrears ? `
                    <div class="help-section">
                        <h4>What you can do:</h4>
                        <ul>
                            <li>Clear all overdue payments</li>
                            <li>Contact support for payment arrangements</li>
                            <li>Reapply once arrears are cleared</li>
                        </ul>
                    </div>
                ` : ''}
                ${details?.has_defaults ? `
                    <div class="help-section">
                        <h4>What you can do:</h4>
                        <ul>
                            <li>Contact support to discuss your defaulted loans</li>
                            <li>Set up a payment plan</li>
                            <li>Rebuild your credit history</li>
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        this.showModal('Application Status', message);
    }
    
    formatCreditTier(tier) {
        const tiers = {
            'new_user': 'New User (Welcome!)',
            'low_score': 'Building Credit',
            'medium_score': 'Good Credit',
            'high_score': 'Excellent Credit'
        };
        return tiers[tier] || tier;
    }
    
    async apiRequest(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        return await response.json();
    }
}

// Initialize
window.zimDirectLoan = new ZimDirectLoanLoader();
```

---

## ✅ Implementation Checklist

### **Database:**
- [ ] Run `database/create-only-missing-tables.sql`
- [ ] Create `p2p_primary_market` table
- [ ] Create `p2p_investments` table
- [ ] Create `zimdirect_loans` table
- [ ] Create `payment_history` table

### **Backend API:**
- [ ] Implement `/api/p2p-primary-market/available-loans`
- [ ] Implement `/api/p2p-primary-market/invest`
- [ ] Implement `/api/zimdirect-loans/apply`
- [ ] Implement `/api/zimdirect-loans/check-eligibility`
- [ ] Add eligibility checking logic
- [ ] Add interest rate calculation
- [ ] Add payment calculation

### **Frontend:**
- [ ] Create `js/p2p-market-loader.js`
- [ ] Create `js/zimdirect-loan-loader.js`
- [ ] Add P2P market UI to dashboard
- [ ] Add ZimDirect loan application form
- [ ] Add investment modal
- [ ] Add success/rejection modals

### **Testing:**
- [ ] Test P2P loan listing
- [ ] Test P2P investment flow
- [ ] Test ZimDirect eligibility (new user)
- [ ] Test ZimDirect eligibility (low score)
- [ ] Test ZimDirect rejection (arrears)
- [ ] Test ZimDirect rejection (defaults)
- [ ] Test auto-approval logic

---

## 📊 Summary

**P2P Market Loans:**
- Crowdfunded by multiple investors
- Minimum investment limits
- Funding deadline
- Risk-based pricing

**ZimDirect Loans:**
- Direct platform loans
- ✅ Approved: New users, low scores, good history
- ❌ Rejected: Arrears, defaults
- Auto-approval for qualified users
- Tiered interest rates based on credit

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Status:** Ready for Implementation

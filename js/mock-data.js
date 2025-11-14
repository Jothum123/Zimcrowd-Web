/**
 * Mock Data Service for ZimCrowd Dashboard
 * This provides realistic data in the exact format expected by the live API
 * Use this while backend is being deployed or for testing
 */

const MockDataService = {
    // Current user profile
    currentUser: {
        id: 'user_123456789',
        email: 'jchitewe@gmail.com',
        phone: '+263771234567',
        first_name: 'John',
        last_name: 'Chitewe',
        country: 'Zimbabwe',
        city: 'Harare',
        avatar_url: null,
        created_at: '2024-01-15T10:30:00Z',
        email_verified: true,
        phone_verified: true,
        kyc_status: 'verified',
        kyc_level: 2
    },

    // Wallet balance
    wallet: {
        balance: 15750.50,
        currency: 'USD',
        available_balance: 14250.50,
        pending_balance: 1500.00,
        total_invested: 25000.00,
        total_borrowed: 10000.00,
        total_earned: 3250.75
    },

    // Active loans
    loans: [
        {
            id: 'loan_001',
            borrower_id: 'user_123456789',
            amount: 5000.00,
            currency: 'USD',
            interest_rate: 12.5,
            term_months: 12,
            purpose: 'Business Expansion',
            status: 'active',
            funded_amount: 5000.00,
            repaid_amount: 1250.00,
            remaining_amount: 3750.00,
            next_payment_date: '2025-12-15',
            next_payment_amount: 458.33,
            created_at: '2024-11-01T08:00:00Z',
            funded_at: '2024-11-05T14:30:00Z',
            risk_rating: 'B+',
            collateral_type: 'Business Assets',
            monthly_payment: 458.33,
            payments_made: 3,
            payments_remaining: 9
        },
        {
            id: 'loan_002',
            borrower_id: 'user_123456789',
            amount: 3000.00,
            currency: 'USD',
            interest_rate: 10.0,
            term_months: 6,
            purpose: 'Equipment Purchase',
            status: 'active',
            funded_amount: 3000.00,
            repaid_amount: 1500.00,
            remaining_amount: 1500.00,
            next_payment_date: '2025-12-20',
            next_payment_amount: 516.67,
            created_at: '2024-10-15T10:00:00Z',
            funded_at: '2024-10-18T16:45:00Z',
            risk_rating: 'A',
            collateral_type: 'Equipment',
            monthly_payment: 516.67,
            payments_made: 3,
            payments_remaining: 3
        },
        {
            id: 'loan_003',
            borrower_id: 'user_123456789',
            amount: 2000.00,
            currency: 'USD',
            interest_rate: 15.0,
            term_months: 3,
            purpose: 'Working Capital',
            status: 'pending',
            funded_amount: 1200.00,
            repaid_amount: 0,
            remaining_amount: 2000.00,
            next_payment_date: null,
            next_payment_amount: 0,
            created_at: '2024-11-10T12:00:00Z',
            funded_at: null,
            risk_rating: 'C',
            collateral_type: 'None',
            monthly_payment: 703.33,
            payments_made: 0,
            payments_remaining: 3,
            funding_progress: 60
        }
    ],

    // Investment portfolio
    investments: [
        {
            id: 'inv_001',
            investor_id: 'user_123456789',
            loan_id: 'loan_external_001',
            amount: 1000.00,
            currency: 'USD',
            interest_rate: 12.0,
            status: 'active',
            invested_at: '2024-09-01T10:00:00Z',
            maturity_date: '2025-09-01T10:00:00Z',
            earned_interest: 120.00,
            expected_return: 1120.00,
            borrower_name: 'Sarah Moyo',
            loan_purpose: 'Agriculture',
            risk_rating: 'B',
            term_months: 12,
            payments_received: 4,
            next_payment_date: '2025-01-01',
            next_payment_amount: 93.33
        },
        {
            id: 'inv_002',
            investor_id: 'user_123456789',
            loan_id: 'loan_external_002',
            amount: 2500.00,
            currency: 'USD',
            interest_rate: 10.5,
            status: 'active',
            invested_at: '2024-08-15T14:30:00Z',
            maturity_date: '2025-02-15T14:30:00Z',
            earned_interest: 175.00,
            expected_return: 2762.50,
            borrower_name: 'David Ncube',
            loan_purpose: 'Real Estate',
            risk_rating: 'A',
            term_months: 6,
            payments_received: 4,
            next_payment_date: '2024-12-15',
            next_payment_amount: 460.42
        },
        {
            id: 'inv_003',
            investor_id: 'user_123456789',
            loan_id: 'loan_external_003',
            amount: 500.00,
            currency: 'USD',
            interest_rate: 14.0,
            status: 'completed',
            invested_at: '2024-06-01T09:00:00Z',
            maturity_date: '2024-09-01T09:00:00Z',
            earned_interest: 70.00,
            expected_return: 570.00,
            borrower_name: 'Grace Mwangi',
            loan_purpose: 'Education',
            risk_rating: 'B+',
            term_months: 3,
            payments_received: 3,
            next_payment_date: null,
            next_payment_amount: 0,
            completed_at: '2024-09-01T09:00:00Z'
        }
    ],

    // Recent transactions
    transactions: [
        {
            id: 'txn_001',
            user_id: 'user_123456789',
            type: 'investment',
            amount: 1000.00,
            currency: 'USD',
            status: 'completed',
            description: 'Investment in Loan #loan_external_001',
            created_at: '2024-11-13T14:30:00Z',
            reference: 'INV-20241113-001',
            balance_after: 14250.50
        },
        {
            id: 'txn_002',
            user_id: 'user_123456789',
            type: 'repayment',
            amount: 458.33,
            currency: 'USD',
            status: 'completed',
            description: 'Loan repayment for Loan #loan_001',
            created_at: '2024-11-15T10:00:00Z',
            reference: 'REP-20241115-001',
            balance_after: 13792.17
        },
        {
            id: 'txn_003',
            user_id: 'user_123456789',
            type: 'deposit',
            amount: 5000.00,
            currency: 'USD',
            status: 'completed',
            description: 'Wallet deposit via Bank Transfer',
            created_at: '2024-11-10T16:45:00Z',
            reference: 'DEP-20241110-001',
            balance_after: 19250.50,
            payment_method: 'bank_transfer'
        },
        {
            id: 'txn_004',
            user_id: 'user_123456789',
            type: 'interest',
            amount: 93.33,
            currency: 'USD',
            status: 'completed',
            description: 'Interest payment from Investment #inv_001',
            created_at: '2024-11-01T09:00:00Z',
            reference: 'INT-20241101-001',
            balance_after: 14343.83
        },
        {
            id: 'txn_005',
            user_id: 'user_123456789',
            type: 'withdrawal',
            amount: 2000.00,
            currency: 'USD',
            status: 'pending',
            description: 'Withdrawal to Bank Account',
            created_at: '2024-11-14T11:20:00Z',
            reference: 'WTH-20241114-001',
            balance_after: 12250.50,
            payment_method: 'bank_transfer',
            estimated_completion: '2024-11-16T11:20:00Z'
        }
    ],

    // Dashboard statistics
    statistics: {
        total_loans: 3,
        active_loans: 2,
        pending_loans: 1,
        completed_loans: 0,
        total_investments: 3,
        active_investments: 2,
        completed_investments: 1,
        total_borrowed: 10000.00,
        total_invested: 4000.00,
        total_earned: 365.00,
        total_repaid: 2750.00,
        average_return_rate: 12.17,
        portfolio_performance: 8.5,
        credit_score: 720,
        success_rate: 95.5
    },

    // Notifications
    notifications: [
        {
            id: 'notif_001',
            user_id: 'user_123456789',
            type: 'payment_due',
            title: 'Payment Due Soon',
            message: 'Your loan payment of $458.33 is due on December 15, 2025',
            read: false,
            created_at: '2024-11-14T08:00:00Z',
            action_url: '/dashboard#loans',
            priority: 'high'
        },
        {
            id: 'notif_002',
            user_id: 'user_123456789',
            type: 'investment_return',
            title: 'Interest Payment Received',
            message: 'You received $93.33 interest from your investment',
            read: false,
            created_at: '2024-11-01T09:05:00Z',
            action_url: '/dashboard#investments',
            priority: 'medium'
        },
        {
            id: 'notif_003',
            user_id: 'user_123456789',
            type: 'loan_funded',
            title: 'Loan Fully Funded',
            message: 'Your loan request for $3,000 has been fully funded',
            read: true,
            created_at: '2024-10-18T16:50:00Z',
            action_url: '/dashboard#loans',
            priority: 'high'
        }
    ],

    // Available loan opportunities (for investors)
    loanOpportunities: [
        {
            id: 'opp_001',
            borrower_id: 'user_external_001',
            borrower_name: 'Michael Banda',
            amount: 8000.00,
            currency: 'USD',
            interest_rate: 13.5,
            term_months: 12,
            purpose: 'Manufacturing Equipment',
            risk_rating: 'B+',
            funded_amount: 5600.00,
            funding_progress: 70,
            min_investment: 100.00,
            max_investment: 2000.00,
            collateral_type: 'Equipment',
            business_type: 'Manufacturing',
            credit_score: 680,
            time_remaining: '5 days',
            created_at: '2024-11-08T10:00:00Z'
        },
        {
            id: 'opp_002',
            borrower_id: 'user_external_002',
            borrower_name: 'Patricia Dube',
            amount: 5000.00,
            currency: 'USD',
            interest_rate: 11.0,
            term_months: 6,
            purpose: 'Retail Inventory',
            risk_rating: 'A-',
            funded_amount: 4000.00,
            funding_progress: 80,
            min_investment: 50.00,
            max_investment: 1000.00,
            collateral_type: 'Inventory',
            business_type: 'Retail',
            credit_score: 710,
            time_remaining: '3 days',
            created_at: '2024-11-10T14:00:00Z'
        }
    ],

    // Helper methods to simulate API responses
    getProfile() {
        return {
            success: true,
            data: this.currentUser
        };
    },

    getWallet() {
        return {
            success: true,
            data: this.wallet
        };
    },

    getLoans(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            success: true,
            data: {
                loans: this.loans.slice(start, end),
                total: this.loans.length,
                page,
                limit,
                totalPages: Math.ceil(this.loans.length / limit)
            }
        };
    },

    getInvestments(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            success: true,
            data: {
                investments: this.investments.slice(start, end),
                total: this.investments.length,
                page,
                limit,
                totalPages: Math.ceil(this.investments.length / limit)
            }
        };
    },

    getTransactions(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            success: true,
            data: {
                transactions: this.transactions.slice(start, end),
                total: this.transactions.length,
                page,
                limit,
                totalPages: Math.ceil(this.transactions.length / limit)
            }
        };
    },

    getStatistics() {
        return {
            success: true,
            data: this.statistics
        };
    },

    getNotifications(unreadOnly = false) {
        const notifications = unreadOnly 
            ? this.notifications.filter(n => !n.read)
            : this.notifications;
        
        return {
            success: true,
            data: {
                notifications,
                unread_count: this.notifications.filter(n => !n.read).length,
                total: notifications.length
            }
        };
    },

    getLoanOpportunities(page = 1, limit = 10) {
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            success: true,
            data: {
                opportunities: this.loanOpportunities.slice(start, end),
                total: this.loanOpportunities.length,
                page,
                limit,
                totalPages: Math.ceil(this.loanOpportunities.length / limit)
            }
        };
    }
};

// Make it available globally
if (typeof window !== 'undefined') {
    window.MockDataService = MockDataService;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MockDataService;
}

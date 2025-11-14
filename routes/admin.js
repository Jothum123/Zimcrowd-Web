const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');

const router = express.Router();

// Middleware to verify JWT token and check admin role
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify JWT token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded || !decoded.userId) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Get user from Supabase auth
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        req.user = user;
        req.profile = profile;
        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Admin
router.get('/stats', authenticateAdmin, async (req, res) => {
    try {
        // Mock statistics - in production, these would be calculated from database
        const stats = {
            overview: {
                total_users: 1250,
                active_users: 892,
                total_loans: 543,
                active_loans: 321,
                total_loan_amount: 2150000.00,
                total_investments: 1875000.00
            },
            recent_activity: {
                new_users_today: 12,
                new_loans_today: 8,
                loans_approved_today: 6,
                total_transactions_today: 45
            },
            financial: {
                total_deposits: 950000.00,
                total_withdrawals: 780000.00,
                platform_fees: 45000.00,
                net_revenue: 125000.00
            },
            risk_metrics: {
                average_credit_score: 685,
                default_rate: 2.3,
                recovery_rate: 78.5,
                delinquency_rate: 5.1
            }
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/users
// @desc    Get users list with filtering
// @access  Admin
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search, role } = req.query;
        const offset = (page - 1) * limit;

        // Mock users data - in production this would query profiles table
        const mockUsers = [
            {
                id: '1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone: '+263712345678',
                role: 'user',
                onboarding_completed: true,
                profile_completed: true,
                is_active: true,
                created_at: '2025-01-15T10:30:00Z',
                credit_score: 720,
                total_loans: 2,
                active_loans: 1,
                total_invested: 5000.00
            },
            {
                id: '2',
                first_name: 'Jane',
                last_name: 'Smith',
                email: 'jane.smith@example.com',
                phone: '+263778945612',
                role: 'user',
                onboarding_completed: true,
                profile_completed: false,
                is_active: true,
                created_at: '2025-01-20T14:15:00Z',
                credit_score: 650,
                total_loans: 1,
                active_loans: 1,
                total_invested: 0
            }
        ];

        // Apply filters (mock filtering)
        let filteredUsers = mockUsers;

        if (status) {
            filteredUsers = filteredUsers.filter(user => user.is_active === (status === 'active'));
        }

        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = filteredUsers.filter(user =>
                user.first_name.toLowerCase().includes(searchLower) ||
                user.last_name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );
        }

        if (role) {
            filteredUsers = filteredUsers.filter(user => user.role === role);
        }

        // Apply pagination
        const paginatedUsers = filteredUsers.slice(offset, offset + limit);

        res.json({
            success: true,
            data: {
                users: paginatedUsers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredUsers.length,
                    pages: Math.ceil(filteredUsers.length / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get admin users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/users/:id
// @desc    Get detailed user information
// @access  Admin
router.get('/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Mock detailed user data
        const userDetail = {
            id: id,
            personal_info: {
                first_name: 'John',
                last_name: 'Doe',
                email: 'john.doe@example.com',
                phone: '+263712345678',
                date_of_birth: '1985-06-15',
                gender: 'male',
                national_id: '123456789A12'
            },
            address: {
                street: '123 Main Street',
                city: 'Harare',
                state: 'Harare',
                zip_code: '0000',
                country: 'Zimbabwe'
            },
            employment: {
                status: 'employed',
                employer: 'TechCorp Zimbabwe',
                occupation: 'Software Developer',
                monthly_income: 5000.00
            },
            financial: {
                credit_score: 720,
                bank_name: 'ZB Bank',
                account_number: '****1234'
            },
            account_status: {
                role: 'user',
                is_active: true,
                onboarding_completed: true,
                profile_completed: true,
                email_verified: true,
                phone_verified: true,
                kyc_verified: true,
                created_at: '2025-01-15T10:30:00Z',
                last_login: '2025-02-10T09:15:00Z'
            },
            loan_summary: {
                total_loans: 2,
                active_loans: 1,
                total_borrowed: 8500.00,
                total_repaid: 3200.00,
                outstanding_balance: 5300.00
            },
            investment_summary: {
                total_invested: 5000.00,
                active_investments: 1,
                total_returns: 125.00,
                average_return_rate: 8.5
            }
        };

        res.json({
            success: true,
            data: userDetail
        });
    } catch (error) {
        console.error('Get user detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Admin
router.put('/users/:id/status', authenticateAdmin, [
    body('is_active')
        .isBoolean()
        .withMessage('is_active must be a boolean'),
    body('reason')
        .optional()
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active, reason } = req.body;

        // In production, this would update the user status in database
        // and log the admin action

        const updateResult = {
            user_id: id,
            previous_status: true, // Mock
            new_status: is_active,
            changed_by: req.user.id,
            changed_at: new Date().toISOString(),
            reason: reason || null
        };

        res.json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            data: updateResult
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/loans
// @desc    Get loans for approval/review
// @access  Admin
router.get('/loans', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'pending' } = req.query;
        const offset = (page - 1) * limit;

        // Mock loans data
        const mockLoans = [
            {
                id: '1',
                user_id: '1',
                user_name: 'John Doe',
                user_email: 'john.doe@example.com',
                loan_type: 'personal',
                amount: 5000.00,
                interest_rate: 12.5,
                duration_months: 24,
                purpose: 'Home improvement project',
                status: 'pending',
                monthly_payment: 229.17,
                total_payment: 5500.00,
                created_at: '2025-02-01T10:30:00Z',
                risk_score: 'medium',
                credit_score: 720
            },
            {
                id: '2',
                user_id: '2',
                user_name: 'Jane Smith',
                user_email: 'jane.smith@example.com',
                loan_type: 'business',
                amount: 15000.00,
                interest_rate: 15.0,
                duration_months: 36,
                purpose: 'Business expansion',
                status: 'pending',
                monthly_payment: 506.25,
                total_payment: 18225.00,
                created_at: '2025-02-02T14:15:00Z',
                risk_score: 'high',
                credit_score: 650
            }
        ];

        // Filter by status
        const filteredLoans = mockLoans.filter(loan => loan.status === status);
        const paginatedLoans = filteredLoans.slice(offset, offset + limit);

        res.json({
            success: true,
            data: {
                loans: paginatedLoans,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredLoans.length,
                    pages: Math.ceil(filteredLoans.length / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get admin loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/admin/loans/:id/approve
// @desc    Approve or reject a loan application
// @access  Admin
router.put('/loans/:id/approve', authenticateAdmin, [
    body('action')
        .isIn(['approve', 'reject'])
        .withMessage('Action must be approve or reject'),
    body('reason')
        .optional()
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage('Reason must be between 10 and 500 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body;

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update loan status in database
        const { data: loan, error } = await supabase
            .from('loans')
            .update({
                status: newStatus,
                approved_by: req.user.id,
                approved_at: new Date().toISOString(),
                approval_reason: reason || null
            })
            .eq('id', id)
            .eq('status', 'pending')
            .select('*, profiles!inner(first_name, last_name, email)')
            .single();

        if (error || !loan) {
            return res.status(400).json({
                success: false,
                message: 'Loan not found or already processed'
            });
        }

        // If approved, create wallet transaction for disbursement
        if (action === 'approve') {
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    user_id: loan.user_id,
                    type: 'loan_disbursement',
                    amount: loan.amount,
                    description: `Loan disbursement - ${loan.loan_type} loan`,
                    status: 'completed',
                    reference: `LOAN-${loan.id}`,
                    created_at: new Date().toISOString()
                });

            if (transactionError) {
                console.error('Transaction creation error:', transactionError);
            }

            // Update wallet balance
            const { error: walletError } = await supabase.rpc('update_wallet_balance', {
                p_user_id: loan.user_id,
                p_amount: loan.amount,
                p_transaction_type: 'credit'
            });

            if (walletError) {
                console.error('Wallet update error:', walletError);
            }
        }

        // Send notification (you can implement email/SMS here)
        const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
                user_id: loan.user_id,
                type: action === 'approve' ? 'loan_approved' : 'loan_rejected',
                title: `Loan Application ${action === 'approve' ? 'Approved' : 'Rejected'}`,
                message: action === 'approve' 
                    ? `Your ${loan.loan_type} loan of $${loan.amount} has been approved and funds have been disbursed to your wallet.`
                    : `Your ${loan.loan_type} loan application has been rejected. ${reason || 'Please contact support for more information.'}`,
                is_read: false,
                created_at: new Date().toISOString()
            });

        if (notificationError) {
            console.error('Notification creation error:', notificationError);
        }

        const updateResult = {
            loan_id: id,
            previous_status: 'pending',
            new_status: newStatus,
            approved_by: req.user.id,
            approved_at: new Date().toISOString(),
            reason: reason || null,
            user_name: `${loan.profiles.first_name} ${loan.profiles.last_name}`,
            amount: loan.amount
        };

        res.json({
            success: true,
            message: `Loan ${action}d successfully`,
            data: updateResult
        });
    } catch (error) {
        console.error('Approve loan error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/transactions
// @desc    Get all platform transactions
// @access  Admin
router.get('/transactions', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 50, type, start_date, end_date } = req.query;
        const offset = (page - 1) * limit;

        // Mock transactions data
        const mockTransactions = [
            {
                id: '1',
                user_id: '1',
                user_name: 'John Doe',
                type: 'loan_payment',
                amount: 229.17,
                description: 'Monthly loan payment',
                status: 'completed',
                created_at: '2025-02-01T10:00:00Z'
            },
            {
                id: '2',
                user_id: '2',
                user_name: 'Jane Smith',
                type: 'deposit',
                amount: 1000.00,
                description: 'Wallet deposit',
                status: 'completed',
                created_at: '2025-02-01T14:30:00Z'
            }
        ];

        // Apply filters
        let filteredTransactions = mockTransactions;

        if (type) {
            filteredTransactions = filteredTransactions.filter(t => t.type === type);
        }

        const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

        res.json({
            success: true,
            data: {
                transactions: paginatedTransactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredTransactions.length,
                    pages: Math.ceil(filteredTransactions.length / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get admin transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/admin/reports/overview
// @desc    Get overview reports
// @access  Admin
router.get('/reports/overview', authenticateAdmin, async (req, res) => {
    try {
        // Mock report data
        const report = {
            period: {
                start_date: '2025-01-01',
                end_date: '2025-01-31'
            },
            metrics: {
                new_registrations: 145,
                loan_applications: 89,
                loans_approved: 67,
                loans_rejected: 22,
                total_loan_amount: 345000.00,
                total_deposits: 125000.00,
                total_withdrawals: 98000.00,
                platform_revenue: 8700.00
            },
            trends: {
                user_growth_rate: 12.5,
                loan_approval_rate: 75.3,
                default_rate: 2.1,
                customer_satisfaction: 4.2
            },
            top_performers: {
                most_active_users: [
                    { name: 'John Doe', loans: 3, amount: 15000.00 },
                    { name: 'Jane Smith', loans: 2, amount: 12000.00 }
                ],
                highest_investors: [
                    { name: 'Mike Johnson', invested: 25000.00 },
                    { name: 'Sarah Wilson', invested: 20000.00 }
                ]
            }
        };

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router;

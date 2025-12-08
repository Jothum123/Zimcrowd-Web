/**
 * Market API Routes
 * Real API endpoints for Primary Market Loans and Investments
 * Uses seeded data from the database
 */

const express = require('express');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// =====================================================
// PRIMARY MARKET ENDPOINTS
// =====================================================

/**
 * @route   GET /api/market/primary
 * @desc    Get all primary market loans available for investment
 * @access  Public
 */
router.get('/primary', async (req, res) => {
    try {
        const { currency, status, risk_level, page = 1, limit = 12 } = req.query;
        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
            .from('primary_market_loans')
            .select(`
                *,
                borrower:profiles!borrower_id (
                    id,
                    full_name,
                    occupation,
                    location,
                    zim_score,
                    verified,
                    created_at
                )
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        // Apply filters
        if (currency) {
            query = query.eq('currency', currency.toUpperCase());
        }
        if (status) {
            query = query.eq('status', status);
        } else {
            // Default to funding loans
            query = query.in('status', ['funding', 'active']);
        }
        if (risk_level) {
            query = query.eq('risk_level', risk_level);
        }

        // Apply pagination
        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: loans, error, count } = await query;

        if (error) {
            console.error('Error fetching primary market loans:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch loans',
                error: error.message
            });
        }

        // Transform data for frontend
        const transformedLoans = (loans || []).map(loan => ({
            id: loan.id,
            title: loan.title,
            purpose: {
                name: loan.purpose,
                description: loan.purpose_description,
                color: getPurposeColor(loan.purpose)
            },
            amount: parseFloat(loan.amount),
            currency: loan.currency,
            interestRate: parseFloat(loan.interest_rate),
            term: loan.term_months,
            riskLevel: {
                level: loan.risk_level,
                color: getRiskColor(loan.risk_level)
            },
            fundedAmount: parseFloat(loan.funded_amount || 0),
            fundingProgress: parseFloat(loan.funding_progress || 0),
            lendersCount: loan.lenders_count || 0,
            minInvestment: parseFloat(loan.min_investment || 25),
            status: loan.status,
            createdAt: loan.created_at,
            fundingDeadline: loan.funding_deadline,
            borrower: loan.borrower ? {
                id: loan.borrower.id,
                name: loan.borrower.full_name,
                initials: getInitials(loan.borrower.full_name),
                occupation: loan.borrower.occupation,
                location: loan.borrower.location,
                zimScore: loan.borrower.zim_score,
                rating: getStarRating(loan.borrower.zim_score),
                verified: loan.borrower.verified,
                memberSince: loan.borrower.created_at
            } : null
        }));

        res.json({
            success: true,
            data: {
                loans: transformedLoans,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Primary market error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/market/primary/:id
 * @desc    Get single loan details
 * @access  Public
 */
router.get('/primary/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data: loan, error } = await supabase
            .from('primary_market_loans')
            .select(`
                *,
                borrower:profiles!borrower_id (
                    id,
                    full_name,
                    occupation,
                    location,
                    zim_score,
                    verified,
                    created_at,
                    phone_number
                )
            `)
            .eq('id', id)
            .single();

        if (error || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }

        // Generate repayment schedule
        const schedule = generateRepaymentSchedule(
            parseFloat(loan.amount),
            parseFloat(loan.interest_rate),
            loan.term_months
        );

        res.json({
            success: true,
            data: {
                ...loan,
                borrower: loan.borrower ? {
                    id: loan.borrower.id,
                    name: loan.borrower.full_name,
                    initials: getInitials(loan.borrower.full_name),
                    occupation: loan.borrower.occupation,
                    location: loan.borrower.location,
                    zimScore: loan.borrower.zim_score,
                    rating: getStarRating(loan.borrower.zim_score),
                    verified: loan.borrower.verified,
                    memberSince: loan.borrower.created_at
                } : null,
                schedule: schedule
            }
        });

    } catch (error) {
        console.error('Loan detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   POST /api/market/primary/:id/invest
 * @desc    Invest in a loan
 * @access  Private
 */
router.post('/primary/:id/invest', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid investment amount'
            });
        }

        // Get the loan
        const { data: loan, error: loanError } = await supabase
            .from('primary_market_loans')
            .select('*')
            .eq('id', id)
            .eq('status', 'funding')
            .single();

        if (loanError || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan not available for investment'
            });
        }

        // Check minimum investment
        if (amount < loan.min_investment) {
            return res.status(400).json({
                success: false,
                message: `Minimum investment is ${loan.currency} ${loan.min_investment}`
            });
        }

        // Check remaining amount
        const remainingAmount = parseFloat(loan.amount) - parseFloat(loan.funded_amount);
        if (amount > remainingAmount) {
            return res.status(400).json({
                success: false,
                message: `Maximum available investment is ${loan.currency} ${remainingAmount.toFixed(2)}`
            });
        }

        // Calculate ownership and expected return
        const ownership = (amount / parseFloat(loan.amount)) * 100;
        const expectedReturn = amount * (parseFloat(loan.interest_rate) / 100) * (loan.term_months / 12);

        // Create investment
        const { data: investment, error: investError } = await supabase
            .from('investments')
            .insert({
                investor_id: userId,
                loan_id: id,
                borrower_id: loan.borrower_id,
                amount: amount,
                currency: loan.currency,
                ownership_percent: ownership,
                interest_rate: loan.interest_rate,
                expected_return: expectedReturn,
                status: 'active',
                maturity_date: new Date(Date.now() + loan.term_months * 30 * 24 * 60 * 60 * 1000),
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                total_payments: loan.term_months
            })
            .select()
            .single();

        if (investError) {
            console.error('Investment error:', investError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create investment'
            });
        }

        // Update loan funding progress
        const newFundedAmount = parseFloat(loan.funded_amount) + amount;
        const newProgress = (newFundedAmount / parseFloat(loan.amount)) * 100;
        const isFullyFunded = newProgress >= 100;
        const newStatus = isFullyFunded ? 'funded' : 'funding';

        await supabase
            .from('primary_market_loans')
            .update({
                funded_amount: newFundedAmount,
                funding_progress: newProgress,
                lenders_count: loan.lenders_count + 1,
                status: newStatus,
                funded_at: isFullyFunded ? new Date().toISOString() : null
            })
            .eq('id', id);

        // If loan is fully funded (100%), create active loan for borrower
        if (isFullyFunded) {
            await createActiveLoanForBorrower(loan, id);
        }

        res.json({
            success: true,
            message: isFullyFunded 
                ? 'Investment successful! Loan is now fully funded and active.' 
                : 'Investment successful!',
            data: {
                investment: investment,
                ownership: ownership.toFixed(2),
                expectedReturn: expectedReturn.toFixed(2),
                loanFullyFunded: isFullyFunded
            }
        });

    } catch (error) {
        console.error('Investment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// =====================================================
// INVESTMENTS PORTFOLIO ENDPOINTS
// =====================================================

/**
 * @route   GET /api/market/investments
 * @desc    Get user's investment portfolio
 * @access  Private
 */
router.get('/investments', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('investments')
            .select(`
                *,
                loan:primary_market_loans!loan_id (
                    id,
                    title,
                    purpose,
                    amount,
                    currency,
                    interest_rate,
                    term_months,
                    risk_level,
                    status
                ),
                borrower:profiles!borrower_id (
                    id,
                    full_name,
                    occupation,
                    location,
                    zim_score,
                    verified
                )
            `, { count: 'exact' })
            .eq('investor_id', userId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: investments, error, count } = await query;

        if (error) {
            console.error('Error fetching investments:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch investments'
            });
        }

        // Calculate portfolio stats
        const stats = calculatePortfolioStats(investments || []);

        // Transform investments
        const transformedInvestments = (investments || []).map(inv => ({
            id: inv.id,
            amount: parseFloat(inv.amount),
            currency: inv.currency,
            ownershipPercent: parseFloat(inv.ownership_percent),
            interestRate: parseFloat(inv.interest_rate),
            expectedReturn: parseFloat(inv.expected_return),
            actualReturn: parseFloat(inv.actual_return || 0),
            status: inv.status,
            investedAt: inv.invested_at,
            maturityDate: inv.maturity_date,
            nextPaymentDate: inv.next_payment_date,
            paymentsReceived: inv.payments_received,
            totalPayments: inv.total_payments,
            monthsRemaining: calculateMonthsRemaining(inv.maturity_date),
            loan: inv.loan ? {
                id: inv.loan.id,
                title: inv.loan.title,
                purpose: inv.loan.purpose,
                totalAmount: parseFloat(inv.loan.amount),
                status: inv.loan.status
            } : null,
            borrower: inv.borrower ? {
                id: inv.borrower.id,
                name: inv.borrower.full_name,
                initials: getInitials(inv.borrower.full_name),
                occupation: inv.borrower.occupation,
                location: inv.borrower.location,
                zimScore: inv.borrower.zim_score,
                rating: getStarRating(inv.borrower.zim_score),
                verified: inv.borrower.verified
            } : null
        }));

        res.json({
            success: true,
            data: {
                investments: transformedInvestments,
                stats: stats,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Investments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   GET /api/market/investments/stats
 * @desc    Get investment portfolio statistics
 * @access  Private
 */
router.get('/investments/stats', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('investor_id', userId);

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch investment stats'
            });
        }

        const stats = calculatePortfolioStats(investments || []);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   GET /api/market/investments/:id
 * @desc    Get single investment details
 * @access  Private
 */
router.get('/investments/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: investment, error } = await supabase
            .from('investments')
            .select(`
                *,
                loan:primary_market_loans!loan_id (*),
                borrower:profiles!borrower_id (*)
            `)
            .eq('id', id)
            .eq('investor_id', userId)
            .single();

        if (error || !investment) {
            return res.status(404).json({
                success: false,
                message: 'Investment not found'
            });
        }

        res.json({
            success: true,
            data: investment
        });

    } catch (error) {
        console.error('Investment detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getStarRating(zimScore) {
    if (zimScore >= 80) return 5;
    if (zimScore >= 70) return 4;
    if (zimScore >= 60) return 3;
    if (zimScore >= 50) return 2;
    if (zimScore >= 40) return 1;
    return 0;
}

function getPurposeColor(purpose) {
    const colors = {
        'Business': '#3b82f6',
        'Education': '#8b5cf6',
        'Medical': '#ef4444',
        'Agriculture': '#22c55e',
        'Home': '#f59e0b',
        'Emergency': '#dc2626',
        'Personal': '#6366f1'
    };
    return colors[purpose] || '#64748b';
}

function getRiskColor(riskLevel) {
    const colors = {
        'Very Low': '#22c55e',
        'Low': '#84cc16',
        'Medium': '#f59e0b',
        'High': '#f97316',
        'Very High': '#ef4444'
    };
    return colors[riskLevel] || '#64748b';
}

function calculateMonthsRemaining(maturityDate) {
    if (!maturityDate) return 0;
    const now = new Date();
    const maturity = new Date(maturityDate);
    const diffTime = maturity - now;
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, diffMonths);
}

function calculatePortfolioStats(investments) {
    const activeInvestments = investments.filter(i => i.status === 'active');
    const completedInvestments = investments.filter(i => i.status === 'completed');
    
    const totalInvested = investments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const totalReturns = investments.reduce((sum, i) => sum + parseFloat(i.actual_return || 0), 0);
    const expectedReturns = investments.reduce((sum, i) => sum + parseFloat(i.expected_return || 0), 0);
    
    const avgReturn = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    return {
        totalInvested: totalInvested,
        totalReturns: totalReturns,
        expectedReturns: expectedReturns,
        avgReturn: avgReturn,
        activeCount: activeInvestments.length,
        completedCount: completedInvestments.length,
        totalCount: investments.length
    };
}

function generateRepaymentSchedule(principal, annualRate, termMonths) {
    const monthlyRate = annualRate / 100 / 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                          (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    const schedule = [];
    let balance = principal;
    const startDate = new Date();

    for (let i = 1; i <= termMonths; i++) {
        const interestPayment = balance * monthlyRate;
        const principalPayment = monthlyPayment - interestPayment;
        balance -= principalPayment;

        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);

        schedule.push({
            month: i,
            dueDate: dueDate.toISOString(),
            payment: monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            balance: Math.max(0, balance),
            status: 'pending'
        });
    }

    return schedule;
}

// =====================================================
// LOAN LIFECYCLE FUNCTIONS
// =====================================================

/**
 * Create an active loan for the borrower when funding reaches 100%
 */
async function createActiveLoanForBorrower(marketLoan, marketLoanId) {
    try {
        console.log(`💰 Creating active loan for borrower ${marketLoan.borrower_id}`);
        
        // Calculate loan details
        const principal = parseFloat(marketLoan.amount);
        const interestRate = parseFloat(marketLoan.interest_rate);
        const termMonths = marketLoan.term_months;
        const monthlyRate = interestRate / 100 / 12;
        
        // Calculate monthly payment using reducing balance
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
                              (Math.pow(1 + monthlyRate, termMonths) - 1);
        
        const totalRepayment = monthlyPayment * termMonths;
        const totalInterest = totalRepayment - principal;
        
        // Calculate maturity date
        const startDate = new Date();
        const maturityDate = new Date(startDate);
        maturityDate.setMonth(maturityDate.getMonth() + termMonths);
        
        // Create the active loan in loans table
        const { data: activeLoan, error: loanError } = await supabase
            .from('loans')
            .insert({
                user_id: marketLoan.borrower_id,
                market_loan_id: marketLoanId,
                amount: principal,
                currency: marketLoan.currency,
                interest_rate: interestRate,
                term_months: termMonths,
                monthly_payment: monthlyPayment,
                total_repayment: totalRepayment,
                total_interest: totalInterest,
                remaining_balance: principal,
                paid_amount: 0,
                status: 'active',
                purpose: marketLoan.purpose,
                purpose_description: marketLoan.purpose_description,
                disbursed_at: new Date().toISOString(),
                maturity_date: maturityDate.toISOString(),
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                payments_made: 0,
                total_payments: termMonths
            })
            .select()
            .single();
        
        if (loanError) {
            console.error('Error creating active loan:', loanError);
            return null;
        }
        
        // Update primary market loan status to 'active'
        await supabase
            .from('primary_market_loans')
            .update({ status: 'active' })
            .eq('id', marketLoanId);
        
        // Notify borrower
        await supabase
            .from('notifications')
            .insert({
                user_id: marketLoan.borrower_id,
                type: 'loan_funded',
                title: 'Your Loan is Fully Funded! 🎉',
                message: `Great news! Your ${marketLoan.currency} ${principal.toLocaleString()} loan has been fully funded by lenders. The funds will be disbursed to your wallet shortly.`,
                data: {
                    loan_id: activeLoan.id,
                    market_loan_id: marketLoanId,
                    amount: principal,
                    currency: marketLoan.currency,
                    monthly_payment: monthlyPayment
                },
                read: false
            });
        
        console.log(`✅ Active loan ${activeLoan.id} created for borrower`);
        return activeLoan;
        
    } catch (error) {
        console.error('Error in createActiveLoanForBorrower:', error);
        return null;
    }
}

/**
 * Complete a loan when all payments are made
 */
async function completeLoan(loanId) {
    try {
        console.log(`✅ Completing loan ${loanId}`);
        
        // Get the loan
        const { data: loan, error: fetchError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loanId)
            .single();
        
        if (fetchError || !loan) {
            console.error('Loan not found:', loanId);
            return false;
        }
        
        // Update loan status to completed
        await supabase
            .from('loans')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                remaining_balance: 0
            })
            .eq('id', loanId);
        
        // Update market loan status
        if (loan.market_loan_id) {
            await supabase
                .from('primary_market_loans')
                .update({ status: 'completed' })
                .eq('id', loan.market_loan_id);
        }
        
        // Update all investments for this loan to completed
        await supabase
            .from('investments')
            .update({ status: 'completed' })
            .eq('loan_id', loan.market_loan_id);
        
        // Notify borrower
        await supabase
            .from('notifications')
            .insert({
                user_id: loan.user_id,
                type: 'loan_completed',
                title: 'Loan Fully Paid! 🎉',
                message: `Congratulations! You have successfully paid off your ${loan.currency} ${parseFloat(loan.amount).toLocaleString()} loan. Your credit score has been updated.`,
                data: { loan_id: loanId },
                read: false
            });
        
        // Increase borrower's ZimScore for successful repayment
        await supabase.rpc('increment_zimscore', { 
            user_id: loan.user_id, 
            points: 5 
        }).catch(e => console.log('ZimScore update skipped:', e.message));
        
        console.log(`✅ Loan ${loanId} completed successfully`);
        return true;
        
    } catch (error) {
        console.error('Error completing loan:', error);
        return false;
    }
}

// =====================================================
// BORROWER LOAN ENDPOINTS
// =====================================================

/**
 * @route   GET /api/market/my-loans
 * @desc    Get borrower's loans (Active and Completed)
 * @access  Private
 */
router.get('/my-loans', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('loans')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: loans, error, count } = await query;

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch loans'
            });
        }

        // Calculate stats
        const activeLoans = (loans || []).filter(l => l.status === 'active');
        const completedLoans = (loans || []).filter(l => l.status === 'completed');
        const totalBorrowed = (loans || []).reduce((sum, l) => sum + parseFloat(l.amount || 0), 0);
        const totalPaid = (loans || []).reduce((sum, l) => sum + parseFloat(l.paid_amount || 0), 0);

        res.json({
            success: true,
            data: {
                loans: loans || [],
                stats: {
                    activeCount: activeLoans.length,
                    completedCount: completedLoans.length,
                    totalBorrowed: totalBorrowed,
                    totalPaid: totalPaid,
                    totalLoans: (loans || []).length
                },
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('My loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   GET /api/market/my-loans/:id
 * @desc    Get single loan details with payment schedule
 * @access  Private
 */
router.get('/my-loans/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const { data: loan, error } = await supabase
            .from('loans')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan not found'
            });
        }

        // Generate payment schedule
        const schedule = generateRepaymentSchedule(
            parseFloat(loan.amount),
            parseFloat(loan.interest_rate),
            loan.term_months
        );

        // Mark paid payments
        for (let i = 0; i < loan.payments_made; i++) {
            if (schedule[i]) {
                schedule[i].status = 'paid';
            }
        }

        res.json({
            success: true,
            data: {
                ...loan,
                schedule: schedule
            }
        });

    } catch (error) {
        console.error('Loan detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   POST /api/market/my-loans/:id/pay
 * @desc    Make a loan payment
 * @access  Private
 */
router.post('/my-loans/:id/pay', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        const userId = req.user.id;

        // Get the loan
        const { data: loan, error: fetchError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (fetchError || !loan) {
            return res.status(404).json({
                success: false,
                message: 'Active loan not found'
            });
        }

        const paymentAmount = amount || parseFloat(loan.monthly_payment);
        const newPaidAmount = parseFloat(loan.paid_amount || 0) + paymentAmount;
        const newRemainingBalance = parseFloat(loan.remaining_balance) - paymentAmount;
        const newPaymentsMade = (loan.payments_made || 0) + 1;
        
        // Check if loan is fully paid
        const isFullyPaid = newRemainingBalance <= 0 || newPaymentsMade >= loan.total_payments;

        // Update loan
        const { error: updateError } = await supabase
            .from('loans')
            .update({
                paid_amount: newPaidAmount,
                remaining_balance: Math.max(0, newRemainingBalance),
                payments_made: newPaymentsMade,
                last_payment_date: new Date().toISOString(),
                next_payment_date: isFullyPaid ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: isFullyPaid ? 'completed' : 'active',
                completed_at: isFullyPaid ? new Date().toISOString() : null
            })
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }

        // If fully paid, complete the loan
        if (isFullyPaid) {
            await completeLoan(id);
        }

        // Distribute payment to investors
        if (loan.market_loan_id) {
            await distributePaymentToInvestors(loan.market_loan_id, paymentAmount);
        }

        res.json({
            success: true,
            message: isFullyPaid 
                ? 'Final payment successful! Loan completed.' 
                : 'Payment successful!',
            data: {
                paymentAmount: paymentAmount,
                remainingBalance: Math.max(0, newRemainingBalance),
                paymentsMade: newPaymentsMade,
                totalPayments: loan.total_payments,
                loanCompleted: isFullyPaid
            }
        });

    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment failed'
        });
    }
});

/**
 * Distribute loan payment to investors proportionally
 */
async function distributePaymentToInvestors(marketLoanId, paymentAmount) {
    try {
        // Get all investments for this loan
        const { data: investments, error } = await supabase
            .from('investments')
            .select('*')
            .eq('loan_id', marketLoanId)
            .eq('status', 'active');

        if (error || !investments || investments.length === 0) {
            return;
        }

        // Distribute payment proportionally
        for (const investment of investments) {
            const share = (parseFloat(investment.ownership_percent) / 100) * paymentAmount;
            const newActualReturn = parseFloat(investment.actual_return || 0) + share;
            const newPaymentsReceived = (investment.payments_received || 0) + 1;

            await supabase
                .from('investments')
                .update({
                    actual_return: newActualReturn,
                    payments_received: newPaymentsReceived,
                    next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                })
                .eq('id', investment.id);

            // Notify investor
            await supabase
                .from('notifications')
                .insert({
                    user_id: investment.investor_id,
                    type: 'investment_payment',
                    title: 'Investment Payment Received',
                    message: `You received ${investment.currency} ${share.toFixed(2)} from your investment.`,
                    data: {
                        investment_id: investment.id,
                        amount: share
                    },
                    read: false
                });
        }

        console.log(`💸 Distributed ${paymentAmount} to ${investments.length} investors`);

    } catch (error) {
        console.error('Error distributing payment:', error);
    }
}

module.exports = router;

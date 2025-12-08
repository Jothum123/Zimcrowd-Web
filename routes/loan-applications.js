/**
 * Loan Applications Routes
 * Handles the new loan application flow:
 * 1. User submits loan request → Goes to Admin for review
 * 2. Admin approves → Posted to Primary Market
 * 3. Admin rejects → Shown in My Loans > Applications with rejection reason
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

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

/**
 * @route   POST /api/loan-applications/submit
 * @desc    Submit a new loan application for admin review
 * @access  Private (requires post-registration completion)
 */
router.post('/submit', authenticateUser, [
    body('amount').isFloat({ min: 25 }).withMessage('Minimum loan amount is $25'),
    body('purpose').notEmpty().withMessage('Loan purpose is required'),
    body('term_months').isInt({ min: 1, max: 36 }).withMessage('Term must be 1-36 months'),
    body('interest_rate').isFloat({ min: 5, max: 25 }).withMessage('Interest rate must be 5-25%')
], handleValidationErrors, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, purpose, purpose_description, term_months, interest_rate, currency = 'USD' } = req.body;

        console.log(`📝 New loan application from user ${userId}: ${currency} ${amount}`);

        // 1. Check if user has completed post-registration
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*, post_registration_completed, employment_type, occupation, monthly_income, zim_score, verified')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        // Check post-registration completion
        if (!profile.post_registration_completed) {
            return res.status(403).json({
                success: false,
                message: 'Please complete your profile setup before applying for a loan',
                code: 'POST_REGISTRATION_REQUIRED',
                redirectTo: '/post-registration.html'
            });
        }

        // 2. Calculate risk level based on ZimScore
        const zimScore = profile.zim_score || 50;
        let riskLevel = 'Medium';
        if (zimScore >= 80) riskLevel = 'Very Low';
        else if (zimScore >= 70) riskLevel = 'Low';
        else if (zimScore >= 60) riskLevel = 'Medium';
        else if (zimScore >= 50) riskLevel = 'High';
        else riskLevel = 'Very High';

        // 3. Check for existing pending applications
        const { data: existingApps } = await supabase
            .from('loan_applications')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .limit(1);

        if (existingApps && existingApps.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have a pending loan application. Please wait for admin review.',
                existingApplicationId: existingApps[0].id
            });
        }

        // 4. Create loan application
        const { data: application, error: insertError } = await supabase
            .from('loan_applications')
            .insert({
                user_id: userId,
                amount: amount,
                currency: currency,
                purpose: purpose,
                purpose_description: purpose_description || '',
                term_months: term_months,
                interest_rate: interest_rate,
                risk_level: riskLevel,
                status: 'pending', // pending, approved, rejected
                borrower_name: profile.full_name,
                borrower_occupation: profile.occupation,
                borrower_location: profile.location,
                borrower_zim_score: zimScore,
                borrower_verified: profile.verified,
                employment_type: profile.employment_type,
                monthly_income: profile.monthly_income,
                submitted_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating loan application:', insertError);
            return res.status(500).json({
                success: false,
                message: 'Failed to submit loan application',
                error: insertError.message
            });
        }

        // 5. Create notification for admin
        await supabase
            .from('admin_notifications')
            .insert({
                type: 'loan_application',
                title: 'New Loan Application',
                message: `${profile.full_name} has submitted a loan application for ${currency} ${amount}`,
                data: {
                    application_id: application.id,
                    user_id: userId,
                    amount: amount,
                    currency: currency,
                    purpose: purpose
                },
                read: false
            });

        console.log(`✅ Loan application ${application.id} submitted successfully`);

        res.status(201).json({
            success: true,
            message: 'Loan application submitted successfully! It will be reviewed by our team.',
            data: {
                applicationId: application.id,
                status: 'pending',
                amount: amount,
                currency: currency,
                estimatedReviewTime: '24-48 hours'
            }
        });

    } catch (error) {
        console.error('Loan application error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/loan-applications/my-applications
 * @desc    Get user's loan applications (for My Loans > Applications tab)
 * @access  Private
 */
router.get('/my-applications', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('loan_applications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('submitted_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        query = query.range(offset, offset + parseInt(limit) - 1);

        const { data: applications, error, count } = await query;

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch applications'
            });
        }

        res.json({
            success: true,
            data: {
                applications: applications || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   POST /api/loan-applications/:id/resubmit
 * @desc    Resubmit a rejected loan application
 * @access  Private
 */
router.post('/:id/resubmit', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { amount, purpose, purpose_description, term_months, interest_rate } = req.body;

        // Get the original application
        const { data: original, error: fetchError } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .eq('status', 'rejected')
            .single();

        if (fetchError || !original) {
            return res.status(404).json({
                success: false,
                message: 'Application not found or cannot be resubmitted'
            });
        }

        // Create new application based on original
        const { data: newApp, error: insertError } = await supabase
            .from('loan_applications')
            .insert({
                user_id: userId,
                amount: amount || original.amount,
                currency: original.currency,
                purpose: purpose || original.purpose,
                purpose_description: purpose_description || original.purpose_description,
                term_months: term_months || original.term_months,
                interest_rate: interest_rate || original.interest_rate,
                risk_level: original.risk_level,
                status: 'pending',
                borrower_name: original.borrower_name,
                borrower_occupation: original.borrower_occupation,
                borrower_location: original.borrower_location,
                borrower_zim_score: original.borrower_zim_score,
                borrower_verified: original.borrower_verified,
                employment_type: original.employment_type,
                monthly_income: original.monthly_income,
                submitted_at: new Date().toISOString(),
                resubmitted_from: id
            })
            .select()
            .single();

        if (insertError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to resubmit application'
            });
        }

        // Mark original as resubmitted
        await supabase
            .from('loan_applications')
            .update({ resubmitted_as: newApp.id })
            .eq('id', id);

        res.json({
            success: true,
            message: 'Application resubmitted successfully',
            data: {
                applicationId: newApp.id,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Resubmit error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   GET /api/loan-applications/check-eligibility
 * @desc    Check if user can apply for a loan (post-registration complete)
 * @access  Private
 */
router.get('/check-eligibility', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('post_registration_completed, employment_type, zim_score, verified, full_name')
            .eq('id', userId)
            .single();

        if (error || !profile) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        // Calculate starting rating based on employment type
        let startingRating = 3; // Default rating
        let startingZimScore = 50; // Default ZimScore

        if (profile.employment_type === 'government') {
            startingRating = 4; // Government employees get better starting rating
            startingZimScore = 65; // Higher starting ZimScore
        } else if (profile.employment_type === 'private_formal') {
            startingRating = 3;
            startingZimScore = 55;
        } else if (profile.employment_type === 'self_employed') {
            startingRating = 3;
            startingZimScore = 50;
        } else {
            startingRating = 2;
            startingZimScore = 45;
        }

        const canApply = profile.post_registration_completed === true;

        res.json({
            success: true,
            data: {
                canApply: canApply,
                postRegistrationCompleted: profile.post_registration_completed,
                employmentType: profile.employment_type,
                currentZimScore: profile.zim_score || startingZimScore,
                startingRating: startingRating,
                verified: profile.verified,
                message: canApply 
                    ? 'You are eligible to apply for a loan' 
                    : 'Please complete your profile setup to apply for loans'
            }
        });

    } catch (error) {
        console.error('Eligibility check error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

/**
 * @route   GET /api/loan-applications/admin/pending
 * @desc    Get all pending loan applications for admin review
 * @access  Admin only
 */
router.get('/admin/pending', authenticateUser, async (req, res) => {
    try {
        // Check if user is admin
        const { data: adminCheck } = await supabase
            .from('admin_users')
            .select('role')
            .eq('user_id', req.user.id)
            .single();

        if (!adminCheck) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { data: applications, error, count } = await supabase
            .from('loan_applications')
            .select('*', { count: 'exact' })
            .eq('status', 'pending')
            .order('submitted_at', { ascending: true })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch applications'
            });
        }

        res.json({
            success: true,
            data: {
                applications: applications || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    totalPages: Math.ceil((count || 0) / limit)
                }
            }
        });

    } catch (error) {
        console.error('Admin pending error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   POST /api/loan-applications/admin/:id/approve
 * @desc    Approve a loan application and post to primary market
 * @access  Admin only
 */
router.post('/admin/:id/approve', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // Check if user is admin
        const { data: adminCheck } = await supabase
            .from('admin_users')
            .select('role, full_name')
            .eq('user_id', adminId)
            .single();

        if (!adminCheck) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Get the application
        const { data: application, error: fetchError } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('id', id)
            .eq('status', 'pending')
            .single();

        if (fetchError || !application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found or already processed'
            });
        }

        // Update application status
        await supabase
            .from('loan_applications')
            .update({
                status: 'approved',
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString(),
                admin_notes: req.body.notes || ''
            })
            .eq('id', id);

        // Create primary market loan
        const { data: marketLoan, error: loanError } = await supabase
            .from('primary_market_loans')
            .insert({
                borrower_id: application.user_id,
                title: `${application.purpose} Loan`,
                purpose: application.purpose,
                purpose_description: application.purpose_description,
                amount: application.amount,
                currency: application.currency,
                interest_rate: application.interest_rate,
                term_months: application.term_months,
                risk_level: application.risk_level,
                funded_amount: 0,
                funding_progress: 0,
                lenders_count: 0,
                min_investment: application.currency === 'USD' ? 25 : 500,
                status: 'funding',
                funding_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                application_id: id
            })
            .select()
            .single();

        if (loanError) {
            console.error('Error creating market loan:', loanError);
            return res.status(500).json({
                success: false,
                message: 'Failed to post loan to market'
            });
        }

        // Notify user
        await supabase
            .from('notifications')
            .insert({
                user_id: application.user_id,
                type: 'loan_approved',
                title: 'Loan Application Approved!',
                message: `Your loan application for ${application.currency} ${application.amount} has been approved and posted to the Primary Market for funding.`,
                data: {
                    application_id: id,
                    market_loan_id: marketLoan.id
                },
                read: false
            });

        console.log(`✅ Loan application ${id} approved by admin ${adminCheck.full_name}`);

        res.json({
            success: true,
            message: 'Loan application approved and posted to Primary Market',
            data: {
                applicationId: id,
                marketLoanId: marketLoan.id
            }
        });

    } catch (error) {
        console.error('Admin approve error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route   POST /api/loan-applications/admin/:id/reject
 * @desc    Reject a loan application with reason
 * @access  Admin only
 */
router.post('/admin/:id/reject', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, notes } = req.body;
        const adminId = req.user.id;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        // Check if user is admin
        const { data: adminCheck } = await supabase
            .from('admin_users')
            .select('role, full_name')
            .eq('user_id', adminId)
            .single();

        if (!adminCheck) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }

        // Get the application
        const { data: application, error: fetchError } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('id', id)
            .eq('status', 'pending')
            .single();

        if (fetchError || !application) {
            return res.status(404).json({
                success: false,
                message: 'Application not found or already processed'
            });
        }

        // Update application status
        await supabase
            .from('loan_applications')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                admin_notes: notes || '',
                reviewed_by: adminId,
                reviewed_at: new Date().toISOString(),
                can_resubmit: true
            })
            .eq('id', id);

        // Notify user
        await supabase
            .from('notifications')
            .insert({
                user_id: application.user_id,
                type: 'loan_rejected',
                title: 'Loan Application Update',
                message: `Your loan application for ${application.currency} ${application.amount} was not approved. Reason: ${reason}. You can resubmit with modifications.`,
                data: {
                    application_id: id,
                    reason: reason,
                    can_resubmit: true
                },
                read: false
            });

        console.log(`❌ Loan application ${id} rejected by admin ${adminCheck.full_name}: ${reason}`);

        res.json({
            success: true,
            message: 'Loan application rejected',
            data: {
                applicationId: id,
                reason: reason
            }
        });

    } catch (error) {
        console.error('Admin reject error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;

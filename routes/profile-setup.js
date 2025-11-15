const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * @route   GET /api/profile-setup/status
 * @desc    Get profile setup completion status
 * @access  Private
 */
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('user_profile_completion')
            .select('*')
            .eq('id', req.user.id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                completion_percentage: user.setup_completion_percentage,
                profile_completed: user.profile_completed,
                employment_completed: user.employment_completed,
                next_of_kin_completed: user.next_of_kin_completed,
                payment_details_completed: user.payment_details_completed,
                kyc_documents_submitted: user.kyc_documents_submitted,
                pending_steps: user.pending_steps.filter(step => step !== null),
                completion_status: user.completion_status,
                account_status: user.account_status,
                kyc_status: user.kyc_status,
                setup_completed_at: user.setup_completed_at
            }
        });
    } catch (error) {
        console.error('Get profile setup status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile setup status'
        });
    }
});

/**
 * @route   POST /api/profile-setup/profile
 * @desc    Complete basic profile information
 * @access  Private
 */
router.post('/profile', authenticateUser, async (req, res) => {
    try {
        const {
            full_name,
            date_of_birth,
            gender,
            national_id,
            address,
            city,
            country,
            postal_code,
            marital_status,
            phone_number
        } = req.body;

        // Validate required fields
        if (!full_name || !date_of_birth || !national_id || !address || !phone_number) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Update user profile
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                full_name,
                date_of_birth,
                gender,
                national_id,
                address,
                city,
                country: country || 'Zimbabwe',
                postal_code,
                marital_status,
                phone_number,
                profile_completed: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.user.id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Calculate new completion percentage
        const { data: completion } = await supabase
            .rpc('calculate_setup_completion', { p_user_id: req.user.id });

        res.json({
            success: true,
            message: 'Profile information saved successfully',
            data: {
                user: updatedUser,
                completion_percentage: completion
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile'
        });
    }
});

/**
 * @route   POST /api/profile-setup/employment
 * @desc    Add employment details
 * @access  Private
 */
router.post('/employment', authenticateUser, async (req, res) => {
    try {
        const {
            employment_status,
            employer_name,
            job_title,
            employment_type,
            industry,
            years_employed,
            monthly_income,
            other_income_sources,
            employer_phone,
            employer_email,
            employer_address,
            work_start_date
        } = req.body;

        // Validate required fields
        if (!employment_status || !monthly_income) {
            return res.status(400).json({
                success: false,
                message: 'Employment status and monthly income are required'
            });
        }

        // Insert or update employment details
        const { data: employment, error: employmentError } = await supabase
            .from('employment_details')
            .upsert({
                user_id: req.user.id,
                employment_status,
                employer_name,
                job_title,
                employment_type,
                industry,
                years_employed,
                monthly_income,
                other_income_sources,
                employer_phone,
                employer_email,
                employer_address,
                work_start_date,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })
            .select()
            .single();

        if (employmentError) throw employmentError;

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Employment details saved successfully',
            data: {
                employment,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null)
            }
        });
    } catch (error) {
        console.error('Add employment details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save employment details'
        });
    }
});

/**
 * @route   POST /api/profile-setup/next-of-kin
 * @desc    Add next of kin details
 * @access  Private
 */
router.post('/next-of-kin', authenticateUser, async (req, res) => {
    try {
        const {
            full_name,
            relationship,
            phone_number,
            email,
            address,
            city,
            country,
            date_of_birth,
            national_id
        } = req.body;

        // Validate required fields
        if (!full_name || !relationship || !phone_number || !address) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Check if next of kin already exists
        const { data: existing } = await supabase
            .from('next_of_kin')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('is_primary', true)
            .single();

        let nextOfKin;
        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('next_of_kin')
                .update({
                    full_name,
                    relationship,
                    phone_number,
                    email,
                    address,
                    city,
                    country: country || 'Zimbabwe',
                    date_of_birth,
                    national_id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            nextOfKin = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('next_of_kin')
                .insert({
                    user_id: req.user.id,
                    full_name,
                    relationship,
                    phone_number,
                    email,
                    address,
                    city,
                    country: country || 'Zimbabwe',
                    date_of_birth,
                    national_id,
                    is_primary: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            nextOfKin = data;
        }

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Next of kin details saved successfully',
            data: {
                next_of_kin: nextOfKin,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null)
            }
        });
    } catch (error) {
        console.error('Add next of kin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save next of kin details'
        });
    }
});

/**
 * @route   POST /api/profile-setup/payment-details
 * @desc    Add payment details
 * @access  Private
 */
router.post('/payment-details', authenticateUser, async (req, res) => {
    try {
        const {
            payment_method,
            bank_name,
            account_number,
            account_name,
            branch_name,
            branch_code,
            swift_code,
            mobile_money_provider,
            mobile_money_number
        } = req.body;

        // Validate required fields
        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: 'Payment method is required'
            });
        }

        if (payment_method === 'bank_account' && (!bank_name || !account_number || !account_name)) {
            return res.status(400).json({
                success: false,
                message: 'Bank details are required'
            });
        }

        if (payment_method === 'mobile_money' && (!mobile_money_provider || !mobile_money_number)) {
            return res.status(400).json({
                success: false,
                message: 'Mobile money details are required'
            });
        }

        // Check if payment details already exist
        const { data: existing } = await supabase
            .from('payment_details')
            .select('id')
            .eq('user_id', req.user.id)
            .eq('is_primary', true)
            .single();

        let paymentDetails;
        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('payment_details')
                .update({
                    payment_method,
                    bank_name,
                    account_number,
                    account_name,
                    branch_name,
                    branch_code,
                    swift_code,
                    mobile_money_provider,
                    mobile_money_number,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            paymentDetails = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('payment_details')
                .insert({
                    user_id: req.user.id,
                    payment_method,
                    bank_name,
                    account_number,
                    account_name,
                    branch_name,
                    branch_code,
                    swift_code,
                    mobile_money_provider,
                    mobile_money_number,
                    is_primary: true,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            paymentDetails = data;
        }

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Payment details saved successfully',
            data: {
                payment_details: paymentDetails,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null)
            }
        });
    } catch (error) {
        console.error('Add payment details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save payment details'
        });
    }
});

/**
 * @route   POST /api/profile-setup/upload-document
 * @desc    Upload KYC document
 * @access  Private
 */
router.post('/upload-document', authenticateUser, async (req, res) => {
    try {
        const {
            document_type,
            document_number,
            file_url,
            file_name,
            file_size,
            mime_type,
            expiry_date
        } = req.body;

        // Validate required fields
        if (!document_type || !file_url) {
            return res.status(400).json({
                success: false,
                message: 'Document type and file are required'
            });
        }

        // Insert document
        const { data: document, error: docError } = await supabase
            .from('verification_documents')
            .insert({
                user_id: req.user.id,
                document_type,
                document_number,
                file_url,
                file_name,
                file_size,
                mime_type,
                expiry_date,
                status: 'pending',
                submitted_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) throw docError;

        // Get updated completion status
        const { data: status } = await supabase
            .from('user_profile_completion')
            .select('setup_completion_percentage, pending_steps, kyc_documents_submitted')
            .eq('id', req.user.id)
            .single();

        res.json({
            success: true,
            message: 'Document uploaded successfully',
            data: {
                document,
                completion_percentage: status?.setup_completion_percentage,
                pending_steps: status?.pending_steps.filter(step => step !== null),
                kyc_documents_submitted: status?.kyc_documents_submitted
            }
        });
    } catch (error) {
        console.error('Upload document error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload document'
        });
    }
});

/**
 * @route   GET /api/profile-setup/documents
 * @desc    Get user's uploaded documents
 * @access  Private
 */
router.get('/documents', authenticateUser, async (req, res) => {
    try {
        const { data: documents, error } = await supabase
            .from('verification_documents')
            .select('*')
            .eq('user_id', req.user.id)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: documents || []
        });
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get documents'
        });
    }
});

/**
 * @route   GET /api/profile-setup/admin/kyc-queue
 * @desc    Get KYC review queue (Admin only)
 * @access  Private/Admin
 */
router.get('/admin/kyc-queue', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { data: queue, error } = await supabase
            .from('admin_kyc_review_queue')
            .select('*');

        if (error) throw error;

        res.json({
            success: true,
            data: queue || []
        });
    } catch (error) {
        console.error('Get KYC queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get KYC review queue'
        });
    }
});

/**
 * @route   POST /api/profile-setup/admin/review-kyc/:user_id
 * @desc    Review and approve/reject KYC (Admin only)
 * @access  Private/Admin
 */
router.post('/admin/review-kyc/:user_id', [authenticateUser, requireAdmin], async (req, res) => {
    try {
        const { user_id } = req.params;
        const { action, rejection_reason, document_reviews } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action'
            });
        }

        if (action === 'reject' && !rejection_reason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        // Update document statuses
        if (document_reviews && Array.isArray(document_reviews)) {
            for (const review of document_reviews) {
                await supabase
                    .from('verification_documents')
                    .update({
                        status: review.status,
                        reviewed_at: new Date().toISOString(),
                        reviewed_by: req.user.id,
                        rejection_reason: review.rejection_reason || null
                    })
                    .eq('id', review.document_id);
            }
        }

        // Update user KYC status
        const newKycStatus = action === 'approve' ? 'verified' : 'rejected';
        const newAccountStatus = action === 'approve' ? 'active' : 'pending_verification';

        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({
                kyc_status: newKycStatus,
                account_status: newAccountStatus,
                kyc_verified_at: action === 'approve' ? new Date().toISOString() : null,
                status_reason: action === 'reject' ? rejection_reason : null,
                status_changed_at: new Date().toISOString(),
                status_changed_by: req.user.id
            })
            .eq('id', user_id)
            .select()
            .single();

        if (updateError) throw updateError;

        // Record status change
        await supabase
            .from('account_status_history')
            .insert({
                user_id: user_id,
                previous_status: 'pending_verification',
                new_status: newAccountStatus,
                reason: action === 'approve' ? 'KYC approved' : `KYC rejected: ${rejection_reason}`,
                changed_by: req.user.id,
                changed_by_role: 'admin',
                created_at: new Date().toISOString()
            });

        // Send notification to user
        await supabase
            .from('notifications')
            .insert({
                user_id: user_id,
                type: action === 'approve' ? 'kyc_approved' : 'kyc_rejected',
                title: action === 'approve' ? 'KYC Approved!' : 'KYC Rejected',
                message: action === 'approve' 
                    ? 'Your KYC verification has been approved. Your account is now active!'
                    : `Your KYC verification was rejected. Reason: ${rejection_reason}. Please resubmit correct documents.`,
                priority: 'high',
                created_at: new Date().toISOString()
            });

        res.json({
            success: true,
            message: `KYC ${action}d successfully`,
            data: updatedUser
        });
    } catch (error) {
        console.error('Review KYC error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to review KYC'
        });
    }
});

module.exports = router;

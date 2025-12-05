/**
 * ZimScore API Routes
 * Handles ZimScore calculation and avatar rating display
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

/**
 * Calculate ZimScore for a user
 * POST /api/zimscore/calculate
 */
router.post('/calculate', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get user profile data
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found'
            });
        }

        // Check if user has completed KYC (required documents and salary verification)
        const hasKycCompleted = profile.documentation_verified && 
                               profile.verified_net_salary && 
                               profile.salary_verified_at;

        if (!hasKycCompleted) {
            return res.json({
                success: true,
                zimscore: 0,
                message: 'KYC not completed - ZimScore will be available after verification',
                kycStatus: 'pending',
                requires: profile.documentation_verified ? 'salary_verification' : 'document_verification'
            });
        }

        // Calculate base ZimScore using existing function
        const { data: zimscoreData, error: zimscoreError } = await supabase
            .rpc('calculate_final_zimscore', { p_user_id: userId });

        if (zimscoreError) {
            console.error('ZimScore calculation error:', zimscoreError);
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate ZimScore',
                error: zimscoreError.message
            });
        }

        const finalZimScore = zimscoreData;

        // Update profile with calculated ZimScore
        await supabase
            .from('profiles')
            .update({
                zimscore: finalZimScore,
                zimscore_calculated_at: new Date().toISOString()
            })
            .eq('id', userId);

        // Get star rating and category
        const getStarRating = (score) => {
            if (score >= 80) return { stars: '★★★★★', category: 'Excellent', color: '#10b981' };
            if (score >= 70) return { stars: '★★★★☆', category: 'Good', color: '#3b82f6' };
            if (score >= 60) return { stars: '★★★☆☆', category: 'Fair', color: '#f59e0b' };
            if (score >= 50) return { stars: '★★☆☆☆', category: 'Average', color: '#6b7280' };
            if (score >= 40) return { stars: '★☆☆☆☆', category: 'Below Average', color: '#ef4444' };
            return { stars: '☆☆☆☆☆', category: 'Poor', color: '#991b1b' };
        };

        const ratingInfo = getStarRating(finalZimScore);

        res.json({
            success: true,
            zimscore: finalZimScore,
            stars: ratingInfo.stars,
            category: ratingInfo.category,
            color: ratingInfo.color,
            kycStatus: 'completed',
            calculatedAt: new Date().toISOString(),
            userProfile: {
                employmentStatus: profile.employment_status,
                employerType: profile.employer_type,
                verifiedSalary: profile.verified_net_salary,
                ecNumber: profile.ec_number,
                documentationVerified: profile.documentation_verified
            }
        });

    } catch (error) {
        console.error('ZimScore API error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * Get ZimScore history and penalties
 * GET /api/zimscore/history
 */
router.get('/history', async (req, res) => {
    try {
        const userId = req.query.userId;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Get penalties
        const { data: penalties, error: penaltyError } = await supabase
            .from('zimscore_penalties')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        // Get rewards
        const { data: rewards, error: rewardError } = await supabase
            .from('zimscore_rewards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        res.json({
            success: true,
            penalties: penalties || [],
            rewards: rewards || [],
            totalPenalties: penalties?.reduce((sum, p) => sum + p.penalty_points, 0) || 0,
            totalRewards: rewards?.reduce((sum, r) => sum + r.reward_points, 0) || 0
        });

    } catch (error) {
        console.error('ZimScore history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * Update ZimScore after payment behavior
 * POST /api/zimscore/update-payment
 */
router.post('/update-payment', async (req, res) => {
    try {
        const { userId, loanId, installmentNumber, paymentStatus, daysLate, daysEarly } = req.body;

        if (!userId || !loanId || !installmentNumber || !paymentStatus) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment information'
            });
        }

        let result;

        // Apply penalty or reward based on payment status
        if (paymentStatus === 'paid') {
            const { data: rewardData, error: rewardError } = await supabase
                .rpc('apply_zimscore_reward', {
                    p_user_id: userId,
                    p_loan_id: loanId,
                    p_installment_number: installmentNumber,
                    p_payment_status: paymentStatus,
                    p_days_early: daysEarly || 0
                });
            result = rewardData;
        } else {
            const { data: penaltyData, error: penaltyError } = await supabase
                .rpc('apply_zimscore_penalty', {
                    p_user_id: userId,
                    p_loan_id: loanId,
                    p_installment_number: installmentNumber,
                    p_payment_status: paymentStatus,
                    p_days_late: daysLate || 0
                });
            result = penaltyData;
        }

        // Recalculate final ZimScore
        const { data: newZimScore, error: scoreError } = await supabase
            .rpc('calculate_final_zimscore', { p_user_id: userId });

        res.json({
            success: true,
            pointsApplied: result,
            newZimScore: newZimScore,
            paymentStatus: paymentStatus
        });

    } catch (error) {
        console.error('Payment update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;

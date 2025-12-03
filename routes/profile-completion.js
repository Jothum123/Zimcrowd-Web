const express = require('express');
const { supabase } = require('../utils/supabase-auth');

const router = express.Router();

// Update profile completion status
router.post('/update-completion', async (req, res) => {
    try {
        const { 
            userId, 
            profileCompleted = false,
            documentsVerified = false,
            employmentVerified = false,
            paymentSetup = false,
            profileData = {}
        } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        console.log(`🔄 Updating profile completion for user: ${userId}`);

        // Update profile with completion status and any additional data
        const updateData = {
            profile_completed: profileCompleted,
            documents_verified: documentsVerified,
            employment_verified: employmentVerified,
            payment_setup: paymentSetup,
            updated_at: new Date().toISOString(),
            ...profileData // Spread any additional profile data
        };

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Profile update error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile completion status',
                error: error.message
            });
        }

        console.log(`✅ Profile completion updated for user: ${userId}`);

        res.json({
            success: true,
            message: 'Profile completion status updated successfully',
            profile: data
        });

    } catch (error) {
        console.error('Profile completion update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get profile completion status
router.get('/status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
                profile_completed,
                documents_verified,
                employment_verified,
                payment_setup,
                onboarding_completed,
                first_name,
                last_name,
                email,
                phone
            `)
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Profile fetch error:', error);
            return res.status(404).json({
                success: false,
                message: 'Profile not found',
                error: error.message
            });
        }

        // Calculate overall completion percentage
        const completionSteps = [
            profile.profile_completed,
            profile.documents_verified,
            profile.employment_verified,
            profile.payment_setup
        ];
        
        const completedSteps = completionSteps.filter(step => step === true).length;
        const completionPercentage = Math.round((completedSteps / completionSteps.length) * 100);

        res.json({
            success: true,
            profile: {
                ...profile,
                completion_percentage: completionPercentage,
                steps_completed: completedSteps,
                total_steps: completionSteps.length
            }
        });

    } catch (error) {
        console.error('Profile status fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Complete specific profile step
router.post('/complete-step', async (req, res) => {
    try {
        const { userId, step, stepData = {} } = req.body;

        if (!userId || !step) {
            return res.status(400).json({
                success: false,
                message: 'User ID and step are required'
            });
        }

        console.log(`🔄 Completing step "${step}" for user: ${userId}`);

        let updateData = {
            updated_at: new Date().toISOString(),
            ...stepData
        };

        // Set the appropriate completion flag based on step
        switch (step) {
            case 'documents':
                updateData.documents_verified = true;
                break;
            case 'employment':
                updateData.employment_verified = true;
                break;
            case 'payment':
                updateData.payment_setup = true;
                break;
            case 'profile':
                updateData.profile_completed = true;
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid step. Must be: documents, employment, payment, or profile'
                });
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Step completion error:', error);
            return res.status(500).json({
                success: false,
                message: `Failed to complete ${step} step`,
                error: error.message
            });
        }

        console.log(`✅ Step "${step}" completed for user: ${userId}`);

        res.json({
            success: true,
            message: `${step} step completed successfully`,
            profile: data
        });

    } catch (error) {
        console.error('Step completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;

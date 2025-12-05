/**
 * Profile Update API with Salary Verification Fields
 * Handles updating user profile with comprehensive salary validation data
 */

const express = require('express');
const { supabase } = require('../supabase/client');
const router = express.Router();

/**
 * PUT /api/user/profile
 * Update user profile with salary verification fields
 */
router.put('/', async (req, res) => {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const {
            // Existing profile fields
            first_name,
            last_name,
            date_of_birth,
            national_id,
            email,
            phone,
            address_line1,
            city,
            province,
            postal_code,
            employment_status,
            employer_name,
            employer_type,
            job_title,
            ec_number,
            monthly_income,
            next_of_kin_name,
            next_of_kin_relationship,
            next_of_kin_phone,
            next_of_kin_email,
            next_of_kin_address,
            payment_method,
            
            // NEW: Salary verification fields
            verified_net_salary,
            salary_verified_at,
            ocr_bank_salary,
            ocr_payslip_salary
        } = req.body;

        console.log(`📝 Updating profile for user ${user.id} with salary verification data`);

        // Validate required salary verification fields
        if (verified_net_salary && (!salary_verified_at || isNaN(new Date(salary_verified_at)))) {
            return res.status(400).json({
                success: false,
                message: 'Salary verification timestamp is required when verified net salary is provided'
            });
        }

        // Validate salary consistency
        if (verified_net_salary && ocr_payslip_salary) {
            const difference = Math.abs(verified_net_salary - ocr_payslip_salary);
            const percentageDifference = (difference / ocr_payslip_salary) * 100;
            
            if (percentageDifference > 10) {
                console.warn(`⚠️ Large salary discrepancy detected: User input $${verified_net_salary} vs Payslip $${ocr_payslip_salary} (${percentageDifference.toFixed(1)}% difference)`);
                
                // Still allow but flag for review
                await supabase
                    .from('profile_flags')
                    .insert({
                        user_id: user.id,
                        flag_type: 'salary_discrepancy',
                        flag_data: {
                            user_input: verified_net_salary,
                            payslip_ocr: ocr_payslip_salary,
                            percentage_difference: percentageDifference
                        },
                        created_at: new Date().toISOString()
                    });
            }
        }

        // Update profile with all fields including salary verification
        const { data: profileData, error: updateError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                first_name,
                last_name,
                date_of_birth,
                national_id,
                email,
                phone,
                address_line1,
                city,
                province,
                postal_code,
                employment_status,
                employer_name,
                employer_type,
                job_title,
                ec_number,
                monthly_income,
                next_of_kin_name,
                next_of_kin_relationship,
                next_of_kin_phone,
                next_of_kin_email,
                next_of_kin_address,
                payment_method,
                
                // Salary verification fields
                verified_net_salary: verified_net_salary || monthly_income,
                salary_verified_at: salary_verified_at || new Date().toISOString(),
                ocr_bank_salary,
                ocr_payslip_salary,
                
                // Status flags
                profile_completed: true,
                employment_completed: true,
                next_of_kin_completed: true,
                payment_details_completed: true,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (updateError) {
            console.error('❌ Profile update error:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile',
                error: updateError.message
            });
        }

        console.log(`✅ Profile updated successfully for user ${user.id}`);
        
        res.json({
            success: true,
            message: 'Profile updated successfully with salary verification',
            data: {
                profile: profileData,
                salary_verification: {
                    verified_net_salary: profileData.verified_net_salary,
                    salary_verified_at: profileData.salary_verified_at,
                    ocr_bank_salary: profileData.ocr_bank_salary,
                    ocr_payslip_salary: profileData.ocr_payslip_salary
                }
            }
        });

    } catch (error) {
        console.error('❌ Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

/**
 * GET /api/user/profile/salary-verification
 * Get salary verification status for current user
 */
router.get('/salary-verification', async (req, res) => {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required' 
            });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
                verified_net_salary,
                salary_verified_at,
                ocr_bank_salary,
                ocr_payslip_salary,
                monthly_income,
                employer_type
            `)
            .eq('id', user.id)
            .single();

        if (profileError) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found'
            });
        }

        // Calculate salary freshness
        const salaryAge = profile.salary_verified_at ? 
            Math.floor((Date.now() - new Date(profile.salary_verified_at)) / (1000 * 60 * 60 * 24)) : 
            null;

        const isFresh = salaryAge !== null && salaryAge <= 90;

        res.json({
            success: true,
            data: {
                verified_net_salary: profile.verified_net_salary,
                salary_verified_at: profile.salary_verified_at,
                ocr_bank_salary: profile.ocr_bank_salary,
                ocr_payslip_salary: profile.ocr_payslip_salary,
                monthly_income: profile.monthly_income,
                employer_type: profile.employer_type,
                salary_age_days: salaryAge,
                is_salary_fresh: isFresh,
                needs_reverification: !isFresh
            }
        });

    } catch (error) {
        console.error('❌ Salary verification status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;

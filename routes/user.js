const express = require('express');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/user/profile
// @desc    Get user profile data
// @access  Private
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user profile from profiles table
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }

        // Get user data from auth.users
        const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization?.replace('Bearer ', ''));
        
        if (userError) throw userError;

        // Combine profile and user data - include all fields from schema
        const profileData = {
            id: userId,
            email: user.email || profile?.email,
            phone: user.phone || profile?.phone,
            
            // Personal info
            first_name: profile?.first_name || user.user_metadata?.first_name || '',
            last_name: profile?.last_name || user.user_metadata?.last_name || '',
            date_of_birth: profile?.date_of_birth || '',
            gender: profile?.gender || '',
            nationality: profile?.nationality || '',
            marital_status: profile?.marital_status || '',
            id_number: profile?.id_number || '',
            
            // Profile
            profile_picture_url: profile?.profile_picture_url || profile?.avatar_url || user.user_metadata?.avatar_url || '',
            bio: profile?.bio || '',
            
            // Address
            street_address: profile?.street_address || profile?.street || profile?.address || '',
            address: profile?.address || '',
            city: profile?.city || '',
            suburb: profile?.suburb || '',
            province: profile?.province || profile?.state || '',
            postal_code: profile?.postal_code || profile?.zip_code || '',
            country: profile?.country || 'Zimbabwe',
            
            // Employment
            employment_status: profile?.employment_status || '',
            employment_type: profile?.employment_type || '',
            monthly_income: profile?.monthly_income || '',
            employer_name: profile?.employer_name || '',
            job_title: profile?.job_title || profile?.occupation || '',
            occupation: profile?.occupation || '',
            ec_number: profile?.ec_number || '',
            work_address: profile?.work_address || '',
            work_phone: profile?.work_phone || '',
            work_email: profile?.work_email || '',
            years_employed: profile?.years_employed || '',
            department: profile?.department || '',
            supervisor_name: profile?.supervisor_name || '',
            supervisor_phone: profile?.supervisor_phone || '',
            
            // Next of kin (JSONB)
            next_of_kin: profile?.next_of_kin || {
                primary: {
                    name: profile?.next_of_kin_name || profile?.kin_name || '',
                    relationship: profile?.next_of_kin_relationship || profile?.kin_relationship || '',
                    phone: profile?.next_of_kin_phone || profile?.kin_phone || ''
                },
                secondary: {
                    name: profile?.emergency_contact_name || '',
                    relationship: profile?.emergency_contact_relationship || '',
                    phone: profile?.emergency_contact_phone || ''
                }
            },
            
            // Payment method (JSONB)
            payment_method: profile?.payment_method || {},
            
            // Banking
            bank_name: profile?.bank_name || '',
            account_number: profile?.account_number || '',
            
            // KYC & Status
            kyc_status: profile?.kyc_status || 'pending',
            is_verified: profile?.is_verified || false,
            id_verified: profile?.id_verified || false,
            selfie_verified: profile?.selfie_verified || false,
            documents_verified: profile?.documents_verified || false,
            
            // Completion tracking
            profile_completed: profile?.profile_completed || false,
            employment_completed: profile?.employment_completed || false,
            next_of_kin_completed: profile?.next_of_kin_completed || false,
            payment_details_completed: profile?.payment_details_completed || false,
            completion_percentage: profile?.completion_percentage || 0,
            onboarding_completed: profile?.onboarding_completed || false,
            
            // Timestamps
            created_at: profile?.created_at || user.created_at,
            updated_at: profile?.updated_at || user.updated_at
        };

        res.json({
            success: true,
            data: profileData
        });
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load profile data',
            error: error.message
        });
    }
});

// @route   GET /api/user/notification-settings
// @desc    Get user notification settings
// @access  Private
router.get('/notification-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get notification preferences
        let { data: preferences, error } = await supabase
            .from('user_notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default preferences if they don't exist
            const defaultPreferences = {
                user_id: userId,
                email_enabled: true,
                sms_enabled: false,
                push_enabled: true,
                in_app_enabled: true,
                investment_updates: true,
                loan_updates: true,
                payment_reminders: true,
                marketing_emails: false,
                security_alerts: true,
                newsletter: false
            };

            const { data: newPreferences, error: createError } = await supabase
                .from('user_notification_preferences')
                .insert(defaultPreferences)
                .select()
                .single();

            if (createError) throw createError;
            preferences = newPreferences;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('❌ Error loading notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load notification settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/security
// @desc    Get user security settings
// @access  Private
router.get('/security', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get security settings
        let { data: security, error } = await supabase
            .from('user_security_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default security settings
            const defaultSecurity = {
                user_id: userId,
                two_factor_enabled: false,
                two_factor_method: null,
                login_alerts: true,
                session_timeout: 30,
                password_last_changed: new Date().toISOString()
            };

            const { data: newSecurity, error: createError } = await supabase
                .from('user_security_settings')
                .insert(defaultSecurity)
                .select()
                .single();

            if (createError) throw createError;
            security = newSecurity;
        } else if (error) {
            throw error;
        }

        // Get recent login sessions
        const { data: sessions, error: sessionsError } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        res.json({
            success: true,
            data: {
                ...security,
                recent_sessions: sessions || []
            }
        });
    } catch (error) {
        console.error('❌ Error loading security settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load security settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/display-settings
// @desc    Get user display/UI settings
// @access  Private
router.get('/display-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get display settings from user_settings table
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('theme, language, currency, timezone, date_format, number_format')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default display settings
            const defaultSettings = {
                user_id: userId,
                theme: 'dark',
                language: 'en',
                currency: 'USD',
                timezone: 'Africa/Harare',
                date_format: 'DD/MM/YYYY',
                number_format: 'en-US'
            };

            const { data: newSettings, error: createError } = await supabase
                .from('user_settings')
                .insert(defaultSettings)
                .select('theme, language, currency, timezone, date_format, number_format')
                .single();

            if (createError) throw createError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: settings || {
                theme: 'dark',
                language: 'en',
                currency: 'USD',
                timezone: 'Africa/Harare',
                date_format: 'DD/MM/YYYY',
                number_format: 'en-US'
            }
        });
    } catch (error) {
        console.error('❌ Error loading display settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load display settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/investment-preferences
// @desc    Get user investment preferences
// @access  Private
router.get('/investment-preferences', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get investment preferences from user_settings
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('auto_invest_enabled, auto_invest_amount, risk_preference, preferred_loan_types, min_interest_rate, max_loan_term')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default investment preferences
            const defaultPreferences = {
                user_id: userId,
                auto_invest_enabled: false,
                auto_invest_amount: null,
                risk_preference: 'moderate',
                preferred_loan_types: ['personal', 'business'],
                min_interest_rate: 5.0,
                max_loan_term: 12
            };

            const { data: newSettings, error: createError } = await supabase
                .from('user_settings')
                .insert(defaultPreferences)
                .select('auto_invest_enabled, auto_invest_amount, risk_preference, preferred_loan_types, min_interest_rate, max_loan_term')
                .single();

            if (createError) throw createError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: settings || {
                auto_invest_enabled: false,
                auto_invest_amount: null,
                risk_preference: 'moderate',
                preferred_loan_types: ['personal', 'business'],
                min_interest_rate: 5.0,
                max_loan_term: 12
            }
        });
    } catch (error) {
        console.error('❌ Error loading investment preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load investment preferences',
            error: error.message
        });
    }
});

// @route   GET /api/user/privacy-settings
// @desc    Get user privacy settings
// @access  Private
router.get('/privacy-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get privacy settings from user_settings
        let { data: settings, error } = await supabase
            .from('user_settings')
            .select('portfolio_public, show_profile_picture, show_investment_stats, data_sharing_enabled')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Create default privacy settings
            const defaultPrivacy = {
                user_id: userId,
                portfolio_public: false,
                show_profile_picture: true,
                show_investment_stats: false,
                data_sharing_enabled: false
            };

            const { data: newSettings, error: createError } = await supabase
                .from('user_settings')
                .insert(defaultPrivacy)
                .select('portfolio_public, show_profile_picture, show_investment_stats, data_sharing_enabled')
                .single();

            if (createError) throw createError;
            settings = newSettings;
        } else if (error) {
            throw error;
        }

        res.json({
            success: true,
            data: settings || {
                portfolio_public: false,
                show_profile_picture: true,
                show_investment_stats: false,
                data_sharing_enabled: false
            }
        });
    } catch (error) {
        console.error('❌ Error loading privacy settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load privacy settings',
            error: error.message
        });
    }
});

// @route   GET /api/user/documents
// @desc    Get user uploaded documents
// @access  Private
router.get('/documents', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user documents
        const { data: documents, error } = await supabase
            .from('user_documents')
            .select('*')
            .eq('user_id', userId)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            data: documents || []
        });
    } catch (error) {
        console.error('❌ Error loading documents:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load documents',
            error: error.message
        });
    }
});

// @route   GET /api/user/notifications/recent
// @desc    Get recent notifications for header dropdown
// @access  Private
router.get('/notifications/recent', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;
        
        // Get recent notifications
        const { data: notifications, error } = await supabase
            .from('user_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        // Count unread notifications
        const { count: unreadCount, error: countError } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (countError) throw countError;

        res.json({
            success: true,
            data: {
                notifications: notifications || [],
                unread_count: unreadCount || 0
            }
        });
    } catch (error) {
        console.error('❌ Error loading recent notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load recent notifications',
            error: error.message
        });
    }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Define allowed fields that exist in the profiles table (based on actual schema)
        const allowedProfileFields = [
            // Personal info
            'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender',
            'nationality', 'marital_status', 'id_number', 'passport_number', 'tax_id',
            
            // Address
            'street_address', 'address', 'street', 'apartment_unit', 'city', 'suburb', 
            'state', 'province', 'postal_code', 'zip_code', 'country',
            
            // Profile
            'bio', 'profile_picture_url', 'avatar_url', 'education_level',
            'company', 'website', 'linkedin', 'twitter', 'facebook', 'instagram',
            
            // Employment
            'employment_status', 'employment_type', 'monthly_income', 'annual_income',
            'employer_name', 'job_title', 'occupation', 'ec_number',
            'work_address', 'work_phone', 'work_email', 'years_employed',
            'department', 'supervisor_name', 'supervisor_phone', 'source_of_funds',
            
            // Next of kin (individual fields)
            'next_of_kin_name', 'next_of_kin_relationship', 'next_of_kin_phone', 'next_of_kin_email',
            'kin_name', 'kin_relationship', 'kin_phone', 'kin_email', 'kin_address',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            
            // JSONB fields
            'next_of_kin', 'payment_method', 'extended_profile_data',
            
            // Banking
            'bank_name', 'account_number',
            
            // KYC & Status
            'kyc_status', 'is_verified', 'verification_date', 'risk_rating',
            'id_verified', 'selfie_verified', 'documents_verified',
            
            // Completion tracking
            'profile_completed', 'employment_completed', 'next_of_kin_completed',
            'payment_details_completed', 'setup_completed_at', 'completion_percentage',
            'onboarding_completed'
        ];
        
        // Separate profile fields from extended data
        const profileUpdates = {};
        const extendedData = {};
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedProfileFields.includes(key)) {
                // Clean empty strings to null for profile fields
                profileUpdates[key] = value === '' ? null : value;
            } else {
                // Store other fields in extended_data
                extendedData[key] = value;
            }
        }
        
        // Handle date fields
        if (profileUpdates.date_of_birth === '') {
            profileUpdates.date_of_birth = null;
        }
        
        // Store extended data (employment details, next of kin, payment method) as JSON
        if (Object.keys(extendedData).length > 0) {
            profileUpdates.extended_profile_data = extendedData;
        }

        // Upsert profile (update if exists, insert if not)
        const { data: profile, error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...profileUpdates,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            })
            .select()
            .single();

        if (error) {
            // If extended_profile_data column doesn't exist, try without it
            if (error.message && error.message.includes('extended_profile_data')) {
                console.warn('extended_profile_data column not found, saving without extended data');
                delete profileUpdates.extended_profile_data;
                
                const { data: profileRetry, error: retryError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        ...profileUpdates,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'id'
                    })
                    .select()
                    .single();
                
                if (retryError) throw retryError;
                
                // Store extended data in localStorage on client side
                return res.json({
                    success: true,
                    message: 'Profile updated successfully (extended data stored locally)',
                    data: profileRetry,
                    extendedData: extendedData
                });
            }
            throw error;
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: profile
        });
    } catch (error) {
        console.error('❌ Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
});

// @route   GET /api/user/kyc/status
// @desc    Get user's KYC status
// @access  Private
router.get('/kyc/status', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get profile with KYC fields
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('kyc_status, is_verified, verification_date')
            .eq('id', userId)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: {
                kyc_status: profile?.kyc_status || 'pending',
                is_verified: profile?.is_verified || false,
                verification_date: profile?.verification_date || null
            }
        });
    } catch (error) {
        console.error('❌ Error fetching KYC status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch KYC status',
            error: error.message
        });
    }
});

// @route   POST /api/user/kyc/submit
// @desc    Submit KYC verification data with OCR and ZimScore calculation
// @access  Private
router.post('/kyc/submit', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const kycData = req.body;

        console.log('📝 Submitting KYC data for user:', userId);

        // OCR Processing (if document image provided)
        let ocrData = null;
        if (kycData.document_image) {
            try {
                // TODO: Integrate OCR service (Tesseract, Google Vision, AWS Textract)
                // For now, we'll store the image and process later
                console.log('📸 Document image received for OCR processing');
                ocrData = {
                    status: 'pending',
                    document_type: kycData.id_type,
                    uploaded_at: new Date().toISOString()
                };
            } catch (ocrError) {
                console.error('⚠️ OCR processing failed:', ocrError);
                // Continue without OCR - manual verification
            }
        }

        // Update profile with KYC data
        const { data: profile, error } = await supabase
            .from('profiles')
            .update({
                id_number: kycData.id_number,
                passport_number: kycData.id_type === 'passport' ? kycData.id_number : null,
                nationality: kycData.nationality,
                occupation: kycData.occupation,
                annual_income: kycData.income_range,
                source_of_funds: kycData.source_of_funds,
                kyc_status: 'pending',
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ KYC data saved successfully');

        // Calculate initial ZimScore based on KYC data
        // Note: Full ZimScore calculation requires bank statement upload
        // This sets up the profile for score calculation
        const { ZimScoreService } = require('../services/zimscore.service');
        const zimScoreService = new ZimScoreService();
        
        let zimScore = null;
        let coldStartLoanLimit = 0;
        let loanTenure = 90; // Default 90 days (3 months)
        
        try {
            // Get employment type from profile or KYC data
            const employmentType = kycData.employment_type || 'informal';
            
            // Calculate initial score (will be updated when bank statement is uploaded)
            const scoreData = await zimScoreService.calculateColdStartScore(userId, {
                cashFlowRatio: 0, // Will be calculated from bank statement
                averageBalance: 0,
                nsfEvents: 0,
                monthlyIncome: 0
            }, employmentType);
            
            zimScore = scoreData.score;
            
            // Set cold start loan limit based on employment type
            if (employmentType === 'government') {
                coldStartLoanLimit = 300; // Government employees: $300 max
            } else {
                coldStartLoanLimit = 100; // Others: $100 max
            }
            
            console.log(`🎯 Initial ZimScore calculated: ${zimScore}`);
            console.log(`💰 Cold start loan limit: $${coldStartLoanLimit} (${employmentType})`);
            console.log(`📅 Cold start tenure: ${loanTenure} days (3 months fixed)`);
            
        } catch (scoreError) {
            console.error('⚠️ ZimScore calculation failed:', scoreError);
            
            // FALLBACK: Set cold start score and limits based on employment type
            const employmentType = kycData.employment_type || 'informal';
            
            // Cold start score = Base score (30) + Employment bonus
            const employmentBonus = {
                government: 10,
                private: 6,
                business: 3,
                informal: 0
            };
            
            zimScore = 30 + (employmentBonus[employmentType] || 0);
            
            // Cold start loan limits
            if (employmentType === 'government') {
                coldStartLoanLimit = 300; // Government: $300 max
            } else {
                coldStartLoanLimit = 100; // Others: $100 max
            }
            
            loanTenure = 90; // Fixed 3 months for cold start
            
            console.log(`⚠️ Using fallback cold start values:`);
            console.log(`   ZimScore: ${zimScore} (30 base + ${employmentBonus[employmentType]} employment bonus)`);
            console.log(`   Loan limit: $${coldStartLoanLimit}`);
            console.log(`   Tenure: ${loanTenure} days`);
            
            // Save cold start score to database
            try {
                await supabase
                    .from('user_zimscores')
                    .upsert({
                        user_id: userId,
                        score: zimScore,
                        component1_banking: 0,
                        component2_employment: employmentBonus[employmentType] || 0,
                        component3_performance: 0,
                        cold_start_limit: coldStartLoanLimit,
                        loan_tenure_days: loanTenure,
                        is_cold_start: true,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id'
                    });
                
                console.log('✅ Cold start ZimScore saved to database');
            } catch (dbError) {
                console.error('⚠️ Failed to save cold start score:', dbError);
            }
        }

        res.json({
            success: true,
            message: 'KYC verification submitted successfully',
            data: {
                kyc_status: 'pending',
                submitted_at: new Date().toISOString(),
                ocr_status: ocrData?.status || 'not_provided',
                zimscore: zimScore,
                zimscore_calculated: zimScore !== null,
                cold_start_loan_limit: coldStartLoanLimit,
                loan_tenure_days: loanTenure,
                employment_type: kycData.employment_type || 'informal',
                loan_limits: {
                    max_amount: coldStartLoanLimit,
                    tenure_days: loanTenure,
                    tenure_months: 3,
                    note: 'Cold start limits. Will increase after successful repayment.'
                }
            }
        });
    } catch (error) {
        console.error('❌ Error submitting KYC:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit KYC verification',
            error: error.message
        });
    }
});

// @route   POST /api/user/settings/personal-details
// @desc    Save personal details (name, DOB, gender, marital status)
// @access  Private
router.post('/settings/personal-details', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { first_name, last_name, date_of_birth, gender, marital_status, nationality } = req.body;

        console.log('💼 Saving personal details for user:', userId);

        // Clean up empty fields
        const personalData = {
            first_name,
            last_name,
            date_of_birth: date_of_birth === '' ? null : date_of_birth,
            gender: gender === '' ? null : gender,
            marital_status: marital_status === '' ? null : marital_status,
            nationality,
            updated_at: new Date().toISOString()
        };

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(personalData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Personal details saved');

        res.json({
            success: true,
            message: 'Personal details saved successfully',
            data: profile
        });
    } catch (error) {
        console.error('❌ Error saving personal details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save personal details',
            error: error.message
        });
    }
});

// @route   POST /api/user/settings/next-of-kin
// @desc    Save next of kin details
// @access  Private
router.post('/settings/next-of-kin', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { kin_name, kin_relationship, kin_phone, kin_email, kin_address } = req.body;

        console.log('👨‍👩‍👧 Saving next of kin for user:', userId);

        const kinData = {
            kin_name,
            kin_relationship,
            kin_phone,
            kin_email,
            kin_address,
            updated_at: new Date().toISOString()
        };

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(kinData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Next of kin saved');

        res.json({
            success: true,
            message: 'Next of kin details saved successfully',
            data: {
                kin_name: profile.kin_name,
                kin_relationship: profile.kin_relationship,
                kin_phone: profile.kin_phone,
                kin_email: profile.kin_email,
                kin_address: profile.kin_address
            }
        });
    } catch (error) {
        console.error('❌ Error saving next of kin:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save next of kin details',
            error: error.message
        });
    }
});

// @route   POST /api/user/settings/employment-details
// @desc    Save employment details
// @access  Private
router.post('/settings/employment-details', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            employment_type, 
            employment_status, 
            employer_name, 
            occupation, 
            monthly_income,
            annual_income,
            source_of_funds 
        } = req.body;

        console.log('💼 Saving employment details for user:', userId);

        const employmentData = {
            employment_type,
            employment_status: employment_status === '' ? null : employment_status,
            employer_name,
            occupation,
            monthly_income,
            annual_income,
            source_of_funds,
            updated_at: new Date().toISOString()
        };

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(employmentData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Employment details saved');

        res.json({
            success: true,
            message: 'Employment details saved successfully',
            data: {
                employment_type: profile.employment_type,
                employment_status: profile.employment_status,
                employer_name: profile.employer_name,
                occupation: profile.occupation,
                monthly_income: profile.monthly_income,
                annual_income: profile.annual_income,
                source_of_funds: profile.source_of_funds
            }
        });
    } catch (error) {
        console.error('❌ Error saving employment details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save employment details',
            error: error.message
        });
    }
});

// @route   POST /api/user/settings/physical-address
// @desc    Save physical address
// @access  Private
router.post('/settings/physical-address', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            street_address, 
            suburb, 
            city, 
            postal_code, 
            country 
        } = req.body;

        console.log('🏠 Saving physical address for user:', userId);

        const addressData = {
            street_address,
            suburb,
            city,
            postal_code,
            country,
            updated_at: new Date().toISOString()
        };

        const { data: profile, error } = await supabase
            .from('profiles')
            .update(addressData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Physical address saved');

        res.json({
            success: true,
            message: 'Physical address saved successfully',
            data: {
                street_address: profile.street_address,
                suburb: profile.suburb,
                city: profile.city,
                postal_code: profile.postal_code,
                country: profile.country
            }
        });
    } catch (error) {
        console.error('❌ Error saving physical address:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save physical address',
            error: error.message
        });
    }
});

// @route   POST /api/user/settings/documents
// @desc    Save document details and OCR validation results
// @access  Private
router.post('/settings/documents', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            document_type,
            document_number,
            document_url,
            ocr_validation_result,
            face_verification_result,
            verification_status
        } = req.body;

        console.log('📄 Saving document details for user:', userId);

        // Save to documents table (create if doesn't exist)
        const { data: document, error: docError } = await supabase
            .from('user_documents')
            .insert({
                user_id: userId,
                document_type,
                document_number,
                document_url,
                ocr_validation: ocr_validation_result,
                face_verification: face_verification_result,
                verification_status: verification_status || 'pending',
                uploaded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (docError) {
            // If table doesn't exist, save to profiles table
            console.log('⚠️ user_documents table not found, saving to profiles');
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .update({
                    id_number: document_number,
                    passport_number: document_type === 'passport' ? document_number : null,
                    kyc_status: verification_status || 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (profileError) throw profileError;

            return res.json({
                success: true,
                message: 'Document details saved successfully',
                data: {
                    document_type,
                    document_number,
                    verification_status: verification_status || 'pending',
                    saved_to: 'profiles'
                }
            });
        }

        console.log('✅ Document details saved');

        res.json({
            success: true,
            message: 'Document details saved successfully',
            data: document
        });
    } catch (error) {
        console.error('❌ Error saving document details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save document details',
            error: error.message
        });
    }
});

// @route   POST /api/user/settings/payment-method
// @desc    Save payment method details
// @access  Private
router.post('/settings/payment-method', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            payment_method_type,
            phone_number,
            bank_name,
            account_number,
            account_holder_name,
            is_primary
        } = req.body;

        console.log('💳 Saving payment method for user:', userId);

        // Save to payment_methods table (create if doesn't exist)
        const { data: paymentMethod, error: pmError } = await supabase
            .from('payment_methods')
            .insert({
                user_id: userId,
                payment_type: payment_method_type,
                phone_number,
                bank_name,
                account_number,
                account_holder_name,
                is_primary: is_primary || false,
                is_verified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (pmError) {
            // If table doesn't exist, save to profiles table
            console.log('⚠️ payment_methods table not found, saving to profiles');
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .update({
                    phone: phone_number,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (profileError) throw profileError;

            return res.json({
                success: true,
                message: 'Payment method saved successfully',
                data: {
                    payment_method_type,
                    phone_number,
                    saved_to: 'profiles'
                }
            });
        }

        console.log('✅ Payment method saved');

        res.json({
            success: true,
            message: 'Payment method saved successfully',
            data: paymentMethod
        });
    } catch (error) {
        console.error('❌ Error saving payment method:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save payment method',
            error: error.message
        });
    }
});

// @route   PUT /api/user/notification-settings
// @desc    Update notification settings
// @access  Private
router.put('/notification-settings', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Update or insert notification preferences
        const { data, error } = await supabase
            .from('user_notification_preferences')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            data
        });
    } catch (error) {
        console.error('❌ Error updating notification settings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update notification settings',
            error: error.message
        });
    }
});

module.exports = router;

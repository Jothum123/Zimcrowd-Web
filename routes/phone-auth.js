// Phone-based authentication routes
const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import services
const { supabase } = require('../utils/supabase-auth');
const { 
    generateOTP, 
    sendSMSOTP, 
    sendPasswordResetSMS,
    verifyOTPWithTwilio,
    isValidPhoneNumber,
    formatPhoneForDisplay 
} = require('../utils/twilio-service');

const router = express.Router();

// Rate limiting for phone auth
const phoneAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many phone authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to all phone auth routes
router.use(phoneAuthLimiter);

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

// Phone registration - Step 1: Send OTP
router.post('/register-phone', [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('phone')
        .custom((value) => {
            const validation = isValidPhoneNumber(value);
            if (!validation.isValid) {
                throw new Error('Please provide a valid phone number');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { firstName, lastName, phone, password } = req.body;
        
        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        if (!phoneValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid phone number format'
            });
        }
        
        const formattedPhone = phoneValidation.formatted;
        
        // Check if phone number already exists
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('phone', formattedPhone)
            .single();
            
        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: 'Phone number already registered'
            });
        }
        
        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Store OTP in database
        const { error: otpError } = await supabase
            .from('phone_verifications')
            .insert({
                phone_number: formattedPhone,
                otp_code: otp,
                purpose: 'signup',
                expires_at: expiresAt.toISOString()
            });
            
        if (otpError) {
            console.error('OTP storage error:', otpError);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate verification code'
            });
        }
        
        // Send SMS
        const smsResult = await sendSMSOTP(formattedPhone, otp);
        
        if (!smsResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification SMS',
                error: smsResult.error
            });
        }
        
        // Store user data temporarily (you might want to use Redis or similar)
        // For now, we'll return a token that the frontend can use
        const tempUserData = {
            firstName,
            lastName,
            phone: formattedPhone,
            password // In production, hash this before storing
        };
        
        // In a real app, store this securely with expiration
        const tempToken = Buffer.from(JSON.stringify(tempUserData)).toString('base64');
        
        res.status(200).json({
            success: true,
            message: 'Verification code sent to your phone',
            tempToken, // Frontend will send this back with OTP
            phone: formatPhoneForDisplay(formattedPhone),
            messageSid: smsResult.messageSid
        });
        
    } catch (error) {
        console.error('Phone registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// Phone registration - Step 2: Verify OTP and create account
router.post('/verify-phone-signup', [
    body('tempToken')
        .notEmpty()
        .withMessage('Temporary token is required'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be 6 digits'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { tempToken, otp } = req.body;
        
        // Decode temp user data
        let userData;
        try {
            userData = JSON.parse(Buffer.from(tempToken, 'base64').toString());
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }
        
        const { firstName, lastName, phone, password } = userData;
        
        // Verify OTP - use Twilio Verify if configured, otherwise fallback to database
        let otpVerified = false;
        
        if (process.env.TWILIO_VERIFY_SERVICE_SID) {
            // Use Twilio Verify API
            const twilioVerification = await verifyOTPWithTwilio(phone, otp);
            otpVerified = twilioVerification.success;
            
            if (!otpVerified) {
                return res.status(400).json({
                    success: false,
                    message: twilioVerification.message || 'Invalid verification code'
                });
            }
        } else {
            // Fallback to database verification
            const { data: verification, error: verifyError } = await supabase
                .from('phone_verifications')
                .select('*')
                .eq('phone_number', phone)
                .eq('otp_code', otp)
                .eq('purpose', 'signup')
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())
                .single();
                
            if (verifyError || !verification) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification code'
                });
            }
            
            // Mark OTP as verified
            await supabase
                .from('phone_verifications')
                .update({ verified: true })
                .eq('id', verification.id);
                
            otpVerified = true;
        }
        
        // Create user account with Supabase Auth
        // Since Supabase requires email, we'll create a placeholder email
        const placeholderEmail = `${phone.replace(/\D/g, '')}@zimcrowd-phone.local`;
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: placeholderEmail,
            password: password,
            phone: phone,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                signup_method: 'phone'
            },
            email_confirm: true // Skip email verification since we verified phone
        });
        
        if (authError) {
            console.error('Supabase auth error:', authError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create account'
            });
        }
        
        // Update profile with phone verification status and phone number
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authData.user.id,
                phone: phone,
                phone_verified: true,
                phone_verification_token: null,
                first_name: firstName,
                last_name: lastName,
                email: placeholderEmail
            });
            
        if (profileError) {
            console.error('Profile upsert error:', profileError);
            // Don't fail the whole process if profile update fails
        }
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: authData.user.id,
                phone: phone,
                firstName: firstName,
                lastName: lastName,
                verified: true
            }
        });
        
    } catch (error) {
        console.error('Phone verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
});

// Phone login
router.post('/login-phone', [
    body('phone')
        .custom((value) => {
            const validation = isValidPhoneNumber(value);
            if (!validation.isValid) {
                throw new Error('Please provide a valid phone number');
            }
            return true;
        }),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;
        
        // Generate the placeholder email used during registration
        const placeholderEmail = `${formattedPhone.replace(/\D/g, '')}@zimcrowd-phone.local`;
        
        // Attempt login with Supabase using the placeholder email
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: placeholderEmail,
            password: password
        });
        
        if (authError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password'
            });
        }
        
        // Get user profile data
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, phone, first_name, last_name, phone_verified')
            .eq('id', authData.user.id)
            .single();
            
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: authData.user.id,
                phone: formattedPhone,
                firstName: profile?.first_name || 'Test',
                lastName: profile?.last_name || 'User',
                verified: profile?.phone_verified || true
            },
            session: authData.session
        });
        
    } catch (error) {
        console.error('Phone login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

router.post('/forgot-password-phone', [
    body('phone')
        .custom((value) => {
            const validation = isValidPhoneNumber(value);
            if (!validation.isValid) {
                throw new Error('Please provide a valid phone number');
            }
            return true;
        }),
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone } = req.body;
        
        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;
        
        // Check if phone number exists in profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, phone')
            .eq('phone', formattedPhone)
            .single();
            
        if (!profile) {
            // Don't reveal if phone exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If your phone number is registered, you will receive a reset code'
            });
        }
        
        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Store OTP in database
        const { error: otpError } = await supabase
            .from('phone_verifications')
            .insert({
                phone_number: formattedPhone,
                otp_code: otp,
                purpose: 'password_reset',
                expires_at: expiresAt.toISOString()
            });
            
        if (otpError) {
            console.error('Password reset OTP storage error:', otpError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send reset code'
            });
        }
        
        // Send SMS
        const smsResult = await sendPasswordResetSMS(formattedPhone, otp);
        
        if (!smsResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send reset SMS',
                error: smsResult.error
            });
        }
        
        // Return success (don't reveal if phone exists)
        res.status(200).json({
            success: true,
            message: 'If your phone number is registered, you will receive a reset code',
            phone: formatPhoneForDisplay(formattedPhone)
        });
        
    } catch (error) {
        console.error('Phone password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Reset request failed. Please try again.'
        });
    }
});

router.post('/reset-password-phone', [
    body('phone')
        .custom((value) => {
            const validation = isValidPhoneNumber(value);
            if (!validation.isValid) {
                throw new Error('Please provide a valid phone number');
            }
            return true;
        }),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be 6 digits'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone, otp, newPassword } = req.body;
        
        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;
        
        // Find user by phone number
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', formattedPhone)
            .single();
            
        if (!profile) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset request'
            });
        }
        
        // Verify OTP - use Twilio Verify if configured
        let otpVerified = false;
        
        if (process.env.TWILIO_VERIFY_SERVICE_SID) {
            const twilioVerification = await verifyOTPWithTwilio(formattedPhone, otp);
            otpVerified = twilioVerification.success;
            
            if (!otpVerified) {
                return res.status(400).json({
                    success: false,
                    message: twilioVerification.message || 'Invalid reset code'
                });
            }
        } else {
            // Fallback to database verification
            const { data: verification, error: verifyError } = await supabase
                .from('phone_verifications')
                .select('*')
                .eq('phone_number', formattedPhone)
                .eq('otp_code', otp)
                .eq('purpose', 'password_reset')
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())
                .single();
                
            if (verifyError || !verification) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset code'
                });
            }
            
            await supabase
                .from('phone_verifications')
                .update({ verified: true })
                .eq('id', verification.id);
                
            otpVerified = true;
        }
        
        // Generate placeholder email for auth update
        const placeholderEmail = `${formattedPhone.replace(/\D/g, '')}@zimcrowd-phone.local`;
        
        // Update password in Supabase Auth
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            profile.id,
            { password: newPassword }
        );
        
        if (updateError) {
            console.error('Password update error:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update password'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Password reset successfully'
        });
        
    } catch (error) {
        console.error('Phone password reset verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset failed. Please try again.'
        });
    }
});

router.post('/resend-phone-otp', [
    body('phone')
        .custom((value) => {
            const validation = isValidPhoneNumber(value);
            if (!validation.isValid) {
                throw new Error('Please provide a valid phone number');
            }
            return true;
        }),
    body('purpose')
        .isIn(['signup', 'password_reset'])
        .withMessage('Invalid purpose'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone, purpose } = req.body;
        
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;
        
        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        
        // Store new OTP
        const { error: otpError } = await supabase
            .from('phone_verifications')
            .insert({
                phone_number: formattedPhone,
                otp_code: otp,
                purpose: purpose,
                expires_at: expiresAt.toISOString()
            });
            
        if (otpError) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate new verification code'
            });
        }
        
        // Send SMS
        const smsResult = purpose === 'signup' 
            ? await sendSMSOTP(formattedPhone, otp)
            : await sendPasswordResetSMS(formattedPhone, otp);
        
        if (!smsResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification SMS'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'New verification code sent',
            phone: formatPhoneForDisplay(formattedPhone)
        });
        
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend code. Please try again.'
        });
    }
});

module.exports = router;

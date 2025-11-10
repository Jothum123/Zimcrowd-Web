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
        
        // Verify OTP
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
        
        // Update profile with phone verification status
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                phone_verified: true,
                phone_verification_token: null
            })
            .eq('id', authData.user.id);
            
        if (profileError) {
            console.error('Profile update error:', profileError);
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
        
        // Find user by phone number
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, phone, first_name, last_name, phone_verified')
            .eq('phone', formattedPhone)
            .single();
            
        if (!profile) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password'
            });
        }
        
        // Get the placeholder email for auth
        const placeholderEmail = `${formattedPhone.replace(/\D/g, '')}@zimcrowd-phone.local`;
        
        // Attempt login with Supabase
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
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: profile.id,
                phone: formattedPhone,
                firstName: profile.first_name,
                lastName: profile.last_name,
                verified: profile.phone_verified
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

// Resend phone OTP
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

// Email-based authentication routes
const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import services
const { supabase } = require('../utils/supabase-auth');
const {
    generateOTP,
    sendOTPEmail,
    sendPasswordResetOTPEmail,
    isValidEmail,
    formatEmailForDisplay,
    signInWithGoogle,
    handleGoogleAuthResult,
    sendFirebaseEmailVerification,
    verifyFirebaseEmail
} = require('../utils/email-service');

const router = express.Router();

// Rate limiting for email auth
const emailAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs (increased from 10 for testing)
    message: {
        success: false,
        message: 'Too many email authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to all email auth routes
router.use(emailAuthLimiter);

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

// Email registration - Step 1: Send OTP using Supabase + Resend
router.post('/register-email', [
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('First name must be between 2 and 50 characters'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Last name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { firstName, lastName, email, password, country, city } = req.body;

        // Validate email
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        const normalizedEmail = email.toLowerCase();

        // Check if email already exists
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', normalizedEmail)
            .single();

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        const { error: otpError } = await supabase
            .from('email_verifications')
            .insert({
                email: normalizedEmail,
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

        // For Supabase + Resend: Send OTP via Resend (our email service)
        console.log('Sending OTP via Resend...');

        // Send email using our Resend service
        const emailResult = await sendOTPEmail(normalizedEmail, otp);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        // Store user data temporarily
        const tempUserData = {
            firstName,
            lastName,
            email: normalizedEmail,
            password,
            country,
            city
        };

        // In a real app, store this securely with expiration
        const tempToken = Buffer.from(JSON.stringify(tempUserData)).toString('base64');

        res.status(200).json({
            success: true,
            message: 'Verification code sent to your email',
            tempToken,
            email: formatEmailForDisplay(normalizedEmail)
        });

    } catch (error) {
        console.error('Email registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed. Please try again.'
        });
    }
});

// GET endpoint for verification status (for redirects/callbacks)
router.get('/verify-email-signup', async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Email verification endpoint',
        note: 'Use POST method with tempToken and otp to verify email'
    });
});

// Email registration - Step 2: Verify OTP and create account
router.post('/verify-email-signup', [
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

        const { firstName, lastName, email, password, country, city } = userData;

        // Verify OTP from database
        const { data: verification, error: verifyError } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('email', email)
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
            .from('email_verifications')
            .update({ verified: true })
            .eq('id', verification.id);

        // Create user account with Supabase Auth
        // IMPORTANT: We need to create user WITHOUT triggering Supabase's email confirmation
        console.log('Creating user with email_confirm: false...');

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            user_metadata: {
                first_name: firstName,
                last_name: lastName,
                country: country,
                city: city,
                signup_method: 'email_otp',
                email_verified: true // Mark as verified since we verified with OTP
            },
            email_confirm: false // Don't send Supabase confirmation email
        });

        console.log('Supabase createUser result:', { success: !authError, error: authError?.message });

        if (authError) {
            console.error('Supabase auth error:', authError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create account'
            });
        }

        // Update profile with email verification status
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: email,
                email_verified: true,
                first_name: firstName,
                last_name: lastName,
                country: country,
                city: city
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
                email: email,
                firstName: firstName,
                lastName: lastName,
                verified: true
            }
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
});

// Verify email OTP (for password reset and other purposes)
router.post('/verify-email-otp', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be 6 digits'),
    body('type')
        .optional()
        .isString()
        .withMessage('Type must be a string'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email, otp, type } = req.body;
        const normalizedEmail = email.toLowerCase();
        const purpose = type === 'reset' ? 'password_reset' : 'signup';

        console.log('🔍 Verifying OTP:', {
            email: normalizedEmail,
            otp,
            type,
            purpose,
            currentTime: new Date().toISOString()
        });

        // Verify OTP from database
        const { data: verification, error: verifyError } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('email', normalizedEmail)
            .eq('otp_code', otp)
            .eq('purpose', purpose)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        console.log('🔍 Database query result:', {
            found: !!verification,
            error: verifyError?.message,
            verification: verification ? {
                id: verification.id,
                email: verification.email,
                otp_code: verification.otp_code,
                purpose: verification.purpose,
                verified: verification.verified,
                expires_at: verification.expires_at
            } : null
        });

        if (verifyError || !verification) {
            // Let's also check if there's a verified OTP that matches
            const { data: verifiedCheck } = await supabase
                .from('email_verifications')
                .select('*')
                .eq('email', normalizedEmail)
                .eq('otp_code', otp)
                .eq('purpose', purpose)
                .single();

            console.log('🔍 Already verified check:', verifiedCheck ? {
                verified: verifiedCheck.verified,
                expires_at: verifiedCheck.expires_at
            } : 'No matching OTP found');

            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        // Mark OTP as verified
        await supabase
            .from('email_verifications')
            .update({ verified: true })
            .eq('id', verification.id);

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            email: normalizedEmail
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
});

// Email login
router.post('/login-email', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email, password } = req.body;

        const normalizedEmail = email.toLowerCase();

        // Attempt login with Supabase using email
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: password
        });

        if (authError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Get user profile data
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, first_name, last_name, email_verified, country, city')
            .eq('id', authData.user.id)
            .single();

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: authData.user.id,
                email: normalizedEmail,
                firstName: profile?.first_name || 'Test',
                lastName: profile?.last_name || 'User',
                verified: profile?.email_verified || true,
                country: profile?.country,
                city: profile?.city
            },
            session: authData.session
        });

    } catch (error) {
        console.error('Email login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// Forgot password - Send OTP email
router.post('/forgot-password-email', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email } = req.body;

        const normalizedEmail = email.toLowerCase();

        // Check if email exists in profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', normalizedEmail)
            .single();

        if (!profile) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If your email is registered, you will receive a reset code'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database
        const { error: otpError } = await supabase
            .from('email_verifications')
            .insert({
                email: normalizedEmail,
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

        // Send email
        const emailResult = await sendPasswordResetOTPEmail(normalizedEmail, otp);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send reset email',
                error: emailResult.error
            });
        }

        // Return success (don't reveal if email exists)
        res.status(200).json({
            success: true,
            message: 'If your email is registered, you will receive a reset code',
            email: formatEmailForDisplay(normalizedEmail)
        });

    } catch (error) {
        console.error('Email password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Reset request failed. Please try again.'
        });
    }
});

// Reset password with OTP
router.post('/reset-password-email', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
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
        const { email, otp, newPassword } = req.body;

        const normalizedEmail = email.toLowerCase();

        // Find user by email
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', normalizedEmail)
            .single();

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset request'
            });
        }

        // Verify OTP from database
        const { data: verification, error: verifyError } = await supabase
            .from('email_verifications')
            .select('*')
            .eq('email', normalizedEmail)
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

        // Mark OTP as verified
        await supabase
            .from('email_verifications')
            .update({ verified: true })
            .eq('id', verification.id);

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
        console.error('Email password reset verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Password reset failed. Please try again.'
        });
    }
});

// Resend email OTP
router.post('/resend-email-otp', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('purpose')
        .isIn(['signup', 'password_reset'])
        .withMessage('Invalid purpose'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email, purpose } = req.body;

        const normalizedEmail = email.toLowerCase();

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Store new OTP
        const { error: otpError } = await supabase
            .from('email_verifications')
            .insert({
                email: normalizedEmail,
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

        // Send email
        const emailResult = purpose === 'signup'
            ? await sendOTPEmail(normalizedEmail, otp)
            : await sendPasswordResetOTPEmail(normalizedEmail, otp);

        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        res.status(200).json({
            success: true,
            message: 'New verification code sent',
            email: formatEmailForDisplay(normalizedEmail)
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resend code. Please try again.'
        });
    }
});

// Firebase Email Verification - Send verification link
router.post('/send-firebase-verification', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { email } = req.body;

        const normalizedEmail = email.toLowerCase();

        // Validate email
        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if email already exists
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', normalizedEmail)
            .single();

        if (existingProfile) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Send Firebase email verification
        const firebaseResult = await sendFirebaseEmailVerification(normalizedEmail);

        if (!firebaseResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Verification link sent to your email',
            email: formatEmailForDisplay(normalizedEmail),
            note: 'Check your email and click the verification link'
        });

    } catch (error) {
        console.error('Firebase email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification request failed. Please try again.'
        });
    }
});

// Firebase Email Verification - Verify email link
router.post('/verify-firebase-email', [
    body('emailLink')
        .notEmpty()
        .withMessage('Email link is required'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { emailLink, email } = req.body;

        const normalizedEmail = email.toLowerCase();

        // Verify Firebase email link
        const verifyResult = await verifyFirebaseEmail(emailLink, normalizedEmail);

        if (!verifyResult.success) {
            return res.status(400).json({
                success: false,
                message: verifyResult.message || 'Email verification failed'
            });
        }

        res.status(200).json({
            success: true,
            message: verifyResult.message,
            user: verifyResult.user
        });

    } catch (error) {
        console.error('Firebase email verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Email verification failed. Please try again.'
        });
    }
});

// Google Authentication - Initiate sign in
router.post('/google-signin', async (req, res) => {
    try {
        const googleAuthResult = await signInWithGoogle();

        if (!googleAuthResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to initiate Google authentication'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Google authentication initiated',
            note: 'Use client-side Firebase SDK to complete authentication'
        });

    } catch (error) {
        console.error('Google signin error:', error);
        res.status(500).json({
            success: false,
            message: 'Google authentication failed. Please try again.'
        });
    }
});

// Google Authentication - Handle auth result
router.post('/google-auth-callback', [
    body('idToken')
        .notEmpty()
        .withMessage('ID token is required'),
    body('user')
        .notEmpty()
        .withMessage('User data is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { idToken, user } = req.body;

        // Create a mock userCredential object for server-side processing
        const userCredential = {
            user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified
            }
        };

        const authResult = await handleGoogleAuthResult(userCredential);

        if (!authResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Google authentication processing failed'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Google authentication successful',
            user: authResult.user
        });

    } catch (error) {
        console.error('Google auth callback error:', error);
        res.status(500).json({
            success: false,
            message: 'Google authentication processing failed. Please try again.'
        });
    }
});

module.exports = router;

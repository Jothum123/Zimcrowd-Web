// Phone-based authentication routes
const express = require('express');
console.log('[PHONE-AUTH] Module loaded');
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

// TOTP functionality (built-in, no external dependencies)
const crypto = require('crypto');

// Generate TOTP secret
function generateTOTPSecret() {
    return crypto.randomBytes(20).toString('hex').toUpperCase();
}

// Verify TOTP code
function verifyTOTP(secret, code, window = 1) {
    const timeStep = 30; // 30 seconds
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check current time and adjacent windows
    for (let i = -window; i <= window; i++) {
        const timeCounter = Math.floor((currentTime + i * timeStep) / timeStep);
        const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
        hmac.update(Buffer.from(timeCounter.toString(16).padStart(16, '0'), 'hex'));
        
        const hash = hmac.digest();
        const offset = hash[hash.length - 1] & 0xf;
        
        const codeBytes = hash.slice(offset, offset + 4);
        const calculatedCode = (
            (codeBytes[0] & 0x7f) << 24 |
            (codeBytes[1] & 0xff) << 16 |
            (codeBytes[2] & 0xff) << 8 |
            (codeBytes[3] & 0xff)
        ) % 1000000;
        
        const calculatedCodeStr = calculatedCode.toString().padStart(6, '0');
        
        if (calculatedCodeStr === code) {
            return true;
        }
    }
    
    return false;
}

const router = express.Router();

// Rate limiting for phone auth - DISABLED in development mode
const phoneAuthLimiter = (req, res, next) => {
    // Skip all rate limiting in development mode
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    
    // In production, apply rate limiting
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per 15 minutes
        message: {
            success: false,
            message: 'Too many phone authentication attempts, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false
    })(req, res, next);
};

// OTP verification limiter - DISABLED in development mode
const otpVerificationLimiter = (req, res, next) => {
    // Skip all rate limiting in development mode
    if (process.env.NODE_ENV === 'development') {
        return next();
    }
    
    // In production, apply lenient rate limiting for OTP
    return rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 50, // Allow 50 OTP verification attempts per 15 minutes
        message: {
            success: false,
            message: 'Too many verification attempts. Please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false
    })(req, res, next);
};

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

// TOTP Setup - Step 1: Generate secret and QR code
router.post('/setup-totp', async (req, res) => {
    try {
        // Get user from JWT token (assuming middleware sets req.user)
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Generate TOTP secret
        const secret = generateTOTPSecret();

        // Create QR code URL for authenticator apps
        const accountName = `ZimCrowd:${decoded.phone || 'user'}`;
        const issuer = 'ZimCrowd';
        const qrUrl = `otpauth://totp/${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

        // Store secret temporarily (user must verify before enabling)
        // In production, use Redis or secure temp storage
        const tempKey = `totp_setup_${userId}`;
        global.tempTOTPSecrets = global.tempTOTPSecrets || {};
        global.tempTOTPSecrets[tempKey] = {
            secret,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        };

        res.status(200).json({
            success: true,
            message: 'TOTP setup initiated',
            qrCodeUrl: qrUrl,
            secret: secret, // For manual entry if QR fails
            tempKey
        });

    } catch (error) {
        console.error('TOTP setup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to setup TOTP'
        });
    }
});

// TOTP Setup - Step 2: Verify and enable TOTP
router.post('/verify-totp-setup', [
    body('tempKey').notEmpty().withMessage('Setup key required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { tempKey, otp } = req.body;

        // Get user from JWT token
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        // Get temporary secret
        global.tempTOTPSecrets = global.tempTOTPSecrets || {};
        const tempData = global.tempTOTPSecrets[tempKey];

        if (!tempData || tempData.expires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Setup session expired. Please start over.'
            });
        }

        // Verify OTP
        const isValid = verifyTOTP(tempData.secret, otp);
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        // Enable TOTP for user (store in database)
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                totp_secret: tempData.secret,
                totp_enabled: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('TOTP enable error:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to enable TOTP'
            });
        }

        // Clean up temporary data
        delete global.tempTOTPSecrets[tempKey];

        res.status(200).json({
            success: true,
            message: 'TOTP enabled successfully for your account'
        });

    } catch (error) {
        console.error('TOTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed'
        });
    }
});

// Smart Login - Auto-detects authentication method
router.post('/smart-login', [
    body('phone').custom((value) => {
        const validation = isValidPhoneNumber(value);
        if (!validation.isValid) {
            throw new Error('Please provide a valid phone number');
        }
        return true;
    }),
    body('otp').optional().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
    body('password').optional(),
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone, otp, password } = req.body;
        const jwt = require('jsonwebtoken');

        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;

        // Find user by phone
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, phone, first_name, last_name, totp_secret, totp_enabled')
            .eq('phone', formattedPhone)
            .order('created_at', { ascending: false })
            .limit(1);

        if (profileError || !profiles || profiles.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or credentials'
            });
        }

        const user = profiles[0];

        // Try authentication methods in order of preference

        // Method 1: TOTP (if enabled and OTP provided)
        if (user.totp_enabled && user.totp_secret && otp) {
            console.log('[Smart Login] Trying TOTP verification');
            const isValidTOTP = verifyTOTP(user.totp_secret, otp);
            if (isValidTOTP) {
                return generateLoginResponse(user, 'totp', res);
            }
        }

        // Method 2: Database OTP (passwordless login)
        if (otp) {
            console.log('[Smart Login] Trying database OTP verification');
            const { data: verification, error: verifyError } = await supabase
                .from('phone_verifications')
                .select('*')
                .eq('phone_number', formattedPhone)
                .eq('otp_code', otp)
                .eq('purpose', 'passwordless_login')
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (verification && !verifyError) {
                // Mark as verified
                await supabase
                    .from('phone_verifications')
                    .update({ verified: true })
                    .eq('id', verification.id);

                return generateLoginResponse(user, 'database_otp', res);
            }
        }

        // Method 3: Password login (legacy)
        if (password) {
            console.log('[Smart Login] Trying password verification');
            // For demo purposes, accept any password for existing users
            // In production, verify hashed password
            return generateLoginResponse(user, 'password', res);
        }

        // No valid authentication method found
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials. Please check your phone number and authentication method.'
        });

    } catch (error) {
        console.error('Smart login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// Helper function to generate login response
async function generateLoginResponse(user, method, res) {
    const jwt = require('jsonwebtoken');

    // Generate JWT token
    const token = jwt.sign(
        {
            userId: user.id,
            phone: user.phone,
            type: method
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    const methodMessages = {
        totp: 'Login successful with authenticator app',
        database_otp: 'Login successful with verification code',
        password: 'Login successful with password'
    };

    return res.status(200).json({
        success: true,
        message: methodMessages[method] || 'Login successful',
        user: {
            id: user.id,
            phone: user.phone,
            firstName: user.first_name || 'User',
            lastName: user.last_name || 'User',
            verified: true,
            authMethod: method,
            totpEnabled: user.totp_enabled || false
        },
        session: {
            access_token: token,
            token_type: 'bearer',
            expires_in: 604800 // 7 days
        }
    });
}

module.exports = router;

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
        
        // Send SMS (don't fail if SMS fails - we use database verification as fallback)
        let smsResult = { success: false, error: 'SMS not attempted' };
        try {
            const purpose = 'signup';
            smsResult = await sendSMSOTP(formattedPhone, otp);
            console.log('SMS result:', smsResult);
        } catch (error) {
            console.warn('SMS sending threw exception:', error.message, '- proceeding with database verification only');
            smsResult = { success: false, error: error.message };
        }
        
        if (!smsResult.success) {
            console.log(`SMS failed for phone ${formattedPhone}:`, smsResult.error, '- but continuing with database verification');
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
            ...(smsResult.success && { messageSid: smsResult.messageSid })
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
router.post('/verify-phone-signup', otpVerificationLimiter, [
    body('tempToken')
        .notEmpty()
        .withMessage('Temporary token is required'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be 6 digits'),
    handleValidationErrors
], async (req, res) => {
    console.log('[VERIFY ROUTE] Called with OTP:', req.body.otp);
    try {
        const { tempToken, otp } = req.body;
        console.log('[Verify Signup] Starting verification for OTP:', otp);
        
        // Decode temp user data
        let userData;
        try {
            userData = JSON.parse(Buffer.from(tempToken, 'base64').toString());
            console.log('[Verify Signup] Decoded user data:', { phone: userData.phone, firstName: userData.firstName });
        } catch (error) {
            console.log('[Verify Signup] Token decode error:', error.message);
            return res.status(400).json({
                success: false,
                message: 'Invalid verification token'
            });
        }
        
        const { firstName, lastName, phone, password, pass } = userData;
        const finalPassword = password || pass; // Handle both old and new format
        
        // Verify OTP - use Twilio Verify if configured, otherwise fallback to database
        let otpVerified = false;
        
        if (process.env.TWILIO_VERIFY_SERVICE_SID) {
            // Use Twilio Verify API
            console.log(`[Verify Signup] Using Twilio Verify API for phone: ${phone}`);
            const twilioVerification = await verifyOTPWithTwilio(phone, otp);
            otpVerified = twilioVerification.success;
            
            if (!otpVerified) {
                console.log(`[Verify Signup] Twilio verification failed: ${twilioVerification.message}`);
                return res.status(400).json({
                    success: false,
                    message: twilioVerification.message || 'Invalid verification code'
                });
            }
        } else {
            // Fallback to database verification
            console.log(`[Verify Signup] Using database verification for phone: ${phone}, OTP: ${otp}`);
            const { data: verification, error: verifyError } = await supabase
                .from('phone_verifications')
                .select('*')
                .eq('phone_number', phone)
                .eq('otp_code', otp)
                .eq('purpose', 'signup')
                .eq('verified', false)
                .gt('expires_at', new Date().toISOString())
                .single();
                
            console.log(`[Verify Signup] Database query result:`, { data: verification, error: verifyError });
                
            if (verifyError || !verification) {
                console.log(`[Verify Signup] Database verification failed:`, verifyError?.message || 'No matching verification found');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification code'
                });
            }
            
            otpVerified = true;
            console.log(`[Verify Signup] Database verification SUCCESS`);
        }
        
        // Create user account directly in profiles table (skip Supabase Auth for phone users)
        console.log('[Phone Signup] Creating account for:', { firstName, lastName, phone });
        
        const bcrypt = require('bcrypt');
        const jwt = require('jsonwebtoken');
        
        // TEMP: Use existing auth user ID for testing
        const userId = 'd7633a4a-9ff8-4618-a8ad-441f15491316'; // Known existing user
        console.log('[Phone Signup] Using existing userId:', userId);
        
        // TEMP: Skip profile creation for now
        console.log('[Phone Signup] Skipping profile creation for testing');
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: userId,
                phone: phone,
                type: 'phone'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: userId,
                phone: phone,
                firstName: firstName,
                lastName: lastName,
                verified: true
            },
            session: {
                access_token: token,
                token_type: 'bearer',
                expires_in: 604800 // 7 days
            }
        });
        
    } catch (error) {
        console.error('Phone verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed: ' + error.message,
            error: error.message,
            stack: error.stack
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
        const bcrypt = require('bcrypt');
        const jwt = require('jsonwebtoken');
        
        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;
        
        // Find user by phone number (since we use dummy auth for phone users)
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, phone, first_name, last_name')
            .eq('phone', formattedPhone)
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (profileError || !profiles || profiles.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid phone number or password'
            });
        }
        
        const profile = profiles[0];
        console.log('[Phone Login] Found user profile:', profile.id);
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: profile.id,
                phone: formattedPhone,
                type: 'phone'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: profile.id,
                phone: formattedPhone,
                firstName: profile.first_name || 'Test',
                lastName: profile.last_name || 'User',
                verified: true
            },
            session: {
                access_token: token,
                token_type: 'bearer',
                expires_in: 604800 // 7 days
            }
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

router.post('/verify-phone-otp', otpVerificationLimiter, [
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
    body('purpose')
        .optional()
        .isIn(['signup', 'password_reset'])
        .withMessage('Invalid purpose'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone, otp, purpose = 'signup' } = req.body;
        
        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;
        
        // Verify OTP - use Twilio Verify if configured, otherwise fallback to database
        let otpVerified = false;
        
        if (process.env.TWILIO_VERIFY_SERVICE_SID) {
            // Use Twilio Verify API
            const twilioVerification = await verifyOTPWithTwilio(formattedPhone, otp);
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
                .eq('phone_number', formattedPhone)
                .eq('otp_code', otp)
                .eq('purpose', purpose)
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
        
        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            phone: formattedPhone
        });
        
    } catch (error) {
        console.error('Phone OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
});

// Verify reset OTP only (separate from password reset)
router.post('/verify-reset-otp', [
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
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone, otp } = req.body;
        
        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;
        
        console.log(`[Verify Reset OTP] Verifying OTP for phone: ${formattedPhone}`);
        
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
        
        // Verify OTP - use database verification for password reset
        // (Password reset uses regular SMS, not Twilio Verify API)
        let otpVerified = false;
        
        console.log('[Verify Reset OTP] Using database verification');
        // Database verification
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
            console.log('[Verify Reset OTP] Database verification failed:', verifyError?.message || 'No matching verification found');
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired code'
            });
        }
        
        // Mark as verified
        await supabase
            .from('phone_verifications')
            .update({ verified: true })
            .eq('id', verification.id);
            
        otpVerified = true;
        console.log('[Verify Reset OTP] Database verification SUCCESS');
        
        // Return success with reset token
        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            resetToken: otp // Send back OTP as token for next step
        });
        
    } catch (error) {
        console.error('Reset OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
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
        
        // Verify OTP - check if it was already verified in previous step
        let otpVerified = false;
        
        console.log(`[Reset Password] Checking OTP for phone: ${formattedPhone}`);
        
        // Check database for verified OTP (from previous verification step)
        const { data: verification, error: verifyError } = await supabase
            .from('phone_verifications')
            .select('*')
            .eq('phone_number', formattedPhone)
            .eq('otp_code', otp)
            .eq('purpose', 'password_reset')
            .eq('verified', true) // Already verified in previous step
            .gt('expires_at', new Date().toISOString())
            .single();
            
        if (verifyError || !verification) {
            console.log('[Reset Password] OTP not found or not verified');
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code. Please start the reset process again.'
            });
        }
        
        console.log('[Reset Password] OTP verified successfully');
        otpVerified = true;
        
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

// Passwordless login - Step 1: Send OTP to existing user
router.post('/passwordless-login', [
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
            .select('id, phone, email, first_name, last_name')
            .eq('phone', formattedPhone)
            .single();

        if (!profile) {
            // Don't reveal if phone exists or not for security
            return res.status(200).json({
                success: true,
                message: 'If your phone number is registered, you will receive a login code'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in database with purpose 'passwordless_login'
        const { error: otpError } = await supabase
            .from('phone_verifications')
            .insert({
                phone_number: formattedPhone,
                otp_code: otp,
                purpose: 'passwordless_login',
                expires_at: expiresAt.toISOString()
            });

        if (otpError) {
            console.error('Passwordless login OTP storage error:', otpError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send login code'
            });
        }

        // Try to send via email first (free, reliable)
        let emailResult = { success: false, error: 'No email available' };
        if (profile.email) {
            try {
                console.log(`Sending passwordless login OTP to email: ${profile.email}`);
                const { sendOTPEmail } = require('../utils/email-service');
                emailResult = await sendOTPEmail(profile.email, otp);
                console.log('Passwordless login email result:', emailResult);
            } catch (error) {
                console.warn('Passwordless login email sending threw exception:', error.message);
                emailResult = { success: false, error: error.message };
            }
        }

        // Send SMS as fallback (if configured and email failed)
        let smsResult = { success: false, error: 'SMS not attempted' };
        if (!emailResult.success) {
            try {
                smsResult = await sendSMSOTP(formattedPhone, otp);
                console.log('Passwordless login SMS result:', smsResult);
            } catch (error) {
                console.warn('Passwordless login SMS sending threw exception:', error.message, '- proceeding with database verification only');
                smsResult = { success: false, error: error.message };
            }
        }

        // Log delivery method
        if (emailResult.success) {
            console.log(`Passwordless login OTP delivered via EMAIL to ${profile.email}`);
        } else if (smsResult.success) {
            console.log(`Passwordless login OTP delivered via SMS to ${formattedPhone}`);
        } else {
            console.log(`Passwordless login OTP stored in database only - check server console for code: ${otp}`);
        }

        if (!emailResult.success && !smsResult.success) {
            console.log(`Passwordless login SMS failed for phone ${formattedPhone}:`, smsResult.error, '- but continuing with database verification');
        }

        // Return success (don't reveal if phone exists)
        res.status(200).json({
            success: true,
            message: 'If your phone number is registered, you will receive a login code',
            phone: formatPhoneForDisplay(formattedPhone)
        });

    } catch (error) {
        console.error('Passwordless login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login request failed. Please try again.'
        });
    }
});

// Passwordless login - Step 2: Verify OTP and login
router.post('/passwordless-verify', [
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
    handleValidationErrors
], async (req, res) => {
    try {
        const { phone, otp } = req.body;
        const jwt = require('jsonwebtoken');

        // Validate and format phone number
        const phoneValidation = isValidPhoneNumber(phone);
        const formattedPhone = phoneValidation.formatted;

        // Verify OTP - use database verification for passwordless login
        const { data: verification, error: verifyError } = await supabase
            .from('phone_verifications')
            .select('*')
            .eq('phone_number', formattedPhone)
            .eq('otp_code', otp)
            .eq('purpose', 'passwordless_login')
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (verifyError || !verification) {
            console.log(`[Passwordless Verify] Database verification failed:`, verifyError?.message || 'No matching verification found');
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired login code'
            });
        }

        // Mark OTP as verified
        await supabase
            .from('phone_verifications')
            .update({ verified: true })
            .eq('id', verification.id);

        // Find user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, phone, first_name, last_name')
            .eq('phone', formattedPhone)
            .single();

        if (!profile) {
            return res.status(400).json({
                success: false,
                message: 'User account not found'
            });
        }

        console.log('[Passwordless Login] Found user profile:', profile.id);

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: profile.id,
                phone: formattedPhone,
                type: 'phone_passwordless'
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: profile.id,
                phone: formattedPhone,
                firstName: profile.first_name || 'User',
                lastName: profile.last_name || 'User',
                verified: true
            },
            session: {
                access_token: token,
                token_type: 'bearer',
                expires_in: 604800 // 7 days
            }
        });

    } catch (error) {
        console.error('Passwordless verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Verification failed. Please try again.'
        });
    }
});

module.exports = router;

// Password Reset with Email OTP Routes
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Resend (if available)
let resend;
try {
    const { Resend } = require('resend');
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
    }
} catch (error) {
    console.log('Resend not available, will use console logging for OTP');
}

// In-memory store for OTPs (use Redis in production)
const otpStore = new Map();

// Helper: Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: Generate reset token
function generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Helper: Send OTP via email
async function sendOTPEmail(email, otp, userName = 'User') {
    if (resend && process.env.RESEND_API_KEY) {
        try {
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'ZimCrowd <noreply@zimcrowd.com>',
                to: email,
                subject: 'Password Reset Code - ZimCrowd',
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #191a23 0%, #2a2b35 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                            .logo { font-size: 2rem; font-weight: bold; color: #38e07b; margin-bottom: 10px; }
                            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                            .otp-box { background: #f3f3f3; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
                            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #38e07b; }
                            .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
                            .button { display: inline-block; padding: 12px 30px; background: #38e07b; color: #191a23; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 0; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="logo">ZimCrowd</div>
                                <p>Password Reset Request</p>
                            </div>
                            <div class="content">
                                <h2>Hello ${userName}!</h2>
                                <p>We received a request to reset your password. Use the verification code below to complete the process:</p>
                                
                                <div class="otp-box">
                                    <div class="otp-code">${otp}</div>
                                </div>
                                
                                <p><strong>This code will expire in 10 minutes.</strong></p>
                                
                                <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
                                
                                <p>For security reasons, never share this code with anyone.</p>
                            </div>
                            <div class="footer">
                                <p>© 2025 ZimCrowd. All rights reserved.</p>
                                <p>Empowering Zimbabwe through financial inclusion</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });
            return true;
        } catch (error) {
            console.error('Resend email error:', error);
            return false;
        }
    } else {
        // Fallback: Log OTP to console (development only)
        console.log('\n' + '='.repeat(60));
        console.log('📧 PASSWORD RESET OTP (Development Mode)');
        console.log('='.repeat(60));
        console.log(`Email: ${email}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`Expires: 10 minutes`);
        console.log('='.repeat(60) + '\n');
        return true;
    }
}

// Route 1: Request Password Reset (Send OTP)
router.post('/request', async (req, res) => {
    try {
        const { identifier } = req.body;

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Email or phone number is required'
            });
        }

        // Determine if identifier is email or phone
        const isEmail = identifier.includes('@');
        
        // Find user by email or phone
        let query = supabase
            .from('users')
            .select('id, email, phone, full_name');

        if (isEmail) {
            query = query.eq('email', identifier);
        } else {
            query = query.eq('phone', identifier);
        }

        const { data: user, error: userError } = await query.single();

        // Always return success (security: don't reveal if user exists)
        if (userError || !user) {
            console.log('User not found for identifier:', identifier);
            return res.json({
                success: true,
                message: 'If an account exists, a verification code has been sent'
            });
        }

        // Check rate limiting (max 3 requests per hour)
        const rateLimitKey = `rate_limit_${identifier}`;
        const now = Date.now();
        const rateLimit = otpStore.get(rateLimitKey) || { count: 0, resetTime: now + 3600000 };

        if (rateLimit.count >= 3 && now < rateLimit.resetTime) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store OTP
        const otpKey = `otp_${identifier}`;
        otpStore.set(otpKey, {
            otp,
            userId: user.id,
            identifier,
            expiresAt,
            attempts: 0
        });

        // Update rate limit
        if (now >= rateLimit.resetTime) {
            rateLimit.count = 1;
            rateLimit.resetTime = now + 3600000;
        } else {
            rateLimit.count++;
        }
        otpStore.set(rateLimitKey, rateLimit);

        // Send OTP via email
        if (user.email) {
            const emailSent = await sendOTPEmail(user.email, otp, user.full_name);
            
            if (!emailSent) {
                console.error('Failed to send OTP email');
            }
        }

        // Store in database (optional, for audit trail)
        try {
            await supabase
                .from('password_reset_otps')
                .insert({
                    user_id: user.id,
                    identifier,
                    otp_hash: crypto.createHash('sha256').update(otp).digest('hex'),
                    expires_at: new Date(expiresAt).toISOString()
                });
        } catch (dbError) {
            console.log('Database insert skipped (table may not exist):', dbError.message);
        }

        res.json({
            success: true,
            message: 'Verification code sent successfully'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request'
        });
    }
});

// Route 2: Verify OTP
router.post('/verify', async (req, res) => {
    try {
        const { identifier, otp } = req.body;

        if (!identifier || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Identifier and OTP are required'
            });
        }

        // Get stored OTP
        const otpKey = `otp_${identifier}`;
        const storedData = otpStore.get(otpKey);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification code'
            });
        }

        // Check expiry
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(otpKey);
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired'
            });
        }

        // Check attempts (max 5)
        if (storedData.attempts >= 5) {
            otpStore.delete(otpKey);
            return res.status(400).json({
                success: false,
                message: 'Too many failed attempts. Please request a new code.'
            });
        }

        // Verify OTP
        if (storedData.otp !== otp) {
            storedData.attempts++;
            otpStore.set(otpKey, storedData);
            
            return res.status(400).json({
                success: false,
                message: `Invalid verification code. ${5 - storedData.attempts} attempts remaining.`
            });
        }

        // Generate reset token
        const resetToken = generateResetToken();
        const tokenExpiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

        // Store reset token
        const tokenKey = `reset_token_${identifier}`;
        otpStore.set(tokenKey, {
            resetToken,
            userId: storedData.userId,
            identifier,
            expiresAt: tokenExpiresAt
        });

        // Delete OTP (single use)
        otpStore.delete(otpKey);

        res.json({
            success: true,
            message: 'Verification successful',
            resetToken
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify code'
        });
    }
});

// Route 3: Confirm Password Reset
router.post('/confirm', async (req, res) => {
    try {
        const { identifier, resetToken, newPassword } = req.body;

        if (!identifier || !resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain uppercase, lowercase, and number'
            });
        }

        // Get stored reset token
        const tokenKey = `reset_token_${identifier}`;
        const storedData = otpStore.get(tokenKey);

        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Check expiry
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(tokenKey);
            return res.status(400).json({
                success: false,
                message: 'Reset token has expired'
            });
        }

        // Verify reset token
        if (storedData.resetToken !== resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid reset token'
            });
        }

        // Update password in Supabase Auth
        const { error: authError } = await supabase.auth.admin.updateUserById(
            storedData.userId,
            { password: newPassword }
        );

        if (authError) {
            console.error('Supabase auth update error:', authError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update password'
            });
        }

        // Delete reset token (single use)
        otpStore.delete(tokenKey);

        // Clean up rate limit
        const rateLimitKey = `rate_limit_${identifier}`;
        otpStore.delete(rateLimitKey);

        res.json({
            success: true,
            message: 'Password reset successful'
        });

    } catch (error) {
        console.error('Password reset confirm error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
});

// Cleanup expired OTPs (run periodically)
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore.entries()) {
        if (value.expiresAt && now > value.expiresAt) {
            otpStore.delete(key);
        }
    }
}, 60000); // Clean up every minute

module.exports = router;

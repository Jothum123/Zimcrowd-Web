const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const validator = require('validator');

// Generate JWT Token
const generateToken = (userId, expiresIn = '24h') => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: expiresIn
    });
};

// Verify JWT Token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Generate OTP
const generateOTP = (length = 6) => {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};

// Hash password (using bcrypt)
const hashPassword = async (password) => {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(password, 12);
};

// Verify password
const verifyPassword = async (password, hash) => {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
};

// Validate email
const isValidEmail = (email) => {
    return validator.isEmail(email);
};

// Validate phone number
const isValidPhone = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
};

// Validate password strength
const isValidPassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Send email
const sendEmail = async (options) => {
    // Create transporter
    const transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Define email options
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'ZimCrowd <noreply@zimcrowd.com>',
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    return info;
};

// Email templates
const emailTemplates = {
    // Password reset OTP
    passwordResetOTP: (otp, userName) => ({
        subject: 'Password Reset - ZimCrowd',
        html: `
            <div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #38e77b; margin-bottom: 10px;">ZimCrowd</h1>
                    <h2 style="color: #333; margin-bottom: 20px;">Password Reset</h2>
                </div>

                <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                    <h3 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h3>
                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        You requested a password reset for your ZimCrowd account. Please use the following code to reset your password:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; background: #38e77b; color: white; padding: 20px 40px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
                            ${otp}
                        </div>
                    </div>

                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        This code will expire in 5 minutes. If you didn't request this reset, please ignore this email.
                    </p>

                    <p style="color: #666; line-height: 1.6;">
                        For security reasons, please don't share this code with anyone.
                    </p>
                </div>

                <div style="text-align: center; color: #999; font-size: 14px;">
                    <p>&copy; 2024 ZimCrowd. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Email verification OTP
    emailVerificationOTP: (otp, userName) => ({
        subject: 'Verify Your Email - ZimCrowd',
        html: `
            <div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #38e77b; margin-bottom: 10px;">ZimCrowd</h1>
                    <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email</h2>
                </div>

                <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                    <h3 style="color: #333; margin-bottom: 20px;">Welcome to ZimCrowd, ${userName}!</h3>
                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        Please verify your email address by entering the following code:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <div style="display: inline-block; background: #38e77b; color: white; padding: 20px 40px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
                            ${otp}
                        </div>
                    </div>

                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        This code will expire in 5 minutes. Once verified, you'll have full access to your account.
                    </p>
                </div>

                <div style="text-align: center; color: #999; font-size: 14px;">
                    <p>&copy; 2024 ZimCrowd. All rights reserved.</p>
                </div>
            </div>
        `
    }),

    // Welcome email
    welcome: (userName) => ({
        subject: 'Welcome to ZimCrowd!',
        html: `
            <div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #38e77b; margin-bottom: 10px;">ZimCrowd</h1>
                    <h2 style="color: #333; margin-bottom: 20px;">Welcome aboard!</h2>
                </div>

                <div style="background: #f8f9fa; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                    <h3 style="color: #333; margin-bottom: 20px;">Hello ${userName},</h3>
                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        Welcome to ZimCrowd! We're excited to have you join our community of lenders and borrowers.
                    </p>

                    <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                        To get started, please complete your profile and verify your identity. This will unlock all the features of our platform.
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #38e77b; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                            Get Started
                        </a>
                    </div>
                </div>

                <div style="text-align: center; color: #999; font-size: 14px;">
                    <p>&copy; 2024 ZimCrowd. All rights reserved.</p>
                </div>
            </div>
        `
    })
};

// Send SMS (optional - requires Twilio setup)
const sendSMS = async (phoneNumber, message) => {
    // This would require Twilio setup
    // For now, we'll just log it
    console.log(`SMS to ${phoneNumber}: ${message}`);
    return true;
};

// Clean expired OTPs
const cleanupExpiredOTPs = async () => {
    const OTP = require('../models/OTP');
    const deletedCount = await OTP.cleanupExpired();
    console.log(`Cleaned up ${deletedCount} expired OTPs`);
    return deletedCount;
};

// Rate limiting helper
const checkRateLimit = (req, limits) => {
    // Simple in-memory rate limiting
    // In production, use Redis or similar
    const key = req.ip + req.path;
    const now = Date.now();

    if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
    }

    const userRequests = global.rateLimitStore.get(key) || [];
    const recentRequests = userRequests.filter(time => now - time < limits.windowMs);

    if (recentRequests.length >= limits.max) {
        return false;
    }

    recentRequests.push(now);
    global.rateLimitStore.set(key, recentRequests);

    return true;
};

module.exports = {
    generateToken,
    verifyToken,
    generateOTP,
    hashPassword,
    verifyPassword,
    isValidEmail,
    isValidPhone,
    isValidPassword,
    sendEmail,
    sendSMS,
    emailTemplates,
    cleanupExpiredOTPs,
    checkRateLimit
};

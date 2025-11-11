// Email OTP Service for ZimCrowd - Now using Resend
const { Resend } = require('resend');
const validator = require('validator');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP Email using Resend
const sendOTPEmail = async (email, otp) => {
    try {
        console.log('Sending OTP via Resend...');

        const data = await resend.emails.send({
            from: process.env.RESEND_EMAIL_FROM || 'noreply@zimcrowd.com',
            to: [email],
            subject: 'Your ZimCrowd Code',
            // Add priority headers for faster delivery
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'high',
                'X-Auto-Response-Suppress': 'OOF'
            },
            // Add tags for better tracking
            tags: [
                {
                    name: 'category',
                    value: 'otp_verification'
                }
            ],
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>ZimCrowd Verification</title>
                </head>
                <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h1 style="color: #38e07b; margin: 0; font-size: 24px;">ZimCrowd</h1>
                            <p style="color: #666; margin: 5px 0 0 0;">Email Verification</p>
                        </div>

                        <p style="color: #333; margin-bottom: 20px;">Welcome! Your verification code is:</p>

                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 36px; font-weight: bold; color: #38e07b; letter-spacing: 8px; background: #f0f9ff; padding: 15px 30px; border-radius: 8px; display: inline-block;">${otp}</span>
                        </div>

                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            This code expires in 10 minutes. If you didn't request this, please ignore this email.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `ZimCrowd Code: ${otp}\n\nExpires in 10 minutes.`
        });

        console.log(`OTP email sent to ${email}. Message ID: ${data.data?.id}`);

        return {
            success: true,
            messageId: data.data?.id,
            message: 'OTP email sent successfully via Resend'
        };
    } catch (error) {
        console.error('Resend OTP Error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to send OTP email via Resend'
        };
    }
};

// Send Password Reset OTP Email using Resend
const sendPasswordResetOTPEmail = async (email, otp) => {
    try {
        console.log('Sending password reset OTP via Resend...');

        const data = await resend.emails.send({
            from: process.env.RESEND_EMAIL_FROM || 'noreply@zimcrowd.com',
            to: [email],
            subject: 'ZimCrowd Password Reset',
            // Add priority headers for faster delivery
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'high',
                'X-Auto-Response-Suppress': 'OOF'
            },
            // Add tags for better tracking
            tags: [
                {
                    name: 'category',
                    value: 'password_reset'
                }
            ],
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>ZimCrowd Password Reset</title>
                </head>
                <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa;">
                    <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <h1 style="color: #dc3545; margin: 0; font-size: 24px;">ZimCrowd</h1>
                            <p style="color: #666; margin: 5px 0 0 0;">Password Reset</p>
                        </div>

                        <p style="color: #333; margin-bottom: 20px;">We received a request to reset your password. Use the code below to proceed:</p>

                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 36px; font-weight: bold; color: #dc3545; letter-spacing: 8px; background: #f0f9ff; padding: 15px 30px; border-radius: 8px; display: inline-block;">${otp}</span>
                        </div>

                        <p style="color: #666; font-size: 14px; margin-top: 30px;">
                            This code expires in 10 minutes. If you didn't request this password reset, please ignore this email and secure your account.
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `ZimCrowd Password Reset Code: ${otp}\n\nExpires in 10 minutes.`
        });

        console.log(`Password reset OTP email sent to ${email}. Message ID: ${data.data?.id}`);

        return {
            success: true,
            messageId: data.data?.id,
            message: 'Password reset OTP email sent successfully via Resend'
        };
    } catch (error) {
        console.error('Resend Password Reset Error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to send password reset OTP email via Resend'
        };
    }
};

// Validate email format
const isValidEmail = (email) => {
    return validator.isEmail(email);
};

// Format email for display (mask sensitive parts)
const formatEmailForDisplay = (email) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
        return `${localPart}***@${domain}`;
    }

    const visibleStart = localPart.slice(0, 2);
    const visibleEnd = localPart.length > 4 ? localPart.slice(-2) : '';
    const masked = '*'.repeat(Math.max(1, localPart.length - 4));

    return `${visibleStart}${masked}${visibleEnd}@${domain}`;
};

// Test Resend connection
const testEmailConnection = async () => {
    try {
        // Test Resend API key by getting account info
        const account = await resend.domains.list();

        return {
            success: true,
            message: 'Resend service connected successfully'
        };
    } catch (error) {
        console.error('Resend connection test failed:', error);

        return {
            success: false,
            error: error.message,
            message: 'Resend service connection failed'
        };
    }
};

module.exports = {
    generateOTP,
    sendOTPEmail,
    sendPasswordResetOTPEmail,
    isValidEmail,
    formatEmailForDisplay,
    testEmailConnection
};

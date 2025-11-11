// Twilio SMS Service for ZimCrowd
const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS OTP
const sendSMSOTP = async (phoneNumber, otp) => {
    try {
        // Use Twilio Verify API if Verify Service SID is available
        if (process.env.TWILIO_VERIFY_SERVICE_SID) {
            const verification = await client.verify.v2
                .services(process.env.TWILIO_VERIFY_SERVICE_SID)
                .verifications.create({
                    to: phoneNumber,
                    channel: 'sms'
                });

            console.log(`Verify SMS sent to ${phoneNumber}. SID: ${verification.sid}`);

            return {
                success: true,
                verificationSid: verification.sid,
                message: 'SMS sent successfully via Verify API'
            };
        }

        // Fallback to Messaging Service SID
        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            const messageOptions = {
                body: `Your ZimCrowd verification code is: ${otp}. This code expires in 10 minutes.`,
                to: phoneNumber,
                messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
            };

            const message = await client.messages.create(messageOptions);

            console.log(`Messaging SMS sent to ${phoneNumber}. SID: ${message.sid}`);

            return {
                success: true,
                messageSid: message.sid,
                message: 'SMS sent successfully via Messaging Service'
            };
        }

        // Final fallback to direct phone number
        const message = await client.messages.create({
            body: `Your ZimCrowd verification code is: ${otp}. This code expires in 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        console.log(`Direct SMS sent to ${phoneNumber}. SID: ${message.sid}`);

        return {
            success: true,
            messageSid: message.sid,
            message: 'SMS sent successfully via direct number'
        };
    } catch (error) {
        console.error('Twilio SMS Error:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to send SMS';
        if (error.code === 60410) {
            errorMessage = 'Phone number prefix is blocked by Twilio. Please contact support or use a different number.';
        } else if (error.code === 21211) {
            errorMessage = 'Invalid phone number format';
        } else if (error.code === 20003) {
            errorMessage = 'Authentication failed. Check Twilio credentials.';
        }

        return {
            success: false,
            error: error.message,
            errorCode: error.code,
            message: errorMessage
        };
    }
};

// Send SMS for password reset
const sendPasswordResetSMS = async (phoneNumber, otp) => {
    try {
        const messageOptions = {
            body: `Your ZimCrowd password reset code is: ${otp}. This code expires in 10 minutes. If you didn't request this, please ignore.`,
            to: phoneNumber
        };

        // Use Messaging Service SID if available, otherwise fallback to phone number
        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        } else {
            messageOptions.from = process.env.TWILIO_PHONE_NUMBER;
        }

        const message = await client.messages.create(messageOptions);

        console.log(`Password reset SMS sent to ${phoneNumber}. SID: ${message.sid}`);
        
        return {
            success: true,
            messageSid: message.sid,
            message: 'Password reset SMS sent successfully'
        };
    } catch (error) {
        console.error('Twilio Password Reset SMS Error:', error);
        
        // Provide more specific error messages
        let errorMessage = 'Failed to send password reset SMS';
        if (error.code === 60410) {
            errorMessage = 'Phone number prefix is blocked by Twilio. Please contact support or use a different number.';
        } else if (error.code === 21211) {
            errorMessage = 'Invalid phone number format';
        } else if (error.code === 20003) {
            errorMessage = 'Authentication failed. Check Twilio credentials.';
        }
        
        return {
            success: false,
            error: error.message,
            errorCode: error.code,
            message: errorMessage
        };
    }
};

// Validate phone number format
const isValidPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check if it's a valid length (8-15 digits)
    if (cleaned.length < 8 || cleaned.length > 15) {
        return {
            isValid: false,
            error: 'Phone number must be between 8 and 15 digits'
        };
    }

    // Handle different country codes
    let formatted;
    if (cleaned.startsWith('263')) {
        // Zimbabwe - already has country code
        formatted = `+${cleaned}`;
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
        // US/Canada - already has country code
        formatted = `+${cleaned}`;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
        // Zimbabwe local format (0771234567)
        formatted = `+263${cleaned.slice(1)}`;
    } else if (cleaned.length === 9 && cleaned.startsWith('77')) {
        // Zimbabwe mobile without leading zero
        formatted = `+263${cleaned}`;
    } else if (cleaned.startsWith('+')) {
        // Already has + prefix
        formatted = phoneNumber; // Keep original formatting
    } else if (cleaned.length === 10 && cleaned.startsWith('77')) {
        // Zimbabwe mobile without country code
        formatted = `+263${cleaned}`;
    } else if (cleaned.length === 10) {
        // Could be US number without country code - assume US for now
        formatted = `+1${cleaned}`;
    } else {
        // Default: assume Zimbabwe for shorter numbers
        formatted = `+263${cleaned}`;
    }

    return {
        isValid: true,
        formatted: formatted,
        original: phoneNumber
    };
};

// Format phone number for display
const formatPhoneForDisplay = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Zimbabwean phone number formatting
    if (cleaned.startsWith('263') && cleaned.length === 12) {
        const mobile = cleaned.slice(3);
        if (mobile.length === 9) {
            return `+263 ${mobile.slice(0, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6)}`;
        }
    }

    // International formatting fallback
    if (cleaned.length >= 10) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }

    return phoneNumber;
};

// Verify OTP using Twilio Verify API
const verifyOTPWithTwilio = async (phoneNumber, otp) => {
    try {
        if (!process.env.TWILIO_VERIFY_SERVICE_SID) {
            return {
                success: false,
                error: 'Twilio Verify service not configured'
            };
        }

        const verificationCheck = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verificationChecks.create({
                to: phoneNumber,
                code: otp
            });

        console.log(`OTP verification for ${phoneNumber}: ${verificationCheck.status}`);

        return {
            success: verificationCheck.status === 'approved',
            status: verificationCheck.status,
            message: verificationCheck.status === 'approved' 
                ? 'OTP verified successfully' 
                : 'Invalid OTP code'
        };
    } catch (error) {
        console.error('Twilio OTP verification error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to verify OTP'
        };
    }
};

// Send transactional SMS notifications
const sendNotificationSMS = async (phoneNumber, message) => {
    try {
        // Use Messaging Service SID if available, otherwise fallback to phone number
        const messageOptions = {
            body: message,
            to: phoneNumber
        };

        if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
            messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
        } else {
            messageOptions.from = process.env.TWILIO_PHONE_NUMBER;
        }

        const messageResult = await client.messages.create(messageOptions);

        console.log(`Notification SMS sent to ${phoneNumber}. SID: ${messageResult.sid}`);

        return {
            success: true,
            messageSid: messageResult.sid,
            message: 'Notification SMS sent successfully'
        };
    } catch (error) {
        console.error('Twilio notification SMS error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to send notification SMS'
        };
    }
};

// Test Twilio connection
const testTwilioConnection = async () => {
    try {
        // Test connection by getting account info
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();

        return {
            success: true,
            message: 'Twilio service connected successfully'
        };
    } catch (error) {
        console.error('Twilio connection test failed:', error);

        return {
            success: false,
            error: error.message,
            message: 'Twilio service connection failed'
        };
    }
};

module.exports = {
    generateOTP,
    sendSMSOTP,
    sendPasswordResetSMS,
    verifyOTPWithTwilio,
    sendNotificationSMS,
    isValidPhoneNumber,
    formatPhoneForDisplay,
    testTwilioConnection
};

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
        const message = await client.messages.create({
            body: `Your ZimCrowd verification code is: ${otp}. This code expires in 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        console.log(`SMS sent successfully to ${phoneNumber}. SID: ${message.sid}`);
        
        return {
            success: true,
            messageSid: message.sid,
            message: 'SMS sent successfully'
        };
    } catch (error) {
        console.error('Twilio SMS Error:', error);
        
        return {
            success: false,
            error: error.message,
            message: 'Failed to send SMS'
        };
    }
};

// Send SMS for password reset
const sendPasswordResetSMS = async (phoneNumber, otp) => {
    try {
        const message = await client.messages.create({
            body: `Your ZimCrowd password reset code is: ${otp}. This code expires in 10 minutes. If you didn't request this, please ignore.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });

        console.log(`Password reset SMS sent to ${phoneNumber}. SID: ${message.sid}`);
        
        return {
            success: true,
            messageSid: message.sid,
            message: 'Password reset SMS sent successfully'
        };
    } catch (error) {
        console.error('Twilio Password Reset SMS Error:', error);
        
        return {
            success: false,
            error: error.message,
            message: 'Failed to send password reset SMS'
        };
    }
};

// Validate phone number format
const isValidPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (10-15 digits)
    if (cleaned.length < 10 || cleaned.length > 15) {
        return false;
    }
    
    // Add + if not present
    const formatted = cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
    
    return {
        isValid: true,
        formatted: formatted,
        original: phoneNumber
    };
};

// Format phone number for display
const formatPhoneForDisplay = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phoneNumber;
};

// Test Twilio connection
const testTwilioConnection = async () => {
    try {
        // Test by fetching account info
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        
        console.log('✅ Twilio connection successful');
        console.log(`Account: ${account.friendlyName}`);
        console.log(`Status: ${account.status}`);
        
        return {
            success: true,
            account: account.friendlyName,
            status: account.status
        };
    } catch (error) {
        console.error('⚠️  Twilio connection failed:', error.message);
        
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    generateOTP,
    sendSMSOTP,
    sendPasswordResetSMS,
    isValidPhoneNumber,
    formatPhoneForDisplay,
    testTwilioConnection
};

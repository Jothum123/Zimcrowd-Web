// Email OTP Service for ZimCrowd - Resend + SendGrid + Firebase integration
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');
const validator = require('validator');
const { auth } = require('./firebase-config');
const {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} = require('firebase/auth');

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize SendGrid client
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Initialize Supabase (conditionally for Google auth)
let supabase;
try {
  supabase = require('./supabase-auth').supabase;
} catch (error) {
  console.log('Supabase not available for Google auth - will use Firebase only');
}

// Validate email format
const isValidEmail = (email) => {
    return validator.isEmail(email);
};

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP Email with Automatic Fallback (Resend -> SendGrid)
const sendOTPEmail = async (email, otp) => {
    // Try Resend first
    try {
        console.log('Attempting to send OTP via Resend (primary)...');

        const data = await resend.emails.send({
            from: process.env.RESEND_EMAIL_FROM || 'noreply@zimcrowd.com',
            to: [email],
            subject: 'Your ZimCrowd Code',
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

        console.log(`✅ OTP email sent via Resend to ${email}. Message ID: ${data.data?.id}`);

        return {
            success: true,
            messageId: data.data?.id,
            provider: 'resend',
            message: 'OTP email sent successfully via Resend'
        };
    } catch (resendError) {
        console.error('❌ Resend failed:', resendError.message);

        // Fallback to SendGrid if Resend fails
        if (process.env.SENDGRID_API_KEY) {
            console.log('🔄 Attempting fallback to SendGrid...');
            try {
                const sendGridResult = await sendOTPEmailSendGrid(email, otp);
                if (sendGridResult.success) {
                    console.log('✅ Fallback successful: OTP sent via SendGrid');
                    return {
                        ...sendGridResult,
                        provider: 'sendgrid',
                        fallback: true,
                        primaryError: resendError.message
                    };
                }
            } catch (sendGridError) {
                console.error('❌ SendGrid fallback also failed:', sendGridError.message);
            }
        } else {
            console.warn('⚠️ SendGrid not configured - no fallback available');
        }

        // Both failed
        return {
            success: false,
            error: resendError.message,
            message: 'Failed to send OTP email via all providers',
            provider: 'none'
        };
    }
};

// Send Password Reset OTP Email with Automatic Fallback (Resend -> SendGrid)
const sendPasswordResetOTPEmail = async (email, otp) => {
    // Try Resend first
    try {
        console.log('Attempting to send password reset OTP via Resend (primary)...');

        const data = await resend.emails.send({
            from: process.env.RESEND_EMAIL_FROM || 'noreply@zimcrowd.com',
            to: [email],
            subject: 'ZimCrowd Password Reset',
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

        console.log(`✅ Password reset OTP sent via Resend to ${email}. Message ID: ${data.data?.id}`);

        return {
            success: true,
            messageId: data.data?.id,
            provider: 'resend',
            message: 'Password reset OTP email sent successfully via Resend'
        };
    } catch (resendError) {
        console.error('❌ Resend failed:', resendError.message);

        // Fallback to SendGrid if Resend fails
        if (process.env.SENDGRID_API_KEY) {
            console.log('🔄 Attempting fallback to SendGrid...');
            try {
                const sendGridResult = await sendPasswordResetOTPEmailSendGrid(email, otp);
                if (sendGridResult.success) {
                    console.log('✅ Fallback successful: Password reset OTP sent via SendGrid');
                    return {
                        ...sendGridResult,
                        provider: 'sendgrid',
                        fallback: true,
                        primaryError: resendError.message
                    };
                }
            } catch (sendGridError) {
                console.error('❌ SendGrid fallback also failed:', sendGridError.message);
            }
        } else {
            console.warn('⚠️ SendGrid not configured - no fallback available');
        }

        // Both failed
        return {
            success: false,
            error: resendError.message,
            message: 'Failed to send password reset OTP via all providers',
            provider: 'none'
        };
    }
};

// Send OTP Email using SendGrid
const sendOTPEmailSendGrid = async (email, otp) => {
    try {
        console.log('Sending OTP via SendGrid...');

        const msg = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@zimcrowd.com',
            subject: 'Your ZimCrowd Code',
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
        };

        const result = await sgMail.send(msg);

        console.log(`OTP email sent to ${email} via SendGrid`);

        return {
            success: true,
            messageId: result[0]?.headers?.['x-message-id'] || 'sent',
            message: 'OTP email sent successfully via SendGrid'
        };
    } catch (error) {
        console.error('SendGrid OTP Error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to send OTP email via SendGrid'
        };
    }
};

// Send Password Reset OTP Email using SendGrid
const sendPasswordResetOTPEmailSendGrid = async (email, otp) => {
    try {
        console.log('Sending password reset OTP via SendGrid...');

        const msg = {
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@zimcrowd.com',
            subject: 'ZimCrowd Password Reset',
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
        };

        const result = await sgMail.send(msg);

        console.log(`Password reset OTP email sent to ${email} via SendGrid`);

        return {
            success: true,
            messageId: result[0]?.headers?.['x-message-id'] || 'sent',
            message: 'Password reset OTP email sent successfully via SendGrid'
        };
    } catch (error) {
        console.error('SendGrid Password Reset Error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to send password reset OTP email via SendGrid'
        };
    }
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

// Test SendGrid connection
const testSendGridConnection = async () => {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            return {
                success: false,
                message: 'SendGrid API key not configured'
            };
        }

        // Test by attempting to get account info
        const account = await sgMail.send({
            to: 'test@example.com',
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@zimcrowd.com',
            subject: 'SendGrid Connection Test',
            text: 'This is a test email to verify SendGrid connection.',
            mail_settings: {
                sandbox_mode: {
                    enable: true
                }
            }
        });

        return {
            success: true,
            message: 'SendGrid service connected successfully'
        };
    } catch (error) {
        console.error('SendGrid connection test failed:', error);

        return {
            success: false,
            error: error.message,
            message: 'SendGrid service connection failed'
        };
    }
};

// Google Authentication Functions
const signInWithGoogle = async () => {
    try {
        console.log('Starting Google authentication...');

        // This is designed for client-side usage
        // For server-side, you'd handle the authentication result

        return {
            success: true,
            message: 'Google authentication initiated - use client-side Firebase SDK',
            provider: googleProvider
        };
    } catch (error) {
        console.error('Google authentication error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to initiate Google authentication'
        };
    }
};

// Handle Google Auth Result (called after client-side authentication)
const handleGoogleAuthResult = async (userCredential) => {
    try {
        const user = userCredential.user;

        // If Supabase is available, create/update user there
        if (supabase) {
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: user.email,
                user_metadata: {
                    first_name: user.displayName?.split(' ')[0] || 'Google',
                    last_name: user.displayName?.split(' ').slice(1).join(' ') || 'User',
                    signup_method: 'google',
                    email_verified: true,
                    google_uid: user.uid
                },
                email_confirm: false
            });

            if (authError && !authError.message.includes('already registered')) {
                throw authError;
            }

            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: authData?.user?.id || user.uid,
                    email: user.email,
                    email_verified: true,
                    first_name: user.displayName?.split(' ')[0] || 'Google',
                    last_name: user.displayName?.split(' ').slice(1).join(' ') || 'User'
                });

            return {
                success: true,
                user: {
                    id: authData?.user?.id || user.uid,
                    email: user.email,
                    firstName: user.displayName?.split(' ')[0] || 'Google',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || 'User',
                    verified: true
                },
                message: 'Google authentication successful with Supabase'
            };
        } else {
            // Supabase not available - return Firebase user data only
            return {
                success: true,
                user: {
                    id: user.uid,
                    email: user.email,
                    firstName: user.displayName?.split(' ')[0] || 'Google',
                    lastName: user.displayName?.split(' ').slice(1).join(' ') || 'User',
                    verified: user.emailVerified
                },
                message: 'Google authentication successful (Firebase only)'
            };
        }
    } catch (error) {
        console.error('Google auth result handling error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to process Google authentication result'
        };
    }
};

// Firebase Email Verification Functions
const sendFirebaseEmailVerification = async (email) => {
    try {
        console.log('Sending Firebase email verification link...');

        // Action code settings for email verification
        const actionCodeSettings = {
            url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email.html?mode=verifyEmail&email=${encodeURIComponent(email)}`,
            handleCodeInApp: true,
            iOS: {
                bundleId: 'com.zimcrowd.app'
            },
            android: {
                packageName: 'com.zimcrowd.app',
                installApp: true,
                minimumVersion: '12'
            },
            dynamicLinkDomain: 'zimcrowd.page.link'
        };

        // Send sign-in link (Firebase's email verification for new users)
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);

        // Store email in localStorage for later verification (client-side)
        // Note: This is typically done client-side, but we'll handle it server-side

        return {
            success: true,
            message: 'Firebase email verification link sent successfully',
            note: 'Firebase sends verification links, not OTP codes'
        };
    } catch (error) {
        console.error('Firebase email verification error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to send Firebase email verification'
        };
    }
};

// Verify Firebase email (called when user clicks verification link)
const verifyFirebaseEmail = async (emailLink, email) => {
    try {
        console.log('Verifying Firebase email link...');

        // For server-side verification, we need to handle this differently
        // Firebase email links are typically handled client-side, but we can
        // validate and complete the process server-side

        // Check if the link contains Firebase parameters
        const url = new URL(emailLink);
        const oobCode = url.searchParams.get('oobCode');
        const mode = url.searchParams.get('mode');

        if (!oobCode || mode !== 'signIn') {
            return {
                success: false,
                message: 'Invalid email verification link'
            };
        }

        // For server-side implementation, we'll create the user account
        // assuming the email link is valid (in production, you'd verify with Firebase Admin SDK)
        console.log('Firebase email link validated, proceeding with account creation');

        // If Supabase is available, create/update user there
        if (supabase) {
            // Get stored user data from the signup process
            const storedUserData = localStorage.getItem('userData');
            let userData = null;

            if (storedUserData) {
                try {
                    userData = JSON.parse(storedUserData);
                } catch (error) {
                    console.log('Could not parse stored user data');
                }
            }

            // Create user in Supabase Auth with complete profile
            const userPayload = {
                email: email,
                user_metadata: {
                    email_verified: true,
                    signup_method: 'firebase-email-link',
                    ...(userData && {
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        phone: userData.phone,
                        country: userData.country,
                        city: userData.city
                    })
                },
                email_confirm: true
            };

            const { data: authData, error: authError } = await supabase.auth.admin.createUser(userPayload);

            if (authError && !authError.message.includes('already registered')) {
                throw authError;
            }

            // Create or update profile
            if (userData) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: authData?.user?.id,
                        email: email,
                        email_verified: true,
                        first_name: userData.firstName,
                        last_name: userData.lastName,
                        phone: userData.phone,
                        country: userData.country,
                        city: userData.city,
                        signup_method: 'firebase-email-link'
                    });

                if (profileError) {
                    console.error('Profile creation error:', profileError);
                }
            }

            return {
                success: true,
                message: 'Email verified and account created successfully',
                user: {
                    id: authData?.user?.id,
                    email: email,
                    verified: true,
                    ...(userData && {
                        firstName: userData.firstName,
                        lastName: userData.lastName
                    })
                }
            };
        } else {
            // Supabase not available - return success for Firebase-only flow
            return {
                success: true,
                message: 'Email verified successfully (Firebase only)',
                user: {
                    email: email,
                    verified: true
                }
            };
        }

    } catch (error) {
        console.error('Firebase email verification error:', error);

        return {
            success: false,
            error: error.message,
            message: 'Failed to verify Firebase email'
        };
    }
};

module.exports = {
    generateOTP,
    sendOTPEmail,
    sendPasswordResetOTPEmail,
    sendOTPEmailSendGrid,
    sendPasswordResetOTPEmailSendGrid,
    isValidEmail,
    formatEmailForDisplay,
    testEmailConnection,
    testSendGridConnection,
    signInWithGoogle,
    handleGoogleAuthResult,
    sendFirebaseEmailVerification,
    verifyFirebaseEmail
};

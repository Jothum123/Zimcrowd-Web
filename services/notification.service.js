/**
 * Comprehensive Notification Service
 * Handles email, SMS, and in-app notifications with templates
 */

const { supabase } = require('../utils/supabase-auth');
const { Resend } = require('resend');
const twilio = require('twilio');

class NotificationService {
    constructor() {
        // Initialize email service with graceful fallback
        try {
            if (process.env.RESEND_API_KEY) {
                this.resend = new Resend(process.env.RESEND_API_KEY);
                this.emailEnabled = true;
            } else {
                console.log('⚠️ RESEND_API_KEY not configured - email features disabled');
                this.resend = null;
                this.emailEnabled = false;
            }
        } catch (error) {
            console.log('⚠️ Failed to initialize email service:', error.message);
            this.resend = null;
            this.emailEnabled = false;
        }
        
        // Initialize SMS service with graceful fallback
        try {
            if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
                this.twilioClient = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                this.smsEnabled = true;
            } else {
                console.log('⚠️ Twilio credentials not configured - SMS features disabled');
                this.twilioClient = null;
                this.smsEnabled = false;
            }
        } catch (error) {
            console.log('⚠️ Failed to initialize SMS service:', error.message);
            this.twilioClient = null;
            this.smsEnabled = false;
        }
        
        // Email templates
        this.emailTemplates = {
            loan_approved: {
                subject: '🎉 Your ZimCrowd Loan Has Been Approved!',
                template: this.getLoanApprovedTemplate
            },
            loan_rejected: {
                subject: '❌ Loan Application Update',
                template: this.getLoanRejectedTemplate
            },
            investment_matured: {
                subject: '💰 Your Investment Has Matured!',
                template: this.getInvestmentMaturedTemplate
            },
            payment_reminder: {
                subject: '⏰ Payment Reminder - ZimCrowd',
                template: this.getPaymentReminderTemplate
            },
            welcome: {
                subject: '🎊 Welcome to ZimCrowd!',
                template: this.getWelcomeTemplate
            },
            referral_bonus: {
                subject: '🎁 You Earned a Referral Bonus!',
                template: this.getReferralBonusTemplate
            }
        };
        
        // SMS templates
        this.smsTemplates = {
            loan_approved: (data) => `🎉 Great news! Your ${data.loanType} loan of $${data.amount} has been approved. Funds are now in your ZimCrowd wallet. Check your app for details.`,
            loan_rejected: (data) => `❌ Your loan application has been declined. ${data.reason || 'Please contact support for more information.'} - ZimCrowd`,
            payment_due: (data) => `⏰ Reminder: Your loan payment of $${data.amount} is due on ${data.dueDate}. Pay now to avoid late fees. - ZimCrowd`,
            investment_matured: (data) => `💰 Your ${data.investmentType} investment has matured! $${data.amount} has been credited to your wallet. - ZimCrowd`,
            otp_code: (data) => `Your ZimCrowd verification code is: ${data.otp}. Valid for 10 minutes. Do not share this code.`,
            welcome: (data) => `Welcome to ZimCrowd, ${data.firstName}! Your account is ready. Start investing and borrowing today. Download our app for the best experience.`
        };
    }

    /**
     * Send notification (email, SMS, or in-app)
     * @param {string} userId - User ID
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @param {Array} channels - Channels to send ['email', 'sms', 'in_app']
     */
    async sendNotification(userId, type, data, channels = ['in_app']) {
        const results = {
            email: null,
            sms: null,
            in_app: null
        };

        try {
            // Get user details from profiles table
            const { data: user, error } = await supabase
                .from('profiles')
                .select('first_name, email')
                .eq('id', userId)
                .single();

            if (error || !user) {
                console.error('User lookup error:', error);
                throw new Error('User not found');
            }

            // Get phone from user_profiles if available
            const { data: userProfile } = await supabase
                .from('user_profiles')
                .select('phone_number, first_name, last_name')
                .eq('user_id', userId)
                .single();

            // Merge user data
            const mergedUser = {
                first_name: user.first_name || userProfile?.first_name || 'User',
                last_name: userProfile?.last_name || '',
                email: user.email,
                phone: userProfile?.phone_number || null
            };

            const userPrefs = {}; // Default preferences

            // Send in-app notification
            if (channels.includes('in_app')) {
                results.in_app = await this.sendInAppNotification(userId, type, data);
            }

            // Send email notification
            if (channels.includes('email') && mergedUser.email && userPrefs.email !== false) {
                results.email = await this.sendEmailNotification(mergedUser, type, data);
            }

            // Send SMS notification
            if (channels.includes('sms') && mergedUser.phone && userPrefs.sms !== false) {
                results.sms = await this.sendSMSNotification(mergedUser, type, data);
            }

            return {
                success: true,
                results
            };
        } catch (error) {
            console.error('Notification service error:', error);
            return {
                success: false,
                error: error.message,
                results
            };
        }
    }

    /**
     * Send in-app notification
     */
    async sendInAppNotification(userId, type, data) {
        try {
            const notification = {
                user_id: userId,
                type: type,
                title: this.getNotificationTitle(type, data),
                message: this.getNotificationMessage(type, data),
                metadata: data, // Changed from 'data' to 'metadata'
                is_read: false
            };

            const { data: result, error } = await supabase
                .from('notifications')
                .insert(notification)
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                notificationId: result.id
            };
        } catch (error) {
            console.error('In-app notification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send email notification
     */
    async sendEmailNotification(user, type, data) {
        try {
            // Check if email service is enabled
            if (!this.emailEnabled || !this.resend) {
                console.log('⚠️ Email service disabled - skipping email notification');
                return {
                    success: false,
                    message: 'Email service not configured'
                };
            }

            const template = this.emailTemplates[type];
            if (!template) {
                throw new Error(`Email template not found for type: ${type}`);
            }

            const emailData = {
                firstName: user.first_name,
                lastName: user.last_name,
                ...data
            };

            const htmlContent = template.template(emailData);

            const result = await this.resend.emails.send({
                from: 'ZimCrowd <noreply@zimcrowd.com>',
                to: [user.email],
                subject: template.subject,
                html: htmlContent
            });

            return {
                success: true,
                messageId: result.data?.id
            };
        } catch (error) {
            console.error('Email notification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send SMS notification
     */
    async sendSMSNotification(user, type, data) {
        try {
            // Check if SMS service is enabled
            if (!this.smsEnabled || !this.twilioClient) {
                console.log('⚠️ SMS service disabled - skipping SMS notification');
                return {
                    success: false,
                    message: 'SMS service not configured'
                };
            }

            const template = this.smsTemplates[type];
            if (!template) {
                throw new Error(`SMS template not found for type: ${type}`);
            }

            const smsData = {
                firstName: user.first_name,
                ...data
            };

            const message = template(smsData);

            const result = await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.phone
            });

            return {
                success: true,
                messageId: result.sid
            };
        } catch (error) {
            console.error('SMS notification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get notification title based on type
     */
    getNotificationTitle(type, data) {
        const titles = {
            loan_approved: '🎉 Loan Approved!',
            loan_rejected: '❌ Loan Application Update',
            investment_matured: '💰 Investment Matured',
            payment_reminder: '⏰ Payment Reminder',
            payment_overdue: '🚨 Payment Overdue',
            referral_bonus: '🎁 Referral Bonus Earned',
            welcome: '🎊 Welcome to ZimCrowd!',
            zimscore_updated: '📊 ZimScore Updated',
            document_verified: '✅ Document Verified',
            document_rejected: '❌ Document Rejected',
            // Wallet activity notifications
            deposit_received: '💵 Deposit Received',
            deposit_pending: '⏳ Deposit Pending',
            deposit_flagged: '⚠️ Deposit Flagged for Verification',
            withdrawal_completed: '💸 Withdrawal Completed',
            withdrawal_initiated: '💸 Withdrawal Initiated',
            withdrawal_pending: '⏳ Withdrawal Processing',
            withdrawal_failed: '❌ Withdrawal Failed',
            transfer_sent: '📤 Transfer Sent',
            transfer_received: '📥 Transfer Received',
            aml_verification_required: '🔒 Verification Required',
            wallet_credited: '💰 Wallet Credited',
            wallet_debited: '💳 Wallet Debited'
        };

        return titles[type] || 'ZimCrowd Notification';
    }

    /**
     * Get notification message based on type
     */
    getNotificationMessage(type, data) {
        const messages = {
            loan_approved: `Your ${data.loanType || 'loan'} application for $${data.amount} has been approved and funds have been disbursed to your wallet.`,
            loan_rejected: `Your loan application has been rejected. ${data.reason || 'Please contact support for more information.'}`,
            investment_matured: `Your ${data.investmentType} investment has matured. $${data.amount} has been credited to your wallet.`,
            payment_reminder: `Your loan payment of $${data.amount} is due on ${data.dueDate}. Please make your payment to avoid late fees.`,
            payment_overdue: `Your payment of $${data.amount} is overdue. Please pay immediately to avoid additional charges.`,
            referral_bonus: `You've earned $${data.bonusAmount} for referring ${data.referredUser}. Bonus has been added to your wallet.`,
            welcome: `Welcome to ZimCrowd! Your account is set up and ready. Start exploring our investment and lending opportunities.`,
            zimscore_updated: `Your ZimScore has been updated to ${data.newScore}. ${data.change > 0 ? 'Congratulations on the improvement!' : 'Keep building your credit history.'}`,
            document_verified: `Your ${data.documentType} has been verified successfully.`,
            document_rejected: `Your ${data.documentType} was rejected. ${data.reason || 'Please upload a clearer document.'}`,
            // Wallet activity messages
            deposit_received: `$${data.amount} has been deposited to your wallet. Reference: ${data.reference || 'N/A'}. New balance: $${data.newBalance || 'N/A'}.`,
            deposit_pending: `Your deposit of $${data.amount} is being processed. Reference: ${data.reference || 'N/A'}. You'll be notified once completed.`,
            deposit_flagged: `Your deposit of $${data.amount} requires source of funds verification. Please upload proof of income or source of funds documents to proceed.`,
            withdrawal_completed: `Your withdrawal of ${data.currency || '$'}${data.amount} has been processed successfully! Expect your funds in your bank account or mobile wallet within 2-3 business days. Reference: ${data.reference || 'N/A'}.`,
            withdrawal_pending: `Your withdrawal request of ${data.currency || '$'}${data.amount} is being processed. Funds will arrive in your account within 2-3 business days.`,
            withdrawal_failed: `Your withdrawal of ${data.currency || '$'}${data.amount} could not be processed. ${data.reason || 'Please contact support for assistance.'}`,
            withdrawal_initiated: `Your withdrawal of ${data.currency || '$'}${data.amount} has been initiated! Your funds will be sent to your ${data.destination || 'registered account'} within 2-3 business days. Reference: ${data.reference || 'N/A'}.`,
            transfer_sent: `You sent $${data.amount} to ${data.recipientName || 'another user'}. Reference: ${data.reference || 'N/A'}. New balance: $${data.newBalance || 'N/A'}.`,
            transfer_received: `You received $${data.amount} from ${data.senderName || 'another user'}. ${data.note ? `Note: "${data.note}"` : ''} New balance: $${data.newBalance || 'N/A'}.`,
            aml_verification_required: `Due to regulatory requirements, your account requires additional verification. Please submit the required documents to continue using wallet services.`,
            wallet_credited: `$${data.amount} has been credited to your wallet. ${data.description || ''} New balance: $${data.newBalance || 'N/A'}.`,
            wallet_debited: `$${data.amount} has been debited from your wallet. ${data.description || ''} New balance: $${data.newBalance || 'N/A'}.`
        };

        return messages[type] || 'You have a new notification from ZimCrowd.';
    }

    // Email Templates
    getLoanApprovedTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #38e07b, #2dd4bf); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #38e07b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Congratulations ${data.firstName}!</h1>
                    <p>Your loan has been approved</p>
                </div>
                <div class="content">
                    <h2>Loan Approval Details</h2>
                    <p><strong>Loan Type:</strong> ${data.loanType}</p>
                    <p><strong>Amount:</strong> $${data.amount}</p>
                    <p><strong>Interest Rate:</strong> ${data.interestRate}%</p>
                    <p><strong>Monthly Payment:</strong> $${data.monthlyPayment}</p>
                    <p><strong>Term:</strong> ${data.term} months</p>
                    
                    <p>The funds have been disbursed to your ZimCrowd wallet and are available for immediate use.</p>
                    
                    <a href="https://zimcrowd.com/dashboard" class="button">View Dashboard</a>
                    
                    <h3>Next Steps:</h3>
                    <ul>
                        <li>Your first payment is due on ${data.firstPaymentDate}</li>
                        <li>Set up automatic payments to never miss a due date</li>
                        <li>Track your loan progress in the app</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Thank you for choosing ZimCrowd</p>
                    <p>Questions? Contact us at support@zimcrowd.com</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getLoanRejectedTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .button { display: inline-block; background: #38e07b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Loan Application Update</h1>
                </div>
                <div class="content">
                    <p>Dear ${data.firstName},</p>
                    
                    <p>Thank you for your interest in ZimCrowd. After careful review, we are unable to approve your loan application at this time.</p>
                    
                    ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
                    
                    <h3>What's Next?</h3>
                    <ul>
                        <li>Improve your ZimScore by maintaining good financial habits</li>
                        <li>Consider a smaller loan amount</li>
                        <li>Provide additional documentation</li>
                        <li>Reapply after 30 days</li>
                    </ul>
                    
                    <a href="https://zimcrowd.com/improve-zimscore" class="button">Improve ZimScore</a>
                    
                    <p>Our team is here to help you succeed. Contact support for personalized advice.</p>
                </div>
                <div class="footer">
                    <p>ZimCrowd - Building Financial Futures</p>
                    <p>support@zimcrowd.com | +263 123 456 789</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getInvestmentMaturedTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .highlight { background: #dcfce7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💰 Investment Matured!</h1>
                    <p>Congratulations ${data.firstName}!</p>
                </div>
                <div class="content">
                    <div class="highlight">
                        <h2>Your ${data.investmentType} investment has reached maturity!</h2>
                        <p><strong>Original Investment:</strong> $${data.originalAmount}</p>
                        <p><strong>Total Return:</strong> $${data.totalReturn}</p>
                        <p><strong>Profit Earned:</strong> $${data.profit}</p>
                        <p><strong>Return Rate:</strong> ${data.returnRate}%</p>
                    </div>
                    
                    <p>The full amount has been credited to your ZimCrowd wallet and is available for withdrawal or reinvestment.</p>
                    
                    <a href="https://zimcrowd.com/investments" class="button">Explore New Investments</a>
                    
                    <h3>Consider Reinvesting:</h3>
                    <ul>
                        <li>Compound your returns with our new investment options</li>
                        <li>Diversify your portfolio across different asset classes</li>
                        <li>Take advantage of our premium investment tiers</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Thank you for investing with ZimCrowd</p>
                    <p>Ready to grow your wealth further?</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getPaymentReminderTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .payment-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 5px; margin: 20px 0; }
                .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⏰ Payment Reminder</h1>
                </div>
                <div class="content">
                    <p>Dear ${data.firstName},</p>
                    
                    <p>This is a friendly reminder that your loan payment is due soon.</p>
                    
                    <div class="payment-box">
                        <h3>Payment Details</h3>
                        <p><strong>Amount Due:</strong> $${data.amount}</p>
                        <p><strong>Due Date:</strong> ${data.dueDate}</p>
                        <p><strong>Loan ID:</strong> ${data.loanId}</p>
                        <p><strong>Days Until Due:</strong> ${data.daysUntilDue}</p>
                    </div>
                    
                    <a href="https://zimcrowd.com/payments" class="button">Make Payment Now</a>
                    
                    <h3>Payment Options:</h3>
                    <ul>
                        <li>Pay online through your ZimCrowd dashboard</li>
                        <li>Use EcoCash or OneMoney</li>
                        <li>Set up automatic payments to never miss a due date</li>
                    </ul>
                    
                    <p><strong>Important:</strong> Late payments may incur additional fees and affect your ZimScore.</p>
                </div>
                <div class="footer">
                    <p>Questions about your payment? Contact support@zimcrowd.com</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getWelcomeTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #38e07b, #2dd4bf); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .feature-box { background: white; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #38e07b; }
                .button { display: inline-block; background: #38e07b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎊 Welcome to ZimCrowd!</h1>
                    <p>Hi ${data.firstName}, your financial journey starts here</p>
                </div>
                <div class="content">
                    <p>Congratulations on joining Zimbabwe's leading fintech platform! We're excited to help you achieve your financial goals.</p>
                    
                    <div class="feature-box">
                        <h3>💰 Smart Lending</h3>
                        <p>Get loans up to $100,000 with competitive rates based on your ZimScore</p>
                    </div>
                    
                    <div class="feature-box">
                        <h3>📈 Investment Opportunities</h3>
                        <p>Grow your wealth with our diversified investment products</p>
                    </div>
                    
                    <div class="feature-box">
                        <h3>🎯 ZimScore</h3>
                        <p>Build your credit profile and unlock better financial products</p>
                    </div>
                    
                    <a href="https://zimcrowd.com/dashboard" class="button">Explore Dashboard</a>
                    
                    <h3>Getting Started:</h3>
                    <ol>
                        <li>Complete your profile verification</li>
                        <li>Upload your financial documents</li>
                        <li>Start with a small investment or loan</li>
                        <li>Build your ZimScore over time</li>
                    </ol>
                    
                    <p>Need help? Our support team is available 24/7 to assist you.</p>
                </div>
                <div class="footer">
                    <p>Welcome to the ZimCrowd family!</p>
                    <p>support@zimcrowd.com | +263 123 456 789</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getReferralBonusTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .bonus-box { background: #f3e8ff; border: 2px solid #8b5cf6; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
                .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎁 Referral Bonus Earned!</h1>
                </div>
                <div class="content">
                    <p>Congratulations ${data.firstName}!</p>
                    
                    <div class="bonus-box">
                        <h2>You've earned $${data.bonusAmount}!</h2>
                        <p>Thanks for referring ${data.referredUser} to ZimCrowd</p>
                    </div>
                    
                    <p>Your referral bonus has been added to your wallet and is available for immediate use.</p>
                    
                    <a href="https://zimcrowd.com/referrals" class="button">Refer More Friends</a>
                    
                    <h3>Keep Earning:</h3>
                    <ul>
                        <li>Earn $${data.bonusAmount} for each successful referral</li>
                        <li>Your friends get special signup bonuses too</li>
                        <li>No limit on referral earnings</li>
                        <li>Track your referrals in the app</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Thank you for spreading the word about ZimCrowd!</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Schedule notification for future delivery
     */
    async scheduleNotification(userId, type, data, channels, scheduledFor) {
        try {
            const { data: scheduled, error } = await supabase
                .from('scheduled_notifications')
                .insert({
                    user_id: userId,
                    type: type,
                    data: data,
                    channels: channels,
                    scheduled_for: scheduledFor,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;

            return {
                success: true,
                scheduledId: scheduled.id
            };
        } catch (error) {
            console.error('Schedule notification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process scheduled notifications
     */
    async processScheduledNotifications() {
        try {
            const { data: notifications, error } = await supabase
                .from('scheduled_notifications')
                .select('*')
                .eq('status', 'pending')
                .lte('scheduled_for', new Date().toISOString())
                .limit(100);

            if (error) throw error;

            for (const notification of notifications) {
                const result = await this.sendNotification(
                    notification.user_id,
                    notification.type,
                    notification.data,
                    notification.channels
                );

                // Update status
                await supabase
                    .from('scheduled_notifications')
                    .update({
                        status: result.success ? 'sent' : 'failed',
                        sent_at: new Date().toISOString(),
                        error_message: result.error || null
                    })
                    .eq('id', notification.id);
            }

            return {
                success: true,
                processed: notifications.length
            };
        } catch (error) {
            console.error('Process scheduled notifications error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = NotificationService;

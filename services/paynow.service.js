const { Paynow } = require('paynow');
const crypto = require('crypto');
const { getCurrencyConfig, PayNowConfig, isTestMode } = require('../config/paynow-config');
const { PaymentStatusType, PaymentErrorType } = require('../types/payment-types');

/**
 * PayNow Payment Service
 * Handles payment processing with PayNow gateway
 */
class PayNowService {
    
    constructor() {
        this.config = PayNowConfig;
        this.activePayments = new Map();
    }
    
    /**
     * Initialize PayNow instance for specific currency
     * @param {string} currency - Currency code (USD or ZWG)
     * @returns {Paynow} Configured PayNow instance
     */
    initializePayNow(currency) {
        const currencyConfig = getCurrencyConfig(currency);
        
        if (!currencyConfig.integrationKey) {
            throw new Error(`PayNow ${currency} integration key not configured`);
        }
        
        const paynow = new Paynow(
            currencyConfig.integrationId,
            currencyConfig.integrationKey
        );
        
        // Set result and return URLs
        paynow.resultUrl = this.config.urls.resultUrl;
        paynow.returnUrl = this.config.urls.returnUrl;
        
        return paynow;
    }
    
    /**
     * Generate unique payment reference
     * @param {string} prefix - Optional prefix
     * @returns {string} Unique payment reference
     */
    generatePaymentReference(prefix = 'PAY') {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `${prefix}_${timestamp}_${random}`;
    }
    
    /**
     * Validate payment request
     * @param {Object} request - Payment request object
     * @returns {Object} Validation result
     */
    validatePaymentRequest(request) {
        const errors = [];
        
        // Amount validation
        if (typeof request.amount !== 'number' || request.amount <= 0) {
            errors.push('Amount must be a positive number');
        }
        
        // Currency validation
        if (!['USD', 'ZWG'].includes(request.currency)) {
            errors.push('Currency must be USD or ZWG');
        }
        
        // Currency-specific amount limits
        if (request.currency) {
            const currencyConfig = getCurrencyConfig(request.currency);
            if (request.amount < currencyConfig.limits.min) {
                errors.push(`Minimum amount for ${request.currency} is ${currencyConfig.limits.min}`);
            }
            if (request.amount > currencyConfig.limits.max) {
                errors.push(`Maximum amount for ${request.currency} is ${currencyConfig.limits.max}`);
            }
        }
        
        // Reference validation
        if (!request.reference || request.reference.length < this.config.validation.referenceMinLength) {
            errors.push(`Payment reference must be at least ${this.config.validation.referenceMinLength} characters`);
        }
        
        // Security: Alphanumeric reference only
        if (request.reference && !/^[a-zA-Z0-9_]+$/.test(request.reference)) {
            errors.push('Payment reference contains invalid characters');
        }
        
        // Email validation
        if (!request.userEmail || !this.isValidEmail(request.userEmail)) {
            errors.push('Valid email address required');
        }
        
        // Phone validation (Zimbabwe format) - Optional for web payments
        if (request.userPhone && !this.isValidZimbabwePhone(request.userPhone)) {
            errors.push('Invalid Zimbabwe phone number format (+263...)');
        }
        
        // Description validation
        if (request.description && request.description.length > this.config.validation.descriptionMaxLength) {
            errors.push(`Description must be less than ${this.config.validation.descriptionMaxLength} characters`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Initiate payment (enhanced for production)
     * @param {Object} request - Payment request
     * @returns {Promise<Object>} Payment response
     */
    async initiatePayment(request) {
        try {
            // Validate request
            const validation = this.validatePaymentRequest(request);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }

            // Initialize PayNow for currency
            const paynow = this.initializePayNow(request.currency);
            
            // Create payment
            const payment = paynow.createPayment(request.reference, request.email);
            
            // Add item to cart
            payment.add(request.additionalInfo || 'ZimCrowd Payment', request.amount);
            
            console.log(`💳 Initiating ${request.currency} payment: ${request.reference} - $${request.amount}`);
            
            // Choose payment method
            let response;
            if (request.paymentMethod === 'ecocash' || request.paymentMethod === 'onemoney') {
                response = await paynow.sendMobile(payment, request.phone, request.paymentMethod);
            } else {
                response = await paynow.send(payment);
            }
            
            if (response.success) {
                // Store payment info for tracking
                this.activePayments.set(request.reference, {
                    reference: request.reference,
                    amount: request.amount,
                    currency: request.currency,
                    status: PaymentStatusType.PENDING,
                    pollUrl: response.pollUrl,
                    paymentMethod: request.paymentMethod,
                    initiatedAt: new Date()
                });
                
                console.log(`✅ Payment initiated successfully: ${request.reference}`);
                
                return {
                    success: true,
                    reference: request.reference,
                    pollUrl: response.pollUrl,
                    redirectUrl: response.redirectUrl,
                    instructions: response.instructions
                };
            } else {
                console.error(`❌ Payment initiation failed: ${response.error}`);
                
                return {
                    success: false,
                    error: response.error || 'Payment initiation failed'
                };
            }
        } catch (error) {
            console.error('❌ Error initiating payment:', error);
            return {
                success: false,
                error: this.transformErrorMessage(error)
            };
        }
    }

    /**
     * Initiate web payment
     * @param {Object} request - Payment request
     * @returns {Promise<Object>} Payment response
     */
    async initiateWebPayment(request) {
        try {
            // Validate request
            const validation = this.validatePaymentRequest(request);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }
            
            // Initialize PayNow for currency
            const paynow = this.initializePayNow(request.currency);
            
            // Create payment
            const payment = paynow.createPayment(request.reference, request.userEmail);
            
            // Add item to cart
            payment.add(request.description, request.amount);
            
            // Add additional info if provided
            if (request.additionalData) {
                payment.info = {
                    ...payment.info,
                    ...request.additionalData
                };
            }
            
            console.log(`💳 Initiating ${request.currency} web payment: ${request.reference} - $${request.amount}`);
            
            // Send payment to PayNow
            const response = await paynow.send(payment);
            
            if (response.success) {
                // Store payment info for tracking
                this.activePayments.set(request.reference, {
                    reference: request.reference,
                    amount: request.amount,
                    currency: request.currency,
                    status: PaymentStatusType.PENDING,
                    pollUrl: response.pollUrl,
                    initiatedAt: new Date()
                });
                
                console.log(`✅ Payment initiated successfully: ${request.reference}`);
                
                return {
                    success: true,
                    reference: request.reference,
                    pollUrl: response.pollUrl,
                    redirectUrl: response.redirectUrl,
                    instructions: response.instructions
                };
            } else {
                console.error(`❌ Payment initiation failed: ${response.error}`);
                
                return {
                    success: false,
                    error: response.error || 'Payment initiation failed'
                };
            }
        } catch (error) {
            console.error('❌ Error initiating web payment:', error);
            return {
                success: false,
                error: this.transformErrorMessage(error)
            };
        }
    }
    
    /**
     * Initiate mobile money payment (EcoCash or OneMoney)
     * @param {Object} request - Payment request
     * @param {string} mobileNumber - Mobile number
     * @param {string} method - Payment method (ecocash or onemoney)
     * @returns {Promise<Object>} Payment response
     */
    async initiateMobileMoneyPayment(request, mobileNumber, method) {
        try {
            // Validate request
            const validation = this.validatePaymentRequest(request);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }
            
            // Validate mobile number
            if (!this.isValidZimbabwePhone(mobileNumber)) {
                return {
                    success: false,
                    error: 'Invalid Zimbabwe mobile number format'
                };
            }
            
            // Initialize PayNow for currency
            const paynow = this.initializePayNow(request.currency);
            
            // Create payment
            const payment = paynow.createPayment(request.reference, request.userEmail);
            
            // Add item to cart
            payment.add(request.description, request.amount);
            
            console.log(`📱 Initiating ${method.toUpperCase()} payment: ${request.reference} - ${request.currency} ${request.amount}`);
            
            // Send mobile money payment
            let response;
            if (method === 'ecocash') {
                response = await paynow.sendMobile(payment, mobileNumber, 'ecocash');
            } else if (method === 'onemoney') {
                response = await paynow.sendMobile(payment, mobileNumber, 'onemoney');
            } else {
                return {
                    success: false,
                    error: 'Invalid mobile money method'
                };
            }
            
            if (response.success) {
                // Store payment info
                this.activePayments.set(request.reference, {
                    reference: request.reference,
                    amount: request.amount,
                    currency: request.currency,
                    status: PaymentStatusType.PENDING,
                    pollUrl: response.pollUrl,
                    method: method,
                    mobileNumber: mobileNumber,
                    initiatedAt: new Date()
                });
                
                console.log(`✅ ${method.toUpperCase()} payment initiated: ${request.reference}`);
                
                return {
                    success: true,
                    reference: request.reference,
                    pollUrl: response.pollUrl,
                    instructions: response.instructions || `Please check your ${method === 'ecocash' ? 'EcoCash' : 'OneMoney'} phone for payment prompt`
                };
            } else {
                console.error(`❌ ${method.toUpperCase()} payment failed: ${response.error}`);
                
                return {
                    success: false,
                    error: response.error || 'Mobile money payment initiation failed'
                };
            }
        } catch (error) {
            console.error(`❌ Error initiating ${method} payment:`, error);
            return {
                success: false,
                error: this.transformErrorMessage(error)
            };
        }
    }
    
    /**
     * Verify webhook signature
     * @param {Object} data - Webhook data
     * @param {Object} headers - Request headers
     * @returns {boolean} True if signature is valid
     */
    verifyWebhookSignature(data, headers) {
        try {
            const signature = headers['x-paynow-signature'];
            if (!signature) return false;

            const payload = JSON.stringify(data);
            const secret = process.env.PAYNOW_WEBHOOK_SECRET || 'default-secret';
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            return signature === expectedSignature;
        } catch (error) {
            console.error('Webhook signature verification error:', error);
            return false;
        }
    }

    /**
     * Initiate Express Checkout Transaction
     * @param {Object} request - Express checkout request
     * @returns {Promise<Object>} Payment response
     */
    async initiateExpressCheckout(request) {
        try {
            // Validate express checkout request
            const validation = this.validateExpressCheckoutRequest(request);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }

            // Initialize PayNow for currency
            const paynow = this.initializePayNow(request.currency);
            
            // Create payment
            const payment = paynow.createPayment(request.reference, request.email);
            
            // Add item to cart
            payment.add(request.additionalInfo || 'ZimCrowd Express Payment', request.amount);
            
            console.log(`⚡ Initiating Express Checkout: ${request.method} - ${request.reference} - $${request.amount}`);
            
            let response;
            
            switch (request.method) {
                case 'ecocash':
                case 'onemoney':
                    response = await paynow.sendMobile(payment, request.phone, request.method);
                    break;
                    
                case 'innbucks':
                    response = await this.initiateInnBucksPayment(paynow, payment, request);
                    break;
                    
                case 'omari':
                    response = await this.initiateOmariPayment(paynow, payment, request);
                    break;
                    
                case 'zimswitch':
                case 'vmc':
                    response = await this.initiateTokenizedPayment(paynow, payment, request);
                    break;
                    
                default:
                    throw new Error(`Unsupported express checkout method: ${request.method}`);
            }
            
            if (response.success) {
                // Store payment info with express checkout details
                this.activePayments.set(request.reference, {
                    reference: request.reference,
                    amount: request.amount,
                    currency: request.currency,
                    status: PaymentStatusType.PENDING,
                    pollUrl: response.pollUrl,
                    paymentMethod: request.method,
                    expressCheckout: true,
                    initiatedAt: new Date(),
                    additionalData: response.additionalData || {}
                });
                
                console.log(`✅ Express checkout initiated: ${request.reference}`);
                
                return {
                    success: true,
                    reference: request.reference,
                    pollUrl: response.pollUrl,
                    method: request.method,
                    instructions: response.instructions,
                    additionalData: response.additionalData || {}
                };
            } else {
                console.error(`❌ Express checkout failed: ${response.error}`);
                
                return {
                    success: false,
                    error: response.error || 'Express checkout initiation failed'
                };
            }
        } catch (error) {
            console.error('❌ Error initiating express checkout:', error);
            return {
                success: false,
                error: this.transformErrorMessage(error)
            };
        }
    }

    /**
     * Initiate InnBucks payment
     * @param {Paynow} paynow - PayNow instance
     * @param {Payment} payment - Payment object
     * @param {Object} request - Request data
     * @returns {Promise<Object>} Payment response
     */
    async initiateInnBucksPayment(paynow, payment, request) {
        try {
            // Use the library's express checkout for InnBucks
            const response = await paynow.sendMobile(payment, request.phone, 'innbucks');
            
            if (response.success && response.authorizationcode) {
                // Generate QR code URL for InnBucks
                const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(response.authorizationcode)}`;
                
                // Generate deep link
                const deepLink = `innbucks.co.zw?pymInnCode=${response.authorizationcode}`;
                
                response.additionalData = {
                    authorizationCode: response.authorizationcode,
                    authorizationExpires: response.authorizationexpires,
                    qrCodeUrl: qrCodeUrl,
                    deepLink: deepLink,
                    instructions: `Authorization Code: ${response.authorizationcode}. Expires: ${response.authorizationexpires}`
                };
            }
            
            return response;
        } catch (error) {
            console.error('InnBucks payment error:', error);
            throw error;
        }
    }

    /**
     * Initiate O'mari payment
     * @param {Paynow} paynow - PayNow instance
     * @param {Payment} payment - Payment object
     * @param {Object} request - Request data
     * @returns {Promise<Object>} Payment response
     */
    async initiateOmariPayment(paynow, payment, request) {
        try {
            // Use the library's express checkout for O'mari
            const response = await paynow.sendMobile(payment, request.phone, 'omari');
            
            if (response.success && response.otpreference) {
                response.additionalData = {
                    otpReference: response.otpreference,
                    remoteOtpUrl: response.remoteotpurl,
                    instructions: `OTP sent to ${request.phone}. Reference: ${response.otpreference}`
                };
            }
            
            return response;
        } catch (error) {
            console.error('O\'mari payment error:', error);
            throw error;
        }
    }

    /**
     * Complete O'mari payment with OTP
     * @param {string} reference - Payment reference
     * @param {string} otp - OTP from customer
     * @returns {Promise<Object>} Payment completion result
     */
    async completeOmariPayment(reference, otp) {
        try {
            const paymentInfo = this.activePayments.get(reference);
            
            if (!paymentInfo || !paymentInfo.additionalData.remoteOtpUrl) {
                throw new Error('Payment not found or not O\'mari payment');
            }
            
            const currencyConfig = getCurrencyConfig(paymentInfo.currency);
            
            // Prepare OTP completion data
            const otpData = {
                id: currencyConfig.integrationId,
                otp: otp,
                status: 'Message'
            };
            
            // Generate hash for OTP request
            const hash = this.generateHash(otpData, currencyConfig.integrationKey);
            otpData.hash = hash;
            
            // Send OTP to complete payment
            const response = await this.makeHttpRequest(paymentInfo.additionalData.remoteOtpUrl, otpData);
            
            if (response.status === 'Ok') {
                // Update payment status
                paymentInfo.status = PaymentStatusType.COMPLETED;
                paymentInfo.completedAt = new Date();
                
                console.log(`✅ O'mari payment completed: ${reference}`);
                
                return {
                    success: true,
                    reference: reference,
                    paynowReference: response.paynowreference,
                    status: response.status,
                    amount: response.amount
                };
            } else {
                console.error(`❌ O'mari OTP failed: ${response.error}`);
                
                return {
                    success: false,
                    error: response.error || 'Invalid OTP'
                };
            }
        } catch (error) {
            console.error('O\'mari OTP completion error:', error);
            return {
                success: false,
                error: this.transformErrorMessage(error)
            };
        }
    }

    /**
     * Initiate tokenized card payment with fallback
     * @param {Paynow} paynow - PayNow instance
     * @param {Payment} payment - Payment object
     * @param {Object} request - Request data
     * @returns {Promise<Object>} Payment response
     */
    async initiateTokenizedPayment(paynow, payment, request) {
        try {
            if (!request.token) {
                throw new Error('Token is required for tokenized payments');
            }
            
            if (!request.merchantTrace) {
                throw new Error('Merchant trace is required for tokenized payments');
            }
            
            // Set tokenized payment details
            payment.token = request.token;
            payment.merchantTrace = request.merchantTrace;
            
            console.log(`💳 Attempting tokenized payment: ${request.method} - ${request.reference}`);
            
            // Try express checkout for tokenized payments
            const response = await paynow.sendToken(payment, request.token, request.merchantTrace);
            
            if (response.success && response.newtoken) {
                response.additionalData = {
                    newToken: response.newtoken,
                    instructions: 'Payment processed with tokenized card. New token generated for future use.'
                };
                
                console.log(`✅ Tokenized payment successful: ${request.reference}`);
                return response;
            } else {
                // If tokenized payment fails, initiate fallback redirect
                console.log(`⚠️ Tokenized payment failed, initiating fallback redirect: ${response.error}`);
                return await this.initiateFallbackRedirect(paynow, payment, request, response.error);
            }
        } catch (error) {
            console.error('Tokenized payment error:', error);
            
            // If there's an error, try fallback redirect
            console.log(`🔄 Initiating fallback redirect due to error: ${error.message}`);
            return await this.initiateFallbackRedirect(paynow, payment, request, error.message);
        }
    }

    /**
     * Initiate fallback redirect for failed card payments
     * @param {Paynow} paynow - PayNow instance
     * @param {Payment} payment - Payment object
     * @param {Object} request - Request data
     * @param {string} originalError - Original error message
     * @returns {Promise<Object>} Fallback payment response
     */
    async initiateFallbackRedirect(paynow, payment, request, originalError) {
        try {
            console.log(`🔄 Initiating fallback redirect for ${request.method} payment: ${request.reference}`);
            
            // Create new payment for fallback (without token)
            const fallbackPayment = paynow.createPayment(
                `${request.reference}-FALLBACK`, 
                request.email
            );
            
            // Add item to fallback payment
            fallbackPayment.add(
                request.additionalInfo || `ZimCrowd Fallback Payment - ${request.reference}`, 
                request.amount
            );
            
            // Set custom return URL for fallback
            const fallbackReturnUrl = `${process.env.FRONTEND_URL}/payment/fallback-success?ref=${request.reference}&method=${request.method}`;
            const fallbackResultUrl = `${process.env.PAYNOW_RESULT_URL}?fallback=true&original_ref=${request.reference}`;
            
            // Override URLs for this specific payment
            const originalReturnUrl = paynow.returnUrl;
            const originalResultUrl = paynow.resultUrl;
            
            paynow.returnUrl = fallbackReturnUrl;
            paynow.resultUrl = fallbackResultUrl;
            
            // Send regular web payment (redirect)
            const fallbackResponse = await paynow.send(fallbackPayment);
            
            // Restore original URLs
            paynow.returnUrl = originalReturnUrl;
            paynow.resultUrl = originalResultUrl;
            
            if (fallbackResponse.success) {
                console.log(`✅ Fallback redirect initiated: ${request.reference}-FALLBACK`);
                
                return {
                    success: true,
                    fallback: true,
                    originalError: originalError,
                    reference: `${request.reference}-FALLBACK`,
                    pollUrl: fallbackResponse.pollUrl,
                    redirectUrl: fallbackResponse.redirectUrl,
                    instructions: fallbackResponse.instructions,
                    additionalData: {
                        isFallback: true,
                        originalReference: request.reference,
                        originalMethod: request.method,
                        originalError: originalError,
                        fallbackMethod: 'web_redirect',
                        fallbackInstructions: `Express checkout failed. Redirecting to secure payment page. Original error: ${originalError}`
                    }
                };
            } else {
                console.error(`❌ Fallback redirect also failed: ${fallbackResponse.error}`);
                
                return {
                    success: false,
                    fallback: true,
                    originalError: originalError,
                    fallbackError: fallbackResponse.error,
                    error: `Both express checkout and fallback redirect failed. Express: ${originalError}, Fallback: ${fallbackResponse.error}`
                };
            }
        } catch (fallbackError) {
            console.error('Fallback redirect error:', fallbackError);
            
            return {
                success: false,
                fallback: true,
                originalError: originalError,
                fallbackError: fallbackError.message,
                error: `Both express checkout and fallback redirect failed. Express: ${originalError}, Fallback: ${fallbackError.message}`
            };
        }
    }

    /**
     * Validate express checkout request
     * @param {Object} request - Express checkout request
     * @returns {Object} Validation result
     */
    validateExpressCheckoutRequest(request) {
        const errors = [];
        
        // Basic validation
        const basicValidation = this.validatePaymentRequest(request);
        if (!basicValidation.valid) {
            errors.push(...basicValidation.errors);
        }
        
        // Method validation
        const supportedMethods = ['ecocash', 'onemoney', 'innbucks', 'omari', 'zimswitch', 'vmc'];
        if (!request.method || !supportedMethods.includes(request.method)) {
            errors.push('Valid payment method required (ecocash, onemoney, innbucks, omari, zimswitch, vmc)');
        }
        
        // Phone validation for mobile money
        const mobileMethods = ['ecocash', 'onemoney', 'innbucks', 'omari'];
        if (mobileMethods.includes(request.method)) {
            if (!request.phone || !this.isValidZimbabwePhone(request.phone)) {
                errors.push('Valid Zimbabwe phone number required for mobile money payments');
            }
        }
        
        // Token validation for card payments
        const tokenMethods = ['zimswitch', 'vmc'];
        if (tokenMethods.includes(request.method)) {
            if (!request.token) {
                errors.push('Token is required for tokenized card payments');
            }
            if (!request.merchantTrace) {
                errors.push('Merchant trace is required for tokenized card payments');
            }
            if (request.merchantTrace && request.merchantTrace.length > 32) {
                errors.push('Merchant trace must be 32 characters or less');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate hash for PayNow requests
     * @param {Object} data - Request data
     * @param {string} integrationKey - Integration key
     * @returns {string} Generated hash
     */
    generateHash(data, integrationKey) {
        const crypto = require('crypto');
        
        // Sort keys and create hash string
        const sortedKeys = Object.keys(data).sort();
        let hashString = '';
        
        sortedKeys.forEach(key => {
            if (key !== 'hash') {
                hashString += data[key];
            }
        });
        
        hashString += integrationKey;
        
        return crypto.createHash('sha512').update(hashString).digest('hex').toUpperCase();
    }

    /**
     * Validate webhook hash from Paynow
     * @param {Object} webhookData - Webhook data from Paynow
     * @returns {boolean} True if hash is valid
     */
    validateWebhookHash(webhookData) {
        const crypto = require('crypto');
        
        if (!webhookData.hash) {
            console.error('❌ No hash provided in webhook');
            return false;
        }
        
        const receivedHash = webhookData.hash;
        
        // Get integration key based on currency or use USD as default
        const config = this.getCurrencyConfig('USD');
        const integrationKey = config.integrationKey;
        
        // Build hash string from webhook data (excluding hash field)
        const sortedKeys = Object.keys(webhookData).sort();
        let hashString = '';
        
        sortedKeys.forEach(key => {
            if (key !== 'hash' && webhookData[key] !== undefined && webhookData[key] !== null) {
                hashString += webhookData[key];
            }
        });
        
        hashString += integrationKey;
        
        // Generate hash and compare
        const calculatedHash = crypto.createHash('sha512')
            .update(hashString)
            .digest('hex')
            .toUpperCase();
        
        const isValid = calculatedHash === receivedHash.toUpperCase();
        
        if (!isValid) {
            console.error('❌ Hash validation failed');
            console.error('Received:', receivedHash);
            console.error('Calculated:', calculatedHash);
        }
        
        return isValid;
    }

    /**
     * Make HTTP request to PayNow
     * @param {string} url - Request URL
     * @param {Object} data - Request data
     * @returns {Promise<Object>} Response data
     */
    async makeHttpRequest(url, data) {
        const axios = require('axios');
        const querystring = require('querystring');
        
        try {
            const response = await axios.post(url, querystring.stringify(data), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            // Parse response
            const parsedResponse = querystring.parse(response.data);
            return parsedResponse;
        } catch (error) {
            console.error('HTTP request error:', error);
            throw error;
        }
    }

    /**
     * Get supported express checkout methods
     * @returns {Object[]} Array of supported methods
     */
    getSupportedExpressCheckoutMethods() {
        return [
            {
                code: 'ecocash',
                name: 'EcoCash',
                description: 'EcoCash mobile money',
                requiresPhone: true,
                requiresToken: false
            },
            {
                code: 'onemoney',
                name: 'OneMoney',
                description: 'OneMoney mobile money',
                requiresPhone: true,
                requiresToken: false
            },
            {
                code: 'innbucks',
                name: 'InnBucks',
                description: 'InnBucks mobile wallet',
                requiresPhone: true,
                requiresToken: false,
                hasAuthCode: true
            },
            {
                code: 'omari',
                name: 'O\'mari',
                description: 'O\'mari mobile money',
                requiresPhone: true,
                requiresToken: false,
                requiresOtp: true
            },
            {
                code: 'zimswitch',
                name: 'ZimSwitch',
                description: 'Tokenized ZimSwitch card',
                requiresPhone: false,
                requiresToken: true,
                requiresMerchantTrace: true
            },
            {
                code: 'vmc',
                name: 'Visa/Mastercard',
                description: 'Tokenized Visa/Mastercard',
                requiresPhone: false,
                requiresToken: true,
                requiresMerchantTrace: true
            }
        ];
    }

    /**
     * Check payment status
     * @param {string} pollUrl - Poll URL from payment initiation
     * @param {string} reference - Payment reference
     * @returns {Promise<Object>} Payment status
     */
    async checkPaymentStatus(pollUrl, reference) {
        try {
            // Get payment info
            const paymentInfo = this.activePayments.get(reference);
            
            if (!paymentInfo) {
                return {
                    success: false,
                    error: 'Payment not found'
                };
            }
            
            // Initialize PayNow for currency
            const paynow = this.initializePayNow(paymentInfo.currency);
            
            // Poll status
            const status = await paynow.pollTransaction(pollUrl);
            
            // Update stored payment info
            paymentInfo.status = status.status;
            paymentInfo.lastChecked = new Date();
            
            if (status.paid) {
                paymentInfo.paidAt = new Date();
                paymentInfo.paynowReference = status.reference;
                console.log(`✅ Payment confirmed: ${reference}`);
            }
            
            return {
                success: true,
                status: status.status,
                paid: status.paid,
                reference: reference,
                paynowReference: status.reference,
                amount: paymentInfo.amount,
                currency: paymentInfo.currency
            };
        } catch (error) {
            console.error('❌ Error checking payment status:', error);
            return {
                success: false,
                error: this.transformErrorMessage(error)
            };
        }
    }
    
    /**
     * Get supported currencies
     * @returns {string[]} Array of currency codes
     */
    getSupportedCurrencies() {
        return ['USD', 'ZWG'];
    }
    
    /**
     * Get payment methods for currency
     * @param {string} currency - Currency code
     * @returns {Object[]} Array of payment methods
     */
    getPaymentMethodsForCurrency(currency) {
        return Object.values(this.config.paymentMethods)
            .filter(method => method.currencies.includes(currency));
    }
    
    /**
     * Validate email format
     * @param {string} email - Email address
     * @returns {boolean} True if valid
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= this.config.validation.emailMaxLength;
    }
    
    /**
     * Validate Zimbabwe phone number
     * @param {string} phone - Phone number
     * @returns {boolean} True if valid
     */
    isValidZimbabwePhone(phone) {
        return this.config.validation.phoneRegex.test(phone);
    }
    
    /**
     * Transform error message for user display
     * @param {Error} error - Error object
     * @returns {string} User-friendly error message
     */
    transformErrorMessage(error) {
        const errorMessage = error.message || error.toString();
        
        // Map technical errors to user-friendly messages
        if (errorMessage.includes('network') || errorMessage.includes('ENOTFOUND')) {
            return 'Connection error. Please check your internet and try again.';
        }
        
        if (errorMessage.includes('timeout')) {
            return 'Payment is taking longer than expected. Please check status later.';
        }
        
        if (errorMessage.includes('insufficient')) {
            return 'Insufficient funds. Please check your balance and try again.';
        }
        
        if (errorMessage.includes('declined')) {
            return 'Payment was declined. Please try a different payment method.';
        }
        
        // Default message
        return 'Payment processing failed. Please try again or contact support.';
    }
    
    /**
     * Get active payment info
     * @param {string} reference - Payment reference
     * @returns {Object|null} Payment info
     */
    getPaymentInfo(reference) {
        return this.activePayments.get(reference) || null;
    }
    
    /**
     * Clear completed payment from memory
     * @param {string} reference - Payment reference
     */
    clearPayment(reference) {
        this.activePayments.delete(reference);
    }
}

module.exports = PayNowService;

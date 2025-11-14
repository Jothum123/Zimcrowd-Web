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
        
        // Phone validation (Zimbabwe format)
        if (!request.userPhone || !this.isValidZimbabwePhone(request.userPhone)) {
            errors.push('Valid Zimbabwe phone number required (+263...)');
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

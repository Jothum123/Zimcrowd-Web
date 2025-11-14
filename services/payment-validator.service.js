const { PaymentErrorType } = require('../types/payment-types');
const { PayNowConfig } = require('../config/paynow-config');

/**
 * Payment Validation Service
 * Comprehensive input validation and sanitization
 */
class PaymentValidatorService {
    
    constructor() {
        this.config = PayNowConfig;
    }
    
    /**
     * Validate complete payment request
     * @param {Object} request - Payment request
     * @returns {Object} Validation result
     */
    validatePaymentRequest(request) {
        const errors = [];
        
        // Amount validation
        const amountValidation = this.validateAmount(request.amount, request.currency);
        if (!amountValidation.valid) {
            errors.push(...amountValidation.errors);
        }
        
        // Reference validation
        const referenceValidation = this.validateReference(request.reference);
        if (!referenceValidation.valid) {
            errors.push(...referenceValidation.errors);
        }
        
        // Email validation
        const emailValidation = this.validateEmail(request.userEmail);
        if (!emailValidation.valid) {
            errors.push(...emailValidation.errors);
        }
        
        // Phone validation
        const phoneValidation = this.validatePhone(request.userPhone);
        if (!phoneValidation.valid) {
            errors.push(...phoneValidation.errors);
        }
        
        // Currency validation
        const currencyValidation = this.validateCurrency(request.currency);
        if (!currencyValidation.valid) {
            errors.push(...currencyValidation.errors);
        }
        
        // Description validation
        if (request.description) {
            const descValidation = this.validateDescription(request.description);
            if (!descValidation.valid) {
                errors.push(...descValidation.errors);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            errorType: errors.length > 0 ? PaymentErrorType.VALIDATION_ERROR : null
        };
    }
    
    /**
     * Validate payment amount
     * @param {number} amount - Payment amount
     * @param {string} currency - Currency code
     * @returns {Object} Validation result
     */
    validateAmount(amount, currency) {
        const errors = [];
        
        // Type check
        if (typeof amount !== 'number') {
            errors.push('Amount must be a number');
            return { valid: false, errors };
        }
        
        // Positive check
        if (amount <= 0) {
            errors.push('Amount must be greater than zero');
        }
        
        // Currency-specific limits
        if (currency) {
            const currencyKey = currency.toLowerCase();
            const currencyConfig = this.config[currencyKey];
            
            if (currencyConfig) {
                if (amount < currencyConfig.limits.min) {
                    errors.push(`Minimum amount for ${currency} is ${currencyConfig.limits.min}`);
                }
                
                if (amount > currencyConfig.limits.max) {
                    errors.push(`Maximum amount for ${currency} is ${currencyConfig.limits.max}`);
                }
            }
        }
        
        // Decimal places check (max 2)
        const decimalPlaces = (amount.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
            errors.push('Amount cannot have more than 2 decimal places');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate payment reference
     * @param {string} reference - Payment reference
     * @returns {Object} Validation result
     */
    validateReference(reference) {
        const errors = [];
        
        // Required check
        if (!reference) {
            errors.push('Payment reference is required');
            return { valid: false, errors };
        }
        
        // Type check
        if (typeof reference !== 'string') {
            errors.push('Payment reference must be a string');
            return { valid: false, errors };
        }
        
        // Length check
        if (reference.length < this.config.validation.referenceMinLength) {
            errors.push(`Payment reference must be at least ${this.config.validation.referenceMinLength} characters`);
        }
        
        if (reference.length > this.config.validation.referenceMaxLength) {
            errors.push(`Payment reference must be less than ${this.config.validation.referenceMaxLength} characters`);
        }
        
        // Security: Alphanumeric and underscore only
        if (!this.isAlphanumeric(reference)) {
            errors.push('Payment reference can only contain letters, numbers, and underscores');
        }
        
        // Security: No SQL injection patterns
        if (this.containsSQLInjectionPattern(reference)) {
            errors.push('Payment reference contains invalid characters');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate email address
     * @param {string} email - Email address
     * @returns {Object} Validation result
     */
    validateEmail(email) {
        const errors = [];
        
        // Required check
        if (!email) {
            errors.push('Email address is required');
            return { valid: false, errors };
        }
        
        // Type check
        if (typeof email !== 'string') {
            errors.push('Email must be a string');
            return { valid: false, errors };
        }
        
        // Format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errors.push('Invalid email address format');
        }
        
        // Length check
        if (email.length > this.config.validation.emailMaxLength) {
            errors.push(`Email address must be less than ${this.config.validation.emailMaxLength} characters`);
        }
        
        // Security: No dangerous characters
        if (this.containsDangerousCharacters(email)) {
            errors.push('Email address contains invalid characters');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate phone number (Zimbabwe format)
     * @param {string} phone - Phone number
     * @returns {Object} Validation result
     */
    validatePhone(phone) {
        const errors = [];
        
        // Required check
        if (!phone) {
            errors.push('Phone number is required');
            return { valid: false, errors };
        }
        
        // Type check
        if (typeof phone !== 'string') {
            errors.push('Phone number must be a string');
            return { valid: false, errors };
        }
        
        // Format check (Zimbabwe: +263771234567 or +263781234567)
        if (!this.config.validation.phoneRegex.test(phone)) {
            errors.push('Invalid Zimbabwe phone number format. Expected: +263771234567 or +263781234567');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate currency code
     * @param {string} currency - Currency code
     * @returns {Object} Validation result
     */
    validateCurrency(currency) {
        const errors = [];
        
        // Required check
        if (!currency) {
            errors.push('Currency is required');
            return { valid: false, errors };
        }
        
        // Type check
        if (typeof currency !== 'string') {
            errors.push('Currency must be a string');
            return { valid: false, errors };
        }
        
        // Supported currencies
        const supportedCurrencies = ['USD', 'ZWG'];
        if (!supportedCurrencies.includes(currency.toUpperCase())) {
            errors.push(`Currency must be one of: ${supportedCurrencies.join(', ')}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate payment description
     * @param {string} description - Payment description
     * @returns {Object} Validation result
     */
    validateDescription(description) {
        const errors = [];
        
        // Type check
        if (typeof description !== 'string') {
            errors.push('Description must be a string');
            return { valid: false, errors };
        }
        
        // Length check
        if (description.length > this.config.validation.descriptionMaxLength) {
            errors.push(`Description must be less than ${this.config.validation.descriptionMaxLength} characters`);
        }
        
        // Security: No dangerous characters
        if (this.containsDangerousCharacters(description)) {
            errors.push('Description contains invalid characters');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate payment method
     * @param {string} method - Payment method
     * @param {string} currency - Currency code
     * @returns {Object} Validation result
     */
    validatePaymentMethod(method, currency) {
        const errors = [];
        
        // Required check
        if (!method) {
            errors.push('Payment method is required');
            return { valid: false, errors };
        }
        
        // Valid methods
        const validMethods = ['web', 'ecocash', 'onemoney'];
        if (!validMethods.includes(method.toLowerCase())) {
            errors.push(`Payment method must be one of: ${validMethods.join(', ')}`);
        }
        
        // Check if method supports currency
        const methodConfig = this.config.paymentMethods[method.toLowerCase()];
        if (methodConfig && currency && !methodConfig.currencies.includes(currency)) {
            errors.push(`${method} does not support ${currency} payments`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Sanitize string input
     * @param {string} input - Input string
     * @returns {string} Sanitized string
     */
    sanitizeString(input) {
        if (typeof input !== 'string') return '';
        
        // Remove dangerous characters
        return input
            .replace(/[<>]/g, '')           // Remove angle brackets
            .replace(/['"]/g, '')           // Remove quotes
            .replace(/[;]/g, '')            // Remove semicolons
            .replace(/[\x00-\x1F]/g, '')    // Remove control characters
            .trim();
    }
    
    /**
     * Check if string is alphanumeric (with underscores)
     * @param {string} str - String to check
     * @returns {boolean} True if alphanumeric
     */
    isAlphanumeric(str) {
        return /^[a-zA-Z0-9_]+$/.test(str);
    }
    
    /**
     * Check for SQL injection patterns
     * @param {string} str - String to check
     * @returns {boolean} True if contains SQL injection patterns
     */
    containsSQLInjectionPattern(str) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /(--|\*|;|'|")/,
            /(\bOR\b|\bAND\b).*=/i
        ];
        
        return sqlPatterns.some(pattern => pattern.test(str));
    }
    
    /**
     * Check for dangerous characters
     * @param {string} str - String to check
     * @returns {boolean} True if contains dangerous characters
     */
    containsDangerousCharacters(str) {
        const dangerousChars = /<script|javascript:|onerror=|onclick=/i;
        return dangerousChars.test(str);
    }
    
    /**
     * Validate mobile money request
     * @param {Object} request - Payment request
     * @param {string} mobileNumber - Mobile number
     * @param {string} method - Payment method
     * @returns {Object} Validation result
     */
    validateMobileMoneyRequest(request, mobileNumber, method) {
        const errors = [];
        
        // Validate base payment request
        const baseValidation = this.validatePaymentRequest(request);
        if (!baseValidation.valid) {
            errors.push(...baseValidation.errors);
        }
        
        // Validate mobile number
        const phoneValidation = this.validatePhone(mobileNumber);
        if (!phoneValidation.valid) {
            errors.push(...phoneValidation.errors);
        }
        
        // Validate payment method
        const methodValidation = this.validatePaymentMethod(method, request.currency);
        if (!methodValidation.valid) {
            errors.push(...methodValidation.errors);
        }
        
        // Method-specific validation
        if (method === 'ecocash' && mobileNumber) {
            // EcoCash uses Econet numbers (077)
            if (!mobileNumber.startsWith('+26377')) {
                errors.push('EcoCash requires an Econet number (+26377...)');
            }
        }
        
        if (method === 'onemoney' && mobileNumber) {
            // OneMoney uses NetOne numbers (078)
            if (!mobileNumber.startsWith('+26378')) {
                errors.push('OneMoney requires a NetOne number (+26378...)');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            errorType: errors.length > 0 ? PaymentErrorType.VALIDATION_ERROR : null
        };
    }
}

module.exports = PaymentValidatorService;

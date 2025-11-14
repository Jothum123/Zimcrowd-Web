/**
 * PayNow Payment Gateway Configuration (SECURE VERSION FOR GIT)
 * Supports USD and ZWG currencies with multiple payment methods
 * 
 * IMPORTANT: This file contains NO hardcoded credentials.
 * All sensitive values MUST be provided via environment variables.
 */

// Validate required environment variables
function getRequiredEnv(key, description) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key} (${description})`);
    }
    return value;
}

const PayNowConfig = {
    // USD Integration
    usd: {
        integrationId: getRequiredEnv('PAYNOW_USD_INTEGRATION_ID', 'PayNow USD Integration ID'),
        integrationKey: getRequiredEnv('PAYNOW_USD_INTEGRATION_KEY', 'PayNow USD Integration Key'),
        currency: 'USD',
        limits: {
            min: 1,
            max: 10000
        }
    },

    // ZWG Integration
    zwg: {
        integrationId: getRequiredEnv('PAYNOW_ZWG_INTEGRATION_ID', 'PayNow ZWG Integration ID'),
        integrationKey: getRequiredEnv('PAYNOW_ZWG_INTEGRATION_KEY', 'PayNow ZWG Integration Key'),
        currency: 'ZWG',
        limits: {
            min: 200,
            max: 10000000
        }
    },

    // URLs and Endpoints
    urls: {
        resultUrl: getRequiredEnv('PAYNOW_RESULT_URL', 'PayNow Result URL'),
        returnUrl: getRequiredEnv('PAYNOW_RETURN_URL', 'PayNow Return URL'),
        paynowBase: 'https://www.paynow.co.zw'
    },

    // Operational Settings
    settings: {
        testMode: process.env.PAYNOW_TEST_MODE === 'true',
        merchantEmail: process.env.PAYNOW_MERCHANT_EMAIL || 'noreply@zimcrowd.co.zw',
        environment: process.env.ENVIRONMENT || 'production',
        defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD'
    },

    // Payment Methods
    paymentMethods: {
        web: {
            name: 'PayNow Web',
            code: 'web',
            description: 'Pay with card or bank transfer',
            icon: 'credit-card',
            currencies: ['USD', 'ZWG']
        },
        ecocash: {
            name: 'EcoCash',
            code: 'ecocash',
            description: 'Pay with EcoCash mobile money',
            icon: 'mobile',
            currencies: ['USD', 'ZWG']
        },
        onemoney: {
            name: 'OneMoney',
            code: 'onemoney',
            description: 'Pay with OneMoney mobile money',
            icon: 'mobile',
            currencies: ['USD', 'ZWG']
        }
    },

    // Status Polling Configuration
    polling: {
        interval: 3000,        // 3 seconds
        maxAttempts: 100,      // 5 minutes total
        timeout: 300000        // 5 minutes
    },

    // Error Retry Configuration
    retry: {
        maxAttempts: 3,
        baseDelay: 2000,       // 2 seconds
        maxDelay: 10000        // 10 seconds
    },

    // Validation Rules
    validation: {
        referenceMinLength: 10,
        referenceMaxLength: 50,
        descriptionMaxLength: 100,
        emailMaxLength: 254,
        phoneRegex: /^\+263[17]\d{7}$/  // Zimbabwe phone format
    }
};

/**
 * Get configuration for specific currency
 * @param {string} currency - 'USD' or 'ZWG'
 * @returns {Object} Currency-specific configuration
 */
function getCurrencyConfig(currency) {
    const currencyKey = currency.toLowerCase();
    
    if (!PayNowConfig[currencyKey]) {
        throw new Error(`Unsupported currency: ${currency}`);
    }
    
    return PayNowConfig[currencyKey];
}

/**
 * Validate configuration completeness
 * @returns {Object} Validation result
 */
function validateConfig() {
    const errors = [];
    
    // Check USD credentials
    if (!PayNowConfig.usd.integrationKey) {
        errors.push('USD integration key not configured');
    }
    
    // Check ZWG credentials
    if (!PayNowConfig.zwg.integrationKey) {
        errors.push('ZWG integration key not configured');
    }
    
    // Check URLs
    if (!PayNowConfig.urls.resultUrl) {
        errors.push('Result URL not configured');
    }
    
    if (!PayNowConfig.urls.returnUrl) {
        errors.push('Return URL not configured');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get supported currencies
 * @returns {string[]} Array of supported currency codes
 */
function getSupportedCurrencies() {
    return ['USD', 'ZWG'];
}

/**
 * Get supported payment methods for currency
 * @param {string} currency - Currency code
 * @returns {Object[]} Array of payment methods
 */
function getPaymentMethodsForCurrency(currency) {
    return Object.values(PayNowConfig.paymentMethods)
        .filter(method => method.currencies.includes(currency));
}

/**
 * Check if test mode is enabled
 * @returns {boolean} True if test mode
 */
function isTestMode() {
    return PayNowConfig.settings.testMode;
}

module.exports = {
    PayNowConfig,
    getCurrencyConfig,
    validateConfig,
    getSupportedCurrencies,
    getPaymentMethodsForCurrency,
    isTestMode
};

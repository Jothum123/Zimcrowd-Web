/**
 * Payment Type Definitions
 * Type definitions for PayNow payment integration
 */

/**
 * @typedef {Object} PaymentRequest
 * @property {number} amount - Payment amount
 * @property {string} reference - Unique payment reference
 * @property {string} description - Payment description
 * @property {string} userEmail - User's email address
 * @property {string} userPhone - User's phone number
 * @property {string} currency - Currency code (USD or ZWG)
 * @property {string} [merchantTrace] - Optional merchant trace ID
 * @property {Object} [additionalData] - Optional additional data
 */

/**
 * @typedef {Object} PaymentResponse
 * @property {boolean} success - Whether payment initiation was successful
 * @property {string} reference - Payment reference
 * @property {string} pollUrl - URL to poll for payment status
 * @property {string} redirectUrl - URL to redirect user for payment
 * @property {string} [instructions] - Payment instructions for mobile money
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} PaymentStatus
 * @property {string} status - Payment status (pending, paid, failed, cancelled)
 * @property {string} reference - Payment reference
 * @property {number} amount - Payment amount
 * @property {string} currency - Currency code
 * @property {string} [paynowReference] - PayNow internal reference
 * @property {string} [error] - Error message if failed
 * @property {Date} [paidAt] - Timestamp when payment was completed
 */

/**
 * @typedef {Object} PaymentTransaction
 * @property {string} id - Transaction ID
 * @property {string} reference - Payment reference
 * @property {number} amount - Payment amount
 * @property {string} currency - Currency code
 * @property {string} status - Transaction status
 * @property {string} paymentMethod - Payment method used
 * @property {string} userId - User ID
 * @property {Date} createdAt - Transaction creation timestamp
 * @property {Date} [completedAt] - Transaction completion timestamp
 */

/**
 * @typedef {Object} PaymentHistoryItem
 * @property {string} id - History item ID
 * @property {string} reference - Payment reference
 * @property {number} amount - Payment amount
 * @property {string} currency - Currency code
 * @property {string} status - Payment status
 * @property {string} description - Payment description
 * @property {Date} date - Payment date
 */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} name - Method name
 * @property {string} code - Method code
 * @property {string} description - Method description
 * @property {string} icon - Icon identifier
 * @property {string[]} currencies - Supported currencies
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 */

/**
 * @typedef {Object} PaymentError
 * @property {string} type - Error type
 * @property {string} message - Error message
 * @property {string} [code] - Error code
 * @property {Object} [details] - Additional error details
 */

/**
 * Payment Error Types
 */
const PaymentErrorType = {
    NETWORK_ERROR: 'network_error',
    VALIDATION_ERROR: 'validation_error',
    TIMEOUT_ERROR: 'timeout_error',
    USER_CANCELLED: 'user_cancelled',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    INVALID_CREDENTIALS: 'invalid_credentials',
    PAYMENT_DECLINED: 'payment_declined',
    SYSTEM_ERROR: 'system_error'
};

/**
 * Payment Status Types
 */
const PaymentStatusType = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    PAID: 'paid',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired'
};

/**
 * Payment Method Codes
 */
const PaymentMethodCode = {
    WEB: 'web',
    ECOCASH: 'ecocash',
    ONEMONEY: 'onemoney'
};

/**
 * Currency Codes
 */
const CurrencyCode = {
    USD: 'USD',
    ZWG: 'ZWG'
};

/**
 * @typedef {Object} DashboardMetrics
 * @property {number} totalPayments - Total number of payments
 * @property {number} successRate - Success rate percentage
 * @property {number} averageAmount - Average payment amount
 * @property {Object} currencySplit - Payments by currency
 * @property {Object} methodSplit - Payments by method
 * @property {number} errorRate - Error rate percentage
 * @property {Date} timestamp - Metrics timestamp
 */

/**
 * @typedef {Object} PaymentAlert
 * @property {string} type - Alert type (warning, error, info)
 * @property {string} message - Alert message
 * @property {string} severity - Severity level (low, medium, high, critical)
 * @property {Date} [timestamp] - Alert timestamp
 */

/**
 * @typedef {Object} RecoveryAction
 * @property {string} type - Recovery action type
 * @property {Object} [strategy] - Retry strategy if applicable
 * @property {string[]} [suggestedMethods] - Alternative payment methods
 * @property {string} userMessage - Message to display to user
 */

module.exports = {
    PaymentErrorType,
    PaymentStatusType,
    PaymentMethodCode,
    CurrencyCode
};

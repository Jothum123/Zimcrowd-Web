/**
 * Paynow Simple Payment Link Generator
 * Creates direct payment links without API integration
 */

/**
 * Generate a Paynow payment link
 * @param {Object} options - Payment options
 * @param {string} options.merchantEmail - Merchant's Paynow email
 * @param {number} options.amount - Payment amount
 * @param {string} options.reference - Payment reference
 * @param {boolean} options.locked - Whether amount/reference are editable
 * @param {string} options.customerEmail - Optional customer email for auto-login
 * @returns {string} Complete Paynow payment URL
 */
function generatePaynowLink(options) {
    const {
        merchantEmail,
        amount,
        reference,
        locked = true,
        customerEmail = ''
    } = options;

    // Validate required fields
    if (!merchantEmail) {
        throw new Error('Merchant email is required');
    }

    // Build arguments object
    const args = {
        search: merchantEmail
    };

    // Add optional fields
    if (amount !== undefined && amount !== null) {
        args.amount = amount.toString();
    }

    if (reference) {
        args.reference = reference;
    }

    if (locked) {
        args.l = '1';
    }

    // Step 1: URL encode each argument value
    const encodedArgs = {};
    for (const [key, value] of Object.entries(args)) {
        encodedArgs[key] = encodeURIComponent(value);
    }

    // Step 2: Construct key/value pairs
    const argString = Object.entries(encodedArgs)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    // Step 3: Base64 encode (URL-safe)
    const base64Encoded = Buffer.from(argString).toString('base64');

    // Step 4: URL encode the base64 string (URL-safe)
    const urlSafeBase64 = encodeURIComponent(base64Encoded);

    // Step 5: Construct final URL
    const baseUrl = 'https://www.paynow.co.zw/payment/link';
    
    if (customerEmail) {
        return `${baseUrl}/${encodeURIComponent(customerEmail)}?q=${urlSafeBase64}`;
    } else {
        return `${baseUrl}?q=${urlSafeBase64}`;
    }
}

/**
 * Generate payment link for wallet deposit
 * @param {Object} options - Deposit options
 * @param {string} options.userId - User ID
 * @param {number} options.amount - Deposit amount
 * @param {string} options.userEmail - User's email
 * @returns {string} Payment link
 */
function generateDepositLink(options) {
    const {
        userId,
        amount,
        userEmail
    } = options;

    const reference = `ZC-WALLET-${userId}-${Date.now()}`;
    const merchantEmail = process.env.PAYNOW_MERCHANT_EMAIL || 'jothum@zimcrowd.co.zw';

    return generatePaynowLink({
        merchantEmail,
        amount,
        reference,
        locked: true,
        customerEmail: userEmail
    });
}

/**
 * Generate payment link for invoice
 * @param {Object} options - Invoice options
 * @param {string} options.invoiceNumber - Invoice number
 * @param {number} options.amount - Invoice amount
 * @param {string} options.customerEmail - Customer email
 * @returns {string} Payment link
 */
function generateInvoiceLink(options) {
    const {
        invoiceNumber,
        amount,
        customerEmail
    } = options;

    const merchantEmail = process.env.PAYNOW_MERCHANT_EMAIL || 'jothum@zimcrowd.co.zw';

    return generatePaynowLink({
        merchantEmail,
        amount,
        reference: invoiceNumber,
        locked: true,
        customerEmail
    });
}

/**
 * Generate donation link (unlocked amount)
 * @param {Object} options - Donation options
 * @param {string} options.campaignId - Campaign ID
 * @param {string} options.donorEmail - Donor email (optional)
 * @returns {string} Payment link
 */
function generateDonationLink(options) {
    const {
        campaignId,
        donorEmail
    } = options;

    const merchantEmail = process.env.PAYNOW_MERCHANT_EMAIL || 'jothum@zimcrowd.co.zw';
    const reference = `DONATION-${campaignId}-${Date.now()}`;

    return generatePaynowLink({
        merchantEmail,
        reference,
        locked: false, // Allow donor to choose amount
        customerEmail: donorEmail
    });
}

/**
 * Parse Paynow payment link to extract details
 * @param {string} url - Paynow payment URL
 * @returns {Object} Parsed payment details
 */
function parsePaynowLink(url) {
    try {
        const urlObj = new URL(url);
        const qParam = urlObj.searchParams.get('q');
        
        if (!qParam) {
            throw new Error('Invalid Paynow link: missing q parameter');
        }

        // Decode URL-safe base64
        const base64Decoded = Buffer.from(decodeURIComponent(qParam), 'base64').toString('utf-8');
        
        // Parse query string
        const params = new URLSearchParams(base64Decoded);
        
        return {
            merchantEmail: params.get('search'),
            amount: params.get('amount') ? parseFloat(params.get('amount')) : null,
            reference: params.get('reference'),
            locked: params.get('l') === '1',
            customerEmail: urlObj.pathname.split('/').pop()
        };
    } catch (error) {
        throw new Error(`Failed to parse Paynow link: ${error.message}`);
    }
}

module.exports = {
    generatePaynowLink,
    generateDepositLink,
    generateInvoiceLink,
    generateDonationLink,
    parsePaynowLink
};

/**
 * Paynow Simple Payment Links Routes
 * Generate direct payment links without full API integration
 */

const express = require('express');
const router = express.Router();
const {
    generatePaynowLink,
    generateDepositLink,
    generateInvoiceLink,
    generateDonationLink,
    parsePaynowLink
} = require('../utils/paynow-link-generator');

/**
 * POST /api/paynow-links/generate
 * Generate a custom Paynow payment link
 */
router.post('/generate', (req, res) => {
    try {
        const {
            merchantEmail,
            amount,
            reference,
            locked,
            customerEmail
        } = req.body;

        // Validate required fields
        if (!merchantEmail) {
            return res.status(400).json({
                success: false,
                error: 'Merchant email is required'
            });
        }

        // Generate link
        const paymentLink = generatePaynowLink({
            merchantEmail,
            amount,
            reference,
            locked: locked !== false, // Default to true
            customerEmail
        });

        res.json({
            success: true,
            paymentLink,
            details: {
                merchantEmail,
                amount,
                reference,
                locked: locked !== false,
                customerEmail
            }
        });

    } catch (error) {
        console.error('Error generating payment link:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate payment link'
        });
    }
});

/**
 * POST /api/paynow-links/deposit
 * Generate a wallet deposit link
 */
router.post('/deposit', (req, res) => {
    try {
        const { userId, amount, userEmail } = req.body;

        // Validate
        if (!userId || !amount || !userEmail) {
            return res.status(400).json({
                success: false,
                error: 'userId, amount, and userEmail are required'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be greater than 0'
            });
        }

        // Generate deposit link
        const paymentLink = generateDepositLink({
            userId,
            amount,
            userEmail
        });

        const reference = `ZC-WALLET-${userId}-${Date.now()}`;

        res.json({
            success: true,
            paymentLink,
            reference,
            amount,
            message: 'Click the link to complete your deposit'
        });

    } catch (error) {
        console.error('Error generating deposit link:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate deposit link'
        });
    }
});

/**
 * POST /api/paynow-links/invoice
 * Generate an invoice payment link
 */
router.post('/invoice', (req, res) => {
    try {
        const { invoiceNumber, amount, customerEmail } = req.body;

        // Validate
        if (!invoiceNumber || !amount) {
            return res.status(400).json({
                success: false,
                error: 'invoiceNumber and amount are required'
            });
        }

        // Generate invoice link
        const paymentLink = generateInvoiceLink({
            invoiceNumber,
            amount,
            customerEmail
        });

        res.json({
            success: true,
            paymentLink,
            invoiceNumber,
            amount,
            message: 'Share this link with your customer'
        });

    } catch (error) {
        console.error('Error generating invoice link:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate invoice link'
        });
    }
});

/**
 * POST /api/paynow-links/donation
 * Generate a donation link (unlocked amount)
 */
router.post('/donation', (req, res) => {
    try {
        const { campaignId, donorEmail } = req.body;

        // Validate
        if (!campaignId) {
            return res.status(400).json({
                success: false,
                error: 'campaignId is required'
            });
        }

        // Generate donation link
        const paymentLink = generateDonationLink({
            campaignId,
            donorEmail
        });

        res.json({
            success: true,
            paymentLink,
            campaignId,
            message: 'Donor can choose their donation amount'
        });

    } catch (error) {
        console.error('Error generating donation link:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate donation link'
        });
    }
});

/**
 * POST /api/paynow-links/parse
 * Parse a Paynow payment link to extract details
 */
router.post('/parse', (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }

        // Parse link
        const details = parsePaynowLink(url);

        res.json({
            success: true,
            details
        });

    } catch (error) {
        console.error('Error parsing payment link:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to parse payment link'
        });
    }
});

/**
 * GET /api/paynow-links/example
 * Get example payment links
 */
router.get('/example', (req, res) => {
    try {
        const merchantEmail = process.env.PAYNOW_MERCHANT_EMAIL || 'jothum@zimcrowd.co.zw';

        const examples = {
            simplePayment: generatePaynowLink({
                merchantEmail,
                amount: 10.00,
                reference: 'EXAMPLE-001',
                locked: true,
                customerEmail: 'customer@example.com'
            }),
            unlocked: generatePaynowLink({
                merchantEmail,
                reference: 'DONATION-001',
                locked: false
            }),
            deposit: generateDepositLink({
                userId: 'user123',
                amount: 25.00,
                userEmail: 'user@example.com'
            }),
            invoice: generateInvoiceLink({
                invoiceNumber: 'INV-12345',
                amount: 150.00,
                customerEmail: 'client@example.com'
            })
        };

        res.json({
            success: true,
            examples,
            usage: {
                simplePayment: 'Locked amount and reference',
                unlocked: 'Customer can edit amount',
                deposit: 'Wallet deposit link',
                invoice: 'Invoice payment link'
            }
        });

    } catch (error) {
        console.error('Error generating examples:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate examples'
        });
    }
});

module.exports = router;

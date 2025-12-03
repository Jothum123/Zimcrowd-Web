const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Service already exports an instance
const directLoanService = require('../services/direct-loan.service');

// Middleware to authenticate user
const { authenticateUser } = require('../middleware/auth');

/**
 * @route   GET /api/direct-loans/eligibility
 * @desc    Check if user is eligible for Direct Lending
 * @access  Private
 */
router.get('/eligibility', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currency = 'USD' } = req.query;
        
        console.log(`🔍 Checking Direct Lending eligibility for user ${userId} (${currency})`);
        
        const eligibility = await directLoanService.checkUserEligibility(userId);
        
        // Add currency-specific limits
        if (eligibility.eligible) {
            const limits = directLoanService.getLoanLimitsForCurrency(currency);
            const rates = directLoanService.getInterestRate(currency);
            eligibility.loanLimits = {
                ...eligibility.loanLimits,
                currency,
                minLoan: limits.min,
                maxLoan: Math.min(eligibility.loanLimits?.maxLoan || limits.max, limits.max),
                interestRate: rates.monthly * 100,
                annualRate: rates.annual * 100
            };
        }
        
        res.json({
            success: true,
            data: eligibility
        });
    } catch (error) {
        console.error('Eligibility check error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check eligibility'
        });
    }
});

/**
 * @route   GET /api/direct-loans/documents
 * @desc    Check document verification status
 * @access  Private
 */
router.get('/documents', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const docStatus = await directLoanService.checkRequiredDocuments(userId);
        
        res.json({
            success: true,
            data: docStatus
        });
    } catch (error) {
        console.error('Document check error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to check documents'
        });
    }
});

/**
 * @route   GET /api/direct-loans/calculate
 * @desc    Calculate loan details (interest, payments)
 * @access  Private
 */
router.get('/calculate', authenticateUser, async (req, res) => {
    try {
        const { amount, termMonths = 1, currency = 'USD' } = req.query;
        
        if (!amount || isNaN(amount)) {
            return res.status(400).json({
                success: false,
                message: 'Valid amount required'
            });
        }
        
        const principal = parseFloat(amount);
        const term = parseInt(termMonths);
        
        // Validate limits
        const limits = directLoanService.getLoanLimitsForCurrency(currency);
        if (principal < limits.min || principal > limits.max) {
            return res.status(400).json({
                success: false,
                message: `Loan amount must be between ${directLoanService.formatAmount(limits.min, currency)} and ${directLoanService.formatAmount(limits.max, currency)}`
            });
        }
        
        const calculation = directLoanService.calculateInterest(principal, term, currency);
        
        res.json({
            success: true,
            data: {
                ...calculation,
                limits
            }
        });
    } catch (error) {
        console.error('Calculate error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to calculate loan'
        });
    }
});

/**
 * @route   POST /api/direct-loans/create-offer
 * @desc    Create or get pending direct loan offer
 * @access  Private
 */
router.post('/create-offer', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, durationDays, currency = 'USD' } = req.body;

        console.log(`📝 Creating direct loan offer for user ${userId} (${currency})`);

        // Validate currency
        if (!['USD', 'ZWG'].includes(currency)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid currency. Must be USD or ZWG'
            });
        }

        // Check if user already has a pending offer
        const pendingOffer = await directLoanService.getPendingOffer(userId);
        
        if (pendingOffer) {
            console.log('✅ Returning existing pending offer');
            return res.json({
                success: true,
                data: pendingOffer,
                message: 'Pending offer retrieved'
            });
        }

        // Create new offer with currency
        const offer = await directLoanService.createOffer(userId, amount, durationDays, currency);

        res.json({
            success: true,
            data: offer,
            message: 'Loan offer created successfully'
        });
    } catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create loan offer'
        });
    }
});

// @route   GET /api/direct-loans/offers/:offerId
// @desc    Get specific offer details
// @access  Private
router.get('/offers/:offerId', authenticateUser, async (req, res) => {
    try {
        const { offerId } = req.params;
        const userId = req.user.id;

        const offer = await directLoanService.getOfferById(offerId, userId);

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: 'Offer not found or expired'
            });
        }

        res.json({
            success: true,
            data: offer
        });
    } catch (error) {
        console.error('Get offer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve offer'
        });
    }
});

// @route   POST /api/direct-loans/accept-offer
// @desc    Accept loan offer with e-signature
// @access  Private
router.post('/accept-offer', 
    authenticateUser,
    body('offerId').isUUID().withMessage('Valid offer ID required'),
    body('signatureName').trim().notEmpty().withMessage('Signature name required'),
    async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    try {
        const userId = req.user.id;
        const { offerId, signatureName } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;

        console.log(`✍️ User ${userId} accepting offer ${offerId}`);

        // Accept offer and create loan
        const loan = await directLoanService.acceptOffer(offerId, signatureName, ipAddress);

        res.json({
            success: true,
            data: loan,
            message: 'Loan agreement signed successfully'
        });
    } catch (error) {
        console.error('Accept offer error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to accept offer'
        });
    }
});

// @route   POST /api/direct-loans/disburse
// @desc    Disburse loan funds (Admin or automated)
// @access  Private
router.post('/disburse', 
    authenticateUser,
    body('directLoanId').isUUID().withMessage('Valid loan ID required'),
    async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    try {
        const { directLoanId } = req.body;

        console.log(`💰 Disbursing direct loan ${directLoanId}`);

        await directLoanService.disburseLoan(directLoanId);

        res.json({
            success: true,
            message: 'Loan disbursed successfully'
        });
    } catch (error) {
        console.error('Disburse loan error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to disburse loan'
        });
    }
});

// @route   GET /api/direct-loans/my-loans
// @desc    Get user's direct loans
// @access  Private
router.get('/my-loans', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;

        const loans = await directLoanService.getUserLoans(userId, status);

        res.json({
            success: true,
            data: {
                loans,
                total: loans.length
            }
        });
    } catch (error) {
        console.error('Get user loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve loans'
        });
    }
});

// @route   POST /api/direct-loans/repayment
// @desc    Record loan repayment
// @access  Private
router.post('/repayment', 
    authenticateUser,
    body('directLoanId').isUUID().withMessage('Valid loan ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('paymentMethod').isIn(['paynow', 'ecocash', 'bank_transfer']).withMessage('Valid payment method required'),
    body('transactionReference').trim().notEmpty().withMessage('Transaction reference required'),
    async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    try {
        const userId = req.user.id;
        const { directLoanId, amount, paymentMethod, transactionReference } = req.body;

        console.log(`💳 Recording repayment for loan ${directLoanId}`);

        const repayment = await directLoanService.recordRepayment(
            directLoanId,
            amount,
            paymentMethod,
            transactionReference
        );

        res.json({
            success: true,
            data: repayment,
            message: 'Repayment recorded successfully'
        });
    } catch (error) {
        console.error('Record repayment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to record repayment'
        });
    }
});

// @route   GET /api/direct-loans/stats
// @desc    Get user's direct loan statistics
// @access  Private
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await directLoanService.getUserLoanStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get loan stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve statistics'
        });
    }
});

// @route   GET /api/direct-loans/eligibility
// @desc    Check user's eligibility for Direct Lending
// @access  Private
router.get('/eligibility', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`🔍 Checking eligibility for user ${userId}`);

        const eligibility = await directLoanService.checkUserEligibility(userId);

        res.json({
            success: true,
            data: eligibility
        });
    } catch (error) {
        console.error('Eligibility check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check eligibility'
        });
    }
});

// @route   GET /api/direct-loans/documents
// @desc    Check user's document status for Direct Lending
// @access  Private
router.get('/documents', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        console.log(`📋 Checking documents for user ${userId}`);

        const documents = await directLoanService.checkRequiredDocuments(userId);

        res.json({
            success: true,
            data: documents
        });
    } catch (error) {
        console.error('Document check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check documents'
        });
    }
});

// @route   POST /api/direct-loans/request-unban
// @desc    Request to lift suspension or ban
// @access  Private
router.post('/request-unban',
    authenticateUser,
    body('reason').trim().notEmpty().withMessage('Reason is required'),
    async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    try {
        const userId = req.user.id;
        const { reason } = req.body;

        console.log(`📝 User ${userId} requesting unban`);

        const result = await directLoanService.requestUnban(userId, reason);

        res.json(result);
    } catch (error) {
        console.error('Unban request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit unban request'
        });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const directLoanService = require('../services/direct-loan.service');

// Middleware to authenticate user
const { authenticateUser } = require('../middleware/auth');

// @route   POST /api/direct-loans/create-offer
// @desc    Create or get pending direct loan offer
// @access  Private
router.post('/create-offer', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, durationDays } = req.body;

        console.log(`📝 Creating direct loan offer for user ${userId}`);

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

        // Create new offer
        const offer = await directLoanService.createOffer(userId, amount, durationDays);

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

module.exports = router;

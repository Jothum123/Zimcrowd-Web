/**
 * P2P Primary Market Routes
 * Handles loan marketplace where borrowers request loans and lenders fund them
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateUser } = require('../middleware/auth');
const P2PLendingService = require('../services/p2p-lending.service');

const router = express.Router();
const p2pService = new P2PLendingService();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// @route   POST /api/p2p/primary/create-listing
// @desc    Create a loan marketplace listing (borrower)
// @access  Private
router.post('/create-listing', 
    authenticateUser,
    [
        body('amount').isFloat({ min: 50, max: 100000 }).withMessage('Amount must be between $50 and $100,000'),
        body('termMonths').isInt({ min: 1, max: 84 }).withMessage('Term must be between 1 and 84 months'),
        body('requestedInterestRate').isFloat({ min: 0, max: 0.10 }).withMessage('Interest rate must be between 0% and 10%'),
        body('purpose').notEmpty().withMessage('Loan purpose is required'),
        body('loanType').optional().isIn(['personal', 'business', 'emergency']).withMessage('Invalid loan type')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const result = await p2pService.createLoanListing(req.user.id, req.body);
            
            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Create listing error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create loan listing'
            });
        }
    }
);

// @route   GET /api/p2p/primary/browse
// @desc    Browse active loan marketplace listings (lenders)
// @access  Public
router.get('/browse', async (req, res) => {
    try {
        const filters = {
            minAmount: req.query.minAmount,
            maxAmount: req.query.maxAmount,
            maxInterestRate: req.query.maxInterestRate,
            minStarRating: req.query.minStarRating,
            page: req.query.page,
            limit: req.query.limit
        };

        const result = await p2pService.browseLoanMarketplace(filters);
        res.json(result);

    } catch (error) {
        console.error('Browse marketplace error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to browse marketplace'
        });
    }
});

// @route   GET /api/p2p/primary/listing/:id
// @desc    Get single loan listing details
// @access  Public
router.get('/listing/:id', async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        const { data: listing, error } = await supabase
            .from('loan_marketplace_listings')
            .select(`
                *,
                loans(*),
                lender_funding_offers(
                    id,
                    offer_amount,
                    offered_interest_rate,
                    status,
                    created_at
                )
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;

        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found'
            });
        }

        res.json({
            success: true,
            listing
        });

    } catch (error) {
        console.error('Get listing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get listing details'
        });
    }
});

// @route   POST /api/p2p/primary/make-offer
// @desc    Make a funding offer on a loan listing (lender)
// @access  Private
router.post('/make-offer',
    authenticateUser,
    [
        body('listingId').isUUID().withMessage('Invalid listing ID'),
        body('offerAmount').isFloat({ min: 50 }).withMessage('Offer amount must be at least $50'),
        body('offeredInterestRate').isFloat({ min: 0, max: 0.10 }).withMessage('Interest rate must be between 0% and 10%'),
        body('offerType').optional().isIn(['partial', 'full', 'conditional']).withMessage('Invalid offer type')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const result = await p2pService.makeFundingOffer(req.user.id, req.body);
            
            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Make offer error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to make funding offer'
            });
        }
    }
);

// @route   POST /api/p2p/primary/accept-offer/:offerId
// @desc    Accept a funding offer (borrower)
// @access  Private
router.post('/accept-offer/:offerId',
    authenticateUser,
    async (req, res) => {
        try {
            const result = await p2pService.acceptFundingOffer(req.user.id, req.params.offerId);
            
            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Accept offer error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to accept funding offer'
            });
        }
    }
);

// @route   GET /api/p2p/primary/my-listings
// @desc    Get borrower's own loan listings
// @access  Private
router.get('/my-listings', authenticateUser, async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        const { data: listings, error } = await supabase
            .from('loan_marketplace_listings')
            .select(`
                *,
                loans(*),
                lender_funding_offers(count)
            `)
            .eq('borrower_user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            listings: listings || []
        });

    } catch (error) {
        console.error('Get my listings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get your listings'
        });
    }
});

// @route   GET /api/p2p/primary/my-offers
// @desc    Get lender's funding offers
// @access  Private
router.get('/my-offers', authenticateUser, async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        const { data: offers, error } = await supabase
            .from('lender_funding_offers')
            .select(`
                *,
                loan_marketplace_listings(
                    amount_requested,
                    purpose,
                    loan_term_months,
                    borrower_star_rating,
                    status
                )
            `)
            .eq('lender_user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            offers: offers || []
        });

    } catch (error) {
        console.error('Get my offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get your offers'
        });
    }
});

// @route   GET /api/p2p/primary/marketplace-stats
// @desc    Get marketplace statistics
// @access  Public
router.get('/marketplace-stats', async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        // Get active listings count
        const { count: activeListings } = await supabase
            .from('loan_marketplace_listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Get total funding volume
        const { data: fundedOffers } = await supabase
            .from('lender_funding_offers')
            .select('funded_amount')
            .eq('status', 'accepted');

        const totalVolume = fundedOffers?.reduce((sum, offer) => sum + (offer.funded_amount || 0), 0) || 0;

        // Get average interest rate
        const { data: listings } = await supabase
            .from('loan_marketplace_listings')
            .select('requested_interest_rate')
            .eq('status', 'active');

        const avgRate = listings?.length > 0
            ? listings.reduce((sum, l) => sum + l.requested_interest_rate, 0) / listings.length
            : 0;

        res.json({
            success: true,
            stats: {
                activeListings: activeListings || 0,
                totalFundingVolume: totalVolume,
                averageInterestRate: (avgRate * 100).toFixed(2) + '%',
                totalLenders: 0, // TODO: Count unique lenders
                totalBorrowers: 0 // TODO: Count unique borrowers
            }
        });

    } catch (error) {
        console.error('Get marketplace stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get marketplace statistics'
        });
    }
});

module.exports = router;

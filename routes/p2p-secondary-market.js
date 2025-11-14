/**
 * P2P Secondary Market Routes
 * Handles loan trading where lenders sell their loan investments to other lenders
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

// @route   POST /api/p2p/secondary/list-for-sale
// @desc    List a loan investment for sale (lender)
// @access  Private
router.post('/list-for-sale',
    authenticateUser,
    [
        body('holdingId').isUUID().withMessage('Invalid holding ID'),
        body('askingPrice').isFloat({ min: 1 }).withMessage('Asking price must be positive'),
        body('listingType').optional().isIn(['fixed', 'auction', 'negotiable']).withMessage('Invalid listing type')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const result = await p2pService.listLoanForSale(req.user.id, req.body);
            
            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('List for sale error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to list loan for sale'
            });
        }
    }
);

// @route   GET /api/p2p/secondary/browse
// @desc    Browse secondary market listings
// @access  Public
router.get('/browse', async (req, res) => {
    try {
        const filters = {
            minDiscount: req.query.minDiscount,
            maxPrice: req.query.maxPrice,
            page: req.query.page,
            limit: req.query.limit
        };

        const result = await p2pService.browseSecondaryMarket(filters);
        res.json(result);

    } catch (error) {
        console.error('Browse secondary market error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to browse secondary market'
        });
    }
});

// @route   POST /api/p2p/secondary/make-offer
// @desc    Make a purchase offer on a secondary market listing
// @access  Private
router.post('/make-offer',
    authenticateUser,
    [
        body('listingId').isUUID().withMessage('Invalid listing ID'),
        body('sellerId').isUUID().withMessage('Invalid seller ID'),
        body('offerPrice').isFloat({ min: 1 }).withMessage('Offer price must be positive'),
        body('offerType').optional().isIn(['full', 'partial']).withMessage('Invalid offer type')
    ],
    handleValidationErrors,
    async (req, res) => {
        try {
            const result = await p2pService.makePurchaseOffer(req.user.id, req.body);
            
            if (!result.success) {
                return res.status(400).json(result);
            }

            res.json(result);

        } catch (error) {
            console.error('Make purchase offer error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to make purchase offer'
            });
        }
    }
);

// @route   GET /api/p2p/secondary/my-listings
// @desc    Get lender's secondary market listings
// @access  Private
router.get('/my-listings', authenticateUser, async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        const { data: listings, error } = await supabase
            .from('secondary_market_listings')
            .select(`
                *,
                loan_investment_holdings(
                    principal_amount,
                    current_outstanding_balance,
                    total_payments_received
                ),
                secondary_market_offers(count)
            `)
            .eq('seller_user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            listings: listings || []
        });

    } catch (error) {
        console.error('Get my secondary listings error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get your listings'
        });
    }
});

// @route   GET /api/p2p/secondary/my-offers
// @desc    Get buyer's purchase offers
// @access  Private
router.get('/my-offers', authenticateUser, async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        const { data: offers, error } = await supabase
            .from('secondary_market_offers')
            .select(`
                *,
                secondary_market_listings(
                    outstanding_balance,
                    asking_price,
                    discount_premium,
                    status
                )
            `)
            .eq('buyer_user_id', req.user.id)
            .order('created_at', { ascending: false});

        if (error) throw error;

        res.json({
            success: true,
            offers: offers || []
        });

    } catch (error) {
        console.error('Get my purchase offers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get your offers'
        });
    }
});

// @route   GET /api/p2p/secondary/portfolio
// @desc    Get lender's investment portfolio
// @access  Private
router.get('/portfolio', authenticateUser, async (req, res) => {
    try {
        const result = await p2pService.getLenderPortfolio(req.user.id);
        
        if (!result.success) {
            return res.status(400).json(result);
        }

        // Also get individual holdings
        const { supabase } = require('../utils/supabase-auth');
        const { data: holdings, error } = await supabase
            .from('loan_investment_holdings')
            .select(`
                *,
                loans(
                    amount,
                    status,
                    interest_rate,
                    term_months
                )
            `)
            .eq('lender_user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            portfolio: result.portfolio,
            holdings: holdings || []
        });

    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get portfolio'
        });
    }
});

// @route   GET /api/p2p/secondary/listing/:id
// @desc    Get single secondary market listing details
// @access  Public
router.get('/listing/:id', async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        const { data: listing, error } = await supabase
            .from('secondary_market_listings')
            .select(`
                *,
                loan_investment_holdings(
                    principal_amount,
                    current_outstanding_balance,
                    total_payments_received,
                    interest_earned,
                    current_yield
                ),
                loans(
                    amount,
                    status,
                    interest_rate,
                    term_months
                ),
                secondary_market_offers(
                    id,
                    offer_price,
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
        console.error('Get secondary listing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get listing details'
        });
    }
});

// @route   GET /api/p2p/secondary/market-stats
// @desc    Get secondary market statistics
// @access  Public
router.get('/market-stats', async (req, res) => {
    try {
        const { supabase } = require('../utils/supabase-auth');
        
        // Get active listings count
        const { count: activeListings } = await supabase
            .from('secondary_market_listings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Get average discount/premium
        const { data: listings } = await supabase
            .from('secondary_market_listings')
            .select('discount_premium')
            .eq('status', 'active');

        const avgDiscount = listings?.length > 0
            ? listings.reduce((sum, l) => sum + (l.discount_premium || 0), 0) / listings.length
            : 0;

        // Get total volume traded
        const { data: transfers } = await supabase
            .from('loan_ownership_transfers')
            .select('sale_price')
            .eq('status', 'completed');

        const totalVolume = transfers?.reduce((sum, t) => sum + (t.sale_price || 0), 0) || 0;

        res.json({
            success: true,
            stats: {
                activeListings: activeListings || 0,
                totalVolumeTraded: totalVolume,
                averageDiscount: avgDiscount.toFixed(2) + '%',
                totalTransfers: transfers?.length || 0
            }
        });

    } catch (error) {
        console.error('Get secondary market stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get market statistics'
        });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();

// Import existing market routes
const primaryMarketRoutes = require('./primary-market');
const secondaryMarketRoutes = require('./secondary-market');

// Mount sub-routes
router.use('/primary', primaryMarketRoutes);
router.use('/secondary', secondaryMarketRoutes);

// Market overview endpoint
router.get('/overview', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                primaryMarket: {
                    available: true,
                    endpoint: '/api/market/primary'
                },
                secondaryMarket: {
                    available: true,
                    endpoint: '/api/market/secondary'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch market overview',
            error: error.message
        });
    }
});

module.exports = router;

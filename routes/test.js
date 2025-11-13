// Test routes - simple public endpoints
const express = require('express');
const router = express.Router();

console.log('📋 Loading test routes...');

// @route   GET /api/test/loans-types
// @desc    Test loans types endpoint
// @access  Public
router.get('/loans-types', (req, res) => {
    console.log('🎯 Test loans-types endpoint called!');
    res.json({
        success: true,
        message: 'Test loans types endpoint working!',
        data: [
            { type: 'personal', name: 'Personal Loan' },
            { type: 'business', name: 'Business Loan' }
        ]
    });
});

// @route   GET /api/test/health
// @desc    Test health endpoint
// @access  Public
router.get('/health', (req, res) => {
    console.log('❤️ Test health endpoint called!');
    res.json({
        success: true,
        message: 'Test health endpoint working!'
    });
});

module.exports = router;

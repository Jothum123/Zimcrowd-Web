// Simple loans routes
const express = require('express');
const router = express.Router();

console.log('🔄 Loading simple loans routes...');

// @route   GET /api/loans/types
// @desc    Get available loan types and terms
// @access  Public
router.get('/types', (req, res) => {
    console.log('🔍 Simple loans types endpoint called!');
    res.json({
        success: true,
        message: 'Simple loans types endpoint working!',
        data: [
            { type: 'personal', name: 'Personal Loan' },
            { type: 'business', name: 'Business Loan' }
        ]
    });
});

module.exports = router;

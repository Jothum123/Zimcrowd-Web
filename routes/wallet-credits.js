const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// @desc    Get user credit summary
// @route   GET /api/wallet-credits/credits/summary
// @access  Private
router.get('/credits/summary', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get withdrawable credits summary
        const withdrawableResult = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'available' AND is_withdrawable = true THEN amount ELSE 0 END), 0) as withdrawable_balance,
                COALESCE(SUM(CASE WHEN status = 'pending' AND is_withdrawable = true THEN amount ELSE 0 END), 0) as pending_withdrawable,
                COALESCE(SUM(CASE WHEN status = 'withdrawn' AND is_withdrawable = true THEN amount ELSE 0 END), 0) as withdrawn_total,
                COALESCE(SUM(CASE WHEN status = 'expired' AND is_withdrawable = true THEN amount ELSE 0 END), 0) as expired_withdrawable,
                COUNT(CASE WHEN status = 'available' AND is_withdrawable = true THEN 1 END) as withdrawable_credits_count
            FROM wallet_credits 
            WHERE user_id = $1 AND is_withdrawable = true
        `, [userId]);
        
        // Get platform credits summary (non-withdrawable)
        const platformResult = await pool.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'available' AND is_withdrawable = false THEN amount ELSE 0 END), 0) as platform_balance,
                COALESCE(SUM(CASE WHEN status = 'pending' AND is_withdrawable = false THEN amount ELSE 0 END), 0) as pending_platform,
                COALESCE(SUM(CASE WHEN status = 'used' AND is_withdrawable = false THEN amount ELSE 0 END), 0) as used_platform,
                COALESCE(SUM(CASE WHEN status = 'expired' AND is_withdrawable = false THEN amount ELSE 0 END), 0) as expired_platform,
                COUNT(CASE WHEN status = 'available' AND is_withdrawable = false THEN 1 END) as platform_credits_count
            FROM wallet_credits 
            WHERE user_id = $1 AND is_withdrawable = false
        `, [userId]);
        
        const withdrawable = withdrawableResult.rows[0];
        const platform = platformResult.rows[0];
        
        res.json({
            // Withdrawable credits (cash)
            withdrawable_balance: parseFloat(withdrawable.withdrawable_balance),
            pending_withdrawable: parseFloat(withdrawable.pending_withdrawable),
            withdrawn_total: parseFloat(withdrawable.withdrawn_total),
            expired_withdrawable: parseFloat(withdrawable.expired_withdrawable),
            withdrawable_credits_count: parseInt(withdrawable.withdrawable_credits_count),
            
            // Platform credits (non-withdrawable)
            platform_balance: parseFloat(platform.platform_balance),
            pending_platform: parseFloat(platform.pending_platform),
            used_platform: parseFloat(platform.used_platform),
            expired_platform: parseFloat(platform.expired_platform),
            platform_credits_count: parseInt(platform.platform_credits_count),
            
            // Totals
            total_available: parseFloat(withdrawable.withdrawable_balance) + parseFloat(platform.platform_balance),
            total_earned: parseFloat(withdrawable.withdrawable_balance) + parseFloat(platform.platform_balance) + 
                          parseFloat(withdrawable.withdrawn_total) + parseFloat(platform.used_platform)
        });
    } catch (error) {
        console.error('Error fetching credit summary:', error);
        res.status(500).json({ error: 'Failed to fetch credit summary' });
    }
});

// @desc    Get detailed credit history
// @route   GET /api/wallet/credits/history
// @access  Private
router.get('/credits/history', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status, credit_type } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                wc.id,
                wc.credit_type,
                wc.amount,
                wc.status,
                wc.created_at,
                wc.available_at,
                wc.expires_at,
                wc.withdrawn_at,
                wc.withdrawal_method,
                wc.notes,
                wc.source_reference
            FROM wallet_credits wc
            WHERE wc.user_id = $1
        `;
        let queryParams = [userId];
        
        if (status) {
            query += ` AND wc.status = $${queryParams.length + 1}`;
            queryParams.push(status);
        }
        
        if (credit_type) {
            query += ` AND wc.credit_type = $${queryParams.length + 1}`;
            queryParams.push(credit_type);
        }
        
        query += ` ORDER BY wc.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM wallet_credits wc
            WHERE wc.user_id = $1
            ${status ? `AND wc.status = $2` : ''}
            ${credit_type ? `AND wc.credit_type = $${status ? 3 : 2}` : ''}
        `;
        const countParams = [userId];
        if (status) countParams.push(status);
        if (credit_type) countParams.push(credit_type);
        
        const countResult = await pool.query(countQuery, countParams);
        
        res.json({
            credits: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching credit history:', error);
        res.status(500).json({ error: 'Failed to fetch credit history' });
    }
});

// @desc    Get credit transactions
// @route   GET /api/wallet/credits/transactions
// @access  Private
router.get('/credits/transactions', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { credit_id } = req.query;
        
        let query = `
            SELECT 
                ct.id,
                ct.transaction_type,
                ct.amount,
                ct.balance_after,
                ct.created_at,
                ct.reference_id,
                ct.notes,
                wc.credit_type
            FROM credit_transactions ct
            JOIN wallet_credits wc ON ct.credit_id = wc.id
            WHERE wc.user_id = $1
        `;
        let queryParams = [userId];
        
        if (credit_id) {
            query += ` AND ct.credit_id = $${queryParams.length + 1}`;
            queryParams.push(credit_id);
        }
        
        query += ` ORDER BY ct.created_at DESC`;
        
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching credit transactions:', error);
        res.status(500).json({ error: 'Failed to fetch credit transactions' });
    }
});

// @desc    Create withdrawal request
// @route   POST /api/wallet-credits/credits/withdraw
// @access  Private
router.post('/credits/withdraw', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, withdrawal_method, withdrawal_details } = req.body;
        
        // Validate input
        if (!amount || !withdrawal_method || !withdrawal_details) {
            return res.status(400).json({ 
                error: 'Amount, withdrawal method, and withdrawal details are required' 
            });
        }
        
        if (amount <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }
        
        // Check minimum withdrawal amount
        const minAmountResult = await pool.query(
            'SELECT CAST(config_value AS DECIMAL) as min_amount FROM credit_config WHERE config_key = $1 AND is_active = true',
            ['minimum_withdrawal_amount']
        );
        
        const minAmount = minAmountResult.rows[0]?.min_amount || 10;
        if (amount < minAmount) {
            return res.status(400).json({ 
                error: `Minimum withdrawal amount is $${minAmount}` 
            });
        }
        
        // Check user's withdrawable balance only (exclude non-withdrawable platform credits)
        const balanceResult = await pool.query(
            'SELECT COALESCE(SUM(amount), 0) as withdrawable_balance FROM wallet_credits WHERE user_id = $1 AND status = $2 AND is_withdrawable = true',
            [userId, 'available']
        );
        
        const withdrawableBalance = balanceResult.rows[0].withdrawable_balance;
        if (amount > withdrawableBalance) {
            return res.status(400).json({ 
                error: 'Insufficient withdrawable balance',
                withdrawable_balance: withdrawableBalance,
                note: 'Platform credits from early repayment cannot be withdrawn as cash'
            });
        }
        
        // Generate tracking reference
        const trackingReference = 'WDR' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
        
        // Create withdrawal request
        const result = await pool.query(
            `INSERT INTO credit_withdrawal_requests 
             (user_id, total_amount, withdrawal_method, withdrawal_details, tracking_reference)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, amount, withdrawal_method, JSON.stringify(withdrawal_details), trackingReference]
        );
        
        res.status(201).json({
            message: 'Withdrawal request created successfully',
            withdrawal_request: result.rows[0],
            note: 'Only withdrawable credits can be withdrawn. Platform credits can be used for future loans, fees, or lending.'
        });
    } catch (error) {
        console.error('Error creating withdrawal request:', error);
        res.status(500).json({ error: 'Failed to create withdrawal request' });
    }
});

// @desc    Get user withdrawal requests
// @route   GET /api/wallet/credits/withdrawals
// @access  Private
router.get('/credits/withdrawals', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                id,
                total_amount,
                status,
                withdrawal_method,
                created_at,
                processed_at,
                notes,
                tracking_reference
            FROM credit_withdrawal_requests
            WHERE user_id = $1
        `;
        let queryParams = [userId];
        
        if (status) {
            query += ` AND status = $${queryParams.length + 1}`;
            queryParams.push(status);
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM credit_withdrawal_requests
            WHERE user_id = $1
            ${status ? `AND status = $2` : ''}
        `;
        const countParams = [userId];
        if (status) countParams.push(status);
        
        const countResult = await pool.query(countQuery, countParams);
        
        res.json({
            withdrawals: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawal requests' });
    }
});

// @desc    Get credit configuration
// @route   GET /api/wallet/credits/config
// @access  Public
router.get('/credits/config', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT config_key, config_value, description FROM credit_config WHERE is_active = true'
        );
        
        const config = {};
        result.rows.forEach(row => {
            config[row.config_key] = {
                value: row.config_value,
                description: row.description
            };
        });
        
        res.json(config);
    } catch (error) {
        console.error('Error fetching credit config:', error);
        res.status(500).json({ error: 'Failed to fetch credit configuration' });
    }
});

// @desc    Award early repayment bonus (internal use)
// @route   POST /api/wallet/credits/award-early-repayment
// @access  Admin
router.post('/credits/award-early-repayment', requireAdmin, async (req, res) => {
    try {
        const { user_id, loan_id, early_payment_amount, remaining_principal, remaining_interest } = req.body;
        
        if (!user_id || !loan_id || early_payment_amount === undefined || remaining_principal === undefined || remaining_interest === undefined) {
            return res.status(400).json({ 
                error: 'User ID, loan ID, early payment amount, remaining principal, and remaining interest are required' 
            });
        }
        
        // Calculate bonus amount
        const bonusResult = await pool.query(
            'SELECT calculate_early_repayment_bonus($1, $2, $3, $4) as bonus_amount',
            [loan_id, early_payment_amount, remaining_principal, remaining_interest]
        );
        
        const bonusAmount = bonusResult.rows[0].bonus_amount;
        
        if (bonusAmount <= 0) {
            return res.json({ message: 'No early repayment bonus available', bonus_amount: 0 });
        }
        
        // Insert credit record
        const creditResult = await pool.query(
            `INSERT INTO wallet_credits 
             (user_id, credit_type, amount, source_reference, status, available_at, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                user_id,
                'early_repayment_bonus',
                bonusAmount,
                'loan_' + loan_id,
                'available',
                CURRENT_TIMESTAMP,
                `Early repayment bonus for loan ${loan_id}`
            ]
        );
        
        // Create transaction record
        await pool.query(
            `INSERT INTO credit_transactions 
             (credit_id, transaction_type, amount, balance_after, reference_id)
             VALUES ($1, $2, $3, $4, $5)`,
            [creditResult.rows[0].id, 'earned', bonusAmount, bonusAmount, 'loan_' + loan_id]
        );
        
        res.json({
            message: 'Early repayment bonus awarded successfully',
            bonus_amount: bonusAmount,
            credit: creditResult.rows[0]
        });
    } catch (error) {
        console.error('Error awarding early repayment bonus:', error);
        res.status(500).json({ error: 'Failed to award early repayment bonus' });
    }
});

// @desc    Award tier discount credits to lenders (internal use)
// @route   POST /api/wallet/credits/award-tier-discount
// @access  Admin
router.post('/credits/award-tier-discount', requireAdmin, async (req, res) => {
    try {
        const { user_id, loan_id, loan_amount, tier_multiplier } = req.body;
        
        if (!user_id || !loan_id || !loan_amount || tier_multiplier === undefined) {
            return res.status(400).json({ 
                error: 'User ID, loan ID, loan amount, and tier multiplier are required' 
            });
        }
        
        // Call the function to award credits
        await pool.query(
            'SELECT award_tier_discount_credits($1, $2, $3, $4)',
            [user_id, loan_id, loan_amount, tier_multiplier]
        );
        
        res.json({
            message: 'Tier discount credits awarded successfully'
        });
    } catch (error) {
        console.error('Error awarding tier discount credits:', error);
        res.status(500).json({ error: 'Failed to award tier discount credits' });
    }
});

// @desc    Award referral credits (internal use)
// @route   POST /api/wallet/credits/award-referral
// @access  Admin
router.post('/credits/award-referral', requireAdmin, async (req, res) => {
    try {
        const { referrer_id, referral_id, loan_amount } = req.body;
        
        if (!referrer_id || !referral_id || !loan_amount) {
            return res.status(400).json({ 
                error: 'Referrer ID, referral ID, and loan amount are required' 
            });
        }
        
        // Call the function to award credits
        await pool.query(
            'SELECT award_referral_credits($1, $2, $3)',
            [referrer_id, referral_id, loan_amount]
        );
        
        res.json({
            message: 'Referral credits awarded successfully'
        });
    } catch (error) {
        console.error('Error awarding referral credits:', error);
        res.status(500).json({ error: 'Failed to award referral credits' });
    }
});

module.exports = router;

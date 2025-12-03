/**
 * Referral Automation API Routes
 * Handles referral signup processing, activity tracking, and cron job triggers
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const ReferralAutomationService = require('../services/referral-automation.service');
const { authenticateUser, requireAdmin } = require('../middleware/auth');

const referralAutomation = new ReferralAutomationService();

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

/**
 * @route   POST /api/referral-automation/signup
 * @desc    Process referral signup (called when user signs up with referral code)
 * @access  Public (called during signup flow)
 */
router.post('/signup', [
    body('user_id').isUUID().withMessage('Valid user ID required'),
    body('referral_code').notEmpty().withMessage('Referral code required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { user_id, referral_code } = req.body;
        
        const result = await referralAutomation.processReferralSignup(user_id, referral_code);
        
        if (!result.success) {
            return res.status(400).json(result);
        }
        
        res.json({
            success: true,
            message: 'Referral processed successfully',
            data: {
                referral_id: result.referral?.id,
                advocate_id: result.advocateUserId
            }
        });
    } catch (error) {
        console.error('Referral signup error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process referral signup',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/referral-automation/activity
 * @desc    Process qualifying activity (called when user completes milestone)
 * @access  Private (internal service call)
 */
router.post('/activity', [
    body('user_id').isUUID().withMessage('Valid user ID required'),
    body('activity_type').isIn(['first_loan', 'loan_repaid', 'first_funding', 'first_investment'])
        .withMessage('Invalid activity type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { user_id, activity_type } = req.body;
        
        const result = await referralAutomation.processQualifyingActivity(user_id, activity_type);
        
        res.json({
            success: true,
            message: 'Activity processed',
            data: result
        });
    } catch (error) {
        console.error('Activity processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process activity',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/referral-automation/cron/daily
 * @desc    Trigger daily cron jobs (credit expiration, warnings, fraud detection)
 * @access  Admin or Cron Service
 */
router.post('/cron/daily', async (req, res) => {
    try {
        // Verify cron secret or admin auth
        const cronSecret = req.headers['x-cron-secret'];
        if (cronSecret !== process.env.CRON_SECRET && !req.user?.is_admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        
        console.log('⏰ Daily cron triggered via API');
        const result = await referralAutomation.runScheduledJobs('daily');
        
        res.json({
            success: true,
            message: 'Daily jobs completed',
            data: result
        });
    } catch (error) {
        console.error('Daily cron error:', error);
        res.status(500).json({
            success: false,
            message: 'Daily cron failed',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/referral-automation/cron/monthly
 * @desc    Trigger monthly cron job (leaderboard calculation)
 * @access  Admin or Cron Service
 */
router.post('/cron/monthly', async (req, res) => {
    try {
        const cronSecret = req.headers['x-cron-secret'];
        if (cronSecret !== process.env.CRON_SECRET && !req.user?.is_admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        
        console.log('⏰ Monthly cron triggered via API');
        const result = await referralAutomation.runScheduledJobs('monthly');
        
        res.json({
            success: true,
            message: 'Monthly jobs completed',
            data: result
        });
    } catch (error) {
        console.error('Monthly cron error:', error);
        res.status(500).json({
            success: false,
            message: 'Monthly cron failed',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/referral-automation/cron/run
 * @desc    Run specific cron job
 * @access  Admin only
 */
router.post('/cron/run', requireAdmin, [
    body('job').isIn(['expiration', 'warnings', 'fraud', 'leaderboard', 'daily', 'monthly', 'all'])
        .withMessage('Invalid job type'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { job } = req.body;
        
        console.log(`🔧 Admin triggered job: ${job}`);
        
        let result;
        if (['daily', 'monthly', 'all'].includes(job)) {
            result = await referralAutomation.runScheduledJobs(job);
        } else {
            switch (job) {
                case 'expiration':
                    result = await referralAutomation.runDailyCreditExpiration();
                    break;
                case 'warnings':
                    result = await referralAutomation.runExpirationWarnings();
                    break;
                case 'fraud':
                    result = await referralAutomation.runFraudDetection();
                    break;
                case 'leaderboard':
                    result = await referralAutomation.runMonthlyLeaderboardCalculation();
                    break;
            }
        }
        
        res.json({
            success: true,
            message: `Job ${job} completed`,
            data: result
        });
    } catch (error) {
        console.error('Job execution error:', error);
        res.status(500).json({
            success: false,
            message: 'Job execution failed',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/referral-automation/status
 * @desc    Get referral automation status
 * @access  Admin only
 */
router.get('/status', requireAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                service: 'ReferralAutomationService',
                status: 'active',
                rewards: {
                    advocate: {
                        friend_first_loan: '$5',
                        friend_loan_repaid: '$5',
                        friend_first_funding: '$5',
                        friend_first_investment: '$5'
                    },
                    friend: {
                        first_loan: '$5',
                        first_funding: '$5',
                        first_investment: '$5'
                    }
                },
                limits: {
                    monthly_limit: '$1,000',
                    credit_expiry: '90 days'
                },
                cron_jobs: {
                    daily: {
                        schedule: '00:00 UTC',
                        tasks: ['credit_expiration', 'expiration_warnings', 'fraud_detection']
                    },
                    monthly: {
                        schedule: '01:00 UTC on 1st',
                        tasks: ['leaderboard_calculation', 'bonus_awards']
                    }
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;

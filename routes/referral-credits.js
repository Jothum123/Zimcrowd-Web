/**
 * Referral Credits System Routes
 * Advanced referral program with tiered rewards
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const { supabase } = require('../utils/supabase-auth');
const WalletService = require('../services/wallet.service');
const NotificationService = require('../services/notification.service');

const walletService = new WalletService();
const notificationService = new NotificationService();

console.log('🔄 Loading referral credits routes...');

// Referral reward configuration
const REFERRAL_REWARDS = {
    signup: {
        referrer: { amount: 5, currency: 'USD' },
        referee: { amount: 3, currency: 'USD' }
    },
    first_deposit: {
        referrer: { amount: 10, currency: 'USD' },
        referee: { amount: 5, currency: 'USD' }
    },
    first_loan: {
        referrer: { amount: 15, currency: 'USD' },
        referee: { amount: 0, currency: 'USD' }
    },
    first_investment: {
        referrer: { amount: 20, currency: 'USD' },
        referee: { amount: 10, currency: 'USD' }
    }
};

// Tier multipliers based on total referrals
const TIER_MULTIPLIERS = {
    bronze: { min_referrals: 0, multiplier: 1.0 },
    silver: { min_referrals: 10, multiplier: 1.2 },
    gold: { min_referrals: 25, multiplier: 1.5 },
    platinum: { min_referrals: 50, multiplier: 2.0 },
    diamond: { min_referrals: 100, multiplier: 2.5 }
};

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

// @route   POST /api/referral-credits/apply-code
// @desc    Apply referral code during signup
// @access  Private
router.post('/apply-code', authenticateUser, [
    body('referral_code').isLength({ min: 6, max: 20 }).withMessage('Invalid referral code format'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { referral_code } = req.body;
        const userId = req.user.id;

        console.log(`🎯 Applying referral code ${referral_code} for user ${userId}`);

        // Check if user already used a referral code
        const { data: existingReferral, error: existingError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_user_id', userId)
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            throw existingError;
        }

        if (existingReferral) {
            return res.status(400).json({
                success: false,
                message: 'You have already used a referral code'
            });
        }

        // Find referrer by code
        const { data: referrer, error: referrerError } = await supabase
            .from('users')
            .select('id, email, referral_code')
            .eq('referral_code', referral_code)
            .single();

        if (referrerError || !referrer) {
            return res.status(404).json({
                success: false,
                message: 'Invalid referral code'
            });
        }

        if (referrer.id === userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot use your own referral code'
            });
        }

        // Create referral record
        const { data: referralRecord, error: referralError } = await supabase
            .from('referrals')
            .insert({
                referrer_user_id: referrer.id,
                referred_user_id: userId,
                referral_code: referral_code,
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (referralError) throw referralError;

        // Process signup rewards
        await this.processReferralReward(referrer.id, userId, 'signup', referralRecord.id);

        res.json({
            success: true,
            message: 'Referral code applied successfully',
            data: {
                referrer_email: referrer.email,
                signup_bonus: REFERRAL_REWARDS.signup.referee,
                referral_id: referralRecord.id
            }
        });

    } catch (error) {
        console.error('Apply referral code error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply referral code',
            error: error.message
        });
    }
});

// @route   GET /api/referral-credits/my-referrals
// @desc    Get user's referral statistics
// @access  Private
router.get('/my-referrals', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's referral code
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('referral_code')
            .eq('id', userId)
            .single();

        if (userError) throw userError;

        // Get referral statistics
        const { data: referrals, error: referralsError } = await supabase
            .from('referrals')
            .select(`
                *,
                referred_user:users!referrals_referred_user_id_fkey(email, created_at)
            `)
            .eq('referrer_user_id', userId)
            .order('created_at', { ascending: false });

        if (referralsError) throw referralsError;

        // Get referral rewards earned
        const { data: rewards, error: rewardsError } = await supabase
            .from('referral_rewards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (rewardsError) throw rewardsError;

        // Calculate totals
        const totalReferrals = referrals.length;
        const activeReferrals = referrals.filter(r => r.status === 'active').length;
        const totalEarned = rewards.reduce((sum, reward) => sum + parseFloat(reward.amount), 0);

        // Determine tier
        const tier = this.getUserTier(totalReferrals);

        // Calculate potential earnings for next milestones
        const nextMilestones = this.getNextMilestones(userId, referrals);

        res.json({
            success: true,
            data: {
                referral_code: user.referral_code,
                statistics: {
                    total_referrals: totalReferrals,
                    active_referrals: activeReferrals,
                    total_earned: totalEarned,
                    current_tier: tier,
                    tier_multiplier: TIER_MULTIPLIERS[tier].multiplier
                },
                referrals: referrals.map(ref => ({
                    id: ref.id,
                    referred_email: ref.referred_user.email,
                    status: ref.status,
                    created_at: ref.created_at,
                    milestones_completed: ref.milestones_completed || []
                })),
                rewards: rewards.map(reward => ({
                    id: reward.id,
                    amount: parseFloat(reward.amount),
                    currency: reward.currency,
                    reward_type: reward.reward_type,
                    created_at: reward.created_at,
                    description: reward.description
                })),
                next_milestones: nextMilestones,
                sharing_links: {
                    web: `${process.env.FRONTEND_URL}/signup?ref=${user.referral_code}`,
                    mobile: `zimcrowd://signup?ref=${user.referral_code}`
                }
            }
        });

    } catch (error) {
        console.error('Get referrals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get referral data',
            error: error.message
        });
    }
});

// @route   POST /api/referral-credits/milestone-achieved
// @desc    Process referral milestone achievement
// @access  Private
router.post('/milestone-achieved', authenticateUser, [
    body('milestone_type').isIn(['first_deposit', 'first_loan', 'first_investment']).withMessage('Invalid milestone type'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { milestone_type, amount } = req.body;
        const userId = req.user.id;

        console.log(`🎯 Processing milestone ${milestone_type} for user ${userId}`);

        // Check if user was referred
        const { data: referral, error: referralError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_user_id', userId)
            .eq('status', 'active')
            .single();

        if (referralError && referralError.code !== 'PGRST116') {
            throw referralError;
        }

        if (!referral) {
            return res.json({
                success: true,
                message: 'User was not referred, no milestone rewards to process'
            });
        }

        // Check if milestone already achieved
        const milestonesCompleted = referral.milestones_completed || [];
        if (milestonesCompleted.includes(milestone_type)) {
            return res.json({
                success: true,
                message: 'Milestone already achieved'
            });
        }

        // Process milestone rewards
        const rewardResult = await this.processReferralReward(
            referral.referrer_user_id, 
            userId, 
            milestone_type, 
            referral.id,
            amount
        );

        // Update referral record with completed milestone
        const updatedMilestones = [...milestonesCompleted, milestone_type];
        const { error: updateError } = await supabase
            .from('referrals')
            .update({
                milestones_completed: updatedMilestones,
                updated_at: new Date().toISOString()
            })
            .eq('id', referral.id);

        if (updateError) throw updateError;

        res.json({
            success: true,
            message: 'Milestone rewards processed successfully',
            data: {
                milestone_type: milestone_type,
                rewards_processed: rewardResult,
                total_milestones: updatedMilestones.length
            }
        });

    } catch (error) {
        console.error('Milestone achievement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process milestone',
            error: error.message
        });
    }
});

// @route   GET /api/referral-credits/leaderboard
// @desc    Get referral leaderboard
// @access  Private
router.get('/leaderboard', authenticateUser, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const period = req.query.period || 'all_time'; // all_time, monthly, weekly

        let dateFilter = '';
        if (period === 'monthly') {
            dateFilter = `AND created_at >= '${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}'`;
        } else if (period === 'weekly') {
            dateFilter = `AND created_at >= '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}'`;
        }

        // Get top referrers
        const { data: leaderboard, error } = await supabase
            .rpc('get_referral_leaderboard', {
                limit_count: limit,
                date_filter: dateFilter
            });

        if (error) throw error;

        // Get current user's rank
        const { data: userRank, error: rankError } = await supabase
            .rpc('get_user_referral_rank', {
                user_id: req.user.id,
                date_filter: dateFilter
            });

        if (rankError) throw rankError;

        res.json({
            success: true,
            data: {
                leaderboard: leaderboard.map((entry, index) => ({
                    rank: index + 1,
                    user_id: entry.user_id,
                    email: entry.email,
                    total_referrals: entry.total_referrals,
                    total_earned: parseFloat(entry.total_earned || 0),
                    tier: this.getUserTier(entry.total_referrals),
                    is_current_user: entry.user_id === req.user.id
                })),
                current_user_rank: userRank?.[0]?.rank || null,
                period: period
            }
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get leaderboard',
            error: error.message
        });
    }
});

// @route   POST /api/referral-credits/admin/bonus
// @desc    Admin award bonus referral credits
// @access  Admin
router.post('/admin/bonus', requireAdmin, [
    body('user_id').isUUID().withMessage('Valid user ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('currency').isIn(['USD', 'ZWL']).withMessage('Invalid currency'),
    body('reason').notEmpty().withMessage('Reason is required'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { user_id, amount, currency, reason } = req.body;
        const adminId = req.user.id;

        console.log(`👑 Admin bonus: $${amount} ${currency} to user ${user_id} by admin ${adminId}`);

        // Credit user wallet
        await walletService.creditWallet(
            user_id,
            amount,
            currency,
            `Admin bonus: ${reason}`
        );

        // Create referral reward record
        const { data: reward, error: rewardError } = await supabase
            .from('referral_rewards')
            .insert({
                user_id: user_id,
                amount: parseFloat(amount),
                currency: currency,
                reward_type: 'admin_bonus',
                description: `Admin bonus: ${reason}`,
                referral_id: null,
                metadata: {
                    awarded_by: adminId,
                    reason: reason,
                    timestamp: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (rewardError) throw rewardError;

        // Send notification
        await notificationService.sendNotification(user_id, {
            type: 'bonus_awarded',
            title: 'Bonus Awarded',
            message: `You've received a bonus of $${amount} ${currency}! ${reason}`,
            data: {
                amount: amount,
                currency: currency,
                reason: reason,
                reward_id: reward.id
            }
        });

        res.json({
            success: true,
            message: 'Bonus awarded successfully',
            data: {
                reward_id: reward.id,
                amount: amount,
                currency: currency,
                reason: reason
            }
        });

    } catch (error) {
        console.error('Admin bonus error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to award bonus',
            error: error.message
        });
    }
});

// Helper method to process referral rewards
router.processReferralReward = async function(referrerId, refereeId, rewardType, referralId, amount = null) {
    try {
        const rewards = REFERRAL_REWARDS[rewardType];
        if (!rewards) {
            throw new Error(`Invalid reward type: ${rewardType}`);
        }

        // Get referrer tier for multiplier
        const { data: referrerData, error: referrerError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_user_id', referrerId);

        if (referrerError) throw referrerError;

        const tier = this.getUserTier(referrerData.length);
        const multiplier = TIER_MULTIPLIERS[tier].multiplier;

        const results = [];

        // Process referrer reward
        if (rewards.referrer.amount > 0) {
            const referrerAmount = rewards.referrer.amount * multiplier;
            
            await walletService.creditWallet(
                referrerId,
                referrerAmount,
                rewards.referrer.currency,
                `Referral reward: ${rewardType} (${tier} tier)`
            );

            const { data: referrerReward, error: referrerRewardError } = await supabase
                .from('referral_rewards')
                .insert({
                    user_id: referrerId,
                    amount: referrerAmount,
                    currency: rewards.referrer.currency,
                    reward_type: rewardType,
                    description: `Referral reward: ${rewardType} (${tier} tier)`,
                    referral_id: referralId,
                    metadata: {
                        tier: tier,
                        multiplier: multiplier,
                        base_amount: rewards.referrer.amount
                    }
                })
                .select()
                .single();

            if (referrerRewardError) throw referrerRewardError;

            await notificationService.sendNotification(referrerId, {
                type: 'referral_reward',
                title: 'Referral Reward Earned',
                message: `You earned $${referrerAmount} ${rewards.referrer.currency} for a successful referral!`,
                data: {
                    amount: referrerAmount,
                    currency: rewards.referrer.currency,
                    reward_type: rewardType,
                    tier: tier
                }
            });

            results.push({
                user_id: referrerId,
                type: 'referrer',
                amount: referrerAmount,
                currency: rewards.referrer.currency
            });
        }

        // Process referee reward
        if (rewards.referee.amount > 0) {
            await walletService.creditWallet(
                refereeId,
                rewards.referee.amount,
                rewards.referee.currency,
                `Welcome bonus: ${rewardType}`
            );

            const { data: refereeReward, error: refereeRewardError } = await supabase
                .from('referral_rewards')
                .insert({
                    user_id: refereeId,
                    amount: rewards.referee.amount,
                    currency: rewards.referee.currency,
                    reward_type: `${rewardType}_bonus`,
                    description: `Welcome bonus: ${rewardType}`,
                    referral_id: referralId
                })
                .select()
                .single();

            if (refereeRewardError) throw refereeRewardError;

            await notificationService.sendNotification(refereeId, {
                type: 'welcome_bonus',
                title: 'Welcome Bonus',
                message: `You received $${rewards.referee.amount} ${rewards.referee.currency} as a welcome bonus!`,
                data: {
                    amount: rewards.referee.amount,
                    currency: rewards.referee.currency,
                    reward_type: rewardType
                }
            });

            results.push({
                user_id: refereeId,
                type: 'referee',
                amount: rewards.referee.amount,
                currency: rewards.referee.currency
            });
        }

        return results;
    } catch (error) {
        console.error('Process referral reward error:', error);
        throw error;
    }
};

// Helper method to get user tier
router.getUserTier = function(totalReferrals) {
    for (const [tier, config] of Object.entries(TIER_MULTIPLIERS).reverse()) {
        if (totalReferrals >= config.min_referrals) {
            return tier;
        }
    }
    return 'bronze';
};

// Helper method to get next milestones
router.getNextMilestones = function(userId, referrals) {
    const milestones = [];
    
    // Check for users who haven't completed certain milestones
    referrals.forEach(referral => {
        const completed = referral.milestones_completed || [];
        
        if (!completed.includes('first_deposit')) {
            milestones.push({
                type: 'first_deposit',
                description: 'Referred user makes first deposit',
                potential_reward: REFERRAL_REWARDS.first_deposit.referrer
            });
        }
        
        if (!completed.includes('first_loan')) {
            milestones.push({
                type: 'first_loan',
                description: 'Referred user takes first loan',
                potential_reward: REFERRAL_REWARDS.first_loan.referrer
            });
        }
        
        if (!completed.includes('first_investment')) {
            milestones.push({
                type: 'first_investment',
                description: 'Referred user makes first investment',
                potential_reward: REFERRAL_REWARDS.first_investment.referrer
            });
        }
    });
    
    return milestones;
};

module.exports = router;

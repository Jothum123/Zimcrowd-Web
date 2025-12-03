/**
 * Referral Automation Service
 * Handles automatic credit issuance when friends complete qualifying activities
 * 
 * REWARD STRUCTURE ($5 per qualifying activity):
 * - Advocate earns $5 when Friend: receives first loan, pays back first loan, funds first loan, makes first investment
 * - Friend earns $5 when they: receive first loan, fund first loan, make first investment
 * - Monthly limit: $1,000 for advocates
 * - Credit expiration: 90 days
 */

const { supabase, isSupabaseAvailable } = require('./supabase-client');
const { PLATFORM_FEES } = require('../constants/fees');
const WalletService = require('./wallet.service');
const NotificationService = require('./notification.service');

class ReferralAutomationService {
    
    constructor() {
        this.walletService = new WalletService();
        this.notificationService = new NotificationService();
        
        // Reward configuration from centralized constants
        this.REWARDS = PLATFORM_FEES.REFERRAL_CREDIT.rewards;
        this.MONTHLY_LIMIT = PLATFORM_FEES.REFERRAL_CREDIT.monthlyLimit;
        this.CREDIT_EXPIRY_DAYS = PLATFORM_FEES.REFERRAL_CREDIT.expirationDays;
    }
    
    /**
     * Process signup with referral code
     * Called when a new user signs up using a referral link
     * @param {string} newUserId - New user's ID
     * @param {string} referralCode - Referral code used
     */
    async processReferralSignup(newUserId, referralCode) {
        try {
            console.log(`🎯 Processing referral signup: ${newUserId} with code ${referralCode}`);
            
            // Find the referral code owner (advocate)
            const { data: referralLink, error: linkError } = await supabase
                .from('referral_links')
                .select('user_id, referral_code')
                .eq('referral_code', referralCode)
                .eq('is_active', true)
                .single();
            
            if (linkError || !referralLink) {
                // Try alternate table
                const { data: referralCode2, error: codeError } = await supabase
                    .from('referral_codes')
                    .select('user_id, referral_code')
                    .eq('referral_code', referralCode)
                    .single();
                
                if (codeError || !referralCode2) {
                    console.log('❌ Invalid referral code:', referralCode);
                    return { success: false, error: 'Invalid referral code' };
                }
                
                referralLink = referralCode2;
            }
            
            const advocateUserId = referralLink.user_id;
            
            // Prevent self-referral
            if (advocateUserId === newUserId) {
                return { success: false, error: 'Cannot use your own referral code' };
            }
            
            // Check if user already has a referral record
            const { data: existingReferral } = await supabase
                .from('referrals')
                .select('id')
                .eq('referred_user_id', newUserId)
                .single();
            
            if (existingReferral) {
                return { success: false, error: 'User already has a referral' };
            }
            
            // Create referral record
            const { data: referral, error: referralError } = await supabase
                .from('referrals')
                .insert({
                    referrer_id: advocateUserId,
                    referred_user_id: newUserId,
                    referral_code: referralCode,
                    status: 'active',
                    milestones_completed: [],
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (referralError) throw referralError;
            
            // Update referral link stats
            await supabase
                .from('referral_links')
                .update({
                    total_signups: supabase.raw('COALESCE(total_signups, 0) + 1'),
                    updated_at: new Date().toISOString()
                })
                .eq('referral_code', referralCode);
            
            // Notify advocate of new signup
            await this.notificationService.sendNotification(advocateUserId, {
                type: 'referral_signup',
                title: 'New Referral Signup! 🎉',
                message: 'Someone signed up using your referral link! You\'ll earn $5 when they complete their first loan.',
                data: { referral_id: referral.id }
            });
            
            console.log(`✅ Referral created: Advocate ${advocateUserId} → Friend ${newUserId}`);
            
            return {
                success: true,
                referral,
                advocateUserId,
                message: 'Referral recorded successfully'
            };
        } catch (error) {
            console.error('❌ Error processing referral signup:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Process qualifying activity and issue credits
     * Called when a referred user completes a qualifying activity
     * @param {string} friendUserId - Friend (referred user) ID
     * @param {string} activityType - Activity type: first_loan, loan_repaid, first_funding, first_investment
     */
    async processQualifyingActivity(friendUserId, activityType) {
        try {
            console.log(`🎯 Processing qualifying activity: ${activityType} for user ${friendUserId}`);
            
            // Get referral record
            const { data: referral, error: referralError } = await supabase
                .from('referrals')
                .select('*')
                .eq('referred_user_id', friendUserId)
                .eq('status', 'active')
                .single();
            
            if (referralError || !referral) {
                console.log('ℹ️ User was not referred, no rewards to process');
                return { success: true, message: 'User was not referred' };
            }
            
            const advocateUserId = referral.referrer_id;
            const milestonesCompleted = referral.milestones_completed || [];
            
            // Check if milestone already completed
            if (milestonesCompleted.includes(activityType)) {
                console.log(`ℹ️ Milestone ${activityType} already completed`);
                return { success: true, message: 'Milestone already completed' };
            }
            
            const results = {
                advocate: null,
                friend: null
            };
            
            // Map activity types
            const activityMap = {
                first_loan: { 
                    advocate: 'friend_first_loan', 
                    friend: 'first_loan',
                    advocateMsg: 'Your friend received their first loan!',
                    friendMsg: 'Congratulations on your first loan!'
                },
                loan_repaid: { 
                    advocate: 'friend_loan_repaid', 
                    friend: null,
                    advocateMsg: 'Your friend paid back their first loan!',
                    friendMsg: null
                },
                first_funding: { 
                    advocate: 'friend_first_funding', 
                    friend: 'first_funding',
                    advocateMsg: 'Your friend funded their first loan!',
                    friendMsg: 'Congratulations on funding your first loan!'
                },
                first_investment: { 
                    advocate: 'friend_first_investment', 
                    friend: 'first_investment',
                    advocateMsg: 'Your friend made their first investment!',
                    friendMsg: 'Congratulations on your first investment!'
                }
            };
            
            const mapping = activityMap[activityType];
            if (!mapping) {
                return { success: false, error: `Unknown activity type: ${activityType}` };
            }
            
            // Issue Advocate credit
            if (mapping.advocate) {
                results.advocate = await this.issueCredit(
                    advocateUserId,
                    this.REWARDS.advocate[mapping.advocate],
                    'referral_reward',
                    mapping.advocateMsg,
                    referral.id,
                    activityType
                );
            }
            
            // Issue Friend credit (if applicable)
            if (mapping.friend) {
                results.friend = await this.issueCredit(
                    friendUserId,
                    this.REWARDS.friend[mapping.friend],
                    'friend_bonus',
                    mapping.friendMsg,
                    referral.id,
                    activityType
                );
            }
            
            // Update milestones completed
            const updatedMilestones = [...milestonesCompleted, activityType];
            await supabase
                .from('referrals')
                .update({
                    milestones_completed: updatedMilestones,
                    earnings: supabase.raw(`COALESCE(earnings, 0) + ${this.REWARDS.advocate[mapping.advocate] || 0}`),
                    updated_at: new Date().toISOString()
                })
                .eq('id', referral.id);
            
            // Update referral link conversion count if all milestones completed
            if (updatedMilestones.length >= 4) {
                await supabase
                    .from('referral_links')
                    .update({
                        total_conversions: supabase.raw('COALESCE(total_conversions, 0) + 1')
                    })
                    .eq('referral_code', referral.referral_code);
            }
            
            console.log(`✅ Processed ${activityType}: Advocate earned $${results.advocate?.amount || 0}, Friend earned $${results.friend?.amount || 0}`);
            
            return {
                success: true,
                results,
                milestonesCompleted: updatedMilestones
            };
        } catch (error) {
            console.error('❌ Error processing qualifying activity:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Issue credit to user's wallet
     */
    async issueCredit(userId, amount, creditType, description, referralId, activityType) {
        try {
            if (!amount || amount <= 0) {
                return { success: false, amount: 0 };
            }
            
            // Check monthly limit for advocates
            if (creditType === 'referral_reward') {
                const monthlyEarned = await this.getMonthlyEarnings(userId);
                if (monthlyEarned >= this.MONTHLY_LIMIT) {
                    console.log(`⚠️ User ${userId} has reached monthly limit of $${this.MONTHLY_LIMIT}`);
                    
                    await this.notificationService.sendNotification(userId, {
                        type: 'monthly_limit_reached',
                        title: 'Monthly Limit Reached',
                        message: `You've reached your monthly referral earnings limit of $${this.MONTHLY_LIMIT}. Your limit resets next month!`
                    });
                    
                    return { success: false, amount: 0, reason: 'Monthly limit reached' };
                }
            }
            
            // Calculate expiry date
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + this.CREDIT_EXPIRY_DAYS);
            
            // Create credit record
            const { data: credit, error: creditError } = await supabase
                .from('referral_credits')
                .insert({
                    user_id: userId,
                    credit_amount: amount,
                    credit_type: creditType,
                    activity_type: activityType,
                    source_referral_id: referralId,
                    source_description: description,
                    expiry_date: expiryDate.toISOString(),
                    status: 'active'
                })
                .select()
                .single();
            
            if (creditError) throw creditError;
            
            // Credit user's wallet
            await this.walletService.creditWallet(
                userId,
                amount,
                'USD',
                `Referral Credit: ${description}`
            );
            
            // Create referral earnings record
            await supabase
                .from('referral_earnings')
                .insert({
                    user_id: userId,
                    amount: amount,
                    currency: 'USD',
                    referral_id: referralId,
                    activity_type: activityType,
                    description: description
                });
            
            // Log transaction
            await supabase
                .from('credit_transactions')
                .insert({
                    user_id: userId,
                    credit_id: credit.id,
                    transaction_type: 'earned',
                    amount: amount,
                    description: description
                });
            
            // Send notification
            await this.notificationService.sendNotification(userId, {
                type: 'credit_earned',
                title: 'You Earned $' + amount + '! 🎉',
                message: description,
                data: {
                    amount: amount,
                    credit_id: credit.id,
                    expiry_date: expiryDate.toISOString()
                }
            });
            
            console.log(`💰 Credit issued: $${amount} to user ${userId} for ${activityType}`);
            
            return {
                success: true,
                amount: amount,
                credit_id: credit.id
            };
        } catch (error) {
            console.error('❌ Error issuing credit:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get user's monthly earnings
     */
    async getMonthlyEarnings(userId) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: earnings } = await supabase
            .from('referral_earnings')
            .select('amount')
            .eq('user_id', userId)
            .gte('created_at', startOfMonth.toISOString());
        
        return earnings?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
    }
    
    /**
     * Daily cron job: Expire credits
     */
    async runDailyCreditExpiration() {
        try {
            console.log('⏰ Running daily credit expiration job...');
            
            const now = new Date().toISOString();
            
            // Get expired credits
            const { data: expiredCredits, error: fetchError } = await supabase
                .from('referral_credits')
                .select('*')
                .eq('status', 'active')
                .lt('expiry_date', now);
            
            if (fetchError) throw fetchError;
            
            if (!expiredCredits || expiredCredits.length === 0) {
                console.log('✅ No credits to expire');
                return { success: true, expiredCount: 0 };
            }
            
            // Update expired credits
            const { error: updateError } = await supabase
                .from('referral_credits')
                .update({
                    status: 'expired',
                    expired_at: now,
                    updated_at: now
                })
                .eq('status', 'active')
                .lt('expiry_date', now);
            
            if (updateError) throw updateError;
            
            // Log expiration transactions and notify users
            for (const credit of expiredCredits) {
                await supabase
                    .from('credit_transactions')
                    .insert({
                        user_id: credit.user_id,
                        credit_id: credit.id,
                        transaction_type: 'expired',
                        amount: parseFloat(credit.remaining_amount || credit.credit_amount),
                        description: 'Credit expired'
                    });
                
                // Deduct from wallet
                await this.walletService.debitWallet(
                    credit.user_id,
                    parseFloat(credit.remaining_amount || credit.credit_amount),
                    'USD',
                    'Referral credit expired'
                );
            }
            
            console.log(`✅ Expired ${expiredCredits.length} credits`);
            
            return {
                success: true,
                expiredCount: expiredCredits.length
            };
        } catch (error) {
            console.error('❌ Error in credit expiration job:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Daily cron job: Send expiration warnings
     */
    async runExpirationWarnings() {
        try {
            console.log('📧 Running expiration warning job...');
            
            const warningDays = [30, 14, 7, 1];
            let totalWarnings = 0;
            
            for (const days of warningDays) {
                const warningDate = new Date();
                warningDate.setDate(warningDate.getDate() + days);
                const warningDateStr = warningDate.toISOString().split('T')[0];
                
                // Get credits expiring on this date
                const { data: expiringCredits } = await supabase
                    .from('referral_credits')
                    .select('user_id, credit_amount, remaining_amount, expiry_date')
                    .eq('status', 'active')
                    .gte('expiry_date', `${warningDateStr}T00:00:00`)
                    .lt('expiry_date', `${warningDateStr}T23:59:59`);
                
                if (!expiringCredits || expiringCredits.length === 0) continue;
                
                // Group by user
                const userCredits = {};
                for (const credit of expiringCredits) {
                    if (!userCredits[credit.user_id]) {
                        userCredits[credit.user_id] = 0;
                    }
                    userCredits[credit.user_id] += parseFloat(credit.remaining_amount || credit.credit_amount);
                }
                
                // Send notifications
                for (const [userId, amount] of Object.entries(userCredits)) {
                    await this.notificationService.sendNotification(userId, {
                        type: 'credit_expiring',
                        title: `Credits Expiring in ${days} Day${days > 1 ? 's' : ''}! ⚠️`,
                        message: `$${amount.toFixed(2)} in referral credits will expire in ${days} day${days > 1 ? 's' : ''}. Use them before they expire!`,
                        data: {
                            amount: amount,
                            days_remaining: days,
                            expiry_date: warningDateStr
                        }
                    });
                    totalWarnings++;
                }
            }
            
            console.log(`✅ Sent ${totalWarnings} expiration warnings`);
            
            return {
                success: true,
                warningsSent: totalWarnings
            };
        } catch (error) {
            console.error('❌ Error in expiration warnings job:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Monthly cron job: Calculate leaderboard
     */
    async runMonthlyLeaderboardCalculation() {
        try {
            console.log('🏆 Running monthly leaderboard calculation...');
            
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            
            // Get top referrers this month
            const { data: topReferrers, error } = await supabase
                .from('referral_earnings')
                .select('user_id, amount')
                .gte('created_at', startOfMonth.toISOString())
                .order('amount', { ascending: false });
            
            if (error) throw error;
            
            // Aggregate by user
            const userTotals = {};
            for (const earning of topReferrers || []) {
                if (!userTotals[earning.user_id]) {
                    userTotals[earning.user_id] = 0;
                }
                userTotals[earning.user_id] += parseFloat(earning.amount);
            }
            
            // Sort and rank
            const leaderboard = Object.entries(userTotals)
                .map(([userId, total]) => ({ userId, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10)
                .map((entry, index) => ({
                    rank: index + 1,
                    userId: entry.userId,
                    totalEarnings: entry.total
                }));
            
            // Store leaderboard
            const monthKey = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}`;
            
            await supabase
                .from('referral_leaderboards')
                .upsert({
                    month: monthKey,
                    leaderboard: leaderboard,
                    calculated_at: new Date().toISOString()
                }, { onConflict: 'month' });
            
            // Award bonuses to top 3
            const bonuses = [
                { rank: 1, amount: 50, badge: 'Referral Champion' },
                { rank: 2, amount: 30, badge: 'Top Referrer' },
                { rank: 3, amount: 20, badge: 'Referral Star' }
            ];
            
            for (const bonus of bonuses) {
                const winner = leaderboard.find(l => l.rank === bonus.rank);
                if (winner) {
                    await this.issueCredit(
                        winner.userId,
                        bonus.amount,
                        'leaderboard_bonus',
                        `Monthly Leaderboard #${bonus.rank} - ${bonus.badge}`,
                        null,
                        'leaderboard_reward'
                    );
                }
            }
            
            console.log(`✅ Leaderboard calculated for ${monthKey}`);
            
            return {
                success: true,
                month: monthKey,
                leaderboard
            };
        } catch (error) {
            console.error('❌ Error in leaderboard calculation:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Fraud detection monitoring
     * Checks for suspicious referral patterns
     */
    async runFraudDetection() {
        try {
            console.log('🔍 Running fraud detection monitoring...');
            
            const flaggedUsers = [];
            const now = new Date();
            const last24Hours = new Date(now - 24 * 60 * 60 * 1000).toISOString();
            const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
            
            // Check 1: Too many referrals in 24 hours (max 10)
            const { data: recentReferrals } = await supabase
                .from('referrals')
                .select('referrer_id')
                .gte('created_at', last24Hours);
            
            const referralCounts = {};
            for (const ref of recentReferrals || []) {
                referralCounts[ref.referrer_id] = (referralCounts[ref.referrer_id] || 0) + 1;
            }
            
            for (const [userId, count] of Object.entries(referralCounts)) {
                if (count > 10) {
                    flaggedUsers.push({
                        userId,
                        reason: 'excessive_referrals_24h',
                        details: `${count} referrals in 24 hours`
                    });
                }
            }
            
            // Check 2: Same IP address for multiple signups
            const { data: ipClusters } = await supabase
                .from('referral_clicks')
                .select('ip_address, referral_code')
                .gte('created_at', last7Days);
            
            const ipSignups = {};
            for (const click of ipClusters || []) {
                if (click.ip_address) {
                    if (!ipSignups[click.ip_address]) {
                        ipSignups[click.ip_address] = new Set();
                    }
                    ipSignups[click.ip_address].add(click.referral_code);
                }
            }
            
            for (const [ip, codes] of Object.entries(ipSignups)) {
                if (codes.size > 5) {
                    flaggedUsers.push({
                        ip,
                        reason: 'multiple_signups_same_ip',
                        details: `${codes.size} different referral codes from same IP`
                    });
                }
            }
            
            // Check 3: Referred users with no activity after 7 days
            const { data: inactiveReferrals } = await supabase
                .from('referrals')
                .select('id, referrer_id, referred_user_id, created_at')
                .lt('created_at', last7Days)
                .eq('milestones_completed', '[]');
            
            if (inactiveReferrals && inactiveReferrals.length > 20) {
                // Group by referrer
                const referrerInactive = {};
                for (const ref of inactiveReferrals) {
                    referrerInactive[ref.referrer_id] = (referrerInactive[ref.referrer_id] || 0) + 1;
                }
                
                for (const [userId, count] of Object.entries(referrerInactive)) {
                    if (count > 10) {
                        flaggedUsers.push({
                            userId,
                            reason: 'many_inactive_referrals',
                            details: `${count} referrals with no activity`
                        });
                    }
                }
            }
            
            // Store flagged users for review
            if (flaggedUsers.length > 0) {
                for (const flag of flaggedUsers) {
                    await supabase
                        .from('fraud_flags')
                        .insert({
                            user_id: flag.userId || null,
                            ip_address: flag.ip || null,
                            reason: flag.reason,
                            details: flag.details,
                            status: 'pending_review',
                            created_at: new Date().toISOString()
                        });
                }
                
                // Notify admins
                console.log(`⚠️ Flagged ${flaggedUsers.length} suspicious activities`);
            }
            
            console.log(`✅ Fraud detection complete. ${flaggedUsers.length} flags raised.`);
            
            return {
                success: true,
                flaggedCount: flaggedUsers.length,
                flags: flaggedUsers
            };
        } catch (error) {
            console.error('❌ Error in fraud detection:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Run all scheduled jobs
     * Call this from your cron scheduler
     */
    async runScheduledJobs(jobType) {
        const results = {};
        
        switch (jobType) {
            case 'daily':
                results.expiration = await this.runDailyCreditExpiration();
                results.warnings = await this.runExpirationWarnings();
                results.fraud = await this.runFraudDetection();
                break;
            case 'monthly':
                results.leaderboard = await this.runMonthlyLeaderboardCalculation();
                break;
            case 'all':
                results.expiration = await this.runDailyCreditExpiration();
                results.warnings = await this.runExpirationWarnings();
                results.fraud = await this.runFraudDetection();
                results.leaderboard = await this.runMonthlyLeaderboardCalculation();
                break;
            default:
                return { success: false, error: 'Invalid job type' };
        }
        
        return { success: true, results };
    }
}

module.exports = ReferralAutomationService;

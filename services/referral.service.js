const { supabase, isSupabaseAvailable } = require('./supabase-client');
const crypto = require('crypto');
const { PLATFORM_FEES } = require('../constants/fees');

/**
 * Referral Service
 * Manages referral links, tracking, and conversions
 * 
 * REWARD STRUCTURE (per qualifying activity):
 * - Advocate earns $5 when Friend: receives first loan, pays back first loan, funds first loan, makes first investment
 * - Friend earns $5 when they: receive first loan, fund first loan, make first investment
 * - Monthly limit: $1,000 for advocates
 */
class ReferralService {
    
    constructor() {
        this.BASE_URL = process.env.BASE_URL || 'https://zimcrowd.co.zw';
        this.REFERRAL_PATH = '/ref';
        
        // Reward amounts from centralized fee constants
        this.REWARDS = PLATFORM_FEES.REFERRAL_CREDIT.rewards;
        this.MONTHLY_LIMIT = PLATFORM_FEES.REFERRAL_CREDIT.monthlyLimit;
        this.CREDIT_EXPIRY_DAYS = PLATFORM_FEES.REFERRAL_CREDIT.expirationDays;
        
        // Qualifying activities
        this.QUALIFYING_ACTIVITIES = {
            advocate: ['friend_first_loan', 'friend_loan_repaid', 'friend_first_funding', 'friend_first_investment'],
            friend: ['first_loan', 'first_funding', 'first_investment']
        };
        
        // UTM parameters
        this.UTM_PARAMS = {
            source: 'referral',
            medium: 'link',
            campaign: 'user_acquisition'
        };
    }
    
    /**
     * Generate unique referral code
     * Format: ZIM_REF_{random}
     */
    generateReferralCode(userId) {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `ZIM_REF_${timestamp}_${random}`;
    }
    
    /**
     * Create referral link for user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Referral link details
     */
    async createReferralLink(userId) {
        try {
            // Check if user already has a referral link
            const { data: existing } = await supabase
                .from('referral_links')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .single();
            
            if (existing) {
                return {
                    success: true,
                    referralLink: existing,
                    message: 'Existing referral link retrieved'
                };
            }
            
            // Generate new referral code
            const referralCode = this.generateReferralCode(userId);
            
            // Build referral URL
            const linkUrl = `${this.BASE_URL}${this.REFERRAL_PATH}/${referralCode}?utm_source=${this.UTM_PARAMS.source}&utm_medium=${this.UTM_PARAMS.medium}&utm_campaign=${this.UTM_PARAMS.campaign}`;
            
            // Create referral link
            const { data, error } = await supabase
                .from('referral_links')
                .insert({
                    user_id: userId,
                    referral_code: referralCode,
                    link_url: linkUrl,
                    utm_source: this.UTM_PARAMS.source,
                    utm_medium: this.UTM_PARAMS.medium,
                    utm_campaign: this.UTM_PARAMS.campaign
                })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log(`✅ Referral link created for user ${userId}: ${referralCode}`);
            
            return {
                success: true,
                referralLink: data,
                message: 'Referral link created successfully'
            };
        } catch (error) {
            console.error('❌ Error creating referral link:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Track referral link click
     * @param {string} referralCode - Referral code
     * @param {Object} trackingData - Click tracking data
     * @returns {Promise<Object>} Click tracking result
     */
    async trackClick(referralCode, trackingData = {}) {
        try {
            // Get referral link
            const { data: referralLink } = await supabase
                .from('referral_links')
                .select('*')
                .eq('referral_code', referralCode)
                .eq('is_active', true)
                .single();
            
            if (!referralLink) {
                return {
                    success: false,
                    error: 'Invalid referral code'
                };
            }
            
            // Record click
            const { data: click, error } = await supabase
                .from('referral_clicks')
                .insert({
                    referral_link_id: referralLink.id,
                    ip_address: trackingData.ipAddress,
                    user_agent: trackingData.userAgent,
                    device_type: trackingData.deviceType,
                    browser: trackingData.browser,
                    operating_system: trackingData.operatingSystem,
                    country: trackingData.country,
                    city: trackingData.city,
                    region: trackingData.region
                })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log(`👆 Click tracked for referral ${referralCode}`);
            
            return {
                success: true,
                click,
                referralLink
            };
        } catch (error) {
            console.error('❌ Error tracking click:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Create referral conversion when referee signs up
     * @param {string} referralCode - Referral code used
     * @param {string} refereeUserId - New user ID
     * @returns {Promise<Object>} Conversion result
     */
    async createConversion(referralCode, refereeUserId) {
        try {
            // Get referral link
            const { data: referralLink } = await supabase
                .from('referral_links')
                .select('*')
                .eq('referral_code', referralCode)
                .eq('is_active', true)
                .single();
            
            if (!referralLink) {
                return {
                    success: false,
                    error: 'Invalid referral code'
                };
            }
            
            // Check if referee already has a conversion
            const { data: existing } = await supabase
                .from('referral_conversions')
                .select('*')
                .eq('referee_user_id', refereeUserId)
                .single();
            
            if (existing) {
                return {
                    success: false,
                    error: 'User already referred'
                };
            }
            
            // Create conversion record (no credits yet - credits issued per qualifying activity)
            const { data: conversion, error } = await supabase
                .from('referral_conversions')
                .insert({
                    referral_link_id: referralLink.id,
                    referrer_user_id: referralLink.user_id,
                    referee_user_id: refereeUserId,
                    status: 'signed_up',
                    signed_up_at: new Date().toISOString(),
                    referee_credit_amount: 0,  // Credits issued per activity
                    referrer_credit_amount: 0  // Credits issued per activity
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Update click record if exists
            await supabase
                .from('referral_clicks')
                .update({
                    converted_to_signup: true,
                    referee_user_id: refereeUserId
                })
                .eq('referral_link_id', referralLink.id)
                .is('referee_user_id', null)
                .order('clicked_at', { ascending: false })
                .limit(1);
            
            console.log(`🎉 Conversion created: ${referralLink.user_id} → ${refereeUserId}`);
            
            return {
                success: true,
                conversion
            };
        } catch (error) {
            console.error('❌ Error creating conversion:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Issue credit for a qualifying activity
     * $5 per qualifying activity for both Advocate and Friend
     * 
     * @param {string} userId - User ID receiving credit
     * @param {string} activityType - Type of qualifying activity
     * @param {string} role - 'advocate' or 'friend'
     * @param {string} refereeUserId - Referee user ID (for advocate credits)
     * @returns {Promise<Object>} Credit issuance result
     */
    async issueActivityCredit(userId, activityType, role, refereeUserId = null) {
        try {
            // Validate activity type
            const validActivities = this.QUALIFYING_ACTIVITIES[role];
            if (!validActivities || !validActivities.includes(activityType)) {
                return {
                    success: false,
                    error: `Invalid activity type: ${activityType} for role: ${role}`
                };
            }
            
            // Get reward amount
            const rewardAmount = this.REWARDS[role][activityType];
            if (!rewardAmount) {
                return {
                    success: false,
                    error: `No reward configured for ${activityType}`
                };
            }
            
            // Check monthly limit for advocates
            if (role === 'advocate') {
                const monthlyEarned = await this.getMonthlyEarnings(userId);
                if (monthlyEarned >= this.MONTHLY_LIMIT) {
                    return {
                        success: false,
                        error: `Monthly limit of $${this.MONTHLY_LIMIT} reached`,
                        monthlyEarned,
                        monthlyLimit: this.MONTHLY_LIMIT
                    };
                }
            }
            
            // Check if credit already issued for this activity
            const activityKey = `${role}_${activityType}_${refereeUserId || userId}`;
            const { data: existingCredit } = await supabase
                .from('referral_credits')
                .select('id')
                .eq('user_id', userId)
                .eq('activity_key', activityKey)
                .single();
            
            if (existingCredit) {
                return {
                    success: false,
                    error: 'Credit already issued for this activity'
                };
            }
            
            // Calculate expiry date
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + this.CREDIT_EXPIRY_DAYS);
            
            // Create credit
            const { data: credit, error } = await supabase
                .from('referral_credits')
                .insert({
                    user_id: userId,
                    credit_amount: rewardAmount,
                    credit_type: role === 'advocate' ? 'referral_reward' : 'friend_bonus',
                    activity_type: activityType,
                    activity_key: activityKey,
                    source_description: this.getActivityDescription(activityType, role),
                    expiry_date: expiryDate.toISOString(),
                    status: 'active'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Log transaction
            await supabase
                .from('credit_transactions')
                .insert({
                    user_id: userId,
                    credit_id: credit.id,
                    transaction_type: 'earned',
                    amount: rewardAmount,
                    description: this.getActivityDescription(activityType, role)
                });
            
            console.log(`💰 ${role} credit issued: $${rewardAmount} to ${userId} for ${activityType}`);
            
            return {
                success: true,
                credit,
                amount: rewardAmount,
                activityType,
                role
            };
        } catch (error) {
            console.error('❌ Error issuing activity credit:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get activity description for credit
     */
    getActivityDescription(activityType, role) {
        const descriptions = {
            advocate: {
                friend_first_loan: 'Reward: Your friend received their first loan',
                friend_loan_repaid: 'Reward: Your friend paid back their first loan',
                friend_first_funding: 'Reward: Your friend funded their first loan',
                friend_first_investment: 'Reward: Your friend made their first investment'
            },
            friend: {
                first_loan: 'Bonus: You received your first loan',
                first_funding: 'Bonus: You funded your first loan',
                first_investment: 'Bonus: You made your first investment'
            }
        };
        return descriptions[role]?.[activityType] || `${role} ${activityType} credit`;
    }
    
    /**
     * Get user's monthly earnings (for limit checking)
     */
    async getMonthlyEarnings(userId) {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { data: credits } = await supabase
            .from('referral_credits')
            .select('credit_amount')
            .eq('user_id', userId)
            .eq('credit_type', 'referral_reward')
            .gte('created_at', startOfMonth.toISOString());
        
        return credits?.reduce((sum, c) => sum + parseFloat(c.credit_amount), 0) || 0;
    }
    
    /**
     * Issue Friend credit when they complete a qualifying activity
     * Activities: first_loan, first_funding, first_investment
     * @param {string} friendUserId - Friend user ID
     * @param {string} activityType - Activity type
     */
    async issueFriendCredit(friendUserId, activityType) {
        return this.issueActivityCredit(friendUserId, activityType, 'friend');
    }
    
    /**
     * Issue Advocate credit when their Friend completes a qualifying activity
     * Activities: friend_first_loan, friend_loan_repaid, friend_first_funding, friend_first_investment
     * @param {string} friendUserId - Friend user ID (to find advocate)
     * @param {string} activityType - Activity type
     */
    async issueAdvocateCredit(friendUserId, activityType) {
        try {
            // Get conversion to find advocate
            const { data: conversion } = await supabase
                .from('referral_conversions')
                .select('referrer_user_id')
                .eq('referee_user_id', friendUserId)
                .single();
            
            if (!conversion) {
                return {
                    success: false,
                    error: 'No referral found for this user'
                };
            }
            
            return this.issueActivityCredit(
                conversion.referrer_user_id, 
                activityType, 
                'advocate', 
                friendUserId
            );
        } catch (error) {
            console.error('❌ Error issuing advocate credit:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Process qualifying activity - issues credits to both Friend and Advocate
     * @param {string} friendUserId - Friend user ID
     * @param {string} activityType - Activity type (first_loan, first_funding, first_investment, loan_repaid)
     */
    async processQualifyingActivity(friendUserId, activityType) {
        const results = {
            friend: null,
            advocate: null
        };
        
        // Map activity to friend and advocate activity types
        const activityMap = {
            first_loan: { friend: 'first_loan', advocate: 'friend_first_loan' },
            loan_repaid: { friend: null, advocate: 'friend_loan_repaid' },
            first_funding: { friend: 'first_funding', advocate: 'friend_first_funding' },
            first_investment: { friend: 'first_investment', advocate: 'friend_first_investment' }
        };
        
        const mapping = activityMap[activityType];
        if (!mapping) {
            return {
                success: false,
                error: `Unknown activity type: ${activityType}`
            };
        }
        
        // Issue Friend credit (if applicable)
        if (mapping.friend) {
            results.friend = await this.issueFriendCredit(friendUserId, mapping.friend);
        }
        
        // Issue Advocate credit
        results.advocate = await this.issueAdvocateCredit(friendUserId, mapping.advocate);
        
        console.log(`🎉 Processed qualifying activity: ${activityType} for ${friendUserId}`);
        
        return {
            success: true,
            results
        };
    }
    
    /**
     * Get user's referral statistics
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Referral stats
     */
    async getUserStats(userId) {
        try {
            // Get referral link
            const { data: referralLink } = await supabase
                .from('referral_links')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (!referralLink) {
                return {
                    success: true,
                    stats: {
                        hasReferralLink: false,
                        referralCode: null,
                        totalClicks: 0,
                        totalSignups: 0,
                        totalConversions: 0,
                        conversionRate: 0,
                        creditsEarned: 0,
                        creditsUsed: 0,
                        availableCredits: 0
                    }
                };
            }
            
            // Get credits
            const { data: credits } = await supabase
                .from('referral_credits')
                .select('credit_amount, used_amount, remaining_amount')
                .eq('user_id', userId);
            
            const totalCreditsEarned = credits?.reduce((sum, c) => sum + parseFloat(c.credit_amount), 0) || 0;
            const totalCreditsUsed = credits?.reduce((sum, c) => sum + parseFloat(c.used_amount), 0) || 0;
            const availableCredits = credits?.reduce((sum, c) => sum + parseFloat(c.remaining_amount), 0) || 0;
            
            // Calculate conversion rate
            const conversionRate = referralLink.total_clicks > 0
                ? ((referralLink.total_conversions / referralLink.total_clicks) * 100).toFixed(2)
                : 0;
            
            return {
                success: true,
                stats: {
                    hasReferralLink: true,
                    referralCode: referralLink.referral_code,
                    referralUrl: referralLink.link_url,
                    totalClicks: referralLink.total_clicks,
                    totalSignups: referralLink.total_signups,
                    totalConversions: referralLink.total_conversions,
                    conversionRate: parseFloat(conversionRate),
                    creditsEarned: totalCreditsEarned,
                    creditsUsed: totalCreditsUsed,
                    availableCredits: availableCredits
                }
            };
        } catch (error) {
            console.error('❌ Error getting user stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get social sharing templates
     * @param {string} referralUrl - Referral URL
     * @returns {Object} Sharing templates
     */
    getSharingTemplates(referralUrl) {
        return {
            whatsapp: `Join Zimcrowd and get $5 credit when you sign up! Plus, I earn $25 when you lend. Use my link: ${referralUrl}`,
            facebook: `Get $5 in Zimcrowd credits when you sign up! 💰 Join Zimbabwe's trusted P2P lending platform. ${referralUrl} #Zimcrowd #FinancialFreedom`,
            twitter: `Get $5 credit on @ZimcrowdZW when you sign up! Join me on Zimbabwe's leading P2P lending platform: ${referralUrl}`,
            linkedin: `I'm using Zimcrowd for P2P lending in Zimbabwe. Join me and get $5 credit when you sign up: ${referralUrl}`,
            email: {
                subject: 'Join me on Zimcrowd - Get $5 Credit',
                body: `Hi!\n\nI've been using Zimcrowd for peer-to-peer lending and I think you'd find it useful.\n\nWhen you sign up using my referral link, you'll get $5 in platform credits to use towards loan fees.\n\nJoin here: ${referralUrl}\n\nLet me know if you have any questions!\n\nBest regards`
            },
            sms: `Join Zimcrowd & get $5 credit! Use my link: ${referralUrl}`
        };
    }
}

module.exports = ReferralService;

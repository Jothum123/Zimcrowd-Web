const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Referral Service
 * Manages referral links, tracking, and conversions
 */
class ReferralService {
    
    constructor() {
        this.BASE_URL = process.env.BASE_URL || 'https://zimcrowd.co.zw';
        this.REFERRAL_PATH = '/ref';
        
        // Reward amounts
        this.REWARDS = {
            REFEREE_SIGNUP: 5.00,           // $5 for referee on signup
            REFERRER_LENDING: 25.00,        // $25 for referrer when referee lends
            CREDIT_EXPIRY_DAYS: 90          // 90 days expiration
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
            
            // Create conversion record
            const { data: conversion, error } = await supabase
                .from('referral_conversions')
                .insert({
                    referral_link_id: referralLink.id,
                    referrer_user_id: referralLink.user_id,
                    referee_user_id: refereeUserId,
                    status: 'signed_up',
                    signed_up_at: new Date().toISOString(),
                    referee_credit_amount: this.REWARDS.REFEREE_SIGNUP,
                    referrer_credit_amount: this.REWARDS.REFERRER_LENDING
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
     * Issue referee signup credit ($5)
     * @param {string} conversionId - Conversion ID
     * @returns {Promise<Object>} Credit issuance result
     */
    async issueRefereeCredit(conversionId) {
        try {
            // Get conversion
            const { data: conversion } = await supabase
                .from('referral_conversions')
                .select('*')
                .eq('id', conversionId)
                .single();
            
            if (!conversion) {
                return {
                    success: false,
                    error: 'Conversion not found'
                };
            }
            
            if (conversion.referee_credit_issued) {
                return {
                    success: false,
                    error: 'Credit already issued'
                };
            }
            
            // Calculate expiry date (90 days)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + this.REWARDS.CREDIT_EXPIRY_DAYS);
            
            // Create credit
            const { data: credit, error } = await supabase
                .from('referral_credits')
                .insert({
                    user_id: conversion.referee_user_id,
                    credit_amount: this.REWARDS.REFEREE_SIGNUP,
                    credit_type: 'signup_bonus',
                    source_conversion_id: conversionId,
                    source_description: 'Signup bonus for joining via referral',
                    expiry_date: expiryDate.toISOString(),
                    status: 'active'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Update conversion
            await supabase
                .from('referral_conversions')
                .update({
                    referee_credit_issued: true,
                    status: 'verified'
                })
                .eq('id', conversionId);
            
            // Log transaction
            await supabase
                .from('credit_transactions')
                .insert({
                    user_id: conversion.referee_user_id,
                    credit_id: credit.id,
                    transaction_type: 'earned',
                    amount: this.REWARDS.REFEREE_SIGNUP,
                    description: 'Signup bonus credit earned'
                });
            
            console.log(`💰 Referee credit issued: $${this.REWARDS.REFEREE_SIGNUP} to ${conversion.referee_user_id}`);
            
            return {
                success: true,
                credit
            };
        } catch (error) {
            console.error('❌ Error issuing referee credit:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Issue referrer credit ($25) when referee completes first lending
     * @param {string} refereeUserId - Referee user ID
     * @returns {Promise<Object>} Credit issuance result
     */
    async issueReferrerCredit(refereeUserId) {
        try {
            // Get conversion
            const { data: conversion } = await supabase
                .from('referral_conversions')
                .select('*')
                .eq('referee_user_id', refereeUserId)
                .single();
            
            if (!conversion) {
                return {
                    success: false,
                    error: 'Conversion not found'
                };
            }
            
            if (conversion.referrer_credit_issued) {
                return {
                    success: false,
                    error: 'Credit already issued'
                };
            }
            
            // Calculate expiry date (90 days)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + this.REWARDS.CREDIT_EXPIRY_DAYS);
            
            // Create credit
            const { data: credit, error } = await supabase
                .from('referral_credits')
                .insert({
                    user_id: conversion.referrer_user_id,
                    credit_amount: this.REWARDS.REFERRER_LENDING,
                    credit_type: 'referral_reward',
                    source_conversion_id: conversion.id,
                    source_description: `Referral reward for ${refereeUserId} completing first lending`,
                    expiry_date: expiryDate.toISOString(),
                    status: 'active'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Update conversion
            await supabase
                .from('referral_conversions')
                .update({
                    referrer_credit_issued: true,
                    status: 'completed',
                    first_lending_at: new Date().toISOString(),
                    completed_at: new Date().toISOString()
                })
                .eq('id', conversion.id);
            
            // Update referral link conversion count
            await supabase
                .from('referral_links')
                .update({
                    total_conversions: supabase.raw('total_conversions + 1')
                })
                .eq('id', conversion.referral_link_id);
            
            // Log transaction
            await supabase
                .from('credit_transactions')
                .insert({
                    user_id: conversion.referrer_user_id,
                    credit_id: credit.id,
                    transaction_type: 'earned',
                    amount: this.REWARDS.REFERRER_LENDING,
                    description: 'Referral reward credit earned'
                });
            
            console.log(`💰 Referrer credit issued: $${this.REWARDS.REFERRER_LENDING} to ${conversion.referrer_user_id}`);
            
            return {
                success: true,
                credit
            };
        } catch (error) {
            console.error('❌ Error issuing referrer credit:', error);
            return {
                success: false,
                error: error.message
            };
        }
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

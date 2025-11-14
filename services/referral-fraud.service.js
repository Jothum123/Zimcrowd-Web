const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Referral Fraud Detection Service
 * Prevents and detects fraudulent referral activity
 */
class ReferralFraudService {
    
    constructor() {
        // Fraud detection rules
        this.RULES = {
            // Velocity checks
            MAX_SIGNUPS_PER_HOUR: 3,
            MAX_LINKS_PER_DAY: 20,
            MAX_CLICKS_PER_IP_PER_DAY: 10,
            
            // Quality checks
            SUSPICIOUS_CONVERSION_RATE: 60, // % - too high is suspicious
            MIN_ACCOUNT_AGE_DAYS: 30,
            
            // Risk scores
            LOW_RISK: 30,
            MEDIUM_RISK: 60,
            HIGH_RISK: 80,
            CRITICAL_RISK: 95
        };
    }
    
    /**
     * Check IP velocity (multiple signups from same IP)
     * @param {string} ipAddress - IP address
     * @param {number} hours - Time window in hours
     * @returns {Promise<Object>} Velocity check result
     */
    async checkIpVelocity(ipAddress, hours = 24) {
        try {
            const timeWindow = new Date();
            timeWindow.setHours(timeWindow.getHours() - hours);
            
            const { data: clicks, error } = await supabase
                .from('referral_clicks')
                .select('*')
                .eq('ip_address', ipAddress)
                .eq('converted_to_signup', true)
                .gte('clicked_at', timeWindow.toISOString());
            
            if (error) throw error;
            
            const signupCount = clicks?.length || 0;
            const isSuspicious = signupCount > this.RULES.MAX_SIGNUPS_PER_HOUR;
            
            let riskScore = 0;
            if (signupCount > this.RULES.MAX_SIGNUPS_PER_HOUR) {
                riskScore = Math.min(100, 50 + (signupCount - this.RULES.MAX_SIGNUPS_PER_HOUR) * 10);
            }
            
            return {
                success: true,
                isSuspicious,
                signupCount,
                riskScore,
                riskLevel: this.getRiskLevel(riskScore)
            };
        } catch (error) {
            console.error('❌ Error checking IP velocity:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check device fingerprint (multiple accounts from same device)
     * @param {string} userAgent - User agent string
     * @param {string} deviceType - Device type
     * @returns {Promise<Object>} Device check result
     */
    async checkDeviceFingerprint(userAgent, deviceType) {
        try {
            const timeWindow = new Date();
            timeWindow.setDate(timeWindow.getDate() - 7); // Last 7 days
            
            const { data: clicks, error } = await supabase
                .from('referral_clicks')
                .select('*')
                .eq('user_agent', userAgent)
                .eq('device_type', deviceType)
                .eq('converted_to_signup', true)
                .gte('clicked_at', timeWindow.toISOString());
            
            if (error) throw error;
            
            const accountCount = clicks?.length || 0;
            const isSuspicious = accountCount > 2; // More than 2 accounts from same device
            
            let riskScore = 0;
            if (accountCount > 2) {
                riskScore = Math.min(100, 40 + (accountCount - 2) * 15);
            }
            
            return {
                success: true,
                isSuspicious,
                accountCount,
                riskScore,
                riskLevel: this.getRiskLevel(riskScore)
            };
        } catch (error) {
            console.error('❌ Error checking device fingerprint:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check conversion rate (suspiciously high conversion rates)
     * @param {string} referralLinkId - Referral link ID
     * @returns {Promise<Object>} Conversion rate check result
     */
    async checkConversionRate(referralLinkId) {
        try {
            const { data: referralLink } = await supabase
                .from('referral_links')
                .select('*')
                .eq('id', referralLinkId)
                .single();
            
            if (!referralLink) {
                return {
                    success: false,
                    error: 'Referral link not found'
                };
            }
            
            const conversionRate = referralLink.total_clicks > 0
                ? (referralLink.total_conversions / referralLink.total_clicks) * 100
                : 0;
            
            const isSuspicious = conversionRate > this.RULES.SUSPICIOUS_CONVERSION_RATE;
            
            let riskScore = 0;
            if (isSuspicious) {
                riskScore = Math.min(100, 50 + (conversionRate - this.RULES.SUSPICIOUS_CONVERSION_RATE));
            }
            
            return {
                success: true,
                isSuspicious,
                conversionRate: conversionRate.toFixed(2),
                totalClicks: referralLink.total_clicks,
                totalConversions: referralLink.total_conversions,
                riskScore,
                riskLevel: this.getRiskLevel(riskScore)
            };
        } catch (error) {
            console.error('❌ Error checking conversion rate:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Check account age (new accounts shouldn't earn credits immediately)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Account age check result
     */
    async checkAccountAge(userId) {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('created_at')
                .eq('id', userId)
                .single();
            
            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }
            
            const accountAge = Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24));
            const meetsMinimum = accountAge >= this.RULES.MIN_ACCOUNT_AGE_DAYS;
            
            let riskScore = 0;
            if (!meetsMinimum) {
                riskScore = Math.max(0, 70 - (accountAge * 2));
            }
            
            return {
                success: true,
                meetsMinimum,
                accountAgeDays: accountAge,
                riskScore,
                riskLevel: this.getRiskLevel(riskScore)
            };
        } catch (error) {
            console.error('❌ Error checking account age:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Comprehensive fraud check
     * @param {Object} params - Check parameters
     * @returns {Promise<Object>} Comprehensive fraud check result
     */
    async comprehensiveFraudCheck(params) {
        try {
            const {
                userId,
                referralLinkId,
                conversionId,
                ipAddress,
                userAgent,
                deviceType
            } = params;
            
            const checks = [];
            let totalRiskScore = 0;
            let checksPerformed = 0;
            
            // IP velocity check
            if (ipAddress) {
                const ipCheck = await this.checkIpVelocity(ipAddress);
                if (ipCheck.success) {
                    checks.push({
                        type: 'ip_velocity',
                        ...ipCheck
                    });
                    totalRiskScore += ipCheck.riskScore;
                    checksPerformed++;
                }
            }
            
            // Device fingerprint check
            if (userAgent && deviceType) {
                const deviceCheck = await this.checkDeviceFingerprint(userAgent, deviceType);
                if (deviceCheck.success) {
                    checks.push({
                        type: 'device_fingerprint',
                        ...deviceCheck
                    });
                    totalRiskScore += deviceCheck.riskScore;
                    checksPerformed++;
                }
            }
            
            // Conversion rate check
            if (referralLinkId) {
                const conversionCheck = await this.checkConversionRate(referralLinkId);
                if (conversionCheck.success) {
                    checks.push({
                        type: 'conversion_rate',
                        ...conversionCheck
                    });
                    totalRiskScore += conversionCheck.riskScore;
                    checksPerformed++;
                }
            }
            
            // Account age check
            if (userId) {
                const ageCheck = await this.checkAccountAge(userId);
                if (ageCheck.success) {
                    checks.push({
                        type: 'account_age',
                        ...ageCheck
                    });
                    totalRiskScore += ageCheck.riskScore;
                    checksPerformed++;
                }
            }
            
            // Calculate average risk score
            const averageRiskScore = checksPerformed > 0 ? Math.round(totalRiskScore / checksPerformed) : 0;
            const riskLevel = this.getRiskLevel(averageRiskScore);
            const isFlagged = averageRiskScore >= this.RULES.MEDIUM_RISK;
            const requiresManualReview = averageRiskScore >= this.RULES.HIGH_RISK;
            const isBlocked = averageRiskScore >= this.RULES.CRITICAL_RISK;
            
            // Log fraud check
            await supabase
                .from('referral_fraud_checks')
                .insert({
                    check_type: 'comprehensive',
                    user_id: userId,
                    referral_link_id: referralLinkId,
                    conversion_id: conversionId,
                    risk_score: averageRiskScore,
                    risk_level: riskLevel,
                    is_flagged: isFlagged,
                    is_blocked: isBlocked,
                    requires_manual_review: requiresManualReview,
                    check_details: {
                        checks,
                        checksPerformed,
                        totalRiskScore,
                        averageRiskScore
                    }
                });
            
            console.log(`🔍 Fraud check completed: Risk ${riskLevel} (${averageRiskScore}/100)`);
            
            return {
                success: true,
                riskScore: averageRiskScore,
                riskLevel,
                isFlagged,
                isBlocked,
                requiresManualReview,
                checks
            };
        } catch (error) {
            console.error('❌ Error in comprehensive fraud check:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get risk level from score
     * @param {number} score - Risk score (0-100)
     * @returns {string} Risk level
     */
    getRiskLevel(score) {
        if (score >= this.RULES.CRITICAL_RISK) return 'critical';
        if (score >= this.RULES.HIGH_RISK) return 'high';
        if (score >= this.RULES.MEDIUM_RISK) return 'medium';
        return 'low';
    }
    
    /**
     * Get flagged conversions for manual review
     * @returns {Promise<Object>} Flagged conversions
     */
    async getFlaggedConversions() {
        try {
            const { data: flagged, error } = await supabase
                .from('referral_fraud_checks')
                .select(`
                    *,
                    users (
                        id,
                        email,
                        first_name,
                        last_name
                    ),
                    referral_conversions (
                        id,
                        status,
                        referrer_credit_amount,
                        referee_credit_amount
                    )
                `)
                .eq('requires_manual_review', true)
                .is('reviewed_at', null)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return {
                success: true,
                flaggedCount: flagged?.length || 0,
                flagged: flagged || []
            };
        } catch (error) {
            console.error('❌ Error getting flagged conversions:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Resolve fraud check
     * @param {string} checkId - Fraud check ID
     * @param {string} resolution - 'approved' or 'rejected'
     * @param {string} reviewerId - Reviewer user ID
     * @param {string} notes - Review notes
     * @returns {Promise<Object>} Resolution result
     */
    async resolveFraudCheck(checkId, resolution, reviewerId, notes = '') {
        try {
            const { data, error } = await supabase
                .from('referral_fraud_checks')
                .update({
                    resolution,
                    reviewed_by: reviewerId,
                    reviewed_at: new Date().toISOString(),
                    notes
                })
                .eq('id', checkId)
                .select()
                .single();
            
            if (error) throw error;
            
            console.log(`✅ Fraud check resolved: ${resolution} by ${reviewerId}`);
            
            return {
                success: true,
                fraudCheck: data
            };
        } catch (error) {
            console.error('❌ Error resolving fraud check:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Block user from referral program
     * @param {string} userId - User ID
     * @param {string} reason - Block reason
     * @returns {Promise<Object>} Block result
     */
    async blockUser(userId, reason) {
        try {
            // Deactivate all referral links
            await supabase
                .from('referral_links')
                .update({ is_active: false })
                .eq('user_id', userId);
            
            // Cancel pending credits
            await supabase
                .from('referral_credits')
                .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('status', 'active');
            
            // Log block
            await supabase
                .from('referral_fraud_checks')
                .insert({
                    check_type: 'manual_review',
                    user_id: userId,
                    risk_score: 100,
                    risk_level: 'critical',
                    is_flagged: true,
                    is_blocked: true,
                    resolution: 'rejected',
                    notes: `User blocked: ${reason}`
                });
            
            console.log(`🚫 User ${userId} blocked from referral program: ${reason}`);
            
            return {
                success: true,
                message: 'User blocked from referral program'
            };
        } catch (error) {
            console.error('❌ Error blocking user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = ReferralFraudService;

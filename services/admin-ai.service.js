/**
 * Admin AI Service - Kairo AI for Admin Dashboard
 * Extends MasterAIService with admin-specific functionality for loan management,
 * user analytics, system monitoring, and administrative operations.
 */

const MasterAIService = require('./master-ai.service');

class AdminAIService extends MasterAIService {
    constructor() {
        super();
        
        // Admin-specific statistics
        this.adminStats = {
            adminRequestsProcessed: 0,
            loanAnalyticsRequests: 0,
            userInsightsRequests: 0,
            systemMonitoringRequests: 0,
            riskManagementRequests: 0,
            configurationRequests: 0
        };
        
        console.log('🤖 Admin AI Service initialized with Kairo AI capabilities');
    }

    /**
     * Process admin message with admin-specific context and capabilities
     * @param {string} adminId - Admin user ID
     * @param {string} message - Admin's message
     * @param {Object} adminContext - Admin context (role, permissions, etc.)
     * @returns {Promise<Object>} AI response with admin-specific insights
     */
    async processAdminMessage(adminId, message, adminContext = {}) {
        this.adminStats.adminRequestsProcessed++;
        this.stats.totalRequests++;
        
        try {
            // Try Gemini first (Primary)
            if (this.geminiAI.enabled) {
                console.log('🤖 Using Gemini AI for admin request');
                this.stats.geminiUsed++;
                const result = await this.processAdminWithGemini(adminId, message, adminContext);
                return { success: true, ...result };
            }
            
            // Fallback to OpenRouter
            if (this.openrouterAI.enabled) {
                console.log('🔄 Using OpenRouter AI for admin request');
                this.stats.openrouterUsed++;
                const result = await this.processAdminWithOpenRouter(adminId, message, adminContext);
                return { success: true, ...result };
            }
            
            // Emergency fallback to rule-based Kairo AI
            console.log('⚠️ Using rule-based Kairo AI for admin request');
            this.stats.kairoFallbackUsed++;
            const result = await this.processAdminWithKairo(adminId, message, adminContext);
            return { success: true, ...result };
            
        } catch (error) {
            console.error('❌ Admin AI processing failed:', error);
            
            // Try fallback options
            if (this.openrouterAI.enabled) {
                try {
                    const result = await this.processAdminWithOpenRouter(adminId, message, adminContext);
                    return { success: true, ...result };
                } catch (fallbackError) {
                    console.error('❌ OpenRouter fallback also failed:', fallbackError);
                }
            }
            
            // Final fallback
            this.stats.kairoFallbackUsed++;
            const result = await this.processAdminWithKairo(adminId, message, adminContext);
            return { success: true, ...result };
        }
    }

    /**
     * Process admin message with Gemini AI
     */
    async processAdminWithGemini(adminId, message, adminContext) {
        const systemPrompt = this.buildAdminSystemPrompt(adminContext);
        
        const result = await this.geminiAI.client.generateContent({
            contents: [
                { role: "user", parts: [{ text: systemPrompt + "\n\n" + message }] }
            ],
            generationConfig: {
                temperature: 0.3,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 800,
            }
        });

        const aiResponse = result.response.text();
        const intent = await this.analyzeAdminIntent(message);
        const suggestions = await this.generateAdminSuggestions(intent, adminContext);
        
        this.updateAdminStats(intent);

        return {
            response: aiResponse,
            intent: intent,
            suggestions: suggestions,
            provider: 'gemini',
            adminContext: adminContext
        };
    }

    /**
     * Process admin message with OpenRouter AI
     */
    async processAdminWithOpenRouter(adminId, message, adminContext) {
        const currentModel = this.getCurrentModel();
        const systemPrompt = this.buildAdminSystemPrompt(adminContext);
        
        console.log(`🤖 Using admin model: ${currentModel}`);
        
        const response = await this.openrouterAI.client.chat.completions.create({
            model: currentModel,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 800,
            temperature: 0.3,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        const aiResponse = response.choices[0].message.content;
        const intent = await this.analyzeAdminIntent(message);
        const suggestions = await this.generateAdminSuggestions(intent, adminContext);
        
        this.updateAdminStats(intent);

        return {
            response: aiResponse,
            intent: intent,
            suggestions: suggestions,
            model: currentModel,
            provider: 'openrouter',
            adminContext: adminContext
        };
    }

    /**
     * Process admin message with rule-based Kairo AI
     */
    async processAdminWithKairo(adminId, message, adminContext) {
        const intent = await this.analyzeAdminIntent(message);
        const response = await this.generateAdminRuleBasedResponse(message, intent, adminContext);
        const suggestions = await this.generateAdminSuggestions(intent, adminContext);
        
        this.updateAdminStats(intent);

        return {
            response: response,
            intent: intent,
            suggestions: suggestions,
            provider: 'kairo-ai',
            fallbackUsed: true,
            adminContext: adminContext
        };
    }

    /**
     * Build admin-specific system prompt
     */
    buildAdminSystemPrompt(adminContext) {
        const currentTime = new Date().toISOString();
        const adminRole = adminContext.role || 'admin';
        
        return `You are Kairo AI, the intelligent admin assistant for ZimCrowd - Zimbabwe's leading P2P lending platform.

ADMIN ROLE: ${adminRole.toUpperCase()}
CURRENT TIME: ${currentTime}

ADMIN CAPABILITIES:
- Access to comprehensive loan analytics and portfolio insights
- User behavior analysis and risk assessment tools
- System monitoring and performance metrics
- Loan approval recommendations and fraud detection
- Configuration management for interest rates and limits
- Compliance and regulatory guidance

KEY ADMIN FUNCTIONS:
1. LOAN ANALYTICS: Portfolio performance, default rates, repayment patterns
2. USER INSIGHTS: ZimScore trends, user segmentation, risk profiling
3. SYSTEM MONITORING: API performance, transaction volumes, error rates
4. RISK MANAGEMENT: Fraud detection, compliance checks, audit trails
5. CONFIGURATION: Interest rate optimization, limit adjustments, feature toggles

RESPONSE GUIDELINES:
- Provide data-driven insights with specific metrics when possible
- Suggest actionable recommendations for admin operations
- Alert to potential issues or anomalies in the system
- Maintain professional, analytical tone focused on platform optimization
- Reference specific admin tools and features available in the dashboard

CONTEXT: You are assisting with admin dashboard operations. Focus on system optimization, risk management, and operational efficiency.

Current admin context: ${JSON.stringify(adminContext, null, 2)}`;
    }

    /**
     * Analyze admin intent from message
     */
    async analyzeAdminIntent(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('loan') && lowerMessage.includes('analytic')) return 'loan_analytics';
        if (lowerMessage.includes('user') && (lowerMessage.includes('behavior') || lowerMessage.includes('insight'))) return 'user_insights';
        if (lowerMessage.includes('system') || lowerMessage.includes('performance')) return 'system_monitoring';
        if (lowerMessage.includes('risk') || lowerMessage.includes('fraud')) return 'risk_management';
        if (lowerMessage.includes('config') || lowerMessage.includes('setting')) return 'configuration';
        if (lowerMessage.includes('approve') || lowerMessage.includes('review')) return 'loan_review';
        if (lowerMessage.includes('report') || lowerMessage.includes('metric')) return 'reporting';
        if (lowerMessage.includes('help') || lowerMessage.includes('guide')) return 'admin_help';
        
        return 'general_admin';
    }

    /**
     * Generate admin-specific suggestions
     */
    async generateAdminSuggestions(intent, adminContext) {
        const suggestions = {
            'loan_analytics': [
                'View loan portfolio performance',
                'Analyze default rates by segment',
                'Check repayment trend analysis'
            ],
            'user_insights': [
                'Review user ZimScore distribution',
                'Analyze user activity patterns',
                'Check high-risk user segments'
            ],
            'system_monitoring': [
                'View API performance metrics',
                'Check transaction processing times',
                'Review system error logs'
            ],
            'risk_management': [
                'Run fraud detection analysis',
                'Review compliance reports',
                'Check audit trail logs'
            ],
            'configuration': [
                'Adjust interest rate settings',
                'Update loan limits configuration',
                'Modify system parameters'
            ],
            'loan_review': [
                'View pending loan applications',
                'Check high-value loan requests',
                'Review flagged transactions'
            ],
            'reporting': [
                'Generate daily operations report',
                'Export user analytics data',
                'Create performance dashboard'
            ],
            'admin_help': [
                'View admin documentation',
                'Check system status page',
                'Contact support team'
            ],
            'general_admin': [
                'View dashboard overview',
                'Check recent activities',
                'Access admin tools'
            ]
        };
        
        return suggestions[intent] || suggestions['general_admin'];
    }

    /**
     * Generate rule-based admin response
     */
    async generateAdminRuleBasedResponse(message, intent, adminContext) {
        const responses = {
            'loan_analytics': `Based on current loan portfolio data, I can provide insights on loan performance metrics. For detailed analytics, please access the Loan Analytics section in your admin dashboard where you'll find comprehensive data on approval rates, repayment patterns, and portfolio health indicators.`,
            
            'user_insights': `User behavior analysis shows current platform engagement patterns. I recommend reviewing the User Insights dashboard for detailed metrics on user activity, ZimScore distributions, and segment-specific behaviors to optimize your user management strategies.`,
            
            'system_monitoring': `System performance monitoring indicates current operational status. Please check the System Monitoring section for real-time metrics on API performance, transaction volumes, and any system alerts that may require attention.`,
            
            'risk_management': `Risk assessment protocols are actively monitoring platform activities. For comprehensive risk analysis, review the Risk Management dashboard where you'll find fraud detection alerts, compliance reports, and audit trail information.`,
            
            'configuration': `System configuration management allows you to optimize platform parameters. Access the Configuration section to adjust interest rates, loan limits, and other operational settings based on your business requirements.`,
            
            'loan_review': `Loan review workflows are available for pending applications. Please check the Loan Review section to access applications requiring admin attention, including high-value requests and flagged transactions.`,
            
            'reporting': `Administrative reporting tools provide comprehensive insights. Use the Reporting section to generate operational reports, export analytics data, and create custom dashboards for stakeholder review.`,
            
            'admin_help': `Admin support resources are available to assist you. Please refer to the admin documentation or contact the support team for guidance on using specific admin features and troubleshooting platform issues.`,
            
            'general_admin': `Welcome to the ZimCrowd admin dashboard. I'm here to help you manage the platform efficiently. You can ask me about loan analytics, user insights, system monitoring, risk management, configuration settings, or any other administrative tasks.`
        };
        
        return responses[intent] || responses['general_admin'];
    }

    /**
     * Update admin statistics based on intent
     */
    updateAdminStats(intent) {
        switch (intent) {
            case 'loan_analytics':
                this.adminStats.loanAnalyticsRequests++;
                break;
            case 'user_insights':
                this.adminStats.userInsightsRequests++;
                break;
            case 'system_monitoring':
                this.adminStats.systemMonitoringRequests++;
                break;
            case 'risk_management':
                this.adminStats.riskManagementRequests++;
                break;
            case 'configuration':
                this.adminStats.configurationRequests++;
                break;
        }
    }

    /**
     * Get comprehensive admin AI statistics
     */
    getAdminStats() {
        return {
            ...this.getStats(),
            adminStats: this.adminStats,
            adminRequestsProcessed: this.adminStats.adminRequestsProcessed
        };
    }

    /**
     * Get admin dashboard insights summary
     */
    async getAdminDashboardInsights() {
        try {
            const insights = {
                systemStatus: {
                    aiProviders: {
                        gemini: this.geminiAI.enabled,
                        openrouter: this.openrouterAI.enabled,
                        kairo: true // Always available
                    },
                    currentModel: this.getCurrentModel(),
                    totalRequests: this.stats.totalRequests
                },
                recentActivity: {
                    adminRequests: this.adminStats.adminRequestsProcessed,
                    mostUsedFeature: this.getMostUsedAdminFeature(),
                    systemHealth: this.getSystemHealthStatus()
                },
                recommendations: await this.generateAdminRecommendations()
            };
            
            return { success: true, data: insights };
        } catch (error) {
            console.error('Error getting admin dashboard insights:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get most used admin feature
     */
    getMostUsedAdminFeature() {
        const features = [
            { name: 'Loan Analytics', count: this.adminStats.loanAnalyticsRequests },
            { name: 'User Insights', count: this.adminStats.userInsightsRequests },
            { name: 'System Monitoring', count: this.adminStats.systemMonitoringRequests },
            { name: 'Risk Management', count: this.adminStats.riskManagementRequests },
            { name: 'Configuration', count: this.adminStats.configurationRequests }
        ];
        
        return features.reduce((max, feature) => 
            feature.count > max.count ? feature : max, features[0]);
    }

    /**
     * Get system health status
     */
    getSystemHealthStatus() {
        const totalRequests = this.stats.totalRequests;
        const fallbackRate = totalRequests > 0 ? 
            (this.stats.kairoFallbackUsed / totalRequests * 100).toFixed(1) : 0;
        
        if (fallbackRate > 50) return 'Degraded';
        if (fallbackRate > 20) return 'Warning';
        return 'Healthy';
    }

    /**
     * Generate admin recommendations
     */
    async generateAdminRecommendations() {
        const recommendations = [];
        
        if (this.stats.kairoFallbackUsed / this.stats.totalRequests > 0.3) {
            recommendations.push({
                type: 'system',
                priority: 'high',
                message: 'High fallback rate detected. Consider checking AI provider configuration.',
                action: 'Review AI Settings'
            });
        }
        
        if (this.adminStats.loanAnalyticsRequests < 5) {
            recommendations.push({
                type: 'usage',
                priority: 'low',
                message: 'Utilize loan analytics for better portfolio insights.',
                action: 'Explore Loan Analytics'
            });
        }
        
        return recommendations;
    }
}

module.exports = AdminAIService;

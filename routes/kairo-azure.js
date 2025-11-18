/**
 * Kairo AI with OpenRouter Routes
 * Enhanced API endpoints with OpenRouter free tier models
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const EnhancedKairoAIService = require('../services/enhanced-kairo-ai-with-azure.service');
const OpenRouterAIService = require('../services/openrouter-ai.service');
const { createClient } = require('@supabase/supabase-js');

const enhancedKairo = new EnhancedKairoAIService();
const openRouterAI = new OpenRouterAIService();

// Initialize Supabase client for admin logging
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// @route   POST /api/kairo-azure/chat
// @desc    Enhanced chat with OpenRouter free tier models
// @access  Private
router.post('/chat', authenticateUser, [
    body('message').isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
    body('preferredModel').optional().isString().withMessage('preferredModel must be string'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { message, preferredModel = null } = req.body;
        const userId = req.user.id;
        
        console.log(`🤖 Enhanced Kairo chat from user ${userId}: ${message.substring(0, 50)}...`);
        
        // Get conversation context
        const conversationHistory = await enhancedKairo.getConversationHistory(userId, 5);
        const context = {
            recentMessages: conversationHistory.conversations || [],
            timestamp: new Date().toISOString(),
            preferredModel: preferredModel
        };
        
        // Process with enhanced AI
        const response = await enhancedKairo.processMessage(userId, message, context);
        
        if (response.success) {
            res.json({
                success: true,
                response: response.response,
                intent: response.intent,
                confidence: response.confidence,
                suggestions: response.suggestions || [],
                quickActions: response.quickActions || [],
                relatedTopics: response.relatedTopics || [],
                source: response.source,
                model: response.model,
                alternativeResponse: response.alternativeResponse,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: response.response || 'Failed to process message',
                error: response.error
            });
        }
    } catch (error) {
        console.error('Enhanced Kairo chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, I encountered an error processing your message. Please try again.',
            error: error.message
        });
    }
});

// @route   GET /api/kairo-azure/insights
// @desc    Get enhanced AI insights using Azure OpenAI
// @access  Private
router.get('/insights', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const timeframe = req.query.timeframe || '30d';
        
        console.log(`🧠 Generating enhanced insights for user ${userId}`);
        
        // Get enhanced insights
        const insights = await enhancedKairo.getEnhancedUserInsights(userId);
        
        if (insights.success) {
            res.json({
                success: true,
                insights: insights.insights,
                source: insights.source,
                generatedAt: insights.generatedAt,
                timeframe
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to generate insights',
                error: insights.error
            });
        }
    } catch (error) {
        console.error('Enhanced insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate insights',
            error: error.message
        });
    }
});

// @route   POST /api/kairo-azure/loan-analysis
// @desc    Advanced loan analysis using OpenRouter AI
// @access  Private
router.post('/loan-analysis', authenticateUser, [
    body('amount').optional().isFloat({ min: 50, max: 1000000 }),
    body('purpose').optional().isLength({ min: 5, max: 500 }),
    body('term').optional().isInt({ min: 1, max: 60 }),
    handleValidationErrors
], async (req, res) => {
    try {
        const userId = req.user.id;
        const loanRequest = req.body;
        
        console.log(`💰 Advanced loan analysis for user ${userId}`);
        
        // Get user profile
        const userProfile = await enhancedKairo.getUserFinancialProfile(userId);
        
        // Generate loan recommendations using OpenRouter
        const recommendations = await openRouterAI.generateLoanRecommendations(userProfile, loanRequest);
        
        if (recommendations.success) {
            res.json({
                success: true,
                analysis: recommendations.recommendations,
                userProfile: {
                    zimScore: userProfile.zimScore,
                    employment: userProfile.employment_type,
                    dtniUtilization: enhancedKairo.calculateDTNIUtilization ? 
                        enhancedKairo.calculateDTNIUtilization(userProfile) : 'N/A'
                },
                generatedAt: recommendations.generatedAt,
                source: 'openrouter'
            });
        } else {
            // Fallback to local analysis
            const localRecommendations = await enhancedKairo.generateLoanRecommendations(userProfile, loanRequest);
            res.json({
                success: true,
                analysis: localRecommendations,
                source: 'local-fallback',
                generatedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Loan analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze loan request',
            error: error.message
        });
    }
});

// @route   POST /api/kairo-azure/investment-advice
// @desc    Advanced investment advice using OpenRouter AI
// @access  Private
router.post('/investment-advice', authenticateUser, [
    body('amount').optional().isFloat({ min: 50, max: 1000000 }),
    body('riskTolerance').optional().isIn(['low', 'medium', 'high']),
    body('timeHorizon').optional().isIn(['short', 'medium', 'long']),
    body('goals').optional().isLength({ min: 5, max: 500 }),
    handleValidationErrors
], async (req, res) => {
    try {
        const userId = req.user.id;
        const investmentRequest = req.body;
        
        console.log(`📈 Advanced investment advice for user ${userId}`);
        
        // Get user profile
        const userProfile = await enhancedKairo.getUserFinancialProfile(userId);
        
        // Generate investment advice using OpenRouter
        const advice = await openRouterAI.generateInvestmentAdvice(userProfile, investmentRequest);
        
        if (advice.success) {
            res.json({
                success: true,
                advice: advice.advice,
                userProfile: {
                    zimScore: userProfile.zimScore,
                    riskLevel: userProfile.zimScore >= 70 ? 'Low' : 
                              userProfile.zimScore >= 60 ? 'Medium' : 'High',
                    currentInvestments: userProfile.investments?.length || 0
                },
                generatedAt: advice.generatedAt,
                source: 'openrouter'
            });
        } else {
            // Fallback to local advice
            res.json({
                success: true,
                advice: {
                    message: "I'd recommend starting with a diversified portfolio based on your risk tolerance.",
                    recommendations: ["Consider fixed deposits for stability", "Explore equity funds for growth"]
                },
                source: 'local-fallback',
                generatedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Investment advice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate investment advice',
            error: error.message
        });
    }
});

// @route   POST /api/kairo-azure/financial-planning
// @desc    Comprehensive financial planning using OpenRouter AI
// @access  Private
router.post('/financial-planning', authenticateUser, [
    body('goals').optional().isArray(),
    body('timeframe').optional().isIn(['1year', '3years', '5years', '10years']),
    body('priorities').optional().isArray(),
    handleValidationErrors
], async (req, res) => {
    try {
        const userId = req.user.id;
        const { goals = [], timeframe = '3years', priorities = [] } = req.body;
        
        console.log(`📋 Financial planning for user ${userId}`);
        
        // Get comprehensive user profile
        const userProfile = await enhancedKairo.getUserFinancialProfile(userId);
        
        // Create planning prompt
        const planningRequest = {
            goals,
            timeframe,
            priorities,
            currentSituation: {
                zimScore: userProfile.zimScore,
                employment: userProfile.employment_type,
                loans: userProfile.loans?.length || 0,
                investments: userProfile.investments?.length || 0,
                walletBalance: userProfile.walletBalance
            }
        };
        
        // Generate comprehensive plan using Azure OpenAI
        const planPrompt = `Create a comprehensive financial plan for this user:
        
        Current Situation:
        - ZimScore: ${userProfile.zimScore || 'Not available'}
        - Employment: ${userProfile.employment_type || 'Not specified'}
        - Active Loans: ${userProfile.loans?.length || 0}
        - Investments: ${userProfile.investments?.length || 0}
        - Wallet Balance: $${userProfile.walletBalance || 0}
        
        Goals: ${goals.join(', ') || 'General financial improvement'}
        Timeframe: ${timeframe}
        Priorities: ${priorities.join(', ') || 'Financial stability'}
        
        Provide a structured financial plan with specific actionable steps.`;
        
        const response = await openRouterAI.generateResponse(planPrompt, {
            userId,
            userProfile,
            intent: 'financial_planning',
            systemContext: 'financial_advisor'
        });
        
        if (response.success) {
            res.json({
                success: true,
                plan: {
                    overview: response.response,
                    timeframe,
                    goals,
                    priorities,
                    nextSteps: response.suggestions || [],
                    followUp: response.followUpQuestions || []
                },
                confidence: response.confidence,
                source: 'openrouter',
                generatedAt: new Date().toISOString()
            });
        } else {
            // Fallback plan
            res.json({
                success: true,
                plan: {
                    overview: "Based on your profile, I recommend focusing on building your ZimScore and creating an emergency fund.",
                    nextSteps: [
                        "Build emergency fund (3-6 months expenses)",
                        "Improve ZimScore through consistent payments",
                        "Start small investments once stable"
                    ]
                },
                source: 'local-fallback',
                generatedAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Financial planning error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create financial plan',
            error: error.message
        });
    }
});

// @route   GET /api/kairo-azure/health
// @desc    Health check for enhanced Kairo AI system
// @access  Private (Admin)
router.get('/health', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const health = await enhancedKairo.healthCheck();
        
        res.json({
            success: true,
            health: health,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

// @route   POST /api/kairo-azure/feedback
// @desc    Submit feedback for AI responses
// @access  Private
router.post('/feedback', authenticateUser, [
    body('conversationId').isUUID().withMessage('Valid conversation ID required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('feedback').optional().isLength({ max: 1000 }),
    handleValidationErrors
], async (req, res) => {
    try {
        const { conversationId, rating, feedback } = req.body;
        const userId = req.user.id;
        
        // Store feedback for learning
        const { error } = await supabase
            .from('ai_learning_data')
            .insert({
                conversation_id: conversationId,
                user_id: userId,
                feedback_type: rating >= 4 ? 'helpful' : rating >= 3 ? 'neutral' : 'not_helpful',
                feedback_text: feedback,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            throw error;
        }
        
        res.json({
            success: true,
            message: 'Feedback submitted successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit feedback',
            error: error.message
        });
    }
});

// @route   GET /api/kairo-azure/models
// @desc    Get available AI models and their status
// @access  Private (Admin)
router.get('/models', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const models = {
            local: {
                name: 'Kairo Local AI',
                status: 'active',
                capabilities: ['basic_chat', 'intent_detection', 'simple_recommendations']
            },
            openrouter: {
                name: 'OpenRouter AI (Free Tier)',
                status: process.env.OPENROUTER_API_KEY ? 'active' : 'disabled',
                models: {
                    primary: process.env.PRIMARY_AI_MODEL || 'meta-llama/llama-3.2-3b-instruct:free',
                    secondary: process.env.PRIMARY_AI_MODEL_2 || 'z-ai/glm-4.5-air:free',
                    advanced: process.env.PRIMARY_AI_MODEL_4 || 'meta-llama/llama-3.3-70b-instruct:free',
                    fast: process.env.PRIMARY_AI_MODEL_5 || 'google/gemini-2.5-pro',
                    efficient: process.env.PRIMARY_AI_MODEL_6 || 'x-ai/grok-4-fast'
                },
                capabilities: ['advanced_chat', 'financial_analysis', 'complex_reasoning', 'personalization'],
                rotation: process.env.AI_MODEL_ROTATION === 'true'
            }
        };
        
        // Test OpenRouter if enabled
        if (process.env.OPENROUTER_API_KEY) {
            const openRouterHealth = await openRouterAI.healthCheck();
            models.openrouter.health = openRouterHealth;
        }
        
        res.json({
            success: true,
            models,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Models status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get models status',
            error: error.message
        });
    }
});

// @route   POST /api/kairo-azure/admin-chat
// @desc    Admin-specific chat with enhanced context and permissions
// @access  Private (Admin)
router.post('/admin-chat', authenticateUser, requireAdmin, [
    body('message').isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
    body('context').optional().isObject(),
    handleValidationErrors
], async (req, res) => {
    try {
        const { message, context = {} } = req.body;
        const adminId = req.user.id;
        
        console.log(`🛡️ Admin Kairo chat from admin ${adminId}: ${message.substring(0, 50)}...`);
        
        // Enhanced admin context
        const adminContext = {
            ...context,
            isAdmin: true,
            adminId,
            adminRole: req.user.role || 'admin',
            timestamp: new Date().toISOString(),
            capabilities: [
                'user_management',
                'financial_operations',
                'system_monitoring',
                'analytics_access',
                'audit_logs'
            ]
        };
        
        // Create admin-specific prompt
        const adminPrompt = `[ADMIN QUERY]
Admin Role: ${adminContext.adminRole}
Query: ${message}

Context: You are assisting a ZimCrowd platform administrator. Provide detailed, actionable insights with:
- Platform metrics and analytics
- User behavior patterns
- Financial operation recommendations
- Risk assessment and fraud detection
- System optimization suggestions
- Compliance and regulatory guidance

Respond with admin-level detail and technical accuracy.`;
        
        // Process with OpenRouter
        const response = await openRouterAI.generateResponse(adminPrompt, adminContext);
        
        if (response.success) {
            // Log admin AI interaction
            await supabase
                .from('admin_activity_log')
                .insert({
                    admin_id: adminId,
                    action: 'ai_query',
                    details: `Kairo AI query: ${message.substring(0, 100)}`,
                    ip_address: req.ip,
                    created_at: new Date().toISOString()
                })
                .catch(err => console.error('Failed to log admin AI activity:', err));
            
            res.json({
                success: true,
                response: response.response,
                confidence: response.confidence,
                suggestions: response.suggestions || [],
                quickActions: [
                    { label: 'View Analytics', action: 'navigate:analytics' },
                    { label: 'Check Audit Logs', action: 'navigate:audit-logs' },
                    { label: 'User Management', action: 'navigate:users' }
                ],
                source: response.source || 'openrouter',
                model: response.model,
                timestamp: new Date().toISOString(),
                adminContext: {
                    role: adminContext.adminRole,
                    capabilities: adminContext.capabilities
                }
            });
        } else {
            // Fallback to local response
            res.json({
                success: true,
                response: "I'm here to help with admin tasks. I can assist with user management, financial operations, analytics, and system monitoring. What would you like to know?",
                source: 'local-fallback',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Admin Kairo chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, I encountered an error processing your admin query. Please try again.',
            error: error.message
        });
    }
});

module.exports = router;

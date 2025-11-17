/**
 * Kairo AI with Azure OpenAI Routes
 * Enhanced API endpoints with Azure OpenAI integration
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const EnhancedKairoAIService = require('../services/enhanced-kairo-ai-with-azure.service');
const AzureOpenAIService = require('../services/azure-openai.service');

const enhancedKairo = new EnhancedKairoAIService();
const azureOpenAI = new AzureOpenAIService();

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
// @desc    Enhanced chat with Azure OpenAI integration
// @access  Private
router.post('/chat', authenticateUser, [
    body('message').isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
    body('useAzure').optional().isBoolean().withMessage('useAzure must be boolean'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { message, useAzure = null } = req.body;
        const userId = req.user.id;
        
        console.log(`🤖 Enhanced Kairo chat from user ${userId}: ${message.substring(0, 50)}...`);
        
        // Get conversation context
        const conversationHistory = await enhancedKairo.getConversationHistory(userId, 5);
        const context = {
            recentMessages: conversationHistory.conversations || [],
            timestamp: new Date().toISOString(),
            forceAzure: useAzure
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
// @desc    Advanced loan analysis using Azure OpenAI
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
        
        // Generate loan recommendations using Azure OpenAI
        const recommendations = await azureOpenAI.generateLoanRecommendations(userProfile, loanRequest);
        
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
                source: 'azure-openai'
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
// @desc    Advanced investment advice using Azure OpenAI
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
        
        // Generate investment advice using Azure OpenAI
        const advice = await azureOpenAI.generateInvestmentAdvice(userProfile, investmentRequest);
        
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
                source: 'azure-openai'
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
// @desc    Comprehensive financial planning using Azure OpenAI
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
        
        const response = await azureOpenAI.generateResponse(planPrompt, {
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
                source: 'azure-openai',
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
            azure: {
                name: 'Azure OpenAI',
                status: process.env.AZURE_OPENAI_ENABLED === 'true' ? 'active' : 'disabled',
                models: {
                    gpt4o: process.env.AZURE_OPENAI_GPT4O_DEPLOYMENT || 'gpt-4o',
                    gpt4oMini: process.env.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT || 'gpt-4o-mini',
                    embedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large'
                },
                capabilities: ['advanced_chat', 'financial_analysis', 'complex_reasoning', 'personalization']
            }
        };
        
        // Test Azure OpenAI if enabled
        if (process.env.AZURE_OPENAI_ENABLED === 'true') {
            const azureHealth = await azureOpenAI.healthCheck();
            models.azure.health = azureHealth;
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

module.exports = router;

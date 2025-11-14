/**
 * Kairo AI Agent Routes
 * Intelligent financial assistant API endpoints
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { authenticateUser } = require('../middleware/auth');
// Use Master AI service with Kairo AI fallback
const MasterAIService = require('../services/master-ai.service');

const router = express.Router();
const masterAI = new MasterAIService();

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

// @route   GET /api/kairo-ai
// @desc    Get Kairo AI agent information
// @access  Public
router.get('/', (req, res) => {
    res.json({
        success: true,
        data: {
            agent: masterAI.kairoAI.agentProfile,
            capabilities: [
                'Personalized loan recommendations',
                'Investment portfolio advice',
                'ZimScore improvement strategies',
                'Financial planning guidance',
                'Market insights and trends',
                'Budget and savings tips'
            ],
            features: [
                'Real-time financial analysis',
                'Personalized recommendations',
                'Conversation history',
                'Multi-language support',
                'Context-aware responses',
                '24/7 availability'
            ],
            supportedLanguages: masterAI.kairoAI.agentProfile.languages,
            aiSystem: masterAI.getSystemStatus(),
            version: '1.0.0'
        }
    });
});

// @route   POST /api/kairo-ai/chat
// @desc    Send message to Kairo AI agent
// @access  Private
router.post('/chat', authenticateUser, [
    body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
    body('context').optional().isObject().withMessage('Context must be an object'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { message, context = {} } = req.body;
        const userId = req.user.id;

        // Process message with Master AI (with Kairo fallback)
        const aiResponse = await masterAI.processMessage(userId, message, context);

        if (!aiResponse.success) {
            return res.status(500).json({
                success: false,
                message: 'AI processing failed',
                error: aiResponse.error
            });
        }

        res.json({
            success: true,
            data: {
                message: message,
                response: aiResponse.response,
                intent: aiResponse.intent,
                suggestions: aiResponse.suggestions,
                timestamp: new Date().toISOString(),
                agent: {
                    name: masterAI.kairoAI.agentProfile.name,
                    role: masterAI.kairoAI.agentProfile.role
                },
                aiProvider: aiResponse.aiProvider,
                fallbackUsed: aiResponse.fallbackUsed
            }
        });
    } catch (error) {
        console.error('Kairo AI chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process chat message'
        });
    }
});

// @route   GET /api/kairo-ai/conversation-history
// @desc    Get user's conversation history with Kairo AI
// @access  Private
router.get('/conversation-history', authenticateUser, async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const userId = req.user.id;

        const history = await masterAI.kairoAI.getConversationHistory(userId, parseInt(limit));

        res.json({
            success: true,
            data: {
                conversations: history.conversations,
                total: history.conversations.length,
                agent: masterAI.kairoAI.agentProfile.name
            }
        });
    } catch (error) {
        console.error('Get conversation history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation history'
        });
    }
});

// @route   POST /api/kairo-ai/quick-advice
// @desc    Get quick financial advice on specific topics
// @access  Private
router.post('/quick-advice', authenticateUser, [
    body('topic').isIn(['loan', 'investment', 'zimscore', 'budgeting', 'saving']).withMessage('Invalid advice topic'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { topic } = req.body;
        const userId = req.user.id;

        // Get user profile for personalized advice
        const userProfile = await kairoAI.getUserFinancialProfile(userId);

        let advice;
        switch (topic) {
            case 'loan':
                advice = await kairoAI.generateLoanAdvice(userProfile);
                break;
            case 'investment':
                advice = kairoAI.generateInvestmentAdvice(userProfile);
                break;
            case 'zimscore':
                advice = kairoAI.generateZimScoreImprovementAdvice(userProfile);
                break;
            case 'budgeting':
                advice = kairoAI.getFinancialTips('budgeting');
                break;
            case 'saving':
                advice = kairoAI.getFinancialTips('saving');
                break;
            default:
                advice = kairoAI.generateFinancialPlanningAdvice(userProfile);
        }

        res.json({
            success: true,
            data: {
                topic: topic,
                advice: advice,
                personalized: true,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Quick advice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate advice'
        });
    }
});

// @route   GET /api/kairo-ai/conversations/recent
// @desc    Get recent AI conversations (Admin only)
// @access  Admin
router.get('/conversations/recent', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // Fetch recent conversations from database
        const { data: conversations, error } = await supabase
            .from('ai_conversations')
            .select(`
                id,
                user_id,
                user_message,
                ai_response,
                ai_provider,
                status,
                intent,
                response_time_ms,
                satisfaction_score,
                created_at,
                users:user_id (email)
            `)
            .order('created_at', { ascending: false })
            .limit(parseInt(limit));

        if (error) throw error;

        // Format conversations with user email
        const formattedConversations = conversations?.map(conv => ({
            id: conv.id,
            user_id: conv.user_id,
            user_email: conv.users?.email || 'Unknown',
            user_message: conv.user_message,
            ai_response: conv.ai_response,
            ai_provider: conv.ai_provider,
            status: conv.status,
            intent: conv.intent,
            response_time_ms: conv.response_time_ms,
            satisfaction_score: conv.satisfaction_score,
            created_at: conv.created_at
        })) || [];

        res.json({
            success: true,
            data: formattedConversations
        });
    } catch (error) {
        console.error('Error fetching recent conversations:', error);
        res.json({
            success: false,
            error: error.message,
            data: []
        });
    }
});

// @route   GET /api/kairo-ai/financial-tips
// @desc    Get financial tips by category
// @access  Public
router.get('/financial-tips', (req, res) => {
    try {
        const { category = 'budgeting' } = req.query;
        
        const tips = kairoAI.getFinancialTips(category);
        
        res.json({
            success: true,
            data: {
                category: category,
                tips: tips,
                allCategories: Object.keys(kairoAI.financialAdvice)
            }
        });
    } catch (error) {
        console.error('Financial tips error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch financial tips'
        });
    }
});

// @route   GET /api/kairo-ai/market-insights
// @desc    Get market insights and trends
// @access  Public
router.get('/market-insights', (req, res) => {
    try {
        const { category = 'zimbabwe_economy' } = req.query;
        
        const insights = kairoAI.getMarketInsights(category);
        
        res.json({
            success: true,
            data: {
                category: category,
                insights: insights,
                availableCategories: Object.keys(kairoAI.marketInsights),
                lastUpdated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Market insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch market insights'
        });
    }
});

// @route   POST /api/kairo-ai/analyze-profile
// @desc    Get comprehensive financial profile analysis
// @access  Private
router.post('/analyze-profile', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get comprehensive user profile
        const userProfile = await kairoAI.getUserFinancialProfile(userId);
        
        // Generate analysis
        const analysis = {
            financialHealth: {
                score: 0,
                factors: []
            },
            recommendations: [],
            opportunities: [],
            risks: []
        };
        
        // Calculate financial health score
        let healthScore = 50; // Base score
        
        // ZimScore factor (30% weight)
        const zimScoreWeight = (userProfile.zimScore / 85) * 30;
        healthScore += zimScoreWeight;
        analysis.financialHealth.factors.push({
            factor: 'ZimScore',
            score: userProfile.zimScore,
            weight: '30%',
            impact: zimScoreWeight
        });
        
        // Debt factor (25% weight)
        const debtFactor = userProfile.hasActiveLoans ? -10 : 10;
        healthScore += debtFactor;
        analysis.financialHealth.factors.push({
            factor: 'Debt Management',
            status: userProfile.hasActiveLoans ? 'Has Active Loans' : 'No Active Debt',
            weight: '25%',
            impact: debtFactor
        });
        
        // Investment factor (25% weight)
        const investmentFactor = userProfile.hasInvestments ? 15 : -5;
        healthScore += investmentFactor;
        analysis.financialHealth.factors.push({
            factor: 'Investment Portfolio',
            status: userProfile.hasInvestments ? 'Has Investments' : 'No Investments',
            weight: '25%',
            impact: investmentFactor
        });
        
        // Liquidity factor (20% weight)
        const liquidityFactor = userProfile.walletBalance > 1000 ? 10 : 
                               userProfile.walletBalance > 500 ? 5 : -5;
        healthScore += liquidityFactor;
        analysis.financialHealth.factors.push({
            factor: 'Liquidity',
            balance: userProfile.walletBalance,
            weight: '20%',
            impact: liquidityFactor
        });
        
        analysis.financialHealth.score = Math.max(0, Math.min(100, Math.round(healthScore)));
        
        // Generate recommendations
        if (userProfile.zimScore < 70) {
            analysis.recommendations.push({
                priority: 'High',
                category: 'Credit Building',
                action: 'Focus on improving ZimScore through timely payments',
                impact: 'Better loan rates and higher limits'
            });
        }
        
        if (!userProfile.hasInvestments) {
            analysis.recommendations.push({
                priority: 'Medium',
                category: 'Wealth Building',
                action: 'Start investing with Fixed Deposits or Money Market funds',
                impact: 'Passive income and wealth growth'
            });
        }
        
        if (userProfile.walletBalance < 1000) {
            analysis.recommendations.push({
                priority: 'High',
                category: 'Emergency Fund',
                action: 'Build emergency fund of 3-6 months expenses',
                impact: 'Financial security and peace of mind'
            });
        }
        
        // Identify opportunities
        if (userProfile.zimScore >= 70) {
            analysis.opportunities.push({
                type: 'Low Interest Loans',
                description: 'Qualify for premium loan rates (8.5%-12%)',
                action: 'Consider business expansion or investment loans'
            });
        }
        
        if (userProfile.walletBalance > 5000) {
            analysis.opportunities.push({
                type: 'High-Yield Investments',
                description: 'Sufficient capital for diversified portfolio',
                action: 'Explore equity funds and peer-to-peer lending'
            });
        }
        
        // Identify risks
        if (userProfile.hasActiveLoans && userProfile.walletBalance < 500) {
            analysis.risks.push({
                level: 'High',
                type: 'Liquidity Risk',
                description: 'Low cash reserves with active debt obligations',
                mitigation: 'Build emergency fund and avoid new debt'
            });
        }
        
        if (!userProfile.hasInvestments && userProfile.zimScore < 60) {
            analysis.risks.push({
                level: 'Medium',
                type: 'Wealth Building Risk',
                description: 'Limited wealth building and credit building activities',
                mitigation: 'Start small investments and focus on credit improvement'
            });
        }
        
        res.json({
            success: true,
            data: {
                analysis: analysis,
                profile: {
                    zimScore: userProfile.zimScore,
                    walletBalance: userProfile.walletBalance,
                    hasActiveLoans: userProfile.hasActiveLoans,
                    hasInvestments: userProfile.hasInvestments,
                    totalLoans: userProfile.loans.length,
                    totalInvestments: userProfile.investments.length
                },
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Profile analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze financial profile'
        });
    }
});

// @route   POST /api/kairo-ai/goal-planning
// @desc    Create personalized financial goal plan
// @access  Private
router.post('/goal-planning', authenticateUser, [
    body('goalType').isIn(['emergency_fund', 'investment', 'loan_payoff', 'major_purchase', 'retirement']).withMessage('Invalid goal type'),
    body('targetAmount').isFloat({ min: 100 }).withMessage('Target amount must be at least $100'),
    body('timeframe').isInt({ min: 1, max: 360 }).withMessage('Timeframe must be between 1 and 360 months'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { goalType, targetAmount, timeframe, description } = req.body;
        const userId = req.user.id;
        
        // Get user profile for personalized planning
        const userProfile = await kairoAI.getUserFinancialProfile(userId);
        
        // Calculate monthly savings needed
        const monthlySavingsNeeded = targetAmount / timeframe;
        
        // Generate personalized plan
        const plan = {
            goal: {
                type: goalType,
                targetAmount: targetAmount,
                timeframe: timeframe,
                description: description || '',
                monthlySavingsNeeded: Math.round(monthlySavingsNeeded * 100) / 100
            },
            strategy: [],
            milestones: [],
            recommendations: []
        };
        
        // Generate strategy based on goal type
        switch (goalType) {
            case 'emergency_fund':
                plan.strategy = [
                    'Start with Money Market Fund for high liquidity',
                    'Automate monthly transfers to build consistency',
                    'Keep funds separate from daily spending account',
                    'Aim for 3-6 months of expenses as target'
                ];
                break;
                
            case 'investment':
                plan.strategy = [
                    'Begin with low-risk investments (Fixed Deposits)',
                    'Gradually diversify into higher-return options',
                    'Use dollar-cost averaging for regular investments',
                    'Reinvest returns to compound growth'
                ];
                break;
                
            case 'loan_payoff':
                plan.strategy = [
                    'Focus on highest interest rate loans first',
                    'Make extra principal payments when possible',
                    'Avoid taking new debt during payoff period',
                    'Consider debt consolidation if beneficial'
                ];
                break;
                
            case 'major_purchase':
                plan.strategy = [
                    'Save in Fixed Deposits for guaranteed growth',
                    'Set up dedicated savings account for goal',
                    'Track progress monthly and adjust if needed',
                    'Consider timing purchase for best deals'
                ];
                break;
                
            case 'retirement':
                plan.strategy = [
                    'Start with aggressive growth investments (Equity Funds)',
                    'Maximize investment contributions early',
                    'Diversify across multiple investment types',
                    'Review and rebalance portfolio annually'
                ];
                break;
        }
        
        // Generate milestones (quarterly checkpoints)
        const quarterlyTarget = targetAmount / (timeframe / 3);
        for (let quarter = 1; quarter <= Math.ceil(timeframe / 3); quarter++) {
            const milestoneAmount = quarterlyTarget * quarter;
            plan.milestones.push({
                quarter: quarter,
                targetAmount: Math.round(milestoneAmount * 100) / 100,
                timeframe: quarter * 3,
                description: `Reach $${Math.round(milestoneAmount)} by month ${quarter * 3}`
            });
        }
        
        // Generate personalized recommendations
        if (monthlySavingsNeeded > userProfile.walletBalance * 0.5) {
            plan.recommendations.push({
                type: 'Budget Adjustment',
                message: 'Monthly savings target is high relative to current balance. Consider extending timeframe or reducing target.',
                priority: 'High'
            });
        }
        
        if (goalType === 'investment' && userProfile.zimScore < 60) {
            plan.recommendations.push({
                type: 'Risk Management',
                message: 'Focus on low-risk investments initially while building credit score.',
                priority: 'Medium'
            });
        }
        
        if (goalType === 'emergency_fund' && userProfile.hasActiveLoans) {
            plan.recommendations.push({
                type: 'Priority Balance',
                message: 'Balance emergency fund building with loan payments to avoid additional debt.',
                priority: 'High'
            });
        }
        
        // Save goal to database
        await supabase
            .from('financial_goals')
            .insert({
                user_id: userId,
                goal_type: goalType,
                target_amount: targetAmount,
                timeframe_months: timeframe,
                monthly_target: monthlySavingsNeeded,
                description: description,
                strategy: plan.strategy,
                milestones: plan.milestones,
                status: 'active',
                created_at: new Date().toISOString()
            });
        
        res.json({
            success: true,
            data: {
                plan: plan,
                feasibilityScore: monthlySavingsNeeded <= userProfile.walletBalance * 0.3 ? 'High' :
                                monthlySavingsNeeded <= userProfile.walletBalance * 0.5 ? 'Medium' : 'Low',
                nextSteps: [
                    'Set up automatic monthly transfers',
                    'Track progress weekly',
                    'Review and adjust plan quarterly',
                    'Celebrate milestone achievements'
                ]
            }
        });
    } catch (error) {
        console.error('Goal planning error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create goal plan'
        });
    }
});

// @route   GET /api/kairo-ai/system-status
// @desc    Get AI system status and statistics
// @access  Private (Admin only)
router.get('/system-status', authenticateUser, async (req, res) => {
    try {
        // Check if user is admin (you can implement admin check here)
        const systemStatus = masterAI.getSystemStatus();
        
        res.json({
            success: true,
            data: {
                systemStatus: systemStatus,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development'
            }
        });
    } catch (error) {
        console.error('System status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get system status'
        });
    }
});

// @route   POST /api/kairo-ai/switch-ai
// @desc    Switch primary AI provider (Admin only)
// @access  Private (Admin only)
router.post('/switch-ai', authenticateUser, [
    body('provider').isIn(['openai', 'claude', 'custom', 'disable']).withMessage('Invalid AI provider'),
    body('apiKey').optional().isString().withMessage('API key must be a string'),
    body('model').optional().isString().withMessage('Model must be a string'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { provider, apiKey, model } = req.body;
        
        // TODO: Add admin authentication check here
        
        if (provider === 'disable') {
            masterAI.disablePrimaryAI();
        } else {
            await masterAI.switchPrimaryAI(provider, apiKey, model);
        }
        
        const newStatus = masterAI.getSystemStatus();
        
        res.json({
            success: true,
            message: `AI system switched to ${provider}`,
            data: {
                newStatus: newStatus,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Switch AI error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to switch AI provider'
        });
    }
});

module.exports = router;

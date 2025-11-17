/**
 * Kairo AI Routes
 * API endpoints for AI-powered insights, chat, and analytics
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const KairoAIService = require('../services/kairo-ai.service');
const KairoAnalyticsService = require('../services/kairo-analytics.service');

const kairoAI = new KairoAIService();
const kairoAnalytics = new KairoAnalyticsService();

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

// @route   POST /api/kairo/chat
// @desc    Chat with Kairo AI assistant
// @access  Private
router.post('/chat', authenticateUser, [
    body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
    handleValidationErrors
], async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;
        
        console.log(`💬 Kairo chat from user ${userId}: ${message.substring(0, 50)}...`);
        
        // Get conversation context (last few messages)
        const conversationHistory = await kairoAI.getConversationHistory(userId, 5);
        const context = {
            recentMessages: conversationHistory.conversations || [],
            timestamp: new Date().toISOString()
        };
        
        // Process message with AI
        const response = await kairoAI.processMessage(userId, message, context);
        
        if (response.success) {
            res.json({
                success: true,
                response: response.response,
                intent: response.intent,
                suggestions: response.suggestions,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                message: response.response,
                error: response.error
            });
        }
    } catch (error) {
        console.error('Kairo chat error:', error);
        res.status(500).json({
            success: false,
            message: 'Sorry, I encountered an error processing your message. Please try again.',
            error: error.message
        });
    }
});

// @route   GET /api/kairo/chat-history
// @desc    Get user's chat history with Kairo
// @access  Private
router.get('/chat-history', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        
        const history = await kairoAI.getConversationHistory(userId, limit);
        
        res.json({
            success: true,
            conversations: history.conversations,
            count: history.conversations?.length || 0
        });
    } catch (error) {
        console.error('Chat history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve chat history',
            error: error.message
        });
    }
});

// @route   GET /api/kairo/user-insights
// @desc    Get AI-powered insights for user dashboard
// @access  Private
router.get('/user-insights', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`🧠 Generating user insights for ${userId}`);
        
        // Get user's financial profile
        const userProfile = await kairoAI.getUserFinancialProfile(userId);
        
        // Generate personalized insights
        const insights = {
            healthScore: calculateHealthScore(userProfile),
            zimScore: userProfile.zimScore,
            debtRatio: calculateDebtRatio(userProfile),
            savingsRate: calculateSavingsRate(userProfile),
            investmentScore: calculateInvestmentScore(userProfile),
            availableCredit: calculateAvailableCredit(userProfile),
            interestRate: calculatePersonalizedRate(userProfile.zimScore),
            dtniUtilization: calculateDTNIUtilization(userProfile),
            portfolioValue: calculatePortfolioValue(userProfile),
            monthlyReturn: '8.5%', // Placeholder
            riskLevel: calculateRiskLevel(userProfile),
            scoreChange: 3, // Placeholder
            nextMilestone: getNextMilestone(userProfile.zimScore),
            loanTip: generateLoanTip(userProfile),
            investmentTip: generateInvestmentTip(userProfile),
            scoreTip: generateScoreTip(userProfile),
            predictions: {
                zimScoreIn3Months: Math.min(85, userProfile.zimScore + 7),
                maxLoanIn6Months: calculateFutureLoanCapacity(userProfile),
                investmentGrowth: '15.2%'
            }
        };
        
        res.json({
            success: true,
            insights,
            generatedAt: new Date().toISOString(),
            profileData: {
                hasActiveLoans: userProfile.hasActiveLoans,
                hasInvestments: userProfile.hasInvestments,
                walletBalance: userProfile.walletBalance
            }
        });
    } catch (error) {
        console.error('User insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate insights',
            error: error.message
        });
    }
});

// @route   GET /api/kairo/admin-insights
// @desc    Get AI-powered analytics for admin dashboard
// @access  Private (Admin only)
router.get('/admin-insights', authenticateUser, requireAdmin, async (req, res) => {
    try {
        const timeframe = req.query.timeframe || '30d';
        
        console.log(`🔍 Generating admin insights for timeframe: ${timeframe}`);
        
        // Generate comprehensive admin insights
        const insights = await kairoAnalytics.generateAdminInsights(timeframe);
        
        if (insights.success) {
            res.json({
                success: true,
                insights: insights.insights,
                recommendations: insights.recommendations,
                timeframe: insights.timeframe,
                generatedAt: insights.generatedAt
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to generate admin insights',
                error: insights.error
            });
        }
    } catch (error) {
        console.error('Admin insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate admin insights',
            error: error.message
        });
    }
});

// @route   POST /api/kairo/loan-recommendation
// @desc    Get AI loan recommendations for user
// @access  Private
router.post('/loan-recommendation', authenticateUser, [
    body('amount').optional().isFloat({ min: 50, max: 100000 }),
    body('purpose').optional().isLength({ min: 5, max: 500 }),
    handleValidationErrors
], async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, purpose } = req.body;
        
        // Get user profile for personalized recommendations
        const userProfile = await kairoAI.getUserFinancialProfile(userId);
        
        // Generate loan recommendations
        const recommendations = await generateLoanRecommendations(userProfile, { amount, purpose });
        
        res.json({
            success: true,
            recommendations,
            userProfile: {
                zimScore: userProfile.zimScore,
                availableCredit: calculateAvailableCredit(userProfile),
                recommendedRate: calculatePersonalizedRate(userProfile.zimScore)
            }
        });
    } catch (error) {
        console.error('Loan recommendation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate loan recommendations',
            error: error.message
        });
    }
});

// @route   POST /api/kairo/investment-advice
// @desc    Get AI investment advice for user
// @access  Private
router.post('/investment-advice', authenticateUser, [
    body('amount').optional().isFloat({ min: 50, max: 1000000 }),
    body('riskTolerance').optional().isIn(['low', 'medium', 'high']),
    body('timeHorizon').optional().isIn(['short', 'medium', 'long']),
    handleValidationErrors
], async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, riskTolerance, timeHorizon } = req.body;
        
        // Get user profile
        const userProfile = await kairoAI.getUserFinancialProfile(userId);
        
        // Generate investment advice
        const advice = await generateInvestmentAdvice(userProfile, { amount, riskTolerance, timeHorizon });
        
        res.json({
            success: true,
            advice,
            userProfile: {
                zimScore: userProfile.zimScore,
                currentInvestments: userProfile.investments?.length || 0,
                walletBalance: userProfile.walletBalance
            }
        });
    } catch (error) {
        console.error('Investment advice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate investment advice',
            error: error.message
        });
    }
});

// @route   GET /api/kairo/financial-tips
// @desc    Get personalized financial tips
// @access  Private
router.get('/financial-tips', authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const category = req.query.category || 'general';
        
        // Get user profile for personalized tips
        const userProfile = await kairoAI.getUserFinancialProfile(userId);
        
        // Get financial tips based on category and user profile
        let tips;
        if (category === 'general') {
            tips = generatePersonalizedTips(userProfile);
        } else {
            tips = kairoAI.getFinancialTips(category);
        }
        
        res.json({
            success: true,
            tips,
            category,
            personalized: category === 'general'
        });
    } catch (error) {
        console.error('Financial tips error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get financial tips',
            error: error.message
        });
    }
});

// @route   GET /api/kairo/market-insights
// @desc    Get AI market insights and trends
// @access  Private
router.get('/market-insights', authenticateUser, async (req, res) => {
    try {
        const category = req.query.category || 'zimbabwe_economy';
        
        // Get market insights
        const insights = kairoAI.getMarketInsights(category);
        
        res.json({
            success: true,
            insights,
            category,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Market insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get market insights',
            error: error.message
        });
    }
});

// Helper functions for calculations
function calculateHealthScore(userProfile) {
    let score = 0;
    
    // ZimScore contribution (40%)
    score += (userProfile.zimScore / 100) * 40;
    
    // Debt ratio contribution (20%)
    const debtRatio = calculateDebtRatio(userProfile);
    score += (1 - parseFloat(debtRatio) / 100) * 20;
    
    // Savings/Investment contribution (25%)
    const hasInvestments = userProfile.hasInvestments ? 25 : 0;
    score += hasInvestments;
    
    // Payment history contribution (15%)
    const paymentScore = userProfile.hasActiveLoans && !userProfile.loans?.some(l => l.status === 'overdue') ? 15 : 10;
    score += paymentScore;
    
    return Math.round(Math.min(100, score));
}

function calculateDebtRatio(userProfile) {
    const activeLoans = userProfile.loans?.filter(l => l.status === 'active') || [];
    const totalDebt = activeLoans.reduce((sum, loan) => sum + (loan.monthly_installment || 0), 0);
    const estimatedIncome = 1000; // Placeholder - would get from employment details
    return ((totalDebt / estimatedIncome) * 100).toFixed(1);
}

function calculateSavingsRate(userProfile) {
    // Simplified calculation based on wallet balance and investments
    const totalSavings = userProfile.walletBalance + (userProfile.investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0);
    const estimatedIncome = 1000; // Placeholder
    return ((totalSavings / (estimatedIncome * 6)) * 100).toFixed(1); // 6 months of income
}

function calculateInvestmentScore(userProfile) {
    if (!userProfile.hasInvestments) return '0%';
    const investmentValue = userProfile.investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
    const estimatedIncome = 1000; // Placeholder
    return ((investmentValue / (estimatedIncome * 12)) * 100).toFixed(1); // Annual income ratio
}

function calculateAvailableCredit(userProfile) {
    // Simplified DTNI calculation
    const estimatedIncome = 1000; // Would get from employment details
    const maxInstallment = estimatedIncome * 0.4;
    const currentInstallments = userProfile.loans?.filter(l => l.status === 'active')
        .reduce((sum, loan) => sum + (loan.monthly_installment || 0), 0) || 0;
    const availableInstallment = maxInstallment - currentInstallments;
    
    // Convert to loan amount (simplified)
    const maxLoanAmount = availableInstallment * 12; // 12 months
    const employmentCap = userProfile.profile.employment_type === 'government' ? 300 : 100;
    
    return Math.min(maxLoanAmount, employmentCap).toFixed(0);
}

function calculatePersonalizedRate(zimScore) {
    if (zimScore >= 70) return '8.5-12%';
    if (zimScore >= 60) return '12-15.9%';
    if (zimScore >= 50) return '15.9-19.9%';
    return '19.9-24.9%';
}

function calculateDTNIUtilization(userProfile) {
    const estimatedIncome = 1000; // Placeholder
    const maxCapacity = estimatedIncome * 0.4;
    const currentUtilization = userProfile.loans?.filter(l => l.status === 'active')
        .reduce((sum, loan) => sum + (loan.monthly_installment || 0), 0) || 0;
    return ((currentUtilization / maxCapacity) * 100).toFixed(1) + '%';
}

function calculatePortfolioValue(userProfile) {
    return userProfile.investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0)?.toFixed(0) || '0';
}

function calculateRiskLevel(userProfile) {
    if (userProfile.zimScore >= 70) return 'Low';
    if (userProfile.zimScore >= 60) return 'Medium';
    return 'High';
}

function getNextMilestone(zimScore) {
    if (zimScore < 50) return 50;
    if (zimScore < 60) return 60;
    if (zimScore < 70) return 70;
    if (zimScore < 80) return 80;
    return 85;
}

function calculateFutureLoanCapacity(userProfile) {
    const currentCapacity = parseFloat(calculateAvailableCredit(userProfile));
    const futureZimScore = Math.min(85, userProfile.zimScore + 10);
    const improvementFactor = futureZimScore > 70 ? 1.5 : 1.2;
    return (currentCapacity * improvementFactor).toFixed(0);
}

function generateLoanTip(userProfile) {
    if (userProfile.zimScore < 50) {
        return "Focus on improving your ZimScore to unlock better loan terms";
    }
    if (!userProfile.hasActiveLoans) {
        return "Consider a small loan to build your credit history";
    }
    return "Pay your next installment early to boost your ZimScore";
}

function generateInvestmentTip(userProfile) {
    if (!userProfile.hasInvestments) {
        return "Start with a fixed deposit to begin your investment journey";
    }
    if (userProfile.investments?.length === 1) {
        return "Diversify your portfolio with different investment types";
    }
    return "Consider increasing your monthly investment contributions";
}

function generateScoreTip(userProfile) {
    if (userProfile.hasActiveLoans) {
        return "Make your next payment 3 days early for bonus ZimScore points";
    }
    return "Apply for a small loan and pay it back perfectly to build credit";
}

async function generateLoanRecommendations(userProfile, preferences) {
    const recommendations = [];
    
    // Based on ZimScore
    if (userProfile.zimScore >= 70) {
        recommendations.push({
            type: 'Premium Loan',
            amount: '$10,000 - $50,000',
            rate: '8.5% - 12%',
            term: '6-60 months',
            reason: 'Excellent ZimScore qualifies you for our best rates'
        });
    } else if (userProfile.zimScore >= 60) {
        recommendations.push({
            type: 'Standard Loan',
            amount: '$5,000 - $20,000',
            rate: '12% - 15.9%',
            term: '3-36 months',
            reason: 'Good ZimScore offers competitive rates'
        });
    } else {
        recommendations.push({
            type: 'Starter Loan',
            amount: '$500 - $5,000',
            rate: '15.9% - 19.9%',
            term: '3-12 months',
            reason: 'Build your credit history with a smaller loan'
        });
    }
    
    return recommendations;
}

async function generateInvestmentAdvice(userProfile, preferences) {
    const advice = {
        recommended: [],
        riskAssessment: calculateRiskLevel(userProfile),
        diversificationTips: []
    };
    
    // Based on risk level and ZimScore
    if (userProfile.zimScore >= 70) {
        advice.recommended.push({
            type: 'Equity Fund',
            allocation: '40%',
            expectedReturn: '12-18%',
            risk: 'Medium-High'
        });
        advice.recommended.push({
            type: 'Fixed Deposit',
            allocation: '30%',
            expectedReturn: '6-8%',
            risk: 'Low'
        });
    } else {
        advice.recommended.push({
            type: 'Fixed Deposit',
            allocation: '60%',
            expectedReturn: '6-8%',
            risk: 'Low'
        });
        advice.recommended.push({
            type: 'Money Market',
            allocation: '40%',
            expectedReturn: '4-6%',
            risk: 'Very Low'
        });
    }
    
    return advice;
}

function generatePersonalizedTips(userProfile) {
    const tips = [];
    
    if (userProfile.zimScore < 60) {
        tips.push({
            category: 'Credit Building',
            tip: 'Focus on making all loan payments on time to improve your ZimScore',
            priority: 'high'
        });
    }
    
    if (!userProfile.hasInvestments) {
        tips.push({
            category: 'Investment',
            tip: 'Start investing with as little as $50 in a fixed deposit',
            priority: 'medium'
        });
    }
    
    if (userProfile.walletBalance < 500) {
        tips.push({
            category: 'Emergency Fund',
            tip: 'Build an emergency fund of 3-6 months of expenses',
            priority: 'high'
        });
    }
    
    return tips;
}

module.exports = router;

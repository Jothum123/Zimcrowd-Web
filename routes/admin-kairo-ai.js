/**
 * Admin Kairo AI Routes
 * Administrative AI assistant for loan management, user analytics, and system monitoring
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../utils/supabase-auth');
const { requireAdmin } = require('../middleware/auth');
const { adminAIRateLimit, adminAnalysisRateLimit } = require('../middleware/admin-rate-limit');
const AdminAIService = require('../services/admin-ai.service');

const router = express.Router();
const adminAI = new AdminAIService();

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

// @route   GET /api/admin/kairo-ai
// @desc    Get Admin Kairo AI agent information
// @access  Admin
router.get('/',
    requireAdmin,
    (req, res) => {
        res.json({
            success: true,
            data: {
                agent: {
                    name: 'Kairo AI Admin Assistant',
                    version: '2.0.0',
                    type: 'Administrative AI',
                    description: 'Intelligent admin assistant for ZimCrowd platform management'
                },
                capabilities: [
                    'Loan portfolio analytics',
                    'User behavior insights',
                    'System performance monitoring',
                    'Risk assessment and fraud detection',
                    'Configuration management',
                    'Compliance and audit support',
                    'Operational recommendations',
                    'Automated reporting'
                ],
                features: [
                    'Real-time admin analytics',
                    'Risk management insights',
                    'System health monitoring',
                    'Configuration optimization',
                    'Audit trail analysis',
                    'Multi-provider AI support',
                    'Admin context awareness',
                    'Actionable recommendations'
                ],
                providers: adminAI.getStats(),
                adminStats: adminAI.getAdminStats()
            }
        });
    }
);

// @route   POST /api/admin/kairo-ai/chat
// @desc    Chat with Admin Kairo AI
// @access  Admin
router.post('/chat',
    requireAdmin,
    adminAIRateLimit,
    body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
    body('adminContext').optional().isObject().withMessage('Admin context must be an object'),
    body('sessionId').optional().isString().withMessage('Session ID must be a string'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { message, adminContext = {}, sessionId } = req.body;
            const adminId = req.user.id;
            
            // Get or generate session ID
            const currentSessionId = sessionId || generateAdminSessionId();
            
            // Get conversation history for context if session ID provided
            let conversationHistory = [];
            if (sessionId) {
                try {
                    const { data: history } = await supabase
                        .rpc('get_admin_conversation_history', {
                            p_admin_id: adminId,
                            p_session_id: sessionId,
                            p_limit: 5 // Last 5 messages for context
                        });
                    
                    if (history) {
                        conversationHistory = history.reverse().map(item => ({
                            user: item.message,
                            ai: item.response,
                            intent: item.intent
                        }));
                    }
                } catch (historyError) {
                    console.warn('⚠️ Failed to retrieve conversation history:', historyError.message);
                    // Continue without history if retrieval fails
                }
            }
            
            // Get admin role and permissions
            const adminProfile = {
                id: req.user.id,
                email: req.user.email,
                role: 'admin', // Will be verified by middleware
                permissions: [],
                sessionId: currentSessionId,
                conversationHistory: conversationHistory,
                ...adminContext
            };
            
            console.log(`🤖 Admin AI request from ${adminProfile.email} (${adminProfile.role}) - Session: ${currentSessionId}`);
            
            // Process message with Admin AI
            const response = await adminAI.processAdminMessage(adminId, message, adminProfile);
            
            if (response.success === false) {
                throw new Error(response.error || 'Failed to process admin message');
            }
            
            // Log admin AI interaction for audit and conversation history
            await logAdminAIInteraction(adminId, message, response, currentSessionId);
            
            res.json({
                success: true,
                data: {
                    response: response.response,
                    intent: response.intent,
                    suggestions: response.suggestions,
                    aiProvider: response.provider,
                    model: response.model,
                    fallbackUsed: response.fallbackUsed || false,
                    adminContext: response.adminContext,
                    sessionId: currentSessionId,
                    conversationHistory: conversationHistory,
                    timestamp: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Admin AI chat error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process admin message',
                error: error.message
            });
        }
    }
);

// @route   GET /api/admin/kairo-ai/insights
// @desc    Get admin dashboard insights
// @access  Admin
router.get('/insights',
    requireAdmin,
    async (req, res) => {
        try {
            const insights = await adminAI.getAdminDashboardInsights();
            
            res.json({
                success: true,
                data: insights.data
            });
            
        } catch (error) {
            console.error('❌ Admin insights error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get admin insights',
                error: error.message
            });
        }
    }
);

// @route   GET /api/admin/kairo-ai/stats
// @desc    Get admin AI usage statistics
// @access  Admin
router.get('/stats',
    requireAdmin,
    async (req, res) => {
        try {
            const stats = adminAI.getAdminStats();
            
            res.json({
                success: true,
                data: {
                    ...stats,
                    timestamp: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Admin stats error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get admin statistics',
                error: error.message
            });
        }
    }
);

// @route   POST /api/admin/kairo-ai/analyze
// @desc    Analyze specific admin data (loans, users, system)
// @access  Admin
router.post('/analyze',
    requireAdmin,
    adminAnalysisRateLimit,
    body('analysisType').isIn(['loans', 'users', 'system', 'risks', 'performance']).withMessage('Valid analysis type required'),
    body('parameters').optional().isObject().withMessage('Parameters must be an object'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { analysisType, parameters = {} } = req.body;
            const adminId = req.user.id;
            
            // Build analysis prompt
            const analysisPrompt = `Please analyze the ${analysisType} data with the following parameters: ${JSON.stringify(parameters)}. 
            Provide insights, trends, recommendations, and any alerts or concerns based on the current system state.`;
            
            const adminContext = {
                id: adminId,
                email: req.user.email,
                role: 'admin',
                analysisMode: true,
                analysisType: analysisType
            };
            
            // Process analysis with Admin AI
            const response = await adminAI.processAdminMessage(adminId, analysisPrompt, adminContext);
            
            if (response.success === false) {
                throw new Error(response.error || 'Failed to perform analysis');
            }
            
            // Log analysis for audit
            await logAdminAIInteraction(adminId, `ANALYSIS: ${analysisType}`, response);
            
            res.json({
                success: true,
                data: {
                    analysisType: analysisType,
                    response: response.response,
                    insights: response.suggestions,
                    aiProvider: response.provider,
                    timestamp: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Admin analysis error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to perform analysis',
                error: error.message
            });
        }
    }
);

// @route   POST /api/admin/kairo-ai/configure
// @desc    Get AI configuration recommendations
// @access  Admin
router.post('/configure',
    requireAdmin,
    body('configType').isIn(['interest_rates', 'loan_limits', 'system_params', 'risk_settings']).withMessage('Valid config type required'),
    body('currentSettings').optional().isObject().withMessage('Current settings must be an object'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { configType, currentSettings = {} } = req.body;
            const adminId = req.user.id;
            
            // Build configuration prompt
            const configPrompt = `Please provide recommendations for ${configType} configuration. 
            Current settings: ${JSON.stringify(currentSettings)}.
            Analyze the current configuration and suggest optimizations based on platform performance, risk management, and business objectives.`;
            
            const adminContext = {
                id: adminId,
                email: req.user.email,
                role: 'admin',
                configMode: true,
                configType: configType
            };
            
            // Process configuration request with Admin AI
            const response = await adminAI.processAdminMessage(adminId, configPrompt, adminContext);
            
            if (response.success === false) {
                throw new Error(response.error || 'Failed to get configuration recommendations');
            }
            
            // Log configuration request for audit
            await logAdminAIInteraction(adminId, `CONFIG: ${configType}`, response);
            
            res.json({
                success: true,
                data: {
                    configType: configType,
                    recommendations: response.response,
                    suggestions: response.suggestions,
                    aiProvider: response.provider,
                    timestamp: new Date().toISOString()
                }
            });
            
        } catch (error) {
            console.error('❌ Admin configuration error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get configuration recommendations',
                error: error.message
            });
        }
    }
);

// @route   GET /api/admin/kairo-ai/history
// @desc    Get admin AI conversation history
// @access  Admin
router.get('/history',
    requireAdmin,
    async (req, res) => {
        try {
            const adminId = req.user.id;
            const { sessionId, limit = 20 } = req.query;
            
            const { data: history, error } = await supabase
                .rpc('get_admin_conversation_history', {
                    p_admin_id: adminId,
                    p_session_id: sessionId || null,
                    p_limit: parseInt(limit)
                });
            
            if (error) throw error;
            
            res.json({
                success: true,
                data: {
                    history: history || [],
                    sessionId: sessionId,
                    count: history?.length || 0
                }
            });
            
        } catch (error) {
            console.error('❌ Admin history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get conversation history',
                error: error.message
            });
        }
    }
);

// @route   DELETE /api/admin/kairo-ai/history
// @desc    Clear admin AI conversation history
// @access  Admin
router.delete('/history',
    requireAdmin,
    async (req, res) => {
        try {
            const adminId = req.user.id;
            const { sessionId } = req.query;
            
            let query = supabase
                .from('admin_ai_conversation_history')
                .delete();
            
            if (sessionId) {
                query = query.eq('admin_id', adminId).eq('session_id', sessionId);
            } else {
                query = query.eq('admin_id', adminId);
            }
            
            const { error } = await query;
            
            if (error) throw error;
            
            res.json({
                success: true,
                message: sessionId 
                    ? `Conversation history for session ${sessionId} cleared` 
                    : 'All conversation history cleared'
            });
            
        } catch (error) {
            console.error('❌ Admin history clear error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to clear conversation history',
                error: error.message
            });
        }
    }
);

// @route   POST /api/admin/kairo-ai/history/cleanup
// @desc    Clean up old conversation history (admin only)
// @access  Admin
router.post('/history/cleanup',
    requireAdmin,
    async (req, res) => {
        try {
            const { data, error } = await supabase
                .rpc('cleanup_admin_conversation_history');
            
            if (error) throw error;
            
            res.json({
                success: true,
                message: `Cleaned up ${data} old conversation records`,
                deletedCount: data
            });
            
        } catch (error) {
            console.error('❌ Admin history cleanup error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cleanup conversation history',
                error: error.message
            });
        }
    }
);

/**
 * Log admin AI interaction for audit trail and conversation history
 */
async function logAdminAIInteraction(adminId, message, response, sessionId = null) {
    try {
        // Log to audit trail
        await supabase
            .from('admin_ai_logs')
            .insert({
                admin_id: adminId,
                message: message,
                response: response.response,
                intent: response.intent,
                ai_provider: response.provider,
                suggestions: response.suggestions,
                created_at: new Date().toISOString()
            });
        
        // Log to conversation history for multi-turn context
        if (sessionId) {
            await supabase
                .from('admin_ai_conversation_history')
                .insert({
                    admin_id: adminId,
                    session_id: sessionId,
                    message: message,
                    response: response.response,
                    intent: response.intent,
                    ai_provider: response.provider,
                    suggestions: response.suggestions,
                    created_at: new Date().toISOString()
                });
        }
    } catch (error) {
        console.error('⚠️ Failed to log admin AI interaction:', error.message);
        // Don't fail the request if logging fails
    }
}

/**
 * Generate session ID for admin conversation
 */
function generateAdminSessionId() {
    return `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = router;

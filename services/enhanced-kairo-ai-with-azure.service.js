/**
 * Enhanced Kairo AI Service with OpenRouter Integration
 * Combines existing Kairo AI capabilities with OpenRouter free tier models
 * Provides intelligent fallback and hybrid AI responses
 */

const KairoAIService = require('./kairo-ai.service');
const OpenRouterAIService = require('./openrouter-ai.service');
const { supabase } = require('../utils/supabase-auth');

class EnhancedKairoAIService extends KairoAIService {
    constructor() {
        super();
        this.openRouterAI = new OpenRouterAIService();
        this.useOpenRouter = process.env.OPENROUTER_API_KEY ? true : false;
        
        // Hybrid AI configuration
        this.hybridConfig = {
            // Use OpenRouter for complex queries
            complexIntents: [
                'investment_analysis',
                'financial_planning',
                'risk_assessment',
                'loan_structuring',
                'market_analysis',
                'tax_advice',
                'business_planning'
            ],
            
            // Use local Kairo for simple queries
            simpleIntents: [
                'greeting',
                'zimscore_inquiry',
                'balance_check',
                'loan_status',
                'basic_info',
                'navigation_help'
            ],
            
            // Confidence thresholds
            openRouterThreshold: 0.7,  // Use OpenRouter if local confidence < 0.7
            hybridThreshold: 0.5  // Combine both if confidence between 0.5-0.7
        };
    }

    /**
     * Enhanced message processing with OpenRouter integration
     */
    async processMessage(userId, message, context = {}) {
        try {
            console.log(`🧠 Enhanced Kairo processing: ${message.substring(0, 50)}...`);
            
            // Step 1: Analyze intent and complexity
            const analysis = await this.analyzeMessageComplexity(message, context);
            
            // Step 2: Choose AI strategy
            const strategy = this.selectAIStrategy(analysis);
            
            // Step 3: Process with selected strategy
            let response;
            switch (strategy) {
                case 'openrouter_only':
                    response = await this.processWithOpenRouter(userId, message, context, analysis);
                    break;
                    
                case 'local_only':
                    response = await this.processWithLocalKairo(userId, message, context);
                    break;
                    
                case 'hybrid':
                    response = await this.processWithHybridAI(userId, message, context, analysis);
                    break;
                    
                default:
                    response = await this.processWithFallback(userId, message, context);
            }
            
            // Step 4: Enhance response with additional insights
            if (response.success) {
                response = await this.enhanceResponse(response, userId, analysis);
            }
            
            // Step 5: Log for learning
            await this.logEnhancedInteraction(userId, message, response, strategy, analysis);
            
            return response;

        } catch (error) {
            console.error('Enhanced Kairo processing error:', error);
            return await this.processWithFallback(userId, message, context);
        }
    }

    /**
     * Analyze message complexity and intent
     */
    async analyzeMessageComplexity(message, context) {
        const analysis = {
            length: message.length,
            complexity: 'simple',
            intent: 'general',
            confidence: 0.8,
            requiresPersonalization: false,
            requiresCalculation: false,
            requiresExternalData: false
        };

        // Complexity indicators
        const complexKeywords = [
            'investment strategy', 'portfolio', 'diversification', 'risk analysis',
            'financial planning', 'retirement', 'tax implications', 'market trends',
            'business loan', 'mortgage', 'insurance', 'estate planning',
            'compare options', 'analyze', 'calculate', 'project', 'forecast'
        ];

        const calculationKeywords = [
            'calculate', 'how much', 'what if', 'compare', 'estimate',
            'monthly payment', 'interest rate', 'total cost', 'savings',
            'return on investment', 'break even', 'amortization'
        ];

        const personalizationKeywords = [
            'my', 'I', 'me', 'should I', 'recommend for me', 'my situation',
            'based on my', 'given my', 'considering my'
        ];

        // Analyze complexity
        if (message.length > 100 || complexKeywords.some(keyword => 
            message.toLowerCase().includes(keyword))) {
            analysis.complexity = 'complex';
        }

        // Check for calculations needed
        if (calculationKeywords.some(keyword => 
            message.toLowerCase().includes(keyword))) {
            analysis.requiresCalculation = true;
        }

        // Check for personalization needed
        if (personalizationKeywords.some(keyword => 
            message.toLowerCase().includes(keyword))) {
            analysis.requiresPersonalization = true;
        }

        // Detect intent using existing method
        analysis.intent = this.detectIntent(message);

        return analysis;
    }

    /**
     * Select AI processing strategy
     */
    selectAIStrategy(analysis) {
        if (!this.useOpenRouter) {
            return 'local_only';
        }

        // Use OpenRouter for complex intents
        if (this.hybridConfig.complexIntents.includes(analysis.intent)) {
            return 'openrouter_only';
        }

        // Use local for simple intents
        if (this.hybridConfig.simpleIntents.includes(analysis.intent)) {
            return 'local_only';
        }

        // Use hybrid for medium complexity
        if (analysis.complexity === 'complex' || 
            analysis.requiresPersonalization || 
            analysis.requiresCalculation) {
            return 'hybrid';
        }

        return 'local_only';
    }

    /**
     * Process with OpenRouter only
     */
    async processWithOpenRouter(userId, message, context, analysis) {
        try {
            console.log('🤖 Using OpenRouter AI for processing');
            
            // Get user profile for context
            const userProfile = await this.getUserFinancialProfile(userId);
            
            // Get conversation history
            const conversationHistory = await this.getConversationHistory(userId, 5);
            
            // Prepare context for OpenRouter
            const openRouterContext = {
                userId,
                conversationHistory: conversationHistory.conversations || [],
                userProfile,
                intent: analysis.intent,
                systemContext: this.selectSystemContext(analysis.intent)
            };
            
            // Generate response with OpenRouter
            const response = await this.openRouterAI.chat(userId, message, conversationHistory.conversations || [], openRouterContext);
            
            if (response.success) {
                // Conversation already saved in openRouterAI.chat()
                // No need to save again
                
                return {
                    success: true,
                    response: response.response,
                    intent: response.intent,
                    confidence: response.confidence,
                    suggestions: response.suggestions || [],
                    followUpQuestions: response.followUpQuestions || [],
                    source: 'openrouter',
                    model: response.model
                };
            }
            
            // Fallback to local if OpenRouter fails
            return await this.processWithLocalKairo(userId, message, context);

        } catch (error) {
            console.error('OpenRouter processing error:', error);
            return await this.processWithLocalKairo(userId, message, context);
        }
    }

    /**
     * Process with local Kairo AI only
     */
    async processWithLocalKairo(userId, message, context) {
        console.log('🏠 Using local Kairo AI for processing');
        
        // Use parent class method
        const response = await super.processMessage(userId, message, context);
        
        if (response.success) {
            response.source = 'local-kairo';
        }
        
        return response;
    }

    /**
     * Process with hybrid AI (both OpenRouter and local)
     */
    async processWithHybridAI(userId, message, context, analysis) {
        try {
            console.log('🔄 Using hybrid AI processing');
            
            // Get both responses in parallel
            const [openRouterResponse, localResponse] = await Promise.allSettled([
                this.processWithOpenRouter(userId, message, context, analysis),
                this.processWithLocalKairo(userId, message, context)
            ]);
            
            // Determine best response
            const bestResponse = this.selectBestResponse(
                openRouterResponse.status === 'fulfilled' ? openRouterResponse.value : null,
                localResponse.status === 'fulfilled' ? localResponse.value : null,
                analysis
            );
            
            if (bestResponse) {
                bestResponse.source = 'hybrid';
                return bestResponse;
            }
            
            // Fallback
            return await this.processWithFallback(userId, message, context);

        } catch (error) {
            console.error('Hybrid AI processing error:', error);
            return await this.processWithFallback(userId, message, context);
        }
    }

    /**
     * Select best response from multiple AI sources
     */
    selectBestResponse(openRouterResponse, localResponse, analysis) {
        // If only one succeeded, use it
        if (openRouterResponse && !localResponse) return openRouterResponse;
        if (localResponse && !openRouterResponse) return localResponse;
        if (!openRouterResponse && !localResponse) return null;
        
        // Both succeeded - choose based on confidence and context
        const openRouterScore = this.calculateResponseScore(openRouterResponse, analysis);
        const localScore = this.calculateResponseScore(localResponse, analysis);
        
        if (openRouterScore > localScore) {
            return {
                ...openRouterResponse,
                alternativeResponse: localResponse.response,
                combinedConfidence: (openRouterScore + localScore) / 2
            };
        } else {
            return {
                ...localResponse,
                alternativeResponse: openRouterResponse.response,
                combinedConfidence: (openRouterScore + localScore) / 2
            };
        }
    }

    /**
     * Calculate response quality score
     */
    calculateResponseScore(response, analysis) {
        if (!response || !response.success) return 0;
        
        let score = response.confidence || 0.5;
        
        // Bonus for matching intent
        if (response.intent === analysis.intent) {
            score += 0.1;
        }
        
        // Bonus for having suggestions
        if (response.suggestions && response.suggestions.length > 0) {
            score += 0.1;
        }
        
        // Bonus for appropriate length
        const responseLength = response.response.length;
        if (responseLength > 50 && responseLength < 500) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * Fallback processing
     */
    async processWithFallback(userId, message, context) {
        console.log('⚠️ Using fallback processing');
        
        const intent = this.detectIntent(message);
        const fallbackResponse = this.getFallbackResponse(intent);
        
        await this.saveConversation(userId, message, fallbackResponse, {
            intent,
            confidence: 0.3,
            model: 'fallback'
        });
        
        return {
            success: true,
            response: fallbackResponse,
            intent,
            confidence: 0.3,
            suggestions: this.getBasicSuggestions(intent),
            source: 'fallback'
        };
    }

    /**
     * Enhance response with additional insights
     */
    async enhanceResponse(response, userId, analysis) {
        try {
            // Add personalized suggestions based on user profile
            if (analysis.requiresPersonalization) {
                const userProfile = await this.getUserFinancialProfile(userId);
                const personalizedSuggestions = this.generatePersonalizedSuggestions(userProfile, analysis.intent);
                
                if (personalizedSuggestions.length > 0) {
                    response.suggestions = [...(response.suggestions || []), ...personalizedSuggestions];
                }
            }
            
            // Add quick actions
            response.quickActions = this.generateQuickActions(analysis.intent);
            
            // Add related topics
            response.relatedTopics = this.getRelatedTopics(analysis.intent);
            
            return response;

        } catch (error) {
            console.error('Response enhancement error:', error);
            return response;
        }
    }

    /**
     * Select appropriate system context for Azure OpenAI
     */
    selectSystemContext(intent) {
        const contextMap = {
            'loan_inquiry': 'loan_specialist',
            'investment_advice': 'investment_advisor',
            'risk_assessment': 'risk_analyst',
            'zimscore_improvement': 'financial_advisor',
            'financial_planning': 'financial_advisor'
        };
        
        return contextMap[intent] || 'financial_advisor';
    }

    /**
     * Generate personalized suggestions
     */
    generatePersonalizedSuggestions(userProfile, intent) {
        const suggestions = [];
        
        if (!userProfile) return suggestions;
        
        // ZimScore-based suggestions
        if (userProfile.zimScore < 60) {
            suggestions.push("Check ways to improve your ZimScore");
        }
        
        // Loan-based suggestions
        if (!userProfile.hasActiveLoans && intent.includes('loan')) {
            suggestions.push("See your loan eligibility");
        }
        
        // Investment-based suggestions
        if (!userProfile.hasInvestments && intent.includes('investment')) {
            suggestions.push("Explore beginner investment options");
        }
        
        return suggestions.slice(0, 2); // Limit to 2 suggestions
    }

    /**
     * Generate quick actions based on intent
     */
    generateQuickActions(intent) {
        const actionMap = {
            'loan_inquiry': [
                { text: 'Check eligibility', action: 'check_loan_eligibility' },
                { text: 'Calculate payment', action: 'calculate_loan_payment' }
            ],
            'investment_advice': [
                { text: 'View portfolios', action: 'view_investment_options' },
                { text: 'Risk assessment', action: 'assess_risk_tolerance' }
            ],
            'zimscore_improvement': [
                { text: 'Check ZimScore', action: 'check_zimscore' },
                { text: 'Improvement tips', action: 'zimscore_tips' }
            ]
        };
        
        return actionMap[intent] || [
            { text: 'Main menu', action: 'main_menu' },
            { text: 'Contact support', action: 'contact_support' }
        ];
    }

    /**
     * Get related topics
     */
    getRelatedTopics(intent) {
        const topicMap = {
            'loan_inquiry': ['ZimScore improvement', 'Investment options', 'Financial planning'],
            'investment_advice': ['Risk assessment', 'Loan options', 'Savings strategies'],
            'zimscore_improvement': ['Loan eligibility', 'Credit building', 'Financial health']
        };
        
        return topicMap[intent] || ['Loans', 'Investments', 'ZimScore'];
    }

    /**
     * Get fallback responses
     */
    getFallbackResponse(intent) {
        const fallbackMap = {
            'greeting': "Hello! I'm Kairo, your AI financial assistant. How can I help you today?",
            'loan_inquiry': "I can help you with loan information. What would you like to know about loans?",
            'investment_advice': "I'd be happy to help with investment guidance. What's your investment goal?",
            'zimscore_improvement': "I can help you improve your ZimScore. Would you like to see your current score?",
            'general': "I'm here to help with your financial questions. Could you please be more specific about what you need?"
        };
        
        return fallbackMap[intent] || fallbackMap['general'];
    }

    /**
     * Get basic suggestions
     */
    getBasicSuggestions(intent) {
        return [
            "Tell me about loan options",
            "How can I improve my ZimScore?",
            "Show me investment opportunities",
            "Help with financial planning"
        ];
    }

    /**
     * Log enhanced interaction
     */
    async logEnhancedInteraction(userId, message, response, strategy, analysis) {
        try {
            if (!userId) return;
            
            const metadata = {
                strategy,
                analysis,
                source: response.source,
                model: response.model,
                tokens: response.tokens,
                alternativeResponse: response.alternativeResponse,
                combinedConfidence: response.combinedConfidence
            };
            
            await supabase
                .from('kairo_conversations')
                .insert({
                    user_id: userId,
                    user_message: message,
                    ai_response: response.response,
                    intent: response.intent,
                    confidence_score: response.confidence,
                    metadata
                });

        } catch (error) {
            console.error('Enhanced interaction logging error:', error);
        }
    }

    /**
     * Get enhanced user insights using Azure OpenAI
     */
    async getEnhancedUserInsights(userId) {
        try {
            const userProfile = await this.getUserFinancialProfile(userId);
            
            if (this.useAzureOpenAI) {
                // Use Azure OpenAI for advanced insights
                const azureInsights = await this.azureOpenAI.generateFinancialInsights(userProfile);
                
                if (azureInsights.success) {
                    return {
                        success: true,
                        insights: azureInsights.insights,
                        source: 'azure-openai',
                        generatedAt: azureInsights.generatedAt
                    };
                }
            }
            
            // Fallback to local insights
            return await this.generateLocalInsights(userProfile);

        } catch (error) {
            console.error('Enhanced insights error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Health check for enhanced service
     */
    async healthCheck() {
        const checks = {
            localKairo: { status: 'healthy' },
            azureOpenAI: { status: 'disabled' },
            database: { status: 'unknown' }
        };
        
        try {
            // Check Azure OpenAI if enabled
            if (this.useAzureOpenAI) {
                const azureHealth = await this.azureOpenAI.healthCheck();
                checks.azureOpenAI = azureHealth;
            }
            
            // Check database connection
            const { error } = await supabase
                .from('kairo_conversations')
                .select('id')
                .limit(1);
                
            checks.database = { status: error ? 'unhealthy' : 'healthy' };
            
            const overallHealthy = Object.values(checks).every(check => 
                check.status === 'healthy' || check.status === 'disabled'
            );
            
            return {
                success: true,
                status: overallHealthy ? 'healthy' : 'degraded',
                checks,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                status: 'unhealthy',
                error: error.message,
                checks
            };
        }
    }
}

module.exports = EnhancedKairoAIService;

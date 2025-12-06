/**
 * Master AI Service - Gemini Primary with OpenRouter Fallback
 * Handles multiple AI providers with intelligent fallback system
 * 
 * Priority Order:
 * 1. Gemini AI (Primary - FREE with generous limits)
 * 2. OpenRouter (Fallback - Multiple free models)
 * 3. Rule-based Kairo AI (Emergency fallback)
 */

const GeminiKairoAIService = require('./gemini-kairo-ai.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class MasterAIService {
    constructor() {
        // Initialize rule-based Kairo AI as emergency fallback
        this.kairoAI = new GeminiKairoAIService();
        
        // Primary AI: Gemini (FREE with generous limits)
        this.geminiAI = {
            enabled: !!process.env.GEMINI_API_KEY,
            apiKey: process.env.GEMINI_API_KEY,
            model: 'gemini-pro',
            client: null
        };
        
        // Fallback AI: OpenRouter (FREE models)
        this.openrouterAI = {
            enabled: !!process.env.PRIMARY_AI_API_KEY,
            provider: 'openrouter',
            apiKey: process.env.PRIMARY_AI_API_KEY,
            models: [
                process.env.PRIMARY_AI_MODEL || 'deepseek/deepseek-chat-v3.1:free',
                process.env.PRIMARY_AI_MODEL_2 || 'z-ai/glm-4.5-air:free',
                process.env.PRIMARY_AI_MODEL_3 || 'qwen/qwen2.5-vl-32b-instruct:free',
                process.env.PRIMARY_AI_MODEL_4 || 'meta-llama/llama-3.3-70b-instruct:free'
            ].filter(Boolean),
            currentModelIndex: 0,
            rotationEnabled: process.env.AI_MODEL_ROTATION === 'true',
            maxRetries: 2,
            client: null
        };
        
        // Initialize AI providers
        this.initializeGemini();
        this.initializeOpenRouter();
        
        // Statistics
        this.stats = {
            geminiUsed: 0,
            openrouterUsed: 0,
            kairoFallbackUsed: 0,
            totalRequests: 0
        };
        
        console.log(`🤖 Master AI initialized (Kairo):`);
        console.log(`   Primary: Gemini AI ${this.geminiAI.enabled ? '✅' : '❌'}`);
        console.log(`   Fallback: OpenRouter ${this.openrouterAI.enabled ? '✅' : '❌'} (${this.openrouterAI.models.length} models)`);
        console.log(`   Emergency: Rule-based Kairo AI`);
    }
    
    /**
     * Initialize Gemini AI (Primary)
     */
    initializeGemini() {
        if (!this.geminiAI.enabled) return;
        
        try {
            const genAI = new GoogleGenerativeAI(this.geminiAI.apiKey);
            this.geminiAI.client = genAI.getGenerativeModel({ model: this.geminiAI.model });
            console.log('✅ Gemini AI initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Gemini AI:', error.message);
            this.geminiAI.enabled = false;
        }
    }
    
    /**
     * Initialize OpenRouter AI (Fallback)
     */
    initializeOpenRouter() {
        if (!this.openrouterAI.enabled) return;
        
        try {
            const OpenAI = require('openai');
            this.openrouterAI.client = new OpenAI({
                apiKey: this.openrouterAI.apiKey,
                baseURL: 'https://openrouter.ai/api/v1'
            });
            console.log('✅ OpenRouter AI initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize OpenRouter AI:', error.message);
            this.openrouterAI.enabled = false;
        }
    }

    /**
     * Initialize primary AI based on configuration
     */
    /**
     * Get current OpenRouter model and rotate if enabled
     */
    getCurrentOpenRouterModel() {
        if (!this.openrouterAI.models || this.openrouterAI.models.length === 0) {
            return 'deepseek/deepseek-chat-v3.1:free';
        }

        const currentModel = this.openrouterAI.models[this.openrouterAI.currentModelIndex];

        if (this.openrouterAI.rotationEnabled) {
            this.openrouterAI.currentModelIndex = (this.openrouterAI.currentModelIndex + 1) % this.openrouterAI.models.length;
        }

        return currentModel;
    }

    /**
     * Main message processing with Gemini → OpenRouter → Kairo fallback chain
     */
    async processMessage(userId, message, conversationContext = {}) {
        this.stats.totalRequests++;
        
        try {
            // 1. Try Gemini AI first (Primary)
            if (this.geminiAI.enabled) {
                console.log('🤖 Trying Gemini AI (Primary)...');
                const geminiResponse = await this.tryGeminiAI(userId, message, conversationContext);
                if (geminiResponse.success) {
                    this.stats.geminiUsed++;
                    return {
                        ...geminiResponse,
                        aiProvider: 'gemini',
                        model: 'gemini-pro',
                        fallbackUsed: false
                    };
                }
                console.log('⚠️ Gemini AI failed, trying OpenRouter...');
            }
            
            // 2. Try OpenRouter AI (Fallback)
            if (this.openrouterAI.enabled) {
                console.log('🔄 Trying OpenRouter AI (Fallback)...');
                const openrouterResponse = await this.tryOpenRouterAI(userId, message, conversationContext);
                if (openrouterResponse.success) {
                    this.stats.openrouterUsed++;
                    return {
                        ...openrouterResponse,
                        aiProvider: 'openrouter',
                        fallbackUsed: true,
                        fallbackReason: 'Gemini AI failed or disabled'
                    };
                }
                console.log('⚠️ OpenRouter AI failed, using Kairo rule-based...');
            }
            
            // 3. Emergency fallback to rule-based Kairo AI
            console.log('🔄 Using Kairo AI (Emergency fallback)');
            const kairoResponse = await this.kairoAI.processMessage(userId, message, conversationContext);
            this.stats.kairoFallbackUsed++;
            
            return {
                ...kairoResponse,
                aiProvider: 'kairo-rules',
                fallbackUsed: true,
                fallbackReason: 'All AI providers failed'
            };
            
        } catch (error) {
            console.error('❌ All AI systems failed:', error);
            
            return {
                success: true,
                response: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or contact our support team for immediate assistance.",
                intent: 'system_error',
                suggestions: ['Try again', 'Contact support', 'Check system status'],
                aiProvider: 'emergency-fallback',
                fallbackUsed: true,
                fallbackReason: 'All systems failed'
            };
        }
    }

    /**
     * Try Gemini AI (Primary)
     */
    async tryGeminiAI(userId, message, conversationContext, retryCount = 0) {
        try {
            const userProfile = await this.kairoAI.getUserFinancialProfile(userId);
            const prompt = this.buildGeminiPrompt(message, userProfile);
            
            const result = await this.geminiAI.client.generateContent(prompt);
            const response = await result.response;
            let aiResponse = response.text();
            
            // Post-process response
            aiResponse = this.enhanceResponseWithBranding(aiResponse, userProfile);
            
            const intent = await this.kairoAI.analyzeIntent(message);
            const suggestions = await this.kairoAI.generateSuggestions(intent, userProfile);
            
            return {
                success: true,
                response: aiResponse,
                intent: intent,
                suggestions: suggestions
            };
            
        } catch (error) {
            console.error(`❌ Gemini AI attempt ${retryCount + 1} failed:`, error.message);
            
            if (retryCount < 2) {
                await this.delay(1000 * (retryCount + 1));
                return await this.tryGeminiAI(userId, message, conversationContext, retryCount + 1);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Try OpenRouter AI (Fallback)
     */
    async tryOpenRouterAI(userId, message, conversationContext, retryCount = 0) {
        try {
            const userProfile = await this.kairoAI.getUserFinancialProfile(userId);
            const currentModel = this.getCurrentOpenRouterModel();
            const systemPrompt = this.buildAdvancedSystemPrompt(userProfile);
            
            console.log(`🤖 Using OpenRouter model: ${currentModel}`);
            
            const response = await this.openrouterAI.client.chat.completions.create({
                model: currentModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                max_tokens: 600,
                temperature: 0.7
            });

            const aiResponse = response.choices[0].message.content;
            const intent = await this.kairoAI.analyzeIntent(message);
            const suggestions = await this.kairoAI.generateSuggestions(intent, userProfile);

            return {
                success: true,
                response: aiResponse,
                intent: intent,
                suggestions: suggestions,
                model: currentModel
            };
            
        } catch (error) {
            console.error(`❌ OpenRouter AI attempt ${retryCount + 1} failed:`, error.message);
            
            if (retryCount < this.openrouterAI.maxRetries) {
                await this.delay(1000 * (retryCount + 1));
                return await this.tryOpenRouterAI(userId, message, conversationContext, retryCount + 1);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Build Gemini-specific prompt
     */
    buildGeminiPrompt(userMessage, userProfile) {
        return `You are Kairo, ZimCrowd's friendly and knowledgeable AI financial assistant.

ABOUT ZIMCROWD:
- ZimCrowd is a peer-to-peer lending platform connecting borrowers with investors
- We offer loans from $50 to $5,000 with competitive interest rates
- Our ZimScore system (0-85) determines loan eligibility and rates

USER CONTEXT:
- Name: ${userProfile.firstName || 'User'}
- ZimScore: ${userProfile.zimScore || 'Not calculated'}
- Loan Eligibility: ${userProfile.loanEligibility || 'Unknown'}
- Current Balance: $${userProfile.walletBalance || 0}

GUIDELINES:
1. Be helpful, friendly, and professional
2. Provide accurate information about ZimCrowd services
3. Help users understand their financial options
4. Never provide specific financial advice - suggest consulting professionals for complex decisions
5. Keep responses concise but informative (under 200 words)
6. Use emojis sparingly for friendliness

USER MESSAGE: ${userMessage}

Respond as Kairo:`;
    }

    /**
     * Enhance response with ZimCrowd branding
     */
    enhanceResponseWithBranding(response, userProfile) {
        // Add personalization if user name is available
        if (userProfile.firstName && !response.includes(userProfile.firstName)) {
            // Don't add name if response is already personalized
        }
        
        return response;
    }

    /**
     * Try primary AI with retry logic (Legacy - kept for compatibility)
     */
    async tryPrimaryAI(userId, message, conversationContext, retryCount = 0) {
        try {
            let response;
            
            switch (this.primaryAI.provider) {
                case 'openai':
                    response = await this.processWithOpenAI(userId, message, conversationContext);
                    break;
                    
                case 'claude':
                    response = await this.processWithClaude(userId, message, conversationContext);
                    break;
                    
                case 'openrouter':
                    response = await this.processWithOpenRouter(userId, message, conversationContext);
                    break;
                    
                case 'custom':
                    response = await this.processWithCustomAI(userId, message, conversationContext);
                    break;
                    
                default:
                    throw new Error(`Unsupported primary AI provider: ${this.primaryAI.provider}`);
            }
            
            return { success: true, ...response };
            
        } catch (error) {
            console.error(`❌ Primary AI attempt ${retryCount + 1} failed:`, error.message);
            
            // Retry logic
            if (retryCount < this.primaryAI.maxRetries) {
                await this.delay(1000 * (retryCount + 1)); // Exponential backoff
                return await this.tryPrimaryAI(userId, message, conversationContext, retryCount + 1);
            }
            
            return { success: false, error: error.message };
        }
    }

    /**
     * Process with OpenAI GPT
     */
    async processWithOpenAI(userId, message, conversationContext) {
        // Get user profile for context
        const userProfile = await this.kairoAI.getUserFinancialProfile(userId);
        
        const systemPrompt = this.buildAdvancedSystemPrompt(userProfile);
        
        const response = await this.openai.chat.completions.create({
            model: this.primaryAI.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 600,
            temperature: 0.7,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        const aiResponse = response.choices[0].message.content;
        const intent = await this.kairoAI.analyzeIntent(message);
        const suggestions = await this.kairoAI.generateSuggestions(intent, userProfile);

        return {
            response: aiResponse,
            intent: intent,
            suggestions: suggestions
        };
    }

    /**
     * Process with Claude
     */
    async processWithClaude(userId, message, conversationContext) {
        const userProfile = await this.kairoAI.getUserFinancialProfile(userId);
        const systemPrompt = this.buildAdvancedSystemPrompt(userProfile);

        const response = await this.claude.messages.create({
            model: "claude-3-haiku-20240307", // Fast and cost-effective
            max_tokens: 600,
            system: systemPrompt,
            messages: [
                { role: "user", content: message }
            ]
        });

        const aiResponse = response.content[0].text;
        const intent = await this.kairoAI.analyzeIntent(message);
        const suggestions = await this.kairoAI.generateSuggestions(intent, userProfile);

        return {
            response: aiResponse,
            intent: intent,
            suggestions: suggestions
        };
    }

    /**
     * Process with OpenRouter (Multiple AI Models)
     */
    async processWithOpenRouter(userId, message, conversationContext) {
        // Get user profile for context
        const userProfile = await this.kairoAI.getUserFinancialProfile(userId);
        
        // Get current model (with rotation if enabled)
        const currentModel = this.getCurrentModel();
        
        const systemPrompt = this.buildAdvancedSystemPrompt(userProfile);
        
        console.log(`🤖 Using model: ${currentModel}`);
        
        const response = await this.openrouter.chat.completions.create({
            model: currentModel, // Rotates between: DeepSeek, GLM-4.5, Qwen2.5-VL, Llama-3.3-70B
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            max_tokens: 600,
            temperature: 0.7,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        const aiResponse = response.choices[0].message.content;
        const intent = await this.kairoAI.analyzeIntent(message);
        const suggestions = await this.kairoAI.generateSuggestions(intent, userProfile);

        return {
            response: aiResponse,
            intent: intent,
            suggestions: suggestions,
            model: currentModel,
            provider: 'openrouter'
        };
    }

    /**
     * Process with custom AI (placeholder for your implementation)
     */
    async processWithCustomAI(userId, message, conversationContext) {
        // Implement your custom AI logic here
        // This could be:
        // - Your own trained model
        // - A specialized financial AI service
        // - Integration with another AI provider
        // - Custom business logic
        
        throw new Error('Custom AI not implemented yet');
    }

    /**
     * Build advanced system prompt for primary AI
     */
    buildAdvancedSystemPrompt(userProfile) {
        const firstName = userProfile.profile.first_name || 'there';
        
        return `You are Kairo, the advanced AI financial assistant for ZimCrowd, Zimbabwe's premier fintech platform.

ENHANCED CAPABILITIES:
- Advanced financial analysis and modeling
- Complex investment strategy development  
- Sophisticated risk assessment
- Multi-scenario financial planning
- Behavioral finance insights
- Macroeconomic trend analysis

USER CONTEXT:
- Name: ${firstName}
- ZimScore: ${userProfile.zimScore}/85 (credit rating)
- Wallet Balance: $${userProfile.walletBalance}
- Active Loans: ${userProfile.hasActiveLoans ? 'Yes' : 'No'}
- Investment Portfolio: ${userProfile.hasInvestments ? 'Active' : 'None'}

ZIMCROWD ECOSYSTEM:
🏦 LOANS: Personal (8.5-24.9%), Business (7.5-22.9%), Emergency (12-29.9%)
📈 INVESTMENTS: Fixed Deposits, P2P Lending, Equity Funds, Money Market, Bonds
💳 ZIMSCORE TIERS: 70+ (Premium), 60-69 (Good), 50-59 (Standard), <50 (Building)

ZIMBABWE CONTEXT:
- Multi-currency economy (USD, ZWL, RTGS)
- Mobile money dominance (EcoCash, OneMoney)
- High inflation environment
- Informal economy considerations
- RBZ regulatory framework

ADVANCED FEATURES:
- Provide sophisticated financial modeling
- Offer multiple scenario analysis
- Consider macroeconomic factors
- Integrate behavioral finance principles
- Suggest advanced optimization strategies

COMMUNICATION STYLE:
- Professional yet approachable
- Data-driven recommendations
- Clear explanations of complex concepts
- Actionable step-by-step guidance
- Culturally sensitive to Zimbabwean context

Always provide specific, actionable advice with clear reasoning and next steps.`;
    }

    /**
     * Get AI system status and statistics
     */
    getSystemStatus() {
        const totalRequests = this.stats.primaryAIUsed + this.stats.kairoFallbackUsed + this.stats.errors;
        
        return {
            status: 'operational',
            primaryAI: {
                provider: this.primaryAI?.provider || 'none',
                model: this.primaryAI?.model || 'none',
                available: !!this.primaryAI
            },
            fallbackAI: {
                provider: 'kairo',
                available: true
            },
            statistics: {
                totalRequests: totalRequests,
                systemReliability: totalRequests > 0 ? 
                    ((this.stats.primaryAIUsed + this.stats.kairoFallbackUsed) / totalRequests * 100).toFixed(1) + '%' : '100%'
            }
        };
    }

    /**
     * Switch primary AI provider
     */
    async switchPrimaryAI(provider, apiKey, model) {
        this.primaryAI.provider = provider;
        this.primaryAI.apiKey = apiKey;
        this.primaryAI.model = model;
        this.primaryAI.enabled = true;
        
        this.initializePrimaryAI();
        
        console.log(`🔄 Switched to primary AI: ${provider} (${model})`);
    }

    /**
     * Disable primary AI (use only Kairo fallback)
     */
    disablePrimaryAI() {
        this.primaryAI.enabled = false;
        console.log('⏸️ Primary AI disabled - using Kairo AI only');
    }

    /**
     * Utility function for delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Initialize custom AI (implement your logic here)
     */
    initializeCustomAI() {
        // Implement your custom AI initialization
        // This could connect to:
        // - Your own AI model API
        // - A specialized financial AI service
        // - Custom business logic system
        return null;
    }
}

module.exports = MasterAIService;

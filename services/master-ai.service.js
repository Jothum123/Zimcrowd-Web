/**
 * Master AI Service - Primary AI with Kairo AI Fallback
 * Handles multiple AI providers with intelligent fallback system
 */

const GeminiKairoAIService = require('./gemini-kairo-ai.service');

class MasterAIService {
    constructor() {
        // Initialize Kairo AI as fallback
        this.kairoAI = new GeminiKairoAIService();
        
        // Primary AI configuration with multi-model support
        this.primaryAI = {
            enabled: !!process.env.PRIMARY_AI_ENABLED,
            provider: process.env.PRIMARY_AI_PROVIDER || 'openai', // openai, claude, openrouter, custom
            apiKey: process.env.PRIMARY_AI_API_KEY,
            models: [
                process.env.PRIMARY_AI_MODEL || 'deepseek/deepseek-chat-v3.1:free',
                process.env.PRIMARY_AI_MODEL_2 || 'z-ai/glm-4.5-air:free',
                process.env.PRIMARY_AI_MODEL_3 || 'qwen/qwen2.5-vl-32b-instruct:free',
                process.env.PRIMARY_AI_MODEL_4 || 'meta-llama/llama-3.3-70b-instruct:free'
            ].filter(Boolean),
            currentModelIndex: 0,
            rotationEnabled: process.env.AI_MODEL_ROTATION === 'true',
            maxRetries: 2
        };
        
        // Initialize primary AI if configured
        this.initializePrimaryAI();
        
        // Fallback statistics
        this.stats = {
            primaryAIUsed: 0,
            kairoFallbackUsed: 0,
            totalRequests: 0
        };
        
        console.log(`🤖 Master AI initialized:`);
        console.log(`   Primary AI: ${this.primaryAI.enabled ? this.primaryAI.provider : 'Disabled'}`);
        if (this.primaryAI.enabled && this.primaryAI.models.length > 0) {
            console.log(`   Models: ${this.primaryAI.models.length} free models available`);
            console.log(`   Rotation: ${this.primaryAI.rotationEnabled ? 'Enabled' : 'Disabled'}`);
        }
        console.log(`   Fallback: Kairo AI (Gemini-powered)`);
    }

    /**
     * Initialize primary AI based on configuration
     */
    initializePrimaryAI() {
        if (!this.primaryAI.enabled) return;

        try {
            switch (this.primaryAI.provider) {
                case 'openai':
                    const OpenAI = require('openai');
                    this.openai = new OpenAI({ apiKey: this.primaryAI.apiKey });
                    break;
                    
                case 'claude':
                    const Anthropic = require('@anthropic-ai/sdk');
                    this.claude = new Anthropic({ apiKey: this.primaryAI.apiKey });
                    break;
                    
                case 'openrouter':
                    const OpenAIRouter = require('openai');
                    this.openrouter = new OpenAIRouter({ 
                        apiKey: this.primaryAI.apiKey,
                        baseURL: 'https://openrouter.ai/api/v1'
                    });
                    break;
                    
                case 'custom':
                    // Initialize your custom AI service here
                    this.customAI = this.initializeCustomAI();
                    break;
                    
                default:
                    console.warn(`⚠️ Unknown primary AI provider: ${this.primaryAI.provider}`);
                    this.primaryAI.enabled = false;
            }
        } catch (error) {
            console.error('❌ Failed to initialize primary AI:', error.message);
            this.primaryAI.enabled = false;
        }
    }

    /**
     * Get current model and rotate if enabled
     */
    getCurrentModel() {
        if (!this.primaryAI.models || this.primaryAI.models.length === 0) {
            return 'deepseek/deepseek-chat-v3.1:free'; // Default fallback
        }

        const currentModel = this.primaryAI.models[this.primaryAI.currentModelIndex];

        // Rotate to next model if rotation is enabled
        if (this.primaryAI.rotationEnabled) {
            this.primaryAI.currentModelIndex = (this.primaryAI.currentModelIndex + 1) % this.primaryAI.models.length;
        }

        return currentModel;
    }

    /**
     * Main message processing with intelligent fallback
     */
    async processMessage(userId, message, conversationContext = {}) {
        this.stats.totalRequests++;
        
        try {
            // Try primary AI first if enabled
            if (this.primaryAI.enabled) {
                const primaryResponse = await this.tryPrimaryAI(userId, message, conversationContext);
                if (primaryResponse.success) {
                    this.stats.primaryAIUsed++;
                    return {
                        ...primaryResponse,
                        aiProvider: this.primaryAI.provider,
                        fallbackUsed: false
                    };
                }
            }
            
            // Fallback to Kairo AI
            console.log('🔄 Falling back to Kairo AI');
            const kairoResponse = await this.kairoAI.processMessage(userId, message, conversationContext);
            this.stats.kairoFallbackUsed++;
            
            return {
                ...kairoResponse,
                aiProvider: 'kairo-ai',
                fallbackUsed: true,
                fallbackReason: this.primaryAI.enabled ? 'Primary AI failed' : 'Primary AI disabled'
            };
            
        } catch (error) {
            console.error('❌ All AI systems failed:', error);
            
            // Emergency fallback - basic response
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
     * Try primary AI with retry logic
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
        const totalRequests = this.stats.totalRequests;
        const primarySuccessRate = totalRequests > 0 ? 
            (this.stats.primaryAIUsed / totalRequests * 100).toFixed(1) : 0;
        const fallbackRate = totalRequests > 0 ? 
            (this.stats.kairoFallbackUsed / totalRequests * 100).toFixed(1) : 0;

        return {
            primaryAI: {
                enabled: this.primaryAI.enabled,
                provider: this.primaryAI.provider,
                model: this.primaryAI.model,
                successRate: `${primarySuccessRate}%`,
                totalUsage: this.stats.primaryAIUsed
            },
            fallbackAI: {
                provider: 'kairo-ai',
                model: 'gemini-pro + rules',
                fallbackRate: `${fallbackRate}%`,
                totalUsage: this.stats.kairoFallbackUsed
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

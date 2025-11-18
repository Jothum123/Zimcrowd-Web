/**
 * OpenRouter AI Service
 * Uses OpenRouter's free tier models for Kairo AI
 * Replaces Azure OpenAI with cost-effective free models
 */

const axios = require('axios');
const { supabase } = require('../utils/supabase-auth');

class OpenRouterAIService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = 'https://openrouter.ai/api/v1';
        
        // Free tier models from your .env (7 models)
        this.models = {
            primary: process.env.PRIMARY_AI_MODEL || 'google/gemini-2.5-flash',
            secondary: process.env.PRIMARY_AI_MODEL_2 || 'z-ai/glm-4.5-air:free',
            vision: process.env.PRIMARY_AI_MODEL_3 || 'qwen/qwen2.5-vl-32b-instruct:free',
            advanced: process.env.PRIMARY_AI_MODEL_4 || 'meta-llama/llama-3.3-70b-instruct:free',
            pro: process.env.PRIMARY_AI_MODEL_5 || 'google/gemini-2.5-pro',
            efficient: process.env.PRIMARY_AI_MODEL_6 || 'minimax/minimax-m2',
            lite: process.env.PRIMARY_AI_MODEL_7 || 'google/gemini-2.5-flash-lite-preview-09-2025'
        };
        
        // Model array for rotation
        this.modelArray = Object.values(this.models).filter(m => m);
        
        // Model rotation for load balancing
        this.modelRotation = process.env.AI_MODEL_ROTATION === 'true';
        this.currentModelIndex = 0;
        
        // System prompts for different contexts
        this.systemPrompts = {
            financial_advisor: `You are Kairo, an expert financial advisor for ZimCrowd, a Zimbabwean fintech platform. 
            You help users with loans, investments, ZimScore improvement, and financial planning.
            
            Key Context:
            - ZimScore: Credit scoring system (0-100, higher is better)
            - DTNI: Debt-to-Net-Income ratio for loan eligibility
            - Employment types: Government (+10 pts), Private (+6 pts), Business (+3 pts), Informal (+0 pts)
            - Currency: USD (Zimbabwe uses USD)
            - Local context: Understand Zimbabwean economic conditions
            
            Guidelines:
            - Be friendly, professional, and culturally aware
            - Provide actionable financial advice
            - Reference ZimScore and DTNI when relevant
            - Keep responses concise but informative
            - Use simple language for financial concepts`,
            
            admin_assistant: `You are Kairo Admin AI, an intelligent assistant for ZimCrowd platform administrators.
            You provide insights, analytics, and recommendations for platform management.
            
            Capabilities:
            - Platform analytics and metrics interpretation
            - User behavior pattern analysis
            - Financial operation recommendations
            - Risk assessment and fraud detection
            - System optimization suggestions
            - Compliance and regulatory guidance
            
            Guidelines:
            - Provide detailed, technical insights
            - Include specific metrics and data points
            - Suggest actionable improvements
            - Highlight potential risks or issues
            - Be professional and precise`,
            
            general: `You are Kairo, a helpful AI assistant for the ZimCrowd platform.
            Provide clear, accurate, and helpful responses to user queries.`
        };
    }

    /**
     * Get next model for rotation (all 7 models)
     */
    getNextModel() {
        if (!this.modelRotation) {
            return this.models.primary;
        }

        // Use all 7 models in rotation
        const model = this.modelArray[this.currentModelIndex];
        this.currentModelIndex = (this.currentModelIndex + 1) % this.modelArray.length;
        
        console.log(`🔄 Model rotation: ${model} (${this.currentModelIndex}/${this.modelArray.length})`);
        
        return model;
    }

    /**
     * Generate AI response using OpenRouter
     */
    async generateResponse(prompt, context = {}) {
        try {
            const systemContext = context.systemContext || 'financial_advisor';
            const systemPrompt = this.systemPrompts[systemContext] || this.systemPrompts.general;
            const model = context.preferredModel || this.getNextModel();

            console.log(`🤖 OpenRouter AI request with model: ${model}`);

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1000,
                    top_p: 0.9
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://zimcrowd.com',
                        'X-Title': 'ZimCrowd Kairo AI',
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const aiResponse = response.data.choices[0].message.content;
                
                return {
                    success: true,
                    response: aiResponse,
                    model: model,
                    source: 'openrouter',
                    confidence: 0.85,
                    usage: response.data.usage || {}
                };
            }

            throw new Error('No response from OpenRouter AI');

        } catch (error) {
            console.error('❌ OpenRouter AI error:', error.message);
            
            // Fallback to simple response
            return {
                success: false,
                response: this.getFallbackResponse(context),
                model: 'fallback',
                source: 'local-fallback',
                confidence: 0.5,
                error: error.message
            };
        }
    }

    /**
     * Generate chat response with conversation history
     */
    async chat(userId, message, conversationHistory = [], context = {}) {
        try {
            const systemContext = context.systemContext || 'financial_advisor';
            const systemPrompt = this.systemPrompts[systemContext] || this.systemPrompts.general;
            const model = context.preferredModel || this.getNextModel();

            // Build messages array with history
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // Add conversation history (last 5 messages)
            const recentHistory = conversationHistory.slice(-5);
            recentHistory.forEach(msg => {
                messages.push({
                    role: msg.role || 'user',
                    content: msg.content || msg.message
                });
            });

            // Add current message
            messages.push({
                role: 'user',
                content: message
            });

            console.log(`💬 OpenRouter chat with ${messages.length} messages using ${model}`);

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    top_p: 0.9
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'HTTP-Referer': 'https://zimcrowd.com',
                        'X-Title': 'ZimCrowd Kairo AI',
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const aiResponse = response.data.choices[0].message.content;
                
                // Save to conversation history
                if (userId) {
                    await this.saveConversation(userId, message, aiResponse, context);
                }
                
                return {
                    success: true,
                    response: aiResponse,
                    model: model,
                    source: 'openrouter',
                    confidence: 0.85,
                    suggestions: this.generateSuggestions(aiResponse),
                    usage: response.data.usage || {}
                };
            }

            throw new Error('No response from OpenRouter AI');

        } catch (error) {
            console.error('❌ OpenRouter chat error:', error.message);
            
            return {
                success: false,
                response: this.getFallbackResponse(context),
                model: 'fallback',
                source: 'local-fallback',
                confidence: 0.5,
                error: error.message
            };
        }
    }

    /**
     * Generate loan recommendations
     */
    async generateLoanRecommendations(userProfile, loanRequest) {
        try {
            const prompt = `Analyze this loan request and provide recommendations:

User Profile:
- ZimScore: ${userProfile.zimScore || 'Not available'}
- Employment: ${userProfile.employment_type || 'Not specified'}
- Monthly Income: $${userProfile.monthly_income || 0}
- Existing Loans: ${userProfile.loans?.length || 0}

Loan Request:
- Amount: $${loanRequest.amount || 0}
- Purpose: ${loanRequest.purpose || 'Not specified'}
- Term: ${loanRequest.term || 12} months

Provide:
1. Eligibility assessment
2. Recommended loan amount and terms
3. Interest rate suggestion
4. Risk factors
5. Improvement recommendations`;

            const response = await this.generateResponse(prompt, {
                systemContext: 'financial_advisor'
            });

            return {
                success: response.success,
                recommendations: response.response,
                source: response.source,
                model: response.model
            };

        } catch (error) {
            console.error('Loan recommendations error:', error);
            return {
                success: false,
                recommendations: 'Unable to generate loan recommendations at this time.',
                error: error.message
            };
        }
    }

    /**
     * Generate investment advice
     */
    async generateInvestmentAdvice(userProfile, investmentRequest) {
        try {
            const prompt = `Provide investment advice for this user:

User Profile:
- ZimScore: ${userProfile.zimScore || 'Not available'}
- Risk Tolerance: ${investmentRequest.riskTolerance || 'medium'}
- Investment Amount: $${investmentRequest.amount || 0}
- Time Horizon: ${investmentRequest.timeHorizon || 'medium-term'}
- Goals: ${investmentRequest.goals || 'General wealth building'}

Provide:
1. Suitable investment options
2. Risk assessment
3. Expected returns
4. Diversification strategy
5. Action steps`;

            const response = await this.generateResponse(prompt, {
                systemContext: 'financial_advisor'
            });

            return {
                success: response.success,
                advice: response.response,
                source: response.source,
                model: response.model
            };

        } catch (error) {
            console.error('Investment advice error:', error);
            return {
                success: false,
                advice: 'Unable to generate investment advice at this time.',
                error: error.message
            };
        }
    }

    /**
     * Save conversation to database
     */
    async saveConversation(userId, userMessage, aiResponse, context = {}) {
        try {
            const { error } = await supabase
                .from('kairo_conversations')
                .insert({
                    user_id: userId,
                    user_message: userMessage,
                    ai_response: aiResponse,
                    intent: context.intent || 'general',
                    confidence_score: context.confidence || 0.85,
                    source: 'openrouter',
                    model: context.model || this.models.primary,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('Failed to save conversation:', error);
            }
        } catch (error) {
            console.error('Save conversation error:', error);
        }
    }

    /**
     * Generate quick suggestions based on response
     */
    generateSuggestions(response) {
        const suggestions = [];
        
        if (response.toLowerCase().includes('zimscore')) {
            suggestions.push('How can I improve my ZimScore?');
        }
        if (response.toLowerCase().includes('loan')) {
            suggestions.push('What loan options are available?');
        }
        if (response.toLowerCase().includes('invest')) {
            suggestions.push('Tell me about investment opportunities');
        }
        
        return suggestions.slice(0, 3);
    }

    /**
     * Get fallback response when AI fails
     */
    getFallbackResponse(context = {}) {
        if (context.isAdmin) {
            return "I'm here to help with admin tasks. I can assist with user management, financial operations, analytics, and system monitoring. What would you like to know?";
        }
        
        return "I'm Kairo, your financial assistant. I can help you with loans, investments, ZimScore improvement, and financial planning. How can I assist you today?";
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const testResponse = await this.generateResponse('Hello', {
                systemContext: 'general'
            });

            return {
                status: testResponse.success ? 'healthy' : 'degraded',
                models: this.models,
                rotation: this.modelRotation,
                lastCheck: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastCheck: new Date().toISOString()
            };
        }
    }
}

module.exports = OpenRouterAIService;
